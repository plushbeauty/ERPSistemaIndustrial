-- SYSNQRA ERP INDUSTRIAL
-- Compatibilidade estrutural mínima. A RPC completa é definida pela migration
-- 20261103190000_erp_compras_pedido_completo_atomic.sql.
alter table public.erp_pedidos_compra_itens
  add column if not exists ncm text,
  add column if not exists data_entrega_prometida date,
  add column if not exists ordem_producao_id uuid;
create index if not exists idx_erp_pedidos_compra_itens_ordem_producao
  on public.erp_pedidos_compra_itens(ordem_producao_id);
