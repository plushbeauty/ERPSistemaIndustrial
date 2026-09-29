import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileDown, Printer, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

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
    <main className="min-h-screen bg-[#F4FBFD] text-slate-900">
      <style>{`@media print { .print-hidden { display:none!important } body { background:white!important } }`}</style>
      <header className="print-hidden sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <div className="text-xs font-black tracking-[0.16em] text-[#2D8DB8]">SYNQRA ERP INDUSTRIAL • VENDAS</div>
            <h1 className="text-xl font-black text-[#123B50]">Relatórios de Vendas</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => history.back()} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black">
              <ArrowLeft size={17} /> VOLTAR
            </button>
            <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black">
              <RefreshCw size={17} /> ATUALIZAR
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#123B50] px-3 text-sm font-black text-white">
              <Printer size={17} /> IMPRIMIR
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 lg:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print-hidden">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid gap-1 text-sm font-black">
              Buscar pedido, PO ou cliente
              <span className="relative">
                <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#2D8DB8]" placeholder="Ex.: 000123 ou PO-456" />
              </span>
            </label>
            <label className="grid gap-1 text-sm font-black">
              Status
              <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold">
                {statuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{error}</div>}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="text-lg font-black text-[#123B50]">Relatório de Pedidos</h2>
              <p className="text-sm font-semibold text-slate-500">{filtered.length} pedido(s) • total filtrado {money(total)}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="print-hidden inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black">
              <FileDown size={17} /> IMPRIMIR RELATÓRIO
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-100 text-left text-xs font-black uppercase text-slate-700">
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
                {filtered.map(order => (
                  <tr key={order.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-black">{String(order.numero).padStart(6, '0')}</td>
                    <td className="px-4 py-3">{order.pedido_cliente || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{order.cliente_nome || '—'}</td>
                    <td className="px-4 py-3">{order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">{order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 font-bold">{order.status}</td>
                    <td className="px-4 py-3 text-right font-black">{money(order.total)}</td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-500">Nenhum pedido encontrado com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}
