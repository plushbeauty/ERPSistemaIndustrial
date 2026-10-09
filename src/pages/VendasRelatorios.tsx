import { useEffect, useMemo, useState } from 'react'
import { Printer, Search } from 'lucide-react'
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
  const [companyName, setCompanyName] = useState('ERP Industrial')
  const [reportColumns, setReportColumns] = useState({ numero: true, pedido_cliente: true, cliente: true, data_entrada: true, data_entrega_prometida: true, status: true, total: true })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const companyInfo = await supabase.from('erp_empresas').select('razao_social,nome_fantasia').eq('id', String(company.data)).maybeSingle()
      if (!companyInfo.error && companyInfo.data) setCompanyName(companyInfo.data.nome_fantasia || companyInfo.data.razao_social || 'ERP Industrial')
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

  const printFields = [
    { key: 'numero', label: 'Nº Pedido' },
    { key: 'pedido_cliente', label: 'Pedido cliente / PO' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'data_entrada', label: 'Entrada' },
    { key: 'data_entrega_prometida', label: 'Entrega' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
  ] as const
  const selectedCount = printFields.filter(field => reportColumns[field.key]).length
  const dateLabel = new Date().toLocaleString('pt-BR')

  return (
    <VendasLayout title="Relatórios de Vendas" subtitle="Selecione os campos que deseja imprimir" onRefresh={() => void load()} showStatusCards={false}>
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          body * { visibility: hidden !important; }
          .sales-report-print, .sales-report-print * { visibility: visible !important; }
          .sales-report-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; margin: 0 !important; color: #111827 !important; background: #fff !important; }
          .print-hidden { display: none !important; }
          .sales-report-print table { width: 100% !important; min-width: 0 !important; border-collapse: collapse !important; }
          .sales-report-print th, .sales-report-print td { border: 1px solid #9ca3af !important; padding: 5px 6px !important; font-size: 9pt !important; }
          .sales-report-print thead { display: table-header-group; }
          .sales-report-print tr { break-inside: avoid; }
        }
      `}</style>
      <section className="mx-auto max-w-[1600px] space-y-2 px-2 py-2 lg:px-3">
        <div className="print-hidden border border-slate-200 bg-white p-3">
          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_210px]">
            <label className="grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">
              Buscar pedido, PO ou cliente
              <span className="relative">
                <Search size={14} className="absolute left-2 top-2 text-slate-400" />
                <input value={query} onChange={event => setQuery(event.target.value)} className="h-[30px] w-full border border-slate-300 pl-7 pr-2 text-[11px] outline-none focus:border-[#2D8DB8]" placeholder="Número do pedido ou cliente" />
              </span>
            </label>
            <label className="grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">
              Status do pedido
              <select value={status} onChange={event => setStatus(event.target.value)} className="h-[30px] border border-slate-300 bg-white px-2 text-[11px]">
                {statuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="border-t border-slate-100 pt-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="text-[11px] font-semibold text-[#123B50]">Campos que serão impressos</h2><p className="text-[10px] text-slate-500">Marque apenas as colunas necessárias para este relatório.</p></div>
              <div className="flex gap-1">
                <button type="button" className="h-[27px] border border-slate-300 px-2 text-[10px]" onClick={() => setReportColumns({numero:true,pedido_cliente:true,cliente:true,data_entrada:true,data_entrega_prometida:true,status:true,total:true})}>Selecionar todos</button>
                <button type="button" className="h-[27px] border border-slate-300 px-2 text-[10px]" onClick={() => setReportColumns({numero:true,pedido_cliente:false,cliente:true,data_entrada:false,data_entrega_prometida:true,status:true,total:true})}>Resumo de pedidos</button>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              {printFields.map(field => <label key={field.key} className="flex items-center gap-2 text-[10px] text-slate-700"><input type="checkbox" checked={reportColumns[field.key]} onChange={event => setReportColumns(current => ({...current,[field.key]:event.target.checked}))} className="accent-[#2D8DB8]"/>{field.label}</label>)}
            </div>
          </div>
          {error && <div role="alert" className="mt-2 border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <span className="text-[10px] text-slate-500">{loading ? 'Carregando pedidos…' : `${filtered.length} pedido(s) • total ${money(total)} • ${selectedCount} coluna(s)`}</span>
            <button type="button" disabled={loading || !filtered.length || !selectedCount} onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-1 bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Printer size={13}/> IMPRIMIR RELATÓRIO</button>
          </div>
        </div>

        <section className="sales-report-print border border-slate-200 bg-white p-3">
          <header className="mb-3 border-b-2 border-[#123B50] pb-2">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-[15px] font-bold tracking-wide text-[#123B50]">{companyName}</div><div className="mt-1 text-[9px] uppercase tracking-widest text-slate-500">Relatório comercial • ERP Industrial</div></div>
              <div className="text-right text-[9px] text-slate-600"><div className="font-semibold">RELATÓRIO DE PEDIDOS DE VENDA</div><div>Emitido em: {dateLabel}</div><div>Filtro de status: {status}</div></div>
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[9px] text-slate-700"><span>Pedidos listados: {filtered.length}</span><span>Valor total do resultado: {money(total)}</span><span>Pesquisa: {query.trim() || 'Todos'}</span></div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[10px]">
              <thead className="bg-slate-100 text-left text-[9px] font-semibold uppercase text-slate-700"><tr>
                {reportColumns.numero&&<th className="px-2 py-2">Nº Pedido</th>}
                {reportColumns.pedido_cliente&&<th className="px-2 py-2">Pedido cliente / PO</th>}
                {reportColumns.cliente&&<th className="px-2 py-2">Cliente</th>}
                {reportColumns.data_entrada&&<th className="px-2 py-2">Entrada</th>}
                {reportColumns.data_entrega_prometida&&<th className="px-2 py-2">Entrega</th>}
                {reportColumns.status&&<th className="px-2 py-2">Status</th>}
                {reportColumns.total&&<th className="px-2 py-2 text-right">Total</th>}
              </tr></thead>
              <tbody>
                {filtered.map(order => <tr key={order.id} className="border-t border-slate-200">
                  {reportColumns.numero&&<td className="px-2 py-2 font-medium">{String(order.numero).padStart(6,'0')}</td>}
                  {reportColumns.pedido_cliente&&<td className="px-2 py-2">{order.pedido_cliente||'—'}</td>}
                  {reportColumns.cliente&&<td className="px-2 py-2">{order.cliente_nome||'—'}</td>}
                  {reportColumns.data_entrada&&<td className="px-2 py-2">{order.data_entrada?new Date(order.data_entrada).toLocaleDateString('pt-BR'):'—'}</td>}
                  {reportColumns.data_entrega_prometida&&<td className="px-2 py-2">{order.data_entrega_prometida?new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR'):'—'}</td>}
                  {reportColumns.status&&<td className="px-2 py-2">{order.status}</td>}
                  {reportColumns.total&&<td className="px-2 py-2 text-right">{money(order.total)}</td>}
                </tr>)}
                {!loading&&!filtered.length&&<tr><td colSpan={selectedCount} className="px-2 py-8 text-center text-slate-500">Nenhum pedido encontrado com os filtros atuais.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="mt-3 border-t border-slate-300 pt-2 text-[8px] text-slate-500">Documento gerado pelo módulo de Vendas • {companyName} • {dateLabel}</footer>
        </section>
      </section>
    </VendasLayout>
  )
}
}
