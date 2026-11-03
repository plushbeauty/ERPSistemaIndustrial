/**
 * @AUTOR: Fernando Schuinsekel
 * @REVISAO: REV-HOME-PREMIUM-20261102-01 — tela principal reconstruida sobre a fundacao premium (#63)
 * @STATUS_APROVACAO: ORDEM EXPRESSA DO PROPRIETARIO (#63) — mesma regua dos tokens, sem <style> inline
 * APROVADO — indicadores conectados ao Supabase com isolamento por empresa/RLS.
 * Autorização expressa do usuário em 2026-10-26: incluir atalho ao Portal do Operador.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, CheckCircle, AlertTriangle, BarChart3, ClipboardList, RefreshCw, Wrench
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import '../styles/home-premium-20261102.css'

type Props = { onNavigate: (route: string) => void }
type Machine = { id: string; codigo: string; nome: string; status: string }
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null; criado_em?: string | null }
type Product = { id: string; codigo: string | null; nome: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; created_at: string | null; criado_em?: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type Stop = { maquina_id: string | null; inicio: string | null; fim: string | null; status: string | null }
type QueueRow = { op: string; workstation: string; product: string; lastPointing: string; status: string; planned: number; produced: number }
type Daily = { day: string; previsto: number; realizado: number }
type MachineShift = { maquina: string; eficiencia: number }
type Equipment = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null; certificado_validade: string | null }

type Snapshot = { machines: Machine[]; ops: OP[]; products: Product[]; pointings: Pointing[]; programs: Program[]; stops: Stop[]; equipment: Equipment[]; rpnc: number; rpncClosed: number }
const emptySnapshot: Snapshot = { machines: [], ops: [], products: [], pointings: [], programs: [], stops: [], equipment: [], rpnc: 0, rpncClosed: 0 }
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0
const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v))
const dateKey = (d: Date) => d.toISOString().slice(0, 10)
const ACCENT_STRIP = /[\u0300-\u036f]/g
const CHART_COLORS = { primary: '#2D8DB8', good: '#3A9D78', bad: '#D65B61', cyan: '#48B7C7', muted: '#94a3b8' }
const TOOLTIP_STYLE = { borderRadius: 2, border: '1px solid #d6dee3', fontSize: 11 }

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

function statusTone(value: string) {
  const s = String(value).toLowerCase()
  if (s.includes('concl') || s.includes('liber')) return 'is-good'
  if (s.includes('cancel') || s.includes('paus')) return 'is-bad'
  return ''
}

export default function DashboardPrincipal({ onNavigate }: Props) {
  const [data, setData] = useState<Snapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(() => new Date())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const fetchSnapshot = useCallback(async (): Promise<Snapshot> => {
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

    const closedRncStates = new Set(['encerrada', 'fechada', 'concluida', 'concluido', 'fechado', 'cancelada', 'cancelado'])
    const rncRows = (rn.data ?? []) as Array<{ status?: unknown }>
    const closedRncCount = rncRows.filter(row => closedRncStates.has(String(row.status ?? '').normalize('NFD').replace(ACCENT_STRIP, '').toLowerCase())).length

    return {
      machines: (m.data ?? []) as Machine[],
      ops: (o.data ?? []) as OP[],
      products: (pr.data ?? []) as Product[],
      pointings: (pt.data ?? []) as Pointing[],
      programs: (pg.data ?? []) as Program[],
      stops: (st.data ?? []) as Stop[],
      equipment: (eq.data ?? []) as Equipment[],
      rpnc: Math.max(0, rncRows.length - closedRncCount),
      rpncClosed: closedRncCount
    }
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fetchSnapshot()
      .then(snapshot => { if (!alive) return; setData(snapshot); setLoadedAt(new Date()) })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Não foi possível carregar o dashboard.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [fetchSnapshot, reloadKey])

  const { machines, ops, products, pointings, programs, stops, equipment, rpnc, rpncClosed } = data

  const today = dateKey(tick)
  const activeOps = ops.filter(o => !['concluida', 'concluído', 'cancelada', 'cancelado'].includes(String(o.status).toLowerCase()))
  const todayPointings = pointings.filter(p => String(p.criado_em ?? p.created_at ?? '').slice(0, 10) === today)
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
      const d = new Date(tick)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      const previsto = programs.filter(p => String(p.inicio_planejado).slice(0, 10) === key).reduce((s, p) => s + n(p.quantidade_planejada), 0)
      const realizado = pointings.filter(p => String(p.criado_em ?? p.created_at ?? '').slice(0, 10) === key).reduce((s, p) => s + n(p.quantidade_boa) + n(p.quantidade_refugada), 0)
      days.push({ day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), previsto, realizado })
    }
    return days
  }, [tick, programs, pointings])

  const overduePieces = useMemo(() => programs.reduce((sum, p) => {
    const due = new Date(p.fim_planejado).getTime()
    const produced = n(p.quantidade_produzida)
    const planned = n(p.quantidade_planejada)
    return due < tick.getTime() && produced < planned ? sum + Math.max(0, planned - produced) : sum
  }, 0), [programs, tick])

  const onTimePieces = useMemo(() => programs.reduce((sum, p) => {
    const due = new Date(p.fim_planejado).getTime()
    const produced = n(p.quantidade_produzida)
    const planned = n(p.quantidade_planejada)
    return due >= tick.getTime() && produced < planned ? sum + Math.max(0, planned - produced) : sum
  }, 0), [programs, tick])

  const equipmentValidity = useMemo(() => {
    const invalidStates = new Set(['vencido', 'bloqueado', 'inativo', 'reprovado', 'fora de uso'])
    let valid = 0
    let expired = 0
    let withoutValidity = 0
    for (const item of equipment) {
      const dates = [item.proxima_calibracao, item.certificado_validade].filter((date): date is string => Boolean(date))
      const status = String(item.status ?? '').normalize('NFD').replace(ACCENT_STRIP, '').toLowerCase()
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
      const day = String(s.inicio).slice(0, 10)
      const hours = Math.max(0, (new Date(s.fim).getTime() - new Date(s.inicio).getTime()) / 3600000)
      grouped.set(day, (grouped.get(day) ?? 0) + hours)
    })
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map(([day, horas]) => ({ day: new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), horas: Number(horas.toFixed(1)) }))
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
        status: statusText(op.status),
        planned: n(op.quantidade_planejada),
        produced: n(op.quantidade)
      }
    })
  }, [activeOps, pointings, products, machines])

  const cards = [
    { label: 'OPs EM ANDAMENTO', value: fmt(activeOps.length), suffix: '', icon: Activity, tone: '' },
    { label: 'PRODUÇÃO DO DIA', value: fmt(producedToday), suffix: 'un', icon: CheckCircle, tone: '' },
    { label: 'RNC ABERTAS / FECHADAS', value: `${fmt(rpnc)} / ${fmt(rpncClosed)}`, suffix: '', icon: AlertTriangle, tone: rpnc > 0 ? 'is-bad' : 'is-good' },
    { label: 'EFICIÊNCIA (OEE)', value: oee === null ? '—' : `${oee.toFixed(1).replace('.', ',')}%`, suffix: '', icon: BarChart3, tone: '' }
  ]

  const attentionCards = [
    { label: 'PEÇAS EM ATRASO', value: fmt(overduePieces), suffix: 'un', tone: 'is-bad', icon: AlertTriangle },
    { label: 'PEÇAS NO PRAZO', value: fmt(onTimePieces), suffix: 'un', tone: 'is-good', icon: CheckCircle },
    { label: 'EQUIPAMENTOS VÁLIDOS', value: fmt(validEquipment), suffix: 'un', tone: 'is-good', icon: Wrench },
    { label: 'EQUIPAMENTOS VENCIDOS / BLOQUEADOS', value: fmt(expiredEquipment), suffix: 'un', tone: 'is-bad', icon: AlertTriangle }
  ]

  return (
    <div className="hp-shell">
      <main className="hp-main">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {loading ? 'Carregando dados da empresa...' : loadedAt ? `Última carga ${loadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sem carga'}
          </span>
          <button type="button" className="hp-btn" onClick={() => setReloadKey(k => k + 1)} disabled={loading}>
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>

        {error && <div className="hp-alert" role="alert">{error}</div>}

        <section className="hp-kpis" aria-label="Indicadores do dia">
          {cards.map(({ label, value, suffix, icon: Icon, tone }) => (
            <article key={label} className={`hp-kpi ${tone}`}>
              <span className="hp-kpi-icon"><Icon /></span>
              <div className="hp-kpi-body">
                <small className="hp-kpi-label">{label}</small>
                <strong className="hp-kpi-value">{loading ? '—' : value}{suffix && !loading && <em>{suffix}</em>}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="hp-kpis" aria-label="Pontos de atenção">
          {attentionCards.map(card => { const Icon = card.icon; return (
            <article key={card.label} className={`hp-kpi ${card.tone}`}>
              <span className="hp-kpi-icon"><Icon /></span>
              <div className="hp-kpi-body">
                <small className="hp-kpi-label">{card.label}</small>
                <strong className="hp-kpi-value">{loading ? '—' : card.value}<em>{card.suffix}</em></strong>
              </div>
            </article>
          ) })}
        </section>

        <section className="hp-grid">
          <article className="hp-card">
            <div className="hp-head"><span>PCP · MÁQUINAS</span><h2>Eficiência por máquina</h2></div>
            {machineShift.length ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineShift} barCategoryGap="26%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="maquina" axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="eficiencia" name="Eficiência" fill={CHART_COLORS.primary} maxBarSize={28} /></BarChart></ResponsiveContainer></div> : <div className="hp-empty">Sem apontamentos reais com plano por máquina.</div>}
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>PCP · ENTREGA</span><h2>Peças no prazo × em atraso</h2></div>
            <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ categoria: 'No prazo', quantidade: onTimePieces }, { categoria: 'Em atraso', quantidade: overduePieces }]} barCategoryGap="38%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="categoria" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="quantidade" name="Peças" fill={CHART_COLORS.good} maxBarSize={40} /></BarChart></ResponsiveContainer></div>
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>PRODUÇÃO · SEMANA</span><h2>Previsto × realizado</h2></div>
            {weekly.some(x => x.previsto || x.realizado) ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={weekly}><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Legend verticalAlign="top" height={22} iconSize={8} wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="previsto" name="Previsto" stroke={CHART_COLORS.muted} strokeWidth={1.5} strokeDasharray="6 5" dot={false} /><Line type="monotone" dataKey="realizado" name="Realizado" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 2, strokeWidth: 1.5, fill: '#fff' }} /></LineChart></ResponsiveContainer></div> : <div className="hp-empty">Sem dados reais nos últimos 7 dias.</div>}
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>PARADAS · CHÃO DE FÁBRICA</span><h2>Horas de parada por dia</h2></div>
            {stopSummary.length ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stopSummary} barCategoryGap="30%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis unit="h" axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="horas" name="Parada" fill={CHART_COLORS.bad} maxBarSize={26} /></BarChart></ResponsiveContainer></div> : <div className="hp-empty">Sem paradas registradas.</div>}
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>SGQ · NÃO CONFORMIDADES</span><h2>Abertas × fechadas</h2></div>
            <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ categoria: 'Abertas', quantidade: rpnc }, { categoria: 'Fechadas', quantidade: rpncClosed }]} barCategoryGap="38%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="categoria" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="quantidade" name="Não conformidades" fill={CHART_COLORS.bad} maxBarSize={40} /></BarChart></ResponsiveContainer></div>
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>SGQ · METROLOGIA</span><h2>Equipamentos válidos × vencidos</h2></div>
            <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ categoria: 'Válidos', quantidade: validEquipment }, { categoria: 'Vencidos / bloqueados', quantidade: expiredEquipment }]} barCategoryGap="38%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="categoria" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="quantidade" name="Equipamentos" fill={CHART_COLORS.good} maxBarSize={40} /></BarChart></ResponsiveContainer></div>
            {equipmentValidity.withoutValidity > 0 && <p className="hp-note">{fmt(equipmentValidity.withoutValidity)} equipamento(s) sem data de validade cadastrada; não contabilizados como válidos.</p>}
          </article>
        </section>

        <article className="hp-card">
          <div className="hp-head"><span>STATUS DOS SETORES · PCP</span><h2>Distribuição das ordens de produção</h2></div>
          {opStatus.length ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={opStatus} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="status" width={96} axisLine={false} tickLine={false} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="quantidade" name="OPs" fill={CHART_COLORS.cyan} maxBarSize={18} /></BarChart></ResponsiveContainer></div> : <div className="hp-empty">Sem ordens de produção reais para distribuir.</div>}
        </article>

        <article className="hp-card">
          <div className="hp-head"><span>FILEIRA · OPs EM ANDAMENTO</span><h2>Ordens abertas e último apontamento</h2></div>
          {queue.length ? <div className="hp-table-wrap"><table className="hp-table"><thead><tr><th scope="col">OP</th><th scope="col">Máquina / posto</th><th scope="col">Produto</th><th scope="col">Plano</th><th scope="col">Realizado</th><th scope="col">Último apontamento</th><th scope="col">Status</th></tr></thead><tbody>{queue.map(row => (
            <tr key={row.op}>
              <td><strong>{row.op}</strong></td>
              <td>{row.workstation}</td>
              <td className="hp-dim">{row.product}</td>
              <td>{fmt(row.planned)}</td>
              <td>{fmt(row.produced)}</td>
              <td className="hp-dim">{row.lastPointing}</td>
              <td><span className={`hp-chip ${statusTone(row.status)}`}>{row.status}</span></td>
            </tr>
          ))}</tbody></table></div> : <div className="hp-empty">Nenhuma ordem de produção em andamento.</div>}
        </article>

        <button type="button" className="hp-portal" onClick={() => onNavigate('/pageprincipal/chao-de-fabrica/portal-operador')}>
          <img src="/icons/portal-operador-industrial.png" alt="" />
          <span>
            <strong>Portal do Operador</strong>
            <small>Chão de fábrica · programação, ordens e apontamentos</small>
          </span>
          <span className="hp-go hp-chip"><ClipboardList size={11} /> Acessar portal</span>
        </button>
      </main>
    </div>
  )
}
