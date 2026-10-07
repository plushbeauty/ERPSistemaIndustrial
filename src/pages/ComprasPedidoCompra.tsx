import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Supplier = { id: string; razao_social: string }
type Product = { id: string; codigo: string; nome: string; unidade_compra: string }
type Item = { produto_id: string; codigo: string; descricao: string; quantidade: string; valor_unitario: string; unidade: string }

export default function ComprasPedidoCompra() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplier, setSupplier] = useState('')
  const [delivery, setDelivery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
        const companyId = String(company.data)
        const [supplierRows, productRows] = await Promise.all([
          fetchAllPages<Supplier>((from, to) => supabase.from('erp_fornecedores')
            .select('id,razao_social', { count: 'exact' })
            .eq('empresa_id', companyId).eq('ativo', true).order('razao_social').range(from, to)),
          fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
            .select('id,codigo,nome,unidade_compra', { count: 'exact' })
            .eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        ])
        if (active) {
          setSuppliers(supplierRows)
          setProducts(productRows)
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar fornecedores e produtos.')
      }
    })()
    return () => { active = false }
  }, [])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade) * Number(item.valor_unitario), 0),
    [items],
  )

  const addItem = () => {
    const selectedProduct = products.find((entry) => entry.id === product)
    const quantity = Number(qty)
    const unitPrice = Number(price)
    if (!selectedProduct || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('Selecione um produto e informe quantidade e preço válidos.')
      return
    }
    setError('')
    setItems((current) => [...current, {
      produto_id: selectedProduct.id,
      codigo: selectedProduct.codigo,
      descricao: selectedProduct.nome,
      quantidade: qty,
      valor_unitario: price,
      unidade: selectedProduct.unidade_compra || 'UN',
    }])
    setProduct('')
    setQty('1')
    setPrice('0')
  }

  const save = async () => {
    if (!supplier || !items.length) {
      setError('Fornecedor e ao menos um item são obrigatórios.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) throw new Error('Sessão não localizada.')
      const profile = await supabase.from('erp_usuarios')
        .select('nome,empresa_id,ativo,deleted_at')
        .eq('auth_user_id', auth.data.user.id)
        .maybeSingle()
      if (profile.error) throw profile.error
      const currentProfile = profile.data
      if (!currentProfile?.ativo || currentProfile.deleted_at || !currentProfile.empresa_id) {
        throw new Error('Perfil ERP ativo não localizado.')
      }
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data || currentProfile.empresa_id !== company.data) {
        throw company.error ?? new Error('Empresa da sessão inconsistente.')
      }

      const result = await supabase.rpc('erp_compras_salvar_pedido', {
        p_pedido_id: null,
        p_fornecedor_id: supplier,
        p_comprador_nome: currentProfile.nome,
        p_condicao_pagamento: condition || null,
        p_prazo_entrega: delivery || null,
        p_observacoes: notes || null,
        p_status: 'PENDENTE_APROVACAO',
        p_itens: items.map((item) => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.valor_unitario),
          unidade: item.unidade || 'UN',
        })),
      })
      if (result.error) throw result.error
      const created = result.data?.[0]
      if (!created) throw new Error('O banco não retornou o pedido criado.')
      setMessage(`Pedido de compra #${created.numero} criado para aprovação.`)
      setItems([])
      setNotes('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o pedido de compra.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="min-h-screen bg-[#F4F7FE] text-slate-900">
    <header className="border-b bg-white">
      <div className="flex min-h-[70px] items-center justify-between px-5 lg:px-8">
        <div><p className="text-[10px] uppercase tracking-[.16em] text-[#2D8DB8]">Compras • Suprimentos</p><h1 className="text-[13px] font-medium text-[#123B50]">Pedido de Compra</h1></div>
        <button type="button" onClick={() => location.assign('/compras')} className="flex items-center gap-2 rounded border px-3 py-2 text-xs"><ArrowLeft size={15}/>Voltar</button>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px] p-5 lg:p-8">
      {(error || message) && <div role={error ? 'alert' : 'status'} className={`mb-4 rounded border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
      <section className="rounded-[2px] border bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs md:col-span-2">Fornecedor
            <select required value={supplier} onChange={(event) => setSupplier(event.target.value)} className="mt-1 h-10 w-full rounded border px-3">
              <option value="">Selecionar fornecedor</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.razao_social}</option>)}
            </select>
          </label>
          <label className="text-xs">Prazo de entrega<input type="date" value={delivery} onChange={(event) => setDelivery(event.target.value)} className="mt-1 h-10 w-full rounded border px-3"/></label>
          <label className="text-xs md:col-span-2">Condição de pagamento<input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Ex.: 30 dias" className="mt-1 h-10 w-full rounded border px-3"/></label>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-[1fr_110px_140px_100px]">
          <label className="sr-only" htmlFor="purchase-product">Produto ou matéria-prima</label>
          <select id="purchase-product" value={product} onChange={(event) => { setProduct(event.target.value); setPrice('0') }} className="h-10 rounded border px-3">
            <option value="">Produto / matéria-prima</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.codigo} — {entry.nome}</option>)}
          </select>
          <label className="sr-only" htmlFor="purchase-quantity">Quantidade</label><input id="purchase-quantity" type="number" min="0.0001" step="0.001" value={qty} onChange={(event) => setQty(event.target.value)} className="h-10 rounded border px-3"/>
          <label className="sr-only" htmlFor="purchase-price">Preço unitário</label><input id="purchase-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="h-10 rounded border px-3"/>
          <button type="button" onClick={addItem} className="flex items-center justify-center gap-1 rounded bg-[#123B50] text-xs text-white"><Plus size={15}/>Adicionar</button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">Itens do pedido de compra</caption>
            <thead><tr className="bg-slate-100 text-left"><th className="p-3">Código</th><th className="p-3">Descrição</th><th className="p-3">Qtd.</th><th className="p-3">Preço Un.</th><th className="p-3">Total</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{items.map((item, index) => <tr key={`${item.produto_id}-${index}`} className="border-b">
              <td className="p-3">{item.codigo}</td><td className="p-3">{item.descricao}</td><td className="p-3">{item.quantidade} {item.unidade}</td>
              <td className="p-3">{Number(item.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="p-3">{(Number(item.quantidade) * Number(item.valor_unitario)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="p-3"><button type="button" aria-label={`Remover ${item.descricao}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15}/></button></td>
            </tr>)}
            {!items.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Adicione itens ao pedido.</td></tr>}</tbody>
          </table>
        </div>
        <label className="mt-4 block text-xs font-semibold">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações ou instruções de recebimento" className="mt-1 min-h-24 w-full rounded border p-3 text-sm"/></label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <strong className="text-[13px] text-[#123B50]">TOTAL: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          <button type="button" disabled={busy} onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded bg-[#2D8DB8] px-5 text-sm text-white disabled:opacity-50"><Save size={16}/>{busy ? 'Salvando…' : 'Enviar para aprovação'}</button>
        </div>
      </section>
    </main>
  </div>
}
