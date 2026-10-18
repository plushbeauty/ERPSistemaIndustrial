/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: COCKPIT-COMERCIAL-PREMIUM-UI-OK
 * @REVISAO: COM-UI-001
 */
import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, RefreshCw, Plus, Search, Users, Package, ShoppingCart, ArrowRight, Eye, Save, TrendingUp, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Client = { id: string; nome: string; documento: string | null }
type Product = { id: string; codigo: string; nome: string; preco_venda: number }
type Order = { id: string; numero: number; cliente_id: string; status: string; total: number; data_entrega_prometida: string | null; created_at: string }
type Area = 'pendentes' | 'pedidos' | 'clientes' | 'consultas'
const input = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-100'
const label = 'grid min-w-0 gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500'
const money = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (s: string | null) => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '—'

export default function ComercialSuprimentos() {
 const [area,setArea]=useState<Area>('pendentes'),[clients,setClients]=useState<Client[]>([]),[products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([])
 const [search,setSearch]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[empresaId,setEmpresaId]=useState('')
 const [form,setForm]=useState({cliente_id:'',produto_id:'',quantidade:'1',valor:'0',entrega:''})
 async function load() {
  setBusy(true); setError('')
  try {
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data) throw company.error??new Error('Empresa da sessão não identificada.')
   const tenant=String(company.data); setEmpresaId(tenant)
   const [c,p,o]=await Promise.all([
    supabase.from('erp_clientes').select('id,nome,documento').eq('empresa_id',tenant).eq('ativo',true).order('nome'),
    supabase.from('erp_produtos').select('id,codigo,nome,preco_venda').eq('empresa_id',tenant).eq('ativo',true).order('codigo'),
    supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrega_prometida,created_at').eq('empresa_id',tenant).order('numero',{ascending:false})
   ])
   if(c.error)throw c.error;if(p.error)throw p.error;if(o.error)throw o.error
   setClients((c.data||[]) as Client[]);setProducts((p.data||[]) as Product[]);setOrders((o.data||[]) as Order[])
  } catch(e) {setError(e instanceof Error?e.message:'Falha ao carregar dados comerciais.')}
  finally {setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const clientName=(id:string)=>clients.find(c=>c.id===id)?.nome||'Cliente não identificado'
 const pending=useMemo(()=>orders.filter(o=>!['faturado','cancelado'].includes(String(o.status).toLowerCase())),[orders])
 const filtered=useMemo(()=>{const q=search.trim().toLocaleLowerCase('pt-BR');return q?orders.filter(o=>String(o.numero).includes(q)||clientName(o.cliente_id).toLocaleLowerCase('pt-BR').includes(q)||String(o.status).toLocaleLowerCase('pt-BR').includes(q)):orders},[orders,search,clients])
 const openValue=pending.reduce((sum,o)=>sum+Number(o.total||0),0)
 async function saveOrder() {
  setError('');setMessage('')
  if(!empresaId||!form.cliente_id||!form.produto_id){setError('Confirme a empresa e selecione cliente e produto ativos.');return}
  const q=Number(form.quantidade),v=Number(form.valor)
  if(!Number.isFinite(q)||q<=0||!Number.isFinite(v)||v<0){setError('Quantidade deve ser maior que zero e o preço deve ser válido.');return}
  if(!clients.some(c=>c.id===form.cliente_id)||!products.some(p=>p.id===form.produto_id)){setError('Cliente ou produto não está disponível na empresa autenticada. Atualize os dados.');return}
  setBusy(true)
  try {
   const numero=orders.reduce((m,o)=>Math.max(m,Number(o.numero)||0),0)+1,total=q*v
   const head=await supabase.from('erp_pedidos_venda').insert({empresa_id:empresaId,numero,cliente_id:form.cliente_id,status:'Pendente',total,observacoes:null,data_entrega_prometida:form.entrega||null}).select('id').single()
   if(head.error)throw head.error
   const item=await supabase.from('erp_pedidos_venda_itens').insert({empresa_id:empresaId,pedido_id:head.data.id,produto_id:form.produto_id,descricao:products.find(p=>p.id===form.produto_id)?.nome||'',quantidade:q,valor_unitario:v,desconto:0,total})
   if(item.error){setError('Cabeçalho PV-'+numero+' criado, mas o item falhou. Confira o pedido antes de repetir. '+item.error.message);await load();return}
   setMessage('Pedido PV-'+numero+' gravado com item confirmado.');setForm({cliente_id:'',produto_id:'',quantidade:'1',valor:'0',entrega:''});await load();setArea('pendentes')
  } catch(e){setError(e instanceof Error?e.message:'Falha ao gravar pedido.')}
  finally{setBusy(false)}
 }
 async function updateStatus(id:string,status:string) {
  if(!empresaId){setError('Empresa da sessão não identificada.');return}
  setBusy(true);setError('');setMessage('')
  try{const result=await supabase.from('erp_pedidos_venda').update({status}).eq('empresa_id',empresaId).eq('id',id);if(result.error)throw result.error;setMessage('Status atualizado.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar status.')}finally{setBusy(false)}
 }
 const kpis=[
  {id:'pendentes' as Area,title:'Carteira em aberto',value:String(pending.length),detail:'pedidos em andamento',color:'border-amber-500',bg:'from-amber-50 to-white',Icon:ClipboardList},
  {id:'pedidos' as Area,title:'Pedidos registrados',value:String(orders.length),detail:'empresa autenticada',color:'border-sky-600',bg:'from-sky-50 to-white',Icon:ShoppingCart},
  {id:'clientes' as Area,title:'Clientes ativos',value:String(clients.length),detail:'cadastro mestre',color:'border-violet-500',bg:'from-violet-50 to-white',Icon:Users},
  {id:'consultas' as Area,title:'Valor em aberto',value:money(openValue),detail:'exclui faturados/cancelados',color:'border-emerald-500',bg:'from-emerald-50 to-white',Icon:TrendingUp}
 ]
 return <VendasLayout title="Cockpit Comercial e Suprimentos" subtitle="Carteira, lançamento de pedidos e acompanhamento comercial" onRefresh={()=>void load()}>
  <main className="space-y-3 bg-[#F4FBFD] p-2 text-[11px] text-[#123B50]">
   <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"><div><span className="text-[9px] font-black uppercase tracking-widest text-sky-700">VENDAS • OPERAÇÃO COMERCIAL</span><h2 className="text-base font-black">Visão executiva da carteira</h2></div><div className="flex gap-1.5"><Link to="/ajuda/comercial-suprimentos" className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><Eye size={12}/> POP</Link><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><RefreshCw size={12} className={busy?'animate-spin':''}/> Atualizar</button></div></header>
   {error&&<div role="alert" className="flex gap-2 border border-red-300 bg-red-50 p-2 font-semibold text-red-800"><AlertCircle size={13} className="shrink-0"/>{error}</div>}
   {message&&<div role="status" className="border border-emerald-300 bg-emerald-50 p-2 font-semibold text-emerald-800">{message}</div>}
   <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(k=>{const Icon=k.Icon;return <button type="button" key={k.id} onClick={()=>setArea(k.id)} className={'min-w-0 border border-slate-200 border-l-4 '+k.color+' bg-gradient-to-br '+k.bg+' p-3 text-left shadow-sm hover:shadow '+(area===k.id?'ring-1 ring-sky-500':'')}><span className="flex items-center justify-between text-[9px] font-black uppercase tracking-wide text-slate-500">{k.title}<Icon size={15}/></span><strong className="mt-2 block truncate text-xl font-black tabular-nums text-slate-800">{k.value}</strong><span className="mt-1 block text-[9px] text-slate-500">{k.detail}</span></button>})}</section>
   <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
    <nav aria-label="Áreas comerciais" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1">{([{id:'pendentes',title:'Pendentes',Icon:ClipboardList},{id:'pedidos',title:'Lançar pedido',Icon:Plus},{id:'clientes',title:'Clientes',Icon:Users},{id:'consultas',title:'Histórico e consultas',Icon:Search}] as const).map(t=>{const Icon=t.Icon;return <button type="button" key={t.id} onClick={()=>setArea(t.id)} className={'inline-flex h-8 items-center gap-1 border px-3 text-[10px] font-bold '+(area===t.id?'border-sky-700 bg-[#123B50] text-white':'border-transparent bg-white text-slate-600 hover:bg-slate-100')}><Icon size={12}/>{t.title}</button>})}</nav>
    {area==='pendentes'&&<section className="space-y-2 p-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Fila comercial pendente</h3><p className="text-[10px] text-slate-500">Pedidos reais ainda não faturados ou cancelados.</p></div><button type="button" onClick={()=>setArea('pedidos')} className="inline-flex h-8 items-center gap-1 bg-sky-700 px-3 text-[10px] font-black uppercase text-white"><Plus size={12}/> Novo PV</button></div><OrderTable orders={pending} clientName={clientName} onStatus={updateStatus} busy={busy}/></section>}
    {area==='pedidos'&&<section className="space-y-3 p-3"><div><h3 className="font-black">Lançamento de pedido de venda</h3><p className="text-[10px] text-slate-500">Campos compactos e alinhados em 12 colunas.</p></div><div className="grid grid-cols-1 gap-2 md:grid-cols-12">
     <label className={label+' md:col-span-5'}>Cliente / comprador *<select required value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})} className={input}><option value="">Selecione o cliente...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
     <label className={label+' md:col-span-5'}>Produto / insumo *<select required value={form.produto_id} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setForm({...form,produto_id:e.target.value,valor:String(p?.preco_venda??0)})}} className={input}><option value="">Selecione o produto...</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label>
     <label className={label+' md:col-span-2'}>Quantidade *<input type="number" min="0.001" step="any" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})} className={input+' text-right'}/></label>
     <label className={label+' md:col-span-3'}>Preço unitário R$ *<input type="number" min="0" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={input+' text-right'}/></label>
     <label className={label+' md:col-span-3'}>Entrega prometida<input type="date" value={form.entrega} onChange={e=>setForm({...form,entrega:e.target.value})} className={input}/></label>
     <div className="flex items-end md:col-span-3"><div className="w-full border border-slate-200 bg-slate-50 px-2 py-1"><span className="block text-[9px] font-black uppercase text-slate-500">Total calculado</span><strong className="block text-sm font-black">{money(Number(form.quantidade)*Number(form.valor))}</strong></div></div>
     <div className="flex items-end md:col-span-3"><button type="button" disabled={busy} onClick={()=>void saveOrder()} className="inline-flex h-8 w-full items-center justify-center gap-1 bg-teal-700 px-3 text-[10px] font-black uppercase text-white disabled:opacity-50"><Save size={12}/>{busy?'Gravando...':'Gravar PV'}</button></div>
    </div><div className="border-t border-slate-200 pt-3"><h4 className="mb-2 text-[10px] font-black uppercase text-slate-600">Últimos lançamentos</h4><OrderTable orders={orders.slice(0,5)} clientName={clientName} onStatus={updateStatus} busy={busy}/></div></section>}
    {area==='clientes'&&<section className="p-2"><header className="mb-2 flex items-center justify-between"><div><h3 className="font-black">Carteira de clientes</h3><p className="text-[10px] text-slate-500">Cadastro mestre da empresa autenticada.</p></div><span className="border border-violet-200 bg-violet-50 px-2 py-1 text-[9px] font-black">{clients.length} CLIENTES</span></header><div className="overflow-x-auto"><table className="w-full min-w-[500px] border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr className="h-8"><th className="px-2">Razão social / nome</th><th className="px-2">CPF / CNPJ</th><th className="px-2 text-right">Ação</th></tr></thead><tbody>{clients.map(c=><tr key={c.id} className="h-8 border-b border-slate-100 even:bg-slate-50"><td className="px-2 font-semibold">{c.nome}</td><td className="px-2">{c.documento||'—'}</td><td className="px-2 text-right"><button type="button" onClick={()=>{setSearch(c.nome);setArea('consultas')}} className="inline-flex h-6 items-center gap-1 border border-slate-300 px-2 text-[9px] font-bold"><Eye size={10}/> Ver pedidos</button></td></tr>)}</tbody></table>{!clients.length&&<p className="p-4 text-center text-slate-500">Nenhum cliente ativo.</p>}</div></section>}
    {area==='consultas'&&<section className="space-y-2 p-2"><div><h3 className="font-black">Histórico de pedidos</h3><p className="text-[10px] text-slate-500">Busca por número, cliente ou status.</p></div><label className="flex h-8 items-center gap-2 border border-slate-300 bg-white px-2"><Search size={13}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido, cliente ou status..." className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label><OrderTable orders={filtered} clientName={clientName} onStatus={updateStatus} busy={busy}/></section>}
   </section>
   <footer className="flex justify-between border-t border-slate-200 pt-2 text-[9px] text-slate-500"><span>Dados reais • escopo da empresa autenticada</span><span>{orders.length} pedidos carregados</span></footer>
  </main>
 </VendasLayout>
}
function OrderTable({orders,clientName,onStatus,busy}:{orders:Order[];clientName:(id:string)=>string;onStatus:(id:string,status:string)=>void;busy:boolean}) {
 return <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[820px] border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr className="h-8"><th className="px-2">Pedido</th><th className="px-2">Cliente</th><th className="px-2">Status</th><th className="px-2 text-right">Total</th><th className="px-2">Entrega</th><th className="px-2">Workflow</th></tr></thead><tbody>{orders.length===0?<tr><td colSpan={6} className="h-12 text-center text-slate-500">Nenhum registro localizado.</td></tr>:orders.map(o=><tr key={o.id} className="h-11 border-b border-slate-100 even:bg-slate-50 hover:bg-sky-50/50"><td className="px-2 font-black text-sky-900">PV-{o.numero}</td><td className="max-w-[220px] truncate px-2">{clientName(o.cliente_id)}</td><td className="px-2"><span className="border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold">{o.status}</span></td><td className="px-2 text-right font-mono font-bold">{money(o.total)}</td><td className="px-2">{date(o.data_entrega_prometida)}</td><td className="px-2"><div className="flex gap-1"><button type="button" disabled={busy} onClick={()=>onStatus(o.id,'Em Produção')} className="inline-flex h-6 items-center gap-1 border border-sky-200 bg-sky-50 px-2 text-[9px] font-bold text-sky-800"><ArrowRight size={10}/> PCP</button><button type="button" disabled={busy} onClick={()=>onStatus(o.id,'Pronto para Despacho')} className="inline-flex h-6 items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 text-[9px] font-bold text-emerald-800"><Package size={10}/> Liberar</button></div></td></tr>)}</tbody></table></div>
}
