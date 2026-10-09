-- WMS lot-level balances with mandatory lot traceability and physical bin addressing.
-- Additive migration: keeps existing ERP stock/lots as the operational source until reconciliation.
begin;

alter table public.erp_estoque_localizacoes
  add column if not exists rua text,
  add column if not exists prateleira text,
  add column if not exists nivel text,
  add column if not exists capacidade_peso_kg numeric(14,3),
  add column if not exists capacidade_volume_m3 numeric(14,4);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'erp_estoque_localizacoes_capacity_ck') then
    alter table public.erp_estoque_localizacoes
      add constraint erp_estoque_localizacoes_capacity_ck
      check (coalesce(capacidade_peso_kg, 0) >= 0 and coalesce(capacidade_volume_m3, 0) >= 0);
  end if;
end $$;

create table if not exists public.almoxarifado_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  lote_id uuid not null references public.erp_estoque_lotes(id) on delete restrict,
  localizacao_id uuid not null references public.erp_estoque_localizacoes(id) on delete restrict,
  quantidade numeric(16,4) not null default 0,
  quantidade_reservada numeric(16,4) not null default 0,
  unidade text not null default 'UN',
  status_estoque text not null default 'LIBERADO'
    check (status_estoque in ('LIBERADO','QUARENTENA','BLOQUEADO','RESERVADO','ESGOTADO')),
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  constraint almoxarifado_estoque_quantidades_ck
    check (quantidade >= 0 and quantidade_reservada >= 0 and quantidade_reservada <= quantidade),
  constraint almoxarifado_estoque_unidade_ck check (length(btrim(unidade)) between 1 and 12),
  constraint almoxarifado_estoque_lote_local_unique unique (empresa_id, lote_id, localizacao_id)
);

create index if not exists idx_almoxarifado_estoque_tenant_product
  on public.almoxarifado_estoque (empresa_id, produto_id, status_estoque);
create index if not exists idx_almoxarifado_estoque_tenant_location
  on public.almoxarifado_estoque (empresa_id, localizacao_id, status_estoque);
create index if not exists idx_almoxarifado_estoque_lot
  on public.almoxarifado_estoque (empresa_id, lote_id);

create or replace function public.erp_validar_almoxarifado_estoque()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lote public.erp_estoque_lotes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória para movimentar saldo por lote.';
  end if;
  if new.empresa_id is distinct from public.erp_current_empresa_id()
     and not coalesce(public.erp_is_master(), false) then
    raise exception 'Saldo de estoque fora da empresa da sessão.';
  end if;

  select * into v_lote
  from public.erp_estoque_lotes
  where id = new.lote_id
  for key share;
  if not found then raise exception 'Lote obrigatório não encontrado.'; end if;
  if v_lote.empresa_id is distinct from new.empresa_id
     or v_lote.produto_id is distinct from new.produto_id then
    raise exception 'Empresa e produto do saldo devem corresponder ao lote informado.';
  end if;

  if not exists (
    select 1 from public.erp_produtos p
    where p.id = new.produto_id and p.empresa_id = new.empresa_id
  ) then raise exception 'Produto não pertence à empresa do saldo.'; end if;

  if not exists (
    select 1 from public.erp_estoque_localizacoes l
    where l.id = new.localizacao_id and l.empresa_id = new.empresa_id and l.ativo = true
  ) then raise exception 'Endereço físico deve estar ativo e pertencer à empresa.'; end if;

  if upper(coalesce(v_lote.status_inspecao, '')) in ('RETIDO','REPROVADO','BLOQUEADO')
     and new.status_estoque = 'LIBERADO' then
    raise exception 'Lote retido/reprovado não pode receber status de estoque LIBERADO.';
  end if;
  if upper(coalesce(v_lote.status_inspecao, '')) in ('RETIDO','REPROVADO','BLOQUEADO')
     and new.status_estoque not in ('QUARENTENA','BLOQUEADO','ESGOTADO') then
    raise exception 'Saldo de lote retido/reprovado deve permanecer em Quarentena/Bloqueado.';
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_erp_validar_almoxarifado_estoque on public.almoxarifado_estoque;
create trigger trg_erp_validar_almoxarifado_estoque
before insert or update on public.almoxarifado_estoque
for each row execute function public.erp_validar_almoxarifado_estoque();

alter table public.almoxarifado_estoque enable row level security;
alter table public.almoxarifado_estoque force row level security;
drop policy if exists almoxarifado_estoque_select_tenant on public.almoxarifado_estoque;
create policy almoxarifado_estoque_select_tenant
  on public.almoxarifado_estoque for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false));
drop policy if exists almoxarifado_estoque_insert_tenant on public.almoxarifado_estoque;
create policy almoxarifado_estoque_insert_tenant
  on public.almoxarifado_estoque for insert to authenticated
  with check ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false))
    and coalesce(public.erp_has_permission('estoque','movimentar'), false));
drop policy if exists almoxarifado_estoque_update_tenant on public.almoxarifado_estoque;
create policy almoxarifado_estoque_update_tenant
  on public.almoxarifado_estoque for update to authenticated
  using ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false))
    and coalesce(public.erp_has_permission('estoque','movimentar'), false))
  with check ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false))
    and coalesce(public.erp_has_permission('estoque','movimentar'), false));
drop policy if exists almoxarifado_estoque_delete_tenant on public.almoxarifado_estoque;
create policy almoxarifado_estoque_delete_tenant
  on public.almoxarifado_estoque for delete to authenticated
  using ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false))
    and coalesce(public.erp_has_permission('estoque','movimentar'), false));

revoke all on public.almoxarifado_estoque from anon;
grant select, insert, update, delete on public.almoxarifado_estoque to authenticated;

commit;
