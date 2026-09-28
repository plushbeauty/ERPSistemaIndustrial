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
  join public.erp_empresas e on e.id = u.empresa_id and e.ativo = true
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.ativo = true
    and u.deleted_at is null
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
    join public.erp_empresas e on e.id = u.empresa_id and e.ativo = true
    where (u.auth_user_id = auth.uid() or u.id = auth.uid())
      and u.ativo = true
      and u.deleted_at is null
      and (
        coalesce(u.is_master, false) = true
        or coalesce(u.nivel_admin, 0) >= 100
        or upper(coalesce(u.role, '')) in ('MASTER','MASTER_ADMIN','SUPER_ADMIN')
      )
  )
$$;

create or replace function public.erp_has_permission(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.erp_is_master()
    or exists (
      select 1
      from public.erp_usuarios u
      join public.erp_empresas e
        on e.id = u.empresa_id
       and e.ativo = true
      join public.erp_roles r
        on r.id = u.role_id
       and r.ativo = true
      join public.erp_role_permissions rp
        on rp.role_id = r.id
      join public.erp_permissions p
        on p.id = rp.permission_id
       and p.ativo = true
       and p.modulo = p_modulo
       and split_part(p.codigo, '.', 2) = p_acao
      where (u.auth_user_id = auth.uid() or u.id = auth.uid())
        and u.ativo = true
        and u.deleted_at is null
        and u.empresa_id = public.erp_current_empresa_id()
    )
    or exists (
      select 1
      from public.erp_usuarios u
      join public.erp_empresas e
        on e.id = u.empresa_id
       and e.ativo = true
      join public.erp_cargos c
        on c.id = u.cargo_id
       and c.empresa_id = u.empresa_id
       and c.ativo = true
      join public.erp_cargo_permissoes cp
        on cp.cargo_id = c.id
       and cp.permitido = true
      join public.erp_permissoes p
        on p.id = cp.permissao_id
       and p.modulo = p_modulo
       and p.acao = p_acao
      where (u.auth_user_id = auth.uid() or u.id = auth.uid())
        and u.ativo = true
        and u.deleted_at is null
        and u.empresa_id = public.erp_current_empresa_id()
    );
$$;

revoke all on function public.erp_current_empresa_id() from public;
grant execute on function public.erp_current_empresa_id() to authenticated, service_role;
revoke all on function public.erp_is_master() from public;
grant execute on function public.erp_is_master() to authenticated, service_role;
revoke all on function public.erp_has_permission(text,text) from public;
grant execute on function public.erp_has_permission(text,text) to authenticated, service_role;

commit;
