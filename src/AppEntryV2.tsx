import { Component, type ComponentType, type ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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

import IndustrialLoginDirect from './IndustrialLoginDirect'

const AppIndustrial = lazyPage(() => import('./AppIndustrialV7'), 'AppIndustrial')
const PublicIndustrialHome = lazyPage(() => import('./PublicIndustrialHome'), 'PublicIndustrialHome')
const IndustrialVisualShowcase = lazyPage(() => import('./components/IndustrialVisualShowcase'), 'IndustrialVisualShowcase')
const Blog = lazyPage(() => import('./pages/Blog'), 'Blog')
const Contato = lazyPage(() => import('./pages/Contato'), 'Contato')
const Fiscal = lazyPage(() => import('./pages/Fiscal'), 'Fiscal')
const NFeEmissao = lazyPage(() => import('./pages/NFeEmissao'), 'NFeEmissao')
const FiscalPrevisaoCaixa = lazyPage(() => import('./pages/FiscalPrevisaoCaixa'), 'FiscalPrevisaoCaixa')
const FiscalCarteiraNFe = lazyPage(() => import('./pages/FiscalCarteiraNFe'), 'FiscalCarteiraNFe')
const FiscalImpostos = lazyPage(() => import('./pages/FiscalImpostos'), 'FiscalImpostos')
const Master = lazyPage(() => import('./pages/Master'), 'Master')
const PCPIndustrial = lazyPage(() => import('./pages/PCPIndustrial'), 'PCPIndustrial')
const PCPParadas = lazyPage(() => import('./pages/PCPParadas'), 'PCPParadas')
const PCPSequenciamento = lazyPage(() => import('./pages/PCPSequenciamento'), 'PCPSequenciamento')
const PCPPlanejamentoIndustrial = lazyPage(() => import('./pages/PCPPlanejamentoIndustrial'), 'PCPPlanejamentoIndustrial')
const MRPIndustrial = lazyPage(() => import('./pages/MRPIndustrial'), 'MRPIndustrial')
const CentraisIndustriais = lazyPage(() => import('./pages/CentraisIndustriais'), 'CentraisIndustriais')
const QualidadeIndustrial = lazyPage(() => import('./pages/QualidadeIndustrial'), 'QualidadeIndustrial')
const AcompanhamentoNaoConformidade = lazyPage(() => import('./pages/AcompanhamentoNaoConformidade'), 'AcompanhamentoNaoConformidade')
const EstoqueAlmoxarifado = lazyPage(() => import('./pages/EstoqueAlmoxarifado'), 'EstoqueAlmoxarifado')
const ProdutosVendasIndustrial = lazyPage(() => import('./pages/ProdutosVendasIndustrial'), 'ProdutosVendasIndustrial')
const ModuloCadastroProdutos = lazyPage(() => import('./pages/cadastro-produtos/ModuloCadastroProdutos'), 'ModuloCadastroProdutos')
const TabletDashboard = lazyPage(() => import('./pages/TabletDashboard'), 'TabletDashboard')
const PedidoVendaCompleto = lazyPage(() => import('./pages/PedidoVendaCompleto'), 'PedidoVendaCompleto')
const VendasCentral = lazyPage(() => import('./pages/VendasCentral'), 'VendasCentral')
const VendasCatalogoDigital = lazyPage(() => import('./pages/VendasCatalogoDigital'), 'VendasCatalogoDigital')
const VendasAnaliseCustos = lazyPage(() => import('./pages/VendasAnaliseCustos'), 'VendasAnaliseCustos')
const VendasDashboardGraficos = lazyPage(() => import('./pages/VendasDashboardGraficos'), 'VendasDashboardGraficos')
const VendasMetas = lazyPage(() => import('./pages/VendasMetas'), 'VendasMetas')
const VendasRelatorios = lazyPage(() => import('./pages/VendasRelatorios'), 'VendasRelatorios')
const VendasConfiguracoes = lazyPage(() => import('./pages/VendasConfiguracoes'), 'VendasConfiguracoes')
const VendasStatusPedidos = lazyPage(() => import('./pages/VendasStatusPedidos'), 'VendasStatusPedidos')
const VendasPedidoStatus = lazyPage(() => import('./pages/VendasPedidoStatus'), 'VendasPedidoStatus')
const VendasCatalogoDigitalGestao = lazyPage(() => import('./pages/VendasCatalogoDigitalGestao'), 'VendasCatalogoDigitalGestao')
const VendasCarteira = lazyPage(() => import('./pages/VendasCarteira'), 'VendasCarteira')
const VendasClientesPage = lazyPage(() => import('./pages/VendasClientes'), 'default')
const CentralCustosIndustrial = lazyPage(() => import('./pages/CentralCustosIndustrial'), 'CentralCustosIndustrial')
const CadastroEmpresa = lazyPage(() => import('./pages/CadastroEmpresa'), 'CadastroEmpresa')
const PlanosIndustrial = lazyPage(() => import('./pages/PlanosIndustrial'), 'PlanosIndustrial')
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
const CatalogoDigital = lazyPage(() => import('./pages/CatalogoDigital'), 'CatalogoDigital')
const FichasProcesso = lazyPage(() => import('./pages/FichasProcesso'), 'FichasProcesso')
const AssistenteAjudaERP = lazyPage(() => import('./pages/AssistenteAjudaERP'), 'AssistenteAjudaERP')
const ComprasSolicitacaoManual = lazyPage(() => import('./pages/ComprasSolicitacaoManual'), 'ComprasSolicitacaoManual')
const ExpedicaoPortaria = lazyPage(() => import('./pages/ExpedicaoPortaria'), 'ExpedicaoPortaria')
const EngenhariaRevisoesBOM = lazyPage(() => import('./pages/EngenhariaRevisoesBOM'), 'EngenhariaRevisoesBOM')
const EngenhariaCentral = lazyPage(() => import('./pages/EngenhariaCentral'), 'EngenhariaCentral')
const PCPDashboardOEE = lazyPage(() => import('./pages/PCPDashboardOEE'), 'PCPDashboardOEE')
const QualidadeDashboardRNC = lazyPage(() => import('./pages/QualidadeDashboardRNC'), 'QualidadeDashboardRNC')
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
const QualidadeProcedimentos = lazyPage(() => import('./pages/qualidade/QualidadeProcedimentos'), 'QualidadeProcedimentos')
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

type ERPProfile = { empresa_id: string | null; is_master: boolean; nivel_admin?: number; perfil?: string; nome?: string }
type AccessResult = { ok: boolean; master: boolean; reason: string; profile: ERPProfile | null }

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <div className="error-screen-card">
            <strong>Erro crítico ao abrir a tela operacional do ERP.</strong>
            <p>{this.state.error.message}</p>
            <button className="primary" type="button" onClick={() => window.location.reload()}>
              Recarregar Interface
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function MasterOnly({ children, allowed }: { children: ReactNode; allowed: boolean }) {
  if (!allowed) {
    return (
      <div className="error-screen">
        <div className="error-screen-card">
          <strong>Acesso restrito ao Master.</strong>
          <p>Esta área administrativa exige um perfil Master válido.</p>
          <button className="primary" type="button" onClick={() => window.location.replace('/comercial')}>
            Voltar ao ERP
          </button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function LoadingSkeleton({ label = 'Carregando SYSNQRA ERP & SGQ INDUSTRIAL…' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-skeleton-card">
        <div className="loading-skeleton-brand" />
        <div className="loading-skeleton-line wide" />
        <div className="loading-skeleton-line" />
        <div className="loading-skeleton-line short" />
        <span>{label}</span>
      </div>
    </div>
  )
}

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/comercial'
  return value
}

async function validarAcessoERP(session: Session | null): Promise<AccessResult> {
  if (!supabaseConfigurado || !session?.user) {
    return { ok: false, master: false, reason: 'Sessão de autenticação inválida.', profile: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('erp_usuarios')
    .select('id, auth_user_id, empresa_id, perfil, nivel_admin, is_master, ativo, deleted_at')
    .eq('auth_user_id', session.user.id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (profileError) throw profileError

  if (!profile || profile.auth_user_id !== session.user.id) {
    return { ok: false, master: false, reason: 'Usuário autenticado sem perfil ERP ativo.', profile: null }
  }

  const role = String(profile.perfil ?? '').trim().toUpperCase()
  const master = Boolean(profile.is_master) && Number(profile.nivel_admin ?? 0) >= 100 && role === 'MASTER' && profile.empresa_id === null

  if (master) return { ok: true, master: true, reason: '', profile }

  if (!profile.empresa_id) {
    return { ok: false, master: false, reason: 'Usuário autenticado sem empresa vinculada.', profile }
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('erp_empresas')
    .select('id, ativo')
    .eq('id', profile.empresa_id)
    .eq('ativo', true)
    .maybeSingle()

  if (empresaError) throw empresaError
  if (!empresa?.ativo) return { ok: false, master: false, reason: 'Empresa ERP inativa ou inexistente.', profile }

  return { ok: true, master: false, reason: '', profile }
}

// Router master industrial v7: verified JSX boundary.
export default function AppEntryV2() {
  const routeLocation = useLocation()
  if (routeLocation.pathname === '/configuracoes-adm' || routeLocation.pathname.startsWith('/configuracoes-adm/')) {
    return <Boundary><Suspense fallback={<LoadingSkeleton label="Carregando demonstração visual de Configurações ADM…" />}><ConfiguracoesADMPage /></Suspense></Boundary>
  }
  return <AppIndustrialAuthenticated />
}

function AppIndustrialAuthenticated() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusAcesso, setStatusAcesso] = useState<AccessResult | null>(null)
  const location = useLocation()

  useEffect(() => {
    let active = true

    const validarSessao = async (nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)

      if (!nextSession) {
        setStatusAcesso(null)
        return
      }

      try {
        const access = await validarAcessoERP(nextSession)
        if (active) setStatusAcesso(access)
      } catch {
        if (active) setStatusAcesso({ ok: false, master: false, reason: 'Erro interno de checagem de acesso.', profile: null })
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      void validarSessao(data.session)
      if (active) setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void validarSessao(nextSession)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <LoadingSkeleton />

  const publicRoutes = (
    <Routes>
      <Route path="/" element={<PublicIndustrialHome />} />
      <Route path="/login" element={<IndustrialLoginDirect returnTo={safeReturnTo(new URLSearchParams(location.search).get('returnTo'))} masterMode={false} />} />
      <Route path="/cadastro-master" element={<SetupADMInicial />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contato" element={<Contato />} />
      <Route path="/preview/icones" element={<IndustrialVisualShowcase />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  // DEMO VISUAL ISOLADA: Configurações ADM não depende de Supabase/Auth nesta fase.
  if (location.pathname === '/configuracoes-adm' || location.pathname.startsWith('/configuracoes-adm/')) {
    return (
      <Boundary>
        <Suspense fallback={<LoadingSkeleton label="Carregando demonstração visual de Configurações ADM…" />}>
          <ConfiguracoesADMPage />
        </Suspense>
      </Boundary>
    )
  }

  if (!session) {
    return <Boundary><Suspense fallback={<LoadingSkeleton />}>{publicRoutes}</Suspense></Boundary>
  }

  if (!statusAcesso) {
    return <LoadingSkeleton label="Validando acesso ao SYSNQRA ERP & SGQ INDUSTRIAL…" />
  }

  if (!statusAcesso.ok) {
    return (
      <Boundary>
        <div className="error-screen">
          <div className="error-screen-card">
            <strong>Acesso bloqueado pela Controladoria.</strong>
            <p>{statusAcesso.reason}</p>
            <button className="primary" type="button" onClick={() => void supabase.auth.signOut()}>
              Voltar para o Login
            </button>
          </div>
        </div>
      </Boundary>
    )
  }

  const protectedRoutes = (
    <Routes>
      <Route path="/comercial" element={<AppIndustrial />} />
      <Route path="/erp-industrial" element={<AppIndustrial />} />
      <Route path="/tablet/dashboard" element={<TabletDashboard />} />
      <Route path="/tablet/home" element={<TabletDashboard />} />
      <Route path="/vendas" element={<VendasCentral />} />
      <Route path="/vendas/novo-pedido" element={<PedidoVendaCompleto />} />
      <Route path="/vendas/carteira" element={<VendasCarteira />} />
      <Route path="/vendas/status" element={<VendasStatusPedidos />} />
      <Route path="/vendas/pedido/:id" element={<VendasPedidoStatus />} />
      <Route path="/vendas/catalogo-digital/gestao" element={<VendasCatalogoDigitalGestao />} />
      <Route path="/vendas/clientes" element={<VendasClientesPage />} />
      <Route path="/vendas/catalogo-digital" element={<VendasCatalogoDigital />} />
      <Route path="/vendas/analise-custos" element={<VendasAnaliseCustos />} />
      <Route path="/vendas/dashboard-graficos" element={<VendasDashboardGraficos />} />
      <Route path="/vendas/metas" element={<VendasMetas />} />
      <Route path="/vendas/relatorios" element={<VendasRelatorios />} />
      <Route path="/vendas/configuracoes" element={<VendasConfiguracoes />} />
      <Route path="/pcp" element={<PCPIndustrial />} />
      <Route path="/pcp/ordens" element={<PCPIndustrial />} />
      <Route path="/pcp/demanda" element={<PCPIndustrial />} />
      <Route path="/pcp/materiais" element={<PCPIndustrial />} />
      <Route path="/pcp/paradas" element={<PCPParadas />} />
      <Route path="/pcp/sequenciamento" element={<PCPSequenciamento />} />
      <Route path="/pcp/planejamento" element={<PCPPlanejamentoIndustrial />} />
      <Route path="/pcp/dashboard-oee" element={<PCPDashboardOEE />} />
      <Route path="/pcp/tablet-operador" element={<PCPTabletOperador />} />
      <Route path="/qualidade" element={<QualidadeIndustrial />} />
      <Route path="/qualidade/instrumentos" element={<QualidadeIndustrial />} />
      <Route path="/qualidade/liberacao-lote" element={<AcompanhamentoNaoConformidade />} />
      <Route path="/qualidade/dashboard-rnc" element={<QualidadeDashboardRNC />} />
      <Route path="/qualidade/pfmea" element={<QualidadePFMEA />} />
      <Route path="/qualidade/documentos" element={<DocumentosQualidadeControle />} />
      <Route path="/qualidade/inspecao-processo" element={<QualidadeInspecaoProcesso />} />
      <Route path="/qualidade/metodologia-8d" element={<QualidadeMetodologia8D />} />
      <Route path="/qualidade/auditoria-5s" element={<QualidadeAuditoria5S />} />
      <Route path="/qualidade/lista-mestre" element={<QualidadeListaMestre />} />
      <Route path="/qualidade/relatorios-documentos" element={<QualidadeRelatoriosDocumentos />} />
      <Route path="/qualidade/metrologia" element={<CentraisIndustriais module="metrologia" />} />
      <Route path="/qualidade/calibracao" element={<CalibracaoIndustrial />} />
      <Route path="/qualidade/editor-it" element={<QualidadeEditorIT />} />
      <Route path="/qualidade/procedimentos" element={<QualidadeProcedimentos />} />
      <Route path="/qualidade/assinatura-it" element={<QualidadeAssinaturaIT />} />
      <Route path="/qualidade/genealogia-lote" element={<QualidadeGenealogiaLote />} />
      <Route path="/qualidade/quarentena" element={<QualidadeQuarentena />} />
      <Route path="/estoque" element={<EstoqueAlmoxarifado />} />
      <Route path="/almoxarifado" element={<EstoqueAlmoxarifado />} />
      <Route path="/estoque/saldos" element={<EstoqueAlmoxarifado />} />
      <Route path="/estoque/ajustes" element={<EstoqueAjustes />} />
      <Route path="/estoque/separacao" element={<EstoqueSeparacao />} />
      <Route path="/estoque/etiquetas" element={<EstoqueEtiquetas />} />
      <Route path="/estoque/recebimento-lotes" element={<EstoqueRecebimentoLotes />} />
      <Route path="/estoque/curva-abc" element={<EstoqueCurvaABC />} />
      <Route path="/produtos" element={<ProdutosVendasIndustrial />} />
      <Route path="/produtos-vendas" element={<ProdutosVendasIndustrial />} />
      <Route path="/cadastro-produtos" element={<ModuloCadastroProdutos />} />
      <Route path="/operacao-industrial" element={<OperacaoIndustrial />} />
      <Route path="/moldes-injecao" element={<MoldesFerramentaria />} />
      <Route path="/ficha-engenharia" element={<FichaEngenharia />} />
      <Route path="/mrp" element={<MRPIndustrial />} />
      <Route path="/qualidade/refugos" element={<CentraisIndustriais module="refugos" />} />
      <Route path="/central-custos-industrial" element={<CentralCustosIndustrial />} />
      <Route path="/expedicao/roteirizacao" element={<ExpedicaoRoteirizacao />} />
      <Route path="/expedicao/portaria" element={<ExpedicaoPortaria />} />
      <Route path="/engenharia" element={<EngenhariaCentral />} />
      <Route path="/engenharia/revisoes-bom" element={<EngenhariaRevisoesBOM />} />
      <Route path="/engenharia/ficha" element={<FichaEngenharia />} />
      <Route path="/engenharia/fichas-processo" element={<FichasProcesso />} />
      <Route path="/financeiro/grafico-desvios" element={<FinanceiroGraficoDesvios />} />
      <Route path="/financeiro/custo-padrao" element={<FinanceiroCustoPadrao />} />
      <Route path="/admin/logs" element={<AdminLogs />} />
      <Route path="/outlook/configuracao" element={<OutlookConfiguracao />} />
      <Route path="/outlook/caixa-entrada" element={<OutlookCaixaEntrada />} />
      <Route path="/compras/fornecedores" element={<FornecedoresIndustrial />} />
      <Route path="/compras/solicitacao-manual" element={<ComprasSolicitacaoManual />} />
      <Route path="/solicitacao-compra" element={<SolicitacaoCompra />} />
      <Route path="/fornecedores" element={<FornecedoresIndustrial />} />
      <Route path="/clientes" element={<ClientesIndustrial />} />
      <Route path="/tabela-precos" element={<TabelaPrecos />} />
      <Route path="/tabelas-preco" element={<TabelaPrecos />} />
      <Route path="/catalogo" element={<CatalogoDigital />} />
      <Route path="/fiscal" element={<Fiscal />} />
      <Route path="/fiscal/emissao" element={<NFeEmissao />} />
      <Route path="/fiscal/previsao-caixa" element={<FiscalPrevisaoCaixa />} />
      <Route path="/fiscal/carteira-nfe" element={<FiscalCarteiraNFe />} />
      <Route path="/fiscal/impostos" element={<FiscalImpostos />} />
      <Route path="/master" element={<MasterOnly allowed={statusAcesso.master}><Master /></MasterOnly>} />
      <Route path="/cadastro-empresa" element={<CadastroEmpresa />} />
      <Route path="/planos" element={<PlanosIndustrial />} />
      <Route path="/teste-erp" element={<TesteERP />} />
      <Route path="/usuarios-admin" element={<UsuariosAdmin />} />
      <Route path="/usuarios" element={<UsuariosAdmin />} />
      <Route path="/configuracoes-adm/*" element={<ConfiguracoesADMPage />} />
      <Route path="/documentos-qualidade" element={<DocumentosQualidadeControle />} />
      <Route path="/recebimento-materiais" element={<RecebimentoMateriais />} />
      <Route path="/manual-usuario" element={<ManualUsuario />} />
      <Route path="/rh" element={<RHIndustrial />} />
      <Route path="/module-overview" element={<ModuleOverviewIndustrial module="erp" />} />
      <Route path="/setup-adm-inicial" element={<SetupADMInicial />} />
      <Route path="/configuracao-lote" element={<ConfiguracaoLote />} />
      <Route path="/configuracao-lote-pcp" element={<ConfiguracaoLotePCP />} />
      <Route path="/custos" element={<CentralCustosIndustrial />} />
      <Route path="/ajuda/assistente" element={<AssistenteAjudaERP />} />
      <Route path="/ajuda" element={<AssistenteAjudaERP />} />
      <Route path="/compras/solicitacao" element={<ComprasSolicitacaoManual />} />
      <Route path="/compras-solicitacao" element={<ComprasSolicitacaoManual />} />
      <Route path="/manutencao/ordens" element={<ManutencaoOrdens />} />
      <Route path="/fiscal/carteira" element={<FiscalCarteiraNFe />} />
      <Route path="/qualidade/rnc" element={<QualidadeDashboardRNC />} />
      <Route path="/estoque/recebimento" element={<EstoqueRecebimentoLotes />} />
      <Route path="/fichas-processo" element={<FichasProcesso />} />
      <Route path="*" element={<Navigate to="/comercial" replace />} />
    </Routes>
  )

  return (
    <Boundary>
      <Suspense fallback={<LoadingSkeleton />}>
        {protectedRoutes}
      </Suspense>
    </Boundary>
  )
}
