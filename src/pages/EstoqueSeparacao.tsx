import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Printer, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup, { type LookupRecord } from '../components/industrial/EntityCodeLookup'

type LookupRow = LookupRecord & {
  unidade?: string | null
  produtoId?: string
  pedidoId?: string | null
}

type SeparationRecord = {
  id: string
  ordem_producao_id: string
  produto_id: string
  lote_id: string | null
  quantidade: number
  status: string
  codigo_barras: string
  created_at: string
}

type SeparationCard = {
  id: string
  op: string
  finalProduct: string
  finalProductName: string
  material: string
  materialName: string
  lot: string
  supplierLot: string
  quantity: number
  unit: string
  code: string
  createdAt: string
}

type OrderRow = {
  id: string
  numero_op: string | number | null
  produto_id: string
  pedido_venda_id: string | null
  quantidade: number | null
}

type ProductRow = {
  id: string
  codigo: string | null
  nome: string | null
  unidade_medida: string | null
  estoque_atual: number | null
}

type LotRow = {
  id: string
  lote_interno: string
  lote_fornecedor: string | null
  produto_id: string
  quantidade_disponivel: number | null
}

const PAGE_SIZE = 25

export default function EstoqueSeparacao() {
  const [orders, setOrders] = useState<LookupRow[]>([])
  const [products, setProducts] = useState<LookupRow[]>([])
  const [lots, setLots] = useState<LookupRow[]>([])
  const [separations, setSeparations] = useState<SeparationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [orderId, setOrderId] = useState('')
  const [productId, setProductId] = useState('')
  const [lotId, setLotId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [card, setCard] = useState<SeparationCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedLot = useMemo(() => lots.find(row => row.id === lotId), [lots, lotId])

  const loadPage = useCallback(async (companyId: string, pageToLoad: number) => {
    const from = pageToLoad * PAGE_SIZE
    const { data, error: queryError, count } = await supabase
      .from('erp_estoque_separacoes')
      .select('id,ordem_producao_id,produto_id,lote_id,quantidade,status,codigo_barras,created_at', { count: 'exact' })
      .eq('empresa_id', companyId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (queryError) throw queryError
    setSeparations((data ?? []) as SeparationRecord[])
    setTotal(count ?? 0)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (!company.data) throw new Error('Empresa da sessão não identificada.')
      const companyId = String(company.data)
      const [orderRows, productRows, lotRows] = await Promise.all([
        fetchAllPages<OrderRow>((from, to) => supabase
          .from('erp_ordens_producao')
          .select('id,numero_op,produto_id,pedido_venda_id,quantidade', { count: 'exact' })
          .eq('empresa_id', companyId)
          .order('created_at', { ascending: false })
          .range(from, to)),
        fetchAllPages<ProductRow>((from, to) => supabase
          .from('erp_produtos')
          .select('id,codigo,nome,unidade_medida,estoque_atual', { count: 'exact' })
          .eq('empresa_id', companyId)
          .eq('ativo', true)
          .order('codigo')
          .range(from, to)),
        fetchAllPages<LotRow>((from, to) => supabase
          .from('erp_estoque_lotes')
          .select('id,lote_interno,lote_fornecedor,produto_id,quantidade_disponivel', { count: 'exact' })
          .eq('empresa_id', companyId)
          .order('created_at', { ascending: false })
          .range(from, to)),
      ])
      const productById = new Map(productRows.map(product => [product.id, product]))
      setOrders(orderRows.map(order => ({
        id: order.id,
        codigo: String(order.numero_op ?? order.id),
        nome: productById.get(order.produto_id)?.nome ?? 'Produto da OP',
        estoque_atual: order.quantidade,
        produtoId: order.produto_id,
        pedidoId: order.pedido_venda_id,
      })))
      setProducts(productRows.map(product => ({
        id: product.id,
        codigo: product.codigo,
        nome: product.nome,
        unidade: product.unidade_medida,
        estoque_atual: product.estoque_atual,
      })))
      setLots(lotRows.map(lot => ({
        id: lot.id,
        codigo: lot.lote_interno,
        nome: lot.lote_fornecedor,
        estoque_atual: lot.quantidade_disponivel,
        produtoId: lot.produto_id,
      })))
      await loadPage(companyId, page)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da separação.')
    } finally {
      setLoading(false)
    }
  }, [loadPage, page])

  useEffect(() => {
    void load()
  }, [load])

  async function separate() {
    const amount = Number(quantity)
    if (!orderId || !productId || !Number.isFinite(amount) || amount <= 0) {
      setError('Selecione uma OP, um material e informe uma quantidade positiva.')
      return
    }
    if (selectedLot && selectedLot.produtoId !== productId) {
      setError('O lote selecionado pertence a outro material.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_estoque_separar_material', {
        p_ordem_id: orderId,
        p_produto_id: productId,
        p_lote_id: lotId || null,
        p_quantidade: amount,
      })
      if (rpcError) throw rpcError
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('O banco não retornou o cartão de rastreabilidade criado.')
      }

      const result = data as Record<string, unknown>
      const newCard: SeparationCard = {
        id: String(result.id ?? ''),
        op: String(result.op ?? ''),
        finalProduct: String(result.final_product ?? ''),
        finalProductName: String(result.final_product_name ?? ''),
        material: String(result.material ?? ''),
        materialName: String(result.material_name ?? ''),
        lot: String(result.lot ?? ''),
        supplierLot: String(result.supplier_lot ?? ''),
        quantity: Number(result.quantity),
        unit: String(result.unit ?? ''),
        code: String(result.code ?? ''),
        createdAt: String(result.created_at ?? ''),
      }
      if (!newCard.id || !newCard.code || !Number.isFinite(newCard.quantity)) {
        throw new Error('O banco retornou dados incompletos para o cartão de rastreabilidade.')
      }
      setCard(newCard)
      setMessage('Separação e cartão registrados. Esta gravação não altera nem reserva saldo de estoque.')
      setQuantity('')
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error) throw company.error
      if (company.data) await loadPage(String(company.data), page)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a separação.')
    } finally {
      setSaving(false)
    }
  }

  function restoreCard(record: SeparationRecord) {
    const order = orders.find(item => item.id === record.ordem_producao_id)
    const material = products.find(item => item.id === record.produto_id)
    const finalProduct = order?.produtoId ? products.find(item => item.id === order.produtoId) : undefined
    const lot = record.lote_id ? lots.find(item => item.id === record.lote_id) : undefined
    setCard({
      id: record.id,
      op: order?.codigo ?? record.ordem_producao_id,
      finalProduct: finalProduct?.codigo ?? '—',
      finalProductName: finalProduct?.nome ?? '—',
      material: material?.codigo ?? '—',
      materialName: material?.nome ?? '—',
      lot: lot?.codigo ?? 'Sem lote informado',
      supplierLot: lot?.nome ?? '',
      quantity: Number(record.quantidade),
      unit: material?.unidade ?? '',
      code: record.codigo_barras,
      createdAt: record.created_at,
    })
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6">
      <header className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <p className="text-sm font-bold text-sky-700">ESTOQUE &gt; SEPARAÇÃO</p>
          <h1 className="text-xl font-bold text-slate-950">Separação de material e rastreabilidade</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!card}
          className="rounded-md bg-slate-800 px-5 py-3 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="mr-2 inline" size={18} aria-hidden="true" />
          IMPRIMIR CARTÃO
        </button>
      </header>

      <section className="mx-auto mt-5 max-w-[1700px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 print:hidden">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EntityCodeLookup
            label="Ordem de produção"
            value={orderId}
            records={orders}
            onChange={setOrderId}
            onSelect={record => {
              setOrderId(record.id)
              setLotId('')
            }}
            required
          />
          <EntityCodeLookup
            label="Matéria-prima / insumo"
            value={productId}
            records={products}
            onChange={value => {
              setProductId(value)
              setLotId('')
            }}
            onSelect={record => setProductId(record.id)}
            required
          />
          <EntityCodeLookup
            label="Lote físico (opcional)"
            value={lotId}
            records={lots.filter(item => item.produtoId === productId)}
            onChange={setLotId}
            onSelect={record => setLotId(record.id)}
            helper="Selecione um lote do material escolhido para registrar a rastreabilidade."
          />
          <label className="text-sm font-bold text-slate-800">
            Quantidade
            <input
              className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900"
              type="number"
              min="0.001"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={event => setQuantity(event.target.value)}
              required
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void separate()}
          disabled={loading || saving}
          className="mt-5 rounded-md bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ScanLine className="mr-2 inline" size={18} aria-hidden="true" />
          {saving ? 'REGISTRANDO…' : 'REGISTRAR SEPARAÇÃO'}
        </button>
        {loading && <p className="mt-4 text-sm text-slate-600">Carregando cadastros do tenant…</p>}
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            {error}
          </p>
        )}
        {message && <p role="status" className="mt-4 rounded-md bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
      </section>

      <section className="mx-auto mt-6 max-w-[1700px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">Separações registradas</h2>
          <span className="text-sm text-slate-600">{total} registro(s)</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-700">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">OP</th>
                <th className="px-3 py-3">Material</th>
                <th className="px-3 py-3">Lote</th>
                <th className="px-3 py-3">Quantidade</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {separations.map((record, index) => {
                const order = orders.find(item => item.id === record.ordem_producao_id)
                const material = products.find(item => item.id === record.produto_id)
                const lot = record.lote_id ? lots.find(item => item.id === record.lote_id) : undefined
                return (
                  <tr key={record.id} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-3 py-3">{new Date(record.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3 font-semibold">{order?.codigo ?? record.ordem_producao_id}</td>
                    <td className="px-3 py-3">{material?.codigo ?? record.produto_id} — {material?.nome ?? 'Material'}</td>
                    <td className="px-3 py-3">{lot?.codigo ?? '—'}</td>
                    <td className="px-3 py-3">{record.quantidade} {material?.unidade ?? ''}</td>
                    <td className="px-3 py-3 font-mono">{record.codigo_barras}</td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => restoreCard(record)} className="font-semibold text-blue-700 underline hover:text-blue-900">
                        Abrir cartão
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!loading && separations.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma separação registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setPage(value => Math.max(0, value - 1))}
            disabled={page === 0 || loading}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50"
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Anterior
          </button>
          <span className="text-sm text-slate-600">Página {page + 1} de {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))}
            disabled={page >= pageCount - 1 || loading}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50"
            aria-label="Próxima página"
          >
            Próxima <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {card && (
        <section className="mx-auto mt-8 max-w-[1000px] border-4 border-black bg-white p-0 print:mt-0 print:max-w-none">
          <div className="border-b-4 border-black p-5 text-center text-xl font-black">
            SYNQRA — CARTÃO DE RASTREABILIDADE E MOVIMENTAÇÃO DE MATERIAL
          </div>
          <div className="grid grid-cols-1 border-b-4 border-black sm:grid-cols-2">
            <div className="border-b-2 border-black p-4 font-bold sm:border-b-0 sm:border-r-2">Nº DA OP: {card.op}</div>
            <div className="p-4 font-bold">PRODUTO DA OP: {card.finalProduct} — {card.finalProductName}</div>
          </div>
          <div className="border-b-4 border-black p-4 font-bold">MATÉRIA-PRIMA / INSUMO: {card.material} — {card.materialName}</div>
          <div className="grid grid-cols-1 border-b-4 border-black sm:grid-cols-2">
            <div className="border-b-2 border-black p-4 font-bold sm:border-b-0 sm:border-r-2">LOTE INTERNO: {card.lot || 'Não informado'}</div>
            <div className="p-4 font-bold">LOTE DO FORNECEDOR: {card.supplierLot || 'Não informado'}</div>
          </div>
          <div className="border-b-4 border-black p-4 font-bold">QUANTIDADE SEPARADA: {card.quantity} {card.unit}</div>
          <div className="p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Código interno persistido</p>
            <p className="mt-2 break-all font-mono text-2xl font-black tracking-wider">{card.code}</p>
            <p className="mt-2 text-sm">Registro: {new Date(card.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div className="border-t-2 border-black p-3 text-center text-xs font-bold">
            Cartão de rastreabilidade — o código textual não é um código de barras óptico.
          </div>
        </section>
      )}

      <style>{'@media print{body{margin:0}@page{size:A4;margin:10mm}body *{visibility:hidden}main,main *{visibility:visible}main{position:absolute;left:0;top:0;width:100%;min-height:0;padding:0}.print\\\\:hidden{display:none!important}}'}</style>
    </main>
  )
}
