-- Optimize RLS policies reported by Supabase Advisor by evaluating auth.uid() once per statement.
do $$
declare r record;
begin
  for r in
    select schemaname,tablename,policyname,qual,with_check
    from pg_policies
    where schemaname='public'
      and (tablename,policyname) in (
        ('erp_notas_fiscais','erp_notas_fiscais_select_tenant'),
        ('erp_notas_fiscais','erp_notas_fiscais_insert_tenant'),
        ('erp_notas_fiscais','erp_notas_fiscais_update_tenant'),
        ('erp_notas_fiscais','erp_notas_fiscais_delete_tenant'),
        ('erp_engenharia_codificacao','erp engenharia codificacao tenant'),
        ('erp_engenharia_areas','erp engenharia areas tenant'),
        ('erp_role_module_permissions','erp role module permissions tenant'),
        ('erp_nfe_simulacoes','erp_nfe_sim_select'),
        ('erp_almoxarifado_pedidos','erp_almox_pedidos_select'),
        ('erp_qualidade_calibracoes_historico','erp_cal_hist_select'),
        ('erp_moldes_manutencao_historico','erp_moldes_hist_tenant'),
        ('erp_tablet_acl','erp_tablet_acl_tenant'),
        ('erp_prefixos_documentos','erp_prefixos_tenant'),
        ('erp_i18n_preferencias','erp_i18n_self'),
        ('erp_permissions','permissions_select')
      )
  loop
    if r.qual is not null then
      execute format('alter policy %I on %I.%I using %s',r.policyname,r.schemaname,r.tablename,replace(r.qual,'auth.uid()','(select auth.uid())'));
    end if;
    if r.with_check is not null then
      execute format('alter policy %I on %I.%I with check %s',r.policyname,r.schemaname,r.tablename,replace(r.with_check,'auth.uid()','(select auth.uid())'));
    end if;
  end loop;
end $$;
