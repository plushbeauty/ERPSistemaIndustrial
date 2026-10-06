create or replace function public.erp_has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select public.erp_is_master()
  or exists (
    select 1
    from public.erp_usuarios u
    join public.erp_role_permissions rp on rp.role_id=u.role_id
    join public.erp_permissions p on p.id=rp.permission_id
    where u.auth_user_id=auth.uid()
      and u.ativo=true
      and u.deleted_at is null
      and p.code=lower(btrim(p_code))
  )
$function$;
revoke execute on function public.erp_has_permission(text) from anon;
revoke execute on function public.erp_has_permission(text) from public;
grant execute on function public.erp_has_permission(text) to authenticated;
