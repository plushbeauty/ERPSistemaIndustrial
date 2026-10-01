import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ClipboardList,
  FilePlus2,
  BookOpen,
  ListChecks,
  Clock3,
  LogOut,
  PackageSearch,
  RefreshCw,
  Settings,
  Target,
  Users,
  Tablet,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = {
  id: string
  numero: number
  status: string
  total: number
  data_entrega_prometida: string | null
  cliente_id: string
  cliente_nome: string
}

type Company = {
  nome_fantasia: string | null
  razao_social: string | null
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

const normalizeStatus = (value: string) => value.trim().toLowerCase()

const statusLabel: Record<string, string> = {
  cotacao: 'Cotação',
  em_analise: 'Em análise',
  necessita_producao: 'Necessita produção',
  parcial: 'Parcial',
  reservado: 'Reservado',
  separado: 'Separado',
  faturado: 'Faturado',
  cancelado: 'Cancelado',
}

const statusClass: Record<string, string> = {
  cotacao: 'bg-amber-50 text-amber-900 border-amber-200',
  em_analise: 'bg-sky-50 text-sky-900 border-sky-200',
  necessita_producao: 'bg-orange-50 text-orange-900 border-orange-200',
  parcial: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  reservado: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  separado: 'bg-violet-50 text-violet-900 border-violet-200',
  faturado: 'bg-teal-50 text-teal-900 border-teal-200',
  cancelado: 'bg-slate-100 text-slate-700 border-slate-200',
}

const menu = [
  { label: 'Visão Geral', href: '/vendas', icon: BarChart3 },
  { label: 'Entrada Pedido', href: '/vendas/novo-pedido', icon: FilePlus2 },
  { label: 'Status Pedido', href: '/vendas/status', icon: ListChecks },
  { label: 'Carteira', href: '/vendas/carteira', icon: PackageSearch },
  { label: 'Clientes', href: '/vendas/clientes', icon: Users },
  { label: 'Catálogo Digital', href: '/vendas/catalogo-digital/gestao', icon: BookOpen },
  { label: 'Metas', href: '/vendas/metas', icon: Target },
  { label: 'Gráficos', href: '/vendas/dashboard-graficos', icon: BarChart3 },
  { label: 'Configurações', href: '/vendas/configuracoes', icon: Settings },
]

export default function VendasCentral() {
  const [company, setCompany] = useState<Company | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const companyId = await supabase.rpc('erp_current_empresa_id')
      if (companyId.error || !companyId.data) {
        throw companyId.error ?? new Error('Empresa ERP não identificada.')
      }

      const id = String(companyId.data)
      const [companyResult, ordersResult, clientsResult] = await Promise.all([
        supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', id).maybeSingle(),
        supabase
          .from('erp_pedidos_venda')
          .select('id,numero,status,total,data_entrega_prometida,cliente_id')
          .eq('empresa_id', id)
          .order('numero', { ascending: false })
          .limit(500),
        supabase.from('erp_clientes').select('id,nome').eq('empresa_id', id).eq('ativo', true).limit(3000),
      ])

      if (companyResult.error) throw companyResult.error
      if (ordersResult.error) throw ordersResult.error
      if (clientsResult.error) throw clientsResult.error

      const clients = new Map(
        (clientsResult.data ?? []).map(client => [String(client.id), String(client.nome)]),
      )

      setCompany((companyResult.data ?? null) as Company | null)
      setOrders(
        (ordersResult.data ?? []).map(order => ({
          ...order,
          cliente_nome: clients.get(String(order.cliente_id)) ?? 'Cliente não identificado',
        })) as Order[],
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o módulo de Vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const metrics = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const active = orders.filter(order => !['faturado', 'cancelado'].includes(normalizeStatus(order.status)))
    const overdue = active.filter(order => {
      if (!order.data_entrega_prometida) return false
      const due = new Date(order.data_entrega_prometida)
      due.setHours(0, 0, 0, 0)
      return due < today
    })
    const pending = active.filter(order =>
      ['cotacao', 'em_analise', 'parcial'].includes(normalizeStatus(order.status)),
    )
    const production = active.filter(order => normalizeStatus(order.status) === 'necessita_producao')
    const openValue = active.reduce((sum, order) => sum + Number(order.total || 0), 0)

    return { total: orders.length, overdue, pending, production, openValue }
  }, [orders])

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { label: string; orders: number; value: number }>()
    for (const order of orders) {
      const date = new Date(order.data_entrega_prometida ?? new Date().toISOString())
      const key = date.toISOString().slice(0, 7)
      const current = byMonth.get(key) ?? {
        label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        orders: 0,
        value: 0,
      }
      current.orders += 1
      current.value += Number(order.total || 0)
      byMonth.set(key, current)
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, value]) => value)
  }, [orders])

  const open = (href: string) => window.location.assign(href)

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2D8DB8]">Vendas</p>
            <h1 className="mt-1 text-lg font-medium text-[#123B50]">Painel Comercial</h1>
            <p className="mt-1 truncate text-xs font-normal text-slate-500">
              {company?.nome_fantasia || company?.razao_social || 'Empresa ERP'}
            </p>
          </div>
          <nav className="flex-1 px-3 py-4">
            <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Vendas</p>
            <div className="space-y-0.5">
              {menu.map(item => {
                const Icon = item.icon
                const active = item.href === '/vendas'
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => open(item.href)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-normal transition ${
                      active
                        ? 'bg-[#E8F4F8] text-[#176487]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#123B50]'
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-64">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
            <div className="flex min-h-[70px] items-center justify-between gap-4 px-5 lg:px-8">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#2D8DB8]">ERP Industrial • Vendas</p>
                <h2 className="mt-1 text-xl font-medium text-[#123B50]">Painel Comercial</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => open('/tablet/dashboard')}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Tablet size={15} strokeWidth={1.8} />
                  TABLET
                </button>
                <button
                  type="button"
                  onClick={() => void supabase.auth.signOut()}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  SAIR
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  aria-label="Atualizar painel"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </header>

          <section className="space-y-5 p-5 lg:p-8">
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <DashboardMetric label="Pedidos" value={metrics.total} onClick={() => open('/vendas/carteira')} />
              <DashboardMetric label="Atrasados" value={metrics.overdue.length} danger onClick={() => open('/vendas/status?filtro=atrasados')} />
              <DashboardMetric label="Pendentes" value={metrics.pending.length} onClick={() => open('/vendas/status?filtro=todos')} />
              <DashboardMetric label="Necessita produção" value={metrics.production.length} onClick={() => open('/vendas/status?filtro=producao')} />
              <DashboardMetric label="Carteira" value={money(metrics.openValue)} />
            </div>

            <section className="grid gap-5 xl:grid-cols-2">
              <RealChart title="Vendas por período" data={chartData} valueKey="value" money />
              <RealChart title="Pedidos por período" data={chartData} valueKey="orders" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="text-base font-medium text-[#123B50]">Pedidos atrasados</h3>
                    <p className="mt-1 text-xs text-slate-500">Pedidos ativos cuja entrega prometida já venceu.</p>
                  </div>
                  <button type="button" onClick={() => open('/vendas/carteira?filtro=atrasados')} className="text-xs font-normal text-[#2D8DB8]">
                    Ver todos
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {metrics.overdue.slice(0, 6).map(order => (
                    <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">PV-{String(order.numero).padStart(6, '0')} · {order.cliente_nome}</p>
                        <p className="mt-0.5 text-xs text-rose-600">
                          Entrega: {new Date(order.data_entrega_prometida as string).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-slate-700">{money(order.total)}</span>
                    </div>
                  ))}
                  {!metrics.overdue.length && (
                    <div className="px-5 py-8 text-center text-sm text-slate-500">Nenhum pedido atrasado encontrado.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="text-base font-medium text-[#123B50]">Próximos e críticos</h3>
                  <p className="mt-1 text-xs text-slate-500">Pedidos ativos com entrega próxima ou necessidade de produção.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {orders
                    .filter(order => !['faturado', 'cancelado'].includes(normalizeStatus(order.status)))
                    .slice(0, 6)
                    .map(order => {
                      const key = normalizeStatus(order.status)
                      return (
                        <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">PV-{String(order.numero).padStart(6, '0')} · {order.cliente_nome}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : 'Sem entrega prometida'}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-normal ${statusClass[key] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                            {statusLabel[key] ?? order.status}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}

function DashboardMetric({
  label,
  value,
  danger = false,
  onClick,
}: {
  label: string
  value: number | string
  danger?: boolean
  onClick?: () => void
}) {
  const className = `rounded-lg border bg-white p-5 text-left shadow-sm transition ${
    onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
  } ${danger ? 'border-rose-200' : 'border-slate-200'}`

  const body = (
    <>
      <p className={`text-xs font-normal ${danger ? 'text-rose-600' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-2 text-2xl font-medium ${danger ? 'text-rose-700' : 'text-[#123B50]'}`}>{value}</p>
    </>
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  ) : (
    <div className={className}>{body}</div>
  )
}

function RealChart({
  title,
  data,
  valueKey,
  money: moneyAxis = false,
}: {
  title: string
  data: Array<{ label: string; orders: number; value: number }>
  valueKey: 'orders' | 'value'
  money?: boolean
}) {
  const max = Math.max(...data.map(item => Number(item[valueKey])), 1)
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-medium text-[#123B50]">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">Dados reais carregados da carteira de pedidos.</p>
      </div>
      {data.length ? (
        <div className="flex h-48 items-end gap-2">
          {data.map(item => {
            const value = Number(item[valueKey])
            const height = Math.max(8, (value / max) * 100)
            return (
              <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-normal text-slate-500">
                  {moneyAxis ? money(value) : String(value)}
                </span>
                <div className="flex h-32 w-full max-w-16 items-end rounded bg-slate-100">
                  <div className="w-full rounded bg-[#2D8DB8]" style={{ height: `${height}%` }} title={moneyAxis ? money(value) : String(value)} />
                </div>
                <span className="truncate text-[10px] font-normal text-slate-500">{item.label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">Sem dados para o gráfico.</div>
      )}
    </section>
  )
}
