import { Component, type ComponentType, type ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'



type LazyModule<P extends object> = { default?: ComponentType<P>; [key: string]: unknown }

function lazyPage<P extends object>(
  loader: () => Promise<LazyModule<P>>,
  exportName: string,
) {
  return lazy(async () => {
    const module = await loader()
    const component = module.default ?? module[exportName]
    if (typeof component !== 'function' && typeof component !== 'object') {
      throw new Error('LAZY_EXPORT_MISSING: ' + exportName)
    }
    return { default: component as ComponentType<P> }
  })
}
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import './styles/public-contact.css'
import './styles/visual-showcase-2026.css'
import './styles/module-overview.css'
import './styles/erp-ui-pass-2026.css'
import './styles/industrial-plans.css'
import './styles/erp-design-system-2026.css'
import './styles/synqra-app-shell.css'
import './styles/compras-compact.css'
import './styles/erp-compact-global.css'

import IndustrialLoginDirect from './IndustrialLoginDirect'
import TabletDashboard from './pages/TabletDashboard'

const AppIndustrial = lazyPage(() => import('./AppIndustrialV7'), 'AppIndustrial')
const PublicIndustrialHome = lazyPage(() => import('./PublicIndustrialHome'), 'PublicIndustrialHome')
const IndustrialVisualShowcase = lazyPage(() => import('./components/IndustrialVisualShowcase'), 'IndustrialVisualShowcase')
const Blog = lazyPage(() => import('./pages/Blog'), 'Blog')
const Contato = lazyPage(() => import('./pages/Contato'), 'Contato')
const Fiscal = lazyPage(() => import('./pages/Fiscal'), 'Fiscal')
const NFeEmissao = lazyPage(() => import('./pages/NFeEmissaoCompact'), 'NFeEmissao')
const FiscalPrevisaoCaixa = lazyPage(() => import('./pages/FiscalPrevisaoCaixa'), 'FiscalPrevisaoCaixa')
const FiscalCarteiraNFe = lazyPage(() => import('./pages/FiscalCarteiraNFe'), 'FiscalCarteiraNFe')
const FiscalImpostos = lazyPage(() => import('./pages/FiscalImpostos'), 'FiscalImpostos')
const FiscalPendencias = lazyPage(() => import('./pages/FiscalPendencias'), 'FiscalPendencias')
const PainelRazaoGeral = lazyPage(() => import('./features/controladoria/PainelRazaoGeral'), 'default')
const PainelLucratividade = lazyPage(() => import('./features/controladoria/PainelLucratividade'), 'default')
const AuditoriaComissoes = lazyPage(() => import('./features/controladoria/AuditoriaComissoes'), 'default')
const CadastroDecimais = lazyPage(() => import('./features/controladoria/CadastroDecimais'), 'default')
const AuditoriaDocumental = lazyPage(() => import('./features/fiscal/AuditoriaDocumental'), 'default')
const GeradorGruposContabeis = lazyPage(() => import('./features/fiscal/GeradorGruposContabeis'), 'default')
const EstornoLancamentos = lazyPage(() => import('./features/fiscal/EstornoLancamentos'), 'default')
const ClassificacaoFiscal = lazyPage(() => import('./features/fiscal/ClassificacaoFiscal'), 'default')
const AnoFiscal = lazyPage(() => import('./features/fiscal/AnoFiscal'), 'default')
const AssistenteRetificacao = lazyPage(() => import('./features/controladoria/AssistenteRetificacao'), 'default')
const Master = lazyPage(() => import('./pages/Master'), 'Master')
const PCPIndustrial = lazyPage(() => import('./pages/PCPIndustrial'), 'PCPIndustrial')
const PCPOrdens = lazyPage(() => import('./pages/PCPOrdens'), 'default')
const PCPParadas = lazyPage(() => import('./pages/PCPParadas'), 'PCPParadas')
const PCPSequenciamento = lazyPage(() => import('./pages/PCPSequenciamento'), 'PCPSequenciamento')
const PCPPlanejamentoIndustrial = lazyPage(() => import('./pages/PCPPlanejamentoIndustrial'), 'PCPPlanejamentoIndustrial')
const MRPIndustrial = lazyPage(() => import('./pages/MRPIndustrial'), 'MRPIndustrial')
const CentraisIndustriais = lazyPage(() => import('./pages/CentraisIndustriais'), 'CentraisIndustriais')
const QualidadeIndustrial = lazyPage(() => import('./pages/QualidadeIndustrial'), 'QualidadeIndustrial')
const QualidadeSGQAvancado = lazyPage(() => import('./pages/SgqManagementCompact'), 'default')
const AcompanhamentoNaoConformidade = lazyPage(() => import('./pages/AcompanhamentoNaoConformidade'), 'AcompanhamentoNaoConformidade')
const EstoqueAlmoxarifado = lazyPage(() => import('./pages/EstoqueAlmoxarifadoCompact'), 'default')
const ComprasOrdemCompra = lazyPage(() => import('./pages/ComprasOrdemCompra'), 'ComprasOrdemCompra')
const ProdutosVendasIndustrial = lazyPage(() => import('./pages/ProdutosVendasIndustrial'), 'ProdutosVendasIndustrial')
const ModuloCadastroProdutos = lazyPage(() => import('./pages/cadastro-produtos/ModuloCadastroProdutos'), 'ModuloCadastroProdutos')
const PedidoVendaCompleto = lazyPage(() => import('./pages/NovoPedido'), 'NovoPedido')
const ImprimirPedido = lazyPage(() => import('./pages/ImprimirPedido'), 'ImprimirPedido')
const ImprimirProduto = lazyPage(() => import('./pages/ImprimirProduto'), 'ImprimirProduto')
const DashboardComercial = lazyPage(() => import('./pages/DashboardComercial'), 'DashboardComercial')
const VendasCentral = lazyPage(() => import('./pages/VendasCentral'), 'default')
const VendasCatalogoDigital = lazyPage(() => import('./pages/VendasCatalogoDigital'), 'VendasCatalogoDigital')
const VendasAnaliseCustos = lazyPage(() => import('./pages/VendasAnaliseCustos'), 'VendasAnaliseCustos')
const VendasDashboardGraficos = lazyPage(() => import('./pages/VendasDashboardGraficos'), 'VendasDashboardGraficos')
const VendasMetas = lazyPage(() => import('./pages/VendasMetas'), 'VendasMetas')
const VendasRelatorios = lazyPage(() => import('./pages/VendasRelatorios'), 'VendasRelatorios')
const VendasStatusPedidos = lazyPage(() => import('./pages/VendasStatusPedidos'), 'VendasStatusPedidos')
const VendasPedidoStatus = lazyPage(() => import('./pages/VendasPedidoStatus'), 'VendasPedidoStatus')
const VendasCatalogoDigitalGestao = lazyPage(() => import('./pages/VendasCatalogoDigitalGestao'), 'VendasCatalogoDigitalGestao')
const VendasCarteira = lazyPage(() => import('./pages/VendasCarteira'), 'VendasCarteira')
const VendasPDV = lazyPage(() => import('./pages/VendasPDV'), 'default')
const VendasTablet = lazyPage(() => import('./pages/VendasTablet'), 'default')
const ComprasRFQ = lazyPage(() => import('./pages/ComprasRFQ'), 'default')
const ComprasIndustrial = lazyPage(() => import('./pages/ComprasIndustrial'), 'default')
const ComprasRequisicoes = lazyPage(() => import('./pages/ComprasRequisicoes'), 'default')
const FiscalCompras = lazyPage(() => import('./pages/FiscalCompras'), 'default')
const ComprasRelatorios = lazyPage(() => import('./pages/ComprasRelatorios'), 'default')
const ComprasAjuda = lazyPage(() => import('./pages/ComprasAjuda'), 'default')
const ComprasAnalisePrecos = lazyPage(() => import('./pages/ComprasAnalisePrecos'), 'default')
const PedidoCompra = lazyPage(() => import('./pages/PedidoCompra'), 'default')
const VendasClientesPage = lazyPage(() => import('./pages/VendasClientes'), 'default')
const CentralCustosIndustrial = lazyPage(() => import('./pages/CentralCustosIndustrial'), 'CentralCustosIndustrial')
const CadastroEmpresa = lazyPage(() => import('./pages/CadastroEmpresa'), 'CadastroEmpresa')
const PlanosIndustrial = lazyPage(() => import('./pages/PlanosIndustrial'), 'PlanosIndustrial')
const AtivarAcesso = lazyPage(() => import('./pages/AtivarAcesso'), 'AtivarAcesso')
const SolicitacaoCompra = lazyPage(() => import('./pages/SolicitacaoCompra'), 'SolicitacaoCompra')
const TesteERP = lazyPage(() => import('./pages/TesteERP'), 'TesteERP')
const UsuariosAdmin = lazyPage(() => import('./pages/UsuariosAdmin'), 'UsuariosAdmin')
const ConfiguracoesADMPage = lazyPage(() => import('./pages/configuracoes/ConfiguracoesADM'), 'ConfiguracoesADMPage')
const DocumentosQualidadeControle = lazyPage(() => import('./pages/DocumentosQualidadeControle'), 'DocumentosQualidadeControle')
const RecebimentoMateriais = lazyPage(() => import('./pages/RecebimentoMateriais'), 'RecebimentoMateriais')
const ManualUsuario = lazyPage(() => import('./pages/ManualUsuario'), 'ManualUsuario')
const RHIndustrial = lazyPage(() => import('./pages/RHIndustrial'), 'RHIndustrial')
const ModuleOverviewIndustrial = lazyPage(() => import('./pages/ModuleOverviewIndustrial'), 'ModuleOverviewIndustrial')
const SetupADMInicial = lazyPage(() => import('./pages/SetupADMInicial'), 'SetupADMInicial')
const RecuperarSenha = lazyPage(() => import('./pages/RecuperarSenha'), 'RecuperarSenha')
const ConfiguracaoLote = lazyPage(() => import('./pages/ConfiguracaoLote'), 'ConfiguracaoLote')
const FichaEngenharia = lazyPage(() => import('./pages/FichaEngenharia'), 'FichaEngenharia')
const ConfiguracaoLotePCP = lazyPage(() => import('./pages/ConfiguracaoLotePCP'), 'ConfiguracaoLotePCP')
const FornecedoresIndustrial = lazyPage(() => import('./pages/FornecedoresIndustrial'), 'FornecedoresIndustrial')
const ClientesIndustrial = lazyPage(() => import('./pages/ClientesIndustrial'), 'ClientesIndustrial')
const TabelaPrecos = lazyPage(() => import('./pages/TabelaPrecos'), 'TabelaPrecos')
const AjusteGlobal = lazyPage(() => import('./pages/AjusteGlobal'), 'default')
const CatalogoDigital = lazyPage(() => import('./pages/CatalogoDigital'), 'CatalogoDigital')
const FichasProcesso = lazyPage(() => import('./pages/FichasProcesso'), 'FichasProcesso')
const AssistenteAjudaERP = lazyPage(() => import('./pages/AssistenteAjudaERP'), 'AssistenteAjudaERP')
const ComprasSolicitacaoManual = lazyPage(() => import('./pages/ComprasSolicitacaoManual'), 'ComprasSolicitacaoManual')
const ExpedicaoPortaria = lazyPage(() => import('./pages/ExpedicaoPortaria'), 'ExpedicaoPortaria')
const EngenhariaRevisoesBOM = lazyPage(() => import('./pages/EngenhariaRevisoesBOM'), 'EngenhariaRevisoesBOM')
const EngenhariaCentral = lazyPage(() => import('./pages/EngenhariaCentral'), 'EngenhariaCentral')
const PCPDashboardOEE = lazyPage(() => import('./pages/PCPDashboardOEE'), 'PCPDashboardOEE')
const QualidadeDashboardRNC = lazyPage(() => import('./pages/QualidadeDashboardRNC'), 'QualidadeDashboardRNC')
const QualidadeRNC = lazyPage(() => import('./pages/QualidadeRNC'), 'QualidadeRNC')
const EstoqueCurvaABC = lazyPage(() => import('./pages/EstoqueCurvaABC'), 'EstoqueCurvaABC')
const FinanceiroGraficoDesvios = lazyPage(() => import('./pages/FinanceiroGraficoDesvios'), 'FinanceiroGraficoDesvios')
const ExpedicaoRoteirizacao = lazyPage(() => import('./pages/ExpedicaoRoteirizacao'), 'ExpedicaoRoteirizacao')
const QualidadePFMEA = lazyPage(() => import('./pages/QualidadePFMEA'), 'QualidadePFMEA')
const ManutencaoOrdens = lazyPage(() => import('./pages/ManutencaoOrdens'), 'ManutencaoOrdens')
const PCPTabletOperador = lazyPage(() => import('./pages/PCPTabletOperador'), 'PCPTabletOperador')
const EstoqueAjustes = lazyPage(() => import('./pages/EstoqueAjustes'), 'EstoqueAjustes')
const EstoqueSeparacao = lazyPage(() => import('./pages/EstoqueSeparacao'), 'EstoqueSeparacao')
const EstoqueEtiquetas = lazyPage(() => import('./pages/EstoqueEtiquetas'), 'EstoqueEtiquetas')
const EstoqueRecebimentoLotes = lazyPage(() => import('./pages/estoque/EstoqueRecebimentoLotes'), 'EstoqueRecebimentoLotes')
const QualidadeGenealogiaLote = lazyPage(() => import('./pages/qualidade/QualidadeGenealogiaLote'), 'QualidadeGenealogiaLote')
const QualidadeEditorIT = lazyPage(() => import('./pages/qualidade/QualidadeEditorIT'), 'QualidadeEditorIT')
const QualidadeAssinaturaIT = lazyPage(() => import('./pages/qualidade/QualidadeAssinaturaIT'), 'QualidadeAssinaturaIT')
const QualidadeQuarentena = lazyPage(() => import('./pages/qualidade/QualidadeQuarentena'), 'QualidadeQuarentena')
const FinanceiroCustoPadrao = lazyPage(() => import('./pages/FinanceiroCustoPadrao'), 'FinanceiroCustoPadrao')
const OutlookConfiguracao = lazyPage(() => import('./pages/OutlookConfiguracao'), 'OutlookConfiguracao')
const OutlookCaixaEntrada = lazyPage(() => import('./pages/OutlookCaixaEntrada'), 'OutlookCaixaEntrada')
const AdminLogs = lazyPage(() => import('./pages/AdminLogs'), 'AdminLogs')
const CalibracaoIndustrial = lazyPage(() => import('./pages/CalibracaoIndustrial'), 'CalibracaoIndustrial')
const QualidadeRelatoriosDocumentos = lazyPage(() => import('./pages/QualidadeRelatoriosDocumentos'), 'QualidadeRelatoriosDocumentos')
const QualidadeListaMestre = lazyPage(() => import('./pages/QualidadeListaMestre'), 'QualidadeListaMestre')
const QualidadeAuditoria5S = lazyPage(() => import('./pages/QualidadeAuditoria5S'), 'QualidadeAuditoria5S')
const QualidadeMetodologia8D = lazyPage(() => import('./pages/QualidadeMetodologia8D'), 'QualidadeMetodologia8D')
const QualidadeInspecaoProcesso = lazyPage(() => import('./pages/QualidadeInspecaoProcesso'), 'QualidadeInspecaoProcesso')
const MoldesFerramentaria = lazyPage(() => import('./pages/MoldesFerramentaria'), 'MoldesFerramentaria')
const OperacaoIndustrial = lazyPage(() => import('./pages/OperacaoIndustrial'), 'OperacaoIndustrial')
const InjecaoIndustrial = lazyPage(() => import('./pages/InjecaoIndustrial'), 'InjecaoIndustrial')
const ProcessoIndustrialPage = lazyPage(() => import('./pages/ProcessoIndustrialPage'), 'ProcessoIndustrialPage')
const BankingReconciliation = lazyPage(() => import('./features/banking/BankReconciliation'), 'BankReconciliation')
const BankingStatementImporter = lazyPage(() => import('./features/banking/BankStatementImporter'), 'BankStatementImporter')
const BankingListaPrecosCliente = lazyPage(() => import('./features/banking/ListaPrecosCliente'), 'ListaPrecosCliente')
const FinanceiroFluxoCaixa = lazyPage(() => import('./pages/FinanceiroFluxoCaixa'), 'FinanceiroFluxoCaixa')
const FinanceiroDashboardCaixa = lazyPage(() => import('./pages/FinanceiroDashboardCaixa'), 'default')
const FinanceiroContasPagar = lazyPage(() => import('./pages/FinancasContasPagar'), 'default')
const FinanceiroContasReceber = lazyPage(() => import('./pages/FinanceiroTitulos'), 'FinanceiroContasReceber')
const RetificacaoPedido = lazyPage(() => import('./features/controladoria/RetificacaoPedido'), 'RetificacaoPedido')
const CadastroRegrasComissao = lazyPage(() => import('./features/comissoes/CadastroRegras'), 'CadastroRegras')
const CalculoComissao = lazyPage(() => import('./features/comissoes/CalculoComissao'), 'CalculoComissao')
const PerfilVendedorComissao = lazyPage(() => import('./features/comissoes/PerfilVendedor'), 'PerfilVendedor')
const BalancoEstoque = lazyPage(() => import('./features/inventario/BalancoEstoque'), 'BalancoEstoque')
const RegrasDepreciacao = lazyPage(() => import('./features/inventario/RegrasDepreciacao'), 'RegrasDepreciacao')
const AuditoriaSaldos = lazyPage(() => import('./features/inventario/AuditoriaSaldos'), 'AuditoriaSaldos')
const EngenhariaBOM = lazyPage(() => import('./features/pcp/EngenhariaBOM'), 'EngenhariaBOM')
const RoteiroOperacoes = lazyPage(() => import('./features/pcp/RoteiroOperacoes'), 'RoteiroOperacoes')
const PostosTrabalho = lazyPage(() => import('./features/pcp/PostosTrabalho'), 'PostosTrabalho')
const FichaProcesso = lazyPage(() => import('./features/pcp/FichaProcesso'), 'FichaProcesso')
const PainelOrdensProducao = lazyPage(() => import('./features/pcp/PainelOrdensProducao'), 'PainelOrdensProducao')
const ApuracaoTurno = lazyPage(() => import('./features/pcp/ApuracaoTurno'), 'ApuracaoTurno')

type ERPProfile = { empresa_id: string | null; is_master: boolean; nivel_admin?: number; perfil?: string; nome?: string }