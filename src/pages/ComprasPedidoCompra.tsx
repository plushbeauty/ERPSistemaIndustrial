import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
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

  return <div className="min-h-screen bg-[#F4FBFD] text-[#123B50]">
    <ERPHeader />
    <main className="p-2 space-y-2">
      {(error || message) && <div role={error ? 'alert' : 'status'} className={`h-[30px] flex items-center px-2 rounded-[2px] border text-[11px] ${error ? 'border-[#D65B61] bg-[#FDEEEF] text-[#9F343A]' : 'border-[#3A9D78] bg-[#EAF7F0] text-[#236B4A]'}`}>{error || message}</div>}
      <section className="bg-white border border-[#C9DDE5] rounded-[2px] p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-1.5 items-end">
          <label className="col-span-1 sm:col-span-1 lg:col-span-3 text-[9px] uppercase tracking-wider text-[#536B76]">Fornecedor*
            <select required value={supplier} onChange={(event) => setSupplier(event.target.value)} className={`mt-[2px] h-[30px] w-full rounded-[2px] border px-2 text-[11px] bg-white ${!supplier ? 'border-red-500 bg-red-50/50 text-neutral-900' : 'border-[#B9D0DC] text-[#123B50]'}`}>
              <option value="">Preencher...</option>{suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.razao_social}</option>)}
            </select>
          </label>
          <label className="col-span-1 sm:col-span-1 lg:col-span-2 text-[9px] uppercase tracking-wider text-[#536B76]">Prazo entrega<input type="date" value={delivery} onChange={(event) => setDelivery(event.target.value)} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-[#B9D0DC] bg-white px-2 text-[11px] text-[#123B50]"/></label>
          <label className="col-span-1 sm:col-span-1 lg:col-span-3 text-[9px] uppercase tracking-wider text-[#536B76]">Condição pagamento<input value={condition} onChange={(event) => setCondition(event.target.value)} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-[#B9D0DC] bg-white px-2 text-[11px] text-[#123B50]"/></label>
          <label className="col-span-1 sm:col-span-2 lg:col-span-4 text-[9px] uppercase tracking-wider text-[#536B76]">Observações<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-[#B9D0DC] bg-white px-2 text-[11px] text-[#123B50]"/></label>
        </div>
      </section>
      <section className="bg-white border border-[#C9DDE5] rounded-[2px] p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-1.5 items-end">
          <label className="col-span-1 sm:col-span-2 lg:col-span-4 text-[9px] uppercase tracking-wider text-[#536B76]">Produto / matéria-prima*
            <select value={product} onChange={(event) => { setProduct(event.target.value); setPrice('0') }} className={`mt-[2px] h-[30px] w-full rounded-[2px] border px-2 text-[11px] bg-white ${!product ? 'border-red-500 bg-red-50/50 text-neutral-900' : 'border-[#B9D0DC] text-[#123B50]'}`}>
              <option value="">Preencher...</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.codigo} — {entry.nome}</option>)}
            </select>
          </label>
          <label className="col-span-1 sm:col-span-1 lg:col-span-2 text-[9px] uppercase tracking-wider text-[#536B76]">Quantidade*<input type="number" min="0.0001" step="0.001" value={qty} onChange={(event) => setQty(event.target.value)} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-[#B9D0DC] bg-white px-2 text-[11px] text-[#123B50]"/></label>
          <label className="col-span-1 sm:col-span-1 lg:col-span-2 text-[9px] uppercase tracking-wider text-[#536B76]">Preço unitário*<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-[2px] h-[30px] w-full rounded-[2px] border border-[#B9D0DC] bg-white px-2 text-[11px] text-[#123B50]"/></label>
          <button type="button" onClick={addItem} className="col-span-1 sm:col-span-1 lg:col-span-2 h-[30px] rounded-[2px] bg-[#2D8DB8] text-[11px] uppercase flex items-center justify-center gap-1"><Plus size={13}/>Adicionar</button>
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 h-[30px] flex items-center justify-end text-[11px]">TOTAL {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
        </div>
      </section>
      <section className="bg-white border border-[#C9DDE5] rounded-[2px] overflow-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="h-[26px] bg-[#DCECF2] text-[9px] uppercase tracking-wider text-[#17445A]"><th className="px-2 text-left">Código</th><th className="px-2 text-left">Part number / descrição</th><th className="px-2 text-right">Quantidade</th><th className="px-2 text-right">Preço unitário</th><th className="px-2 text-right">Total</th><th className="px-2 text-center">Ação</th></tr></thead>
          <tbody>{items.map((item,index)=><tr key={`${item.produto_id}-${index}`} className="h-[28px] border-b border-[#E2EDF1]">
            <td className="px-2">{item.codigo}</td><td className="px-2">{item.descricao}</td><td className="px-2 text-right">{item.quantidade} {item.unidade}</td><td className="px-2 text-right">{Number(item.valor_unitario).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-right">{(Number(item.quantidade)*Number(item.valor_unitario)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-center"><button type="button" aria-label={`Remover ${item.codigo}`} onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))} className="inline-flex h-[26px] w-[26px] items-center justify-center border border-[#C9DDE5] text-[#123B50] hover:bg-[#EAF6FA]"><Trash2 size={13}/></button></td>
          </tr>)}{!items.length&&<tr><td colSpan={6} className="h-[60px] text-center text-[#647B85]">Nenhum item adicionado.</td></tr>}</tbody>
        </table>
      </section>
      <div className="flex justify-end"><button type="button" disabled={busy} onClick={()=>void save()} className="h-[30px] rounded-[2px] bg-[#2D8DB8] px-4 text-[11px] uppercase flex items-center gap-1"><Save size={13}/>{busy?'SALVANDO…':'ENVIAR PARA APROVAÇÃO'}</button></div>
    </main>
  </div>
}