-- Endurecimento do catálogo RBAC e leitura tenant-scoped da auditoria.
alter table public.erp_roles enable row level security;

drop policy if exists erp_roles_authenticated_select on public.erp_roles;
create policy erp_roles_authenticated_select
  on public.erp_roles for select to authenticated
  using (true);

drop policy if exists erp_permissions_authenticated_select on public.erp_permissions;
create policy erp_permissions_authenticated_select
  on public.erp_permissions for select to authenticated
  using (true);

drop policy if exists erp_role_permissions_authenticated_select on public.erp_role_permissions;
create policy erp_role_permissions_authenticated_select
  on public.erp_role_permissions for select to authenticated
  using (true);

drop policy if exists erp_audit_logs_tenant_select on public.erp_audit_logs;
create policy erp_audit_logs_tenant_select
  on public.erp_audit_logs for select to authenticated
  using (empresa_id is null or empresa_id = public.erp_current_empresa_id());
