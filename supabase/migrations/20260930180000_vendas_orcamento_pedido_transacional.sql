-- ERP INDUSTRIAL — conversão transacional de orçamento em pedido.
-- Reutiliza a análise real de estoque/necessidade de produção do fluxo de pedidos.

create or replace function public.erp_converter_orcamento_em_pedido(p_orcamento_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_orc record;
  v_itens jsonb;
  v_result jsonb;
begin
  if v_empresa is null or auth.uid() is null then
    raise exception 'Sessão empresarial autenticada obrigatória.';
  end if;

  select o.*
    into v_orc
  from public.erp_vendas_orcamentos o
  where o.id = p_orcamento_id
    and o.empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Orçamento não encontrado na empresa atual.';
  end if;

  if v_orc.status = 'CONVERTIDO' then
    raise exception 'Orçamento já convertido.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'produto_id', i.produto_id,
    'quantidade', i.quantidade,
    'valor_unitario', i.preco_unitario
  ) order by i.created_at), '[]'::jsonb)
    into v_itens
  from public.erp_vendas_orcamentos_itens i
  where i.orcamento_id = v_orc.id
    and i.empresa_id = v_empresa;

  if jsonb_array_length(v_itens) = 0 then
    raise exception 'O orçamento não possui itens para conversão.';
  end if;

  v_result := public.erp_criar_pedido_venda_com_analise(
    v_orc.cliente_id,
    v_orc.desconto,
    v_itens,
    null,
    'ORÇAMENTO ' || v_orc.numero::text
  );

  update public.erp_vendas_orcamentos
  set status = 'CONVERTIDO',
      updated_at = now()
  where id = v_orc.id
    and empresa_id = v_empresa;

  return v_result || jsonb_build_object('orcamento_id', v_orc.id, 'orcamento_numero', v_orc.numero);
end;
$$;

revoke all on function public.erp_converter_orcamento_em_pedido(uuid) from public, anon;
grant execute on function public.erp_converter_orcamento_em_pedido(uuid) to authenticated;