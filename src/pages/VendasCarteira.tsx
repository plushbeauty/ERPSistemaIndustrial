import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  DollarSign,
  ExternalLink,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Pedido = {
  id: string
  numero: number
  pedido_cliente: string | null
  status: string
  total: number
  data_entrega_prometida: string | null
  cliente: { nome: string } | null
}

const PAGE_SIZE = 25
const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(value) ? value : 0,
  )
const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const statusPill = (status: string) => `sales-status--${statusClass(status)}`

export default function VendasCarteira() {
  const [rows, setRows] = useState<Pedido[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) {
        throw tenant.error ?? new Error('Empresa não identificada.')
      }

      const result = await fetchAllPages((from, to) =>
        supabase
          .from('erp_pedidos_venda')
          .select(
            'id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)',
            { count: 'exact' },
          )
          .eq('empresa_id', String(tenant.data))
          .order('numero', { ascending: false })
          .range(from, to),
      )
      setRows(result as unknown as Pedido[])
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a carteira.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = rows.filter(
    (order) =>
      !normalizedQuery ||
      String(order.numero).includes(normalizedQuery) ||
      (order.cliente?.nome ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      (order.pedido_cliente ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery),
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const kpis = useMemo(() => {
    const ativos = rows.filter(
      (order) => !['cancelado', 'faturado'].includes(order.status.toLocaleLowerCase('pt-BR')),
    )
    const totalFinanceiro = ativos.reduce((sum, order) => sum + Number(order.total || 0), 0)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const totalAtrasados = ativos.filter((order) => {
      if (!order.data_entrega_prometida) return false
      const prazo = new Date(`${order.data_entrega_prometida.slice(0, 10)}T00:00:00`)
      return !Number.isNaN(prazo.getTime()) && prazo < hoje
    }).length

    return {
      quantidadeAtivos: ativos.length,
      valorTotalAtivo: totalFinanceiro,
      pedidosAtrasados: totalAtrasados,
    }
  }, [rows])

  return (
    <VendasLayout
      title="Carteira de Pedidos Ativos"
      subtitle="Consulta consolidada e acompanhamento de prazos da empresa atual"
      onRefresh={() => void load()}
    >
      <div className="space-y-3 p-1 text-[11px]">
        {error && (
          <div
            className="flex items-center justify-between gap-3 rounded-sm border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-800"
            role="alert"
          >
            <span className="min-w-0 break-words">
              <strong>Falha operacional:</strong> {error}
            </span>
            <button
              type="button"
              aria-label="Fechar mensagem de erro"
              onClick={() => setError('')}
              className="shrink-0 px-1 font-bold hover:opacity-70"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
            <div className="min-w-0 space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Volume ativo em carteira
              </span>
              <strong className="block break-words text-lg font-bold text-slate-800">
                {busy ? '—' : `${kpis.quantidadeAtivos} pedidos`}
              </strong>
            </div>
            <div className="shrink-0 rounded-sm border border-slate-200 bg-slate-50 p-2 text-slate-600">
              <ShoppingBag size={18} aria-hidden="true" />
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 rounded-sm border border-sky-200 bg-white p-3 shadow-sm">
            <div className="min-w-0 space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Montante financeiro aberto
              </span>
              <strong className="block break-words text-lg font-black text-sky-900">
                {busy ? '—' : brl(kpis.valorTotalAtivo)}
              </strong>
            </div>
            <div className="shrink-0 rounded-sm border border-sky-100 bg-sky-50 p-2 text-sky-700">
              <DollarSign size={18} aria-hidden="true" />
            </div>
          </div>

          <div
            className={`flex min-w-0 items-center justify-between gap-3 rounded-sm border p-3 shadow-sm transition-colors ${
              kpis.pedidosAtrasados > 0
                ? 'border-red-200 bg-red-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="min-w-0 space-y-1">
              <span
                className={`block text-[10px] font-bold uppercase tracking-wider ${
                  kpis.pedidosAtrasados > 0 ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                Pedidos com prazo vencido
              </span>
              <strong
                className={`block break-words text-lg font-bold ${
                  kpis.pedidosAtrasados > 0 ? 'text-red-700' : 'text-slate-800'
                }`}
              >
                {busy ? '—' : `${kpis.pedidosAtrasados} pendentes`}
              </strong>
            </div>
            <div
              className={`shrink-0 rounded-sm border p-2 ${
                kpis.pedidosAtrasados > 0
                  ? 'border-red-200 bg-red-100 text-red-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <Calendar size={18} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="flex h-8 w-full min-w-0 items-center gap-2 rounded-sm border border-slate-300 bg-white px-2 md:max-w-xl">
                <Search size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
                <span className="sr-only">Filtrar por número do pedido, cliente ou referência</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(0)
                  }}
                  placeholder="Filtrar por Nº de PV, nome do cliente ou referência..."
                  className="h-full w-full min-w-0 border-0 bg-transparent px-1 text-[11px] font-medium outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Limpar pesquisa"
                    onClick={() => {
                      setQuery('')
                      setPage(0)
                    }}
                    className="shrink-0 text-slate-500 hover:text-slate-800"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
              <span className="whitespace-nowrap rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                {filtered.length} localizado(s)
              </span>
            </div>

            <Link
              to="/vendas/novo-pedido"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-sm border border-sky-700 bg-sky-700 px-3 text-[10px] font-bold text-white transition-colors hover:bg-sky-800 md:w-auto"
            >
              + Novo pedido de venda
            </Link>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="h-8 border-b border-slate-200 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                  <th scope="col" className="w-24 p-2 text-center">Pedido</th>
                  <th scope="col" className="w-32 p-2">Ref. cliente</th>
                  <th scope="col" className="w-5/12 p-2">Razão social / nome do cliente</th>
                  <th scope="col" className="w-32 p-2 text-center">Prazo prometido</th>
                  <th scope="col" className="w-32 p-2 text-center">Status interno</th>
                  <th scope="col" className="w-32 p-2 text-right">Valor bruto</th>
                  <th scope="col" className="w-24 p-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((order) => (
                  <tr key={order.id} className="h-8 transition-colors hover:bg-slate-50">
                    <td className="p-2 text-center font-mono">
                      <Link
                        className="font-bold text-sky-700 hover:underline"
                        to={`/vendas/pedido/${order.id}`}
                      >
                        PV-{String(order.numero).padStart(6, '0')}
                      </Link>
                    </td>
                    <td className="p-2 font-mono text-[10px] font-medium text-slate-600">
                      {order.pedido_cliente || '—'}
                    </td>
                    <td className="p-2">
                      <strong className="font-semibold text-slate-800">
                        {order.cliente?.nome || '—'}
                      </strong>
                    </td>
                    <td className="p-2 text-center font-mono font-medium text-slate-600">
                      {order.data_entrega_prometida || '—'}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`sales-status ${statusPill(order.status)}`}>
                        {order.status || '—'}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono font-semibold tabular-nums text-slate-800">
                      {brl(Number(order.total || 0))}
                    </td>
                    <td className="p-2 text-center">
                      <Link
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                        to={`/vendas/pedido/${order.id}`}
                      >
                        Abrir <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {!busy && !error && visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="px-4 py-8 text-center text-slate-600">
                        <strong className="block text-xs text-slate-700">
                          {query
                            ? 'Nenhum pedido atende ao filtro informado.'
                            : 'Nenhum pedido encontrado para esta empresa.'}
                        </strong>
                        <span className="mt-1 block text-[10px]">
                          {query
                            ? 'Altere a pesquisa e tente novamente.'
                            : 'Os pedidos cadastrados serão exibidos aqui.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {busy && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[11px] text-slate-500">
                      Consultando a base de dados do ERP...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <nav
            className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2"
            aria-label="Paginação da carteira de pedidos"
          >
            <span className="text-[10px] text-slate-600" aria-live="polite">
              {filtered.length === 0
                ? 'Nenhum registro'
                : `Exibindo ${currentPage * PAGE_SIZE + 1}–${Math.min(
                    (currentPage + 1) * PAGE_SIZE,
                    filtered.length,
                  )} de ${filtered.length} encontrados`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="h-7 rounded-sm border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0 || busy}
              >
                Anterior
              </button>
              <span className="min-w-24 text-center text-[10px] text-slate-600">
                Página {currentPage + 1} de {pageCount}
              </span>
              <button
                type="button"
                className="h-7 rounded-sm border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1 || busy}
              >
                Próxima
              </button>
            </div>
          </nav>
        </section>
      </div>
    </VendasLayout>
  )
}
