begin;

-- A browser-side stock operator must not create an "entrada_nf" movement
-- directly, because that would increase stock without the atomic NF-e posting
-- flow. Trusted SECURITY DEFINER posting functions can still write the ledger.
alter table public.estoque_movimentacoes enable row level security;
drop policy if exists estoque_movimentacoes_block_direct_nfe_insert on public.estoque_movimentacoes;
create policy estoque_movimentacoes_block_direct_nfe_insert
  on public.estoque_movimentacoes
  as restrictive
  for insert
  to authenticated
  with check (tipo <> 'entrada_nf');

commit;
