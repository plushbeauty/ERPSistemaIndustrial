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
  { label: 'Dashboard Comercial', href: '/vendas', icon: BarChart3 },
  { label: 'Novo Pedido de Venda', href: '/vendas/novo-pedido', icon: FilePlus2 },
  { label: 'Análise de Orçamentos', href: '/vendas/orcamentos', icon: ClipboardList },
  { label: 'Pedidos Pendentes', href: '/vendas/pendentes', icon: ListChecks },
  { label: 'Ajuste Global de Preços', href: '/vendas/reajuste', icon: Settings },
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
      ['cotacao', 'em_analise', 'parcial', 'aguardando produção', 'aguardando_producao'].includes(normalizeStatus(order.status)),
    )
    const production = active.filter(order => ['necessita_producao', 'aguardando produção', 'aguardando_producao', 'liberado para produção', 'liberado_para_producao'].includes(normalizeStatus(order.status)))
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
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-slate-200 bg-[#343A40] lg:flex lg:flex-col">
          <div className="border-b border-slate-700 px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Vendas</p><h1 className="mt-1 text-sm font-medium text-white">Módulo Comercial</h1><p className="mt-1 truncate text-[10px] text-slate-300">{company?.nome_fantasia || company?.razao_social || 'Empresa ERP'}</p></div>
          <nav className="flex-1 px-2 py-3">
            {menu.map(item => { const Icon=item.icon; const active=item.href === '/vendas'; return <button key={item.href} type="button" onClick={() => open(item.href)} className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[11px] ${active ? 'bg-[#495057] text-white font-bold' : 'text-slate-300 hover:bg-slate-700'}`}><Icon size={14}/><span>{item.label}</span></button> })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-56">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4">
              <div><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#2D8DB8]">ERP Industrial • Vendas</p><h2 className="text-sm font-medium text-[#123B50]">Painel Comercial</h2></div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => open('/tablet/dashboard')} className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold"><Tablet size={13}/>TABLET</button><button type="button" onClick={() => void supabase.auth.signOut()} className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-[10px] font-bold"><LogOut size={13}/>SAIR</button><button type="button" onClick={() => void load()} className="inline-flex h-7 items-center justify-center rounded border border-slate-300 px-2"><RefreshCw size={13}/></button></div>
            </div>
          </header>
          <section className="space-y-3 p-3 lg:p-4">
            {error && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</div>}
            <div className="grid gap-2 md:grid-cols-4"><DashboardMetric label="Pedidos Pendentes" value={metrics.pending.length} onClick={() => open('/vendas/status')} /><DashboardMetric label="Carteira Aberta" value={money(metrics.openValue)} /><DashboardMetric label="Necessita produção" value={metrics.production.length} /><DashboardMetric label="Pedidos Totais" value={metrics.total} /></div>
            <section className="grid gap-3 xl:grid-cols-2"><RealChart title="Vendas por período" data={chartData} valueKey="value" money /><RealChart title="Pedidos por período" data={chartData} valueKey="orders" /></section>
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
