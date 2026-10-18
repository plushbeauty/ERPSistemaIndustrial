/**
 * REV-COM-026 | 2026-10-18
 * STATUS: PROPOSTA ISOLADA — CATÁLOGO DIGITAL DO CLIENTE
 * Não substitui telas existentes. Acesso exige sessão ERP e RLS por empresa.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, Check, ChevronRight, Filter, Grid2X2, Info, Minus, Package,
  Plus, Search, Send, ShoppingBag, X
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Company = {
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  telefone: string | null
  email: string | null
  site: string | null
}
type Product = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  preco_venda: number | null
  estoque_atual: number | null
  unidade: string
  foto_url: string | null
  catalogo_disponivel: boolean
  grupo: string | null
  subgrupo: string | null
  codigo_barras: string | null
  referencia_interna: string | null
}
type BomItem = {
  id: string
  produto_id: string
  sku_insumo: string
  qtd: number
  unidade: string
  nome_componente: string
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

export default function CatalogoDigitalCliente() {
  const [products, setProducts] = useState<Product[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [companyId, setCompanyId] = useState('')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('TODOS')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Product | null>(null)
  const [bom, setBom] = useState<BomItem[]>([])
  const [bomBusy, setBomBusy] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const companyResult = await supabase.rpc('erp_current_empresa_id')
      if (companyResult.error || !companyResult.data) {
        throw companyResult.error ?? new Error('Não foi possível identificar a empresa da sessão.')
      }
      const id = String(companyResult.data)
      setCompanyId(id)
      const companyData = await supabase.from('erp_empresas')
        .select('razao_social,nome_fantasia,cnpj,telefone,email,site')
        .eq('id', id).eq('ativo', true).maybeSingle()
      if (companyData.error) throw companyData.error
      setCompany(companyData.data as Company | null)

      const productRows = await fetchAllPages<Product>((from, to) => supabase
        .from('erp_produtos')
        .select('id,codigo,nome,descricao,preco_venda,estoque_atual,unidade,foto_url,catalogo_disponivel,grupo,subgrupo,codigo_barras,referencia_interna', { count: 'exact' })
        .eq('empresa_id', id)
        .eq('ativo', true)
        .eq('catalogo_disponivel', true)
        .order('grupo').order('codigo').range(from, to))
      setProducts(productRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar a vitrine de produtos.')
      setProducts([])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!selected || !companyId) {
      setBom([])
      return
    }
    let active = true
    const loadBom = async () => {
      setBomBusy(true)
      try {
        const result = await supabase.from('erp_pcp_bom_itens')
          .select('id,produto_id,sku_insumo,qtd,unidade')
          .eq('empresa_id', companyId)
          .eq('produto_pai_id', selected.id)
          .order('created_at')
        if (result.error) throw result.error
        const rows = (result.data ?? []) as Omit<BomItem, 'nome_componente'>[]
        const ids = [...new Set(rows.map(row => row.produto_id))]
        const components = ids.length
          ? await supabase.from('erp_produtos').select('id,nome').eq('empresa_id', companyId).in('id', ids)
          : { data: [], error: null }
        if (components.error) throw components.error
        const names = new Map((components.data ?? []).map((row: { id: string; nome: string }) => [row.id, row.nome]))
        if (active) setBom(rows.map(row => ({ ...row, nome_componente: names.get(row.produto_id) ?? row.sku_insumo })))
      } catch {
        if (active) setBom([])
      } finally {
        if (active) setBomBusy(false)
      }
    }
    void loadBom()
    return () => { active = false }
  }, [selected, companyId])

  const groups = useMemo(() => [...new Set(products.map(p => p.grupo || 'SEM GRUPO'))].sort(), [products])
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter(p => (group === 'TODOS' || (p.grupo || 'SEM GRUPO') === group) &&
      (!term || [p.codigo, p.nome, p.descricao ?? '', p.grupo ?? '', p.subgrupo ?? '', p.referencia_interna ?? '', p.codigo_barras ?? ''].join(' ').toLowerCase().includes(term)))
  }, [products, query, group])
  const cart = useMemo(() => products.filter(p => (quantities[p.id] ?? 0) > 0), [products, quantities])
  const cartCount = cart.reduce((sum, p) => sum + (quantities[p.id] ?? 0), 0)
  const cartTotal = cart.reduce((sum, p) => sum + Number(p.preco_venda ?? 0) * (quantities[p.id] ?? 0), 0)

  const add = (product: Product) => setQuantities(current => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))
  const decrement = (product: Product) => setQuantities(current => ({ ...current, [product.id]: Math.max(0, (current[product.id] ?? 0) - 1) }))

  const sendSelection = async () => {
    if (!cart.length) {
      setNotice('Adicione pelo menos um produto antes de enviar a solicitação.')
      return
    }
    const message = [
      'Solicitação de cotação de peças',
      company?.nome_fantasia || company?.razao_social || '',
      '',
      ...cart.map(p => `• ${p.codigo} — ${p.nome} | Qtd: ${quantities[p.id]} ${p.unidade}`),
      '',
      `Subtotal estimado: ${money(cartTotal)}`,
      'Valores e disponibilidade sujeitos à confirmação comercial.'
    ].filter(Boolean).join('\n')
    const phone = company?.telefone?.replace(/\D/g, '') ?? ''
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
      setNotice('Solicitação preparada para envio ao contato comercial cadastrado.')
      return
    }
    try {
      await navigator.clipboard.writeText(message)
      setNotice('O telefone comercial não está cadastrado. A solicitação foi copiada para a área de transferência.')
    } catch {
      setError('Cadastre o telefone comercial da empresa para habilitar o envio por WhatsApp.')
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FA] text-slate-800 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#123B50] text-white shadow-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo/logo.png" alt="Logomarca da empresa" className="h-9 max-w-24 object-contain rounded-sm bg-white/10 p-1" />
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-wide text-cyan-300">{company?.nome_fantasia || company?.razao_social || 'Catálogo industrial'}</p>
              <p className="text-[9px] text-slate-300">{company?.cnpj ? `CNPJ: ${company.cnpj}` : 'Vitrine de produtos publicados'}</p>
            </div>
          </div>
          <button type="button" onClick={() => setCartOpen(true)} className="flex h-8 items-center gap-2 rounded-sm bg-sky-600 px-3 text-[10px] font-black text-white hover:bg-sky-500">
            <ShoppingBag size={14} /> SACOLA <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] text-[#123B50]">{cartCount}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-3 p-3 md:p-4">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#123B50] to-[#236D8A] px-4 py-5 text-white md:px-6">
            <p className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200">PORTFÓLIO INDUSTRIAL • CATÁLOGO DIGITAL</p>
            <h1 className="mt-1 text-xl font-black">Peças e soluções para sua operação</h1>
            <p className="mt-1 max-w-2xl text-[10px] text-slate-200">Consulte os produtos publicados, veja imagens e especificações disponíveis e prepare uma solicitação de cotação.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-200">
              {company?.telefone && <span>{company.telefone}</span>}
              {company?.email && <span>{company.email}</span>}
              {company?.site && <span>{company.site}</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="flex h-9 items-center gap-2 rounded-sm border border-slate-300 bg-slate-50 px-2 focus-within:border-sky-600">
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} className="h-full w-full bg-transparent text-[11px] outline-none" placeholder="Buscar por código, produto, especificação ou referência..." />
            </label>
            <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase text-slate-500">
              <span className="flex items-center gap-1"><Filter size={12} /> {visible.length} produtos</span>
              <a href="/vendas/catalogo-ajuda" className="text-sky-700 underline underline-offset-2">Ajuda do catálogo</a>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-slate-200 p-2">
            <button type="button" onClick={() => setGroup('TODOS')} className={`shrink-0 rounded-sm border px-3 py-1.5 text-[9px] font-bold uppercase ${group === 'TODOS' ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos</button>
            {groups.map(item => <button key={item} type="button" onClick={() => setGroup(item)} className={`shrink-0 rounded-sm border px-3 py-1.5 text-[9px] font-bold uppercase ${group === item ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{item}</button>)}
          </div>
        </section>

        {error && <div role="alert" className="border border-red-200 bg-red-50 p-2 text-[10px] text-red-800">{error}</div>}
        {notice && <div role="status" className="flex items-start gap-2 border border-sky-200 bg-sky-50 p-2 text-[10px] text-sky-900"><Info size={13} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto" onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={13}/></button></div>}

        {busy ? <div className="rounded-sm border border-slate-200 bg-white p-12 text-center text-[10px] font-bold uppercase text-slate-500">Carregando produtos da empresa autenticada…</div> :
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(product => {
              const quantity = quantities[product.id] ?? 0
              return <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <button type="button" onClick={() => setSelected(product)} className="relative flex h-48 w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-50 p-3 text-left">
                  {product.foto_url ? <img src={product.foto_url} alt={product.nome} loading="lazy" className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105" /> : <div className="flex flex-col items-center gap-2 text-slate-400"><Package size={28}/><span className="text-[9px] font-bold uppercase">Imagem não cadastrada</span></div>}
                  <span className="absolute left-2 top-2 rounded-sm bg-white/95 px-2 py-1 text-[9px] font-bold text-slate-600">{product.codigo}</span>
                </button>
                <div className="flex flex-1 flex-col p-3">
                  <div className="mb-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-sky-700"><span>{product.grupo || 'Sem grupo'}</span>{product.subgrupo && <><ChevronRight size={10}/><span>{product.subgrupo}</span></>}</div>
                  <h2 className="line-clamp-2 min-h-8 text-xs font-black text-[#123B50]">{product.nome}</h2>
                  <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-relaxed text-slate-500">{product.descricao || 'Sem descrição técnica complementar cadastrada.'}</p>
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-2">
                    <div><span className="block text-[8px] font-bold uppercase text-slate-400">Preço de referência</span><strong className="text-sm font-black text-[#123B50]">{money(Number(product.preco_venda ?? 0))}</strong><span className="ml-1 text-[9px] text-slate-500">/ {product.unidade || 'UN'}</span></div>
                    <button type="button" onClick={() => setSelected(product)} className="flex h-7 items-center gap-1 rounded-sm border border-slate-300 px-2 text-[9px] font-bold text-slate-700 hover:bg-slate-50"><Info size={12}/> DETALHES</button>
                  </div>
                  <div className="mt-3 flex h-8 items-center gap-1">
                    {quantity > 0 ? <div className="flex h-8 flex-1 items-center justify-between border border-slate-300"><button type="button" onClick={() => decrement(product)} aria-label={`Diminuir quantidade de ${product.nome}`} className="h-full w-9 hover:bg-slate-50"><Minus size={12} className="mx-auto"/></button><span className="text-[10px] font-black">{quantity}</span><button type="button" onClick={() => add(product)} aria-label={`Aumentar quantidade de ${product.nome}`} className="h-full w-9 text-sky-700 hover:bg-slate-50"><Plus size={12} className="mx-auto"/></button></div> : <button type="button" onClick={() => add(product)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm bg-sky-600 text-[9px] font-black uppercase text-white hover:bg-sky-700"><Plus size={12}/> Adicionar à sacola</button>}
                  </div>
                </div>
              </article>
            })}
            {!visible.length && <div className="col-span-full rounded-sm border border-slate-200 bg-white p-12 text-center text-[10px] text-slate-500">{products.length ? 'Nenhum produto corresponde aos filtros.' : 'Não há produtos ativos publicados no catálogo desta empresa.'}</div>}
          </section>
        }
      </div>

      {selected && <div className="fixed inset-0 z-50">
        <button type="button" aria-label="Fechar detalhes" onClick={() => setSelected(null)} className="absolute inset-0 bg-slate-950/40"/>
        <aside role="dialog" aria-modal="true" aria-label="Ficha técnica do produto" className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#123B50] px-4 py-3 text-white"><div><p className="text-[9px] font-bold uppercase tracking-widest text-cyan-200">FICHA DE PRODUTO</p><h2 className="text-sm font-black">{selected.codigo}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-sm p-1 hover:bg-white/10" aria-label="Fechar"><X size={17}/></button></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex h-56 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 p-3">{selected.foto_url ? <img src={selected.foto_url} alt={selected.nome} className="h-full w-full object-contain"/> : <Package size={36} className="text-slate-400"/>}</div>
            <div><h3 className="text-base font-black text-[#123B50]">{selected.nome}</h3><p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{selected.descricao || 'Memorial descritivo não informado.'}</p></div>
            <div className="grid grid-cols-2 gap-2">{[['Grupo',selected.grupo || '—'],['Subgrupo',selected.subgrupo || '—'],['Unidade',selected.unidade || 'UN'],['Referência',selected.referencia_interna || '—'],['Código de barras',selected.codigo_barras || '—'],['Saldo físico',selected.estoque_atual == null ? 'Não informado' : String(selected.estoque_atual)]].map(([label,value]) => <div key={label} className="rounded-sm border border-slate-200 p-2"><span className="block text-[8px] font-bold uppercase text-slate-400">{label}</span><span className="mt-1 block break-words text-[10px] font-semibold text-slate-700">{value}</span></div>)}</div>
            <section className="border-t border-slate-200 pt-3"><h4 className="flex items-center gap-1 text-[10px] font-black uppercase text-[#123B50]"><Grid2X2 size={13}/> Estrutura técnica cadastrada</h4><p className="mt-1 text-[9px] text-slate-500">Exibe apenas componentes e quantidades; custos internos não são disponibilizados nesta vitrine.</p>
              {bomBusy ? <p className="py-3 text-[10px] text-slate-500">Consultando estrutura…</p> : bom.length ? <div className="mt-2 divide-y divide-slate-100 border border-slate-200">{bom.map(item => <div key={item.id} className="flex items-center justify-between gap-3 px-2 py-2 text-[10px]"><span className="min-w-0"><strong className="block truncate">{item.nome_componente}</strong><span className="text-slate-400">{item.sku_insumo}</span></span><span className="shrink-0 font-bold">{item.qtd} {item.unidade}</span></div>)}</div> : <p className="mt-2 rounded-sm bg-slate-50 p-3 text-[10px] text-slate-500">Nenhum componente de estrutura foi retornado para este produto ou a estrutura não está disponível nesta sessão.</p>}
            </section>
          </div>
          <div className="border-t border-slate-200 p-3"><button type="button" onClick={() => { add(selected); setSelected(null); setCartOpen(true) }} className="flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-sky-600 text-[10px] font-black uppercase text-white hover:bg-sky-700"><ShoppingBag size={14}/> Adicionar à sacola <ArrowRight size={13}/></button></div>
        </aside>
      </div>}

      {cartOpen && <div className="fixed inset-0 z-[60]">
        <button type="button" aria-label="Fechar sacola" onClick={() => setCartOpen(false)} className="absolute inset-0 bg-slate-950/40"/>
        <aside role="dialog" aria-modal="true" aria-label="Sacola de cotação" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#123B50] p-4 text-white"><div><h2 className="text-sm font-black uppercase">Minha sacola</h2><p className="text-[9px] text-slate-300">{cartCount} unidade(s) selecionada(s)</p></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar" className="p-1 hover:bg-white/10"><X size={16}/></button></div>
          <div className="flex-1 overflow-y-auto px-3">{cart.map(product => <div key={product.id} className="flex gap-2 border-b border-slate-100 py-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center bg-slate-50">{product.foto_url ? <img src={product.foto_url} alt="" className="h-full w-full object-contain"/> : <Package size={18} className="text-slate-400"/>}</div><div className="min-w-0 flex-1"><strong className="block text-[10px] text-[#123B50]">{product.nome}</strong><span className="text-[9px] text-slate-400">{product.codigo} · {money(Number(product.preco_venda ?? 0))}</span><div className="mt-2 flex items-center justify-between"><div className="flex h-7 items-center border border-slate-300"><button type="button" onClick={() => decrement(product)} aria-label="Diminuir" className="h-full w-7"><Minus size={11} className="mx-auto"/></button><span className="w-6 text-center text-[10px] font-bold">{quantities[product.id]}</span><button type="button" onClick={() => add(product)} aria-label="Aumentar" className="h-full w-7"><Plus size={11} className="mx-auto"/></button></div><strong className="text-[10px]">{money(Number(product.preco_venda ?? 0) * quantities[product.id])}</strong></div></div></div>)}
            {!cart.length && <div className="py-12 text-center text-[10px] text-slate-500">Sua sacola está vazia.</div>}
          </div>
          <div className="space-y-3 border-t border-slate-200 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-slate-500">Subtotal estimado</span><strong className="text-base font-black text-[#123B50]">{money(cartTotal)}</strong></div><p className="text-[9px] text-slate-500">Cotação sujeita à confirmação de preço, estoque e prazo pelo Comercial.</p><button type="button" disabled={!cart.length} onClick={() => void sendSelection()} className="flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-sky-600 text-[10px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={13}/> Preparar pedido para o Comercial</button></div>
        </aside>
      </div>}
    </main>
  )
}
