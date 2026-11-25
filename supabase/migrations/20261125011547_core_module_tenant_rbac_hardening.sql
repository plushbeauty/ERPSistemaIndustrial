begin;
insert into public.erp_permissions(id,codigo,nome,description,modulo,ativo)
select gen_random_uuid(),v.codigo,v.nome,v.descricao,'quality',true
from (values
 ('quality.read','Qualidade: visualizar','Consultar registros, documentos e indicadores de qualidade'),
 ('quality.create','Qualidade: registrar','Criar registros de qualidade, RPNC e inspeções'),
 ('quality.update','Qualidade: alterar','Alterar registros e ações de qualidade'),
 ('quality.approve','Qualidade: aprovar','Aprovar/liberar registros e lotes de qualidade')
) as v(codigo,nome,descricao)
where not exists(select 1 from public.erp_permissions p where p.codigo=v.codigo);
insert into public.erp_role_permissions(role_id,permission_id)
select r.id,p.id from public.erp_roles r join public.erp_permissions p on p.codigo in ('quality.read','quality.create','quality.update','quality.approve')
where r.codigo='ADMIN' and not exists(select 1 from public.erp_role_permissions rp where rp.role_id=r.id and rp.permission_id=p.id);

do $$
declare r record; p record; v_read text; v_create text; v_update text; v_delete text; v_tenant text; v_count integer;
begin
 for r in select * from (values
('erp_almoxarifados','inventory'),
('erp_estoque_movimentos','inventory'),
('erp_estoque_inventarios','inventory'),
('erp_estoque_inventario_itens','inventory'),
('erp_estoque_localizacoes','inventory'),
('erp_bloco_k_estoque','inventory'),
('erp_acabamentos','production'),
('erp_ficha_itens','production'),
('erp_ficha_operacoes','production'),
('erp_fichas_tecnicas','production'),
('erp_mrp_runs','production'),
('erp_mrp_necessidades','production'),
('erp_pcp_bom_itens','production'),
('erp_pcp_ordens_planejadas','production'),
('erp_pcp_paradas','production'),
('erp_pcp_planos_mestres','production'),
('erp_pcp_roteiro_operacoes','production'),
('erp_postos_trabalho','production'),
('erp_configuracoes_producao_lote','production'),
('erp_mapa_processo','production'),
('erp_mapa_processo_etapa','production'),
('erp_bloco_k_apontamentos','production'),
('erp_bloco_k_bom','production'),
('erp_areas','products'),
('erp_codigos','products'),
('erp_engenharia_areas','products'),
('erp_engenharia_codificacao','products'),
('erp_clientes','sales'),
('erp_pedidos_venda','sales'),
('erp_pedidos_anexos','sales'),
('erp_comissao_calculos','sales'),
('erp_comissao_linhas','sales'),
('erp_comissao_perfis','sales'),
('erp_comissao_regras','sales'),
('erp_comissao_vinculos','sales'),
('erp_tabela_precos_cliente','sales'),
('erp_vendas_configuracoes','sales'),
('erp_vendas_metas','sales'),
('erp_parceiros','sales_purchases'),
('erp_anos_fiscais','finance'),
('erp_classificacao_fiscal','finance'),
('erp_contas_bancarias','finance'),
('erp_contas_pagar','finance'),
('erp_contas_receber','finance'),
('erp_conciliacoes_bancarias','finance'),
('erp_documentos_contabeis','finance'),
('erp_documentos_fiscais','finance'),
('erp_documentos_fiscais_itens','finance'),
('erp_depreciacao_regras','finance'),
('erp_centros_custos','finance'),
('erp_custos_apontamentos','finance'),
('erp_custos_componentes','finance'),
('erp_custos_fixos','finance'),
('erp_custos_produtos','finance'),
('erp_financeiro_lancamentos','finance'),
('erp_financeiro_custo_padrao','finance'),
('erp_fiscal_documentos','finance'),
('erp_fiscal_estornos','finance'),
('erp_fiscal_grupos_contabeis','finance'),
('erp_fiscal_razao_lancamentos','finance'),
('erp_fluxo_caixa','finance'),
('erp_liberacoes_fiscais','finance'),
('erp_notas_debito_extratos','finance'),
('erp_notas_debito_financeiras','finance'),
('erp_transacoes_bancarias','finance'),
('erp_caixas','finance'),
('erp_caixas_movimentos','finance'),
('erp_caixas_movimentos_itens','finance'),
('erp_auditorias','quality'),
('erp_qualidade_5s_auditorias','quality'),
('erp_qualidade_8d','quality'),
('erp_qualidade_acoes','quality'),
('erp_qualidade_auditorias_planta','quality'),
('erp_qualidade_certificados','quality'),
('erp_qualidade_indicadores','quality'),
('erp_qualidade_ishikawa','quality'),
('erp_qualidade_processos','quality'),
('erp_qualidade_riscos','quality'),
('erp_rpnc','quality'),
('erp_refugos_retrabalhos','quality'),
('erp_registros_qualidade','quality'),
('erp_inspecoes','quality'),
('erp_documentos_qualidade','quality'),
('erp_documentos_qualidade_anexos','quality'),
('erp_documentos_qualidade_anexos_historico','quality'),
('erp_equipamentos_medicao','quality'),
('erp_equipamentos_calibracoes','quality'),
('erp_avaliacoes_funcionarios','hr'),
('erp_faltas_atestados','hr'),
('erp_funcionarios_documentos','hr'),
('erp_funcionarios_qualificacoes','hr'),
('erp_rh_acidentes','hr'),
('erp_rh_avaliacoes','hr'),
('erp_rh_documentos','hr'),
('erp_rh_faltas','hr'),
('erp_rh_ferias','hr'),
('erp_rh_ponto_eventos','hr'),
('erp_rh_treinamentos_registros','hr'),
('erp_treinamentos','hr'),
('erp_treinamentos_funcionarios','hr'),
('erp_ponto_registros','hr'),
('erp_usuarios_ponto','hr'),
('erp_manutencao','maintenance'),
('erp_moldes_manutencao_historico','maintenance'),
('erp_expedicoes','expedicao'),
('erp_expedicoes_itens','expedicao')
 ) as m(table_name,module_name)
 loop
  if to_regclass('public.'||r.table_name) is null
     or not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=r.table_name and c.column_name='empresa_id') then
   continue;
  end if;
  select count(*) into v_count from pg_policies where schemaname='public' and tablename=r.table_name;
  if v_count=0 then continue; end if;
  case r.module_name
   when 'inventory' then
    v_read:='(select public.erp_has_permission(''inventory.read'')) or (select public.erp_has_permission(''inventory.create'')) or (select public.erp_has_permission(''inventory.update''))';
    v_create:='(select public.erp_has_permission(''inventory.create''))'; v_update:='(select public.erp_has_permission(''inventory.update''))'; v_delete:='(select public.erp_has_permission(''inventory.update''))';
   when 'production' then
    v_read:='(select public.erp_has_permission(''production.read'')) or (select public.erp_has_permission(''production.create'')) or (select public.erp_has_permission(''production.update'')) or (select public.erp_has_permission(''production.approve''))';
    v_create:='(select public.erp_has_permission(''production.create''))'; v_update:='(select public.erp_has_permission(''production.update'')) or (select public.erp_has_permission(''production.approve''))'; v_delete:='(select public.erp_has_permission(''production.update''))';
   when 'products' then
    v_read:='(select public.erp_has_permission(''products.read'')) or (select public.erp_has_permission(''products.create'')) or (select public.erp_has_permission(''products.update''))';
    v_create:='(select public.erp_has_permission(''products.create''))'; v_update:='(select public.erp_has_permission(''products.update''))'; v_delete:='(select public.erp_has_permission(''products.delete'')) or (select public.erp_has_permission(''products.update''))';
   when 'sales' then
    v_read:='(select public.erp_has_permission(''sales.read'')) or (select public.erp_has_permission(''sales.create'')) or (select public.erp_has_permission(''sales.update'')) or (select public.erp_has_permission(''sales.cancel''))';
    v_create:='(select public.erp_has_permission(''sales.create''))'; v_update:='(select public.erp_has_permission(''sales.update'')) or (select public.erp_has_permission(''sales.cancel''))'; v_delete:='(select public.erp_has_permission(''sales.cancel'')) or (select public.erp_has_permission(''sales.update''))';
   when 'sales_purchases' then
    v_read:='(select public.erp_has_permission(''sales.read'')) or (select public.erp_has_permission(''sales.create'')) or (select public.erp_has_permission(''sales.update'')) or (select public.erp_has_permission(''purchases.read'')) or (select public.erp_has_permission(''purchases.create'')) or (select public.erp_has_permission(''purchases.update''))';
    v_create:='(select public.erp_has_permission(''sales.create'')) or (select public.erp_has_permission(''purchases.create''))'; v_update:='(select public.erp_has_permission(''sales.update'')) or (select public.erp_has_permission(''purchases.update''))'; v_delete:='(select public.erp_has_permission(''sales.update'')) or (select public.erp_has_permission(''purchases.update''))';
   when 'finance' then
    v_read:='(select public.erp_has_permission(''finance.read'')) or (select public.erp_has_permission(''finance.create'')) or (select public.erp_has_permission(''finance.update'')) or (select public.erp_has_permission(''finance.approve''))';
    v_create:='(select public.erp_has_permission(''finance.create''))'; v_update:='(select public.erp_has_permission(''finance.update'')) or (select public.erp_has_permission(''finance.approve''))'; v_delete:='(select public.erp_has_permission(''finance.update'')) or (select public.erp_has_permission(''finance.approve''))';
   when 'quality' then
    v_read:='(select public.erp_has_permission(''quality.read'')) or (select public.erp_has_permission(''quality.create'')) or (select public.erp_has_permission(''quality.update'')) or (select public.erp_has_permission(''quality.approve''))';
    v_create:='(select public.erp_has_permission(''quality.create''))'; v_update:='(select public.erp_has_permission(''quality.update'')) or (select public.erp_has_permission(''quality.approve''))'; v_delete:='(select public.erp_has_permission(''quality.update''))';
   when 'hr' then
    v_read:='(select public.erp_has_permission(''hr.read'')) or (select public.erp_has_permission(''hr.create'')) or (select public.erp_has_permission(''hr.update'')) or (select public.erp_has_permission(''hr.delete''))';
    v_create:='(select public.erp_has_permission(''hr.create''))'; v_update:='(select public.erp_has_permission(''hr.update''))'; v_delete:='(select public.erp_has_permission(''hr.delete''))';
   when 'maintenance' then
    v_read:='(select public.erp_has_permission(''manutencao.ver'')) or (select public.erp_has_permission(''manutencao.criar'')) or (select public.erp_has_permission(''manutencao.editar''))';
    v_create:='(select public.erp_has_permission(''manutencao.criar''))'; v_update:='(select public.erp_has_permission(''manutencao.editar''))'; v_delete:='(select public.erp_has_permission(''manutencao.excluir''))';
   when 'expedicao' then
    v_read:='(select public.erp_has_permission(''expedicao.ver'')) or (select public.erp_has_permission(''expedicao.criar'')) or (select public.erp_has_permission(''expedicao.editar''))';
    v_create:='(select public.erp_has_permission(''expedicao.criar''))'; v_update:='(select public.erp_has_permission(''expedicao.editar''))'; v_delete:='(select public.erp_has_permission(''expedicao.excluir''))';
   else continue;
  end case;
  for p in select policyname from pg_policies where schemaname='public' and tablename=r.table_name loop
   execute format('drop policy if exists %I on public.%I',p.policyname,r.table_name);
  end loop;
  execute format('alter table public.%I enable row level security',r.table_name);
  v_tenant:='(select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (%s))';
  execute format('create policy erp_rbac_select on public.%I for select to authenticated using ('||v_tenant||')',r.table_name,v_read);
  execute format('create policy erp_rbac_insert on public.%I for insert to authenticated with check ('||v_tenant||')',r.table_name,v_create);
  execute format('create policy erp_rbac_update on public.%I for update to authenticated using ('||v_tenant||') with check ('||v_tenant||')',r.table_name,v_update,v_update);
  execute format('create policy erp_rbac_delete on public.%I for delete to authenticated using ('||v_tenant||')',r.table_name,v_delete);
 end loop;
end $$;
commit;
notify pgrst,'reload schema';
