create or replace function public.current_empresa_id() returns uuid language sql stable security definer set search_path = pg_catalog, public as $$ select coalesce((select eu.empresa_id from public.erp_usuarios eu where eu.id = auth.uid() limit 1),(select u.empresa_id from public.usuarios u where u.auth_user_id = auth.uid() limit 1)); $$;

create or replace function public.minha_empresa_id() returns uuid language sql stable security definer set search_path = pg_catalog, public as $$ select coalesce((select eu.empresa_id from public.erp_usuarios eu where eu.id = auth.uid() and eu.ativo is true limit 1),(select u.empresa_id from public.usuarios u where u.auth_user_id = auth.uid() and u.ativo is true limit 1)); $$;

create or replace function public.usuario_empresa() returns uuid language sql stable security definer set search_path = pg_catalog, public as $$ select coalesce((select eu.empresa_id from public.erp_usuarios eu where eu.id = auth.uid() limit 1),(select u.empresa_id from public.usuarios u where u.auth_user_id = auth.uid() limit 1)); $$;

create or replace function public.is_master_user() returns boolean language sql stable security definer set search_path = pg_catalog, public as $$ select exists (select 1 from public.erp_usuarios eu where eu.id = auth.uid() and upper(coalesce(eu.role,'')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN')) or exists (select 1 from public.usuarios u where u.auth_user_id = auth.uid() and (coalesce(u.nivel_admin,0) >= 100 or upper(coalesce(u.perfil,'')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN'))); $$;

create or replace function public.usuario_e_admin() returns boolean language sql stable security definer set search_path = pg_catalog, public as $$ select exists (select 1 from public.erp_usuarios eu where eu.id = auth.uid() and upper(coalesce(eu.role,'')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN','ADMIN')) or exists (select 1 from public.usuarios u join public.perfis_sistema ps on ps.id = u.perfil_id where u.auth_user_id = auth.uid() and ps.nome in ('SUPER_ADMIN','ADMIN_SALAO') and u.ativo is true); $$;

create or replace function public.erp_qms_current_user() returns table(usuario_id uuid, empresa_id uuid, setor_id uuid, nivel_admin integer) language sql stable security definer set search_path = pg_catalog, public as $$ select u.id,u.empresa_id,u.setor_id,coalesce(u.nivel_admin,case when upper(coalesce(u.role,'')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN') then 100 else 0 end) from public.erp_usuarios u where u.id=auth.uid() and u.ativo=true limit 1; $$;

revoke all on function public.current_empresa_id() from public;
revoke all on function public.minha_empresa_id() from public;
revoke all on function public.usuario_empresa() from public;
revoke all on function public.is_master_user() from public;
revoke all on function public.usuario_e_admin() from public;
revoke all on function public.erp_qms_current_user() from public;

grant execute on function public.current_empresa_id() to authenticated, service_role;
grant execute on function public.minha_empresa_id() to authenticated, service_role;
grant execute on function public.usuario_empresa() to authenticated, service_role;
grant execute on function public.is_master_user() to authenticated, service_role;
grant execute on function public.usuario_e_admin() to authenticated, service_role;
grant execute on function public.erp_qms_current_user() to authenticated, service_role;
