begin;
create table if not exists public.erp_pcp_alertas (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
 tipo text not null,
 severidade text not null default 'MEDIA',
 mensagem text not null,
 status text not null default 'ABERTO',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists erp_pcp_alertas_empresa_status_data_idx on public.erp_pcp_alertas (empresa_id,status,created_at desc);
alter table public.erp_pcp_alertas enable row level security;
drop policy if exists erp_pcp_alertas_tenant on public.erp_pcp_alertas;
create policy erp_pcp_alertas_tenant on public.erp_pcp_alertas for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());
grant select,insert,update,delete on public.erp_pcp_alertas to authenticated;
revoke all on public.erp_pcp_alertas from anon;
commit;