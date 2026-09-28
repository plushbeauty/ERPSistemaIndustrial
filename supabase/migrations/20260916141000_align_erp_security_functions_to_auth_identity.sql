-- Keep industrial tenant/RBAC helpers authoritative from auth.uid().
-- This migration intentionally does not alter the legacy salon functions.
begin;

create or replace function public.erp_current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.empresa_id
  from public.erp_usuarios u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.erp_is_master()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.erp_usuarios u
    where u.id = auth.uid()
      and upper(coalesce(u.role, '')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN')
  )
$$;

create or replace function public.erp_has_permission(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.erp_usuarios u
    join public.erp_permissions p
      on p.modulo = p_modulo
     and split_part(p.codigo, '.', 2) = p_acao
     and p.ativo = true
    join public.erp_role_permissions rp
      on rp.role_id = u.role_id
     and rp.permission_id = p.id
    where u.id = auth.uid()
  )
  or exists (
    select 1
    from public.erp_usuarios u
    join public.erp_cargo_permissoes cp on cp.cargo_id = u.cargo_id
    join public.erp_permissoes p on p.id = cp.permissao_id
    where u.id = auth.uid()
      and cp.permitido = true
      and p.modulo = p_modulo
      and p.acao = p_acao
  );
$$;

revoke all on function public.erp_current_empresa_id() from public;
grant execute on function public.erp_current_empresa_id() to authenticated, service_role;
revoke all on function public.erp_is_master() from public;
grant execute on function public.erp_is_master() to authenticated, service_role;
revoke all on function public.erp_has_permission(text,text) from public;
grant execute on function public.erp_has_permission(text,text) to authenticated, service_role;

commit;
