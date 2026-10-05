begin;

create or replace function public.erp_is_master()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and u.deleted_at is null
      and u.is_master = true
      and coalesce(u.nivel_admin, 0) >= 100
      and upper(btrim(coalesce(u.perfil, ''))) = 'MASTER'
      and u.empresa_id is null
  )
$function$;

commit;
