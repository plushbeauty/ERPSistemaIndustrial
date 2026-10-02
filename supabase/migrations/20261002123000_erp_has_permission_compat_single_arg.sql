begin;

create or replace function public.erp_has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.erp_has_permission(
    split_part(permission_code, '.', 1),
    split_part(permission_code, '.', 2)
  );
$$;

revoke all on function public.erp_has_permission(text) from public, anon;
grant execute on function public.erp_has_permission(text) to authenticated, service_role;

commit;
