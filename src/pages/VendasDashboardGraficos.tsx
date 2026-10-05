import { useEffect, useState } from 'react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Row = { cliente: string; total: number }
type FiscalRow = { destinatario_nome: string | null; valor_total: number | null }

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const localMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthBounds(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Selecione um período válido.')
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) throw new Error('Selecione um período válido.')

  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}

export default function VendasDashboardGraficos() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(localMonth)

  const load = async () => {
    setLoading(true)
    setError('')
    setRows([])
    setTotal(0)
    try {
      const { start, end } = monthBounds(month)
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')

      const fiscalRows = await fetchAllPages((from, to) => supabase
        .from('erp_documentos_fiscais')
        .select('destinatario_nome,valor_total', { count: 'exact' })
        .eq('empresa_id', String(company.data))
        .eq('tipo', 'saida')
        .eq('status', 'Autorizada')
        .gte('data_emissao', start)
        .lt('data_emissao', end)
        .order('data_emissao')
        .range(from, to)) as FiscalRow[]

      const byCustomer = new Map<string, number>()
      for (const row of fiscalRows) {
        const customer = row.destinatario_nome?.trim() || 'Sem destinatário'
        byCustomer.set(customer, (byCustomer.get(customer) ?? 0) + Number(row.valor_total ?? 0))
      }

      const ranked = [...byCustomer.entries()]
        .map(([cliente, value]) => ({ cliente, total: value }))
        .sort((left, right) => right.total - left.total)
      setRows(ranked)
      setTotal(ranked.reduce((sum, row) => sum + row.total, 0))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o faturamento fiscal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [month])

  return (
    <VendasLayout
      title="Dashboard analítica de faturamento"
      subtitle="Documentos fiscais de saída autorizados"
      onRefresh={() => void load()}
    >
      <div className="sales-workspace space-y-4">
        <section className="sales-page-heading">
          <div>
            <span className="sales-eyebrow">VENDAS / FATURAMENTO</span>
            <p>Valores calculados a partir de documentos fiscais autorizados no período selecionado.</p>
          </div>
          <div className="sales-heading-actions">
            <label className="sales-button sales-button--secondary">
              Período
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                aria-label="Período do faturamento"
              />
            </label>
            <button type="button" onClick={() => window.print()} className="sales-button sales-button--primary no-print">
              Imprimir gráficos
            </button>
          </div>
        </section>

        {error && <div role="alert" className="sales-alert">{error}</div>}
        {loading && <div role="status" className="sales-loading-row">Carregando documentos fiscais…</div>}

        <section className="sales-orders-card p-4" aria-label="Resumo do faturamento">
          <span className="sales-eyebrow">Faturamento fiscal do período</span>
          <strong className="mt-1 block text-2xl font-bold text-slate-900">{brl(total)}</strong>
          <small className="text-xs text-slate-500">{rows.length} cliente(s) com documentos autorizados</small>
        </section>

        <section className="sales-orders-card">
          <div className="sales-page-heading px-4 pt-4">
            <div>
              <span className="sales-eyebrow">RANKING</span>
              <h2 className="text-base font-bold text-slate-900">Faturamento por cliente</h2>
            </div>
          </div>
          <div className="h-[420px] w-full p-3" role="img" aria-label="Gráfico de faturamento fiscal por cliente">
            {rows.length > 0 && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#0f172a" />
                  <YAxis type="category" dataKey="cliente" width={180} stroke="#0f172a" />
                  <Tooltip formatter={(value) => brl(Number(value))} />
                  <Bar dataKey="total" fill="#0052cc" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : !loading && !error ? (
              <div className="flex h-full items-center justify-center text-center text-slate-600">
                Nenhum faturamento fiscal encontrado no período.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </VendasLayout>
  )
}
