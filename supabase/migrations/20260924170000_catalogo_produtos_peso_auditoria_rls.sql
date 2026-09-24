alter table public.produtos
  add column if not exists peso_liquido numeric,
  add column if not exists peso_bruto numeric;

drop policy if exists logs_insert_authenticated on public.logs_sistema;

create policy logs_insert_authenticated
  on public.logs_sistema
  for insert
  to authenticated
  with check (
    is_master_user()
    or empresa_id = current_empresa_id()
  );