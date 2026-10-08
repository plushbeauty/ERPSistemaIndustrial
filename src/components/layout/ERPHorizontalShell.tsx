import { useEffect, useRef, useState } from 'react'
import { CircleHelp, ChevronDown, Search, UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

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
    { label: 'Pedidos de venda', route: '/vendas/pedidos' },
    { label: 'Novo pedido', route: '/vendas/novo-pedido' },
    { label: 'Pedidos pendentes', route: '/vendas/pendentes' },
    { label: 'Status do pedido', route: '/vendas/status' },
    { label: 'Carteira de pedidos', route: '/vendas/carteira' },
    { label: 'PDV / venda rápida', route: '/vendas/pdv' },
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
  { label: 'PCP', route: '/pcp' },
  { label: 'Qualidade', route: '/qualidade' },
  { label: 'Manutenção', route: '/manutencao' },
  { label: 'Relatórios', route: '/relatorios' },
  { label: 'Configuração', route: '/configuracoes-adm' },
]

export default function ERPHorizontalShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

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

        <button type="button" className="erp-horizontal-help" title="Ajuda"><CircleHelp size={15} /> Ajuda</button>

        <div className="erp-horizontal-session">
          <UserRound size={15} />
          <span>{'Usuário ERP'}</span>
          <time dateTime={new Date().toISOString()}>
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date())} {' '}
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

      <main className="erp-horizontal-workspace">
        {children}
      </main>

      <style>{`
        .erp-horizontal-shell{min-height:100vh;background:#f4f8fa;color:#173b4a}
        .erp-horizontal-header{height:46px;display:flex;align-items:center;gap:12px;padding:0 10px;background:#fff;border-bottom:1px solid #d6e2e7;box-sizing:border-box}
        .erp-horizontal-brand{height:34px;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#123b50;cursor:pointer;padding:0 6px;white-space:nowrap}
        .erp-horizontal-brand img{height:30px;width:auto;object-fit:contain}
        .erp-horizontal-brand strong{font-size:13px;font-weight:700;letter-spacing:.01em}
        .erp-horizontal-search{position:relative;display:flex;align-items:center;gap:6px;width:min(390px,34vw);height:30px;margin-left:auto;border:1px solid #b9cbd3;background:#fff;border-radius:2px;padding:0 8px;box-sizing:border-box}
        .erp-horizontal-search input{border:0;outline:0;width:100%;height:28px;font-size:11px;color:#173b4a;background:transparent}
        .erp-horizontal-search-results{position:absolute;top:31px;left:0;right:0;z-index:1000;background:#fff;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(18,59,80,.12)}
        .erp-horizontal-search-results button{display:block;width:100%;min-height:28px;padding:5px 8px;border:0;background:#fff;text-align:left;font-size:11px;color:#173b4a;cursor:pointer}
        .erp-horizontal-search-results button:hover{background:#edf7fb}
        .erp-horizontal-help{height:30px;display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:#315466;font-size:11px;cursor:pointer;padding:0 5px}
        .erp-horizontal-session{height:30px;display:flex;align-items:center;gap:5px;padding-left:8px;border-left:1px solid #dbe5e9;white-space:nowrap;font-size:11px;color:#173b4a}
        .erp-horizontal-session span{font-weight:600}
        .erp-horizontal-session time{color:#647b85;font-size:10px}
        .erp-horizontal-menu{height:34px;display:flex;align-items:stretch;padding:0 6px;background:#fff;border-bottom:1px solid #c9d8de;box-sizing:border-box;position:relative;z-index:900}
        .erp-horizontal-menu-item{position:relative;display:flex;align-items:stretch}
        .erp-horizontal-menu-button{height:33px;display:inline-flex;align-items:center;gap:3px;padding:0 10px;border:0;border-right:1px solid #edf2f4;background:#fff;color:#234d61;font-size:11px;font-weight:600;cursor:pointer}
        .erp-horizontal-menu-button:hover,.erp-horizontal-menu-button.is-active{background:#edf7fb;color:#1f7195}
        .erp-horizontal-dropdown{position:absolute;top:33px;left:0;min-width:210px;padding:4px 0;background:#fff;border:1px solid #b9cbd3;box-shadow:0 5px 14px rgba(18,59,80,.14)}
        .erp-horizontal-dropdown button{display:block;width:100%;min-height:29px;padding:5px 12px;border:0;background:#fff;color:#234d61;text-align:left;font-size:11px;cursor:pointer}
        .erp-horizontal-dropdown button:hover{background:#edf7fb;color:#1f7195}
        .erp-horizontal-workspace{min-width:0;min-height:calc(100vh - 80px);padding:8px;box-sizing:border-box}
        @media(max-width:950px){.erp-horizontal-brand strong{display:none}.erp-horizontal-search{width:36vw}.erp-horizontal-menu-button{padding:0 7px}.erp-horizontal-session time{display:none}}
        @media(max-width:700px){.erp-horizontal-header{gap:5px}.erp-horizontal-help{font-size:0}.erp-horizontal-search{width:42vw}.erp-horizontal-session span{display:none}.erp-horizontal-menu{overflow-x:auto}}
      `}</style>
    </div>
  )
}
