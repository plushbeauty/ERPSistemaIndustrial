import { useEffect, useMemo, useState } from 'react'
import { Printer, RefreshCw, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import VendasLayout from './VendasLayout'

interface Requisition {
  id: string
  codigo: string
  ordem_producao_id: string | null
  status: string
  centro_custo: string | null
  nivel_urgencia: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  created_at: string
}

interface RequisitionItem {
  id: string
  empresa_id: string
  requisicao_id: string
  produto_id: string
  quantidade: number
  fornecedor_id: string | null
  status: string
  created_at: string
}

interface Product {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  estoque_atual: number
}

interface Supplier {
  id: string
  codigo: string | null
  razao_social: string
  nome_fantasia: string | null
}

interface ProductionOrder {
  id: string
  numero_op: string | null
  numero: string | null
}

const PAGE_SIZE = 25
const panelClass = 'rounded-[3px] border border-[#D8E4EA] bg-white shadow-[0_2px_8px_rgba(18,59,80,0.04)]'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] border px-3 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const primaryButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#25789d] disabled:cursor-not-allowed disabled:opacity-50'
const fieldLabelClass = 'mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#496574]'

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatQuantity(value: number): string {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

export default function ComprasRequisicoes() {
  const [companyId, setCompanyId] = useState('')
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [items, setItems] = useState<RequisitionItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productionOrders, setProductionOrders] = useState<LookupRecord[]>([])
  const [selectedOrder, setSelectedOrder] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('TODAS')
  const [selectedRequisitions, setSelectedRequisitions] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa da sessão não identificada.')
      }
      const id = String(company.data)
      const [requestRows, itemRows, productRows, supplierRows, orderRows] = await Promise.all([
        fetchAllPages<Requisition>((from, to) => supabase
          .from('erp_requisicoes_compra')
          .select('id,codigo,ordem_producao_id,status,centro_custo,nivel_urgencia,created_at', { count: 'exact' })
          .eq('empresa_id', id)
          .order('created_at', { ascending: false })
          .range(from, to)),
        fetchAllPages<RequisitionItem>((from, to) => supabase
          .from('erp_requisicoes_compra_itens')
          .select('id,empresa_id,requisicao_id,produto_id,quantidade,fornecedor_id,status,created_at', { count: 'exact' })
          .eq('empresa_id', id)
          .order('created_at', { ascending: false })
          .range(from, to)),
        fetchAllPages<Product>((from, to) => supabase
          .from('erp_produtos')
          .select('id,codigo,nome,descricao,estoque_atual', { count: 'exact' })
          .eq('empresa_id', id)
          .eq('ativo', true)
          .order('codigo')
          .range(from, to)),
        fetchAllPages<Supplier>((from, to) => supabase
          .from('erp_fornecedores')
          .select('id,codigo,razao_social,nome_fantasia', { count: 'exact' })
          .eq('empresa_id', id)
          .eq('ativo', true)
          .order('razao_social')
          .range(from, to)),
        fetchAllPages<ProductionOrder>((from, to) => supabase
          .from('erp_ordens_producao')
          .select('id,numero_op,numero', { count: 'exact' })
          .eq('empresa_id', id)
          .order('created_at', { ascending: false })
          .range(from, to)),
      ])

      setCompanyId(id)
      setRequisitions(requestRows)
      setItems(itemRows)
      setProducts(productRows)
      setSuppliers(supplierRows)
      setProductionOrders(orderRows.map((order) => ({
        id: order.id,
        codigo: order.numero_op || order.numero || order.id.slice(0, 8),
        nome: 'Ordem de produção',
      })))
      const existingIds = new Set(requestRows.map((request) => request.id))
      setSelectedRequisitions((current) => new Set([...current].filter((requestId) => existingIds.has(requestId))))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as requisições de compra.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const requestById = useMemo(
    () => new Map(requisitions.map((request) => [request.id, request])),
    [requisitions],
  )
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  )
  const opById = useMemo(
    () => new Map(productionOrders.map((order) => [order.id, order])),
    [productionOrders],
  )
  const visibleItems = useMemo(() => items.filter((item) => {
    const request = requestById.get(item.requisicao_id)
    const orderMatches = !selectedOrder || request?.ordem_producao_id === selectedOrder
    const urgencyMatches = selectedUrgency === 'TODAS' || request?.nivel_urgencia === selectedUrgency
    return orderMatches && urgencyMatches
  }), [items, requestById, selectedOrder, selectedUrgency])
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE))
  const pageItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedEligibleCount = [...selectedRequisitions].filter((id) =>
    requisitions.some((request) => request.id === id && request.status === 'AGUARDANDO_COTACAO'),
  ).length

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  function toggleRequisition(id: string, checked: boolean): void {
    setSelectedRequisitions((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function forwardSelected(): Promise<void> {
    const eligibleIds = [...selectedRequisitions].filter((id) =>
      requisitions.some((request) => request.id === id && request.status === 'AGUARDANDO_COTACAO'),
    )
    if (!eligibleIds.length) {
      setError('Selecione ao menos uma requisição aguardando cotação.')
      setMessage('')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.rpc('erp_compras_encaminhar_requisicoes', {
        p_requisicao_ids: eligibleIds,
      })
      if (result.error) throw result.error
      if (typeof result.data !== 'number' || result.data !== eligibleIds.length) {
        throw new Error('O banco não confirmou o encaminhamento integral das requisições selecionadas.')
      }
      setMessage(`${result.data} requisição(ões) encaminhada(s) para cotação.`)
      setSelectedRequisitions(new Set())
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível encaminhar as requisições.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendasLayout
      title="Requisições de compra"
      subtitle="Compras • Necessidades do PCP/MRP para cotação"
      onRefresh={() => void load()}
      titleActions={
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass} onClick={() => void load()} disabled={busy}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button type="button" className={buttonClass} onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => void forwardSelected()} disabled={busy || selectedEligibleCount === 0}>
            <ShoppingCart size={14} /> Encaminhar p/ cotação{selectedEligibleCount ? ` (${selectedEligibleCount})` : ''}
          </button>
        </div>
      }
    >
      <main className="mx-auto w-full max-w-[1440px] space-y-3 p-3">
          {(error || message) && (
            <div role={error ? 'alert' : 'status'} className={`rounded-[2px] border-l-4 px-3 py-2 text-xs font-semibold ${error ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-emerald-600 bg-emerald-50 text-emerald-800'}`}>
              {error || message}
            </div>
          )}

          <section className={`${panelClass} mt-3 p-3 sm:p-4`} aria-label="Filtros das requisições">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs">
                <label className={fieldLabelClass}>Filtrar pendências por ordem de produção</label>
                <EntityCodeLookup
                  label="Selecionar ordem de produção"
                  value={selectedOrder}
                  records={productionOrders}
                  onChange={(value) => { setSelectedOrder(value); setPage(1) }}
                  onSelect={(record) => { setSelectedOrder(record.id); setPage(1) }}
                />
              </div>
              <div className="w-full max-w-[190px]">
                <label className={fieldLabelClass} htmlFor="compras-urgencia-filter">Nível de urgência</label>
                <select id="compras-urgencia-filter" value={selectedUrgency} onChange={(event) => { setSelectedUrgency(event.target.value); setPage(1) }} className="h-8 w-full rounded-[3px] border border-[#D8E4EA] bg-white px-2 text-[11px] text-[#183746] focus:border-[#2D8DB8] focus:outline-none focus:ring-1 focus:ring-[#2D8DB8]">
                  <option value="TODAS">Todas as urgências</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                </select>
              </div>
              <div className="flex h-8 items-center rounded-[3px] border border-[#D8E4EA] bg-[#F7FAFB] px-3 text-[10px] text-[#496574]">
                <span className="font-bold">{visibleItems.length}</span><span className="ml-1">item(ns) encontrado(s)</span>
              </div>
              {selectedOrder && <button type="button" className={`${buttonClass} border-[#D8E4EA] bg-white text-[#365766] hover:bg-[#F4F7F9]`} onClick={() => { setSelectedOrder(''); setPage(1) }}>Limpar filtro</button>}
            </div>
          </section>

          <section className={`${panelClass} mt-3 overflow-hidden`} aria-label="Itens das requisições de compra">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E4EA] bg-white px-3 py-2.5">
              <div>
                <h2 className="text-xs font-bold text-[#123B50]">Itens requisitados</h2>
                <p className="mt-0.5 text-[10px] text-[#617986]">Selecione requisições aguardando cotação para encaminhar pelo fluxo autorizado.</p>
              </div>
              <span className="rounded-[3px] border border-[#D8E4EA] bg-[#F4F7F9] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#496574]">Página {page} / {pageCount}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead className="bg-[#EAF1F5] text-[9px] uppercase tracking-[0.07em] text-[#365766]">
                  <tr className="h-8 border-b border-[#D8E4EA]">
                    <th className="w-9 px-3"><span className="sr-only">Selecionar</span></th>
                    <th className="px-3">Requisição</th><th className="px-3">Data</th><th className="px-3">Centro de custo</th><th className="px-3">Urgência</th><th className="px-3">Ordem de produção</th><th className="px-3">Produto / insumo</th><th className="px-3 text-right">Quantidade</th><th className="px-3">Fornecedor indicado</th><th className="px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {pageItems.map((item) => {
                    const request = requestById.get(item.requisicao_id)
                    const product = productById.get(item.produto_id)
                    const supplier = item.fornecedor_id ? supplierById.get(item.fornecedor_id) : undefined
                    const canForward = request?.status === 'AGUARDANDO_COTACAO'
                    return (
                      <tr key={item.id} className="h-9 border-b border-[#E4EBEF] even:bg-[#F8FAFB] hover:bg-[#EFF7FA]">
                        <td className="px-3">
                          <input aria-label={`Selecionar requisição ${request?.codigo || request?.id || item.requisicao_id}`} type="checkbox" checked={selectedRequisitions.has(item.requisicao_id)} disabled={!canForward || busy} onChange={(event) => toggleRequisition(item.requisicao_id, event.currentTarget.checked)} className="h-4 w-4 accent-[#2D8DB8]" />
                        </td>
                        <td className="px-3 font-bold text-[#123B50]">{request?.codigo || request?.id || 'Requisição indisponível'}</td>
                        <td className="px-3 tabular-nums text-[#496574]">{request ? formatDate(request.created_at) : '—'}</td>
                        <td className="px-3">{request?.centro_custo || 'Não informado'}</td>
                        <td className="px-3"><span className={`inline-flex min-h-5 items-center rounded-[2px] border px-1.5 text-[9px] font-bold ${request?.nivel_urgencia === 'CRITICA' ? 'border-[#E9B8B8] bg-[#FFF3F2] text-[#9D3030]' : request?.nivel_urgencia === 'ALTA' ? 'border-[#F2D0B0] bg-[#FFF5EC] text-[#9A4C12]' : request?.nivel_urgencia === 'BAIXA' ? 'border-[#D8E4EA] bg-[#F4F7F9] text-[#496574]' : 'border-[#E8D5A9] bg-[#FFF8E8] text-[#8A5B13]'}`}>{request?.nivel_urgencia || 'MEDIA'}</span></td>
                        <td className="px-3">{request?.ordem_producao_id ? opById.get(request.ordem_producao_id)?.codigo || 'OP não localizada nesta empresa' : 'Sem vínculo'}</td>
                        <td className="px-3"><span className="font-semibold text-[#183746]">{product ? `${product.codigo} — ${product.nome}` : `Produto ${item.produto_id.slice(0, 8)}`}</span>{product?.descricao && <span className="ml-1 text-[10px] text-[#617986]">{product.descricao}</span>}</td>
                        <td className="px-3 text-right font-semibold tabular-nums">{formatQuantity(Number(item.quantidade))}</td>
                        <td className="px-3">{supplier?.nome_fantasia || supplier?.razao_social || 'Não indicado'}</td>
                        <td className="px-3"><span className={`inline-flex min-h-5 items-center rounded-[2px] border px-1.5 text-[9px] font-bold ${item.status === 'PEDIDO_ENVIADO' ? 'border-[#B8DCCB] bg-[#EFF9F3] text-[#226847]' : 'border-[#E8D5A9] bg-[#FFF8E8] text-[#8A5B13]'}`}>{item.status.replaceAll('_', ' ')}</span></td>
                      </tr>
                    )
                  })}
                  {!busy && !pageItems.length && <tr><td colSpan={10} className="p-8 text-center text-xs text-[#617986]">Nenhum item encontrado para o filtro selecionado.</td></tr>}
                  {busy && <tr><td colSpan={10} className="p-6 text-center text-xs text-[#617986]">Carregando dados da empresa autenticada…</td></tr>}
                </tbody>
              </table>
            </div>
            {visibleItems.length > PAGE_SIZE && (
              <nav aria-label="Paginação das requisições de compra" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D8E4EA] bg-white px-3 py-2 text-[10px]">
                <span aria-live="polite" className="text-[#496574]">Exibindo {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visibleItems.length)} de {visibleItems.length}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className={`${buttonClass} border-[#D8E4EA] bg-white text-[#365766] hover:bg-[#F4F7F9]`} disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
                  <span className="min-w-[76px] text-center font-semibold text-[#496574]">Página {page} de {pageCount}</span>
                  <button type="button" className={`${buttonClass} border-[#D8E4EA] bg-white text-[#365766] hover:bg-[#F4F7F9]`} disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Próxima</button>
                </div>
              </nav>
            )}
          </section>
        </main>
    </VendasLayout>
  )
}
