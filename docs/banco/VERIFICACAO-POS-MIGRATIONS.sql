-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — VERIFICAÇÃO PÓS-MIGRATIONS
-- Revisão: REV-VERIF-BANCO-20261108-01
-- Autor: FernandoSch
--
-- Uso: rodar no SQL Editor do Supabase DEPOIS de aplicar
-- supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql.
--
-- Este arquivo é SOMENTE LEITURA: não cria, altera nem apaga nada.
-- Todas as consultas podem ser reexecutadas quantas vezes forem necessárias.
--
-- Como ler o resultado: cada bloco devolve uma coluna "situacao".
--   OK      = objeto presente e configurado como esperado
--   FALTA   = objeto ausente (aplicação incompleta ou bloqueada por erro anterior)
--   ATENCAO = objeto presente, mas sem RLS/policy/grant como o contrato exige
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELAS: as 88 tabelas tocadas pelos 28 blocos do pacote
--    (inclui as já existentes, para provar que o pacote não as removeu)
-- ----------------------------------------------------------------------------
with esperado(tabela, papel) as (values
  ('erp_documentos_qualidade_revisoes',      'doc controlado'),
  ('erp_documentos_qualidade_solicitacoes',  'doc controlado'),
  ('erp_documentos_qualidade_ciencia',       'doc controlado'),
  ('erp_documentos_qualidade_aprovacoes',    'declarada ausente'),
  ('erp_permissoes_modulos',                 'doc controlado'),
  ('erp_fornecedores',                       'dependência'),
  ('erp_tabelas_preco',                      'dependência'),
  ('erp_tabelas_preco_itens',                'dependência'),
  ('erp_manutencao_ordens',                  'dependência'),
  ('erp_regras_fiscais',                     'declarada ausente'),
  ('erp_requisicoes_compra',                 'dependência'),
  ('erp_requisicoes_compra_itens',           'dependência'),
  ('erp_estoque_lotes',                      'dependência'),
  ('erp_producao_paradas',                   'dependência'),
  ('erp_acabamentos',                        'dependência'),
  ('erp_estoque_separacoes',                 'declarada ausente'),
  ('erp_rastreabilidade_cartoes',            'dependência'),
  ('erp_qualidade_8d',                       'dependência'),
  ('erp_qualidade_5s_auditorias',            'dependência'),
  ('erp_financeiro_apuracao_custos',         'declarada ausente'),
  ('erp_pedidos_compra',                     'dependência'),
  ('erp_pedidos_compra_itens',               'dependência'),
  ('erp_caixas',                             'dependência'),
  ('erp_caixas_movimentos',                  'dependência'),
  ('erp_caixas_movimentos_itens',            'dependência'),
  ('erp_rfq',                                'dependência'),
  ('erp_rfq_fornecedores',                   'dependência'),
  ('erp_rfq_itens',                          'dependência'),
  ('erp_sgq_contadores',                     'dependência'),
  ('erp_sgq_capa_acoes',                     'dependência'),
  ('erp_sgq_auditoria',                      'dependência'),
  ('erp_documentos_qualidade_distribuicoes', 'declarada ausente'),
  ('erp_documentos_qualidade_leituras',      'doc controlado'),
  ('engenharia_produtos',                    'dependência'),
  ('engenharia_bom',                         'dependência'),
  ('engenharia_bom_componentes',             'dependência'),
  ('estoque_enderecos',                      'dependência'),
  ('estoque_saldos',                         'dependência'),
  ('qualidade_especificacoes',               'dependência'),
  ('qualidade_motivos_falha',                'dependência'),
  ('qualidade_inspecoes',                    'dependência'),
  ('qualidade_rnc_capa',                     'dependência'),
  ('qualidade_fmea',                         'dependência'),
  ('pcp_roteiros',                           'dependência'),
  ('pcp_ordens_producao',                    'dependência'),
  ('pcp_apontamentos',                       'dependência'),
  ('fiscal_parametros_tributarios',          'dependência'),
  ('fiscal_nfe_entradas',                    'dependência'),
  ('fiscal_historico_custos',                'dependência'),
  ('rh_funcionarios',                        'dependência'),
  ('rh_turnos',                              'dependência'),
  ('rh_funcionario_turnos',                  'dependência'),
  ('rh_epis',                                'dependência'),
  ('rh_entregas_epis',                       'dependência'),
  ('erp_qualidade_liberacao_lotes',          'declarada ausente'),
  ('erp_qualidade_genealogia_lotes',         'declarada ausente'),
  ('erp_expedicao_nfe',                      'declarada ausente'),
  ('erp_log_etiquetas',                      'dependência'),
  ('erp_engenharia_bom',                     'declarada ausente'),
  ('erp_engenharia_bom_itens',               'declarada ausente'),
  ('erp_qualidade_defeitos_motivos',         'declarada ausente'),
  ('erp_qualidade_refugos',                  'declarada ausente'),
  ('erp_qualidade_auditorias_planta',        'declarada ausente'),
  ('erp_crm_oportunidades',                  'dependência'),
  ('erp_fiscal_bloco_k_estoque',             'dependência'),
  ('erp_fiscal_bloco_k_producao',            'dependência'),
  ('erp_qualidade_rpnc_evidencias',          'declarada ausente'),
  ('erp_clientes_dn_config',                 'declarada ausente'),
  ('erp_notas_debito_clientes',              'dependência'),
  ('erp_sgq_auditorias',                     'declarada ausente'),
  ('erp_qualidade_certificados',             'dependência'),
  ('erp_qualidade_certificado_cotas',        'declarada ausente'),
  ('erp_fiscal_liberacoes_pedido_item',      'declarada ausente'),
  ('erp_almoxarifados',                      'dependência'),
  ('erp_contas_pagar',                       'dependência'),
  ('erp_contas_receber',                     'dependência'),
  ('erp_financeiro_lancamentos',             'dependência'),
  ('erp_bom_revisoes',                       'declarada ausente'),
  ('erp_planos_inspecao',                    'dependência'),
  ('erp_documentos_anexos',                  'dependência'),
  ('erp_alertas_sistema',                    'dependência'),
  ('erp_centros_custos',                     'dependência'),
  ('erp_custos_fixos',                       'dependência'),
  ('erp_fmea_cabecalho',                     'declarada ausente'),
  ('erp_plano_controle',                     'declarada ausente'),
  ('erp_plano_controle_linha',               'declarada ausente'),
  ('erp_central_evolucao_item',              'declarada ausente'),
  ('erp_central_evolucao_evento',            'declarada ausente')
)
select
  e.tabela,
  e.papel,
  case when c.oid is null then 'FALTA' else 'OK' end as situacao,
  coalesce(c.relrowsecurity, false) as rls_ligada,
  coalesce((select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = e.tabela), 0) as policies
from esperado e
left join pg_class c on c.relname = e.tabela and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by (c.oid is null) desc, e.papel, e.tabela;

-- ----------------------------------------------------------------------------
-- 2. RESUMO: quantas tabelas esperadas existem
-- ----------------------------------------------------------------------------
with esperado(tabela) as (values
  ('erp_documentos_qualidade_revisoes'),('erp_documentos_qualidade_solicitacoes'),('erp_documentos_qualidade_ciencia'),
  ('erp_documentos_qualidade_aprovacoes'),('erp_permissoes_modulos'),('erp_fornecedores'),('erp_tabelas_preco'),
  ('erp_tabelas_preco_itens'),('erp_manutencao_ordens'),('erp_regras_fiscais'),('erp_requisicoes_compra'),
  ('erp_requisicoes_compra_itens'),('erp_estoque_lotes'),('erp_producao_paradas'),('erp_acabamentos'),
  ('erp_estoque_separacoes'),('erp_rastreabilidade_cartoes'),('erp_qualidade_8d'),('erp_qualidade_5s_auditorias'),
  ('erp_financeiro_apuracao_custos'),('erp_pedidos_compra'),('erp_pedidos_compra_itens'),('erp_caixas'),
  ('erp_caixas_movimentos'),('erp_caixas_movimentos_itens'),('erp_rfq'),('erp_rfq_fornecedores'),('erp_rfq_itens'),
  ('erp_sgq_contadores'),('erp_sgq_capa_acoes'),('erp_sgq_auditoria'),('erp_documentos_qualidade_distribuicoes'),
  ('erp_documentos_qualidade_leituras'),('engenharia_produtos'),('engenharia_bom'),('engenharia_bom_componentes'),
  ('estoque_enderecos'),('estoque_saldos'),('qualidade_especificacoes'),('qualidade_motivos_falha'),
  ('qualidade_inspecoes'),('qualidade_rnc_capa'),('qualidade_fmea'),('pcp_roteiros'),('pcp_ordens_producao'),
  ('pcp_apontamentos'),('fiscal_parametros_tributarios'),('fiscal_nfe_entradas'),('fiscal_historico_custos'),
  ('rh_funcionarios'),('rh_turnos'),('rh_funcionario_turnos'),('rh_epis'),('rh_entregas_epis'),
  ('erp_qualidade_liberacao_lotes'),('erp_qualidade_genealogia_lotes'),('erp_expedicao_nfe'),('erp_log_etiquetas'),
  ('erp_engenharia_bom'),('erp_engenharia_bom_itens'),('erp_qualidade_defeitos_motivos'),('erp_qualidade_refugos'),
  ('erp_qualidade_auditorias_planta'),('erp_crm_oportunidades'),('erp_fiscal_bloco_k_estoque'),
  ('erp_fiscal_bloco_k_producao'),('erp_qualidade_rpnc_evidencias'),('erp_clientes_dn_config'),
  ('erp_notas_debito_clientes'),('erp_sgq_auditorias'),('erp_qualidade_certificados'),
  ('erp_qualidade_certificado_cotas'),('erp_fiscal_liberacoes_pedido_item'),('erp_almoxarifados'),
  ('erp_contas_pagar'),('erp_contas_receber'),('erp_financeiro_lancamentos'),('erp_bom_revisoes'),
  ('erp_planos_inspecao'),('erp_documentos_anexos'),('erp_alertas_sistema'),('erp_centros_custos'),
  ('erp_custos_fixos'),('erp_fmea_cabecalho'),('erp_plano_controle'),('erp_plano_controle_linha'),
  ('erp_central_evolucao_item'),('erp_central_evolucao_evento')
)
select
  count(*) as tabelas_esperadas,
  count(c.oid) as tabelas_presentes,
  count(*) - count(c.oid) as tabelas_ausentes
from esperado e
left join pg_class c on c.relname = e.tabela and c.relnamespace = 'public'::regnamespace and c.relkind = 'r';

-- ----------------------------------------------------------------------------
-- 3. RLS E GRANTS: nenhuma tabela do pacote pode ficar sem RLS ou sem policy
-- ----------------------------------------------------------------------------
select
  c.relname as tabela,
  c.relrowsecurity as rls_ligada,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
  has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') as auth_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as auth_update,
  case
    when not c.relrowsecurity then 'ATENCAO: RLS desligada'
    when (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) = 0
      then 'ATENCAO: sem policy'
    when not has_table_privilege('authenticated', c.oid, 'SELECT')
      then 'ATENCAO: authenticated sem SELECT'
    else 'OK'
  end as situacao
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and c.relname in (
    'erp_documentos_qualidade_revisoes','erp_documentos_qualidade_solicitacoes','erp_documentos_qualidade_ciencia',
    'erp_documentos_qualidade_aprovacoes','erp_permissoes_modulos','erp_tabelas_preco','erp_tabelas_preco_itens',
    'erp_manutencao_ordens','erp_regras_fiscais','erp_estoque_separacoes','erp_financeiro_apuracao_custos',
    'erp_pedidos_compra','erp_pedidos_compra_itens','erp_rfq','erp_rfq_fornecedores','erp_rfq_itens',
    'erp_documentos_qualidade_distribuicoes','erp_documentos_qualidade_leituras','erp_qualidade_liberacao_lotes',
    'erp_qualidade_genealogia_lotes','erp_expedicao_nfe','erp_engenharia_bom','erp_engenharia_bom_itens',
    'erp_qualidade_defeitos_motivos','erp_qualidade_refugos','erp_qualidade_auditorias_planta',
    'erp_qualidade_rpnc_evidencias','erp_clientes_dn_config','erp_notas_debito_clientes','erp_sgq_auditorias',
    'erp_qualidade_certificado_cotas','erp_fiscal_liberacoes_pedido_item','erp_bom_revisoes',
    'erp_fmea_cabecalho','erp_plano_controle','erp_plano_controle_linha','erp_central_evolucao_item',
    'erp_central_evolucao_evento','erp_centros_custos','erp_custos_fixos','erp_sgq_capa_acoes','erp_sgq_auditoria'
  )
order by situacao desc, tabela;

-- ----------------------------------------------------------------------------
-- 4. POLICIES: prova de isolamento por empresa_id
--    Toda policy das tabelas acima deve citar empresa_id (ou erp_current_empresa_id)
-- ----------------------------------------------------------------------------
select
  p.tablename,
  p.policyname,
  p.cmd,
  case
    when coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') ilike '%empresa_id%' then 'OK'
    else 'ATENCAO: policy sem empresa_id'
  end as situacao
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in (
    'erp_documentos_qualidade_aprovacoes','erp_regras_fiscais','erp_estoque_separacoes',
    'erp_financeiro_apuracao_custos','erp_qualidade_liberacao_lotes','erp_qualidade_genealogia_lotes',
    'erp_expedicao_nfe','erp_engenharia_bom','erp_engenharia_bom_itens','erp_qualidade_defeitos_motivos',
    'erp_qualidade_refugos','erp_qualidade_auditorias_planta','erp_qualidade_rpnc_evidencias',
    'erp_clientes_dn_config','erp_sgq_auditorias','erp_qualidade_certificado_cotas',
    'erp_fiscal_liberacoes_pedido_item','erp_bom_revisoes','erp_fmea_cabecalho','erp_plano_controle',
    'erp_plano_controle_linha','erp_central_evolucao_item','erp_central_evolucao_evento',
    'erp_documentos_qualidade_distribuicoes','erp_documentos_qualidade_leituras'
  )
order by p.tablename, p.policyname;

-- ----------------------------------------------------------------------------
-- 5. FUNÇÕES: as 47 funções criadas/substituídas pelo pacote
-- ----------------------------------------------------------------------------
with esperado(funcao) as (values
  ('erp_atualizar_total_pedido_compra'),('erp_central_evolucao_mudar_situacao'),
  ('erp_central_evolucao_registra_alta'),('erp_central_evolucao_resumo'),
  ('erp_central_evolucao_ultima_quem'),('erp_fmea_matriz'),('erp_fmea_resumo'),
  ('erp_homologar_bom_mestre'),('erp_liberar_item_fiscal'),('erp_numero_pedido_compra_formatado'),
  ('erp_plano_controle_matriz'),('erp_portal_cliente_pedidos'),('erp_preco_cliente_produto'),
  ('erp_qms_can'),('erp_qms_confirmar_leitura'),('erp_qms_criar_documento'),('erp_qms_criar_revisao'),
  ('erp_qms_current_user'),('erp_qms_distribuir_revisao'),('erp_qms_protect_document'),
  ('erp_qms_protect_revision'),('erp_qms_salvar_revisao'),('erp_qms_transicionar_revisao'),
  ('erp_qualidade_auditoria_planta_defaults'),('erp_qualidade_certificado_criar'),
  ('erp_qualidade_liberacao_lotes_touch_updated_at'),('erp_quality_quarantine_lot'),
  ('erp_registrar_custo_medio_nfe'),('erp_registrar_refugo'),('erp_salvar_bom_mestre'),
  ('erp_sgq_abrir_rpnc'),('erp_sgq_abrir_rpnc_formulario'),('erp_sgq_auditar_mutacao'),
  ('erp_sgq_auditoria_normalizar'),('erp_sgq_buscar_recorrencia_rpnc'),('erp_sgq_capa_decidir'),
  ('erp_sgq_proteger_auditoria'),('erp_sgq_proteger_rpnc'),('erp_sgq_salvar_acoes_rpnc'),
  ('erp_sgq_salvar_formulario_rpnc'),('erp_sgq_transicionar_rpnc'),('erp_sgq_validar_capa_tenant'),
  ('erp_sgq_validar_transicao_capa'),('erp_sgq_validar_transicao_rpnc'),
  ('erp_sgq_vincular_rpnc_auditoria'),('erp_stdq_touch_updated_at'),('erp_tpm_sync_machine_status')
)
select
  e.funcao,
  case when count(p.oid) = 0 then 'FALTA' else 'OK' end as situacao,
  count(p.oid) as assinaturas
from esperado e
left join pg_proc p
  on p.proname = e.funcao
 and p.pronamespace = 'public'::regnamespace
group by e.funcao
order by (count(p.oid) = 0) desc, e.funcao;

-- ----------------------------------------------------------------------------
-- 6. RPCs chamadas pelas telas e ainda não resolvidas
--    (medido em 2026-11-08: 102 chamadas, 98 sem função no banco)
--    Rode depois da aplicação: a lista deve encolher para o que depende do Anexo A
-- ----------------------------------------------------------------------------
select
  p.proname  as funcao_presente,
  p.prosecdef as security_definer,
  pg_get_function_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('erp_mrp_explodir','erp_current_empresa_id','erp_data_servidor')
order by p.proname;

-- ----------------------------------------------------------------------------
-- 7. VÍNCULO OPERACIONAL DO LOTE (SGQ-REL-001)
--    A tabela de parecer só passa a ser liberação real quando existir FK para o lote
-- ----------------------------------------------------------------------------
select
  c.conname as constraint_nome,
  pg_get_constraintdef(c.oid) as definicao
from pg_constraint c
where c.conrelid = 'public.erp_qualidade_liberacao_lotes'::regclass
  and c.contype in ('f', 'u', 'c')
order by c.contype, c.conname;

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS de updated_at criadas pelo pacote
-- ----------------------------------------------------------------------------
select
  t.tgname as trigger,
  c.relname as tabela,
  p.proname as funcao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and p.proname in ('erp_stdq_touch_updated_at','erp_qualidade_liberacao_lotes_touch_updated_at','erp_tpm_sync_machine_status')
order by c.relname, t.tgname;

-- ----------------------------------------------------------------------------
-- 9. TABELAS SEM RLS EM TODO O SCHEMA PUBLIC (varredura ampla, não só o pacote)
--    Serve para achar regressão fora do escopo das 28 migrations.
-- ----------------------------------------------------------------------------
select
  c.relname as tabela_sem_rls
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and not c.relrowsecurity
  and c.relname like 'erp\_%'
order by c.relname;
