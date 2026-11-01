/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-MODULO-PREMIUM-20261101-03 — tela principal sobre a fundação premium, sem CSS injetado
 * @STATUS_APROVACAO: APLICAÇÃO A TODOS OS MÓDULOS AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-01
 *
 * Nota de histórico mantida de propósito: o atalho para o Portal do Operador foi
 * autorizado pelo proprietário em 2026-10-26 e continua existindo nesta tela.
 *
 * SYSNQRA ERP INDUSTRIAL — painel central.
 * Todos os números vêm do Supabase da empresa autenticada (RLS por empresa_id).
 * Quando uma tabela não pode ser lida, o painel correspondente fica vazio e a
 * pendência aparece escrita por extenso — nenhum valor é inventado.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, CalendarDays, CheckCircle,
  ClipboardList, Clock, Factory, Gauge, Monitor, RefreshCw
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { erpMenus } from '../config/erpNavigation'
import '../styles/sysnqra-module-premium-20261101.css'

type Machine = { id: string; codigo: string; nome: string; status: string }
type OP = { id: string; numero_op: string | number; produto_id: string | null; maquina_id: string | null; status: string; quantidade_planejada: number | null; quantidade: number | null; created_at: string | null; criado_em?: string | null }
type Product = { id: string; codigo: string | null; nome: string | null }
type Pointing = { id: string; ordem_producao_id: string | null; maquina_id: string | null; quantidade_planejada: number | null; quantidade_boa: number | null; quantidade_refugada: number | null; created_at: string | null; criado_em?: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; inicio_planejado: string; fim_planejado: string; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string }
type Stop = { maquina_id: string | null; inicio: string | null; fim: string | null; status: string | null }
type Equipment = { id: string; codigo: string; descricao: string; status: string; proxima_calibracao: string | null; certificado_validade: string | null }
type RpncRow = { id: string; status: string | null }
type Perfil = { nome: string | null; empresa_id: string | null; nivel_admin: number | null; is_master: boolean | null; perfil: string | null }
type Empresa = { nome_fantasia: string | null; razao_social: string | null }

type Estado = 'carregando' | 'pronto' | 'sem_empresa' | 'erro'
type Leitura<T> = { dados: T[]; erro: string | null }
type Fila = { op: string; posto: string; produto: string; ultimoApontamento: string; situacao: string }
type Dia = { dia: string; previsto: number; realizado: number }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v))
const fmtPct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`

/** Chave de dia no fuso de Brasília (data local), nunca em UTC. */
function diaLocal(valor: string | Date | null | undefined): string {
  if (!valor) return ''
  const d = valor instanceof Date ? valor : new Date(valor)
  if (!Number.isFinite(d.getTime())) return String(valor).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rotuloStatus(value: string) {
  const s = value.toLowerCase()
  if (s.includes('concl')) return 'Concluída'
  if (s.includes('cancel')) return 'Cancelada'
  if (s.includes('paus')) return 'Pausada'
  if (s.includes('exec') || s.includes('produ')) return 'Em produção'
  if (s.includes('liber')) return 'Liberada'
  if (s.includes('planej')) return 'Planejada'
  return value || 'Sem status'
}

const RPNC_FECHADAS = new Set(['encerrada', 'fechada', 'concluida', 'concluido', 'fechado', 'cancelada', 'cancelado'])
const EQUIP_INVALIDO = new Set(['vencido', 'bloqueado', 'inativo', 'reprovado', 'fora de uso'])
const semAcento = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
/** Lê uma tabela sem derrubar o painel inteiro: falha vira pendência declarada na tela. */
async function ler<T>(promise: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<Leitura<T>> {
  try {
    const res = await promise
    if (res.error) return { dados: [], erro: res.error.message }
    return { dados: (res.data ?? []) as T[], erro: null }
  } catch (cause) {
    return { dados: [], erro: cause instanceof Error ? cause.message : 'falha de rede' }
  }
}

/** Cartões de abertura: um por módulo do catálogo oficial, ignorando a própria "Principal". */
const modulosAbertura = erpMenus
  .filter(item => item.label !== 'Principal' && item.route !== '/pageprincipal')
  .map(item => ({
    label: item.label,
    route: item.route,
    icon: item.icon ?? Factory,
    telas: (item.children?.length ?? 0) + 1,
    atualizada: Boolean(item.isUpdated || item.children?.some(child => child.isUpdated)),
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

export default function DashboardPrincipal() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState('')
  const [pendencias, setPendencias] = useState<string[]>([])
  const [agora, setAgora] = useState(() => new Date())
  const [identidade, setIdentidade] = useState<{ empresa: string; usuario: string; nivel: string }>({ empresa: '—', usuario: '—', nivel: '—' })

  const [machines, setMachines] = useState<Machine[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pointings, setPointings] = useState<Pointing[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [rpncRows, setRpncRows] = useState<RpncRow[]>([])

  useEffect(() => {
    // Tick de 30 s: o relógio é informativo e não deve redesenhar os gráficos a cada segundo.
    const timer = window.setInterval(() => setAgora(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function carregar() {
    setEstado('carregando')
    setErro('')
    setPendencias([])
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!auth.user) throw new Error('Sessão não encontrada. Entre novamente para carregar o painel.')

      const perfilRes = await supabase
        .from('erp_usuarios')
        .select('nome,empresa_id,nivel_admin,is_master,perfil,auth_user_id')
        .eq('auth_user_id', auth.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (perfilRes.error) throw perfilRes.error
      const p = perfilRes.data as Perfil | null
      if (!p) throw new Error('Perfil ERP não encontrado para este login.')

      const master = p.is_master === true && Number(p.nivel_admin ?? 0) === 100 && String(p.perfil ?? '').toUpperCase() === 'MASTER' && p.empresa_id === null
      if (!master && !p.empresa_id) {
        setEstado('sem_empresa')
        return
      }
      const empresaId = master ? null : (p.empresa_id as string)

      setIdentidade({
        empresa: '—',
        usuario: p.nome?.trim() || auth.user.email?.split('@')[0] || 'Operador',
        nivel: master ? 'Master' : `Nível ${Number(p.nivel_admin ?? 0)}`,
      })

      const machineQ = supabase.from('erp_maquinas').select('id,codigo,nome,status').eq('ativo', true).order('codigo')
      const opQ = supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,quantidade_planejada,quantidade,created_at,criado_em').order('created_at', { ascending: false }).limit(500)
      const prodQ = supabase.from('erp_produtos').select('id,codigo,nome').limit(3000)
      const pointingQ = supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,created_at').order('created_at', { ascending: false }).limit(5000)
      const programQ = supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status').neq('status', 'cancelada').limit(3000)
      const stopQ = supabase.from('erp_producao_paradas').select('maquina_id,inicio,fim,status').limit(5000)
      const rpncQ = supabase.from('erp_rpnc').select('id,status').limit(5000)
      const equipmentQ = supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,status,proxima_calibracao,certificado_validade').limit(3000)

      if (empresaId) {
        machineQ.eq('empresa_id', empresaId)
        opQ.eq('empresa_id', empresaId)
        prodQ.eq('empresa_id', empresaId)
        pointingQ.eq('empresa_id', empresaId)
        programQ.eq('empresa_id', empresaId)
        stopQ.eq('empresa_id', empresaId)
        rpncQ.eq('empresa_id', empresaId)
        equipmentQ.eq('empresa_id', empresaId)
      }

      const [m, o, pr, pt, pg, st, rn, eq, nomeEmpresa] = await Promise.all([
        ler<Machine>(machineQ),
        ler<OP>(opQ),
        ler<Product>(prodQ),
        ler<Pointing>(pointingQ),
        ler<Program>(programQ),
        ler<Stop>(stopQ),
        ler<RpncRow>(rpncQ),
        ler<Equipment>(equipmentQ),
        empresaId
          ? supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', empresaId).maybeSingle().then(r => ({ dados: r.data as Empresa | null, erro: r.error?.message ?? null }))
          : Promise.resolve({ dados: null as Empresa | null, erro: null as string | null }),
      ])

      const avisos: string[] = []
      if (m.erro) avisos.push(`Sem leitura de erp_maquinas (${m.erro}): eficiência por máquina e a identificação dos postos ficam vazias.`)
      if (o.erro) avisos.push(`Sem leitura de erp_ordens_producao (${o.erro}): ordens abertas, distribuição por status e a fila operacional não puderam ser montadas.`)
      if (pr.erro) avisos.push(`Sem leitura de erp_produtos (${pr.erro}): a fila mostra as OPs sem o nome do produto.`)
      if (pt.erro) avisos.push(`Sem leitura de erp_apontamentos_processo (${pt.erro}): produção do dia, eficiência e último apontamento não puderam ser calculados.`)
      if (pg.erro) avisos.push(`Sem leitura de erp_pcp_programacoes (${pg.erro}): previsto × realizado, peças no prazo e disponibilidade do OEE não puderam ser calculados.`)
      if (st.erro) avisos.push(`Sem leitura de erp_producao_paradas (${st.erro}): as horas paradas entram como zero na disponibilidade do OEE.`)
      if (rn.erro) avisos.push(`Sem leitura de erp_rpnc (${rn.erro}): o painel de não conformidades fica vazio.`)
      if (eq.erro) avisos.push(`Sem leitura de erp_equipamentos_medicao (${eq.erro}): a situação da metrologia não pôde ser verificada.`)
      if (nomeEmpresa.erro || !nomeEmpresa.dados) avisos.push('Sem leitura do nome da empresa em erp_empresas: o cabeçalho fica genérico.')

      setMachines(m.dados)
      setOps(o.dados)
      setProducts(pr.dados)
      setPointings(pt.dados)
      setPrograms(pg.dados)
      setStops(st.dados)
      setRpncRows(rn.dados)
      setEquipment(eq.dados)
      setIdentidade(atual => ({
        ...atual,
        empresa: nomeEmpresa.dados?.nome_fantasia?.trim() || nomeEmpresa.dados?.razao_social?.trim() || (empresaId ? 'Empresa sem nome cadastrado' : 'Master — todas as empresas'),
      }))
      setPendencias(avisos)
      setEstado('pronto')
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível carregar o painel.')
      setEstado('erro')
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  const hoje = diaLocal(agora)

  const metricas = useMemo(() => {
    const active = ops.filter(op => !['concluida', 'concluído', 'cancelada', 'cancelado'].includes(String(op.status).toLowerCase()))
    const doDia = pointings.filter(pt => diaLocal(pt.criado_em ?? pt.created_at) === hoje)
    const produzidoDia = doDia.reduce((s, pt) => s + n(pt.quantidade_boa) + n(pt.quantidade_refugada), 0)
    const planejado = pointings.reduce((s, pt) => s + n(pt.quantidade_planejada), 0)
    const boas = pointings.reduce((s, pt) => s + n(pt.quantidade_boa), 0)
    const refugo = pointings.reduce((s, pt) => s + n(pt.quantidade_refugada), 0)
    const performance = planejado > 0 ? Math.min(100, (boas / planejado) * 100) : null
    const qualidade = boas + refugo > 0 ? (boas / (boas + refugo)) * 100 : null

    const horasPlanejadas = programs.reduce((s, pg) => s + Math.max(0, (new Date(pg.fim_planejado).getTime() - new Date(pg.inicio_planejado).getTime()) / 3_600_000), 0)
    const horasParadas = stops.reduce((s, st) => {
      if (!st.inicio || !st.fim) return s
      return s + Math.max(0, (new Date(st.fim).getTime() - new Date(st.inicio).getTime()) / 3_600_000)
    }, 0)
    const disponibilidade = horasPlanejadas > 0 ? Math.max(0, Math.min(100, ((horasPlanejadas - Math.min(horasParadas, horasPlanejadas)) / horasPlanejadas) * 100)) : null
    const oee = performance !== null && qualidade !== null && disponibilidade !== null
      ? (performance * qualidade * disponibilidade) / 10_000
      : null

    const atraso = programs.reduce((sum, pg) => {
      const vence = new Date(pg.fim_planejado).getTime()
      const restante = Math.max(0, n(pg.quantidade_planejada) - n(pg.quantidade_produzida))
      return vence < agora.getTime() && restante > 0 ? sum + restante : sum
    }, 0)
    const noPrazo = programs.reduce((sum, pg) => {
      const vence = new Date(pg.fim_planejado).getTime()
      const restante = Math.max(0, n(pg.quantidade_planejada) - n(pg.quantidade_produzida))
      return vence >= agora.getTime() && restante > 0 ? sum + restante : sum
    }, 0)

    const rpncAbertas = rpncRows.filter(rn => !RPNC_FECHADAS.has(semAcento(String(rn.status ?? '')))).length
    const rpncFechadas = rpncRows.length - rpncAbertas

    let validos = 0
    let vencidos = 0
    let semValidade = 0
    for (const item of equipment) {
      const datas = [item.proxima_calibracao, item.certificado_validade].filter((d): d is string => Boolean(d))
      if (EQUIP_INVALIDO.has(semAcento(String(item.status ?? ''))) || datas.some(d => d.slice(0, 10) < hoje)) vencidos++
      else if (datas.length > 0 && datas.every(d => d.slice(0, 10) >= hoje)) validos++
      else semValidade++
    }

    return {
      opAtivas: active,
      produzidoDia,
      oee,
      performance,
      qualidade,
      boas,
      planejado,
      refugo,
      disponibilidade,
      horasParadas,
      atraso,
      noPrazo,
      rpncAbertas,
      rpncFechadas,
      validos,
      vencidos,
      semValidade,
      semBaseProducao: pointings.length === 0,
      semBaseProgramacao: programs.length === 0,
    }
  }, [ops, pointings, programs, stops, rpncRows, equipment, hoje, agora])

  const eficienciaPorMaquina = useMemo(() => machines.map(machine => {
    const linhas = pointings.filter(pt => pt.maquina_id === machine.id)
    const planejado = linhas.reduce((s, pt) => s + n(pt.quantidade_planejada), 0)
    const boas = linhas.reduce((s, pt) => s + n(pt.quantidade_boa), 0)
    return { maquina: machine.codigo, eficiencia: planejado > 0 ? Math.min(100, (boas / planejado) * 100) : 0 }
  }).filter(x => x.eficiencia > 0).sort((a, b) => b.eficiencia - a.eficiencia).slice(0, 12), [machines, pointings])

  const semana = useMemo<Dia[]>(() => {
    const dias: Dia[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(agora)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const chave = diaLocal(d)
      const previsto = programs.filter(pg => diaLocal(pg.inicio_planejado) === chave).reduce((s, pg) => s + n(pg.quantidade_planejada), 0)
      const realizado = pointings.filter(pt => diaLocal(pt.criado_em ?? pt.created_at) === chave).reduce((s, pt) => s + n(pt.quantidade_boa) + n(pt.quantidade_refugada), 0)
      dias.push({ dia: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), previsto, realizado })
    }
    return dias
  }, [agora, programs, pointings])

  const paradasPorDia = useMemo(() => {
    const porDia = new Map<string, number>()
    for (const st of stops) {
      if (!st.inicio || !st.fim) continue
      const chave = diaLocal(st.inicio)
      const horas = Math.max(0, (new Date(st.fim).getTime() - new Date(st.inicio).getTime()) / 3_600_000)
      porDia.set(chave, (porDia.get(chave) ?? 0) + horas)
    }
    return Array.from(porDia.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([chave, horas]) => ({ dia: new Date(`${chave}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), horas: Number(horas.toFixed(1)) }))
  }, [stops])

  const distribuicaoStatus = useMemo(() => {
    const contagem = new Map<string, number>()
    for (const op of ops) {
      const rotulo = rotuloStatus(op.status)
      contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1)
    }
    return Array.from(contagem.entries())
      .map(([status, quantidade]) => ({ status, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
  }, [ops])

  const fila = useMemo<Fila[]>(() => {
    const porProduto = new Map(products.map(pr => [pr.id, pr]))
    const porMaquina = new Map(machines.map(ma => [ma.id, ma]))
    return metricas.opAtivas.slice(0, 10).map(op => {
      const linhas = pointings.filter(pt => pt.ordem_producao_id === op.id)
      const ultima = linhas.reduce<Pointing | null>((acc, pt) => {
        const atual = String(pt.created_at ?? '')
        return !acc || atual > String(acc.created_at ?? '') ? pt : acc
      }, null)
      const maquina = porMaquina.get(op.maquina_id ?? '')
      const produto = porProduto.get(op.produto_id ?? '')
      return {
        op: `OP-${op.numero_op}`,
        posto: maquina ? `${maquina.codigo} · ${maquina.nome}` : 'Posto não definido',
        produto: produto ? [produto.codigo, produto.nome].filter(Boolean).join(' · ') : 'Produto não informado',
        ultimoApontamento: ultima?.created_at ? new Date(ultima.created_at).toLocaleString('pt-BR') : 'Sem apontamento',
        situacao: rotuloStatus(op.status),
      }
    })
  }, [metricas.opAtivas, pointings, products, machines])

  const kpis = [
    {
      label: 'OPs em andamento', value: fmt(metricas.opAtivas.length), unit: 'un',
      tone: 'info' as const, icon: Activity,
      hint: ops.length === 0 ? 'nenhuma ordem de produção lida nesta base' : `${fmt(ops.length)} ordens no período carregado`,
    },
    {
      label: 'Produção do dia', value: fmt(metricas.produzidoDia), unit: 'un',
      tone: 'success' as const, icon: CheckCircle,
      hint: metricas.semBaseProducao ? 'sem apontamentos de produção nesta base' : `${fmt(metricas.boas)} peças boas no total apurado`,
    },
    {
      label: 'OEE combinado', value: metricas.oee === null ? '—' : fmtPct(metricas.oee), unit: '',
      tone: 'warning' as const, icon: Gauge,
      hint: metricas.oee === null
        ? 'requer apontamentos, programação e paradas nas três tabelas'
        : `desempenho ${fmtPct(metricas.performance ?? 0)} · qualidade ${fmtPct(metricas.qualidade ?? 0)} · disponibilidade ${fmtPct(metricas.disponibilidade ?? 0)}`,
    },
    {
      label: 'RPNC abertas', value: fmt(metricas.rpncAbertas), unit: '',
      tone: 'danger' as const, icon: AlertTriangle,
      hint: rpncRows.length === 0 ? 'sem não conformidades registradas nesta base' : `${fmt(metricas.rpncFechadas)} encerradas ou canceladas`,
    },
  ]

  const atencao = [
    { label: 'Peças em atraso', valor: metricas.semBaseProgramacao ? '—' : `${fmt(metricas.atraso)} un`, tom: 'danger' as const, rotulo: 'crítico' },
    { label: 'Peças com prazo a vencer', valor: metricas.semBaseProgramacao ? '—' : `${fmt(metricas.noPrazo)} un`, tom: 'success' as const, rotulo: 'normal' },
    { label: 'Instrumentos válidos', valor: equipment.length === 0 ? '—' : `${fmt(metricas.validos)} un`, tom: 'success' as const, rotulo: 'normal' },
    { label: 'Instrumentos vencidos ou bloqueados', valor: equipment.length === 0 ? '—' : `${fmt(metricas.vencidos)} un`, tom: 'warning' as const, rotulo: 'atenção' },
  ]

  const dataExtenso = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="smp-shell smp-shell--solo">
      <div className="smp-body">
        <section className="smp-topbar">
          <div className="smp-topbar-spacer" />
          <div className="smp-topbar-meta"><CalendarDays size={15} aria-hidden />{dataExtenso}</div>
          <div className="smp-topbar-meta"><Clock size={15} aria-hidden /><strong>{hora}</strong></div>
          <div className="smp-unit"><Factory size={15} aria-hidden />{identidade.empresa}</div>
          <div className="smp-unit">{identidade.usuario} · {identidade.nivel}</div>
          <button type="button" className="smp-btn" onClick={() => void carregar()} disabled={estado === 'carregando'}>
            <RefreshCw size={15} aria-hidden /> Atualizar
          </button>
        </section>

        {estado === 'erro' && (
          <section className="smp-panel">
            <div className="smp-state smp-state--error">
              <AlertTriangle size={26} aria-hidden />
              <strong>Não foi possível abrir o painel</strong>
              <p>{erro}</p>
              <button type="button" className="smp-btn" onClick={() => void carregar()}>Tentar novamente</button>
            </div>
          </section>
        )}

        {estado === 'sem_empresa' && (
          <section className="smp-panel">
            <div className="smp-state">
              <Factory size={26} aria-hidden />
              <strong>Esta sessão não está vinculada a uma empresa</strong>
              <p>O painel lê somente os dados da empresa do usuário autenticado. Vincule a empresa no cadastro do usuário para que os indicadores apareçam.</p>
            </div>
          </section>
        )}

        {estado === 'carregando' && (
          <section className="smp-panel"><div className="smp-skeleton"><i /><i style={{ width: '72%' }} /><i style={{ width: '48%' }} /></div></section>
        )}

        {estado === 'pronto' && pendencias.length > 0 && (
          <div className="smp-note">
            <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
            <div>
              <strong>O que esta base ainda não permitiu ler:</strong>
              <ul style={{ margin: '5px 0 0', paddingLeft: 16, lineHeight: 1.6 }}>
                {pendencias.map(texto => <li key={texto}>{texto}</li>)}
              </ul>
            </div>
          </div>
        )}

        {estado === 'pronto' && (
          <>
            <div className="smp-kpis">
              {kpis.map(card => {
                const Icon = card.icon
                return (
                  <article className="smp-kpi" key={card.label} data-tone={card.tone}>
                    <span className="smp-kpi-icon"><Icon size={19} aria-hidden /></span>
                    <div className="smp-kpi-main">
                      <span className="smp-kpi-label">{card.label}</span>
                      <strong className="smp-kpi-value">{card.value}{card.unit && <span className="smp-kpi-unit">{card.unit}</span>}</strong>
                      <div className="smp-kpi-foot"><span className="smp-kpi-hint">{card.hint}</span></div>
                    </div>
                  </article>
                )
              })}
            </div>

            <section className="smp-panel">
              <div className="smp-panel-head">
                <ClipboardList size={18} aria-hidden />
                <div>
                  <h2 className="smp-panel-title">Módulos do sistema</h2>
                  <p className="smp-panel-sub">{modulosAbertura.length} módulos abertos · o selo “Atualizado” só aparece em tela com evidência validada</p>
                </div>
                <div className="smp-panel-actions">
                  <button type="button" className="smp-btn smp-btn--primary" onClick={() => navigate('/pageprincipal/chao-de-fabrica/portal-operador')}>
                    <Monitor size={15} aria-hidden /> Portal do Operador
                  </button>
                </div>
              </div>
              <div className="smp-panel-body">
                <div className="smp-tiles">
                  {modulosAbertura.map(modulo => {
                    const Icon = modulo.icon
                    return (
                      <button type="button" key={modulo.route} className="smp-tile" onClick={() => navigate(modulo.route)}>
                        <span className="smp-tile-icon"><Icon size={18} aria-hidden /></span>
                        <span className="smp-tile-main">
                          <strong>{modulo.label}</strong>
                          <span>{modulo.telas} {modulo.telas === 1 ? 'tela' : 'telas'} no módulo</span>
                        </span>
                        {modulo.atualizada && <span className="smp-chip" data-tone="success"><i />Atualizado</span>}
                        <ArrowUpRight className="smp-tile-go" size={16} aria-hidden />
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <div className="smp-grid">
              <div className="smp-col">
                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <Gauge size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Eficiência por máquina</h2>
                      <p className="smp-panel-sub">Peças boas sobre peças planejadas, pelo total de apontamentos carregados</p>
                    </div>
                  </div>
                  {eficienciaPorMaquina.length > 0 ? (
                    <div style={{ height: 260, padding: 14 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eficienciaPorMaquina} barCategoryGap="26%">
                          <CartesianGrid stroke="#EEF5F8" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="maquina" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #E1EBF0', fontSize: 12 }} formatter={(v: number) => fmtPct(v)} />
                          <Bar dataKey="eficiencia" name="Eficiência" fill="#2D8DB8" radius={[3, 3, 0, 0]} maxBarSize={34} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="smp-state">
                      <BarChart3 size={24} aria-hidden />
                      <strong>Sem apontamentos que sustentem a eficiência</strong>
                      <p>O indicador só aparece quando há apontamentos de produção vinculados às máquinas desta empresa.</p>
                    </div>
                  )}
                </section>

                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <Activity size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Previsto × realizado · 7 dias</h2>
                      <p className="smp-panel-sub">Programação de PCP contra apontamentos de chão de fábrica</p>
                    </div>
                  </div>
                  {semana.some(d => d.previsto > 0 || d.realizado > 0) ? (
                    <div style={{ height: 250, padding: 14 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={semana}>
                          <CartesianGrid stroke="#EEF5F8" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #E1EBF0', fontSize: 12 }} />
                          <Legend verticalAlign="top" height={22} wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#9DB4BF" strokeWidth={2} strokeDasharray="6 5" dot={false} />
                          <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#2D8DB8" strokeWidth={3} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="smp-state">
                      <CalendarDays size={24} aria-hidden />
                      <strong>Nenhum lançamento nos últimos sete dias</strong>
                      <p>Sem programação de PCP e sem apontamento de produção nestes dias, não há curva a desenhar.</p>
                    </div>
                  )}
                </section>

                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <ClipboardList size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Fila operacional</h2>
                      <p className="smp-panel-sub">{fila.length} ordem(ns) de produção em aberto, das {fmt(ops.length)} carregadas</p>
                    </div>
                  </div>
                  {fila.length > 0 ? (
                    <div className="smp-tablewrap">
                      <table className="smp-table">
                        <thead>
                          <tr>
                            <th>OP</th><th>Posto</th><th>Produto</th><th>Último apontamento</th><th>Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fila.map(linha => (
                            <tr key={linha.op}>
                              <td className="is-strong is-nowrap">{linha.op}</td>
                              <td className="is-nowrap">{linha.posto}</td>
                              <td>{linha.produto}</td>
                              <td className="is-muted is-nowrap">{linha.ultimoApontamento}</td>
                              <td className="is-nowrap"><span className="smp-chip"><i />{linha.situacao}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="smp-state">
                      <CheckCircle size={24} aria-hidden />
                      <strong>Nenhuma ordem de produção em aberto</strong>
                      <p>Todas as ordens carregadas estão concluídas ou canceladas — ou a tabela de ordens não pôde ser lida.</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="smp-col smp-side-group">
                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <AlertTriangle size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Atenção operacional</h2>
                      <p className="smp-panel-sub">Traço significa que a base não forneceu o dado, não que o valor seja zero</p>
                    </div>
                  </div>
                  <div className="smp-panel-body">
                    <div className="smp-legend-list">
                      {atencao.map(item => (
                        <div key={item.label}>
                          <i style={{ background: item.tom === 'danger' ? 'var(--smp-danger)' : item.tom === 'warning' ? 'var(--smp-warning)' : 'var(--smp-success)' }} />
                          <span>{item.label}</span>
                          <b>{item.valor}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <BarChart3 size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Ordens por situação</h2>
                      <p className="smp-panel-sub">Distribuição das OPs carregadas do período</p>
                    </div>
                  </div>
                  <div className="smp-panel-body">
                    {distribuicaoStatus.length > 0 ? (
                      <div className="smp-legend-list">
                        {distribuicaoStatus.map(item => (
                          <div key={item.status}>
                            <i style={{ background: 'var(--smp-blue)' }} />
                            <span>{item.status}</span>
                            <b>{fmt(item.quantidade)}</b>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="smp-state" style={{ padding: '18px 8px' }}>
                        <strong>Sem ordens de produção para distribuir</strong>
                        <p>A tabela erp_ordens_producao não devolveu registros desta empresa.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <Activity size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Horas paradas por dia</h2>
                      <p className="smp-panel-sub">Registro de paradas de chão de fábrica, últimos dias com evento</p>
                    </div>
                  </div>
                  {paradasPorDia.length > 0 ? (
                    <div style={{ height: 190, padding: 12 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paradasPorDia} barCategoryGap="30%">
                          <CartesianGrid stroke="#EEF5F8" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <YAxis unit="h" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#617985' }} />
                          <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #E1EBF0', fontSize: 12 }} formatter={(v: number) => `${v} h`} />
                          <Bar dataKey="horas" name="Parada" fill="#D65B61" radius={[3, 3, 0, 0]} maxBarSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="smp-state">
                      <Activity size={24} aria-hidden />
                      <strong>Nenhuma parada registrada</strong>
                      <p>As paradas aparecem quando o chão de fábrica abre e fecha evento em erp_producao_paradas.</p>
                    </div>
                  )}
                </section>

                <section className="smp-panel">
                  <div className="smp-panel-head">
                    <CheckCircle size={18} aria-hidden />
                    <div>
                      <h2 className="smp-panel-title">Não conformidades</h2>
                      <p className="smp-panel-sub">RPNC da qualidade nesta empresa</p>
                    </div>
                  </div>
                  <div className="smp-panel-body">
                    <div className="smp-legend-list">
                      <div><i style={{ background: 'var(--smp-danger)' }} /><span>Abertas</span><b>{fmt(metricas.rpncAbertas)}</b></div>
                      <div><i style={{ background: 'var(--smp-success)' }} /><span>Encerradas ou canceladas</span><b>{fmt(metricas.rpncFechadas)}</b></div>
                      <div><i style={{ background: '#9DB4BF' }} /><span>Instrumentos sem validade cadastrada</span><b>{fmt(metricas.semValidade)}</b></div>
                    </div>
                    {metricas.semValidade > 0 && (
                      <p style={{ margin: '10px 0 0', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 700, lineHeight: 1.5 }}>
                        Instrumentos sem data de calibração não entram como válidos nem como vencidos.
                      </p>
                    )}
                    <div className="smp-panel-actions" style={{ marginLeft: 0, marginTop: 12 }}>
                      <button type="button" className="smp-btn" onClick={() => navigate('/pageprincipal/qualidade/rpnc')}>Abrir RPNC</button>
                      <button type="button" className="smp-btn" onClick={() => navigate('/pageprincipal/paquimetro')}>Paquímetro digital</button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
