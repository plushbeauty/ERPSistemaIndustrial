-- SYNQRA ERP INDUSTRIAL — Setup Wizard tenant-aware
-- Revision: 2026-10-29
-- Persists onboarding preferences and planned setup priorities only.
-- It does not grant permissions or enable modules.
begin;

-- Private rate-limit ledger for the public company registration endpoint.
-- Stores hashes only; browser roles cannot read or write these records.
create table if not exists public.erp_company_signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  email_hash text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_erp_company_signup_attempts_ip_time
  on public.erp_company_signup_attempts (ip_hash, attempted_at desc);
create index if not exists idx_erp_company_signup_attempts_email_time
  on public.erp_company_signup_attempts (email_hash, attempted_at desc);
alter table public.erp_company_signup_attempts enable row level security;
revoke all on public.erp_company_signup_attempts from public, anon, authenticated;
grant select, insert, delete on public.erp_company_signup_attempts to service_role;

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

-- Somente administrador ativo da empresa pode ler ou alterar o onboarding.
-- SECURITY DEFINER evita depender das policies de leitura da tabela de usuários,
-- mas a função só consulta a identidade atual e o tenant resolvido pelo helper canônico.
create or replace function public.erp_can_manage_setup()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $setup$
  select exists (
    select 1
    from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = public.erp_current_empresa_id()
      and u.ativo is true
      and u.deleted_at is null
      and upper(coalesce(u.perfil, '')) in ('ADMIN', 'ADMINISTRADOR')
      and coalesce(u.nivel_admin, 0) >= 1
  );
$setup$;

revoke all on function public.erp_can_manage_setup() from public;
grant execute on function public.erp_can_manage_setup() to authenticated;

drop policy if exists erp_setup_configuracao_select_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_select_tenant
  on public.erp_setup_configuracao for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_can_manage_setup());

drop policy if exists erp_setup_configuracao_insert_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_insert_tenant
  on public.erp_setup_configuracao for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_can_manage_setup()
    and (atualizado_por is null or atualizado_por = auth.uid())
  );

drop policy if exists erp_setup_configuracao_update_tenant on public.erp_setup_configuracao;
create policy erp_setup_configuracao_update_tenant
  on public.erp_setup_configuracao for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_can_manage_setup())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_can_manage_setup()
    and (atualizado_por is null or atualizado_por = auth.uid())
  );

grant select, insert, update on public.erp_setup_configuracao to authenticated;

comment on table public.erp_company_signup_attempts is 'Hashed, private rate-limit events for company onboarding; never contains raw email or IP.';

comment on table public.erp_setup_configuracao is
  'Preferências de onboarding e prioridades de implantação por empresa. Não ativa módulos nem substitui permissões RBAC.';

commit;
