-- Restore the concurrent-inventory snapshot hook for outbound stock movements.
-- The preceding migration replaces the function and drops the old trigger to
-- prevent duplicate trigger execution; this migration attaches exactly one hook.
begin;

drop trigger if exists trg_erp_estoque_venda_concorrente
  on public.erp_estoque_movimentos;

create trigger trg_erp_estoque_venda_concorrente
after insert on public.erp_estoque_movimentos
for each row
execute function public.erp_estoque_registrar_venda_concorrente();

commit;