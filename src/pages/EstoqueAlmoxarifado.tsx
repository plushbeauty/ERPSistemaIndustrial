/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-MODULO-PREMIUM-20261101-02 — Almoxarifado do Estoque no padrão visual aprovado
 * @STATUS_APROVACAO: APLICACAO A TODOS OS MODULOS AUTORIZADA PELO PROPRIETARIO EM 2026-11-01
 *
 * Painel de almoxarifado do tenant autenticado. Os números vêm de erp_produtos,
 * erp_estoque_localizacoes, erp_estoque_reservas, erp_estoque_lotes,
 * erp_estoque_movimentos e erp_estoque_inventarios. A única gravação da tela é
 * a movimentação manual pela RPC erp_estoque_registrar_movimento, que exige a
 * permissão estoque.movimentar e recalcula o saldo no servidor. Onde a base não
 * tem o número, a tela mostra traço em vez de estimar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Banknote,
  Boxes,
  CalendarDays,
  Clock,
  Download,
  Filter,
  MapPin,
  Package,
  PackagePlus,
  Search,
  Warehouse,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import ModuleWorkspace from '../components/layout/ModuleRail'
import { moduleNavs } from '../config/moduleNav'

type Produto = {
  id: string
  codigo: string | null
  nome: string | null
  unidade: string | null
  estoque_atual: number | null
  ponto_reposicao?: number | null
  estoque_maximo?: number | null
  custo_medio?: number | null
  localizacao_padrao_id?: string | null
  grupo?: string | null
  controla_lote?: boolean
}
type Localizacao = { id: string; codigo: string | null; nome: string | null; tipo?: string | null }
type Reserva = { produto_id: string | null; quantidade: number | null }
type Lote = {
  id: string
  produto_id: string | null
  lote_interno: string | null
  lote_fornecedor: string | null
  quantidade_disponivel: number | null
  status_inspecao: string | null
  localizacao: string | null
  data_entrada: string | null
}
type Movimento = {
  id: string
  produto_id: string | null
  tipo: string | null
  quantidade: number | null
  origem: string | null
  documento: string | null
  created_at: string | null
}
type Inventario = { id: string; status: string | null; iniciado_em: string | null; encerrado_em: string | null }
type ItemResumo = { id: string; divergencia: number | null; quantidade_contada: number | null }

const COLUNAS_PRODUTO_COMPLETA = 'id,codigo,nome,unidade,estoque_atual,ponto_reposicao,estoque_maximo,custo_medio,localizacao_padrao_id,grupo,controla_lote'
const COLUNAS_PRODUTO_MINIMA = 'id,codigo,nome,unidade,estoque_atual'
const COLUNAS_LOCALIZACAO_COMPLETA = 'id,codigo,nome,tipo'
const COLUNAS_LOCALIZACAO_MINIMA = 'id,codigo,nome'
const COLUNAS_LOTE = 'id,produto_id,lote_interno,lote_fornecedor,quantidade_disponivel,status_inspecao,localizacao,data_entrada'
const COLUNAS_MOVIMENTO = 'id,produto_id,tipo,quantidade,origem,documento,created_at'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

function consulta<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.resolve(promise)
}

const fmtQtd = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(v))
const fmtMoeda = (v: number | null) => (v === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v))
const fmtData = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear())}`
}
const fmtDataHora = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtHora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const ENTRADAS = new Set(['entrada', 'compra', 'devolucao', 'producao'])
const rotuloTipo = (tipo: string | null) => {
  const t = String(tipo ?? '').toLowerCase()
  if (t === 'entrada') return 'Entrada'
  if (t === 'compra') return 'Compra'
  if (t === 'saida') return 'Saída'
  if (t === 'venda') return 'Venda'
  if (t === 'consumo') return 'Consumo'
  if (t === 'devolucao') return 'Devolução'
  if (t === 'transferencia') return 'Transferência'
  return t ? t[0].toUpperCase() + t.slice(1) : 'Movimento'
}

type Situacao = 'sem_saldo' | 'abaixo_minimo' | 'reservado' | 'normal' | 'sem_dado'
const rotuloSituacao: Record<Situacao, string> = {
  sem_saldo: 'Sem saldo', abaixo_minimo: 'Abaixo do mínimo', reservado: 'Com reserva', normal: 'Normal', sem_dado: 'Sem ponto de reposição',
}
const tomSituacao: Record<Situacao, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  sem_saldo: 'danger', abaixo_minimo: 'warning', reservado: 'info', normal: 'success', sem_dado: 'neutral',
}

type FiltroSituacao = 'todas' | Situacao

type FormMovimento = {
  tipo: 'entrada' | 'saida' | 'transferencia'
  quantidade: string
  localizacaoOrigem: string
  localizacaoDestino: string
  documento: string
  observacao: string
}

const formVazio: FormMovimento = { tipo: 'entrada', quantidade: '', localizacaoOrigem: '', localizacaoDestino: '', documento: '', observacao: '' }

export default function EstoqueAlmoxarifado() {
  const nav = useMemo(() => moduleNavs.find(item => item.key === 'estoque') ?? null, [])
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'sem_empresa' | 'erro'>('carregando')
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [agora, setAgora] = useState(() => Date.now())

  const [empresa, setEmpresa] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([])
  const [reservas, setReservas] = useState<Map<string, number>>(new Map())
  const [lotes, setLotes] = useState<Lote[]>([])
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [inventario, setInventario] = useState<Inventario | null>(null)
  const [resumoInventario, setResumoInventario] = useState<ItemResumo[] | null>(null)
  const [semCusto, setSemCusto] = useState(false)

  const [filtros, setFiltros] = useState<{ situacao: FiltroSituacao; localizacao: string; grupo: string; busca: string }>({ situacao: 'todas', localizacao: 'todas', grupo: 'todos', busca: '' })
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [movimento, setMovimento] = useState<{ produto: Produto } | null>(null)
  const [form, setForm] = useState<FormMovimento>(formVazio)
  const [gravando, setGravando] = useState(false)
  const [feedback, setFeedback] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 60_000)
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

      const [produtoRes, localizacaoRes, reservaRes, loteRes, movimentoRes, inventarioRes, empresaRes] = await Promise.all([
        fetchAllPages<Produto>((de, ate) => supabase.from('erp_produtos').select(COLUNAS_PRODUTO_COMPLETA).eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(de, ate))
          .then(dados => ({ dados, completa: true }))
          .catch(async () => {
            try {
              const dados = await fetchAllPages<Produto>((de, ate) => supabase.from('erp_produtos').select(COLUNAS_PRODUTO_MINIMA).eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(de, ate))
              return { dados, completa: false }
            } catch {
              return { dados: null as Produto[] | null, completa: false }
            }
          }),
        fetchAllPages<Localizacao>((de, ate) => supabase.from('erp_estoque_localizacoes').select(COLUNAS_LOCALIZACAO_COMPLETA).eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(de, ate))
          .catch(async () => {
            try {
              return await fetchAllPages<Localizacao>((de, ate) => supabase.from('erp_estoque_localizacoes').select(COLUNAS_LOCALIZACAO_MINIMA).eq('empresa_id', tenant).eq('ativo', true).order('codigo').range(de, ate))
            } catch {
              return null as Localizacao[] | null
            }
          }),
        fetchAllPages<Reserva>((de, ate) => supabase.from('erp_estoque_reservas').select('produto_id,quantidade').eq('empresa_id', tenant).eq('status', 'ATIVA').range(de, ate)).catch(() => null),
        consulta(supabase.from('erp_estoque_lotes').select(COLUNAS_LOTE).eq('empresa_id', tenant).order('data_entrada', { ascending: false }).limit(400).then(r => (r.error ? null : ((r.data ?? []) as Lote[])))).catch(() => null),
        consulta(supabase.from('erp_estoque_movimentos').select(COLUNAS_MOVIMENTO).eq('empresa_id', tenant).order('created_at', { ascending: false }).limit(300).then(r => (r.error ? null : ((r.data ?? []) as Movimento[])))).catch(() => null),
        consulta(supabase.from('erp_estoque_inventarios').select('id,status,iniciado_em,encerrado_em').eq('empresa_id', tenant).order('iniciado_em', { ascending: false }).limit(1).then(r => (r.error ? null : (((r.data ?? []) as Inventario[])[0] ?? null)))).catch(() => null),
        consulta(supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', tenant).maybeSingle().then(r => r.data as { nome_fantasia: string | null; razao_social: string | null } | null)).catch(() => null),
      ])

      const produtosLidos = produtoRes.dados
      if (produtosLidos === null) {
        setEstado('erro')
        setErro('Não foi possível ler os produtos desta empresa no Supabase. Verifique o acesso RLS do perfil e se a empresa está ativa.')
        return
      }

      const pendencias: string[] = []
      if (!produtoRes.completa) {
        setSemCusto(true)
        pendencias.push('As colunas de ponto de reposição, estoque máximo e custo médio não estão disponíveis nesta base: os KPIs de valor e de recompra ficam em traço.')
      }
      if (localizacaoRes === null) pendencias.push('A tabela erp_estoque_localizacoes não pôde ser lida: os itens aparecem sem endereço de armazenagem.')
      if (reservaRes === null) pendencias.push('A leitura de erp_estoque_reservas exige permissão de estoque: o saldo reservado não pôde ser confrontado com o saldo físico.')
      if (loteRes === null) pendencias.push('Sem leitura de erp_estoque_lotes: o painel de lotes em inspeção fica vazio até o recebimento por NF-e ser usado.')
      if (movimentoRes === null) pendencias.push('O histórico de erp_estoque_movimentos exige a permissão estoque.ver: as movimentações dos últimos 7 dias não puderam ser contadas.')

      const resumo = inventarioRes
        ? await consulta(supabase.from('erp_estoque_inventario_itens')
            .select('id,divergencia,quantidade_contada')
            .eq('empresa_id', tenant)
            .eq('inventario_id', inventarioRes.id)
            .limit(5000)
            .then(r => (r.error ? null : ((r.data ?? []) as ItemResumo[]))))
            .catch(() => null)
        : null

      const mapaReservas = new Map<string, number>()
      for (const r of reservaRes ?? []) {
        if (!r.produto_id) continue
        mapaReservas.set(r.produto_id, (mapaReservas.get(r.produto_id) ?? 0) + (numero(r.quantidade) ?? 0))
      }

      setProdutos(produtosLidos)
      setLocalizacoes(localizacaoRes ?? [])
      setReservas(mapaReservas)
      setLotes(loteRes ?? [])
      setMovimentos(movimentoRes ?? [])
      setInventario(inventarioRes)
      setResumoInventario(resumo)
      setEmpresa(empresaRes?.nome_fantasia?.trim() || empresaRes?.razao_social?.trim() || 'Empresa vinculada')
      setAvisos(pendencias)
      setEstado('pronto')
    } catch (falha) {
      setEstado('erro')
      setErro(falha instanceof Error ? falha.message : 'Falha ao consultar o banco do ERP.')
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  useEffect(() => {
    if (!detalheId && !movimento) return
    const fechar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (movimento) setMovimento(null)
      else setDetalheId(null)
    }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [detalheId, movimento])

  const localizacaoPorId = useMemo(() => new Map(localizacoes.map(l => [l.id, l])), [localizacoes])
  const produtoPorId = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos])

  const rotuloLocal = useCallback((id: string | null | undefined) => {
    if (!id) return 'Sem endereço'
    const l = localizacaoPorId.get(id)
    if (!l) return 'Endereço removido'
    return [l.codigo, l.nome].filter(Boolean).join(' · ') || 'Endereço'
  }, [localizacaoPorId])

  const linhas = useMemo(() => produtos.map(p => {
    const saldo = numero(p.estoque_atual)
    const reservado = reservas.get(p.id) ?? null
    const disponivel = saldo === null ? null : Math.max(saldo - (reservado ?? 0), 0)
    const ponto = numero(p.ponto_reposicao ?? null)
    const situacao: Situacao = saldo === null
      ? 'sem_dado'
      : saldo <= 0
        ? 'sem_saldo'
        : ponto !== null && ponto > 0 && saldo <= ponto
          ? 'abaixo_minimo'
          : reservado !== null && reservado > 0
            ? 'reservado'
            : ponto === null ? 'sem_dado' : 'normal'
    return { produto: p, saldo, reservado, disponivel, ponto, situacao }
  }), [produtos, reservas])

  const grupos = useMemo(() => {
    const set = new Set<string>()
    for (const l of linhas) if (l.produto.grupo) set.add(l.produto.grupo)
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [linhas])

  const linhasFiltradas = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase()
    return linhas.filter(l => {
      if (filtros.situacao !== 'todas' && l.situacao !== filtros.situacao) return false
      if (filtros.grupo !== 'todos' && (l.produto.grupo ?? '') !== filtros.grupo) return false
      if (filtros.localizacao !== 'todas') {
        const alvo = l.produto.localizacao_padrao_id ?? ''
        if (filtros.localizacao === '__sem__' ? alvo !== '' : alvo !== filtros.localizacao) return false
      }
      if (busca) {
        const texto = `${l.produto.codigo ?? ''} ${l.produto.nome ?? ''}`.toLowerCase()
        if (!texto.includes(busca)) return false
      }
      return true
    }).sort((a, b) => String(a.produto.codigo ?? '').localeCompare(String(b.produto.codigo ?? ''), 'pt-BR'))
  }, [filtros, linhas])

  const ocupacao = useMemo(() => {
    const porLocal = new Map<string, number>()
    let semEndereco = 0
    for (const l of linhas) {
      if (l.saldo === null || l.saldo <= 0) continue
      const alvo = l.produto.localizacao_padrao_id
      if (!alvo || !localizacaoPorId.has(alvo)) { semEndereco += 1; continue }
      porLocal.set(alvo, (porLocal.get(alvo) ?? 0) + 1)
    }
    const itensComSaldo = linhas.filter(l => (l.saldo ?? 0) > 0).length
    const lista = [...porLocal.entries()]
      .map(([id, quantidade]) => ({ rotulo: rotuloLocal(id), quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8)
    if (semEndereco > 0) lista.push({ rotulo: 'Sem endereço', quantidade: semEndereco })
    return { lista, itensComSaldo }
  }, [linhas, localizacaoPorId, rotuloLocal])

  const kpis = useMemo(() => {
    const comSaldo = linhas.filter(l => (l.saldo ?? 0) > 0).length
    const valor = semCusto ? null : linhas.reduce((soma, l) => soma + ((l.saldo ?? 0) * (numero(l.produto.custo_medio ?? null) ?? 0)), 0)
    const abaixo = linhas.filter(l => l.situacao === 'abaixo_minimo' || l.situacao === 'sem_saldo').length
    const desde = agora - 7 * 86_400_000
    const recentes = movimentos.filter(m => { const t = m.created_at ? Date.parse(m.created_at) : Number.NaN; return Number.isFinite(t) && t >= desde })
    const entradas = recentes.filter(m => ENTRADAS.has(String(m.tipo ?? '').toLowerCase())).length
    const saidas = recentes.filter(m => ['saida', 'venda', 'consumo'].includes(String(m.tipo ?? '').toLowerCase())).length
    return { comSaldo, total: linhas.length, valor, abaixo, recentes, entradas, saidas, semHistorico: movimentos.length === 0 }
  }, [agora, linhas, movimentos, semCusto])

  const lotesEmInspecao = useMemo(() => lotes.filter(l => String(l.status_inspecao ?? '').toUpperCase() !== 'APROVADO').slice(0, 6), [lotes])

  const detalhes = useMemo(() => {
    if (!detalheId) return null
    const linha = linhas.find(l => l.produto.id === detalheId)
    if (!linha) return null
    return {
      ...linha,
      lotes: lotes.filter(l => l.produto_id === detalheId).slice(0, 8),
      movimentos: movimentos.filter(m => m.produto_id === detalheId).slice(0, 8),
    }
  }, [detalheId, linhas, lotes, movimentos])

  const resumoInventarioView = useMemo(() => {
    if (!inventario) return null
    const itens = resumoInventario
    const divergentes = itens ? itens.filter(i => (numero(i.divergencia) ?? 0) !== 0).length : null
    const contados = itens ? itens.filter(i => numero(i.quantidade_contada) !== null).length : null
    return { inventario, itens: itens?.length ?? null, contados, divergentes }
  }, [inventario, resumoInventario])

  function abrirMovimento(produto: Produto) {
    setFeedback(null)
    setForm({ ...formVazio, localizacaoDestino: produto.localizacao_padrao_id ?? '', localizacaoOrigem: produto.localizacao_padrao_id ?? '' })
    setMovimento({ produto })
  }

  async function gravarMovimento() {
    if (!movimento) return
    const quantidade = Number(form.quantidade.replace(',', '.'))
    if (!Number.isFinite(quantidade) || quantidade <= 0) { setFeedback({ tom: 'erro', texto: 'Informe uma quantidade maior que zero.' }); return }
    if (form.tipo === 'transferencia') {
      if (!form.localizacaoOrigem || !form.localizacaoDestino) { setFeedback({ tom: 'erro', texto: 'Transferência exige endereço de origem e de destino.' }); return }
      if (form.localizacaoOrigem === form.localizacaoDestino) { setFeedback({ tom: 'erro', texto: 'Origem e destino da transferência precisam ser diferentes.' }); return }
    }
    setGravando(true)
    setFeedback(null)
    try {
      const { data: tenantData, error: tenantErro } = await supabase.rpc('erp_current_empresa_id')
      if (tenantErro) throw tenantErro
      const tenant = typeof tenantData === 'string' ? tenantData : null
      if (!tenant) throw new Error('A sessão não possui empresa vinculada.')
      const resposta = await supabase.rpc('erp_estoque_registrar_movimento', {
        p_empresa_id: tenant,
        p_produto_id: movimento.produto.id,
        p_tipo: form.tipo,
        p_quantidade: quantidade,
        p_origem: 'almoxarifado',
        p_documento: form.documento.trim() || null,
        p_observacao: form.observacao.trim() || `${rotuloTipo(form.tipo)} registrada pelo Almoxarifado.`,
        p_localizacao_origem_id: form.tipo === 'entrada' ? null : form.localizacaoOrigem || null,
        p_localizacao_destino_id: form.tipo === 'saida' ? null : form.localizacaoDestino || null,
      })
      if (resposta.error) throw resposta.error
      setFeedback({ tom: 'ok', texto: `${rotuloTipo(form.tipo)} de ${fmtQtd(quantidade)} registrada para ${movimento.produto.codigo ?? movimento.produto.nome ?? 'item'}. O saldo foi recalculado no servidor.` })
      await carregar()
    } catch (falha) {
      setFeedback({ tom: 'erro', texto: falha instanceof Error ? falha.message : 'Não foi possível registrar a movimentação.' })
    } finally {
      setGravando(false)
    }
  }

  function exportarSaldos() {
    const cabecalho = ['Endereco', 'Codigo', 'Descricao', 'Unidade', 'Saldo', 'Reservado', 'Disponivel', 'Ponto_de_reposicao', 'Situacao']
    const linhasCsv = linhasFiltradas.map(l => [
      rotuloLocal(l.produto.localizacao_padrao_id),
      l.produto.codigo ?? '',
      l.produto.nome ?? '',
      l.produto.unidade ?? '',
      String(l.saldo ?? ''),
      String(l.reservado ?? ''),
      String(l.disponivel ?? ''),
      String(l.ponto ?? ''),
      rotuloSituacao[l.situacao],
    ].map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(';'))
    const csv = [cabecalho.join(';'), ...linhasCsv].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `almoxarifado-saldos-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const agoraDate = new Date(agora)
  const dataExtenso = `${DIAS_SEMANA[agoraDate.getDay()]}, ${String(agoraDate.getDate()).padStart(2, '0')} de ${MESES[agoraDate.getMonth()]} de ${agoraDate.getFullYear()}`

  const kpiCards = [
    { label: 'Itens com saldo', value: fmtQtd(kpis.comSaldo), tone: 'info' as const, icon: Boxes, hint: `de ${fmtQtd(kpis.total)} itens ativos da empresa` },
    { label: 'Valor em estoque', value: kpis.valor === null ? '—' : fmtMoeda(kpis.valor), tone: 'success' as const, icon: Banknote, hint: kpis.valor === null ? 'custo médio indisponível nesta base' : 'saldo físico × custo médio de erp_produtos' },
    { label: 'Recompra necessária', value: fmtQtd(kpis.abaixo), tone: 'warning' as const, icon: AlertTriangle, hint: kpis.abaixo === 0 ? 'nenhum item abaixo do ponto de reposição' : 'saldo no piso ou zerado' },
    { label: 'Movimentações (7 dias)', value: kpis.semHistorico ? '—' : fmtQtd(kpis.recentes.length), tone: 'neutral' as const, icon: ArrowLeftRight, hint: kpis.semHistorico ? 'sem leitura de erp_estoque_movimentos nesta sessão' : `${kpis.entradas} entradas · ${kpis.saidas} saídas` },
  ]

  return (
    <ModuleWorkspace nav={nav ?? moduleNavs[0]}>
      <section className="smp-topbar">
        <div>
          <strong style={{ display: 'block', fontSize: 15, fontWeight: 900, color: 'var(--smp-ink)' }}>Almoxarifado</strong>
          <span style={{ color: 'var(--smp-muted)', fontSize: 12, fontWeight: 700 }}>Saldo físico, reservas de pedido, endereços e lotes do tenant autenticado.</span>
        </div>
        <div className="smp-topbar-spacer" />
        <div className="smp-topbar-meta"><CalendarDays size={15} aria-hidden />{dataExtenso}</div>
        <div className="smp-topbar-meta"><Clock size={15} aria-hidden /><strong>{fmtHora(agoraDate)}</strong></div>
        <div className="smp-unit"><Warehouse size={15} aria-hidden />{empresa}</div>
      </section>

      {avisos.length > 0 && estado === 'pronto' && (
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
          <Warehouse size={26} aria-hidden />
          <strong>Esta sessão não está vinculada a uma empresa</strong>
          <p>O Almoxarifado opera sobre os dados da empresa do usuário autenticado. Vincule a empresa no cadastro do usuário para carregar os saldos.</p>
        </div></div>
      )}

      {estado === 'erro' && (
        <div className="smp-panel"><div className="smp-state smp-state--error">
          <AlertTriangle size={26} aria-hidden />
          <strong>Não foi possível ler os saldos de estoque</strong>
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
                    <strong className="smp-kpi-value">{card.value}</strong>
                    <div className="smp-kpi-foot"><span className="smp-kpi-hint">{card.hint}</span></div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="smp-grid">
            <div className="smp-col">
              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Package size={18} aria-hidden />
                  <div>
                    <h2 className="smp-panel-title">Saldo por Endereço e Item</h2>
                    <p className="smp-panel-sub">{linhasFiltradas.length} de {linhas.length} itens · disponível = saldo físico − reservas ativas</p>
                  </div>
                  <div className="smp-panel-actions">
                    <button type="button" className="smp-btn smp-btn--ghost" onClick={exportarSaldos} disabled={linhasFiltradas.length === 0}>
                      <Download size={15} aria-hidden />Exportar
                    </button>
                  </div>
                </div>
                <div className="smp-panel-body smp-panel-body--flush">
                  {linhasFiltradas.length === 0 ? (
                    <div className="smp-state">
                      <Search size={24} aria-hidden />
                      <strong>Nenhum item com os filtros atuais</strong>
                      <p>Limpe a busca ou os filtros da coluna lateral para ver todos os itens ativos desta empresa.</p>
                    </div>
                  ) : (
                    <div className="smp-tablewrap">
                      <table className="smp-table">
                        <thead>
                          <tr>
                            <th>Endereço</th><th>Item</th><th className="is-num">Em estoque</th><th className="is-num">Reservado</th>
                            <th className="is-num">Disponível</th><th className="is-num">Ponto de reposição</th><th>Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhasFiltradas.slice(0, 80).map(l => (
                            <tr key={l.produto.id} style={{ cursor: 'pointer' }} onClick={() => setDetalheId(l.produto.id)}>
                              <td className="is-muted is-nowrap">{rotuloLocal(l.produto.localizacao_padrao_id)}</td>
                              <td>
                                <span className="is-strong">{l.produto.codigo ?? '—'}</span>
                                <span className="is-muted" style={{ display: 'block', fontWeight: 600 }}>{l.produto.nome ?? 'Item sem descrição'}</span>
                              </td>
                              <td className="is-num">{fmtQtd(l.saldo)}<span className="is-muted" style={{ marginLeft: 4, fontSize: 11 }}>{l.produto.unidade ?? ''}</span></td>
                              <td className="is-num">{l.reservado === null ? '—' : fmtQtd(l.reservado)}</td>
                              <td className="is-num is-strong">{fmtQtd(l.disponivel)}</td>
                              <td className="is-num">{l.ponto === null ? '—' : fmtQtd(l.ponto)}</td>
                              <td><span className="smp-chip" data-tone={tomSituacao[l.situacao]}><i />{rotuloSituacao[l.situacao]}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {linhasFiltradas.length > 80 && (
                        <p style={{ margin: 0, padding: '10px 14px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 700 }}>
                          Exibindo 80 itens por código, de {linhasFiltradas.length}. Refine a busca ou os filtros para reduzir a lista.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Archive size={18} aria-hidden />
                  <div>
                    <h2 className="smp-panel-title">Lotes em Inspeção</h2>
                    <p className="smp-panel-sub">{lotes.length} lotes lidos de erp_estoque_lotes · {lotesEmInspecao.length} aguardando liberação da Qualidade</p>
                  </div>
                </div>
                <div className="smp-panel-body smp-panel-body--flush">
                  {lotes.length === 0 ? (
                    <div className="smp-state">
                      <Archive size={22} aria-hidden />
                      <strong>Nenhum lote registrado</strong>
                      <p>Os lotes entram aqui quando o recebimento por NF-e grava em erp_estoque_lotes para esta empresa.</p>
                    </div>
                  ) : (
                    <div className="smp-tablewrap">
                      <table className="smp-table">
                        <thead><tr><th className="is-nowrap">Entrada</th><th>Lote</th><th>Item</th><th>Posição</th><th className="is-num">Disponível</th><th>Inspeção</th></tr></thead>
                        <tbody>
                          {(lotesEmInspecao.length > 0 ? lotesEmInspecao : lotes.slice(0, 6)).map(l => {
                            const produto = l.produto_id ? produtoPorId.get(l.produto_id) : null
                            return (
                              <tr key={l.id}>
                                <td className="is-nowrap is-muted">{fmtData(l.data_entrada)}</td>
                                <td className="is-strong">{l.lote_interno ?? '—'}</td>
                                <td>{produto ? `${produto.codigo ?? ''} ${produto.nome ?? ''}`.trim() : 'Item não identificado'}</td>
                                <td className="is-muted">{l.localizacao ?? '—'}</td>
                                <td className="is-num">{fmtQtd(numero(l.quantidade_disponivel))}</td>
                                <td><span className="smp-chip" data-tone={String(l.status_inspecao ?? '').toUpperCase() === 'APROVADO' ? 'success' : String(l.status_inspecao ?? '').toUpperCase() === 'REPROVADO' ? 'danger' : 'warning'}><i />{l.status_inspecao ?? '—'}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
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
                    <button type="button" className="smp-btn smp-btn--ghost" onClick={() => setFiltros({ situacao: 'todas', localizacao: 'todas', grupo: 'todos', busca: '' })}>Limpar</button>
                  </div>
                </div>
                <div className="smp-panel-body">
                  <label className="smp-field"><span>Buscar código ou descrição</span>
                    <input className="smp-input" value={filtros.busca} onChange={event => setFiltros(f => ({ ...f, busca: event.target.value }))} placeholder="Ex.: 1234 ou parafuso" />
                  </label>
                  <label className="smp-field"><span>Situação</span>
                    <select className="smp-select" value={filtros.situacao} onChange={event => setFiltros(f => ({ ...f, situacao: event.target.value as FiltroSituacao }))}>
                      <option value="todas">Todas as situações</option>
                      <option value="sem_saldo">Sem saldo</option>
                      <option value="abaixo_minimo">Abaixo do ponto de reposição</option>
                      <option value="reservado">Com reserva de pedido</option>
                      <option value="normal">Normal</option>
                      <option value="sem_dado">Sem dado de reposição</option>
                    </select>
                  </label>
                  <label className="smp-field"><span>Endereço</span>
                    <select className="smp-select" value={filtros.localizacao} onChange={event => setFiltros(f => ({ ...f, localizacao: event.target.value }))}>
                      <option value="todas">Todos os endereços</option>
                      <option value="__sem__">Sem endereço definido</option>
                      {localizacoes.map(l => <option key={l.id} value={l.id}>{[l.codigo, l.nome].filter(Boolean).join(' · ')}</option>)}
                    </select>
                  </label>
                  <label className="smp-field" style={{ marginBottom: 0 }}><span>Grupo</span>
                    <select className="smp-select" value={filtros.grupo} onChange={event => setFiltros(f => ({ ...f, grupo: event.target.value }))}>
                      <option value="todos">Todos os grupos</option>
                      {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <MapPin size={18} aria-hidden />
                  <h2 className="smp-panel-title">Ocupação de Endereços</h2>
                </div>
                <div className="smp-panel-body">
                  {ocupacao.lista.length === 0 ? (
                    <div className="smp-state">
                      <MapPin size={22} aria-hidden />
                      <strong>Nenhum item endereçado</strong>
                      <p>Vincule o endereço padrão do item no Cadastro de Produtos para ver a distribuição da armazenagem.</p>
                    </div>
                  ) : (
                    <div className="smp-legend-list">
                      {ocupacao.lista.map(linha => (
                        <div key={linha.rotulo}>
                          <i style={{ background: linha.rotulo === 'Sem endereço' ? '#DCE7EC' : 'var(--smp-blue)' }} />
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linha.rotulo}</span>
                          <b>{fmtQtd(linha.quantidade)}</b>
                        </div>
                      ))}
                      <div style={{ marginTop: 4, color: 'var(--smp-muted)', fontSize: 11, fontWeight: 700 }}>Itens com saldo: {fmtQtd(ocupacao.itensComSaldo)}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <Clock size={18} aria-hidden />
                  <h2 className="smp-panel-title">Últimas Movimentações</h2>
                </div>
                <div className="smp-panel-body">
                  {movimentos.length === 0 ? (
                    <div className="smp-state">
                      <ArrowLeftRight size={22} aria-hidden />
                      <strong>Sem histórico lido nesta sessão</strong>
                      <p>O histórico de erp_estoque_movimentos é liberado pela permissão estoque.ver do perfil.</p>
                    </div>
                  ) : (
                    <div className="smp-events">
                      {movimentos.slice(0, 7).map(m => {
                        const produto = m.produto_id ? produtoPorId.get(m.produto_id) : null
                        const t = String(m.tipo ?? '').toLowerCase()
                        return (
                          <div className="smp-event" key={m.id}>
                            <time>{fmtDataHora(m.created_at).slice(6)}</time>
                            <i style={{ background: ENTRADAS.has(t) ? 'var(--smp-success)' : t === 'transferencia' ? 'var(--smp-planned)' : 'var(--smp-danger)' }} />
                            <span>{rotuloTipo(m.tipo)} · {produto?.codigo ?? 'item'}</span>
                            <b>{fmtQtd(numero(m.quantidade))}</b>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="smp-panel">
                <div className="smp-panel-head">
                  <PackagePlus size={18} aria-hidden />
                  <h2 className="smp-panel-title">Inventário Cíclico</h2>
                </div>
                <div className="smp-panel-body">
                  {!resumoInventarioView ? (
                    <div className="smp-state">
                      <PackagePlus size={22} aria-hidden />
                      <strong>Nenhum inventário nesta base</strong>
                      <p>As contagens de erp_estoque_inventarios desta empresa aparecem aqui. A abertura e o ajuste da contagem exigem o perfil com autorização de edição de estoque, ainda não liberado nesta instalação.</p>
                    </div>
                  ) : (
                    <>
                      <dl className="smp-dl" style={{ marginBottom: 0 }}>
                        <div><dt>Status</dt><dd>{resumoInventarioView.inventario.status ?? '—'}</dd></div>
                        <div><dt>Iniciado em</dt><dd>{fmtDataHora(resumoInventarioView.inventario.iniciado_em)}</dd></div>
                        <div><dt>Encerrado em</dt><dd>{fmtDataHora(resumoInventarioView.inventario.encerrado_em)}</dd></div>
                        <div><dt>Itens congelados</dt><dd>{fmtQtd(resumoInventarioView.itens)}</dd></div>
                        <div><dt>Contados</dt><dd>{fmtQtd(resumoInventarioView.contados)}</dd></div>
                        <div><dt>Divergências</dt><dd>{fmtQtd(resumoInventarioView.divergentes)}</dd></div>
                      </dl>
                      <p style={{ margin: '10px 0 0', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                        Esta tela é de consulta: contagem e ajuste usam as RPCs de inventário, que dependem do perfil autorizado e das migrations do inventário aplicadas no banco.
                      </p>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {detalhes && !movimento && (
        <div className="smp-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setDetalheId(null) }}>
          <div className="smp-modal" role="dialog" aria-modal="true" aria-label={`Detalhes do item ${detalhes.produto.codigo ?? ''}`}>
            <div className="smp-modal-head">
              <div>
                <h2>{detalhes.produto.codigo ?? 'Item'} · {detalhes.produto.nome ?? 'sem descrição'}</h2>
                <p>{rotuloLocal(detalhes.produto.localizacao_padrao_id)} · {rotuloSituacao[detalhes.situacao]}</p>
              </div>
              <button type="button" className="smp-modal-close" aria-label="Fechar detalhes do item" onClick={() => setDetalheId(null)}><X size={16} /></button>
            </div>
            <div className="smp-modal-body">
              <dl className="smp-dl">
                <div><dt>Saldo físico</dt><dd>{fmtQtd(detalhes.saldo)} {detalhes.produto.unidade ?? ''}</dd></div>
                <div><dt>Reservado</dt><dd>{fmtQtd(detalhes.reservado)}</dd></div>
                <div><dt>Disponível</dt><dd>{fmtQtd(detalhes.disponivel)}</dd></div>
                <div><dt>Ponto de reposição</dt><dd>{fmtQtd(detalhes.ponto)}</dd></div>
                <div><dt>Estoque máximo</dt><dd>{fmtQtd(numero(detalhes.produto.estoque_maximo ?? null))}</dd></div>
                <div><dt>Custo médio</dt><dd>{numero(detalhes.produto.custo_medio ?? null) === null ? '—' : fmtMoeda(numero(detalhes.produto.custo_medio ?? null))}</dd></div>
                <div><dt>Valor em saldo</dt><dd>{detalhes.saldo === null || numero(detalhes.produto.custo_medio ?? null) === null ? '—' : fmtMoeda(detalhes.saldo * (numero(detalhes.produto.custo_medio ?? null) ?? 0))}</dd></div>
                <div><dt>Grupo</dt><dd>{detalhes.produto.grupo ?? '—'}</dd></div>
              </dl>
              <h3>Movimentações recentes do item</h3>
              {detalhes.movimentos.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum movimento lido para este item nesta sessão.</p>
              ) : (
                <div className="smp-tablewrap">
                  <table className="smp-table">
                    <thead><tr><th className="is-nowrap">Data</th><th>Tipo</th><th className="is-num">Quantidade</th><th>Origem</th><th>Documento</th></tr></thead>
                    <tbody>
                      {detalhes.movimentos.map(m => (
                        <tr key={m.id}>
                          <td className="is-nowrap">{fmtDataHora(m.created_at)}</td>
                          <td>{rotuloTipo(m.tipo)}</td>
                          <td className="is-num">{fmtQtd(numero(m.quantidade))}</td>
                          <td className="is-muted">{m.origem ?? '—'}</td>
                          <td className="is-muted">{m.documento ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h3>Lotes do item</h3>
              {detalhes.lotes.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--smp-muted)', fontSize: 12, fontWeight: 600 }}>Nenhum lote registrado para este item.</p>
              ) : (
                <div className="smp-tablewrap">
                  <table className="smp-table">
                    <thead><tr><th className="is-nowrap">Entrada</th><th>Lote interno</th><th>Lote fornecedor</th><th className="is-num">Disponível</th><th>Inspeção</th></tr></thead>
                    <tbody>
                      {detalhes.lotes.map(l => (
                        <tr key={l.id}>
                          <td className="is-nowrap">{fmtData(l.data_entrada)}</td>
                          <td className="is-strong">{l.lote_interno ?? '—'}</td>
                          <td className="is-muted">{l.lote_fornecedor ?? '—'}</td>
                          <td className="is-num">{fmtQtd(numero(l.quantidade_disponivel))}</td>
                          <td className="is-muted">{l.status_inspecao ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="smp-btn smp-btn--primary" onClick={() => abrirMovimento(detalhes.produto)}>
                  <ArrowLeftRight size={15} aria-hidden />Movimentar este item
                </button>
                <button type="button" className="smp-btn" onClick={() => setDetalheId(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {movimento && (
        <div className="smp-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setMovimento(null) }}>
          <div className="smp-modal" role="dialog" aria-modal="true" aria-label={`Movimentar ${movimento.produto.codigo ?? 'item'}`} style={{ width: 'min(560px, 100%)' }}>
            <div className="smp-modal-head">
              <div>
                <h2>Movimentação de estoque</h2>
                <p>{movimento.produto.codigo ?? '—'} · {movimento.produto.nome ?? 'sem descrição'} — saldo atual {fmtQtd(numero(movimento.produto.estoque_atual))} {movimento.produto.unidade ?? ''}</p>
              </div>
              <button type="button" className="smp-modal-close" aria-label="Fechar movimentação" onClick={() => setMovimento(null)}><X size={16} /></button>
            </div>
            <div className="smp-modal-body">
              {feedback && (
                <div className={`smp-note${feedback.tom === 'ok' ? ' smp-note--info' : ''}`} role="status">
                  <AlertTriangle size={16} style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden />
                  <span>{feedback.texto}</span>
                </div>
              )}
              <label className="smp-field" style={{ marginTop: 14 }}><span>Tipo</span>
                <select className="smp-select" value={form.tipo} onChange={event => setForm(f => ({ ...f, tipo: event.target.value as FormMovimento['tipo'] }))}>
                  <option value="entrada">Entrada no almoxarifado</option>
                  <option value="saida">Saída / consumo</option>
                  <option value="transferencia">Transferência de endereço</option>
                </select>
              </label>
              <label className="smp-field"><span>Quantidade</span>
                <input className="smp-input" inputMode="decimal" value={form.quantidade} onChange={event => setForm(f => ({ ...f, quantidade: event.target.value }))} placeholder="0" />
              </label>
              {form.tipo !== 'entrada' && (
                <label className="smp-field"><span>Endereço de origem</span>
                  <select className="smp-select" value={form.localizacaoOrigem} onChange={event => setForm(f => ({ ...f, localizacaoOrigem: event.target.value }))}>
                    <option value="">Selecionar endereço</option>
                    {localizacoes.map(l => <option key={l.id} value={l.id}>{[l.codigo, l.nome].filter(Boolean).join(' · ')}</option>)}
                  </select>
                </label>
              )}
              {form.tipo !== 'saida' && (
                <label className="smp-field"><span>{form.tipo === 'transferencia' ? 'Endereço de destino' : 'Endereço de entrada'}</span>
                  <select className="smp-select" value={form.localizacaoDestino} onChange={event => setForm(f => ({ ...f, localizacaoDestino: event.target.value }))}>
                    <option value="">Selecionar endereço</option>
                    {localizacoes.map(l => <option key={l.id} value={l.id}>{[l.codigo, l.nome].filter(Boolean).join(' · ')}</option>)}
                  </select>
                </label>
              )}
              <label className="smp-field"><span>Documento (opcional)</span>
                <input className="smp-input" value={form.documento} onChange={event => setForm(f => ({ ...f, documento: event.target.value }))} placeholder="NF, OP ou requisição" />
              </label>
              <label className="smp-field"><span>Observação</span>
                <input className="smp-input" value={form.observacao} onChange={event => setForm(f => ({ ...f, observacao: event.target.value }))} placeholder="Motivo da movimentação" />
              </label>
              <p style={{ margin: '0 0 12px', color: 'var(--smp-muted)', fontSize: 11, fontWeight: 600, lineHeight: 1.6 }}>
                A gravação usa a RPC erp_estoque_registrar_movimento: o servidor valida a empresa da sessão, a permissão estoque.movimentar e o saldo, e aplica o movimento no estoque_atual.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="smp-btn smp-btn--primary" onClick={() => void gravarMovimento()} disabled={gravando}>
                  <PackagePlus size={15} aria-hidden />{gravando ? 'Registrando…' : 'Registrar movimentação'}
                </button>
                <button type="button" className="smp-btn" onClick={() => setMovimento(null)} disabled={gravando}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspace>
  )
}
