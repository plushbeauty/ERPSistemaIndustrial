begin;

-- Segurança de borda: nenhuma tabela operacional ERP deve ficar acessível ao papel anon.
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'erp_%'
  loop
    execute format('revoke all on table public.%I from anon', r.table_name);
  end loop;
end $$;

-- Toda tabela industrial multiempresa que possui empresa_id precisa permanecer sob RLS.
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'erp_%'
      and exists (
        select 1
        from information_schema.columns col
        where col.table_schema = 'public'
          and col.table_name = c.relname
          and col.column_name = 'empresa_id'
      )
  loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;
end $$;

-- Corrige as políticas PCP que continham uma exceção de nivel_admin capaz de atravessar tenant.
-- O Master continua tratado separadamente pelas políticas que explicitamente usam erp_is_master().
drop policy if exists erp_pcp_apontamentos_empresa on public.erp_pcp_apontamentos;
create policy erp_pcp_apontamentos_empresa
  on public.erp_pcp_apontamentos
  for all
  to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pcp_planejamentos_empresa on public.erp_pcp_planejamentos;
create policy erp_pcp_planejamentos_empresa
  on public.erp_pcp_planejamentos
  for all
  to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_pedidos_compra_empresa on public.erp_pedidos_compra;
create policy erp_pedidos_compra_empresa
  on public.erp_pedidos_compra
  for all
  to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

commit;
