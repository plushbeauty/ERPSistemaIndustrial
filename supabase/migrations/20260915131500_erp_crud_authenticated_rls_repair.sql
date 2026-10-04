-- ERP Industrial: reparo de privilégios e RLS para CRUD autenticado.
-- Mantém RLS ativo e restringe dados por empresa quando a tabela possui empresa_id.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select, update on all sequences in schema public to authenticated;

-- Tabelas criadas futuramente também recebem os privilégios básicos.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select, update on sequences to authenticated;

-- Usuário autenticado pode consultar seu próprio perfil e atualizar somente o necessário;
-- a validação de empresa continua sendo aplicada pelo restante do modelo de segurança.
do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'erp_%'
      and exists (
        select 1 from information_schema.columns col
        where col.table_schema = 'public'
          and col.table_name = c.relname
          and col.column_name = 'empresa_id'
      )
  loop
    execute format('alter table public.%I enable row level security', r.table_name);

    policy_name := r.table_name || '_authenticated_select_crud';
    execute format('drop policy if exists %I on public.%I', policy_name, r.table_name);
    execute format($sql$
      create policy %I on public.%I
      for select to authenticated
      using (
        public.erp_current_empresa_id() is not null
        and empresa_id = public.erp_current_empresa_id()
      )
    $sql$, policy_name, r.table_name);

    policy_name := r.table_name || '_authenticated_insert_crud';
    execute format('drop policy if exists %I on public.%I', policy_name, r.table_name);
    execute format($sql$
      create policy %I on public.%I
      for insert to authenticated
      with check (
        public.erp_current_empresa_id() is not null
        and empresa_id = public.erp_current_empresa_id()
      )
    $sql$, policy_name, r.table_name);

    policy_name := r.table_name || '_authenticated_update_crud';
    execute format('drop policy if exists %I on public.%I', policy_name, r.table_name);
    execute format($sql$
      create policy %I on public.%I
      for update to authenticated
      using (
        public.erp_current_empresa_id() is not null
        and empresa_id = public.erp_current_empresa_id()
      )
      with check (
        public.erp_current_empresa_id() is not null
        and empresa_id = public.erp_current_empresa_id()
      )
    $sql$, policy_name, r.table_name);
  end loop;
end $$;

-- Perfil: usuário autenticado deve conseguir localizar o próprio registro,
-- inclusive durante o bootstrap do frontend.
do $$
begin
  if to_regclass('public.erp_usuarios') is not null then
    alter table public.erp_usuarios enable row level security;
    drop policy if exists erp_usuarios_authenticated_self_select on public.erp_usuarios;
    create policy erp_usuarios_authenticated_self_select
      on public.erp_usuarios for select to authenticated
      using (auth_user_id = auth.uid() or public.erp_current_empresa_id() = empresa_id);

    drop policy if exists erp_usuarios_authenticated_self_update on public.erp_usuarios;
    create policy erp_usuarios_authenticated_self_update
      on public.erp_usuarios for update to authenticated
      using (auth_user_id = auth.uid() or public.erp_current_empresa_id() = empresa_id)
      with check (auth_user_id = auth.uid() or public.erp_current_empresa_id() = empresa_id);
  end if;

  if to_regclass('public.erp_empresas') is not null then
    alter table public.erp_empresas enable row level security;
    drop policy if exists erp_empresas_authenticated_select on public.erp_empresas;
    create policy erp_empresas_authenticated_select
      on public.erp_empresas for select to authenticated
      using (id = public.erp_current_empresa_id() or public.usuario_e_master());

    drop policy if exists erp_empresas_authenticated_update on public.erp_empresas;
    create policy erp_empresas_authenticated_update
      on public.erp_empresas for update to authenticated
      using (id = public.erp_current_empresa_id() or public.usuario_e_master())
      with check (id = public.erp_current_empresa_id() or public.usuario_e_master());
  end if;
end $$;

commit;
