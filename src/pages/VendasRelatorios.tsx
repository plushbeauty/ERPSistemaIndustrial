/**
 * SYSNQRA ERP INDUSTRIAL — Padronização visual incremental de Vendas
 * Revisão: REV-VENDAS-UI-007 | Data: 2026-10-23
 * Escopo: filtros, ações e tabela compactos; consulta, filtros, valores e impressão preservados.
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
      <section className="mx-auto max-w-[1600px] space-y-2 px-2 py-2 lg:px-3">
        <div className="rounded-[2px] border border-slate-300 bg-white p-2 print-hidden">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 md:col-span-8">
              Buscar pedido, PO ou cliente
              <span className="relative">
                <Search size={17} className="absolute left-3 top-2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} className="h-[30px] w-full rounded-[2px] border border-slate-300 pl-9 pr-3 text-xs font-normal outline-none focus:border-[#2D8DB8]" placeholder="Ex.: 000123 ou PO-456" />
              </span>
            </label>
            <label className="grid min-w-0 gap-[2px] text-[9px] font-semibold uppercase tracking-wider text-slate-500 md:col-span-4">
              Status
              <select value={status} onChange={event => setStatus(event.target.value)} className="h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-normal">
                {statuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="rounded-[2px] border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-800">{error}</div>}

        <section className="overflow-hidden rounded-[2px] border border-slate-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2">
            <div>
              <h2 className="text-[11px] font-medium text-[#123B50]">Relatório de Pedidos</h2>
              <p className="text-[11px] font-semibold text-slate-500">{filtered.length} pedido(s) • total filtrado {money(total)}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="print-hidden inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-medium hover:bg-slate-50"><Printer size={13}/> IMPRIMIR RELATÓRIO</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="bg-slate-100 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-2 py-1">Pedido</th>
                  <th className="px-2 py-1">Pedido cliente / PO</th>
                  <th className="px-2 py-1">Cliente</th>
                  <th className="px-2 py-1">Entrada</th>
                  <th className="px-2 py-1">Entrega</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="h-8 border-t border-slate-200">
                    <td className="px-2 py-1 font-medium">{String(order.numero).padStart(6, '0')}</td>
                    <td className="px-2 py-1">{order.pedido_cliente || '—'}</td>
                    <td className="px-2 py-1 font-semibold">{order.cliente_nome || '—'}</td>
                    <td className="px-2 py-1">{order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-2 py-1">{order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-2 py-1 font-medium">{order.status}</td>
                    <td className="px-2 py-1 text-right font-medium">{money(order.total)}</td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={7} className="px-2 py-6 text-center font-semibold text-slate-500">Nenhum pedido encontrado com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </VendasLayout>
  )
}
