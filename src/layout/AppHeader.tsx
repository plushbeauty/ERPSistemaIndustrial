import { CalendarClock, LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Search, UserCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSidebar } from '../context/SidebarContext'
import ThemeToggleButton from '../components/common/ThemeToggleButton'
import TabletLaunchpad from '../components/TabletLaunchpad'
import PwaInstallButton from '../components/PwaInstallButton'
import { supabase } from '../lib/supabaseClient'

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const [visible, setVisible] = useState(false)
  const [tabletOpen, setTabletOpen] = useState(false)
  const [userName, setUserName] = useState('Usuário')
  const [userRole, setUserRole] = useState('')
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id=window.setInterval(()=>setNow(new Date()),1000); return ()=>window.clearInterval(id) }, [])
  useEffect(() => { void (async()=>{ const {data}=await supabase.auth.getUser(); if(!data.user)return; const {data:profile}=await supabase.from('erp_usuarios').select('nome,perfil').eq('auth_user_id',data.user.id).eq('ativo',true).maybeSingle(); if(profile){setUserName(profile.nome||data.user.email||'Usuário');setUserRole(profile.perfil||'')} else setUserName(data.user.email||'Usuário') })() }, [])
  useEffect(() => { const p = location.pathname; setVisible(p === '/erp-industrial' || p === '/master' || p === '/usuarios' || p === '/pcp' || p === '/operacao-industrial' || p === '/produtos-vendas' || p === '/qualidade' || p === '/qualidade/documentos' || p === '/manual-usuario' || p === '/compras-solicitacao' || p === '/fiscal' || p === '/fiscal/previsao-caixa' || p === '/teste-erp' || p === '/rh' || p === '/estoque' || p === '/almoxarifado' || p === '/fornecedores' || p === '/clientes' || p === '/tabelas-preco' || p === '/recebimento-materiais' || p === '/engenharia' || p === '/moldes-injecao') }, [])
  useEffect(() => { if (!visible) return; const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('sgq-global-search')?.focus() } }; document.addEventListener('keydown', fn); return () => document.removeEventListener('keydown', fn) }, [visible])
  if (!visible) return null
  const openTablet = () => setTabletOpen(true)
  return <>
  <header className="sgq-app-header"><div className="sgq-header-left"><button className="sgq-icon-button sgq-desktop-menu" onClick={toggleSidebar} aria-label="Alternar menu">{isExpanded ? <PanelLeftClose size={19}/> : <PanelLeftOpen size={19}/>}</button><button className="sgq-icon-button sgq-mobile-menu" onClick={toggleMobileSidebar} aria-label={isMobileOpen ? 'Fechar menu' : 'Abrir menu'}><Menu size={21}/></button><div className="sgq-header-brand"><img src="/logo-industrial.svg" alt=""/><div><strong>SGQ ERP Industrial</strong><span>Gestão integrada e multiempresa</span></div></div></div><div className="sgq-header-search"><Search size={17}/><input id="sgq-global-search" placeholder="Buscar no ERP..." aria-label="Buscar no ERP"/><kbd>Ctrl K</kbd></div><div className="sgq-header-actions"><button type="button" className="v7-nav-tablet-trigger" onClick={openTablet} aria-label="Abrir Painel Tablet"><LayoutGrid size={16}/><span>Painel Tablet</span></button><ThemeToggleButton/><div className="sgq-header-user"><UserCircle size={18}/><div><strong>{userName}</strong><small>{userRole||'Usuário ERP'}</small></div></div><div className="sgq-header-clock"><CalendarClock size={17}/><div><strong>{now.toLocaleDateString('pt-BR')}</strong><small>{now.toLocaleTimeString('pt-BR')}</small></div></div><PwaInstallButton /></div></header>
  <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={(route) => { setTabletOpen(false); location.href = route }} />
  </>
}
