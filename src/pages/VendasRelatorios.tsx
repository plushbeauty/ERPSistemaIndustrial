/**
 * @REVISAO: REV-VENDAS-RELATORIOS-PERIODO-PAGINACAO-20261111-03 — busca, status, período de entrada, paginação de 50 linhas e impressão de todos os resultados filtrados; preserva paginação completa da consulta e escopo empresa_id.
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-11
 * @STATUS_APROVACAO: REVISÃO AUTORIZADA PELO PROPRIETÁRIO NO COMANDO MESTRE DE 2026-11-11; pendente de CI e validação visual
 */
import { useEffect, useMemo, useState } from 'react'
import { Printer, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Order = {
  id: string
  numero: number
  status: string
  total: number
  data_entrada: string | null
  data_entrega_prometida: string | null
  pedido_cliente: string | null
  cliente_id: string
  cliente_nome?: string
}

const PAGE_SIZE = 50

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

export default function VendasRelatorios() {
  const [orders, setOrders] = useState<Order[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const rows = await fetchAllPages<Order & { erp_clientes: { nome: string } | { nome: string }[] | null }>((from, to) =>
        supabase
          .from('erp_pedidos_venda')
          .select('id,numero,status,total,data_entrada,data_entrega_prometida,pedido_cliente,cliente_id,erp_clientes(nome)', { count: 'exact' })
          .eq('empresa_id', String(company.data))
          .order('numero', { ascending: false })
          .range(from, to),
      )
      setOrders(
        rows.map(row => ({
          ...row,
          cliente_nome: Array.isArray(row.erp_clientes) ? row.erp_clientes[0]?.nome : row.erp_clientes?.nome,
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter(order => {
      const matchesStatus = status === 'TODOS' || String(order.status).toUpperCase() === status
      const entrada = String(order.data_entrada ?? '').slice(0, 10)
      const matchesPeriodo = (!dataInicial || (entrada !== '' && entrada >= dataInicial)) && (!dataFinal || (entrada !== '' && entrada <= dataFinal))
      const searchable = [order.numero, order.pedido_cliente, order.cliente_nome].map(value => String(value ?? '').toLowerCase()).join(' ')
      return matchesStatus && matchesPeriodo && (!q || searchable.includes(q))
    })
  }, [orders, query, status, dataInicial, dataFinal])
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const inicioPagina = (pagina - 1) * PAGE_SIZE
  const fimPagina = pagina * PAGE_SIZE
  useEffect(() => { setPagina(atual => Math.min(atual, totalPaginas)) }, [totalPaginas])

  const statuses = useMemo(
    () => ['TODOS', ...Array.from(new Set(orders.map(order => String(order.status).toUpperCase()).filter(Boolean))).sort()],
    [orders],
  )

  const total = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0)

  return (
    <VendasLayout title="Relatórios de Vendas" subtitle="Pedidos, filtros e impressão" onRefresh={()=>void load()}>
      <style>{`tr[data-page-hidden="true"] { display:none } @media print { .print-hidden { display:none!important } tr[data-page-hidden="true"] { display:table-row!important } body { background:white!important } }`}</style>
      <section className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-6">
        <div className="border border-slate-200 bg-white p-4 shadow-sm print-hidden">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px_180px_auto]">
            <label className="grid min-w-0 gap-1 text-[11px] font-medium">
              Buscar pedido, PO ou cliente
              <span className="relative">
                <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                <input value={query} onChange={event => { setQuery(event.target.value); setPagina(1) }} className="h-8 w-full min-w-0 border border-slate-300 pl-9 pr-3 text-[11px] font-semibold outline-none focus:border-[#2D8DB8]" placeholder="Ex.: 000123 ou PO-456" />
              </span>
            </label>
            <label className="grid min-w-0 gap-1 text-[11px] font-medium">
              Data inicial (entrada)
              <input type="date" value={dataInicial} max={dataFinal || undefined} onChange={event => { setDataInicial(event.target.value); setPagina(1) }} className="h-8 min-w-0 border border-slate-300 bg-white px-2 text-[10px] font-semibold"/>
            </label>
            <label className="grid min-w-0 gap-1 text-[11px] font-medium">
              Data final (entrada)
              <input type="date" value={dataFinal} min={dataInicial || undefined} onChange={event => { setDataFinal(event.target.value); setPagina(1) }} className="h-8 min-w-0 border border-slate-300 bg-white px-2 text-[10px] font-semibold"/>
            </label>
            <label className="grid min-w-0 gap-1 text-[11px] font-medium">
              Status
              <select value={status} onChange={event => { setStatus(event.target.value); setPagina(1) }} className="h-8 min-w-0 border border-slate-300 bg-white px-2 text-[10px] font-semibold">
                {statuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" onClick={() => { setQuery(''); setStatus('TODOS'); setDataInicial(''); setDataFinal(''); setPagina(1) }} className="inline-flex h-8 items-center justify-center border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">LIMPAR FILTROS</button>
            </div>
          </div>
        </div>

        {error && <div className="border border-rose-200 bg-rose-50 p-4 font-medium text-rose-800">{error}</div>}

        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="text-[11px] font-medium text-[#123B50]">Relatório de Pedidos</h2>
              <p className="text-[11px] font-semibold text-slate-500">{filtered.length} pedido(s) • total filtrado {money(total)}</p>
            <button type="button" onClick={() => window.print()} className="print-hidden inline-flex h-8 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-medium"><Printer size={13}/> IMPRIMIR RELATÓRIO</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="bg-slate-100 text-left text-xs font-medium uppercase text-slate-700">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Pedido cliente / PO</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, index) => (
                  <tr key={order.id} data-page-hidden={index < inicioPagina || index >= fimPagina ? 'true' : undefined} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium">{String(order.numero).padStart(6, '0')}</td>
                    <td className="px-4 py-3">{order.pedido_cliente || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{order.cliente_nome || '—'}</td>
                    <td className="px-4 py-3">{order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">{order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 font-medium">{order.status}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money(order.total)}</td>
                  </tr>
                ))}
                {loading && <tr><td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-500">Carregando pedidos...</td></tr>}
                {!loading && !filtered.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-500">Nenhum pedido encontrado com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <nav className="print-hidden flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3" aria-label="Paginação do relatório de pedidos">
            <span className="text-[10px] text-slate-600">Página {pagina} de {totalPaginas} · {filtered.length} pedido(s) filtrado(s)</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPagina(atual => Math.max(1, atual - 1))} disabled={loading || pagina <= 1} className="h-8 border border-slate-300 bg-white px-3 text-[10px] disabled:opacity-40">ANTERIOR</button>
              <button type="button" onClick={() => setPagina(atual => Math.min(totalPaginas, atual + 1))} disabled={loading || pagina >= totalPaginas} className="h-8 border border-slate-300 bg-white px-3 text-[10px] disabled:opacity-40">PRÓXIMA</button>
            </div>
          </nav>
        </section>
      </section>
    </VendasLayout>
  )
}
