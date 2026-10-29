-- SYNQRA ERP INDUSTRIAL — Setup Wizard tenant-aware
-- Revision: 2026-10-29
-- Persists onboarding preferences and planned setup priorities only.
-- It does not grant permissions or enable modules.
begin;

create table if not exists public.erp_setup_configuracao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.erp_empresas(id) on delete cascade,
  idioma varchar(10) not null default 'pt-BR',
  fuso_horario varchar(64) not null default 'America/Sao_Paulo',
  moeda varchar(3) not null default 'BRL',
  ano_fiscal_inicio date not null,
  modulos_planejados text[] not null default array[]::text[],
  requisitos_industriais text[] not null default array[]::text[],
  wizard_concluido_em timestamptz,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint erp_setup_configuracao_moeda_ck check (moeda in ('BRL','USD','EUR')),
  constraint erp_setup_configuracao_modulos_ck check (
    modulos_planejados <@ array['compras','estoque','pcp','qualidade','financeiro','rh','vendas']::text[]
  ),
  constraint erp_setup_configuracao_requisitos_ck check (
    requisitos_industriais <@ array['produtos','estruturas','centros_trabalho','capacidade','rastreabilidade','custos']::text[]
  )
);

create index if not exists idx_erp_setup_configuracao_empresa
  on public.erp_setup_configuracao (empresa_id);

alter table public.erp_setup_configuracao enable row level security;

drop policy if exists erp_setup_configuracao_select_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_select_tenant
  on public.erp_setup_configuracao for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_setup_configuracao_insert_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_insert_tenant
  on public.erp_setup_configuracao for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (atualizado_por is null or atualizado_por = auth.uid())
  );

drop policy if exists erp_setup_configuracao_update_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_update_tenant
  on public.erp_setup_configuracao for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (atualizado_por is null or atualizado_por = auth.uid())
  );

grant select, insert, update on public.erp_setup_configuracao to authenticated;

comment on table public.erp_setup_configuracao is
  'Preferências de onboarding e prioridades de implantação por empresa. Não ativa módulos nem substitui permissões RBAC.';

commit;
