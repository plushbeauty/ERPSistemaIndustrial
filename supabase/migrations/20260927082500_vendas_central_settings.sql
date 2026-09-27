create table if not exists public.erp_vendas_configuracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.erp_empresas(id),
  dias_validade_orcamento integer not null default 15,
  desconto_maximo_percentual numeric not null default 0,
  bloquear_pedido_sem_estoque boolean not null default false,
  exigir_pedido_cliente boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.erp_vendas_metas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  competencia date not null,
  meta_faturamento numeric not null default 0,
  meta_pedidos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,competencia)
);
alter table public.erp_vendas_configuracoes enable row level security;
alter table public.erp_vendas_metas enable row level security;
create policy if not exists "vendas_config_select" on public.erp_vendas_configuracoes for select to authenticated using(empresa_id=public.erp_current_empresa_id());
create policy if not exists "vendas_config_write" on public.erp_vendas_configuracoes for all to authenticated using(empresa_id=public.erp_current_empresa_id()) with check(empresa_id=public.erp_current_empresa_id());
create policy if not exists "vendas_metas_select" on public.erp_vendas_metas for select to authenticated using(empresa_id=public.erp_current_empresa_id());
create policy if not exists "vendas_metas_write" on public.erp_vendas_metas for all to authenticated using(empresa_id=public.erp_current_empresa_id()) with check(empresa_id=public.erp_current_empresa_id());
grant select,insert,update,delete on public.erp_vendas_configuracoes,public.erp_vendas_metas to authenticated;
