create table if not exists public.erp_codigos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id),
  prefixo text not null,
  separador text not null default '-',
  modo_numeracao text not null,
  sequencia_atual integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.erp_areas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id),
  codigo text not null,
  nome text not null,
  created_at timestamptz default now()
);

create unique index if not exists uq_erp_areas_empresa_codigo
  on public.erp_areas(empresa_id,codigo);

alter table public.erp_grupos add column if not exists codigo text;
update public.erp_grupos
set codigo = coalesce(nullif(codigo,''), 'GRP-' || upper(substr(replace(id::text,'-',''),1,8)))
where codigo is null or codigo = '';
alter table public.erp_grupos alter column codigo set not null;
create unique index if not exists uq_erp_grupos_empresa_codigo
  on public.erp_grupos(empresa_id,codigo);

create table if not exists public.erp_historico_codigos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id),
  codigo_completo text not null,
  codigo_base text not null,
  sequencia numeric not null,
  gerado_por uuid references public.erp_usuarios(id),
  created_at timestamptz default now()
);

alter table public.erp_roles add column if not exists codigo text;
alter table public.erp_roles add column if not exists nome text;
alter table public.erp_roles add column if not exists nivel integer;
alter table public.erp_roles add column if not exists ativo boolean;

update public.erp_roles
set nome = coalesce(nullif(nome,''), name),
    codigo = coalesce(nullif(codigo,''), upper(regexp_replace(name,'[^A-Za-z0-9]+','_','g'))),
    nivel = coalesce(nivel, 1),
    ativo = coalesce(ativo, true)
where nome is null or nome = '' or codigo is null or codigo = '' or nivel is null or ativo is null;

alter table public.erp_roles alter column codigo set not null;
alter table public.erp_roles alter column nome set not null;
alter table public.erp_roles alter column nivel set not null;
alter table public.erp_roles alter column ativo set not null;

alter table public.erp_codigos enable row level security;
alter table public.erp_areas enable row level security;
alter table public.erp_grupos enable row level security;
alter table public.erp_historico_codigos enable row level security;
alter table public.erp_roles enable row level security;

drop policy if exists erp_codigos_tenant_select on public.erp_codigos;
create policy erp_codigos_tenant_select on public.erp_codigos for select to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);

drop policy if exists erp_codigos_tenant_write on public.erp_codigos;
create policy erp_codigos_tenant_write on public.erp_codigos for all to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
) with check (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);

drop policy if exists erp_areas_tenant_select on public.erp_areas;
create policy erp_areas_tenant_select on public.erp_areas for select to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);
drop policy if exists erp_areas_tenant_write on public.erp_areas;
create policy erp_areas_tenant_write on public.erp_areas for all to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
) with check (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);

drop policy if exists erp_grupos_tenant_select on public.erp_grupos;
create policy erp_grupos_tenant_select on public.erp_grupos for select to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);
drop policy if exists erp_grupos_tenant_write on public.erp_grupos;
create policy erp_grupos_tenant_write on public.erp_grupos for all to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
) with check (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);

drop policy if exists erp_historico_codigos_tenant_select on public.erp_historico_codigos;
create policy erp_historico_codigos_tenant_select on public.erp_historico_codigos for select to authenticated using (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);
drop policy if exists erp_historico_codigos_tenant_insert on public.erp_historico_codigos;
create policy erp_historico_codigos_tenant_insert on public.erp_historico_codigos for insert to authenticated with check (
  empresa_id = public.erp_current_empresa_id()
  or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
);

drop policy if exists roles_select on public.erp_roles;
create policy roles_select on public.erp_roles for select to authenticated using (
  ativo = true and (
    company_id is null
    or company_id = public.erp_current_empresa_id()
    or exists (select 1 from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) and u.ativo = true and u.deleted_at is null and coalesce(u.nivel_admin,0) >= 100 and upper(coalesce(u.perfil,''))='MASTER' and u.empresa_id is null)
  )
);

grant select,insert,update,delete on public.erp_codigos, public.erp_areas, public.erp_grupos to authenticated;
grant select,insert on public.erp_historico_codigos to authenticated;
grant select on public.erp_roles to authenticated;
