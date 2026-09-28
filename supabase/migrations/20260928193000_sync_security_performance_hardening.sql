-- ERP Industrial: sync the security/performance hardening already applied to production.
-- All statements are idempotent and preserve existing tenant/RBAC behavior.

revoke execute on function public.erp_master_purge_plastibor_test_data() from authenticated, anon, public;
revoke execute on function public.processar_baixa_bloco_k() from authenticated, anon, public;

create index if not exists erp_fk_custos_componentes_custo_id_idx on public.erp_custos_componentes(custo_id);
create index if not exists erp_fk_custos_fixos_centro_custo_id_idx on public.erp_custos_fixos(centro_custo_id);
create index if not exists erp_fk_documentos_fiscais_itens_empresa_id_idx on public.erp_documentos_fiscais_itens(empresa_id);
create index if not exists erp_fk_documentos_qualidade_anexos_documento_id_idx on public.erp_documentos_qualidade_anexos(documento_id);
create index if not exists erp_fk_estoque_inventario_itens_produto_id_idx on public.erp_estoque_inventario_itens(produto_id);
create index if not exists erp_fk_estoque_localizacoes_almoxarifado_id_idx on public.erp_estoque_localizacoes(almoxarifado_id);
create index if not exists erp_fk_estoque_movimentos_produto_id_idx on public.erp_estoque_movimentos(produto_id);
create index if not exists erp_fk_ficha_itens_ficha_id_idx on public.erp_ficha_itens(ficha_id);
create index if not exists erp_fk_ficha_operacoes_ficha_id_idx on public.erp_ficha_operacoes(ficha_id);
create index if not exists erp_fk_fichas_tecnicas_produto_id_idx on public.erp_fichas_tecnicas(produto_id);
create index if not exists erp_fk_liberacoes_fiscais_pedido_item_id_idx on public.erp_liberacoes_fiscais(pedido_item_id);
create index if not exists erp_fk_liberacoes_fiscais_pedido_venda_id_idx on public.erp_liberacoes_fiscais(pedido_venda_id);
create index if not exists erp_fk_moldes_produto_id_idx on public.erp_moldes(produto_id);
create index if not exists erp_fk_mrp_necessidades_run_id_idx on public.erp_mrp_necessidades(run_id);
create index if not exists erp_fk_pedidos_compra_itens_produto_id_idx on public.erp_pedidos_compra_itens(produto_id);
create index if not exists erp_fk_pedidos_venda_itens_produto_id_idx on public.erp_pedidos_venda_itens(produto_id);
create index if not exists erp_fk_ponto_registros_funcionario_id_idx on public.erp_ponto_registros(funcionario_id);
create index if not exists erp_fk_producao_conferencias_ordem_producao_id_idx on public.erp_producao_conferencias(ordem_producao_id);
create index if not exists erp_fk_producao_defeitos_ordem_producao_id_idx on public.erp_producao_defeitos(ordem_producao_id);
create index if not exists erp_fk_produtos_fornecedor_padrao_id_idx on public.erp_produtos(fornecedor_padrao_id);
create index if not exists erp_fk_produtos_localizacao_padrao_id_idx on public.erp_produtos(localizacao_padrao_id);
create index if not exists erp_fk_qualidade_ishikawa_rpnc_id_idx on public.erp_qualidade_ishikawa(rpnc_id);
create index if not exists erp_fk_role_permissions_permission_id_idx on public.erp_role_permissions(permission_id);
create index if not exists erp_fk_tabelas_preco_itens_produto_id_idx on public.erp_tabelas_preco_itens(produto_id);
create index if not exists erp_fk_tablet_acl_usuario_id_idx on public.erp_tablet_acl(usuario_id);
create index if not exists erp_fk_treinamentos_funcionarios_treinamento_id_idx on public.erp_treinamentos_funcionarios(treinamento_id);
create index if not exists erp_fk_vendas_depara_produtos_cliente_id_idx on public.erp_vendas_depara_produtos(cliente_id);

-- Optimize authenticated-user checks in the policies already audited.
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