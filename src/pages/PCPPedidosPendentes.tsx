/**
 * =========================================================================
 * SYSNQRA SISTEMAS INDUSTRIAIS — PCP & GESTÃO COMERCIAL
 * Módulo: Carteira de Pedidos Pendentes e Atendimento de Estoque
 * Arquivo: src/pages/PCPPedidosPendentes.tsx
 * Revisão: IT-PCP-PEDIDOS-004 | 2026-10-21
 * Dados reais: Supabase autenticado, tenant atual e paginação integral.
 * Não utiliza view presumida, registros simulados ou criação direta de OP.
 * A criação é confirmada na tela PCPOrdens, com pedido/item/produto pré-selecionados.
 * =========================================================================
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Factory, Filter, Package, RefreshCw, Search, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id: string; codigo: string; nome: string; estoque_atual: number | null; unidade?: string | null }
type SalesOrder = { id: string; numero: number | string; cliente_id: string | null; status: string; data_entrada?: string | null; data_entrega_prometida?: string | null }
type SalesItem = { id: string; pedido_id: string; produto_id: string; quantidade: number }
type ProductionOrder = { pedido_item_id?: string | null; produto_id: string | null; pedido_venda_id: string | null; quantidade?: number | null; quantidade_planejada?: number | null; status: string }
type Client = { id: string; nome: string }
type Row = {
  itemId: string; pedidoId: string; pedidoCodigo: string; clienteNome: string
  dataEntrada: string | null; dataEntrega: string | null; produtoId: string
  codigo: string; produto: string; unidade: string; solicitada: number
  estoque: number; emOP: number; falta: number; statusPcp: string
}
const inputClass = 'h-[30px] w-full min-w-0 rounded-[2px] border border-[#2E4A62] bg-[#0E1E2F] px-2.5 text-[11px] font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#48B7C7]'
const btnClass = 'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] border px-3 text-[10px] font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50'
const activeStatus = (status: string) => !['concluido','concluída','concluida','cancelado','cancelada','rejeitado','rejeitada','finalizado','finalizada'].includes(String(status || '').trim().toLowerCase())
const dateBR = (value?: string | null) => value ? new Date(value + (value.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'
const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export default function PCPPedidosPendentes() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'TODOS' | 'FALTA' | 'DISPONIVEL'>('TODOS')
  const [pcpFilter, setPcpFilter] = useState<'TODOS' | 'AGUARDANDO' | 'EM_OP'>('TODOS')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw tenant.error ?? new Error('Empresa da sessão não identificada.')
      const empresaId = String(tenant.data)
      const [products, orders, items, productionOrders, clients] = await Promise.all([
        fetchAllPages<Product>((from, to) => supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,unidade',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
        fetchAllPages<SalesOrder>((from, to) => supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,data_entrada,data_entrega_prometida',{count:'exact'}).eq('empresa_id',empresaId).order('numero',{ascending:false}).range(from,to)),
        fetchAllPages<SalesItem>((from, to) => supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,quantidade',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
        fetchAllPages<ProductionOrder>((from, to) => supabase.from('erp_ordens_producao').select('pedido_item_id,produto_id,pedido_venda_id,quantidade,quantidade_planejada,status',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
        fetchAllPages<Client>((from, to) => supabase.from('erp_clientes').select('id,nome',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('nome').range(from,to))
      ])
      const productMap = new Map(products.map(p => [p.id,p]))
      const clientMap = new Map(clients.map(c => [c.id,c.nome]))
      const orderMap = new Map(orders.map(o => [o.id,o]))
      const activeOps = productionOrders.filter(o => activeStatus(o.status))
      const itemLinkedQty = new Map<string,number>()
      const orderLinkedQty = new Map<string,number>()
      activeOps.forEach(op => {
        const qty = Number(op.quantidade_planejada ?? op.quantidade ?? 0)
        if (op.pedido_item_id) itemLinkedQty.set(op.pedido_item_id,(itemLinkedQty.get(op.pedido_item_id) ?? 0) + qty)
        if (op.pedido_venda_id && !op.pedido_item_id) orderLinkedQty.set(op.pedido_venda_id,(orderLinkedQty.get(op.pedido_venda_id) ?? 0) + qty)
      })
      const nextRows: Row[] = []
      items.forEach(item => {
        const order = orderMap.get(item.pedido_id)
        if (!order || !activeStatus(order.status)) return
        const product = productMap.get(item.produto_id)
        if (!product) return
        const requested = Number(item.quantidade || 0)
        const stock = Math.max(0,Number(product.estoque_atual || 0))
        const linked = itemLinkedQty.get(item.id) ?? orderLinkedQty.get(order.id) ?? 0
        const shortage = Math.max(0,requested - stock - linked)
        if (shortage <= 0) return
        nextRows.push({
          itemId:item.id,pedidoId:order.id,pedidoCodigo:String(order.numero),clienteNome:clientMap.get(order.cliente_id || '') || 'Cliente não identificado',
          dataEntrada:order.data_entrada ?? null,dataEntrega:order.data_entrega_prometida ?? null,produtoId:product.id,
          codigo:product.codigo,produto:product.nome,unidade:product.unidade || 'un',solicitada:requested,estoque:stock,emOP:linked,falta:shortage,
          statusPcp:linked > 0 ? 'OP VINCULADA' : 'AGUARDANDO PCP'
        })
      })
      nextRows.sort((a,b) => (a.dataEntrega || '9999-12-31').localeCompare(b.dataEntrega || '9999-12-31') || a.pedidoCodigo.localeCompare(b.pedidoCodigo))
      setRows(nextRows)
    } catch(e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar a carteira real de pedidos.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => rows.filter(r => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [r.pedidoCodigo,r.clienteNome,r.codigo,r.produto].join(' ').toLowerCase().includes(q)
    const matchesStock = stockFilter === 'TODOS' || (stockFilter === 'FALTA' ? r.estoque < r.solicitada : r.estoque >= r.solicitada)
    const matchesPcp = pcpFilter === 'TODOS' || (pcpFilter === 'EM_OP' ? r.emOP > 0 : r.emOP === 0)
    return matchesSearch && matchesStock && matchesPcp
  }),[rows,search,stockFilter,pcpFilter])
  const totalShortage = filtered.reduce((sum,r)=>sum+r.falta,0)
  const ordersCount = new Set(filtered.map(r=>r.pedidoId)).size
  const openInPCP = (row: Row) => {
    const params = new URLSearchParams({ origem:'carteira-pcp', pedidoId:row.pedidoId, itemId:row.itemId, produtoId:row.produtoId, quantidade:String(row.falta) })
    navigate('/pcp/ordens?' + params.toString())
  }

  return <main className="min-h-screen bg-[#0E1E2F] p-3 font-mono text-[#F4FBFD] antialiased md:p-5">
    <div className="mx-auto max-w-[1750px] space-y-3">
      <header className="flex flex-wrap items-center gap-3 rounded-[3px] border border-[#2E4A62] bg-[#0D2638] p-3 shadow-xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#48B7C7]/30 bg-[#123B50] text-[#48B7C7]"><ShoppingCart size={21}/></span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-[#48B7C7]">SYSNQRA SISTEMAS INDUSTRIAIS <span className="text-slate-400">/ PCP · CARTEIRA COMERCIAL</span></div><h1 className="text-[17px] font-black">Pedidos Pendentes de Atendimento</h1><p className="text-[10px] text-slate-300">Saldo físico, OPs vinculadas e necessidade líquida de fabricação por item do pedido.</p></div>
        <div className="ml-auto flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} disabled={loading} className={btnClass+' border-[#2E4A62] bg-[#0E1E2F] text-white hover:bg-[#123B50]'}><RefreshCw size={13} className={loading?'animate-spin':''}/> Atualizar carteira</button><button type="button" onClick={()=>navigate('/pcp/ordens')} className={btnClass+' border-[#48B7C7] bg-[#2D8DB8] text-white hover:bg-[#236F91]'}><Factory size={13}/> Fila de OPs <ArrowRight size={13}/></button></div>
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-rose-500/50 bg-rose-950/40 p-3 text-[11px] text-rose-100"><AlertTriangle size={15} className="mt-0.5 shrink-0"/><div><strong>Não foi possível carregar os pedidos.</strong><div>{error}</div><span className="text-rose-200/80">Nenhum dado de demonstração foi inserido.</span></div></div>}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <article className="rounded-[2px] border border-[#2E4A62] bg-[#0D2638] p-3"><div className="text-[9px] font-black uppercase text-slate-400">Pedidos com saldo pendente</div><div className="mt-1 text-2xl font-black">{ordersCount}</div><div className="text-[9px] text-slate-400">Pedidos distintos após filtros</div></article>
        <article className="rounded-[2px] border border-[#2E4A62] bg-[#0D2638] p-3"><div className="text-[9px] font-black uppercase text-slate-400">Itens para análise do PCP</div><div className="mt-1 text-2xl font-black">{filtered.length}</div><div className="text-[9px] text-slate-400">Linhas reais da carteira comercial</div></article>
        <article className="rounded-[2px] border border-amber-600/40 bg-[#332719] p-3"><div className="text-[9px] font-black uppercase text-amber-200">Necessidade líquida de fabricação</div><div className="mt-1 text-2xl font-black text-amber-100">{fmt(totalShortage)}</div><div className="text-[9px] text-amber-200/80">Unidades conforme unidade cadastrada no produto</div></article>
      </section>
      <section className="rounded-[3px] border border-[#2E4A62] bg-[#0D2638] p-3">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#48B7C7]"><Filter size={14}/> Pesquisa e filtros de fluxo</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-12">
          <label className="relative block xl:col-span-6"><span className="mb-1 block text-[9px] font-black uppercase text-[#A8BBC8]">Pedido, cliente, código ou descrição</span><Search size={13} className="absolute left-2.5 top-[27px] text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} className={inputClass+' pl-8'} placeholder="Pesquisar carteira..."/></label>
          <label className="block xl:col-span-3"><span className="mb-1 block text-[9px] font-black uppercase text-[#A8BBC8]">Atendimento de estoque</span><select value={stockFilter} onChange={e=>setStockFilter(e.target.value as typeof stockFilter)} className={inputClass}><option value="TODOS">Todos</option><option value="FALTA">Falta fabricar</option><option value="DISPONIVEL">Estoque cobre o pedido</option></select></label>
          <label className="block xl:col-span-3"><span className="mb-1 block text-[9px] font-black uppercase text-[#A8BBC8]">Situação no PCP</span><select value={pcpFilter} onChange={e=>setPcpFilter(e.target.value as typeof pcpFilter)} className={inputClass}><option value="TODOS">Todos</option><option value="AGUARDANDO">Aguardando OP</option><option value="EM_OP">Já possui OP vinculada</option></select></label>
        </div>
      </section>
      <section className="overflow-hidden rounded-[3px] border border-[#2E4A62] bg-[#0D2638]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62] bg-[#123B50] px-3 py-2"><div className="flex items-center gap-2 text-[10px] font-black uppercase"><ClipboardList size={14} className="text-[#48B7C7]"/> Esteira de pedidos pendentes <span className="rounded-[2px] bg-white/10 px-1.5 py-0.5 text-[9px]">{filtered.length} itens</span></div><span className="text-[9px] text-slate-300">Ordenação por data prometida e número do pedido</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-[10px]"><thead className="bg-[#091A28] text-[9px] uppercase tracking-wider text-[#A8BBC8]"><tr><th className="px-3 py-2">Cliente / Pedido</th><th className="px-3 py-2">Entrada</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Descrição do produto</th><th className="px-3 py-2">Entrega</th><th className="px-3 py-2 text-right">Qtd. pedida</th><th className="px-3 py-2 text-right">Estoque</th><th className="px-3 py-2 text-right">Em OP</th><th className="px-3 py-2 text-right">Falta fabricar</th><th className="px-3 py-2">PCP</th><th className="px-3 py-2 text-right">Ação</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={r.itemId} className={'border-t border-[#2E4A62] '+(i%2?'bg-[#0B2030]':'bg-[#0D2638]')}><td className="px-3 py-2"><div className="font-black text-white">PV-{r.pedidoCodigo}</div><div className="mt-0.5 text-[9px] text-slate-300">{r.clienteNome}</div></td><td className="px-3 py-2 text-slate-300">{dateBR(r.dataEntrada)}</td><td className="px-3 py-2 font-bold text-[#48B7C7]">{r.codigo}</td><td className="max-w-[280px] px-3 py-2 text-slate-200">{r.produto}</td><td className="px-3 py-2 text-slate-300">{dateBR(r.dataEntrega)}</td><td className="px-3 py-2 text-right font-bold">{fmt(r.solicitada)}</td><td className="px-3 py-2 text-right">{fmt(r.estoque)}</td><td className="px-3 py-2 text-right">{fmt(r.emOP)}</td><td className="px-3 py-2 text-right"><span className="inline-flex rounded-[2px] bg-amber-500/15 px-2 py-1 font-black text-amber-200">{fmt(r.falta)} {r.unidade}</span></td><td className="px-3 py-2"><span className={'rounded-[2px] border px-1.5 py-1 text-[8px] font-black '+(r.emOP>0?'border-sky-400/30 bg-sky-500/10 text-sky-200':'border-amber-400/30 bg-amber-500/10 text-amber-200')}>{r.statusPcp}</span></td><td className="px-3 py-2 text-right"><button type="button" onClick={()=>openInPCP(r)} className="inline-flex h-[28px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-2.5 text-[9px] font-black uppercase text-white hover:bg-[#236F91]"><Package size={12}/> Vincular e gerar OP <ArrowRight size={12}/></button></td></tr>)}{!filtered.length&&<tr><td colSpan={11} className="px-4 py-12 text-center text-[11px] text-slate-300">{loading?'Carregando carteira real do Supabase...':error?'Corrija o erro de carregamento para consultar a carteira.':'Nenhum pedido com saldo pendente corresponde aos filtros.'}</td></tr>}</tbody></table></div>
        <footer className="flex items-center gap-2 border-t border-[#2E4A62] px-3 py-2 text-[9px] text-slate-400"><CheckCircle2 size={12} className="text-[#48B7C7]"/> A criação da OP exige confirmação na tela de PCPOrdens. Esta carteira não gera OPs silenciosamente.</footer>
      </section>
    </div>
  </main>
}
