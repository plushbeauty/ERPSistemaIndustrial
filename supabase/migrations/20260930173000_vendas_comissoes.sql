-- ERP INDUSTRIAL — Comissões de Vendas
-- Estrutura exclusiva do módulo Vendas & Comercial, multi-tenant e sem dados de demonstração.

create table if not exists public.erp_vendas_regras_comissao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  nome text not null,
  tipo text not null default 'FATURAMENTO',
  percentual numeric(8,3) not null default 0 check (percentual >= 0),
  margem_minima numeric(8,3),
  por_recebimento boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_vendas_comissoes_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  funcionario_id uuid references public.erp_funcionarios(id),
  regra_id uuid references public.erp_vendas_regras_comissao(id),
  pedido_venda_id uuid references public.erp_pedidos_venda(id),
  nfe_id uuid references public.erp_documentos_fiscais(id),
  data_referencia date not null default current_date,
  receita_base numeric(14,2) not null default 0,
  percentual numeric(8,3) not null default 0,
  valor_comissao numeric(14,2) not null default 0,
  status text not null default 'PENDENTE',
  gerada_em timestamptz not null default now(),
  paga_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_vendas_regras_comissao_empresa
  on public.erp_vendas_regras_comissao(empresa_id, ativo);

create index if not exists idx_erp_vendas_comissoes_lancamentos_empresa_data
  on public.erp_vendas_comissoes_lancamentos(empresa_id, data_referencia desc);

alter table public.erp_vendas_regras_comissao enable row level security;
alter table public.erp_vendas_comissoes_lancamentos enable row level security;

drop policy if exists erp_vendas_regras_comissao_tenant on public.erp_vendas_regras_comissao;
create policy erp_vendas_regras_comissao_tenant
  on public.erp_vendas_regras_comissao
  for all to authenticated
  using ((empresa_id = public.erp_current_empresa_id()) or public.erp_is_master())
  with check ((empresa_id = public.erp_current_empresa_id()) or public.erp_is_master());

drop policy if exists erp_vendas_comissoes_lancamentos_tenant on public.erp_vendas_comissoes_lancamentos;
create policy erp_vendas_comissoes_lancamentos_tenant
  on public.erp_vendas_comissoes_lancamentos
  for all to authenticated
  using ((empresa_id = public.erp_current_empresa_id()) or public.erp_is_master())
  with check ((empresa_id = public.erp_current_empresa_id()) or public.erp_is_master());

grant select, insert, update, delete
  on public.erp_vendas_regras_comissao, public.erp_vendas_comissoes_lancamentos
  to authenticated;
