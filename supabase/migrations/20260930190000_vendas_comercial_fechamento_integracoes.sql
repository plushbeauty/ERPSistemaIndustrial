/*
 ERP INDUSTRIAL — Vendas & Comercial fechamento funcional 2026-09-30
 Complementa o fluxo comercial sem dados demonstrativos.
*/
alter table public.erp_tabelas_preco
  add column if not exists validade_inicio date,
  add column if not exists validade_fim date,
  add column if not exists margem_minima numeric(8,3) not null default 0,
  add column if not exists desconto_maximo numeric(8,3) not null default 0;

alter table public.erp_pedidos_venda
  add column if not exists credito_status text not null default 'PENDENTE',
  add column if not exists credito_motivo text,
  add column if not exists credito_analisado_em timestamptz;

create index if not exists idx_erp_pedidos_venda_credito
  on public.erp_pedidos_venda(empresa_id, credito_status, status);

create or replace function public.erp_validar_credito_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_pedido record;
  v_limite numeric := 0;
  v_exposicao numeric := 0;
  v_disponivel numeric := 0;
  v_bloqueado boolean := false;
  v_motivo text := null;
begin
  if v_empresa is null or auth.uid() is null then
    raise exception 'Sessão empresarial autenticada obrigatória.';
  end if;

  select p.id,p.empresa_id,p.cliente_id,p.total,p.status
    into v_pedido
  from public.erp_pedidos_venda p
  where p.id=p_pedido_id and p.empresa_id=v_empresa
  for update;

  if not found then raise exception 'Pedido não encontrado na empresa atual.'; end if;

  select greatest(coalesce(c.limite_credito,0),0)
    into v_limite
  from public.erp_clientes c
  where c.id=v_pedido.cliente_id and c.empresa_id=v_empresa;

  select coalesce(sum(p.total),0)
    into v_exposicao
  from public.erp_pedidos_venda p
  where p.empresa_id=v_empresa
    and p.cliente_id=v_pedido.cliente_id
    and p.id<>v_pedido.id
    and lower(coalesce(p.status,'')) not in ('cancelado','cancelada','faturado','expedido');

  v_disponivel := v_limite-v_exposicao;
  v_bloqueado := v_limite<=0 or v_pedido.total>v_disponivel;
  if v_limite<=0 then
    v_motivo := 'Cliente sem limite de crédito cadastrado.';
  elsif v_pedido.total>v_disponivel then
    v_motivo := format('Pedido excede o crédito disponível. Disponível: %s.', round(v_disponivel,2));
  end if;

  update public.erp_pedidos_venda
     set credito_status=case when v_bloqueado then 'BLOQUEADO' else 'APROVADO' end,
         credito_motivo=v_motivo,
         credito_analisado_em=now(),
         updated_at=now()
   where id=v_pedido.id and empresa_id=v_empresa;

  return jsonb_build_object(
    'pedido_id',v_pedido.id,
    'limite',v_limite,
    'exposicao',v_exposicao,
    'disponivel',v_disponivel,
    'total_pedido',v_pedido.total,
    'aprovado',not v_bloqueado,
    'status',case when v_bloqueado then 'BLOQUEADO' else 'APROVADO' end,
    'motivo',v_motivo
  );
end;
$$;

revoke all on function public.erp_validar_credito_pedido(uuid) from public,anon;
grant execute on function public.erp_validar_credito_pedido(uuid) to authenticated;

create or replace function public.erp_reajustar_tabela_preco_em_lote(
  p_tabela_id uuid,
  p_percentual numeric,
  p_respeitar_custo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_count integer := 0;
  v_item record;
  v_novo numeric;
  v_custo numeric;
  v_minimo numeric;
begin
  if v_empresa is null or auth.uid() is null then raise exception 'Sessão empresarial autenticada obrigatória.'; end if;
  if abs(coalesce(p_percentual,0))>100 then raise exception 'Reajuste fora da faixa permitida.'; end if;

  if not exists(select 1 from public.erp_tabelas_preco t where t.id=p_tabela_id and t.empresa_id=v_empresa) then
    raise exception 'Tabela de preço não encontrada na empresa atual.';
  end if;

  for v_item in
    select i.id,i.preco,p.custo_ultimo,t.margem_minima
    from public.erp_tabelas_preco_itens i
    join public.erp_tabelas_preco t on t.id=i.tabela_preco_id and t.empresa_id=v_empresa
    join public.erp_produtos p on p.id=i.produto_id and p.empresa_id=v_empresa
    where i.tabela_preco_id=p_tabela_id and i.empresa_id=v_empresa
    for update
  loop
    v_custo := greatest(coalesce(v_item.custo_ultimo,0),0);
    v_novo := round(v_item.preco*(1+coalesce(p_percentual,0)/100),4);
    v_minimo := case when v_item.margem_minima>0 then v_custo/(1-v_item.margem_minima/100) else v_custo end;
    if p_respeitar_custo and v_novo<v_minimo then
      raise exception 'Reajuste bloqueado: preço do produto ficaria abaixo do custo/margem mínima.';
    end if;
    update public.erp_tabelas_preco_itens set preco=v_novo,updated_at=now() where id=v_item.id and empresa_id=v_empresa;
    v_count := v_count+1;
  end loop;

  return jsonb_build_object('tabela_id',p_tabela_id,'itens_atualizados',v_count,'percentual',p_percentual);
end;
$$;

revoke all on function public.erp_reajustar_tabela_preco_em_lote(uuid,numeric,boolean) from public,anon;
grant execute on function public.erp_reajustar_tabela_preco_em_lote(uuid,numeric,boolean) to authenticated;

alter table public.erp_expedicao_notas
  add column if not exists documento_fiscal_id uuid references public.erp_documentos_fiscais(id);

create index if not exists idx_erp_expedicao_notas_documento_fiscal
  on public.erp_expedicao_notas(documento_fiscal_id);

create table if not exists public.erp_expedicao_volumes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  expedicao_id uuid not null references public.erp_expedicoes(id) on delete cascade,
  codigo_barras text not null,
  descricao text,
  peso_kg numeric(14,3) not null default 0,
  conferido boolean not null default false,
  conferido_em timestamptz,
  created_at timestamptz not null default now(),
  unique(empresa_id,expedicao_id,codigo_barras)
);

alter table public.erp_expedicao_volumes enable row level security;
drop policy if exists erp_expedicao_volumes_tenant on public.erp_expedicao_volumes;
create policy erp_expedicao_volumes_tenant
  on public.erp_expedicao_volumes for all to authenticated
  using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

grant select,insert,update,delete on public.erp_expedicao_volumes to authenticated;

create or replace function public.erp_conferir_volume_expedicao(p_expedicao_id uuid,p_codigo_barras text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_id uuid;
begin
  update public.erp_expedicao_volumes
     set conferido=true,conferido_em=now()
   where expedicao_id=p_expedicao_id
     and empresa_id=v_empresa
     and codigo_barras=trim(p_codigo_barras);
  if not found then raise exception 'Volume não localizado no romaneio.'; end if;
  return jsonb_build_object('conferido',true,'codigo_barras',trim(p_codigo_barras));
end;
$$;

revoke all on function public.erp_conferir_volume_expedicao(uuid,text) from public,anon;
grant execute on function public.erp_conferir_volume_expedicao(uuid,text) to authenticated;

create or replace function public.erp_liberar_expedicao(p_expedicao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_total integer; v_ok integer;
begin
  select count(*),count(*) filter(where conferido) into v_total,v_ok
  from public.erp_expedicao_volumes where expedicao_id=p_expedicao_id and empresa_id=v_empresa;
  if v_total>0 and v_ok<>v_total then raise exception 'Saída bloqueada: existem volumes não conferidos.'; end if;
  update public.erp_expedicoes set status='LIBERADA',updated_at=now()
   where id=p_expedicao_id and empresa_id=v_empresa and status='PREPARACAO';
  if not found then raise exception 'Romaneio não está em preparação ou não pertence à empresa atual.'; end if;
  return jsonb_build_object('expedicao_id',p_expedicao_id,'status','LIBERADA','volumes',v_total);
end;
$$;

revoke all on function public.erp_liberar_expedicao(uuid) from public,anon;
grant execute on function public.erp_liberar_expedicao(uuid) to authenticated;

create or replace function public.erp_gerar_contas_pagar_comissoes(p_data date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id(); v_count integer:=0; v_row record; v_pagar_id uuid;
begin
  if v_empresa is null or auth.uid() is null then raise exception 'Sessão empresarial autenticada obrigatória.'; end if;
  for v_row in
    select l.id,l.valor_comissao,l.data_referencia,l.funcionario_id,r.nome,r.por_recebimento
    from public.erp_vendas_comissoes_lancamentos l
    left join public.erp_vendas_regras_comissao r on r.id=l.regra_id
    where l.empresa_id=v_empresa
      and l.status=case when coalesce(r.por_recebimento,false) then 'RECEBIDO' else 'PENDENTE' end
      and l.valor_comissao>0
  loop
    if not exists(select 1 from public.erp_contas_pagar cp where cp.empresa_id=v_empresa and cp.documento='COMISSAO-'||v_row.id::text) then
      insert into public.erp_contas_pagar(empresa_id,descricao,documento,valor,vencimento,status)
      values(v_empresa,'Comissão de vendas - '||coalesce(v_row.nome,'Regra comercial'),'COMISSAO-'||v_row.id::text,v_row.valor_comissao,coalesce(p_data,current_date),'aberta')
      returning id into v_pagar_id;
      update public.erp_vendas_comissoes_lancamentos set status='GERADA_AP',updated_at=now() where id=v_row.id and empresa_id=v_empresa;
      v_count:=v_count+1;
    end if;
  end loop;
  return jsonb_build_object('contas_pagar_geradas',v_count);
end;
$$;

revoke all on function public.erp_gerar_contas_pagar_comissoes(date) from public,anon;
grant execute on function public.erp_gerar_contas_pagar_comissoes(date) to authenticated;

create table if not exists public.erp_vendas_rma_tratamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  devolucao_id uuid not null references public.erp_vendas_devolucoes(id) on delete cascade,
  acao_sgq text not null,
  observacao text,
  fiscal_status text not null default 'PENDENTE',
  financeiro_status text not null default 'PENDENTE',
  estoque_status text not null default 'PENDENTE',
  created_at timestamptz not null default now()
);

alter table public.erp_vendas_rma_tratamentos enable row level security;
drop policy if exists erp_vendas_rma_tratamentos_tenant on public.erp_vendas_rma_tratamentos;
create policy erp_vendas_rma_tratamentos_tenant on public.erp_vendas_rma_tratamentos for all to authenticated
 using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
 with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update,delete on public.erp_vendas_rma_tratamentos to authenticated;

create or replace function public.erp_registrar_tratamento_rma(p_devolucao_id uuid,p_acao_sgq text,p_observacao text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_status text;
begin
  if p_acao_sgq not in ('QUARENTENA','RETRABALHO','SUCATA','LIBERACAO') then raise exception 'Ação SGQ inválida.'; end if;
  if not exists(select 1 from public.erp_vendas_devolucoes where id=p_devolucao_id and empresa_id=v_empresa) then raise exception 'RMA não encontrado na empresa atual.'; end if;
  insert into public.erp_vendas_rma_tratamentos(empresa_id,devolucao_id,acao_sgq,observacao,estoque_status,fiscal_status,financeiro_status)
  values(v_empresa,p_devolucao_id,p_acao_sgq,p_observacao,
    case when p_acao_sgq='LIBERACAO' then 'ENTRADA' else 'PENDENTE' end,
    case when p_acao_sgq in ('RETRABALHO','SUCATA','LIBERACAO') then 'ANALISAR' else 'PENDENTE' end,
    case when p_acao_sgq in ('RETRABALHO','SUCATA','LIBERACAO') then 'ANALISAR' else 'PENDENTE' end);
  update public.erp_vendas_devolucoes set tratamento_sgq=p_acao_sgq,status='EM_ANALISE',updated_at=now()
   where id=p_devolucao_id and empresa_id=v_empresa;
  return jsonb_build_object('devolucao_id',p_devolucao_id,'acao_sgq',p_acao_sgq,'status','EM_ANALISE');
end;
$$;

revoke all on function public.erp_registrar_tratamento_rma(uuid,text,text) from public,anon;
grant execute on function public.erp_registrar_tratamento_rma(uuid,text,text) to authenticated;
