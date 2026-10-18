begin;

create table if not exists public.erp_portal_conhecimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  category varchar(50) not null check (length(btrim(category)) > 0),
  title varchar(255) not null check (length(btrim(title)) > 0),
  excerpt text not null check (length(btrim(excerpt)) > 0),
  content text[] not null default '{}',
  status text not null default 'publicado'
    check (status in ('rascunho', 'publicado', 'arquivado')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.erp_portal_conhecimento
  add column if not exists status text not null default 'publicado',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists published_at timestamptz;

alter table public.erp_portal_conhecimento
  drop constraint if exists erp_portal_conhecimento_status_check;

alter table public.erp_portal_conhecimento
  add constraint erp_portal_conhecimento_status_check
  check (status in ('rascunho', 'publicado', 'arquivado'));

create index if not exists idx_portal_conhecimento_empresa_status_created
  on public.erp_portal_conhecimento (empresa_id, status, created_at desc);

create index if not exists idx_portal_conhecimento_empresa_category
  on public.erp_portal_conhecimento (empresa_id, category);

alter table public.erp_portal_conhecimento enable row level security;

drop policy if exists portal_conhecimento_select_tenant on public.erp_portal_conhecimento;
create policy portal_conhecimento_select_tenant
  on public.erp_portal_conhecimento
  for select
  to authenticated
  using (
    empresa_id = (select public.erp_current_empresa_id())
    and (
      status = 'publicado'
      or public.erp_is_master()
      or exists (
        select 1
        from public.erp_usuarios u
        where u.auth_user_id = auth.uid()
          and u.empresa_id = erp_portal_conhecimento.empresa_id
          and u.ativo = true
          and u.deleted_at is null
          and coalesce(u.nivel_admin, 0) >= 9
      )
    )
  );

drop policy if exists portal_conhecimento_insert_admin_tenant on public.erp_portal_conhecimento;
create policy portal_conhecimento_insert_admin_tenant
  on public.erp_portal_conhecimento
  for insert
  to authenticated
  with check (
    empresa_id = (select public.erp_current_empresa_id())
    and (
      public.erp_is_master()
      or exists (
        select 1
        from public.erp_usuarios u
        where u.auth_user_id = auth.uid()
          and u.empresa_id = erp_portal_conhecimento.empresa_id
          and u.ativo = true
          and u.deleted_at is null
          and coalesce(u.nivel_admin, 0) >= 9
      )
    )
  );

drop policy if exists portal_conhecimento_update_admin_tenant on public.erp_portal_conhecimento;
create policy portal_conhecimento_update_admin_tenant
  on public.erp_portal_conhecimento
  for update
  to authenticated
  using (
    empresa_id = (select public.erp_current_empresa_id())
    and (
      public.erp_is_master()
      or exists (
        select 1
        from public.erp_usuarios u
        where u.auth_user_id = auth.uid()
          and u.empresa_id = erp_portal_conhecimento.empresa_id
          and u.ativo = true
          and u.deleted_at is null
          and coalesce(u.nivel_admin, 0) >= 9
      )
    )
  )
  with check (
    empresa_id = (select public.erp_current_empresa_id())
    and (
      public.erp_is_master()
      or exists (
        select 1
        from public.erp_usuarios u
        where u.auth_user_id = auth.uid()
          and u.empresa_id = erp_portal_conhecimento.empresa_id
          and u.ativo = true
          and u.deleted_at is null
          and coalesce(u.nivel_admin, 0) >= 9
      )
    )
  );

drop policy if exists portal_conhecimento_delete_admin_tenant on public.erp_portal_conhecimento;
create policy portal_conhecimento_delete_admin_tenant
  on public.erp_portal_conhecimento
  for delete
  to authenticated
  using (
    empresa_id = (select public.erp_current_empresa_id())
    and (
      public.erp_is_master()
      or exists (
        select 1
        from public.erp_usuarios u
        where u.auth_user_id = auth.uid()
          and u.empresa_id = erp_portal_conhecimento.empresa_id
          and u.ativo = true
          and u.deleted_at is null
          and coalesce(u.nivel_admin, 0) >= 9
      )
    )
  );

revoke all on public.erp_portal_conhecimento from anon, public;
grant select, insert, update, delete on public.erp_portal_conhecimento to authenticated;

commit;
