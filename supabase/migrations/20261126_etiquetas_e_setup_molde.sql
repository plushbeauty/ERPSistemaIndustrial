-- SYSNQRA ERP INDUSTRIAL — etiquetas multi-impressora e setup de molde
-- Migration aditiva e reexecutável. Não altera nem remove dados existentes.
begin;

create table if not exists public.erp_label_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  nome text not null,
  modelo_base text not null default 'PADRAO_50X30',
  impressora_alvo text not null,
  linguagem_nativa text not null check (linguagem_nativa in ('PPLA','PPLB','ZPL','TSPL')),
  largura_mm numeric(7,2) not null check (largura_mm between 20 and 110),
  altura_mm numeric(7,2) not null check (altura_mm between 20 and 200),
  colunas smallint not null default 1 check (colunas in (1,2)),
  espacamento_colunas_mm numeric(7,2) not null default 0 check (espacamento_colunas_mm >= 0),
  orientacao text not null default 'portrait' check (orientacao in ('portrait','landscape')),
  campos_ativos jsonb not null default '{}'::jsonb,
  padrao_empresa boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_erp_label_templates_empresa_ativo
  on public.erp_label_templates (empresa_id, ativo, nome);

alter table public.erp_label_templates enable row level security;

drop policy if exists erp_label_templates_select_tenant on public.erp_label_templates;
create policy erp_label_templates_select_tenant
  on public.erp_label_templates for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_label_templates_insert_tenant on public.erp_label_templates;
create policy erp_label_templates_insert_tenant
  on public.erp_label_templates for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_label_templates_update_tenant on public.erp_label_templates;
create policy erp_label_templates_update_tenant
  on public.erp_label_templates for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_label_templates_delete_tenant on public.erp_label_templates;
create policy erp_label_templates_delete_tenant
  on public.erp_label_templates for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on public.erp_label_templates to authenticated;

alter table public.erp_pcp_paradas
  add column if not exists molde_anterior_id uuid,
  add column if not exists molde_novo_id uuid;

commit;
