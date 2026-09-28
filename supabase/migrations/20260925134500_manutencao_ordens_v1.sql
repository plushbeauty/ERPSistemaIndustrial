create table if not exists public.erp_manutencao_ordens (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ativo_id uuid not null references public.erp_maquinas(id),
 tipo text not null check(tipo in ('PREVENTIVA','CORRETIVA','PREDITIVA')),
 descricao text not null,
 prioridade text not null default 'MEDIA',
 status text not null default 'ABERTA',
 data_prevista date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_erp_manut_ordens_empresa_status on public.erp_manutencao_ordens(empresa_id,status,data_prevista);
alter table public.erp_manutencao_ordens enable row level security;
drop policy if exists erp_manut_ordens_tenant on public.erp_manutencao_ordens;
create policy erp_manut_ordens_tenant on public.erp_manutencao_ordens for all to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());