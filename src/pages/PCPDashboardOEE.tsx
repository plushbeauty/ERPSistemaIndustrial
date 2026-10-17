import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Clock3, Factory, Gauge, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Apontamento = {
  id: string
  ordem_producao_id: string
  maquina_id: string | null
  quantidade_boa: number
  quantidade_refugada: number
  inicio_em: string
  fim_em: string | null
}
type Ordem = {
  id: string
  velocidade_nominal_hora: number | null
}
type Programacao = { maquina_id: string; ordem_producao_id: string; data_hora_inicio: string; data_hora_fim: string }
type Parada = { maquina_id: string; ordem_producao_id: string | null; inicio: string; fim: string | null }
type Dia = { dia: string; disponibilidade: number | null; performance: number | null; qualidade: number | null; oee: number | null }
type Metrics = { availability: number | null; performance: number | null; quality: number | null; oee: number | null; planned: number; downtime: number; runtime: number; good: number; scrap: number }

const pct = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`
const clamp = (value: number) => Math.max(0, Math.min(100, value))

function overlapMinutes(start: number, end: number, intervals: { start: number; end: number }[]) {
  const clipped = intervals.map(interval => ({ start: Math.max(start, interval.start), end: Math.min(end, interval.end) }))
    .filter(interval => interval.end > interval.start)
    .sort((a, b) => a.start - b.start)
  let total = 0
  let current: { start: number; end: number } | null = null
  for (const interval of clipped) {
    if (!current) current = interval
    else if (interval.start <= current.end) current.end = Math.max(current.end, interval.end)
    else { total += current.end - current.start; current = interval }
  }
  if (current) total += current.end - current.start
  return total / 60000
}

function calculateMetrics(rows: Apontamento[], orders: Ordem[], programs: Programacao[], stops: Parada[], start: number, end: number): Metrics {
  const orderMap = new Map(orders.map(order => [order.id, order]))
  const stopIntervals = stops.map(stop => ({ machineId: stop.maquina_id, orderId: stop.ordem_producao_id, start: new Date(stop.inicio).getTime(), end: stop.fim ? new Date(stop.fim).getTime() : end }))
  const relevantStops = (machineId: string, orderId: string) => stopIntervals.filter(stop => stop.machineId === machineId && (!stop.orderId || stop.orderId === orderId)).map(stop => ({ start: stop.start, end: stop.end }))
  let planned = 0
  let downtime = 0
  let runtime = 0
  let good = 0
  let scrap = 0
  let idealPieces = 0

  for (const program of programs) {
    const programStart = Math.max(start, new Date(program.data_hora_inicio).getTime())
    const programEnd = Math.min(end, new Date(program.data_hora_fim).getTime())
    if (programEnd <= programStart) continue
    const duration = (programEnd - programStart) / 60000
    planned += duration
    downtime += overlapMinutes(programStart, programEnd, relevantStops(program.maquina_id, program.ordem_producao_id))
  }

  for (const row of rows) {
    const rowStart = Math.max(start, new Date(row.inicio_em).getTime())
    const rowEnd = Math.min(end, row.fim_em ? new Date(row.fim_em).getTime() : end)
    if (rowEnd <= rowStart) continue
    const duration = (rowEnd - rowStart) / 60000
    const stopped = row.maquina_id ? overlapMinutes(rowStart, rowEnd, relevantStops(row.maquina_id, row.ordem_producao_id)) : 0
    const operating = Math.max(0, duration - stopped)
    runtime += operating
    good += Math.max(0, Number(row.quantidade_boa) || 0)
    scrap += Math.max(0, Number(row.quantidade_refugada) || 0)
    const rate = Math.max(0, Number(orderMap.get(row.ordem_producao_id)?.velocidade_nominal_hora) || 0)
    idealPieces += operating / 60 * rate
  }

  const availability = planned > 0 ? clamp(runtime / planned * 100) : null
  const performance = idealPieces > 0 ? clamp(good / idealPieces * 100) : null
  const quality = good + scrap > 0 ? clamp(good / (good + scrap) * 100) : null
  const oee = availability !== null && performance !== null && quality !== null ? availability * performance * quality / 10000 : null
  return { availability, performance, quality, oee, planned, downtime, runtime, good, scrap }
}

export default function PCPDashboardOEE() {
  const [period, setPeriod] = useState('30')
  const [rows, setRows] = useState<Apontamento[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [programs, setPrograms] = useState<Programacao[]>([])
  const [stops, setStops] = useState<Parada[]>([])
  const [periodBounds, setPeriodBounds] = useState({ start: Date.now() - 30 * 86400000, end: Date.now() })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || typeof tenant.data !== 'string' || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const end = new Date()
      const start = new Date(end.getTime() - Number(period) * 86400000)
      const since = start.toISOString()
      const now = end.toISOString()
      const company = tenant.data
      const [started, crossing, active, orders, scheduled, closedStops, activeStops] = await Promise.all([
        fetchAllPages<Apontamento>((from,to)=>supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_boa,quantidade_refugada,inicio_em,fim_em',{count:'exact'}).eq('empresa_id',company).gte('inicio_em',since).lte('inicio_em',now).order('inicio_em').range(from,to)),
        fetchAllPages<Apontamento>((from,to)=>supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_boa,quantidade_refugada,inicio_em,fim_em',{count:'exact'}).eq('empresa_id',company).lt('inicio_em',since).gte('fim_em',since).order('inicio_em').range(from,to)),
        fetchAllPages<Apontamento>((from,to)=>supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_boa,quantidade_refugada,inicio_em,fim_em',{count:'exact'}).eq('empresa_id',company).is('fim_em',null).lte('inicio_em',now).order('inicio_em').range(from,to)),
        fetchAllPages<Ordem>((from,to)=>supabase.from('erp_ordens_producao').select('id,velocidade_nominal_hora',{count:'exact'}).eq('empresa_id',company).order('id').range(from,to)),
        fetchAllPages<Programacao>((from,to)=>supabase.from('pcp_agenda_maquinas').select('maquina_id,ordem_producao_id,data_hora_inicio,data_hora_fim',{count:'exact'}).eq('empresa_id',company).neq('status','cancelada').gte('data_hora_fim',since).lte('data_hora_inicio',now).order('data_hora_inicio').range(from,to)),
        fetchAllPages<Parada>((from,to)=>supabase.from('erp_producao_paradas').select('maquina_id,ordem_producao_id,inicio,fim',{count:'exact'}).eq('empresa_id',company).not('fim','is',null).gte('fim',since).lte('inicio',now).order('inicio').range(from,to)),
        fetchAllPages<Parada>((from,to)=>supabase.from('erp_producao_paradas').select('maquina_id,ordem_producao_id,inicio,fim',{count:'exact'}).eq('empresa_id',company).is('fim',null).lte('inicio',now).order('inicio').range(from,to)),
      ])
      const uniqueRows = new Map([...started,...crossing,...active].map(row=>[row.id,row]))
      setRows([...uniqueRows.values()])
      setOrdens(orders)
      setPrograms(scheduled)
      setStops([...closedStops,...activeStops])
      setPeriodBounds({start:start.getTime(),end:end.getTime()})
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o OEE.')
      setRows([])
      setOrdens([])
      setPrograms([])
      setStops([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [period])

  const metrics = useMemo(() => {
    return calculateMetrics(rows, ordens, programs, stops, periodBounds.start, periodBounds.end)
  }, [rows, ordens, programs, stops, periodBounds])

  const trend = useMemo<Dia[]>(() => {
    const keys = new Set([...rows.map(row=>row.inicio_em.slice(0,10)),...programs.map(program=>program.data_hora_inicio.slice(0,10))])
    return [...keys].sort().map(key=>{
      const dayStart=Math.max(periodBounds.start,new Date(`${key}T00:00:00`).getTime())
      const dayEnd=Math.min(periodBounds.end,new Date(`${key}T00:00:00`).getTime()+86400000)
      const dayRows=rows.filter(row=>row.inicio_em.slice(0,10)===key)
      const dayPrograms=programs.filter(program=>program.data_hora_inicio.slice(0,10)===key)
      const value=calculateMetrics(dayRows,ordens,dayPrograms,stops,dayStart,dayEnd)
      return {dia:key.slice(5).replace('-','/'),disponibilidade:value.availability,performance:value.performance,qualidade:value.quality,oee:value.oee}
    })
  }, [rows, ordens, programs, stops, periodBounds])

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
            <p className="text-sm font-medium text-slate-600">Calculado a partir da agenda de produção, apontamentos reais, velocidades nominais e paradas registradas.</p>
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
            { label: 'OEE GLOBAL', value: pct(metrics.oee), icon: Gauge, note: metrics.oee === null ? 'Sem base completa para o período' : 'Disponibilidade × performance × qualidade' },
            { label: 'DISPONIBILIDADE', value: pct(metrics.availability), icon: Clock3, note: metrics.availability === null ? 'Sem programação no período' : 'Tempo apontado em produção versus agenda' },
            { label: 'PERFORMANCE', value: pct(metrics.performance), icon: TrendingUp, note: metrics.performance === null ? 'Sem ciclo nominal ou produção no período' : 'Produção versus capacidade nominal' },
            { label: 'QUALIDADE', value: pct(metrics.quality), icon: ShieldCheck, note: metrics.quality === null ? 'Sem quantidades registradas no período' : 'Boa versus boa + refugo' },
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
