begin;

create table if not exists public.erp_historico_ajustes_maquina (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ficha_id uuid not null references public.erp_fichas_processo(id) on delete cascade,
  data_ajuste timestamptz not null default now(),
  responsavel text not null,
  parametro text not null,
  alteracao text not null,
  status text not null default 'APROVADO',
  criado_por uuid,
  criado_em timestamptz not null default now(),
  constraint erp_historico_ajustes_maquina_status_check
    check (status in ('RASCUNHO', 'EM_ANALISE', 'APROVADO', 'REJEITADO'))
);

create index if not exists idx_erp_hist_ajustes_empresa_data
  on public.erp_historico_ajustes_maquina (empresa_id, data_ajuste desc);

create index if not exists idx_erp_hist_ajustes_ficha_data
  on public.erp_historico_ajustes_maquina (empresa_id, ficha_id, data_ajuste desc);

alter table public.erp_historico_ajustes_maquina enable row level security;

drop policy if exists erp_hist_ajustes_tenant_select
  on public.erp_historico_ajustes_maquina;
create policy erp_hist_ajustes_tenant_select
  on public.erp_historico_ajustes_maquina
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_hist_ajustes_tenant_insert
  on public.erp_historico_ajustes_maquina;
create policy erp_hist_ajustes_tenant_insert
  on public.erp_historico_ajustes_maquina
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1
      from public.erp_fichas_processo f
      where f.id = ficha_id
        and f.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_hist_ajustes_tenant_update
  on public.erp_historico_ajustes_maquina;
create policy erp_hist_ajustes_tenant_update
  on public.erp_historico_ajustes_maquina
  for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1
      from public.erp_fichas_processo f
      where f.id = ficha_id
        and f.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_hist_ajustes_tenant_delete
  on public.erp_historico_ajustes_maquina;
create policy erp_hist_ajustes_tenant_delete
  on public.erp_historico_ajustes_maquina
  for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id());

revoke all on public.erp_historico_ajustes_maquina from anon;
grant select, insert, update, delete on public.erp_historico_ajustes_maquina to authenticated;

commit;
