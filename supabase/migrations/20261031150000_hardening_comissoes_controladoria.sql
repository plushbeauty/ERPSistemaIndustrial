-- Hardening de tenant e validações transacionais — Comissões / Controladoria
-- Revisão SYSNQRA ERP INDUSTRIAL | 2026-10-31
-- RPCs operacionais exigem empresa ativa no contexto, inclusive para MASTER.
-- MASTER não grava registros tenant-scoped com empresa_id NULL.

create or replace function public.erp_comissao_salvar_regra(
  p_perfil_id uuid,
  p_produto_id uuid,
  p_percentual numeric,
  p_meta_quantidade numeric
) returns public.erp_comissao_regras
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v public.erp_comissao_regras;
begin
  if not public.erp_comissao_autorizado() then
    raise exception 'COMISSOES_NAO_AUTORIZADO';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA: selecione a empresa de trabalho antes de cadastrar regras.';
  end if;
  if p_perfil_id is null or not exists (
    select 1 from public.erp_comissao_perfis
    where id=p_perfil_id and empresa_id=v_empresa and ativo=true
  ) then
    raise exception 'PERFIL_FORA_DA_EMPRESA';
  end if;
  if p_produto_id is null or not exists (
    select 1 from public.erp_produtos
    where id=p_produto_id and empresa_id=v_empresa
  ) then
    raise exception 'PRODUTO_FORA_DA_EMPRESA';
  end if;
  if p_percentual is null or p_percentual < 0 or p_percentual > 100
     or p_meta_quantidade is null or p_meta_quantidade < 0 then
    raise exception 'PARAMETROS_DA_REGRA_INVALIDOS';
  end if;

  insert into public.erp_comissao_regras
    (empresa_id,perfil_id,produto_id,percentual,meta_quantidade)
  values
    (v_empresa,p_perfil_id,p_produto_id,p_percentual,p_meta_quantidade)
  on conflict(empresa_id,perfil_id,produto_id)
  do update set
    percentual=excluded.percentual,
    meta_quantidade=excluded.meta_quantidade,
    ativo=true,
    updated_at=now()
  returning * into v;
  return v;
end;
$$;

create or replace function public.erp_comissao_vincular(
  p_usuario_id uuid,
  p_perfil_id uuid,
  p_status text
) returns public.erp_comissao_vinculos
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v public.erp_comissao_vinculos;
begin
  if not public.erp_comissao_autorizado() then
    raise exception 'COMISSOES_NAO_AUTORIZADO';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA: selecione a empresa de trabalho antes de vincular vendedores.';
  end if;
  if p_usuario_id is null or not exists (
    select 1 from public.erp_usuarios
    where id=p_usuario_id and empresa_id=v_empresa
      and ativo=true and deleted_at is null
  ) then
    raise exception 'VENDEDOR_FORA_DA_EMPRESA';
  end if;
  if p_perfil_id is null or not exists (
    select 1 from public.erp_comissao_perfis
    where id=p_perfil_id and empresa_id=v_empresa and ativo=true
  ) then
    raise exception 'PERFIL_FORA_DA_EMPRESA';
  end if;
  if p_status is null or p_status not in ('Ativo','Inativo') then
    raise exception 'STATUS_DO_VINCULO_INVALIDO';
  end if;

  insert into public.erp_comissao_vinculos
    (empresa_id,usuario_id,perfil_id,status)
  values
    (v_empresa,p_usuario_id,p_perfil_id,p_status)
  on conflict(empresa_id,usuario_id)
  do update set
    perfil_id=excluded.perfil_id,
    status=excluded.status,
    updated_at=now()
  returning * into v;
  return v;
end;
$$;

create or replace function public.erp_comissao_calcular(
  p_competencia date,
  p_usuario_id uuid default null,
  p_meta_faturamento numeric default 0
) returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_calc uuid;
  v_calculado_por uuid;
  v_total numeric := 0;
  v_comissao numeric := 0;
  v_meta numeric := coalesce(p_meta_faturamento,0);
  v_count integer := 0;
begin
  if not public.erp_comissao_autorizado() then
    raise exception 'COMISSOES_NAO_AUTORIZADO';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA: selecione a empresa de trabalho antes de calcular comissões.';
  end if;
  if p_competencia is null or v_meta < 0 then
    raise exception 'COMPETENCIA_OU_META_INVALIDA';
  end if;
  if p_usuario_id is not null and not exists (
    select 1 from public.erp_usuarios
    where id=p_usuario_id and empresa_id=v_empresa
      and ativo=true and deleted_at is null
  ) then
    raise exception 'VENDEDOR_FORA_DA_EMPRESA';
  end if;

  select u.id into v_calculado_por
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid()
    and u.empresa_id=v_empresa
    and u.ativo=true
    and u.deleted_at is null
  limit 1;

  insert into public.erp_comissao_calculos
    (empresa_id,competencia,usuario_id,meta_faturamento,calculado_por)
  values
    (v_empresa,date_trunc('month',p_competencia)::date,p_usuario_id,v_meta,v_calculado_por)
  returning id into v_calc;

  insert into public.erp_comissao_linhas
    (calculo_id,empresa_id,pedido_id,item_id,produto_id,usuario_id,
     quantidade,valor_total,percentual,comissao_liquida)
  select
    v_calc,p.empresa_id,p.id,i.id,i.produto_id,u.id,i.quantidade,
    coalesce(i.total,i.quantidade*i.valor_unitario*(1-coalesce(i.desconto,0)/100)),
    coalesce(r.percentual,0),
    round(coalesce(i.total,i.quantidade*i.valor_unitario*(1-coalesce(i.desconto,0)/100))*coalesce(r.percentual,0)/100,2)
  from public.erp_pedidos_venda p
  join public.erp_pedidos_venda_itens i
    on i.pedido_id=p.id and i.empresa_id=p.empresa_id
  join public.erp_usuarios u
    on u.empresa_id=p.empresa_id and u.ativo=true and u.deleted_at is null
  join public.erp_comissao_vinculos v
    on v.empresa_id=p.empresa_id and v.usuario_id=u.id and v.status='Ativo'
  join public.erp_comissao_regras r
    on r.empresa_id=p.empresa_id and r.perfil_id=v.perfil_id
   and r.produto_id=i.produto_id and r.ativo=true
  where p.empresa_id=v_empresa
    and (p_usuario_id is null or u.id=p_usuario_id)
    and p.data_entrada>=date_trunc('month',p_competencia)::date
    and p.data_entrada<(date_trunc('month',p_competencia)+interval '1 month')::date
    and lower(coalesce(p.status,'')) not in
      ('cancelado','cancelada','rascunho','aberto','cotação','cotacao');

  select coalesce(sum(valor_total),0),
         coalesce(sum(comissao_liquida),0),
         count(*)
    into v_total,v_comissao,v_count
  from public.erp_comissao_linhas
  where calculo_id=v_calc and empresa_id=v_empresa;

  update public.erp_comissao_calculos
  set total_vendas=v_total,
      total_comissao=v_comissao,
      meta_atingida=(v_total>=v_meta and v_meta>0)
  where id=v_calc and empresa_id=v_empresa;

  return jsonb_build_object(
    'calculo_id',v_calc,
    'total_vendas',v_total,
    'total_comissao',v_comissao,
    'meta_atingida',(v_total>=v_meta and v_meta>0),
    'linhas',v_count
  );
end;
$$;

-- Corrige funções que aceitavam MASTER sem contexto e depois tentavam gravar
-- empresa_id NULL em tabelas que exigem tenant.
create or replace function public.erp_decimal_salvar_regra(
  p_codigo text,p_descricao text,p_casas integer
) returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_id uuid;
begin
  if not public.erp_is_master() and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id=auth.uid()
      and u.empresa_id=v_empresa
      and u.ativo=true and u.deleted_at is null
      and upper(trim(coalesce(u.perfil,''))) in ('ADMINISTRADOR','CONTROLADORIA','FINANCEIRO')
  ) then
    raise exception 'CONTROLADORIA_NAO_AUTORIZADA';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA: selecione a empresa de trabalho.';
  end if;
  if btrim(coalesce(p_codigo,''))='' or btrim(coalesce(p_descricao,''))='' then
    raise exception 'Código e descrição são obrigatórios.';
  end if;
  if p_casas is null or p_casas<0 or p_casas>8 then
    raise exception 'Quantidade de casas inválida.';
  end if;
  insert into public.erp_regras_decimais(empresa_id,codigo,descricao,casas)
  values(v_empresa,upper(btrim(p_codigo)),btrim(p_descricao),p_casas)
  on conflict(empresa_id,codigo)
  do update set descricao=excluded.descricao,casas=excluded.casas,
                ativo=true,atualizado_em=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.erp_fiscal_estornar_documento(
  p_documento text,p_data date,p_justificativa text
) returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_id uuid;
begin
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA: selecione a empresa de trabalho.';
  end if;
  if not public.erp_is_master() and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id=auth.uid()
      and u.empresa_id=v_empresa
      and u.ativo=true and u.deleted_at is null
      and upper(trim(coalesce(u.perfil,''))) in ('ADMINISTRADOR','CONTROLADORIA','FINANCEIRO')
  ) then
    raise exception 'ESTORNO_NAO_AUTORIZADO';
  end if;
  if btrim(coalesce(p_documento,''))='' or p_data is null
     or btrim(coalesce(p_justificativa,''))='' then
    raise exception 'DOCUMENTO_DATA_E_JUSTIFICATIVA_OBRIGATORIOS';
  end if;
  if exists (
    select 1 from public.erp_fiscal_estornos
    where empresa_id=v_empresa and documento_alvo=btrim(p_documento)
  ) then
    raise exception 'DOCUMENTO_JA_ESTORNADO';
  end if;
  insert into public.erp_fiscal_estornos
    (empresa_id,documento_alvo,data_estorno,justificativa)
  values
    (v_empresa,btrim(p_documento),p_data,btrim(p_justificativa))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.erp_comissao_salvar_regra(uuid,uuid,numeric,numeric) from public,anon;
grant execute on function public.erp_comissao_salvar_regra(uuid,uuid,numeric,numeric) to authenticated;
revoke all on function public.erp_comissao_vincular(uuid,uuid,text) from public,anon;
grant execute on function public.erp_comissao_vincular(uuid,uuid,text) to authenticated;
revoke all on function public.erp_comissao_calcular(date,uuid,numeric) from public,anon;
grant execute on function public.erp_comissao_calcular(date,uuid,numeric) to authenticated;
revoke all on function public.erp_decimal_salvar_regra(text,text,integer) from public,anon;
grant execute on function public.erp_decimal_salvar_regra(text,text,integer) to authenticated;
revoke all on function public.erp_fiscal_estornar_documento(text,date,text) from public,anon;
grant execute on function public.erp_fiscal_estornar_documento(text,date,text) to authenticated;


-- Saldo do razão calculado no banco sobre todos os lançamentos do tenant,
-- sem limitar o cálculo à grade paginada exibida na interface.
create or replace function public.erp_fiscal_saldo_razao(p_conta_id uuid)
returns numeric
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_saldo_inicial numeric := 0;
  v_movimento numeric := 0;
begin
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA';
  end if;
  if not public.erp_is_master() and not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id=auth.uid()
      and u.empresa_id=v_empresa
      and u.ativo=true and u.deleted_at is null
      and upper(trim(coalesce(u.perfil,''))) in ('ADMINISTRADOR','CONTROLADORIA','FINANCEIRO')
  ) then
    raise exception 'RAZAO_GERAL_NAO_AUTORIZADO';
  end if;

  select coalesce(c.saldo_inicial,0)
    into v_saldo_inicial
  from public.erp_contas_bancarias c
  where c.id=p_conta_id and c.empresa_id=v_empresa and c.ativo=true;

  if not found then
    raise exception 'CONTA_BANCARIA_FORA_DA_EMPRESA';
  end if;

  select coalesce(sum(coalesce(l.credito,0)-coalesce(l.debito,0)),0)
    into v_movimento
  from public.erp_fiscal_razao_lancamentos l
  where l.empresa_id=v_empresa and l.conta_bancaria_id=p_conta_id;

  return v_saldo_inicial + v_movimento;
end;
$$;

revoke all on function public.erp_fiscal_saldo_razao(uuid) from public,anon;
grant execute on function public.erp_fiscal_saldo_razao(uuid) to authenticated;
