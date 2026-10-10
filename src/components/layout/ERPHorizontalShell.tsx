import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleHelp, ChevronDown, Search, UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import ERPStatusLegend from './ERPStatusLegend'

type MenuItem = {
  label: string
  route: string
  children?: Array<{ label: string; route: string }>
}

const menus: MenuItem[] = [
  { label: 'Início', route: '/erp-industrial' },
  { label: 'Cadastros', route: '/produtos-vendas', children: [
    { label: 'Produtos', route: '/produtos-vendas' },
    { label: 'Clientes', route: '/vendas/clientes' },
    { label: 'Fornecedores', route: '/compras/fornecedores' },
  ] },
  { label: 'Vendas', route: '/vendas', children: [
    { label: 'Dashboard comercial', route: '/vendas' },
    { label: 'Status do pedido', route: '/vendas/status' },
    { label: 'Novo pedido', route: '/vendas/novo-pedido' },
    { label: 'PDV / venda rápida', route: '/vendas/pdv' },
    { label: 'Catálogo digital', route: '/vendas/catalogo-digital' },
    { label: 'Gestão do catálogo', route: '/vendas/catalogo-digital/gestao' },
    { label: 'Clientes', route: '/vendas/clientes' },
    { label: 'Orçamentos e custos', route: '/vendas/orcamentos' },
    { label: 'Análise de custos', route: '/vendas/analise-custos' },
    { label: 'Metas', route: '/vendas/metas' },
    { label: 'Relatórios', route: '/vendas/relatorios' },
  ] },
  { label: 'Compras', route: '/compras/rfq', children: [
    { label: 'Central de compras / RFQ', route: '/compras/rfq' },
    { label: 'Solicitações', route: '/compras/solicitacao-manual' },
    { label: 'Pedido de compra', route: '/compras/pedido' },
    { label: 'Recebimentos', route: '/compras/recebimentos' },
    { label: 'Fornecedores', route: '/compras/fornecedores' },
    { label: 'Relatórios', route: '/compras/relatorios' },
  ] },
  { label: 'Estoque', route: '/estoque' },
  { label: 'Financeiro', route: '/financeiro/custo-padrao' },
  { label: 'Fiscal', route: '/fiscal' },
  { label: 'Manufatura / PCP', route: '/pcp', children: [
    { label: 'Visão geral do PCP', route: '/pcp' },
    { label: 'Ordens de produção', route: '/pcp/ordens-industriais' },
    { label: 'Agenda de Máquinas', route: '/pcp/agenda-maquinas' },
    { label: 'Capacidade / Gantt', route: '/pcp/capacidade' },
    { label: 'Sequenciamento', route: '/pcp/sequenciamento' },
    { label: 'MRP II', route: '/pcp/mrp-ii' },
  ] },
  { label: 'Qualidade', route: '/qualidade' },
  { label: 'Manutenção', route: '/manutencao' },
  { label: 'Relatórios', route: '/relatorios' },
  { label: 'Configuração', route: '/configuracoes-adm' },
]

export default function ERPHorizontalShell({ children, operatorName = 'Usuário ERP' }: { children: ReactNode; operatorName?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [sessionOperator, setSessionOperator] = useState('Usuário ERP')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (operatorName !== 'Usuário ERP') return
    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata
      if (typeof metadata?.nome === 'string' && metadata.nome.trim()) setSessionOperator(metadata.nome.trim())
      else if (data.user?.email) setSessionOperator(data.user.email)
    })
  }, [operatorName])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = menus.find(menu => pathname === menu.route || pathname.startsWith(menu.route + '/'))
  const filtered = search.trim()
    ? menus.flatMap(menu => [
        { label: menu.label, route: menu.route },
        ...(menu.children ?? []).map(child => ({ label: `${menu.label} / ${child.label}`, route: child.route })),
      ]).filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : []

  const go = (route: string) => {
    setOpenMenu(null)
    setSearch('')
    navigate(route)
  }

  return (
    <div className="erp-horizontal-shell" ref={ref}>
      <header className="erp-horizontal-header">
        <button className="erp-horizontal-brand" type="button" onClick={() => go('/erp-industrial')} title="Início">
          <img src="/logo/sgq-erp.png" alt="SGQERP Industrial" />
          <strong>SGQERP INDUSTRIAL</strong>
        </button>

        <div className="erp-horizontal-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Pesquisar módulos..."
            aria-label="Pesquisar módulos"
          />
          {filtered.length > 0 && (
            <div className="erp-horizontal-search-results">
              {filtered.slice(0, 8).map(item => (
                <button key={item.route} type="button" onClick={() => go(item.route)}>{item.label}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{position:"relative"}}><button type="button" className="erp-horizontal-help" title="Ajuda" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen}><CircleHelp size={15} /> Ajuda</button>{helpOpen&&<div role="dialog" aria-label="Ajuda do ERP" style={{position:"absolute",right:0,top:34,zIndex:1200,width:290,padding:"9px 10px",border:"1px solid #b9cbd3",borderRadius:2,background:"#fff",boxShadow:"0 6px 16px rgba(18,59,80,.16)",fontSize:10,lineHeight:1.4,color:"#173b4a"}}><strong>Ajuda do ERP</strong><div style={{marginTop:4}}>Use o menu azul para trocar de módulo. Nos cadastros, o botão <b>?</b> ao lado do campo explica a sigla ou regra sem alterar os dados.</div><div style={{marginTop:5,color:"#647b85"}}>Tela atual: {pathname}</div></div>}</div>

        <div className="erp-horizontal-session">
          <UserRound size={15} />
          <span>{operatorName === 'Usuário ERP' ? sessionOperator : operatorName}</span>
          <time dateTime={now.toISOString()}>
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)} {' '}
            {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date())}
          </time>
        </div>
      </header>

      <nav className="erp-horizontal-menu" aria-label="Menu principal do ERP">
        {menus.map(menu => {
          const active = current?.label === menu.label
          const hasChildren = Boolean(menu.children?.length)
          return (
            <div className="erp-horizontal-menu-item" key={menu.label}>
              <button
                type="button"
                className={`erp-horizontal-menu-button ${active ? 'is-active' : ''}`}
                onClick={() => hasChildren ? setOpenMenu(value => value === menu.label ? null : menu.label) : go(menu.route)}
                aria-expanded={hasChildren ? openMenu === menu.label : undefined}
              >
                {menu.label}{hasChildren && <ChevronDown size={13} />}
              </button>
              {hasChildren && openMenu === menu.label && (
                <div className="erp-horizontal-dropdown">
                  {menu.children?.map(child => (
                    <button key={child.route} type="button" onClick={() => go(child.route)}>{child.label}</button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="erp-global-status-row"><span>STATUS DO ERP</span><ERPStatusLegend /><small>OK · NOK · Atenção · Em andamento · Aprovação</small></div>

      <main className={`erp-horizontal-workspace${pathname.startsWith('/fiscal') || pathname.includes('/nfe') || pathname.startsWith('/vendas/fiscal') || pathname.includes('nota-fiscal') ? ' erp-horizontal-workspace-fiscal' : ' erp-horizontal-workspace-compact'}`}>
        {children}
      </main>

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:#f4f8fa;color:#173b4a}
        .erp-global-status-row{min-height:27px;display:flex;align-items:center;gap:10px;padding:2px 12px;background:#f8fbfc;border-bottom:1px solid #dbe5e9;color:#536b77;font-size:9px;box-sizing:border-box}
        .erp-global-status-row>span{font-weight:700;letter-spacing:.08em}
        .erp-global-status-row>small{margin-left:auto;font-size:9px}
        .erp-status-legend{position:relative;font-size:10px;color:#173b4a}
        .erp-status-legend summary{display:inline-flex;align-items:center;gap:4px;min-height:22px;cursor:pointer;list-style:none;border:1px solid #cbd8de;background:#fff;padding:0 7px;border-radius:2px;font-weight:600}
        .erp-status-legend summary::-webkit-details-marker{display:none}
        .erp-status-legend-panel{position:absolute;top:25px;left:0;z-index:1500;width:min(360px,90vw);padding:8px;background:#fff;border:1px solid #cbd8de;box-shadow:0 8px 22px rgba(18,59,80,.16);display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .erp-status-legend-item{display:flex;align-items:flex-start;gap:6px;min-width:0}
        .erp-status-legend-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;margin-top:2px}
        .erp-status-legend-item strong{display:block;font-size:10px;font-weight:700}
        .erp-status-legend-item small{display:block;font-size:9px;line-height:1.3;color:#647b85}
        .erp-status-legend-panel>p{grid-column:1/-1;margin:0;padding-top:5px;border-top:1px solid #e2e8f0;font-size:9px;color:#647b85}
        @media print{ @page{size:A4;margin:12mm} .erp-horizontal-header,.erp-horizontal-menu,.erp-global-status-row,.print\:hidden,.erp-horizontal-help{display:none!important} .erp-horizontal-shell,.erp-horizontal-workspace{min-height:0!important;background:#fff!important;padding:0!important} .erp-horizontal-workspace *{box-shadow:none!important;backdrop-filter:none!important} thead{display:table-header-group} tr{break-inside:avoid} }
        .erp-horizontal-header{height:46px;display:flex;align-items:center;gap:12px;padding:0 10px;background:#fff;border-bottom:1px solid #d6e2e7;box-sizing:border-box}
        .erp-horizontal-brand{height:34px;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#123b50;cursor:pointer;padding:0 6px;white-space:nowrap}
        .erp-horizontal-brand img{height:30px;width:auto;object-fit:contain}
        .erp-horizontal-brand strong{font-size:13px;font-weight:700;letter-spacing:.01em}
        .erp-horizontal-search{position:relative;display:flex;align-items:center;gap:6px;width:min(390px,34vw);height:30px;margin-left:auto;min-width:220px;border:1px solid #b9cbd3;background:#fff;border-radius:2px;padding:0 8px;box-sizing:border-box}
        .erp-horizontal-search input{border:0;outline:0;min-width:0;max-width:100%;width:100%;height:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#173b4a;background:transparent}
        .erp-horizontal-search-results{position:absolute;top:31px;left:0;right:0;z-index:1000;background:#fff;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(18,59,80,.12)}
        .erp-horizontal-search-results button{display:block;width:100%;min-height:28px;padding:5px 8px;border:0;background:#fff;text-align:left;font-size:11px;color:#173b4a;cursor:pointer}
        .erp-horizontal-search-results button:hover{background:#edf7fb}
        .erp-horizontal-help{height:30px;display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:#315466;font-size:11px;cursor:pointer;padding:0 5px}
        .erp-horizontal-session{height:30px;display:flex;align-items:center;gap:5px;padding-left:8px;border-left:1px solid #dbe5e9;white-space:nowrap;font-size:11px;color:#173b4a}
        .erp-horizontal-session span{font-weight:600}
        .erp-horizontal-session time{color:#647b85;font-size:10px}
        .erp-horizontal-menu{height:32px;display:flex;align-items:stretch;padding:0 6px;background:#2D8DB8;border-bottom:1px solid #17445A;box-sizing:border-box;position:relative;z-index:900}
        .erp-horizontal-menu-item{position:relative;display:flex;align-items:stretch}
        .erp-horizontal-menu-button{height:31px;display:inline-flex;align-items:center;gap:3px;padding:0 10px;border:0;border-right:1px solid rgba(255,255,255,.18);background:#2D8DB8;color:#fff;font-size:10px;font-weight:500;cursor:pointer}
        .erp-horizontal-menu-button:hover,.erp-horizontal-menu-button.is-active{background:#17445A;color:#fff}
        .erp-horizontal-dropdown{position:absolute;top:31px;left:0;min-width:210px;padding:4px 0;background:#fff;border:1px solid #b9cbd3;box-shadow:0 5px 14px rgba(18,59,80,.14)}
        .erp-horizontal-dropdown button{display:block;width:100%;min-height:29px;padding:5px 12px;border:0;background:#fff;color:#234d61;text-align:left;font-size:11px;cursor:pointer}
        .erp-horizontal-dropdown button:hover{background:#edf7fb;color:#1f7195}
        .erp-horizontal-workspace{min-width:0;min-height:calc(100vh - 78px);padding:8px;box-sizing:border-box}
        .erp-horizontal-workspace-compact h1{font-size:18px!important;line-height:1.2!important;font-weight:500!important}
        .erp-horizontal-workspace-compact h2{font-size:15px!important;line-height:1.25!important;font-weight:500!important}
        .erp-horizontal-workspace-compact h3{font-size:13px!important;line-height:1.3!important;font-weight:500!important}
        .erp-horizontal-workspace-compact p{font-size:10px!important;line-height:1.4!important}
        .erp-horizontal-workspace-compact table{font-size:10px!important}
        .erp-horizontal-workspace-compact tbody td{font-size:10px!important;line-height:1.25!important}
        .erp-horizontal-workspace-compact thead th{font-size:9px!important;line-height:1.2!important;font-weight:500!important}
        .erp-horizontal-workspace-compact button{font-size:10px}
        .erp-horizontal-workspace-compact label{font-size:9px}
        .erp-horizontal-workspace-compact input,.erp-horizontal-workspace-compact select,.erp-horizontal-workspace-compact textarea{font-size:10px}
        @media(max-width:950px){.erp-horizontal-brand strong{display:none}.erp-horizontal-search{width:36vw}.erp-horizontal-menu-button{padding:0 7px}.erp-horizontal-session time{display:none}}
        @media(max-width:700px){.erp-global-status-row>small{display:none}.erp-horizontal-header{gap:5px}.erp-horizontal-help{font-size:0}.erp-horizontal-search{width:42vw;min-width:160px}.erp-horizontal-session span{display:none}.erp-horizontal-menu{overflow-x:auto}}
      `}</style>
    </div>
  )
}
