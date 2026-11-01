/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-MODULO-PREMIUM-20261101-01 — Dashboard do PCP no padrão visual aprovado
 * @STATUS_APROVACAO: APLICACAO A TODOS OS MODULOS AUTORIZADA PELO PROPRIETARIO EM 2026-11-01
 *
 * Painel de planejamento e controle da produção do tenant autenticado. Toda
 * métrica vem de erp_ordens_producao, erp_pcp_programacoes,
 * erp_apontamentos_processo e erp_producao_paradas; onde a base não tem o
 * número, a tela mostra traço em vez de estimar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Factory,
  Filter,
  Gauge,
  Minus,
  Package,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ModuleWorkspace from '../components/layout/ModuleRail'
import { moduleNavs } from '../config/moduleNav'

type View = 'dia' | 'semana' | 'mes'

type Maquina = { id: string; codigo: string | null; nome: string | null; status: string | null; ativo: boolean }
type Produto = { id: string; codigo: string | null; nome: string | null }
type Ordem = {
  id: string
  numero_op: string | number | null
  produto_id: string | null
  maquina_id: string | null
  status: string | null
  quantidade: number | null
  quantidade_planejada?: number | null
  quantidade_produzida?: number | null
  data_prevista?: string | null
  prioridade?: string | null
  created_at: string | null
}
type Programacao = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  produto_id: string | null
  inicio_planejado: string | null
  fim_planejado: string | null
  quantidade_planejada: number | null
  quantidade_produzida: number | null
  quantidade_refugada: number | null
  status: string | null
}
type Apontamento = {
  id: string
  ordem_producao_id: string | null
  maquina_id: string | null
  quantidade_planejada: number | null
  quantidade_boa: number | null
  quantidade_refugada: number | null
  inicio_em: string | null
  fim_em: string | null
  motivo_parada: string | null
}
type Parada = { maquina_id: string | null; ordem_producao_id: string | null; motivo: string | null; inicio: string | null; fim: string | null; status: string | null }

const COLUNAS_OP_COMPLETA = 'id,numero_op,produto_id,maquina_id,status,quantidade,quantidade_planejada,quantidade_produzida,data_prevista,prioridade,created_at'
const COLUNAS_OP_MINIMA = 'id,numero_op,produto_id,maquina_id,status,quantidade,created_at'
const COLUNAS_PROGRAMACAO = 'id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status'
const COLUNAS_APONTAMENTO = 'id,ordem_producao_id,maquina_id,quantidade_planejada,quantidade_boa,quantidade_refugada,inicio_em,fim_em,motivo_parada'

const FECHADAS = new Set(['CONCLUIDA', 'CONCLUIDO', 'FINALIZADA', 'FINALIZADO', 'CANCELADA', 'CANCELADO', 'ENCERRADA'])
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const norm = (v: string | null | undefined) => String(v ?? '').trim().toUpperCase().replace(/\s+/g, '_')

function familiaStatus(status: string | null): 'producao' | 'fila' | 'concluida' | 'cancelada' | 'parcial' | 'outra' {
  const s = norm(status)
  if (!s) return 'outra'
  if (FECHADAS.has(s)) return s.includes('CANCEL') ? 'cancelada' : 'concluida'
  if (s.includes('PRODUCAO') || s.includes('ANDAMENTO') || s === 'INICIADA' || s === 'EM_EXECUCAO') return 'producao'
  if (s.includes('PARCIA')) return 'parcial'
  if (s.includes('PENDENTE') || s.includes('FILA') || s.includes('ABERTA') || s.includes('PLANEJ') || s.includes('PROGRAM') || s === 'AGUARDANDO') return 'fila'
  return 'outra'
}

const rotuloStatus: Record<string, string> = {
  producao: 'Em produção', fila: 'Aguardando', concluida: 'Concluída', cancelada: 'Cancelada', parcial: 'Parcial', outra: 'Não classificado',
}

function tipoBloco(p: Programacao, agora: number): 'producao' | 'concluida' | 'planejada' | 'setup' | 'manutencao' | 'atrasada' {
  const s = norm(p.status)
  if (s.includes('MANUTEN')) return 'manutencao'
  if (s.includes('SETUP')) return 'setup'
  const familia_ = familiaStatus(p.status)
  if (familia_ === 'concluida') return 'concluida'
  if (familia_ === 'producao') return 'producao'
  const fim = p.fim_planejado ? Date.parse(p.fim_planejado) : Number.NaN
  if (Number.isFinite(fim) && fim < agora) return 'atrasada'
  return 'planejada'
}

const rotuloBloco: Record<string, string> = {
  producao: 'Em produção', concluida: 'Concluída', planejada: 'Programada', setup: 'Setup', manutencao: 'Manutenção', atrasada: 'Atrasada',
}

/** Os query builders do Supabase são PromiseLike; Promise.resolve devolve um Promise com .catch utilizável. */
function consulta<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.resolve(promise)
}

function inicioDia(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDias(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function addMeses(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function inicioSemana(d: Date) {
  const r = inicioDia(d)
  const dia = r.getDay()
  return addDias(r, dia === 0 ? -6 : 1 - dia)
}

type Janela = { inicio: Date; fim: Date; dias: Date[]; rotulo: string }

function calcularJanela(view: View, offset: number): Janela {
  const hoje = new Date()
  if (view === 'dia') {
    const dia = addDias(inicioDia(hoje), offset)
    return { inicio: dia, fim: addDias(dia, 1), dias: [dia], rotulo: `${DIAS_SEMANA[dia.getDay()]} ${String(dia.getDate()).padStart(2, '0')} ${MESES[dia.getMonth()]}` }
  }
  if (view === 'semana') {
    const inicio = addDias(inicioSemana(hoje), offset * 7)
    const dias = Array.from({ length: 7 }, (_, i) => addDias(inicio, i))
    const fim = dias[dias.length - 1]
    return { inicio, fim: addDias(fim, 1), dias, rotulo: `${String(inicio.getDate()).padStart(2, '0')} ${MESES[inicio.getMonth()]} – ${String(fim.getDate()).padStart(2, '0')} ${MESES[fim.getMonth()]}` }
  }
  const inicio = addMeses(new Date(hoje.getFullYear(), hoje.getMonth(), 1), offset)
  const total = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate()
  const dias = Array.from({ length: total }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), i + 1))
  return { inicio, fim: addDias(dias[dias.length - 1], 1), dias, rotulo: `${MESES[inicio.getMonth()]} de ${inicio.getFullYear()}` }
}

const fmtDataHora = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtHora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const fmtQtd = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('pt-BR').format(v))
const fmtPct = (v: number | null) => (v === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v)}%`)
const rotuloOP = (o: Ordem) => {
  const bruto = String(o.numero_op ?? '').trim()
  if (!bruto) return `OP-${String(o.id).slice(0, 6).toUpperCase()}`
  return /^OP/i.test(bruto) ? bruto.toUpperCase() : `OP-${bruto}`
}

export default function PCPDashboard() {
  const nav = useMemo(() => moduleNavs.find(item => item.key === 'pcp') ?? null, [])
  const [view, setView] = useState<View>('semana')
  const [offset, setOffset] = useState(0)
  const [filtros, setFiltros] = useState({ maquina: 'todas', status: 'todos', produto: 'todos' })
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'sem_empresa' | 'erro'>('carregando')
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])

  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [programacoes, setProgramacoes] = useState<Programacao[]>([])
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([])
  const [paradas, setParadas] = useState<Parada[]>([])
  const [empresa, setEmpresa] = useState<string>('')

  const janela = useMemo(() => calcularJanela(view, offset), [view, offset])

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const carregar = useCallback(async () => {
    setEstado('carregando')
    setErro('')
    setAvisos([])
    try {
      const { data: tenantData, error: tenantErro } = await supabase.rpc('erp_current_empresa_id')
      if (tenantErro) throw tenantErro
      const tenant = typeof tenantData === 'string' ? tenantData : null
      if (!tenant) { setEstado('sem_empresa'); return }

      const desdeISO = addDias(janela.inicio, -1).toISOString()
      const ateISO = addDias(janela.fim, 1).toISOString()

      const [opResposta, produtosResposta, maquinasResposta, programacoesResposta, apontamentosResposta, paradasResposta, empresaResposta] = await Promise.all([
        fetchAllPages<Ordem>((de, ate) => supabase.from('erp_ordens_producao').select(COLUNAS_OP_COMPLETA).eq('empresa_id', tenant).order('created_at', { ascending: false }).range(de, ate))
          .then(dados => ({ dados, completa: true }))
          .catch(async () => {
            try {
              const dados = await fetchAllPages<Ordem>((de, ate) => supabase.from('erp_ordens_producao').select(COLUNAS_OP_MINIMA).eq('empresa_id', tenant).order('created_at', { ascending: false }).range(de, ate))
              return { dados, completa: false }
            } catch {
              return { dados: null, completa: false }
            }
          }),
        fetchAllPages<Produto>((de, ate) => supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', tenant).order('codigo').range(de, ate)).catch(() => null),
        consulta(supabase.from('erp_maquinas').select('id,codigo,nome,status,ativo').eq('empresa_id', tenant).eq('ativo', true).order('codigo').limit(500).then(r => (r.error ? null : ((r.data ?? []) as Maquina[])))).catch(() => null),
        consulta(supabase.from('erp_pcp_programacoes').select(COLUNAS_PROGRAMACAO).eq('empresa_id', tenant).gte('fim_planejado', desdeISO).lte('inicio_planejado', ateISO).order('inicio_planejado').limit(2000).then(r => (r.error ? null : ((r.data ?? []) as Programacao[])))).catch(() => null),
        consulta(supabase.from('erp_apontamentos_processo').select(COLUNAS_APONTAMENTO).eq('empresa_id', tenant).gte('inicio_em', desdeISO).lte('inicio_em', ateISO).order('inicio_em').limit(2000).then(r => (r.error ? null : ((r.data ?? []) as Apontamento[])))).catch(() => null),
        consulta(supabase.from('erp_producao_paradas').select('maquina_id,ordem_producao_id,motivo,inicio,fim,status').eq('empresa_id', tenant).order('inicio', { ascending: false }).limit(400).then(r => (r.error ? null : ((r.data ?? []) as Parada[])))).catch(() => null),
        consulta(supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', tenant).maybeSingle().then(r => r.data as { nome_fantasia: string | null; razao_social: string | null } | null)).catch(() => null),
      ])

      if (opResposta.dados === null && maquinasResposta === null) {
        setEstado('erro')
        setErro('Não foi possível ler as ordens de produção nem as máquinas desta empresa no Supabase. Verifique o acesso RLS do perfil e se a empresa está ativa.')
        return
      }

      const pendencias: string[] = []
      if (!opResposta.completa) pendencias.push('As colunas de quantidade planejada/produzida não estão disponíveis nesta base: a tabela de ordens mostra apenas a quantidade cadastrada.')
      if (produtosResposta === null) pendencias.push('Cadastro de produtos indisponível para esta sessão: as ordens aparecem sem código de produto.')
      if (programacoesResposta === null) pendencias.push('A programação finita (erp_pcp_programacoes) não pôde ser lida: o quadro de programação fica vazio até a rotina de programação ser usada.')
      if (apontamentosResposta === null) pendencias.push('Sem apontamentos de processo no período: eficiência e refugo não podem ser calculados a partir de peças boas.')
      if (paradasResposta === null) pendencias.push('A leitura de paradas exige a permissão producao/ver; sem ela o indicador "Em setup" fica em traço.')

      setOrdens(opResposta.dados ?? [])
      setProdutos(produtosResposta ?? [])
      setMaquinas(maquinasResposta ?? [])
      setProgramacoes(programacoesResposta ?? [])
      setApontamentos(apontamentosResposta ?? [])
      setParadas(paradasResposta ?? [])
      setEmpresa(empresaResposta?.nome_fantasia?.trim() || empresaResposta?.razao_social?.trim() || 'Empresa vinculada')
      setAvisos(pendencias)
      setEstado('pronto')
    } catch (falha) {
      setEstado('erro')
      setErro(falha instanceof Error ? falha.message : 'Falha ao consultar o banco do ERP.')
    }
  }, [janela.inicio, janela.fim])

  useEffect(() => { void carregar() }, [carregar])

  useEffect(() => {
    if (!selecionada) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelecionada(null) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [selecionada])

  const produtoPorId = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos])
  const maquinaPorId = useMemo(() => new Map(maquinas.map(m => [m.id, m])), [maquinas])
  const ordemPorId = useMemo(() => new Map(ordens.map(o => [o.id, o])), [ordens])

  const rotuloMaquina = useCallback((id: string | null) => {
    if (!id) return 'Sem máquina'
    const m = maquinaPorId.get(id)
    if (!m) return 'Máquina removida'
    return [m.codigo, m.nome].filter(Boolean).join(' | ') || 'Máquina'
  }, [maquinaPorId])

  const programacoesFiltradas = useMemo(() => programacoes.filter(p => {
    if (filtros.maquina !== 'todas' && p.maquina_id !== filtros.maquina) return false
    if (filtros.produto !== 'todas' && p.produto_id !== filtros.produto) return false
    if (filtros.status !== 'todos' && familiaStatus(p.status) !== filtros.status) return false
    return true
  }), [programacoes, filtros])

  const linhasGantt = useMemo(() => {
    const porMaquina = new Map<string, Programacao[]>()
    for (const p of programacoesFiltradas) {
      if (!p.maquina_id) continue
      const lista = porMaquina.get(p.maquina_id) ?? []
      lista.push(p)
      porMaquina.set(p.maquina_id, lista)
    }
    return maquinas.filter(m => porMaquina.has(m.id)).map(maquina => ({
      maquina,
      itens: porMaquina.get(maquina.id) ?? [],
      porDia: janela.dias.map(dia => {
        const inicioDiaAlvo = inicioDia(dia).getTime()
        const fimDiaAlvo = inicioDiaAlvo + 86_400_000
        return (porMaquina.get(maquina.id) ?? [])
          .filter(p => {
            const i = p.inicio_planejado ? Date.parse(p.inicio_planejado) : Number.NaN
            const f = p.fim_planejado ? Date.parse(p.fim_planejado) : Number.NaN
            if (!Number.isFinite(i)) return false
            return i < fimDiaAlvo && (Number.isFinite(f) ? f : i) > inicioDiaAlvo
          })
          .sort((a, b) => Date.parse(a.inicio_planejado ?? '0') - Date.parse(b.inicio_planejado ?? '0'))
      }),
    }))
  }, [maquinas, programacoesFiltradas, janela])

  const ordensFiltradas = useMemo(() => ordens.filter(o => {
    if (filtros.maquina !== 'todas' && o.maquina_id !== filtros.maquina) return false
    if (filtros.produto !== 'todas' && o.produto_id !== filtros.produto) return false
    if (filtros.status !== 'todos' && familiaStatus(o.status) !== filtros.status) return false
    return true
  }), [ordens, filtros])

  const kpis = useMemo(() => {
    const abertas = ordensFiltradas.filter(o => !FECHADAS.has(norm(o.status)))
    const emProducao = abertas.filter(o => familiaStatus(o.status) === 'producao').length
    const naFila = abertas.filter(o => familiaStatus(o.status) === 'fila').length

    let planejado = 0
    let boas = 0
    let refugo = 0
    for (const a of apontamentos) {
      planejado += numero(a.quantidade_planejada) ?? 0
      boas += numero(a.quantidade_boa) ?? 0
      refugo += numero(a.quantidade_refugada) ?? 0
    }
    if (planejado === 0 && boas === 0) {
      for (const p of programacoesFiltradas) {
        planejado += numero(p.quantidade_planejada) ?? 0
        boas += numero(p.quantidade_produzida) ?? 0
        refugo += numero(p.quantidade_refugada) ?? 0
      }
    }
    const eficiencia = planejado > 0 ? (boas / planejado) * 100 : null
    const taxaRefugo = boas + refugo > 0 ? (refugo / (boas + refugo)) * 100 : null

    const paradasAbertas = paradas.filter(p => !p.fim)
    const emSetup = paradasAbertas.filter(p => /setup|prepara/i.test(p.motivo ?? '')).length
    const semParadas = paradas.length === 0 && apontamentos.length === 0

    return {
      abertas: abertas.length,
      emProducao,
      naFila,
      eficiencia,
      boas,
      planejado,
      taxaRefugo,
      refugo,
      emSetup,
      paradasAbertas: paradasAbertas.length,
      semBaseDeTempo: planejado === 0 && boas === 0,
      setupIndisponivel: semParadas,
    }
  }, [apontamentos, ordensFiltradas, paradas, programacoesFiltradas])

  const carga = useMemo(() => {
    const progsPorMaquina = new Map<string, Programacao[]>()
    for (const p of programacoesFiltradas) {
      if (!p.maquina_id) continue
      const lista = progsPorMaquina.get(p.maquina_id) ?? []
      lista.push(p)
      progsPorMaquina.set(p.maquina_id, lista)
    }
    const maquinasParadas = new Set(paradas.filter(p => !p.fim && p.maquina_id).map(p => p.maquina_id as string))
    let producao = 0
    let programada = 0
    let parada = 0
    let ociosa = 0
    for (const m of maquinas) {
      const lista = progsPorMaquina.get(m.id) ?? []
      if (maquinasParadas.has(m.id)) parada += 1
      else if (lista.some(p => ['producao', 'concluida'].includes(tipoBloco(p, agora)))) producao += 1
      else if (lista.length > 0) programada += 1
      else ociosa += 1
    }
    const total = maquinas.length
    const fatias = [
      { rotulo: 'Em produção', valor: producao, cor: 'var(--smp-blue)' },
      { rotulo: 'Programada', valor: programada, cor: 'var(--smp-planned)' },
      { rotulo: 'Parada', valor: parada, cor: 'var(--smp-danger)' },
      { rotulo: 'Manutenção', valor: 0, cor: '#9DB4BF' },
      { rotulo: 'Ociosa', valor: ociosa, cor: '#DCE7EC' },
    ].filter(f => f.valor > 0)
    let acumulado = 0
    const gradiente = fatias.map(f => {
      const inicio = acumulado
      const fim = total > 0 ? acumulado + (f.valor / total) * 100 : 0
      acumulado = fim
      return `${f.cor} ${inicio.toFixed(2)}% ${fim.toFixed(2)}%`
    }).join(', ')
    return { total, fatias, gradiente, ocupadas: total > 0 ? Math.round(((producao + programada) / total) * 100) : null }
  }, [agora, maquinas, paradas, programacoesFiltradas])

  const eventos = useMemo(() => {
    const proximos: { hora: string; quando: number; rotulo: string; maquina: string; cor: string }[] = []
    for (const p of programacoesFiltradas) {
      if (!p.inicio_planejado) continue
      const quando = Date.parse(p.inicio_planejado)
      if (!Number.isFinite(quando) || quando < agora) continue
      const op = p.ordem_producao_id ? ordemPorId.get(p.ordem_producao_id) : null
      const tipo = tipoBloco(p, agora)
      proximos.push({
        hora: fmtHora(new Date(quando)),
        quando,
        rotulo: `${rotuloBloco[tipo]}${op ? ` ${rotuloOP(op)}` : ''}`,
        maquina: p.maquina_id ? (maquinaPorId.get(p.maquina_id)?.codigo ?? '—') : '—',
        cor: tipo === 'manutencao' ? '#9DB4BF' : tipo === 'setup' ? '#C9D6DC' : tipo === 'concluida' ? 'var(--smp-success)' : tipo === 'planejada' ? 'var(--smp-planned)' : 'var(--smp-blue)',
      })
    }
    for (const p of paradas.filter(x => !x.fim)) {
      const quando = p.inicio ? Date.parse(p.inicio) : Number.NaN
      proximos.push({
        hora: Number.isFinite(quando) ? fmtHora(new Date(quando)) : '--:--',
        quando: Number.isFinite(quando) ? quando : agora,
        rotulo: `Parada: ${p.motivo ?? 'sem motivo informado'}`,
        maquina: p.maquina_id ? (maquinaPorId.get(p.maquina_id)?.codigo ?? '—') : '—',
        cor: 'var(--smp-danger)',
      })
    }
    return proximos.sort((a, b) => a.quando - b.quando).slice(0, 6)
  }, [agora, maquinaPorId, ordemPorId, paradas, programacoesFiltradas])

  const detalhe = useMemo(() => {
    if (!selecionada) return null
    const ordem = ordemPorId.get(selecionada)
    if (!ordem) return null
    return {
      ordem,
      produto: ordem.produto_id ? produtoPorId.get(ordem.produto_id) ?? null : null,
      programacoes: programacoes.filter(p => p.ordem_producao_id === ordem.id).sort((a, b) => Date.parse(a.inicio_planejado ?? '0') - Date.parse(b.inicio_planejado ?? '0')),
      apontamentos: apontamentos.filter(a => a.ordem_producao_id === ordem.id).sort((a, b) => Date.parse(b.inicio_em ?? '0') - Date.parse(a.inicio_em ?? '0')),
    }
  }, [apontamentos, ordemPorId, produtoPorId, programacoes, selecionada])

  function exportarOrdens() {
    const cabecalho = ['OP', 'Produto', 'Descricao', 'Quantidade', 'Produzido', 'Maquina', 'Inicio previsto', 'Termino previsto', 'Status']
    const linhas = ordensFiltradas.map(o => {
      const produto = o.produto_id ? produtoPorId.get(o.produto_id) : null
      const programada = programacoes.find(p => p.ordem_producao_id === o.id)
      const inicio = programada?.inicio_planejado ?? o.data_prevista ?? null
      const fim = programada?.fim_planejado ?? o.data_prevista ?? null
      return [
        rotuloOP(o),
        produto ? `${produto.codigo ?? ''} ${produto.nome ?? ''}`.trim() : '',
        produto?.nome ?? '',
        String(numero(o.quantidade_produzida) ?? numero(o.quantidade) ?? 0),
        String(numero(o.quantidade_produzida) ?? 0),
        o.maquina_id ? (maquinaPorId.get(o.maquina_id)?.codigo ?? '') : '',
        inicio ?? '',
        fim ?? '',
        rotuloStatus[familiaStatus(o.status)] ?? o.status ?? '',
      ].map(campo => `"${campo.replace(/"/g, '""')}"`).join(';')
    })
    const csv = [cabecalho.join(';'), ...linhas].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pcp-ordens-${janela.rotulo.replace(/\s+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const agoraDate = new Date(agora)
  const dataExtenso = `${DIAS_SEMANA[agoraDate.getDay()]}, ${String(agoraDate.getDate()).padStart(2, '0')} de ${MESES[agoraDate.getMonth()]} de ${agoraDate.getFullYear()}`

  const kpiCards = [
    {
      label: 'Ordens abertas', value: fmtQtd(kpis.abertas), unit: '', tone: 'info' as const, icon: ClipboardList,
      delta: null, hint: kpis.abertas === 0 ? 'nenhuma ordem em aberto' : `${kpis.emProducao} em produção · ${kpis.naFila} aguardando`,
    },
    {
      label: 'Eficiência', value: kpis.eficiencia === null ? '—' : fmtPct(kpis.eficiencia), unit: '', tone: 'success' as const, icon: Gauge,
      delta: null, hint: kpis.semBaseDeTempo ? 'sem apontamentos no período' : `${fmtQtd(kpis.boas)} peças boas de ${fmtQtd(kpis.planejado)} planejadas`,
    },
    {
      label: 'Refugo', value: kpis.taxaRefugo === null ? '—' : fmtPct(kpis.taxaRefugo), unit: '', tone: 'warning' as const, icon: Trash2,
      delta: null, hint: kpis.refugo === 0 ? 'nenhuma peça refugada apurada' : `${fmtQtd(kpis.refugo)} peças refugadas no período`,
    },
    {
      label: 'Em setup', value: kpis.setupIndisponivel ? '—' : fmtQtd(kpis.emSetup), unit: '', tone: 'neutral' as const, icon: Activity,
      delta: null, hint: kpis.setupIndisponivel ? 'sem leitura de paradas nesta sessão' : `${kpis.paradasAbertas} paradas abertas no total`,
    },
  ]

  return (
    <ModuleWorkspace nav={nav ?? moduleNavs[0]}>
      <section className="smp-topbar">
        <div>
          <strong style={{ display: 'block', fontSize: 15, fontWeight: 900, color: 'var(--smp-ink)' }}>Planejamento e Controle da Produção</strong>
          <span style={{ color: 'var(--smp-muted)', fontSize: 12, fontWeight: 700 }}>Programa, acompanhe e otimize a produção do período selecionado.</span>
        </div>
        <div className="smp-topbar-spacer" />
        <div className="smp-topbar-meta"><CalendarDays size={15} aria-hidden />{dataExtenso}</div>
        <div className="smp-topbar-meta"><Clock size={15} aria-hidden /><strong>{fmtHora(agoraDate)}</strong></div>
        <div className="smp-unit"><Factory size={15} aria-hidden />{empresa}</div>
      </section>

      {avisos.length > 0 && (
        <div className="smp-note">
          <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
          <div>
            <strong>O que ainda não pôde ser lido nesta base:</strong>
            <ul style={{ margin: '5px 0 0', paddingLeft: 16, lineHeight: 1.6 }}>
              {avisos.map(texto => <li key={texto}>{texto}</li>)}
            </ul>
          </div>
        </div>
      )}

      {estado === 'carregando' && (
        <div className="smp-panel"><div className="smp-skeleton"><i /><i style={{ width: '70%' }} /><i style={{ width: '45%' }} /></div></div>
      )}

      {estado === 'sem_empresa' && (
        <div className="smp-panel"><div className="smp-state">
          <Factory size={26} aria-hidden />
          <strong>Esta sessão não está vinculada a uma empresa</strong>
          <p>O PCP opera sobre os dados da empresa do usuário autenticado. Vincule a empresa no cadastro do usuário para carregar o planejamento.</p>
        </div></div>
      )}

      {estado === 'erro' && (
        <div className="smp-panel"><div className="smp-state smp-state--error">
          <AlertTriangle size={26} aria-hidden />
          <strong>Não foi possível ler os dados de produção</strong>
          <p>{erro}</p>
          <button type="button" className="smp-btn" onClick={() => void carregar()}>Tentar novamente</button>
        </div></div>
      )}

      {estado === 'pronto' && (
        <>
          <div className="smp-kpis">
            {kpiCards.map(card => {
              const Icon = card.icon
              return (
                <article className="smp-kpi" key={card.label} data-tone={card.tone}>
                  <span className="smp-kpi-icon"><Icon size={19} aria-hidden /></span>
                  <div className="smp-kpi-main">
                    <span className="smp-kpi-label">{card.label}</span>
                    <strong className="smp-kpi-value">{card.value}{card.unit && <span className="smp-kpi-unit">{card.unit}</span>}</strong>
                    <div className="smp-kpi-foot">
                      {card.delta !== null && (
                        <span className="smp-kpi-delta" data-dir={card.delta > 0 ? 'up' : card.delta < 0 ? 'down' : 'flat'}>
                          {card.delta > 0 ? <ArrowUp size={12} aria-hidden /> : card.delta < 0 ? <ArrowDown size={12} aria-hidden /> : <Minus size={12} aria-hidden />}
                          {Math.abs(card.delta)}
                        </span>
                      )}
                      <span className="smp-kpi-hint">{card.hint}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="smp-grid">
            <div className="smp-col">
              <section className="smp-panel">
                <div className="smp-panel-head">
                  <CalendarDays size={18} aria-hidden />
                  <div>
                    <h2 className="smp-panel-title">Programação da Produção</h2>
                    <p className="smp-panel-sub">{linhasGantt.length} máquina(s) com programação no período · {programacoesFiltradas.length} lançamentos</p>
                  </div>
                  <div className="smp-panel-actions">
                    <div className="smp-pager">
                      <button type="button" className="smp-btn smp-btn--icon" aria-label="Período anterior" onClick={() => setOffset(v => v - 1)}><ChevronLeft size={16} /></button>
                      <strong>{janela.rotulo}</strong>
                      <button type="button" className="smp-btn smp-btn--icon" aria-label="Próximo período" onClick={() => setOffset(v => v + 1)}><ChevronRight size={16} /></button>
                      {offset !== 0 && <button type="button" className="smp-btn smp-btn--ghost" onClick={() => setOffset(0)}>Hoje</button>}
                    </div>
                    <div className="smp-segmented" role="group" aria-label="Visualização do período">
                      {(['dia', 'semana', 'mes'] as View[]).map(v => (
                        <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setOffset(0) }}>{v === 'mes' ? 'Mês' : v === 'dia' ? 'Dia' : 'Semana'}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="smp-panel-body smp-panel-body--flush">
                  {linhasGantt.length === 0 ? (
                    <div className="smp-state">
                      <CalendarDays size={24} aria-hidden />
                      <strong>Nenhuma programação neste período</strong>
                      <p>Os lançamentos de programação finita da empresa autenticada aparecem aqui. Ajuste o período ou os filtros ao lado para ampliar a busca.</p>
                    </div>
                  ) : (
                    <div className="smp-gantt">
                      <div className="smp-gantt-inner" style={{ ['--smp-days' as string]: String(janela.dias.length) }}>
                        <div className="smp-gantt-row smp-gantt-row--head">
                          <span>Máquina</span>
                          <span className="is-num">OPs</span>
                          {janela.dias.map(dia => (
                            <span key={dia.toISOString()} className={inicioDia(dia).getTime() === inicioDia(agoraDate).getTime() ? 'is-today' : undefined}>
                              {view === 'mes' ? String(dia.getDate()) : `${DIAS_SEMANA[dia.getDay()]} ${String(dia.getDate()).padStart(2, '0')}`}
                            </span>
                          ))}
                        </div>
                        {linhasGantt.map(linha => (
                          <div className="smp-gantt-row" key={linha.maquina.id}>
                            <div className="smp-gantt-cell smp-gantt-cell--meta">
                              <strong>{linha.maquina.codigo ?? '—'}</strong>
                              <span>{linha.maquina.nome ?? linha.maquina.status ?? '—'}</span>
                            </div>
                            <div className="smp-gantt-cell smp-gantt-cell--meta smp-gantt-cell--num"><strong>{linha.itens.length}</strong></div>
                            {linha.porDia.map((blocos, indice) => {
                              const dia = janela.dias[indice]
                              const hoje = inicioDia(dia).getTime() === inicioDia(agoraDate).getTime()
                              return (
                                <div className={hoje ? 'smp-gantt-cell is-today' : 'smp-gantt-cell'} key={dia.toISOString()}>
                                  {view === 'dia' ? (
                                    <div className="smp-track">
                                      {blocos.map(bloco => {
                                        const inicio = Date.parse(bloco.inicio_planejado ?? '')
                                        const fimOriginal = Date.parse(bloco.fim_planejado ?? '')
                                        const base = inicioDia(dia).getTime()
                                        const esq = Math.max(0, Math.min(100, ((inicio - base) / 86_400_000) * 100))
                                        const largura = Math.max(3, Math.min(100 - esq, (((Number.isFinite(fimOriginal) ? fimOriginal : inicio + 3_600_000) - inicio) / 86_400_000) * 100))
                                        const op = bloco.ordem_producao_id ? ordemPorId.get(bloco.ordem_producao_id) : null
                                        const produto = bloco.produto_id ? produtoPorId.get(bloco.produto_id) : null
                                        return (
                                          <button type="button" key={bloco.id} className="smp-block" data-kind={tipoBloco(bloco, agora)} style={{ left: `${esq}%`, width: `${largura}%` }}
                                            onClick={() => bloco.ordem_producao_id && setSelecionada(bloco.ordem_producao_id)}>
                                            <strong>{op ? rotuloOP(op) : 'Programação'}</strong>
                                            <span>{produto?.nome ?? fmtHora(new Date(inicio))}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    blocos.map(bloco => {
                                      const op = bloco.ordem_producao_id ? ordemPorId.get(bloco.ordem_producao_id) : null
                                      const produto = bloco.produto_id ? produtoPorId.get(bloco.produto_id) : null
                                      return (
                                        <button type="button" key={bloco.id} className="smp-block" data-kind={tipoBloco(bloco, agora)}
                                          onClick={() => bloco.ordem_producao_id && setSelecionada(bloco.ordem_producao_id)}>
                                          <strong>{op ? rotuloOP(op) : 'Programação'}</strong>
                                          <span>{produto?.nome ?? produto?.codigo ?? rotuloBloco[tipoBloco(bloco, agora)]}</span>
                                        </button>
                                      )
                                    })
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="smp-legend">
                  <span><i />Em produção</span>
                  <span><i style={{ background: 'var(--smp-planned)' }} />Programada</span>
                  <span><i style={{ background: 'var(--smp-success)' }} />Concluída</span>
                  <span><i style={{ background: 'var(--smp-danger)' }} />Atrasada</span>
                  <span><i style={{ background: '#DCE7EC' }} />Setup e manutenção</span>
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <ClipboardList size={18} aria-hidden />
                  <div>
                    <h2 className="smp-panel-title">Ordens de Produção</h2>
                    <p className="smp-panel-sub">{ordensFiltradas.length} de {ordens.length} ordens da empresa</p>
                  </div>
                  <div className="smp-panel-actions">
                    <button type="button" className="smp-btn smp-btn--ghost" onClick={exportarOrdens} disabled={ordensFiltradas.length === 0}>
                      <Download size={15} aria-hidden />Exportar
                    </button>
                  </div>
                </div>
                <div className="smp-panel-body smp-panel-body--flush">
                  {ordensFiltradas.length === 0 ? (
                    <div className="smp-state">
                      <Package size={24} aria-hidden />
                      <strong>Nenhuma ordem com os filtros atuais</strong>
                      <p>Limpe os filtros da coluna lateral para ver todas as ordens cadastradas para esta empresa.</p>
                    </div>
                  ) : (
                    <div className="smp-tablewrap">
                      <table className="smp-table">
                        <thead>
                          <tr>
                            <th>OP</th><th>Produto</th><th className="is-num">Quantidade</th><th className="is-num">Produzido</th>
                            <th>Máquina</th><th className="is-nowrap">Início previsto</th><th className="is-nowrap">Término previsto</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordensFiltradas.slice(0, 60).map(o => {
                            const produto = o.produto_id ? produtoPorId.get(o.produto_id) : null
                            const programada = programacoes.find(p => p.ordem_producao_id === o.id)
                            const planejada = numero(o.quantidade_planejada) ?? numero(o.quantidade) ?? 0
                            const produzida = numero(o.quantidade_produzida) ?? 0
                            const avanço = planejada > 0 ? Math.min(100, (produzida / planejada) * 100) : null
                            const familia = familiaStatus(o.status)
                            return (
                              <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelecionada(o.id)}>
                                <td className="is-link">{rotuloOP(o)}</td>
                                <td>
                                  <span className="is-strong">{produto?.codigo ?? '—'}</span>
                                  <span className="is-muted" style={{ display: 'block', fontWeight: 600 }}>{produto?.nome ?? 'Produto não identificado'}</span>
                                </td>
                                <td className="is-num">{fmtQtd(planejada)}</td>
                                <td className="is-num">
                                  {fmtQtd(produzida)}
                                  {avanço !== null && <span className="smp-bar"><i style={{ width: `${avanço}%` }} /></span>}
                                </td>
                                <td className="is-muted">{o.maquina_id ? (maquinaPorId.get(o.maquina_id)?.codigo ?? '—') : '—'}</td>
                                <td className="is-nowrap">{fmtDataHora(programada?.inicio_planejado ?? (o.data_prevista ? `${o.data_prevista}T00:00:00` : null))}</td>
                                <td className="is-nowrap">{fmtDataHora(programada?.fim_planejado ?? null)}</td>
                                <td><span className="smp-chip" data-tone={familia === 'producao' ? 'info' : familia === 'concluida' ? 'success' : familia === 'cancelada' ? 'danger' : familia === 'parcial' ? 'warning' : 'neutral'}><i />{rotuloStatus[familia]}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {ordensFiltradas.length > 60 && (
                        <p style={{ margin: 0, padding: '10px 14px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 700 }}>
                          Exibindo as 60 ordens mais recentes de {ordensFiltradas.length}. Use os filtros para reduzir a lista.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="smp-col smp-side-group">
              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Filter size={18} aria-hidden />
                  <h2 className="smp-panel-title">Filtros</h2>
                  <div className="smp-panel-actions">
                    <button type="button" className="smp-btn smp-btn--ghost" onClick={() => setFiltros({ maquina: 'todas', status: 'todos', produto: 'todos' })}>Limpar</button>
                  </div>
                </div>
                <div className="smp-panel-body">
                  <label className="smp-field"><span>Período</span>
                    <select className="smp-select" value={`${view}:${offset}`} onChange={event => {
                      const [v, o] = event.target.value.split(':')
                      setView(v as View); setOffset(Number(o))
                    }}>
                      <option value="dia:-1">Ontem</option>
                      <option value="dia:0">Hoje</option>
                      <option value="semana:0">Esta semana</option>
                      <option value="semana:-1">Semana passada</option>
                      <option value="semana:1">Próxima semana</option>
                      <option value="mes:0">Este mês</option>
                      <option value="mes:-1">Mês passado</option>
                    </select>
                  </label>
                  <label className="smp-field"><span>Máquina</span>
                    <select className="smp-select" value={filtros.maquina} onChange={event => setFiltros(f => ({ ...f, maquina: event.target.value }))}>
                      <option value="todas">Todas as máquinas</option>
                      {maquinas.map(m => <option key={m.id} value={m.id}>{[m.codigo, m.nome].filter(Boolean).join(' · ')}</option>)}
                    </select>
                  </label>
                  <label className="smp-field"><span>Status</span>
                    <select className="smp-select" value={filtros.status} onChange={event => setFiltros(f => ({ ...f, status: event.target.value }))}>
                      <option value="todos">Todos os status</option>
                      {Object.entries(rotuloStatus).map(([chave, rotulo]) => <option key={chave} value={chave}>{rotulo}</option>)}
                    </select>
                  </label>
                  <label className="smp-field" style={{ marginBottom: 0 }}><span>Produto</span>
                    <select className="smp-select" value={filtros.produto} onChange={event => setFiltros(f => ({ ...f, produto: event.target.value }))}>
                      <option value="todos">Todos os produtos</option>
                      {produtos.slice(0, 400).map(p => <option key={p.id} value={p.id}>{[p.codigo, p.nome].filter(Boolean).join(' · ')}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Gauge size={18} aria-hidden />
                  <h2 className="smp-panel-title">Carga de Máquinas</h2>
                </div>
                <div className="smp-panel-body">
                  {carga.total === 0 ? (
                    <div className="smp-state">
                      <Factory size={22} aria-hidden />
                      <strong>Nenhuma máquina ativa cadastrada</strong>
                      <p>Cadastre as máquinas da empresa para ver a distribuição de carga do período.</p>
                    </div>
                  ) : (
                    <>
                      <div className="smp-donut" style={{ background: carga.fatias.length ? `conic-gradient(${carga.gradiente})` : '#EEF4F7' }}>
                        <strong>{carga.ocupadas === null ? '—' : `${carga.ocupadas}%`}</strong>
                      </div>
                      <div className="smp-legend-list">
                        {carga.fatias.map(fatia => (
                          <div key={fatia.rotulo}><i style={{ background: fatia.cor }} />{fatia.rotulo}<b>{Math.round((fatia.valor / carga.total) * 100)}%</b></div>
                        ))}
                        <div><i style={{ background: '#DCE7EC' }} />Total de máquinas<b>{carga.total}</b></div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Clock size={18} aria-hidden />
                  <h2 className="smp-panel-title">Próximos Eventos</h2>
                </div>
                <div className="smp-panel-body">
                  {eventos.length === 0 ? (
                    <div className="smp-state">
                      <Clock size={22} aria-hidden />
                      <strong>Nada programado à frente</strong>
                      <p>Novos lançamentos de programação e paradas abertas desta empresa aparecem aqui.</p>
                    </div>
                  ) : (
                    <div className="smp-events">
                      {eventos.map(evento => (
                        <div className="smp-event" key={`${evento.quando}-${evento.rotulo}`}>
                          <time>{evento.hora}</time><i style={{ background: evento.cor }} /><span>{evento.rotulo}</span><b>{evento.maquina}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {detalhe && (
        <div className="smp-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setSelecionada(null) }}>
          <div className="smp-modal" role="dialog" aria-modal="true" aria-label={`Detalhes da ordem ${rotuloOP(detalhe.ordem)}`}>
            <div className="smp-modal-head">
              <div>
                <h2>{rotuloOP(detalhe.ordem)}</h2>
                <p>{detalhe.produto ? `${detalhe.produto.codigo ?? ''} ${detalhe.produto.nome ?? ''}`.trim() : 'Produto não identificado'} · {rotuloStatus[familiaStatus(detalhe.ordem.status)]}</p>
              </div>
              <button type="button" className="smp-modal-close" aria-label="Fechar detalhes" onClick={() => setSelecionada(null)}><X size={16} /></button>
            </div>
            <div className="smp-modal-body">
              <dl className="smp-dl">
                <div><dt>Quantidade</dt><dd>{fmtQtd(numero(detalhe.ordem.quantidade_planejada) ?? numero(detalhe.ordem.quantidade))}</dd></div>
                <div><dt>Produzido</dt><dd>{fmtQtd(numero(detalhe.ordem.quantidade_produzida))}</dd></div>
                <div><dt>Máquina</dt><dd>{rotuloMaquina(detalhe.ordem.maquina_id)}</dd></div>
                <div><dt>Prioridade</dt><dd>{detalhe.ordem.prioridade ?? '—'}</dd></div>
                <div><dt>Prazo previsto</dt><dd>{detalhe.ordem.data_prevista ?? '—'}</dd></div>
                <div><dt>Criada em</dt><dd>{fmtDataHora(detalhe.ordem.created_at)}</dd></div>
              </dl>
              <h3>Programação da ordem</h3>
              {detalhe.programacoes.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum lançamento de programação finita para esta ordem.</p>
              ) : (
                <div className="smp-tablewrap">
                  <table className="smp-table">
                    <thead><tr><th>Máquina</th><th className="is-nowrap">Início</th><th className="is-nowrap">Término</th><th className="is-num">Planejado</th><th className="is-num">Produzido</th><th>Status</th></tr></thead>
                    <tbody>
                      {detalhe.programacoes.map(p => (
                        <tr key={p.id}>
                          <td>{p.maquina_id ? (maquinaPorId.get(p.maquina_id)?.codigo ?? '—') : '—'}</td>
                          <td className="is-nowrap">{fmtDataHora(p.inicio_planejado)}</td>
                          <td className="is-nowrap">{fmtDataHora(p.fim_planejado)}</td>
                          <td className="is-num">{fmtQtd(numero(p.quantidade_planejada))}</td>
                          <td className="is-num">{fmtQtd(numero(p.quantidade_produzida))}</td>
                          <td><span className="smp-chip" data-tone="neutral"><i />{rotuloBloco[tipoBloco(p, agora)]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h3>Apontamentos da ordem</h3>
              {detalhe.apontamentos.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum apontamento de processo registrado para esta ordem no período consultado.</p>
              ) : (
                <div className="smp-tablewrap">
                  <table className="smp-table">
                    <thead><tr><th className="is-nowrap">Início</th><th className="is-nowrap">Fim</th><th className="is-num">Boas</th><th className="is-num">Refugo</th><th>Motivo de parada</th></tr></thead>
                    <tbody>
                      {detalhe.apontamentos.map(a => (
                        <tr key={a.id}>
                          <td className="is-nowrap">{fmtDataHora(a.inicio_em)}</td>
                          <td className="is-nowrap">{fmtDataHora(a.fim_em)}</td>
                          <td className="is-num">{fmtQtd(numero(a.quantidade_boa))}</td>
                          <td className="is-num">{fmtQtd(numero(a.quantidade_refugada))}</td>
                          <td className="is-muted">{a.motivo_parada ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  )
}
