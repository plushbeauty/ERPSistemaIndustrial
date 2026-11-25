-- Unidades de medida do SYSNQRA: tenant ERP usa erp_empresas, não a tabela legada empresas.
create table if not exists public.erp_unidades_medida (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_erp_unidades_medida_empresa_codigo
  on public.erp_unidades_medida (empresa_id, upper(btrim(codigo)));

alter table public.erp_unidades_medida enable row level security;
grant select, insert, update, delete on public.erp_unidades_medida to authenticated;

drop policy if exists erp_unidades_medida_select_tenant on public.erp_unidades_medida;
create policy erp_unidades_medida_select_tenant
  on public.erp_unidades_medida for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_unidades_medida_insert_tenant on public.erp_unidades_medida;
create policy erp_unidades_medida_insert_tenant
  on public.erp_unidades_medida for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_unidades_medida_update_tenant on public.erp_unidades_medida;
create policy erp_unidades_medida_update_tenant
  on public.erp_unidades_medida for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_unidades_medida_delete_tenant on public.erp_unidades_medida;
create policy erp_unidades_medida_delete_tenant
  on public.erp_unidades_medida for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
