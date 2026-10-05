import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Supplier = { id: string; razao_social: string; email: string | null }
type Product = { id: string; codigo: string; nome: string; unidade: string }
type Item = {
  produto_id: string
  codigo: string
  descricao: string
  quantidade: string
  unidade: string
  data_necessidade: string
  observacoes: string
}

export default function ComprasRFQ() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [needDate, setNeedDate] = useState('')
  const [responseDate, setResponseDate] = useState('')
  const [paymentCondition, setPaymentCondition] = useState('')
  const [supplierQuery, setSupplierQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    void (async () => {
      setLoading(true)
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) {
          throw company.error ?? new Error('Empresa não identificada.')
        }
        const empresaId = String(company.data)
        const [supplierRows, productRows] = await Promise.all([
          fetchAllPages<Supplier>((from, to) => supabase
            .from('erp_fornecedores')
            .select('id,razao_social,email', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('razao_social')
            .range(from, to)),
          fetchAllPages<Product>((from, to) => supabase
            .from('erp_produtos')
            .select('id,codigo,nome,unidade', { count: 'exact' })
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .order('codigo')
            .range(from, to)),
        ])
        if (alive) {
          setSuppliers(supplierRows)
          setProducts(productRows)
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da cotação.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [])

  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase('pt-BR')
    return suppliers.filter(supplier => !query
      || `${supplier.razao_social} ${supplier.email ?? ''}`.toLocaleLowerCase('pt-BR').includes(query))
  }, [supplierQuery, suppliers])
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade), 0),
    [items],
  )
  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase('pt-BR')
    if (!query) return products.slice(0, 30)
    return products.filter(product => (product.codigo + ' ' + product.nome).toLocaleLowerCase('pt-BR').includes(query)).slice(0, 30)
  }, [productQuery, products])

  const addItem = () => {
    const product = products.find(candidate => candidate.id === productId)
    const parsedQuantity = Number(quantity)
    if (!product) {
      setError('Selecione um produto ou matéria-prima.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('A quantidade deve ser maior que zero.')
      return
    }
    setError('')
    setItems(current => [...current, {
      produto_id: product.id,
      codigo: product.codigo,
      descricao: product.nome,
      quantidade: String(parsedQuantity),
      unidade: product.unidade,
      data_necessidade: needDate,
      observacoes: '',
    }])
    setProductId('')
    setProductQuery('')
    setQuantity('1')
  }

  const save = async () => {
    if (!selectedSuppliers.length || !items.length) {
      setError('Selecione ao menos um fornecedor e um item.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    let empresaId: string | null = null
    let rfqId: string | null = null

    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa não identificada.')
      }
      empresaId = String(company.data)

      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) {
        throw auth.error ?? new Error('Sessão não localizada para registrar a cotação.')
      }
      const profile = await supabase
        .from('erp_usuarios')
        .select('id')
        .eq('auth_user_id', auth.data.user.id)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()
      if (profile.error || !profile.data) {
        throw profile.error ?? new Error('Perfil ERP ativo não localizado para registrar a cotação.')
      }

      const header = await supabase
        .from('erp_rfq')
        .insert({
          empresa_id: empresaId,
          status: 'ABERTA',
          data_necessidade: items.map(item => item.data_necessidade).filter(Boolean).sort()[0] || null,
          prazo_resposta: responseDate || null,
          condicao_pagamento: paymentCondition.trim() || null,
          observacoes: notes.trim() || null,
          created_by: profile.data.id,
        })
        .select('id,numero')
        .single()
      if (header.error || !header.data) {
        throw header.error ?? new Error('A cotação não foi retornada pelo banco.')
      }
      rfqId = header.data.id

      const supplierInsert = await supabase
        .from('erp_rfq_fornecedores')
        .insert(selectedSuppliers.map(fornecedorId => ({
          empresa_id: empresaId,
          rfq_id: rfqId,
          fornecedor_id: fornecedorId,
        })))
      if (supplierInsert.error) throw supplierInsert.error

      const itemInsert = await supabase
        .from('erp_rfq_itens')
        .insert(items.map(item => ({
          empresa_id: empresaId,
          rfq_id: rfqId,
          produto_id: item.produto_id,
          descricao: item.descricao,
          codigo: item.codigo,
          quantidade: Number(item.quantidade),
          unidade: item.unidade || 'UN',
          data_necessidade: item.data_necessidade || null,
          observacoes: item.observacoes || null,
        })))
      if (itemInsert.error) throw itemInsert.error

      setMessage(`RFQ #${header.data.numero} criada com ${selectedSuppliers.length} fornecedor(es) e ${totalQuantity} unidades.`)
      setItems([])
      setSelectedSuppliers([])
    } catch (cause) {
      if (rfqId && empresaId) {
        const rollback = await supabase
          .from('erp_rfq')
          .delete()
          .eq('id', rfqId)
          .eq('empresa_id', empresaId)
        if (rollback.error) {
          const original = cause instanceof Error ? cause.message : String(cause)
          setError(`${original} A exclusão da cotação incompleta também falhou: ${rollback.error.message}`)
          return
        }
      }
      setError(cause instanceof Error ? cause.message : 'Falha ao criar a cotação.')
    } finally {
      setBusy(false)
    }
  }

  return (\n    <VendasLayout title="Cotação de compras" subtitle="Fornecedores • materiais • prazo • condição de pagamento" onRefresh={() => void load()}>\n    <div className="min-h-screen bg-[#F4F7FE] text-slate-900">
      <header className="border-b bg-white">
        <div className="flex min-h-[70px] items-center justify-between gap-3 px-5 lg:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-[#2D8DB8]">Compras • Suprimentos</p>
            <h1 className="text-xl font-medium text-[#123B50]">Pedido de Cotação — RFQ</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/compras/solicitacao-manual')}
              className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <ArrowLeft size={15} /> Solicitações
            </button>
            <button
              type="button"
              onClick={() => navigate('/compras/pedido')}
              className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              Pedido de compra
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-4 lg:p-8">
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
        {message && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</div>}
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-lg border bg-white p-5 lg:col-span-1">
            <h2 className="font-medium text-[#123B50]">Fornecedores selecionados</h2>
            <label className="mt-3 flex items-center gap-2 rounded border px-3">
              <Search size={16} aria-hidden="true" />
              <input
                className="min-w-0 flex-1 border-0 px-0"
                value={supplierQuery}
                onChange={event => setSupplierQuery(event.target.value)}
                placeholder="Pesquisar fornecedores..."
                aria-label="Pesquisar fornecedores da cotação"
              />
            </label>
            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {loading ? <p role="status">Carregando fornecedores...</p> : visibleSuppliers.map(supplier => (
                <label key={supplier.id} className="flex gap-3 rounded border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(supplier.id)}
                    onChange={event => setSelectedSuppliers(current => event.target.checked
                      ? [...current, supplier.id]
                      : current.filter(id => id !== supplier.id))}
                  />
                  <span>
                    <strong>{supplier.razao_social}</strong>
                    <br />
                    <span className="text-xs text-slate-500">{supplier.email || 'Sem e-mail cadastrado'}</span>
                  </span>
                </label>
              ))}
              {!loading && !visibleSuppliers.length && <p>Nenhum fornecedor ativo corresponde à pesquisa.</p>}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-5 lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs">
                Prazo para resposta
                <input type="date" value={responseDate} onChange={event => setResponseDate(event.target.value)} className="mt-1 h-10 w-full rounded border p-2" />
              </label>
              <label className="text-xs md:col-span-2">
                Condição de pagamento
                <input value={paymentCondition} onChange={event => setPaymentCondition(event.target.value)} className="mt-1 h-10 w-full rounded border p-2" />
              </label>
              <label className="text-xs">
                Necessidade
                <input type="date" value={needDate} onChange={event => setNeedDate(event.target.value)} className="mt-1 h-10 w-full rounded border p-2" />
              </label>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_100px]">
              <div className="relative min-w-0">
                <input value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductId('') }} onKeyDown={event => { if (event.key === 'Enter' && visibleProducts[0]) { event.preventDefault(); setProductId(visibleProducts[0].id); setProductQuery(visibleProducts[0].codigo + ' — ' + visibleProducts[0].nome) } }} placeholder="Digite código ou descrição do produto..." className="h-10 w-full rounded border px-3" aria-label="Pesquisar produto por código ou descrição" />
                {productQuery && !productId && <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-auto rounded border bg-white shadow-lg">{visibleProducts.map(product => <button key={product.id} type="button" className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => { setProductId(product.id); setProductQuery(product.codigo + ' — ' + product.nome) }}><strong>{product.codigo}</strong> — {product.nome} <span className="text-slate-500">({product.unidade})</span></button>)}{!visibleProducts.length && <p className="px-3 py-3 text-xs text-slate-500">Nenhum produto ativo encontrado.</p>}</div>}
              </div>
              <input aria-label="Quantidade" type="number" min="0.0001" step="0.0001" value={quantity} onChange={event => setQuantity(event.target.value)} className="h-10 rounded border px-3" />
              <button type="button" onClick={addItem} className="flex min-h-10 items-center justify-center gap-1 rounded bg-[#123B50] text-xs text-white">
                <Plus size={15} /> Adicionar
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b bg-slate-100 text-left"><th className="p-3">Código</th><th className="p-3">Descrição</th><th className="p-3">Qtd.</th><th className="p-3">Necessidade</th><th className="p-3">Ações</th></tr></thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.produto_id}-${index}`} className="border-b">
                      <td className="p-3">{item.codigo}</td>
                      <td className="p-3">{item.descricao}</td>
                      <td className="p-3">{item.quantidade} {item.unidade}</td>
                      <td className="p-3">{item.data_necessidade || '—'}</td>
                      <td className="p-3">
                        <button type="button" aria-label={`Remover ${item.descricao}`} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && <tr><td className="p-4 text-center text-slate-500" colSpan={5}>Adicione ao menos um item à cotação.</td></tr>}
                </tbody>
              </table>
            </div>

            <label className="mt-4 block text-xs">
              Observações da cotação
              <textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded border p-3 text-sm" />
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-slate-600">{selectedSuppliers.length} fornecedor(es) · {totalQuantity} unidade(s)</span>
              <button type="button" disabled={busy || loading} onClick={() => void save()} className="flex min-h-11 items-center justify-center gap-2 rounded bg-[#2D8DB8] px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={16} /> {busy ? 'Salvando...' : 'Guardar RFQ'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
    </VendasLayout>
  )
}
