import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Barcode, CheckCircle2, CreditCard, Minus, Package, Plus, RefreshCw,
  Search, ShoppingCart, Trash2, Wallet, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Product = {
  id: string
  codigo: string
  codigo_barras: string | null
  nome: string
  preco_venda: number
  unidade: string
  categoria: string | null
  estoque_atual: number
  permite_estoque_negativo: boolean
}
type CartItem = Product & { quantidade: number }
type Box = { id: string; codigo: string; descricao: string }
type Customer = { id: string; codigo: string | null; nome: string; documento: string | null }
type CheckoutResult = { movimento_id: string; numero: number; subtotal: number; total: number }

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const newCheckoutKey = () => crypto.randomUUID()

export default function VendasPDV() {
  const [products, setProducts] = useState<Product[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [box, setBox] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('TODOS')
  const [payment, setPayment] = useState('DINHEIRO')
  const [discount, setDiscount] = useState('0')
  const [customerId, setCustomerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [checkoutKey, setCheckoutKey] = useState(newCheckoutKey)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) throw company.error ?? new Error('Empresa não identificada.')
      const companyId = String(company.data)
      const [loadedProducts, loadedBoxes, loadedCustomers] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,codigo_barras,nome,preco_venda,unidade,categoria,estoque_atual,permite_estoque_negativo', { count: 'exact' })
          .eq('empresa_id', companyId).eq('ativo', true).order('nome').range(from, to)),
        fetchAllPages<Box>((from, to) => supabase.from('erp_caixas')
          .select('id,codigo,descricao', { count: 'exact' })
          .eq('empresa_id', companyId).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Customer>((from, to) => supabase.from('erp_clientes')
          .select('id,codigo,nome,documento', { count: 'exact' })
          .eq('empresa_id', companyId).eq('ativo', true).order('nome').range(from, to)),
      ])
      setProducts(loadedProducts)
      setBoxes(loadedBoxes)
      setCustomers(loadedCustomers)
      setBox(current => current && loadedBoxes.some(item => item.id === current) ? current : (loadedBoxes[0]?.id ?? ''))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados do PDV.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const categories = useMemo(
    () => ['TODOS', ...Array.from(new Set(products.map(product => product.categoria?.trim()).filter((value): value is string => Boolean(value))))],
    [products],
  )
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return products.filter(product => {
      const matchesCategory = category === 'TODOS' || product.categoria?.trim() === category
      const matchesSearch = !term
        || product.codigo.toLocaleLowerCase('pt-BR').includes(term)
        || product.nome.toLocaleLowerCase('pt-BR').includes(term)
        || (product.codigo_barras ?? '').includes(query.trim())
      return matchesCategory && matchesSearch
    })
  }, [products, query, category])

  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.quantidade * Number(item.preco_venda || 0), 0) * 100) / 100
  const requestedDiscount = Math.round(Math.max(0, Number(discount) || 0) * 100) / 100
  const total = Math.round((subtotal - Math.min(subtotal, requestedDiscount)) * 100) / 100
  const itemCount = cart.reduce((sum, item) => sum + item.quantidade, 0)

  const add = (product: Product) => {
    setError('')
    setMessage('')
    if (product.estoque_atual <= 0) {
      setError(`O produto ${product.codigo} está sem saldo físico disponível.`)
      return
    }
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantidade + 1 > product.estoque_atual) {
          setError(`Saldo insuficiente para adicionar mais unidades de ${product.codigo}.`)
          return current
        }
        return current.map(item => item.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item)
      }
      return [...current, { ...product, quantidade: 1 }]
    })
  }

  const setQuantity = (productId: string, quantity: number) => {
    const item = cart.find(current => current.id === productId)
    if (!item) return
    if (quantity <= 0) {
      setCart(current => current.filter(currentItem => currentItem.id !== productId))
      return
    }
    if (quantity > item.estoque_atual) {
      setError(`A quantidade excede o saldo físico de ${item.codigo} (${item.estoque_atual}). O estoque reservado será validado novamente ao finalizar.`)
      return
    }
    setError('')
    setCart(current => current.map(currentItem => currentItem.id === productId ? { ...currentItem, quantidade } : currentItem))
  }

  const finish = async () => {
    if (!box) { setError('Selecione um caixa operacional ativo.'); return }
    if (!cart.length) { setError('Adicione pelo menos um produto ao carrinho.'); return }
    if (requestedDiscount > subtotal) { setError('O desconto não pode ser maior que o subtotal.'); return }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data, error: checkoutError } = await supabase.rpc('erp_pdv_finalizar_venda', {
        p_caixa_id: box,
        p_cliente_id: customerId || null,
        p_forma_pagamento: payment,
        p_desconto: requestedDiscount,
        p_chave_idempotencia: checkoutKey,
        p_itens: cart.map(item => ({ produto_id: item.id, quantidade: item.quantidade })),
      })
      if (checkoutError) throw checkoutError
      const result = (Array.isArray(data) ? data[0] : data) as CheckoutResult | null
      if (!result?.movimento_id || result.numero == null) throw new Error('O PDV não recebeu a confirmação da venda pelo banco.')
      setMessage(`Venda #${result.numero} finalizada. Total confirmado pelo ERP: ${money(Number(result.total))}.`)
      setCart([])
      setDiscount('0')
      setCustomerId('')
      setCheckoutKey(newCheckoutKey())
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível finalizar a venda. Nenhum sucesso foi presumido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendasLayout
      title="PDV — Ponto de Venda"
      subtitle="Venda rápida • catálogo, carrinho e pagamento"
      onRefresh={() => void load()}
      showStatusCards={false}
    >
      <div className="grid min-w-0 grid-cols-1 items-start gap-2 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-[min(720px,calc(100vh-155px))] min-w-0 flex-col overflow-hidden border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-2">
            <div className="relative min-w-[220px] flex-1">
              <Barcode size={16} className="pointer-events-none absolute left-2.5 top-2 text-slate-500" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Leia o código de barras ou pesquise código / produto"
                aria-label="Pesquisar produto ou código de barras"
                className="h-[30px] w-full border border-slate-300 pl-8 pr-2 text-[11px]"
              />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar pesquisa" className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-100"><X size={13} /></button>}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500"><Package size={14} /> {loading ? 'Carregando catálogo…' : `${visible.length} de ${products.length} produtos`}</div>
            <button type="button" onClick={() => void load()} disabled={loading || saving} className="erp-standard-button" aria-label="Atualizar catálogo"><RefreshCw size={13} /> Atualizar</button>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-1.5" aria-label="Filtrar produtos por categoria">
            {categories.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={category === item
                  ? 'h-7 shrink-0 border border-[#17445A] bg-[#17445A] px-3 text-[10px] font-semibold text-white'
                  : 'h-7 shrink-0 border border-slate-200 bg-white px-3 text-[10px] text-slate-700 hover:border-[#2D8DB8]'}
              >{item === 'TODOS' ? 'Todos os produtos' : item}</button>
            ))}
          </div>

          <div className="min-h-[260px] flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center gap-2 text-[11px] text-slate-500"><RefreshCw size={15} className="animate-spin" /> Carregando produtos e estoque da empresa…</div>
            ) : visible.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-slate-500">
                <Package size={28} strokeWidth={1.5} />
                <strong className="text-[12px] font-medium text-slate-700">Nenhum produto encontrado</strong>
                <span className="text-[10px]">{products.length ? 'Altere a pesquisa ou escolha outra categoria.' : 'Não há produtos ativos disponíveis para esta empresa.'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,185px),1fr))] items-stretch gap-2">
                {visible.map(product => {
                  const unavailable = product.estoque_atual <= 0
                  const inCart = cart.find(item => item.id === product.id)?.quantidade ?? 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => add(product)}
                      disabled={unavailable || loading || saving}
                      aria-label={`Adicionar ${product.nome}, ${money(Number(product.preco_venda))}, estoque ${product.estoque_atual}`}
                      className="group flex min-h-[112px] min-w-0 flex-col justify-between border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-[#2D8DB8] hover:bg-sky-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-[9px] font-medium tracking-wide text-slate-500" title={product.codigo}>{product.codigo}</span>
                        {inCart > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center bg-[#e6f4f8] px-1 text-[10px] font-semibold text-[#17445A]">{inCart}</span>}
                      </div>
                      <span className="mt-2 line-clamp-2 min-h-[30px] break-words text-[11px] font-medium leading-[15px] text-[#123B50]" title={product.nome}>{product.nome}</span>
                      <div className="mt-3 flex min-w-0 items-end justify-between gap-2 border-t border-slate-100 pt-2">
                        <span className={unavailable ? 'text-[9px] text-rose-600' : 'text-[9px] text-slate-500'}>{unavailable ? 'Sem estoque' : `Saldo ${product.estoque_atual} ${product.unidade || ''}`}</span>
                        <strong className="shrink-0 text-[11px] font-semibold text-[#17445A]">{money(Number(product.preco_venda))}</strong>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col border border-slate-200 bg-white 2xl:sticky 2xl:top-2">
          <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
            <div className="flex items-center gap-2 text-[#123B50]"><ShoppingCart size={16} /><h2 className="text-[12px] font-semibold">Venda atual</h2></div>
            <span className="text-[10px] text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 border-b border-slate-200 p-2">
            <label htmlFor="pdv-caixa">Caixa operacional</label>
            <select id="pdv-caixa" value={box} onChange={event => setBox(event.target.value)} disabled={loading || saving} className="w-full">
              <option value="">Selecione um caixa ativo</option>
              {boxes.map(item => <option key={item.id} value={item.id}>{item.codigo} — {item.descricao}</option>)}
            </select>
            <label htmlFor="pdv-cliente">Cliente (opcional)</label>
            <select id="pdv-cliente" value={customerId} onChange={event => setCustomerId(event.target.value)} disabled={loading || saving} className="w-full">
              <option value="">Consumidor não identificado</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.codigo ? `${customer.codigo} — ` : ''}{customer.nome}{customer.documento ? ` • ${customer.documento}` : ''}</option>)}
            </select>
          </div>

          <div className="max-h-[min(38vh,360px)] min-h-[100px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex min-h-[145px] flex-col items-center justify-center gap-2 px-4 text-center text-slate-400">
                <ShoppingCart size={25} strokeWidth={1.4} />
                <span className="text-[11px] font-medium text-slate-600">Carrinho vazio</span>
                <span className="max-w-[230px] text-[10px] leading-4">Selecione um produto no catálogo para iniciar a venda.</span>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-b border-slate-100 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="break-words text-[10px] font-medium leading-4 text-[#123B50]" title={item.nome}>{item.nome}</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">{money(Number(item.preco_venda))} / {item.unidade}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setQuantity(item.id, item.quantidade - 1)} disabled={saving} aria-label={`Diminuir quantidade de ${item.nome}`} className="flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><Minus size={11} /></button>
                  <span className="w-6 text-center text-[10px] font-semibold tabular-nums">{item.quantidade}</span>
                  <button type="button" onClick={() => setQuantity(item.id, item.quantidade + 1)} disabled={saving || item.quantidade >= item.estoque_atual} aria-label={`Aumentar quantidade de ${item.nome}`} className="flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"><Plus size={11} /></button>
                  <button type="button" onClick={() => setQuantity(item.id, 0)} disabled={saving} aria-label={`Remover ${item.nome} do carrinho`} className="ml-1 flex h-6 w-6 items-center justify-center text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} /></button>
                </div>
                <strong className="col-span-2 mt-1 text-right text-[10px] font-semibold tabular-nums text-[#17445A]">{money(item.quantidade * Number(item.preco_venda))}</strong>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-200 p-3">
            <div className="flex items-center justify-between text-[10px]"><span className="text-slate-600">Subtotal</span><strong className="font-medium tabular-nums">{money(subtotal)}</strong></div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="pdv-desconto">Desconto (R$)</label>
              <input id="pdv-desconto" type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={event => setDiscount(event.target.value)} disabled={saving} className="w-28 text-right tabular-nums" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[12px] text-[#123B50]"><span className="font-semibold">TOTAL</span><strong className="text-[18px] font-semibold tabular-nums">{money(total)}</strong></div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
            {[
              { value: 'DINHEIRO', label: 'Dinheiro', Icon: Wallet },
              { value: 'CARTAO', label: 'Cartão', Icon: CreditCard },
              { value: 'PIX', label: 'PIX', Icon: CheckCircle2 },
            ].map(({ value, label, Icon }) => (
              <button key={value} type="button" onClick={() => setPayment(value)} disabled={saving} aria-pressed={payment === value} className={payment === value ? 'flex h-9 flex-col items-center justify-center gap-0.5 border border-[#17445A] bg-[#17445A] text-white' : 'flex h-9 flex-col items-center justify-center gap-0.5 border border-slate-200 bg-white text-slate-600 hover:border-[#2D8DB8]'}>
                <Icon size={13} /><span className="text-[9px]">{label}</span>
              </button>
            ))}
          </div>

          {error && <div role="alert" className="mx-2 mb-2 border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] leading-4 text-rose-800">{error}</div>}
          {message && <div role="status" className="mx-2 mb-2 border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] leading-4 text-emerald-800">{message}</div>}

          <div className="border-t border-slate-200 p-2">
            <button type="button" onClick={() => void finish()} disabled={saving || loading || !cart.length || !box} className="flex h-10 w-full items-center justify-center gap-2 bg-[#3A9D78] px-3 text-[11px] font-semibold text-white hover:bg-[#2e8061] disabled:cursor-not-allowed disabled:opacity-45">
              {saving ? <><RefreshCw size={14} className="animate-spin" /> Finalizando venda…</> : <><CheckCircle2 size={14} /> Finalizar venda</>}
            </button>
            <p className="mt-1.5 text-center text-[9px] leading-3 text-slate-500">A baixa de estoque e o registro da venda são confirmados em uma única transação no banco.</p>
          </div>
        </aside>
      </div>
    </VendasLayout>
  )
}
