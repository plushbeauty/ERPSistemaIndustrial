begin;

alter table public.erp_roles
  add column if not exists empresa_id uuid references public.erp_empresas(id) on delete cascade;

alter table public.erp_roles drop constraint if exists erp_roles_codigo_key;
create unique index if not exists erp_roles_global_codigo_uidx
  on public.erp_roles (codigo) where empresa_id is null;
create unique index if not exists erp_roles_tenant_codigo_uidx
  on public.erp_roles (empresa_id, codigo) where empresa_id is not null;
create index if not exists erp_roles_empresa_nivel_idx
  on public.erp_roles (empresa_id, nivel desc);

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
       and (r.empresa_id is null or r.empresa_id = u.empresa_id)
      join public.erp_role_permissions rp
        on rp.role_id = r.id
      join public.erp_permissions p
        on p.id = rp.permission_id
       and p.ativo = true
       and p.modulo = p_modulo
       and split_part(p.codigo, '.', 2) = p_acao
      where u.auth_user_id = auth.uid()
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
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.empresa_id = public.erp_current_empresa_id()
    )
$$;

revoke all on function public.erp_has_permission(text, text) from public, anon;
grant execute on function public.erp_has_permission(text, text) to authenticated, service_role;

drop policy if exists erp_roles_authenticated_select on public.erp_roles;
drop policy if exists roles_select on public.erp_roles;
create policy erp_roles_authenticated_select
  on public.erp_roles for select to authenticated
  using (
    public.erp_is_master()
    or (
      ativo = true
      and (empresa_id is null or empresa_id = public.erp_current_empresa_id())
    )
  );

drop policy if exists erp_roles_tenant_insert on public.erp_roles;
create policy erp_roles_tenant_insert
  on public.erp_roles for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_current_empresa_id() is not null
    and nivel < 100
    and codigo not in ('MASTER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER')
    and public.erp_has_permission('usuarios', 'editar')
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and erp_roles.nivel < u.nivel_admin
        and u.empresa_id = public.erp_current_empresa_id()
        and erp_roles.nivel < u.nivel_admin
    )
  );

drop policy if exists erp_roles_tenant_update on public.erp_roles;
create policy erp_roles_tenant_update
  on public.erp_roles for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('usuarios', 'editar')
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and erp_roles.nivel < u.nivel_admin
        and u.empresa_id = public.erp_current_empresa_id()
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and nivel < 100
    and codigo not in ('MASTER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER')
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and nivel < u.nivel_admin
        and u.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_roles_tenant_delete on public.erp_roles;
create policy erp_roles_tenant_delete
  on public.erp_roles for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('usuarios', 'editar')
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and erp_roles.nivel < u.nivel_admin
        and u.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_role_permissions_tenant_insert on public.erp_role_permissions;
create policy erp_role_permissions_tenant_insert
  on public.erp_role_permissions for insert to authenticated
  with check (
    exists (
      select 1 from public.erp_roles r
      where r.id = role_id
        and r.empresa_id = public.erp_current_empresa_id()
    )
    and public.erp_has_permission('usuarios', 'editar')
    and exists (
      select 1 from public.erp_permissions p
      where p.id = permission_id
        and p.ativo = true
        and public.erp_has_permission(p.codigo)
    )
    and exists (
      select 1 from public.erp_usuarios u
      join public.erp_roles r on r.id = erp_role_permissions.role_id and r.nivel < u.nivel_admin
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and u.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_role_permissions_tenant_delete on public.erp_role_permissions;
create policy erp_role_permissions_tenant_delete
  on public.erp_role_permissions for delete to authenticated
  using (
    exists (
      select 1 from public.erp_roles r
      where r.id = role_id
        and r.empresa_id = public.erp_current_empresa_id()
    )
    and public.erp_has_permission('usuarios', 'editar')
    and exists (
      select 1 from public.erp_usuarios u
      join public.erp_roles r on r.id = erp_role_permissions.role_id and r.nivel < u.nivel_admin
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and u.nivel_admin >= 8
        and u.empresa_id = public.erp_current_empresa_id()
    )
  );

drop policy if exists erp_role_permissions_authenticated_select on public.erp_role_permissions;
drop policy if exists role_permissions_select on public.erp_role_permissions;
create policy erp_role_permissions_authenticated_select
  on public.erp_role_permissions for select to authenticated
  using (
    public.erp_is_master()
    or exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.role_id = erp_role_permissions.role_id
        and u.ativo = true
        and u.deleted_at is null
    )
    or exists (
      select 1 from public.erp_roles r
      where r.id = erp_role_permissions.role_id
        and r.ativo = true
        and r.empresa_id is null
    )
    or exists (
      select 1 from public.erp_roles r
      where r.id = erp_role_permissions.role_id
        and r.ativo = true
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('usuarios', 'editar')
    )
  );

grant select, insert, update, delete on public.erp_roles to authenticated;
grant select, insert, delete on public.erp_role_permissions to authenticated;

create or replace function public.erp_validate_user_role_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role_empresa uuid;
begin
  if new.role_id is null then
    return new;
  end if;

  select r.empresa_id
    into v_role_empresa
    from public.erp_roles r
   where r.id = new.role_id
     and r.ativo = true;

  if not found then
    raise exception 'Perfil ERP inexistente ou inativo.' using errcode = '23503';
  end if;
  if v_role_empresa is not null and v_role_empresa is distinct from new.empresa_id then
    raise exception 'Perfil de acesso pertence a outra empresa.' using errcode = '23514';
  end if;
  if new.empresa_id is null and v_role_empresa is not null then
    raise exception 'O Master não pode usar perfil de uma empresa.' using errcode = '23514';
  end if;
  if new.empresa_id is not null and auth.uid() is not null then
    if exists (
      select 1 from public.erp_roles r
       where r.id = new.role_id
         and (r.codigo = 'MASTER' or r.nivel >= 100)
    ) then
      raise exception 'Perfis Master são exclusivos da plataforma.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE'
      and new.auth_user_id = auth.uid()
      and (
        new.role_id is distinct from old.role_id
        or new.empresa_id is distinct from old.empresa_id
        or coalesce(new.nivel_admin, 0) is distinct from coalesce(old.nivel_admin, 0)
        or coalesce(new.is_master, false) is distinct from coalesce(old.is_master, false)
        or new.perfil is distinct from old.perfil
      )
    then
      raise exception 'O usuário não pode alterar a própria identidade ou nível de acesso.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE'
      and new.role_id is distinct from old.role_id
      and not public.erp_can_assign_role(new.role_id, new.empresa_id)
    then
      raise exception 'O perfil escolhido excede as permissões ou o nível do administrador.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.role_id is distinct from old.role_id
      and exists (
        select 1 from public.erp_usuarios actor
         where actor.auth_user_id = auth.uid()
           and actor.empresa_id = new.empresa_id
           and actor.ativo = true
           and actor.deleted_at is null
           and (
             actor.nivel_admin < 8
             or not public.erp_has_permission('usuarios', 'editar')
             or exists (
               select 1 from public.erp_roles assigned
                where assigned.id = new.role_id
                  and assigned.nivel >= actor.nivel_admin
             )
           )
      )
    then
      raise exception 'O perfil atribuído excede o nível de acesso do administrador.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.erp_validate_user_role_tenant() from public, anon, authenticated;
drop trigger if exists trg_erp_validate_user_role_tenant on public.erp_usuarios;
create trigger trg_erp_validate_user_role_tenant
before insert or update of role_id, empresa_id on public.erp_usuarios
for each row execute function public.erp_validate_user_role_tenant();

drop policy if exists erp_codigos_tenant_select on public.erp_codigos;
drop policy if exists erp_codigos_tenant_write on public.erp_codigos;
drop policy if exists erp_codigos_authenticated_select_crud on public.erp_codigos;
drop policy if exists erp_codigos_authenticated_insert_crud on public.erp_codigos;
drop policy if exists erp_codigos_authenticated_update_crud on public.erp_codigos;
create policy erp_codigos_tenant_select
  on public.erp_codigos for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
create policy erp_codigos_tenant_write
  on public.erp_codigos for all to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  )
  with check (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  );

drop policy if exists erp_areas_tenant_select on public.erp_areas;
drop policy if exists erp_areas_tenant_write on public.erp_areas;
drop policy if exists erp_areas_authenticated_select_crud on public.erp_areas;
drop policy if exists erp_areas_authenticated_insert_crud on public.erp_areas;
drop policy if exists erp_areas_authenticated_update_crud on public.erp_areas;
create policy erp_areas_tenant_select
  on public.erp_areas for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
create policy erp_areas_tenant_write
  on public.erp_areas for all to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  )
  with check (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  );

drop policy if exists erp_grupos_tenant_select on public.erp_grupos;
drop policy if exists erp_grupos_tenant_write on public.erp_grupos;
drop policy if exists erp_grupos_authenticated_select_crud on public.erp_grupos;
drop policy if exists erp_grupos_authenticated_insert_crud on public.erp_grupos;
drop policy if exists erp_grupos_authenticated_update_crud on public.erp_grupos;
create policy erp_grupos_tenant_select
  on public.erp_grupos for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
create policy erp_grupos_tenant_write
  on public.erp_grupos for all to authenticated
  using (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  )
  with check (
    public.erp_is_master()
    or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('empresas', 'editar'))
  );

drop policy if exists erp_historico_codigos_tenant_select on public.erp_historico_codigos;
drop policy if exists erp_historico_codigos_tenant_insert on public.erp_historico_codigos;
drop policy if exists erp_historico_codigos_authenticated_select_crud on public.erp_historico_codigos;
drop policy if exists erp_historico_codigos_authenticated_insert_crud on public.erp_historico_codigos;
drop policy if exists erp_historico_codigos_authenticated_update_crud on public.erp_historico_codigos;
create policy erp_historico_codigos_tenant_select
  on public.erp_historico_codigos for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_can_assign_role(p_role_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.erp_roles target_role
     where target_role.id = p_role_id
       and target_role.ativo = true
       and (target_role.empresa_id is null or target_role.empresa_id = p_empresa_id)
       and target_role.nivel < 100
       and target_role.codigo <> 'MASTER'
       and (
         public.erp_is_master()
         or (
           auth.uid() is not null
           and exists (
             select 1
               from public.erp_usuarios actor
              where actor.auth_user_id = auth.uid()
                and actor.empresa_id = p_empresa_id
                and actor.ativo = true
                and actor.deleted_at is null
                and coalesce(actor.nivel_admin, 0) >= 8
                and coalesce(actor.nivel_admin, 0) < 100
                and target_role.nivel < actor.nivel_admin
                and public.erp_has_permission('usuarios', 'editar')
           )
           and not exists (
             select 1
               from public.erp_role_permissions rp
               join public.erp_permissions permission
                 on permission.id = rp.permission_id
                and permission.ativo = true
              where rp.role_id = target_role.id
                and not public.erp_has_permission(permission.modulo, split_part(permission.codigo, '.', 2))
           )
         )
       )
  )
$$;

revoke all on function public.erp_can_assign_role(uuid, uuid) from public, anon;
grant execute on function public.erp_can_assign_role(uuid, uuid) to authenticated, service_role;

insert into public.erp_role_permissions (role_id, permission_id)
select r.id, p.id
  from public.erp_roles r
  join public.erp_permissions p
    on p.codigo in ('empresas.editar', 'usuarios.excluir')
 where r.codigo = 'ADMIN'
   and r.empresa_id is null
on conflict (role_id, permission_id) do nothing;

create or replace function public.erp_admin_save_role(
  p_role_id uuid,
  p_codigo text,
  p_nome text,
  p_permission_codes text[]
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_actor_level integer;
  v_role_id uuid := p_role_id;
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_nome text := btrim(coalesce(p_nome, ''));
  v_codes text[] := coalesce(p_permission_codes, '{}'::text[]);
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada de empresa obrigatória.' using errcode = '42501';
  end if;
  select u.nivel_admin into v_actor_level
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo = true
     and u.deleted_at is null;
  if not found
    or v_actor_level < 8
    or not public.erp_has_permission('usuarios', 'editar')
  then
    raise exception 'Sem permissão para administrar perfis desta empresa.' using errcode = '42501';
  end if;
  if v_nome = '' or v_codigo !~ '^[A-Z][A-Z0-9_]{1,39}$' then
    raise exception 'Nome ou código de perfil inválido.' using errcode = '22023';
  end if;
  if v_codigo in ('MASTER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER') then
    raise exception 'O código informado é reservado a um perfil global.' using errcode = '22023';
  end if;
  if cardinality(v_codes) > 200
    or exists (select 1 from unnest(v_codes) code group by code having count(*) > 1)
    or exists (
      select 1
        from unnest(v_codes) requested(code)
       where not exists (
         select 1 from public.erp_permissions p
          where p.codigo = requested.code
            and p.ativo = true
       )
    )
    or exists (
      select 1
        from unnest(v_codes) requested(code)
        join public.erp_permissions p on p.codigo = requested.code
       where not public.erp_has_permission(p.modulo, split_part(p.codigo, '.', 2))
    )
  then
    raise exception 'A matriz contém permissões duplicadas, desconhecidas ou não delegáveis pelo administrador.' using errcode = '22023';
  end if;

  if v_role_id is null then
    insert into public.erp_roles (empresa_id, codigo, nome, nivel, ativo)
    values (v_empresa, v_codigo, v_nome, least(v_actor_level - 1, 99), true)
    returning id into v_role_id;
  else
    update public.erp_roles r
       set codigo = v_codigo,
           nome = v_nome
     where r.id = v_role_id
       and r.empresa_id = v_empresa
       and r.nivel < v_actor_level
     returning r.id into v_role_id;
    if not found then
      raise exception 'Perfil não encontrado nesta empresa.' using errcode = '42501';
    end if;
  end if;

  delete from public.erp_role_permissions rp
   where rp.role_id = v_role_id;
  insert into public.erp_role_permissions (role_id, permission_id)
  select v_role_id, p.id
    from public.erp_permissions p
   where p.codigo = any(v_codes)
     and p.ativo = true;

  return v_role_id;
end;
$$;

revoke all on function public.erp_admin_save_role(uuid, text, text, text[]) from public, anon;
grant execute on function public.erp_admin_save_role(uuid, text, text, text[]) to authenticated;

create or replace function public.erp_admin_audit_rbac_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid;
  v_empresa uuid;
  v_entity uuid;
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_role_id uuid;
begin
  select u.id
    into v_actor
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.ativo = true
     and u.deleted_at is null
   limit 1;

  if tg_table_name = 'erp_roles' then
    if tg_op = 'DELETE' then
      v_empresa := old.empresa_id;
      v_entity := old.id;
      v_old := jsonb_build_object('codigo', old.codigo, 'nome', old.nome, 'nivel', old.nivel, 'ativo', old.ativo);
      v_action := 'admin.role.deleted';
    else
      v_empresa := new.empresa_id;
      v_entity := new.id;
      if tg_op = 'UPDATE' then
        v_old := jsonb_build_object('codigo', old.codigo, 'nome', old.nome, 'nivel', old.nivel, 'ativo', old.ativo);
      end if;
      v_new := jsonb_build_object('codigo', new.codigo, 'nome', new.nome, 'nivel', new.nivel, 'ativo', new.ativo);
      v_action := case when tg_op = 'INSERT' then 'admin.role.created' else 'admin.role.updated' end;
    end if;
  elsif tg_table_name = 'erp_role_permissions' then
    v_role_id := case when tg_op = 'DELETE' then old.role_id else new.role_id end;
    select r.empresa_id into v_empresa from public.erp_roles r where r.id = v_role_id;
    v_entity := v_role_id;
    if tg_op = 'DELETE' then
      v_old := jsonb_build_object('role_id', old.role_id, 'permission_id', old.permission_id);
      v_action := 'admin.role_permission.removed';
    else
      v_new := jsonb_build_object('role_id', new.role_id, 'permission_id', new.permission_id);
      v_action := 'admin.role_permission.granted';
    end if;
  elsif tg_table_name = 'erp_empresas' then
    if tg_op = 'DELETE' then
      v_empresa := old.id;
      v_entity := old.id;
      v_old := jsonb_build_object('ativo', old.ativo, 'plano', old.plano, 'plano_status', old.plano_status);
      v_action := 'master.company.deleted';
    else
      v_empresa := new.id;
      v_entity := new.id;
      if tg_op = 'UPDATE' then
        v_old := jsonb_build_object('ativo', old.ativo, 'plano', old.plano, 'plano_status', old.plano_status);
      end if;
      v_new := jsonb_build_object('ativo', new.ativo, 'plano', new.plano, 'plano_status', new.plano_status);
      v_action := case when tg_op = 'INSERT' then 'master.company.created' else 'master.company.updated' end;
    end if;
  elsif tg_table_name = 'erp_planos_catalogo' then
    if tg_op = 'DELETE' then
      v_entity := old.id;
      v_old := jsonb_build_object('codigo', old.codigo, 'nome', old.nome, 'preco_mensal', old.preco_mensal, 'ativo', old.ativo);
      v_action := 'master.plan.deleted';
    else
      v_entity := new.id;
      if tg_op = 'UPDATE' then
        v_old := jsonb_build_object('codigo', old.codigo, 'nome', old.nome, 'preco_mensal', old.preco_mensal, 'ativo', old.ativo);
      end if;
      v_new := jsonb_build_object('codigo', new.codigo, 'nome', new.nome, 'preco_mensal', new.preco_mensal, 'ativo', new.ativo);
      v_action := case when tg_op = 'INSERT' then 'master.plan.created' else 'master.plan.updated' end;
    end if;
  elsif tg_table_name = 'erp_plano_modulos' then
    if tg_op = 'DELETE' then
      v_entity := old.id;
      v_old := jsonb_build_object('plano_codigo', old.plano_codigo, 'modulo_codigo', old.modulo_codigo, 'acesso', old.acesso, 'limite_usuarios', old.limite_usuarios, 'limite_empresas', old.limite_empresas, 'recursos', old.recursos);
      v_action := 'master.plan_module.deleted';
    else
      v_entity := new.id;
      if tg_op = 'UPDATE' then
        v_old := jsonb_build_object('plano_codigo', old.plano_codigo, 'modulo_codigo', old.modulo_codigo, 'acesso', old.acesso, 'limite_usuarios', old.limite_usuarios, 'limite_empresas', old.limite_empresas, 'recursos', old.recursos);
      end if;
      v_new := jsonb_build_object('plano_codigo', new.plano_codigo, 'modulo_codigo', new.modulo_codigo, 'acesso', new.acesso, 'limite_usuarios', new.limite_usuarios, 'limite_empresas', new.limite_empresas, 'recursos', new.recursos);
      v_action := case when tg_op = 'INSERT' then 'master.plan_module.created' else 'master.plan_module.updated' end;
    end if;
  else
    raise exception 'Tabela não suportada pelo auditor administrativo: %', tg_table_name;
  end if;

  insert into public.erp_audit_logs (empresa_id, actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (v_empresa, v_actor, v_action, tg_table_name, v_entity, v_old, v_new);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.erp_admin_audit_rbac_change() from public, anon, authenticated;
drop trigger if exists trg_erp_admin_audit_roles on public.erp_roles;
create trigger trg_erp_admin_audit_roles
after insert or update or delete on public.erp_roles
for each row execute function public.erp_admin_audit_rbac_change();
drop trigger if exists trg_erp_admin_audit_role_permissions on public.erp_role_permissions;
create trigger trg_erp_admin_audit_role_permissions
after insert or delete on public.erp_role_permissions
for each row execute function public.erp_admin_audit_rbac_change();
drop trigger if exists trg_erp_master_audit_companies on public.erp_empresas;
create trigger trg_erp_master_audit_companies
after insert or update or delete on public.erp_empresas
for each row execute function public.erp_admin_audit_rbac_change();
drop trigger if exists trg_erp_master_audit_plans on public.erp_planos_catalogo;
create trigger trg_erp_master_audit_plans
after insert or update or delete on public.erp_planos_catalogo
for each row execute function public.erp_admin_audit_rbac_change();
drop trigger if exists trg_erp_master_audit_plan_modules on public.erp_plano_modulos;
create trigger trg_erp_master_audit_plan_modules
after insert or update or delete on public.erp_plano_modulos
for each row execute function public.erp_admin_audit_rbac_change();

drop policy if exists erp_audit_logs_tenant_select on public.erp_audit_logs;
drop policy if exists erp_audit_tenant_select on public.erp_audit_logs;
drop policy if exists erp_audit_logs_authenticated_select_crud on public.erp_audit_logs;
drop policy if exists erp_audit_logs_authenticated_insert_crud on public.erp_audit_logs;
drop policy if exists erp_audit_logs_authenticated_update_crud on public.erp_audit_logs;
create policy erp_audit_logs_tenant_select
  on public.erp_audit_logs for select to authenticated
  using (
    public.erp_is_master()
    or (
      empresa_id = public.erp_current_empresa_id()
      and public.erp_has_permission('auditoria', 'ver')
    )
  );

drop policy if exists erp_empresas_authenticated_update on public.erp_empresas;
drop policy if exists erp_empresas_master_update on public.erp_empresas;
drop policy if exists erp_empresas_admin_update on public.erp_empresas;
create policy erp_empresas_admin_update
  on public.erp_empresas for update to authenticated
  using (
    public.erp_is_master()
    or (
      id = public.erp_current_empresa_id()
      and public.erp_has_permission('empresas', 'editar')
    )
  )
  with check (
    public.erp_is_master()
    or (
      id = public.erp_current_empresa_id()
      and public.erp_has_permission('empresas', 'editar')
    )
  );

create or replace function public.erp_master_set_empresa_status(p_empresa_id uuid, p_ativo boolean)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.erp_is_master() then
    raise exception 'Somente Master pode alterar o status de uma empresa.' using errcode = '42501';
  end if;
  if p_empresa_id is null or p_ativo is null then
    raise exception 'Empresa e status são obrigatórios.' using errcode = '22023';
  end if;

  update public.erp_empresas
     set ativo = p_ativo
   where id = p_empresa_id;
  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0002';
  end if;
  return true;
end;
$$;

revoke all on function public.erp_master_set_empresa_status(uuid, boolean) from public, anon;
grant execute on function public.erp_master_set_empresa_status(uuid, boolean) to authenticated;

drop policy if exists erp_planos_catalogo_master_write on public.erp_planos_catalogo;
create policy erp_planos_catalogo_master_write
  on public.erp_planos_catalogo for all to authenticated
  using (public.erp_is_master())
  with check (public.erp_is_master());
drop policy if exists erp_plano_modulos_master_write on public.erp_plano_modulos;
create policy erp_plano_modulos_master_write
  on public.erp_plano_modulos for all to authenticated
  using (public.erp_is_master())
  with check (public.erp_is_master());
grant select, insert, update, delete on public.erp_planos_catalogo, public.erp_plano_modulos to authenticated;

create or replace function public.erp_master_save_plan(
  p_codigo text,
  p_nome text,
  p_preco_mensal numeric,
  p_descricao text,
  p_ativo boolean,
  p_modulos jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_codigo text := lower(btrim(coalesce(p_codigo, '')));
  v_nome text := btrim(coalesce(p_nome, ''));
  v_plan_id uuid;
  v_module jsonb;
  v_module_code text;
begin
  if auth.uid() is null or not public.erp_is_master() then
    raise exception 'Somente Master pode alterar planos e módulos contratados.' using errcode = '42501';
  end if;
  if v_codigo !~ '^[a-z][a-z0-9_-]{1,39}$'
    or v_nome = ''
    or p_preco_mensal is null
    or p_ativo is null
    or p_preco_mensal < 0
    or p_preco_mensal::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Dados do plano inválidos.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_modulos) is distinct from 'array' then
    raise exception 'A lista de módulos deve ser uma matriz JSON.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_modulos) > 200
    or exists (
      select 1
        from jsonb_array_elements(p_modulos) requested(value)
       group by requested.value->>'codigo'
      having count(*) > 1
    )
    or exists (
      select 1
        from public.erp_plano_modulos known
       where not exists (
         select 1
           from jsonb_array_elements(p_modulos) requested(value)
          where requested.value->>'codigo' = known.modulo_codigo
       )
    )
  then
    raise exception 'Lista de módulos inválida, duplicada ou incompleta.' using errcode = '22023';
  end if;

  insert into public.erp_planos_catalogo (codigo, nome, preco_mensal, descricao, ativo, atualizado_em)
  values (v_codigo, v_nome, p_preco_mensal, nullif(btrim(coalesce(p_descricao, '')), ''), p_ativo, now())
  on conflict (codigo) do update
    set nome = excluded.nome,
        preco_mensal = excluded.preco_mensal,
        descricao = excluded.descricao,
        ativo = excluded.ativo,
        atualizado_em = now()
  returning id into v_plan_id;

  for v_module in select value from jsonb_array_elements(p_modulos)
  loop
    v_module_code := nullif(btrim(v_module->>'codigo'), '');
    if v_module_code is null
      or nullif(btrim(v_module->>'nome'), '') is null
      or not exists (
        select 1 from public.erp_plano_modulos known
        where known.modulo_codigo = nullif(btrim(v_module->>'codigo'), '')
      )
      or jsonb_typeof(coalesce(v_module->'recursos', '{}'::jsonb)) <> 'object'
      or (v_module->>'limite_usuarios' is not null and (v_module->>'limite_usuarios')::integer < 0)
      or (v_module->>'limite_empresas' is not null and (v_module->>'limite_empresas')::integer < 0)
    then
      raise exception 'Módulo ou limite inválido no plano.' using errcode = '22023';
    end if;

    insert into public.erp_plano_modulos (
      plano_codigo, modulo_codigo, modulo_nome, acesso, limite_usuarios, limite_empresas, recursos
    )
    values (
      v_codigo, v_module_code, btrim(v_module->>'nome'),
      coalesce((v_module->>'acesso')::boolean, true),
      nullif(v_module->>'limite_usuarios', '')::integer,
      nullif(v_module->>'limite_empresas', '')::integer,
      coalesce(v_module->'recursos', '{}'::jsonb)
    )
    on conflict (plano_codigo, modulo_codigo) do update
      set modulo_nome = excluded.modulo_nome,
          acesso = excluded.acesso,
          limite_usuarios = excluded.limite_usuarios,
          limite_empresas = excluded.limite_empresas,
          recursos = excluded.recursos;
  end loop;

  delete from public.erp_plano_modulos pm
   where pm.plano_codigo = v_codigo
     and not exists (
       select 1
       from jsonb_array_elements(p_modulos) requested(value)
       where requested.value->>'codigo' = pm.modulo_codigo
     );

  return v_plan_id;
end;
$$;

revoke all on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) from public, anon;
grant execute on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) to authenticated;

commit;
