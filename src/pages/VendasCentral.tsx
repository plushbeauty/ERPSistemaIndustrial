import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FilePlus2,
  PackageCheck,
  RefreshCw,
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
  cliente: { nome: string; codigo: string | null } | null
}

type StatusFilter = 'todos' | 'rascunho' | 'andamento' | 'atrasados' | 'faturados' | 'cancelados'

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
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('todos')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const result = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,pedido_cliente,status,total,data_entrada,data_entrega_prometida,cliente_id,cliente:erp_clientes(nome,codigo)', { count: 'exact' })
        .eq('empresa_id', String(tenant.data))
        .order('numero', { ascending: false })
        .range(from, to))
      setOrders(result as unknown as Order[])
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
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null
  const openNew = () => { setSelectedId(null); window.location.assign('/vendas/novo-pedido') }
  const openEdit = () => {
    if (!selectedOrder) { setError('Selecione um pedido no DBGrid antes de editar.'); return }
    window.location.assign('/vendas/novo-pedido?pedido=' + encodeURIComponent(selectedOrder.id))
  }
  const requestDelete = () => {
    if (!selectedOrder) { setError('Selecione um pedido no DBGrid antes de deletar.'); return }
    setError('')
    setConfirmDelete(true)
  }
  const deleteSelected = async () => {
    if (!selectedOrder) return
    setDeleteBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const result = await supabase.from('erp_pedidos_venda').delete().eq('id', selectedOrder.id).eq('empresa_id', String(tenant.data)).select('id').maybeSingle()
      if (result.error) throw result.error
      setConfirmDelete(false); setSelectedId(null); await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível deletar o pedido.')
    } finally { setDeleteBusy(false) }
  }

  const counts = useMemo(() => ({
    all: orders.length,
    open: orders.filter((order) => !isCancelled(order.status) && !isInvoiced(order.status)).length,
    drafts: orders.filter((order) => isDraft(order.status)).length,
    overdue: orders.filter(isOverdue).length,
  }), [orders])

  return (
    <VendasLayout title="Pedidos de venda" subtitle="Carteira comercial • dados do ERP" onRefresh={() => void load()}>
      <main className="sales-workspace">
        <section className="sales-page-heading">
          <div>
            <span className="sales-eyebrow">COMERCIAL / PEDIDOS</span>
            <h1>Pedidos de venda</h1>
            <p>Acompanhe cotações, pedidos e entregas em um só lugar.</p>
          </div>
          <div className="sales-heading-actions">
            <button type="button" className="sales-button sales-button--primary sales-crud-button" onClick={openNew}><FileText size={13} />NOVO</button>
            <button type="button" className="sales-button sales-button--secondary sales-crud-button" onClick={openEdit} disabled={!selectedOrder}><Edit3 size={13} />EDITAR</button>
            <button type="button" className="sales-button sales-button--danger sales-crud-button" onClick={requestDelete} disabled={!selectedOrder}><Trash2 size={13} />DELETAR</button>
            <button type="button" className="sales-button sales-button--secondary sales-crud-button" onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />ATUALIZAR</button>
          </div>v>
        </section>

        {error && <div className="sales-alert" role="alert"><CircleAlert size={17} />{error}</div>}

        <section className="sales-kpis" aria-label="Resumo dos pedidos">
          <article><span>Pedidos cadastrados</span><strong>{counts.all}</strong><small>no escopo da empresa</small></article>
          <article><span>Em aberto</span><strong>{counts.open}</strong><small>aguardando conclusão operacional</small></article>
          <article><span>Rascunhos</span><strong>{counts.drafts}</strong><small>podem ser editados</small></article>
          <article className={counts.overdue ? 'sales-kpi--alert' : ''}><span>Entrega atrasada</span><strong>{counts.overdue}</strong><small>com base na data prometida</small></article>
        </section>

        <section className="sales-orders-card">
          <div className="sales-filter-row" role="tablist" aria-label="Filtrar pedidos por status">
            {filters.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                className={`sales-filter-tab${filter === id ? ' is-active' : ''}`}
                onClick={() => {
                  setFilter(id)
                  setPage(0)
                }}
              >
                <Icon size={15} />
                {label}
                <span>{id === 'todos' ? counts.all : id === 'rascunho' ? counts.drafts : id === 'atrasados' ? counts.overdue : orders.filter((order) => {
                  if (id === 'andamento') return !isDraft(order.status) && !isCancelled(order.status) && !isInvoiced(order.status)
                  if (id === 'faturados') return isInvoiced(order.status)
                  return isCancelled(order.status)
                }).length}</span>
              </button>
            ))}
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
            <span className="sales-result-count"><ArrowDownUp size={14} /> {visibleOrders.length} resultado(s)</span>
          </div>

          <div className="sales-table-scroll">
            <table className="sales-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Entrega prevista</th>
                  <th>Status</th>
                  <th className="sales-number">Total</th>
                  <th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr key={order.id} className={(isOverdue(order) ? 'is-overdue ' : '') + (selectedId === order.id ? 'is-selected' : '')} onClick={() => setSelectedId(order.id)} onDoubleClick={() => window.location.assign('/vendas/pedido/' + order.id)} aria-selected={selectedId === order.id}>
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
                    <td>{formatDate(order.data_entrada)}</td>
                    <td>
                      <span className={isOverdue(order) ? 'sales-delivery sales-delivery--late' : 'sales-delivery'}>
                        {formatDate(order.data_entrega_prometida)}
                        {isOverdue(order) && <small>Atrasado</small>}
                      </span>
                    </td>
                    <td><span className={`sales-status ${statusTone(order.status)}`}>{order.status}</span></td>
                    <td className="sales-number sales-total">{currency.format(Number(order.total ?? 0))}</td>
                    <td>
                      <div className="sales-row-actions">
                        {isDraft(order.status) && (
                          <Link className="sales-icon-action" to={`/vendas/novo-pedido?pedido=${encodeURIComponent(order.id)}`} aria-label={`Editar rascunho ${order.numero}`} title="Editar rascunho">
                            <FilePlus2 size={16} />
                          </Link>
                        )}
                        <Link className="sales-open-action" to={`/vendas/pedido/${order.id}`}>
                          Abrir <ArrowRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && visibleOrders.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="sales-empty-state">
                      <ClipboardList size={26} />
                      <strong>{query || filter !== 'todos' ? 'Nenhum pedido corresponde aos filtros.' : 'Nenhum pedido cadastrado.'}</strong>
                      <span>{query || filter !== 'todos' ? 'Altere a pesquisa ou selecione outro status.' : 'Crie um pedido para iniciar o fluxo comercial.'}</span>
                    </div>
                  </td></tr>
                )}
                {loading && <tr><td colSpan={7} className="sales-loading-row" role="status">Carregando pedidos do ERP…</td></tr>}
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
