begin;

-- Operational ERP records are restricted to authenticated sessions and the active tenant.
alter table public.pcp_agenda_maquinas enable row level security;
drop policy if exists pcp_agenda_maquinas_tenant on public.pcp_agenda_maquinas;
create policy pcp_agenda_maquinas_tenant
  on public.pcp_agenda_maquinas for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

alter table public.qualidade_especificacoes enable row level security;
drop policy if exists tenant_isolation on public.qualidade_especificacoes;
create policy tenant_isolation
  on public.qualidade_especificacoes for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

alter table public.qualidade_inspecoes enable row level security;
drop policy if exists tenant_isolation on public.qualidade_inspecoes;
create policy tenant_isolation
  on public.qualidade_inspecoes for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

commit;
