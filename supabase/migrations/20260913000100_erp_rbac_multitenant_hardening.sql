begin;

create extension if not exists pgcrypto;

alter table public.erp_empresas
  add column if not exists stripe_customer_id text,
  add column if not exists asaas_customer_id text,
  add column if not exists subscription_status text,
  add column if not exists plan_type text,
  add column if not exists subscription_ends_at timestamptz;

update public.erp_empresas
set subscription_status =
  case
    when lower(coalesce(plano_status, '')) in
      ('inadimplente', 'delinquent')
      then 'delinquent'
    when lower(coalesce(plano_status, '')) in
      ('cancelado', 'cancelled')
      then 'cancelled'
    when lower(coalesce(plano_status, '')) in
      ('expirado', 'expired')
      then 'expired'
    when lower(coalesce(plano_status, '')) in
      ('teste', 'trial')
      then 'trial'
    else 'active'
  end
where subscription_status is null;

create table if not exists public.erp_roles (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  nivel integer not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.erp_roles
  (codigo, nome, nivel)
values
  ('MASTER', 'Master', 10),
  ('ADMIN', 'Administrador', 9),
  ('MANAGER', 'Gestor', 7),
  ('SUPERVISOR', 'Supervisor', 5),
  ('OPERATOR', 'Operador', 3),
  ('VIEWER', 'Visualizador', 1)
on conflict (codigo)
do update set
  nome = excluded.nome,
  nivel = excluded.nivel,
  ativo = true;

alter table public.erp_usuarios
  add column if not exists role_id uuid,
  add column if not exists is_master boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.erp_usuarios
  drop constraint if exists erp_usuarios_role_id_fkey;

alter table public.erp_usuarios
  add constraint erp_usuarios_role_id_fkey
  foreign key (role_id)
  references public.erp_roles(id)
  on delete restrict;

update public.erp_usuarios u
set role_id =
  case
    when coalesce(u.is_master, false)
      or coalesce(u.nivel_admin, 0) >= 100
      then (select id from public.erp_roles where codigo = 'MASTER')
    when coalesce(u.nivel_admin, 0) >= 9
      then (select id from public.erp_roles where codigo = 'ADMIN')
    when coalesce(u.nivel_admin, 0) >= 7
      then (select id from public.erp_roles where codigo = 'MANAGER')
    when coalesce(u.nivel_admin, 0) >= 5
      then (select id from public.erp_roles where codigo = 'SUPERVISOR')
    when coalesce(u.nivel_admin, 0) >= 3
      then (select id from public.erp_roles where codigo = 'OPERATOR')
    else
      (select id from public.erp_roles where codigo = 'VIEWER')
  end
where u.role_id is null;

update public.erp_usuarios
set is_master = true
where coalesce(nivel_admin, 0) >= 10;

create index if not exists idx_erp_usuarios_empresa
  on public.erp_usuarios (empresa_id);

create index if not exists idx_erp_usuarios_empresa_setor
  on public.erp_usuarios (empresa_id, setor_id);

create index if not exists idx_erp_usuarios_empresa_role
  on public.erp_usuarios (empresa_id, role_id);

create index if not exists idx_erp_usuarios_auth
  on public.erp_usuarios (auth_user_id);

create index if not exists idx_erp_usuarios_email_empresa
  on public.erp_usuarios (empresa_id, email);

create index if not exists idx_erp_usuarios_login_empresa
  on public.erp_usuarios (empresa_id, login_nome);

create table if not exists public.erp_permissions (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  modulo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_role_permissions (
  role_id uuid not null
    references public.erp_roles(id)
    on delete cascade,
  permission_id uuid not null
    references public.erp_permissions(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

insert into public.erp_permissions
  (codigo, nome, modulo)
values
  ('usuarios.ver', 'Visualizar usuários', 'usuarios'),
  ('usuarios.criar', 'Criar usuários', 'usuarios'),
  ('usuarios.editar', 'Editar usuários', 'usuarios'),
  ('usuarios.excluir', 'Desativar usuários', 'usuarios'),

  ('empresas.ver', 'Visualizar empresas', 'empresas'),
  ('empresas.criar', 'Criar empresas', 'empresas'),
  ('empresas.editar', 'Editar empresas', 'empresas'),
  ('empresas.bloquear', 'Bloquear empresas', 'empresas'),

  ('produtos.ver', 'Visualizar produtos', 'produtos'),
  ('produtos.criar', 'Criar produtos', 'produtos'),
  ('produtos.editar', 'Editar produtos', 'produtos'),
  ('produtos.excluir', 'Excluir produtos', 'produtos'),

  ('estoque.ver', 'Visualizar estoque', 'estoque'),
  ('estoque.movimentar', 'Movimentar estoque', 'estoque'),
  ('estoque.inventario', 'Executar inventário', 'estoque'),

  ('producao.ver', 'Visualizar produção', 'producao'),
  ('producao.criar', 'Criar OP', 'producao'),
  ('producao.editar', 'Editar OP', 'producao'),
  ('producao.apontar', 'Apontar produção', 'producao'),
  ('producao.encerrar', 'Encerrar OP', 'producao'),

  ('qualidade.ver', 'Visualizar qualidade', 'qualidade'),
  ('qualidade.criar', 'Registrar qualidade', 'qualidade'),
  ('qualidade.editar', 'Editar qualidade', 'qualidade'),
  ('qualidade.aprovar', 'Aprovar qualidade', 'qualidade'),

  ('vendas.ver', 'Visualizar vendas', 'vendas'),
  ('vendas.criar', 'Criar vendas', 'vendas'),
  ('vendas.editar', 'Editar vendas', 'vendas'),

  ('compras.ver', 'Visualizar compras', 'compras'),
  ('compras.criar', 'Criar compras', 'compras'),
  ('compras.editar', 'Editar compras', 'compras'),

  ('financeiro.ver', 'Visualizar financeiro', 'financeiro'),
  ('financeiro.lancar', 'Lançar financeiro', 'financeiro'),
  ('financeiro.aprovar', 'Aprovar financeiro', 'financeiro'),

  ('relatorios.ver', 'Visualizar relatórios', 'relatorios'),
  ('auditoria.ver', 'Visualizar auditoria', 'auditoria')
on conflict (codigo)
do update set
  nome = excluded.nome,
  modulo = excluded.modulo,
  ativo = true;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
cross join public.erp_permissions p
where r.codigo = 'MASTER'
on conflict do nothing;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
join public.erp_permissions p
  on p.codigo in (
    'usuarios.ver',
    'usuarios.criar',
    'usuarios.editar',
    'produtos.ver',
    'estoque.ver',
    'estoque.movimentar',
    'producao.ver',
    'producao.criar',
    'producao.editar',
    'producao.apontar',
    'qualidade.ver',
    'vendas.ver',
    'vendas.criar',
    'compras.ver',
    'financeiro.ver',
    'relatorios.ver'
  )
where r.codigo = 'ADMIN'
on conflict do nothing;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
join public.erp_permissions p
  on p.codigo in (
    'usuarios.ver',
    'usuarios.criar',
    'usuarios.editar',
    'produtos.ver',
    'estoque.ver',
    'estoque.movimentar',
    'producao.ver',
    'producao.editar',
    'producao.apontar',
    'qualidade.ver',
    'qualidade.criar',
    'qualidade.editar',
    'vendas.ver',
    'compras.ver',
    'relatorios.ver'
  )
where r.codigo = 'MANAGER'
on conflict do nothing;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
join public.erp_permissions p
  on p.codigo in (
    'usuarios.ver',
    'produtos.ver',
    'estoque.ver',
    'estoque.movimentar',
    'producao.ver',
    'producao.apontar',
    'qualidade.ver',
    'qualidade.criar',
    'qualidade.editar',
    'relatorios.ver'
  )
where r.codigo = 'SUPERVISOR'
on conflict do nothing;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
join public.erp_permissions p
  on p.codigo in (
    'produtos.ver',
    'estoque.ver',
    'producao.ver',
    'producao.apontar',
    'qualidade.ver'
  )
where r.codigo = 'OPERATOR'
on conflict do nothing;

insert into public.erp_role_permissions
  (role_id, permission_id)
select
  r.id,
  p.id
from public.erp_roles r
join public.erp_permissions p
  on p.codigo in (
    'produtos.ver',
    'estoque.ver',
    'producao.ver',
    'qualidade.ver',
    'relatorios.ver'
  )
where r.codigo = 'VIEWER'
on conflict do nothing;

create table if not exists public.erp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete set null,
  actor_user_id uuid references public.erp_usuarios(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_audit_empresa_created
  on public.erp_audit_logs (empresa_id, created_at desc);

create index if not exists idx_erp_audit_actor_created
  on public.erp_audit_logs (actor_user_id, created_at desc);

create index if not exists idx_erp_audit_entity
  on public.erp_audit_logs (entity_type, entity_id);

create or replace function public.erp_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and ativo = true
    and deleted_at is null
  limit 1;
$$;

create or replace function public.erp_current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and ativo = true
    and deleted_at is null
  limit 1;
$$;

create or replace function public.erp_is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.erp_usuarios u
    left join public.erp_roles r
      on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and u.deleted_at is null
      and (
        u.is_master = true
        or r.codigo = 'MASTER'
        or u.nivel_admin >= 10
      )
  );
$$;

create or replace function public.erp_has_permission(
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.erp_is_master()
    or exists (
      select 1
      from public.erp_usuarios u
      join public.erp_role_permissions rp
        on rp.role_id = u.role_id
      join public.erp_permissions p
        on p.id = rp.permission_id
      where u.auth_user_id = auth.uid()
        and u.ativo = true
        and u.deleted_at is null
        and p.codigo = permission_code
        and p.ativo = true
    );
$$;

revoke all on function public.erp_current_user_id()
from public, anon;

revoke all on function public.erp_current_empresa_id()
from public, anon;

revoke all on function public.erp_is_master()
from public, anon;

revoke all on function public.erp_has_permission(text)
from public, anon;

grant execute on function public.erp_current_user_id()
to authenticated;

grant execute on function public.erp_current_empresa_id()
to authenticated;

grant execute on function public.erp_is_master()
to authenticated;

grant execute on function public.erp_has_permission(text)
to authenticated;

alter table public.erp_roles enable row level security;
alter table public.erp_permissions enable row level security;
alter table public.erp_role_permissions enable row level security;
alter table public.erp_audit_logs enable row level security;
alter table public.erp_usuarios enable row level security;
alter table public.erp_setores enable row level security;
alter table public.erp_empresas enable row level security;

drop policy if exists erp_roles_authenticated_select
on public.erp_roles;

create policy erp_roles_authenticated_select
on public.erp_roles
for select
to authenticated
using (ativo = true);

drop policy if exists erp_permissions_authenticated_select
on public.erp_permissions;

create policy erp_permissions_authenticated_select
on public.erp_permissions
for select
to authenticated
using (ativo = true);

drop policy if exists erp_role_permissions_authenticated_select
on public.erp_role_permissions;

create policy erp_role_permissions_authenticated_select
on public.erp_role_permissions
for select
to authenticated
using (
  public.erp_is_master()
  or exists (
    select 1
    from public.erp_usuarios u
    where u.auth_user_id = auth.uid()
      and u.role_id = erp_role_permissions.role_id
      and u.ativo = true
      and u.deleted_at is null
  )
);

drop policy if exists erp_usuarios_tenant_select
on public.erp_usuarios;

create policy erp_usuarios_tenant_select
on public.erp_usuarios
for select
to authenticated
using (
  public.erp_is_master()
  or empresa_id = public.erp_current_empresa_id()
);

drop policy if exists erp_usuarios_tenant_update
on public.erp_usuarios;

create policy erp_usuarios_tenant_update
on public.erp_usuarios
for update
to authenticated
using (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('usuarios.editar')
  )
)
with check (
  public.erp_is_master()
  or empresa_id = public.erp_current_empresa_id()
);

drop policy if exists erp_setores_tenant_select
on public.erp_setores;

create policy erp_setores_tenant_select
on public.erp_setores
for select
to authenticated
using (
  public.erp_is_master()
  or empresa_id = public.erp_current_empresa_id()
);

drop policy if exists erp_empresas_tenant_select
on public.erp_empresas;

create policy erp_empresas_tenant_select
on public.erp_empresas
for select
to authenticated
using (
  public.erp_is_master()
  or id = public.erp_current_empresa_id()
);

drop policy if exists erp_audit_tenant_select
on public.erp_audit_logs;

create policy erp_audit_tenant_select
on public.erp_audit_logs
for select
to authenticated
using (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('auditoria.ver')
  )
);

commit;
