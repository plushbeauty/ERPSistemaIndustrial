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
  unique(empresa_id, competencia)
);
create table if not exists public.erp_vendas_depara_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  cliente_id uuid not null references public.erp_clientes(id),
  codigo_interno varchar not null,
  codigo_cliente varchar not null,
  data_cadastro timestamptz not null default now()
);
create unique index if not exists ux_erp_vendas_depara_empresa_cliente_codigo on public.erp_vendas_depara_produtos(empresa_id, cliente_id, codigo_cliente);
create index if not exists ix_erp_vendas_depara_lookup on public.erp_vendas_depara_produtos(empresa_id, cliente_id, codigo_interno);
alter table public.erp_vendas_configuracoes enable row level security;
alter table public.erp_vendas_metas enable row level security;
alter table public.erp_vendas_depara_produtos enable row level security;
drop policy if exists vendas_config_select on public.erp_vendas_configuracoes;
create policy vendas_config_select on public.erp_vendas_configuracoes for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_config_write on public.erp_vendas_configuracoes;
create policy vendas_config_write on public.erp_vendas_configuracoes for all to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_metas_select on public.erp_vendas_metas;
create policy vendas_metas_select on public.erp_vendas_metas for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_metas_write on public.erp_vendas_metas;
create policy vendas_metas_write on public.erp_vendas_metas for all to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_depara_select_empresa on public.erp_vendas_depara_produtos;
create policy vendas_depara_select_empresa on public.erp_vendas_depara_produtos for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_depara_insert_empresa on public.erp_vendas_depara_produtos;
create policy vendas_depara_insert_empresa on public.erp_vendas_depara_produtos for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_depara_update_empresa on public.erp_vendas_depara_produtos;
create policy vendas_depara_update_empresa on public.erp_vendas_depara_produtos for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
drop policy if exists vendas_depara_delete_empresa on public.erp_vendas_depara_produtos;
create policy vendas_depara_delete_empresa on public.erp_vendas_depara_produtos for delete to authenticated using (empresa_id=public.erp_current_empresa_id());
grant select, insert, update, delete on public.erp_vendas_configuracoes, public.erp_vendas_metas, public.erp_vendas_depara_produtos to authenticated;
