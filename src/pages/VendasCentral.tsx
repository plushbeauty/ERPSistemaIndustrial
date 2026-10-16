/**
 * @DATA_REVISAO_APROVACAO: 2026-10-16
 * @REVISAO_APROVACAO: APROV-004
 * @STATUS_APROVACAO: APROVADO-IMUTAVEL
 * @REGRA: revisão APROV-004 autorizada expressamente em 2026-10-16; novas alterações exigem nova ordem expressa.
 * @ESCOPO: ampliar cards e incluir etapas reais de pedido, produção, expedição e NF/saída com status por empresa.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
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
type ProductionStage = { numero_op: string; status: string; quantidade: number; quantidade_planejada: number; quantidade_produzida: number }
type ExpeditionStage = { numero: number; status: string; transportadora: string | null }
type FiscalStage = { tipo: string; status: string; quantidade_pendente: number }

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
        setExpeditionByOrder({})
        setFiscalByOrder({})
      } else {
        const companyId = String(tenant.data)
        const [productionResult, expeditionResult, fiscalResult] = await Promise.all([
          supabase.from('erp_ordens_producao').select('pedido_venda_id,numero_op,status,quantidade,quantidade_planejada,quantidade_produzida').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
          supabase.from('erp_expedicoes').select('pedido_venda_id,numero,status,transportadora').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
          supabase.from('erp_liberacoes_fiscais').select('pedido_venda_id,tipo,status,quantidade_pendente').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
        ])
        const stageErrors = [productionResult.error, expeditionResult.error, fiscalResult.error].filter(Boolean)
        if (stageErrors.length) setError(`Pedidos carregados; não foi possível completar todas as etapas industriais: ${stageErrors.map((item) => item?.message).join(' • ')}`)
        const byOrder = <T extends { pedido_venda_id: string }>(rows: T[] | null) => (rows ?? []).reduce<Record<string, T[]>>((map, row) => { map[row.pedido_venda_id] = [...(map[row.pedido_venda_id] ?? []), row]; return map }, {})
        setProductionByOrder(byOrder((productionResult.data ?? []) as Array<ProductionStage & { pedido_venda_id: string }>))
        setExpeditionByOrder(byOrder((expeditionResult.data ?? []) as Array<ExpeditionStage & { pedido_venda_id: string }>))
        setFiscalByOrder(byOrder((fiscalResult.data ?? []) as Array<FiscalStage & { pedido_venda_id: string }>))
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

  return (
    <VendasLayout title="Status do pedido" showStatusCards={false}>
      <main className="sales-workspace">
        {error && <div className="sales-alert" role="alert"><CircleAlert size={17} />{error}</div>}

        <section className="sales-orders-card">
          <div className="synqra-status-grid sales-orders-status-grid" role="tablist" aria-label="Filtrar pedidos por status">
            {filters.map(({ id, label, icon: Icon }) => {
              const value = id === 'todos' ? orders.length
                : id === 'rascunho' ? orders.filter((order) => isDraft(order.status)).length
                : id === 'andamento' ? orders.filter((order) => !isDraft(order.status) && !isCancelled(order.status) && !isInvoiced(order.status)).length
                : id === 'atrasados' ? orders.filter(isOverdue).length
                : id === 'faturados' ? orders.filter((order) => isInvoiced(order.status)).length
                : orders.filter((order) => isCancelled(order.status)).length
              const tone = id === 'atrasados' ? 'synqra-status-red'
                : id === 'rascunho' ? 'synqra-status-orange'
                : id === 'andamento' ? 'synqra-status-blue'
                : id === 'faturados' ? 'synqra-status-cyan'
                : id === 'cancelados' ? 'synqra-status-slate'
                : 'synqra-status-green'
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={`synqra-status-cell ${tone} sales-orders-status-card${filter === id ? ' is-active' : ''}`}
                  onClick={() => {
                    setFilter(id)
                    setPage(0)
                  }}
                >
                  <span><Icon size={15} aria-hidden="true" /> {label}</span>
                  <strong>{loading ? '—' : value}</strong>
                </button>
              )
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
                    <td><ProcessStages order={order} production={productionByOrder[order.id] ?? []} expeditions={expeditionByOrder[order.id] ?? []} fiscal={fiscalByOrder[order.id] ?? []} /></td>
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

function ProcessStages({ order, production, expeditions, fiscal }: { order: Order; production: ProductionStage[]; expeditions: ExpeditionStage[]; fiscal: FiscalStage[] }) {
  const cancelled = isCancelled(order.status)
  const draft = isDraft(order.status)
  const productionDone = production.length > 0 && production.every((row) => {
    const status = normalize(row.status)
    return status.includes('conclu') || status.includes('finaliz') || status.includes('encerr') || (Number(row.quantidade_planejada || row.quantidade || 0) > 0 && Number(row.quantidade_produzida || 0) >= Number(row.quantidade_planejada || row.quantidade || 0))
  })
  const productionActive = production.length > 0 && !productionDone
  const expeditionDone = expeditions.length > 0 && expeditions.every((row) => ['expedido', 'entregue', 'concluido', 'concluida', 'finalizado', 'finalizada'].some((word) => normalize(row.status).includes(word)))
  const fiscalDone = fiscal.length > 0 && fiscal.every((row) => ['emitido', 'autorizado', 'faturado', 'concluido', 'concluida', 'finalizado'].some((word) => normalize(row.status).includes(word)))
  const stages = [
    { label: 'Pedido', detail: order.status || 'Recebido', tone: cancelled ? 'is-stage-red' : draft ? 'is-stage-amber' : 'is-stage-green' },
    { label: 'Produção', detail: production.length ? production.map((row) => `OP ${row.numero_op}: ${row.status} (${Number(row.quantidade_produzida || 0)}/${Number(row.quantidade_planejada || row.quantidade || 0)})`).join(' • ') : 'Aguardando OP', tone: cancelled ? 'is-stage-muted' : productionDone ? 'is-stage-green' : productionActive ? 'is-stage-blue' : 'is-stage-muted' },
    { label: 'Expedição', detail: expeditions.length ? expeditions.map((row) => `EXP ${row.numero}: ${row.status}`).join(' • ') : 'Aguardando expedição', tone: cancelled ? 'is-stage-muted' : expeditionDone ? 'is-stage-green' : expeditions.length ? 'is-stage-violet' : 'is-stage-muted' },
    { label: 'NF / Saída', detail: fiscal.length ? fiscal.map((row) => `${row.tipo}: ${row.status} (pendente ${Number(row.quantidade_pendente || 0)})`).join(' • ') : 'Aguardando liberação fiscal', tone: cancelled ? 'is-stage-muted' : fiscalDone ? 'is-stage-green' : fiscal.length ? 'is-stage-cyan' : 'is-stage-muted' },
  ]
  return <div className="sales-process-stages" aria-label={`Etapas do pedido PV-${String(order.numero).padStart(6, '0')}`}>
    {stages.map((stage) => <div key={stage.label} className={`sales-process-stage ${stage.tone}`} title={`${stage.label}: ${stage.detail}`}><span>{stage.label}</span><strong>{stage.detail}</strong></div>)}
  </div>
}
