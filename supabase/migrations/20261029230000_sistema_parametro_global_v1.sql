-- SYSNQRA ERP INDUSTRIAL — Parâmetros globais do sistema
-- Acesso restrito à identidade Master. Não armazenar service_role keys ou segredos de infraestrutura aqui.
begin;

create table if not exists public.sistema_parametro_global (
  id uuid primary key default gen_random_uuid(),
  chave varchar(255) not null unique,
  valor text not null,
  descricao varchar(255) not null,
  editavel boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists idx_param_global_chave
  on public.sistema_parametro_global (chave);

create index if not exists idx_param_global_editavel
  on public.sistema_parametro_global (editavel);

create or replace function public.sistema_parametro_global_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_sistema_parametro_global_updated_at on public.sistema_parametro_global;
create trigger trg_sistema_parametro_global_updated_at
before insert or update on public.sistema_parametro_global
for each row execute function public.sistema_parametro_global_set_updated_at();

alter table public.sistema_parametro_global enable row level security;
alter table public.sistema_parametro_global force row level security;

drop policy if exists sistema_parametro_global_master_select on public.sistema_parametro_global;
create policy sistema_parametro_global_master_select
  on public.sistema_parametro_global for select to authenticated
  using (coalesce(public.erp_is_master(), false));

drop policy if exists sistema_parametro_global_master_insert on public.sistema_parametro_global;
create policy sistema_parametro_global_master_insert
  on public.sistema_parametro_global for insert to authenticated
  with check (coalesce(public.erp_is_master(), false));

drop policy if exists sistema_parametro_global_master_update on public.sistema_parametro_global;
create policy sistema_parametro_global_master_update
  on public.sistema_parametro_global for update to authenticated
  using (coalesce(public.erp_is_master(), false))
  with check (coalesce(public.erp_is_master(), false));

revoke all on public.sistema_parametro_global from anon, public;
grant select, insert, update on public.sistema_parametro_global to authenticated;
revoke all on function public.sistema_parametro_global_set_updated_at() from public, anon, authenticated;

comment on table public.sistema_parametro_global is
  'Parâmetros globais administráveis exclusivamente pela identidade Master; não usar para chaves privadas de infraestrutura.';

commit;
