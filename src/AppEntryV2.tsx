import { Component, type ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'

import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'
import './styles/public-contact.css'
import './styles/visual-showcase-2026.css'
import './styles/module-overview.css'
import './styles/erp-ui-pass-2026.css'
import './styles/industrial-plans.css'

import IndustrialLoginDirect from './IndustrialLoginDirect'

const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const PublicIndustrialHome = lazy(() => import('./PublicIndustrialHome'))
const IndustrialVisualShowcase = lazy(() => import('./components/IndustrialVisualShowcase'))
const Blog = lazy(() => import('./pages/Blog'))
const Contato = lazy(() => import('./pages/Contato'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const NFeEmissao = lazy(() => import('./pages/NFeEmissao'))
const FiscalPrevisaoCaixa = lazy(() => import('./pages/FiscalPrevisaoCaixa'))
const FiscalCarteiraNFe = lazy(() => import('./pages/FiscalCarteiraNFe'))
const FiscalImpostos = lazy(() => import('./pages/FiscalImpostos'))
const Master = lazy(() => import('./pages/Master'))
const PCPIndustrial = lazy(() => import('./pages/PCPIndustrial'))
const PCPParadas = lazy(() => import('./pages/PCPParadas'))
const PCPSequenciamento = lazy(() => import('./pages/PCPSequenciamento'))
const PCPPlanejamentoIndustrial = lazy(() => import('./pages/PCPPlanejamentoIndustrial'))
const MRPIndustrial = lazy(() => import('./pages/MRPIndustrial'))
const CentraisIndustriais = lazy(() => import('./pages/CentraisIndustriais'))
const QualidadeIndustrial = lazy(() => import('./pages/QualidadeIndustrial'))
const AcompanhamentoNaoConformidade = lazy(() => import('./pages/AcompanhamentoNaoConformidade'))
const EstoqueAlmoxarifado = lazy(() => import('./pages/EstoqueAlmoxarifado'))
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'))
const ModuloCadastroProdutos = lazy(() => import('./pages/cadastro-produtos/ModuloCadastroProdutos'))
const TabletDashboard = lazy(() => import('./pages/TabletDashboard'))
const PedidoVendaCompleto = lazy(() => import('./pages/PedidoVendaCompleto'))
const VendasCentral = lazy(() => import('./pages/VendasCentral'))
const VendasCatalogoDigital = lazy(() => import('./pages/VendasCatalogoDigital'))
const VendasAnaliseCustos = lazy(() => import('./pages/VendasAnaliseCustos'))
const VendasDashboardGraficos = lazy(() => import('./pages/VendasDashboardGraficos'))
const VendasMetas = lazy(() => import('./pages/VendasMetas'))
const VendasRelatorios = lazy(() => import('./pages/VendasRelatorios'))
const VendasCarteira = lazy(() => import('./pages/VendasCarteira'))
const CentralCustosIndustrial = lazy(() => import('./pages/CentralCustosIndustrial'))
const CadastroEmpresa = lazy(() => import('./pages/CadastroEmpresa'))
const PlanosIndustrial = lazy(() => import('./pages/PlanosIndustrial'))
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'))
const TesteERP = lazy(() => import('./pages/TesteERP'))
const UsuariosAdmin = lazy(() => import('./pages/UsuariosAdmin'))
const ConfiguracoesADMPage = lazy(() => import('./pages/configuracoes/ConfiguracoesADM'))
const DocumentosQualidadeControle = lazy(() => import('./pages/DocumentosQualidadeControle'))
const RecebimentoMateriais = lazy(() => import('./pages/RecebimentoMateriais'))
const ManualUsuario = lazy(() => import('./pages/ManualUsuario'))
const RHIndustrial = lazy(() => import('./pages/RHIndustrial'))
const ModuleOverviewIndustrial = lazy(() => import('./pages/ModuleOverviewIndustrial'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const RecuperarSenha = lazy(() => import('./pages/RecuperarSenha'))
const ConfiguracaoLote = lazy(() => import('./pages/ConfiguracaoLote'))
const FichaEngenharia = lazy(() => import('./pages/FichaEngenharia'))
const ConfiguracaoLotePCP = lazy(() => import('./pages/ConfiguracaoLotePCP'))
const FornecedoresIndustrial = lazy(() => import('./pages/FornecedoresIndustrial'))
const ClientesIndustrial = lazy(() => import('./pages/ClientesIndustrial'))
const TabelaPrecos = lazy(() => import('./pages/TabelaPrecos'))
const CatalogoDigital = lazy(() => import('./pages/CatalogoDigital'))
const FichasProcesso = lazy(() => import('./pages/FichasProcesso'))
const AssistenteAjudaERP = lazy(() => import('./pages/AssistenteAjudaERP'))
const ComprasSolicitacaoManual = lazy(() => import('./pages/ComprasSolicitacaoManual'))
const ExpedicaoPortaria = lazy(() => import('./pages/ExpedicaoPortaria'))
const EngenhariaRevisoesBOM = lazy(() => import('./pages/EngenhariaRevisoesBOM'))
const EngenhariaCentral = lazy(() => import('./pages/EngenhariaCentral'))
const PCPDashboardOEE = lazy(() => import('./pages/PCPDashboardOEE'))
const QualidadeDashboardRNC = lazy(() => import('./pages/QualidadeDashboardRNC'))
const EstoqueCurvaABC = lazy(() => import('./pages/EstoqueCurvaABC'))
const FinanceiroGraficoDesvios = lazy(() => import('./pages/FinanceiroGraficoDesvios'))
const ExpedicaoRoteirizacao = lazy(() => import('./pages/ExpedicaoRoteirizacao'))
const QualidadePFMEA = lazy(() => import('./pages/QualidadePFMEA'))
const ManutencaoOrdens = lazy(() => import('./pages/ManutencaoOrdens'))
const PCPTabletOperador = lazy(() => import('./pages/PCPTabletOperador'))
const EstoqueAjustes = lazy(() => import('./pages/EstoqueAjustes'))
const EstoqueSeparacao = lazy(() => import('./pages/EstoqueSeparacao'))
const EstoqueEtiquetas = lazy(() => import('./pages/EstoqueEtiquetas'))
const EstoqueRecebimentoLotes = lazy(() => import('./pages/estoque/EstoqueRecebimentoLotes'))
const QualidadeGenealogiaLote = lazy(() => import('./pages/qualidade/QualidadeGenealogiaLote'))
const QualidadeEditorIT = lazy(() => import('./pages/qualidade/QualidadeEditorIT'))
const QualidadeAssinaturaIT = lazy(() => import('./pages/qualidade/QualidadeAssinaturaIT'))
const QualidadeProcedimentos = lazy(() => import('./pages/qualidade/QualidadeProcedimentos'))
const QualidadeQuarentena = lazy(() => import('./pages/qualidade/QualidadeQuarentena'))
const FinanceiroCustoPadrao = lazy(() => import('./pages/FinanceiroCustoPadrao'))
const OutlookConfiguracao = lazy(() => import('./pages/OutlookConfiguracao'))
const OutlookCaixaEntrada = lazy(() => import('./pages/OutlookCaixaEntrada'))
const AdminLogs = lazy(() => import('./pages/AdminLogs'))
const CalibracaoIndustrial = lazy(() => import('./pages/CalibracaoIndustrial'))
const QualidadeRelatoriosDocumentos = lazy(() => import('./pages/QualidadeRelatoriosDocumentos'))
const QualidadeListaMestre = lazy(() => import('./pages/QualidadeListaMestre'))
const QualidadeAuditoria5S = lazy(() => import('./pages/QualidadeAuditoria5S'))
const QualidadeMetodologia8D = lazy(() => import('./pages/QualidadeMetodologia8D'))
const QualidadeInspecaoProcesso = lazy(() => import('./pages/QualidadeInspecaoProcesso'))
const MoldesFerramentaria = lazy(() => import('./pages/MoldesFerramentaria'))
const OperacaoIndustrial = lazy(() => import('./pages/OperacaoIndustrial'))

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
      <Route path="/vendas/clientes" element={<ClientesIndustrial />} />
      <Route path="/vendas/catalogo-digital" element={<VendasCatalogoDigital />} />
      <Route path="/vendas/analise-custos" element={<VendasAnaliseCustos />} />
      <Route path="/vendas/dashboard-graficos" element={<VendasDashboardGraficos />} />
      <Route path="/vendas/metas" element={<VendasMetas />} />
      <Route path="/vendas/relatorios" element={<VendasRelatorios />} />
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
