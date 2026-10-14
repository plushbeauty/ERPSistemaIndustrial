import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import VendasLayout from './VendasLayout'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Inspection = { id: string; resultado: string; tipo: string; created_at: string; quantidade_inspecionada: number | null; quantidade_aprovada: number | null; quantidade_reprovada: number | null }
type Document = { id: string; codigo: string; titulo: string; status: string; revisao: number }

const chartColors = ['#2D8DB8', '#3A9D78', '#E6A34A', '#D65B61', '#647D8B', '#7B61A8']

export default function QualidadeDashboardSGQ() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const [inspectionRows, documentRows] = await Promise.all([
        fetchAllPages<Inspection>((from, to) => supabase.from('erp_inspecoes')
          .select('id,resultado,tipo,created_at,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada', { count: 'exact' })
          .eq('empresa_id', company.data).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Document>((from, to) => supabase.from('erp_documentos_qualidade')
          .select('id,codigo,titulo,status,revisao', { count: 'exact' })
          .eq('empresa_id', company.data).order('codigo').range(from, to)),
      ])
      setInspections(inspectionRows)
      setDocuments(documentRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os indicadores reais do SGQ.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const refresh = (event: Event) => { event.preventDefault(); void load() }
    window.addEventListener('erp:refresh-current-module', refresh)
    return () => window.removeEventListener('erp:refresh-current-module', refresh)
  }, [load])

  const approved = inspections.filter(x => String(x.resultado).toUpperCase() === 'APROVADO').length
  const rejected = inspections.filter(x => String(x.resultado).toUpperCase() === 'REPROVADO').length
  const docsActive = documents.filter(x => ['vigente', 'liberada', 'aprovada', 'ativo'].includes(String(x.status).toLowerCase())).length

  const monthly = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const data = inspections.filter(x => String(x.created_at).slice(0, 7) === key)
    return {
      mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
      aprovadas: data.filter(x => String(x.resultado).toUpperCase() === 'APROVADO').length,
      reprovadas: data.filter(x => String(x.resultado).toUpperCase() === 'REPROVADO').length,
    }
  }), [inspections])

  const byType = useMemo(() => {
    const counts = new Map<string, number>()
    inspections.forEach(item => {
      const type = item.tipo?.trim() || 'Sem tipo informado'
      counts.set(type, (counts.get(type) ?? 0) + 1)
    })
    return [...counts.entries()].map(([tipo, quantidade]) => ({ tipo, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8)
  }, [inspections])

  const byDocumentStatus = useMemo(() => {
    const counts = new Map<string, number>()
    documents.forEach(item => {
      const status = item.status?.trim() || 'Sem situação informada'
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return [...counts.entries()].map(([situacao, quantidade]) => ({ situacao, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
  }, [documents])

  const cards = [
    { label: 'Inspeções registradas', value: inspections.length, Icon: Activity, color: '#176B87', pale: '#D8EEF6' },
    { label: 'Inspeções aprovadas', value: approved, Icon: CheckCircle2, color: '#18794E', pale: '#D3EEDF' },
    { label: 'Inspeções reprovadas', value: rejected, Icon: AlertTriangle, color: '#B42332', pale: '#F9DADD' },
    { label: 'Documentos controlados', value: documents.length, Icon: FileText, color: '#B96A05', pale: '#FBE8C9' },
  ]

  return <VendasLayout title="" onRefresh={() => void load()} showStatusCards={false}>
    <div className="quality-approved-dashboard">
    <div className="mb-3 flex min-h-[34px] items-center justify-between border border-[#B9D4DF] bg-[#DCECF3] px-3">
      <div className="flex items-center gap-2 text-[#123B50]"><ShieldCheck size={16} /><span className="text-[10px] font-extrabold uppercase tracking-[.14em]">Painel de indicadores · Sistema de Gestão da Qualidade</span></div>
      <span className="text-[9px] text-[#315466]">{busy ? 'Atualizando dados…' : 'Dados da empresa autenticada'}</span>
    </div>
    {error && <p role="alert" className="mb-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</p>}

    <section className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map(({ label, value, Icon, color, pale }) => <article key={label} className="flex min-h-[76px] items-center gap-3 border px-3 py-2 text-white shadow-[0_2px_0_rgba(18,59,80,.18)]" style={{ backgroundColor: color, borderColor: color }}>
        <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-white" style={{ backgroundColor: pale, color }}><Icon size={18} strokeWidth={2.5} /></span>
        <div className="min-w-0"><p className="text-[9px] font-bold uppercase leading-tight">{label}</p><p className="text-[22px] font-extrabold tabular-nums">{value}</p></div>
      </article>)}
    </section>

    <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <article className="min-w-0 border border-[#B9D4DF] bg-[#F8FCFE] p-3">
        <div className="mb-2 flex items-center gap-2"><Activity size={15} className="text-[#2D8DB8]" /><div><h2 className="text-[12px] font-bold text-[#123B50]">Resultados das inspeções</h2><p className="text-[9px] text-[#647B85]">Aprovadas e reprovadas · últimos seis meses</p></div></div>
        <div className="h-[250px]">
          {busy ? <p className="p-8 text-center text-[10px] text-slate-500">Carregando indicadores…</p> : <ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#D8E8EE" /><XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#315466' }} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#315466' }} /><Tooltip /><Bar dataKey="aprovadas" name="Aprovadas" fill="#2D8DB8" radius={[2, 2, 0, 0]} /><Bar dataKey="reprovadas" name="Reprovadas" fill="#D65B61" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>}
        </div>
      </article>

      <article className="min-w-0 border border-[#B9D4DF] bg-[#F8FCFE] p-3">
        <div className="mb-2 flex items-center gap-2"><ShieldCheck size={15} className="text-[#3A9D78]" /><div><h2 className="text-[12px] font-bold text-[#123B50]">Documentos por situação</h2><p className="text-[9px] text-[#647B85]">Distribuição conforme o status cadastrado no SGQ</p></div></div>
        <div className="h-[250px]">
          {busy ? <p className="p-8 text-center text-[10px] text-slate-500">Carregando indicadores…</p> : byDocumentStatus.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byDocumentStatus} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#D8E8EE" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: '#315466' }} /><YAxis type="category" dataKey="situacao" width={112} tick={{ fontSize: 9, fill: '#315466' }} /><Tooltip /><Bar dataKey="quantidade" name="Documentos" fill="#3A9D78" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center border border-dashed border-[#B9D4DF] text-center text-[10px] text-[#647B85]">Nenhum documento controlado cadastrado para esta empresa.</div>}
        </div>
      </article>

      <article className="min-w-0 border border-[#B9D4DF] bg-[#F8FCFE] p-3 xl:col-span-2">
        <div className="mb-2 flex items-center gap-2"><FileText size={15} className="text-[#B96A05]" /><div><h2 className="text-[12px] font-bold text-[#123B50]">Inspeções por tipo</h2><p className="text-[9px] text-[#647B85]">Até oito tipos com maior quantidade de registros</p></div></div>
        <div className="h-[220px]">
          {busy ? <p className="p-8 text-center text-[10px] text-slate-500">Carregando indicadores…</p> : byType.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byType} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#D8E8EE" /><XAxis dataKey="tipo" tick={{ fontSize: 9, fill: '#315466' }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#315466' }} /><Tooltip /><Bar dataKey="quantidade" name="Inspeções" fill="#E6A34A" radius={[2, 2, 0, 0]}>{byType.map((item, index) => <Cell key={item.tipo} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center border border-dashed border-[#B9D4DF] text-center text-[10px] text-[#647B85]">Nenhuma inspeção cadastrada para esta empresa.</div>}
        </div>
      </article>
    </section>
    </div>
  </VendasLayout>
}