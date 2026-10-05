import { useEffect, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
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
const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')

      const result = await fetchAllPages((from, to) => supabase
        .from('erp_pedidos_venda')
        .select('id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)', { count: 'exact' })
        .eq('empresa_id', String(tenant.data))
        .order('numero', { ascending: false })
        .range(from, to))
      setRows(result as unknown as Pedido[])
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a carteira.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = rows.filter((order) => !normalizedQuery
    || String(order.numero).includes(normalizedQuery)
    || (order.cliente?.nome ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    || (order.pedido_cliente ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <VendasLayout
      title="Carteira de pedidos ativos"
      subtitle="Pedidos reais da empresa atual · nenhuma linha demonstrativa"
      onRefresh={() => void load()}
    >
      <div className="sales-workspace">
        <section className="sales-page-heading">
          <div>
            <span className="sales-eyebrow">COMERCIAL / CARTEIRA</span>
            <p>Consulte pedidos recentes, prazos prometidos e valores confirmados.</p>
          </div>
          <div className="sales-heading-actions">
            <Link to="/vendas/novo-pedido" className="sales-button sales-button--primary">
              Novo pedido
            </Link>
          </div>
        </section>

        {error && <div className="sales-alert" role="alert">{error}</div>}

        <section className="sales-orders-card">
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
                placeholder="Nº, cliente ou pedido do cliente"
                aria-label="Buscar por número do pedido, cliente ou referência do cliente"
              />
            </label>
            <span className="sales-result-count" aria-live="polite">
              {filtered.length} pedido(s) na empresa atual
            </span>
          </div>

          <div className="sales-table-scroll">
            <table className="sales-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Pedido do cliente</th>
                  <th>Cliente</th>
                  <th>Entrega prevista</th>
                  <th>Status</th>
                  <th className="sales-number">Valor</th>
                  <th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="sales-order-number" to={`/vendas/pedido/${order.id}`}>
                        PV-{String(order.numero).padStart(6, '0')}
                      </Link>
                    </td>
                    <td>{order.pedido_cliente || '—'}</td>
                    <td><strong className="sales-client-name">{order.cliente?.nome || '—'}</strong></td>
                    <td>{order.data_entrega_prometida || '—'}</td>
                    <td><span className="sales-status is-neutral">{order.status || '—'}</span></td>
                    <td className="sales-number sales-total">{brl(Number(order.total || 0))}</td>
                    <td>
                      <div className="sales-row-actions">
                        <Link className="sales-open-action" to={`/vendas/pedido/${order.id}`}>
                          Abrir status <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!busy && !error && visible.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="sales-empty-state">
                        <strong>{query ? 'Nenhum pedido corresponde à busca.' : 'Nenhum pedido cadastrado.'}</strong>
                        <span>{query ? 'Altere a pesquisa e tente novamente.' : 'Os pedidos da empresa serão exibidos aqui.'}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {busy && <tr><td colSpan={7} className="sales-loading-row">Carregando pedidos…</td></tr>}
              </tbody>
            </table>
          </div>

          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3" aria-label="Paginação da carteira de pedidos">
            <span className="text-xs text-slate-500">
              {filtered.length === 0 ? '0 pedidos' : `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="sales-button sales-button--secondary"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0 || busy}
              >
                Anterior
              </button>
              <span className="min-w-20 text-center text-xs text-slate-600">Página {currentPage + 1} de {pageCount}</span>
              <button
                type="button"
                className="sales-button sales-button--secondary"
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
