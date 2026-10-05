import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import QualitySidebar from '../components/quality/QualitySidebar'

type Rpn = { id: string; status: string; setor_id: string | null; setor?: { nome: string }[] | null }
type Capa = { status: string; resultado_eficacia: string | null }
type Document = { status: string; area: string | null; setor: string | null }
type DepartmentCount = { department: string; total: number }

const COLORS = ['#15803d', '#dc2626', '#64748b']
const pendingStates = new Set(['rascunho', 'em_revisao', 'aprovada', 'liberada'])

export default function QualidadeDashboardRNC() {
  const [rncs, setRncs] = useState<Rpn[]>([])
  const [actions, setActions] = useState<Capa[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ERP não identificada.')
      const [r, a, d] = await Promise.all([
        fetchAllPages<Rpn>((from, to) => supabase.from('erp_rpnc').select('id,status,setor_id,sgq_origem,setor:erp_setores(nome)', { count: 'exact' }).eq('empresa_id', company.data).not('sgq_origem', 'is', null).order('criado_em', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Capa>((from, to) => supabase.from('erp_sgq_capa_acoes').select('status,resultado_eficacia', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Document>((from, to) => supabase.from('erp_documentos_qualidade_revisoes').select('status,area,setor', { count: 'exact' }).eq('empresa_id', company.data).order('criado_em', { ascending: false }).order('id', { ascending: false }).range(from, to)),
      ])
      setRncs(r)
      setActions(a)
      setDocuments(d)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao consultar os indicadores do SGQ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openByDepartment = useMemo<DepartmentCount[]>(() => {
    const counts = new Map<string, number>()
    rncs.filter((row) => !['encerrada', 'Encerrada'].includes(row.status)).forEach((row) => {
      const department = row.setor?.[0]?.nome || 'Sem setor definido'
      counts.set(department, (counts.get(department) ?? 0) + 1)
    })
    return [...counts].map(([department, total]) => ({ department, total })).sort((a, b) => b.total - a.total)
  }, [rncs])

  const efficacy = useMemo(() => {
    const totals = { Eficaz: 0, Ineficaz: 0, Pendente: 0 }
    actions.forEach((action) => {
      if (action.resultado_eficacia === 'Eficaz') totals.Eficaz += 1
      else if (action.resultado_eficacia === 'Ineficaz') totals.Ineficaz += 1
      else totals.Pendente += 1
    })
    return Object.entries(totals).map(([name, value]) => ({ name, value }))
  }, [actions])

  const pendingByDepartment = useMemo<DepartmentCount[]>(() => {
    const counts = new Map<string, number>()
    documents.filter((doc) => pendingStates.has((doc.status || '').toLowerCase())).forEach((doc) => {
      const department = doc.area?.trim() || doc.setor?.trim() || 'Sem setor definido'
      counts.set(department, (counts.get(department) ?? 0) + 1)
    })
    return [...counts].map(([department, total]) => ({ department, total })).sort((a, b) => b.total - a.total)
  }, [documents])

  const openCount = rncs.filter((row) => !['encerrada', 'Encerrada'].includes(row.status)).length
  const verifiedCount = actions.filter((action) => action.resultado_eficacia !== null).length
  const pendingReviewCount = documents.filter((doc) => pendingStates.has((doc.status || '').toLowerCase())).length

  return (
    <main data-quality-workspace className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto grid max-w-[1800px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <QualitySidebar active="/qualidade/dashboard-rnc" />
        <div className="min-w-0">
          <header className="flex flex-wrap items-end gap-4 border-b border-slate-300 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-sky-700">QUALIDADE › SGQ › INDICADORES</p>
              <h1 className="text-2xl font-black md:text-3xl">Painel de gestão da qualidade</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Indicadores consolidados diretamente dos registros autorizados da empresa.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-bold"><RefreshCw size={17}/>{loading ? 'Carregando…' : 'Atualizar'}</button>
          </header>

          {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="rounded-md border border-rose-300 bg-white px-3 py-2 font-bold">Tentar novamente</button></div>}
          {loading && !error ? <p role="status" className="mt-5 rounded-lg border border-slate-200 bg-white p-6 text-center font-semibold text-slate-600">Carregando indicadores reais do SGQ…</p> : !error && <>
            <section className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric icon={AlertTriangle} label="RPNCs em aberto" value={openCount}/>
              <Metric icon={CheckCircle2} label="Ações com eficácia verificada" value={verifiedCount}/>
              <Metric icon={BarChart3} label="Revisões documentais pendentes" value={pendingReviewCount}/>
            </section>
            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <ChartCard title="RPNCs abertas por departamento" description="Ocorrências não encerradas agrupadas pelo setor responsável.">
                {openByDepartment.length ? <><div className="h-[320px]" role="img" aria-label={openByDepartment.map((item) => `${item.department}: ${item.total}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={openByDepartment} margin={{ left: 12, right: 20, top: 12, bottom: 24 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="department" angle={-20} textAnchor="end" height={70} interval={0} tick={{ fontSize: 12 }}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="total" name="RPNCs abertas" fill="#0369a1" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div><AccessibleSummary rows={openByDepartment}/></> : <Empty text="Não há RPNCs abertas por departamento."/>}
              </ChartCard>
              <ChartCard title="Eficácia das ações CAPA" description="Resultado registrado após aprovação e verificação de eficácia.">
                {actions.length ? <><div className="h-[320px]" role="img" aria-label={efficacy.map((item) => `${item.name}: ${item.value}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={efficacy} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={108} label={({ name, value }) => `${name}: ${value}`}><Cell fill={COLORS[0]}/><Cell fill={COLORS[1]}/><Cell fill={COLORS[2]}/></Pie><Tooltip/></PieChart></ResponsiveContainer></div><p className="sr-only">{efficacy.map((item) => `${item.name}: ${item.value}`).join('. ')}</p></> : <Empty text="Ainda não há ações CAPA para avaliar."/>}
              </ChartCard>
              <ChartCard title="Revisões pendentes por setor" description="Rascunho, em revisão, aprovado ou aguardando liberação.">
                {pendingByDepartment.length ? <><div className="h-[320px]" role="img" aria-label={pendingByDepartment.map((item) => `${item.department}: ${item.total}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={pendingByDepartment} layout="vertical" margin={{ left: 12, right: 20, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="department" width={125} tick={{ fontSize: 12 }}/><Tooltip/><Bar dataKey="total" name="Revisões pendentes" fill="#7c3aed" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div><AccessibleSummary rows={pendingByDepartment}/></> : <Empty text="Não há revisões documentais pendentes."/>}
              </ChartCard>
            </section>
          </>}
        </div>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof AlertTriangle; label: string; value: number }) {
  return <article className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-800"><Icon size={20}/></span><div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><b className="text-2xl">{value}</b></div></article>
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p><div className="mt-3">{children}</div></section>
}

function AccessibleSummary({ rows }: { rows: DepartmentCount[] }) {
  return <ul className="sr-only">{rows.map((row) => <li key={row.department}>{row.department}: {row.total}</li>)}</ul>
}

function Empty({ text }: { text: string }) {
  return <p className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center font-semibold text-slate-500">{text}</p>
}
