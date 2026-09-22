import { LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSidebar } from '../context/SidebarContext'
import ThemeToggleButton from '../components/common/ThemeToggleButton'
import TabletLaunchpad from '../components/TabletLaunchpad'

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const [visible, setVisible] = useState(false)
  const [tabletOpen, setTabletOpen] = useState(false)
  useEffect(() => { const p = location.pathname; setVisible(p === '/erp-industrial' || p === '/master' || p === '/usuarios' || p === '/pcp' || p === '/operacao-industrial' || p === '/produtos-vendas' || p === '/qualidade' || p === '/qualidade/documentos' || p === '/manual-usuario' || p === '/compras-solicitacao' || p === '/fiscal' || p === '/fiscal/previsao-caixa' || p === '/teste-erp' || p === '/rh' || p === '/estoque' || p === '/almoxarifado' || p === '/fornecedores' || p === '/clientes' || p === '/tabelas-preco' || p === '/recebimento-materiais' || p === '/engenharia' || p === '/moldes-injecao') }, [])
  useEffect(() => { if (!visible) return; const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('sgq-global-search')?.focus() } }; document.addEventListener('keydown', fn); return () => document.removeEventListener('keydown', fn) }, [visible])
  if (!visible) return null
  const openTablet = () => setTabletOpen(true)
  return <>
  <header className="sgq-app-header"><div className="sgq-header-left"><button className="sgq-icon-button sgq-desktop-menu" onClick={toggleSidebar} aria-label="Alternar menu">{isExpanded ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button><button className="sgq-icon-button sgq-mobile-menu" onClick={toggleMobileSidebar} aria-label={isMobileOpen ? 'Fechar menu' : 'Abrir menu'}><Menu size={21}/></button><div className="sgq-header-brand"><img src="/logo-industrial.svg" alt=""/><div><strong>SGQ ERP Industrial</strong><span>Gestão integrada e multiempresa</span></div></div></div><div className="sgq-header-search"><Search size={17}/><input id="sgq-global-search" placeholder="Buscar no ERP..." aria-label="Buscar no ERP"/><kbd>Ctrl K</kbd></div><div className="sgq-header-actions"><button type="button" className="v7-nav-tablet-trigger" onClick={openTablet} aria-label="Abrir Painel Tablet"><LayoutGrid size={16}/><span>Painel Tablet</span></button><ThemeToggleButton/><span className="sgq-user-chip">Usuário</span></div></header>
  <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={(route) => { setTabletOpen(false); location.href = route }} />
  </>
}
