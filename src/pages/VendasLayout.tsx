import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, BarChart3, BookOpen, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, LogOut, PackagePlus, PackageSearch, RefreshCw, Forklift, Settings2, ShoppingCart, Target, Users, X } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { useIsMobile } from '../hooks/useIsMobile'

export type SalesNavItem = { label: string; href: string; icon: typeof LayoutDashboard }
export type SalesNavSection = { label: string; items: SalesNavItem[] }

type VendasStatus = { atrasados: number; producao: number; acabamento: number; almoxarifado: number; liberadoNF: number; totalPendente: number }
type Operator = { nome: string | null; email: string | null }

const initialVendasStatus: VendasStatus = { atrasados: 0, producao: 0, acabamento: 0, almoxarifado: 0, liberadoNF: 0, totalPendente: 0 }
const normalizeStatus = (value: string) => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()

export function useVendasStatus() {
  const [status, setStatus] = useState<VendasStatus>(initialVendasStatus)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) throw empresa.error ?? new Error('Empresa não identificada.')

      const rows = await fetchAllPages<{ status: string | null; data_entrega_prometida: string | null }>(
        (from, to) =>
          supabase
            .from('erp_pedidos_venda')
            .select('status,data_entrega_prometida')
            .eq('empresa_id', String(empresa.data))
            .range(from, to),
      )

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let atrasados = 0
      let producao = 0
      let acabamento = 0
      let almoxarifado = 0
      let liberadoNF = 0
      let totalPendente = 0

      for (const row of rows) {
        const status = normalizeStatus(String(row.status ?? ''))
        const finalizado = status.includes('fatur') || status.includes('cancel') || status.includes('conclu')
        const due = row.data_entrega_prometida
          ? new Date(String(row.data_entrega_prometida).slice(0, 10) + 'T00:00:00')
          : null

        if (due && due < today && !finalizado) atrasados += 1
        if (status.includes('produc') || status.includes('fabric')) producao += 1
        if (status.includes('acab')) acabamento += 1
        if (status.includes('almox') || status.includes('mater')) almoxarifado += 1
        if ((status.includes('liber') && status.includes('nf')) || status.includes('fatur')) liberadoNF += 1
        if (!finalizado) totalPendente += 1
      }

      setStatus({ atrasados, producao, acabamento, almoxarifado, liberadoNF, totalPendente })
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, load }
}

export function VendasStatusCards({ status, loading }: { status: VendasStatus; loading: boolean }) {
  const cards = [
    ['Atrasados', status.atrasados, 'bg-red-50 border-red-300 text-red-700'],
    ['Produção', status.producao, 'bg-orange-50 border-orange-300 text-orange-700'],
    ['Acabamento', status.acabamento, 'bg-yellow-50 border-yellow-300 text-yellow-700'],
    ['Almoxarifado', status.almoxarifado, 'bg-blue-50 border-blue-300 text-blue-700'],
    ['Liberado NF', status.liberadoNF, 'bg-cyan-50 border-cyan-300 text-cyan-700'],
    ['Total pendente', status.totalPendente, 'bg-slate-50 border-slate-300 text-[#123B50]'],
  ] as const

  return (
    <div className="mb-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
      {cards.map(([label, value, tone]) => (
        <div key={label} className={`border px-2.5 py-2 ${tone}`}>
          <span className="block text-[8px] uppercase tracking-wide">{label}</span>
          <strong className="block text-[17px] font-medium leading-5">{loading ? '—' : value}</strong>
        </div>
      ))}
    </div>
  )
}

export const sections: SalesNavSection[] = [
  { label: 'Visão geral', items: [
    { label: 'Dashboard comercial', href: '/vendas', icon: LayoutDashboard },
    { label: 'Faturamento / NF-e', href: '/fiscal/emissao', icon: FilePlus2 },
  ] },
  { label: 'Operação', items: [
    { label: 'Pedidos de venda', href: '/vendas/pedidos', icon: ClipboardList },
    { label: 'Novo pedido', href: '/vendas/novo-pedido', icon: FilePlus2 },
    { label: 'Pedidos pendentes', href: '/vendas/pendentes', icon: ListChecks },
    { label: 'Status do pedido', href: '/vendas/status', icon: ListChecks },
    { label: 'Carteira de pedidos', href: '/vendas/carteira', icon: FolderKanban },
    { label: 'PDV / venda rápida', href: '/vendas/pdv', icon: ShoppingCart },
  ] },
  { label: 'Comercial', items: [
    { label: 'Clientes', href: '/vendas/clientes', icon: Users },
    { label: 'Orçamentos e custos', href: '/vendas/orcamentos', icon: PackageSearch },
    { label: 'Análise de custos', href: '/vendas/analise-custos', icon: PackageSearch },
    { label: 'Metas', href: '/vendas/metas', icon: Target },
    { label: 'Vendedores / comissões', href: '/comissoes/perfil', icon: Users },
    { label: 'Relatórios', href: '/vendas/relatorios', icon: BookOpen },
    { label: 'Cadastro de Produtos', href: '/produtos-vendas', icon: PackagePlus },
  ] },
  { label: 'Ferramentas', items: [
    { label: 'Catálogo digital', href: '/vendas/catalogo-digital', icon: BookOpen },
    { label: 'Gestão do catálogo', href: '/vendas/catalogo-digital/gestao', icon: BookOpen },
    { label: 'Ajuste global / preços', href: '/vendas/reajuste', icon: Settings2 },
  ] },
]

type ModuleMenu = { label: string; route: string; icon: typeof LayoutDashboard }

function moduleMenu(pathname: string): ModuleMenu {
  if (pathname.startsWith('/vendas/estoque') || pathname === '/estoque' || pathname.startsWith('/estoque/') || pathname.startsWith('/inventario')) return { label: 'MENU ESTOQUE', route: '/estoque', icon: PackagePlus }
  if (pathname.startsWith('/vendas/qualidade') || pathname.startsWith('/vendas/sgq') || pathname.startsWith('/qualidade') || pathname.startsWith('/sgq')) return { label: 'MENU QUALIDADE', route: '/qualidade', icon: ClipboardList }
  if (pathname.startsWith('/vendas/fiscal') || pathname.startsWith('/vendas/classificacao-fiscal') || pathname.startsWith('/vendas/ano-fiscal') || pathname.startsWith('/fiscal')) return { label: 'MENU FISCAL', route: '/fiscal', icon: FilePlus2 }
  if (pathname.startsWith('/vendas/pcp') || pathname.startsWith('/vendas/chao-de-fabrica') || pathname.startsWith('/pcp')) return { label: 'MENU PCP', route: '/pcp', icon: PackagePlus }
  if (pathname.startsWith('/vendas/conciliacao') || pathname.startsWith('/vendas/fluxo-caixa') || pathname.startsWith('/vendas/balanco') || pathname.startsWith('/vendas/razao-geral') || pathname.startsWith('/financeiro')) return { label: 'MENU FINANCEIRO', route: '/financeiro', icon: BarChart3 }
  if (pathname.startsWith('/vendas/rh') || pathname.startsWith('/rh')) return { label: 'MENU RH', route: '/rh', icon: Users }
  if (pathname.startsWith('/vendas/engenharia') || pathname.startsWith('/vendas/mrp') || pathname.startsWith('/engenharia')) return { label: 'MENU ENGENHARIA', route: '/engenharia', icon: Settings2 }
  if (pathname.startsWith('/manutencao')) return { label: 'MENU MANUTENÇÃO', route: '/manutencao', icon: Settings2 }
  if (pathname.startsWith('/compras')) return { label: 'MENU COMPRAS', route: '/compras', icon: Forklift }
  if (pathname.startsWith('/vendas')) return { label: 'MENU VENDAS', route: '/vendas', icon: ShoppingCart }
  return { label: 'MENU PRINCIPAL', route: '/erp-industrial', icon: LayoutDashboard }
}

export default function VendasLayout({
  children,
  title,
  subtitle,
  onRefresh,
  topContent,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  onRefresh?: () => void
  navSections?: SalesNavSection[]
  topContent?: ReactNode
}) {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tabletMode = useIsMobile()
  const [tabletOpen, setTabletOpen] = useState(() => searchParams.get('tablet') === '1')
  const isVendas = pathname.startsWith('/vendas')
  const moduleMenuInfo = moduleMenu(pathname)
  const { status, loading: statusLoading, load: loadStatus } = useVendasStatus()
  const [operator, setOperator] = useState<Operator>({ nome: null, email: null })
  const [now, setNow] = useState(new Date())

  const ModuleIcon = moduleMenuInfo.icon
  const tabletLabel = moduleMenuInfo.label

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  useEffect(() => {
    let mounted = true
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) {
        const metadataName = data.user.user_metadata?.nome
        setOperator({
          nome: typeof metadataName === 'string' ? metadataName : null,
          email: data.user.email ?? null,
        })
      }
    })
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (isVendas) void loadStatus().catch(() => undefined)
  }, [isVendas, loadStatus])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tablet') === '1') setTabletOpen(true)
  }, [])

  const operatorLabel = operator.nome ?? operator.email ?? 'Operador autenticado'
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)
  const timeLabel = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(now)

  return (
    <div className={`vendas-standard min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode ? 'tablet-mode' : ''}`}>
      <main className="min-w-0">
        <header className="v7-topbar" aria-label="Barra superior do ERP">
          <div className="v7-top-brand">
            <div className="v7-logo-frame">
              <img src="/logo/sgq-erp.png" alt="SGQERP" />
            </div>
            <div className="v7-top-title">
              <strong>SGQERP INDUSTRIAL</strong>
              <span>CENTRAL DE CONTROLE</span>
            </div>
          </div>
          <div className="v7-top-actions">
            <button className="v7-top-tablet" type="button" onClick={() => setTabletOpen(true)} aria-label={moduleMenuInfo.label}>
              <ModuleIcon size={24} strokeWidth={2.4} aria-hidden="true" />
              {moduleMenuInfo.label}
            </button>
            <div className="v7-top-user-simple" aria-label="Usuário conectado"><span>OPERADOR</span><strong>{operatorLabel}</strong></div>
            <div className="v7-top-date" aria-label="Data e hora atual">
              <strong>{dateLabel}</strong>
              <span>{timeLabel}</span>
            </div>
            <button className="v7-top-exit" type="button" onClick={() => void logout()}>SAIR</button>
          </div>
        </header>

        <div className="p-2 lg:p-3">
          {isVendas && <VendasStatusCards status={status} loading={statusLoading} />}
          <div className="mb-2 border-b border-slate-200 pb-1 text-center">
            <h1 className="text-[13px] font-medium leading-4 text-[#123B50]">{title}</h1>
            {subtitle && <p className="text-[12px] font-normal text-slate-500">{subtitle}</p>}
          </div>
          {topContent}
          {children}
        </div>
      </main>

      {tabletOpen && (
        <div className="vendas-tablet-overlay" role="dialog" aria-modal="true" aria-label={tabletLabel}>
          <section className="vendas-tablet-modal">
            <header className="vendas-tablet-head">
              <div>
                <span>SGQERP INDUSTRIAL</span>
                <strong>{tabletLabel} — CENTRAL DE COMANDO</strong>
                <small>Operações no mesmo padrão do Tablet principal.</small>
              </div>
              <button type="button" onClick={() => setTabletOpen(false)} title="Fechar"><X size={18} /></button>
            </header>
            <div className="vendas-tablet-grid">
              {sections.flatMap((section) => section.items).map((item) => {
                const Icon = item.icon
                const tone =
                  item.label === 'Novo pedido' ? '#F97316' :
                  item.label === 'Pedidos de venda' ? '#2D8DB8' :
                  item.label === 'Catálogo digital' ? '#22AFC0' :
                  item.label === 'Análise de custos' ? '#3A9D78' :
                  item.label === 'Clientes' ? '#22AFC0' :
                  item.label === 'Pedidos pendentes' ? '#6B3FA0' : '#2D8DB8'

                return (
                  <button key={item.href} type="button" onClick={() => { setTabletOpen(false); navigate(item.href) }} title={item.label}>
                    <span style={{ color: tone, borderColor: tone + '55', background: tone + '12' }}><Icon size={20} /></span>
                    <strong>{item.label}</strong>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      <style>{`
        .v7-topbar{position:relative;z-index:20;width:100%;min-height:104px;display:flex!important;align-items:center;justify-content:space-between;gap:20px;padding:10px 24px!important;background:#ffffff!important;border-bottom:1px solid #cbd5e1!important;color:#1e293b!important;box-sizing:border-box}
        .v7-top-brand{display:flex!important;align-items:center;gap:18px;min-width:0}
        .v7-logo-frame{height:80px;width:auto;min-width:210px;display:flex;align-items:center;justify-content:flex-start;background:#ffffff;box-sizing:border-box}
        .v7-logo-frame img{display:block!important;height:100%!important;width:auto!important;max-height:none!important;object-fit:contain!important;padding:0!important}
        .v7-top-title{display:flex;flex-direction:column;justify-content:center;border-left:1px solid #cbd5e1;padding-left:18px;line-height:1.1}
        .v7-top-title strong{color:#1e293b!important;font-size:20px!important;font-weight:950!important;letter-spacing:-.02em;white-space:nowrap}
        .v7-top-title span{color:#475569!important;font-size:10px!important;font-weight:900!important;letter-spacing:.14em;margin-top:5px}
        .v7-top-actions{display:flex!important;align-items:center!important;justify-content:flex-end;gap:10px;min-width:0;flex-wrap:nowrap}
        .v7-top-tablet,.v7-top-exit{display:inline-flex!important;align-items:center!important;justify-content:center;height:30px!important;min-height:30px!important;padding:0 10px!important;border-radius:2px!important;font-size:10px!important;font-weight:500!important;cursor:pointer;white-space:nowrap;box-sizing:border-box}
        .v7-top-tablet{height:46px!important;min-height:46px!important;min-width:210px!important;padding:0 22px!important;gap:8px!important;background:#F97316!important;border:1px solid #EA580C!important;color:#ffffff!important;box-shadow:none!important;font-size:16px!important;font-weight:900!important;letter-spacing:.02em!important}
        .v7-top-exit{background:#ffffff!important;border:1px solid #fecaca!important;color:#991b1b!important}
        .v7-top-user-simple{display:flex!important;flex-direction:column;justify-content:center;gap:3px;min-height:42px;padding:0 12px;border-left:1px solid #e2e8f0!important;white-space:nowrap}
        .v7-top-user-simple span{color:#64748b!important;font-size:9px!important;font-weight:950!important;letter-spacing:.08em}
        .v7-top-user-simple strong{color:#1e293b!important;font-size:12px!important;font-weight:950!important}
        .v7-top-date{display:flex!important;flex-direction:column;justify-content:center;align-items:flex-start;gap:2px;min-height:42px;padding:0 12px;border-left:1px solid #e2e8f0!important;white-space:nowrap}
        .v7-top-date strong{color:#1e293b!important;font-size:11px!important;font-weight:950!important}
        .v7-top-date span{color:#475569!important;font-size:11px!important;font-weight:800!important}
        .v7-top-actions button:hover{filter:brightness(.97)}
        @media(max-width:1180px){.v7-logo-frame{height:72px;min-width:185px}.v7-top-title strong{font-size:18px!important}.v7-top-title{display:none!important}.v7-top-brand{min-width:0}}
        @media(max-width:900px){.v7-top-date{display:none!important}.v7-logo-frame{height:64px;min-width:165px}}
        @media(max-width:650px){.v7-topbar{padding:7px 10px!important;min-height:72px}.v7-logo-frame{height:54px;min-width:135px}.v7-top-user-simple{display:none!important}.v7-top-tablet,.v7-top-exit{min-height:36px;padding:0 9px!important;font-size:11px!important}.v7-top-tablet{min-width:130px!important;height:38px!important;font-size:11px!important}.v7-top-tablet::after{content:none}}
        .vendas-tablet-overlay{position:fixed!important;inset:0!important;z-index:9999!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:54px 16px 16px!important;background:rgba(15,23,42,.58)!important;overflow:auto!important}
        .vendas-tablet-modal{width:min(1180px,100%)!important;max-height:calc(100vh - 70px)!important;overflow:auto!important;background:#ffffff!important;border:1px solid #cbd5e1!important;border-radius:2px!important;box-shadow:0 18px 50px rgba(15,23,42,.25)!important}
        .vendas-tablet-head{position:sticky!important;top:0!important;z-index:2!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;min-height:46px!important;padding:7px 10px!important;background:#123B50!important;color:#ffffff!important;border-bottom:1px solid #0f2f3f!important}
        .vendas-tablet-head div{display:flex!important;flex-direction:column!important;gap:1px!important;min-width:0}
        .vendas-tablet-head span{font-size:8px!important;font-weight:500!important;letter-spacing:.08em}
        .vendas-tablet-head strong{font-size:12px!important;font-weight:500!important}
        .vendas-tablet-head small{font-size:8px!important;color:#dbeafe!important}
        .vendas-tablet-head button{height:30px!important;width:30px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;background:#ffffff!important;color:#123B50!important;border:1px solid #ffffff!important;border-radius:2px!important;flex:0 0 auto}
        .vendas-tablet-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))!important;gap:6px!important;padding:8px!important;background:#f4f7fe!important}
        .vendas-tablet-grid>button{display:flex!important;align-items:center!important;gap:8px!important;min-height:50px!important;padding:5px 7px!important;background:#ffffff!important;color:#123B50!important;border:1px solid #cbd5e1!important;border-radius:2px!important;text-align:left!important;cursor:pointer!important}
        .vendas-tablet-grid>button:hover{border-color:#2D8DB8!important;background:#f4fbfd!important}
        .vendas-tablet-grid>button>span{width:40px!important;height:40px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid!important;border-radius:2px!important;flex:0 0 auto}.vendas-tablet-grid>button>span svg{width:26px!important;height:26px!important}
        .vendas-tablet-grid>button>strong{font-size:10px!important;font-weight:500!important;line-height:1.2!important}
        .vendas-standard .rounded,.vendas-standard .rounded-sm,.vendas-standard .rounded-md,.vendas-standard .rounded-lg,.vendas-standard .rounded-xl,.vendas-standard .rounded-2xl{border-radius:2px!important}.vendas-standard .font-bold,.vendas-standard .font-extrabold,.vendas-standard .font-black{font-weight:500!important}.vendas-standard h1,.vendas-standard h2,.vendas-standard h3,.vendas-standard p,.vendas-standard label{font-weight:500!important}.vendas-standard{font-size:10px}.vendas-standard button{border-radius:2px;font-size:9px!important}.vendas-standard input:not([type=checkbox]):not([type=radio]):not([type=range]),.vendas-standard select{border-radius:2px}
      `}</style>

      {tabletMode && <style>{`.tablet-mode input,.tablet-mode select,.tablet-mode button{min-height:32px}`}</style>}
    </div>
  )
}
