import {useEffect,useMemo,useState} from 'react'
import {ClipboardList,RefreshCw,Plus,Search,Users,Package,ShoppingCart,ArrowRight,Filter,Eye,Save} from 'lucide-react'
import {supabase} from '../lib/supabaseClient'

type Client={id:string;nome:string;documento:string|null}
type Product={id:string;codigo:string;nome:string;preco_venda:number}
type Order={id:string;numero:number;cliente_id:string;status:string;total:number;data_entrega_prometida:string|null;created_at:string}

type Area='pendentes'|'pedidos'|'clientes'|'consultas'

export default function ComercialSuprimentos(){
 const[area,setArea]=useState<Area>('pendentes')
 const[clients,setClients]=useState<Client[]>([])
 const[products,setProducts]=useState<Product[]>([])
 const[orders,setOrders]=useState<Order[]>([])
 const[search,setSearch]=useState('')
 const[busy,setBusy]=useState(false)
 const[msg,setMsg]=useState('')
 const[form,setForm]=useState({cliente_id:'',produto_id:'',quantidade:'1',valor:'0',entrega:''})

 async function load(){
  setBusy(true)
  const[c,p,o]=await Promise.all([
   supabase.from('erp_clientes').select('id,nome,documento').eq('ativo',true).order('nome'),
   supabase.from('erp_produtos').select('id,codigo,nome,preco_venda').eq('ativo',true).order('codigo'),
   supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrega_prometida,created_at').order('numero',{ascending:false})
  ])
  setClients((c.data||[]) as Client[])
  setProducts((p.data||[]) as Product[])
  setOrders((o.data||[]) as Order[])
  if(c.error||p.error||o.error) setMsg(c.error?.message||p.error?.message||o.error?.message||'Erro ao consultar o Comercial.')
  setBusy(false)
 }

 useEffect(()=>{void load()},[])

 const clientName=(id:string)=>clients.find(c=>c.id===id)?.nome||'Cliente não identificado'
 const pending=useMemo(()=>orders.filter(o=>!['Faturado','Cancelado'].includes(String(o.status))),[orders])
 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase()
  if(!q)return orders
  return orders.filter(o=>String(o.numero).includes(q)||clientName(o.cliente_id).toLowerCase().includes(q)||String(o.status).toLowerCase().includes(q))
 },[orders,search])

 async function saveOrder(){
  if(!form.cliente_id||!form.produto_id)return setMsg('Selecione cliente e produto.')
  const q=Number(form.quantidade),v=Number(form.valor),total=q*v
  if(q<=0||v<0)return setMsg('Informe quantidade e valor válidos.')
  setBusy(true);setMsg('')
  const max=orders.reduce((m,o)=>Math.max(m,Number(o.numero)||0),0)
  const p=await supabase.from('erp_pedidos_venda').insert({
   numero:max+1,cliente_id:form.cliente_id,status:'Pendente',total,observacoes:null,data_entrega_prometida:form.entrega||null
  }).select('id').single()
  if(p.error){setMsg(p.error.message);setBusy(false);return}
  const i=await supabase.from('erp_pedidos_venda_itens').insert({
   pedido_id:p.data.id,produto_id:form.produto_id,descricao:products.find(x=>x.id===form.produto_id)?.nome||'',quantidade:q,valor_unitario:v,desconto:0,total
  })
  if(i.error){setMsg(i.error.message);setBusy(false);return}
  setMsg(`Pedido PV-${max+1} criado e mantido nesta central de Vendas.`)
  setForm({cliente_id:'',produto_id:'',quantidade:'1',valor:'0',entrega:''})
  await load();setArea('pendentes');setBusy(false)
 }

 async function updateStatus(id:string,status:string){
  setBusy(true);const r=await supabase.from('erp_pedidos_venda').update({status}).eq('id',id)
  if(r.error)setMsg(r.error.message);else setMsg('Status atualizado.')
  await load();setBusy(false)
 }

 return <main className="erp-page-v3">
  <header className="erp-page-header-v3">
   <div><span className="erp-eyebrow">VENDAS • CENTRAL COMERCIAL</span><h1>Vendas e Pedidos</h1><p>Uma única central para cadastro, lançamento e consulta comercial. Nada desta tela redireciona para outro módulo.</p></div>
   <button className="erp-btn-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={18}/> Atualizar</button>
  </header>

  <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
   <button className={`erp-card-v3 text-left ${area==='pendentes'?'ring-2':''}`} onClick={()=>setArea('pendentes')}><ClipboardList/><strong>{pending.length}</strong><span>Pedidos Pendentes</span><small>Consulta operacional</small></button>
   <button className={`erp-card-v3 text-left ${area==='pedidos'?'ring-2':''}`} onClick={()=>setArea('pedidos')}><ShoppingCart/><strong>{orders.length}</strong><span>Pedidos de Venda</span><small>Cadastro / lançamento</small></button>
   <button className={`erp-card-v3 text-left ${area==='clientes'?'ring-2':''}`} onClick={()=>setArea('clientes')}><Users/><strong>{clients.length}</strong><span>Clientes</span><small>Cadastro / consulta</small></button>
   <button className={`erp-card-v3 text-left ${area==='consultas'?'ring-2':''}`} onClick={()=>setArea('consultas')}><Search/><strong>{orders.filter(o=>String(o.status).toLowerCase()!=='faturado').length}</strong><span>Consultas</span><small>Carteira e histórico</small></button>
  </section>

  <nav className="erp-tabs-v3">
   <button className={area==='pendentes'?'active':''} onClick={()=>setArea('pendentes')}><ClipboardList size={17}/> Pedidos Pendentes</button>
   <button className={area==='pedidos'?'active':''} onClick={()=>setArea('pedidos')}><ShoppingCart size={17}/> Pedidos de Venda</button>
   <button className={area==='clientes'?'active':''} onClick={()=>setArea('clientes')}><Users size={17}/> Cadastro de Clientes</button>
   <button className={area==='consultas'?'active':''} onClick={()=>setArea('consultas')}><Search size={17}/> Consultas</button>
  </nav>

  {msg&&<div className="erp-card-v3 mb-4">{msg}</div>}

  {area==='pendentes'&&<section className="erp-card-v3">
   <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2>Pedidos Pendentes</h2><p>Carteira que ainda não foi faturada. É uma consulta própria de Vendas e permanece nesta central.</p></div><button className="erp-btn-primary" onClick={()=>setArea('pedidos')}><Plus size={18}/> Novo Pedido</button></div>
   <OrderTable orders={pending} clientName={clientName} onStatus={updateStatus}/>
  </section>}

  {area==='pedidos'&&<section className="erp-card-v3">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Cadastro de Pedidos de Venda</h2><p>Lançamento do pedido comercial. Ao salvar, ele aparece imediatamente em Pedidos Pendentes.</p></div></div>
   <div className="grid md:grid-cols-2 gap-4 mt-5">
    <label>Cliente<select value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
    <label>Produto<select value={form.produto_id} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setForm({...form,produto_id:e.target.value,valor:String(p?.preco_venda||0)})}}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label>
    <label>Quantidade<input type="number" min="1" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})}/></label>
    <label>Valor Unitário<input type="number" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></label>
    <label>Entrega prometida<input type="date" value={form.entrega} onChange={e=>setForm({...form,entrega:e.target.value})}/></label>
   </div>
   <button className="erp-btn-primary mt-5" disabled={busy} onClick={()=>void saveOrder()}><Save size={18}/> Salvar Pedido</button>
   <div className="mt-7"><h3>Últimos pedidos cadastrados</h3><OrderTable orders={orders.slice(0,10)} clientName={clientName} onStatus={updateStatus}/></div>
  </section>}

  {area==='clientes'&&<section className="erp-card-v3">
   <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2>Cadastro de Clientes</h2><p>Cadastro separado da consulta de pedidos. A lista abaixo consulta o cadastro mestre existente.</p></div><span className="erp-badge-warn">{clients.length} clientes ativos</span></div>
   <div className="erp-table-scroll"><table className="erp-table-v3"><thead><tr><th>Nome / Razão Social</th><th>CPF / CNPJ</th><th>Ação</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td>{c.nome}</td><td>{c.documento||'—'}</td><td><button className="erp-btn-secondary" onClick={()=>{setSearch(c.nome);setArea('consultas')}}><Eye size={16}/> Ver pedidos</button></td></tr>)}</tbody></table></div>
  </section>}

  {area==='consultas'&&<section className="erp-card-v3">
   <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2>Consultas de Vendas</h2><p>Consulta da carteira completa sem misturar com cadastro ou lançamento.</p></div><div className="flex items-center gap-2"><Filter size={18}/><input className="min-w-[280px]" placeholder="Pedido, cliente ou status..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
   <OrderTable orders={filtered} clientName={clientName} onStatus={updateStatus}/>
  </section>}

  <footer className="mt-6 text-sm text-slate-500">Central Vendas • Clientes • Pedidos • Consultas — navegação interna exclusiva de <b>/comercial</b>.</footer>
 </main>
}

function OrderTable({orders,clientName,onStatus}:{orders:Order[];clientName:(id:string)=>string;onStatus:(id:string,status:string)=>void}){
 return <div className="erp-table-scroll"><table className="erp-table-v3"><thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Total</th><th>Entrega</th><th>Ações</th></tr></thead><tbody>{orders.length===0?<tr><td colSpan={6}>Nenhum pedido encontrado.</td></tr>:orders.map(o=><tr key={o.id}><td><b>PV-{o.numero}</b></td><td>{clientName(o.cliente_id)}</td><td><span className="erp-badge-warn">{o.status}</span></td><td>R$ {Number(o.total||0).toFixed(2)}</td><td>{o.data_entrega_prometida||'—'}</td><td><div className="flex flex-wrap gap-2"><button className="erp-btn-secondary" onClick={()=>onStatus(o.id,'Em Produção')}><ArrowRight size={15}/> Enviar para produção</button><button className="erp-btn-secondary" onClick={()=>onStatus(o.id,'Pronto para Despacho')}><Package size={15}/> Liberar</button></div></td></tr>)}</tbody></table></div>
}
