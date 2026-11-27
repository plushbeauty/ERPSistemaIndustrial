-- Controle explícito de recebimento parcial para o MRP não contar novamente o que já chegou.
begin;
alter table public.erp_pedidos_compra
 add column if not exists quantidade_recebida numeric not null default 0;
alter table public.erp_pedidos_compra_itens
 add column if not exists quantidade_recebida numeric not null default 0;
update public.erp_pedidos_compra
 set quantidade_recebida=coalesce(quantidade,0)
 where recebido_em is not null and coalesce(quantidade_recebida,0)=0;
update public.erp_pedidos_compra_itens ci
 set quantidade_recebida=coalesce(ci.quantidade,0)
 from public.erp_pedidos_compra pc
 where pc.id=ci.pedido_id and pc.empresa_id=ci.empresa_id
  and pc.recebido_em is not null and coalesce(ci.quantidade_recebida,0)=0;
commit;