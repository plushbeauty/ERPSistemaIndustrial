-- Ficha de processo: identificação industrial, unidade de consumo e operações mestre
alter table public.erp_fichas_tecnicas
  add column if not exists cliente_id uuid references public.erp_clientes(id),
  add column if not exists codigo_cliente text,
  add column if not exists desenho text,
  add column if not exists modelo text;

alter table public.erp_ficha_itens
  add column if not exists unidade_medida text not null default 'UN';

create table if not exists public.erp_operacoes_mestre (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

alter table public.erp_operacoes_mestre enable row level security;
drop policy if exists erp_operacoes_mestre_tenant on public.erp_operacoes_mestre;
create policy erp_operacoes_mestre_tenant on public.erp_operacoes_mestre
  for all using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

create index if not exists idx_erp_fichas_tecnicas_cliente
  on public.erp_fichas_tecnicas(empresa_id,cliente_id);
create index if not exists idx_erp_ficha_itens_componente
  on public.erp_ficha_itens(empresa_id,componente_id);
create index if not exists idx_erp_operacoes_mestre_codigo
  on public.erp_operacoes_mestre(empresa_id,codigo);