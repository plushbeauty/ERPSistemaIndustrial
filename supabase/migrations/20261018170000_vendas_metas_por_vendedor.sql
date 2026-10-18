-- Metas comerciais individuais por vendedor.
-- Revision: 2026-10-18 | UI contract: SGQERP Suprema
create table if not exists public.erp_vendas_metas_vendedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  vendedor_id uuid not null references public.erp_usuarios(id) on delete restrict,
  competencia date not null,
  meta_faturamento numeric(18,2) not null default 0 check (meta_faturamento >= 0),
  meta_pedidos integer not null default 0 check (meta_pedidos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, vendedor_id, competencia)
);

create index if not exists idx_erp_vendas_metas_vendedores_empresa_competencia
  on public.erp_vendas_metas_vendedores (empresa_id, competencia);

create index if not exists idx_erp_vendas_metas_vendedores_vendedor
  on public.erp_vendas_metas_vendedores (empresa_id, vendedor_id, competencia);

alter table public.erp_vendas_metas_vendedores enable row level security;

drop policy if exists erp_vendas_metas_vendedores_tenant_access
  on public.erp_vendas_metas_vendedores;

create policy erp_vendas_metas_vendedores_tenant_access
  on public.erp_vendas_metas_vendedores
  for all
  to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete
  on public.erp_vendas_metas_vendedores
  to authenticated;
