-- SYSNQRA ERP INDUSTRIAL
-- VERIFICACAO POS-MIGRATIONS — REV-BANCO-20261108-01
-- Somente leitura: NÃO contém CREATE, ALTER, INSERT, UPDATE, DELETE, GRANT ou DROP.
-- Executar no SQL Editor do projeto Supabase após a aplicação autorizada das migrations.
-- Compara os 89 nomes de tabelas e 47 funções encontrados no pacote de 28 migrations
-- com o catálogo real do PostgreSQL. O resultado não substitui testes de fluxo/RLS por usuário.

-- 1) Tabelas: existência, empresa_id, RLS, políticas e privilégios de authenticated.
WITH esperadas(table_name) AS (
VALUES
  ('engenharia_bom'),
  ('engenharia_bom_componentes'),
  ('engenharia_produtos'),
  ('erp_acabamentos'),
  ('erp_alertas_sistema'),
  ('erp_almoxarifados'),
  ('erp_bom_revisoes'),
  ('erp_caixas'),
  ('erp_caixas_movimentos'),
  ('erp_caixas_movimentos_itens'),
  ('erp_central_evolucao_evento'),
  ('erp_central_evolucao_item'),
  ('erp_centros_custos'),
  ('erp_clientes_dn_config'),
  ('erp_contas_pagar'),
  ('erp_contas_receber'),
  ('erp_crm_oportunidades'),
  ('erp_custos_fixos'),
  ('erp_documentos_anexos'),
  ('erp_documentos_qualidade_aprovacoes'),
  ('erp_documentos_qualidade_ciencia'),
  ('erp_documentos_qualidade_distribuicoes'),
  ('erp_documentos_qualidade_leituras'),
  ('erp_documentos_qualidade_revisoes'),
  ('erp_documentos_qualidade_solicitacoes'),
  ('erp_engenharia_bom'),
  ('erp_engenharia_bom_itens'),
  ('erp_estoque_lotes'),
  ('erp_estoque_separacoes'),
  ('erp_expedicao_nfe'),
  ('erp_financeiro_apuracao_custos'),
  ('erp_financeiro_lancamentos'),
  ('erp_fiscal_bloco_k_estoque'),
  ('erp_fiscal_bloco_k_producao'),
  ('erp_fiscal_liberacoes_pedido_item'),
  ('erp_fmea_cabecalho'),
  ('erp_fornecedores'),
  ('erp_log_etiquetas'),
  ('erp_manutencao_ordens'),
  ('erp_notas_debito_clientes'),
  ('erp_pedidos_compra'),
  ('erp_pedidos_compra_itens'),
  ('erp_permissoes_modulos'),
  ('erp_plano_controle'),
  ('erp_plano_controle_linha'),
  ('erp_planos_inspecao'),
  ('erp_producao_paradas'),
  ('erp_qualidade_5s_auditorias'),
  ('erp_qualidade_8d'),
  ('erp_qualidade_auditorias_planta'),
  ('erp_qualidade_certificado_cotas'),
  ('erp_qualidade_certificados'),
  ('erp_qualidade_defeitos_motivos'),
  ('erp_qualidade_genealogia_lotes'),
  ('erp_qualidade_liberacao_lotes'),
  ('erp_qualidade_refugos'),
  ('erp_qualidade_rpnc_evidencias'),
  ('erp_rastreabilidade_cartoes'),
  ('erp_regras_fiscais'),
  ('erp_requisicoes_compra'),
  ('erp_requisicoes_compra_itens'),
  ('erp_rfq'),
  ('erp_rfq_fornecedores'),
  ('erp_rfq_itens'),
  ('erp_sgq_auditoria'),
  ('erp_sgq_auditorias'),
  ('erp_sgq_capa_acoes'),
  ('erp_sgq_contadores'),
  ('erp_tabelas_preco'),
  ('erp_tabelas_preco_itens'),
  ('estoque_enderecos'),
  ('estoque_lotes'),
  ('estoque_saldos'),
  ('fiscal_historico_custos'),
  ('fiscal_nfe_entradas'),
  ('fiscal_parametros_tributarios'),
  ('pcp_apontamentos'),
  ('pcp_ordens_producao'),
  ('pcp_roteiros'),
  ('qualidade_especificacoes'),
  ('qualidade_fmea'),
  ('qualidade_inspecoes'),
  ('qualidade_motivos_falha'),
  ('qualidade_rnc_capa'),
  ('rh_entregas_epis'),
  ('rh_epis'),
  ('rh_funcionario_turnos'),
  ('rh_funcionarios'),
  ('rh_turnos')
)
SELECT
  e.table_name,
  CASE WHEN c.oid IS NULL THEN 'AUSENTE' ELSE 'EXISTE' END AS tabela,
  CASE WHEN c.oid IS NULL THEN false ELSE c.relrowsecurity END AS rls_habilitado,
  CASE WHEN c.oid IS NULL THEN false ELSE c.relforcerowsecurity END AS force_rls,
  EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public'
      AND col.table_name = e.table_name
      AND col.column_name = 'empresa_id'
  ) AS possui_empresa_id,
  COALESCE((SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid), 0) AS qtd_policies,
  CASE WHEN c.oid IS NULL THEN false ELSE has_table_privilege('authenticated', c.oid, 'SELECT') END AS authenticated_select,
  CASE WHEN c.oid IS NULL THEN false ELSE has_table_privilege('authenticated', c.oid, 'INSERT') END AS authenticated_insert,
  CASE WHEN c.oid IS NULL THEN false ELSE has_table_privilege('authenticated', c.oid, 'UPDATE') END AS authenticated_update,
  CASE WHEN c.oid IS NULL THEN false ELSE has_table_privilege('authenticated', c.oid, 'DELETE') END AS authenticated_delete
FROM esperadas e
LEFT JOIN pg_class c
  ON c.relnamespace = 'public'::regnamespace
 AND c.relname = e.table_name
 AND c.relkind IN ('r', 'p')
ORDER BY e.table_name;

-- 2) Colunas reais de todas as tabelas esperadas (permite comparar o contrato de cada tela).
WITH esperadas(table_name) AS (
VALUES
  ('engenharia_bom'),
  ('engenharia_bom_componentes'),
  ('engenharia_produtos'),
  ('erp_acabamentos'),
  ('erp_alertas_sistema'),
  ('erp_almoxarifados'),
  ('erp_bom_revisoes'),
  ('erp_caixas'),
  ('erp_caixas_movimentos'),
  ('erp_caixas_movimentos_itens'),
  ('erp_central_evolucao_evento'),
  ('erp_central_evolucao_item'),
  ('erp_centros_custos'),
  ('erp_clientes_dn_config'),
  ('erp_contas_pagar'),
  ('erp_contas_receber'),
  ('erp_crm_oportunidades'),
  ('erp_custos_fixos'),
  ('erp_documentos_anexos'),
  ('erp_documentos_qualidade_aprovacoes'),
  ('erp_documentos_qualidade_ciencia'),
  ('erp_documentos_qualidade_distribuicoes'),
  ('erp_documentos_qualidade_leituras'),
  ('erp_documentos_qualidade_revisoes'),
  ('erp_documentos_qualidade_solicitacoes'),
  ('erp_engenharia_bom'),
  ('erp_engenharia_bom_itens'),
  ('erp_estoque_lotes'),
  ('erp_estoque_separacoes'),
  ('erp_expedicao_nfe'),
  ('erp_financeiro_apuracao_custos'),
  ('erp_financeiro_lancamentos'),
  ('erp_fiscal_bloco_k_estoque'),
  ('erp_fiscal_bloco_k_producao'),
  ('erp_fiscal_liberacoes_pedido_item'),
  ('erp_fmea_cabecalho'),
  ('erp_fornecedores'),
  ('erp_log_etiquetas'),
  ('erp_manutencao_ordens'),
  ('erp_notas_debito_clientes'),
  ('erp_pedidos_compra'),
  ('erp_pedidos_compra_itens'),
  ('erp_permissoes_modulos'),
  ('erp_plano_controle'),
  ('erp_plano_controle_linha'),
  ('erp_planos_inspecao'),
  ('erp_producao_paradas'),
  ('erp_qualidade_5s_auditorias'),
  ('erp_qualidade_8d'),
  ('erp_qualidade_auditorias_planta'),
  ('erp_qualidade_certificado_cotas'),
  ('erp_qualidade_certificados'),
  ('erp_qualidade_defeitos_motivos'),
  ('erp_qualidade_genealogia_lotes'),
  ('erp_qualidade_liberacao_lotes'),
  ('erp_qualidade_refugos'),
  ('erp_qualidade_rpnc_evidencias'),
  ('erp_rastreabilidade_cartoes'),
  ('erp_regras_fiscais'),
  ('erp_requisicoes_compra'),
  ('erp_requisicoes_compra_itens'),
  ('erp_rfq'),
  ('erp_rfq_fornecedores'),
  ('erp_rfq_itens'),
  ('erp_sgq_auditoria'),
  ('erp_sgq_auditorias'),
  ('erp_sgq_capa_acoes'),
  ('erp_sgq_contadores'),
  ('erp_tabelas_preco'),
  ('erp_tabelas_preco_itens'),
  ('estoque_enderecos'),
  ('estoque_lotes'),
  ('estoque_saldos'),
  ('fiscal_historico_custos'),
  ('fiscal_nfe_entradas'),
  ('fiscal_parametros_tributarios'),
  ('pcp_apontamentos'),
  ('pcp_ordens_producao'),
  ('pcp_roteiros'),
  ('qualidade_especificacoes'),
  ('qualidade_fmea'),
  ('qualidade_inspecoes'),
  ('qualidade_motivos_falha'),
  ('qualidade_rnc_capa'),
  ('rh_entregas_epis'),
  ('rh_epis'),
  ('rh_funcionario_turnos'),
  ('rh_funcionarios'),
  ('rh_turnos')
)
SELECT
  e.table_name,
  COALESCE(
    string_agg(col.column_name || ' ' || col.data_type, ', ' ORDER BY col.ordinal_position),
    'TABELA AUSENTE OU SEM COLUNAS VISÍVEIS'
  ) AS colunas_encontradas
FROM esperadas e
LEFT JOIN information_schema.columns col
  ON col.table_schema = 'public'
 AND col.table_name = e.table_name
GROUP BY e.table_name
ORDER BY e.table_name;

-- 3) Políticas RLS: comando, papéis, USING e WITH CHECK.
WITH esperadas(table_name) AS (
VALUES
  ('engenharia_bom'),
  ('engenharia_bom_componentes'),
  ('engenharia_produtos'),
  ('erp_acabamentos'),
  ('erp_alertas_sistema'),
  ('erp_almoxarifados'),
  ('erp_bom_revisoes'),
  ('erp_caixas'),
  ('erp_caixas_movimentos'),
  ('erp_caixas_movimentos_itens'),
  ('erp_central_evolucao_evento'),
  ('erp_central_evolucao_item'),
  ('erp_centros_custos'),
  ('erp_clientes_dn_config'),
  ('erp_contas_pagar'),
  ('erp_contas_receber'),
  ('erp_crm_oportunidades'),
  ('erp_custos_fixos'),
  ('erp_documentos_anexos'),
  ('erp_documentos_qualidade_aprovacoes'),
  ('erp_documentos_qualidade_ciencia'),
  ('erp_documentos_qualidade_distribuicoes'),
  ('erp_documentos_qualidade_leituras'),
  ('erp_documentos_qualidade_revisoes'),
  ('erp_documentos_qualidade_solicitacoes'),
  ('erp_engenharia_bom'),
  ('erp_engenharia_bom_itens'),
  ('erp_estoque_lotes'),
  ('erp_estoque_separacoes'),
  ('erp_expedicao_nfe'),
  ('erp_financeiro_apuracao_custos'),
  ('erp_financeiro_lancamentos'),
  ('erp_fiscal_bloco_k_estoque'),
  ('erp_fiscal_bloco_k_producao'),
  ('erp_fiscal_liberacoes_pedido_item'),
  ('erp_fmea_cabecalho'),
  ('erp_fornecedores'),
  ('erp_log_etiquetas'),
  ('erp_manutencao_ordens'),
  ('erp_notas_debito_clientes'),
  ('erp_pedidos_compra'),
  ('erp_pedidos_compra_itens'),
  ('erp_permissoes_modulos'),
  ('erp_plano_controle'),
  ('erp_plano_controle_linha'),
  ('erp_planos_inspecao'),
  ('erp_producao_paradas'),
  ('erp_qualidade_5s_auditorias'),
  ('erp_qualidade_8d'),
  ('erp_qualidade_auditorias_planta'),
  ('erp_qualidade_certificado_cotas'),
  ('erp_qualidade_certificados'),
  ('erp_qualidade_defeitos_motivos'),
  ('erp_qualidade_genealogia_lotes'),
  ('erp_qualidade_liberacao_lotes'),
  ('erp_qualidade_refugos'),
  ('erp_qualidade_rpnc_evidencias'),
  ('erp_rastreabilidade_cartoes'),
  ('erp_regras_fiscais'),
  ('erp_requisicoes_compra'),
  ('erp_requisicoes_compra_itens'),
  ('erp_rfq'),
  ('erp_rfq_fornecedores'),
  ('erp_rfq_itens'),
  ('erp_sgq_auditoria'),
  ('erp_sgq_auditorias'),
  ('erp_sgq_capa_acoes'),
  ('erp_sgq_contadores'),
  ('erp_tabelas_preco'),
  ('erp_tabelas_preco_itens'),
  ('estoque_enderecos'),
  ('estoque_lotes'),
  ('estoque_saldos'),
  ('fiscal_historico_custos'),
  ('fiscal_nfe_entradas'),
  ('fiscal_parametros_tributarios'),
  ('pcp_apontamentos'),
  ('pcp_ordens_producao'),
  ('pcp_roteiros'),
  ('qualidade_especificacoes'),
  ('qualidade_fmea'),
  ('qualidade_inspecoes'),
  ('qualidade_motivos_falha'),
  ('qualidade_rnc_capa'),
  ('rh_entregas_epis'),
  ('rh_epis'),
  ('rh_funcionario_turnos'),
  ('rh_funcionarios'),
  ('rh_turnos')
)
SELECT
  e.table_name,
  p.polname AS policy,
  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END AS comando,
  ARRAY(
    SELECT CASE WHEN role_oid = 0 THEN 'PUBLIC'
      ELSE COALESCE((SELECT rolname FROM pg_roles WHERE oid = role_oid), role_oid::text) END
    FROM unnest(p.polroles) AS role_oid
  ) AS papeis,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM esperadas e
JOIN pg_class c
  ON c.relnamespace = 'public'::regnamespace AND c.relname = e.table_name
JOIN pg_policy p ON p.polrelid = c.oid
ORDER BY e.table_name, p.polname;

-- 4) Funções/RPCs presentes no pacote: assinatura, SECURITY DEFINER e EXECUTE para authenticated.
WITH esperadas(routine_name) AS (
VALUES
  ('erp_atualizar_total_pedido_compra'),
  ('erp_central_evolucao_mudar_situacao'),
  ('erp_central_evolucao_registra_alta'),
  ('erp_central_evolucao_resumo'),
  ('erp_central_evolucao_ultima_quem'),
  ('erp_fmea_matriz'),
  ('erp_fmea_resumo'),
  ('erp_homologar_bom_mestre'),
  ('erp_liberar_item_fiscal'),
  ('erp_numero_pedido_compra_formatado'),
  ('erp_plano_controle_matriz'),
  ('erp_portal_cliente_pedidos'),
  ('erp_preco_cliente_produto'),
  ('erp_qms_can'),
  ('erp_qms_confirmar_leitura'),
  ('erp_qms_criar_documento'),
  ('erp_qms_criar_revisao'),
  ('erp_qms_current_user'),
  ('erp_qms_distribuir_revisao'),
  ('erp_qms_protect_document'),
  ('erp_qms_protect_revision'),
  ('erp_qms_salvar_revisao'),
  ('erp_qms_transicionar_revisao'),
  ('erp_qualidade_auditoria_planta_defaults'),
  ('erp_qualidade_certificado_criar'),
  ('erp_qualidade_liberacao_lotes_touch_updated_at'),
  ('erp_quality_quarantine_lot'),
  ('erp_registrar_custo_medio_nfe'),
  ('erp_registrar_refugo'),
  ('erp_salvar_bom_mestre'),
  ('erp_sgq_abrir_rpnc'),
  ('erp_sgq_abrir_rpnc_formulario'),
  ('erp_sgq_auditar_mutacao'),
  ('erp_sgq_auditoria_normalizar'),
  ('erp_sgq_buscar_recorrencia_rpnc'),
  ('erp_sgq_capa_decidir'),
  ('erp_sgq_proteger_auditoria'),
  ('erp_sgq_proteger_rpnc'),
  ('erp_sgq_salvar_acoes_rpnc'),
  ('erp_sgq_salvar_formulario_rpnc'),
  ('erp_sgq_transicionar_rpnc'),
  ('erp_sgq_validar_capa_tenant'),
  ('erp_sgq_validar_transicao_capa'),
  ('erp_sgq_validar_transicao_rpnc'),
  ('erp_sgq_vincular_rpnc_auditoria'),
  ('erp_stdq_touch_updated_at'),
  ('erp_tpm_sync_machine_status')
)
SELECT
  e.routine_name,
  p.oid::regprocedure::text AS assinatura,
  CASE WHEN p.oid IS NULL THEN 'AUSENTE'
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER' END AS modo_seguranca,
  CASE WHEN p.oid IS NULL THEN false
    ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute
FROM esperadas e
LEFT JOIN pg_proc p
  ON p.pronamespace = 'public'::regnamespace
 AND p.proname = e.routine_name
ORDER BY e.routine_name, assinatura;

-- 5) Estruturas planejadas nas fases 3.1/3.2 e RPCs de liberação SGQ-REL-001.
-- AUSENTE é o resultado esperado até a implementação e aplicação das migrations próprias.
WITH planejadas(object_name, object_type) AS (
  VALUES
    ('erp_qualidade_inspecao_templates', 'TABLE'),
    ('erp_qualidade_inspecao_template_itens', 'TABLE'),
    ('erp_financeiro_custo_op', 'TABLE'),
    ('erp_liberar_lote', 'FUNCTION'),
    ('erp_bloquear_lote', 'FUNCTION')
)
SELECT
  object_name,
  object_type,
  CASE
    WHEN object_type = 'TABLE' AND to_regclass('public.' || object_name) IS NOT NULL THEN 'EXISTE'
    WHEN object_type = 'FUNCTION' AND EXISTS (
      SELECT 1 FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace AND p.proname = object_name
    ) THEN 'EXISTE'
    ELSE 'AUSENTE'
  END AS situacao
FROM planejadas
ORDER BY object_type, object_name;

-- LEITURA DO RESULTADO:
-- * Tabela AUSENTE: migration não aplicada ou schema divergente.
-- * RLS false: bloquear acesso Data API até corrigir política.
-- * empresa_id false: conferir se a tabela é global por contrato; não liberar automaticamente.
-- * qtd_policies = 0: investigar acesso exclusivo por SECURITY DEFINER ou ausência de policy.
-- * authenticated_* false: conferir GRANT/default privileges antes de declarar persistência.
-- * RPC sem EXECUTE: revisar GRANT EXECUTE e contrato de chamada.
-- * Policies com PUBLIC ou sem filtro de tenant exigem revisão de segurança.
-- * As consultas são de catálogo; não comprovam o isolamento funcional. Executar testes com duas empresas e
--   usuários de permissões distintas antes do aceite final.
