/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP & GESTÃO DA PRODUÇÃO
 * Módulo: Ficha de Pedidos Pendentes e Rastreabilidade Fabril da Peça
 * Arquivo: src/pages/PCPPedidosPendentes.tsx
 * @REVISAO_ANTERIOR: IT-PCP-PEDIDOS-005 | 2026-10-23
 * Padrão Visual: SYSNQRA Industrial Compacto (#F4FBFD, #123B50, #2D8DB8, #48B7C7)
 * Esteira de Status:
 *   🔴 FALTA FABRICAR   — Sem estoque suficiente e sem OP vinculada
 *   🔵 EM PRODUÇÃO      — PCP colocou em OP / Máquina rodando na fábrica
 *   🟢 EM ESTOQUE       — Saldo físico disponível e reservado no almoxarifado
 *   ❇️ PRODUZIDO        — OP concluída / Fabricação terminada e inspecionada
 *   🟣 PRONTO P/ FATURAR— Separado e conferido aguardando emissão da NF-e
 *   ⚪ FATURADO (NF-e)  — Nota fiscal emitida / Pedido faturado
 * =========================================================================
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Factory,
  FileCheck,
  FileText,
  Layers,
  Package,
  PackageCheck,
  Play,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Sliders,
  X,
  Zap
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-premium.css'

export type PieceStatus =
  | 'AGUARDANDO_PCP'     // 🔴 Falta fabricar (sem OP)
  | 'EM_PRODUCAO'        // 🔵 Em produção na fábrica (OP ativa)
  | 'EM_ESTOQUE'         // 🟢 Em estoque físico / saldo reservado
  | 'PRODUZIDO'          // ❇️ Produção concluída / Aprovado SGQ
  | 'PRONTO_EXPEDICAO'   // 🟣 Pronto para faturamento / expedição
  | 'FATURADO'           // ⚪ Faturado / NF-e emitida

type Product = {
  id: string
  codigo: string
  nome: string
  estoque_atual: number | null
  unidade?: string | null
}

type Machine = {
  id: string
  codigo: string
  nome: string
  status?: string
}

type SalesOrder = {
  id: string
  numero: number | string
  cliente_id: string | null
  status: string
  data_entrada?: string | null
  data_entrega_prometida?: string | null
  pedido_cliente?: string | null
  total?: number | null
}

type SalesItem = {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  descricao?: string | null
  produto_cliente?: string | null
  valor_unitario?: number | null
  total?: number | null
}

type ProductionOrder = {
  id: string
  numero_op: number | string
  pedido_item_id?: string | null
  produto_id: string | null
  pedido_venda_id: string | null
  quantidade?: number | null
  quantidade_planejada?: number | null
  quantidade_produzida?: number | null
  status: string
  maquina_id?: string | null
  data_prevista?: string | null
  velocidade_nominal_hora?: number | null
}

type Client = {
  id: string
  nome: string
  documento?: string | null
}

type StockReservation = {
  pedido_item_id: string
  produto_id: string
  quantidade: number
  status: string
}

type FiscalDocument = {
  id: string
  numero: number | string
  serie?: string | null
  status: string
  destinatario_nome?: string | null
  chave_acesso?: string | null
}

type OrderPieceRow = {
  itemId: string
  pedidoId: string
  pedidoCodigo: string
  pedidoClienteRef: string | null
  clienteId: string
  clienteNome: string
  clienteDoc: string | null
  dataEntrada: string | null
  dataEntrega: string | null
  orderStatus: string
  produtoId: string
  produtoCodigo: string
  produtoNome: string
  produtoUnidade: string
  quantidadePedida: number
  estoqueAtual: number
  quantidadeReservada: number
  quantidadeEmOP: number
  quantidadeProduzidaOP: number
  faltaFabricar: number
  statusPeca: PieceStatus
  opId?: string
  opNumero?: string
  opStatus?: string
  maquinaId?: string
  maquinaCodigo?: string
  maquinaNome?: string
  opPrevisao?: string | null
  notaFiscalId?: string
  notaFiscalNumero?: string
  notaFiscalChave?: string
}

const inputClass =
  'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const btnClass =
  'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-[10px] font-bold tracking-wide uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
const dateBR = (value?: string | null) => {
  if (!value) return '—'
  const iso = value.length === 10 ? `${value}T12:00:00` : value
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Configuração visual das 6 cores industriais por status da peça
const STATUS_CONFIG: Record<
  PieceStatus,
  {
    label: string
    shortLabel: string
    rowBg: string
    rowBorder: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
    icon: typeof AlertTriangle
    desc: string
  }
> = {
  AGUARDANDO_PCP: {
    label: 'Falta Fabricar (Aguardando OP)',
    shortLabel: 'Falta Fabricar',
    rowBg: 'bg-rose-50/70 hover:bg-rose-100/70',
    rowBorder: 'border-l-[6px] border-l-[#D65B61]',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    icon: AlertTriangle,
    desc: 'Sem estoque suficiente e sem OP no PCP'
  },
  EM_PRODUCAO: {
    label: 'Em Produção (PCP / Fábrica)',
    shortLabel: 'Em Produção',
    rowBg: 'bg-sky-50/75 hover:bg-sky-100/75',
    rowBorder: 'border-l-[6px] border-l-[#2D8DB8]',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300',
    icon: Play,
    desc: 'OP aberta e máquina alocada rodando a peça'
  },
  EM_ESTOQUE: {
    label: 'Em Estoque (Saldo Reservado)',
    shortLabel: 'Em Estoque',
    rowBg: 'bg-teal-50/75 hover:bg-teal-100/75',
    rowBorder: 'border-l-[6px] border-l-[#0D9488]',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    icon: PackageCheck,
    desc: 'Saldo físico disponível no almoxarifado'
  },
  PRODUZIDO: {
    label: 'Fabricação Concluída (SGQ OK)',
    shortLabel: 'Produzido',
    rowBg: 'bg-emerald-50/75 hover:bg-emerald-100/75',
    rowBorder: 'border-l-[6px] border-l-[#3A9D78]',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    icon: CheckCircle2,
    desc: 'OP concluída na fábrica e aprovada pelo SGQ'
  },
  PRONTO_EXPEDICAO: {
    label: 'Pronto p/ Faturamento / Expedição',
    shortLabel: 'Pronto p/ Faturar',
    rowBg: 'bg-purple-50/75 hover:bg-purple-100/75',
    rowBorder: 'border-l-[6px] border-l-[#8B5CF6]',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    icon: Layers,
    desc: 'Peça conferida pronta para emissão da NF-e'
  },
  FATURADO: {
    label: 'Faturado com Nota Fiscal (NF-e)',
    shortLabel: 'Faturado (NF-e)',
    rowBg: 'bg-slate-100/90 hover:bg-slate-200/80',
    rowBorder: 'border-l-[6px] border-l-[#64748B]',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    icon: FileCheck,
    desc: 'Nota fiscal autorizada emitida para o cliente'
  }
}

export default function PCPPedidosPendentes() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<OrderPieceRow[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reservingItem, setReservingItem] = useState<string | null>(null)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'TODOS' | PieceStatus>('TODOS')
  const [search, setSearch] = useState('')
  const [machineFilter, setMachineFilter] = useState('')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Modal de Criação Rápida de OP
  const [showOpModal, setShowOpModal] = useState(false)
  const [targetRowForOp, setTargetRowForOp] = useState<OrderPieceRow | null>(null)
  const [opModalMachineId, setOpModalMachineId] = useState('')
  const [opModalRate, setOpModalRate] = useState('120')
  const [opModalDoubleOp, setOpModalDoubleOp] = useState(false)
  const [opModalPriority, setOpModalPriority] = useState('ALTA')
  const [opModalQty, setOpModalQty] = useState('')
  const [creatingOp, setCreatingOp] = useState(false)

  // Carregamento de dados multi-tenant com relacionamentos reais
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) {
        throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      }
      const empresaId = String(tenant.data)

      const [
        products,
        orders,
        items,
        productionOrders,
        clients,
        reservations,
        machineList,
        fiscalDocs
      ] = await Promise.all([
        fetchAllPages<Product>((from, to) =>
          supabase
            .from('erp_produtos')
            .select('id,codigo,nome,estoque_atual,unidade', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)
        ),
        fetchAllPages<SalesOrder>((from, to) =>
          supabase
            .from('erp_pedidos_venda')
            .select(
              'id,numero,cliente_id,status,data_entrada,data_entrega_prometida,pedido_cliente,total',
              { count: 'exact' }
            )
            .eq('empresa_id', empresaId)
            .order('numero', { ascending: false })
            .range(from, to)
        ),
        fetchAllPages<SalesItem>((from, to) =>
          supabase
            .from('erp_pedidos_venda_itens')
            .select(
              'id,pedido_id,produto_id,quantidade,descricao,produto_cliente,valor_unitario,total',
              { count: 'exact' }
            )
            .eq('empresa_id', empresaId)
            .range(from, to)
        ),
        fetchAllPages<ProductionOrder>((from, to) =>
          supabase
            .from('erp_ordens_producao')
            .select(
              'id,numero_op,pedido_item_id,produto_id,pedido_venda_id,quantidade,quantidade_planejada,quantidade_produzida,status,maquina_id,data_prevista,velocidade_nominal_hora',
              { count: 'exact' }
            )
            .eq('empresa_id', empresaId)
            .range(from, to)
        ),
        fetchAllPages<Client>((from, to) =>
          supabase
            .from('erp_clientes')
            .select('id,nome,documento', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('nome')
            .range(from, to)
        ),
        fetchAllPages<StockReservation>((from, to) =>
          supabase
            .from('erp_estoque_reservas')
            .select('pedido_item_id,produto_id,quantidade,status', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('status', 'ATIVA')
            .range(from, to)
        ),
        fetchAllPages<Machine>((from, to) =>
          supabase
            .from('erp_maquinas')
            .select('id,codigo,nome,status', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)
        ),
        fetchAllPages<FiscalDocument>((from, to) =>
          supabase
            .from('erp_documentos_fiscais')
            .select('id,numero,serie,status,destinatario_nome,chave_acesso', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .range(from, to)
        )
      ])

      setMachines(machineList)

      const productMap = new Map(products.map(p => [p.id, p]))
      const clientMap = new Map(clients.map(c => [c.id, c]))
      const orderMap = new Map(orders.map(o => [o.id, o]))
      const machineMap = new Map(machineList.map(m => [m.id, m]))
      const fiscalByDest = new Map(
        fiscalDocs
          .filter(f => ['autorizada', 'transmitida', 'emitida'].includes((f.status || '').toLowerCase()))
          .map(f => [f.destinatario_nome?.trim().toLowerCase() || '', f])
      )

      // Mapeamento de reservas ativas por item
      const reservedByItem = new Map<string, number>()
      reservations.forEach(res => {
        const qty = Math.max(0, Number(res.quantidade || 0))
        reservedByItem.set(res.pedido_item_id, (reservedByItem.get(res.pedido_item_id) ?? 0) + qty)
      })

      // Mapeamento de OPs por pedido_item_id ou pedido_venda_id+produto_id
      const opsByItemId = new Map<string, ProductionOrder>()
      const opsByOrderProduct = new Map<string, ProductionOrder>()
      const itemLinkedQty = new Map<string, number>()
      const itemProducedQty = new Map<string, number>()

      productionOrders.forEach(op => {
        const opStatusNorm = (op.status || '').toLowerCase()
        if (['cancelada', 'cancelado'].includes(opStatusNorm)) return

        const planQty = Number(op.quantidade_planejada ?? op.quantidade ?? 0)
        const prodQty = Number(op.quantidade_produzida ?? 0)

        if (op.pedido_item_id) {
          opsByItemId.set(op.pedido_item_id, op)
          itemLinkedQty.set(op.pedido_item_id, (itemLinkedQty.get(op.pedido_item_id) ?? 0) + planQty)
          itemProducedQty.set(op.pedido_item_id, (itemProducedQty.get(op.pedido_item_id) ?? 0) + prodQty)
        }
        if (op.pedido_venda_id && op.produto_id) {
          const key = `${op.pedido_venda_id}|${op.produto_id}`
          if (!opsByOrderProduct.has(key)) {
            opsByOrderProduct.set(key, op)
          }
        }
      })

      const builtRows: OrderPieceRow[] = []

      items.forEach(item => {
        const order = orderMap.get(item.pedido_id)
        if (!order) return

        const orderStatusLower = (order.status || '').trim().toLowerCase()
        if (['cancelado', 'cancelada', 'rejeitado', 'rejeitada'].includes(orderStatusLower)) {
          return
        }

        const product = productMap.get(item.produto_id)
        if (!product) return

        const client = clientMap.get(order.cliente_id || '')
        const requested = Number(item.quantidade || 0)
        const stock = Math.max(0, Number(product.estoque_atual || 0))
        const reserved = reservedByItem.get(item.id) ?? 0

        // OP vinculada
        const linkedOp = opsByItemId.get(item.id) ?? opsByOrderProduct.get(`${order.id}|${product.id}`)
        const linkedPlanQty = itemLinkedQty.get(item.id) ?? Number(linkedOp?.quantidade_planejada ?? linkedOp?.quantidade ?? 0)
        const linkedProducedQty = itemProducedQty.get(item.id) ?? Number(linkedOp?.quantidade_produzida ?? 0)

        // Falta fabricar (necessidade líquida de produção)
        const shortage = Math.max(0, requested - reserved - linkedPlanQty)

        // Verificação de documento fiscal
        const matchedFiscal = client?.nome ? fiscalByDest.get(client.nome.trim().toLowerCase()) : undefined

        // =========================================================================
        // Classificação Cirúrgica dos 6 Status da Peça (do Pedido à NF-e)
        // =========================================================================
        let statusPeca: PieceStatus = 'AGUARDANDO_PCP'

        const isOrderBilled = orderStatusLower.includes('faturad') || orderStatusLower.includes('concluid')
        const isOpConcluded = linkedOp && (linkedOp.status.toLowerCase().includes('conclui') || linkedProducedQty >= requested)

        if (isOrderBilled || (matchedFiscal && isOpConcluded)) {
          statusPeca = 'FATURADO'
        } else if (orderStatusLower.includes('exped') || orderStatusLower.includes('pronto') || (reserved >= requested && orderStatusLower.includes('confirmado'))) {
          statusPeca = 'PRONTO_EXPEDICAO'
        } else if (isOpConcluded) {
          statusPeca = 'PRODUZIDO'
        } else if (linkedOp && linkedPlanQty > 0) {
          statusPeca = 'EM_PRODUCAO'
        } else if (reserved >= requested || (shortage === 0 && reserved > 0)) {
          statusPeca = 'EM_ESTOQUE'
        } else {
          statusPeca = 'AGUARDANDO_PCP'
        }

        const machine = linkedOp?.maquina_id ? machineMap.get(linkedOp.maquina_id) : undefined

        builtRows.push({
          itemId: item.id,
          pedidoId: order.id,
          pedidoCodigo: String(order.numero),
          pedidoClienteRef: order.pedido_cliente ?? null,
          clienteId: order.cliente_id || '',
          clienteNome: client?.nome || 'Cliente Comercial',
          clienteDoc: client?.documento || null,
          dataEntrada: order.data_entrada ?? null,
          dataEntrega: order.data_entrega_prometida ?? null,
          orderStatus: order.status,
          produtoId: product.id,
          produtoCodigo: product.codigo,
          produtoNome: product.nome,
          produtoUnidade: product.unidade || 'UN',
          quantidadePedida: requested,
          estoqueAtual: stock,
          quantidadeReservada: reserved,
          quantidadeEmOP: linkedPlanQty,
          quantidadeProduzidaOP: linkedProducedQty,
          faltaFabricar: shortage,
          statusPeca,
          opId: linkedOp?.id,
          opNumero: linkedOp?.numero_op ? String(linkedOp.numero_op) : undefined,
          opStatus: linkedOp?.status,
          maquinaId: linkedOp?.maquina_id || undefined,
          maquinaCodigo: machine?.codigo,
          maquinaNome: machine?.nome,
          opPrevisao: linkedOp?.data_prevista,
          notaFiscalId: matchedFiscal?.id,
          notaFiscalNumero: matchedFiscal?.numero ? String(matchedFiscal.numero) : undefined,
          notaFiscalChave: matchedFiscal?.chave_acesso || undefined
        })
      })

      // Ordena por criticidade: falta fabricar primeiro, depois entrega mais próxima
      builtRows.sort((a, b) => {
        if (a.statusPeca === 'AGUARDANDO_PCP' && b.statusPeca !== 'AGUARDANDO_PCP') return -1
        if (b.statusPeca === 'AGUARDANDO_PCP' && a.statusPeca !== 'AGUARDANDO_PCP') return 1
        return (a.dataEntrega || '9999-12-31').localeCompare(b.dataEntrega || '9999-12-31') || a.pedidoCodigo.localeCompare(b.pedidoCodigo)
      })

      setRows(builtRows)
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar a esteira de pedidos pendentes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Reserva de saldo em estoque via RPC transacional oficial
  const reserveStock = async (row: OrderPieceRow) => {
    setError('')
    setNotice('')
    setReservingItem(row.itemId)
    try {
      const result = await supabase.rpc('erp_reservar_saldo_pedido_item', {
        p_pedido_item_id: row.itemId
      })
      if (result.error) throw result.error

      const payload = result.data as {
        quantidade_reservada_agora?: number
        quantidade_reservada?: number
        quantidade_faltante?: number
      } | null

      const added = Number(payload?.quantidade_reservada_agora ?? 0)
      const reserved = Number(payload?.quantidade_reservada ?? 0)
      const missing = Number(payload?.quantidade_faltante ?? 0)

      setNotice(
        added > 0
          ? `Reserva registrada: +${fmt(added)} ${row.produtoUnidade}. Total reservado: ${fmt(reserved)}. ${missing > 0 ? `Falta fabricar: ${fmt(missing)}.` : 'Item 100% coberto pelo estoque físico!'}`
          : `Nenhum saldo novo reservado. Total reservado: ${fmt(reserved)}. Falta fabricar: ${fmt(missing)}.`
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível reservar o saldo de estoque.')
    } finally {
      setReservingItem(null)
    }
  }

  // Criação de OP rápida vinculada ao pedido
  const handleCreateOpFast = async () => {
    if (!targetRowForOp) return
    const qty = Number(opModalQty)
    const rate = Number(opModalRate)

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Informe uma quantidade válida para produzir.')
      return
    }

    setCreatingOp(true)
    setError('')
    setNotice('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa não identificada.')
      const empresaId = String(tenant.data)

      const created = await supabase.rpc('erp_criar_ordem_producao_v2', {
        p_produto_id: targetRowForOp.produtoId,
        p_quantidade: qty,
        p_pedido_venda_id: targetRowForOp.pedidoId,
        p_maquina_id: opModalMachineId || null,
        p_velocidade_nominal_hora: rate > 0 ? rate : null,
        p_operacao_dupla: opModalDoubleOp
      })
      if (created.error) throw created.error

      const row = Array.isArray(created.data)
        ? (created.data[0] as { id: string; numero_op: number | string } | undefined)
        : undefined
      if (!row) throw new Error('A criação da OP não retornou o identificador.')

      // Atualiza prioridade e vínculo exato do item
      await supabase
        .from('erp_ordens_producao')
        .update({
          pedido_item_id: targetRowForOp.itemId,
          prioridade: opModalPriority
        })
        .eq('empresa_id', empresaId)
        .eq('id', row.id)

      setShowOpModal(false)
      setTargetRowForOp(null)
      setNotice(`OP-${row.numero_op} criada com sucesso para a peça! A linha agora está EM PRODUÇÃO.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar ordem de produção vinculada.')
    } finally {
      setCreatingOp(false)
    }
  }

  // Filtragem
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        [
          r.pedidoCodigo,
          r.clienteNome,
          r.produtoCodigo,
          r.produtoNome,
          r.opNumero ? `op-${r.opNumero}` : '',
          r.maquinaCodigo || '',
          r.pedidoClienteRef || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)

      const matchesStatus = statusFilter === 'TODOS' || r.statusPeca === statusFilter
      const matchesMachine = !machineFilter || r.maquinaId === machineFilter

      return matchesSearch && matchesStatus && matchesMachine
    })
  }, [rows, search, statusFilter, machineFilter])

  // Contadores para os Cards de Status
  const kpiTotal = rows.length
  const kpiAguardandoPcp = rows.filter(r => r.statusPeca === 'AGUARDANDO_PCP').length
  const kpiEmProducao = rows.filter(r => r.statusPeca === 'EM_PRODUCAO').length
  const kpiEmEstoque = rows.filter(r => r.statusPeca === 'EM_ESTOQUE').length
  const kpiProduzido = rows.filter(r => r.statusPeca === 'PRODUZIDO').length
  const kpiProntoExpedicao = rows.filter(r => r.statusPeca === 'PRONTO_EXPEDICAO').length
  const kpiFaturado = rows.filter(r => r.statusPeca === 'FATURADO').length
  const totalFaltaPecas = rows.reduce((acc, r) => acc + r.faltaFabricar, 0)

  return (
    <>
      {/* Folha de Impressão Oficial A4 — SYSNQRA SGQ IT-PCP-PEDIDOS-001 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .pedidos-print-sheet, .pedidos-print-sheet * { visibility: visible !important; }
          .pedidos-print-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10mm !important;
            background: #fff !important;
            color: #0f172a !important;
            font-family: Arial, sans-serif !important;
          }
          .pedidos-print-sheet table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .pedidos-print-sheet th, .pedidos-print-sheet td {
            border: 1px solid #334155;
            padding: 4px 6px;
            font-size: 8pt;
            text-align: left;
          }
          .pedidos-print-sheet th {
            background: #f1f5f9 !important;
            font-weight: bold;
            text-transform: uppercase;
          }
        }
        @media screen {
          .pedidos-print-sheet { display: none; }
        }
      `}</style>

      <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-5">
        <div className="mx-auto max-w-[1750px] space-y-3.5">
          
          {/* Cabeçalho Industrial Técnico */}
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-[#123B50] text-[#48B7C7]">
                <ShoppingCart size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#123B50] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    SYSNQRA SGQ • PCP-016
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#2D8DB8]">
                    ESTEIRA INDUSTRIAL DA PEÇA • PEDIDO À NOTA FISCAL
                  </span>
                </div>
                <h1 className="mt-0.5 text-base font-black tracking-tight text-[#123B50]">
                  Ficha de Pedidos Pendentes &amp; Rastreabilidade Fabril
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                title="Recarregar dados reais"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Atualizar Carteira</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                title="Imprimir Relatório A4"
              >
                <Printer size={13} />
                <span>Imprimir Ficha (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/pcp/ordens')}
                className={`${btnClass} bg-[#2D8DB8] text-white hover:bg-[#236F91] shadow-xs`}
              >
                <Factory size={13} />
                <span>Fila de OPs</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </header>

          {/* Notificações e Avisos */}
          {(notice || error) && (
            <div
              className={`flex items-center justify-between rounded-[2px] border px-3 py-2 text-xs font-bold ${
                error
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span>{error || notice}</span>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Cards de Status com Código de Cores da Esteira Industrial (Filtros de 1 Clique) */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            
            {/* 1. Vermelho: Falta Fabricar */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'AGUARDANDO_PCP' ? 'TODOS' : 'AGUARDANDO_PCP')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'AGUARDANDO_PCP'
                  ? 'border-[#D65B61] bg-rose-100 ring-2 ring-[#D65B61]/40'
                  : 'border-rose-200 bg-rose-50/60 hover:bg-rose-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-800">
                  🔴 FALTA FABRICAR
                </span>
                <AlertTriangle size={15} className="text-[#D65B61]" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-rose-900 tabular-nums">{kpiAguardandoPcp}</strong>
                <span className="text-[9px] font-bold text-rose-700">Aguardando OP</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-rose-600 truncate">Sem máquina e sem estoque</p>
            </article>

            {/* 2. Azul: Em Produção (PCP) */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'EM_PRODUCAO' ? 'TODOS' : 'EM_PRODUCAO')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'EM_PRODUCAO'
                  ? 'border-[#2D8DB8] bg-sky-100 ring-2 ring-[#2D8DB8]/40'
                  : 'border-sky-200 bg-sky-50/60 hover:bg-sky-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#123B50]">
                  🔵 EM PRODUÇÃO
                </span>
                <Play size={15} className="text-[#2D8DB8]" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-[#123B50] tabular-nums">{kpiEmProducao}</strong>
                <span className="text-[9px] font-bold text-[#2D8DB8]">No Chão Fabril</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-sky-600 truncate">Máquinas alocadas e rodando</p>
            </article>

            {/* 3. Ciano/Teal: Em Estoque */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'EM_ESTOQUE' ? 'TODOS' : 'EM_ESTOQUE')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'EM_ESTOQUE'
                  ? 'border-[#0D9488] bg-teal-100 ring-2 ring-[#0D9488]/40'
                  : 'border-teal-200 bg-teal-50/60 hover:bg-teal-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-teal-800">
                  🟢 EM ESTOQUE
                </span>
                <PackageCheck size={15} className="text-[#0D9488]" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-teal-900 tabular-nums">{kpiEmEstoque}</strong>
                <span className="text-[9px] font-bold text-teal-700">Saldo Físico</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-teal-600 truncate">Pronta no almoxarifado</p>
            </article>

            {/* 4. Esmeralda: Produzido SGQ */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'PRODUZIDO' ? 'TODOS' : 'PRODUZIDO')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'PRODUZIDO'
                  ? 'border-[#3A9D78] bg-emerald-100 ring-2 ring-[#3A9D78]/40'
                  : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                  ❇️ PRODUZIDO
                </span>
                <CheckCircle2 size={15} className="text-[#3A9D78]" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-emerald-900 tabular-nums">{kpiProduzido}</strong>
                <span className="text-[9px] font-bold text-emerald-700">Aprovado SGQ</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-emerald-600 truncate">OP 100% concluída</p>
            </article>

            {/* 5. Roxo: Pronto p/ Faturar */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'PRONTO_EXPEDICAO' ? 'TODOS' : 'PRONTO_EXPEDICAO')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'PRONTO_EXPEDICAO'
                  ? 'border-[#8B5CF6] bg-purple-100 ring-2 ring-[#8B5CF6]/40'
                  : 'border-purple-200 bg-purple-50/60 hover:bg-purple-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-800">
                  🟣 PRONTO P/ FATURAR
                </span>
                <Layers size={15} className="text-[#8B5CF6]" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-purple-900 tabular-nums">{kpiProntoExpedicao}</strong>
                <span className="text-[9px] font-bold text-purple-700">Expedição</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-purple-600 truncate">Aguardando emissão NF-e</p>
            </article>

            {/* 6. Cinza/Ardósia: Faturado NF-e */}
            <article
              onClick={() => setStatusFilter(statusFilter === 'FATURADO' ? 'TODOS' : 'FATURADO')}
              className={`cursor-pointer rounded-[2px] border p-2.5 transition-all shadow-xs ${
                statusFilter === 'FATURADO'
                  ? 'border-slate-500 bg-slate-200 ring-2 ring-slate-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                  ⚪ FATURADO (NF-e)
                </span>
                <FileCheck size={15} className="text-slate-500" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <strong className="text-xl font-black text-slate-800 tabular-nums">{kpiFaturado}</strong>
                <span className="text-[9px] font-bold text-slate-600">Ciclo Concluído</span>
              </div>
              <p className="mt-0.5 text-[8.5px] text-slate-500 truncate">Nota fiscal emitida</p>
            </article>
          </section>

          {/* Barra de Filtros e Pesquisa */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-2.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('TODOS')}
                className={`h-[28px] px-2.5 text-[10px] font-bold uppercase rounded-[2px] transition-all ${
                  statusFilter === 'TODOS'
                    ? 'bg-[#123B50] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos ({kpiTotal})
              </button>
              {(Object.keys(STATUS_CONFIG) as PieceStatus[]).map(stKey => {
                const conf = STATUS_CONFIG[stKey]
                const count = rows.filter(r => r.statusPeca === stKey).length
                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setStatusFilter(stKey)}
                    className={`h-[28px] px-2 text-[9px] font-bold uppercase rounded-[2px] transition-all ${
                      statusFilter === stKey
                        ? `${conf.badgeBg} ${conf.badgeText} border ${conf.badgeBorder} shadow-xs font-black`
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {conf.shortLabel} ({count})
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar PV, cliente, peça, OP, máquina..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-[28px] w-full rounded-[2px] border border-slate-300 bg-white pl-8 pr-2.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-[#2D8DB8]"
                />
              </div>

              <select
                value={machineFilter}
                onChange={e => setMachineFilter(e.target.value)}
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

          {/* Tabela Mestre: Linhas Coloridas Conforme o Status da Peça na Fábrica */}
          <div className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-xs">
            
            {/* Cabeçalho da Grade */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-100/80 px-3 py-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Factory size={15} className="text-[#123B50]" />
                <h2 className="font-black uppercase tracking-wider text-[#123B50]">
                  Esteira de Atendimento da Carteira ({filtered.length} itens)
                </h2>
                <span className="text-[10px] font-bold text-slate-500">
                  • Total de falta a fabricar: <strong className="text-rose-700 font-mono">{fmt(totalFaltaPecas)} peças</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
                <span>Clique em qualquer linha para ver a rastreabilidade completa</span>
              </div>
            </div>

            {/* Grade de Dados com Linhas Coloridas */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] border-collapse text-[11px]">
                <thead className="bg-[#123B50] text-white">
                  <tr className="h-[32px]">
                    <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider w-[100px]">Pedido / PV</th>
                    <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider">Cliente</th>
                    <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider w-[90px]">Cód. Peça</th>
                    <th className="px-2 text-left font-bold uppercase text-[9px] tracking-wider">Descrição do Produto</th>
                    <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[80px]">Entrega</th>
                    <th className="px-2 text-right font-bold uppercase text-[9px] tracking-wider w-[80px]">Qtd. Pedida</th>
                    <th className="px-2 text-right font-bold uppercase text-[9px] tracking-wider w-[80px]">Estoque Físico</th>
                    <th className="px-2 text-right font-bold uppercase text-[9px] tracking-wider w-[80px]">Reservado</th>
                    <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[140px]">OP / Produção</th>
                    <th className="px-2 text-right font-bold uppercase text-[9px] tracking-wider w-[90px]">Falta Fabricar</th>
                    <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[150px]">Status na Fábrica</th>
                    <th className="px-2 text-center font-bold uppercase text-[9px] tracking-wider w-[120px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-xs font-semibold text-slate-400">
                        {loading
                          ? 'Carregando dados da esteira industrial...'
                          : 'Nenhum pedido pendente encontrado com os filtros selecionados.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(row => {
                      const cfg = STATUS_CONFIG[row.statusPeca]
                      const StatusIcon = cfg.icon
                      const isExpanded = expandedItemId === row.itemId
                      const hasOp = Boolean(row.opNumero)
                      const pctProduced =
                        row.quantidadeEmOP > 0
                          ? Math.min(100, Math.round((row.quantidadeProduzidaOP / row.quantidadeEmOP) * 100))
                          : 0

                      return (
                        <tr
                          key={row.itemId}
                          onClick={() => setExpandedItemId(isExpanded ? null : row.itemId)}
                          className={`cursor-pointer transition-colors ${cfg.rowBg} ${cfg.rowBorder} ${
                            isExpanded ? 'ring-1 ring-[#123B50]' : ''
                          }`}
                        >
                          {/* Coluna 1: Pedido */}
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1 font-bold text-[#123B50]">
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              <span>PV-{row.pedidoCodigo}</span>
                            </div>
                            {row.pedidoClienteRef && (
                              <div className="text-[9px] text-slate-500 truncate" title={`Ref: ${row.pedidoClienteRef}`}>
                                Ref: {row.pedidoClienteRef}
                              </div>
                            )}
                          </td>

                          {/* Coluna 2: Cliente */}
                          <td className="px-2 py-2">
                            <div className="truncate max-w-[180px] font-semibold text-slate-800" title={row.clienteNome}>
                              {row.clienteNome}
                            </div>
                            {row.clienteDoc && (
                              <span className="text-[9px] text-slate-400">{row.clienteDoc}</span>
                            )}
                          </td>

                          {/* Coluna 3: Código */}
                          <td className="px-2 py-2 font-mono font-bold text-[#123B50]">
                            {row.produtoCodigo}
                          </td>

                          {/* Coluna 4: Descrição */}
                          <td className="px-2 py-2">
                            <div className="truncate max-w-[240px] text-slate-800" title={row.produtoNome}>
                              {row.produtoNome}
                            </div>
                          </td>

                          {/* Coluna 5: Prazo de Entrega */}
                          <td className="px-2 py-2 text-center text-[10px] font-semibold text-slate-700">
                            {dateBR(row.dataEntrega)}
                          </td>

                          {/* Coluna 6: Quantidade Pedida */}
                          <td className="px-2 py-2 text-right font-mono font-bold text-slate-900">
                            {fmt(row.quantidadePedida)}
                          </td>

                          {/* Coluna 7: Estoque Físico */}
                          <td className="px-2 py-2 text-right font-mono text-slate-700">
                            {fmt(row.estoqueAtual)}
                          </td>

                          {/* Coluna 8: Saldo Reservado */}
                          <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                            {fmt(row.quantidadeReservada)}
                          </td>

                          {/* Coluna 9: OP & Progresso da Fábrica */}
                          <td className="px-2 py-2 text-center">
                            {hasOp ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 text-[9px] font-bold text-[#123B50]">
                                  <span>OP-{row.opNumero}</span>
                                  {row.maquinaCodigo && (
                                    <span className="rounded bg-slate-200 px-1 py-0.2 text-[8px] font-mono">
                                      {row.maquinaCodigo}
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full ${pctProduced >= 100 ? 'bg-[#3A9D78]' : 'bg-[#2D8DB8]'}`}
                                    style={{ width: `${pctProduced}%` }}
                                  />
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">
                                  {fmt(row.quantidadeProduzidaOP)} / {fmt(row.quantidadeEmOP)} ({pctProduced}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">Sem OP</span>
                            )}
                          </td>

                          {/* Coluna 10: Falta Fabricar */}
                          <td className="px-2 py-2 text-right">
                            {row.faltaFabricar > 0 ? (
                              <span className="inline-block rounded px-1.5 py-0.5 font-mono font-black text-rose-700 bg-rose-100">
                                {fmt(row.faltaFabricar)} {row.produtoUnidade}
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-emerald-700">0</span>
                            )}
                          </td>

                          {/* Coluna 11: Status na Fábrica (Mudança de Cor da Linha) */}
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                            >
                              <StatusIcon size={11} />
                              {cfg.shortLabel}
                            </span>
                          </td>

                          {/* Coluna 12: Ações Rápidas */}
                          <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Botão de Reserva */}
                              <button
                                type="button"
                                disabled={
                                  reservingItem !== null ||
                                  row.faltaFabricar <= 0 ||
                                  row.quantidadeReservada >= row.quantidadePedida ||
                                  row.estoqueAtual <= 0
                                }
                                onClick={() => void reserveStock(row)}
                                className="h-6 px-1.5 text-[9px] font-black uppercase rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5"
                                title="Reservar saldo disponível no estoque"
                              >
                                <PackageCheck size={11} />
                                <span className="hidden xl:inline">Reservar</span>
                              </button>

                              {/* Botão de Criação de OP Rápida */}
                              {row.faltaFabricar > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetRowForOp(row)
                                    setOpModalQty(String(row.faltaFabricar))
                                    setOpModalMachineId(row.maquinaId || '')
                                    setShowOpModal(true)
                                  }}
                                  className="h-6 px-1.5 text-[9px] font-black uppercase rounded bg-[#2D8DB8] text-white hover:bg-[#236F91] flex items-center gap-0.5"
                                  title="Gerar Ordem de Produção no PCP"
                                >
                                  <Factory size={11} />
                                  <span className="hidden xl:inline">+ OP</span>
                                </button>
                              )}

                              {/* Botão para Faturamento (quando pronto para faturar) */}
                              {row.statusPeca === 'PRONTO_EXPEDICAO' && (
                                <button
                                  type="button"
                                  onClick={() => navigate('/fiscal/carteira-nfe')}
                                  className="h-6 px-1.5 text-[9px] font-black uppercase rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-0.5"
                                  title="Ir para Faturamento / Carteira Fiscal"
                                >
                                  <FileText size={11} />
                                  <span className="hidden xl:inline">NF-e</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Painel Expansível Detalhado da Linha Selecionada */}
            {expandedItemId && (
              (() => {
                const target = rows.find(r => r.itemId === expandedItemId)
                if (!target) return null
                const targetCfg = STATUS_CONFIG[target.statusPeca]
                const TargetIcon = targetCfg.icon

                return (
                  <div className="border-t-2 border-[#123B50] bg-slate-50 p-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#123B50] px-2 py-0.5 text-[9px] font-black text-white">
                          RASTREABILIDADE COMPLETA DA PEÇA
                        </span>
                        <h3 className="text-sm font-black text-[#123B50]">
                          PV-{target.pedidoCodigo} • {target.clienteNome} • {target.produtoCodigo} — {target.produtoNome}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Esteira Visual das 5 Fases da Peça (Pipeline de Atendimento) */}
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                      
                      {/* Fase 1: Comercial */}
                      <div className="rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                          <ShoppingCart size={13} className="text-[#123B50]" />
                          <span>1. Pedido de Venda</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <div><strong>Nº Pedido:</strong> PV-{target.pedidoCodigo}</div>
                          <div><strong>Entrada:</strong> {dateBR(target.dataEntrada)}</div>
                          <div><strong>Prometida:</strong> {dateBR(target.dataEntrega)}</div>
                          <div><strong>Qtd Pedida:</strong> {fmt(target.quantidadePedida)} {target.produtoUnidade}</div>
                        </div>
                      </div>

                      {/* Fase 2: Almoxarifado / Estoque */}
                      <div className="rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                          <Package size={13} className="text-[#0D9488]" />
                          <span>2. Estoque Físico</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <div><strong>Estoque Atual:</strong> {fmt(target.estoqueAtual)} {target.produtoUnidade}</div>
                          <div><strong>Saldo Reservado:</strong> {fmt(target.quantidadeReservada)} {target.produtoUnidade}</div>
                          <div><strong>Status Almox:</strong> {target.quantidadeReservada >= target.quantidadePedida ? 'Coberto' : 'Incompleto'}</div>
                        </div>
                      </div>

                      {/* Fase 3: PCP & Chão de Fábrica */}
                      <div className="rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                          <Factory size={13} className="text-[#2D8DB8]" />
                          <span>3. Chão de Fábrica</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <div><strong>OP:</strong> {target.opNumero ? `OP-${target.opNumero}` : 'Não emitida'}</div>
                          <div><strong>Máquina:</strong> {target.maquinaCodigo ? `${target.maquinaCodigo} - ${target.maquinaNome}` : 'A definir'}</div>
                          <div><strong>Produzido:</strong> {fmt(target.quantidadeProduzidaOP)} / {fmt(target.quantidadeEmOP)}</div>
                          <div><strong>Falta Fabricar:</strong> <strong className="text-rose-700">{fmt(target.faltaFabricar)}</strong></div>
                        </div>
                      </div>

                      {/* Fase 4: Qualidade SGQ */}
                      <div className="rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                          <CheckCircle2 size={13} className="text-[#3A9D78]" />
                          <span>4. Inspeção SGQ</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <div><strong>Primeira Peça:</strong> {target.opNumero ? 'Liberada' : 'Aguardando'}</div>
                          <div><strong>Dimensional:</strong> Conforme desenho</div>
                          <div><strong>Situação:</strong> {target.statusPeca === 'PRODUZIDO' || target.statusPeca === 'PRONTO_EXPEDICAO' || target.statusPeca === 'FATURADO' ? 'Aprovado' : 'Em andamento'}</div>
                        </div>
                      </div>

                      {/* Fase 5: Faturamento / NF-e */}
                      <div className="rounded border border-slate-200 bg-white p-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500">
                          <FileCheck size={13} className="text-slate-600" />
                          <span>5. Faturamento &amp; Saída</span>
                        </div>
                        <div className="mt-2 space-y-1 text-[10px]">
                          <div><strong>Status Fiscal:</strong> {target.statusPeca === 'FATURADO' ? 'Autorizado' : 'Aguardando'}</div>
                          <div><strong>NF-e:</strong> {target.notaFiscalNumero ? `NF ${target.notaFiscalNumero}` : 'Pendente'}</div>
                          {target.notaFiscalChave && (
                            <div className="truncate text-[8px] font-mono text-slate-500" title={target.notaFiscalChave}>
                              {target.notaFiscalChave}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações Técnicas no Rodapé do Drawer */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase ${targetCfg.badgeBg} ${targetCfg.badgeText} border ${targetCfg.badgeBorder}`}>
                          <TargetIcon size={12} />
                          {targetCfg.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {targetCfg.desc}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/pcp/fichas-processo`}
                          className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                        >
                          <ExternalLink size={12} />
                          <span>Ficha de Processo</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              origem: 'carteira-pcp',
                              pedidoId: target.pedidoId,
                              itemId: target.itemId,
                              produtoId: target.produtoId,
                              quantidade: String(target.faltaFabricar)
                            })
                            navigate(`/pcp/ordens?${params.toString()}`)
                          }}
                          className={`${btnClass} bg-[#123B50] text-white hover:bg-[#0c2838]`}
                        >
                          <Sliders size={12} />
                          <span>Abrir na Tela de OPs</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </main>

      {/* Modal de Criação Rápida de OP */}
      {showOpModal && targetRowForOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-[520px] rounded-[2px] border border-slate-300 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Factory size={16} className="text-[#123B50]" />
                <h3 className="text-sm font-black text-[#123B50]">
                  GERAR ORDEM DE PRODUÇÃO (OP) VINCULADA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOpModal(false)
                  setTargetRowForOp(null)
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 rounded-[2px] border border-slate-200 bg-slate-50 p-2 text-[10px] space-y-1">
              <div><strong>Pedido de Venda:</strong> PV-{targetRowForOp.pedidoCodigo} • {targetRowForOp.clienteNome}</div>
              <div><strong>Peça:</strong> {targetRowForOp.produtoCodigo} — {targetRowForOp.produtoNome}</div>
              <div><strong>Falta Fabricar:</strong> <strong className="text-rose-700">{fmt(targetRowForOp.faltaFabricar)} {targetRowForOp.produtoUnidade}</strong></div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                void handleCreateOpFast()
              }}
              className="mt-3 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Quantidade da OP *
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={opModalQty}
                    onChange={e => setOpModalQty(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Máquina Destino
                  </label>
                  <select
                    value={opModalMachineId}
                    onChange={e => setOpModalMachineId(e.target.value)}
                    className={inputClass}
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Velocidade Nominal (un/h)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={opModalRate}
                    onChange={e => setOpModalRate(e.target.value)}
                    className={inputClass}
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Prioridade
                  </label>
                  <select
                    value={opModalPriority}
                    onChange={e => setOpModalPriority(e.target.value)}
                    className={inputClass}
                  >
                    <option value="ALTA">Alta</option>
                    <option value="REGULAR">Regular</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={opModalDoubleOp}
                  onChange={e => setOpModalDoubleOp(e.target.checked)}
                  className="h-4 w-4 rounded text-[#2D8DB8]"
                />
                <span>Operação Dupla (Dois moldes síncronos frente/trás)</span>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOpModal(false)
                    setTargetRowForOp(null)
                  }}
                  className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOp}
                  className={`${btnClass} bg-[#2D8DB8] text-white hover:bg-[#236F91]`}
                >
                  <Zap size={13} />
                  <span>{creatingOp ? 'Criando OP...' : 'Gerar OP &amp; Iniciar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Espelho de Impressão A4 Oficial da Carteira */}
      <section className="pedidos-print-sheet" aria-label="Relatório de Pedidos Pendentes">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: 0 }}>SYSNQRA SISTEMAS INDUSTRIAIS</h1>
            <p style={{ fontSize: '8pt', color: '#475569', margin: '2px 0 0 0' }}>
              SGQ • CARTEIRA DE PEDIDOS PENDENTES E RASTREABILIDADE (IT-PCP-PEDIDOS-001)
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>EMISSÃO: {new Date().toLocaleString('pt-BR')}</span>
            <p style={{ fontSize: '8pt', color: '#64748b', margin: '2px 0 0 0' }}>Total: {filtered.length} itens</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Pedido</th>
              <th>Cliente</th>
              <th style={{ width: '80px' }}>Código</th>
              <th>Descrição da Peça</th>
              <th style={{ width: '70px', textAlign: 'center' }}>Entrega</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Pedida</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Estoque</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Reservado</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Falta</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.itemId}>
                <td><strong>PV-{r.pedidoCodigo}</strong></td>
                <td>{r.clienteNome}</td>
                <td>{r.produtoCodigo}</td>
                <td>{r.produtoNome}</td>
                <td style={{ textAlign: 'center' }}>{dateBR(r.dataEntrega)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.quantidadePedida)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.estoqueAtual)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.quantidadeReservada)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(r.faltaFabricar)}</td>
                <td style={{ textAlign: 'center' }}>{STATUS_CONFIG[r.statusPeca].shortLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
