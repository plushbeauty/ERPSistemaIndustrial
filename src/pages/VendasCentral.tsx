/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-24
 * @REVISAO: VENDAS-CENTRAL-HYBRID-20261124
 * @STATUS_APROVACAO: IMPLEMENTACAO EM VALIDACAO
 * @REGRA: preservar consultas, tenant, filtros e etapas industriais; modernizar apenas a apresentacao e a ergonomia.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, ClipboardList, FilePlus2, Loader2, PackageCheck, RefreshCw,
  Search, X, XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Order = {
  id: string; numero: number; pedido_cliente: string | null; status: string; total: number | null
  data_entrada: string | null; data_entrega_prometida: string | null; cliente_id: string | null
  vendedor_nome: string | null; cliente: { nome: string; codigo: string | null } | null
}
type StatusFilter = 'todos' | 'rascunho' | 'andamento' | 'atrasados' | 'faturados' | 'cancelados'
type SortKey = 'numero' | 'cliente' | 'data_entrada' | 'data_entrega_prometida' | 'total'
type ProductionStage = { id: string; pedido_venda_id: string; numero_op: string; status: string; quantidade: number; quantidade_planejada: number; quantidade_produzida: number; data_prevista: string | null }
type OrderLine = { pedido_id: string; produto_id: string | null; descricao: string; quantidade: number; produto_cliente: string | null; codigo_interno: string | null }
type QualityStage = { ordem_producao_id: string; tipo: string; resultado: string; quantidade_reprovada: number }
type ExpeditionStage = { pedido_venda_id: string; numero: number; status: string; transportadora: string | null; data_expedicao: string | null }
type FiscalStage = { pedido_venda_id: string; tipo: string; status: string; quantidade_pendente: number }

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const PAGE_SIZE = 25
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const isDraft = (status: string) => normalize(status).includes('rascunho') || normalize(status).includes('aberto')
const isCancelled = (status: string) => normalize(status).includes('cancel')
const isInvoiced = (status: string) => normalize(status).includes('fatur')
const isProgress = (status: string) => !isDraft(status) && !isCancelled(status) && !isInvoiced(status)
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value.slice(0, 10) + 'T00:00:00')) : '—'
const isOverdue = (order: Order) => Boolean(order.data_entrega_prometida)
  && new Date(order.data_entrega_prometida!.slice(0, 10) + 'T00:00:00') < new Date(new Date().toDateString())
  && !isInvoiced(order.status) && !isCancelled(order.status)
const daysLate = (order: Order) => order.data_entrega_prometida
  ? Math.floor((new Date(new Date().toDateString()).getTime() - new Date(order.data_entrega_prometida.slice(0, 10) + 'T00:00:00').getTime()) / 86400000) : 0
const orderNumber = (number: number) => 'PV-' + String(number).padStart(6, '0')

function statusBadge(status: string) {
  const value = normalize(status)
  if (value.includes('cancel')) return 'bg-slate-100 text-slate-600 ring-slate-300'
  if (value.includes('fatur')) return 'bg-[#48B7C7]/15 text-[#237497] ring-[#48B7C7]/40'
  if (value.includes('rascunho') || value.includes('aberto')) return 'bg-[#E6A34A]/15 text-[#a8701f] ring-[#E6A34A]/40'
  if (value.includes('produc') || value.includes('pcp') || value.includes('engen')) return 'bg-[#2D8DB8]/12 text-[#237497] ring-[#2D8DB8]/35'
  return 'bg-[#3A9D78]/12 text-[#2f8263] ring-[#3A9D78]/35'
}

const filters: Array<{ id: StatusFilter; label: string; icon: typeof ClipboardList; color: string }> = [
  { id: 'todos', label: 'Todos', icon: ClipboardList, color: '#3A9D78' },
  { id: 'rascunho', label: 'Rascunhos', icon: FilePlus2, color: '#E6A34A' },
  { id: 'andamento', label: 'Em andamento', icon: PackageCheck, color: '#2D8DB8' },
  { id: 'atrasados', label: 'Atrasados', icon: CalendarClock, color: '#D65B61' },
  { id: 'faturados', label: 'Faturados', icon: CheckCircle2, color: '#48B7C7' },
  { id: 'cancelados', label: 'Cancelados', icon: XCircle, color: '#64748b' },
]

export default function VendasCentral() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [linesByOrder, setLinesByOrder] = useState<Record<string, OrderLine[]>>({})
  const [productionByOrder, setProductionByOrder] = useState<Record<string, ProductionStage[]>>({})
  const [qualityByOrder, setQualityByOrder] = useState<Record<string, QualityStage[]>>({})
  const [expeditionByOrder, setExpeditionByOrder] = useState<Record<string, ExpeditionStage[]>>({})
  const [fiscalByOrder, setFiscalByOrder] = useState<Record<string, FiscalStage[]>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('todos')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'numero', asc: false })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const companyId = String(tenant.data)
      const result = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,pedido_cliente,status,total,data_entrada,data_entrega_prometida,cliente_id,vendedor_nome,cliente:erp_clientes(nome,codigo)', { count: 'exact' })
        .eq('empresa_id', companyId).order('numero', { ascending: false }).range(from, to))
      const rows = result as unknown as Order[]
      setOrders(rows)
      const orderIds = rows.map((order) => order.id)
      if (!orderIds.length) {
        setLinesByOrder({}); setProductionByOrder({}); setQualityByOrder({}); setExpeditionByOrder({}); setFiscalByOrder({})
        return
      }

      // Consultas de itens e produtos preservadas da APROV-006.
      const lineResult = await supabase.from('erp_pedidos_venda_itens')
        .select('pedido_id,produto_id,descricao,quantidade,produto_cliente')
        .eq('empresa_id', companyId).in('pedido_id', orderIds)
      if (lineResult.error) setError('Pedidos carregados; itens não disponíveis: ' + lineResult.error.message)
      const rawLines = (lineResult.data ?? []) as Omit<OrderLine, 'codigo_interno'>[]
      const productIds = [...new Set(rawLines.map((line) => line.produto_id).filter((id): id is string => Boolean(id)))]
      const productResult = productIds.length
        ? await supabase.from('erp_produtos').select('id,codigo').eq('empresa_id', companyId).in('id', productIds)
        : { data: [], error: null }
      if (productResult.error) setError('Pedidos carregados; códigos internos indisponíveis: ' + productResult.error.message)
      const codeByProduct = new Map(((productResult.data ?? []) as { id: string; codigo: string }[]).map((product) => [product.id, product.codigo]))
      const lines = rawLines.map((line) => ({ ...line, codigo_interno: line.produto_id ? codeByProduct.get(line.produto_id) ?? null : null }))
      setLinesByOrder(lines.reduce<Record<string, OrderLine[]>>((map, line) => {
        map[line.pedido_id] = [...(map[line.pedido_id] ?? []), line]
        return map
      }, {}))

      const [productionResult, expeditionResult, fiscalResult] = await Promise.all([
        supabase.from('erp_ordens_producao').select('id,pedido_venda_id,numero_op,status,quantidade,quantidade_planejada,quantidade_produzida,data_prevista').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
        supabase.from('erp_expedicoes').select('pedido_venda_id,numero,status,transportadora,data_expedicao').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
        supabase.from('erp_liberacoes_fiscais').select('pedido_venda_id,tipo,status,quantidade_pendente').eq('empresa_id', companyId).in('pedido_venda_id', orderIds),
      ])
      const productionRows = (productionResult.data ?? []) as ProductionStage[]
      const productionIds = productionRows.map((row) => row.id)
      const qualityResult = productionIds.length
        ? await supabase.from('erp_inspecoes').select('ordem_producao_id,tipo,resultado,quantidade_reprovada').eq('empresa_id', companyId).in('ordem_producao_id', productionIds)
        : null
      const stageErrors = [productionResult.error, qualityResult?.error, expeditionResult.error, fiscalResult.error].filter(Boolean)
      if (stageErrors.length) setError('Pedidos carregados; etapas industriais incompletas: ' + stageErrors.map((item) => item?.message).join(' • '))
      const byOrder = <T extends { pedido_venda_id: string }>(items: T[] | null) => (items ?? []).reduce<Record<string, T[]>>((map, item) => {
        map[item.pedido_venda_id] = [...(map[item.pedido_venda_id] ?? []), item]
        return map
      }, {})
      setProductionByOrder(byOrder(productionRows))
      const opToOrder = new Map(productionRows.map((row) => [row.id, row.pedido_venda_id]))
      setQualityByOrder(((qualityResult?.data ?? []) as QualityStage[]).reduce<Record<string, QualityStage[]>>((map, item) => {
        const orderId = opToOrder.get(item.ordem_producao_id)
        if (orderId) map[orderId] = [...(map[orderId] ?? []), item]
        return map
      }, {}))
      setExpeditionByOrder(byOrder((expeditionResult.data ?? []) as ExpeditionStage[]))
      setFiscalByOrder(byOrder((fiscalResult.data ?? []) as FiscalStage[]))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os pedidos.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const counts = useMemo(() => ({
    todos: orders.length,
    rascunho: orders.filter((order) => isDraft(order.status)).length,
    andamento: orders.filter((order) => isProgress(order.status)).length,
    atrasados: orders.filter(isOverdue).length,
    faturados: orders.filter((order) => isInvoiced(order.status)).length,
    cancelados: orders.filter((order) => isCancelled(order.status)).length,
  }), [orders])

  const visibleOrders = useMemo(() => {
    const term = normalize(query.trim())
    const list = orders.filter((order) => {
      const lines = linesByOrder[order.id] ?? []
      const haystack = normalize([
        order.numero, orderNumber(order.numero), order.pedido_cliente ?? '', order.status,
        order.cliente?.nome ?? '', order.cliente?.codigo ?? '', order.vendedor_nome ?? '',
        ...lines.flatMap((line) => [line.descricao, line.codigo_interno ?? '', line.produto_cliente ?? '']),
      ].join(' '))
      if (term && !haystack.includes(term)) return false
      if (filter === 'rascunho') return isDraft(order.status)
      if (filter === 'andamento') return isProgress(order.status)
      if (filter === 'atrasados') return isOverdue(order)
      if (filter === 'faturados') return isInvoiced(order.status)
      if (filter === 'cancelados') return isCancelled(order.status)
      return true
    })
    const value = (order: Order): string | number => sort.key === 'cliente'
      ? normalize(order.cliente?.nome ?? '')
      : sort.key === 'total' ? Number(order.total ?? 0)
      : sort.key === 'numero' ? order.numero : (order[sort.key] ?? '')
    return [...list].sort((a, b) => {
      const left = value(a), right = value(b)
      return (left < right ? -1 : left > right ? 1 : 0) * (sort.asc ? 1 : -1)
    })
  }, [orders, linesByOrder, query, filter, sort])

  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageOrders = visibleOrders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const totalVisible = visibleOrders.filter((order) => !isCancelled(order.status)).reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const toggleSort = (key: SortKey) => {
    setSort((current) => ({ key, asc: current.key === key ? !current.asc : key === 'cliente' }))
    setPage(0)
  }

  const Th = ({ sortKey, children, right }: { sortKey?: SortKey; children: ReactNode; right?: boolean }) => (
    <th className={'whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider ' + (right ? 'text-right' : 'text-left')}>
      {sortKey ? <button type="button" onClick={() => toggleSort(sortKey)} className="inline-flex items-center gap-1 hover:text-[#48B7C7]">
        {children}{sort.key === sortKey && (sort.asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button> : children}
    </th>
  )

  return (
    <VendasLayout title="Pedidos de venda" showStatusCards={false}>
      <main className="-m-1 space-y-4 rounded-lg bg-[#E9EFF3] p-3 text-[12px] text-slate-700 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#123B50] px-4 py-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10"><ClipboardList size={18} /></span>
            <div><div className="text-[10px] uppercase tracking-widest text-white/60">Vendas / Pedidos</div>
              <h2 className="flex items-center gap-2 text-[16px] font-bold">Pedidos de Venda {loading && <Loader2 size={14} className="animate-spin text-[#48B7C7]" />}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 text-[12px] font-semibold hover:bg-white/15 disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Atualizar</button>
            <Link to="/vendas/novo-pedido" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#237497] bg-[#2D8DB8] px-3 text-[12px] font-semibold text-white hover:bg-[#237497]"><FilePlus2 size={13} />Novo pedido</Link>
          </div>
        </div>

        {error && <div role="alert" className="flex items-center justify-between gap-2 rounded-md border border-[#D65B61]/30 bg-[#D65B61]/10 px-3 py-2 font-medium text-[#b8454b]">
          <span className="flex items-center gap-2"><CircleAlert size={14} />{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fechar aviso"><X size={14} /></button>
        </div>}

        <div role="tablist" aria-label="Filtrar pedidos por status" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {filters.map(({ id, label, icon: Icon, color }) => {
            const active = filter === id
            return <button key={id} type="button" role="tab" aria-selected={active} onClick={() => { setFilter(id); setPage(0) }}
              style={{ borderLeftColor: color, ...(active ? { boxShadow: '0 0 0 2px ' + color + '55' } : {}) }}
              className={'flex items-center justify-between gap-2 rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2.5 text-left transition hover:-translate-y-px hover:shadow-md ' + (active ? 'shadow-md' : 'shadow-sm')}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: color + '1f', color }}><Icon size={14} /></span>
                <span className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</span>
              </span>
              <strong className="text-[20px] font-extrabold tabular-nums text-[#123B50]">{loading ? '—' : counts[id]}</strong>
            </button>
          })}
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <label className="relative w-full max-w-md">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }}
                placeholder="Buscar pedido, cliente, vendedor, produto ou status..." aria-label="Buscar pedidos"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 text-[12px] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/20" />
              {query && <button type="button" onClick={() => { setQuery(''); setPage(0) }} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </label>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span><b className="text-[#123B50]">{visibleOrders.length}</b> pedido(s)</span>
              <span>Valor: <b className="tabular-nums text-[#123B50]">{currency.format(totalVisible)}</b></span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#123B50] text-white">
                <tr>
                  <Th sortKey="numero">Pedido</Th><Th sortKey="cliente">Cliente</Th><Th>Vendedor</Th>
                  <Th sortKey="data_entrada">Data</Th><Th sortKey="data_entrega_prometida">Entrega</Th>
                  <Th>Status</Th><Th>Itens</Th><Th>Processo industrial</Th><Th sortKey="total" right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => {
                  const late = isOverdue(order)
                  const lines = linesByOrder[order.id] ?? []
                  return <tr key={order.id} onDoubleClick={() => navigate('/vendas/pedido/' + order.id)}
                    className={'border-b border-slate-100 align-middle transition hover:bg-[#48B7C7]/8 ' + (late ? 'shadow-[inset_3px_0_0_#D65B61]' : '') + (isCancelled(order.status) ? ' opacity-60' : '')}>
                    <td className="px-3 py-2.5">
                      <Link to={'/vendas/pedido/' + order.id} className="font-bold tabular-nums text-[#2D8DB8] hover:text-[#237497] hover:underline">{orderNumber(order.numero)}</Link>
                      {order.pedido_cliente && <div className="text-[10px] text-slate-400">Ref. {order.pedido_cliente}</div>}
                    </td>
                    <td className="max-w-[230px] px-3 py-2.5">
                      <div className="truncate font-semibold text-slate-800" title={order.cliente?.nome ?? ''}>{order.cliente?.nome ?? 'Cliente não identificado'}</div>
                      {order.cliente?.codigo && <div className="text-[10px] text-slate-400">Cód. {order.cliente.codigo}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{order.vendedor_nome || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">{formatDate(order.data_entrada)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      <span className={late ? 'font-bold text-[#D65B61]' : 'text-slate-600'}>{formatDate(order.data_entrega_prometida)}</span>
                      {late && <div className="text-[10px] font-bold text-[#D65B61]">{daysLate(order)} dia(s) de atraso</div>}
                    </td>
                    <td className="px-3 py-2.5"><span className={'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ' + statusBadge(order.status)}>{order.status}</span></td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      {lines.length ? <details className="cursor-pointer">
                        <summary className="font-semibold text-[#237497]">{lines.length} item(ns) · ver detalhes</summary>
                        <div className="max-w-[320px] whitespace-normal py-1 text-[10px] text-slate-600">
                          {lines.map((line, index) => <div key={index} className="border-b border-slate-100 py-1">
                            <b>{line.codigo_interno || 'Sem código'}</b> · {line.descricao} · Qtde: {Number(line.quantidade || 0).toLocaleString('pt-BR')}
                            {line.produto_cliente ? ' · Ref.: ' + line.produto_cliente : ''}
                          </div>)}
                        </div>
                      </details> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><ProcessStages order={order} production={productionByOrder[order.id] ?? []} inspections={qualityByOrder[order.id] ?? []} expeditions={expeditionByOrder[order.id] ?? []} fiscal={fiscalByOrder[order.id] ?? []} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-[#123B50]">{currency.format(Number(order.total ?? 0))}</td>
                  </tr>
                })}
                {!loading && visibleOrders.length === 0 && <tr><td colSpan={9} className="py-14 text-center">
                  <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
                  <div className="font-semibold text-slate-500">{query || filter !== 'todos' ? 'Nenhum pedido corresponde aos filtros.' : 'Nenhum pedido encontrado.'}</div>
                  <div className="text-[11px] text-slate-400">Altere a pesquisa ou selecione outro status.</div>
                </td></tr>}
                {loading && Array.from({ length: 6 }).map((_, index) => <tr key={index} className="border-b border-slate-100"><td colSpan={9} className="px-3 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td></tr>)}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginação dos pedidos de venda" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="text-[11px] text-slate-500">{visibleOrders.length === 0 ? '0 pedidos' : (currentPage * PAGE_SIZE + 1) + '–' + Math.min((currentPage + 1) * PAGE_SIZE, visibleOrders.length) + ' de ' + visibleOrders.length} • duplo clique abre o pedido</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0 || loading} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:border-[#2D8DB8] disabled:opacity-40"><ChevronLeft size={14} />Anterior</button>
              <span className="min-w-24 text-center text-[11px] text-slate-600">Página <b>{currentPage + 1}</b> de {pageCount}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1 || loading} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:border-[#2D8DB8] disabled:opacity-40">Próxima<ChevronRight size={14} /></button>
            </div>
          </nav>
        </section>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-slate-500">
          <b className="uppercase tracking-wider">Etapas</b>
          {[['Concluída', '#3A9D78'], ['Em execução', '#2D8DB8'], ['Pendente / atenção', '#E6A34A'], ['Bloqueio / reprovado', '#D65B61'], ['Aguardando', '#cbd5e1']].map(([label, color]) =>
            <span key={label} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>)}
        </div>
      </main>
    </VendasLayout>
  )
}

const stageColor: Record<string, string> = { green: '#3A9D78', blue: '#2D8DB8', amber: '#E6A34A', red: '#D65B61', violet: '#48B7C7', cyan: '#48B7C7', muted: '#cbd5e1' }

function ProcessStages({ order, production, inspections, expeditions, fiscal }: {
  order: Order; production: ProductionStage[]; inspections: QualityStage[]; expeditions: ExpeditionStage[]; fiscal: FiscalStage[]
}) {
  const cancelled = isCancelled(order.status)
  const draft = isDraft(order.status)
  const productionDone = production.length > 0 && production.every((row) => {
    const status = normalize(row.status)
    return status.includes('conclu') || status.includes('finaliz') || status.includes('encerr')
      || (Number(row.quantidade_planejada || row.quantidade || 0) > 0 && Number(row.quantidade_produzida || 0) >= Number(row.quantidade_planejada || row.quantidade || 0))
  })
  const productionActive = production.length > 0 && !productionDone
  const qualityRejected = inspections.some((row) => normalize(row.resultado).includes('reprov'))
  const qualityDone = inspections.length > 0 && inspections.every((row) => normalize(row.resultado).includes('aprov') && Number(row.quantidade_reprovada || 0) === 0)
  const expeditionDone = expeditions.length > 0 && expeditions.every((row) => ['expedido', 'entregue', 'conclu', 'finaliz'].some((word) => normalize(row.status).includes(word)))
  const fiscalDone = fiscal.length > 0 && fiscal.every((row) => ['emit', 'autoriz', 'fatur', 'conclu', 'finaliz'].some((word) => normalize(row.status).includes(word)))
  const stages = [
    { label: 'Pedido', detail: order.status || 'Recebido', tone: cancelled ? 'red' : draft ? 'amber' : 'green' },
    { label: 'Produção', detail: production.length ? production.map((row) => 'OP ' + row.numero_op + ': ' + row.status + ' (' + Number(row.quantidade_produzida || 0) + '/' + Number(row.quantidade_planejada || row.quantidade || 0) + ')').join(' • ') : 'Aguardando OP', tone: cancelled ? 'muted' : productionDone ? 'green' : productionActive ? 'blue' : 'muted' },
    { label: 'Qualidade', detail: inspections.length ? inspections.map((row) => row.tipo + ': ' + row.resultado + (Number(row.quantidade_reprovada || 0) > 0 ? ' (' + Number(row.quantidade_reprovada) + ' reprovada(s))' : '')).join(' • ') : 'Aguardando inspeção', tone: cancelled ? 'muted' : qualityRejected ? 'red' : qualityDone ? 'green' : inspections.length ? 'amber' : 'muted' },
    { label: 'Expedição', detail: expeditions.length ? expeditions.map((row) => 'EXP ' + row.numero + ': ' + row.status + (row.transportadora ? ' • ' + row.transportadora : '')).join(' • ') : 'Aguardando expedição', tone: cancelled ? 'muted' : expeditionDone ? 'green' : expeditions.length ? 'violet' : 'muted' },
    { label: 'NF / Saída', detail: fiscal.length ? fiscal.map((row) => row.tipo + ': ' + row.status + ' (pendente ' + Number(row.quantidade_pendente || 0) + ')').join(' • ') : 'Aguardando liberação fiscal', tone: cancelled ? 'muted' : fiscalDone ? 'green' : fiscal.length ? 'cyan' : 'muted' },
  ]
  return <div className="flex min-w-[350px] items-start" aria-label={'Etapas do pedido ' + orderNumber(order.numero)}>
    {stages.map((stage, index) => {
      const color = stageColor[stage.tone]
      const nextColor = stages[index + 1] ? stageColor[stages[index + 1].tone] : ''
      return <div key={stage.label} className="group relative flex w-[78px] shrink-0 flex-col items-center" title={stage.label + ': ' + stage.detail}>
        <div className="flex w-full items-center">
          <span className="h-0.5 flex-1" style={{ background: index ? color : 'transparent' }} />
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-2 ring-white" style={{ background: color }}>
            {stage.tone === 'green' && <CheckCircle2 size={10} className="text-white" />}
          </span>
          <span className="h-0.5 flex-1" style={{ background: nextColor || 'transparent' }} />
        </div>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">{stage.label}</span>
        <span className="max-w-[74px] truncate text-[9px] text-slate-400">{stage.detail}</span>
      </div>
    })}
  </div>
}
