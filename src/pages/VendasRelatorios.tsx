import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileDown, Printer, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Form, FormDate, FormField, FormInput, FormSelect } from '../components/industrial/forms'

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
  const [entryFrom, setEntryFrom] = useState('')
  const [entryTo, setEntryTo] = useState('')
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
      const entryDate = order.data_entrada?.slice(0, 10) ?? ''
      const matchesPeriod = (!entryFrom || Boolean(entryDate && entryDate >= entryFrom)) && (!entryTo || Boolean(entryDate && entryDate <= entryTo))
      return matchesStatus && matchesPeriod && (!q || searchable.includes(q))
    })
  }, [orders, query, status, entryFrom, entryTo])

  const statuses = useMemo(
    () => ['TODOS', ...Array.from(new Set(orders.map(order => String(order.status).toUpperCase()).filter(Boolean))).sort()],
    [orders],
  )

  const total = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0)

  const exportCsv = () => {
    const columns = ['Pedido', 'Pedido cliente / PO', 'Cliente', 'Entrada', 'Entrega', 'Status', 'Total']
    const rows = filtered.map(order => [
      String(order.numero).padStart(6, '0'),
      order.pedido_cliente || '',
      order.cliente_nome || '',
      order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '',
      order.data_entrega_prometida ? new Date(order.data_entrega_prometida).toLocaleDateString('pt-BR') : '',
      order.status,
      money(order.total),
    ])
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [columns, ...rows].map(row => row.map(quote).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'relatorio-vendas.csv'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="erp-report-page min-h-screen bg-[#F4FBFD] text-slate-900">
      <style>{`@media print { .print-hidden { display:none!important } body { background:white!important } }`}</style>
      <header className="erp-report-header print-hidden">
        <div className="erp-report-heading">
          <div>
            <nav className="erp-report-breadcrumb" aria-label="Caminho">Comercial / Vendas / Relatórios</nav>
            <h1>Relatórios de Vendas</h1>
            <p>Consulte pedidos reais por cliente, situação e período de entrada.</p>
          </div>
          <div className="erp-report-actions">
            <button type="button" onClick={() => history.back()} className="erp-report-button erp-report-button--quiet">
              <ArrowLeft size={17} /> VOLTAR
            </button>
            <button type="button" onClick={() => void load()} className="erp-report-button erp-report-button--quiet">
              <RefreshCw size={17} /> ATUALIZAR
            </button>
            <button type="button" onClick={exportCsv} className="erp-report-button erp-report-button--quiet">
              <FileDown size={17} /> CSV
            </button>
            <button type="button" onClick={() => window.print()} className="erp-report-button erp-report-button--primary">
              <Printer size={17} /> IMPRIMIR
            </button>
          </div>
        </div>
      </header>

      <section className="erp-report-content">
        <Form onSubmit={event => event.preventDefault()} className="erp-report-filter-grid print-hidden" aria-label="Filtros de pedidos">
          <FormField label={<span className="erp-report-search-label"><Search size={16} /> Buscar pedido, PO ou cliente</span>} span={6} size="lg" id="sales-report-query">
            <FormInput id="sales-report-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: 000123 ou PO-456" />
          </FormField>
          <FormField label="Entrada a partir de" span={2} size="sm" id="sales-report-from">
            <FormDate id="sales-report-from" value={entryFrom} onChange={event => setEntryFrom(event.target.value)} />
          </FormField>
          <FormField label="Entrada até" span={2} size="sm" id="sales-report-to">
            <FormDate id="sales-report-to" value={entryTo} onChange={event => setEntryTo(event.target.value)} />
          </FormField>
          <FormField label="Status" span={2} size="sm" id="sales-report-status">
            <FormSelect id="sales-report-status" value={status} onChange={event => setStatus(event.target.value)}>
              {statuses.map(value => <option key={value}>{value}</option>)}
            </FormSelect>
          </FormField>
        </Form>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{error}</div>}

        <section className="erp-report-card">
          <div className="erp-report-card-head">
            <div>
              <h2>Relatório de Pedidos</h2>
              <p>{filtered.length} pedido(s) • total filtrado {money(total)}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="erp-report-button erp-report-button--quiet print-hidden">
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
