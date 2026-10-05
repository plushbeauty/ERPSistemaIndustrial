import { useEffect, useMemo, useState } from 'react'
import { Printer, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'
import VendasLayout from './VendasLayout'

type Requisition = { id: string; codigo: string; ordem_producao_id: string | null; status: string }
type Item = { id: string; requisicao_id: string; produto_id: string; quantidade: number; fornecedor_id: string | null; status: string }
type Product = { id: string; codigo: string; nome: string; descricao: string | null; estoque_atual: number }
type Supplier = { id: string; codigo: string | null; razao_social: string; nome_fantasia: string | null }
type ProductionOrder = { id: string; numero_op: string | null; numero: string | null }

const PAGE_SIZE = 25

export default function ComprasRequisicoes() {
  const [companyId, setCompanyId] = useState('')
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productionOrders, setProductionOrders] = useState<LookupRecord[]>([])
  const [selectedOrder, setSelectedOrder] = useState('')
  const [selectedRequisitions, setSelectedRequisitions] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(company.data)
      const [requestRows, itemRows, productRows, supplierRows, orderRows] = await Promise.all([
        fetchAllPages<Requisition>((from, to) => supabase.from('erp_requisicoes_compra')
          .select('id,codigo,ordem_producao_id,status', { count: 'exact' })
          .eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Item>((from, to) => supabase.from('erp_requisicoes_compra_itens')
          .select('id,requisicao_id,produto_id,quantidade,fornecedor_id,status', { count: 'exact' })
          .eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,descricao,estoque_atual', { count: 'exact' })
          .eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores')
          .select('id,codigo,razao_social,nome_fantasia', { count: 'exact' })
          .eq('empresa_id', id).eq('ativo', true).order('razao_social').range(from, to)),
        fetchAllPages<ProductionOrder>((from, to) => supabase.from('erp_ordens_producao')
          .select('id,numero_op,numero', { count: 'exact' })
          .eq('empresa_id', id).order('created_at', { ascending: false }).range(from, to)),
      ])
      setCompanyId(id)
      setRequisitions(requestRows)
      setItems(itemRows)
      setProducts(productRows)
      setSuppliers(supplierRows)
      setProductionOrders(orderRows.map(order => ({
        id: order.id,
        codigo: order.numero_op || order.numero || order.id.slice(0, 8),
        nome: 'Ordem de produção',
      })))
      const existingIds = new Set(requestRows.map(request => request.id))
      setSelectedRequisitions(current => new Set([...current].filter(requestId => existingIds.has(requestId))))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as requisições de compra.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const visibleItems = useMemo(() => items.filter(item => {
    const request = requisitions.find(entry => entry.id === item.requisicao_id)
    return !selectedOrder || request?.ordem_producao_id === selectedOrder
  }), [items, requisitions, selectedOrder])
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE))
  const pageItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(current => Math.min(current, pageCount)) }, [pageCount])

  const toggleRequisition = (id: string, checked: boolean) => {
    setSelectedRequisitions(current => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function forwardSelected() {
    const eligibleIds = [...selectedRequisitions].filter(id =>
      requisitions.some(request => request.id === id && request.status === 'AGUARDANDO_COTACAO'),
    )
    if (!eligibleIds.length) {
      setError('Selecione ao menos uma requisição aguardando cotação.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (!companyId) throw new Error('Empresa da sessão não identificada.')
      const result = await supabase.rpc('erp_compras_encaminhar_requisicoes', { p_requisicao_ids: eligibleIds })
      if (result.error) throw result.error
      if (typeof result.data !== 'number' || result.data !== eligibleIds.length) {
        throw new Error('O banco não confirmou o encaminhamento integral das requisições selecionadas.')
      }
      setMessage(`${result.data} requisição(ões) encaminhada(s) para cotação.`)
      setSelectedRequisitions(new Set())
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível encaminhar as requisições.')
    } finally {
      setBusy(false)
    }
  }

  const requestById = useMemo(() => new Map(requisitions.map(request => [request.id, request])), [requisitions])
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const supplierById = useMemo(() => new Map(suppliers.map(supplier => [supplier.id, supplier])), [suppliers])
  const opById = useMemo(() => new Map(productionOrders.map(order => [order.id, order])), [productionOrders])

  return (
    <VendasLayout title="Requisições de compra" subtitle="PCP • MRP • materiais • cotação" onRefresh={() => void load()}>
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900">
      <header className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-bold text-sky-700">COMPRAS &gt; REQUISIÇÕES MRP</p>
          <h1 className="text-xl font-bold text-slate-950">Gestão de Compras e Suprimentos Industriais</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void forwardSelected()} disabled={busy || selectedRequisitions.size === 0} className="min-h-11 rounded-md bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">
            <ShoppingCart className="mr-2 inline" size={17}/>ENCAMINHAR SELECIONADAS
          </button>
          <button type="button" onClick={() => void load()} disabled={busy} className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-3 font-bold disabled:opacity-50">Atualizar</button>
          <button type="button" onClick={() => window.print()} className="min-h-11 rounded-md bg-slate-700 px-4 py-3 font-bold text-white"><Printer className="mr-2 inline" size={17}/>RELATÓRIO</button>
        </div>
      </header>

      {(error || message) && <div role={error ? 'alert' : 'status'} className={`mx-auto mt-4 max-w-[1800px] rounded-md border p-4 font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{error || message}</div>}

      <section className="mx-auto mt-5 max-w-[1800px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="max-w-xl">
          <EntityCodeLookup label="FILTRAR PENDÊNCIAS POR OP" value={selectedOrder} records={productionOrders} onChange={value => { setSelectedOrder(value); setPage(1) }} onSelect={record => { setSelectedOrder(record.id); setPage(1) }}/>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-sm">
            <thead className="bg-slate-900 text-left text-white"><tr>
              <th className="h-12 px-4"><span className="sr-only">Selecionar</span></th>
              <th className="px-4">Requisição</th><th className="px-4">Ordem</th><th className="px-4">Insumo</th><th className="px-4">Quantidade</th><th className="px-4">Fornecedor indicado</th><th className="px-4">Status</th>
            </tr></thead>
            <tbody>
              {pageItems.map(item => {
                const request = requestById.get(item.requisicao_id)
                const product = productById.get(item.produto_id)
                const supplier = item.fornecedor_id ? supplierById.get(item.fornecedor_id) : undefined
                const canForward = request?.status === 'AGUARDANDO_COTACAO'
                return <tr key={item.id} className="h-14 border-b border-slate-200 even:bg-slate-50">
                  <td className="px-4"><input aria-label={`Selecionar requisição ${request?.codigo || request?.id}`} type="checkbox" checked={selectedRequisitions.has(item.requisicao_id)} disabled={!canForward || busy} onChange={event => toggleRequisition(item.requisicao_id, event.target.checked)} className="h-5 w-5 accent-sky-700"/></td>
                  <td className="px-4 font-bold">{request?.codigo || request?.id || 'Requisição indisponível'}</td>
                  <td className="px-4">{request?.ordem_producao_id ? opById.get(request.ordem_producao_id)?.codigo || 'OP não localizada nesta empresa' : 'Sem vínculo'}</td>
                  <td className="px-4 font-bold">{product ? `${product.codigo} — ${product.nome}` : `Produto ${item.produto_id}`}</td>
                  <td className="px-4 tabular-nums">{Number(item.quantidade).toLocaleString('pt-BR')}</td>
                  <td className="px-4">{supplier?.nome_fantasia || supplier?.razao_social || 'Não indicado'}</td>
                  <td className="px-4"><span className="rounded-full bg-slate-100 px-3 py-1 font-bold">{item.status}</span></td>
                </tr>
              })}
              {!busy && !pageItems.length && <tr><td colSpan={7} className="p-10 text-center font-bold text-slate-600">Nenhuma requisição encontrada para o filtro.</td></tr>}
            </tbody>
          </table>
        </div>
        {visibleItems.length > PAGE_SIZE && <nav aria-label="Paginação das requisições de compra" className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
          <span aria-live="polite">Exibindo {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visibleItems.length)} de {visibleItems.length}</span>
          <div className="flex gap-2"><button type="button" className="min-h-10 rounded border px-3 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Anterior</button><span className="self-center">Página {page} de {pageCount}</span><button type="button" className="min-h-10 rounded border px-3 disabled:opacity-50" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>Próxima</button></div>
        </nav>}
        {busy && <p role="status" className="mt-3 text-sm text-slate-600">Carregando ou atualizando requisições…</p>}
      </section>
    </main>
    </VendasLayout>
  )
}
