begin;

create table if not exists public.erp_config_pcp (
  empresa_id uuid primary key references public.erp_empresas(id) on delete cascade,
  deposito_wip_padrao text not null,
  tipo_custo_item text not null default 'CUSTO_MEDIO_PONDERADO'
    check (tipo_custo_item in ('CUSTO_MEDIO_PONDERADO','PEPS','ULTIMA_COMPRA')),
  consumo_componentes text not null default 'AUTOMATICA'
    check (consumo_componentes in ('AUTOMATICA','MANUAL')),
  lead_time_geral_dias integer not null default 1
    check (lead_time_geral_dias between 0 and 9999),
  rastreabilidade_operacional text not null default 'LOTE'
    check (rastreabilidade_operacional in ('NENHUMA','LOTE','SERIAL','LOTE_E_SERIAL')),
  lote_padrao_fabrica numeric(18,4) not null default 1
    check (lote_padrao_fabrica > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.erp_config_pcp enable row level security;

drop policy if exists erp_config_pcp_select_empresa on public.erp_config_pcp;
create policy erp_config_pcp_select_empresa
  on public.erp_config_pcp for select to authenticated
  using (exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = erp_config_pcp.empresa_id
      and u.ativo = true
      and u.deleted_at is null
  ));

drop policy if exists erp_config_pcp_insert_empresa on public.erp_config_pcp;
create policy erp_config_pcp_insert_empresa
  on public.erp_config_pcp for insert to authenticated
  with check (exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = erp_config_pcp.empresa_id
      and u.ativo = true
      and u.deleted_at is null
  ));

drop policy if exists erp_config_pcp_update_empresa on public.erp_config_pcp;
create policy erp_config_pcp_update_empresa
  on public.erp_config_pcp for update to authenticated
  using (exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = erp_config_pcp.empresa_id
      and u.ativo = true
      and u.deleted_at is null
  ))
  with check (exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = erp_config_pcp.empresa_id
      and u.ativo = true
      and u.deleted_at is null
  ));

grant select, insert, update on public.erp_config_pcp to authenticated;

commit;
