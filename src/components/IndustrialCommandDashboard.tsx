/**
 * @REVISAO: REV-LIMITE-DE-LISTAGEM-VISIVEL-20261104-01 — a home soma KPIs sobre listas com teto de linhas (500 OPs, 5000 apontamentos, 3000 programações/produtos/equipamentos, 5000 paradas/RPNC). O excedente desaparecia sem aviso. Cada consulta agora pede count:'exact' e a tela assume publicamente o truncamento.
 * @REVISAO: REV-EXEC-QUALIDADE-20261105-01 — item 4 da lista de benchmarks do proprietário (Epicor Kin): a home passa a ler erp_pcp_alertas (abertos, por severidade), erp_inspecoes (dia e 7 dias, aprovadas × reprovadas) e liga as RPNC abertas às OPs em andamento (erp_rpnc.ordem_producao_id) na fileira. Contrato medido na sonda ao vivo (publishable key, limit=0): alertas tem created_at (42501 = existe, anon sem grant) e NAO tem criado_em/entidade_* (42703); inspecoes e rpnc.ordem_producao_id respondem 200 porem com count-exact zerado para anon (a RLS nao devolve linha), ou seja os numeros so sao reais em sessao autenticada. Falha de leitura desses dois painéis vira aviso na tela e não derruba o núcleo.
 * @AUTOR: Fernando Schuinsekel
 * @REVISAO: REV-HOME-PREMIUM-20261102-01 — tela principal reconstruida sobre a fundacao premium (#63)
 * @STATUS_APROVACAO: ORDEM EXPRESSA DO PROPRIETARIO (#63) — mesma regua dos tokens, sem <style> inline
 * @REVISAO: REV-CONTRATO-BANCO-20261103-01 — "hoje", atraso e vencimentos passam a usar o relógio do Postgres (regra do proprietário)
 * @REVISAO: REV-HOME-COLUNAS-BANCO-20261104-01 — leitura corrigida para as colunas que existem: apontamentos tem criado_em (nao created_at) e ordens tem created_at (nao criado_em)
 * APROVADO — indicadores conectados ao Supabase com isolamento por empresa/RLS.
 * Autorização expressa do usuário em 2026-10-26: incluir atalho ao Portal do Operador.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, CheckCircle, AlertTriangle, BarChart3, ClipboardCheck, ClipboardList, Bell, RefreshCw, ShieldCheck, Wrench
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { relogioDoServidor } from '../lib/serverClock'
import '../styles/home-premium-20261102.css'

type Props = { onNavigate: (route: string) => void }
type Machine = { id: string; codigo: string; nome: string; status: string }
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null }
type Product = { id: string; codigo: string | null; nome: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; criado_em: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type Stop = { maquina_id: string | null; inicio: string | null; fim: string | null; status: string | null }
type QueueRow = { op: string; workstation: string; product: string; lastPointing: string; status: string; planned: number; produced: number; inspectedOk: number; inspectedBad: number; openRnc: number }
type Daily = { day: string; previsto: number; realizado: number }
type MachineShift = { maquina: string; eficiencia: number }
type Equipment = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null; certificado_validade: string | null }
type Alert = { id: string; tipo: string | null; severidade: string | null; mensagem: string; status: string; created_at: string | null }
type Inspection = { id: string; ordem_producao_id: string | null; resultado: string | null; quantidade_inspecionada: number | null; quantidade_aprovada: number | null; quantidade_reprovada: number | null; created_at: string | null }

type Snapshot = { machines: Machine[]; ops: OP[]; products: Product[]; pointings: Pointing[]; programs: Program[]; stops: Stop[]; equipment: Equipment[]; alerts: Alert[]; inspections: Inspection[]; rpncOpenOps: string[]; falhas: string[]; rpnc: number; rpncClosed: number; avisos: string[] }
const emptySnapshot: Snapshot = { machines: [], ops: [], products: [], pointings: [], programs: [], stops: [], equipment: [], alerts: [], inspections: [], rpncOpenOps: [], falhas: [], rpnc: 0, rpncClosed: 0, avisos: [] }
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
  const [avisoRelogio, setAvisoRelogio] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // O relógio exibido avança a partir da última leitura do banco, nunca do relógio do navegador.
    const timer = window.setInterval(() => setTick(prev => new Date(prev.getTime() + 60000)), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    void relogioDoServidor().then(rel => {
      if (!alive) return
      if (rel.agora) {
        setTick(rel.agora)
        setAvisoRelogio('')
      } else {
        setAvisoRelogio(rel.aviso)
      }
    })
    return () => { alive = false }
  }, [reloadKey])

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
    const opQ = supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,quantidade_planejada,quantidade,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(500)
    const prodQ = supabase.from('erp_produtos').select('id,codigo,nome', { count: 'exact' }).limit(3000)
    const pointingQ = supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,criado_em', { count: 'exact' }).order('criado_em', { ascending: false }).limit(5000)
    const programQ = supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status', { count: 'exact' }).neq('status', 'cancelada').limit(3000)
    const stopQ = supabase.from('erp_producao_paradas').select('maquina_id,inicio,fim,status', { count: 'exact' }).limit(5000)
    const rpncQ = supabase.from('erp_rpnc').select('id,status,ordem_producao_id', { count: 'exact' }).limit(5000)
    const equipmentQ = supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao,certificado_validade', { count: 'exact' }).limit(3000)
    // Coluna conferida na sonda ao vivo: erp_pcp_alertas tem created_at, não criado_em (42703).
    const alertQ = supabase.from('erp_pcp_alertas').select('id,tipo,severidade,mensagem,status,created_at', { count: 'exact' }).neq('status', 'RESOLVIDO').order('created_at', { ascending: false }).limit(500)
    const inspQ = supabase.from('erp_inspecoes').select('id,ordem_producao_id,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(3000)

    if (!master && empresaId) {
      machineQ.eq('empresa_id', empresaId)
      opQ.eq('empresa_id', empresaId)
      prodQ.eq('empresa_id', empresaId)
      pointingQ.eq('empresa_id', empresaId)
      programQ.eq('empresa_id', empresaId)
      stopQ.eq('empresa_id', empresaId)
      rpncQ.eq('empresa_id', empresaId)
      equipmentQ.eq('empresa_id', empresaId)
      alertQ.eq('empresa_id', empresaId)
      inspQ.eq('empresa_id', empresaId)
    }

    const [m, o, pr, pt, pg, st, rn, eq, al, ins] = await Promise.all([machineQ, opQ, prodQ, pointingQ, programQ, stopQ, rpncQ, equipmentQ, alertQ, inspQ])
    for (const result of [m, o, pr, pt, pg, st, rn, eq]) if (result.error) throw result.error

    // Alertas e inspeções alimentam painéis próprios: se a leitura falhar (erp_pcp_alertas só
    // devolve linhas para sessão autenticada), o núcleo da home continua e a falha vira um aviso
    // na tela — o painel aparece sem linhas, nunca com um zero que parece medição.
    const falhas: string[] = []
    if (al.error) falhas.push(`Alertas do PCP não carregados: ${al.error.message}`)
    if (ins.error) falhas.push(`Inspeções da Qualidade não carregadas: ${ins.error.message}`)

    const closedRncStates = new Set(['encerrada', 'fechada', 'concluida', 'concluido', 'fechado', 'cancelada', 'cancelado'])
    const rncRows = (rn.data ?? []) as Array<{ status?: unknown; ordem_producao_id?: string | null }>
    const closedRncCount = rncRows.filter(row => closedRncStates.has(String(row.status ?? '').normalize('NFD').replace(ACCENT_STRIP, '').toLowerCase())).length
    const rpncOpenOps = rncRows
      .filter(row => !closedRncStates.has(String(row.status ?? '').normalize('NFD').replace(ACCENT_STRIP, '').toLowerCase()))
      .map(row => (typeof row.ordem_producao_id === 'string' ? row.ordem_producao_id : ''))
      .filter(Boolean)

    // Cada consulta da home tem um teto de linhas; sem medir o total do banco, o excedente
    // sumia em silencio e os KPIs eram apresentados como se fossem o período inteiro.
    const limites: Array<[string, number, number]> = [
      ['ordens de produção', (o.data ?? []).length, n(o.count)],
      ['apontamentos de produção', (pt.data ?? []).length, n(pt.count)],
      ['programações do PCP', (pg.data ?? []).length, n(pg.count)],
      ['paradas de produção', (st.data ?? []).length, n(st.count)],
      ['produtos cadastrados', (pr.data ?? []).length, n(pr.count)],
      ['registros de RPNC', rncRows.length, n(rn.count)],
      ['equipamentos de medição', (eq.data ?? []).length, n(eq.count)],
      ['alertas abertos do PCP', (al.data ?? []).length, n(al.count)],
      ['inspeções da Qualidade', (ins.data ?? []).length, n(ins.count)],
    ]
    const avisos = limites
      .filter(([nome, lidas, total]) => total > lidas)
      .map(([nome, lidas, total]) => `${lidas} de ${fmt(total)} ${nome}`)

    return {
      machines: (m.data ?? []) as Machine[],
      ops: (o.data ?? []) as OP[],
      products: (pr.data ?? []) as Product[],
      pointings: (pt.data ?? []) as Pointing[],
      programs: (pg.data ?? []) as Program[],
      stops: (st.data ?? []) as Stop[],
      equipment: (eq.data ?? []) as Equipment[],
      alerts: (al.data ?? []) as Alert[],
      inspections: (ins.data ?? []) as Inspection[],
      rpncOpenOps,
      falhas,
      rpnc: Math.max(0, rncRows.length - closedRncCount),
      rpncClosed: closedRncCount,
      avisos
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

  const { machines, ops, products, pointings, programs, stops, equipment, alerts, inspections, rpncOpenOps, falhas, rpnc, rpncClosed } = data

  const today = dateKey(tick)
  const activeOps = ops.filter(o => !['concluida', 'concluído', 'cancelada', 'cancelado'].includes(String(o.status).toLowerCase()))
  const todayPointings = pointings.filter(p => String(p.criado_em ?? '').slice(0, 10) === today)
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
      const realizado = pointings.filter(p => String(p.criado_em ?? '').slice(0, 10) === key).reduce((s, p) => s + n(p.quantidade_boa) + n(p.quantidade_refugada), 0)
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

  // Execução e qualidade ligadas ao processo produtivo: inspeções por OP e RPNC abertas por OP.
  const inspByOp = useMemo(() => {
    const map = new Map<string, { aprovadas: number; reprovadas: number }>()
    for (const item of inspections) {
      const op = item.ordem_producao_id
      if (!op) continue
      const atual = map.get(op) ?? { aprovadas: 0, reprovadas: 0 }
      atual.aprovadas += n(item.quantidade_aprovada)
      atual.reprovadas += n(item.quantidade_reprovada)
      map.set(op, atual)
    }
    return map
  }, [inspections])

  const rncOpenByOp = useMemo(() => {
    const map = new Map<string, number>()
    for (const op of rpncOpenOps) map.set(op, (map.get(op) ?? 0) + 1)
    return map
  }, [rpncOpenOps])

  const inspectionsToday = useMemo(() => inspections.filter(i => String(i.created_at ?? '').slice(0, 10) === today), [inspections, today])
  const inspectedToday = inspectionsToday.reduce((s, i) => s + n(i.quantidade_inspecionada), 0)
  const rejectedToday = inspectionsToday.reduce((s, i) => s + n(i.quantidade_reprovada), 0)
  const inspectedWindow = inspections.reduce((s, i) => s + n(i.quantidade_inspecionada), 0)
  const rejectedWindow = inspections.reduce((s, i) => s + n(i.quantidade_reprovada), 0)
  const conformity = inspectedWindow > 0 ? (Math.max(0, inspectedWindow - rejectedWindow) / inspectedWindow) * 100 : null

  const rpncInActiveQueue = useMemo(() => activeOps.reduce((s, op) => s + (rncOpenByOp.get(op.id) ?? 0), 0), [activeOps, rncOpenByOp])

  const weeklyInspections = useMemo(() => {
    const days: Array<{ day: string; aprovadas: number; reprovadas: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(tick)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      const rows = inspections.filter(x => String(x.created_at ?? '').slice(0, 10) === key)
      days.push({
        day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        aprovadas: rows.reduce((s, x) => s + n(x.quantidade_aprovada), 0),
        reprovadas: rows.reduce((s, x) => s + n(x.quantidade_reprovada), 0)
      })
    }
    return days
  }, [tick, inspections])

  const queue = useMemo<QueueRow[]>(() => {
    const productMap = new Map(products.map(p => [p.id, p]))
    const machineMap = new Map(machines.map(m => [m.id, m]))
    return activeOps.slice(0, 12).map(op => {
      const rows = pointings.filter(p => p.ordem_producao_id === op.id).sort((a, b) => String(b.criado_em ?? '').localeCompare(String(a.criado_em ?? '')))
      const last = rows[0]
      const machine = machineMap.get(op.maquina_id ?? '')
      const product = productMap.get(op.produto_id ?? '')
      const quality = inspByOp.get(op.id)
      return {
        op: `OP-${op.numero_op}`,
        workstation: machine ? `${machine.codigo} · ${machine.nome}` : 'Posto não definido',
        product: product ? `${product.codigo ?? ''} · ${product.nome ?? ''}`.replace(/^ · | · $/g, '') : 'Produto não informado',
        lastPointing: last?.criado_em ? new Date(last.criado_em).toLocaleString('pt-BR') : 'Sem apontamento',
        status: statusText(op.status),
        planned: n(op.quantidade_planejada),
        produced: n(op.quantidade),
        inspectedOk: quality?.aprovadas ?? 0,
        inspectedBad: quality?.reprovadas ?? 0,
        openRnc: rncOpenByOp.get(op.id) ?? 0
      }
    })
  }, [activeOps, pointings, products, machines, inspByOp, rncOpenByOp])

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

  // KPI com '—' não é bom nem ruim: sem a leitura, não existe veredito para pintar de cor.
  const falhouAlertas = falhas.some(f => f.startsWith('Alertas'))
  const falhouInspecoes = falhas.some(f => f.startsWith('Inspeções'))

  const executionCards = [
    { label: 'ALERTAS DO PCP', value: falhouAlertas ? '—' : fmt(alerts.length), suffix: '', tone: falhouAlertas ? '' : alerts.length > 0 ? 'is-bad' : 'is-good', icon: Bell },
    { label: 'INSPEÇÕES DO DIA', value: falhouInspecoes ? '—' : fmt(inspectionsToday.length), suffix: falhouInspecoes ? '' : 'un', tone: '', icon: ClipboardCheck },
    { label: 'REPROVADAS HOJE', value: falhouInspecoes ? '—' : fmt(rejectedToday), suffix: falhouInspecoes ? '' : 'un', tone: falhouInspecoes ? '' : rejectedToday > 0 ? 'is-bad' : 'is-good', icon: AlertTriangle },
    { label: 'RNC ABERTAS EM OPs EM ANDAMENTO', value: fmt(rpncInActiveQueue), suffix: '', tone: rpncInActiveQueue > 0 ? 'is-bad' : 'is-good', icon: ShieldCheck }
  ]

  // Severidade não é mapeada para valores inventados: o rótulo vem do banco e a cor só decide
  // quando o texto diz claramente crítico/alto ou baixo/informativo.
  const alertRows = alerts.slice(0, 8).map(a => {
    const s = (a.severidade ?? 'SEM SEVERIDADE').toString().trim().toUpperCase() || 'SEM SEVERIDADE'
    const flat = s.normalize('NFD').replace(ACCENT_STRIP, '').toLowerCase()
    const tone = /crit|alta|high|urgente|grave/.test(flat) ? 'is-bad' : /baixa|low|info/.test(flat) ? 'is-good' : ''
    return { ...a, severidade: s, tone }
  })

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
        {avisoRelogio && <div className="hp-alert" role="alert">{avisoRelogio}</div>}
        {!!data.avisos.length && <div className="hp-alert" role="alert">{`Lista truncada nesta carga (${data.avisos.join(', ')}). Os indicadores abaixo consideram apenas o trecho carregado; a agregação definitiva no banco está pendente.`}</div>}
        {falhas.map(falha => <div key={falha} className="hp-alert" role="alert">{falha}</div>)}

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

        <section className="hp-kpis" aria-label="Execução industrial e qualidade">
          {executionCards.map(card => { const Icon = card.icon; return (
            <article key={card.label} className={`hp-kpi ${card.tone}`}>
              <span className="hp-kpi-icon"><Icon /></span>
              <div className="hp-kpi-body">
                <small className="hp-kpi-label">{card.label}</small>
                <strong className="hp-kpi-value">{loading ? '—' : card.value}{card.suffix && !loading && <em>{card.suffix}</em>}</strong>
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
          <article className="hp-card">
            <div className="hp-head"><span>PCP · ALERTAS</span><h2>Exceções do planejamento abertas</h2></div>
            {alertRows.length ? <div className="hp-table-wrap"><table className="hp-table"><thead><tr><th scope="col">Severidade</th><th scope="col">Tipo</th><th scope="col">Mensagem</th><th scope="col">Registrado</th></tr></thead><tbody>{alertRows.map(a => (
              <tr key={a.id}>
                <td><span className={`hp-chip ${a.tone}`}>{a.severidade}</span></td>
                <td className="hp-dim">{a.tipo || '—'}</td>
                <td>{a.mensagem}</td>
                <td className="hp-dim">{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : 'sem data'}</td>
              </tr>
            ))}</tbody></table></div> : <div className="hp-empty">{falhouAlertas ? 'Leitura de erp_pcp_alertas falhou; ver o aviso acima.' : 'Nenhum alerta de planejamento aberto nesta carga.'}</div>}
            {alerts.length > alertRows.length && <p className="hp-note">{fmt(alerts.length - alertRows.length)} alerta(s) fora desta lista; KPIs contam todos os {fmt(alerts.length)} carregados.</p>}
          </article>
          <article className="hp-card">
            <div className="hp-head"><span>SGQ · INSPEÇÕES</span><h2>Aprovadas × reprovadas por dia</h2></div>
            {weeklyInspections.some(x => x.aprovadas || x.reprovadas) ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyInspections} barCategoryGap="26%"><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Legend verticalAlign="top" height={22} iconSize={8} wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="aprovadas" name="Aprovadas" fill={CHART_COLORS.good} maxBarSize={22} stackId="insp" /><Bar dataKey="reprovadas" name="Reprovadas" fill={CHART_COLORS.bad} maxBarSize={22} stackId="insp" /></BarChart></ResponsiveContainer></div> : <div className="hp-empty">{falhouInspecoes ? 'Leitura de erp_inspecoes falhou; ver o aviso acima.' : 'Sem inspeções registradas nos últimos 7 dias nesta carga.'}</div>}
            <p className="hp-note">{conformity === null ? 'Conformidade não calculada: nenhuma quantidade inspecionada na carga.' : `Conformidade ${conformity.toFixed(1).replace('.', ',')}% sobre ${fmt(inspectedWindow)} un inspecionadas na carga (${fmt(rejectedWindow)} reprovadas). Hoje: ${fmt(inspectedToday)} un inspecionadas, ${fmt(rejectedToday)} reprovadas.`}</p>
          </article>
        </section>

        <article className="hp-card">
          <div className="hp-head"><span>STATUS DOS SETORES · PCP</span><h2>Distribuição das ordens de produção</h2></div>
          {opStatus.length ? <div className="hp-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={opStatus} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid stroke="#e6ebef" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="status" width={96} axisLine={false} tickLine={false} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="quantidade" name="OPs" fill={CHART_COLORS.cyan} maxBarSize={18} /></BarChart></ResponsiveContainer></div> : <div className="hp-empty">Sem ordens de produção reais para distribuir.</div>}
        </article>

        <article className="hp-card">
          <div className="hp-head"><span>FILEIRA · OPs EM ANDAMENTO</span><h2>Ordens abertas e último apontamento</h2></div>
          {queue.length ? <div className="hp-table-wrap"><table className="hp-table"><thead><tr><th scope="col">OP</th><th scope="col">Máquina / posto</th><th scope="col">Produto</th><th scope="col">Plano</th><th scope="col">Realizado</th><th scope="col">Insp. aprov.</th><th scope="col">Insp. repr.</th><th scope="col">RNC abertas</th><th scope="col">Último apontamento</th><th scope="col">Status</th></tr></thead><tbody>{queue.map(row => (
            <tr key={row.op}>
              <td><strong>{row.op}</strong></td>
              <td>{row.workstation}</td>
              <td className="hp-dim">{row.product}</td>
              <td>{fmt(row.planned)}</td>
              <td>{fmt(row.produced)}</td>
              <td>{fmt(row.inspectedOk)}</td>
              <td>{row.inspectedBad > 0 ? <span className="hp-chip is-bad">{fmt(row.inspectedBad)}</span> : <strong>0</strong>}</td>
              <td>{row.openRnc > 0 ? <span className="hp-chip is-bad">{fmt(row.openRnc)}</span> : <strong>0</strong>}</td>
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
