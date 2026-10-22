/*
 * ERP INDUSTRIAL — Reserva transacional de estoque para itens da carteira PCP.
 * Revisão: 2026-10-21
 * Idempotente por item, tenant-aware e serializada pelo lock da linha do produto.
 */
create or replace function public.erp_reservar_saldo_pedido_item(p_pedido_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_item record;
  v_produto record;
  v_reserva_id uuid;
  v_reserva_atual numeric := 0;
  v_total_reservado numeric := 0;
  v_disponivel numeric := 0;
  v_delta numeric := 0;
  v_nova_reserva numeric := 0;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;

  select i.id, i.pedido_id, i.produto_id, i.quantidade
    into v_item
  from public.erp_pedidos_venda_itens i
  where i.id = p_pedido_item_id and i.empresa_id = v_empresa
  for update;
  if not found then raise exception 'Item do pedido não encontrado na empresa atual.'; end if;

  select p.id, greatest(coalesce(p.estoque_atual, 0), 0) as estoque
    into v_produto
  from public.erp_produtos p
  where p.id = v_item.produto_id and p.empresa_id = v_empresa and p.ativo = true
  for update;
  if not found then raise exception 'Produto inativo ou não encontrado na empresa atual.'; end if;

  select r.id, r.quantidade into v_reserva_id, v_reserva_atual
  from public.erp_estoque_reservas r
  where r.empresa_id = v_empresa and r.pedido_item_id = v_item.id and r.status = 'ATIVA'
  for update;
  v_reserva_atual := coalesce(v_reserva_atual, 0);

  select coalesce(sum(r.quantidade), 0) into v_total_reservado
  from public.erp_estoque_reservas r
  where r.empresa_id = v_empresa and r.produto_id = v_item.produto_id and r.status = 'ATIVA';

  -- Só reserva saldo ainda livre; chamadas repetidas não duplicam a quantidade.
  v_disponivel := greatest(v_produto.estoque - greatest(v_total_reservado - v_reserva_atual, 0) - v_reserva_atual, 0);
  v_delta := least(greatest(coalesce(v_item.quantidade, 0) - v_reserva_atual, 0), v_disponivel);
  v_nova_reserva := v_reserva_atual + v_delta;

  if v_delta > 0 then
    if v_reserva_id is not null then
      update public.erp_estoque_reservas
      set quantidade = v_nova_reserva, updated_at = now()
      where id = v_reserva_id and empresa_id = v_empresa;
    else
      insert into public.erp_estoque_reservas(
        empresa_id, pedido_venda_id, pedido_item_id, produto_id, quantidade, status
      )
      values(v_empresa, v_item.pedido_id, v_item.id, v_item.produto_id, v_nova_reserva, 'ATIVA')
      returning id into v_reserva_id;
    end if;

    update public.erp_produto_estoque
    set quantidade_reservada = coalesce(quantidade_reservada, 0) + v_delta,
        quantidade_disponivel = greatest(coalesce(quantidade_disponivel, 0) - v_delta, 0),
        updated_at = now()
    where empresa_id = v_empresa and produto_id = v_item.produto_id;

    insert into public.erp_estoque_movimentos(
      empresa_id, produto_id, tipo, quantidade, origem, pedido_venda_id, observacao
    )
    values(
      v_empresa, v_item.produto_id, 'reserva', v_delta, 'venda', v_item.pedido_id,
      'Reserva transacional iniciada pela carteira de pedidos pendentes do PCP.'
    );
  end if;

  return jsonb_build_object(
    'pedido_item_id', v_item.id,
    'pedido_id', v_item.pedido_id,
    'produto_id', v_item.produto_id,
    'quantidade_pedida', v_item.quantidade,
    'quantidade_reservada', v_nova_reserva,
    'quantidade_reservada_agora', v_delta,
    'quantidade_faltante', greatest(coalesce(v_item.quantidade, 0) - v_nova_reserva, 0),
    'status', case when v_nova_reserva >= coalesce(v_item.quantidade, 0) then 'reservado' else 'reserva_parcial' end
  );
end;
$$;

revoke all on function public.erp_reservar_saldo_pedido_item(uuid) from public, anon;
grant execute on function public.erp_reservar_saldo_pedido_item(uuid) to authenticated;
