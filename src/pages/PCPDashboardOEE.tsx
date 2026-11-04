/**
 * @REVISAO: REV-LIMITE-DE-LISTAGEM-VISIVEL-20261104-01 — as três consultas do OEE tinham teto de 10.000 linhas e o excedente sumia em silêncio, inflando ou murchando os índices sem aviso. Agora cada consulta pede count:'exact' e a tela assume o truncamento numa faixa âmbar, em vez de apresentar número parcial como se fosse o período inteiro.
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-OEE-TABELA-REAL-20261104-01 — o OEE passou a ler erp_apontamentos_processo e erp_producao_paradas (tabelas reais); a janela do período é medida pelo relógio do servidor
 * @STATUS_APROVACAO: AGUARDANDO APROVACAO VISUAL DO PROPRIETARIO (correção do cronograma de 2026-11-03; sem chave real no PC, a conferência visual autenticada não foi feita)
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Clock3, Factory, Gauge, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { relogioDoServidor } from '../lib/serverClock'

type Apontamento = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  inicio_em: string
  fim_em: string | null
  quantidade_planejada: number
  quantidade_boa: number
  quantidade_refugada: number
  quantidade_reprocessada: number
}
type Parada = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  inicio: string
  fim: string | null
}
type Ordem = {
  id: string
  quantidade_planejada: number
  velocidade_nominal_hora: number
  tempo_estimado_horas: number
}

const pct = (value: number) => `${value.toFixed(1)}%`
const clamp = (value: number) => Math.max(0, Math.min(100, value))
const num = (value: unknown) => Math.max(0, Number(value) || 0)

// Sobreposição em minutos entre dois intervalos: a parada só desconta o tempo que cai dentro do apontamento.
const sobreposicaoMin = (aInicio: number, aFim: number, bInicio: number, bFim: number) =>
  Math.max(0, (Math.min(aFim, bFim) - Math.max(aInicio, bInicio)) / 60000)

export default function PCPDashboardOEE() {
  const [period, setPeriod] = useState('30')
  const [rows, setRows] = useState<Apontamento[]>([])
  const [paradas, setParadas] = useState<Parada[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [agoraServidor, setAgoraServidor] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    setAviso('')
    // A janela do período é medida pelo relógio do Postgres, não pelo do tablet/navegador.
    const relogio = await relogioDoServidor()
    if (!relogio.agora) {
      setRows([]); setParadas([]); setOrdens([]); setAgoraServidor('')
      setError(relogio.aviso || 'O relógio do servidor está indisponível; o período do OEE não pôde ser determinado.')
      setLoading(false)
      return
    }
    const agora = relogio.agora
    const since = new Date(agora.getTime() - Number(period) * 86400000).toISOString()
    const [a, p, o] = await Promise.all([
      supabase
        .from('erp_apontamentos_processo')
        .select('id,ordem_producao_id,maquina_id,inicio_em,fim_em,quantidade_planejada,quantidade_boa,quantidade_refugada,quantidade_reprocessada', { count: 'exact' })
        .gte('inicio_em', since)
        .limit(10000),
      supabase
        .from('erp_producao_paradas')
        .select('id,ordem_producao_id,maquina_id,inicio,fim', { count: 'exact' })
        .gte('inicio', since)
        .limit(10000),
      supabase.from('erp_ordens_producao').select('id,quantidade_planejada,velocidade_nominal_hora,tempo_estimado_horas', { count: 'exact' }).limit(10000),
    ])
    if (a.error || p.error || o.error) {
      setError(a.error?.message ?? p.error?.message ?? o.error?.message ?? 'Falha ao carregar o OEE.')
      setRows([])
      setParadas([])
      setOrdens([])
      setAgoraServidor('')
      setAviso('')
    } else {
      const apontamentos = (a.data ?? []) as Apontamento[]
      const paradasLidas = (p.data ?? []) as Parada[]
      const ordensLidas = (o.data ?? []) as Ordem[]
      setRows(apontamentos)
      setParadas(paradasLidas)
      setOrdens(ordensLidas)
      setAgoraServidor(agora.toISOString())
      const excedentes: string[] = []
      if (typeof a.count === 'number' && a.count > apontamentos.length) excedentes.push(`${apontamentos.length} de ${a.count} apontamentos`)
      if (typeof p.count === 'number' && p.count > paradasLidas.length) excedentes.push(`${paradasLidas.length} de ${p.count} paradas`)
      if (typeof o.count === 'number' && o.count > ordensLidas.length) excedentes.push(`${ordensLidas.length} de ${o.count} ordens de produção`)
      setAviso(excedentes.length
        ? `Lista truncada: o cálculo usou ${excedentes.join(', ')} (limite de 10.000 linhas por consulta). Os índices abaixo representam apenas o trecho carregado — reduza o período ou peça a agregação no banco.`
        : '')
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [period])

  const calc = useMemo(() => {
    const byOrder = new Map(ordens.map((x) => [x.id, x]))
    const porOrdem = new Map<string, Parada[]>()
    const porMaquina = new Map<string, Parada[]>()
    for (const parada of paradas) {
      if (parada.ordem_producao_id) porOrdem.set(parada.ordem_producao_id, [...(porOrdem.get(parada.ordem_producao_id) ?? []), parada])
      if (parada.maquina_id) porMaquina.set(parada.maquina_id, [...(porMaquina.get(parada.maquina_id) ?? []), parada])
    }
    const limiteFim = agoraServidor ? new Date(agoraServidor).getTime() : Date.now()

    const itens = rows.map((row) => {
      const op = row.ordem_producao_id ? byOrder.get(row.ordem_producao_id) : undefined
      const inicio = new Date(row.inicio_em).getTime()
      const fim = row.fim_em ? Math.min(new Date(row.fim_em).getTime(), limiteFim) : limiteFim
      const duracao = Math.max(0, (fim - inicio) / 60000)
      const planejado = op && num(op.tempo_estimado_horas) > 0 ? num(op.tempo_estimado_horas) * 60 : duracao
      const lista = (row.ordem_producao_id && porOrdem.get(row.ordem_producao_id)) || (row.maquina_id && porMaquina.get(row.maquina_id)) || []
      const parada = Math.min(planejado, lista.reduce((s, x) => s + sobreposicaoMin(inicio, fim, new Date(x.inicio).getTime(), x.fim ? new Date(x.fim).getTime() : limiteFim), 0))
      const efetivo = Math.max(0, planejado - parada)
      const good = num(row.quantidade_boa)
      const scrap = num(row.quantidade_refugada)
      return {
        dia: row.inicio_em.slice(0, 10),
        planejado,
        parada,
        efetivo,
        good,
        scrap,
        rework: num(row.quantidade_reprocessada),
        ideal: (efetivo / 60) * (op ? num(op.velocidade_nominal_hora) : 0),
      }
    })

    const soma = itens.reduce((acc, x) => ({
      planejado: acc.planejado + x.planejado,
      parada: acc.parada + x.parada,
      efetivo: acc.efetivo + x.efetivo,
      good: acc.good + x.good,
      scrap: acc.scrap + x.scrap,
      rework: acc.rework + x.rework,
      ideal: acc.ideal + x.ideal,
    }), { planejado: 0, parada: 0, efetivo: 0, good: 0, scrap: 0, rework: 0, ideal: 0 })

    const indices = (x: { planejado: number; parada: number; efetivo: number; good: number; scrap: number; ideal: number }) => {
      const availability = x.planejado > 0 ? clamp(((x.planejado - x.parada) / x.planejado) * 100) : 0
      const performance = x.ideal > 0 ? clamp((x.good / x.ideal) * 100) : 0
      const quality = x.good + x.scrap > 0 ? clamp((x.good / (x.good + x.scrap)) * 100) : 0
      return { availability, performance, quality, oee: (availability * performance * quality) / 10000 }
    }

    const porDia = new Map<string, typeof soma>()
    for (const item of itens) {
      const atual = porDia.get(item.dia) ?? { planejado: 0, parada: 0, efetivo: 0, good: 0, scrap: 0, rework: 0, ideal: 0 }
      atual.planejado += item.planejado
      atual.parada += item.parada
      atual.efetivo += item.efetivo
      atual.good += item.good
      atual.scrap += item.scrap
      atual.rework += item.rework
      atual.ideal += item.ideal
      porDia.set(item.dia, atual)
    }

    const dias = [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, x]) => ({
        dia: dia.slice(5).replace('-', '/'),
        disponibilidade: indices(x).availability,
        performance: indices(x).performance,
        qualidade: indices(x).quality,
        oee: indices(x).oee,
      }))

    return { ...indices(soma), planned: soma.planejado, downtime: soma.parada, runtime: soma.efetivo, good: soma.good, scrap: soma.scrap, rework: soma.rework, apontamentos: itens.length, dias }
  }, [rows, paradas, ordens, agoraServidor])

  const metrics = calc
  const trend = calc.dias

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
            <p className="text-sm font-medium text-slate-600">Disponibilidade × Performance × Qualidade sobre os apontamentos de processo e as paradas de máquina do período, medidos pelo relógio do servidor.</p>
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
        {aviso && <div className="rounded-[2px] border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">{aviso}</div>}
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
