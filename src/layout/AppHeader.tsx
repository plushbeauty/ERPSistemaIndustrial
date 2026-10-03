import { LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Search, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import ThemeToggleButton from '../components/common/ThemeToggleButton'
import TabletLaunchpad from '../components/TabletLaunchpad'
import Sidebar from './Sidebar'

interface AjudaContextual {
  rota: string
  busca: string
}

const AJUDA_CONTEXTUAL: AjudaContextual[] = [
  { rota: '/vendas/novo-pedido', busca: 'como lançar pedido de venda' },
  { rota: '/qualidade/calibracao', busca: 'como preencher calibração' },
  { rota: '/fichas-processo', busca: 'como preencher ficha de processo' },
  { rota: '/qualidade/liberacao-lote', busca: 'como funciona o laudo de liberação' },
  { rota: '/manutencao/ordens', busca: 'como fechar ordem de serviço tpm' },
  { rota: '/expedicao/roteirizacao', busca: 'como funciona a roteirização' },
]

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [tabletOpen, setTabletOpen] = useState(false)

  const visibleRoutes = ['/erp-industrial','/master','/usuarios','/pcp','/pcp/tablet-operador','/operacao-industrial','/produtos-vendas','/qualidade','/qualidade/calibracao','/qualidade/documentos','/qualidade/editor-it','/qualidade/procedimentos','/qualidade/assinatura-it','/qualidade/liberacao-lote','/qualidade/genealogia-lote','/qualidade/quarentena','/qualidade/rnc','/fichas-processo','/engenharia/fichas-processo','/manutencao/ordens','/expedicao/roteirizacao','/manual-usuario','/compras-solicitacao','/fiscal','/fiscal/previsao-caixa','/teste-erp','/rh','/estoque','/almoxarifado','/fornecedores','/clientes','/tabelas-preco','/recebimento-materiais','/engenharia','/moldes-injecao','/vendas/novo-pedido','/financeiro','/financeiro/reconciliacao','/financeiro/importar-extratos','/financeiro/ano-fiscal','/financeiro/fluxo-caixa'];
  const visible = visibleRoutes.some((route) => location.pathname === route || location.pathname.startsWith(route + '/'))
  useEffect(() => {
    if (!visible) return
    const fn = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('sgq-global-search')?.focus()
      }
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [visible])

  if (!visible) return null

  const openTablet = () => setTabletOpen(true)
  const abrirAjudaContextual = () => {
    const contexto = AJUDA_CONTEXTUAL.find((item) => location.pathname === item.rota || location.pathname.startsWith(item.rota + '/'))
    const busca = contexto?.busca ?? 'ajuda desta tela'
    navigate(`/ajuda/assistente?busca=${encodeURIComponent(busca)}`)
  }

  return <>
    <header className="sgq-app-header">
      <div className="sgq-header-left"><button className="sgq-icon-button sgq-desktop-menu" onClick={toggleSidebar} aria-label="Alternar menu">{isExpanded ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button><button className="sgq-icon-button sgq-mobile-menu" onClick={toggleMobileSidebar} aria-label={isMobileOpen ? 'Fechar menu' : 'Abrir menu'}><Menu size={21}/></button><div className="sgq-header-brand"><img src="/logo/sgq-erp.png" alt="" /><div><strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><span>Gestão integrada e multiempresa</span></div></div></div>
      <div className="sgq-header-search"><Search size={17}/><input id="sgq-global-search" placeholder="Buscar no ERP..." aria-label="Buscar no ERP" /><kbd>Ctrl K</kbd></div>
      <div className="sgq-header-actions">
        <button type="button" onClick={abrirAjudaContextual} aria-label="Abrir ajuda desta tela" className="bg-slate-900 text-white font-bold h-11 px-4 text-sm rounded-lg flex items-center gap-1.5 shadow-md transition-colors hover:bg-slate-800">
          <HelpCircle className="h-4 w-4 text-blue-400" /> AJUDA DESTA TELA
        </button>
        <button type="button" className="v7-nav-tablet-trigger" onClick={openTablet} aria-label="Abrir Painel Tablet"><LayoutGrid size={12}/><span>Painel Tablet</span></button>
        <ThemeToggleButton/><span className="sgq-user-chip">Usuário</span>
      </div>
    </header>
    <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={(route) => { setTabletOpen(false); navigate(route) }} />
  </>
}
