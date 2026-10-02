import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = {
  id: string
  numero: number
  pedido_cliente: string | null
  status: string
  total: number
  data_entrega_prometida: string | null
  cliente: { nome: string } | null
}

type Filter = 'todos' | 'atrasado' | 'producao' | 'expedicao' | 'nf_saida'

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const normalize = (value: string) => value.trim().toLowerCase()

function isOverdue(order: Order): boolean {
  if (!order.data_entrega_prometida) return false
  const due = new Date(order.data_entrega_prometida)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today && !['faturado', 'cancelado'].includes(normalize(order.status))
}

function matches(order: Order, filter: Filter): boolean {
  const status = normalize(order.status)
  if (filter === 'atrasado') return isOverdue(order)
  if (filter === 'producao') return ['necessita_producao', 'em_producao', 'producao', 'aguardando produção', 'aguardando_producao', 'liberado para produção', 'liberado_para_producao'].includes(status)
  if (filter === 'expedicao') return ['separado', 'expedicao', 'em_expedicao', 'expedido'].includes(status)
  if (filter === 'nf_saida') return ['faturado', 'nf_saida', 'nota_fiscal_saida', 'nota_emitida'].includes(status)
  return true
}

export default function VendasStatusPedidos() {
  const [rows, setRows] = useState<Order[]>([])
  const [filter, setFilter] = useState<Filter>('todos')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setError(company.error?.message || 'Empresa não identificada.')
      setBusy(false)
      return
    }

    const result = await supabase
      .from('erp_pedidos_venda')
      .select('id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)')
      .eq('empresa_id', String(company.data))
      .order('numero', { ascending: false })
      .limit(1000)

    if (result.error) setError(result.error.message)
    setRows((result.data ?? []) as unknown as Order[])
    setBusy(false)
  }

  useEffect(() => {
    const filtro = new URLSearchParams(window.location.search).get('filtro')
    if (filtro === 'atrasados') setFilter('atrasado')
    if (filtro === 'producao') setFilter('producao')
    void load()
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((order) => {
      const matchesQuery =
        !term ||
        String(order.numero).includes(term) ||
        (order.cliente?.nome ?? '').toLowerCase().includes(term) ||
        (order.pedido_cliente ?? '').toLowerCase().includes(term)
      return matches(order, filter) && matchesQuery
    })
  }, [filter, query, rows])

  const selectedRows = visible.filter((order) => selected[order.id])
  const filters: Array<[Filter, string, string]> = [
    ['todos', 'Todos', 'bg-slate-100 text-slate-800'],
    ['atrasado', 'Atrasado', 'bg-red-100 text-red-800'],
    ['producao', 'Produção', 'bg-orange-100 text-orange-900'],
    ['expedicao', 'Expedição', 'bg-yellow-100 text-yellow-900'],
    ['nf_saida', 'NF Saída', 'bg-blue-100 text-blue-800'],
  ]

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white print:hidden">
        <div className="flex min-h-[70px] items-center justify-between gap-4 px-5 lg:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-[#2D8DB8]">ERP Industrial • Vendas</p>
            <h1 className="text-xl font-medium text-[#123B50]">Status dos Pedidos</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => location.assign('/vendas')} className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs">
              <ArrowLeft size={15} /> Voltar
            </button>
            <button type="button" onClick={() => void load()} disabled={busy} className="h-9 rounded-md border px-3 text-xs">
              <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={() => window.print()} className="flex h-9 items-center gap-2 rounded-md bg-[#123B50] px-3 text-xs text-white">
              <Printer size={15} /> Imprimir relatório
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] p-5 lg:p-8">
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:hidden">
          {filters.map(([key, label, classes]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg border p-4 text-left transition ${classes} ${filter === key ? 'ring-2 ring-[#2D8DB8]' : ''}`}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className="mt-1 text-2xl font-medium">{rows.filter((order) => matches(order, key)).length}</div>
            </button>
          ))}
        </section>

        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-[#123B50]">{filters.find((item) => item[0] === filter)?.[1] ?? 'Todos os pedidos'}</h2>
              <p className="mt-1 text-xs text-slate-500">Selecione pedidos para compor o relatório macro.</p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nº, cliente ou pedido cliente"
              className="h-10 w-72 rounded-md border px-3 text-sm print:hidden"
            />
          </div>

          {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="h-[54px] bg-slate-100 text-left text-sm">
                  <th className="w-12">
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((order) => selected[order.id])}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = { ...current }
                          visible.forEach((order) => {
                            next[order.id] = event.target.checked
                          })
                          return next
                        })
                      }
                    />
                  </th>
                  <th>Nº</th>
                  <th>Pedido Cliente</th>
                  <th>Cliente</th>
                  <th>Entrega</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th className="print:hidden">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const overdue = isOverdue(order)
                  return (
                    <tr key={order.id} className="h-[54px] border-t">
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[order.id])}
                          onChange={(event) => setSelected((current) => ({ ...current, [order.id]: event.target.checked }))}
                        />
                      </td>
                      <td className="font-medium">{String(order.numero).padStart(6, '0')}</td>
                      <td>{order.pedido_cliente || '—'}</td>
                      <td>{order.cliente?.nome || '—'}</td>
                      <td className={overdue ? 'font-medium text-red-700' : ''}>{order.data_entrega_prometida || '—'}</td>
                      <td>{brl(Number(order.total || 0))}</td>
                      <td>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${overdue ? 'border-red-200 bg-red-100 text-red-800' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="print:hidden">
                        <button type="button" onClick={() => location.assign('/vendas/pedido/' + order.id)} className="text-sm text-[#2D8DB8]">
                          Abrir status
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!visible.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">Nenhum pedido real encontrado neste status.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 text-sm">
            <span>Pedidos exibidos: {visible.length}</span>
            <span>Selecionados: {selectedRows.length}</span>
          </div>
        </section>
      </main>

      <div className="hidden p-8 print:block">
        <h1 className="text-2xl font-medium">Relatório Macro — Status de Pedidos</h1>
        <p className="mt-2">Pedidos selecionados: {selectedRows.length}</p>
      </div>
    </div>
  )
}
