/**
 * SYSNQRA ERP INDUSTRIAL — Central de Monitoramento e Inteligência Preditiva.
 * @REVISAO 28/10/2026
 * Consome eventos MES/IoT reais sob RLS. Não inventa métricas nem simula predições.
 * O modelo Python só será considerado ativo quando seus resultados forem gravados no payload
 * do evento por um serviço de inferência validado.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, Clock3, RefreshCw, RadioTower, ShieldCheck, Thermometer, Gauge } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabaseClient'

type JsonObject = Record<string, unknown>
type IoTEvent = {
  id: string
  maquina_id: string
  estado: 'RODANDO' | 'PARADA' | 'ALARME'
  contador_ciclos: number
  pecas_boas: number
  pecas_refugo: number
  emitido_em: string
  recebido_em: string
  payload: JsonObject | null
}
type Machine = { id: string; codigo?: string | null; nome?: string | null }
const label = 'text-[9px] font-bold uppercase tracking-wide text-slate-500'
const panel = 'min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm'
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}
const pick = (obj: JsonObject | null, keys: string[]): number | null => {
  if (!obj) return null
  for (const key of keys) {
    const n = num(obj[key])
    if (n !== null) return n
  }
  return null
}
const probability = (e: IoTEvent): number | null => {
  const p = pick(e.payload, ['probabilidade_refugo', 'probabilidade_defeito', 'risk_probability', 'scrap_probability', 'prediction_probability'])
  if (p === null) return null
  return p > 1 && p <= 100 ? p / 100 : p >= 0 && p <= 1 ? p : null
}
const machineLabel = (id: string, machines: Machine[]) => {
  const m = machines.find(x => x.id === id)
  return m ? [m.codigo, m.nome].filter(Boolean).join(' · ') || id.slice(0, 8) : id.slice(0, 8)
}
export default function CentralMonitoramentoIA() {
  const [events, setEvents] = useState<IoTEvent[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [threshold, setThreshold] = useState(0.5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const tenant = await supabase.rpc('erp_current_empresa_id')
    if (tenant.error || !tenant.data) {
      setEvents([])
      setMachines([])
      setEmpresaId('')
      setError('Não foi possível identificar a empresa da sessão autenticada.')
      setLoading(false)
      return
    }
    const company = String(tenant.data)
    setEmpresaId(company)
    const [eventResult, machineResult] = await Promise.all([
      supabase.from('erp_iot_eventos')
        .select('id,maquina_id,estado,contador_ciclos,pecas_boas,pecas_refugo,emitido_em,recebido_em,payload')
        .eq('empresa_id', company)
        .order('emitido_em', { ascending: false })
        .limit(100),
      supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', company).limit(1000),
    ])
    if (eventResult.error) {
      setEvents([])
      setError(eventResult.error.message.includes('erp_iot_eventos') || eventResult.error.code === '42P01'
        ? 'A coleta MES/IoT ainda não está disponível no banco conectado. Verifique a migration de telemetria.'
        : `Falha ao carregar telemetria: ${eventResult.error.message}`)
    } else {
      setEvents((eventResult.data ?? []) as IoTEvent[])
      setLastRefresh(new Date().toISOString())
    }
    if (machineResult.error) setMachines([])
    else setMachines((machineResult.data ?? []) as Machine[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!empresaId) return
    const channel = supabase.channel(`pcp-ia-iot-${empresaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_iot_eventos', filter: `empresa_id=eq.${empresaId}` }, () => { void load() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [empresaId, load])

  const latest = events[0]
  const latestByMachine = new Map<string, IoTEvent>()
  for (const event of events) if (!latestByMachine.has(event.maquina_id)) latestByMachine.set(event.maquina_id, event)
  const liveCount = [...latestByMachine.values()].filter(e => e.estado === 'RODANDO').length
  const machineCount = latestByMachine.size
  const scrapTotal = [...latestByMachine.values()].reduce((sum, e) => sum + (Number(e.pecas_refugo) || 0), 0)
  const predicted = useMemo(() => events.map(e => ({ event: e, p: probability(e) })).filter((x): x is { event: IoTEvent; p: number } => x.p !== null), [events])
  const riskEvents = predicted.filter(x => x.p >= threshold)
  const chartData = useMemo(() => [...events].slice(0, 20).reverse().map(e => ({
    ciclo: new Date(e.emitido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    pressao: pick(e.payload, ['injection_pressure_1', 'pressao_injecao', 'pressao_hidraulica', 'pressure_bar']),
    temperatura: pick(e.payload, ['barrel_temperature_1', 'temperatura_borracha', 'temperatura_zona_1', 'temperature_c']),
  })).filter(p => p.pressao !== null || p.temperatura !== null), [events])
  const latestAge = latest ? Math.max(0, Math.round((Date.now() - new Date(latest.recebido_em || latest.emitido_em).getTime()) / 60000)) : null

  return <main className="min-w-0 space-y-2 bg-[#F4FBFD] p-2 text-slate-800 sm:p-3">
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-[#123B50] px-3 py-2 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10"><BrainCircuit size={17}/></div>
        <div className="min-w-0"><h2 className="text-sm font-extrabold">MONITORAMENTO DE PROCESSO E IA</h2><p className="text-[10px] text-slate-300">PCP / SGQ · telemetria MES/IoT por empresa · revisão 28/10/2026</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-2 text-[10px] font-bold text-amber-200"><BrainCircuit size={13}/> Motor Python: não conectado</span>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-white/25 px-2.5 text-[10px] font-bold hover:bg-white/10 disabled:opacity-50"><RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Atualizar</button>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <div className={panel}><div className="flex items-center justify-between"><span className={label}>Eventos recebidos</span><RadioTower size={15} className="text-[#2D8DB8]"/></div><p className="mt-1 text-xl font-extrabold tabular-nums">{events.length}</p><p className="text-[10px] text-slate-500">Últimos 100 eventos reais</p></div>
      <div className={panel}><div className="flex items-center justify-between"><span className={label}>Máquinas com telemetria</span><Activity size={15} className="text-[#2D8DB8]"/></div><p className="mt-1 text-xl font-extrabold tabular-nums">{machineCount}</p><p className="text-[10px] text-slate-500">{liveCount} máquina(s) em estado RODANDO</p></div>
      <div className={panel}><div className="flex items-center justify-between"><span className={label}>Refugo · contadores atuais</span><AlertTriangle size={15} className="text-orange-600"/></div><p className="mt-1 text-xl font-extrabold tabular-nums">{scrapTotal.toLocaleString('pt-BR')}</p><p className="text-[10px] text-slate-500">Último contador conhecido de cada máquina</p></div>
      <div className={panel}><div className="flex items-center justify-between"><span className={label}>Último evento</span><Clock3 size={15} className="text-[#2D8DB8]"/></div><p className="mt-1 text-xl font-extrabold tabular-nums">{latestAge === null ? '—' : latestAge < 1 ? 'Agora' : `${latestAge} min`}</p><p className="text-[10px] text-slate-500">{latest ? new Date(latest.emitido_em).toLocaleString('pt-BR') : 'Nenhum evento recebido'}</p></div>
    </section>

    <section className="grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <div className={panel}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-extrabold text-[#123B50]">SINAIS DO CLP / SENSORES</h3><p className="text-[10px] text-slate-500">Somente valores numéricos presentes no payload real dos eventos.</p></div><span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500"><ShieldCheck size={12}/> RLS + sessão autenticada</span></div>
        {chartData.length ? <div className="h-64 w-full rounded-lg bg-gradient-to-b from-slate-50/80 to-white p-1 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 2 }}>
              <defs>
                <linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity={0.28}/>
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0.015}/>
                </linearGradient>
                <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D8DB8" stopOpacity={0.24}/>
                  <stop offset="95%" stopColor="#2D8DB8" stopOpacity={0.015}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 5"/>
              <XAxis dataKey="ciclo" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} minTickGap={18} />
              {chartData.some(x => x.pressao !== null) && <YAxis yAxisId="pressure" tick={{ fontSize: 10, fill: '#B45309' }} tickLine={false} axisLine={false} width={42} />}
              {chartData.some(x => x.temperatura !== null) && <YAxis yAxisId="temperature" orientation="right" tick={{ fontSize: 10, fill: '#2D8DB8' }} tickLine={false} axisLine={false} width={42} />}
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }}
                labelStyle={{ color: '#123B50', fontWeight: 800, marginBottom: 4 }}
                formatter={(value: number | string, name: string) => [typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : value, name]}
              />
              {chartData.some(x => x.pressao !== null) && <Area yAxisId="pressure" type="monotone" dataKey="pressao" name="Pressão (unidade do payload)" stroke="#D97706" strokeWidth={2.5} fill="url(#pressureFill)" activeDot={{ r: 4, strokeWidth: 0 }} dot={false} connectNulls={false} />}
              {chartData.some(x => x.temperatura !== null) && <Area yAxisId="temperature" type="monotone" dataKey="temperatura" name="Temperatura (unidade do payload)" stroke="#2D8DB8" strokeWidth={2.5} fill="url(#temperatureFill)" activeDot={{ r: 4, strokeWidth: 0 }} dot={false} connectNulls={false} />}
            </AreaChart>
          </ResponsiveContainer>
        </div></div> : <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center"><div><Thermometer size={22} className="mx-auto mb-2 text-slate-400"/><p className="text-xs font-bold text-slate-600">Sem sinais térmicos ou de pressão no payload</p><p className="mt-1 max-w-md text-[10px] text-slate-500">A coleta atual já registra ciclos, peças boas e refugo. Para desenhar as curvas, o CLP precisa enviar os nomes de sensores usados pelo equipamento.</p></div></div>}
      </div>
      <div className={panel}>
        <div className="mb-2 flex items-center gap-2"><Gauge size={15} className="text-orange-600"/><h3 className="text-xs font-extrabold text-[#123B50]">LIMIAR DE ALERTA PREDITIVO</h3></div>
        <div className="flex items-center justify-between gap-3"><label htmlFor="ia-threshold" className={label}>Probabilidade mínima de risco</label><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-extrabold">{Math.round(threshold * 100)}%</span></div>
        <input id="ia-threshold" aria-label="Limiar de probabilidade de refugo" className="mt-3 w-full accent-orange-600" type="range" min="0.1" max="0.99" step="0.01" value={threshold} onChange={e => setThreshold(Number(e.target.value))}/>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <div className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange-600"/><div><p className="text-xs font-extrabold text-amber-900">{predicted.length ? `${riskEvents.length} evento(s) acima do limiar` : 'Nenhuma predição do modelo disponível'}</p><p className="mt-1 text-[10px] leading-relaxed text-amber-800">{predicted.length ? 'Os alertas abaixo são provenientes de probabilidades registradas no payload pelo serviço de inferência.' : 'O sistema não calcula risco por conta própria. Conecte e valide o serviço Python antes de ativar alertas preditivos.'}</p></div></div>
        </div>
        {riskEvents.length > 0 && <ul className="mt-2 max-h-40 space-y-1 overflow-auto">{riskEvents.slice(0, 8).map(({ event, p }) => <li key={event.id} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] text-orange-900"><b>{machineLabel(event.maquina_id, machines)}</b> · risco {(p * 100).toFixed(1)}% · {new Date(event.emitido_em).toLocaleString('pt-BR')}</li>)}</ul>}
        <p className="mt-3 text-[9px] leading-relaxed text-slate-500">Alerta informativo para avaliação humana. Não envia comandos ao CLP nem interrompe máquinas.</p>
      </div>
    </section>

    <section className={panel}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-extrabold text-[#123B50]">ÚLTIMOS EVENTOS INDUSTRIAIS</h3><p className="text-[10px] text-slate-500">Origem: erp_iot_eventos · ordenados pelo horário informado pelo dispositivo.</p></div><span className="text-[9px] text-slate-500">{lastRefresh ? `Consulta: ${new Date(lastRefresh).toLocaleTimeString('pt-BR')}` : 'Aguardando consulta'}</span></div>
      {error && <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>}
      {loading && <p className="py-4 text-center text-xs text-slate-500">Carregando telemetria…</p>}
      {!loading && !error && events.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center"><CheckCircle2 size={20} className="mx-auto mb-2 text-slate-400"/><p className="text-xs font-bold text-slate-600">Nenhum evento de telemetria recebido</p><p className="mt-1 text-[10px] text-slate-500">Quando um dispositivo autorizado enviar dados pela função erp-mes-ingest, eles aparecerão aqui.</p></div>}
      {!loading && events.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-[10px]"><thead><tr className="border-b border-slate-200 text-[9px] uppercase tracking-wide text-slate-500"><th className="px-2 py-2">Data/hora</th><th className="px-2 py-2">Máquina</th><th className="px-2 py-2">Estado</th><th className="px-2 py-2 text-right">Ciclos</th><th className="px-2 py-2 text-right">Boas</th><th className="px-2 py-2 text-right">Refugo</th><th className="px-2 py-2 text-right">Risco IA</th></tr></thead><tbody>{events.map(e => { const p = probability(e); return <tr key={e.id} className={`border-b border-slate-100 ${p !== null && p >= threshold ? 'bg-orange-50/80' : ''}`}><td className="whitespace-nowrap px-2 py-2">{new Date(e.emitido_em).toLocaleString('pt-BR')}</td><td className="px-2 py-2 font-semibold">{machineLabel(e.maquina_id, machines)}</td><td className="px-2 py-2"><span className={`rounded px-1.5 py-1 font-bold ${e.estado === 'ALARME' ? 'bg-red-50 text-red-700' : e.estado === 'RODANDO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{e.estado}</span></td><td className="px-2 py-2 text-right tabular-nums">{Number(e.contador_ciclos).toLocaleString('pt-BR')}</td><td className="px-2 py-2 text-right tabular-nums">{Number(e.pecas_boas).toLocaleString('pt-BR')}</td><td className="px-2 py-2 text-right tabular-nums">{Number(e.pecas_refugo).toLocaleString('pt-BR')}</td><td className="px-2 py-2 text-right tabular-nums">{p === null ? '—' : `${(p * 100).toFixed(1)}%`}</td></tr> })}</tbody></table></div>}
    </section>
    <p className="px-1 text-[9px] text-slate-500">Empresa vinculada: {empresaId ? empresaId.slice(0, 8) + '…' : '—'} · Não há métricas de treinamento exibidas enquanto o relatório real do modelo não estiver conectado.</p>
  </main>
}
