import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bot, CircleHelp, ChevronDown, UserRound, UserCog, ChevronRight, Home, FileText, Factory, LogOut, Search, X, Ruler, ClipboardList, ShoppingCart, Settings, FilePlus2, Users, Wallet, FolderOpen, Warehouse, Percent, Scale, ShieldCheck, BookOpen, Landmark, Calculator, RotateCcw, Archive, FileWarning, Route, Monitor, BarChart3, Boxes, Barcode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { BarraWindows11 } from './BarraWindows11'
import PCPTabletMenuModal from '../PCPTabletMenuModal'
import PageIntroCard from './PageIntroCard'
import { fallbackPageIntro, hasNativeIntroCard, resolvePageIntro } from './pageIntroCatalog'
import { resolveContextualHelp } from '../../help/contextualHelpCatalog'

type MenuItem = {
  label: string
  route: string
  icon?: LucideIcon
  isNew?: boolean
  isUpdated?: boolean
  action?: 'pcpTablet'
  minNivel?: number
  children?: MenuItem[]
}

const menus: MenuItem[] = [
  { label: 'Financeiro', route: '/pageprincipal/financeiro', icon: Landmark, children: [
    { label: 'Central Financeira', route: '/pageprincipal/financeiro', icon: Wallet, isUpdated: true },
    { label: 'Conciliação Bancária', route: '/pageprincipal/financeiro/conciliacao-bancaria', icon: ClipboardList },
    { label: 'Importar Extratos', route: '/pageprincipal/financeiro/importar-extratos', icon: FileText, isUpdated: true },
    { label: 'Lista de Preços por Cliente', route: '/pageprincipal/financeiro/lista-precos-cliente', icon: ShoppingCart, isUpdated: true },
    { label: 'Retificação de Pedido', route: '/pageprincipal/financeiro/retificacao', icon: RotateCcw, isUpdated: true },
    { label: 'Notas de Débito', route: '/pageprincipal/financeiro/notas-debito', icon: FileWarning, isUpdated: true },
    { label: 'Configurações de Notas de Débito', route: '/pageprincipal/financeiro/notas-debito/configuracoes', icon: Settings, isUpdated: true },
  ] },
  { label: 'Comissões', route: '/pageprincipal/comissoes', icon: Calculator, isUpdated: true, children: [
    { label: 'Regras de Comissão', route: '/pageprincipal/comissoes/regras', icon: ClipboardList, isUpdated: true },
    { label: 'Cálculo de Comissão', route: '/pageprincipal/comissoes/calculo', icon: Calculator, isUpdated: true },
    { label: 'Perfil do Vendedor', route: '/pageprincipal/comissoes/perfil', icon: UserRound, isUpdated: true },
  ] },
  { label: 'Controladoria', route: '/pageprincipal/controladoria', icon: BookOpen, isUpdated: true, children: [
    { label: 'Lucratividade e Margens', route: '/pageprincipal/controladoria/lucratividade', icon: ClipboardList, isUpdated: true },
    { label: 'Razão Geral', route: '/pageprincipal/controladoria/razao-geral', icon: Landmark, isUpdated: true },
    { label: 'Cadastro de Decimais', route: '/pageprincipal/controladoria/cadastro-decimais', icon: Settings, isUpdated: true },
    { label: 'Estorno Documental', route: '/pageprincipal/controladoria/retificacao-assistente', icon: FileText, isUpdated: true },
    { label: 'Auditoria de Comissões', route: '/pageprincipal/controladoria/auditoria-comissoes', icon: Calculator, isUpdated: true },
  ] },
  { label: 'Principal', route: '/pageprincipal', icon: Home },
  { label: 'Cadastros Mestres', route: '/pageprincipal/cadastros/produtos', icon: Boxes, children: [
    { label: 'Cadastro de Produtos', route: '/pageprincipal/cadastros/produtos', icon: Boxes, isUpdated: true },
    { label: 'Ficha Técnica e Etiquetas', route: '/pageprincipal/cadastros/produtos/ficha-tecnica', icon: FileText, isUpdated: true },
    { label: 'Parâmetros de Código', route: '/pageprincipal/cadastros/produtos/parametros-codigo', icon: Barcode, isUpdated: true },
  ] },
  { label: 'RH / Departamento Pessoal', route: '/pageprincipal/rh', icon: Users, isUpdated: true },
  { label: 'Engenharia e PCP', route: '/pageprincipal/pcp', icon: Factory, children: [
    { label: 'Central PCP', route: '/pageprincipal/pcp', icon: ClipboardList },
    { label: 'Fichas de Processo', route: '/pageprincipal/pcp/fichas-processo', icon: ClipboardList, isUpdated: true },
    { label: 'Roteiro de Operações', route: '/pageprincipal/pcp/roteiros', icon: Route, isUpdated: true },
    { label: 'Carga e Capacidade', route: '/pageprincipal/pcp/capacidade', icon: BarChart3, isUpdated: true },
  ] },
  { label: 'Chão de Fábrica', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, isUpdated: true, children: [
    { label: 'Portal do Operador', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, isUpdated: true },
    { label: 'Postos de Trabalho', route: '/pageprincipal/chao-de-fabrica/postos', icon: ClipboardList, isUpdated: true },
  ] },
  { label: 'Estoque e Almoxarifado', route: '/pageprincipal/estoque/auditoria-saldos', icon: Warehouse, isUpdated: true, children: [
    { label: 'Auditoria de Saldos', route: '/pageprincipal/estoque/auditoria-saldos', icon: Scale, isUpdated: true },
    { label: 'Balanço de Estoque', route: '/pageprincipal/estoque/balanco', icon: Archive, isUpdated: true },
    { label: 'Regras de Depreciação', route: '/pageprincipal/estoque/depreciacao', icon: Percent, isUpdated: true },
  ] },
  { label: 'Qualidade / Paquímetro', route: '/pageprincipal/paquimetro', icon: Ruler, children: [
    { label: 'Paquímetro Digital', route: '/pageprincipal/paquimetro', icon: Ruler },
    { label: 'RPNC', route: '/pageprincipal/qualidade/rpnc', icon: ClipboardList, isUpdated: true },
    { label: 'Auditorias da Qualidade', route: '/pageprincipal/qualidade/auditorias', icon: ShieldCheck, isUpdated: true },
    { label: 'GED / Documentos da Qualidade', route: '/pageprincipal/qualidade/ged', icon: FolderOpen, isUpdated: true },
  ] },
  { label: 'Compras', route: '/pageprincipal/compras', icon: ShoppingCart, isUpdated: true, children: [
    { label: 'Central de Compras', route: '/pageprincipal/compras', icon: ShoppingCart, isUpdated: true },
    { label: 'Solicitação de Compra', route: '/pageprincipal/compras/solicitacao', icon: FilePlus2, isUpdated: true },
    { label: 'Requisições de Compra', route: '/pageprincipal/compras/requisicoes', icon: ClipboardList, isUpdated: true },
  ] },
  { label: 'Configurações', route: '/pageprincipal/administracao-configuracoes', icon: Settings },
  { label: 'Configurações de Usuário', route: '/pageprincipal/configuracoes-usuario', icon: UserCog, isUpdated: true, minNivel: 8 },
  { label: 'Fiscal', route: '/pageprincipal/fiscal', icon: FileText, isUpdated: true, children: [
    { label: 'Central Fiscal', route: '/pageprincipal/fiscal', icon: FileText },
    { label: 'Ano Fiscal', route: '/pageprincipal/fiscal/ano', icon: BookOpen, isUpdated: true },
    { label: 'Classificação Fiscal', route: '/pageprincipal/fiscal/classificacao', icon: Landmark, isUpdated: true },
    { label: 'Auditoria Documental', route: '/pageprincipal/fiscal/auditoria-documental', icon: ShieldCheck, isUpdated: true },
    { label: 'Estorno de Lançamentos', route: '/pageprincipal/fiscal/estorno', icon: RotateCcw, isUpdated: true },
    { label: 'Painel Razão Geral', route: '/pageprincipal/fiscal/razao', icon: Scale, isUpdated: true },
  ] },
  { label: 'Central de Ajuda', route: '/pageprincipal/ajuda', icon: CircleHelp },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [moduleSearch, setModuleSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [pcpTabletOpen, setPcpTabletOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [sessionOperator, setSessionOperator] = useState('Usuário ERP')
  const [dataEpoch, setDataEpoch] = useState(0)
  const [sessionNivel, setSessionNivel] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (operatorName !== 'Usuário ERP') return
    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata
      if (typeof metadata?.nome === 'string' && metadata.nome.trim()) setSessionOperator(metadata.nome.trim())
      else if (data.user?.email) setSessionOperator(data.user.email)
    })
  }, [operatorName])

  // Nível administrativo da sessão: restringe itens do menu (ex.: Configurações de Usuário, nível 8/9).
  // É apenas sinalização visual; a concessão real continua no RLS e nas RPCs security definer.
  useEffect(() => {
    let ativo = true
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const usuario = await supabase
        .from('erp_usuarios')
        .select('nivel_admin')
        .eq('auth_user_id', data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle<{ nivel_admin: number }>()
      if (ativo) setSessionNivel(Number(usuario.data?.nivel_admin ?? 0))
    })()
    return () => { ativo = false }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) { setOpenMenu(null); setStartMenuOpen(false);  }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Atualização automática por mudanças reais no banco, sem botão manual.
  // A mudança de dados remonta apenas a área de trabalho (recarrega as consultas da tela);
  // o navegador não é recarregado, para não perder a sessão nem o estado do shell.
  useEffect(() => {
    let refreshTimer: number | undefined
    // Cada montagem recebe um tópico exclusivo: evita reutilizar um canal Realtime
    // ainda inscrito durante remontagens rápidas (StrictMode/navegação).
    const channel = supabase
      .channel(`erp-global-data-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (document.visibilityState !== 'visible') return
        const routeIsEditing = /\/(novo|editar|cadastro|pedido|rfq|emissao|configuracoes|configuracao|form|apontamento|recebimento|transferencia|inventario|assinatura|login)([-/]|$)/i.test(window.location.pathname)
        const active = document.activeElement
        const userIsTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable)
        if (routeIsEditing || userIsTyping) return
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => setDataEpoch(value => value + 1), 900)
      })
      .subscribe()
    return () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  const moduleLabel = pathname.startsWith('/pageprincipal/cadastros') ? 'Cadastros Mestres'
    : pathname.startsWith('/pageprincipal/comissoes') || pathname.startsWith('/comissoes') ? 'Comissões'
    : pathname.startsWith('/pageprincipal/controladoria') || pathname.startsWith('/controladoria') ? 'Controladoria'
    : pathname.startsWith('/pageprincipal/pcp') || pathname.startsWith('/pcp') ? 'Engenharia e PCP'
    : pathname.startsWith('/pageprincipal/chao-de-fabrica') ? 'Chão de Fábrica'
    : pathname.startsWith('/pageprincipal/estoque') ? 'Estoque e Almoxarifado'
    : pathname.startsWith('/pageprincipal/qualidade') ? 'Qualidade / Paquímetro'
    : pathname.startsWith('/pageprincipal/rh') || pathname.startsWith('/rh') ? 'RH / Departamento Pessoal'
    : pathname.startsWith('/pageprincipal/paquimetro') ? 'Qualidade / Paquímetro'
    : pathname.startsWith('/pageprincipal/compras') || pathname.startsWith('/compras') ? 'Compras'
    : pathname.startsWith('/pageprincipal/administracao-configuracoes') || pathname.startsWith('/configuracoes-adm') || pathname.startsWith('/administracao-configuracoes') ? 'Configurações'
    : pathname.startsWith('/pageprincipal/financeiro') || pathname.startsWith('/financeiro') ? 'Financeiro'
    : pathname.startsWith('/pageprincipal/fiscal') || pathname.startsWith('/fiscal') ? 'Fiscal'
    : null
  const visibleMenus: MenuItem[] = menus.filter(menu => menu.minNivel === undefined || sessionNivel >= menu.minNivel)
    .map(menu => (menu.children ? { ...menu, children: menu.children.filter(child => child.minNivel === undefined || sessionNivel >= child.minNivel) } : menu))
  const currentModuleMenu = moduleLabel
    ? visibleMenus.find(menu => menu.label === moduleLabel) ?? { label: moduleLabel, route: '/' + pathname.split('/')[1], icon: Home }
    : undefined
  const current = currentModuleMenu ?? visibleMenus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  const normalizedSearch = moduleSearch.trim().toLocaleLowerCase('pt-BR')
  const searchedMenus = normalizedSearch ? visibleMenus.map(menu => ({ ...menu, children: menu.children?.filter(child => child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) })).filter(menu => menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.route.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || Boolean(menu.children?.length)) : visibleMenus
  useEffect(() => {
    setOpenMenu(null)
    setStartMenuOpen(false)
  }, [pathname])
  const openMenuItem = (item: Pick<MenuItem, 'route' | 'action'>) => {
    if (item.action === 'pcpTablet') {
      setPcpTabletOpen(true)
      setOpenMenu(null)
      return
    }
    go(item.route)
  }

  const contextualHelp = resolveContextualHelp(pathname)
  const menuLeafLabel = current?.children?.find(child => child.route === pathname)?.label ?? current?.label
  const contextualPurpose = contextualHelp.title === 'Ajuda da tela atual' ? undefined : contextualHelp.purpose
  const pageIntro = hasNativeIntroCard(pathname)
    ? null
    : resolvePageIntro(pathname) ?? fallbackPageIntro({ module: current?.label, label: menuLeafLabel, purpose: contextualPurpose })

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const go = (route: string) => {
    setOpenMenu(null)
    
    
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-windows-topbar">
        <div className="erp-windows-start-anchor">
          <button className={`erp-windows-start-button ${startMenuOpen ? 'is-open' : ''}`} type="button" aria-label="Abrir menu principal" aria-expanded={startMenuOpen} title="Menu principal" onClick={() => { setStartMenuOpen(value => !value); setOpenMenu(null) }}>
            <span className="erp-windows-logo" aria-hidden="true"><i /><i /><i /><i /></span><span className="erp-windows-start-label">Menu</span>
          </button>
          {startMenuOpen && <section className="erp-windows-start-menu" aria-label="Menu principal do ERP">
            <div className="erp-windows-start-heading">
              <div><strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><small>Menu de módulos</small></div>
              <button type="button" aria-label="Fechar menu" onClick={() => setStartMenuOpen(false)}><X size={14} /></button>
            </div>
            <label className="erp-windows-menu-search">
              <Search size={14} />
              <input value={moduleSearch} onChange={event => setModuleSearch(event.target.value)} placeholder="Pesquisar módulo ou rotina..." aria-label="Pesquisar módulo ou rotina" />
              {moduleSearch && <button type="button" aria-label="Limpar pesquisa" onClick={() => setModuleSearch('')}><X size={12} /></button>}
            </label>
            <div className="erp-windows-menu-list">
              {searchedMenus.map(menu => {
                const Icon = menu.icon ?? Home
                const hasChildren = Boolean(menu.children?.length)
                const hasNewItems = Boolean(menu.isNew || menu.children?.some(child => child.isNew))
                const expanded = openMenu === menu.label || Boolean(normalizedSearch && menu.children?.length)
                return <div className="erp-windows-menu-group" key={menu.label}>
                  <div className={`erp-windows-menu-row ${current?.label === menu.label ? 'is-active' : ''} ${hasNewItems ? 'has-new' : ''} ${menu.isUpdated ? 'is-updated-orange' : ''}`}>
                    <button type="button" className="erp-windows-menu-main" title={hasNewItems ? 'Este módulo contém telas novas' : undefined} onClick={() => {
                      if (menu.action === 'pcpTablet') { setStartMenuOpen(false); openMenuItem(menu) }
                      else if (hasChildren) { setOpenMenu(value => value === menu.label ? null : menu.label);  }
                      else { setStartMenuOpen(false); openMenuItem(menu) }
                    }}>
                      <Icon size={16} className={menu.isUpdated ? 'is-updated-orange-icon' : hasNewItems ? 'is-new-icon' : undefined} /><span>{menu.label}</span>
                    </button>
                    {hasChildren && <button type="button" className="erp-windows-menu-expand" aria-label={`Expandir ${menu.label}`} aria-expanded={expanded} onClick={() => { setOpenMenu(value => value === menu.label ? null : menu.label);  }}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>}
                  </div>
                  {hasChildren && expanded && <div className="erp-windows-menu-children">
                    {menu.children?.filter(child => !normalizedSearch || child.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || menu.label.toLocaleLowerCase('pt-BR').includes(normalizedSearch)).map(child => { const ChildIcon = child.icon; const active = pathname === child.route; return <button type="button" key={child.label + child.route} className={`${active ? (child.route === '/compras/rfq' ? 'is-active is-rfq-active' : 'is-active') : ''}${child.isNew ? ' is-new' : ''}${child.isUpdated ? ' is-updated-orange' : ''}`} onClick={() => { setStartMenuOpen(false); if (child.action) openMenuItem(child); else go(child.route) }} title={child.isNew ? 'Tela nova' : undefined}>{ChildIcon && <ChildIcon size={14} className={child.isNew ? 'is-new-icon' : undefined} />}<span>{child.label}</span></button> })}
                  </div>}
                </div>
              })}
              {searchedMenus.length === 0 && <p className="erp-windows-no-results">Nenhum módulo ou rotina encontrado.</p>}
            </div>
            <div className="erp-windows-start-footer"><UserRound size={13} /><span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span><button type="button" title="Sair da sessão" onClick={() => void logout()}><LogOut size={13} /> Sair</button></div>
          </section>}
        </div>
        <label className="erp-windows-quick-search">
          <Search size={14} />
          <input value={moduleSearch} onChange={event => { setModuleSearch(event.target.value); setStartMenuOpen(true) }} onFocus={() => { if (moduleSearch) setStartMenuOpen(true) }} placeholder="Pesquisar módulo..." aria-label="Pesquisar módulo" />
          {moduleSearch && <button type="button" aria-label="Limpar pesquisa" onClick={() => setModuleSearch('')}><X size={12} /></button>}
        </label>
        <div className="erp-windows-system-title" aria-live="polite">
          <strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><span>GESTÃO INTEGRADA · v0.1.7</span>
        </div>
        <div className="erp-windows-session">
          <time dateTime={now.toISOString()}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)} <span>·</span> {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' }).format(now)}</time>
          <div className="erp-windows-user"><UserRound size={14} /><span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span></div>
          <button type="button" className="erp-windows-help" title="Ajuda da tela atual" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)}><CircleHelp size={15} /></button>
          <button type="button" className="erp-windows-logout" onClick={() => void logout()} title="Sair da sessão"><LogOut size={13} /></button>
        </div>

      </header>
      <main key={`erp-workspace-${dataEpoch}`} className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {pageIntro && <PageIntroCard {...pageIntro} />}
        {children}
      </main>
      <div className="erp-help-assistant">
        {helpOpen && <section className="erp-help-assistant-panel" role="dialog" aria-label={`Ajuda contextual: ${contextualHelp.title}`} aria-modal="false">
          <header><div className="erp-help-avatar"><Bot size={17}/></div><div><strong>Assistente SYSNQRA</strong><small>Ajuda desta tela</small></div><button type="button" aria-label="Fechar ajuda" onClick={() => setHelpOpen(false)}><X size={16}/></button></header>
          <div className="erp-help-assistant-content">
            <h2>{contextualHelp.title}</h2><p>{contextualHelp.purpose}</p>
            <strong>Como usar</strong><ol>{contextualHelp.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
            <strong>Campos e preenchimento</strong><ul>{contextualHelp.fields.map((field, index) => <li key={index}>{field}</li>)}</ul>
            {contextualHelp.buttons?.length ? <><strong>Botões e ações</strong><ul>{contextualHelp.buttons.map((button, index) => <li key={index}>{button}</li>)}</ul></> : null}
            {contextualHelp.tips?.length ? <><strong>Cuidados importantes</strong><ul>{contextualHelp.tips.map((tip, index) => <li key={index}>{tip}</li>)}</ul></> : null}
            <small className="erp-help-status">{contextualHelp.verified ? 'Orientação cadastrada para esta rotina' : 'Orientação pendente de validação específica'} · {pathname}</small>
            <button className="erp-help-center-link" type="button" onClick={() => { setHelpOpen(false); navigate('/pageprincipal/ajuda') }}>Abrir Central de Ajuda</button>
          </div>
        </section>}
        <button type="button" className="erp-help-floating-button" title="Ajuda desta tela" aria-label="Abrir assistente de ajuda desta tela" aria-expanded={helpOpen} onClick={() => setHelpOpen(value => !value)}>
          <span className="erp-help-floating-avatar"><Bot size={20}/></span><span className="erp-help-floating-label">Ajuda</span>
        </button>
      </div>
      <PCPTabletMenuModal isOpen={pcpTabletOpen} onClose={() => setPcpTabletOpen(false)} onNavigate={(route) => { setPcpTabletOpen(false); go(route) }} />
      <BarraWindows11
        ativo={pathname.startsWith('/pageprincipal/comissoes') || pathname.startsWith('/comissoes') ? 'comissoes' : pathname.startsWith('/pageprincipal/controladoria') || pathname.startsWith('/controladoria') ? 'controladoria' : pathname.startsWith('/pageprincipal/financeiro') || pathname.startsWith('/financeiro') ? 'financeiro' : pathname.startsWith('/pageprincipal/rh') ? 'rh' : pathname.startsWith('/pageprincipal/pcp/fichas-processo') ? 'fichas' : pathname.startsWith('/pageprincipal/compras/solicitacao') ? 'solicitacao' : pathname.startsWith('/pageprincipal/compras/requisicoes') ? 'requisicoes' : pathname.startsWith('/pageprincipal/compras') ? 'compras' : pathname.startsWith('/pageprincipal/qualidade/rpnc') ? 'rpnc' : pathname.startsWith('/pageprincipal/pcp') || pathname.startsWith('/pcp') ? 'pcp' : pathname.startsWith('/pageprincipal/paquimetro') ? 'paq' : pathname.startsWith('/pageprincipal/fiscal') || pathname.startsWith('/fiscal') ? 'fiscal' : pathname.startsWith('/pageprincipal') ? 'home' : ''}
        onAbrir={(id) => {
          const destinations: Record<string, string> = {
            home: '/pageprincipal',
            rh: '/pageprincipal/rh',
            fichas: '/pageprincipal/pcp/fichas-processo',
            pcp: '/pageprincipal/pcp',
            maq: '/pageprincipal/pcp',
            op: '/pageprincipal/pcp',
            paq: '/pageprincipal/paquimetro',
            fiscal: '/pageprincipal/fiscal',
            compras: '/pageprincipal/compras',
            solicitacao: '/pageprincipal/compras/solicitacao',
            requisicoes: '/pageprincipal/compras/requisicoes',
            rpnc: '/pageprincipal/qualidade/rpnc',
            financeiro: '/pageprincipal/financeiro',
            comissoes: '/pageprincipal/comissoes',
            controladoria: '/pageprincipal/controladoria',
          }
          go(destinations[id] ?? '/pageprincipal')
        }}
      />

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%);color:#123b50}
        .erp-windows-topbar{height:48px;min-height:48px;display:grid;grid-template-columns:auto minmax(145px,210px) minmax(220px,1fr) auto;align-items:center;gap:10px;padding:0 10px;background:#fff;border-bottom:1px solid #cbd5e1;box-sizing:border-box;position:sticky;top:0;z-index:1600;color:#111827}
        .erp-windows-start-anchor{position:relative;height:100%;display:flex;align-items:center}
        .erp-windows-start-button{min-width:76px;height:34px;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 8px;border:1px solid #d1d5db;border-radius:2px;background:#fff;cursor:pointer}
        .erp-windows-start-button:hover,.erp-windows-start-button.is-open{background:#eaf5f8;border-color:#2d8db8}
        .erp-windows-logo{width:17px;height:17px;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:2px;flex:0 0 17px;transform:skewY(-4deg)}.erp-windows-logo i{display:block;background:#2d8db8}.erp-windows-logo i:nth-child(2),.erp-windows-logo i:nth-child(3){background:#48b7c7}.erp-windows-start-label{font-size:11px;font-weight:700;color:#123b50}
        .erp-windows-quick-search,.erp-windows-menu-search{height:30px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid #cbd5e1;background:#fff;color:#475569;box-sizing:border-box}
        .erp-windows-quick-search:focus-within,.erp-windows-menu-search:focus-within{border-color:#2d8db8;box-shadow:0 0 0 1px rgba(45,141,184,.15)}
        .erp-windows-quick-search input,.erp-windows-menu-search input{width:100%;min-width:0;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;font-size:11px!important;color:#111827}
        .erp-windows-quick-search button,.erp-windows-menu-search button{border:0;background:transparent;display:flex;align-items:center;justify-content:center;padding:2px;cursor:pointer}
        .erp-windows-system-title{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;line-height:1.15;text-align:center}
        .erp-windows-system-title strong{font-size:13px;font-weight:800;letter-spacing:.06em;color:#123b50;white-space:nowrap}
        .erp-windows-system-title span{font-size:9px;font-weight:600;color:#64748b;letter-spacing:.06em;white-space:nowrap}
        .erp-windows-session{display:flex;align-items:center;justify-content:flex-end;gap:9px;min-width:0;font-size:10px;color:#111827}
        .erp-windows-session time{white-space:nowrap;font-variant-numeric:tabular-nums}
        .erp-windows-session time span{color:#94a3b8;padding:0 2px}
        .erp-windows-user{display:flex;align-items:center;gap:5px;max-width:190px;min-width:0;padding-left:9px;border-left:1px solid #e2e8f0}
        .erp-windows-user span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
        .erp-windows-help,.erp-windows-logout{width:27px;height:27px;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;background:#fff;color:#334155;border-radius:2px;cursor:pointer}
        .erp-windows-help:hover,.erp-windows-logout:hover{background:#eaf5f8;border-color:#b9d4df}
        .erp-windows-start-menu{position:absolute;top:47px;left:0;width:min(340px,calc(100vw - 16px));max-height:min(72vh,620px);display:flex;flex-direction:column;background:#fff;border:1px solid #cbd5e1;box-shadow:0 12px 32px rgba(15,23,42,.2);z-index:1800}
        .erp-windows-start-heading{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
        .erp-windows-start-heading div{display:flex;flex-direction:column;gap:2px}.erp-windows-start-heading strong{font-size:11px;color:#123b50}.erp-windows-start-heading small{font-size:9px;color:#64748b}
        .erp-windows-start-heading>button{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;cursor:pointer}
        .erp-windows-menu-search{margin:9px 10px 7px;flex:0 0 30px}
        .erp-windows-menu-list{padding:0 6px 8px;overflow:auto;min-height:0}
        .erp-windows-menu-row{min-height:34px;display:flex;align-items:center;border:1px solid transparent}
        .erp-windows-menu-row.is-active{background:#edf6fa;border-color:#d5e8ef}
        .erp-windows-menu-main>svg.is-new-icon,.erp-windows-menu-children button.is-new>svg.is-new-icon{color:#C65D00!important}
        .erp-windows-menu-row.is-updated-orange{border-left:3px solid #f97316;background:#fff7ed!important}
        .erp-windows-menu-row.is-updated-orange .erp-windows-menu-main{color:#c2410c!important;font-weight:800}
        .erp-windows-menu-row.is-updated-orange .is-updated-orange-icon{color:#f97316!important}
        .erp-windows-menu-main{flex:1;min-width:0;min-height:32px;display:flex;align-items:center;gap:9px;padding:0 8px;border:0;background:transparent;text-align:left;color:#1e293b;font-size:11px;cursor:pointer}
        .erp-windows-menu-main span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-menu-main:hover,.erp-windows-menu-expand:hover{background:#f1f5f9}
        .erp-windows-menu-expand{width:30px;align-self:stretch;display:flex;align-items:center;justify-content:center;border:0;background:transparent;cursor:pointer;color:#475569}
        .erp-windows-menu-children{margin:0 0 4px 24px;padding:2px 0 2px 8px;border-left:1px solid #cbd5e1}
        .erp-windows-menu-children button{display:flex;align-items:center;gap:8px;width:100%;min-height:29px;padding:5px 8px;border:0;background:#fff;text-align:left;color:#334155;font-size:10px;cursor:pointer}
        .erp-windows-menu-children button>svg{flex:0 0 auto}.erp-windows-menu-children button>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-menu-children button:hover,.erp-windows-menu-children button.is-active{background:#eaf5f8;color:#123b50}
        .erp-windows-menu-children button.is-rfq-active{background:#1d5fd1!important;border-color:#1d5fd1!important;color:#fff!important;font-weight:800;box-shadow:inset 3px 0 #0b2545}\n        .erp-windows-menu-children button.is-updated-orange{background:#f97316!important;border:1px solid #ea580c!important;color:#fff!important;font-weight:900;box-shadow:inset 4px 0 #9a3412}\n        .erp-windows-menu-children button.is-updated-orange:hover,.erp-windows-menu-children button.is-updated-orange.is-active{background:#ea580c!important;border-color:#c2410c!important;color:#fff!important}
        .erp-windows-no-results{margin:12px 8px;font-size:10px;color:#64748b}
        .erp-windows-start-footer{min-height:38px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:10px;color:#334155}
        .erp-windows-start-footer span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .erp-windows-start-footer button{height:25px;display:flex;align-items:center;gap:4px;padding:0 7px;border:1px solid #cbd5e1;background:#fff;border-radius:2px;font-size:10px;cursor:pointer}
        .erp-windows-help-panel{position:absolute;right:40px;top:46px;z-index:1800;width:min(370px,90vw);max-height:75vh;overflow:auto;padding:10px 12px;border:1px solid #b9cbd3;background:#fff;box-shadow:0 6px 16px rgba(18,59,80,.16);font-size:10px;line-height:1.45;color:#173b4a}
        .erp-windows-help-panel p{margin:5px 0}.erp-windows-help-panel ol,.erp-windows-help-panel ul{margin:4px 0 8px;padding-left:17px}.erp-windows-help-panel li{margin-bottom:3px}.erp-windows-help-panel small{display:block;border-top:1px solid #e2e8f0;padding-top:7px;color:#647b85}
        .erp-windows-help-panel>button{margin-top:7px;height:28px;padding:0 9px;border:1px solid #2d8db8;background:#2d8db8;color:#fff;border-radius:2px;cursor:pointer}
        .erp-help-assistant{position:fixed;right:18px;bottom:82px;z-index:2200;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
        .erp-help-floating-button{display:flex;align-items:center;gap:7px;height:42px;padding:0 12px 0 6px;border:1px solid #1d6688;border-radius:24px;background:#123b50;color:#fff;box-shadow:0 4px 14px rgba(18,59,80,.25);cursor:pointer;transition:transform .15s,box-shadow .15s}
        .erp-help-floating-button:hover{transform:translateY(-2px);box-shadow:0 7px 18px rgba(18,59,80,.3)}
        .erp-help-floating-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#48b7c7;color:#123b50}
        .erp-help-floating-label{font-size:11px;font-weight:800;letter-spacing:.02em}
        .erp-help-assistant-panel{width:min(390px,calc(100vw - 28px));max-height:min(72vh,680px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #b9d4df;border-radius:12px;background:#fff;box-shadow:0 12px 36px rgba(18,59,80,.24);color:#173b4a}
        .erp-help-assistant-panel>header{display:flex;align-items:center;gap:9px;padding:12px 14px;background:#123b50;color:#fff}
        .erp-help-avatar{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:#48b7c7;color:#123b50}
        .erp-help-assistant-panel>header>div:nth-child(2){display:flex;flex:1;flex-direction:column;gap:2px}
        .erp-help-assistant-panel>header strong{font-size:12px}.erp-help-assistant-panel>header small{font-size:10px;color:#d5eaf0}
        .erp-help-assistant-panel>header>button{width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:#fff;cursor:pointer}
        .erp-help-assistant-panel>header>button:hover{background:rgba(255,255,255,.14)}
        .erp-help-assistant-content{overflow:auto;padding:13px 15px;font-size:11px;line-height:1.5}
        .erp-help-assistant-content h2{margin:0 0 6px;font-size:14px;font-weight:800;color:#123b50}
        .erp-help-assistant-content p{margin:0 0 11px;color:#475569}
        .erp-help-assistant-content strong{display:block;margin:10px 0 4px;font-size:11px;color:#123b50}
        .erp-help-assistant-content ol,.erp-help-assistant-content ul{margin:4px 0 9px;padding-left:19px}
        .erp-help-assistant-content li{margin-bottom:4px;color:#334155}
        .erp-help-assistant-content .erp-help-status{display:block;margin-top:10px;padding-top:9px;border-top:1px solid #e2e8f0;color:#64748b;font-size:9px}
        .erp-help-center-link{margin-top:10px;padding:7px 10px;border:1px solid #2d8db8;border-radius:5px;background:#2d8db8;color:#fff;font-size:10px;font-weight:700;cursor:pointer}
        @media(max-width:650px){.erp-help-assistant{right:12px;bottom:76px}.erp-help-floating-button{height:40px}.erp-help-assistant-panel{max-height:68vh}}
        @media print{.erp-help-assistant{display:none!important}}

        .erp-horizontal-workspace{width:100%;max-width:100%;min-width:0;min-height:calc(100vh - 48px);padding:8px;box-sizing:border-box;background:linear-gradient(135deg,#eaf4f8 0%,#f4f8fb 48%,#eaf2f7 100%)}
        .erp-horizontal-workspace .bg-white{background-color:#f8fcfe!important}.erp-horizontal-workspace .bg-slate-50{background-color:#edf6fa!important}.erp-horizontal-workspace .bg-slate-100{background-color:#e7f1f6!important}
        .erp-horizontal-workspace .border-slate-200{border-color:#c9dde5!important}.erp-horizontal-workspace .border-slate-300{border-color:#b9d0dc!important}.erp-horizontal-workspace .text-slate-900{color:#123b50!important}.erp-horizontal-workspace .text-slate-700{color:#315466!important}
        .erp-horizontal-workspace .rounded-xl,.erp-horizontal-workspace .rounded-2xl{border-radius:4px!important}.erp-horizontal-workspace .rounded-lg{border-radius:3px!important}
        .erp-horizontal-workspace table thead th{background:#dcecf2;color:#17445a;border-bottom-color:#b9d4df}.erp-horizontal-workspace table tbody tr:nth-child(even){background-color:#f0f7fa}.erp-horizontal-workspace table tbody tr:hover{background-color:#e0f1f7}
        .erp-horizontal-workspace input:focus,.erp-horizontal-workspace select:focus,.erp-horizontal-workspace textarea:focus{border-color:#2d8db8;outline-color:#2d8db8;box-shadow:0 0 0 2px rgba(45,141,184,.12)}
        .erp-horizontal-workspace-compact h1{font-size:18px!important;line-height:1.2!important;font-weight:500!important}.erp-horizontal-workspace-compact h2{font-size:15px!important;line-height:1.25!important;font-weight:500!important}.erp-horizontal-workspace-compact h3{font-size:13px!important;line-height:1.3!important;font-weight:500!important}
        .erp-horizontal-workspace-compact p{font-size:10px!important;line-height:1.4!important}.erp-horizontal-workspace-compact table{font-size:10px!important}.erp-horizontal-workspace-compact tbody td{font-size:10px!important;line-height:1.25!important}.erp-horizontal-workspace-compact thead th{font-size:9px!important;line-height:1.2!important;font-weight:500!important}.erp-horizontal-workspace-compact button{font-size:10px}.erp-horizontal-workspace-compact label{font-size:9px}.erp-horizontal-workspace-compact input,.erp-horizontal-workspace-compact select,.erp-horizontal-workspace-compact textarea{font-size:10px}
        @media print{@page{size:A4;margin:12mm}.erp-windows-topbar,.print-hidden{display:none!important}.erp-horizontal-shell,.erp-horizontal-workspace{min-height:0!important;background:#fff!important;padding:0!important}.erp-horizontal-workspace *{box-shadow:none!important;backdrop-filter:none!important}thead{display:table-header-group}tr{break-inside:avoid}}
        @media(max-width:900px){.erp-windows-topbar{grid-template-columns:auto minmax(110px,170px) minmax(140px,1fr) auto;gap:6px;padding:0 6px}.erp-windows-session{gap:5px}.erp-windows-session time{font-size:9px}.erp-windows-user{max-width:120px;padding-left:5px}.erp-windows-system-title strong{font-size:11px}}
        @media(max-width:650px){.erp-windows-topbar{height:48px;grid-template-columns:auto minmax(0,1fr) auto;gap:6px}.erp-windows-quick-search{display:none}.erp-windows-system-title{align-items:flex-start;text-align:left}.erp-windows-system-title strong{font-size:10px;letter-spacing:0}.erp-windows-system-title span{font-size:8px}.erp-windows-session time{display:none}.erp-windows-user{max-width:90px}.erp-windows-user span{display:none}}
        @media(prefers-reduced-motion:reduce){.erp-windows-start-menu{transition:none!important}}
      `}</style>
    </div>
  )
}
