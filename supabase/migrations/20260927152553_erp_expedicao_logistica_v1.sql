create table if not exists public.erp_veiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  placa text not null,
  descricao text,
  capacidade_kg numeric(14,3) not null default 0 check (capacidade_kg >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, placa)
);
create table if not exists public.erp_motoristas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  documento text,
  cnh text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.erp_expedicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero bigint not null,
  status text not null default 'PREPARACAO',
  veiculo_id uuid references public.erp_veiculos(id),
  motorista_id uuid references public.erp_motoristas(id),
  transportadora text,
  capacidade_kg numeric(14,3),
  peso_total_kg numeric(14,3) not null default 0,
  data_expedicao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero)
);
create table if not exists public.erp_expedicao_notas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  expedicao_id uuid not null references public.erp_expedicoes(id) on delete cascade,
  nota_fiscal_id uuid not null references public.erp_notas_fiscais(id) on delete restrict,
  peso_kg numeric(14,3) not null default 0,
  cidade text,
  created_at timestamptz not null default now(),
  unique (expedicao_id, nota_fiscal_id)
);
create index if not exists idx_erp_veiculos_empresa on public.erp_veiculos(empresa_id, ativo);
create index if not exists idx_erp_motoristas_empresa on public.erp_motoristas(empresa_id, ativo);
create index if not exists idx_erp_expedicoes_empresa on public.erp_expedicoes(empresa_id, created_at desc);
create index if not exists idx_erp_expedicao_notas_expedicao on public.erp_expedicao_notas(expedicao_id);
alter table public.erp_veiculos enable row level security;
alter table public.erp_motoristas enable row level security;
alter table public.erp_expedicoes enable row level security;
alter table public.erp_expedicao_notas enable row level security;
