begin;

create or replace function public.erp_current_company_id()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select public.erp_current_empresa_id()
$function$;

revoke all on function public.erp_current_company_id()
  from public, anon, authenticated, service_role;
grant execute on function public.erp_current_company_id()
  to authenticated;

commit;
