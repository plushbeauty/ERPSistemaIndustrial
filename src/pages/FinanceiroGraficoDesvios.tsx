import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Printer, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type CostRow = {
  id: string
  ordem_producao_id: string | null
  periodo: string | null
  custo_mp: number | null
  custo_mod: number | null
  custo_ggf: number | null
  quantidade_produzida: number | null
  custo_total: number | null
}
type ChartRow = { ordem: string; periodo: string; materiaPrima: number; maoObra: number; gastosGerais: number; total: number; quantidade: number }

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function FinanceiroGraficoDesvios() {
  const [rows, setRows] = useState<CostRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const { data: company, error: companyError } = await supabase.rpc('erp_current_empresa_id')
      if (companyError) throw companyError
      if (typeof company !== 'string' || !company) throw new Error('Empresa da sessão não identificada.')
      const data = await fetchAllPages<CostRow>((from, to) => supabase
        .from('fiscal_custos_ordens')
        .select('id,ordem_producao_id,periodo,custo_mp,custo_mod,custo_ggf,quantidade_produzida,custo_total', { count: 'exact' })
        .eq('empresa_id', company)
        .order('periodo', { ascending: false })
        .range(from, to))
      setRows(data)
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os custos reais das ordens.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])
  const data = useMemo<ChartRow[]>(() => rows.slice(0, 40).map(row => ({
    ordem: (row.ordem_producao_id ?? row.id).slice(0, 8).toUpperCase(),
    periodo: row.periodo ?? '—',
    materiaPrima: Number(row.custo_mp ?? 0),
    maoObra: Number(row.custo_mod ?? 0),
    gastosGerais: Number(row.custo_ggf ?? 0),
    total: Number(row.custo_total ?? 0),
    quantidade: Number(row.quantidade_produzida ?? 0),
  })), [rows])
  const critical = data.some(row => row.total > 0 && row.materiaPrima + row.maoObra + row.gastosGerais > row.total * 1.2)

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4 print:hidden">
      <div><p className="text-xs font-black uppercase tracking-wide text-slate-600">FINANCEIRO / CUSTOS INDUSTRIAIS</p><h1 className="text-xl font-black">Composição do Custo Real por Ordem</h1><p className="mt-1 text-xs text-slate-600">Valores persistidos em fiscal_custos_ordens, restritos à empresa da sessão; sem estimativas ou custos fictícios.</p></div>
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-bold"><RefreshCw size={14} className={busy ? 'animate-spin' : ''}/> ATUALIZAR</button>
        <button type="button" onClick={() => window.print()} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-slate-900 px-3 text-xs font-bold text-white"><Printer size={14}/> IMPRIMIR</button>
      </div>
    </header>
    {critical && <div className="mt-4 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900"><AlertTriangle size={16}/> A soma dos componentes difere do custo total em mais de 20% em pelo menos uma ordem. Verifique o fechamento do custo.</div>}
    {error && <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900" role="alert">{error}</div>}
    <section className="mt-4 rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2"><BarChart3 size={18} className="text-sky-700"/><h2 className="text-sm font-black">Componentes de custo por ordem (até 40 ordens mais recentes)</h2></div>
      {rows.length === 0 && !busy ? <p className="rounded bg-slate-50 p-5 text-sm font-semibold text-slate-600">{error ? 'Dados indisponíveis até corrigir a consulta.' : 'Nenhuma apuração de custo por ordem disponível para esta empresa.'}</p> :
        <div className="h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="ordem" stroke="#0f172a"/><YAxis stroke="#0f172a"/><Tooltip formatter={(value) => money(Number(value))}/><Legend/><Bar dataKey="materiaPrima" stackId="cost" fill="#2563eb" name="Matéria-prima"/><Bar dataKey="maoObra" stackId="cost" fill="#0891b2" name="Mão de obra"/><Bar dataKey="gastosGerais" stackId="cost" fill="#d97706" name="Gastos gerais"/></BarChart></ResponsiveContainer></div>}
    </section>
    <section className="mt-4 overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Ordem (ID)</th><th className="p-2">Período</th><th className="p-2 text-right">Quantidade</th><th className="p-2 text-right">Matéria-prima</th><th className="p-2 text-right">Mão de obra</th><th className="p-2 text-right">Gastos gerais</th><th className="p-2 text-right">Custo total</th></tr></thead>
        <tbody>{busy ? <tr><td colSpan={7} className="p-4">Consultando custos reais...</td></tr> : data.length === 0 ? <tr><td colSpan={7} className="p-4">Sem registros.</td></tr> : data.map((row, index) => <tr key={rows[index].id} className="border-t border-slate-100"><td className="p-2 font-semibold">{row.ordem}</td><td className="p-2">{row.periodo}</td><td className="p-2 text-right">{row.quantidade.toLocaleString('pt-BR')}</td><td className="p-2 text-right">{money(row.materiaPrima)}</td><td className="p-2 text-right">{money(row.maoObra)}</td><td className="p-2 text-right">{money(row.gastosGerais)}</td><td className="p-2 text-right font-bold">{money(row.total)}</td></tr>)}</tbody>
      </table>
    </section>
  </main>
}
