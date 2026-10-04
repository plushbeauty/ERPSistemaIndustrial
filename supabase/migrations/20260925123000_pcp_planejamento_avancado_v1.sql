-- PCP avançado: MPS, ordens planejadas, centros de trabalho e fila de exceções.
-- Tenant-aware: empresa_id é preenchido pela infraestrutura ERP existente.

create table if not exists public.erp_pcp_planos_mestres (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 produto_id uuid not null references public.erp_produtos(id),
 periodo_inicio date not null,
 periodo_fim date not null,
 quantidade_prevista numeric(18,3) not null default 0,
 estoque_alvo numeric(18,3) not null default 0,
 demanda_confirmada numeric(18,3) not null default 0,
 status text not null default 'ABERTO',
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 constraint erp_pcp_mps_periodo_ck check(periodo_fim >= periodo_inicio),
 constraint erp_pcp_mps_qtd_ck check(quantidade_prevista >= 0 and estoque_alvo >= 0 and demanda_confirmada >= 0)
);

create table if not exists public.erp_pcp_ordens_planejadas (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 produto_id uuid not null references public.erp_produtos(id),
 quantidade numeric(18,3) not null check(quantidade > 0),
 data_necessaria date not null,
 origem text not null default 'MRP',
 status text not null default 'PLANEJADA',
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);

create table if not exists public.erp_pcp_centros_trabalho (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo text not null,
 nome text not null,
 capacidade_horas_dia numeric(10,2) not null default 8 check(capacidade_horas_dia > 0),
 eficiencia_percent numeric(5,2) not null default 85 check(eficiencia_percent > 0 and eficiencia_percent <= 100),
 ativo boolean not null default true,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 unique(empresa_id,codigo)
);

create table if not exists public.erp_pcp_alertas (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 tipo text not null,
 severidade text not null default 'MEDIA',
 mensagem text not null,
 entidade_tipo text,
 entidade_id uuid,
 status text not null default 'ABERTO',
 criado_em timestamptz not null default now()
);

create index if not exists idx_erp_pcp_mps_empresa_periodo on public.erp_pcp_planos_mestres(empresa_id,periodo_inicio,periodo_fim);
create index if not exists idx_erp_pcp_ordens_planejadas_empresa_data on public.erp_pcp_ordens_planejadas(empresa_id,data_necessaria,status);
create index if not exists idx_erp_pcp_centros_empresa on public.erp_pcp_centros_trabalho(empresa_id,ativo);
create index if not exists idx_erp_pcp_alertas_empresa_status on public.erp_pcp_alertas(empresa_id,status,criado_em desc);

alter table public.erp_pcp_planos_mestres enable row level security;
alter table public.erp_pcp_ordens_planejadas enable row level security;
alter table public.erp_pcp_centros_trabalho enable row level security;
alter table public.erp_pcp_alertas enable row level security;

drop policy if exists erp_pcp_mps_tenant on public.erp_pcp_planos_mestres;
create policy erp_pcp_mps_tenant on public.erp_pcp_planos_mestres for all to authenticated using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master()) with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_pcp_ordens_planejadas_tenant on public.erp_pcp_ordens_planejadas;
create policy erp_pcp_ordens_planejadas_tenant on public.erp_pcp_ordens_planejadas for all to authenticated using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master()) with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_pcp_centros_tenant on public.erp_pcp_centros_trabalho;
create policy erp_pcp_centros_tenant on public.erp_pcp_centros_trabalho for all to authenticated using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master()) with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_pcp_alertas_tenant on public.erp_pcp_alertas;
create policy erp_pcp_alertas_tenant on public.erp_pcp_alertas for all to authenticated using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master()) with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

comment on table public.erp_pcp_planos_mestres is 'Plano Mestre de Produção (MPS) por produto e período.';
comment on table public.erp_pcp_ordens_planejadas is 'Ordens planejadas geradas/revisadas a partir do MRP.';
comment on table public.erp_pcp_centros_trabalho is 'Capacidade nominal e eficiência dos centros de trabalho.';
comment on table public.erp_pcp_alertas is 'Exceções do planejamento PCP.';
