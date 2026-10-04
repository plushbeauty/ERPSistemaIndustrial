begin;

create or replace function public.erp_auth_profile()
returns table(
  id uuid,
  auth_user_id uuid,
  nome text,
  email text,
  empresa_id uuid,
  nivel_admin integer,
  setor_id uuid,
  cargo_id uuid,
  ativo boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select u.id,u.auth_user_id,u.nome,u.email,u.empresa_id,u.nivel_admin,u.setor_id,u.cargo_id,u.ativo
  from public.erp_usuarios u
  join public.erp_empresas e on e.id=u.empresa_id and e.ativo=true
  where u.auth_user_id=auth.uid()
    and u.ativo=true
    and u.deleted_at is null
  limit 1
$$;

revoke all on function public.erp_auth_profile() from public;
grant execute on function public.erp_auth_profile() to authenticated, service_role;

commit;
