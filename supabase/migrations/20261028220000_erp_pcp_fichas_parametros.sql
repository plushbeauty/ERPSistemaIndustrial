-- SYSNQRA ERP INDUSTRIAL · Fichas de processo PCP
-- Revisão: 28/10/2026
-- Guarda parâmetros específicos por produto e tipo de processo; não cria receitas padrão.
create table if not exists public.erp_pcp_fichas_parametros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  tipo_processo text not null check (tipo_processo in ('injetora', 'prensados')),
  maquina_nome text not null,
  capacidade_maquina text not null,
  parametros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_pcp_fichas_parametros_empresa_produto_tipo_key
    unique (empresa_id, produto_id, tipo_processo)
);

create index if not exists erp_pcp_fichas_parametros_empresa_idx
  on public.erp_pcp_fichas_parametros (empresa_id, produto_id);

alter table public.erp_pcp_fichas_parametros enable row level security;

drop policy if exists erp_pcp_fichas_parametros_select_tenant on public.erp_pcp_fichas_parametros;
create policy erp_pcp_fichas_parametros_select_tenant
  on public.erp_pcp_fichas_parametros for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_fichas_parametros_insert_tenant on public.erp_pcp_fichas_parametros;
create policy erp_pcp_fichas_parametros_insert_tenant
  on public.erp_pcp_fichas_parametros for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_fichas_parametros_update_tenant on public.erp_pcp_fichas_parametros;
create policy erp_pcp_fichas_parametros_update_tenant
  on public.erp_pcp_fichas_parametros for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update on public.erp_pcp_fichas_parametros to authenticated;
