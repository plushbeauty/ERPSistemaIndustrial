-- SYSNQRA ERP INDUSTRIAL — DIAGNOSTICO DE CONTRATO PAGINA x BANCO (somente leitura)
-- Autor: FernandoSch | 2026-11-04
-- Como usar: colar inteiro no SQL Editor do projeto zsklkydlawgvwgnvxwwx e executar.
-- Nao escreve nada. Roda em qualquer papel (anon ou authenticated) porque so le catalogos.

-- 1) TABELAS QUE O SISTEMA USA E NAO EXISTEM NESTE PROJETO
--    (cada linha devolvida e uma tela que vai dar erro de leitura ou de gravacao)
select t.table_name as tabela_usada_pelo_frontend,
       case when to_regclass('public.'||t.table_name) is null then 'NAO EXISTE' else 'existe' end as situacao
from (select unnest(array[
'engenharia_produtos','erp_acabamentos','erp_alertas_sistema','erp_almoxarifados',
    'erp_anos_fiscais','erp_apontamentos_processo','erp_areas','erp_audit_logs',
    'erp_bom_revisoes','erp_caixas','erp_centros_custos','erp_classificacao_fiscal',
    'erp_cliente_transportadoras','erp_clientes','erp_clientes_dn_config','erp_codigos',
    'erp_comissao_linhas','erp_comissao_perfis','erp_comissao_regras','erp_comissao_vinculos',
    'erp_config_fiscal','erp_configuracoes_lote','erp_contas_bancarias','erp_contas_pagar',
    'erp_contas_receber','erp_custos_fixos','erp_custos_produtos','erp_depreciacao_regras',
    'erp_documentos_anexos','erp_documentos_fiscais','erp_documentos_fiscais_itens','erp_documentos_qualidade',
    'erp_documentos_qualidade_anexos','erp_documentos_qualidade_aprovacoes','erp_documentos_qualidade_distribuicoes','erp_documentos_qualidade_leituras',
    'erp_documentos_qualidade_revisoes','erp_documentos_qualidade_solicitacoes','erp_empresas','erp_engenharia_bom',
    'erp_equipamentos_medicao','erp_estoque_inventario_itens','erp_estoque_inventarios','erp_estoque_localizacoes',
    'erp_estoque_lotes','erp_estoque_lotes_rastreabilidade','erp_estoque_movimentos','erp_estoque_reservas',
    'erp_estoque_separacoes','erp_expedicao_nfe','erp_expedicoes','erp_ferramentas_industriais',
    'erp_ficha_itens','erp_ficha_operacoes','erp_ficha_processo_operacoes','erp_fichas_processo',
    'erp_fichas_tecnicas','erp_financeiro_apuracao_custos','erp_financeiro_baixas','erp_financeiro_lancamentos',
    'erp_financeiro_parcelas','erp_financeiro_titulos','erp_fiscal_documentos','erp_fiscal_estornos',
    'erp_fiscal_liberacoes_pedido_item','erp_fiscal_razao_lancamentos','erp_fluxo_caixa','erp_fornecedores',
    'erp_funcionarios','erp_genealogia_lote_componentes','erp_grupos','erp_historico_ajustes_maquina',
    'erp_historico_codigos','erp_importacoes_log','erp_injecao_historico','erp_inspecoes',
    'erp_inventario_auditoria_saldos','erp_liberacoes_fiscais','erp_log_etiquetas','erp_logs_sistema',
    'erp_manutencao_ordens','erp_maquinas','erp_moldes','erp_moldes_manutencao_historico',
    'erp_motoristas','erp_mrp_necessidades','erp_mrp_runs','erp_notas_debito_clientes',
    'erp_notas_fiscais','erp_ordens_producao','erp_pcp_alertas','erp_pcp_apontamentos_turno',
    'erp_pcp_bom_itens','erp_pcp_calendario_trabalho','erp_pcp_ordens_planejadas','erp_pcp_planos_mestres',
    'erp_pcp_programacoes','erp_pcp_roteiro_operacoes','erp_pedidos_anexos','erp_pedidos_compra',
    'erp_pedidos_compra_itens','erp_pedidos_venda','erp_pedidos_venda_itens','erp_permissions',
    'erp_permissoes_modulos','erp_plano_modulos','erp_planos_catalogo','erp_planos_inspecao',
    'erp_postos_trabalho','erp_processos_historico','erp_processos_industriais','erp_producao_defeitos',
    'erp_producao_paradas','erp_produto_estoque','erp_produtos','erp_qualidade_5s_auditorias',
    'erp_qualidade_8d','erp_qualidade_acoes','erp_qualidade_auditorias_planta','erp_qualidade_calibracoes_historico',
    'erp_qualidade_certificado_cotas','erp_qualidade_certificados','erp_qualidade_controles_injetora','erp_qualidade_defeitos_motivos',
    'erp_qualidade_documentos_editor','erp_qualidade_documentos_revisoes','erp_qualidade_genealogia_lotes','erp_qualidade_injetora_amostras',
    'erp_qualidade_injetora_paradas','erp_qualidade_ishikawa','erp_qualidade_liberacao_lotes','erp_qualidade_refugos',
    'erp_qualidade_rpnc_evidencias','erp_quarentenas_lotes','erp_receitas_processos','erp_regras_decimais',
    'erp_regras_fiscais','erp_requisicoes_compra','erp_requisicoes_compra_itens','erp_rfq',
    'erp_rfq_fornecedores','erp_rfq_itens','erp_rh_acidentes','erp_rh_avaliacoes',
    'erp_rh_documentos','erp_rh_faltas','erp_rh_ponto_eventos','erp_rh_treinamentos_registros',
    'erp_role_permissions','erp_roles','erp_rpnc','erp_setores',
    'erp_sgq_auditorias','erp_sgq_capa_acoes','erp_solicitacoes_compra','erp_tabela_precos_cliente',
    'erp_tabelas_preco','erp_transacoes_bancarias','erp_transportadoras','erp_usuarios',
    'erp_veiculos','erp_vendas_depara_produtos','erp_vendas_metas','estoque_lotes',
    'outlook_integracoes','outlook_regras_pedidos','pcp_agenda_maquinas','qualidade_cep_medicoes',
    'qualidade_especificacoes','qualidade_fmea','qualidade_inspecoes','qualidade_rnc_capa'
]) as table_name) t
where to_regclass('public.'||t.table_name) is null
order by 1;

-- 2) A TELA DE APONTAMENTO DA O ERRO 'column "updated_em" ... does not exist'.
--    A string updated_em nao existe em NENHUM arquivo do repo, entao a mensagem nasce no banco.
--    Isto mostra as colunas reais, as triggers grudadas na tabela e o codigo delas.
select 'colunas' as o_que, string_agg(column_name, ', ' order by ordinal_position) as resultado
from information_schema.columns
where table_schema='public' and table_name='erp_apontamentos_processo'
union all
select 'tem coluna updated_em?', case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='erp_apontamentos_processo' and column_name='updated_em') then 'SIM' else 'NAO' end
union all
select 'trigger: '||tg.tgname||' -> '||p.proname, pg_get_functiondef(p.oid)
from pg_trigger tg
join pg_proc p on p.oid = tg.tgfoid
where tg.tgrelid = 'public.erp_apontamentos_processo'::regclass and not tg.tgisinternal;

-- 3) POLICIES E PERMISSOES DA TABELA DO APONTAMENTO (gravaacao depende das duas coisas)
select polname as politica, CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END as comando,
       array_agg(role::regrole::text) as papeis
from pg_policy where polrelid='public.erp_apontamentos_processo'::regclass group by polname, polcmd;
select 'grant' as tipo, privilege_type, grantee from information_schema.table_privileges
where table_schema='public' and table_name='erp_apontamentos_processo' order by grantee, privilege_type;
