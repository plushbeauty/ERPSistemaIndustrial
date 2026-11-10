-- SYSNQRA ERP INDUSTRIAL
-- 2026-11-10 — Cálculo de comissão: restringe a base a pedidos efetivamente faturados.
-- Reaplica a RPC existente sem alterar tabelas ou dados históricos.

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
    on u.id=p.vendedor_id and u.empresa_id=p.empresa_id
   and u.ativo=true and u.deleted_at is null
  join public.erp_comissao_vinculos v
    on v.empresa_id=p.empresa_id and v.usuario_id=u.id and v.status='Ativo'
  join public.erp_comissao_regras r
    on r.empresa_id=p.empresa_id and r.perfil_id=v.perfil_id
   and r.produto_id=i.produto_id and r.ativo=true
  where p.empresa_id=v_empresa
    and (p_usuario_id is null or u.id=p_usuario_id)
    and p.data_entrada>=date_trunc('month',p_competencia)::date
    and p.data_entrada<(date_trunc('month',p_competencia)+interval '1 month')::date
    and lower(btrim(coalesce(p.status,'')))='faturado';

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

revoke all on function public.erp_comissao_calcular(date,uuid,numeric) from public,anon;
grant execute on function public.erp_comissao_calcular(date,uuid,numeric) to authenticated;
