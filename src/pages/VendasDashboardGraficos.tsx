/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: DASHBOARD-BI-UI-ALINHADA
 * @ESCOPO: layout e leitura fiscal real; sem dados sintéticos.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, Calendar, Layers, Printer, TrendingUp, X } from 'lucide-react'
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
  if (!match) throw new Error('Selecione uma competência válida.')
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) throw new Error('Selecione uma competência válida.')
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}

export default function VendasDashboardGraficos() {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'mes' | 'ano'>('mes')
  const [month, setMonth] = useState(localMonth)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setRows([])
    try {
      if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Selecione uma competência válida.')
      const bounds = period === 'mes'
        ? monthBounds(month)
        : { start: `${month.slice(0, 4)}-01-01`, end: `${Number(month.slice(0, 4)) + 1}-01-01` }
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa não identificada para a sessão autenticada.')

      const fiscalRows = await fetchAllPages<FiscalRow>((from, to) => supabase
        .from('erp_documentos_fiscais')
        .select('destinatario_nome,valor_total', { count: 'exact' })
        .eq('empresa_id', String(company.data))
        .eq('tipo', 'saida')
        .eq('status', 'Autorizada')
        .gte('data_emissao', bounds.start)
        .lt('data_emissao', bounds.end)
        .order('data_emissao', { ascending: true })
        .range(from, to))

      const byCustomer = new Map<string, number>()
      for (const row of fiscalRows) {
        const customer = row.destinatario_nome?.trim() || 'Sem destinatário'
        byCustomer.set(customer, (byCustomer.get(customer) ?? 0) + Number(row.valor_total ?? 0))
      }
      setRows([...byCustomer.entries()]
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((left, right) => right.total - left.total))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o faturamento fiscal.')
    } finally {
      setLoading(false)
    }
  }, [month, period])

  useEffect(() => { void load() }, [load])

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.total, 0), [rows])
  const controlClass = 'h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-100'

  return (
    <VendasLayout title="Dashboard Analítica de Faturamento" subtitle="Visão consolidada baseada em documentos fiscais emitidos" onRefresh={() => void load()}>
      <main className="sales-workspace space-y-3 p-1 text-[11px]">
        {error && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-800">
            <span className="flex items-center gap-1.5"><AlertTriangle size={13} />{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Fechar mensagem de erro" className="no-print rounded p-1 hover:bg-red-100"><X size={12} /></button>
          </div>
        )}

        <section className="grid grid-cols-1 items-end gap-3 rounded border border-slate-200 bg-slate-50 p-3 shadow-sm md:grid-cols-12 no-print">
          <label className="grid gap-1 md:col-span-3">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><Layers size={11} />Agrupamento / visão</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as 'mes' | 'ano')} className={`${controlClass} w-[190px] max-w-full`} aria-label="Agrupamento do faturamento">
              <option value="mes">Faturamento mensal</option>
              <option value="ano">Faturamento anual consolidado</option>
            </select>
          </label>
          <label className="grid gap-1 md:col-span-3">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><Calendar size={11} />Período base</span>
            <input type="month" required value={month} onChange={(event) => setMonth(event.target.value)} className={`${controlClass} w-[150px] max-w-full font-mono`} aria-label="Competência base do faturamento" />
          </label>
          <div className="hidden md:col-span-3 md:block" />
          <div className="md:col-span-3">
            <button type="button" onClick={() => window.print()} className="flex h-8 w-[190px] max-w-full items-center justify-center gap-1.5 rounded bg-[#2D8DB8] px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#1a5b7a]">
              <Printer size={12} />Imprimir gráficos / BI
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="flex items-center justify-between rounded border border-slate-200 border-l-4 border-l-sky-800 bg-white p-3 shadow-sm md:col-span-2">
            <div className="min-w-0 space-y-1">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Faturamento fiscal realizado</span>
              <strong className="block break-words text-2xl font-black tracking-tight text-slate-900">{loading ? 'Calculando…' : brl(total)}</strong>
              <span className="inline-block rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{rows.length} cliente(s) com notas autorizadas no período</span>
            </div>
            <div className="shrink-0 rounded border border-sky-100 bg-sky-50 p-2.5 text-sky-700"><BarChart3 size={20} /></div>
          </article>
          <article className="flex items-center gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm">
            <TrendingUp size={17} className="shrink-0 text-sky-700" />
            <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Visão selecionada</span><strong className="text-xs text-slate-800">{period === 'mes' ? 'Mensal' : 'Anual'} · {month.slice(0, 4)}</strong></div>
          </article>
        </section>

        <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <header className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <TrendingUp size={13} className="text-sky-700" />
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-700">Análise e ranking de receita por cliente</h2>
          </header>
          <div className="h-[440px] w-full p-3 pl-0 text-[10px] font-medium">
            {rows.length > 0 && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 28, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eef2" />
                  <XAxis type="number" stroke="#64748b" tickFormatter={(value: number) => value >= 1000 ? `R$ ${Math.round(value / 1000)} mil` : brl(value)} />
                  <YAxis type="category" dataKey="cliente" width={170} stroke="#475569" />
                  <Tooltip formatter={(value) => brl(Number(value))} contentStyle={{ background: '#0f172a', borderRadius: 4, color: '#fff', fontSize: 11 }} />
                  <Bar dataKey="total" fill="#2D8DB8" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : !loading && !error ? (
              <div className="m-2 flex h-full items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Nenhum documento fiscal de saída autorizado localizado na competência selecionada.
              </div>
            ) : loading ? <div role="status" className="flex h-full items-center justify-center text-slate-500">Carregando documentos fiscais…</div> : null}
          </div>
        </section>
      </main>
    </VendasLayout>
  )
}
