/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-09
 * @REVISAO: REV-DASHBOARD-VENDAS-DADOS-REAIS-20261109-01 — ordem explícita do proprietário em 2026-11-09: preencher o dashboard com gráficos operacionais reais; excluir registros identificados como homologação/teste; não inventar faturamento.
 * @STATUS_APROVACAO: REVISÃO AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-09 — build e conferência de dados pendentes.
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity, CircleDollarSign, ClipboardList, RefreshCw, TrendingUp, Users } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Pedido = {
  id: string
  numero: number | null
  cliente_id: string | null
  status: string | null
  total: number | null
  created_at: string
  vendedor_nome: string | null
  observacoes: string | null
  pedido_cliente: string | null
}

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const monthValue = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function bounds(value: string, period: 'mes' | 'ano') {
  const match = /^(\\d{4})-(\\d{2})$/.exec(value)
  if (!match) throw new Error('Selecione um período válido.')
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) throw new Error('Selecione um período válido.')
  if (period === 'ano') return { start: `${year}-01-01T00:00:00`, end: `${year + 1}-01-01T00:00:00` }
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01T00:00:00`,
    end: `${next.year}-${String(next.month).padStart(2, '0')}-01T00:00:00`,
  }
}
function isTestRecord(row: Pedido) {
  const marker = `${row.observacoes ?? ''} ${row.pedido_cliente ?? ''}`.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase()
  return marker.includes('HOMOLOGACAO') || marker.includes('PLASTIBOR-')
}
const palette = ['#123B50', '#2D8DB8', '#48B7C7', '#3A9D78', '#E6A34A', '#D65B61']

export default function VendasDashboardGraficos() {
  const [orders, setOrders] = useState<Pedido[]>([])
  const [testCount, setTestCount] = useState(0)
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<'mes' | 'ano'>('mes')
  const [month, setMonth] = useState(monthValue)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { start, end } = bounds(month, period)
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada na sessão.')
      const loaded = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,cliente_id,status,total,created_at,vendedor_nome,observacoes,pedido_cliente', { count: 'exact' })
        .eq('empresa_id', String(company.data))
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: true })
        .range(from, to)) as Pedido[]
      const operationalRows = loaded.filter(row => !isTestRecord(row))
      const customerIds = [...new Set(operationalRows.map(row => row.cliente_id).filter((id): id is string => Boolean(id)))]
      const names: Record<string, string> = {}
      if (customerIds.length) {
        const customers = await supabase.from('erp_clientes')
          .select('id,nome,nome_fantasia,razao_social')
          .eq('empresa_id', String(company.data))
          .in('id', customerIds)
        if (customers.error) throw customers.error
        for (const customer of customers.data ?? []) {
          names[customer.id] = customer.nome_fantasia || customer.nome || customer.razao_social || 'Cliente sem nome'
        }
      }
      setCustomerNames(names)
      setTestCount(loaded.length - operationalRows.length)
      setOrders(operationalRows)
    } catch (cause) {
      setOrders([])
      setTestCount(0)
      setCustomerNames({})
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar os pedidos de venda.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [month, period])

  const data = useMemo(() => {
    const byDay = new Map<string, { dia: string; pedidos: number; valor: number }>()
    const byStatus = new Map<string, number>()
    const bySeller = new Map<string, { vendedor: string; pedidos: number; valor: number }>()
    const byCustomer = new Map<string, { cliente: string; pedidos: number; valor: number }>()
    for (const row of orders) {
      const date = new Date(row.created_at)
      const day = Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Data inválida'
      const value = Number(row.total ?? 0) || 0
      const status = (row.status || 'Sem status').trim()
      const seller = row.vendedor_nome?.trim() || 'Não informado'
      const customer = row.cliente_id ? (customerNames[row.cliente_id] ?? 'Cliente não identificado') : 'Sem cliente vinculado'
      const daily = byDay.get(day) ?? { dia: day, pedidos: 0, valor: 0 }
      daily.pedidos += 1; daily.valor += value; byDay.set(day, daily)
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
      const sellerRow = bySeller.get(seller) ?? { vendedor: seller, pedidos: 0, valor: 0 }
      sellerRow.pedidos += 1; sellerRow.valor += value; bySeller.set(seller, sellerRow)
      const customerRow = byCustomer.get(customer) ?? { cliente: customer, pedidos: 0, valor: 0 }
      customerRow.pedidos += 1; customerRow.valor += value; byCustomer.set(customer, customerRow)
    }
    return {
      byDay: [...byDay.values()],
      byStatus: [...byStatus.entries()].map(([status, quantidade]) => ({ status, quantidade })),
      bySeller: [...bySeller.values()].sort((a, b) => b.valor - a.valor).slice(0, 8),
      byCustomer: [...byCustomer.values()].sort((a, b) => b.valor - a.valor).slice(0, 8),
      total: orders.reduce((sum, row) => sum + (Number(row.total ?? 0) || 0), 0),
      pending: orders.filter(row => !['faturado', 'cancelado', 'concluido', 'concluído'].includes((row.status ?? '').toLowerCase())).length,
    }
  }, [orders, customerNames])

  const empty = !loading && !error && orders.length === 0
  const ChartEmpty = ({ children }: { children: string }) => (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded border border-dashed border-[#D3E3EA] bg-[#F4FBFD] px-6 text-center text-sm text-[#557080]">{children}</div>
  )

  return (
    <VendasLayout
      title="Dashboard de vendas"
      subtitle="Indicadores e gráficos calculados a partir dos pedidos comerciais reais"
      onRefresh={() => void load()}
      showStatusCards={false}
    >
      <div className="sales-workspace space-y-4">
        <section className="sales-page-heading">
          <div>
            <span className="sales-eyebrow">SYSNQRA · VENDAS / INDICADORES</span>
            <p>Pedidos por período, situação, cliente e vendedor. Registros identificados como homologação ou teste são excluídos.</p>
          </div>
          <div className="sales-heading-actions">
            <label className="sales-button sales-button--secondary">Visão
              <select value={period} onChange={event => setPeriod(event.target.value as 'mes' | 'ano')} aria-label="Visão do período">
                <option value="mes">Mês</option><option value="ano">Ano</option>
              </select>
            </label>
            <label className="sales-button sales-button--secondary">Período
              <input type="month" value={month} onChange={event => setMonth(event.target.value)} aria-label="Período dos pedidos" />
            </label>
            <button type="button" onClick={() => void load()} className="sales-button sales-button--primary" disabled={loading}>
              <RefreshCw size={15}/> Atualizar
            </button>
            <button type="button" onClick={() => window.print()} className="sales-button sales-button--secondary no-print">Imprimir</button>
          </div>
        </section>

        {error && <div role="alert" className="sales-alert">{error}</div>}
        {loading && <div role="status" className="sales-loading-row">Consultando pedidos comerciais…</div>}
        {empty && (
          <div role="status" className="rounded border border-[#E6A34A] bg-[#FFF9EE] p-4 text-sm text-[#6F501D]">
            Não há pedidos comerciais operacionais neste período. Nenhum valor ou gráfico fictício foi criado.
            {testCount > 0 && <span> {testCount} registro(s) de homologação/teste foram ignorados.</span>}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="sales-orders-card p-4"><span className="sales-eyebrow">PEDIDOS NO PERÍODO</span><div className="mt-2 flex items-center gap-2"><ClipboardList className="text-[#2D8DB8]"/><strong className="text-2xl text-[#123B50]">{orders.length}</strong></div></article>
          <article className="sales-orders-card p-4"><span className="sales-eyebrow">VALOR DOS PEDIDOS</span><div className="mt-2 flex items-center gap-2"><CircleDollarSign className="text-[#3A9D78]"/><strong className="text-xl text-[#123B50]">{brl(data.total)}</strong></div></article>
          <article className="sales-orders-card p-4"><span className="sales-eyebrow">TICKET MÉDIO</span><div className="mt-2 flex items-center gap-2"><TrendingUp className="text-[#2D8DB8]"/><strong className="text-xl text-[#123B50]">{brl(orders.length ? data.total / orders.length : 0)}</strong></div></article>
          <article className="sales-orders-card p-4"><span className="sales-eyebrow">EM ABERTO / ANDAMENTO</span><div className="mt-2 flex items-center gap-2"><Activity className="text-[#E6A34A]"/><strong className="text-2xl text-[#123B50]">{data.pending}</strong></div></article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="sales-orders-card p-4">
            <div className="mb-3"><span className="sales-eyebrow">EVOLUÇÃO</span><h2 className="font-bold text-[#123B50]">Pedidos e valores por dia</h2></div>
            <div className="h-[320px]">
              {data.byDay.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.byDay}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="dia"/><YAxis yAxisId="left"/><YAxis yAxisId="right" orientation="right"/><Tooltip formatter={(value, name) => name === 'Valor' ? brl(Number(value)) : value}/><Area yAxisId="left" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#2D8DB8" fill="#48B7C7" fillOpacity={0.25}/><Area yAxisId="right" type="monotone" dataKey="valor" name="Valor" stroke="#3A9D78" fill="#3A9D78" fillOpacity={0.12}/></AreaChart></ResponsiveContainer> : <ChartEmpty>Sem pedidos reais para desenhar a evolução neste período.</ChartEmpty>}
            </div>
          </article>
          <article className="sales-orders-card p-4">
            <div className="mb-3"><span className="sales-eyebrow">SITUAÇÃO</span><h2 className="font-bold text-[#123B50]">Pedidos por status</h2></div>
            <div className="h-[320px]">
              {data.byStatus.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.byStatus} dataKey="quantidade" nameKey="status" outerRadius={110} label>{data.byStatus.map((entry, index) => <Cell key={entry.status} fill={palette[index % palette.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer> : <ChartEmpty>O gráfico será preenchido quando existirem pedidos comerciais operacionais.</ChartEmpty>}
            </div>
          </article>
          <article className="sales-orders-card p-4">
            <div className="mb-3"><span className="sales-eyebrow">CLIENTES</span><h2 className="font-bold text-[#123B50]">Volume por cliente</h2></div>
            <div className="h-[320px]">
              {data.byCustomer.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.byCustomer} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="cliente" width={100}/><Tooltip formatter={value => brl(Number(value))}/><Bar dataKey="valor" name="Valor" fill="#2D8DB8" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer> : <ChartEmpty>Sem pedidos vinculados a clientes neste período.</ChartEmpty>}
            </div>
          </article>
          <article className="sales-orders-card p-4">
            <div className="mb-3"><span className="sales-eyebrow">EQUIPE COMERCIAL</span><h2 className="font-bold text-[#123B50]">Pedidos por vendedor</h2></div>
            <div className="h-[320px]">
              {data.bySeller.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.bySeller}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="vendedor" interval={0} angle={-15} textAnchor="end" height={70}/><YAxis/><Tooltip formatter={value => brl(Number(value))}/><Bar dataKey="valor" name="Valor" fill="#3A9D78" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <ChartEmpty>Sem pedidos com vendedor identificado neste período.</ChartEmpty>}
            </div>
          </article>
        </section>
        <div className="flex items-center gap-2 text-xs text-[#557080]"><Users size={14}/> Fonte: erp_pedidos_venda, filtrada pela empresa da sessão. {testCount} registro(s) de teste/homologação excluído(s).</div>
      </div>
    </VendasLayout>
  )
}
