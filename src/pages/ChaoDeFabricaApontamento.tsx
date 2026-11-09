/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-OPERADOR-CARTAO-CPF3-20261108-01 — ordem do proprietário em 2026-11-08: o operador se identifica com o número do cartão + os 3 últimos dígitos do CPF. A conferência saiu do cliente e passou para a RPC security definer erp_operador_identificar_cartao, que valida a empresa da sessão, bloqueia após 8 falhas em 15 minutos e devolve só os dados públicos do crachá (o CPF nunca volta). Agenda, apontamento e ficha de processo inalterados.
 * @REVISAO: REV-CHAO-FABRICA-CARTAO-PONTO-20261104-02 — tela real por cartão de ponto + fileira da semana em trilho de rolagem no celular e nome do operador lido de nome_completo quando o cadastro tiver os dois campos
 * @STATUS_APROVACAO: DETERMINADO PELO PROPRIETARIO ("NAO QUERO ESSA TELA SÓ DE DEMOSTRAÇÃO DEVE VIR UM CAMPO PARA COLOCAR NUMERO DO CARTÁO DE PONTO PARA PUXAR O NOME DO OPERADOR E SUA PROGRAMAÇAO DO PC PARA ELE O QUE VAI TER PARA FAZER NO DIA E NA SEMANA E AS MAQUINAS TER UM ABA PARA ELE PUXAR A FICHA DE PROCESSO DA PEÇA ONLINE", 2026-11-04) E COMPLEMENTADO EM 2026-11-08 ("o numero do cartao mais os 3 ultimos numeros do cpf")
 * Substitui o protótipo visual: cartão/matrícula + 3 últimos dígitos do CPF resolvem o funcionário
 * pela RPC erp_operador_identificar_cartao, a agenda vem de erp_pcp_programacoes atribuída a ele, o
 * apontamento é carimbado pelas RPCs erp_apontamento_iniciar / erp_apontamento_finalizar (relógio do
 * banco) e a ficha de processo é lida online de erp_fichas_processo + erp_ficha_processo_operacoes +
 * receita APROVADA. Sem dado de demonstração: consulta que falha é declarada na tela.
 */
import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, Factory, FileText, LogIn, Package, Play, RefreshCw, Route, Square, Trash2, UserRound, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Worker = { id: string; empresa_id: string | null; matricula: string | null; nome: string | null; nome_completo: string | null; email: string | null; status: string | null; turno_trabalho: string | null; departamento: string | null; cargo: string | null; numero_cracha_rfid: string | null }
type Program = { id: string; ordem_producao_id: string | null; maquina_id: string | null; produto_id: string | null; inicio_planejado: string; fim_planejado: string | null; quantidade_planejada: number | null; quantidade_produzida: number | null; quantidade_refugada: number | null; status: string | null; operador_frente_id: string | null; operador_atras_id: string | null }
type Order = { id: string; numero_op: string | number; produto_id: string | null; quantidade_planejada: number | null; quantidade: number | null; status: string | null; data_prevista: string | null }
type Product = { id: string; codigo: string | null; nome: string | null; unidade: string | null }
type Machine = { id: string; codigo: string | null; nome: string | null; status: string | null }
type Recipe = { id: string; processo_id: string; produto_id: string | null; maquina_id: string | null; ferramenta_id: string | null; versao: number; status: string; parametros: Record<string, unknown> | null; ciclo_seg: number | null; setup_min: number | null; observacoes: string | null }
type Ficha = { id: string; produto_id: string; codigo_ficha: string; status: string | null; categoria_processo: string | null; versao_ficha: number | null; revisao: number | null; maquina_id: string | null; ciclo_seg: number | null; peso_peca: number | null; peso_canal: number | null; forca_fechamento: number | null; pressao_trabalho: number | null; temperatura_trabalho: number | null; pressao_injecao: number | null; zonas_temperatura: Record<string, unknown> | null; parametros_tecnicos: Record<string, unknown> | null; observacoes_setup: string | null; observacoes: string | null; imagem_url: string | null; data_homologacao: string | null; assinatura_tecnica: string | null }
type FichaOperation = { id: string; ficha_processo_id: string; sequencial_operacao: number; descricao_operacao: string; posto_trabalho_id: string | null; tempo_minutos: number }
type ProcessEntry = { id: string; ordem_producao_id: string | null; operador_id: string | null; inicio_em: string; fim_em: string | null; quantidade_boa: number | null; quantidade_refugada: number | null; motivo_parada: string | null; observacoes: string | null }
type Stoppage = { id: string; maquina_id: string; ordem_producao_id: string | null; motivo: string; inicio: string; fim: string | null; status: string | null }
type StartedEntry = { id: string; ordem_producao_id: string; operador_id: string; inicio_em: string; fim_em: string | null; quantidade_boa: number | null; quantidade_refugada: number | null }
type FinishedEntry = { id: string; fim_em: string; duracao_seg: number | null; quantidade_boa: number | null; quantidade_refugada: number | null }

type TabKey = 'DIA' | 'SEMANA' | 'MAQUINAS' | 'FICHA'

const MIGRATION_APONTAMENTO = '20261103100000_mes_apontamento_gravado_no_servidor.sql'
const BADGE_FORMAT = /^[A-Za-z0-9._/-]{2,32}$/
const PARADA_MOTIVOS = ['Quebra de máquina', 'Falta de material', 'Ajuste de processo', 'Setup / troca de ferramenta', 'Manutenção planejada', 'Problema de qualidade', 'Sem operador', 'Outro']

const field = 'h-[52px] w-full min-w-0 rounded-[4px] border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-900 outline-none focus:border-[#2D8DB8]'
const touchButton = 'inline-flex min-h-[64px] items-center justify-center gap-2 rounded-[4px] border-2 px-5 text-base font-black uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-45'
const card = 'border border-slate-200 bg-white shadow-[0_2px_10px_rgba(18,59,80,.05)]'
const label = 'text-[11px] font-black uppercase tracking-wide text-slate-500'

const dayKey = (date: Date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}
const mondayOf = (date: Date) => {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return monday
}
const dayLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
const timeLabel = (value: string | null | undefined) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
const numberLabel = (value: number | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const shortText = (value: unknown) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value)

function chunkIds(values: string[], size = 40): string[][] {
  const out: string[][] = []
  for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size))
  return out
}
function unique(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

/** O erro do PostgREST traz o raise do banco; PGRST202 = migration das RPCs ainda não aplicada. */
function falhaDoApontamento(cause: unknown, fallback: string): string {
  if (cause instanceof Error) {
    if ((cause as Error & { code?: string }).code === 'PGRST202') {
      return 'O banco ainda não tem as funções de apontamento com horário do servidor. Aplique a migration ' + MIGRATION_APONTAMENTO + ' e toque em Atualizar.'
    }
    return cause.message || fallback
  }
  return fallback
}

export default function ChaoDeFabricaApontamento() {
  const [badge, setBadge] = useState('')
  const [cpf3, setCpf3] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [worker, setWorker] = useState<Worker | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [operations, setOperations] = useState<FichaOperation[]>([])
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [stoppages, setStoppages] = useState<Stoppage[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('DIA')
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()))
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [goodQty, setGoodQty] = useState('')
  const [scrapQty, setScrapQty] = useState('')
  const [stopReason, setStopReason] = useState('')
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const monday = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return dayKey(day)
  }), [monday])

  const loadForWorker = useCallback(async (workerId: string, tenant: string) => {
    const windowStart = new Date(mondayOf(new Date()))
    windowStart.setDate(windowStart.getDate() - 7)
    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 42)
    const [programResult, entryResult, machineResult] = await Promise.all([
      fetchAllPages<Program>((from, to) => supabase.from('erp_pcp_programacoes')
        .select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status,operador_frente_id,operador_atras_id', { count: 'exact' })
        .eq('empresa_id', tenant)
        .or('operador_frente_id.eq.' + workerId + ',operador_atras_id.eq.' + workerId)
        .gte('inicio_planejado', windowStart.toISOString())
        .lte('inicio_planejado', windowEnd.toISOString())
        .order('inicio_planejado', { ascending: true })
        .order('id')
        .range(from, to)),
      fetchAllPages<ProcessEntry>((from, to) => supabase.from('erp_apontamentos_processo')
        .select('id,ordem_producao_id,operador_id,inicio_em,fim_em,quantidade_boa,quantidade_refugada,motivo_parada,observacoes', { count: 'exact' })
        .eq('empresa_id', tenant)
        .eq('operador_id', workerId)
        .order('inicio_em', { ascending: false })
        .order('id')
        .range(from, to)),
      fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas')
        .select('id,codigo,nome,status', { count: 'exact' })
        .eq('empresa_id', tenant)
        .order('codigo')
        .order('id')
        .range(from, to)),
    ])
    const nextPrograms = programResult
    setPrograms(nextPrograms)
    setEntries(entryResult)
    setMachines(machineResult)

    const opIds = unique(nextPrograms.map(item => item.ordem_producao_id))
    const productIdList = unique(nextPrograms.map(item => item.produto_id))
    const machineIds = unique(nextPrograms.map(item => item.maquina_id))
    const [orderChunks, productChunks, recipeChunks, fichaChunks, paradaResult] = await Promise.all([
      Promise.all(chunkIds(opIds).map(ids => fetchAllPages<Order>((from, to) => supabase.from('erp_ordens_producao')
        .select('id,numero_op,produto_id,quantidade_planejada,quantidade,status,data_prevista', { count: 'exact' })
        .eq('empresa_id', tenant).in('id', ids).order('numero_op', { ascending: false }).order('id').range(from, to)))),
      Promise.all(chunkIds(productIdList).map(ids => fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
        .select('id,codigo,nome,unidade', { count: 'exact' })
        .eq('empresa_id', tenant).in('id', ids).order('codigo').order('id').range(from, to)))),
      Promise.all(chunkIds(productIdList).map(ids => fetchAllPages<Recipe>((from, to) => supabase.from('erp_receitas_processos')
        .select('id,processo_id,produto_id,maquina_id,ferramenta_id,versao,status,parametros,ciclo_seg,setup_min,observacoes', { count: 'exact' })
        .eq('empresa_id', tenant).eq('status', 'APROVADA').in('produto_id', ids).order('versao', { ascending: false }).order('id').range(from, to)))),
      Promise.all(chunkIds(productIdList).map(ids => fetchAllPages<Ficha>((from, to) => supabase.from('erp_fichas_processo')
        .select('id,produto_id,codigo_ficha,status,categoria_processo,versao_ficha,revisao,maquina_id,ciclo_seg,peso_peca,peso_canal,forca_fechamento,pressao_trabalho,temperatura_trabalho,pressao_injecao,zonas_temperatura,parametros_tecnicos,observacoes_setup,observacoes,imagem_url,data_homologacao,assinatura_tecnica', { count: 'exact' })
        .eq('empresa_id', tenant).eq('ativo', true).in('produto_id', ids).order('codigo_ficha').order('id').range(from, to)))),
      machineIds.length
        ? fetchAllPages<Stoppage>((from, to) => supabase.from('erp_producao_paradas')
            .select('id,maquina_id,ordem_producao_id,motivo,inicio,fim,status', { count: 'exact' })
            .eq('empresa_id', tenant).in('maquina_id', machineIds).gte('inicio', windowStart.toISOString()).order('inicio', { ascending: false }).order('id').range(from, to))
        : Promise.resolve([] as Stoppage[]),
    ])
    const nextFichas = fichaChunks.flat()
    setOrders(orderChunks.flat())
    setProducts(productChunks.flat())
    setRecipes(recipeChunks.flat())
    setFichas(nextFichas)
    setStoppages(paradaResult)

    const fichaIds = unique(nextFichas.map(item => item.id))
    const nextOperations = fichaIds.length
      ? (await Promise.all(chunkIds(fichaIds).map(ids => fetchAllPages<FichaOperation>((from, to) => supabase.from('erp_ficha_processo_operacoes')
          .select('id,ficha_processo_id,sequencial_operacao,descricao_operacao,posto_trabalho_id,tempo_minutos', { count: 'exact' })
          .eq('empresa_id', tenant).in('ficha_processo_id', ids).order('sequencial_operacao').order('id').range(from, to))))).flat()
      : []
    setOperations(nextOperations)
  }, [])

  const identify = useCallback(async (code: string, cpfDigits: string) => {
    const codigo = code.trim()
    const digitos = cpfDigits.replace(/\D/g, '')
    setLoading(true)
    setError('')
    setNotice('')
    try {
      if (!BADGE_FORMAT.test(codigo)) throw new Error('Número do cartão inválido: use de 2 a 32 caracteres (números, letras, ponto, traço ou barra).')
      if (digitos.length !== 3) throw new Error('Informe os 3 últimos dígitos numéricos do CPF do operador.')
      const lookup = await supabase.rpc('erp_operador_identificar_cartao', { p_cartao: codigo, p_cpf3: digitos })
      if (lookup.error) {
        const texto = String(lookup.error.message ?? '')
        if (lookup.error.code === 'PGRST202' || /erp_operador_identificar_cartao|schema cache|Could not find the function/i.test(texto)) {
          throw new Error('A identificação por cartão + CPF ainda não está aplicada no banco. Execute supabase/migrations/20261108120000_erp_operador_cartao_cpf3_v1.sql no SQL Editor e tente de novo.')
        }
        throw new Error(texto || 'Não foi possível conferir cartão e CPF.')
      }
      const rows = (Array.isArray(lookup.data) ? lookup.data : lookup.data ? [lookup.data] : []) as Worker[]
      if (!rows.length) throw new Error('Cartão ou CPF não conferem. Confira o número do cartão e os 3 últimos dígitos do CPF.')
      const found = rows[0]
      const tenant = String(found.empresa_id ?? '')
      if (!tenant) throw new Error('O cadastro do operador não tem empresa vinculada. Procure o RH antes de apontar produção.')
      setEmpresaId(tenant)
      setWorker(found)
      setSelectedDay(dayKey(new Date()))
      setWeekOffset(0)
      setSelectedProgramId('')
      setActiveTab('DIA')
      setGoodQty('')
      setScrapQty('')
      setStopReason('')
      setObservations('')
      await loadForWorker(found.id, tenant)
      setCpf3('')
      setNotice('Operador identificado: ' + (found.nome ?? found.nome_completo ?? 'sem nome') + '.')
    } catch (cause) {
      setWorker(null)
      setPrograms([])
      setEntries([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível identificar o cartão.')
    } finally {
      setLoading(false)
    }
  }, [loadForWorker])

  const refresh = useCallback(async () => {
    if (!worker || !empresaId) return
    setLoading(true)
    setError('')
    try {
      await loadForWorker(worker.id, empresaId)
      setNotice('Agenda e apontamentos atualizados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a agenda do operador.')
    } finally {
      setLoading(false)
    }
  }, [empresaId, loadForWorker, worker])

  const orderMap = useMemo(() => new Map(orders.map(order => [order.id, order])), [orders])
  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const machineMap = useMemo(() => new Map(machines.map(machine => [machine.id, machine])), [machines])
  const dayPrograms = useMemo(() => programs.filter(item => dayKey(new Date(item.inicio_planejado)) === selectedDay), [programs, selectedDay])
  const weekPrograms = useMemo(() => programs.filter(item => weekDays.includes(dayKey(new Date(item.inicio_planejado)))), [programs, weekDays])
  const program = programs.find(item => item.id === selectedProgramId) ?? null
  const order = program?.ordem_producao_id ? orderMap.get(program.ordem_producao_id) : undefined
  const productId = program?.produto_id ?? order?.produto_id ?? null
  const product = productId ? productMap.get(productId) : undefined
  const machine = program?.maquina_id ? machineMap.get(program.maquina_id) : undefined
  const recipe = useMemo(() => {
    if (!productId) return undefined
    return recipes.find(item => item.produto_id === productId && (!item.maquina_id || item.maquina_id === program?.maquina_id))
  }, [productId, program?.maquina_id, recipes])
  const ficha = useMemo(() => {
    if (!productId) return undefined
    const ranked = fichas.filter(item => item.produto_id === productId)
    const score = (item: Ficha) => (item.status === 'APROVADA' || item.status === 'LIBERADA' ? 2 : item.status === 'EM_ANALISE' ? 1 : 0) * 100000
      + (item.maquina_id === program?.maquina_id ? 10000 : 0)
      + Number(item.versao_ficha ?? 0) * 10 + Number(item.revisao ?? 0)
    return ranked.slice().sort((a, b) => score(b) - score(a))[0]
  }, [fichas, productId, program?.maquina_id])
  const fichaOperations = useMemo(() => operations
    .filter(item => item.ficha_processo_id === ficha?.id)
    .slice()
    .sort((a, b) => a.sequencial_operacao - b.sequencial_operacao), [operations, ficha?.id])
  const openEntry = entries.find(item => item.ordem_producao_id === program?.ordem_producao_id && !item.fim_em) ?? null
  const openStoppage = program?.maquina_id ? stoppages.find(item => item.maquina_id === program.maquina_id && !item.fim) ?? null : null
  const programEntries = useMemo(() => entries.filter(item => item.ordem_producao_id === program?.ordem_producao_id), [entries, program?.ordem_producao_id])
  const totalGood = programEntries.reduce((sum, item) => sum + Number(item.quantidade_boa ?? 0), 0)
  const totalScrap = programEntries.reduce((sum, item) => sum + Number(item.quantidade_refugada ?? 0), 0)
  const programStoppages = stoppages.filter(item => item.maquina_id === program?.maquina_id && (!item.ordem_producao_id || item.ordem_producao_id === program?.ordem_producao_id))
  const totalStopMinutes = programStoppages.reduce((sum, item) => sum + Math.max(0, Math.round(((item.fim ? new Date(item.fim).getTime() : Date.now()) - new Date(item.inicio).getTime()) / 60000)), 0)
  const planned = Number(program?.quantidade_planejada || order?.quantidade_planejada || order?.quantidade || 0)
  const produced = Number(program?.quantidade_produzida ?? 0)
  const draftedGood = Number(goodQty || 0)
  const progress = planned > 0 ? Math.min(100, ((produced + (Number.isFinite(draftedGood) ? draftedGood : 0)) / planned) * 100) : 0
  const machineTasks = useMemo(() => {
    const byMachine = new Map<string, Program[]>()
    for (const item of weekPrograms) {
      if (!item.maquina_id) continue
      const list = byMachine.get(item.maquina_id) ?? []
      list.push(item)
      byMachine.set(item.maquina_id, list)
    }
    return Array.from(byMachine.entries()).map(([id, tasks]) => ({
      machine: machineMap.get(id),
      tasks: tasks.slice().sort((a, b) => new Date(a.inicio_planejado).getTime() - new Date(b.inicio_planejado).getTime()),
    }))
  }, [machineMap, weekPrograms])

  async function startProduction() {
    if (!worker || !empresaId || !program || !order || !machine || !productId || !recipe) {
      setError('Não é possível iniciar: confira na agenda a OP, a máquina e a ficha de processo aprovada desta tarefa.')
      return
    }
    if (openEntry) {
      setNotice('Esta OP já tem apontamento em andamento desde ' + timeLabel(openEntry.inicio_em) + ' (horário do banco).')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await supabase.rpc('erp_apontamento_iniciar', {
        p_programacao_id: program.id,
        p_ordem_producao_id: order.id,
        p_processo_id: recipe.processo_id,
        p_receita_id: recipe.id,
        p_maquina_id: machine.id,
        p_ferramenta_id: recipe.ferramenta_id,
        p_operador_id: worker.id,
        p_quantidade_planejada: planned,
      })
      if (response.error) throw response.error
      const started = response.data as StartedEntry | null
      if (!started || typeof started.id !== 'string' || typeof started.inicio_em !== 'string') {
        throw new Error('O servidor não confirmou o apontamento criado. Atualize a tela antes de iniciar de novo.')
      }
      setEntries(current => [{
        id: started.id,
        ordem_producao_id: started.ordem_producao_id,
        operador_id: started.operador_id,
        inicio_em: started.inicio_em,
        fim_em: started.fim_em,
        quantidade_boa: Number(started.quantidade_boa ?? 0),
        quantidade_refugada: Number(started.quantidade_refugada ?? 0),
        motivo_parada: null,
        observacoes: null,
      }, ...current])
      setNotice('Início carimbado pelo banco às ' + timeLabel(started.inicio_em) + '. Informe as quantidades ao terminar.')
    } catch (cause) {
      setError(falhaDoApontamento(cause, 'Falha ao registrar o início da produção.'))
    } finally {
      setSaving(false)
    }
  }

  async function finishProduction() {
    if (!worker || !empresaId || !program || !openEntry) {
      setError('Não há apontamento em andamento nesta OP para finalizar.')
      return
    }
    const good = Number(goodQty || 0)
    const scrap = Number(scrapQty || 0)
    if (!Number.isFinite(good) || !Number.isFinite(scrap) || good < 0 || scrap < 0 || good + scrap <= 0) {
      setError('Informe quantidades válidas: a soma de peças boas e refugadas precisa ser maior que zero.')
      return
    }
    if (scrap > 0 && !observations.trim() && !stopReason.trim()) {
      setError('Descreva o defeito/causa do refugo antes de finalizar.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await supabase.rpc('erp_apontamento_finalizar', {
        p_apontamento_id: openEntry.id,
        p_operador_id: worker.id,
        p_programacao_id: program.id,
        p_quantidade_boa: good,
        p_quantidade_refugada: scrap,
        p_motivo_parada: (stopReason.trim() || null) as string | null,
        p_observacoes: (observations.trim() || null) as string | null,
      })
      if (response.error) throw response.error
      const finished = response.data as FinishedEntry | null
      if (!finished || typeof finished.fim_em !== 'string') {
        throw new Error('O servidor não confirmou a finalização. Atualize a tela antes de repetir.')
      }
      const minutos = Math.round(Number(finished.duracao_seg ?? 0) / 60)
      setGoodQty('')
      setScrapQty('')
      setStopReason('')
      setObservations('')
      await loadForWorker(worker.id, empresaId)
      setNotice('Apontamento gravado com horário do banco e baixado na programação (' + numberLabel(good) + ' boas, ' + numberLabel(scrap) + ' refugadas, ' + numberLabel(minutos) + ' min).')
    } catch (cause) {
      setError(falhaDoApontamento(cause, 'Falha ao finalizar o apontamento.'))
    } finally {
      setSaving(false)
    }
  }

  async function registerStoppage() {
    if (!empresaId) {
      setError('Empresa da sessão não identificada: troque o cartão antes de registrar a parada.')
      return
    }
    if (!program || !machine) {
      setError('Selecione a tarefa da máquina antes de registrar a parada.')
      return
    }
    const motivo = (stopReason || 'Outro').trim()
    if (openStoppage) {
      setNotice('A máquina ' + (machine.codigo ?? '') + ' já tem parada aberta: ' + openStoppage.motivo + ' às ' + timeLabel(openStoppage.inicio) + '.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await supabase.from('erp_producao_paradas')
        .insert({
          empresa_id: empresaId,
          maquina_id: machine.id,
          ordem_producao_id: program.ordem_producao_id ?? null,
          motivo,
          inicio: new Date().toISOString(),
          observacao: observations.trim() || null,
          status: 'ABERTA',
        })
        .select('id,maquina_id,ordem_producao_id,motivo,inicio,fim,status')
      if (response.error) throw response.error
      const rows = (response.data ?? []) as Stoppage[]
      if (rows.length === 0) throw new Error('A parada não foi gravada: a conta da sessão não tem permissão de apontamento de produção.')
      setStoppages(current => [rows[0], ...current])
      setNotice('Parada registrada na máquina ' + (machine.codigo ?? '') + ' — motivo: ' + motivo + '.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar a parada.')
    } finally {
      setSaving(false)
    }
  }

  async function closeStoppage() {
    if (!empresaId) {
      setError('Empresa da sessão não identificada: troque o cartão antes de encerrar a parada.')
      return
    }
    if (!openStoppage) {
      setError('Não há parada aberta nesta máquina para encerrar.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await supabase.from('erp_producao_paradas')
        .update({ fim: new Date().toISOString(), status: 'FECHADA', observacao: observations.trim() || openStoppage.motivo })
        .eq('id', openStoppage.id)
        .eq('empresa_id', empresaId)
        .select('id,maquina_id,ordem_producao_id,motivo,inicio,fim,status')
      if (response.error) throw response.error
      const rows = (response.data ?? []) as Stoppage[]
      if (rows.length === 0) throw new Error('A parada não foi encerrada: a conta da sessão não tem permissão de apontamento de produção.')
      setStoppages(current => current.filter(item => item.id !== openStoppage.id))
      setNotice('Parada encerrada às ' + timeLabel(rows[0].fim) + ' (horário do banco).')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao encerrar a parada.')
    } finally {
      setSaving(false)
    }
  }

  const operatorName = (worker?.nome_completo || worker?.nome || '').trim()

  if (!worker) {
    return <main className="min-h-screen bg-[#F4FBFD] p-4 text-slate-900 md:p-8">
      <div className="mx-auto w-full max-w-[720px] space-y-4">
        <section className={card + ' p-6 md:p-10'}>
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]"><LogIn size={28} /></span>
            <div>
              <p className={label}>Chão de fábrica · terminal do operador</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-[#123B50] md:text-3xl">Leia o cartão de ponto</h1>
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void identify(badge, cpf3) }}>
            <label className="block space-y-2">
              <span className={label}>Número do cartão / crachá ou matrícula</span>
              <input className={field} inputMode="numeric" autoComplete="off" autoFocus value={badge} onChange={event => setBadge(event.target.value)} placeholder="Ex.: 1042" aria-label="Número do cartão de ponto" />
            </label>
            <label className="block space-y-2">
              <span className={label}>3 últimos dígitos do CPF</span>
              <input className={field} type="password" inputMode="numeric" autoComplete="off" maxLength={3} value={cpf3} onChange={event => setCpf3(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="•••" aria-label="Três últimos dígitos do CPF" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={loading || badge.trim().length === 0 || cpf3.length !== 3} className={touchButton + ' flex-1 border-[#123B50] bg-[#123B50] text-white hover:bg-[#0d2c3d]'}>
                {loading ? <RefreshCw size={22} className="animate-spin" /> : <UserRound size={22} />} {loading ? 'Identificando…' : 'Abrir minha programação'}
              </button>
              <button type="button" onClick={() => { setBadge(''); setCpf3(''); setNotice(''); setError('') }} className={touchButton + ' border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}><Trash2 size={20} /> Limpar</button>
            </div>
          </form>
          {(error || notice) && <p role={error ? 'alert' : 'status'} className={'mt-5 border p-4 text-sm font-bold ' + (error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || notice}</p>}
          <p className="mt-5 text-xs leading-relaxed text-slate-500">O cartão (<strong>numero_cracha_rfid</strong> ou <strong>matrícula</strong>) e os <strong>3 últimos dígitos do CPF</strong> são conferidos no servidor contra o cadastro do RH da empresa da sessão. Após 8 tentativas erradas, o cartão fica bloqueado por 15 minutos. Nada é exibido antes de identificar o operador — a tela não trabalha com dados de exemplo.</p>
        </section>
      </div>
    </main>
  }

  return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
    <div className="mx-auto w-full max-w-[1680px] space-y-4">
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={'border p-4 text-sm font-bold ' + (error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || notice}</p>}

      <section className={card + ' flex flex-wrap items-center justify-between gap-4 p-4'}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]"><UserRound size={26} /></span>
          <div className="min-w-0">
            <p className={label}>Operador identificado pelo cartão {badge.trim()}</p>
            <h1 className="mt-0.5 truncate text-xl font-black text-[#123B50] md:text-2xl">{operatorName || 'Funcionário sem nome cadastrado'}</h1>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{[worker.matricula ? 'Matrícula ' + worker.matricula : null, worker.cargo, worker.departamento, worker.turno_trabalho ? 'Turno ' + worker.turno_trabalho : null].filter(Boolean).join(' · ') || 'Cadastro do RH sem complementos'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"><CheckCircle2 size={15} /> {programs.length} tarefa(s) na agenda</span>
          <button type="button" onClick={() => void refresh()} disabled={loading} className={touchButton + ' min-h-[44px] border-slate-300 bg-white px-4 text-sm text-slate-700'}>{loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} Atualizar</button>
          <button type="button" onClick={() => { setWorker(null); setPrograms([]); setEntries([]); setBadge(''); setCpf3(''); setError(''); setNotice('') }} className={touchButton + ' min-h-[44px] border-[#123B50] bg-[#123B50] px-4 text-sm text-white'}><LogIn size={16} /> Trocar cartão</button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Abas do terminal do operador">
        {([['DIA', 'Programação do dia', ClipboardList], ['SEMANA', 'Semana', Route], ['MAQUINAS', 'Máquinas', Factory], ['FICHA', 'Ficha de processo', FileText]] as [TabKey, string, typeof ClipboardList][]).map(([key, text, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={'inline-flex min-h-[52px] items-center gap-2 border-2 px-5 text-sm font-black uppercase ' + (activeTab === key ? 'border-[#D4AF37] bg-[#123B50] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#9BCBDD]')}><Icon size={18} /> {text}</button>
        ))}
      </div>

      {activeTab === 'DIA' && <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-3">
          <div className={card + ' p-4'}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <h2 className="text-sm font-black uppercase text-[#123B50]">Minha semana</h2>
              <div className="flex items-center gap-2 text-xs font-black text-[#123B50]">
                <button type="button" aria-label="Semana anterior" onClick={() => setWeekOffset(value => value - 1)} className="grid h-9 w-9 place-items-center border border-slate-300 bg-white hover:bg-[#F4FBFD]"><ChevronLeft size={16} /></button>
                <span>{new Date(weekDays[0] + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(weekDays[6] + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                <button type="button" aria-label="Próxima semana" onClick={() => setWeekOffset(value => value + 1)} className="grid h-9 w-9 place-items-center border border-slate-300 bg-white hover:bg-[#F4FBFD]"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div data-synqra-weekrail="1" className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-7">
              {weekDays.map(day => {
                const count = programs.filter(item => dayKey(new Date(item.inicio_planejado)) === day).length
                const isSelected = selectedDay === day
                return <button key={day} type="button" onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className={'flex min-h-[86px] flex-col items-center justify-center border-2 text-center ' + (isSelected ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-[#2D8DB8]')}>
                  <span className="text-[11px] font-black uppercase">{new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="mt-1 text-2xl font-black leading-none">{day.slice(8, 10)}</span>
                  <span className="mt-1.5 text-[11px] font-bold">{count ? count + ' tarefa(s)' : 'livre'}</span>
                </button>
              })}
            </div>
          </div>

          <h2 className="px-1 text-sm font-black uppercase text-[#123B50]">Tarefas de {dayLabel(selectedDay)} · {dayPrograms.length}</h2>
          {dayPrograms.map(item => {
            const itemOrder = item.ordem_producao_id ? orderMap.get(item.ordem_producao_id) : undefined
            const itemProduct = productMap.get(item.produto_id ?? itemOrder?.produto_id ?? '')
            const itemMachine = machineMap.get(item.maquina_id ?? '')
            const isSelected = item.id === selectedProgramId
            return <button key={item.id} type="button" onClick={() => { setSelectedProgramId(item.id); setActiveTab('DIA'); setGoodQty(''); setScrapQty(''); setError('') }} aria-pressed={isSelected} className={card + ' w-full border-2 p-4 text-left ' + (isSelected ? 'border-[#2D8DB8] bg-[#F4FBFD]' : 'border-slate-200 bg-white hover:border-[#9BCBDD]')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-[#2D8DB8]">OP {itemOrder?.numero_op ?? '—'} · {item.status || 'PROGRAMADA'}</p>
                  <h3 className="mt-1 text-lg font-black leading-snug text-[#123B50]">{itemProduct?.codigo ?? 'Produto'} · {itemProduct?.nome ?? 'sem descrição'}</h3>
                </div>
                <span className="shrink-0 border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600">{item.operador_frente_id === worker.id ? 'FRENTE' : 'ATRÁS'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600 md:grid-cols-4">
                <span className="inline-flex items-center gap-1"><Clock3 size={15} />{timeLabel(item.inicio_planejado)}–{timeLabel(item.fim_planejado)}</span>
                <span className="inline-flex items-center gap-1"><Factory size={15} />{itemMachine?.codigo ?? 'máquina —'}</span>
                <span className="inline-flex items-center gap-1"><Package size={15} />plano {numberLabel(item.quantidade_planejada)}</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={15} />feito {numberLabel(item.quantidade_produzida)}</span>
              </div>
            </button>
          })}
          {!loading && dayPrograms.length === 0 && <div className={card + ' p-10 text-center'}>
            <ClipboardList size={34} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-black text-slate-600">Nenhuma tarefa programada para esta data.</p>
            <p className="mt-1 text-xs text-slate-500">Se você esperava produção aqui, o PCP precisa atribuir a operação ao seu cartão na programação.</p>
          </div>}
        </div>

        <div className="space-y-3">
          {!program ? <div className={card + ' flex min-h-[360px] flex-col items-center justify-center p-10 text-center'}>
            <FileText size={44} className="mb-3 text-[#2D8DB8]" />
            <h2 className="text-xl font-black text-[#123B50]">Apontamento do dia</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">Toque em uma tarefa da agenda para abrir a OP, a máquina e os botões de início, parada e finalização.</p>
          </div> : <>
            <div className="grid grid-cols-3 gap-2">
              <div className="border-2 border-[#C8E3EE] bg-white p-3 text-center sm:p-4"><p className={label}>Produzidas</p><p className="mt-1 text-2xl font-black tabular-nums text-[#123B50] sm:text-3xl">{numberLabel(totalGood)}</p><p className="text-[10px] font-bold text-slate-500">peças boas</p></div>
              <div className="border-2 border-rose-200 bg-white p-3 text-center sm:p-4"><p className={label}>Refugo total</p><p className="mt-1 text-2xl font-black tabular-nums text-rose-700 sm:text-3xl">{numberLabel(totalScrap)}</p><p className="text-[10px] font-bold text-slate-500">peças refugadas</p></div>
              <div className="border-2 border-amber-200 bg-white p-3 text-center sm:p-4"><p className={label}>Parada total</p><p className="mt-1 text-2xl font-black tabular-nums text-amber-700 sm:text-3xl">{numberLabel(totalStopMinutes)}</p><p className="text-[10px] font-bold text-slate-500">minutos registrados</p></div>
            </div>
            <div className={card + ' p-4'}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h2 className="text-sm font-black uppercase text-[#123B50]">OP ativa · {order?.numero_op ?? '—'}</h2>
                <span className={'border px-2 py-1 text-[11px] font-black ' + (openEntry ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600')}>{openEntry ? 'PRODUZINDO desde ' + timeLabel(openEntry.inicio_em) : 'AGUARDANDO INÍCIO'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                <div className="border border-slate-200 p-3"><p className={label}>Produto</p><p className="mt-1 font-black leading-snug">{product?.codigo ?? '—'} · {product?.nome ?? '—'}</p></div>
                <div className="border border-slate-200 p-3"><p className={label}>Máquina</p><p className="mt-1 font-black leading-snug">{machine?.codigo ?? '—'} · {machine?.nome ?? '—'}</p></div>
                <div className="border border-slate-200 p-3"><p className={label}>Unidade</p><p className="mt-1 font-black">{product?.unidade ?? '—'}</p></div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2 text-sm font-black text-[#123B50]">
                <span>{numberLabel(produced + (Number.isFinite(draftedGood) ? draftedGood : 0))} de {numberLabel(planned)} un</span>
                <span>{numberLabel(progress)}%</span>
              </div>
              <div role="progressbar" aria-label="Avanço da OP" aria-valuemin={0} aria-valuemax={Math.max(planned, 1)} aria-valuenow={produced + draftedGood} className="mt-1 h-3 w-full overflow-hidden bg-slate-200">
                <div className="h-full bg-[#2D8DB8]" style={{ width: progress + '%' }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className={label}>Peças boas</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Diminuir peças boas" onClick={() => setGoodQty(String(Math.max(0, Number(goodQty || 0) - 1)))} className="h-[52px] w-[52px] shrink-0 border-2 border-slate-300 bg-white text-xl font-black">−</button>
                    <input type="number" min="0" step="1" className="h-[52px] w-full min-w-0 rounded-[4px] border-2 border-slate-300 px-3 text-lg font-black" value={goodQty} onChange={event => setGoodQty(event.target.value)} placeholder="0" />
                    <button type="button" aria-label="Aumentar peças boas" onClick={() => setGoodQty(String(Number(goodQty || 0) + 1))} className="h-[52px] w-[52px] shrink-0 border-2 border-[#2D8DB8] bg-[#EAF6FA] text-xl font-black text-[#2D8DB8]">+</button>
                  </div>
                </label>
                <label className="space-y-1"><span className={label}>Peças refugadas</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Diminuir refugo" onClick={() => setScrapQty(String(Math.max(0, Number(scrapQty || 0) - 1)))} className="h-[52px] w-[52px] shrink-0 border-2 border-slate-300 bg-white text-xl font-black">−</button>
                    <input type="number" min="0" step="1" className="h-[52px] w-full min-w-0 rounded-[4px] border-2 border-slate-300 px-3 text-lg font-black" value={scrapQty} onChange={event => setScrapQty(event.target.value)} placeholder="0" />
                    <button type="button" aria-label="Aumentar refugo" onClick={() => setScrapQty(String(Number(scrapQty || 0) + 1))} className="h-[52px] w-[52px] shrink-0 border-2 border-rose-300 bg-rose-50 text-xl font-black text-rose-700">+</button>
                  </div>
                </label>
              </div>
              <p className="mt-2 text-[11px] font-bold text-slate-500">Produzido já baixado nesta programação: {numberLabel(produced)} un · refugo anterior: {numberLabel(program.quantidade_refugada)} un. O contador acima é o apontamento deste turno.</p>
            </div>

            <div className={card + ' p-4'}>
              <h2 className="text-sm font-black uppercase text-[#123B50]">Motivo da parada / ocorrência</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {PARADA_MOTIVOS.map(motivo => <button key={motivo} type="button" aria-pressed={stopReason === motivo} onClick={() => setStopReason(stopReason === motivo ? '' : motivo)} className={'min-h-[52px] border-2 px-2 text-sm font-black ' + (stopReason === motivo ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-[#9BCBDD]')}>{motivo}</button>)}
              </div>
              <label className="mt-3 block space-y-1"><span className={label}>Observações do turno (obrigatório quando houver refugo)</span>
                <textarea className="min-h-[92px] w-full rounded-[4px] border-2 border-slate-300 p-3 text-base outline-none focus:border-[#2D8DB8]" value={observations} onChange={event => setObservations(event.target.value)} placeholder="Defeito, causa, ocorrência, ajuste feito…" />
              </label>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <button type="button" onClick={() => void startProduction()} disabled={saving || !!openEntry || !recipe} className={touchButton + ' min-h-[76px] text-lg border-[#2D8DB8] bg-[#2D8DB8] text-white'}><Play size={26} fill="currentColor" /> {openEntry ? 'JÁ EM ANDAMENTO' : 'INICIAR PRODUÇÃO'}</button>
                <button type="button" onClick={() => void finishProduction()} disabled={saving || !openEntry} className={touchButton + ' min-h-[76px] text-lg border-[#123B50] bg-[#123B50] text-white'}><Square size={26} fill="currentColor" /> FINALIZAR E ENVIAR</button>
                <button type="button" onClick={() => void registerStoppage()} disabled={saving || !!openStoppage} className={touchButton + ' border-amber-400 bg-amber-50 text-amber-900'}><Wrench size={20} /> REGISTRAR PARADA</button>
                <button type="button" onClick={() => void closeStoppage()} disabled={saving || !openStoppage} className={touchButton + ' border-rose-300 bg-white text-rose-700'}><Trash2 size={20} /> {openStoppage ? 'ENCERRAR PARADA' : 'SEM PARADA ABERTA'}</button>
              </div>
              {!recipe && <p className="mt-3 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800"><AlertTriangle size={16} className="mr-1 inline" />Não há ficha de processo aprovada para este produto e máquina, então o início fica bloqueado pelo banco. Peça a liberação em PCP · Fichas de Processo.</p>}
              {openStoppage && <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Parada aberta desde {timeLabel(openStoppage.inicio)} — {openStoppage.motivo}.</p>}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Início, fim, duração e a baixa na programação do PCP são carimbados pelo relógio do banco, não pelo do terminal.</p>
            </div>

            {entries.filter(item => item.ordem_producao_id === program.ordem_producao_id).length > 0 && <div className={card + ' p-4'}>
              <h2 className="text-sm font-black uppercase text-[#123B50]">Apontamentos desta OP</h2>
              {entries.filter(item => item.ordem_producao_id === program.ordem_producao_id).slice(0, 8).map(entry => <p key={entry.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm font-bold text-slate-600">
                <span>{timeLabel(entry.inicio_em)}–{timeLabel(entry.fim_em)} · boas {numberLabel(entry.quantidade_boa)} · refugo {numberLabel(entry.quantidade_refugada)}{entry.motivo_parada ? ' · ' + entry.motivo_parada : ''}</span>
                <span className={entry.fim_em ? 'text-emerald-700' : 'text-amber-700'}>{entry.fim_em ? 'Enviado ao PCP' : 'Em andamento'}</span>
              </p>)}
            </div>}
          </>}
        </div>
      </section>}

      {activeTab === 'SEMANA' && <section className={card + ' p-4'}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h2 className="text-sm font-black uppercase text-[#123B50]">O que você tem para fazer na semana</h2>
          <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">{weekPrograms.length} tarefa(s)</span>
        </div>
        <div className="mt-3 space-y-4">
          {weekDays.map(day => {
            const tasks = programs.filter(item => dayKey(new Date(item.inicio_planejado)) === day)
            return <div key={day}>
              <h3 className="flex items-center justify-between gap-2 text-xs font-black uppercase text-[#123B50]"><span>{new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span><span className="text-slate-500">{tasks.length ? tasks.length + ' tarefa(s)' : 'sem programação'}</span></h3>
              {tasks.map(item => {
                const itemOrder = item.ordem_producao_id ? orderMap.get(item.ordem_producao_id) : undefined
                const itemProduct = productMap.get(item.produto_id ?? itemOrder?.produto_id ?? '')
                const itemMachine = machineMap.get(item.maquina_id ?? '')
                return <div key={item.id} className="mt-2 grid grid-cols-2 items-center gap-2 border border-slate-200 bg-white p-3 text-sm md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <span className="font-black text-[#123B50]">OP {itemOrder?.numero_op ?? '—'} · {itemProduct?.codigo ?? '—'}</span>
                  <span className="min-w-0 truncate font-bold text-slate-600" title={itemProduct?.nome ?? ''}>{itemProduct?.nome ?? 'sem descrição'}</span>
                  <span className="font-bold text-slate-600">{itemMachine?.codigo ?? 'máquina —'}</span>
                  <span className="font-bold text-slate-600">{timeLabel(item.inicio_planejado)}–{timeLabel(item.fim_planejado)}</span>
                  <button type="button" onClick={() => { setSelectedProgramId(item.id); setSelectedDay(day); setActiveTab('DIA') }} className="min-h-[38px] border-2 border-[#2D8DB8] bg-white px-3 text-xs font-black text-[#2D8DB8] hover:bg-[#EAF6FA]">ABRIR</button>
                </div>
              })}
              {tasks.length === 0 && <p className="mt-2 border border-dashed border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-500">Dia livre na sua agenda.</p>}
            </div>
          })}
        </div>
      </section>}

      {activeTab === 'MAQUINAS' && <section className={card + ' p-4'}>
        <h2 className="text-sm font-black uppercase text-[#123B50]">Máquinas da sua semana</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">São os equipamentos onde o PCP atribuiu tarefa ao seu cartão. O estado vem de erp_maquinas e das paradas abertas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {machineTasks.map(({ machine: itemMachine, tasks }) => {
            const open = stoppages.find(item => item.maquina_id === itemMachine?.id && !item.fim)
            const tone = open ? 'border-amber-300 bg-amber-50 text-amber-900' : itemMachine?.status && itemMachine.status.toLocaleLowerCase('pt-BR') !== 'ativa' ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-emerald-300 bg-emerald-50 text-emerald-900'
            const nextTask = tasks[0]
            return <button key={itemMachine?.id ?? 'sem-maquina'} type="button" disabled={!nextTask} onClick={() => { if (!nextTask) return; setSelectedProgramId(nextTask.id); setSelectedDay(dayKey(new Date(nextTask.inicio_planejado))); setActiveTab('DIA') }} className={card + ' min-h-[128px] border-2 p-4 text-left ' + tone}>
              <strong className="block text-lg font-black">{itemMachine?.codigo ?? 'Sem máquina'}</strong>
              <span className="mt-1 block text-sm font-bold">{itemMachine?.nome ?? 'Tarefa sem equipamento atribuído'}</span>
              <span className="mt-2 block text-xs font-black uppercase">{open ? 'PARADA: ' + open.motivo : (tasks[0] ? (machineMap.get(tasks[0].maquina_id ?? '')?.status ?? 'em produção') : '—')}</span>
              <span className="mt-2 block text-xs font-bold">{tasks.length} tarefa(s) na semana · plano {numberLabel(tasks.reduce((sum, item) => sum + Number(item.quantidade_planejada ?? 0), 0))} un</span>
            </button>
          })}
          {machineTasks.length === 0 && <p className="col-span-full border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">Nenhuma máquina atribuída a este cartão na semana selecionada.</p>}
        </div>
      </section>}

      {activeTab === 'FICHA' && <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={card + ' p-4'}>
          <h2 className="text-sm font-black uppercase text-[#123B50]">Ficha de processo online da peça</h2>
          {!program ? <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Selecione uma tarefa em Programação do dia: a ficha é a do produto daquela OP.</p>
            : !productId ? <p className="mt-3 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800"><AlertTriangle size={16} className="mr-1 inline" />A tarefa não tem produto vinculado na programação do PCP.</p>
            : !ficha ? <p className="mt-3 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800"><AlertTriangle size={16} className="mr-1 inline" />Nenhuma ficha de processo cadastrada para {product?.codigo ?? productId} nesta empresa. O cadastro é feito em PCP · Fichas de Processo.</p>
              : <>
                <p className="mt-2 text-xs font-bold text-slate-500">Ficha {ficha.codigo_ficha} · status {ficha.status ?? '—'} · versão {numberLabel(ficha.versao_ficha)} / revisão {numberLabel(ficha.revisao)} · categoria {ficha.categoria_processo ?? '—'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                  {[['Ciclo (s)', ficha.ciclo_seg], ['Peso peça', ficha.peso_peca], ['Peso canal', ficha.peso_canal], ['Fechamento', ficha.forca_fechamento], ['Pressão trab.', ficha.pressao_trabalho], ['Temp. trab.', ficha.temperatura_trabalho], ['Pressão injeção', ficha.pressao_injecao], ['Homologação', ficha.data_homologacao], ['Responsável técnico', ficha.assinatura_tecnica]].map(([title, value]) => <div key={String(title)} className="border border-slate-200 p-2"><p className={label}>{String(title)}</p><p className="mt-1 font-black">{typeof value === 'number' ? numberLabel(value) : (value ? String(value) : '—')}</p></div>)}
                </div>
                {ficha.imagem_url && <img src={ficha.imagem_url} alt={'Ferramental da ficha ' + ficha.codigo_ficha} className="mt-3 max-h-[320px] w-full border border-slate-200 object-contain bg-white" />}
                {ficha.observacoes_setup && <p className="mt-3 border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700"><strong>Setup: </strong>{ficha.observacoes_setup}</p>}
                {ficha.observacoes && <p className="mt-2 text-sm text-slate-600">{ficha.observacoes}</p>}
              </>}
        </div>
        <div className="space-y-3">
          <div className={card + ' p-4'}>
            <h2 className="text-sm font-black uppercase text-[#123B50]">Sequência de operações</h2>
            {ficha ? (fichaOperations.length ? <ol className="mt-3 space-y-2">{fichaOperations.map(op => <li key={op.id} className="flex items-start justify-between gap-3 border border-slate-200 bg-white p-3 text-sm"><span className="min-w-0 font-bold text-slate-700"><strong className="text-[#123B50]">{op.sequencial_operacao}.</strong> {op.descricao_operacao}</span><span className="shrink-0 font-black text-[#2D8DB8]">{numberLabel(op.tempo_minutos)} min</span></li>)}</ol> : <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Esta ficha ainda não tem operações cadastradas (sequência, posto e tempo).</p>)
              : <p className="mt-3 text-sm text-slate-500">Sem ficha selecionada.</p>}
          </div>
          <div className={card + ' p-4'}>
            <h2 className="text-sm font-black uppercase text-[#123B50]">Parâmetros aprovados da receita</h2>
            {recipe ? <>
              <p className="mt-2 text-xs font-bold text-slate-500">Revisão {numberLabel(recipe.versao)} · ciclo {numberLabel(recipe.ciclo_seg)} s · setup {numberLabel(recipe.setup_min)} min</p>
              {Object.keys(recipe.parametros ?? {}).length > 0 ? <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{Object.entries(recipe.parametros ?? {}).map(([key, value]) => <div key={key} className="border border-slate-200 bg-white p-2"><dt className={label}>{key}</dt><dd className="mt-1 break-words font-bold text-slate-700">{shortText(value)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">A receita aprovada não traz parâmetros adicionais.</p>}
              {recipe.observacoes && <p className="mt-3 text-sm font-bold text-slate-600">{recipe.observacoes}</p>}
            </> : <p className="mt-3 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800"><AlertTriangle size={16} className="mr-1 inline" />Nenhuma receita APROVADA para este produto/máquina: sem ela o apontamento não libera o início.</p>}
            {ficha && Object.keys(ficha.zonas_temperatura ?? {}).length > 0 && <div className="mt-4 border-t border-slate-200 pt-3"><h3 className="text-xs font-black uppercase text-[#123B50]">Zonas de temperatura da ficha</h3><dl className="mt-2 grid grid-cols-2 gap-2 text-xs">{Object.entries(ficha.zonas_temperatura ?? {}).map(([key, value]) => <div key={key} className="border border-slate-200 bg-white p-2"><dt className={label}>{key}</dt><dd className="mt-1 font-black text-slate-700">{shortText(value)}</dd></div>)}</dl></div>}
            {ficha && Object.keys(ficha.parametros_tecnicos ?? {}).length > 0 && <div className="mt-4 border-t border-slate-200 pt-3"><h3 className="text-xs font-black uppercase text-[#123B50]">Parâmetros técnicos por categoria</h3><pre className="mt-2 max-h-56 overflow-auto rounded-[3px] border border-slate-200 bg-slate-50 p-2 text-[11px]">{JSON.stringify(ficha.parametros_tecnicos, null, 2)}</pre></div>}
          </div>
        </div>
      </section>}
    </div>
  </main>
}
