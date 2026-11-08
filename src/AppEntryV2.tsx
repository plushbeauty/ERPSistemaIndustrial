import { Suspense, lazy, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ERPHorizontalShell from './components/layout/ERPHorizontalShell'
import QualityPlanGate from './components/quality/QualityPlanGate'
import MetrologiaVencimentoAlerta from './components/quality/MetrologiaVencimentoAlerta'
type LazyModule<P extends object> = { default?: ComponentType<P>; [key: string]: unknown }

function recoverStaleChunk(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (!/failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(message)) return
  try {
    const key = 'erp-industrial-chunk-recovery-at:' + window.location.pathname
    const lastAttempt = Number(window.sessionStorage.getItem(key) || '0')
    if (Date.now() - lastAttempt > 20000) {
      window.sessionStorage.setItem(key, String(Date.now()))
      window.location.replace(window.location.pathname + window.location.search + (window.location.search ? '&' : '?') + '__chunk_recovery=' + Date.now())
    }
  } catch {
    // If browser storage is blocked, the route boundary below offers manual recovery.
  }
}

function lazyPage<P extends object>(
  loader: () => Promise<LazyModule<P>>,
  exportName: string,
) {
  return lazy(async () => {
    let module: LazyModule<P>
    try {
      module = await loader()
    } catch (error) {
      recoverStaleChunk(error)
      throw error
    }
    const component = module.default ?? module[exportName]
    if (typeof component !== 'function' && typeof component !== 'object') {
      throw new Error('LAZY_EXPORT_MISSING: ' + exportName)
    }
    return { default: component as ComponentType<P> }
  })
}
import './styles/rh-industrial-theme.css'
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/erp-design-system-2026.css'
import './styles/stock-sales-premium.css'
import './styles/synqra-app-shell.css'
import './styles/synqra-workspace-standard.css'
import './styles/compras-workspace.css'
import './styles/erp-global-consistency-20261030.css'
import './styles/erp-active-gold-20261101.css'
import './styles/erp-action-contract-20261101.css'
// Última camada: régua premium única do conteúdo autenticado (REV-PREMIUM-GLOBAL-20261108-01).
import './styles/erp-premium-global-20261108.css'

const PagePrincipal = lazy(() => import('./pages/PagePrincipal'))
const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const NFeEmissao = lazy(() => import('./pages/NFeEmissao'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const PCPWorkspace = lazy(() => import('./pages/PCPWorkspace'))
const Paquimetro = lazy(() => import('./pages/QualidadePaquimetroDigital'))
const ComprasWorkspace = lazy(() => import('./pages/ComprasWorkspace'))
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'))
const ComprasRequisicoes = lazy(() => import('./pages/ComprasRequisicoes'))
const RHIndustrial = lazy(() => import('./pages/RHIndustrial'))
// Telas do preview que nao tinham rota — registro feito no transplant de 2026-11-02
const AcompanhamentoNaoConformidade = lazyPage(() => import('./pages/AcompanhamentoNaoConformidade'), 'AcompanhamentoNaoConformidade')
const ComercialSuprimentos = lazyPage(() => import('./pages/ComercialSuprimentos'), 'ComercialSuprimentos')
const ComprasAjuda = lazyPage(() => import('./pages/ComprasAjuda'), 'ComprasAjuda')
const ComprasAnalisePrecos = lazyPage(() => import('./pages/ComprasAnalisePrecos'), 'ComprasAnalisePrecos')
const ComprasIndustrial = lazyPage(() => import('./pages/ComprasIndustrial'), 'ComprasIndustrial')
const ComprasRelatorios = lazyPage(() => import('./pages/ComprasRelatorios'), 'ComprasRelatorios')
const ComprasRFQ = lazyPage(() => import('./pages/ComprasRFQ'), 'ComprasRFQ')
const EngenhariaBOM = lazyPage(() => import('./pages/EngenhariaBOM'), 'EngenhariaBOM')
const FiscalCompras = lazyPage(() => import('./pages/FiscalCompras'), 'FiscalCompras')
const PCPFichasProcesso = lazyPage(() => import('./pages/PCPFichasProcesso'), 'PCPFichasProcesso')
const PCPIndustrial = lazyPage(() => import('./pages/PCPIndustrial'), 'PCPIndustrial')
// Formulário RPNC (Ishikawa / 5 Porquês / CAPA / recorrência) e grade de auditorias — prompts SGQ de 2026-10-31
const QualidadeRPNC = lazy(() => import('./pages/QualityRpncUnified'))
const QualityAuditsList = lazy(() => import('./pages/QualityAuditsList'))
const AdministracaoConfiguracoesGlobais = lazy(() => import('./pages/AdministracaoConfiguracoesGlobais'))
// Controle de acesso do chão de fábrica — visível apenas para nível 8 e 9 (comando de 2026-10-30)
const AccessControlSettings = lazy(() => import('./pages/AccessControlSettings'))
const CentralAjuda = lazy(() => import('./pages/CentralAjuda'))
const FinanceiroWorkspace = lazy(() => import('./modules/financeiro/pages/FinanceiroWorkspace'))
// Páginas existentes sem rota — integradas ao menu em 2026-10-30 (comando de integração global)
const FileTreeGED = lazy(() => import('./pages/FileTreeGED'))
const PostosTrabalho = lazy(() => import('./features/pcp/PostosTrabalho'))
const RoteiroOperacoes = lazy(() => import('./features/pcp/RoteiroOperacoes'))
const AuditoriaSaldos = lazy(() => import('./features/inventario/AuditoriaSaldos'))
const BalancoEstoque = lazy(() => import('./features/inventario/BalancoEstoque'))
const RegrasDepreciacao = lazy(() => import('./features/inventario/RegrasDepreciacao'))
const BankReconciliation = lazy(() => import('./features/banking/BankReconciliation'))
const BankStatementImporter = lazy(() => import('./features/banking/BankStatementImporter'))
const ListaPrecosCliente = lazy(() => import('./features/banking/ListaPrecosCliente'))
const CadastroRegras = lazy(() => import('./features/comissoes/CadastroRegras'))
const CalculoComissao = lazy(() => import('./features/comissoes/CalculoComissao'))
const PerfilVendedor = lazy(() => import('./features/comissoes/PerfilVendedor'))
const AuditoriaComissoes = lazy(() => import('./features/controladoria/AuditoriaComissoes'))
const CadastroDecimais = lazy(() => import('./features/controladoria/CadastroDecimais'))
const PainelLucratividade = lazy(() => import('./features/controladoria/PainelLucratividade'))
const AssistenteRetificacao = lazy(() => import('./features/controladoria/AssistenteRetificacao'))
const RetificacaoPedido = lazy(() => import('./features/controladoria/RetificacaoPedido'))
const AnoFiscal = lazy(() => import('./features/fiscal/AnoFiscal'))
const AuditoriaDocumental = lazy(() => import('./features/fiscal/AuditoriaDocumental'))
const ClassificacaoFiscal = lazy(() => import('./features/fiscal/ClassificacaoFiscal'))
const EstornoLancamentos = lazy(() => import('./features/fiscal/EstornoLancamentos'))
const PainelRazaoGeral = lazy(() => import('./features/fiscal/PainelRazaoGeral'))
const CustomerDnList = lazy(() => import('./pages/CustomerDnList'))
const CustomerDnSettings = lazy(() => import('./pages/CustomerDnSettings'))
const CustomerDnPod = lazy(() => import('./pages/CustomerDnPod'))
const Master = lazy(() => import('./pages/Master'))
const PCPAreaFuncionario = lazy(() => import('./pages/PCPAreaFuncionario'))
// Terminal do operador por cartão de ponto: o protótipo visual foi substituído por leitura real do RH + PCP (2026-11-04).
const ChaoDeFabricaApontamento = lazy(() => import('./pages/ChaoDeFabricaApontamento'))
const PCPCapacidade = lazy(() => import('./pages/PCPCapacidade'))
// Cadastro de Produtos — migrado em 2026-10-30 da branch legada para a origem única de código
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'))
const ModuloCadastroProdutos = lazy(() => import('./pages/cadastro-produtos/ModuloCadastroProdutos'))
const HelpFichaTecnica = lazy(() => import('./pages/cadastro-produtos/HelpFichaTecnica'))
const HelpListagemProdutos = lazy(() => import('./pages/cadastro-produtos/HelpListagemProdutos'))
const HelpParametrosCodigo = lazy(() => import('./pages/cadastro-produtos/HelpParametrosCodigo'))
// Razão Geral: a main publicou o painel em controladoria; o módulo fiscal mantém a própria versão.
// As duas rotas existem, então as duas origens ficam registradas com nomes distintos.
const PainelRazaoGeralControladoria = lazy(() => import('./features/controladoria/PainelRazaoGeral'))
// Experiencia publica nova (home com carrossel, planos, cadastro de empresa, blog, contato) — comando de 2026-11-02
const PlanosIndustrial = lazy(() => import('./pages/PlanosIndustrial'))
const CadastroEmpresa = lazy(() => import('./pages/CadastroEmpresa'))
const Blog = lazy(() => import('./pages/Blog'))
const Contato = lazy(() => import('./pages/Contato'))
// Convite por e-mail: o link gerado por erp-user-admin aponta para /ativar-acesso.
const AtivarAcesso = lazyPage(() => import('./pages/AtivarAcesso'), 'AtivarAcesso')
// Telas novas transplantadas de preview-layout-20261030 para a branch viva — comando de 2026-11-02
const RecuperarSenha = lazyPage(() => import('./pages/RecuperarSenha'), 'RecuperarSenha')
const TabletDashboard = lazyPage(() => import('./pages/TabletDashboard'), 'TabletDashboard')
const DashboardComercial = lazyPage(() => import('./pages/DashboardComercial'), 'DashboardComercial')
const VendasPDV = lazyPage(() => import('./pages/VendasPDV'), 'VendasPDV')
const VendasTablet = lazyPage(() => import('./pages/VendasTablet'), 'VendasTablet')
const PedidoVendaCompleto = lazyPage(() => import('./pages/NovoPedido'), 'NovoPedido')
const VendasAnaliseCustos = lazyPage(() => import('./pages/VendasAnaliseCustos'), 'VendasAnaliseCustos')
const TabelaPrecos = lazyPage(() => import('./pages/TabelaPrecos'), 'TabelaPrecos')
const FinanceiroFluxoCaixa = lazyPage(() => import('./pages/FinanceiroFluxoCaixa'), 'FinanceiroFluxoCaixa')
const FinanceiroContasPagar = lazyPage(() => import('./pages/FinancasContasPagar'), 'FinanceiroContasPagar')
const FinanceiroContasReceber = lazyPage(() => import('./pages/FinanceiroTitulos'), 'FinanceiroContasReceber')
const FinanceiroDashboardCaixa = lazyPage(() => import('./pages/FinanceiroDashboardCaixa'), 'FinanceiroDashboardCaixa')
const VendasCentral = lazyPage(() => import('./pages/VendasCentral'), 'VendasCentral')
const VendasPedidoStatus = lazyPage(() => import('./pages/VendasPedidoStatus'), 'VendasPedidoStatus')
const VendasCatalogoDigitalGestao = lazyPage(() => import('./pages/VendasCatalogoDigitalGestao'), 'VendasCatalogoDigitalGestao')
const VendasClientesPage = lazyPage(() => import('./pages/VendasClientes'), 'VendasClientesPage')
const FornecedoresIndustrial = lazyPage(() => import('./pages/FornecedoresIndustrial'), 'FornecedoresIndustrial')
const VendasCatalogoDigital = lazyPage(() => import('./pages/VendasCatalogoDigital'), 'VendasCatalogoDigital')
const VendasDashboardGraficos = lazyPage(() => import('./pages/VendasDashboardGraficos'), 'VendasDashboardGraficos')
const VendasMetas = lazyPage(() => import('./pages/VendasMetas'), 'VendasMetas')
const VendasRelatorios = lazyPage(() => import('./pages/VendasRelatorios'), 'VendasRelatorios')
const ConfiguracoesADMPage = lazyPage(() => import('./pages/configuracoes/ConfiguracoesADM'), 'ConfiguracoesADMPage')
const EstoqueAlmoxarifado = lazyPage(() => import('./pages/EstoqueAlmoxarifadoCompact'), 'EstoqueAlmoxarifado')
const ExpedicaoPortaria = lazyPage(() => import('./pages/ExpedicaoPortaria'), 'ExpedicaoPortaria')
const EngenhariaCentral = lazyPage(() => import('./pages/EngenhariaCentral'), 'EngenhariaCentral')
const CentraisIndustriais = lazyPage(() => import('./pages/CentraisIndustriais'), 'CentraisIndustriais')
const MRPIndustrial = lazyPage(() => import('./pages/MRPIndustrial'), 'MRPIndustrial')
const OperacaoIndustrial = lazyPage(() => import('./pages/OperacaoIndustrial'), 'OperacaoIndustrial')
const QualidadeIndustrial = lazyPage(() => import('./pages/QualidadeIndustrial'), 'QualidadeIndustrial')
const QualidadeRNC = lazyPage(() => import('./pages/QualidadeRNC'), 'QualidadeRNC')
const IndustrialDataWorkspace = lazyPage(() => import('./pages/IndustrialDataWorkspace'), 'IndustrialDataWorkspace')
const QualidadeEspecificacoesTecnicas = lazyPage(() => import('./pages/QualidadeEspecificacoesTecnicas'), 'QualidadeEspecificacoesTecnicas')
const QualidadeFMEA = lazyPage(() => import('./pages/qualidade/FMEA'), 'QualidadeFMEA')
const QualidadeCEP = lazyPage(() => import('./pages/qualidade/CEP'), 'QualidadeCEP')
const GEDDocumentos = lazyPage(() => import('./pages/qualidade/GEDDocumentos'), 'GEDDocumentos')
const CertificadoQualidade = lazyPage(() => import('./pages/CertificadoQualidade'), 'CertificadoQualidade')
const PCPExecucaoIndustrial = lazyPage(() => import('./pages/PCPExecucaoIndustrial'), 'PCPExecucaoIndustrial')
const CentralCustosIndustrial = lazyPage(() => import('./pages/CentralCustosIndustrial'), 'CentralCustosIndustrial')
const PCPOrdens = lazyPage(() => import('./pages/PCPOrdens'), 'PCPOrdens')
const PCPPedidosPendentes = lazyPage(() => import('./pages/PCPPedidosPendentes'), 'PCPPedidosPendentes')
const PCPValidaFluxo = lazyPage(() => import('./pages/PCPValidaFluxo'), 'PCPValidaFluxo')
const PCPParadas = lazyPage(() => import('./pages/PCPParadasMaquina'), 'PCPParadas')
const PCPSequenciamento = lazyPage(() => import('./pages/PCPSequenciamento'), 'PCPSequenciamento')
const PCPPlanejamentoIndustrial = lazyPage(() => import('./pages/PCPPlanejamentoIndustrial'), 'PCPPlanejamentoIndustrial')
const PCPProgramacaoGantt = lazyPage(() => import('./pages/PCPProgramacaoGantt'), 'PCPProgramacaoGantt')
const PCPAgendaMaquinas = lazyPage(() => import('./pages/PCPAgendaMaquinas'), 'PCPAgendaMaquinas')
const HelpPCPFichas = lazyPage(() => import('./pages/HelpPCPFichas'), 'HelpPCPFichas')
const PCPDashboardOEE = lazyPage(() => import('./pages/PCPDashboardOEE'), 'PCPDashboardOEE')
const PCPTabletOperador = lazyPage(() => import('./pages/PCPTabletOperador'), 'PCPTabletOperador')
const PCPAuditoria = lazyPage(() => import('./pages/pcp/PCPAuditoria'), 'PCPAuditoria')
const QualidadeDashboardSGQ = lazyPage(() => import('./pages/QualidadeDashboardSGQ'), 'QualidadeDashboardSGQ')
const QualidadeAuditoriasPlanta = lazyPage(() => import('./pages/QualidadeAuditoriasPlanta'), 'QualidadeAuditoriasPlanta')
const QualidadeInstrumentosCadastro = lazyPage(() => import('./pages/QualidadeInstrumentosCadastro'), 'QualidadeInstrumentosCadastro')
const QualidadeLiberacaoLotes = lazyPage(() => import('./pages/qualidade/QualidadeLiberacaoLotes'), 'QualidadeLiberacaoLotes')
const QualidadeDashboardRNC = lazyPage(() => import('./pages/QualidadeDashboardRNC'), 'QualidadeDashboardRNC')
const QualidadePlanoControle = lazyPage(() => import('./pages/qualidade/PlanoControle'), 'QualidadePlanoControle')
const DocumentosQualidadeControle = lazyPage(() => import('./pages/DocumentosQualidadeControle'), 'DocumentosQualidadeControle')
const QualidadeInspecaoProcesso = lazyPage(() => import('./pages/QualidadeInspecaoProcesso'), 'QualidadeInspecaoProcesso')
const QualidadeInspecoesIndustrial = lazyPage(() => import('./pages/QualidadeInspecoesIndustrial'), 'QualidadeInspecoesIndustrial')
const QualidadeCentralTablet = lazyPage(() => import('./pages/QualidadeCentralTablet'), 'QualidadeCentralTablet')
const QualidadeMetodologia8D = lazyPage(() => import('./pages/QualidadeMetodologia8D'), 'QualidadeMetodologia8D')
const QualidadeAuditoria5S = lazyPage(() => import('./pages/QualidadeAuditoria5S'), 'QualidadeAuditoria5S')
const QualidadeListaMestre = lazyPage(() => import('./pages/QualidadeListaMestre'), 'QualidadeListaMestre')
const QualidadeRelatoriosDocumentos = lazyPage(() => import('./pages/QualidadeRelatoriosDocumentos'), 'QualidadeRelatoriosDocumentos')
const CalibracaoIndustrial = lazyPage(() => import('./pages/CalibracaoIndustrial'), 'CalibracaoIndustrial')
const QualidadeEditorIT = lazyPage(() => import('./pages/qualidade/QualidadeEditorIT'), 'QualidadeEditorIT')
const QualidadeProcedimentos = lazyPage(() => import('./pages/qualidade/QualidadeProcedimentos'), 'QualidadeProcedimentos')
const QualidadeAssinaturaIT = lazyPage(() => import('./pages/qualidade/QualidadeAssinaturaIT'), 'QualidadeAssinaturaIT')
const QualidadeGenealogiaLote = lazyPage(() => import('./pages/qualidade/QualidadeGenealogiaLote'), 'QualidadeGenealogiaLote')
const QualidadeQuarentena = lazyPage(() => import('./pages/qualidade/QualidadeQuarentena'), 'QualidadeQuarentena')
const EstoqueAjustes = lazyPage(() => import('./pages/EstoqueAjustes'), 'EstoqueAjustes')
const EstoqueSeparacao = lazyPage(() => import('./pages/EstoqueSeparacao'), 'EstoqueSeparacao')
const EstoqueEtiquetas = lazyPage(() => import('./pages/EstoqueEtiquetas'), 'EstoqueEtiquetas')
const EstoqueRecebimentoLotes = lazyPage(() => import('./pages/estoque/EstoqueRecebimentoLotes'), 'EstoqueRecebimentoLotes')
const InventarioValidade = lazyPage(() => import('./pages/estoque/InventarioValidade'), 'InventarioValidade')
const AlmoxarifadoInventario = lazyPage(() => import('./pages/AlmoxarifadoInventario'), 'AlmoxarifadoInventario')
const HelpEstoqueRecebimento = lazyPage(() => import('./pages/estoque/HelpEstoqueRecebimento'), 'HelpEstoqueRecebimento')
const EstoqueCurvaABC = lazyPage(() => import('./pages/EstoqueCurvaABC'), 'EstoqueCurvaABC')
const EstoqueRastreabilidadeLotes = lazyPage(() => import('./pages/EstoqueRastreabilidadeLotes'), 'EstoqueRastreabilidadeLotes')
const AlmoxarifadoSaidaMaterial = lazyPage(() => import('./pages/AlmoxarifadoSaidaMaterial'), 'AlmoxarifadoSaidaMaterial')
const HelpBackups = lazyPage(() => import('./pages/configuracoes/HelpBackups'), 'HelpBackups')
const MoldesFerramentaria = lazyPage(() => import('./pages/MoldesFerramentaria'), 'MoldesFerramentaria')
const FichaEngenharia = lazyPage(() => import('./pages/FichaEngenharia'), 'FichaEngenharia')
const QualidadeRefugos = lazyPage(() => import('./pages/QualidadeRefugos'), 'QualidadeRefugos')
const QualidadeGraficosRefugo = lazyPage(() => import('./pages/QualidadeGraficosRefugo'), 'QualidadeGraficosRefugo')
const ExpedicaoRoteirizacao = lazyPage(() => import('./pages/ExpedicaoRoteirizacao'), 'ExpedicaoRoteirizacao')
const ExpedicaoNFe = lazyPage(() => import('./pages/logistica/ExpedicaoNFe'), 'ExpedicaoNFe')
const RomaneioCarga = lazyPage(() => import('./pages/logistica/RomaneioCarga'), 'RomaneioCarga')
const ImpressaoEtiquetas = lazyPage(() => import('./pages/logistica/ImpressaoEtiquetas'), 'ImpressaoEtiquetas')
const EngenhariaRevisoesBOM = lazyPage(() => import('./pages/EngenhariaRevisoesBOM'), 'EngenhariaRevisoesBOM')
const FichasProcesso = lazyPage(() => import('./pages/FichasProcesso'), 'FichasProcesso')
const FinanceiroGraficoDesvios = lazyPage(() => import('./pages/FinanceiroGraficoDesvios'), 'FinanceiroGraficoDesvios')
const FinanceiroCustoPadrao = lazyPage(() => import('./pages/FinanceiroCustoPadrao'), 'FinanceiroCustoPadrao')
const AdminLogs = lazyPage(() => import('./pages/AdminLogs'), 'AdminLogs')
const CentralEvolucao = lazyPage(() => import('./pages/CentralEvolucao'), 'CentralEvolucao')
const OutlookConfiguracao = lazyPage(() => import('./pages/OutlookConfiguracao'), 'OutlookConfiguracao')
const OutlookCaixaEntrada = lazyPage(() => import('./pages/OutlookCaixaEntrada'), 'OutlookCaixaEntrada')
const DiretoriaDashboard = lazyPage(() => import('./pages/DiretoriaDashboard'), 'DiretoriaDashboard')
const FiscalPrevisaoCaixa = lazyPage(() => import('./pages/FiscalPrevisaoCaixa'), 'FiscalPrevisaoCaixa')
const FiscalCarteiraNFe = lazyPage(() => import('./pages/FiscalCarteiraNFe'), 'FiscalCarteiraNFe')
const FiscalImpostos = lazyPage(() => import('./pages/FiscalImpostos'), 'FiscalImpostos')
const FiscalPendencias = lazyPage(() => import('./pages/FiscalPendencias'), 'FiscalPendencias')
const TesteERP = lazyPage(() => import('./pages/TesteERP'), 'TesteERP')
const UsuariosAdmin = lazyPage(() => import('./pages/UsuariosAdmin'), 'UsuariosAdmin')
const RecebimentoMateriais = lazyPage(() => import('./pages/RecebimentoMateriais'), 'RecebimentoMateriais')
const ManualUsuario = lazyPage(() => import('./pages/ManualUsuario'), 'ManualUsuario')
const ModuloMestreIndustrial = lazyPage(() => import('./pages/layout/ModuloMestreIndustrial'), 'ModuloMestreIndustrial')
const ModuleOverviewIndustrial = lazyPage(() => import('./pages/ModuleOverviewIndustrial'), 'ModuleOverviewIndustrial')
const ConfiguracaoLote = lazyPage(() => import('./pages/ConfiguracaoLote'), 'ConfiguracaoLote')
const ConfiguracaoLotePCP = lazyPage(() => import('./pages/ConfiguracaoLotePCP'), 'ConfiguracaoLotePCP')
const AssistenteAjudaERP = lazyPage(() => import('./pages/AssistenteAjudaERP'), 'AssistenteAjudaERP')
const ComprasSolicitacaoManual = lazyPage(() => import('./pages/ComprasSolicitacaoManual'), 'ComprasSolicitacaoManual')
const ManutencaoCentral = lazyPage(() => import('./pages/ManutencaoCentral'), 'ManutencaoCentral')
const ManutencaoCronograma = lazyPage(() => import('./pages/ManutencaoCronograma'), 'ManutencaoCronograma')
const ManutencaoPlanoMestre = lazyPage(() => import('./pages/ManutencaoPlanoMestre'), 'ManutencaoPlanoMestre')
const ManutencaoIndicadores = lazyPage(() => import('./pages/manutencao/ManutencaoIndicadores'), 'ManutencaoIndicadores')
const ManutencaoOrdens = lazyPage(() => import('./pages/ManutencaoOrdens'), 'ManutencaoOrdens')
const SalaRNC = lazyPage(() => import('./pages/qualidade/sala-rnc'), 'SalaRNC')
const ControleProcessoInjetora = lazyPage(() => import('./pages/pcp/ControleProcessoInjetora'), 'ControleProcessoInjetora')
const ProcessoIndustrialPage = lazyPage(() => import('./pages/ProcessoIndustrialPage'), 'ProcessoIndustrialPage')

function LoadingWorkspace() {
  return <main role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#123b50', fontFamily: 'Inter,system-ui,sans-serif' }}>Carregando SYSNQRA ERP INDUSTRIAL…</main>
}

// O espaco de trabalho de Compras usa densidade propria; as telas transplantadas do preview vem com essa classe.
function ComprasRoute({ children }: { children: ReactNode }) {
  return <div className="compras-compact">{children}</div>
}

function PublicPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingWorkspace />}>
      <div className="erp-global-surface">{children}</div>
    </Suspense>
  )
}

// As telas transplantadas navegam por caminhos planos (/pcp/ordens, /estoque/saldos…).
// Aqui cada caminho plano desconhecido entra na área de trabalho, sem perder a busca original.
function FlatWorkspaceRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={`/pageprincipal${pathname}${search}`} replace />
}

export default function AppEntryV2() {
  const path = useLocation().pathname
  if (path === '/planos') return <PublicPage><PlanosIndustrial /></PublicPage>
  if (path === '/cadastro-empresa') return <PublicPage><CadastroEmpresa /></PublicPage>
  // Fora de .erp-global-surface: a grade compacta global reduziria os campos desta tela para 30px,
  // e o operador digita o código no celular do chão de fábrica (mesma régua da tela de login).
  if (path === '/ativar-acesso') return <Suspense fallback={<LoadingWorkspace />}><AtivarAcesso /></Suspense>
  if (path === '/blog') return <PublicPage><Blog /></PublicPage>
  if (path === '/contato') return <PublicPage><Contato /></PublicPage>
  return (
    <Suspense fallback={<LoadingWorkspace />}>
      <div className="erp-global-surface">
        <ERPHorizontalShell>
          <Routes>
            <Route path="/cadastro-master" element={<SetupADMInicial />} />
            <Route path="/pageprincipal" element={<PagePrincipal />}>
              <Route path="ajuda" element={<CentralAjuda />} />
              <Route path="financeiro" element={<FinanceiroWorkspace />} />
              <Route index element={<AppIndustrial />} />
              <Route path="compras" element={<ComprasWorkspace />} />
              <Route path="compras/solicitacao" element={<SolicitacaoCompra />} />
              <Route path="compras/requisicoes" element={<ComprasRequisicoes />} />
              <Route path="rh" element={<RHIndustrial />} />
              <Route path="pcp/fichas-processo" element={<QualityPlanGate><FichasProcesso /></QualityPlanGate>} />
              <Route path="pcp/roteiro-producao" element={<Navigate to="/pageprincipal/pcp/fichas-processo" replace />} />
              <Route path="qualidade/rpnc" element={<QualityPlanGate><QualidadeRPNC /></QualityPlanGate>} />
              <Route path="qualidade/rpnc-formulario" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
              <Route path="qualidade/formulario-rpnc" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
              <Route path="qualidade/rnc-capa" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
              <Route path="qualidade/auditorias" element={<QualityPlanGate><QualityAuditsList /></QualityPlanGate>} />
              <Route path="comissoes" element={<Navigate to="/pageprincipal/comissoes/regras" replace />} />
              <Route path="comissoes/regras" element={<CadastroRegras />} />
              <Route path="comissoes/calculo" element={<CalculoComissao />} />
              <Route path="comissoes/perfil" element={<PerfilVendedor />} />
              <Route path="comissoes/auditoria" element={<Navigate to="/pageprincipal/controladoria/auditoria-comissoes" replace />} />
              <Route path="controladoria" element={<Navigate to="/pageprincipal/controladoria/lucratividade" replace />} />
              <Route path="controladoria/retificacao-assistente" element={<AssistenteRetificacao />} />
              <Route path="controladoria/auditoria-comissoes" element={<AuditoriaComissoes />} />
              <Route path="controladoria/cadastro-decimais" element={<CadastroDecimais />} />
              <Route path="controladoria/lucratividade" element={<PainelLucratividade />} />
              <Route path="controladoria/razao-geral" element={<PainelRazaoGeralControladoria />} />
              <Route path="controladoria/retificacao-pedido/:pedidoId" element={<RetificacaoPedido />} />
              <Route path="financeiro/conciliacao-bancaria" element={<QualityPlanGate><BankReconciliation /></QualityPlanGate>} />
              <Route path="financeiro/importar-extratos" element={<QualityPlanGate><BankStatementImporter /></QualityPlanGate>} />
              <Route path="financeiro/lista-precos-cliente" element={<QualityPlanGate><ListaPrecosCliente /></QualityPlanGate>} />
              <Route path="administracao-configuracoes" element={<AdministracaoConfiguracoesGlobais />} />
              <Route path="configuracoes-usuario" element={<AccessControlSettings />} />
              <Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
              <Route path="fiscal/emissao" element={<QualityPlanGate><NFeEmissao /></QualityPlanGate>} />
              <Route path="pcp" element={<PCPWorkspace />} />
              <Route path="pcp/roteiros" element={<QualityPlanGate><RoteiroOperacoes /></QualityPlanGate>} />
              <Route path="pcp/capacidade" element={<QualityPlanGate><PCPCapacidade /></QualityPlanGate>} />
              <Route path="chao-de-fabrica/postos" element={<QualityPlanGate><PostosTrabalho /></QualityPlanGate>} />
              <Route path="chao-de-fabrica/portal-operador" element={<PCPAreaFuncionario />} />
              <Route path="chao-de-fabrica/apontamento-operador" element={<ChaoDeFabricaApontamento />} />
              <Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />
              <Route path="qualidade/ged" element={<QualityPlanGate><FileTreeGED /></QualityPlanGate>} />
              <Route path="estoque/auditoria-saldos" element={<QualityPlanGate><AuditoriaSaldos /></QualityPlanGate>} />
              <Route path="estoque/balanco" element={<QualityPlanGate><BalancoEstoque /></QualityPlanGate>} />
              <Route path="estoque/depreciacao" element={<QualityPlanGate><RegrasDepreciacao /></QualityPlanGate>} />
              {/* Atalhos antigos do Financeiro: a tela oficial vive no caminho canônico abaixo. Redirecionamos em vez de montar a mesma tela duas vezes. */}
              <Route path="financeiro/conciliacao" element={<Navigate to="/pageprincipal/financeiro/conciliacao-bancaria" replace />} />
              <Route path="financeiro/extrato" element={<Navigate to="/pageprincipal/financeiro/importar-extratos" replace />} />
              <Route path="financeiro/lista-precos" element={<Navigate to="/pageprincipal/financeiro/lista-precos-cliente" replace />} />
              <Route path="financeiro/comissoes" element={<Navigate to="/pageprincipal/comissoes/calculo" replace />} />
              <Route path="financeiro/comissoes/regras" element={<Navigate to="/pageprincipal/comissoes/regras" replace />} />
              <Route path="financeiro/comissoes/perfil" element={<Navigate to="/pageprincipal/comissoes/perfil" replace />} />
              <Route path="financeiro/auditoria-comissoes" element={<Navigate to="/pageprincipal/controladoria/auditoria-comissoes" replace />} />
              <Route path="financeiro/decimais" element={<Navigate to="/pageprincipal/controladoria/cadastro-decimais" replace />} />
              <Route path="financeiro/lucratividade" element={<Navigate to="/pageprincipal/controladoria/lucratividade" replace />} />
              <Route path="financeiro/retificacao" element={<QualityPlanGate><RetificacaoPedido /></QualityPlanGate>} />
              <Route path="financeiro/retificacao-assistente" element={<Navigate to="/pageprincipal/controladoria/retificacao-assistente" replace />} />
              <Route path="financeiro/notas-debito" element={<QualityPlanGate><CustomerDnList /></QualityPlanGate>} />
              <Route path="financeiro/notas-debito/configuracoes" element={<QualityPlanGate><CustomerDnSettings /></QualityPlanGate>} />
              <Route path="financeiro/notas-debito/:id/pod" element={<QualityPlanGate><CustomerDnPod /></QualityPlanGate>} />
              <Route path="fiscal/ano" element={<QualityPlanGate><AnoFiscal /></QualityPlanGate>} />
              <Route path="fiscal/classificacao" element={<QualityPlanGate><ClassificacaoFiscal /></QualityPlanGate>} />
              <Route path="fiscal/auditoria-documental" element={<QualityPlanGate><AuditoriaDocumental /></QualityPlanGate>} />
              <Route path="fiscal/estorno" element={<QualityPlanGate><EstornoLancamentos /></QualityPlanGate>} />
              <Route path="fiscal/razao" element={<QualityPlanGate><PainelRazaoGeral /></QualityPlanGate>} />
              <Route path="master" element={<Master />} />
              {/* Ordem do proprietario em 2026-11-04: "MANDEI TELA NOVA E NAO FOI APLICADO" e "NAO DEIXAR
                  VARIAS TELAS COM MESMA FUNCÇAO". A tela nova (modulo em abas) passa a ser o cadastro
                  principal; a tela antiga fica so como cadastro fiscal; ficha e parametros viram abas. */}
              <Route path="cadastros/produtos" element={<ModuloCadastroProdutos />} />
              <Route path="cadastros/produtos/imprimir" element={<ProdutosVendasIndustrial />} />
              <Route path="cadastros/produtos/fiscal" element={<ProdutosVendasIndustrial />} />
              <Route path="cadastros/produtos/ficha-tecnica" element={<Navigate to="/pageprincipal/cadastros/produtos?aba=ficha" replace />} />
              <Route path="cadastros/produtos/parametros-codigo" element={<Navigate to="/pageprincipal/cadastros/produtos?aba=regras" replace />} />
              <Route path="cadastros/ajuda/ficha-tecnica" element={<HelpFichaTecnica />} />
              <Route path="cadastros/ajuda/listagem-produtos" element={<HelpListagemProdutos />} />
              <Route path="cadastros/ajuda/parametros-codigo" element={<HelpParametrosCodigo />} />
<Route path="recuperar-senha" element={<RecuperarSenha />} />
              <Route path="tablet/dashboard" element={<TabletDashboard />} />
              <Route path="tablet/home" element={<TabletDashboard />} />
              <Route path="vendas" element={<DashboardComercial />} />
              <Route path="vendas/dashboard" element={<DashboardComercial />} />
              <Route path="vendas/pdv" element={<VendasPDV />} />
              <Route path="vendas/tablet" element={<VendasTablet />} />
              <Route path="vendas/novo-pedido" element={<PedidoVendaCompleto />} />
              <Route path="vendas/orcamentos" element={<VendasAnaliseCustos />} />
              <Route path="vendas/reajuste" element={<TabelaPrecos />} />
              <Route path="financeiro/fluxo-caixa" element={<QualityPlanGate><FinanceiroFluxoCaixa /></QualityPlanGate>} />
              <Route path="financeiro/contas-pagar" element={<QualityPlanGate><FinanceiroContasPagar kind="PAGAR" /></QualityPlanGate>} />
              <Route path="financeiro/contas-receber" element={<QualityPlanGate><FinanceiroContasReceber kind="RECEBER" /></QualityPlanGate>} />
              <Route path="financeiro/caixa" element={<QualityPlanGate><FinanceiroDashboardCaixa /></QualityPlanGate>} />
              <Route path="vendas/status" element={<VendasCentral />} />
              <Route path="vendas/pedido/:id" element={<VendasPedidoStatus />} />
              <Route path="vendas/catalogo-digital/gestao" element={<VendasCatalogoDigitalGestao />} />
              <Route path="vendas/clientes" element={<VendasClientesPage />} />
              <Route path="cadastros/clientes" element={<VendasClientesPage />} />
              <Route path="cadastros/fornecedores" element={<FornecedoresIndustrial />} />
              <Route path="vendas/catalogo-digital" element={<VendasCatalogoDigital />} />
              <Route path="vendas/analise-custos" element={<QualityPlanGate><VendasAnaliseCustos /></QualityPlanGate>} />
              <Route path="vendas/dashboard-graficos" element={<VendasDashboardGraficos />} />
              <Route path="vendas/metas" element={<VendasMetas />} />
              <Route path="vendas/relatorios" element={<VendasRelatorios />} />
              <Route path="vendas/configuracoes" element={<ConfiguracoesADMPage />} />
              <Route path="vendas/estoque" element={<Navigate to="/pageprincipal/estoque/saldos" replace />} />
              <Route path="vendas/expedicao" element={<ExpedicaoPortaria />} />
              <Route path="vendas/engenharia" element={<QualityPlanGate><EngenhariaCentral /></QualityPlanGate>} />
              <Route path="vendas/materiais" element={<QualityPlanGate><CentraisIndustriais module="materiais" /></QualityPlanGate>} />
              <Route path="vendas/mrp" element={<QualityPlanGate><MRPIndustrial /></QualityPlanGate>} />
              <Route path="vendas/chao-de-fabrica" element={<QualityPlanGate><OperacaoIndustrial /></QualityPlanGate>} />
              <Route path="vendas/qualidade" element={<QualityPlanGate><QualidadeIndustrial /></QualityPlanGate>} />
              <Route path="vendas/sgq" element={<QualityPlanGate><QualidadeRNC /></QualityPlanGate>} />
              <Route path="vendas/fluxo-caixa" element={<Navigate to="/pageprincipal/financeiro/fluxo-caixa" replace />} />
              <Route path="engenharia/produtos" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="engenharia/bom" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="engenharia/roteiros" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="estoque/enderecos" element={<IndustrialDataWorkspace />} />
              <Route path="estoque/movimentacoes" element={<IndustrialDataWorkspace />} />
              <Route path="qualidade/especificacoes" element={<QualityPlanGate><QualidadeEspecificacoesTecnicas /></QualityPlanGate>} />
              <Route path="qualidade/fmea" element={<QualityPlanGate><QualidadeFMEA /></QualityPlanGate>} />
              <Route path="qualidade/ishikawa" element={<QualityPlanGate><QualidadeRNC initialTab="ishikawa" /></QualityPlanGate>} />
              <Route path="qualidade/capa" element={<QualityPlanGate><QualidadeRNC initialTab="capa" /></QualityPlanGate>} />
              <Route path="qualidade/cep" element={<QualityPlanGate><QualidadeCEP /></QualityPlanGate>} />
              <Route path="qualidade/ged-documentos" element={<QualityPlanGate><GEDDocumentos /></QualityPlanGate>} />
              <Route path="qualidade/certificados" element={<QualityPlanGate><CertificadoQualidade /></QualityPlanGate>} />
              <Route path="qualidade/ged-documentos/nova" element={<QualityPlanGate><GEDDocumentos /></QualityPlanGate>} />
              <Route path="qualidade/ged-documentos/:id" element={<QualityPlanGate><GEDDocumentos /></QualityPlanGate>} />
              <Route path="pcp/ordens-industriais" element={<QualityPlanGate><PCPExecucaoIndustrial /></QualityPlanGate>} />
              <Route path="pcp/apontamentos" element={<QualityPlanGate><PCPExecucaoIndustrial /></QualityPlanGate>} />
              <Route path="fiscal/parametros" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="fiscal/nfe-entradas" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="fiscal/custos-industriais" element={<QualityPlanGate><CentralCustosIndustrial /></QualityPlanGate>} />
              <Route path="rh/funcionarios" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="rh/turnos" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="rh/epis" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="rh/epis/entregas" element={<QualityPlanGate><IndustrialDataWorkspace /></QualityPlanGate>} />
              <Route path="pcp/ordens" element={<QualityPlanGate><PCPOrdens /></QualityPlanGate>} />
              <Route path="pcp/pedidos-pendentes" element={<QualityPlanGate><PCPPedidosPendentes /></QualityPlanGate>} />
              <Route path="pcp/valida-fluxo" element={<QualityPlanGate><PCPValidaFluxo /></QualityPlanGate>} />
              <Route path="pcp/paradas" element={<QualityPlanGate><PCPParadas /></QualityPlanGate>} />
              <Route path="pcp/sequenciamento" element={<QualityPlanGate><PCPSequenciamento /></QualityPlanGate>} />
              <Route path="pcp/planejamento" element={<QualityPlanGate><PCPPlanejamentoIndustrial /></QualityPlanGate>} />
              <Route path="pcp/programacao-gantt" element={<QualityPlanGate><PCPProgramacaoGantt /></QualityPlanGate>} />
              <Route path="pcp/agenda-maquinas" element={<QualityPlanGate><PCPAgendaMaquinas /></QualityPlanGate>} />
              <Route path="ajuda/pcp-fichas-processo" element={<HelpPCPFichas />} />
              <Route path="pcp/mrp-ii" element={<QualityPlanGate><MRPIndustrial /></QualityPlanGate>} />
              <Route path="pcp/execucao-industrial" element={<QualityPlanGate><PCPExecucaoIndustrial /></QualityPlanGate>} />
              <Route path="pcp/dashboard-oee" element={<QualityPlanGate><PCPDashboardOEE /></QualityPlanGate>} />
              <Route path="pcp/tablet-operador" element={<QualityPlanGate><PCPTabletOperador /></QualityPlanGate>} />
              <Route path="pcp/auditoria" element={<QualityPlanGate><PCPAuditoria /></QualityPlanGate>} />
              <Route path="qualidade/industrial" element={<QualityPlanGate><QualidadeIndustrial /></QualityPlanGate>} />
              <Route path="qualidade" element={<QualityPlanGate><QualidadeDashboardSGQ /></QualityPlanGate>} />
              <Route path="qualidade/auditorias-planta" element={<QualityPlanGate><QualidadeAuditoriasPlanta /></QualityPlanGate>} />
              <Route path="qualidade/instrumentos" element={<QualityPlanGate><QualidadeInstrumentosCadastro /></QualityPlanGate>} />
              <Route path="qualidade/liberacao-lote" element={<QualityPlanGate><QualidadeLiberacaoLotes /></QualityPlanGate>} />
              <Route path="qualidade/dashboard-rnc" element={<QualityPlanGate><QualidadeDashboardRNC /></QualityPlanGate>} />
              <Route path="qualidade/pfmea" element={<Navigate to="/pageprincipal/qualidade/fmea" replace />} />
              <Route path="qualidade/plano-controle" element={<QualityPlanGate><QualidadePlanoControle /></QualityPlanGate>} />
              <Route path="qualidade/documentos" element={<QualityPlanGate><DocumentosQualidadeControle /></QualityPlanGate>} />
              <Route path="qualidade/inspecao-processo" element={<QualityPlanGate><QualidadeInspecaoProcesso /></QualityPlanGate>} />
              <Route path="qualidade/fichas-processo" element={<Navigate to="/pageprincipal/pcp/fichas-processo" replace />} />
              <Route path="qualidade/inspecoes" element={<QualityPlanGate><QualidadeInspecoesIndustrial /></QualityPlanGate>} />
              <Route path="qualidade/tablet" element={<QualityPlanGate><QualidadeCentralTablet /></QualityPlanGate>} />
              <Route path="qualidade/metodologia-8d" element={<QualityPlanGate><QualidadeMetodologia8D /></QualityPlanGate>} />
              <Route path="qualidade/auditoria-5s" element={<QualityPlanGate><QualidadeAuditoria5S /></QualityPlanGate>} />
              <Route path="qualidade/lista-mestre" element={<QualityPlanGate><QualidadeListaMestre /></QualityPlanGate>} />
              <Route path="qualidade/relatorios-documentos" element={<QualityPlanGate><QualidadeRelatoriosDocumentos /></QualityPlanGate>} />
              <Route path="qualidade/metrologia" element={<QualityPlanGate><MetrologiaVencimentoAlerta /><CentraisIndustriais module="metrologia" /></QualityPlanGate>} />
              <Route path="qualidade/calibracao" element={<QualityPlanGate><MetrologiaVencimentoAlerta /><CalibracaoIndustrial /></QualityPlanGate>} />
              <Route path="qualidade/editor-it" element={<QualityPlanGate><QualidadeEditorIT /></QualityPlanGate>} />
              <Route path="qualidade/procedimentos" element={<QualityPlanGate><QualidadeProcedimentos /></QualityPlanGate>} />
              <Route path="qualidade/assinatura-it" element={<QualityPlanGate><QualidadeAssinaturaIT /></QualityPlanGate>} />
              <Route path="qualidade/genealogia-lote" element={<QualityPlanGate><QualidadeGenealogiaLote /></QualityPlanGate>} />
              <Route path="qualidade/quarentena" element={<QualityPlanGate><QualidadeQuarentena /></QualityPlanGate>} />
              <Route path="estoque" element={<Navigate to="/pageprincipal/estoque/saldos" replace />} />
              <Route path="almoxarifado" element={<Navigate to="/pageprincipal/almoxarifado/inventario-mestre" replace />} />
              <Route path="estoque/saldos" element={<EstoqueAlmoxarifado />} />
              <Route path="estoque/ajustes" element={<EstoqueAjustes />} />
              <Route path="estoque/separacao" element={<EstoqueSeparacao />} />
              <Route path="estoque/etiquetas" element={<EstoqueEtiquetas />} />
              <Route path="estoque/recebimento-lotes" element={<EstoqueRecebimentoLotes />} />
              <Route path="estoque/validade" element={<InventarioValidade />} />
              <Route path="almoxarifado/inventario-mestre" element={<AlmoxarifadoInventario />} />
              <Route path="estoque/rastreabilidade" element={<EstoqueRastreabilidadeLotes />} />
              <Route path="almoxarifado/saida-material" element={<AlmoxarifadoSaidaMaterial />} />
              <Route path="ajuda/estoque-recebimento" element={<HelpEstoqueRecebimento />} />
              <Route path="estoque/curva-abc" element={<EstoqueCurvaABC />} />
              <Route path="ajuda/backups" element={<HelpBackups />} />
              <Route path="operacao-industrial" element={<QualityPlanGate><OperacaoIndustrial /></QualityPlanGate>} />
              <Route path="moldes-injecao" element={<QualityPlanGate><MoldesFerramentaria /></QualityPlanGate>} />
              <Route path="ficha-engenharia" element={<QualityPlanGate><FichaEngenharia /></QualityPlanGate>} />
              <Route path="mrp" element={<QualityPlanGate><MRPIndustrial /></QualityPlanGate>} />
              <Route path="qualidade/refugos" element={<QualityPlanGate><QualidadeRefugos /></QualityPlanGate>} />
              <Route path="qualidade/graficos-refugo" element={<QualityPlanGate><QualidadeGraficosRefugo /></QualityPlanGate>} />
              <Route path="central-custos-industrial" element={<QualityPlanGate><CentralCustosIndustrial /></QualityPlanGate>} />
              <Route path="expedicao/roteirizacao" element={<ExpedicaoRoteirizacao />} />
              <Route path="expedicao/portaria" element={<ExpedicaoPortaria />} />
              <Route path="logistica/expedicao-nfe" element={<ExpedicaoNFe />} />
              <Route path="logistica/romaneio-carga" element={<RomaneioCarga />} />
              <Route path="logistica/impressao-etiquetas" element={<ImpressaoEtiquetas />} />
              <Route path="engenharia" element={<QualityPlanGate><EngenhariaCentral /></QualityPlanGate>} />
              <Route path="engenharia/revisoes-bom" element={<QualityPlanGate><EngenhariaRevisoesBOM /></QualityPlanGate>} />
              <Route path="engenharia/ficha" element={<QualityPlanGate><FichaEngenharia /></QualityPlanGate>} />
              <Route path="engenharia/fichas-processo" element={<QualityPlanGate><FichasProcesso /></QualityPlanGate>} />
              <Route path="financeiro/grafico-desvios" element={<QualityPlanGate><FinanceiroGraficoDesvios /></QualityPlanGate>} />
              <Route path="financeiro/custo-padrao" element={<QualityPlanGate><FinanceiroCustoPadrao /></QualityPlanGate>} />
              <Route path="admin/logs" element={<AdminLogs />} />
              <Route path="administracao/central-evolucao" element={<CentralEvolucao />} />
              <Route path="outlook/configuracao" element={<OutlookConfiguracao />} />
              <Route path="outlook/caixa-entrada" element={<OutlookCaixaEntrada />} />
              <Route path="fornecedores" element={<FornecedoresIndustrial />} />
              <Route path="clientes" element={<Navigate to="/pageprincipal/vendas/clientes" replace />} />
              <Route path="tabela-precos" element={<Navigate to="/pageprincipal/vendas/reajuste" replace />} />
              <Route path="tabelas-preco" element={<Navigate to="/pageprincipal/vendas/reajuste" replace />} />
              <Route path="catalogo" element={<Navigate to="/pageprincipal/vendas/catalogo-digital" replace />} />
              <Route path="relatorios" element={<DiretoriaDashboard />} />
              <Route path="fiscal/previsao-caixa" element={<QualityPlanGate><FiscalPrevisaoCaixa /></QualityPlanGate>} />
              <Route path="fiscal/carteira-nfe" element={<QualityPlanGate><FiscalCarteiraNFe /></QualityPlanGate>} />
              <Route path="fiscal/impostos" element={<QualityPlanGate><FiscalImpostos /></QualityPlanGate>} />
              <Route path="fiscal/pendencias" element={<QualityPlanGate><FiscalPendencias /></QualityPlanGate>} />
              <Route path="teste-erp" element={<TesteERP />} />
              <Route path="usuarios-admin" element={<UsuariosAdmin />} />
              <Route path="usuarios" element={<UsuariosAdmin />} />
              <Route path="configuracoes-adm/*" element={<ConfiguracoesADMPage />} />
              <Route path="documentos-qualidade" element={<QualityPlanGate><DocumentosQualidadeControle /></QualityPlanGate>} />
              <Route path="recebimento-materiais" element={<RecebimentoMateriais />} />
              <Route path="manual-usuario" element={<ManualUsuario />} />
              <Route path="industrial/modulo-mestre" element={<QualityPlanGate><ModuloMestreIndustrial /></QualityPlanGate>} />
              <Route path="module-overview" element={<ModuleOverviewIndustrial module="erp" />} />
              <Route path="configuracao-lote" element={<ConfiguracaoLote />} />
              <Route path="configuracao-lote-pcp" element={<QualityPlanGate><ConfiguracaoLotePCP /></QualityPlanGate>} />
              <Route path="custos" element={<QualityPlanGate><CentralCustosIndustrial /></QualityPlanGate>} />
              <Route path="ajuda/assistente" element={<AssistenteAjudaERP />} />
              <Route path="compras-solicitacao" element={<ComprasSolicitacaoManual />} />
              <Route path="manutencao" element={<QualityPlanGate><ManutencaoCentral /></QualityPlanGate>} />
              <Route path="manutencao/cronograma" element={<QualityPlanGate><ManutencaoCronograma /></QualityPlanGate>} />
              <Route path="manutencao/plano-mestre" element={<QualityPlanGate><ManutencaoPlanoMestre /></QualityPlanGate>} />
              <Route path="manutencao/indicadores" element={<QualityPlanGate><ManutencaoIndicadores /></QualityPlanGate>} />
              <Route path="manutencao/ordens" element={<QualityPlanGate><ManutencaoOrdens /></QualityPlanGate>} />
              <Route path="fiscal/carteira" element={<QualityPlanGate><FiscalCarteiraNFe /></QualityPlanGate>} />
              <Route path="qualidade/rnc" element={<QualityPlanGate><SalaRNC /></QualityPlanGate>} />
              <Route path="qualidade/sala-rnc" element={<QualityPlanGate><SalaRNC /></QualityPlanGate>} />
              <Route path="pcp/controle-injetora" element={<ControleProcessoInjetora />} />
              <Route path="estoque/recebimento" element={<Navigate to="/pageprincipal/estoque/recebimento-lotes" replace />} />
              <Route path="fichas-processo" element={<QualityPlanGate><FichasProcesso /></QualityPlanGate>} />
              <Route path="processos/injecao" element={<Navigate to="/pageprincipal/pcp/controle-injetora" replace />} />
              <Route path="processos/prensados" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/estamparia" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/ferramentaria" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/extrusao" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/usinagem" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/soldagem" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/montagem" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/corte" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="processos/pintura" element={<QualityPlanGate><ProcessoIndustrialPage /></QualityPlanGate>} />
              <Route path="qualidade/acompanhamento-rnc" element={<QualityPlanGate><AcompanhamentoNaoConformidade /></QualityPlanGate>} />
              <Route path="compras/suprimentos" element={<QualityPlanGate><ComercialSuprimentos /></QualityPlanGate>} />
              <Route path="compras/ajuda" element={<ComprasRoute><ComprasAjuda /></ComprasRoute>} />
              <Route path="compras/analise-precos" element={<ComprasRoute><ComprasAnalisePrecos /></ComprasRoute>} />
              <Route path="compras/industrial" element={<ComprasRoute><ComprasIndustrial /></ComprasRoute>} />
              <Route path="compras/relatorios" element={<ComprasRoute><ComprasRelatorios /></ComprasRoute>} />
              <Route path="compras/rfq" element={<ComprasRoute><ComprasRFQ /></ComprasRoute>} />
              <Route path="engenharia/bom-mestre" element={<QualityPlanGate><EngenhariaBOM /></QualityPlanGate>} />
              <Route path="fiscal/compras" element={<QualityPlanGate><ComprasRoute><FiscalCompras /></ComprasRoute></QualityPlanGate>} />
              <Route path="pcp/fichas-processo-mestre" element={<QualityPlanGate><PCPFichasProcesso /></QualityPlanGate>} />
              <Route path="pcp/industrial" element={<QualityPlanGate><PCPIndustrial /></QualityPlanGate>} />
              <Route path="compras/pedido" element={<Navigate to="/pageprincipal/compras" replace />} />
              <Route path="qualidade/rpnc-multiorigem" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
              <Route path="*" element={<Navigate to="/pageprincipal" replace />} />
            </Route>
            <Route path="/ajuda" element={<Navigate to="/pageprincipal/ajuda" replace />} />
            <Route path="/financeiro" element={<Navigate to="/pageprincipal/financeiro" replace />} />
            <Route path="/compras" element={<Navigate to="/pageprincipal/compras" replace />} />
            <Route path="/rh" element={<Navigate to="/pageprincipal/rh" replace />} />
            <Route path="/pcp/fichas-processo" element={<Navigate to="/pageprincipal/pcp/fichas-processo" replace />} />
            <Route path="/compras/solicitacao" element={<Navigate to="/pageprincipal/compras/solicitacao" replace />} />
            <Route path="/compras/requisicoes" element={<Navigate to="/pageprincipal/compras/requisicoes" replace />} />
            <Route path="/qualidade/rpnc" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
            <Route path="/qualidade/rpnc-formulario" element={<Navigate to="/pageprincipal/qualidade/rpnc-formulario" replace />} />
            <Route path="/qualidade/auditorias" element={<Navigate to="/pageprincipal/qualidade/auditorias" replace />} />
            <Route path="/comissoes" element={<Navigate to="/pageprincipal/comissoes" replace />} />
            <Route path="/comissoes/regras" element={<Navigate to="/pageprincipal/comissoes/regras" replace />} />
            <Route path="/comissoes/calculo" element={<Navigate to="/pageprincipal/comissoes/calculo" replace />} />
            <Route path="/comissoes/perfil" element={<Navigate to="/pageprincipal/comissoes/perfil" replace />} />
            <Route path="/comissoes/auditoria" element={<Navigate to="/pageprincipal/comissoes/auditoria" replace />} />
            <Route path="/controladoria" element={<Navigate to="/pageprincipal/controladoria" replace />} />
            <Route path="/controladoria/retificacao-assistente" element={<Navigate to="/pageprincipal/controladoria/retificacao-assistente" replace />} />
            <Route path="/controladoria/auditoria-comissoes" element={<Navigate to="/pageprincipal/controladoria/auditoria-comissoes" replace />} />
            <Route path="/controladoria/cadastro-decimais" element={<Navigate to="/pageprincipal/controladoria/cadastro-decimais" replace />} />
            <Route path="/controladoria/lucratividade" element={<Navigate to="/pageprincipal/controladoria/lucratividade" replace />} />
            <Route path="/controladoria/razao-geral" element={<Navigate to="/pageprincipal/controladoria/razao-geral" replace />} />
            <Route path="/controladoria/retificacao-pedido/:pedidoId" element={<RetificacaoPedido />} />
            <Route path="/financeiro/conciliacao-bancaria" element={<Navigate to="/pageprincipal/financeiro/conciliacao-bancaria" replace />} />
            <Route path="/financeiro/importar-extratos" element={<Navigate to="/pageprincipal/financeiro/importar-extratos" replace />} />
            <Route path="/financeiro/lista-precos-cliente" element={<Navigate to="/pageprincipal/financeiro/lista-precos-cliente" replace />} />
            <Route path="/configuracoes-adm" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/administracao-configuracoes" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/erp-industrial" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/cadastros" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos-vendas" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos-vendas/imprimir" element={<Navigate to="/pageprincipal/cadastros/produtos/imprimir" replace />} />
            <Route path="/cadastro-produtos" element={<Navigate to="/pageprincipal/cadastros/produtos/ficha-tecnica" replace />} />
            <Route path="/cadastro-produtos/parametros-codigo" element={<Navigate to="/pageprincipal/cadastros/produtos/parametros-codigo" replace />} />
            <Route path="/ajuda/ficha-tecnica" element={<Navigate to="/pageprincipal/cadastros/ajuda/ficha-tecnica" replace />} />
            <Route path="/ajuda/listagem-produtos" element={<Navigate to="/pageprincipal/cadastros/ajuda/listagem-produtos" replace />} />
            <Route path="/ajuda/parametros-codigo" element={<Navigate to="/pageprincipal/cadastros/ajuda/parametros-codigo" replace />} />
            <Route path="/fiscal" element={<Navigate to="/pageprincipal/fiscal" replace />} />
            <Route path="/fiscal/emissao" element={<Navigate to="/pageprincipal/fiscal/emissao" replace />} />
            <Route path="/pcp" element={<Navigate to="/pageprincipal/pcp" replace />} />
            <Route path="/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/qualidade/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/qualidade/ged-documentos" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/qualidade/documentos" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/documentos-qualidade" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/pcp/roteiros" element={<Navigate to="/pageprincipal/pcp/roteiros" replace />} />
            <Route path="/pcp/capacidade" element={<Navigate to="/pageprincipal/pcp/capacidade" replace />} />
            <Route path="/pcp/portal-operador" element={<Navigate to="/pageprincipal/chao-de-fabrica/portal-operador" replace />} />
            <Route path="/chao-de-fabrica/apontamento-operador" element={<Navigate to="/pageprincipal/chao-de-fabrica/apontamento-operador" replace />} />
            <Route path="/area-funcionario" element={<Navigate to="/pageprincipal/chao-de-fabrica/portal-operador" replace />} />
            <Route path="/master" element={<Navigate to="/pageprincipal/master" replace />} />
            <Route path="/*" element={<FlatWorkspaceRedirect />} />
          </Routes>
        </ERPHorizontalShell>
      </div>
    </Suspense>
  )
}
