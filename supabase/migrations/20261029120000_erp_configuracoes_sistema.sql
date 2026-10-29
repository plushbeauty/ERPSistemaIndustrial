begin;

create table if not exists public.erp_configuracoes_sistema (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.erp_empresas(id) on delete cascade,
  tolerancia_refugo_percentual numeric(5,2) not null default 2.50 check (tolerancia_refugo_percentual between 0 and 100),
  tempo_setup_padrao_min integer not null default 30 check (tempo_setup_padrao_min between 0 and 1440),
  iot_gateway_url text,
  nfe_ambiente text not null default 'homologacao' check (nfe_ambiente in ('homologacao','producao')),
  nfe_serie_padrao integer not null default 1 check (nfe_serie_padrao between 1 and 999),
  cfop_padrao text,
  icms_aliquota_padrao numeric(5,2) not null default 0 check (icms_aliquota_padrao between 0 and 100),
  ipi_aliquota_padrao numeric(5,2) not null default 0 check (ipi_aliquota_padrao between 0 and 100),
  pis_aliquota_padrao numeric(5,2) not null default 0 check (pis_aliquota_padrao between 0 and 100),
  cofins_aliquota_padrao numeric(5,2) not null default 0 check (cofins_aliquota_padrao between 0 and 100),
  fuso_horario text not null default 'America/Sao_Paulo',
  idioma text not null default 'pt-BR',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.erp_configuracoes_sistema enable row level security;

drop policy if exists erp_configuracoes_sistema_select_tenant on public.erp_configuracoes_sistema;
create policy erp_configuracoes_sistema_select_tenant
  on public.erp_configuracoes_sistema for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_configuracoes_sistema_insert_admin on public.erp_configuracoes_sistema;
create policy erp_configuracoes_sistema_insert_admin
  on public.erp_configuracoes_sistema for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and coalesce(u.nivel_admin, 0) >= 9
    )
  );

drop policy if exists erp_configuracoes_sistema_update_admin on public.erp_configuracoes_sistema;
create policy erp_configuracoes_sistema_update_admin
  on public.erp_configuracoes_sistema for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and coalesce(u.nivel_admin, 0) >= 9
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and coalesce(u.nivel_admin, 0) >= 9
    )
  );

grant select, insert, update on public.erp_configuracoes_sistema to authenticated;

comment on table public.erp_configuracoes_sistema is
  'Parâmetros gerais do SYSNQRA ERP INDUSTRIAL por empresa; credenciais secretas não são armazenadas nesta tabela.';

commit;
