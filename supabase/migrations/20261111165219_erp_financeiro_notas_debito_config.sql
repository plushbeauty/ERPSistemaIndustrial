create table if not exists public.erp_financeiro_notas_debito_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  prefixo text not null default 'ND',
  proximo_numero bigint not null default 1 check (proximo_numero > 0),
  serie text not null default '1',
  dias_vencimento integer not null default 30 check (dias_vencimento >= 0),
  natureza_padrao text not null default 'COBRANCA',
  layout_pdf text not null default 'PADRAO',
  conta_padrao_id uuid references public.erp_contas_bancarias(id) on delete set null,
  centro_custo_padrao_id uuid references public.erp_centros_custos(id) on delete set null,
  regra_conciliacao text not null default 'MANUAL' check (regra_conciliacao in ('MANUAL','AUTOMATICA_EXATA','TOLERANCIA')),
  tolerancia_divergencia numeric(18,2) not null default 0 check (tolerancia_divergencia >= 0),
  limite_alcada numeric(18,2) not null default 0 check (limite_alcada >= 0),
  multa_percentual numeric(9,4) not null default 0 check (multa_percentual >= 0),
  juros_percentual numeric(9,4) not null default 0 check (juros_percentual >= 0),
  email_auditoria text,
  observacoes_padrao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_financeiro_notas_debito_config_empresa_uk unique (empresa_id)
);
create index if not exists erp_financeiro_notas_debito_config_conta_idx
  on public.erp_financeiro_notas_debito_config(empresa_id,conta_padrao_id);
alter table public.erp_financeiro_notas_debito_config enable row level security;
drop policy if exists erp_financeiro_notas_debito_config_select on public.erp_financeiro_notas_debito_config;
create policy erp_financeiro_notas_debito_config_select on public.erp_financeiro_notas_debito_config
  for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_financeiro_notas_debito_config_insert on public.erp_financeiro_notas_debito_config;
create policy erp_financeiro_notas_debito_config_insert on public.erp_financeiro_notas_debito_config
  for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_financeiro_notas_debito_config_update on public.erp_financeiro_notas_debito_config;
create policy erp_financeiro_notas_debito_config_update on public.erp_financeiro_notas_debito_config
  for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());
grant select,insert,update on public.erp_financeiro_notas_debito_config to authenticated;
