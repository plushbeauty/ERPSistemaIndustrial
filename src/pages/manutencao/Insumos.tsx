import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Boxes, CheckCircle2, Minus, Plus, RefreshCw, Search, Trash2, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'

type Product = { id: string; codigo: string; nome: string; unidade: string | null; estoque_atual: number; categoria: string | null }
type Order = { id: string; numero_os: string | null; descricao: string; status: string; tipo: string }
type DraftItem = { produto_id: string; quantidade: string }
type Movement = { id: string; produto_id: string; quantidade: number; documento: string | null; observacao: string | null; created_at: string }

const field = 'h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-800 outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const action = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-semibold text-white hover:bg-[#24789D] disabled:cursor-not-allowed disabled:opacity-50'

export default function ManutencaoInsumos() {
  const [empresaId, setEmpresaId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<Movement[]>([])
  const [orderId, setOrderId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [search, setSearch] = useState('')
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState<DraftItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const id = String(tenant.data)
      const [p, o, h] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos')
          .select('id,codigo,nome,unidade,estoque_atual,categoria', { count: 'exact' })
          .eq('empresa_id', id).eq('ativo', true).order('codigo').range(from, to)),
        fetchAllPages<Order>((from, to) => supabase.from('erp_manutencao_ordens')
          .select('id,numero_os,descricao,status,tipo', { count: 'exact' })
          .eq('empresa_id', id).not('status', 'in', '(CONCLUIDA,CANCELADA)').order('created_at', { ascending: false }).range(from, to)),
        fetchAllPages<Movement>((from, to) => supabase.from('erp_estoque_movimentos')
          .select('id,produto_id,quantidade,documento,observacao,created_at', { count: 'exact' })
          .eq('empresa_id', id).eq('origem', 'manutencao').order('created_at', { ascending: false }).range(from, to)),
      ])
      setEmpresaId(id); setProducts(p); setOrders(o); setHistory(h)
      if (!orderId && o[0]) setOrderId(o[0].id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar insumos de manutenção.') }
    finally { setBusy(false) }
  }, [orderId])

  useEffect(() => { void load() }, [load])

  const filteredProducts = useMemo(() => products.filter(p => {
    const q = search.trim().toLocaleLowerCase()
    return !q || p.codigo.toLocaleLowerCase().includes(q) || p.nome.toLocaleLowerCase().includes(q) || (p.categoria ?? '').toLocaleLowerCase().includes(q)
  }), [products, search])
  const selectedOrder = orders.find(o => o.id === orderId)
  const productName = (id: string) => products.find(p => p.id === id)?.nome ?? id.slice(0, 8)
  const addItem = () => {
    const qty = Number(quantity)
    if (!productId || !Number.isFinite(qty) || qty <= 0) { setError('Selecione uma peça e informe quantidade maior que zero.'); return }
    const p = products.find(x => x.id === productId)
    if (!p) { setError('Produto não pertence ao estoque da empresa autenticada.'); return }
    setDraft(old => {
      const existing = old.find(x => x.produto_id === productId)
      return existing ? old.map(x => x.produto_id === productId ? { ...x, quantidade: String(Number(x.quantidade) + qty) } : x) : [...old, { produto_id: productId, quantidade: String(qty) }]
    })
    setProductId(''); setQuantity('1'); setError(''); setMessage('')
  }
  const submit = async () => {
    if (!empresaId || !orderId || draft.length === 0) { setError('Selecione uma O.S. e adicione ao menos uma peça.'); return }
    const invalid = draft.find(i => !Number.isFinite(Number(i.quantidade)) || Number(i.quantidade) <= 0)
    if (invalid) { setError('Todas as quantidades devem ser maiores que zero.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: rpcError } = await supabase.rpc('erp_manutencao_baixar_insumos', {
        p_ordem_id: orderId,
        p_itens: draft.map(i => ({ produto_id: i.produto_id, quantidade: Number(i.quantidade) })),
        p_observacao: note.trim() || null,
      })
      if (rpcError) throw rpcError
      setMessage('Baixa transacional registrada. Protocolo: ' + String(data ?? 'concluído'))
      setDraft([]); setNote(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'A baixa foi rejeitada; nenhuma movimentação foi confirmada.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#F4FBFD] px-3 py-3 text-[#123B50] sm:px-5">
    <div className="mx-auto max-w-[1500px] space-y-3">
      <header className="flex flex-wrap items-center gap-2 border border-[#D8E8EE] bg-white px-3 py-2">
        <Link to="/manutencao" aria-label="Voltar à central" className="inline-flex h-[30px] items-center gap-1 border border-slate-300 px-2 text-[10px]"><ArrowLeft size={13}/> CENTRAL</Link>
        <span className="flex h-[30px] w-[30px] items-center justify-center bg-[#E7F4F8] text-[#2D8DB8]"><Boxes size={17}/></span>
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]">MANUTENÇÃO / PCM</p><h1 className="text-[14px] font-semibold">Insumos consumidos por O.S.</h1></div>
        <button type="button" onClick={() => void load()} disabled={busy} className={action + ' ml-auto'}><RefreshCw size={12} className={busy ? 'animate-spin' : ''}/> ATUALIZAR</button>
      </header>
      {error && <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{error}</p>}
      {message && <p role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800"><CheckCircle2 size={13} className="mr-1 inline"/> {message}</p>}
      <section className="border border-[#D8E8EE] bg-white">
        <div className="border-b border-[#D8E8EE] px-3 py-2"><h2 className="text-[11px] font-semibold">Lançamento de consumo</h2><p className="text-[10px] text-slate-500">A baixa e o registro do movimento são executados em uma única transação PostgreSQL.</p></div>
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-[minmax(240px,1.2fr)_minmax(230px,1fr)_100px_auto]">
          <label className="text-[9px] font-semibold uppercase">Ordem de serviço
            <select className={field + ' mt-1'} value={orderId} onChange={e => setOrderId(e.target.value)}><option value="">Selecione a O.S.</option>{orders.map(o => <option key={o.id} value={o.id}>{o.numero_os || o.id.slice(0, 8)} — {o.descricao.slice(0, 75)}</option>)}</select>
          </label>
          <label className="text-[9px] font-semibold uppercase">Peça / material
            <select className={field + ' mt-1'} value={productId} onChange={e => setProductId(e.target.value)}><option value="">Selecione o item</option>{filteredProducts.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome} | saldo {Number(p.estoque_atual).toLocaleString('pt-BR')}</option>)}</select>
          </label>
          <label className="text-[9px] font-semibold uppercase">Quantidade
            <input className={field + ' mt-1'} type="number" min="0.0001" step="any" value={quantity} onChange={e => setQuantity(e.target.value)}/>
          </label>
          <div className="flex items-end"><button type="button" className={action + ' w-full'} onClick={addItem}><Plus size={13}/> ADICIONAR</button></div>
          <label className="text-[9px] font-semibold uppercase md:col-span-4">Observação / causa do consumo
            <input className={field + ' mt-1'} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: troca de rolamento, correia ou lubrificante"/>
          </label>
        </div>
      </section>
      <section className="border border-[#D8E8EE] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D8E8EE] px-3 py-2"><h2 className="text-[11px] font-semibold">Itens para baixa</h2><span className="text-[10px] text-slate-500">{draft.length} item(ns)</span><label className="ml-auto flex h-[30px] items-center gap-1 border border-slate-300 px-2"><Search size={12}/><input className="w-40 text-[10px] outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar estoque"/></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase"><tr><th className="px-3 py-2">Código / item</th><th className="px-3 py-2">Saldo disponível</th><th className="px-3 py-2">Quantidade</th><th className="px-3 py-2">Un.</th><th className="px-3 py-2 text-right">Ação</th></tr></thead><tbody className="text-[10px]">{draft.map(i => { const p = products.find(x => x.id === i.produto_id); return <tr key={i.produto_id} className="border-t border-slate-100"><td className="px-3 py-2"><strong>{p?.codigo}</strong> — {p?.nome}</td><td className="px-3 py-2 tabular-nums">{Number(p?.estoque_atual ?? 0).toLocaleString('pt-BR')}</td><td className="px-3 py-2"><input aria-label={'Quantidade ' + (p?.nome ?? '')} className={field + ' max-w-28'} type="number" min="0.0001" step="any" value={i.quantidade} onChange={e => setDraft(old => old.map(x => x.produto_id === i.produto_id ? { ...x, quantidade: e.target.value } : x))}/></td><td className="px-3 py-2">{p?.unidade || 'UN'}</td><td className="px-3 py-2 text-right"><button type="button" aria-label="Remover item" onClick={() => setDraft(old => old.filter(x => x.produto_id !== i.produto_id))} className="inline-flex h-[30px] w-[30px] items-center justify-center border border-rose-200 text-rose-700"><Trash2 size={13}/></button></td></tr> })}{draft.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Adicione peças do estoque real para compor a baixa.</td></tr>}</tbody></table></div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#D8E8EE] p-3"><button type="button" className="inline-flex h-[30px] items-center gap-1 border border-slate-300 px-3 text-[10px]" onClick={() => setDraft([])}><Minus size={12}/> LIMPAR</button><button type="button" disabled={busy || draft.length === 0 || !selectedOrder} className={action} onClick={() => void submit()}><Wrench size={13}/> CONFIRMAR BAIXA ATÔMICA</button></div>
      </section>
      <section className="border border-[#D8E8EE] bg-white">
        <div className="border-b border-[#D8E8EE] px-3 py-2"><h2 className="text-[11px] font-semibold">Movimentações de consumo registradas</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="bg-[#EAF4F7] text-[9px] uppercase"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Documento / O.S.</th><th className="px-3 py-2">Peça</th><th className="px-3 py-2">Qtd.</th><th className="px-3 py-2">Observação</th></tr></thead><tbody className="text-[10px]">{history.slice(0, 100).map(m => <tr key={m.id} className="border-t border-slate-100"><td className="px-3 py-2">{new Date(m.created_at).toLocaleString('pt-BR')}</td><td className="px-3 py-2">{m.documento || '—'}</td><td className="px-3 py-2">{productName(m.produto_id)}</td><td className="px-3 py-2">{Number(m.quantidade).toLocaleString('pt-BR')}</td><td className="px-3 py-2">{m.observacao || '—'}</td></tr>)}{history.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Nenhum consumo de manutenção registrado.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </main>
}
