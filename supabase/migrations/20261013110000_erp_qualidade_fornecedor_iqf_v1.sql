begin;

-- IQF: avaliação de fornecedor com critérios ponderados e evidência auditável.
-- Baseado no schema real de public.erp_fornecedores (id, empresa_id, razão social, ativo).

create unique index if not exists erp_fornecedores_id_empresa_iqf_uidx
  on public.erp_fornecedores (id, empresa_id);

create table if not exists public.erp_qualidade_fornecedor_criterios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  codigo text not null,
  nome text not null,
  descricao text,
  peso numeric(7,3) not null default 1 check (peso > 0 and peso <= 100),
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo),
  unique (id, empresa_id)
);

create table if not exists public.erp_qualidade_fornecedor_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  fornecedor_id uuid not null,
  codigo text not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  avaliador_id uuid references public.erp_usuarios(id),
  status text not null default 'rascunho' check (status in ('rascunho','em_avaliacao','concluida','cancelada')),
  observacoes text,
  plano_acao text,
  avaliado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (fornecedor_id, empresa_id)
    references public.erp_fornecedores(id, empresa_id),
  unique (empresa_id, codigo),
  unique (id, empresa_id),
  check (periodo_fim >= periodo_inicio)
);

create table if not exists public.erp_qualidade_fornecedor_avaliacao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  avaliacao_id uuid not null,
  criterio_id uuid not null,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  evidencia_url text,
  avaliado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (avaliacao_id, empresa_id)
    references public.erp_qualidade_fornecedor_avaliacoes(id, empresa_id) on delete cascade,
  foreign key (criterio_id, empresa_id)
    references public.erp_qualidade_fornecedor_criterios(id, empresa_id),
  unique (avaliacao_id, criterio_id)
);

alter table public.erp_qualidade_fornecedor_criterios enable row level security;
alter table public.erp_qualidade_fornecedor_avaliacoes enable row level security;
alter table public.erp_qualidade_fornecedor_avaliacao_itens enable row level security;

drop policy if exists erp_qualidade_fornecedor_criterios_tenant on public.erp_qualidade_fornecedor_criterios;
create policy erp_qualidade_fornecedor_criterios_tenant
  on public.erp_qualidade_fornecedor_criterios for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_qualidade_fornecedor_avaliacoes_tenant on public.erp_qualidade_fornecedor_avaliacoes;
create policy erp_qualidade_fornecedor_avaliacoes_tenant
  on public.erp_qualidade_fornecedor_avaliacoes for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_qualidade_fornecedor_avaliacao_itens_tenant on public.erp_qualidade_fornecedor_avaliacao_itens;
create policy erp_qualidade_fornecedor_avaliacao_itens_tenant
  on public.erp_qualidade_fornecedor_avaliacao_itens for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create index if not exists idx_erp_q_fornecedor_avaliacoes_empresa_periodo
  on public.erp_qualidade_fornecedor_avaliacoes (empresa_id, periodo_fim desc, status);
create index if not exists idx_erp_q_fornecedor_avaliacoes_fornecedor
  on public.erp_qualidade_fornecedor_avaliacoes (empresa_id, fornecedor_id, periodo_fim desc);
create index if not exists idx_erp_q_fornecedor_itens_avaliacao
  on public.erp_qualidade_fornecedor_avaliacao_itens (empresa_id, avaliacao_id);
create index if not exists idx_erp_q_fornecedor_criterios_ativos
  on public.erp_qualidade_fornecedor_criterios (empresa_id, ativo, codigo);

commit;
