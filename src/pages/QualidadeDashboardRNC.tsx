import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, FileText, Gauge, RefreshCw, Tablet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ERPHorizontalShell from '../components/layout/ERPHorizontalShell'
import TabletMenuModal from '../components/TabletMenuModal'

type Rpn = { id: string; status: string; setor_envolvido_id: string | null; setor?: { nome: string }[] | null }
type Sector = { id: string; nome: string }
type Capa = { status: string; plano_5w2h: unknown }
type Document = { status: string; area: string | null }
type QualityInspection = { tipo: string; resultado: string; created_at: string; medicoes: unknown }
type DepartmentCount = { department: string; total: number }
type Receiving = { status: string; created_at: string }
type Dimensional = { status: string; created_at: string }

const COLORS = ['#15803d', '#dc2626', '#64748b']
const pendingStates = new Set(['rascunho', 'em_revisao', 'solicitada_alteracao'])

export default function QualidadeDashboardRNC() {
  const navigate = useNavigate()
  const [tabletOpen, setTabletOpen] = useState(false)
  const [rncs, setRncs] = useState<Rpn[]>([])
  const [actions, setActions] = useState<Capa[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [receivingInspections, setReceivingInspections] = useState<Receiving[]>([])
  const [dimensionalInspections, setDimensionalInspections] = useState<Dimensional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa ERP não identificada.')
      const [r, a, d, inspections, sectorRows] = await Promise.all([
        fetchAllPages<Rpn>((from, to) => supabase.from('erp_rpnc').select('id,status,setor_envolvido_id', { count: 'exact' }).eq('empresa_id', company.data).order('criado_em', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        fetchAllPages<Capa>((from, to) => supabase.from('qualidade_rnc_capa').select('status,plano_5w2h', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Document>((from, to) => supabase.from('erp_documentos_qualidade').select('status,area', { count: 'exact' }).eq('empresa_id', company.data).order('codigo').range(from, to)),
        fetchAllPages<QualityInspection>((from, to) => supabase.from('qualidade_inspecoes').select('tipo,resultado,created_at,medicoes', { count: 'exact' }).eq('empresa_id', company.data).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Sector>((from, to) => supabase.from('erp_setores').select('id,nome', { count: 'exact' }).eq('empresa_id', company.data).eq('ativo', true).order('nome').range(from, to)),
      ])
      const sectorNames = new Map(sectorRows.map((sector) => [sector.id, sector.nome]))
      setRncs(r.map((row) => ({ ...row, setor: row.setor_envolvido_id && sectorNames.has(row.setor_envolvido_id) ? [{ nome: sectorNames.get(row.setor_envolvido_id)! }] : null })))
      setActions(a)
      setDocuments(d)
      setReceivingInspections(inspections.filter(row => row.tipo === 'recebimento').map(row => ({ status: row.resultado, created_at: row.created_at })))
      setDimensionalInspections(inspections.filter(row => Array.isArray(row.medicoes) && row.medicoes.length > 0).map(row => ({ status: row.resultado, created_at: row.created_at })))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao consultar os indicadores do SGQ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openByDepartment = useMemo<DepartmentCount[]>(() => {
    const counts = new Map<string, number>()
    rncs.filter((row) => (row.status || '').trim().toLocaleLowerCase('pt-BR') !== 'encerrada').forEach((row) => {
      const department = row.setor?.[0]?.nome || 'Sem setor definido'
      counts.set(department, (counts.get(department) ?? 0) + 1)
    })
    return [...counts].map(([department, total]) => ({ department, total })).sort((a, b) => b.total - a.total)
  }, [rncs])

  const efficacy = useMemo(() => {
    const totals = { Eficaz: 0, Ineficaz: 0, Pendente: 0 }
    actions.forEach((action) => {
      const status = (action.status || '').trim().toLocaleLowerCase('pt-BR')
      if (status === 'eficacia_validada' || status === 'eficaz') totals.Eficaz += 1
      else if (status.includes('ineficaz') || status === 'eficacia_reprovada') totals.Ineficaz += 1
      else totals.Pendente += 1
    })
    return Object.entries(totals).map(([name, value]) => ({ name, value }))
  }, [actions])

  const pendingByDepartment = useMemo<DepartmentCount[]>(() => {
    const counts = new Map<string, number>()
    documents.filter((doc) => pendingStates.has((doc.status || '').toLowerCase())).forEach((doc) => {
      const department = doc.area?.trim() || 'Sem setor definido'
      counts.set(department, (counts.get(department) ?? 0) + 1)
    })
    return [...counts].map(([department, total]) => ({ department, total })).sort((a, b) => b.total - a.total)
  }, [documents])

  const openCount = rncs.filter((row) => row.status.trim().toLocaleLowerCase('pt-BR') !== 'encerrada').length
  const verifiedCount = actions.filter((action) => ['eficacia_validada', 'eficaz'].includes((action.status || '').trim().toLocaleLowerCase('pt-BR'))).length
  const pendingReviewCount = documents.filter((doc) => pendingStates.has((doc.status || '').toLowerCase())).length
  const approvedReceiving = receivingInspections.filter((row) => row.status.toUpperCase() === 'APROVADO').length
  const blockedReceiving = receivingInspections.filter((row) => row.status.toUpperCase() === 'REPROVADO').length
  const pendingReceiving = receivingInspections.filter((row) => row.status.toUpperCase() === 'APROVADO_COM_RESTRICAO').length
  const dimensionalOk = dimensionalInspections.filter((row) => row.status.toUpperCase() === 'APROVADO').length
  const dimensionalNok = dimensionalInspections.filter((row) => row.status.toUpperCase() === 'REPROVADO').length
  const receivingStatus = [{ name: 'Aprovado', value: approvedReceiving }, { name: 'Reprovado', value: blockedReceiving }, { name: 'Com restrição', value: pendingReceiving }]
  const dimensionalStatus = [{ name: 'Conforme', value: dimensionalOk }, { name: 'Não conforme', value: dimensionalNok }, { name: 'Com restrição', value: Math.max(0, dimensionalInspections.length - dimensionalOk - dimensionalNok) }]

  return (
    <ERPHorizontalShell>
    <main data-quality-workspace className="min-h-screen bg-white p-2 text-black md:p-3">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-2">
        <div className="min-w-0">
          <header className="relative flex min-h-[60px] flex-wrap items-center justify-center gap-2 border border-[#2D8DB8] border-t-[3px] border-t-[#E6A34A] bg-gradient-to-r from-[#DCEFF6] via-[#F4FBFD] to-[#DCEFF6] px-3 py-2 text-center text-[#123b50]">
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-[16px] font-extrabold leading-tight text-[#123b50]">Painel de Gestão da Qualidade</h1>
              <p className="mt-1 text-[10px] font-semibold text-[#315466]">Indicadores calculados a partir dos registros da empresa autenticada.</p>
            </div>
            <button type="button" onClick={() => setTabletOpen(true)} className="absolute right-[104px] top-1/2 inline-flex h-[30px] min-h-[30px] -translate-y-1/2 items-center gap-2 border border-[#B8860B] bg-[#D4A017] px-3 text-[10px] font-bold text-black hover:bg-[#E3B52D] max-[760px]:static max-[760px]:translate-y-0" aria-haspopup="dialog"><Tablet size={15}/> TABLET MENU</button>
            <button type="button" onClick={() => void load()} disabled={loading} className="absolute right-2 top-1/2 inline-flex h-[30px] min-h-[30px] -translate-y-1/2 items-center gap-2 border border-[#8eb5c8] bg-white px-3 text-[10px] font-semibold text-[#17445a] hover:bg-[#e6f3f8] max-[760px]:static max-[760px]:translate-y-0"><RefreshCw size={13}/>{loading ? 'Carregando…' : 'Atualizar'}</button>
          </header>

          {error && <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-rose-200 bg-rose-50 p-2 text-[10px] font-semibold text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="h-[28px] border border-rose-300 bg-white px-3 text-[10px] font-bold">Tentar novamente</button></div>}
          {loading && !error ? <p role="status" className="mt-2 border border-slate-200 bg-white p-4 text-center text-[10px] font-semibold text-slate-600">Carregando indicadores reais do SGQ…</p> : !error && <>
            <section className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
              <Metric icon={AlertTriangle} label="RNCs em aberto" value={openCount}/>
              <Metric icon={CheckCircle2} label="Ações com eficácia verificada" value={verifiedCount}/>
              <Metric icon={BarChart3} label="Revisões documentais pendentes" value={pendingReviewCount}/>
              <Metric icon={ClipboardCheck} label="Inspeções de recebimento" value={receivingInspections.length}/>
              <Metric icon={Gauge} label="Medições dimensionais" value={dimensionalInspections.length}/>
              <Metric icon={AlertTriangle} label="Inspeções reprovadas" value={blockedReceiving}/>
            </section>
            <section className="mt-2 grid gap-2 xl:grid-cols-2">
              <ChartCard title="RNCs abertas por departamento" description="Ocorrências não encerradas agrupadas pelo setor responsável." accent="blue">
                {openByDepartment.length ? <><div className="h-[220px]" role="img" aria-label={openByDepartment.map((item) => `${item.department}: ${item.total}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={openByDepartment} margin={{ left: 12, right: 20, top: 12, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="department" angle={-20} textAnchor="end" height={70} interval={0} tick={{ fontSize: 9 }}/><YAxis allowDecimals={false} tick={{ fontSize: 9 }}/><Tooltip/><Bar dataKey="total" name="RNCs abertas" fill="#1680a8" radius={[2, 2, 0, 0]}/></BarChart></ResponsiveContainer></div><AccessibleSummary rows={openByDepartment}/></> : <Empty text="Não há RNCs abertas por departamento."/>}
              </ChartCard>
              <ChartCard title="Eficácia das ações CAPA" description="Resultado registrado após aprovação e verificação de eficácia." accent="violet">
                {actions.length ? <><div className="h-[220px]" role="img" aria-label={efficacy.map((item) => `${item.name}: ${item.value}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={efficacy} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={108} label={({ name, value }) => `${name}: ${value}`}><Cell fill={COLORS[0]}/><Cell fill={COLORS[1]}/><Cell fill={COLORS[2]}/></Pie><Tooltip/></PieChart></ResponsiveContainer></div><p className="sr-only">{efficacy.map((item) => `${item.name}: ${item.value}`).join('. ')}</p></> : <Empty text="Ainda não há ações CAPA para avaliar."/>}
              </ChartCard>
              <ChartCard title="Revisões pendentes por setor" description="Documentos em rascunho, revisão ou aguardando liberação." accent="amber">
                {pendingByDepartment.length ? <><div className="h-[220px]" role="img" aria-label={pendingByDepartment.map((item) => `${item.department}: ${item.total}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={pendingByDepartment} layout="vertical" margin={{ left: 12, right: 20, top: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="department" width={125} tick={{ fontSize: 9 }}/><Tooltip/><Bar dataKey="total" name="Revisões pendentes" fill="#64748b" radius={[0, 2, 2, 0]}/></BarChart></ResponsiveContainer></div><AccessibleSummary rows={pendingByDepartment}/></> : <Empty text="Não há revisões documentais pendentes."/>}
              </ChartCard>
              <ChartCard title="Inspeção de recebimento" description="Distribuição dos lotes avaliados por status registrado." accent="cyan">
                {receivingInspections.length ? <div className="h-[210px]" role="img" aria-label={receivingStatus.map((item) => `${item.name}: ${item.value}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={receivingStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label={({ name, value }) => `${name}: ${value}`}><Cell fill="#159A83"/><Cell fill="#D9485F"/><Cell fill="#E7A63A"/></Pie><Tooltip/></PieChart></ResponsiveContainer></div> : <Empty text="Ainda não há inspeções de recebimento registradas."/>}
              </ChartCard>
              <ChartCard title="Inspeção dimensional" description="Conformidade das medições cadastradas." accent="teal">
                {dimensionalInspections.length ? <div className="h-[210px]" role="img" aria-label={dimensionalStatus.map((item) => `${item.name}: ${item.value}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={dimensionalStatus} margin={{ left: 8, right: 12, top: 14, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="name" tick={{ fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fontSize: 9 }}/><Tooltip/><Bar dataKey="value" name="Medições" fill="#64748b" radius={[2, 2, 0, 0]}/></BarChart></ResponsiveContainer></div> : <Empty text="Ainda não há medições dimensionais registradas."/>}
              </ChartCard>
            </section>
            <section className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center border border-[#b8d6e2] bg-[#e1f1f7] text-[#1680a8]"><FileText size={14}/></span>
                <div className="min-w-0"><h2 className="text-[11px] font-semibold text-black">Cadastro de Documentos da Qualidade</h2><p className="text-[9px] text-slate-600">Documentos controlados, revisões, anexos e vigência do GED.</p></div>
              </div>
              <button type="button" onClick={() => navigate('/qualidade/ged-documentos')} className="inline-flex h-[28px] shrink-0 items-center gap-2 border border-slate-400 bg-white px-3 text-[10px] font-semibold text-black hover:bg-slate-50">Abrir cadastro <ArrowRight size={13}/></button>
            </section>
          </>}
        </div>
      </div>
    </main>
    <TabletMenuModal isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={(route) => navigate(route)} />
    </ERPHorizontalShell>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof AlertTriangle; label: string; value: number }) {
  const tone = label.includes('reprovadas') || label.includes('aberto') ? 'border-[#c94f57] bg-[#D65B61] text-white' : label.includes('eficácia') ? 'border-[#247a5b] bg-[#3A9D78] text-white' : label.includes('pendentes') ? 'border-[#bd7b25] bg-[#E6A34A] text-[#123b50]' : 'border-[#1d6f94] bg-[#2D8DB8] text-white'
  return <article className={`flex min-h-[66px] items-center gap-2 border px-2 py-2 shadow-sm ${tone}`}><span className="grid size-8 shrink-0 place-items-center border border-white/40 bg-white/15 text-current"><Icon size={15}/></span><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-current">{label}</p><b className="text-lg font-extrabold tabular-nums text-current">{value}</b></div></article>
}

function ChartCard({ title, description, children, accent = 'blue' }: { title: string; description: string; children: ReactNode; accent?: 'blue' | 'violet' | 'amber' | 'cyan' | 'teal' }) {
  const accents = { blue: 'border-l-[#1680a8]', violet: 'border-l-[#7b61a8]', amber: 'border-l-[#d49a18]', cyan: 'border-l-[#25a6b8]', teal: 'border-l-[#219477]' }
  return <section className={`min-w-0 overflow-hidden border border-[#b5d2de] border-l-[4px] ${accents[accent]} bg-gradient-to-br from-[#edf7fb] to-[#ffffff] p-0 shadow-sm`}><header className="border-b border-[#c4dce6] bg-[#123b50] px-2 py-1.5"><h2 className="text-[11px] font-bold text-white">{title}</h2><p className="mt-0.5 text-[9px] font-medium leading-4 text-[#d2eaf3]">{description}</p></header><div className="p-2">{children}</div></section>
}

function AccessibleSummary({ rows }: { rows: DepartmentCount[] }) {
  return <ul className="sr-only">{rows.map((row) => <li key={row.department}>{row.department}: {row.total}</li>)}</ul>
}

function Empty({ text }: { text: string }) {
  return <p className="grid min-h-32 place-items-center border border-dashed border-slate-300 bg-white p-3 text-center text-[10px] font-medium text-slate-500">{text}</p>
}
