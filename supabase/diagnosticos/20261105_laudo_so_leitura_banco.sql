-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — LAUDO SOMENTE LEITURA DO BANCO
-- Gerado em 2026-11-05T14:46:44 por scripts/gerar-laudo-so-leitura.mjs
-- Lista de conferencia: as 174 tabelas e as 100 funcoes que o codigo do sistema usa,
-- medidas no repo prod-telas-novas contra o banco zsklkydlawgvwgnvxwwx.supabase.co.
--
-- Cole no SQL Editor (New query > Run). NAO altera nada: nao tem create, alter, insert,
-- update ou delete. Devolve UMA grade de 4 colunas. Copie as linhas para mim — elas
-- substituem qualquer chute meu sobre o que falta.
--
-- A linha 0 diz em qual banco a consulta rodou. Se o numero de tabelas dela for muito
-- menor que 174, o pacote de migrations ainda nao foi aplicado a este banco.
-- ============================================================================

with app_tabelas(nome, telas) as (
  values
  ('erp_anos_fiscais', 'features/fiscal/AnoFiscal.tsx'),
  ('engenharia_produtos', 'pages/qualidade/CEP.tsx, pages/QualidadeEspecificacoesTecnicas.tsx, pages/QualidadeInspecoesIndustrial.tsx'),
  ('erp_almoxarifados', 'features/inventario/BalancoEstoque.tsx, pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_ajuda_documentos', 'GlobalHelp.tsx'),
  ('erp_alertas_sistema', 'hooks/useRealtimeAlerts.ts'),
  ('erp_areas', 'pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx'),
  ('erp_apontamentos_processo', 'components/IndustrialCommandDashboard.tsx, pages/ChaoDeFabricaApontamento.tsx, pages/DiretoriaDashboard.tsx'),
  ('erp_acabamentos', 'pages/EstoqueRastreabilidadeLotes.tsx'),
  ('erp_audit_logs', 'pages/AdministracaoConfiguracoesGlobais.tsx, pages/AdminLogs.tsx, pages/configuracoes/ConfiguracaoLogs.tsx'),
  ('erp_classificacao_fiscal', 'features/fiscal/ClassificacaoFiscal.tsx'),
  ('erp_bom_revisoes', 'pages/EngenhariaRevisoesBOM.tsx'),
  ('erp_clientes_dn_config', 'pages/CustomerDnSettings.tsx'),
  ('erp_centros_custos', 'pages/CentralCustosIndustrial.tsx'),
  ('erp_clientes', 'features/comissoes/CalculoComissao.tsx, features/controladoria/AuditoriaComissoes.tsx, features/controladoria/PainelLucratividade.tsx'),
  ('erp_caixas', 'pages/VendasPDV.tsx'),
  ('erp_cliente_transportadoras', 'pages/VendasClientes.tsx'),
  ('erp_codigos', 'pages/cadastro-produtos/FormFichaTecnica.tsx, pages/cadastro-produtos/ParametrosCodigo.tsx, pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx'),
  ('erp_comissao_vinculos', 'features/comissoes/PerfilVendedor.tsx'),
  ('erp_comissao_regras', 'features/comissoes/CadastroRegras.tsx'),
  ('erp_config_fiscal', 'pages/FiscalImpostos.tsx, pages/NFeEmissao.tsx'),
  ('erp_comissao_perfis', 'features/comissoes/CadastroRegras.tsx, features/comissoes/PerfilVendedor.tsx'),
  ('erp_configuracoes_lote', 'pages/ConfiguracaoLote.tsx, pages/ConfiguracaoLotePCP.tsx'),
  ('erp_contas_bancarias', 'features/banking/BankReconciliation.tsx, features/banking/BankStatementImporter.tsx, features/controladoria/PainelRazaoGeral.tsx'),
  ('erp_contas_pagar', 'pages/CentraisIndustriais.tsx, pages/Fiscal.tsx'),
  ('erp_comissao_linhas', 'features/comissoes/CalculoComissao.tsx, features/controladoria/AuditoriaComissoes.tsx'),
  ('erp_contas_receber', 'pages/Fiscal.tsx'),
  ('erp_depreciacao_regras', 'features/inventario/RegrasDepreciacao.tsx'),
  ('erp_custos_produtos', 'pages/CentralCustosIndustrial.tsx, pages/EstoqueCurvaABC.tsx'),
  ('erp_documentos_anexos', 'components/DocumentoAnexoUpload.tsx, components/PCPMachinePhotoPanel.tsx, components/PCPMoldPhotoPanel.tsx'),
  ('erp_documentos_fiscais', 'pages/DashboardComercial.tsx, pages/DiretoriaDashboard.tsx, pages/ExpedicaoRoteirizacao.tsx'),
  ('erp_documentos_fiscais_itens', 'pages/NFeEmissao.tsx'),
  ('erp_documentos_qualidade', 'pages/DocumentosQualidadeControle.tsx, pages/QualidadeDashboardRNC.tsx, pages/QualidadeDashboardSGQ.tsx'),
  ('erp_documentos_qualidade_anexos', 'pages/DocumentosQualidadeControle.tsx, pages/QualidadeRNC.tsx'),
  ('erp_custos_fixos', 'pages/CentralCustosIndustrial.tsx'),
  ('erp_documentos_qualidade_aprovacoes', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_documentos_qualidade_revisoes', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_documentos_qualidade_leituras', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_documentos_qualidade_solicitacoes', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_documentos_qualidade_distribuicoes', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_equipamentos_medicao', 'components/CalibracaoPanel.tsx, components/IndustrialCommandDashboard.tsx, pages/CalibracaoIndustrial.tsx'),
  ('erp_estoque_inventario_itens', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_estoque_lotes', 'pages/EstoqueRastreabilidadeLotes.tsx, pages/EstoqueSeparacao.tsx, pages/pcp/ControleProcessoInjetora.tsx'),
  ('erp_estoque_localizacoes', 'pages/AlmoxarifadoSaidaMaterial.tsx, pages/EstoqueAlmoxarifadoCompact.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_empresas', 'AppBootstrap.tsx, components/CompanySettings.tsx, components/layout/ERPHeader.tsx'),
  ('erp_estoque_inventarios', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_engenharia_bom', 'pages/EngenhariaBOM.tsx'),
  ('erp_estoque_lotes_rastreabilidade', 'pages/AlmoxarifadoInventario.tsx, pages/estoque/InventarioValidade.tsx, pages/EstoqueRastreabilidadeLotes.tsx'),
  ('erp_estoque_reservas', 'pages/DiretoriaDashboard.tsx, pages/PCPPedidosPendentes.tsx'),
  ('erp_estoque_movimentos', 'pages/AlmoxarifadoSaidaMaterial.tsx, pages/EstoqueAlmoxarifadoCompact.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_expedicoes', 'pages/CentraisIndustriais.tsx, pages/ExpedicaoPortaria.tsx, pages/ExpedicaoRoteirizacao.tsx'),
  ('erp_ficha_itens', 'pages/FichaEngenharia.tsx, pages/PCPIndustrial.tsx'),
  ('erp_ferramentas_industriais', 'pages/EngenhariaBOM.tsx, pages/FichasProcesso.tsx, pages/PCPFichasProcesso.tsx'),
  ('erp_fichas_tecnicas', 'pages/FichaEngenharia.tsx, pages/PCPIndustrial.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_ficha_operacoes', 'pages/FichaEngenharia.tsx, pages/PCPIndustrial.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_fichas_processo', 'pages/ChaoDeFabricaApontamento.tsx, pages/FichasProcesso.tsx, pages/PCPAgendaMaquinas.tsx'),
  ('erp_estoque_separacoes', 'pages/EstoqueRastreabilidadeLotes.tsx, pages/EstoqueSeparacao.tsx'),
  ('erp_expedicao_nfe', 'pages/logistica/ExpedicaoNFe.tsx'),
  ('erp_financeiro_baixas', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinancasContasPagar.tsx, pages/FinanceiroDashboardCaixa.tsx'),
  ('erp_financeiro_apuracao_custos', 'pages/FinanceiroGraficoDesvios.tsx'),
  ('erp_ficha_processo_operacoes', 'pages/ChaoDeFabricaApontamento.tsx'),
  ('erp_fiscal_documentos', 'features/fiscal/AuditoriaDocumental.tsx'),
  ('erp_financeiro_lancamentos', 'pages/FiscalPrevisaoCaixa.tsx'),
  ('erp_financeiro_parcelas', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinancasContasPagar.tsx, pages/FinanceiroDashboardCaixa.tsx'),
  ('erp_financeiro_titulos', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinanceiroTitulos.tsx'),
  ('erp_fiscal_liberacoes_pedido_item', 'pages/Fiscal.tsx'),
  ('erp_fiscal_razao_lancamentos', 'features/banking/BankReconciliation.tsx, features/controladoria/PainelRazaoGeral.tsx, features/fiscal/PainelRazaoGeral.tsx'),
  ('erp_fluxo_caixa', 'pages/FinanceiroFluxoCaixa.tsx'),
  ('erp_fornecedores', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/ComprasAnalisePrecos.tsx, pages/ComprasIndustrial.tsx'),
  ('erp_genealogia_lote_componentes', 'pages/EstoqueRastreabilidadeLotes.tsx, pages/QualidadeIndustrial.tsx'),
  ('erp_grupos', 'pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_historico_codigos', 'pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx'),
  ('erp_funcionarios', 'pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx, pages/PCPIndustrial.tsx'),
  ('erp_historico_ajustes_maquina', 'pages/qualidade/FichasProcesso.tsx'),
  ('erp_importacoes_log', 'features/banking/BankStatementImporter.tsx'),
  ('erp_fiscal_estornos', 'features/fiscal/EstornoLancamentos.tsx'),
  ('erp_injecao_historico', 'pages/InjecaoIndustrial.tsx'),
  ('erp_inspecoes', 'components/DigitalCaliper.tsx, pages/QualidadeDashboardSGQ.tsx, pages/QualidadeInspecaoProcesso.tsx'),
  ('erp_inventario_auditoria_saldos', 'features/inventario/AuditoriaSaldos.tsx'),
  ('erp_logs_sistema', 'pages/CatalogoDigital.tsx, pages/ConfiguracaoLote.tsx'),
  ('erp_liberacoes_fiscais', 'pages/VendasCentral.tsx, pages/VendasPedidoStatus.tsx'),
  ('erp_log_etiquetas', 'pages/logistica/ImpressaoEtiquetas.tsx'),
  ('erp_maquinas', 'components/IndustrialCommandDashboard.tsx, components/IndustrialModuleWorkspace.tsx, components/MachineAgenda.tsx'),
  ('erp_manutencao_ordens', 'components/IndustrialModuleWorkspace.tsx, pages/ManutencaoCentral.tsx, pages/ManutencaoCronograma.tsx'),
  ('erp_moldes', 'components/ModalDetalhesMolde.tsx, components/PCPMoldPhotoPanel.tsx, pages/FichaEngenharia.tsx'),
  ('erp_moldes_manutencao_historico', 'pages/MoldesFerramentaria.tsx'),
  ('erp_motoristas', 'pages/ExpedicaoRoteirizacao.tsx, pages/logistica/RomaneioCarga.tsx'),
  ('erp_mrp_necessidades', 'pages/FinanceiroCustoPadrao.tsx, pages/MRPIndustrial.tsx, pages/PCPOrdens.tsx'),
  ('erp_notas_debito_clientes', 'pages/CustomerDnList.tsx, pages/CustomerDnPod.tsx'),
  ('erp_mrp_runs', 'pages/MRPIndustrial.tsx'),
  ('erp_notas_fiscais', 'pages/FiscalCarteiraNFe.tsx, pages/NFeEmissao.tsx'),
  ('erp_ordens_producao', 'components/IndustrialCommandDashboard.tsx, features/pcp/PainelOrdensProducao.tsx, pages/AlmoxarifadoSaidaMaterial.tsx'),
  ('erp_pcp_alertas', 'pages/PCPPlanejamentoIndustrial.tsx'),
  ('erp_pcp_bom_itens', 'features/pcp/EngenhariaBOM.tsx, pages/PCPAreaFuncionario.tsx, pages/VendasCatalogoDigital.tsx'),
  ('erp_pcp_apontamentos_turno', 'features/pcp/ApuracaoTurno.tsx'),
  ('erp_pcp_calendario_trabalho', 'pages/PCPAgendaMaquinas.tsx'),
  ('erp_pcp_ordens_planejadas', 'pages/PCPPlanejamentoIndustrial.tsx'),
  ('erp_pcp_planos_mestres', 'pages/PCPPlanejamentoIndustrial.tsx'),
  ('erp_pcp_programacoes', 'components/IndustrialCommandDashboard.tsx, pages/ChaoDeFabricaApontamento.tsx, pages/ConfiguracaoLotePCP.tsx'),
  ('erp_pcp_roteiro_operacoes', 'features/pcp/FichaProcesso.tsx, features/pcp/RoteiroOperacoes.tsx'),
  ('erp_pedidos_anexos', 'pages/NovoPedido.tsx'),
  ('erp_pedidos_compra', 'pages/ComprasIndustrial.tsx, pages/ComprasRelatorios.tsx, pages/ComprasWorkspace.tsx'),
  ('erp_pedidos_compra_itens', 'pages/ComprasIndustrial.tsx, pages/PedidoCompra.tsx'),
  ('erp_pedidos_venda', 'features/controladoria/AuditoriaComissoes.tsx, features/controladoria/PainelLucratividade.tsx, features/controladoria/RetificacaoPedido.tsx'),
  ('erp_permissions', 'pages/AdministracaoConfiguracoesGlobais.tsx, pages/configuracoes/ConfiguracaoPermissoes.tsx, pages/TabletDashboard.tsx'),
  ('erp_permissoes_modulos', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_pedidos_venda_itens', 'features/controladoria/PainelLucratividade.tsx, features/controladoria/RetificacaoPedido.tsx, pages/ComercialSuprimentos.tsx'),
  ('erp_plano_modulos', 'pages/Master.tsx, pages/PlanosIndustrial.tsx'),
  ('erp_planos_catalogo', 'pages/Master.tsx, pages/PlanosIndustrial.tsx'),
  ('erp_planos_inspecao', 'pages/FichaEngenharia.tsx, pages/QualidadeInspecaoProcesso.tsx'),
  ('erp_processos_historico', 'pages/ProcessoIndustrialPage.tsx'),
  ('erp_postos_trabalho', 'features/pcp/FichaProcesso.tsx, features/pcp/PostosTrabalho.tsx, features/pcp/RoteiroOperacoes.tsx'),
  ('erp_producao_defeitos', 'pages/OperacaoIndustrial.tsx, pages/PCPIndustrial.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_processos_industriais', 'pages/PCPExecucaoIndustrial.tsx, pages/ProcessoIndustrialPage.tsx'),
  ('erp_producao_paradas', 'components/IndustrialCommandDashboard.tsx, pages/ChaoDeFabricaApontamento.tsx, pages/DiretoriaDashboard.tsx'),
  ('erp_produto_estoque', 'pages/EstoqueCurvaABC.tsx, services/leitorXmlService.ts'),
  ('erp_produtos', 'components/IndustrialCommandDashboard.tsx, features/comissoes/CadastroRegras.tsx, features/controladoria/AuditoriaComissoes.tsx'),
  ('erp_qualidade_5s_auditorias', 'pages/QualidadeAuditoria5S.tsx'),
  ('erp_qualidade_acoes', 'pages/AcompanhamentoNaoConformidade.tsx'),
  ('erp_qualidade_8d', 'pages/qualidade/sala-rnc.tsx, pages/QualidadeMetodologia8D.tsx, tests/qualidade_fluxo.test.ts'),
  ('erp_qualidade_auditorias_planta', 'pages/QualidadeAuditoriasPlanta.tsx'),
  ('erp_qualidade_certificado_cotas', 'pages/CertificadoQualidade.tsx'),
  ('erp_qualidade_calibracoes_historico', 'components/CalibracaoPanel.tsx, pages/CalibracaoIndustrial.tsx'),
  ('erp_qualidade_certificados', 'pages/CertificadoQualidade.tsx'),
  ('erp_qualidade_controles_injetora', 'pages/pcp/ControleProcessoInjetora.tsx'),
  ('erp_qualidade_defeitos_motivos', 'pages/QualidadeGraficosRefugo.tsx, pages/QualidadeRefugos.tsx'),
  ('erp_qualidade_documentos_editor', 'pages/qualidade/QualidadeEditorIT.tsx'),
  ('erp_qualidade_documentos_revisoes', 'pages/qualidade/GEDDocumentos.tsx, pages/qualidade/QualidadeAssinaturaIT.tsx, pages/qualidade/QualidadeProcedimentos.tsx'),
  ('erp_qualidade_genealogia_lotes', 'pages/EstoqueRastreabilidadeLotes.tsx, pages/qualidade/QualidadeGenealogiaLote.tsx'),
  ('erp_qualidade_injetora_amostras', 'pages/pcp/ControleProcessoInjetora.tsx'),
  ('erp_qualidade_injetora_paradas', 'pages/pcp/ControleProcessoInjetora.tsx'),
  ('erp_qualidade_ishikawa', 'pages/AcompanhamentoNaoConformidade.tsx, pages/QualidadeRNC.tsx'),
  ('erp_qualidade_liberacao_lotes', 'pages/qualidade/QualidadeLiberacaoLotes.tsx'),
  ('erp_qualidade_rpnc_evidencias', 'pages/FileTreeGED.tsx, pages/QualidadeRPNC.tsx, pages/QualityRpncForm.tsx'),
  ('erp_qualidade_refugos', 'pages/QualidadeGraficosRefugo.tsx, pages/QualidadeRefugos.tsx'),
  ('erp_quarentenas_lotes', 'pages/EstoqueRastreabilidadeLotes.tsx, pages/qualidade/QualidadeQuarentena.tsx'),
  ('erp_regras_decimais', 'features/controladoria/CadastroDecimais.tsx'),
  ('erp_receitas_processos', 'pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx, pages/PCPTabletOperador.tsx'),
  ('erp_regras_fiscais', 'pages/FiscalImpostos.tsx'),
  ('erp_requisicoes_compra', 'pages/ComprasPedidoForm.tsx, pages/ComprasRequisicoes.tsx'),
  ('erp_requisicoes_compra_itens', 'pages/ComprasRequisicoes.tsx'),
  ('erp_rfq_fornecedores', 'pages/ComprasAnalisePrecos.tsx, pages/ComprasRFQ.tsx'),
  ('erp_rfq', 'pages/ComprasAnalisePrecos.tsx, pages/ComprasRelatorios.tsx, pages/ComprasRFQ.tsx'),
  ('erp_rfq_itens', 'pages/ComprasAnalisePrecos.tsx, pages/ComprasRFQ.tsx'),
  ('erp_rh_acidentes', 'pages/RHIndustrial.tsx'),
  ('erp_rh_avaliacoes', 'pages/RHIndustrial.tsx'),
  ('erp_rh_documentos', 'pages/RHIndustrial.tsx'),
  ('erp_roles', 'pages/AdministracaoConfiguracoesGlobais.tsx, pages/configuracoes/ConfiguracaoPerfis.tsx, pages/configuracoes/ConfiguracaoPermissoes.tsx'),
  ('erp_rh_faltas', 'pages/RHIndustrial.tsx'),
  ('erp_role_permissions', 'pages/configuracoes/ConfiguracaoPermissoes.tsx, pages/TabletDashboard.tsx'),
  ('erp_rpnc', 'components/IndustrialCommandDashboard.tsx, pages/AcompanhamentoNaoConformidade.tsx, pages/DiretoriaDashboard.tsx'),
  ('erp_rh_treinamentos_registros', 'pages/RHIndustrial.tsx'),
  ('erp_rh_ponto_eventos', 'pages/RHIndustrial.tsx'),
  ('erp_setores', 'pages/AlmoxarifadoSaidaMaterial.tsx, pages/DocumentosQualidadeControle.tsx, pages/qualidade/sala-rnc.tsx'),
  ('erp_sgq_capa_acoes', 'pages/QualityRpncForm.tsx'),
  ('erp_sgq_auditorias', 'pages/QualityAuditsList.tsx, pages/QualityRpncForm.tsx'),
  ('erp_transacoes_bancarias', 'features/banking/BankReconciliation.tsx'),
  ('erp_tabelas_preco', 'pages/ClientesIndustrial.tsx, pages/VendasClientes.tsx'),
  ('erp_tabela_precos_cliente', 'features/banking/ListaPrecosCliente.tsx'),
  ('erp_solicitacoes_compra', 'pages/ComprasIndustrial.tsx, pages/ComprasRelatorios.tsx, pages/SolicitacaoCompra.tsx'),
  ('erp_transportadoras', 'pages/NFeEmissao.tsx, pages/NovoPedido.tsx, pages/VendasClientes.tsx'),
  ('erp_usuarios', 'AppBootstrap.tsx, components/IndustrialCommandDashboard.tsx, components/layout/ERPHeader.tsx'),
  ('erp_vendas_metas', 'pages/DashboardComercial.tsx, pages/VendasMetas.tsx'),
  ('erp_veiculos', 'pages/ExpedicaoRoteirizacao.tsx, pages/logistica/RomaneioCarga.tsx'),
  ('outlook_integracoes', 'pages/configuracoes/ConfiguracaoIntegracoes.tsx, pages/OutlookConfiguracao.tsx'),
  ('erp_vendas_depara_produtos', 'pages/VendasClientes.tsx, services/leitorXmlService.ts'),
  ('outlook_regras_pedidos', 'pages/OutlookConfiguracao.tsx'),
  ('estoque_lotes', 'pages/QualidadeInspecoesIndustrial.tsx'),
  ('pcp_agenda_maquinas', 'components/MachineAgenda.tsx, pages/PCPAgendaMaquinas.tsx, pages/PCPSequenciamento.tsx'),
  ('qualidade_cep_medicoes', 'pages/qualidade/CEP.tsx'),
  ('qualidade_inspecoes', 'pages/QualidadeCentralTablet.tsx, pages/QualidadeDashboardRNC.tsx, pages/QualidadeIndustrial.tsx'),
  ('qualidade_especificacoes', 'pages/QualidadeEspecificacoesTecnicas.tsx, pages/QualidadeInspecoesIndustrial.tsx'),
  ('qualidade_rnc_capa', 'pages/QualidadeDashboardRNC.tsx, pages/QualidadeRNC.tsx'),
  ('usuarios', 'AppBootstrap.tsx'),
  ('qualidade_fmea', 'pages/qualidade/FMEA.tsx, pages/QualidadeCentralTablet.tsx, pages/QualidadePFMEA.tsx')
), app_funcoes(nome, telas) as (
  values
  ('erp_adicionar_operacao_orcamento', 'pages/VendasAnaliseCustos.tsx'),
  ('erp_access_control_save_setor', 'pages/AccessControlSettings.tsx'),
  ('erp_ativar_revisao_documento', 'pages/qualidade/GEDDocumentos.tsx'),
  ('erp_access_control_save_setor_matrix', 'pages/AccessControlSettings.tsx'),
  ('erp_access_control_overview', 'pages/AccessControlSettings.tsx'),
  ('erp_apontamento_iniciar', 'pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx'),
  ('erp_admin_save_role', 'pages/configuracoes/ConfiguracaoPermissoes.tsx'),
  ('erp_calcular_custo_produto', 'lib/secureDataPipeline.ts'),
  ('erp_calcular_custo_tecnico', 'pages/VendasAnaliseCustos.tsx'),
  ('erp_apontamento_finalizar', 'pages/ChaoDeFabricaApontamento.tsx, pages/PCPAreaFuncionario.tsx'),
  ('erp_calcular_preco_sugerido_venda', 'pages/NovoPedido.tsx'),
  ('erp_comissao_calcular', 'features/comissoes/CalculoComissao.tsx, features/controladoria/AuditoriaComissoes.tsx'),
  ('erp_compras_encaminhar_requisicoes', 'pages/ComprasRequisicoes.tsx'),
  ('erp_comissao_salvar_regra', 'features/comissoes/CadastroRegras.tsx'),
  ('erp_comissao_vincular', 'features/comissoes/PerfilVendedor.tsx'),
  ('erp_compras_aprovar_pedido', 'pages/PedidoCompra.tsx'),
  ('erp_compras_salvar_pedido', 'pages/ComprasIndustrial.tsx, pages/PedidoCompra.tsx'),
  ('erp_compras_criar_solicitacao', 'pages/SolicitacaoCompra.tsx'),
  ('erp_compras_salvar_pedido_completo', 'pages/ComprasPedidoForm.tsx'),
  ('erp_compras_validar_fiscal', 'pages/FiscalCompras.tsx'),
  ('erp_concluir_manutencao', 'pages/ManutencaoOrdens.tsx'),
  ('erp_conciliar_transacao_bancaria', 'features/banking/BankReconciliation.tsx'),
  ('erp_confirmar_recebimento_nfe', 'pages/RecebimentoMateriais.tsx'),
  ('erp_criar_ordem_producao_v2', 'pages/PCPIndustrial.tsx, pages/PCPOrdens.tsx, pages/PCPPedidosPendentes.tsx'),
  ('erp_criar_rpnc_com_quarentena', 'pages/qualidade/sala-rnc.tsx, pages/QualidadeRNC.tsx'),
  ('erp_current_empresa_id', 'components/DigitalCaliper.tsx, components/DocumentoAnexoUpload.tsx, components/layout/ERPHorizontalShell.tsx'),
  ('erp_data_servidor', 'lib/serverClock.ts'),
  ('erp_decimal_salvar_regra', 'features/controladoria/CadastroDecimais.tsx'),
  ('erp_depreciacao_salvar_regra', 'features/inventario/RegrasDepreciacao.tsx'),
  ('erp_depreciacao_desativar_regra', 'features/inventario/RegrasDepreciacao.tsx'),
  ('erp_escriturar_nfe_entrada', 'pages/IndustrialDataWorkspace.tsx'),
  ('erp_documento_qualidade_anexo_substituir', 'pages/DocumentosQualidadeControle.tsx, pages/QualidadeRNC.tsx'),
  ('erp_estoque_inventario_ajustar', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_estoque_inventario_contar', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_estoque_inventario_encerrar', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_estoque_registrar_movimento', 'pages/AlmoxarifadoSaidaMaterial.tsx, pages/EstoqueAjustes.tsx, pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_estoque_inventario_iniciar', 'pages/EstoqueAlmoxarifadoCompact.tsx'),
  ('erp_financeiro_registrar_baixa', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinanceiroTitulos.tsx'),
  ('erp_finalizar_pedido_venda', 'pages/NovoPedido.tsx'),
  ('erp_expedicao_criar_romaneio', 'pages/ExpedicaoRoteirizacao.tsx, pages/logistica/RomaneioCarga.tsx'),
  ('erp_estoque_separar_material', 'pages/EstoqueSeparacao.tsx'),
  ('erp_financeiro_salvar_titulo', 'modules/financeiro/pages/FinanceiroWorkspace.tsx, pages/FinanceiroTitulos.tsx'),
  ('erp_fiscal_estornar_documento', 'features/controladoria/AssistenteRetificacao.tsx, features/fiscal/EstornoLancamentos.tsx'),
  ('erp_gerar_codigo', 'pages/cadastro-produtos/FormFichaTecnica.tsx, pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx, pages/ProdutosVendasIndustrial.tsx'),
  ('erp_gravar_rascunho_pedido_venda', 'pages/NovoPedido.tsx'),
  ('erp_has_permission', 'pages/configuracoes/ConfiguracaoPerfis.tsx, pages/configuracoes/ConfiguracaoPermissoes.tsx, pages/configuracoes/ConfiguracoesADM.tsx'),
  ('erp_fiscal_saldo_razao', 'features/controladoria/PainelRazaoGeral.tsx'),
  ('erp_homologar_bom_mestre', 'pages/EngenhariaBOM.tsx'),
  ('erp_liberar_item_fiscal', 'pages/Fiscal.tsx'),
  ('erp_listar_operacoes_orcamento', 'pages/VendasAnaliseCustos.tsx'),
  ('erp_master_save_plan', 'pages/Master.tsx'),
  ('erp_nfe_pagamento_consultar', 'pages/NFeEmissao.tsx'),
  ('erp_master_set_empresa_status', 'pages/Master.tsx'),
  ('erp_mrp_explodir', 'pages/FinanceiroCustoPadrao.tsx, pages/MRPIndustrial.tsx, pages/PCPOrdens.tsx'),
  ('erp_nfe_pagamento_salvar', 'pages/NFeEmissao.tsx'),
  ('erp_obter_custo_industrial_produto', 'pages/NovoPedido.tsx'),
  ('erp_pcp_bom_adicionar', 'features/pcp/EngenhariaBOM.tsx'),
  ('erp_pcp_gerar_ordens_planejadas_do_mrp', 'pages/PCPPlanejamentoIndustrial.tsx'),
  ('erp_pcp_mrp_explodir', 'pages/PCPExecucaoIndustrial.tsx'),
  ('erp_pcp_salvar_posto', 'features/pcp/PostosTrabalho.tsx'),
  ('erp_pcp_reordenar_agenda_maquinas', 'pages/PCPAgendaMaquinas.tsx, pages/PCPSequenciamento.tsx'),
  ('erp_qms_confirmar_leitura', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_pdv_finalizar_venda', 'pages/VendasPDV.tsx'),
  ('erp_qms_criar_documento', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qms_criar_revisao', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qms_current_user', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qms_decidir_inspecao_recebimento', 'pages/QualidadeIndustrial.tsx'),
  ('erp_qms_distribuir_revisao', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qms_salvar_revisao', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qualidade_certificado_criar', 'pages/CertificadoQualidade.tsx'),
  ('erp_qms_transicionar_revisao', 'pages/DocumentosQualidadeControle.tsx'),
  ('erp_qualidade_revisao_anexo_vincular', 'pages/qualidade/GEDDocumentos.tsx'),
  ('erp_reajuste_global_postos_trabalho', 'pages/TabelaPrecos.tsx'),
  ('erp_reajuste_global_vendas', 'pages/TabelaPrecos.tsx'),
  ('erp_registrar_calibracao', 'components/CalibracaoPanel.tsx, pages/CalibracaoIndustrial.tsx'),
  ('erp_registrar_conferencia_producao', 'pages/EstoqueAlmoxarifadoCompact.tsx, pages/OperacaoIndustrial.tsx, pages/PCPIndustrial.tsx'),
  ('erp_registrar_manutencao_molde', 'pages/MoldesFerramentaria.tsx'),
  ('erp_remover_operacao_orcamento', 'pages/VendasAnaliseCustos.tsx'),
  ('erp_registrar_refugo', 'pages/QualidadeRefugos.tsx'),
  ('erp_registrar_parada_manutencao', 'pages/ManutencaoOrdens.tsx'),
  ('erp_reservar_numero_nfe', 'pages/NFeEmissao.tsx'),
  ('erp_reservar_saldo_pedido_item', 'pages/PCPPedidosPendentes.tsx'),
  ('erp_reter_lote', 'pages/qualidade/QualidadeQuarentena.tsx'),
  ('erp_retificar_pedido_faturado', 'features/controladoria/RetificacaoPedido.tsx'),
  ('erp_salvar_acoes_rnc', 'pages/qualidade/sala-rnc.tsx'),
  ('erp_salvar_rascunho_nfe', 'pages/NFeEmissao.tsx'),
  ('erp_salvar_bom_mestre', 'pages/EngenhariaBOM.tsx'),
  ('erp_salvar_inspecao_lote', 'pages/QualidadeInspecoesIndustrial.tsx'),
  ('erp_salvar_revisao_documento', 'pages/qualidade/GEDDocumentos.tsx, pages/qualidade/QualidadeEditorIT.tsx, pages/qualidade/QualidadeProcedimentos.tsx'),
  ('erp_scan_barcode_metadata', 'components/KioskConsultaRapida.tsx'),
  ('erp_sgq_abrir_rpnc', 'pages/QualidadeRPNC.tsx'),
  ('erp_sgq_buscar_recorrencia_rpnc', 'pages/QualityRpncForm.tsx'),
  ('erp_sgq_abrir_rpnc_formulario', 'pages/QualityRpncForm.tsx'),
  ('erp_sgq_registrar_eficacia_rpnc', 'pages/QualidadeRPNCTratamento.tsx'),
  ('erp_sgq_salvar_acoes_rpnc', 'pages/QualityRpncForm.tsx'),
  ('erp_sgq_salvar_analise_rpnc', 'pages/QualidadeRPNCTratamento.tsx'),
  ('erp_sgq_salvar_formulario_rpnc', 'pages/QualityRpncForm.tsx'),
  ('erp_sgq_transicionar_rpnc', 'pages/QualidadeRPNCTratamento.tsx'),
  ('erp_sgq_vincular_rpnc_auditoria', 'pages/QualityAuditsList.tsx'),
  ('fn_receber_lote_almoxarifado', 'pages/AlmoxarifadoInventario.tsx, pages/estoque/EstoqueRecebimentoLotes.tsx')
), no_banco as (
  select t.nome, t.telas,
         (to_regclass('public.' || t.nome) is not null) as existe,
         c.relrowsecurity as rls_on,
         (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas,
         case when to_regclass('public.' || t.nome) is null then null else
           (has_table_privilege('authenticated', 'public.' || t.nome, 'select')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'insert')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'update')
             and has_table_privilege('authenticated', 'public.' || t.nome, 'delete'))::int
         end as authenticated_com_crd
    from app_tabelas t
    left join pg_class c on c.relname = t.nome
    left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
), fun_no_banco as (
  select f.nome, f.telas,
         (select count(*) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = f.nome) as sobrecargas,
         (select bool_or(p.prosecdef) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = f.nome) as security_definer
    from app_funcoes f
), updated_em_ruim as (
  select tg.tgrelid::regclass::text as tabela
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r','p') and not tg.tgisinternal
     and p.prosrc ilike '%updated_em%'
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = tg.tgrelid and a.attname = 'updated_em'
                        and a.attnum > 0 and not a.attisdropped)
)
select 0 as ordem, '0.identicidade_do_banco' as verificacao,
       current_database() as resultado,
       'tabelas_no_schema_public=' ||
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r','p'))::text ||
       ' | funcoes_no_schema_public=' ||
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public')::text as detalhe, '' as telas
union all
select 1, '1.tabelas_que_o_codigo_usa', count(*)::text, 'das quais existem neste banco: ' ||
       count(*) filter (where existe)::text || ' | faltam: ' || count(*) filter (where not existe)::text, ''
  from no_banco
union all
select 2, '2.tabela_faltando_no_banco', nome, 'esta tela chama', telas from no_banco where not existe
union all
select 3, '3.tabela_sem_politica_rls', nome, 'rls_on=' || coalesce(rls_on::text, '?') || ' | politicas=' || coalesce(politicas::text, '?'), telas
  from no_banco where existe and coalesce(politicas, 0) = 0
union all
select 4, '4.tabela_sem_grant_de_escrita', nome, 'authenticated pode inserir/alterar/apagar: ' || coalesce(authenticated_com_crd::text, '?'), telas
  from no_banco where existe and coalesce(authenticated_com_crd, 0) = 0
union all
select 5, '5.funcao_que_o_codigo_chama', count(*)::text, 'das quais existem neste banco: ' ||
       count(*) filter (where sobrecargas > 0)::text || ' | faltam: ' || count(*) filter (where sobrecargas = 0)::text, ''
  from fun_no_banco
union all
select 6, '6.funcao_faltando_no_banco', nome, 'nenhuma sobrecarga com esse nome no schema public', telas
  from fun_no_banco where sobrecargas = 0
union all
select 7, '7.gatilho_exige_updated_em_sem_coluna', tabela, 'a gravacao dessa tela quebra com 42703 ate o reparo', ''
  from updated_em_ruim
union all
select 8, '8.contagem_final',
       (select count(*) from no_banco where not existe)::text || ' tabelas + ' ||
       (select count(*) from fun_no_banco where sobrecargas = 0)::text || ' funcoes faltando',
       'se der 0 + 0 o banco esta no mesmo ponto do codigo', ''
order by 1, 3;
