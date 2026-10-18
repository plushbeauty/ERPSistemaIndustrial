/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @REVISAO_APROVACAO: APROV-008
 * @STATUS_APROVACAO: NOVA REVISAO EXPRESSAMENTE AUTORIZADA
 * @REGRA: substituir a grade de etapas por cinco setores independentes, com legenda forte e linhas uniformes h-11.
 * @ESCOPO: PCP, Almoxarifado, Qualidade, Expedição e Fiscal com dados reais isolados por empresa autenticada.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  PackageCheck,
  Search,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Order = {
  id: string
  numero: number
  pedido_cliente: string | null
  status: string
  total: number | null
  data_entrada: string | null
  data_entrega_prometida: string | null
  cliente_id: string | null
  vendedor_nome: string | null
  cliente: { nome: string; codigo: string | null } | null
}

type StatusFilter = 'todos' | 'rascunho' | 'andamento' | 'atrasados' | 'faturados' | 'cancelados'
type ProductionStage = { id: string; pedido_venda_id: string; numero_op: string; status: string; quantidade: number; quantidade_planejada: number; quantidade_produzida: number }
type QualityStage = { ordem_producao_id: string; tipo: string; resultado: string; quantidade_reprovada: number }
type ExpeditionStage = { pedido_venda_id: string; numero: number; status: string; transportadora: string | null }
type FiscalStage = { pedido_venda_id: string; tipo: string; status: string; quantidade_pendente: number }
type StockStage = { ordem_producao_id: string | null; tipo: string; quantidade: number; created_at: string }

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const PAGE_SIZE = 25
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const isDraft = (status: string) => normalize(status).includes('rascunho') || normalize(status).includes('aberto')
const isCancelled = (status: string) => normalize(status).includes('cancel')
const isInvoiced = (status: string) => normalize(status).includes('fatur')
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T00:00:00`))
  : '—'
const isOverdue = (order: Order) => Boolean(order.data_entrega_prometida)
  && new Date(`${order.data_entrega_prometida!.slice(0, 10)}T00:00:00`) < new Date(new Date().toDateString())
  && !isInvoiced(order.status)
  && !isCancelled(order.status)

function statusTone(status: string) {
  const normalized = normalize(status)
  if (normalized.includes('cancel')) return 'is-danger'
  if (normalized.includes('fatur')) return 'is-success'
  if (normalized.includes('rascunho') || normalized.includes('aberto')) return 'is-warning'
  if (normalized.includes('produc') || normalized.includes('pcp') || normalized.includes('engen')) return 'is-blue'
  return 'is-neutral'
}

const filters: Array<{ id: StatusFilter; label: string; icon: typeof ClipboardList }> = [
  { id: 'todos', label: 'Todos os pedidos', icon: ClipboardList },
  { id: 'rascunho', label: 'Rascunhos', icon: FilePlus2 },
  { id: 'andamento', label: 'Em andamento', icon: PackageCheck },
  { id: 'atrasados', label: 'Atrasados', icon: CalendarClock },
  { id: 'faturados', label: 'Faturados', icon: CheckCircle2 },
  { id: 'cancelados', label: 'Cancelados', icon: XCircle },
]

export default function VendasCentral() {
  const [orders, setOrders] = useState<Order[]>([])
  const [productionByOrder, setProductionByOrder] = useState<Record<string, ProductionStage[]>>({})
  const [stockByOrder, setStockByOrder] = useState<Record<string, StockStage[]>>({})
  const [qualityByOrder, setQualityByOrder] = useState<Record<string, QualityStage[]>>({})
  const [expeditionByOrder, setExpeditionByOrder] = useState<Record<string, ExpeditionStage[]>>({})
  const [fiscalByOrder, setFiscalByOrder] = useState<Record<string, FiscalStage[]>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('todos')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const result = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,pedido_cliente,status,total,data_entrada,data_entrega_prometida,cliente_id,vendedor_nome,cliente:erp_clientes(nome,codigo)', { count: 'exact' })
        .eq('empresa_id', String(tenant.data))
        .order('numero', { ascending: false })
        .range(from, to))
      const orderRows = result as unknown as Order[]
      setOrders(orderRows)
      const orderIds = orderRows.map((order) => order.id)
      if (!orderIds.length) {
        setProductionByOrder({})
        setStockByOrder({})
        setQualityByOrder({})
        setExpeditionByOrder({})
        setFiscalByOrder({})
      } else {
        const companyId = String(tenant.data)
        const [productionResult, expeditionResult, fiscalResult] = await Promise.all([
          supabase.from('erp_ordens_producao').select('id,pedido_venda_id,numero_op,status,quantidade,quantidade_planejada,quantidade_produzida').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
          supabase.from('erp_expedicoes').select('pedido_venda_id,numero,status,transportadora').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
          supabase.from('erp_liberacoes_fiscais').select('pedido_venda_id,tipo,status,quantidade_pendente').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
        ])
        const productionRows = (productionResult.data ?? []) as ProductionStage[]
        const productionIds = productionRows.map((row) => row.id)
        const [qualityResult, stockResult] = productionIds.length ? await Promise.all([
          supabase.from('erp_inspecoes').select('ordem_producao_id,tipo,resultado,quantidade_reprovada').eq('empresa_id', companyId).in('ordem_producao_id', productionIds),
          supabase.from('erp_estoque_movimentos').select('ordem_producao_id,tipo,quantidade,created_at').eq('empresa_id', companyId).in('ordem_producao_id', productionIds).order('created_at', { ascending: false }),
        ]) : [null, null]
        const stageErrors = [productionResult.error, qualityResult?.error, stockResult?.error, expeditionResult.error, fiscalResult.error].filter(Boolean)
        if (stageErrors.length) setError(`Pedidos carregados; não foi possível completar todas as etapas industriais: ${stageErrors.map((item) => item?.message).join(' • ')}`)
        const byOrder = <T extends { pedido_venda_id: string }>(rows: T[] | null) => (rows ?? []).reduce<Record<string, T[]>>((map, row) => { map[row.pedido_venda_id] = [...(map[row.pedido_venda_id] ?? []), row]; return map }, {})
        setProductionByOrder(byOrder(productionRows))
        const opToOrder = new Map(productionRows.map((row) => [row.id, row.pedido_venda_id]))
        const stockMap = ((stockResult?.data ?? []) as StockStage[]).reduce<Record<string, StockStage[]>>((map, row) => {
          const orderId = row.ordem_producao_id ? opToOrder.get(row.ordem_producao_id) : undefined
          if (orderId) map[orderId] = [...(map[orderId] ?? []), row]
          return map
        }, {})
        setStockByOrder(stockMap)
        const qualityMap = ((qualityResult?.data ?? []) as QualityStage[]).reduce<Record<string, QualityStage[]>>((map, row) => { const orderId = opToOrder.get(row.ordem_producao_id); if (orderId) map[orderId] = [...(map[orderId] ?? []), row]; return map }, {})
        setQualityByOrder(qualityMap)
        setExpeditionByOrder(byOrder((expeditionResult.data ?? []) as ExpeditionStage[]))
        setFiscalByOrder(byOrder((fiscalResult.data ?? []) as FiscalStage[]))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os pedidos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const visibleOrders = useMemo(() => {
    const term = normalize(query.trim())
    return orders.filter((order) => {
      const haystack = normalize([
        order.numero,
        order.pedido_cliente ?? '',
        order.status,
        order.cliente?.nome ?? '',
        order.cliente?.codigo ?? '',
      ].join(' '))
      if (term && !haystack.includes(term)) return false
      if (filter === 'rascunho') return isDraft(order.status)
      if (filter === 'andamento') return !isDraft(order.status) && !isCancelled(order.status) && !isInvoiced(order.status)
      if (filter === 'atrasados') return isOverdue(order)
      if (filter === 'faturados') return isInvoiced(order.status)
      if (filter === 'cancelados') return isCancelled(order.status)
      return true
    })
  }, [orders, query, filter])
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageOrders = visibleOrders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const counts = useMemo(() => ({
    all: orders.length,
    open: orders.filter((order) => !isCancelled(order.status) && !isInvoiced(order.status)).length,
    drafts: orders.filter((order) => isDraft(order.status)).length,
    overdue: orders.filter(isOverdue).length,
  }), [orders])

  return (
    <VendasLayout title="Status do pedido" showStatusCards={false}>
      <main className="sales-workspace">
        {error && <div className="sales-alert" role="alert"><CircleAlert size={17} />{error}</div>}
        <div className="sales-process-legend mb-2 flex flex-wrap items-center gap-2 border border-slate-300 bg-slate-900 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-white" aria-label="Legenda das etapas do processo do pedido">
          <strong className="mr-1 text-amber-300">LEGENDA DOS SETORES</strong>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-sky-700 px-2 py-1"><i className="h-2 w-2 rounded-full bg-sky-200" /> PCP</span>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-cyan-700 px-2 py-1"><i className="h-2 w-2 rounded-full bg-cyan-200" /> Almoxarifado</span>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-600 px-2 py-1"><i className="h-2 w-2 rounded-full bg-amber-100" /> Qualidade</span>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-violet-700 px-2 py-1"><i className="h-2 w-2 rounded-full bg-violet-200" /> Expedição</span>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-700 px-2 py-1"><i className="h-2 w-2 rounded-full bg-emerald-200" /> Fiscal / NF / Saída</span>
        </div>
        <section className="sales-orders-card">
          <div className="synqra-status-grid sales-orders-status-grid" role="tablist" aria-label="Filtrar pedidos por status">
            {filters.map(({ id, label, icon: Icon }) => {
              const value = id === 'todos' ? counts.all
                : id === 'rascunho' ? counts.drafts
                : id === 'andamento' ? orders.filter((order) => !isDraft(order.status) && !isCancelled(order.status) && !isInvoiced(order.status)).length
                : id === 'atrasados' ? counts.overdue
                : id === 'faturados' ? orders.filter((order) => isInvoiced(order.status)).length
                : orders.filter((order) => isCancelled(order.status)).length
              const tone = id === 'atrasados' ? 'synqra-status-red'
                : id === 'rascunho' ? 'synqra-status-orange'
                : id === 'andamento' ? 'synqra-status-blue'
                : id === 'faturados' ? 'synqra-status-cyan'
                : id === 'cancelados' ? 'synqra-status-slate'
                : 'synqra-status-green'
              return <button key={id} type="button" role="tab" aria-selected={filter === id} className={`synqra-status-cell ${tone} sales-orders-status-card${filter === id ? ' is-active' : ''}`} onClick={() => { setFilter(id); setPage(0) }}>
                <span><Icon size={15} aria-hidden="true" /> {label}</span>
                <strong>{loading ? '—' : value}</strong>
              </button>
            })}
          </div>

          <div className="sales-list-toolbar">
            <label className="sales-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
                placeholder="Buscar por pedido, cliente ou status..."
                aria-label="Buscar pedidos por número, cliente ou status"
              />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar pesquisa"><XCircle size={16} /></button>}
            </label>
            <span className="sales-result-count">{visibleOrders.length} resultado(s)</span>
          </div>

          <div className="sales-table-scroll">
            <table className="sales-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Data</th>
                  <th>Entrega prevista</th>
                  <th>Status</th>
                  <th>Processo da peça</th>
                  <th className="sales-number">Total</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr key={order.id} className={isOverdue(order) ? "is-overdue" : ""}>
                    <td>
                      <Link className="sales-order-number" to={`/vendas/pedido/${order.id}`}>
                        PV-{String(order.numero).padStart(6, '0')}
                      </Link>
                      {order.pedido_cliente && <small className="sales-secondary-line">Ref. {order.pedido_cliente}</small>}
                    </td>
                    <td>
                      <strong className="sales-client-name">{order.cliente?.nome ?? 'Cliente não identificado'}</strong>
                      {order.cliente?.codigo && <small className="sales-secondary-line">Cód. {order.cliente.codigo}</small>}
                    </td>
                    <td>{order.vendedor_nome || '—'}</td>
                    <td>{formatDate(order.data_entrada)}</td>
                    <td>
                      <span className={isOverdue(order) ? 'sales-delivery sales-delivery--late' : 'sales-delivery'}>
                        {formatDate(order.data_entrega_prometida)}
                        {isOverdue(order) && <small>Atrasado</small>}
                      </span>
                    </td>
                    <td><span className={`sales-status ${statusTone(order.status)}`}>{order.status}</span></td>
                    <td><ProcessStages order={order} production={productionByOrder[order.id] ?? []} stock={stockByOrder[order.id] ?? []} inspections={qualityByOrder[order.id] ?? []} expeditions={expeditionByOrder[order.id] ?? []} fiscal={fiscalByOrder[order.id] ?? []} /></td>
                    <td className="sales-number sales-total">{currency.format(Number(order.total ?? 0))}</td>
                  </tr>
                ))}
                {!loading && visibleOrders.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="sales-empty-state">
                      <ClipboardList size={26} />
                      <strong>{query || filter !== 'todos' ? 'Nenhum pedido corresponde aos filtros.' : 'Nenhum pedido encontrado.'}</strong>
                      <span>{query || filter !== 'todos' ? 'Altere a pesquisa ou selecione outro status.' : 'Os pedidos cadastrados aparecerão aqui para pesquisa e acompanhamento.'}</span>
                    </div>
                  </td></tr>
                )}
                {loading && <tr><td colSpan={8} className="sales-loading-row" role="status">Carregando pedidos do ERP…</td></tr>}
              </tbody>
            </table>
          </div>
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3" aria-label="Paginação dos pedidos de venda">
            <span className="text-xs text-slate-500">
              {visibleOrders.length === 0 ? '0 pedidos' : `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, visibleOrders.length)} de ${visibleOrders.length}`}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="sales-button sales-button--secondary" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0 || loading}>Anterior</button>
              <span className="min-w-20 text-center text-xs text-slate-600">Página {currentPage + 1} de {pageCount}</span>
              <button type="button" className="sales-button sales-button--secondary" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1 || loading}>Próxima</button>
            </div>
          </nav>
        </section>
      </main>
    </VendasLayout>
  )
}

function ProcessStages({ order, production, stock, inspections, expeditions, fiscal }: { order: Order; production: ProductionStage[]; stock: StockStage[]; inspections: QualityStage[]; expeditions: ExpeditionStage[]; fiscal: FiscalStage[] }) {
  const cancelled = isCancelled(order.status)
  const draft = isDraft(order.status)
  const productionDone = production.length > 0 && production.every((row) => {
    const status = normalize(row.status)
    return status.includes('conclu') || status.includes('finaliz') || status.includes('encerr') || (Number(row.quantidade_planejada || row.quantidade || 0) > 0 && Number(row.quantidade_produzida || 0) >= Number(row.quantidade_planejada || row.quantidade || 0))
  })
  const productionActive = production.length > 0 && !productionDone
  const stockIn = stock.filter((row) => normalize(row.tipo).includes('entrada'))
  const stockOut = stock.filter((row) => normalize(row.tipo).includes('saida') || normalize(row.tipo).includes('saída'))
  const qualityRejected = inspections.some((row) => normalize(row.resultado).includes('reprov'))
  const qualityDone = inspections.length > 0 && inspections.every((row) => normalize(row.resultado).includes('aprov') && Number(row.quantidade_reprovada || 0) === 0)
  const expeditionDone = expeditions.length > 0 && expeditions.every((row) => ['expedido', 'entregue', 'conclu', 'finaliz'].some((word) => normalize(row.status).includes(word)))
  const fiscalDone = fiscal.length > 0 && fiscal.every((row) => ['emit', 'autoriz', 'fatur', 'conclu', 'finaliz'].some((word) => normalize(row.status).includes(word)))
  const sectors = [
    { label: 'PCP', detail: production.length ? production.map((row) => `OP ${row.numero_op}: ${row.status} • ${Number(row.quantidade_produzida || 0)}/${Number(row.quantidade_planejada || row.quantidade || 0)}`).join(' | ') : 'Aguardando OP', tone: cancelled ? 'is-stage-muted' : productionDone ? 'is-stage-green' : productionActive ? 'is-stage-blue' : 'is-stage-muted' },
    { label: 'ALMOXARIFADO', detail: stock.length ? `${stock.length} movimento(s) • entradas ${stockIn.length} • saídas ${stockOut.length}` : production.length ? 'Sem movimento vinculado às OPs' : 'Aguardando OP / movimento', tone: cancelled ? 'is-stage-muted' : stock.length ? 'is-stage-cyan' : 'is-stage-muted' },
    { label: 'QUALIDADE', detail: inspections.length ? inspections.map((row) => `${row.tipo}: ${row.resultado}${Number(row.quantidade_reprovada || 0) > 0 ? ` (${Number(row.quantidade_reprovada)} reprovada(s))` : ''}`).join(' | ') : 'Aguardando inspeção', tone: cancelled ? 'is-stage-muted' : qualityRejected ? 'is-stage-red' : qualityDone ? 'is-stage-green' : inspections.length ? 'is-stage-amber' : 'is-stage-muted' },
    { label: 'EXPEDIÇÃO', detail: expeditions.length ? expeditions.map((row) => `EXP ${row.numero}: ${row.status}${row.transportadora ? ` • ${row.transportadora}` : ''}`).join(' | ') : 'Aguardando expedição', tone: cancelled ? 'is-stage-muted' : expeditionDone ? 'is-stage-green' : expeditions.length ? 'is-stage-violet' : 'is-stage-muted' },
    { label: 'FISCAL', detail: fiscal.length ? fiscal.map((row) => `${row.tipo}: ${row.status} (pendente ${Number(row.quantidade_pendente || 0)})`).join(' | ') : 'Aguardando liberação fiscal', tone: cancelled ? 'is-stage-muted' : fiscalDone ? 'is-stage-green' : fiscal.length ? 'is-stage-cyan' : 'is-stage-muted' },
  ]
  return <div className="sales-process-stages sales-sector-columns grid min-w-[240px] gap-1" aria-label={`Setores do pedido PV-${String(order.numero).padStart(6, '0')}`}>
    {sectors.map((sector) => {
      const toneClass = sector.tone === 'is-stage-green' ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
        : sector.tone === 'is-stage-blue' ? 'border-sky-600 bg-sky-50 text-sky-950'
        : sector.tone === 'is-stage-cyan' ? 'border-cyan-600 bg-cyan-50 text-cyan-950'
        : sector.tone === 'is-stage-amber' ? 'border-amber-500 bg-amber-50 text-amber-950'
        : sector.tone === 'is-stage-violet' ? 'border-violet-600 bg-violet-50 text-violet-950'
        : sector.tone === 'is-stage-red' ? 'border-rose-600 bg-rose-50 text-rose-950'
        : 'border-slate-300 bg-slate-50 text-slate-700'
      return <div key={sector.label} className={`sales-process-stage sales-sector-row grid h-11 grid-cols-[82px_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-[2px] border-l-4 px-2 ${toneClass}`} title={`${sector.label}: ${sector.detail}`}>
        <span className="text-[9px] font-extrabold uppercase tracking-wide">{sector.label}</span>
        <strong className="truncate text-[10px] font-semibold">{sector.detail}</strong>
      </div>
    })}
  </div>
}
