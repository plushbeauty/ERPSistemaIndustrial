/**
 * @DATA_REVISAO: 2026-10-16
 * @REVISAO: VENDAS-003
 * @ESCOPO_REVISADO: consulta por empresa, filtros de pedido/status, relacionamento com cliente, tabela e impressão.
 * @ALTERACOES: área de trabalho e células compactadas; cabeçalho/linhas aproximados de 32px; consulta Supabase e filtros preservados.
 * @VALIDACAO: conferir CI do commit corrente no PR; inspeção visual autenticada e teste funcional por sessão ainda pendentes.
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

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

export default function VendasRelatorios() {
  const [orders, setOrders] = useState<Order[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('TODOS')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const result = await supabase
        .from('erp_pedidos_venda')
        .select('id,numero,status,total,data_entrada,data_entrega_prometida,pedido_cliente,cliente_id,erp_clientes(nome)')
        .eq('empresa_id', String(company.data))
        .order('numero', { ascending: false })
        .limit(2000)

      if (result.error) throw result.error
      setOrders(
        ((result.data ?? []) as Array<Order & { erp_clientes: { nome: string } | { nome: string }[] | null }>).map(row => ({
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
      const searchable = [order.numero, order.pedido_cliente, order.cliente_nome].map(value => String(value ?? '').toLowerCase()).join(' ')
      return matchesStatus && (!q || searchable.includes(q))
    })
  }, [orders, query, status])

  const statuses = useMemo(
    () => ['TODOS', ...Array.from(new Set(orders.map(order => String(order.status).toUpperCase()).filter(Boolean))).sort()],
    [orders],
  )

  const total = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0)

  return (
    <VendasLayout title="Relatórios de Vendas" subtitle="Pedidos, filtros e impressão" onRefresh={()=>void load()}>
      <style>{`@media print { .print-hidden { display:none!important } body { background:white!important } }`}</style>
      <section className="mx-auto max-w-[1600px] min-w-0 space-y-2 px-2 py-2 lg:px-3">
        <div className="rounded-[2px] border border-slate-200 bg-white p-3 print-hidden">
          <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid min-w-0 gap-0.5 text-[9px] font-bold uppercase">
              Buscar pedido, PO ou cliente
              <span className="relative">
                <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} className="h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 pl-7 pr-2 text-[10px] font-normal outline-none focus:border-[#2D8DB8]" placeholder="Ex.: 000123 ou PO-456" />
              </span>
            </label>
            <label className="grid gap-1 text-[11px] font-medium">
              Status
              <select value={status} onChange={event => setStatus(event.target.value)} className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-normal outline-none focus:border-[#2D8DB8]">
                {statuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-[10px] font-medium text-rose-800">{error}</div>}

        <section className="rounded-[2px] border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2">
            <div>
              <h2 className="text-[11px] font-semibold text-[#123B50]">Relatório de Pedidos</h2>
              <p className="text-[10px] text-slate-500">{filtered.length} pedido(s) • total filtrado {money(total)}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="print-hidden inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold"><Printer size={13}/> IMPRIMIR RELATÓRIO</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="bg-slate-100 text-left text-xs font-medium uppercase text-slate-700">
                <tr>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Pedido</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Pedido cliente / PO</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Cliente</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Entrada</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Entrega</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase">Status</th>
                  <th className="h-8 px-2 py-1.5 text-[9px] uppercase text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="h-8 px-2 py-1.5 text-[10px] font-medium">{String(order.numero).padStart(6, '0')}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px]">{order.pedido_cliente || '—'}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px] font-semibold">{order.cliente_nome || '—'}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px]">{order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px]">{order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px] font-medium">{order.status}</td>
                    <td className="h-8 px-2 py-1.5 text-[10px] text-right font-medium">{money(order.total)}</td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={7} className="px-2 py-6 text-center text-[10px] font-semibold text-slate-500">Nenhum pedido encontrado com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </VendasLayout>
  )
}
