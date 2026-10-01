begin;

alter table public.erp_roles
  add column if not exists company_id uuid references public.erp_empresas(id) on delete cascade;

alter table public.erp_audit_logs
  add column if not exists ip_address inet;

alter table public.erp_usuarios
  add column if not exists must_change_password boolean not null default false;

alter table public.erp_usuarios
  add column if not exists password_changed_at timestamptz;

create table if not exists public.erp_user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  user_id uuid not null references public.erp_usuarios(id) on delete cascade,
  permission_id uuid not null references public.erp_permissions(id) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  changed_by uuid not null references public.erp_usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_id)
);

create index if not exists erp_user_permission_overrides_company_user_idx
  on public.erp_user_permission_overrides (empresa_id, user_id);

create index if not exists erp_user_permission_overrides_permission_idx
  on public.erp_user_permission_overrides (permission_id);

create table if not exists public.erp_revoked_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.erp_usuarios(id) on delete cascade,
  revoked_by uuid references public.erp_usuarios(id) on delete set null,
  revoked_at timestamptz not null default now()
);

create index if not exists erp_revoked_auth_sessions_user_idx
  on public.erp_revoked_auth_sessions (user_id, revoked_at desc);

alter table public.erp_revoked_auth_sessions enable row level security;
revoke all on public.erp_revoked_auth_sessions from anon, authenticated;
grant all on public.erp_revoked_auth_sessions to service_role;

alter table public.erp_user_permission_overrides enable row level security;

revoke all on public.erp_user_permission_overrides from anon, authenticated;
grant select on public.erp_user_permission_overrides to authenticated;
grant all on public.erp_user_permission_overrides to service_role;

drop policy if exists erp_roles_authenticated_select on public.erp_roles;
drop policy if exists roles_select on public.erp_roles;
create policy erp_roles_authenticated_select
  on public.erp_roles for select to authenticated
  using (
    ativo = true
    and (
      company_id is null
      or company_id = public.erp_current_empresa_id()
      or public.erp_is_master()
    )
  );

drop policy if exists erp_role_permissions_authenticated_select on public.erp_role_permissions;
drop policy if exists role_permissions_select on public.erp_role_permissions;
create policy erp_role_permissions_authenticated_select
  on public.erp_role_permissions for select to authenticated
  using (
    exists (
      select 1
      from public.erp_roles r
      where r.id = erp_role_permissions.role_id
        and r.ativo = true
        and (r.company_id is null or r.company_id = public.erp_current_empresa_id() or public.erp_is_master())
    )
  );

drop policy if exists erp_user_permission_overrides_select on public.erp_user_permission_overrides;
create policy erp_user_permission_overrides_select
  on public.erp_user_permission_overrides for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('usuarios', 'ver')
  );

drop policy if exists erp_audit_tenant_select on public.erp_audit_logs;
drop policy if exists erp_audit_logs_tenant_select on public.erp_audit_logs;
create policy erp_audit_logs_tenant_select
  on public.erp_audit_logs for select to authenticated
  using (
    public.erp_is_master()
    or (
      empresa_id = public.erp_current_empresa_id()
      and public.erp_has_permission('auditoria', 'ver')
    )
  );

create or replace function public.erp_user_has_permission(
  p_user_id uuid,
  p_modulo text,
  p_acao text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when coalesce(u.is_master, false)
      and coalesce(u.nivel_admin, 0) >= 100
      and upper(coalesce(u.perfil, '')) = 'MASTER'
      and u.empresa_id is null
      then true
    when override.effect = 'allow' then true
    when override.effect = 'deny' then false
    else (
      exists (
        select 1
        from public.erp_roles r
        join public.erp_role_permissions rp on rp.role_id = r.id
        join public.erp_permissions p on p.id = rp.permission_id
        where r.id = u.role_id
          and r.ativo = true
          and (r.company_id is null or r.company_id = u.empresa_id)
          and p.ativo = true
          and p.modulo = p_modulo
          and split_part(p.codigo, '.', 2) = p_acao
      )
      or exists (
        select 1
        from public.erp_cargos c
        join public.erp_cargo_permissoes cp on cp.cargo_id = c.id and cp.permitido = true
        join public.erp_permissoes p on p.id = cp.permissao_id
        where c.id = u.cargo_id
          and c.empresa_id = u.empresa_id
          and c.ativo = true
          and p.modulo = p_modulo
          and p.acao = p_acao
      )
    )
  end
  from public.erp_usuarios u
  left join lateral (
    select o.effect
    from public.erp_user_permission_overrides o
    join public.erp_permissions p on p.id = o.permission_id and p.ativo = true
    where o.user_id = u.id
      and o.empresa_id = u.empresa_id
      and p.modulo = p_modulo
      and split_part(p.codigo, '.', 2) = p_acao
    limit 1
  ) override on true
  where u.id = p_user_id
    and u.ativo = true
    and u.deleted_at is null
    and u.must_change_password = false
    and (
      auth.uid() is null
      or u.auth_user_id <> auth.uid()
      or u.password_changed_at is null
      or to_timestamp((auth.jwt() ->> 'iat')::double precision) >= u.password_changed_at
    )
    and (
      auth.uid() is null
      or not exists (
        select 1 from public.erp_revoked_auth_sessions revoked
        where revoked.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
          and revoked.user_id = u.id
      )
    )
    and (u.empresa_id is not null or (coalesce(u.is_master, false) and coalesce(u.nivel_admin, 0) >= 100))
$$;

revoke all on function public.erp_user_has_permission(uuid, text, text) from public, anon, authenticated;
grant execute on function public.erp_user_has_permission(uuid, text, text) to service_role;

create or replace function public.erp_admin_set_role_permissions(
  p_actor_id uuid,
  p_role_id uuid,
  p_permission_ids uuid[],
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor public.erp_usuarios%rowtype;
  v_role public.erp_roles%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_master boolean;
begin
  select * into v_actor from public.erp_usuarios where id = p_actor_id and ativo = true and deleted_at is null;
  if not found then raise exception 'Administrador inativo ou inexistente'; end if;
  v_master := coalesce(v_actor.is_master, false) and coalesce(v_actor.nivel_admin, 0) >= 100 and upper(coalesce(v_actor.role, '')) = 'MASTER' and v_actor.empresa_id is null;
  if not v_master and not public.erp_user_has_permission(v_actor.id, 'usuarios', 'editar') then raise exception 'Sem permissão para alterar perfis'; end if;
  select * into v_role from public.erp_roles where id = p_role_id and ativo = true;
  if not found then raise exception 'Perfil inexistente ou inativo'; end if;
  if not v_master and (v_role.company_id is distinct from v_actor.empresa_id or coalesce(v_role.nivel, 0) >= coalesce(v_actor.nivel_admin, 0)) then raise exception 'Perfil fora do escopo administrativo'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('permission_id', rp.permission_id) order by rp.permission_id), '[]'::jsonb)
    into v_old from public.erp_role_permissions rp where rp.role_id = p_role_id;
  select coalesce(jsonb_agg(jsonb_build_object('permission_id', p.permission_id) order by p.permission_id), '[]'::jsonb)
    into v_new from (select distinct unnest(coalesce(p_permission_ids, '{}'::uuid[])) as permission_id) p;

  if exists (
    select 1 from unnest(coalesce(p_permission_ids, '{}'::uuid[])) requested(permission_id)
    left join public.erp_permissions permission on permission.id = requested.permission_id and permission.ativo = true
    where permission.id is null
       or (not v_master and not public.erp_user_has_permission(v_actor.id, permission.modulo, split_part(permission.codigo, '.', 2)))
  ) then raise exception 'Permissão inexistente ou não concedível pelo administrador'; end if;

  delete from public.erp_role_permissions where role_id = p_role_id;
  insert into public.erp_role_permissions(role_id, permission_id)
  select p_role_id, requested.permission_id
    from (select distinct unnest(coalesce(p_permission_ids, '{}'::uuid[])) as permission_id) requested;

  insert into public.erp_audit_logs(empresa_id, actor_user_id, action, entity_type, entity_id, old_data, new_data, user_agent)
  values (v_role.company_id, v_actor.id, 'role.permissions_updated', 'erp_role', v_role.id, v_old, v_new, p_user_agent);
end;
$$;

create or replace function public.erp_admin_set_user_permission_override(
  p_actor_id uuid,
  p_user_id uuid,
  p_permission_id uuid,
  p_effect text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor public.erp_usuarios%rowtype;
  v_target public.erp_usuarios%rowtype;
  v_permission public.erp_permissions%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_master boolean;
begin
  select * into v_actor from public.erp_usuarios where id = p_actor_id and ativo = true and deleted_at is null;
  if not found then raise exception 'Administrador inativo ou inexistente'; end if;
  v_master := coalesce(v_actor.is_master, false) and coalesce(v_actor.nivel_admin, 0) >= 100 and upper(coalesce(v_actor.role, '')) = 'MASTER' and v_actor.empresa_id is null;
  if not v_master and not public.erp_user_has_permission(v_actor.id, 'usuarios', 'editar') then raise exception 'Sem permissão para alterar exceções'; end if;
  select * into v_target from public.erp_usuarios where id = p_user_id and ativo = true and deleted_at is null;
  if not found then raise exception 'Usuário alvo inativo ou inexistente'; end if;
  if not v_master and (v_target.empresa_id is distinct from v_actor.empresa_id or coalesce(v_target.nivel_admin, 0) >= coalesce(v_actor.nivel_admin, 0)) then raise exception 'Usuário fora do escopo administrativo'; end if;
  select * into v_permission from public.erp_permissions where id = p_permission_id and ativo = true;
  if not found then raise exception 'Permissão inexistente ou inativa'; end if;
  if p_effect not in ('allow', 'deny', 'inherit') then raise exception 'Exceção inválida'; end if;
  if not v_master and not public.erp_user_has_permission(v_actor.id, v_permission.modulo, split_part(v_permission.codigo, '.', 2)) then raise exception 'O administrador não pode conceder essa permissão'; end if;

  select to_jsonb(o) into v_old from public.erp_user_permission_overrides o where o.user_id = v_target.id and o.permission_id = v_permission.id;
  if p_effect = 'inherit' then
    delete from public.erp_user_permission_overrides where user_id = v_target.id and permission_id = v_permission.id;
    v_new := null;
  else
    insert into public.erp_user_permission_overrides(empresa_id, user_id, permission_id, effect, changed_by)
    values (v_target.empresa_id, v_target.id, v_permission.id, p_effect, v_actor.id)
    on conflict (user_id, permission_id) do update set effect = excluded.effect, changed_by = excluded.changed_by, updated_at = now();
    select to_jsonb(o) into v_new from public.erp_user_permission_overrides o where o.user_id = v_target.id and o.permission_id = v_permission.id;
  end if;

  insert into public.erp_audit_logs(empresa_id, actor_user_id, action, entity_type, entity_id, old_data, new_data, user_agent)
  values (v_target.empresa_id, v_actor.id, 'user.permission_override_updated', 'erp_usuario', v_target.id, v_old, v_new, p_user_agent);
end;
$$;

revoke all on function public.erp_admin_set_role_permissions(uuid, uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.erp_admin_set_user_permission_override(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.erp_admin_set_role_permissions(uuid, uuid, uuid[], text) to service_role;
grant execute on function public.erp_admin_set_user_permission_override(uuid, uuid, uuid, text, text) to service_role;

create or replace function public.erp_admin_revoke_user_sessions(
  p_user_id uuid,
  p_actor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_count integer;
begin
  insert into public.erp_revoked_auth_sessions(session_id, user_id, revoked_by)
  select session.id, session.user_id, p_actor_id
    from auth.sessions session
   where session.user_id = p_user_id
  on conflict (session_id) do update set revoked_at = now(), revoked_by = excluded.revoked_by;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.erp_admin_revoke_user_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.erp_admin_revoke_user_sessions(uuid, uuid) to service_role;

create or replace function public.erp_has_permission(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select public.erp_user_has_permission(u.id, p_modulo, p_acao)
      from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
      limit 1
    ),
    false
  );
$$;

revoke all on function public.erp_has_permission(text, text) from public, anon;
grant execute on function public.erp_has_permission(text, text) to authenticated, service_role;

commit;
