import { useEffect, useMemo, useState } from 'react'
import {
  Activity, CheckCircle, AlertTriangle, BarChart3
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabaseClient'

type Props = { onNavigate: (route: string) => void }
type Machine = { id: string; codigo: string; nome: string; status: string }
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null; criado_em?: string | null }
type Product = { id: string; codigo: string | null; nome: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; created_at: string | null; criado_em?: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type Stop = { maquina_id: string | null; inicio: string | null; fim: string | null; status: string | null }
type QueueRow = { op: string; workstation: string; product: string; lastPointing: string; status: string }
type Daily = { day: string; previsto: number; realizado: number }
type MachineShift = { maquina: string; eficiencia: number }
type Equipment = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null; certificado_validade: string | null }

const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0
const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v))
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const valueDateKey = (value: string | null | undefined) => {
  if (!value) return ''
  if (value.length <= 10) return value.slice(0, 10)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : dateKey(parsed)
}

function statusText(value: string) {
  const s = value.toLowerCase()
  if (s.includes('concl')) return 'Concluída'
  if (s.includes('cancel')) return 'Cancelada'
  if (s.includes('paus')) return 'Pausada'
  if (s.includes('exec') || s.includes('produ')) return 'Em produção'
  if (s.includes('liber')) return 'Liberada'
  if (s.includes('planej')) return 'Planejada'
  return value || 'Sem status'
}

export default function DashboardPrincipal({ onNavigate }: Props) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pointings, setPointings] = useState<Pointing[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [rpnc, setRpnc] = useState(0)
  const [rpncClosed, setRpncClosed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Sessão não encontrada.')

        const { data: p, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('nome,empresa_id,nivel_admin,is_master,perfil,auth_user_id')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        if (!p) throw new Error('Perfil ERP não encontrado.')

        const master = p.is_master === true &&
          Number(p.nivel_admin ?? 0) === 100 &&
          String(p.perfil ?? '').toUpperCase() === 'MASTER' &&
          p.empresa_id === null
        if (!master && !p.empresa_id) throw new Error('Empresa do usuário não identificada.')

        const empresaId = p.empresa_id as string | null
        const machineQ = supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('ativo', true).order('codigo')
        const opQ = supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,quantidade_planejada,quantidade,created_at,criado_em').order('created_at', { ascending: false }).limit(500)
        const prodQ = supabase.from('erp_produtos').select('id,codigo,nome').limit(3000)
        const pointingQ = supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,created_at').order('created_at', { ascending: false }).limit(5000)
        const programQ = supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status').neq('status', 'cancelada').limit(3000)
        const stopQ = supabase.from('erp_producao_paradas').select('maquina_id,inicio,fim,status').limit(5000)
        const rpncQ = supabase.from('erp_rpnc').select('id,status').limit(5000)
        const equipmentQ = supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao,certificado_validade').limit(3000)

        if (!master && empresaId) {
          machineQ.eq('empresa_id', empresaId)
          opQ.eq('empresa_id', empresaId)
          prodQ.eq('empresa_id', empresaId)
          pointingQ.eq('empresa_id', empresaId)
          programQ.eq('empresa_id', empresaId)
          stopQ.eq('empresa_id', empresaId)
          rpncQ.eq('empresa_id', empresaId)
          equipmentQ.eq('empresa_id', empresaId)
        }

        const [m, o, pr, pt, pg, st, rn, eq] = await Promise.all([machineQ, opQ, prodQ, pointingQ, programQ, stopQ, rpncQ, equipmentQ])
        for (const result of [m, o, pr, pt, pg, st, rn, eq]) if (result.error) throw result.error

        if (!alive) return
        setMachines((m.data ?? []) as Machine[])
        setOps((o.data ?? []) as OP[])
        setProducts((pr.data ?? []) as Product[])
        setPointings((pt.data ?? []) as Pointing[])
        setPrograms((pg.data ?? []) as Program[])
        setStops((st.data ?? []) as Stop[])
        const closedRncStates = new Set(['encerrada', 'fechada', 'concluida', 'concluido', 'fechado', 'cancelada', 'cancelado'])
        const rncRows = (rn.data ?? []) as Array<{ status?: unknown }>
        const closedRncCount = rncRows.filter(row => closedRncStates.has(String(row.status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).length
        setRpnc(Math.max(0, rncRows.length - closedRncCount))
        setRpncClosed(closedRncCount)
        setEquipment((eq.data ?? []) as Equipment[])
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Não foi possível carregar o dashboard.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const today = dateKey(clock)
  const activeOps = ops.filter(o => !['concluida', 'concluído', 'cancelada', 'cancelado'].includes(String(o.status).toLowerCase()))
  const todayPointings = pointings.filter(p => valueDateKey(p.criado_em ?? p.created_at) === today)
  const producedToday = todayPointings.reduce((s, p) => s + n(p.quantidade_boa) + n(p.quantidade_refugada), 0)
  const totalPlanned = pointings.reduce((s, p) => s + n(p.quantidade_planejada), 0)
  const totalGood = pointings.reduce((s, p) => s + n(p.quantidade_boa), 0)
  const totalBad = pointings.reduce((s, p) => s + n(p.quantidade_refugada), 0)
  const performance = totalPlanned > 0 ? Math.min(100, (totalGood / totalPlanned) * 100) : null
  const quality = totalGood + totalBad > 0 ? (totalGood / (totalGood + totalBad)) * 100 : null

  const plannedHours = programs.reduce((s, p) => s + Math.max(0, (new Date(p.fim_planejado).getTime() - new Date(p.inicio_planejado).getTime()) / 3600000), 0)
  const stopHours = stops.reduce((s, p) => {
    if (!p.inicio || !p.fim) return s
    return s + Math.max(0, (new Date(p.fim).getTime() - new Date(p.inicio).getTime()) / 3600000)
  }, 0)
  const availability = plannedHours > 0 ? Math.max(0, Math.min(100, ((plannedHours - Math.min(stopHours, plannedHours)) / plannedHours) * 100)) : null
  const oee = performance !== null && quality !== null && availability !== null
    ? (performance * quality * availability) / 10000
    : null

  const machineShift = useMemo<MachineShift[]>(() => machines.map(machine => {
    const rows = pointings.filter(p => p.maquina_id === machine.id)
    const plan = rows.reduce((s, p) => s + n(p.quantidade_planejada), 0)
    const good = rows.reduce((s, p) => s + n(p.quantidade_boa), 0)
    return { maquina: machine.codigo, eficiencia: plan > 0 ? Math.min(100, (good / plan) * 100) : 0 }
  }).filter(x => x.eficiencia > 0), [machines, pointings])

  const weekly = useMemo<Daily[]>(() => {
    const days: Daily[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(clock)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      const previsto = programs.filter(p => valueDateKey(p.inicio_planejado) === key).reduce((s, p) => s + n(p.quantidade_planejada), 0)
      const realizado = pointings.filter(p => valueDateKey(p.criado_em ?? p.created_at) === key).reduce((s, p) => s + n(p.quantidade_boa) + n(p.quantidade_refugada), 0)
      days.push({ day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), previsto, realizado })
    }
    return days
  }, [clock, programs, pointings])

  const overduePieces = useMemo(() => programs.reduce((sum, p) => {
    const due = new Date(p.fim_planejado).getTime()
    const produced = n(p.quantidade_produzida)
    const planned = n(p.quantidade_planejada)
    return due < clock.getTime() && produced < planned ? sum + Math.max(0, planned - produced) : sum
  }, 0), [programs, clock])

  const onTimePieces = useMemo(() => programs.reduce((sum, p) => {
    const due = new Date(p.fim_planejado).getTime()
    const produced = n(p.quantidade_produzida)
    const planned = n(p.quantidade_planejada)
    return due >= clock.getTime() && produced < planned ? sum + Math.max(0, planned - produced) : sum
  }, 0), [programs, clock])

  const equipmentValidity = useMemo(() => {
    const invalidStates = new Set(['vencido', 'bloqueado', 'inativo', 'reprovado', 'fora de uso'])
    let valid = 0
    let expired = 0
    let withoutValidity = 0
    for (const item of equipment) {
      const dates = [item.proxima_calibracao, item.certificado_validade].filter((date): date is string => Boolean(date))
      const status = String(item.status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (invalidStates.has(status) || dates.some(date => date.slice(0, 10) < today)) expired++
      else if (dates.length > 0 && dates.every(date => date.slice(0, 10) >= today)) valid++
      else withoutValidity++
    }
    return { valid, expired, withoutValidity }
  }, [equipment, today])
  const expiredEquipment = equipmentValidity.expired
  const validEquipment = equipmentValidity.valid

  const stopSummary = useMemo(() => {
    const grouped = new Map<string, number>()
    stops.forEach(s => {
      if (!s.inicio || !s.fim) return
      const day = valueDateKey(s.inicio)
      const hours = Math.max(0, (new Date(s.fim).getTime() - new Date(s.inicio).getTime()) / 3600000)
      grouped.set(day, (grouped.get(day) ?? 0) + hours)
    })
    return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0])).slice(-7).map(([day, horas]) => ({ day: new Date(day + 'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''), horas: Number(horas.toFixed(1)) }))
  }, [stops])

  const opStatus = useMemo(() => {
    const map = new Map<string, number>()
    ops.forEach(o => { const s = statusText(o.status); map.set(s, (map.get(s) ?? 0) + 1) })
    return Array.from(map.entries()).map(([status, quantidade]) => ({ status, quantidade }))
  }, [ops])

  const queue = useMemo<QueueRow[]>(() => {
    const productMap = new Map(products.map(p => [p.id, p]))
    const machineMap = new Map(machines.map(m => [m.id, m]))
    return activeOps.slice(0, 12).map(op => {
      const rows = pointings.filter(p => p.ordem_producao_id === op.id).sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      const last = rows[0]
      const machine = machineMap.get(op.maquina_id ?? '')
      const product = productMap.get(op.produto_id ?? '')
      return {
        op: `OP-${op.numero_op}`,
        workstation: machine ? `${machine.codigo} · ${machine.nome}` : 'Posto não definido',
        product: product ? `${product.codigo ?? ''} · ${product.nome ?? ''}`.replace(/^ · | · $/g, '') : 'Produto não informado',
        lastPointing: last?.created_at ? new Date(last.created_at).toLocaleString('pt-BR') : 'Sem apontamento',
        status: statusText(op.status)
      }
    })
  }, [activeOps, pointings, products, machines])

  const cards = [
    { label: 'OPs EM ANDAMENTO', value: fmt(activeOps.length), icon: Activity },
    { label: 'PRODUÇÃO DO DIA', value: fmt(producedToday), suffix: 'un', icon: CheckCircle },
    { label: 'RNC ABERTAS / FECHADAS', value: `${fmt(rpnc)} / ${fmt(rpncClosed)}`, icon: AlertTriangle },
    { label: 'EFICIÊNCIA (OEE)', value: oee === null ? '—' : `${oee.toFixed(1).replace('.', ',')}%`, icon: BarChart3 }
  ]

  const attentionCards = [
    { label: 'PEÇAS EM ATRASO', value: fmt(overduePieces), suffix: 'un', tone: 'danger', icon: AlertTriangle },
    { label: 'PEÇAS NO PRAZO', value: fmt(onTimePieces), suffix: 'un', tone: 'success', icon: CheckCircle },
    { label: 'EQUIPAMENTOS VÁLIDOS', value: fmt(validEquipment), suffix: 'un', tone: 'success', icon: CheckCircle },
    { label: 'EQUIPAMENTOS VENCIDOS / BLOQUEADOS', value: fmt(expiredEquipment), suffix: 'un', tone: 'danger', icon: AlertTriangle }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <style>{`
        .dp-shell{min-height:100%;background:#f8fafc}
        .dp-main{width:100%;max-width:1700px;margin:0 auto;padding:12px 16px 24px;min-width:0;box-sizing:border-box}
        .dp-context{padding:11px 0 13px;border-bottom:1px solid #dbe3ea}.dp-context>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.dp-context strong{color:#123B50;font-size:10px;font-weight:950;letter-spacing:.08em}.dp-context p{margin:0;color:#475569;font-size:10px;font-weight:950;letter-spacing:.12em}
        .dp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
        .dp-kpi{position:relative;display:flex;align-items:center;gap:10px;padding:9px 11px;min-height:66px;min-width:0;background:#123B50;border:1px solid #0B3042;border-radius:2px;box-shadow:0 1px 3px rgba(8,40,56,.12);overflow:hidden}
        .dp-kpi::after{content:none}
        .dp-kpi-icon{position:relative;z-index:1;display:grid;place-items:center;width:34px;height:34px;border-radius:2px;background:#2D8DB8;color:#fff!important;flex:none;border:1px solid rgba(255,255,255,.28);box-shadow:none;transform:none;text-shadow:none}
        .dp-kpi small,.dp-kpi strong,.dp-kpi em,.dp-kpi-label{color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.55)}.dp-kpi small{display:block!important;font-size:9px;font-weight:800;letter-spacing:.06em;line-height:1.25;overflow-wrap:anywhere}.dp-kpi strong{display:block!important;font-size:22px;font-weight:800;line-height:1.1;margin-top:4px;overflow-wrap:anywhere}.dp-kpi em{font-style:normal!important;font-size:12px;font-weight:900}
        .dp-kpi:nth-child(2){background:#0F6748;border-color:#0A4D38}.dp-kpi:nth-child(2) .dp-kpi-icon{background:#16805C}
        .dp-kpi:nth-child(3){background:#8A4308;border-color:#6E2F00}.dp-kpi:nth-child(3) .dp-kpi-icon{background:#B96A09}
        .dp-kpi:nth-child(4){background:#247E91;border-color:#145564}.dp-kpi:nth-child(4) .dp-kpi-icon{background:#2D8DB8}
        .dp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
        .dp-panel{min-width:0;background:#fff;border:1px solid #d7e5ea;border-radius:2px;overflow:hidden;box-shadow:0 1px 4px rgba(18,59,80,.06)}
        .dp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #edf4f6;background:#f8fcfd}.dp-head span{color:#2D8DB8;font-size:9px;font-weight:800;letter-spacing:.08em}.dp-head h2{margin:3px 0 0;color:#123B50;font-size:13px;font-weight:800}
        .dp-chart{height:230px;padding:8px 8px 6px;min-width:0}.dp-chart-compact{height:205px}.dp-empty{height:220px;display:grid;place-items:center;padding:20px;text-align:center;color:#64748b;font-size:12px;font-weight:700}.dp-empty-compact{height:220px}
        .dp-attention-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0}.dp-attention{position:relative;min-width:0;min-height:62px;padding:9px 10px;display:flex;align-items:center;gap:9px;border-radius:2px;overflow:hidden;box-shadow:0 1px 3px rgba(18,59,80,.10);border:1px solid}.dp-attention::after{content:none}.dp-attention-icon{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:2px;background:rgba(255,255,255,.14);color:#fff!important;border:1px solid rgba(255,255,255,.28);box-shadow:none;transform:none;text-shadow:none}.dp-attention small,.dp-attention strong,.dp-attention em{color:#fff!important;-webkit-text-fill-color:#fff!important}.dp-attention small{display:block!important;font-size:9px;font-weight:800;letter-spacing:.04em;line-height:1.25;overflow-wrap:anywhere}.dp-attention strong{display:inline-block!important;font-size:20px;font-weight:800;line-height:1.05;margin-top:5px}.dp-attention em{font-size:10px;font-weight:850;font-style:normal;margin-left:6px}.dp-attention-danger{background:linear-gradient(135deg,#B83A45,#74212A);border-color:#642029}.dp-attention-success{background:linear-gradient(135deg,#16805C,#0A4D38);border-color:#083F2E}.dp-attention-warning{background:linear-gradient(135deg,#B96A09,#7A4300);border-color:#613400}.dp-status-panel{margin-top:12px}

        .dp-kpi-icon svg,.dp-attention-icon svg{color:#fff!important;stroke:#fff!important;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}.dp-table-wrap{overflow:auto}.dp-table{width:100%;border-collapse:collapse;font-size:10px}.dp-table th{background:#f4fbfd;color:#475569;text-align:left;font-size:9px;font-weight:800;padding:7px 10px;border-bottom:1px solid #d7e5ea}.dp-table td{padding:8px 10px;border-bottom:1px solid #edf2f7;color:#334155;font-weight:600;white-space:nowrap}.dp-table tr:last-child td{border-bottom:0}.dp-status{display:inline-flex;padding:3px 6px;border-radius:2px;background:#ecfdf5;color:#065f46;font-size:9px;font-weight:800}.dp-error{margin:0 0 10px;padding:8px 10px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:2px;font-size:11px;font-weight:700}
                @media(max-width:1050px){.dp-kpis,.dp-attention-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dp-main{padding:10px 12px 20px}}
        @media(max-width:650px){.dp-kpis,.dp-attention-grid,.dp-grid{grid-template-columns:minmax(0,1fr)}.dp-main{padding:8px}.dp-head{padding:9px}.dp-chart-compact{height:195px}}
      `}</style>

      <main className="dp-main">
        {error && <div className="dp-error">{error}</div>}

        

        <section className="dp-kpis">
          {cards.map(({ label, value, suffix, icon: Icon }) => (
            <article key={label} className="dp-kpi">
              <span className="dp-kpi-icon"><Icon size={19}/></span>
              <div><small className="dp-kpi-label">{label}</small><strong>{loading ? '…' : value} {suffix && <em>{suffix}</em>}</strong></div>
            </article>
          ))}
        </section>

        <section className="dp-attention-grid">{attentionCards.map(card => { const Icon = card.icon; return <article key={card.label} className={`dp-attention dp-attention-${card.tone}`}><span className="dp-attention-icon"><Icon size={18}/></span><div><small>{card.label}</small><strong>{loading ? '…' : card.value}</strong><em>{card.suffix}</em></div></article> })}
        </section>

        <section className="dp-grid dp-chart-grid">
          <article className="dp-panel">
            <div className="dp-head"><span>PCP · MÁQUINAS</span><h2>Eficiência por máquina</h2></div>
            {machineShift.length ? <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineShift} barCategoryGap="26%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="maquina" axisLine={false} tickLine={false}/><YAxis domain={[0,100]} unit="%" axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="eficiencia" name="Eficiência" fill="#2D8DB8" radius={[7,7,2,2]} maxBarSize={36}/></BarChart></ResponsiveContainer></div> : <div className="dp-empty dp-empty-compact">Sem dados reais de eficiência.</div>}
          </article>
          <article className="dp-panel">
            <div className="dp-head"><span>PCP · ENTREGA</span><h2>Peças no prazo × em atraso</h2></div>
            <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{categoria:'No prazo',quantidade:onTimePieces},{categoria:'Em atraso',quantidade:overduePieces}]} barCategoryGap="38%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="categoria" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="quantidade" name="Peças" fill="#3A9D78" radius={[8,8,3,3]} maxBarSize={48}/></BarChart></ResponsiveContainer></div>
          </article>
          <article className="dp-panel">
            <div className="dp-head"><span>PRODUÇÃO · SEMANA</span><h2>Previsto × realizado</h2></div>
            {weekly.some(x => x.previsto || x.realizado) ? <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><LineChart data={weekly}><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Legend verticalAlign="top" height={24}/><Line type="monotone" dataKey="previsto" name="Previsto" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 5" dot={false}/><Line type="monotone" dataKey="realizado" name="Realizado" stroke="#2D8DB8" strokeWidth={3} dot={{r:3,strokeWidth:2,fill:"#fff"}}/></LineChart></ResponsiveContainer></div> : <div className="dp-empty dp-empty-compact">Sem dados reais nos últimos 7 dias.</div>}
          </article>
          <article className="dp-panel">
            <div className="dp-head"><span>PARADAS · CHÃO DE FÁBRICA</span><h2>Horas de parada por dia</h2></div>
            {stopSummary.length ? <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={stopSummary} barCategoryGap="30%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis unit="h" axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="horas" name="Parada" fill="#D65B61" radius={[7,7,2,2]} maxBarSize={34}/></BarChart></ResponsiveContainer></div> : <div className="dp-empty dp-empty-compact">Sem paradas registradas.</div>}
          </article>
        </section>

        <section className="dp-grid dp-chart-grid" aria-label="Indicadores de qualidade e metrologia">
          <article className="dp-panel">
            <div className="dp-head"><span>SGQ · NÃO CONFORMIDADES</span><h2>Abertas × fechadas</h2></div>
            <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{categoria:'Abertas',quantidade:rpnc},{categoria:'Fechadas',quantidade:rpncClosed}]} barCategoryGap="38%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="categoria" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="quantidade" name="Não conformidades" fill="#D65B61" radius={[7,7,2,2]} maxBarSize={48}/></BarChart></ResponsiveContainer></div>
          </article>
          <article className="dp-panel">
            <div className="dp-head"><span>SGQ · METROLOGIA</span><h2>Equipamentos válidos × vencidos</h2></div>
            <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{categoria:'Válidos',quantidade:validEquipment},{categoria:'Vencidos / bloqueados',quantidade:expiredEquipment}]} barCategoryGap="38%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="categoria" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="quantidade" name="Equipamentos" fill="#3A9D78" radius={[7,7,2,2]} maxBarSize={48}/></BarChart></ResponsiveContainer></div>
            {equipmentValidity.withoutValidity > 0 && <p className="dp-chart-note">{fmt(equipmentValidity.withoutValidity)} equipamento(s) sem data de validade cadastrada; não contabilizados como válidos.</p>}
          </article>
        </section>

        <section className="dp-panel dp-status-panel">
          <div className="dp-head"><span>STATUS DOS SETORES · PCP</span><h2>Distribuição das ordens de produção</h2></div>
          {opStatus.length ? <div className="dp-chart dp-chart-compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={opStatus} layout="vertical" margin={{left:16,right:18}}><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false}/><YAxis type="category" dataKey="status" width={105} axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea'}}/><Bar dataKey="quantidade" name="OPs" fill="#48B7C7" radius={[0,7,7,0]} maxBarSize={26}/></BarChart></ResponsiveContainer></div> : <div className="dp-empty dp-empty-compact">Sem ordens de produção reais para distribuir.</div>}
        </section>
      </main>

    </div>
  )
}
