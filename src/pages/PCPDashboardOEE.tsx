import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Clock3, Factory, Gauge, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'

type Apontamento = {
  ordem_producao_id: string
  quantidade_boa: number
  quantidade_refugo: number
  setup_min: number
  paradas_min: number
  inicio: string | null
  fim: string | null
}
type Ordem = {
  id: string
  quantidade_planejada: number
  velocidade_nominal_hora: number
  tempo_estimado_horas: number
}
type Dia = { dia: string; disponibilidade: number; performance: number; qualidade: number; oee: number }

const pct = (value: number) => `${value.toFixed(1)}%`
const clamp = (value: number) => Math.max(0, Math.min(100, value))

export default function PCPDashboardOEE() {
  const [period, setPeriod] = useState('30')
  const [rows, setRows] = useState<Apontamento[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const since = new Date(Date.now() - Number(period) * 86400000).toISOString()
    const company = await supabase.rpc('erp_current_empresa_id')
    if (company.error || !company.data) {
      setError(company.error?.message ?? 'Empresa da sessão não identificada.')
      setRows([])
      setOrdens([])
      setLoading(false)
      return
    }
    const empresaId = String(company.data)
    const o = await supabase.from('erp_ordens_producao')
      .select('id,quantidade_planejada,velocidade_nominal_hora,tempo_estimado_horas')
      .eq('empresa_id', empresaId)
      .limit(10000)
    if (o.error) {
      setError(o.error.message)
      setRows([])
      setOrdens([])
      setLoading(false)
      return
    }
    const scopedOrders = (o.data ?? []) as Ordem[]
    const orderIds = scopedOrders.map(order => order.id)
    const a = orderIds.length
      ? await supabase.from('erp_producao_apontamentos')
          .select('ordem_producao_id,quantidade_boa,quantidade_refugo,setup_min,paradas_min,inicio,fim')
          .in('ordem_producao_id', orderIds)
          .gte('inicio', since)
          .limit(10000)
      : { data: [], error: null }
    if (a.error) {
      setError(a.error.message)
      setRows([])
      setOrdens([])
    } else {
      setRows((a.data ?? []) as Apontamento[])
      setOrdens(scopedOrders)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [period])

  const metrics = useMemo(() => {
    const byOrder = new Map(ordens.map((x) => [x.id, x]))
    let planned = 0
    let downtime = 0
    let runtime = 0
    let good = 0
    let scrap = 0
    let idealPieces = 0

    for (const row of rows) {
      const op = byOrder.get(row.ordem_producao_id)
      const duration = row.inicio && row.fim ? Math.max(0, (new Date(row.fim).getTime() - new Date(row.inicio).getTime()) / 60000) : 0
      const stop = Math.max(0, Number(row.paradas_min) || 0) + Math.max(0, Number(row.setup_min) || 0)
      planned += op ? Math.max(0, Number(op.tempo_estimado_horas) || 0) * 60 : duration
      downtime += Math.min(duration, stop)
      runtime += Math.max(0, duration - stop)
      good += Math.max(0, Number(row.quantidade_boa) || 0)
      scrap += Math.max(0, Number(row.quantidade_refugo) || 0)
      const rate = op ? Math.max(0, Number(op.velocidade_nominal_hora) || 0) : 0
      idealPieces += (Math.max(0, duration - stop) / 60) * rate
    }

    const availability = planned > 0 ? clamp(((planned - downtime) / planned) * 100) : 0
    const performance = idealPieces > 0 ? clamp((good / idealPieces) * 100) : 0
    const quality = good + scrap > 0 ? clamp((good / (good + scrap)) * 100) : 0
    const oee = (availability * performance * quality) / 10000
    return { availability, performance, quality, oee, planned, downtime, runtime, good, scrap }
  }, [rows, ordens])

  const trend = useMemo<Dia[]>(() => {
    const byOrder = new Map(ordens.map((x) => [x.id, x]))
    const map = new Map<string, { planned: number; stop: number; good: number; scrap: number; ideal: number }>()
    for (const row of rows) {
      const key = row.inicio?.slice(0, 10)
      if (!key) continue
      const op = byOrder.get(row.ordem_producao_id)
      const duration = row.inicio && row.fim ? Math.max(0, (new Date(row.fim).getTime() - new Date(row.inicio).getTime()) / 60000) : 0
      const stop = Math.min(duration, Math.max(0, Number(row.paradas_min) || 0) + Math.max(0, Number(row.setup_min) || 0))
      const item = map.get(key) ?? { planned: 0, stop: 0, good: 0, scrap: 0, ideal: 0 }
      item.planned += op ? Math.max(0, Number(op.tempo_estimado_horas) || 0) * 60 : duration
      item.stop += stop
      item.good += Math.max(0, Number(row.quantidade_boa) || 0)
      item.scrap += Math.max(0, Number(row.quantidade_refugo) || 0)
      item.ideal += ((duration - stop) / 60) * Math.max(0, Number(op?.velocidade_nominal_hora) || 0)
      map.set(key, item)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, x]) => {
      const availability = x.planned ? clamp(((x.planned - x.stop) / x.planned) * 100) : 0
      const performance = x.ideal ? clamp((x.good / x.ideal) * 100) : 0
      const quality = x.good + x.scrap ? clamp((x.good / (x.good + x.scrap)) * 100) : 0
      return { dia: dia.slice(5).replace('-', '/'), disponibilidade: availability, performance, qualidade: quality, oee: availability * performance * quality / 10000 }
    })
  }, [rows, ordens])

  const donut = [
    { name: 'Boa', value: metrics.good },
    { name: 'Refugo', value: metrics.scrap },
  ]

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">PCP › CHÃO DE FÁBRICA › PERFORMANCE</p>
            <h1 className="mt-1 text-[15px] font-black tracking-tight">OEE Industrial</h1>
            <p className="text-sm font-medium text-slate-600">Disponibilidade × Performance × Qualidade, calculado somente sobre apontamentos reais.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 print:hidden">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-[30px] rounded-[2px] border border-slate-300 bg-white px-4 font-bold">
              <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
            </select>
            <button type="button" onClick={() => void load()} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-slate-900 px-4 font-black text-white"><RefreshCw size={17}/> ATUALIZAR</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] space-y-5 p-5">
        {error && <div className="rounded-[2px] border border-rose-200 bg-rose-50 p-4 font-bold text-rose-900">{error}</div>}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'OEE GLOBAL', value: pct(metrics.oee), icon: Gauge, note: 'Índice composto' },
            { label: 'DISPONIBILIDADE', value: pct(metrics.availability), icon: Clock3, note: 'Tempo planejado sem parada' },
            { label: 'PERFORMANCE', value: pct(metrics.performance), icon: TrendingUp, note: 'Produção versus ciclo nominal' },
            { label: 'QUALIDADE', value: pct(metrics.quality), icon: ShieldCheck, note: 'Boa versus boa + refugo' },
          ].map((card) => {
            const MetricIcon = card.icon
            return (
              <article key={card.label} className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-slate-500">{card.label}</span><MetricIcon className="text-sky-700" size={21}/></div>
                <strong className="mt-3 block text-4xl font-black tracking-tight">{loading ? '—' : card.value}</strong>
                <p className="mt-1 text-sm font-semibold text-slate-500">{card.note}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <article className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Activity className="text-sky-700"/><div><h2 className="font-black">Evolução diária</h2><p className="text-xs font-semibold text-slate-500">Sem interpolar dias sem apontamento.</p></div></div>
            <div className="h-[360px]">
              {trend.length === 0 ? <div className="flex h-full items-center justify-center font-bold text-slate-400">Sem dados reais no período.</div> :
                <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="dia"/><YAxis domain={[0,100]}/><Tooltip formatter={(v: number) => pct(v)}/><Line type="monotone" dataKey="oee" stroke="#0f172a" strokeWidth={4} dot={false} name="OEE"/><Line type="monotone" dataKey="disponibilidade" stroke="#0284c7" strokeWidth={2} dot={false} name="Disponibilidade"/><Line type="monotone" dataKey="performance" stroke="#7c3aed" strokeWidth={2} dot={false} name="Performance"/><Line type="monotone" dataKey="qualidade" stroke="#059669" strokeWidth={2} dot={false} name="Qualidade"/></LineChart></ResponsiveContainer>}
            </div>
          </article>

          <article className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Factory className="text-sky-700"/><div><h2 className="font-black">Produção real</h2><p className="text-xs font-semibold text-slate-500">Quantidade registrada pelos operadores.</p></div></div>
            <div className="mt-4 h-[260px]">
              {metrics.good + metrics.scrap === 0 ? <div className="flex h-full items-center justify-center font-bold text-slate-400">Sem produção apontada.</div> :
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={72} outerRadius={105} paddingAngle={3}>{donut.map((x, i) => <Cell key={x.name} fill={i === 0 ? '#0284c7' : '#e11d48'}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[2px] bg-sky-50 p-3"><p className="text-xs font-black text-sky-700">BOA</p><strong className="text-[15px] font-black">{metrics.good.toLocaleString('pt-BR')}</strong></div>
              <div className="rounded-[2px] bg-rose-50 p-3"><p className="text-xs font-black text-rose-700">REFUGO</p><strong className="text-[15px] font-black">{metrics.scrap.toLocaleString('pt-BR')}</strong></div>
            </div>
          </article>
        </section>

        <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><BarChart3 className="text-sky-700"/><div><h2 className="font-black">Tempo e perdas</h2><p className="text-xs font-semibold text-slate-500">Baseado nos apontamentos do período.</p></div></div>
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{nome:'Planejado',min:metrics.planned},{nome:'Paradas',min:metrics.downtime},{nome:'Operação',min:metrics.runtime}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="nome"/><YAxis/><Tooltip formatter={(v: number) => [`${v.toFixed(0)} min`, 'Tempo']}/><Bar dataKey="min" fill="#0f172a" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div>
        </section>
      </div>
    </main>
  )
}
