-- Keep exactly one inventory snapshot trigger for each stock movement.
-- Two differently named triggers were invoking the same function and doubling
-- concurrent outbound quantities during open cycle counts.
begin;

drop trigger if exists trg_erp_estoque_registrar_venda_concorrente
  on public.erp_estoque_movimentos;

commit;
