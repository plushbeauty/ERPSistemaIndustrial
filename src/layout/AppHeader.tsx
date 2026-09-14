import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSidebar } from '../context/SidebarContext'
import ThemeToggleButton from '../components/common/ThemeToggleButton'

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const [visible, setVisible] = useState(false)
  useEffect(() => { const p = location.pathname; setVisible(p === '/erp-industrial' || p === '/master' || p === '/usuarios' || p === '/pcp' || p === '/operacao-industrial' || p === '/produtos-vendas' || p === '/qualidade' || p === '/qualidade/documentos' || p === '/manual-usuario' || p === '/compras-solicitacao' || p === '/fiscal' || p === '/fiscal/previsao-caixa' || p === '/teste-erp') }, [])
  useEffect(() => { if (!visible) return; const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('sgq-global-search')?.focus() } }; document.addEventListener('keydown', fn); return () => document.removeEventListener('keydown', fn) }, [visible])
  if (!visible) return null
  return <header className="sgq-app-header"><div className="sgq-header-left"><button className="sgq-icon-button sgq-desktop-menu" onClick={toggleSidebar} aria-label="Alternar menu">{isExpanded ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button><button className="sgq-icon-button sgq-mobile-menu" onClick={toggleMobileSidebar} aria-label={isMobileOpen ? 'Fechar menu' : 'Abrir menu'}><Menu size={21}/></button><div className="sgq-header-brand"><img src="/logo-industrial.svg" alt=""/><div><strong>SGQ ERP Industrial</strong><span>Gestão integrada e multiempresa</span></div></div></div><div className="sgq-header-search"><Search size={17}/><input id="sgq-global-search" placeholder="Buscar no ERP..." aria-label="Buscar no ERP"/><kbd>Ctrl K</kbd></div><div className="sgq-header-actions"><ThemeToggleButton/><button className="sgq-icon-button" aria-label="Notificações" title="Notificações"><Bell size={18}/></button><span className="sgq-user-chip">Usuário</span></div></header>
}
