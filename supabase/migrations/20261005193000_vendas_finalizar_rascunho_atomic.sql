/* VENDAS — finalização atômica de rascunho existente.
   Evita duplicar pedido quando o usuário edita um rascunho e clica Finalizar.
*/
create or replace function public.erp_finalizar_rascunho_pedido_venda(p_pedido_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_status text;
  v_cliente uuid;
  v_item record;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.';
  end if;
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid()
    and u.empresa_id=v_empresa
    and u.ativo=true
    and u.deleted_at is null
  limit 1;

  if v_usuario is null then
    raise exception 'Usuário ERP não localizado para a empresa atual.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select p.status,p.cliente_id
    into v_status,v_cliente
  from public.erp_pedidos_venda p
  where p.id=p_pedido_id
    and p.empresa_id=v_empresa
  for update;

  if not found then
    raise exception 'Rascunho não localizado na empresa atual.';
  end if;

  if upper(coalesce(v_status,'')) <> 'RASCUNHO' then
    raise exception 'Somente pedidos em RASCUNHO podem ser finalizados por este fluxo.';
  end if;

  if v_cliente is null or not exists(
    select 1 from public.erp_clientes c
    where c.id=v_cliente and c.empresa_id=v_empresa and c.ativo=true
  ) then
    raise exception 'Cliente inválido para a empresa atual.';
  end if;

  if not exists(
    select 1 from public.erp_pedidos_venda_itens i
    where i.pedido_id=p_pedido_id and i.empresa_id=v_empresa and i.quantidade>0
  ) then
    raise exception 'O pedido precisa ter pelo menos um item válido.';
  end if;

  for v_item in
    select i.id,i.produto_id,i.quantidade
    from public.erp_pedidos_venda_itens i
    where i.pedido_id=p_pedido_id
      and i.empresa_id=v_empresa
    for update
  loop
    if v_item.produto_id is null or v_item.quantidade is null or v_item.quantidade<=0 then
      raise exception 'Item inválido no pedido.';
    end if;

    select greatest(coalesce(p.estoque_atual,0),0)
      into v_estoque
    from public.erp_produtos p
    where p.id=v_item.produto_id
      and p.empresa_id=v_empresa
      and p.ativo=true
    for update;

    if not found then
      raise exception 'Produto do pedido está inativo ou não pertence à empresa.';
    end if;

    select coalesce(sum(r.quantidade),0)
      into v_reservado
    from public.erp_estoque_reservas r
    where r.empresa_id=v_empresa
      and r.produto_id=v_item.produto_id
      and r.status='ATIVA'
      and r.pedido_venda_id<>p_pedido_id;

    v_disponivel := greatest(v_estoque-v_reservado,0);
    v_reserva := least(v_item.quantidade,v_disponivel);

    if not exists(
      select 1 from public.erp_estoque_reservas r
      where r.empresa_id=v_empresa
        and r.pedido_venda_id=p_pedido_id
        and r.pedido_item_id=v_item.id
        and r.produto_id=v_item.produto_id
        and r.status='ATIVA'
    ) and v_reserva>0 then
      insert into public.erp_estoque_reservas(
        empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status
      ) values (
        v_empresa,p_pedido_id,v_item.id,v_item.produto_id,v_reserva,'ATIVA'
      );
    end if;
  end loop;

  update public.erp_pedidos_venda
  set status='Aguardando Produção',
      updated_at=now()
  where id=p_pedido_id
    and empresa_id=v_empresa;

  return p_pedido_id;
end;
$$;

revoke all on function public.erp_finalizar_rascunho_pedido_venda(uuid) from public,anon;
grant execute on function public.erp_finalizar_rascunho_pedido_venda(uuid) to authenticated;
