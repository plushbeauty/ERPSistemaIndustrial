begin;

create table if not exists public.erp_pcp_planos_mestres (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  produto_id uuid not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  quantidade_prevista numeric(18,3) not null check (quantidade_prevista >= 0),
  estoque_alvo numeric(18,3) not null default 0 check (estoque_alvo >= 0),
  demanda_confirmada numeric(18,3) not null default 0 check (demanda_confirmada >= 0),
  status text not null default 'ABERTO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_pcp_planos_mestres_periodo_ck check (periodo_fim >= periodo_inicio),
  constraint erp_pcp_planos_mestres_empresa_produto_fk foreign key (empresa_id, produto_id)
    references public.erp_produtos (empresa_id, id) on delete restrict,
  constraint erp_pcp_planos_mestres_periodo_uq unique (empresa_id, produto_id, periodo_inicio, periodo_fim)
);

create index if not exists erp_pcp_planos_mestres_empresa_periodo_idx
  on public.erp_pcp_planos_mestres (empresa_id, periodo_inicio, periodo_fim);

create table if not exists public.erp_pcp_ordens_planejadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  produto_id uuid not null,
  quantidade numeric(18,3) not null check (quantidade > 0),
  data_necessaria date not null,
  origem text not null default 'MANUAL',
  status text not null default 'PLANEJADA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_pcp_ordens_planejadas_empresa_produto_fk foreign key (empresa_id, produto_id)
    references public.erp_produtos (empresa_id, id) on delete restrict
);

create index if not exists erp_pcp_ordens_planejadas_empresa_data_idx
  on public.erp_pcp_ordens_planejadas (empresa_id, data_necessaria, status);
create unique index if not exists erp_pcp_ordens_planejadas_mrp_aberta_uq
  on public.erp_pcp_ordens_planejadas (empresa_id, produto_id, origem)
  where origem = 'MRP' and status = 'PLANEJADA';

alter table public.erp_pcp_planos_mestres enable row level security;
alter table public.erp_pcp_ordens_planejadas enable row level security;

drop policy if exists erp_pcp_planos_mestres_tenant on public.erp_pcp_planos_mestres;
create policy erp_pcp_planos_mestres_tenant on public.erp_pcp_planos_mestres
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_ordens_planejadas_tenant on public.erp_pcp_ordens_planejadas;
create policy erp_pcp_ordens_planejadas_tenant on public.erp_pcp_ordens_planejadas
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.erp_pcp_planos_mestres, public.erp_pcp_ordens_planejadas to authenticated;
revoke all on public.erp_pcp_planos_mestres, public.erp_pcp_ordens_planejadas from anon;

commit;