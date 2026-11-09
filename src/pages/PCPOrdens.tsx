/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — o botão Imprimir deixa de capturar a tela e passa a emitir a ficha operacional A4 montada do documento com dados do banco
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 — "Não basta adicionar CSS @media print para imprimir a tela atual. Quero uma estrutura própria de relatório."
 */
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Factory,
  Search,
  Plus,
  Printer,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  X,
  Sliders,
  Check,
  PackageCheck,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'
import { fetchAllPages } from '../lib/supabasePagination'
import { abrirRelatorio } from '../lib/report/abrirRelatorio'
import type { Bloco } from '../lib/report/documento'
import '../styles/synqra-premium.css'

type Product = {
  id: string
  codigo: string
  nome: string
  estoque_atual: number
  unidade?: string | null
}

type Machine = {
  id: string
  codigo: string
  nome: string
  status: string
}

type Pedido = {
  id: string
  codigo: string
  nome: string
  status: string
}

type OrderItem = {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  descricao?: string
}

type OP = {
  id: string
  numero_op: number | string
  produto_id: string | null
  pedido_venda_id: string | null
  pedido_item_id?: string | null
  cliente_id?: string | null
  quantidade: number
  quantidade_planejada: number
  quantidade_produzida: number
  status: string
  prioridade?: string
  maquina_id: string | null
  velocidade_nominal_hora: number
  operacao_dupla: boolean
  tempo_estimado_horas: number
  data_prevista?: string | null
  observacoes?: string | null
  created_at?: string
}

type Material = {
  id: string
  codigo: string
  nome: string
  need: number
  stock: number
  reserved: number
  net: number
  suggestion: string
}

type StatusTab = 'TODAS' | 'PENDENTE' | 'EM_PROCESSO' | 'CONCLUIDO' | 'PAUSADA'

type ApontamentoOP = {
  id: string
  operador_id: string | null
  maquina_id: string | null
  inicio_em: string | null
  fim_em: string | null
  quantidade_planejada: number | null
  quantidade_boa: number | null
  quantidade_refugada: number | null
  motivo_parada: string | null
  observacoes: string | null
  criado_em: string | null
}

const RotuloStatusOP: Record<string, string> = {
  PENDENTE: 'Em fila',
  EM_PROCESSO: 'Em produção',
  CONCLUIDO: 'Concluída',
  PAUSADA: 'Pausada',
  CANCELADA: 'Cancelada'
}

function dataHoraRelatorio(valor: string | null | undefined): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (!Number.isFinite(data.getTime())) return valor
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function quantidadeRelatorio(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

const inputStyle = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100 disabled:text-slate-500'
const labelStyle = 'flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500'
const btnBase = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-[10px] font-bold tracking-wide uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

function normalizeStatus(value: string | undefined): 'PENDENTE' | 'EM_PROCESSO' | 'CONCLUIDO' | 'PAUSADA' | 'CANCELADA' {
  const v = (value || '').trim().toUpperCase().replaceAll(' ', '_')
  if (v.includes('CONCLU')) return 'CONCLUIDO'
  if (v.includes('PRODU') || v.includes('PROCESS') || v.includes('ANDAM')) return 'EM_PROCESSO'
  if (v.includes('PAUS')) return 'PAUSADA'
  if (v.includes('CANCEL')) return 'CANCELADA'
  return 'PENDENTE'
}

// Revisão IT-PCP-ORDENS-006 — 23/10/2026
// Escopo: estabilização das dependências da sincronização da OP e do recálculo MRP.
// Mantém layout, rotas, consultas multiempresa e ações existentes.
export default function PCPOrdens() {
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [selectedOpId, setSelectedOpId] = useState<string>('')

  // Filtros de visualização
  const [statusTab, setStatusTab] = useState<StatusTab>('TODAS')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMachine, setFilterMachine] = useState('')

  // Estados de tela e edição da OP selecionada
  const [activeDetailTab, setActiveDetailTab] = useState<'parametros' | 'mrp' | 'apontamento'>('parametros')
  const [machineId, setMachineId] = useState('')
  const [qty, setQty] = useState('')
  const [rate, setRate] = useState('')
  const [doubleOp, setDoubleOp] = useState(false)
  const [priority, setPriority] = useState('ALTA')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [producedInput, setProducedInput] = useState('')

  // Modal de Nova OP
  const [showNewOpModal, setShowNewOpModal] = useState(false)
  const [newOpType, setNewOpType] = useState<'PEDIDO' | 'ESTOQUE'>('PEDIDO')
  const [newPedidoId, setNewPedidoId] = useState('')
  const [newPedidoItemId, setNewPedidoItemId] = useState('')
  const [newProdutoId, setNewProdutoId] = useState('')
  const [newMachineId, setNewMachineId] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newDoubleOp, setNewDoubleOp] = useState(false)
  const [newPriority, setNewPriority] = useState('ALTA')
  const [newDueDate, setNewDueDate] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Estados operacionais
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mrpLoading, setMrpLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])
  // Guardado para o relatório da OP consultar os apontamentos no mesmo tenant, sem nova RPC.
  const [empresaSessaoId, setEmpresaSessaoId] = useState('')

  // Carregamento multi-tenant real
  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const companyRes = await supabase.rpc('erp_current_empresa_id')
      if (companyRes.error || !companyRes.data) {
        throw companyRes.error ?? new Error('Empresa da sessão não identificada.')
      }
      const companyId = String(companyRes.data)
      setEmpresaSessaoId(companyId)

      const [ps, ms, os, salesOrders, salesItems, cls] = await Promise.all([
        fetchAllPages<Product>((from, to) =>
          supabase
            .from('erp_produtos')
            .select('id,codigo,nome,estoque_atual,unidade', { count: 'exact' })
            .eq('empresa_id', companyId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)
        ),
        fetchAllPages<Machine>((from, to) =>
          supabase
            .from('erp_maquinas')
            .select('id,codigo,nome,status', { count: 'exact' })
            .eq('empresa_id', companyId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)
        ),
        fetchAllPages<OP>((from, to) =>
          supabase
            .from('erp_ordens_producao')
            .select(
              'id,numero_op,produto_id,pedido_venda_id,pedido_item_id,cliente_id,quantidade,quantidade_planejada,quantidade_produzida,status,prioridade,maquina_id,velocidade_nominal_hora,operacao_dupla,tempo_estimado_horas,data_prevista,observacoes,created_at',
              { count: 'exact' }
            )
            .eq('empresa_id', companyId)
            .order('created_at', { ascending: false })
            .range(from, to)
        ),
        fetchAllPages<{ id: string; numero: number; cliente_id: string | null; status: string }>((from, to) =>
          supabase
            .from('erp_pedidos_venda')
            .select('id,numero,cliente_id,status', { count: 'exact' })
            .eq('empresa_id', companyId)
            .order('numero', { ascending: false })
            .range(from, to)
        ),
        fetchAllPages<OrderItem>((from, to) =>
          supabase
            .from('erp_pedidos_venda_itens')
            .select('id,pedido_id,produto_id,quantidade', { count: 'exact' })
            .eq('empresa_id', companyId)
            .range(from, to)
        ),
        fetchAllPages<{ id: string; nome: string }>((from, to) =>
          supabase
            .from('erp_clientes')
            .select('id,nome', { count: 'exact' })
            .eq('empresa_id', companyId)
            .eq('ativo', true)
            .order('nome')
            .range(from, to)
        )
      ])

      const customerMap = new Map(cls.map(c => [c.id, c.nome]))
      setProducts(ps)
      setMachines(ms)
      setOps(os)
      setOrderItems(salesItems)
      setPedidos(
        salesOrders.map(order => ({
          id: order.id,
          codigo: String(order.numero),
          nome: customerMap.get(order.cliente_id || '') || 'Pedido Comercial',
          status: order.status
        }))
      )

      // Se houver OPs e nenhuma selecionada, seleciona a primeira
      if (os.length > 0 && !selectedOpId) {
        setSelectedOpId(os[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar ordens de produção.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Mapeamentos em memória
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  const machineMap = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines])
  const pedidoMap = useMemo(() => new Map(pedidos.map(p => [p.id, p])), [pedidos])

  const selectedOp = useMemo(() => ops.find(o => o.id === selectedOpId), [ops, selectedOpId])
  const selectedProduct = selectedOp?.produto_id ? productMap.get(selectedOp.produto_id) : null
  const selectedMachine = selectedOp?.maquina_id ? machineMap.get(selectedOp.maquina_id) : null
  const selectedPedido = selectedOp?.pedido_venda_id ? pedidoMap.get(selectedOp.pedido_venda_id) : null

  // Campos primitivos evitam reexecutar a sincronização quando a lista recebe
  // novos objetos com os mesmos valores operacionais.
  const hasSelectedOp = Boolean(selectedOp)
  const selectedMachineId = selectedOp?.maquina_id || ''
  const selectedPlannedQty = selectedOp?.quantidade_planejada || selectedOp?.quantidade || 0
  const selectedRate = selectedOp?.velocidade_nominal_hora || 0
  const selectedDoubleOp = Boolean(selectedOp?.operacao_dupla)
  const selectedPriority = selectedOp?.prioridade || 'ALTA'
  const selectedDueDate = selectedOp?.data_prevista || ''
  const selectedNotes = selectedOp?.observacoes || ''
  const selectedProducedQty = selectedOp?.quantidade_produzida || 0
  const selectedProductId = selectedOp?.produto_id || ''
  const selectedDemandRef = selectedOp?.pedido_venda_id ? 'PCP_OP_PEDIDO' : 'PCP_OP'

  /**
   * Ficha operacional A4. Os dados vêm da OP da linha + apontamentos lidos do banco no
   * tenant da sessão; nada é inventado quando a consulta retorna vazio ou falha.
   */
  async function emitirFichaOP(op: OP) {
    setError('')
    try {
      if (!empresaSessaoId) throw new Error('Empresa da sessão não identificada. Use Atualizar antes de imprimir.')

      const apontamentosResult = await supabase
        .from('erp_apontamentos_processo')
        .select(
          'id,operador_id,maquina_id,inicio_em,fim_em,quantidade_planejada,quantidade_boa,quantidade_refugada,motivo_parada,observacoes,criado_em',
          { count: 'exact' }
        )
        .eq('empresa_id', empresaSessaoId)
        .eq('ordem_producao_id', op.id)
        .order('criado_em', { ascending: false })
        .limit(500)
      if (apontamentosResult.error) throw apontamentosResult.error

      const apontamentos = (apontamentosResult.data ?? []) as ApontamentoOP[]

      const operadorIds = Array.from(
        new Set(apontamentos.map(a => a.operador_id).filter((id): id is string => Boolean(id)))
      )
      const nomesOperador = new Map<string, string>()
      if (operadorIds.length > 0) {
        const operadoresResult = await supabase
          .from('erp_usuarios')
          .select('id,nome')
          .in('id', operadorIds)
        if (operadoresResult.error) throw operadoresResult.error
        for (const registro of (operadoresResult.data ?? []) as { id: string; nome: string }[]) {
          nomesOperador.set(registro.id, registro.nome)
        }
      }

      const produto = op.produto_id ? productMap.get(op.produto_id) : null
      const maquina = op.maquina_id ? machineMap.get(op.maquina_id) : null
      const pedido = op.pedido_venda_id ? pedidoMap.get(op.pedido_venda_id) : null
      const status = normalizeStatus(op.status)
      const planejada = Number(op.quantidade_planejada || op.quantidade || 0)
      const produzida = Number(op.quantidade_produzida || 0)
      const boaTotal = apontamentos.reduce((total, a) => total + Number(a.quantidade_boa ?? 0), 0)
      const refugoTotal = apontamentos.reduce((total, a) => total + Number(a.quantidade_refugada ?? 0), 0)
      const rendimento = planejada > 0 ? `${((produzida / planejada) * 100).toFixed(1)}%` : '—'
      const observacoes = (op.observacoes ?? '').trim()

      const blocos: Bloco[] = [
        {
          tipo: 'campos',
          titulo: 'Identificação da ordem de produção',
          colunas: 2,
          itens: [
            { rotulo: 'Nº da OP', valor: `OP-${op.numero_op}` },
            { rotulo: 'Status', valor: RotuloStatusOP[status] ?? status },
            { rotulo: 'Produto', valor: produto?.nome ?? 'Produto não cadastrado' },
            { rotulo: 'Código do produto', valor: produto?.codigo ?? '—' },
            { rotulo: 'Unidade', valor: produto?.unidade ?? '—' },
            { rotulo: 'Prioridade', valor: op.prioridade || 'Regular' },
            { rotulo: 'Pedido de venda', valor: pedido ? `PV ${pedido.codigo} — ${pedido.nome}` : 'Ordem de estoque' },
            { rotulo: 'Máquina / centro', valor: maquina ? `${maquina.codigo} — ${maquina.nome}` : 'Não atribuída' },
            { rotulo: 'Data prevista', valor: op.data_prevista ? String(op.data_prevista).slice(0, 10) : '—' },
            { rotulo: 'Aberta em', valor: dataHoraRelatorio(op.created_at) }
          ]
        },
        {
          tipo: 'campos',
          titulo: 'Quantidades e capacidade',
          colunas: 3,
          itens: [
            { rotulo: 'Quantidade planejada', valor: quantidadeRelatorio(planejada) },
            { rotulo: 'Produzido registrado', valor: quantidadeRelatorio(produzida) },
            { rotulo: 'Rendimento', valor: rendimento },
            { rotulo: 'Boa apontada', valor: quantidadeRelatorio(boaTotal) },
            { rotulo: 'Refugo apontado', valor: quantidadeRelatorio(refugoTotal) },
            { rotulo: 'Apontamentos', valor: apontamentos.length },
            { rotulo: 'Velocidade nominal (pç/h)', valor: quantidadeRelatorio(op.velocidade_nominal_hora) },
            { rotulo: 'Operação dupla', valor: op.operacao_dupla ? 'Sim' : 'Não' },
            { rotulo: 'Tempo estimado (h)', valor: quantidadeRelatorio(op.tempo_estimado_horas) }
          ]
        },
        {
          tipo: 'tabela',
          titulo: 'Apontamentos de produção',
          colunas: [
            { titulo: 'Início', larguraMm: 28 },
            { titulo: 'Fim', larguraMm: 28 },
            { titulo: 'Operador', larguraMm: 38 },
            { titulo: 'Máquina', larguraMm: 26 },
            { titulo: 'Boa', larguraMm: 16, alinhar: 'direita' },
            { titulo: 'Refugo', larguraMm: 16, alinhar: 'direita' },
            { titulo: 'Motivo / observação' }
          ],
          linhas: apontamentos.map(a => [
            dataHoraRelatorio(a.inicio_em),
            dataHoraRelatorio(a.fim_em),
            (a.operador_id && nomesOperador.get(a.operador_id)) || 'Não identificado',
            (a.maquina_id && machineMap.get(a.maquina_id)?.codigo) || '—',
            quantidadeRelatorio(a.quantidade_boa),
            quantidadeRelatorio(a.quantidade_refugada),
            [a.motivo_parada, a.observacoes].filter(Boolean).join(' · ') || '—'
          ]),
          nota:
            apontamentosResult.count === null || apontamentosResult.count === undefined
              ? undefined
              : apontamentos.length < Number(apontamentosResult.count)
                ? `Exibindo ${apontamentos.length} de ${apontamentosResult.count} apontamentos registrados no banco.`
                : undefined
        }
      ]

      if (observacoes) {
        blocos.push({ tipo: 'texto', titulo: 'Observações da ordem', texto: observacoes })
      }

      blocos.push({
        tipo: 'assinaturas',
        titulo: 'Aprovações',
        assinantes: [
          { papel: 'Planejamento e controle da produção' },
          { papel: 'Liderança de produção' },
          { papel: 'Controle da qualidade' }
        ]
      })

      await abrirRelatorio({
        modulo: 'PCP',
        tipo: 'Ordem de Produção',
        titulo: `Ficha operacional da OP-${op.numero_op}`,
        codigo: `OP-${op.numero_op}`,
        subtitulo: produto ? `${produto.codigo} — ${produto.nome}` : 'Produto sem cadastro no banco',
        blocos
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao emitir a ficha operacional da OP.')
    }
  }

  // Sincroniza apenas quando a OP selecionada ou seus valores mudam.
  useEffect(() => {
    if (!selectedOpId || !hasSelectedOp) return
    setMachineId(selectedMachineId)
    setQty(String(selectedPlannedQty || ''))
    setRate(String(selectedRate || ''))
    setDoubleOp(selectedDoubleOp)
    setPriority(selectedPriority)
    setDueDate(selectedDueDate)
    setNotes(selectedNotes)
    setProducedInput(String(selectedProducedQty))
  }, [
    selectedOpId,
    hasSelectedOp,
    selectedMachineId,
    selectedPlannedQty,
    selectedRate,
    selectedDoubleOp,
    selectedPriority,
    selectedDueDate,
    selectedNotes,
    selectedProducedQty
  ])

  // Cálculos de capacidade técnica
  const effectiveRate = Number(rate) > 0 ? Number(rate) * (doubleOp ? 2 : 1) : 0
  const estimatedHours = Number(qty) > 0 && effectiveRate > 0 ? Number(qty) / effectiveRate : 0

  // Explosão MRP via RPC real. Callback estável para impedir efeitos
  // dependentes de uma nova função a cada renderização.
  const explodeMRP = useCallback(async (
    produtoId: string,
    quantidade: number,
    demandaRef: string
  ) => {
    if (!produtoId || quantidade <= 0) {
      setMaterials([])
      setMrpLoading(false)
      return
    }
    setMrpLoading(true)
    try {
      const run = await supabase.rpc('erp_mrp_explodir', {
        p_produto_id: produtoId,
        p_quantidade: quantidade,
        p_demanda_ref: demandaRef
      })
      if (run.error) throw run.error

      const need = await supabase
        .from('erp_mrp_necessidades')
        .select('componente_id,quantidade_bruta,estoque_atual,reservado,necessidade_liquida,sugestao')
        .eq('run_id', String(run.data))
        .order('nivel')
      if (need.error) throw need.error

      const ids = (need.data ?? []).map(x => String(x.componente_id))
      const ps = ids.length
        ? await supabase.from('erp_produtos').select('id,codigo,nome').in('id', ids)
        : { data: [], error: null }
      if (ps.error) throw ps.error

      const compMap = new Map((ps.data ?? []).map((x: { id: string; codigo: string; nome: string }) => [x.id, x]))
      setMaterials(
        (need.data ?? []).map(x => ({
          id: String(x.componente_id),
          codigo: compMap.get(String(x.componente_id))?.codigo || '—',
          nome: compMap.get(String(x.componente_id))?.nome || '—',
          need: Number(x.quantidade_bruta || 0),
          stock: Number(x.estoque_atual || 0),
          reserved: Number(x.reservado || 0),
          net: Number(x.necessidade_liquida || 0),
          suggestion: String(x.sugestao || 'SEM_NECESSIDADE')
        }))
      )
    } catch {
      // Falha de MRP não pode ser apresentada como uma BOM vazia válida.
      setMaterials([])
    } finally {
      setMrpLoading(false)
    }
  }, [])

  // MRP só é recalculado quando produto, quantidade planejada ou tipo de demanda
  // da OP selecionada realmente muda — nunca apenas porque mudou a referência do objeto.
  useEffect(() => {
    if (!selectedProductId) {
      setMaterials([])
      setMrpLoading(false)
      return
    }
    void explodeMRP(selectedProductId, Number(selectedPlannedQty), selectedDemandRef)
  }, [selectedProductId, selectedPlannedQty, selectedDemandRef, explodeMRP])

  // Gravação dos parâmetros técnicos
  async function saveTechnicalParameters() {
    if (!selectedOpId) {
      setError('Selecione uma ordem de produção para salvar.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const u = await supabase
        .from('erp_ordens_producao')
        .update({
          maquina_id: machineId || null,
          velocidade_nominal_hora: Number(rate || 0),
          operacao_dupla: doubleOp,
          tempo_estimado_horas: estimatedHours,
          prioridade: priority,
          data_prevista: dueDate || null,
          observacoes: notes || null
        })
        .eq('id', selectedOpId)
      if (u.error) throw u.error

      setMessage('Parâmetros técnicos e operacionais gravados com sucesso.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar parâmetros técnicos.')
    } finally {
      setSaving(false)
    }
  }

  // Transições de status da OP
  async function updateOpStatus(opId: string, newStatus: string) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const u = await supabase
        .from('erp_ordens_producao')
        .update({ status: newStatus })
        .eq('id', opId)
      if (u.error) throw u.error

      setMessage(`Status da OP atualizado para: ${newStatus.toUpperCase()}`)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status da OP.')
    } finally {
      setSaving(false)
    }
  }

  // Atualização rápida de quantidade produzida
  async function updateProducedQuantity() {
    if (!selectedOpId) return
    const prod = Number(producedInput)
    if (!Number.isFinite(prod) || prod < 0) {
      setError('Informe uma quantidade produzida válida.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const u = await supabase
        .from('erp_ordens_producao')
        .update({ quantidade_produzida: prod })
        .eq('id', selectedOpId)
      if (u.error) throw u.error

      setMessage('Apontamento de quantidade produzida atualizado.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao atualizar apontamento.')
    } finally {
      setSaving(false)
    }
  }

  // Criação de Nova OP
  async function handleCreateNewOp() {
    const quantidade = Number(newQty)
    const nominal = Number(newRate)

    if (newOpType === 'PEDIDO') {
      if (!newPedidoId || !newPedidoItemId || !newProdutoId || quantidade <= 0) {
        setError('Selecione o pedido de venda, o item correspondente e uma quantidade válida.')
        return
      }
    } else {
      if (!newProdutoId || quantidade <= 0) {
        setError('Selecione o produto de reposição e uma quantidade maior que zero.')
        return
      }
    }

    if (newRate && (!Number.isFinite(nominal) || nominal <= 0)) {
      setError('Informe uma velocidade nominal válida.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const companyRes = await supabase.rpc('erp_current_empresa_id')
      if (companyRes.error || !companyRes.data) {
        throw companyRes.error ?? new Error('Empresa da sessão não identificada.')
      }
      const companyId = String(companyRes.data)

      const created = await supabase.rpc('erp_criar_ordem_producao_v2', {
        p_produto_id: newProdutoId,
        p_quantidade: quantidade,
        p_pedido_venda_id: newOpType === 'PEDIDO' ? (newPedidoId || null) : null,
        p_maquina_id: newMachineId || null,
        p_velocidade_nominal_hora: newRate ? nominal : null,
        p_operacao_dupla: newDoubleOp
      })
      if (created.error) throw created.error

      const row = Array.isArray(created.data)
        ? (created.data[0] as { id: string; numero_op: number | string } | undefined)
        : undefined
      if (!row) throw new Error('A criação da OP não retornou o identificador.')

      // Atualiza campos adicionais na OP
      const updateData: Record<string, unknown> = {
        prioridade: newPriority,
        data_prevista: newDueDate || null,
        observacoes: newNotes || null
      }
      if (newOpType === 'PEDIDO' && newPedidoItemId) {
        updateData.pedido_item_id = newPedidoItemId
      }

      const patch = await supabase
        .from('erp_ordens_producao')
        .update(updateData)
        .eq('empresa_id', companyId)
        .eq('id', row.id)
      if (patch.error) throw patch.error

      setShowNewOpModal(false)
      setSelectedOpId(row.id)
      setMessage(`OP-${row.numero_op} gerada com sucesso e integrada ao PCP!`)
      await loadData()
      void explodeMRP(newProdutoId, quantidade, newOpType === 'PEDIDO' ? 'PCP_OP_PEDIDO' : 'PCP_OP')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar a ordem de produção.')
    } finally {
      setSaving(false)
    }
  }

  // Filtragem da lista de OPs
  const filteredOps = useMemo(() => {
    return ops.filter(op => {
      const st = normalizeStatus(op.status)
      const matchTab =
        statusTab === 'TODAS' ||
        (statusTab === 'PENDENTE' && st === 'PENDENTE') ||
        (statusTab === 'EM_PROCESSO' && st === 'EM_PROCESSO') ||
        (statusTab === 'CONCLUIDO' && st === 'CONCLUIDO') ||
        (statusTab === 'PAUSADA' && st === 'PAUSADA')

      const matchMachine = !filterMachine || op.maquina_id === filterMachine

      const prod = op.produto_id ? productMap.get(op.produto_id) : null
      const ped = op.pedido_venda_id ? pedidoMap.get(op.pedido_venda_id) : null
      const searchTarget = `${op.numero_op} ${prod?.codigo ?? ''} ${prod?.nome ?? ''} ${ped?.codigo ?? ''} ${ped?.nome ?? ''}`.toLowerCase()
      const matchQuery = !searchQuery || searchTarget.includes(searchQuery.toLowerCase())

      return matchTab && matchMachine && matchQuery
    })
  }, [ops, statusTab, filterMachine, searchQuery, productMap, pedidoMap])

  // KPIs operacionais
  const kpiTotal = ops.length
  const kpiPendentes = ops.filter(o => normalizeStatus(o.status) === 'PENDENTE').length
  const kpiEmProcesso = ops.filter(o => normalizeStatus(o.status) === 'EM_PROCESSO').length
  const kpiConcluidas = ops.filter(o => normalizeStatus(o.status) === 'CONCLUIDO').length
  const kpiPrioridadeAlta = ops.filter(o => (o.prioridade || '').toUpperCase() === 'ALTA' && normalizeStatus(o.status) !== 'CONCLUIDO').length

  return (
    <>
      {/* Folha de Impressão A4 Oficial da OP — Padrão SYSNQRA */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .op-print-sheet, .op-print-sheet * { visibility: visible !important; }
          .op-print-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 15mm !important;
            background: #fff !important;
            color: #0f172a !important;
            font-family: Arial, sans-serif !important;
          }
          .op-print-sheet table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .op-print-sheet th, .op-print-sheet td {
            border: 1px solid #334155;
            padding: 5px 8px;
            font-size: 8.5pt;
            text-align: left;
          }
          .op-print-sheet th {
            background: #f1f5f9 !important;
            font-weight: bold;
            text-transform: uppercase;
          }
          .op-print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .op-print-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .op-print-field {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            background: #f8fafc;
          }
          .op-print-label {
            font-size: 7pt;
            color: #64748b;
            text-transform: uppercase;
            font-weight: bold;
          }
          .op-print-value {
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
          }
          .op-print-signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
          }
          .op-print-sign-box {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            text-align: center;
            font-size: 8.5pt;
            font-weight: bold;
          }
        }
        @media screen {
          .op-print-sheet { display: none; }
        }
      `}</style>

      <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
        <div className="mx-auto max-w-[1680px] space-y-4">
          
          {/* Cabeçalho Industrial Técnico */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3 shadow-sm rounded-[2px]">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#123B50] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                  SYSNQRA SGQ • PCP-001
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]">
                  CHÃO DE FÁBRICA &amp; GESTÃO DA PRODUÇÃO
                </span>
              </div>
              <h1 className="mt-0.5 text-base font-black tracking-tight text-[#123B50]">
                Ordens de Produção (OP) &amp; Planejamento Técnico
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className={`${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                title="Recarregar dados"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedOp) {
                    setError('Selecione uma OP na tabela para imprimir a ficha operacional.')
                    return
                  }
                  void emitirFichaOP(selectedOp)
                }}
                disabled={!selectedOp}
                className={`${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                title="Emitir ficha operacional em A4"
              >
                <Printer size={13} />
                <span>Imprimir OP (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMessage('')
                  setNewOpType('PEDIDO')
                  setNewPedidoId('')
                  setNewPedidoItemId('')
                  setNewProdutoId('')
                  setNewMachineId('')
                  setNewQty('')
                  setNewRate('')
                  setNewDoubleOp(false)
                  setNewPriority('ALTA')
                  setNewDueDate('')
                  setNewNotes('')
                  setShowNewOpModal(true)
                }}
                className={`${btnBase} bg-[#2D8DB8] text-white hover:bg-[#25769b] shadow-sm`}
              >
                <Plus size={14} />
                <span>Nova OP</span>
              </button>
            </div>
          </header>

          {/* Avisos de Notificação e Erro */}
          {(message || error) && (
            <div
              className={`flex items-center justify-between rounded-[2px] border px-3 py-2 text-xs font-bold ${
                error
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span>{error || message}</span>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setMessage('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* KPIs Operacionais do Chão de Fábrica */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <article className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total de OPs</span>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-[#123B50] tabular-nums">{kpiTotal}</strong>
                <Factory size={16} className="text-slate-400" />
              </div>
            </article>

            <article className="rounded-[2px] border border-amber-200 bg-amber-50/40 p-3 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Em Fila / Pendente</span>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-amber-700 tabular-nums">{kpiPendentes}</strong>
                <Clock size={16} className="text-amber-600" />
              </div>
            </article>

            <article className="rounded-[2px] border border-sky-200 bg-sky-50/40 p-3 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]">Em Produção</span>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-[#2D8DB8] tabular-nums">{kpiEmProcesso}</strong>
                <Play size={16} className="text-[#2D8DB8]" />
              </div>
            </article>

            <article className="rounded-[2px] border border-emerald-200 bg-emerald-50/40 p-3 shadow-xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#3A9D78]">Concluídas</span>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-[#3A9D78] tabular-nums">{kpiConcluidas}</strong>
                <CheckCircle size={16} className="text-[#3A9D78]" />
              </div>
            </article>

            <article className="rounded-[2px] border border-rose-200 bg-rose-50/40 p-3 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700">Prioridade Alta</span>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-rose-700 tabular-nums">{kpiPrioridadeAlta}</strong>
                <AlertTriangle size={16} className="text-rose-600" />
              </div>
            </article>
          </section>

          {/* Área de Filtros e Busca de OPs */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-2.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['TODAS', 'PENDENTE', 'EM_PROCESSO', 'CONCLUIDO', 'PAUSADA'] as StatusTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusTab(tab)}
                  className={`h-[28px] px-2.5 text-[10px] font-bold uppercase tracking-wide rounded-[2px] transition-all ${
                    statusTab === tab
                      ? 'bg-[#123B50] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'TODAS' && 'Todos'}
                  {tab === 'PENDENTE' && '🟡 Em Fila'}
                  {tab === 'EM_PROCESSO' && '🔵 Em Produção'}
                  {tab === 'CONCLUIDO' && '🟢 Concluídas'}
                  {tab === 'PAUSADA' && '⏸️ Pausadas'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar OP, produto, pedido..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-[28px] w-full rounded-[2px] border border-slate-300 bg-white pl-8 pr-2.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
                />
              </div>

              <select
                value={filterMachine}
                onChange={e => setFilterMachine(e.target.value)}
                className="h-[28px] rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#2D8DB8]"
              >
                <option value="">Todas as Máquinas</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} — {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Grade Principal: Lista de OPs + Painel de Detalhes da OP */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            
            {/* Tabela de Ordens de Produção (Lista Industrial) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/75 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Factory size={15} className="text-[#123B50]" />
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-[#123B50]">
                      Fila Industrial de OPs ({filteredOps.length})
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    Clique em uma OP para detalhar
                  </span>
                </div>

                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[700px] border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-[#123B50] text-white">
                      <tr className="h-[30px]">
                        <th className="px-2.5 text-left font-bold uppercase text-[9px] tracking-wider w-[80px]">Nº OP</th>
                        <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider">Produto</th>
                        <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider w-[100px]">Origem</th>
                        <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider w-[80px]">Máquina</th>
                        <th className="px-2 text-right font-bold uppercase text-[9px] tracking-wider w-[120px]">Qtd (Plan/Prod)</th>
                        <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[80px]">Status</th>
                        <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[85px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOps.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs font-semibold text-slate-400">
                            Nenhuma ordem de produção encontrada com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        filteredOps.map(op => {
                          const prod = op.produto_id ? productMap.get(op.produto_id) : null
                          const ped = op.pedido_venda_id ? pedidoMap.get(op.pedido_venda_id) : null
                          const mach = op.maquina_id ? machineMap.get(op.maquina_id) : null
                          const isSelected = op.id === selectedOpId
                          const st = normalizeStatus(op.status)
                          const planned = Number(op.quantidade_planejada || op.quantidade || 0)
                          const produced = Number(op.quantidade_produzida || 0)
                          const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0

                          return (
                            <tr
                              key={op.id}
                              onClick={() => setSelectedOpId(op.id)}
                              className={`h-[34px] cursor-pointer transition-colors ${
                                isSelected ? 'bg-sky-50/80 font-semibold' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="px-2.5 font-bold text-[#123B50]">
                                <div className="flex items-center gap-1">
                                  <span>OP-{op.numero_op}</span>
                                  {op.prioridade === 'ALTA' && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" title="Prioridade Alta" />
                                  )}
                                </div>
                              </td>

                              <td className="px-2">
                                <div className="truncate max-w-[220px]" title={prod?.nome || '—'}>
                                  <strong className="text-slate-800">{prod?.codigo ?? '—'}</strong>
                                  <span className="ml-1 text-[10px] text-slate-500">{prod?.nome ?? ''}</span>
                                </div>
                              </td>

                              <td className="px-2 text-[10px] text-slate-600">
                                {ped ? (
                                  <span className="font-semibold text-slate-700" title={ped.nome}>
                                    PV-{ped.codigo}
                                  </span>
                                ) : (
                                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-500">
                                    ESTOQUE
                                  </span>
                                )}
                              </td>

                              <td className="px-2 text-[10px] text-slate-700">
                                {mach?.codigo ?? '—'}
                              </td>

                              <td className="px-2 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="tabular-nums font-mono text-[10px] font-bold">
                                    {produced.toLocaleString('pt-BR')} / {planned.toLocaleString('pt-BR')}
                                  </span>
                                  <div className="h-1 w-16 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                                    <div
                                      className={`h-full ${pct >= 100 ? 'bg-[#3A9D78]' : 'bg-[#2D8DB8]'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-2 text-center">
                                {st === 'CONCLUIDO' && (
                                  <span className="inline-block rounded-[2px] bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                                    CONCLUÍDA
                                  </span>
                                )}
                                {st === 'EM_PROCESSO' && (
                                  <span className="inline-block rounded-[2px] bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-800">
                                    EM PROD.
                                  </span>
                                )}
                                {st === 'PENDENTE' && (
                                  <span className="inline-block rounded-[2px] bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                                    EM FILA
                                  </span>
                                )}
                                {st === 'PAUSADA' && (
                                  <span className="inline-block rounded-[2px] bg-orange-100 px-1.5 py-0.5 text-[9px] font-black text-orange-800">
                                    PAUSADA
                                  </span>
                                )}
                              </td>

                              <td className="px-2 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {st !== 'EM_PROCESSO' && st !== 'CONCLUIDO' && (
                                    <button
                                      type="button"
                                      onClick={() => void updateOpStatus(op.id, 'em_producao')}
                                      className="h-6 w-6 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center"
                                      title="Iniciar Produção"
                                    >
                                      <Play size={10} />
                                    </button>
                                  )}
                                  {st === 'EM_PROCESSO' && (
                                    <button
                                      type="button"
                                      onClick={() => void updateOpStatus(op.id, 'concluida')}
                                      className="h-6 w-6 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                                      title="Concluir OP"
                                    >
                                      <CheckCircle size={10} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOpId(op.id)
                                      void emitirFichaOP(op)
                                    }}
                                    className="h-6 w-6 rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                                    title="Emitir ficha operacional A4 desta OP"
                                  >
                                    <Printer size={10} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Painel Lateral de Detalhes da OP Selecionada */}
            <div className="lg:col-span-5 space-y-3">
              {selectedOp ? (
                <div className="rounded-[2px] border border-slate-200 bg-white p-3.5 shadow-xs">
                  {/* Cabeçalho do Card da OP */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2D8DB8]">
                          DETALHES DA ORDEM
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                          {selectedOp.prioridade || 'REGULAR'}
                        </span>
                      </div>
                      <h2 className="text-base font-black text-[#123B50]">
                        OP-{selectedOp.numero_op}
                      </h2>
                      <p className="text-[11px] text-slate-600">
                        {selectedProduct?.codigo} — {selectedProduct?.nome}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {normalizeStatus(selectedOp.status) === 'EM_PROCESSO' ? (
                        <button
                          type="button"
                          onClick={() => void updateOpStatus(selectedOp.id, 'pausada')}
                          className="h-[26px] px-2 text-[9px] font-bold uppercase rounded bg-amber-500 text-white hover:bg-amber-600"
                        >
                          <Pause size={10} className="inline mr-1" /> Pausar
                        </button>
                      ) : normalizeStatus(selectedOp.status) === 'PAUSADA' ? (
                        <button
                          type="button"
                          onClick={() => void updateOpStatus(selectedOp.id, 'em_producao')}
                          className="h-[26px] px-2 text-[9px] font-bold uppercase rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Play size={10} className="inline mr-1" /> Retomar
                        </button>
                      ) : null}

                      {normalizeStatus(selectedOp.status) !== 'CONCLUIDO' && (
                        <button
                          type="button"
                          onClick={() => void updateOpStatus(selectedOp.id, 'concluida')}
                          className="h-[26px] px-2 text-[9px] font-bold uppercase rounded bg-[#3A9D78] text-white hover:bg-emerald-700"
                        >
                          <Check size={10} className="inline mr-1" /> Finalizar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Abas de Informação da OP */}
                  <div className="flex items-center gap-1 border-b border-slate-200 pt-2 pb-1 text-[10px] font-bold uppercase">
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('parametros')}
                      className={`px-2.5 py-1 border-b-2 transition-all ${
                        activeDetailTab === 'parametros'
                          ? 'border-[#2D8DB8] text-[#2D8DB8]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sliders size={12} className="inline mr-1" /> Parâmetros Técnicos
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('mrp')}
                      className={`px-2.5 py-1 border-b-2 transition-all ${
                        activeDetailTab === 'mrp'
                          ? 'border-[#2D8DB8] text-[#2D8DB8]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <PackageCheck size={12} className="inline mr-1" /> Explosão MRP ({materials.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('apontamento')}
                      className={`px-2.5 py-1 border-b-2 transition-all ${
                        activeDetailTab === 'apontamento'
                          ? 'border-[#2D8DB8] text-[#2D8DB8]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Zap size={12} className="inline mr-1" /> Apontamento
                    </button>
                  </div>

                  {/* Aba 1: Parâmetros Técnicos & Capacidade */}
                  {activeDetailTab === 'parametros' && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelStyle}>Máquina Fixa</label>
                          <select
                            value={machineId}
                            onChange={e => setMachineId(e.target.value)}
                            className={inputStyle}
                          >
                            <option value="">Selecione a máquina</option>
                            {machines.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.codigo} — {m.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelStyle}>Prioridade Fabril</label>
                          <select
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            className={inputStyle}
                          >
                            <option value="ALTA">Alta</option>
                            <option value="REGULAR">Regular</option>
                            <option value="BAIXA">Baixa</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelStyle}>Velocidade Nominal (un/h)</label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={rate}
                            onChange={e => setRate(e.target.value)}
                            className={inputStyle}
                            placeholder="Ex: 120"
                          />
                        </div>

                        <div>
                          <label className={labelStyle}>Data Prevista Conclusão</label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className={inputStyle}
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[10px] font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={doubleOp}
                          onChange={e => setDoubleOp(e.target.checked)}
                          className="h-4 w-4 rounded text-[#2D8DB8]"
                        />
                        <span>ATIVAR OPERAÇÃO DUPLA — PRENSA DE DOIS MOLDES SÍNCRONOS FRENTE/TRÁS</span>
                      </label>

                      {/* Quadro de Cálculo de Capacidade */}
                      <div className="grid grid-cols-3 gap-2 rounded-[2px] border border-sky-200 bg-sky-50/50 p-2.5">
                        <div>
                          <span className="block text-[8px] font-bold uppercase text-slate-500">Velocidade Efetiva</span>
                          <strong className="text-[12px] font-black text-[#123B50]">
                            {effectiveRate.toLocaleString('pt-BR')} un/h
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold uppercase text-slate-500">Tempo Estimado</span>
                          <strong className="text-[12px] font-black text-[#123B50]">
                            {Math.floor(estimatedHours)}h {Math.round((estimatedHours % 1) * 60)}min
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold uppercase text-slate-500">Carga na Máquina</span>
                          <strong className="text-[12px] font-black text-[#123B50]">
                            {estimatedHours.toFixed(2)} h
                          </strong>
                        </div>
                      </div>

                      <div>
                        <label className={labelStyle}>Observações Operacionais</label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Requisitos de qualidade, moldes ou matéria-prima..."
                          className="w-full rounded-[2px] border border-slate-300 p-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`/pcp/fichas-processo`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2D8DB8] hover:underline"
                        >
                          <ExternalLink size={11} />
                          Ficha de Processo
                        </a>

                        <button
                          type="button"
                          onClick={() => void saveTechnicalParameters()}
                          disabled={saving}
                          className={`${btnBase} bg-[#123B50] text-white hover:bg-[#0c2838]`}
                        >
                          {saving ? 'Gravando...' : 'Salvar Parâmetros'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Aba 2: Explosão MRP (BOM Multinível) */}
                  {activeDetailTab === 'mrp' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-600">
                          Explosão de insumos via RPC Supabase
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedOp.produto_id) {
                              void explodeMRP(
                                selectedOp.produto_id,
                                Number(selectedOp.quantidade_planejada || selectedOp.quantidade || 0),
                                selectedDemandRef
                              )
                            }
                          }}
                          disabled={mrpLoading}
                          className="font-bold text-[#2D8DB8] hover:underline"
                        >
                          {mrpLoading ? 'Recalculando...' : 'Re-explodir MRP'}
                        </button>
                      </div>

                      <div className="max-h-[320px] overflow-auto border border-slate-200 rounded-[2px]">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr className="h-6">
                              <th className="px-2 text-left font-bold uppercase text-[8px]">Insumo</th>
                              <th className="px-2 text-right font-bold uppercase text-[8px]">Necessário</th>
                              <th className="px-2 text-right font-bold uppercase text-[8px]">Estoque</th>
                              <th className="px-2 text-center font-bold uppercase text-[8px]">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {materials.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-4 text-center font-medium text-slate-400">
                                  {mrpLoading
                                    ? 'Calculando estrutura de materiais...'
                                    : 'Nenhum insumo ou BOM cadastrada para este produto.'}
                                </td>
                              </tr>
                            ) : (
                              materials.map(m => (
                                <tr key={m.id} className="h-7 hover:bg-slate-50">
                                  <td className="px-2">
                                    <strong className="text-slate-800">{m.codigo}</strong>
                                    <span className="ml-1 text-[9px] text-slate-500">{m.nome}</span>
                                  </td>
                                  <td className="px-2 text-right font-mono font-bold">
                                    {m.need.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                  </td>
                                  <td className="px-2 text-right font-mono text-slate-600">
                                    {m.stock.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                  </td>
                                  <td className="px-2 text-center font-bold text-[9px]">
                                    {m.suggestion === 'PRODUZIR' ? (
                                      <span className="text-amber-700">FABRICAR</span>
                                    ) : m.suggestion === 'COMPRAR' ? (
                                      <span className="text-rose-700">COMPRAR</span>
                                    ) : (
                                      <span className="text-emerald-700">DISPONÍVEL</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Aba 3: Apontamento Rápido */}
                  {activeDetailTab === 'apontamento' && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-2.5">
                        <div>
                          <span className="block text-[8px] font-bold uppercase text-slate-500">Planejado</span>
                          <strong className="text-base font-black text-slate-800 tabular-nums">
                            {Number(selectedOp.quantidade_planejada || selectedOp.quantidade || 0).toLocaleString('pt-BR')}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold uppercase text-slate-500">Saldo Restante</span>
                          <strong className="text-base font-black text-rose-700 tabular-nums">
                            {Math.max(
                              0,
                              Number(selectedOp.quantidade_planejada || selectedOp.quantidade || 0) -
                                Number(selectedOp.quantidade_produzida || 0)
                            ).toLocaleString('pt-BR')}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <label className={labelStyle}>Total de Peças Produzidas</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={producedInput}
                            onChange={e => setProducedInput(e.target.value)}
                            className={inputStyle}
                            placeholder="Informe o acumulado produzido"
                          />
                          <button
                            type="button"
                            onClick={() => void updateProducedQuantity()}
                            disabled={saving}
                            className={`${btnBase} bg-[#2D8DB8] text-white hover:bg-[#25769b]`}
                          >
                            Atualizar
                          </button>
                        </div>
                        <p className="mt-1 text-[9px] text-slate-500">
                          Sincroniza imediatamente o saldo operacional da ordem de produção.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[2px] border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-semibold text-slate-400">
                  Selecione uma ordem de produção na tabela para visualizar detalhes e parâmetros.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Criação de Nova OP */}
      {showNewOpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-[620px] rounded-[2px] border border-slate-300 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Factory size={16} className="text-[#123B50]" />
                <h3 className="text-sm font-black text-[#123B50]">CRIAR NOVA ORDEM DE PRODUÇÃO (OP)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                void handleCreateNewOp()
              }}
              className="mt-3 space-y-3"
            >
              {/* Seletor de Origem: Pedido de Venda ou Reposição */}
              <div className="flex items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewOpType('PEDIDO')
                    setNewProdutoId('')
                    setNewQty('')
                  }}
                  className={`flex-1 h-7 text-[10px] font-black uppercase rounded-[2px] ${
                    newOpType === 'PEDIDO'
                      ? 'bg-[#123B50] text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Pedido de Venda (Comercial)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewOpType('ESTOQUE')
                    setNewPedidoId('')
                    setNewPedidoItemId('')
                  }}
                  className={`flex-1 h-7 text-[10px] font-black uppercase rounded-[2px] ${
                    newOpType === 'ESTOQUE'
                      ? 'bg-[#123B50] text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Reposição de Estoque
                </button>
              </div>

              {/* Campos condicionais de Origem */}
              {newOpType === 'PEDIDO' ? (
                <>
                  <div>
                    <label className={labelStyle}>
                      Pedido de Venda *
                    </label>
                    <select
                      required
                      value={newPedidoId}
                      onChange={e => {
                        const pid = e.target.value
                        setNewPedidoId(pid)
                        setNewPedidoItemId('')
                        setNewProdutoId('')
                        setNewQty('')
                      }}
                      className={inputStyle}
                    >
                      <option value="">Selecione o pedido de venda</option>
                      {pedidos
                        .filter(p => !['cancelado', 'cancelada', 'rejeitado', 'rejeitada'].includes(p.status.toLowerCase()))
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            PV-{p.codigo} — {p.nome} ({p.status})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelStyle}>
                      Item Específico do Pedido *
                    </label>
                    <select
                      required
                      value={newPedidoItemId}
                      onChange={e => {
                        const itemId = e.target.value
                        setNewPedidoItemId(itemId)
                        const item = orderItems.find(x => x.id === itemId)
                        if (item) {
                          setNewProdutoId(item.produto_id)
                          setNewQty(String(item.quantidade))
                        }
                      }}
                      className={inputStyle}
                      disabled={!newPedidoId}
                    >
                      <option value="">
                        {newPedidoId ? 'Selecione a linha de produto' : 'Selecione primeiro o pedido'}
                      </option>
                      {orderItems
                        .filter(item => item.pedido_id === newPedidoId)
                        .map(item => {
                          const p = productMap.get(item.produto_id)
                          return (
                            <option key={item.id} value={item.id}>
                              {p?.codigo || 'PRODUTO'} — {p?.nome || item.descricao || 'Item'} (Qtd:{' '}
                              {item.quantidade})
                            </option>
                          )
                        })}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelStyle}>
                    Produto para Reposição *
                  </label>
                  <EntityCodeLookup
                    label=""
                    value={newProdutoId}
                    records={products.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome }))}
                    onChange={setNewProdutoId}
                    onSelect={r => {
                      if (r.id) setNewProdutoId(r.id)
                    }}
                    placeholder="Buscar código ou descrição do produto"
                    compact
                  />
                </div>
              )}

              {/* Quantidade e Máquina */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelStyle}>
                    Quantidade a Produzir *
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={newQty}
                    onChange={e => setNewQty(e.target.value)}
                    className={inputStyle}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={labelStyle}>Máquina Destino</label>
                  <select
                    value={newMachineId}
                    onChange={e => setNewMachineId(e.target.value)}
                    className={inputStyle}
                  >
                    <option value="">Selecione a máquina</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} — {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Velocidade e Prioridade */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className={labelStyle}>Velocidade (un/h)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 150"
                  />
                </div>

                <div>
                  <label className={labelStyle}>Prioridade</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className={inputStyle}
                  >
                    <option value="ALTA">Alta</option>
                    <option value="REGULAR">Regular</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Data Prevista</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newDoubleOp}
                  onChange={e => setNewDoubleOp(e.target.checked)}
                  className="h-4 w-4 rounded text-[#2D8DB8]"
                />
                <span>Operação dupla — Prensa com dois moldes síncronos</span>
              </label>

              <div>
                <label className={labelStyle}>Observações</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Observações da OP..."
                  className="w-full rounded-[2px] border border-slate-300 p-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className={`${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnBase} bg-[#2D8DB8] text-white hover:bg-[#25769b]`}
                >
                  <Zap size={13} />
                  <span>{saving ? 'Criando OP...' : 'Gerar OP &amp; Explodir MRP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Espelho de Impressão A4 Oficial — Padrão SYSNQRA */}
      <section className="op-print-sheet" aria-label="Ficha Operacional de Produção">
        <div className="op-print-header">
          <div>
            <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0 }}>SYSNQRA SISTEMAS INDUSTRIAIS</h1>
            <p style={{ fontSize: '9pt', color: '#475569', margin: '3px 0 0 0' }}>
              SGQ • FICHA OPERACIONAL DE ORDEM DE PRODUÇÃO (IT-PCP-OP-001)
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '18pt', fontWeight: 'bold' }}>
              {selectedOp ? `OP-${selectedOp.numero_op}` : 'OP —'}
            </span>
            <p style={{ fontSize: '8pt', color: '#64748b', margin: '2px 0 0 0' }}>
              Emissão: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="op-print-grid">
          <div className="op-print-field">
            <div className="op-print-label">Status da Ordem</div>
            <div className="op-print-value">{selectedOp?.status?.toUpperCase() ?? '—'}</div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Prioridade Fabril</div>
            <div className="op-print-value">{selectedOp?.prioridade ?? 'REGULAR'}</div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Pedido de Venda</div>
            <div className="op-print-value">
              {selectedPedido ? `PV-${selectedPedido.codigo}` : 'Reposição Estoque'}
            </div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Cliente Final</div>
            <div className="op-print-value">
              {selectedPedido ? selectedPedido.nome : 'Uso Interno'}
            </div>
          </div>
        </div>

        <div className="op-print-grid">
          <div className="op-print-field" style={{ gridColumn: 'span 2' }}>
            <div className="op-print-label">Produto / Peça Industrial</div>
            <div className="op-print-value">
              {selectedProduct?.codigo ?? '—'} — {selectedProduct?.nome ?? '—'}
            </div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Quantidade Planejada</div>
            <div className="op-print-value">
              {Number(selectedOp?.quantidade_planejada ?? selectedOp?.quantidade ?? 0).toLocaleString('pt-BR')} {selectedProduct?.unidade || 'UN'}
            </div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Data Prevista</div>
            <div className="op-print-value">
              {selectedOp?.data_prevista ? new Date(selectedOp.data_prevista).toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>
        </div>

        <div className="op-print-grid">
          <div className="op-print-field">
            <div className="op-print-label">Máquina Alocada</div>
            <div className="op-print-value">
              {selectedMachine ? `${selectedMachine.codigo} — ${selectedMachine.nome}` : 'A definir'}
            </div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Velocidade Nominal</div>
            <div className="op-print-value">
              {Number(selectedOp?.velocidade_nominal_hora ?? 0).toLocaleString('pt-BR')} un/h
            </div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Operação Dupla</div>
            <div className="op-print-value">{selectedOp?.operacao_dupla ? 'SIM (2 moldes)' : 'NÃO (1 molde)'}</div>
          </div>
          <div className="op-print-field">
            <div className="op-print-label">Tempo Previsto</div>
            <div className="op-print-value">
              {Number(selectedOp?.tempo_estimado_horas ?? 0).toFixed(2)} horas
            </div>
          </div>
        </div>

        {/* Explosão de Materiais BOM Requeridos */}
        <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '16px', marginBottom: '4px' }}>
          1. MATÉRIAS-PRIMAS E INSUMOS SEPARADOS (BOM / MRP)
        </h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Código Insumo</th>
              <th>Descrição do Material</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Qtd Requerida</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Visto Almox.</th>
              <th style={{ width: '110px' }}>Lote / Rastreabilidade</th>
            </tr>
          </thead>
          <tbody>
            {materials.length > 0 ? (
              materials.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.codigo}</strong></td>
                  <td>{m.nome}</td>
                  <td style={{ textAlign: 'right' }}>{m.need.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                  <td style={{ textAlign: 'center' }}>[ &nbsp; ] OK</td>
                  <td>____________________</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '10px' }}>
                  Nenhum componente cadastrado ou BOM direta não explodida.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Quadro de Liberação de Primeira Peça */}
        <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '16px', marginBottom: '4px' }}>
          2. APROVAÇÃO DE SETUP / LIBERAÇÃO DA PRIMEIRA PEÇA (QUALIDADE SGQ)
        </h2>
        <table>
          <thead>
            <tr>
              <th>Item de Verificação</th>
              <th style={{ width: '150px' }}>Especificação Técnica</th>
              <th style={{ width: '130px' }}>Encontrado</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
              <th style={{ width: '120px' }}>Visto Inspetor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Aspecto Visual e Rebarbas</td>
              <td>Isento de rebarbas, trincas e manchas</td>
              <td>____________________</td>
              <td style={{ textAlign: 'center' }}>[ &nbsp; ] Aprovado</td>
              <td>____________________</td>
            </tr>
            <tr>
              <td>Dimensional Crítico</td>
              <td>Conforme desenho de engenharia</td>
              <td>____________________</td>
              <td style={{ textAlign: 'center' }}>[ &nbsp; ] Aprovado</td>
              <td>____________________</td>
            </tr>
            <tr>
              <td>Peso da Peça (g)</td>
              <td>Conforme ficha de processo</td>
              <td>____________________</td>
              <td style={{ textAlign: 'center' }}>[ &nbsp; ] Aprovado</td>
              <td>____________________</td>
            </tr>
          </tbody>
        </table>

        {/* Grade de Apontamento de Turnos */}
        <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '16px', marginBottom: '4px' }}>
          3. REGISTRO OPERACIONAL DE PRODUÇÃO POR TURNO
        </h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Turno</th>
              <th style={{ width: '80px' }}>Data</th>
              <th style={{ width: '70px' }}>Início</th>
              <th style={{ width: '70px' }}>Fim</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Qtd Boa</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Refugo</th>
              <th>Operador Responsável</th>
              <th style={{ width: '90px' }}>Visto Líder</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(t => (
              <tr key={t} style={{ height: '28px' }}>
                <td style={{ textAlign: 'center' }}>{t}º T</td>
                <td>____/____</td>
                <td>____:____</td>
                <td>____:____</td>
                <td style={{ textAlign: 'right' }}>___________</td>
                <td style={{ textAlign: 'right' }}>___________</td>
                <td>______________________________</td>
                <td>________________</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Assinaturas Oficiais */}
        <div className="op-print-signatures">
          <div className="op-print-sign-box">
            Planejamento e Controle (PCP)
          </div>
          <div className="op-print-sign-box">
            Líder de Produção / Operação
          </div>
          <div className="op-print-sign-box">
            Inspeção da Qualidade (SGQ)
          </div>
        </div>
      </section>
    </>
  )
}
