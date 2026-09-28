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
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null }
type Product = { id: string; codigo: string | null; nome: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; created_at: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type Stop = { maquina_id: string | null; inicio: string | null; fim: string | null; status: string | null }
type QueueRow = { op: string; workstation: string; product: string; lastPointing: string; status: string }
type Daily = { day: string; previsto: number; realizado: number }
type MachineShift = { maquina: string; eficiencia: number }

const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0
const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v))
const dateKey = (d: Date) => d.toISOString().slice(0, 10)

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
  const [rpnc, setRpnc] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
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
        const opQ = supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,quantidade_planejada,quantidade,created_at').order('created_at', { ascending: false }).limit(500)
        const prodQ = supabase.from('erp_produtos').select('id,codigo,nome').limit(3000)
        const pointingQ = supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,created_at').order('created_at', { ascending: false }).limit(5000)
        const programQ = supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status').neq('status', 'cancelada').limit(3000)
        const stopQ = supabase.from('erp_producao_paradas').select('maquina_id,inicio,fim,status').limit(5000)
        const rpncQ = supabase.from('erp_rpnc').select('id,status').limit(5000)

        if (!master && empresaId) {
          machineQ.eq('empresa_id', empresaId)
          opQ.eq('empresa_id', empresaId)
          prodQ.eq('empresa_id', empresaId)
          pointingQ.eq('empresa_id', empresaId)
          programQ.eq('empresa_id', empresaId)
          stopQ.eq('empresa_id', empresaId)
          rpncQ.eq('empresa_id', empresaId)
        }

        const [m, o, pr, pt, pg, st, rn] = await Promise.all([machineQ, opQ, prodQ, pointingQ, programQ, stopQ, rpncQ])
        for (const result of [m, o, pr, pt, pg, st, rn]) if (result.error) throw result.error

        if (!alive) return
        setMachines((m.data ?? []) as Machine[])
        setOps((o.data ?? []) as OP[])
        setProducts((pr.data ?? []) as Product[])
        setPointings((pt.data ?? []) as Pointing[])
        setPrograms((pg.data ?? []) as Program[])
        setStops((st.data ?? []) as Stop[])
        setRpnc((rn.data ?? []).filter((x: { status?: unknown }) => !['encerrada', 'fechada', 'concluida', 'concluído'].includes(String(x.status ?? '').toLowerCase())).length)
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
  const todayPointings = pointings.filter(p => String(p.created_at ?? '').slice(0, 10) === today)
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
      const previsto = programs.filter(p => String(p.inicio_planejado).slice(0, 10) === key).reduce((s, p) => s + n(p.quantidade_planejada), 0)
      const realizado = pointings.filter(p => String(p.created_at ?? '').slice(0, 10) === key).reduce((s, p) => s + n(p.quantidade_boa) + n(p.quantidade_refugada), 0)
      days.push({ day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), previsto, realizado })
    }
    return days
  }, [clock, programs, pointings])

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
    { label: 'ALERTAS DO SGQ', value: fmt(rpnc), icon: AlertTriangle },
    { label: 'EFICIÊNCIA (OEE)', value: oee === null ? '—' : `${oee.toFixed(1).replace('.', ',')}%`, icon: BarChart3 }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <style>{`
        .dp-shell{min-height:100%;background:#f8fafc}
        .dp-main{width:100%;max-width:1700px;margin:0 auto;padding:18px 24px 34px}
        .dp-context{padding:11px 0 13px;border-bottom:1px solid #dbe3ea}.dp-context p{margin:0;color:#475569;font-size:10px;font-weight:950;letter-spacing:.12em}
        .dp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}
        .dp-kpi{position:relative;display:flex;align-items:center;gap:13px;padding:17px 16px;min-height:90px;background:linear-gradient(135deg,#17445A,#0B3042);border:1px solid #082838;border-radius:14px;box-shadow:0 10px 24px rgba(8,40,56,.28);overflow:hidden}
        .dp-kpi::after{content:"";position:absolute;right:-26px;bottom:-38px;width:104px;height:104px;border-radius:50%;background:rgba(72,183,199,.32);pointer-events:none}
        .dp-kpi-icon{position:relative;z-index:1;display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:linear-gradient(145deg,#ffffff,#bfe4ec);color:#123B50;flex:none;box-shadow:0 10px 18px rgba(8,42,57,.34),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -5px 9px rgba(18,59,80,.14);text-shadow:0 1px 1px rgba(18,59,80,.12)}
        .dp-kpi small{display:block;color:#FFFFFF;font-size:13px;font-weight:950;letter-spacing:.04em;line-height:1.2}.dp-kpi strong{display:block;color:#FFFFFF;font-size:29px;font-weight:950;line-height:1.08;margin-top:5px}.dp-kpi em{font-style:normal;color:#FFFFFF;font-size:12px;font-weight:900}
        .dp-kpi:nth-child(2){background:linear-gradient(135deg,#0F6748,#063C2A);border-color:#052E21}.dp-kpi:nth-child(2)::after{background:rgba(72,183,199,.18)}.dp-kpi:nth-child(2) .dp-kpi-icon{color:#087A58;background:linear-gradient(145deg,#ffffff,#bdebdc)}
        .dp-kpi:nth-child(3){background:linear-gradient(135deg,#A94F00,#6E2F00);border-color:#542300}.dp-kpi:nth-child(3)::after{background:rgba(255,255,255,.14)}.dp-kpi:nth-child(3) .dp-kpi-icon{color:#A64000;background:linear-gradient(145deg,#ffffff,#ffd9b5)}
        .dp-kpi:nth-child(4){background:linear-gradient(135deg,#247E91,#145564);border-color:#0F4652}.dp-kpi:nth-child(4)::after{background:rgba(18,59,80,.20)}.dp-kpi:nth-child(4) .dp-kpi-icon{color:#176487;background:linear-gradient(145deg,#ffffff,#c7eaf0)}
        .dp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
        .dp-panel{background:#fff;border:1px solid #d7e5ea;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(18,59,80,.07)}
        .dp-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 17px;border-bottom:1px solid #edf4f6;background:linear-gradient(180deg,#fff,#fbfeff)}.dp-head span{color:#2D8DB8;font-size:10px;font-weight:950;letter-spacing:.1em}.dp-head h2{margin:3px 0 0;color:#123B50;font-size:16px;font-weight:950}
        .dp-chart{height:280px;padding:14px 14px 12px}.dp-empty{height:255px;display:grid;place-items:center;padding:20px;text-align:center;color:#64748b;font-size:12px;font-weight:700}
        .dp-table-wrap{overflow:auto}.dp-table{width:100%;border-collapse:collapse;font-size:12px}.dp-table th{background:#f8fafc;color:#475569;text-align:left;font-size:10px;font-weight:950;padding:10px 12px;border-bottom:1px solid #e2e8f0}.dp-table td{padding:11px 12px;border-bottom:1px solid #edf2f7;color:#334155;font-weight:650;white-space:nowrap}.dp-table tr:last-child td{border-bottom:0}.dp-status{display:inline-flex;padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#065f46;font-size:10px;font-weight:900}.dp-error{margin:0 0 12px;padding:10px 12px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:7px;font-size:12px;font-weight:700}
                @media(max-width:1050px){.dp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.dp-grid{grid-template-columns:1fr}.dp-main{padding:16px}}
        @media(max-width:650px){.dp-kpis{grid-template-columns:1fr}.dp-main{padding:12px}}
      `}</style>

      <main className="dp-main">
        {error && <div className="dp-error">{error}</div>}

        <section className="dp-context"><p>VISÃO GERAL DO CHÃO DE FÁBRICA</p></section>

        <section className="dp-kpis">
          {cards.map(({ label, value, suffix, icon: Icon }) => (
            <article key={label} className="dp-kpi">
              <span className="dp-kpi-icon"><Icon size={19}/></span>
              <div><small>{label}</small><strong>{loading ? '…' : value} {suffix && <em>{suffix}</em>}</strong></div>
            </article>
          ))}
        </section>

        <section className="dp-grid">
          <article className="dp-panel">
            <div className="dp-head"><span>MONITORAMENTO EM TEMPO REAL</span><h2>Eficiência de máquinas por turno</h2></div>
            {machineShift.length ? (
              <div className="dp-chart"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineShift} barCategoryGap="30%"><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="maquina" axisLine={false} tickLine={false}/><YAxis domain={[0,100]} unit="%" axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea',boxShadow:'0 10px 25px rgba(18,59,80,.12)'}}/><Bar dataKey="eficiencia" name="Eficiência" fill="#2D8DB8" radius={[8,8,3,3]} maxBarSize={42}/></BarChart>
              </ResponsiveContainer></div>
            ) : <div className="dp-empty">Sem dados reais de eficiência por máquina/turno registrados.</div>}
          </article>

          <article className="dp-panel">
            <div className="dp-head"><span>PCP · PREVISTO × REALIZADO</span><h2>Volumes de produção semanal</h2></div>
            {weekly.some(x => x.previsto || x.realizado) ? (
              <div className="dp-chart"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}><CartesianGrid stroke="#e7f0f3" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d7e5ea',boxShadow:'0 10px 25px rgba(18,59,80,.12)'}}/><Legend verticalAlign="top" height={28}/><Line type="monotone" dataKey="previsto" name="Previsto" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 5" dot={false}/><Line type="monotone" dataKey="realizado" name="Realizado" stroke="#2D8DB8" strokeWidth={4} dot={{r:4,strokeWidth:2,fill:"#fff"}} activeDot={{r:6}}/></LineChart>
              </ResponsiveContainer></div>
            ) : <div className="dp-empty">Sem programação ou produção registrada para os últimos 7 dias.</div>}
          </article>
        </section>

        <section className="dp-panel" style={{ marginTop: 12 }}>
          <div className="dp-head"><span>ALERTAS E PARADAS</span><h2>Fila de trabalho atual</h2></div>
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead><tr><th>CÓD_OP</th><th>POSTO DE TRABALHO</th><th>PRODUTO</th><th>ÚLTIMO APONTAMENTO</th><th>STATUS DE OPERAÇÃO</th></tr></thead>
              <tbody>
                {queue.length ? queue.map(row => (
                  <tr key={row.op}><td><strong>{row.op}</strong></td><td>{row.workstation}</td><td>{row.product}</td><td>{row.lastPointing}</td><td><span className="dp-status">{row.status}</span></td></tr>
                )) : <tr><td colSpan={5} style={{textAlign:'center',padding:28,color:'#64748b'}}>Nenhuma OP em andamento com dados reais para exibir.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

    </div>
  )
}
