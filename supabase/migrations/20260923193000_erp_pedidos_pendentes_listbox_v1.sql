alter table public.erp_pedidos_venda
  add column if not exists pedido_cliente text;

alter table public.erp_pedidos_venda_itens
  add column if not exists produto_cliente text,
  add column if not exists data_fabricacao date,
  add column if not exists lote_fabricacao text;

create index if not exists idx_erp_pedidos_venda_pedido_cliente
  on public.erp_pedidos_venda(empresa_id,pedido_cliente);

create index if not exists idx_erp_pedidos_venda_itens_produto_cliente
  on public.erp_pedidos_venda_itens(empresa_id,produto_cliente);
