-- SYSNQRA ERP INDUSTRIAL — Diários Contábeis por empresa
-- Migration aditiva: mantém o isolamento multiempresa e não cria dados contábeis fictícios.
create table if not exists public.fiscal_diario_contabil (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo varchar(10) not null,
  nome varchar(100) not null,
  tipo varchar(20) not null check (tipo in ('Vendas','Compras','Banco','Caixa','Geral')),
  conta_devedora_padrao varchar(50),
  conta_credora_padrao varchar(50),
  proximo_numero_sequencia integer not null default 1 check (proximo_numero_sequencia >= 1),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint fiscal_diario_contabil_empresa_codigo_key unique (empresa_id, codigo)
);

-- Se a tabela já existia sem tenant, não atribuímos registros antigos a uma empresa por suposição.
alter table public.fiscal_diario_contabil
  add column if not exists empresa_id uuid default public.erp_current_empresa_id();

do $$
begin
  if exists (
    select 1 from public.fiscal_diario_contabil
    where empresa_id is null
  ) then
    raise exception 'fiscal_diario_contabil contém registros sem empresa_id; faça a reconciliação por empresa antes de aplicar esta migration.';
  end if;
end $$;

alter table public.fiscal_diario_contabil
  alter column empresa_id set not null,
  alter column empresa_id set default public.erp_current_empresa_id();

create unique index if not exists uq_fiscal_diario_contabil_empresa_codigo
  on public.fiscal_diario_contabil (empresa_id, codigo);
create index if not exists idx_diario_contabil_empresa_tipo_ativo
  on public.fiscal_diario_contabil (empresa_id, tipo, ativo);
create index if not exists idx_diario_contabil_empresa_codigo
  on public.fiscal_diario_contabil (empresa_id, codigo);

alter table public.fiscal_diario_contabil enable row level security;
alter table public.fiscal_diario_contabil force row level security;

drop policy if exists fiscal_diario_contabil_tenant_select on public.fiscal_diario_contabil;
create policy fiscal_diario_contabil_tenant_select
  on public.fiscal_diario_contabil for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists fiscal_diario_contabil_tenant_insert on public.fiscal_diario_contabil;
create policy fiscal_diario_contabil_tenant_insert
  on public.fiscal_diario_contabil for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists fiscal_diario_contabil_tenant_update on public.fiscal_diario_contabil;
create policy fiscal_diario_contabil_tenant_update
  on public.fiscal_diario_contabil for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update on public.fiscal_diario_contabil to authenticated;
revoke all on public.fiscal_diario_contabil from anon;
