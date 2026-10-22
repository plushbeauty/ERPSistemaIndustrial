/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP & ENGENHARIA DE MANUFATURA
 * Módulo: Ordens de Produção com Análise de Demanda e MRP
 * Arquivo: src/pages/PCPOrdens.tsx
 * Revisão: PCP-ORDENS-BARRAS-AZUIS-TEXTO-BRANCO-2026-10-22
 * Escopo: refatoração integral da interface, preservando Supabase/RLS.
 * =========================================================================
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2,
  ChevronRight, CirclePause, ClipboardList, Factory, FileText, Filter,
  Gauge, Layers3, ListFilter, Package, PackageCheck, Play, Plus, Printer,
  RefreshCw, Save, Search, Settings2, ShieldCheck, ShoppingCart, X, Zap
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-premium.css'

type Product = { id: string; codigo: string; nome: string; estoque_atual: number; unidade?: string | null }
type Machine = { id: string; codigo: string; nome: string; status: string }
type Pedido = { id: string; codigo: string; nome: string; status: string }
type OrderItem = { id: string; pedido_id: string; produto_id: string; quantidade: number; descricao?: string | null }
type OP = {
  id: string; numero_op: number | string; produto_id: string | null; pedido_venda_id: string | null
  pedido_item_id?: string | null; quantidade: number; quantidade_planejada: number
  quantidade_produzida: number; status: string; prioridade?: string | null; maquina_id: string | null
  velocidade_nominal_hora: number; operacao_dupla: boolean; tempo_estimado_horas: number
  data_prevista?: string | null; observacoes?: string | null; created_at?: string | null
}
type Material = { id: string; codigo: string; nome: string; need: number; stock: number; reserved: number; net: number; suggestion: string }
type StatusTab = 'TODAS' | 'PENDENTE' | 'EM_PROCESSO' | 'CONCLUIDO' | 'PAUSADA'
type DemandItem = {
  pedidoId: string; pedidoCodigo: string; clienteNome: string; itemId: string; produtoId: string
  produtoCodigo: string; produtoNome: string; qtdPedido: number; estoqueAtual: number
  qtdJaEmOrdem: number; sugestaoProducao: number; unidade: string
}

const inputClass = 'h-[30px] w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
const labelClass = 'flex min-w-0 flex-col gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500'
const btnClass = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-black uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const panelClass = 'min-w-0 rounded-[3px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,35,52,0.04)]'

function normalizeStatus(value?: string | null): 'PENDENTE' | 'EM_PROCESSO' | 'CONCLUIDO' | 'PAUSADA' | 'CANCELADA' {
  const v = String(value || '').trim().toUpperCase().replaceAll(' ', '_')
  if (v.includes('CONCLU') || v === 'FINALIZADA' || v === 'FINALIZADO') return 'CONCLUIDO'
  if (v.includes('PRODU') || v.includes('PROCESS') || v.includes('ANDAM')) return 'EM_PROCESSO'
  if (v.includes('PAUS')) return 'PAUSADA'
  if (v.includes('CANCEL')) return 'CANCELADA'
  return 'PENDENTE'
}
function numberBR(value: number, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}
function statusLabel(status: string) {
  const st = normalizeStatus(status)
  return st === 'EM_PROCESSO' ? 'EM PRODUÇÃO' : st === 'CONCLUIDO' ? 'CONCLUÍDA' : st === 'PAUSADA' ? 'PAUSADA' : st === 'CANCELADA' ? 'CANCELADA' : 'EM FILA'
}
function statusClass(status: string) {
  const st = normalizeStatus(status)
  if (st === 'CONCLUIDO') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (st === 'EM_PROCESSO') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (st === 'PAUSADA') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (st === 'CANCELADA') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

export default function PCPOrdens() {
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [ops, setOps] = useState<OP[]>([])
  const [selectedOpId, setSelectedOpId] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('TODAS')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMachine, setFilterMachine] = useState('')
  const [detailTab, setDetailTab] = useState<'parametros' | 'mrp' | 'apontamento'>('parametros')
  const [machineId, setMachineId] = useState('')
  const [qty, setQty] = useState('')
  const [rate, setRate] = useState('')
  const [doubleOp, setDoubleOp] = useState(false)
  const [priority, setPriority] = useState('ALTA')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [producedInput, setProducedInput] = useState('')
  const [showNewOpModal, setShowNewOpModal] = useState(false)
  const [handledPrefill, setHandledPrefill] = useState(false)
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mrpLoading, setMrpLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const companyRes = await supabase.rpc('erp_current_empresa_id')
      if (companyRes.error || !companyRes.data) throw companyRes.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(companyRes.data)
      const [ps, ms, os, salesOrders, salesItems, clients] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,unidade', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Machine>((from, to) => supabase.from('erp_maquinas').select('id,codigo,nome,status', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<OP>((from, to) => supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,pedido_venda_id,pedido_item_id,quantidade,quantidade_planejada,quantidade_produzida,status,prioridade,maquina_id,velocidade_nominal_hora,operacao_dupla,tempo_estimado_horas,data_prevista,observacoes,created_at', { count: 'exact' }).eq('empresa_id', companyId).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<{ id: string; numero: number | string; cliente_id: string | null; status: string }>((from, to) => supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status', { count: 'exact' }).eq('empresa_id', companyId).order('numero', { ascending: false }).range(from, to)),
        fetchAllPages<OrderItem>((from, to) => supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,quantidade', { count: 'exact' }).eq('empresa_id', companyId).range(from, to)),
        fetchAllPages<{ id: string; nome: string }>((from, to) => supabase.from('erp_clientes').select('id,nome', { count: 'exact' }).eq('empresa_id', companyId).eq('ativo', true).order('nome').range(from, to))
      ])
      const customerMap = new Map(clients.map(c => [c.id, c.nome]))
      setProducts(ps)
      setMachines(ms)
      setOps(os)
      setOrderItems(salesItems)
      setPedidos(salesOrders.map(o => ({ id: o.id, codigo: String(o.numero), nome: customerMap.get(o.cliente_id || '') || 'Pedido comercial', status: o.status })))
      if (selectedOpId && !os.some(o => o.id === selectedOpId)) setSelectedOpId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar ordens de produção.')
    } finally {
      setLoading(false)
    }
  }, [selectedOpId])

  useEffect(() => { void loadData() }, [loadData])

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products])
  const machineMap = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines])
  const pedidoMap = useMemo(() => new Map(pedidos.map(p => [p.id, p])), [pedidos])
  const selectedOp = useMemo(() => ops.find(o => o.id === selectedOpId), [ops, selectedOpId])
  const selectedProduct = selectedOp?.produto_id ? productMap.get(selectedOp.produto_id) : undefined
  const selectedMachine = selectedOp?.maquina_id ? machineMap.get(selectedOp.maquina_id) : undefined
  const selectedPedido = selectedOp?.pedido_venda_id ? pedidoMap.get(selectedOp.pedido_venda_id) : undefined
  const effectiveRate = Number(rate) > 0 ? Number(rate) * (doubleOp ? 2 : 1) : 0
  const estimatedHours = Number(qty) > 0 && effectiveRate > 0 ? Number(qty) / effectiveRate : 0

  useEffect(() => {
    if (!selectedOp) return
    setMachineId(selectedOp.maquina_id || '')
    setQty(String(selectedOp.quantidade_planejada || selectedOp.quantidade || ''))
    setRate(String(selectedOp.velocidade_nominal_hora || ''))
    setDoubleOp(Boolean(selectedOp.operacao_dupla))
    setPriority(selectedOp.prioridade || 'ALTA')
    setDueDate(selectedOp.data_prevista || '')
    setNotes(selectedOp.observacoes || '')
    setProducedInput(String(selectedOp.quantidade_produzida || 0))
  }, [selectedOp])

  const pedidosPendentesProducao = useMemo<DemandItem[]>(() => {
    const linkedQty = new Map<string, number>()
    ops.forEach(op => {
      if (op.pedido_item_id && normalizeStatus(op.status) !== 'CONCLUIDO' && normalizeStatus(op.status) !== 'CANCELADA') {
        linkedQty.set(op.pedido_item_id, (linkedQty.get(op.pedido_item_id) || 0) + Number(op.quantidade_planejada || op.quantidade || 0))
      }
    })
    const list: DemandItem[] = []
    orderItems.forEach(item => {
      const pedido = pedidoMap.get(item.pedido_id)
      if (!pedido || ['concluido', 'concluída', 'concluida', 'cancelado', 'cancelada', 'rejeitado', 'rejeitada'].includes(String(pedido.status).toLowerCase())) return
      const product = productMap.get(item.produto_id)
      const stock = Number(product?.estoque_atual || 0)
      const linked = linkedQty.get(item.id) || 0
      const requested = Number(item.quantidade || 0)
      const suggested = Math.max(0, requested - stock - linked)
      if (requested > stock + linked) list.push({
        pedidoId: item.pedido_id, pedidoCodigo: pedido.codigo, clienteNome: pedido.nome,
        itemId: item.id, produtoId: item.produto_id, produtoCodigo: product?.codigo || '—',
        produtoNome: product?.nome || item.descricao || 'Produto sem cadastro', qtdPedido: requested,
        estoqueAtual: stock, qtdJaEmOrdem: linked, sugestaoProducao: suggested,
        unidade: product?.unidade || 'un'
      })
    })
    return list
  }, [orderItems, pedidoMap, productMap, ops])

  const filteredOps = useMemo(() => ops.filter(op => {
    const st = normalizeStatus(op.status)
    const tabMatch = statusTab === 'TODAS' ||
      (statusTab === 'PENDENTE' && st === 'PENDENTE') ||
      (statusTab === 'EM_PROCESSO' && st === 'EM_PROCESSO') ||
      (statusTab === 'CONCLUIDO' && st === 'CONCLUIDO') ||
      (statusTab === 'PAUSADA' && st === 'PAUSADA')
    const machineMatch = !filterMachine || op.maquina_id === filterMachine
    const product = op.produto_id ? productMap.get(op.produto_id) : undefined
    const pedido = op.pedido_venda_id ? pedidoMap.get(op.pedido_venda_id) : undefined
    const target = [op.numero_op, product?.codigo, product?.nome, pedido?.codigo, pedido?.nome].join(' ').toLowerCase()
    return tabMatch && machineMatch && target.includes(searchQuery.trim().toLowerCase())
  }), [ops, statusTab, filterMachine, searchQuery, productMap, pedidoMap])

  const kpis = useMemo(() => ({
    total: ops.length,
    pendentes: ops.filter(o => normalizeStatus(o.status) === 'PENDENTE').length,
    andamento: ops.filter(o => normalizeStatus(o.status) === 'EM_PROCESSO').length,
    concluidas: ops.filter(o => normalizeStatus(o.status) === 'CONCLUIDO').length,
    prioridade: ops.filter(o => String(o.prioridade || '').toUpperCase() === 'ALTA' && normalizeStatus(o.status) !== 'CONCLUIDO' && normalizeStatus(o.status) !== 'CANCELADA').length
  }), [ops])

  async function explodeMRP(produtoId: string, quantidade: number) {
    if (!produtoId || quantidade <= 0) { setMaterials([]); return }
    setMrpLoading(true)
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const run = await supabase.rpc('erp_mrp_explodir', {
        p_produto_id: produtoId, p_quantidade: quantidade,
        p_demanda_ref: selectedOp?.pedido_venda_id ? 'PCP_OP_PEDIDO' : 'PCP_OP'
      })
      if (run.error) throw run.error
      const needs = await supabase.from('erp_mrp_necessidades').select('componente_id,quantidade_bruta,estoque_atual,reservado,necessidade_liquida,sugestao').eq('run_id', String(run.data)).order('nivel')
      if (needs.error) throw needs.error
      const ids = (needs.data || []).map(row => String(row.componente_id))
      const productRows = ids.length ? await supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id', companyId).in('id', ids) : { data: [], error: null }
      if (productRows.error) throw productRows.error
      const map = new Map((productRows.data || []).map((p: { id: string; codigo: string; nome: string }) => [p.id, p]))
      setMaterials((needs.data || []).map(row => ({
        id: String(row.componente_id), codigo: map.get(String(row.componente_id))?.codigo || '—',
        nome: map.get(String(row.componente_id))?.nome || '—', need: Number(row.quantidade_bruta || 0),
        stock: Number(row.estoque_atual || 0), reserved: Number(row.reservado || 0),
        net: Number(row.necessidade_liquida || 0), suggestion: String(row.sugestao || 'SEM_NECESSIDADE')
      })))
    } catch (e) {
      setMaterials([])
      setError('Não foi possível calcular o MRP: ' + (e instanceof Error ? e.message : 'verifique a ficha técnica/BOM.'))
    } finally { setMrpLoading(false) }
  }

  async function saveTechnicalParameters() {
    if (!selectedOpId) { setError('Selecione uma ordem de produção.'); return }
    if (rate && (!Number.isFinite(Number(rate)) || Number(rate) <= 0)) { setError('Informe uma velocidade nominal maior que zero.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_ordens_producao').update({
        maquina_id: machineId || null, velocidade_nominal_hora: Number(rate || 0),
        operacao_dupla: doubleOp, tempo_estimado_horas: estimatedHours,
        prioridade: priority, data_prevista: dueDate || null, observacoes: notes.trim() || null
      }).eq('empresa_id', String(company.data)).eq('id', selectedOpId).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A OP não foi atualizada. Confirme empresa e permissões.')
      setMessage('Parâmetros técnicos gravados na ordem de produção.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar parâmetros técnicos.') }
    finally { setSaving(false) }
  }

  async function updateOpStatus(opId: string, newStatus: string) {
    setSaving(true); setError(''); setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_ordens_producao').update({ status: newStatus }).eq('empresa_id', String(company.data)).eq('id', opId).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('A OP não foi atualizada. Verifique as permissões.')
      setMessage('Status da OP atualizado: ' + statusLabel(newStatus) + '.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao alterar status da OP.') }
    finally { setSaving(false) }
  }

  async function updateProducedQuantity() {
    if (!selectedOpId) return
    const produced = Number(producedInput)
    const planned = Number(selectedOp?.quantidade_planejada || selectedOp?.quantidade || 0)
    if (!Number.isFinite(produced) || produced < 0 || produced > planned) { setError('Informe um acumulado entre zero e a quantidade planejada (' + numberBR(planned) + ').'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const result = await supabase.from('erp_ordens_producao').update({ quantidade_produzida: produced }).eq('empresa_id', String(company.data)).eq('id', selectedOpId).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Apontamento não confirmado pelo banco.')
      setMessage('Quantidade produzida atualizada.')
      await loadData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao atualizar apontamento.') }
    finally { setSaving(false) }
  }

  function resetNewOp() {
    setError(''); setMessage(''); setNewOpType('PEDIDO'); setNewPedidoId(''); setNewPedidoItemId('')
    setNewProdutoId(''); setNewMachineId(''); setNewQty(''); setNewRate(''); setNewDoubleOp(false)
    setNewPriority('ALTA'); setNewDueDate(''); setNewNotes('')
  }
  const programDemand = useCallback((item: DemandItem) => {
    setError(''); setMessage(''); setNewOpType('PEDIDO'); setNewPedidoId(item.pedidoId)
    setNewPedidoItemId(item.itemId); setNewProdutoId(item.produtoId)
    setNewQty(String(item.sugestaoProducao)); setNewMachineId(''); setNewRate(''); setNewDoubleOp(false)
    setNewPriority('ALTA'); setNewDueDate('')
    setNewNotes('Programação originada do pedido PV-' + item.pedidoCodigo + '. Saldo calculado pela demanda, estoque físico e OPs vinculadas.')
    setShowNewOpModal(true)
  }, [])

  useEffect(() => {
    if (loading || handledPrefill) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('origem') !== 'carteira-pcp') return
    const pedidoId = params.get('pedidoId') || ''
    const itemId = params.get('itemId') || ''
    const produtoId = params.get('produtoId') || ''
    const requestedQty = Number(params.get('quantidade') || 0)
    if (!pedidoId || !itemId || !produtoId || !Number.isFinite(requestedQty) || requestedQty <= 0) {
      setError('Não foi possível abrir a programação: os dados do pedido/item estão incompletos.')
      setHandledPrefill(true)
      return
    }
    const sourceItem = orderItems.find(item => item.id === itemId && item.pedido_id === pedidoId && item.produto_id === produtoId)
    const order = pedidoMap.get(pedidoId)
    const product = productMap.get(produtoId)
    if (!sourceItem || !order || !product) {
      setError('Pedido, item ou produto não foi localizado na empresa autenticada. Atualize a carteira e tente novamente.')
      setHandledPrefill(true)
      return
    }
    const linked = ops.filter(op => op.pedido_item_id === itemId && normalizeStatus(op.status) !== 'CONCLUIDO' && normalizeStatus(op.status) !== 'CANCELADA')
      .reduce((sum, op) => sum + Number(op.quantidade_planejada || op.quantidade || 0), 0)
    programDemand({
      pedidoId, pedidoCodigo: order.codigo, clienteNome: order.nome, itemId, produtoId,
      produtoCodigo: product.codigo, produtoNome: product.nome, qtdPedido: Number(sourceItem.quantidade || 0),
      estoqueAtual: Number(product.estoque_atual || 0), qtdJaEmOrdem: linked,
      sugestaoProducao: requestedQty, unidade: product.unidade || 'un'
    })
    setHandledPrefill(true)
  }, [loading, handledPrefill, orderItems, pedidoMap, productMap, ops, programDemand])

  async function createNewOp() {
    const quantity = Number(newQty)
    const nominal = Number(newRate)
    const sourceItem = orderItems.find(item => item.id === newPedidoItemId && item.pedido_id === newPedidoId && item.produto_id === newProdutoId)
    if (!newProdutoId || !Number.isFinite(quantity) || quantity <= 0) { setError('Selecione o produto e informe quantidade maior que zero.'); return }
    if (newOpType === 'PEDIDO' && (!newPedidoId || !newPedidoItemId || !sourceItem)) { setError('Selecione pedido e item de venda válidos.'); return }
    if (newRate && (!Number.isFinite(nominal) || nominal <= 0)) { setError('Informe velocidade nominal válida.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const created = await supabase.rpc('erp_criar_ordem_producao_v2', {
        p_produto_id: newProdutoId, p_quantidade: quantity,
        p_pedido_venda_id: newOpType === 'PEDIDO' ? newPedidoId : null,
        p_maquina_id: newMachineId || null,
        p_velocidade_nominal_hora: newRate ? nominal : null, p_operacao_dupla: newDoubleOp
      })
      if (created.error) throw created.error
      const row = Array.isArray(created.data) ? created.data[0] as { id: string; numero_op: number | string } | undefined : undefined
      if (!row?.id) throw new Error('A criação da OP não retornou identificador.')
      const patch = await supabase.from('erp_ordens_producao').update({
        prioridade: newPriority, data_prevista: newDueDate || null, observacoes: newNotes.trim() || null,
        ...(newOpType === 'PEDIDO' && sourceItem ? { pedido_item_id: sourceItem.id } : {})
      }).eq('empresa_id', companyId).eq('id', row.id).select('id').maybeSingle()
      if (patch.error) throw patch.error
      if (!patch.data) throw new Error('OP criada, mas não foi possível confirmar os parâmetros/vínculo. Verifique a fila antes de repetir.')
      setShowNewOpModal(false)
      setSelectedOpId(row.id)
      setMessage('OP-' + row.numero_op + ' criada com sucesso e integrada ao PCP.')
      await loadData()
      setDetailTab('mrp')
      await explodeMRP(newProdutoId, quantity)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao criar a ordem de produção.') }
    finally { setSaving(false) }
  }

  const pendingTotal = pedidosPendentesProducao.reduce((sum, item) => sum + item.sugestaoProducao, 0)
  const selectedPlanned = Number(selectedOp?.quantidade_planejada || selectedOp?.quantidade || 0)
  const selectedProduced = Number(selectedOp?.quantidade_produzida || 0)
  const selectedProgress = selectedPlanned > 0 ? Math.min(100, Math.round(selectedProduced / selectedPlanned * 100)) : 0
  const printDate = new Date().toLocaleString('pt-BR')

  return <>
    <style>{'@media print{body *{visibility:hidden!important}.op-print-sheet,.op-print-sheet *{visibility:visible!important}.op-print-sheet{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;padding:14mm!important;background:#fff!important;color:#111!important;font:9pt Arial,sans-serif!important}.op-print-sheet table{width:100%;border-collapse:collapse;margin-top:12px}.op-print-sheet th,.op-print-sheet td{border:1px solid #555;padding:5px;text-align:left}.op-print-sheet th{background:#e8eef2!important}.op-print-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.op-print-field{border:1px solid #bbb;padding:7px}.op-print-label{font-size:7pt;color:#555;text-transform:uppercase}.op-print-value{font-weight:bold;margin-top:3px}.op-print-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:45px}.op-print-signatures div{border-top:1px solid #333;padding-top:6px;text-align:center}.op-print-hide{display:none!important}}@media screen{.op-print-sheet{display:none}}'}</style>
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased md:p-5">
      <div className="mx-auto max-w-[1700px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-[#24475C] bg-[#123B50] px-4 py-3 text-white shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[#48B7C7]/40 bg-[#0D2A3C] text-[#48B7C7]"><Factory size={21}/></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#48B7C7]">SYSNQRA SISTEMAS INDUSTRIAIS</span><span className="rounded-[2px] border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-slate-200">PCP-001</span></div>
              <h1 className="mt-0.5 text-[17px] font-black tracking-tight">Ordens de Produção & Planejamento Técnico</h1>
              <p className="mt-0.5 text-[10px] text-slate-300">Chão de fábrica · demanda comercial · capacidade de máquina · MRP multinível</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadData()} disabled={loading} className={btnClass + ' border-white/25 bg-[#0D2A3C] text-white hover:bg-[#19465E]'}><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Atualizar</button>
            <button type="button" onClick={() => { if (!selectedOp) { setError('Selecione uma OP na fila para imprimir a ficha.'); return } window.print() }} disabled={!selectedOp} className={btnClass + ' border-white/25 bg-[#0D2A3C] text-white hover:bg-[#19465E]'}><Printer size={13}/> Imprimir A4</button>
            <button type="button" onClick={() => { resetNewOp(); setShowNewOpModal(true) }} className={btnClass + ' border-[#48B7C7] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><Plus size={14}/> Nova OP</button>
          </div>
        </header>

        {(message || error) && <div role={error ? 'alert' : 'status'} className={'flex items-start justify-between gap-3 rounded-[2px] border px-3 py-2 text-[11px] font-bold ' + (error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}><div className="flex items-start gap-2">{error ? <AlertTriangle size={15} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={15} className="mt-0.5 shrink-0"/>}<span>{error || message}</span></div><button type="button" aria-label="Fechar aviso" onClick={() => { setError(''); setMessage('') }}><X size={14}/></button></div>}

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24475C] bg-[#123B50] px-3 py-2 text-white">
            <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-white"/><div><h2 className="text-[11px] font-black uppercase tracking-wide text-white">Análise de pedidos pendentes</h2><p className="text-[10px] text-white/80">Demanda comercial comparada ao estoque físico e às OPs vinculadas ao item</p></div></div>
            <div className="flex flex-wrap gap-3 text-[10px] text-white"><span>Itens na fila <strong className="ml-1 text-white">{pedidosPendentesProducao.length}</strong></span><span>Saldo sugerido <strong className="ml-1 text-white">{numberBR(pendingTotal)} un</strong></span></div>
          </div>
          {pedidosPendentesProducao.length === 0 ? <div className="flex items-center gap-2 px-4 py-5 text-[11px] font-semibold text-slate-500"><PackageCheck size={17} className="text-emerald-600"/>{loading ? 'Sincronizando pedidos e estoque...' : 'Nenhum item pendente de programação encontrado com os dados disponíveis.'}</div> :
            <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-[10px]"><thead className="bg-[#F6FAFB] text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2">Pedido / Cliente</th><th className="px-3 py-2">Produto</th><th className="px-3 py-2 text-right">Solicitada</th><th className="px-3 py-2 text-right">Estoque</th><th className="px-3 py-2 text-right">Em OPs</th><th className="px-3 py-2 text-right">Saldo sugerido</th><th className="px-3 py-2 text-right">Ação PCP</th></tr></thead><tbody>{pedidosPendentesProducao.map((item, index) => <tr key={item.itemId} className={'border-t border-slate-100 ' + (index % 2 ? 'bg-white' : 'bg-[#FBFDFE]')}><td className="px-3 py-2"><div className="font-black text-[#123B50]">PV-{item.pedidoCodigo}</div><div className="mt-0.5 text-slate-500">{item.clienteNome}</div></td><td className="px-3 py-2"><div className="font-black text-slate-700">{item.produtoCodigo}</div><div className="mt-0.5 text-slate-500">{item.produtoNome}</div></td><td className="px-3 py-2 text-right font-mono font-bold">{numberBR(item.qtdPedido)}</td><td className="px-3 py-2 text-right font-mono">{numberBR(item.estoqueAtual)}</td><td className="px-3 py-2 text-right font-mono">{numberBR(item.qtdJaEmOrdem)}</td><td className="px-3 py-2 text-right"><span className="inline-flex min-w-[78px] justify-end rounded-[2px] bg-[#2D8DB8] px-2 py-1 font-mono font-black text-white">{numberBR(item.sugestaoProducao)} {item.unidade}</span></td><td className="px-3 py-2 text-right"><button type="button" onClick={() => programDemand(item)} className="inline-flex h-[27px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-2.5 text-[9px] font-black uppercase text-white hover:bg-[#236F91]"><Zap size={12}/> Programar <ArrowRight size={12}/></button></td></tr>)}</tbody></table></div>}
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Total de OPs', value: kpis.total, icon: ClipboardList, tone: 'border-slate-200 bg-white text-[#123B50]' },
            { label: 'Em fila', value: kpis.pendentes, icon: CalendarClock, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
            { label: 'Em produção', value: kpis.andamento, icon: Gauge, tone: 'border-[#2D8DB8] bg-[#2D8DB8] text-white' },
            { label: 'Concluídas', value: kpis.concluidas, icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            { label: 'Prioridade alta', value: kpis.prioridade, icon: AlertTriangle, tone: 'border-rose-200 bg-rose-50 text-rose-800' }
          ].map(kpi => <article key={kpi.label} className={'flex min-w-0 items-center gap-3 rounded-[3px] border p-3 ' + kpi.tone}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-white/80"><kpi.icon size={17}/></span><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-wider opacity-70">{kpi.label}</div><div className="mt-0.5 text-[20px] font-black leading-none">{kpi.value}</div></div></article>)}
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2"><ListFilter size={16} className="text-[#2D8DB8]"/><h2 className="text-[11px] font-black uppercase tracking-wide">Fila industrial de ordens</h2><span className="rounded-[2px] bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{filteredOps.length} registros</span></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative block w-full sm:w-[230px]"><Search size={13} className="absolute left-2.5 top-2 text-slate-400"/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar OP, produto ou pedido..." className={inputClass + ' pl-8'}/></label>
              <label className="flex items-center gap-1.5"><Filter size={12} className="text-slate-400"/><select value={filterMachine} onChange={e => setFilterMachine(e.target.value)} className={inputClass + ' w-auto max-w-[210px]'}><option value="">Todas as máquinas</option>{machines.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></label>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-[#FBFDFE] px-3 py-2">{([
            ['TODAS', 'Todas'], ['PENDENTE', 'Em fila'], ['EM_PROCESSO', 'Em produção'], ['CONCLUIDO', 'Concluídas'], ['PAUSADA', 'Pausadas']
          ] as [StatusTab, string][]).map(([tab, label]) => <button key={tab} type="button" onClick={() => setStatusTab(tab)} className={'h-[27px] rounded-[2px] border px-2.5 text-[9px] font-black uppercase ' + (statusTab === tab ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}>{label}</button>)}</div>
          <div className="grid min-w-0 grid-cols-1 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-[10px]"><thead className="bg-[#123B50] text-[9px] uppercase tracking-wider text-white"><tr><th className="px-3 py-2">Ordem</th><th className="px-3 py-2">Produto / Pedido</th><th className="px-3 py-2">Máquina</th><th className="px-3 py-2 text-right">Planejado / Produzido</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{filteredOps.map((op, index) => {
                const product = op.produto_id ? productMap.get(op.produto_id) : undefined
                const pedido = op.pedido_venda_id ? pedidoMap.get(op.pedido_venda_id) : undefined
                const machine = op.maquina_id ? machineMap.get(op.maquina_id) : undefined
                const planned = Number(op.quantidade_planejada || op.quantidade || 0)
                const produced = Number(op.quantidade_produzida || 0)
                const pct = planned > 0 ? Math.min(100, Math.round(produced / planned * 100)) : 0
                const selected = selectedOpId === op.id
                return <tr key={op.id} onClick={() => setSelectedOpId(op.id)} className={'cursor-pointer border-b border-slate-100 transition-colors ' + (selected ? 'bg-[#DFF1F6]' : index % 2 ? 'bg-white hover:bg-slate-50' : 'bg-[#FBFDFE] hover:bg-slate-50')}>
                  <td className="px-3 py-2"><div className="font-black text-[#123B50]">OP-{op.numero_op}</div><div className="mt-1 h-1 w-[72px] overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#2D8DB8]" style={{ width: pct + '%' }}/></div><div className="mt-0.5 text-[9px] text-slate-400">{pct}% concluído</div></td>
                  <td className="px-3 py-2"><div className="font-bold text-slate-700">{product?.codigo || 'Produto não identificado'}</div><div className="max-w-[210px] truncate text-slate-500">{product?.nome || '—'}</div>{pedido && <div className="mt-0.5 text-[9px] font-bold text-[#2D8DB8]">PV-{pedido.codigo}</div>}</td>
                  <td className="px-3 py-2 text-slate-600">{machine?.codigo || '—'}<div className="max-w-[115px] truncate text-[9px] text-slate-400">{machine?.nome || 'Sem máquina'}</div></td>
                  <td className="px-3 py-2 text-right font-mono"><div className="font-black text-slate-700">{numberBR(planned)}</div><div className="text-slate-500">{numberBR(produced)} produzidas</div></td>
                  <td className="px-3 py-2"><span className={'inline-flex whitespace-nowrap rounded-[2px] border px-1.5 py-1 text-[8px] font-black ' + statusClass(op.status)}>{statusLabel(op.status)}</span>{selected && <div className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase text-[#2D8DB8]"><ChevronRight size={11}/> Selecionada</div>}</td>
                </tr>
              })}{!filteredOps.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-[11px] font-semibold text-slate-500">{loading ? 'Carregando ordens...' : 'Nenhuma ordem corresponde aos filtros.'}</td></tr>}</tbody></table></div>
            </div>
            <aside className="min-w-0 border-t border-slate-200 bg-[#F8FBFC] xl:col-span-5 xl:border-l xl:border-t-0">
              {selectedOp ? <>
                <div className="border-b border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[9px] font-black uppercase tracking-[0.15em] text-[#2D8DB8]">Detalhes da ordem</div><h3 className="mt-1 text-[16px] font-black text-[#123B50]">OP-{selectedOp.numero_op}</h3><p className="mt-0.5 text-[10px] text-slate-500">{selectedProduct?.codigo || '—'} · {selectedProduct?.nome || 'Produto sem cadastro'}</p></div><span className={'rounded-[2px] border px-2 py-1 text-[9px] font-black ' + statusClass(selectedOp.status)}>{statusLabel(selectedOp.status)}</span></div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{normalizeStatus(selectedOp.status) === 'PENDENTE' && <button type="button" onClick={() => void updateOpStatus(selectedOp.id, 'em_producao')} disabled={saving} className={btnClass + ' border-sky-200 bg-sky-50 text-sky-800'}><Play size={12}/> Iniciar</button>}{normalizeStatus(selectedOp.status) === 'EM_PROCESSO' && <button type="button" onClick={() => void updateOpStatus(selectedOp.id, 'pausada')} disabled={saving} className={btnClass + ' border-amber-200 bg-amber-50 text-amber-800'}><CirclePause size={12}/> Pausar</button>}{normalizeStatus(selectedOp.status) === 'PAUSADA' && <button type="button" onClick={() => void updateOpStatus(selectedOp.id, 'em_producao')} disabled={saving} className={btnClass + ' border-sky-200 bg-sky-50 text-sky-800'}><Play size={12}/> Retomar</button>}{normalizeStatus(selectedOp.status) !== 'CONCLUIDO' && normalizeStatus(selectedOp.status) !== 'CANCELADA' && <button type="button" onClick={() => void updateOpStatus(selectedOp.id, 'concluida')} disabled={saving} className={btnClass + ' border-emerald-200 bg-emerald-50 text-emerald-800'}><CheckCircle2 size={12}/> Finalizar</button>}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2D8DB8] transition-all" style={{ width: selectedProgress + '%' }}/></div><div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>Produção acumulada</span><strong>{selectedProgress}%</strong></div>
                </div>
                <div className="flex border-b border-[#24475C] bg-[#123B50]">{([
                  ['parametros', 'Parâmetros', Settings2], ['mrp', 'MRP', Layers3], ['apontamento', 'Apontamento', BarChart3]
                ] as const).map(([tab, label, Icon]) => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={'flex min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-2 py-2 text-[9px] font-black uppercase ' + (detailTab === tab ? 'border-white bg-white text-[#123B50]' : 'border-transparent text-white/85 hover:bg-white/10 hover:text-white')}><Icon size={12}/>{label}{tab === 'mrp' ? ' (' + materials.length + ')' : ''}</button>)}</div>
                {detailTab === 'parametros' && <div className="space-y-3 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Máquina fixa<select value={machineId} onChange={e => setMachineId(e.target.value)} className={inputClass}><option value="">Sem máquina definida</option>{machines.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></label>
                    <label className={labelClass}>Prioridade fabril<select value={priority} onChange={e => setPriority(e.target.value)} className={inputClass}><option value="ALTA">Alta</option><option value="REGULAR">Regular</option><option value="BAIXA">Baixa</option></select></label>
                    <label className={labelClass}>Velocidade nominal (un/h)<input type="number" min="0" step="any" value={rate} onChange={e => setRate(e.target.value)} className={inputClass} placeholder="Ex.: 120"/></label>
                    <label className={labelClass}>Data prevista<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass}/></label>
                  </div>
                  <label className="flex items-center gap-2 rounded-[2px] border border-slate-200 bg-white px-2.5 py-2 text-[9px] font-black uppercase text-slate-600"><input type="checkbox" checked={doubleOp} onChange={e => setDoubleOp(e.target.checked)} className="accent-[#2D8DB8]"/> Operação dupla (dois moldes/cavidades sincronizados)</label>
                  <div className="grid grid-cols-3 gap-2"><div className="rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] p-2 text-white"><div className="text-[8px] font-black uppercase text-white">Velocidade efetiva</div><div className="mt-1 text-[12px] font-black text-[#123B50]">{numberBR(effectiveRate, 2)}</div><div className="text-[8px] text-slate-500">un/h</div></div><div className="rounded-[2px] border border-slate-200 bg-white p-2"><div className="text-[8px] font-black uppercase text-slate-500">Tempo estimado</div><div className="mt-1 text-[12px] font-black text-[#123B50]">{Math.floor(estimatedHours)}h {Math.round(estimatedHours % 1 * 60)}m</div></div><div className="rounded-[2px] border border-slate-200 bg-white p-2"><div className="text-[8px] font-black uppercase text-slate-500">Carga máquina</div><div className="mt-1 text-[12px] font-black text-[#123B50]">{numberBR(estimatedHours, 2)} h</div></div></div>
                  <label className={labelClass}>Observações operacionais<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full resize-y rounded-[2px] border border-slate-300 bg-white p-2 text-[10px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8]" placeholder="Requisitos de qualidade, molde, matéria-prima..."/></label>
                  <div className="flex flex-wrap items-center justify-between gap-2"><a href="/pcp/fichas-processo" className="inline-flex items-center gap-1 text-[10px] font-black text-[#2D8DB8] hover:underline"><FileText size={13}/> Ficha de processo</a><button type="button" onClick={() => void saveTechnicalParameters()} disabled={saving} className={btnClass + ' border-[#123B50] bg-[#123B50] text-white hover:bg-[#1C526C]'}><Save size={12}/> {saving ? 'Gravando...' : 'Salvar parâmetros'}</button></div>
                </div>}
                {detailTab === 'mrp' && <div className="p-3">
                  <div className="mb-3 flex items-center justify-between gap-2"><div><div className="text-[10px] font-black text-[#123B50]">Explosão de materiais</div><div className="text-[9px] text-slate-500">Necessidade calculada pelo RPC do Supabase</div></div><button type="button" onClick={() => void explodeMRP(selectedOp.produto_id || '', Number(selectedOp.quantidade_planejada || selectedOp.quantidade || 0))} disabled={mrpLoading} className="text-[9px] font-black uppercase text-[#2D8DB8] hover:underline">{mrpLoading ? 'Calculando...' : 'Recalcular MRP'}</button></div>
                  {materials.length ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[9px]"><thead className="bg-[#123B50] text-left text-white"><tr><th className="px-2 py-2">Insumo</th><th className="px-2 py-2 text-right">Necessário</th><th className="px-2 py-2 text-right">Estoque</th><th className="px-2 py-2">Ação</th></tr></thead><tbody>{materials.map(m => <tr key={m.id} className="border-b border-slate-100"><td className="px-2 py-2"><strong>{m.codigo}</strong><div className="text-slate-500">{m.nome}</div></td><td className="px-2 py-2 text-right font-mono">{numberBR(m.need, 3)}</td><td className="px-2 py-2 text-right font-mono">{numberBR(m.stock, 3)}</td><td className="px-2 py-2 font-black">{m.suggestion === 'PRODUZIR' ? <span className="text-amber-700">FABRICAR</span> : m.suggestion === 'COMPRAR' ? <span className="text-rose-700">COMPRAR</span> : <span className="text-emerald-700">DISPONÍVEL</span>}</td></tr>)}</tbody></table></div> : <div className="rounded-[2px] border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-[10px] text-slate-500">{mrpLoading ? 'Calculando estrutura de materiais...' : 'Nenhuma necessidade retornada. Verifique se há ficha técnica/BOM ativa para este produto.'}</div>}
                </div>}
                {detailTab === 'apontamento' && <div className="space-y-3 p-3">
                  <div className="grid grid-cols-2 gap-2"><div className="rounded-[2px] border border-slate-200 bg-white p-3"><div className="text-[9px] font-black uppercase text-slate-500">Quantidade planejada</div><div className="mt-1 text-[18px] font-black text-[#123B50]">{numberBR(selectedPlanned)}</div></div><div className="rounded-[2px] border border-emerald-200 bg-emerald-50 p-3"><div className="text-[9px] font-black uppercase text-emerald-700">Saldo restante</div><div className="mt-1 text-[18px] font-black text-emerald-800">{numberBR(Math.max(0, selectedPlanned - selectedProduced))}</div></div></div>
                  <label className={labelClass}>Total acumulado produzido<input type="number" min="0" max={selectedPlanned} step="any" value={producedInput} onChange={e => setProducedInput(e.target.value)} className={inputClass}/></label>
                  <button type="button" onClick={() => void updateProducedQuantity()} disabled={saving} className={btnClass + ' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><Save size={12}/> {saving ? 'Gravando...' : 'Atualizar apontamento'}</button>
                  <p className="text-[9px] leading-relaxed text-slate-500">O valor representa o acumulado total da OP, não a quantidade produzida apenas neste apontamento.</p>
                </div>}
              </> : <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-[#E6F4F8] text-[#2D8DB8]"><Factory size={24}/></span><h3 className="mt-3 text-[12px] font-black text-[#123B50]">Selecione uma ordem</h3><p className="mt-1 max-w-[260px] text-[10px] leading-relaxed text-slate-500">Escolha uma OP na fila para consultar parâmetros, MRP, capacidade e apontamento de produção.</p><button type="button" onClick={() => { resetNewOp(); setShowNewOpModal(true) }} className="mt-3 inline-flex h-[30px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-black uppercase text-white"><Plus size={13}/> Criar nova OP</button></div>}
            </aside>
          </div>
        </section>

        <section className="op-print-sheet" aria-label="Documento de ordem de produção">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3"><div><h1 className="text-[18pt] font-bold">SYSNQRA SISTEMAS INDUSTRIAIS</h1><p>ORDEM DE PRODUÇÃO · PCP-001</p></div><div className="text-right text-[8pt]"><strong>Documento operacional</strong><div>Emissão: {printDate}</div></div></div>
          <div className="op-print-grid mt-4">{[
            ['Número da OP', selectedOp ? 'OP-' + selectedOp.numero_op : '—'],
            ['Status', selectedOp ? statusLabel(selectedOp.status) : '—'],
            ['Produto', (selectedProduct?.codigo || '—') + ' — ' + (selectedProduct?.nome || '—')],
            ['Pedido de venda', selectedPedido ? 'PV-' + selectedPedido.codigo : 'Não vinculado'],
            ['Máquina', selectedMachine ? selectedMachine.codigo + ' — ' + selectedMachine.nome : 'Não definida'],
            ['Quantidade planejada', numberBR(selectedPlanned)],
            ['Quantidade produzida', numberBR(selectedProduced)],
            ['Velocidade nominal', numberBR(Number(selectedOp?.velocidade_nominal_hora || 0), 2) + ' un/h'],
            ['Tempo estimado', numberBR(Number(selectedOp?.tempo_estimado_horas || 0), 2) + ' h']
          ].map(([label, value]) => <div key={label} className="op-print-field"><div className="op-print-label">{label}</div><div className="op-print-value">{value}</div></div>)}</div>
          <h2 className="mt-5 font-bold">Materiais — explosão MRP desta emissão</h2><table><thead><tr><th>Código</th><th>Insumo</th><th>Necessário</th><th>Estoque</th><th>Reservado</th><th>Necessidade líquida</th><th>Destino</th></tr></thead><tbody>{materials.length ? materials.map(m => <tr key={m.id}><td>{m.codigo}</td><td>{m.nome}</td><td>{numberBR(m.need, 3)}</td><td>{numberBR(m.stock, 3)}</td><td>{numberBR(m.reserved, 3)}</td><td>{numberBR(m.net, 3)}</td><td>{m.suggestion}</td></tr>) : <tr><td colSpan={7}>MRP não carregado para esta ordem nesta sessão.</td></tr>}</tbody></table>
          <div className="mt-4 text-[8pt]"><strong>Observações operacionais:</strong> {selectedOp?.observacoes || '—'}</div>
          <div className="op-print-signatures"><div>Planejamento / PCP</div><div>Produção / Operador</div><div>Qualidade / Liberação</div></div>
        </section>
      </div>
    </main>

    {showNewOpModal && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#061521]/70 p-3 backdrop-blur-[2px]" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowNewOpModal(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="new-op-title" className="my-auto max-h-[94vh] w-full max-w-[760px] overflow-y-auto rounded-[3px] border border-[#2E4A62] bg-[#F8FBFC] shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#2E4A62] bg-[#123B50] px-4 py-3 text-white"><div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#48B7C7]">PCP · programação fabril</div><h2 id="new-op-title" className="mt-1 text-[15px] font-black uppercase">Criar nova ordem de produção</h2><p className="mt-1 text-[10px] text-slate-300">Vincule a demanda comercial ou gere uma ordem de reposição.</p></div><button type="button" aria-label="Fechar modal" onClick={() => setShowNewOpModal(false)} className="rounded-[2px] p-1 text-slate-300 hover:bg-white/10 hover:text-white"><X size={18}/></button></header>
        <form onSubmit={e => { e.preventDefault(); void createNewOp() }} className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-1 rounded-[2px] border border-slate-200 bg-white p-1"><button type="button" onClick={() => { setNewOpType('PEDIDO'); setNewProdutoId(''); setNewQty('') }} className={'h-[30px] rounded-[2px] text-[10px] font-black uppercase ' + (newOpType === 'PEDIDO' ? 'bg-[#123B50] text-white' : 'text-slate-500 hover:bg-slate-50')}><ShoppingCart size={12} className="mr-1 inline"/> Pedido de venda</button><button type="button" onClick={() => { setNewOpType('ESTOQUE'); setNewPedidoId(''); setNewPedidoItemId('') }} className={'h-[30px] rounded-[2px] text-[10px] font-black uppercase ' + (newOpType === 'ESTOQUE' ? 'bg-[#123B50] text-white' : 'text-slate-500 hover:bg-slate-50')}><Package size={12} className="mr-1 inline"/> Reposição de estoque</button></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {newOpType === 'PEDIDO' && <>
              <label className={labelClass + ' md:col-span-6'}>Pedido de venda *<select required value={newPedidoId} onChange={e => { setNewPedidoId(e.target.value); setNewPedidoItemId(''); setNewProdutoId(''); setNewQty('') }} className={inputClass}><option value="">Selecione o pedido</option>{pedidos.filter(p => !['cancelado','cancelada','rejeitado','rejeitada'].includes(String(p.status).toLowerCase())).map(p => <option key={p.id} value={p.id}>PV-{p.codigo} — {p.nome} ({p.status})</option>)}</select></label>
              <label className={labelClass + ' md:col-span-6'}>Item específico do pedido *<select required disabled={!newPedidoId} value={newPedidoItemId} onChange={e => { const item = orderItems.find(x => x.id === e.target.value); setNewPedidoItemId(e.target.value); if (item) { setNewProdutoId(item.produto_id); const pending = pedidosPendentesProducao.find(x => x.itemId === item.id); setNewQty(String(pending ? pending.sugestaoProducao : item.quantidade)) } }} className={inputClass}><option value="">{newPedidoId ? 'Selecione o item' : 'Selecione primeiro o pedido'}</option>{orderItems.filter(item => item.pedido_id === newPedidoId).map(item => <option key={item.id} value={item.id}>{productMap.get(item.produto_id)?.codigo || 'PRODUTO'} — {productMap.get(item.produto_id)?.nome || item.descricao || 'Item'} · Qtd {numberBR(item.quantidade)}</option>)}</select></label>
            </>}
            {newOpType === 'ESTOQUE' && <label className={labelClass + ' md:col-span-12'}>Produto para reposição *<select required value={newProdutoId} onChange={e => { setNewProdutoId(e.target.value); setNewQty('') }} className={inputClass}><option value="">Selecione o produto</option>{products.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome} · estoque {numberBR(p.estoque_atual)}</option>)}</select></label>}
            <label className={labelClass + ' md:col-span-6'}>Máquina / equipamento<select value={newMachineId} onChange={e => setNewMachineId(e.target.value)} className={inputClass}><option value="">Definir depois</option>{machines.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></label>
            <label className={labelClass + ' md:col-span-3'}>Quantidade a produzir *<input required type="number" min="0.001" step="any" value={newQty} onChange={e => setNewQty(e.target.value)} className={inputClass} placeholder="0"/></label>
            <label className={labelClass + ' md:col-span-3'}>Velocidade (un/h)<input type="number" min="0.001" step="any" value={newRate} onChange={e => setNewRate(e.target.value)} className={inputClass} placeholder="Opcional"/></label>
            <label className={labelClass + ' md:col-span-4'}>Prioridade<select value={newPriority} onChange={e => setNewPriority(e.target.value)} className={inputClass}><option value="ALTA">Alta</option><option value="REGULAR">Regular</option><option value="BAIXA">Baixa</option></select></label>
            <label className={labelClass + ' md:col-span-4'}>Data prevista<input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className={inputClass}/></label>
            <label className={labelClass + ' md:col-span-4'}>Operação dupla<span className="flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-2.5 text-[10px] font-bold text-slate-700"><input type="checkbox" checked={newDoubleOp} onChange={e => setNewDoubleOp(e.target.checked)} className="accent-[#2D8DB8]"/> Dois ciclos sincronizados</span></label>
            <label className={labelClass + ' md:col-span-12'}>Observações operacionais<textarea rows={3} value={newNotes} onChange={e => setNewNotes(e.target.value)} className="w-full rounded-[2px] border border-slate-300 bg-white p-2 text-[10px] font-medium text-slate-800 outline-none focus:border-[#2D8DB8]" placeholder="Informações para planejamento e operação..."/></label>
          </div>
          {newOpType === 'PEDIDO' && newPedidoItemId && <div className="flex items-start gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] p-3 text-[10px] text-white"><ShieldCheck size={15} className="mt-0.5 shrink-0"/><div><strong>Demanda vinculada ao pedido.</strong><div className="mt-0.5">Quantidade sugerida: pedido menos estoque físico menos OPs já vinculadas. Confirme o saldo antes de criar a ordem.</div></div></div>}
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={() => setShowNewOpModal(false)} className={btnClass + ' border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}>Cancelar</button><button type="submit" disabled={saving || loading} className={btnClass + ' border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><Zap size={13}/>{saving ? 'Processando...' : 'Criar OP e calcular MRP'}</button></footer>
        </form>
      </section>
    </div>}
  </>
}
