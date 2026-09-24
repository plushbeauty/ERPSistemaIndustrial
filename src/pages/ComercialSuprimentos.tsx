import {useEffect,useMemo,useState,type CSSProperties} from 'react'
import {ClipboardList,RefreshCw,Plus,Search,Users,Factory,Save,CheckCircle2,Clock3,FileText,Boxes,Eye} from 'lucide-react'
import {supabase} from '../lib/supabaseClient'

type Client={id:string;codigo:string|null;nome:string;documento:string|null}
type Product={id:string;codigo:string;nome:string;preco_venda:number;estoque_atual:number;unidade:string}
type Item={id:string;pedido_id:string;produto_id:string;codigo:string;descricao:string;quantidade:number;valor_unitario:number}
type Order={id:string;numero:number;pedido_cliente:string|null;cliente_id:string;status:string;total:number;data_entrega_prometida:string|null;created_at:string}
type OrderRow=Order&{item?:Item;pcp:string}

const compactInput:CSSProperties={width:'100%',height:38,border:'1px solid #cbd5e1',borderRadius:8,padding:'0 9px',boxSizing:'border-box',background:'#fff',color:'#0f172a',fontSize:13}
const label:CSSProperties={display:'grid',gap:5,fontSize:11,fontWeight:800,color:'#334155'}

export default function ComercialSuprimentos(){
 const[area,setArea]=useState<'pendentes'|'pedido'|'clientes'>('pendentes')
 const[clients,setClients]=useState<Client[]>([]),[products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([]),[items,setItems]=useState<Item[]>([]),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const[form,setForm]=useState({pedidoCliente:'',clienteId:'',dataEntrada:new Date().toISOString().slice(0,10),dataEntrega:'',prioridade:'3',observacao:'',produtoId:'',quantidade:'1',valor:'0'})
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id');if(empresa.error||!empresa.data)throw empresa.error??new Error('Empresa da sessão não identificada.')
   const id=String(empresa.data)
   const[c,productsData,o]=await Promise.all([
    supabase.from('erp_clientes').select('id,codigo,nome,documento').eq('empresa_id',id).eq('ativo',true).order('nome'),
    supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,estoque_atual,unidade').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_pedidos_venda').select('id,numero,pedido_cliente,cliente_id,status,total,data_entrega_prometida,created_at').eq('empresa_id',id).order('numero',{ascending:false}).limit(1000)
   ])
   if(c.error)throw c.error;if(productsData.error)throw productsData.error;if(o.error)throw o.error
   setClients((c.data??[]) as Client[]);setProducts((productsData.data??[]) as Product[]);setOrders((o.data??[]) as Order[])
   const ids=(o.data??[]).map(x=>x.id)
   if(ids.length){const it=await supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario').eq('empresa_id',id).in('pedido_id',ids).order('created_at',{ascending:true});if(it.error)throw it.error;const mapped=(it.data??[]).map((x:{id:string;pedido_id:string;produto_id:string;descricao:string;quantidade:number;valor_unitario:number})=>{const productRow=(productsData.data??[]).find((z:{id:string;codigo:string;nome:string})=>z.id===x.produto_id);return {...x,codigo:productRow?.codigo??'—'}});setItems(mapped as Item[])}else setItems([])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar a central de vendas.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const client=(id:string)=>clients.find(x=>x.id===id)
 const product=products.find(x=>x.id===form.produtoId)
 const rows=useMemo<OrderRow[]>(()=>orders.map(o=>({ ...o,item:items.find(i=>i.pedido_id===o.id),pcp:'AGUARDANDO'})),[orders,items])
 const pending=useMemo(()=>rows.filter(o=>!['faturado','cancelado','encerrado'].includes(String(o.status).toLowerCase())),[rows])
 const filtered=pending.filter(o=>{const q=search.trim().toLowerCase();if(!q)return true;const c=client(o.cliente_id);const i=o.item;return [o.numero,o.pedido_cliente,c?.codigo,c?.nome,i?.codigo,i?.descricao,o.status].some(v=>String(v??'').toLowerCase().includes(q))})
 const selectedClient=client(form.clienteId)
 function setField<K extends keyof typeof form>(key:K,value:string){setForm(v=>({...v,[key]:value}))}
 function chooseProduct(id:string){const p=products.find(x=>x.id===id);setForm(v=>({...v,produtoId:id,valor:String(p?.preco_venda??0)}))}
 async function saveOrder(){
  if(!form.clienteId||!form.produtoId)return setError('Cliente e produto são obrigatórios.')
  const q=Number(form.quantidade),v=Number(form.valor);if(q<=0||v<0)return setError('Quantidade e valor devem ser válidos.')
  setBusy(true);setError('');setMessage('')
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id');if(empresa.error||!empresa.data)throw empresa.error??new Error('Empresa não identificada.')
   const id=String(empresa.data)
   const max=orders.reduce((m,o)=>Math.max(m,Number(o.numero)||0),0)
   const pedido=await supabase.from('erp_pedidos_venda').insert({empresa_id:id,numero:max+1,pedido_cliente:form.pedidoCliente.trim()||null,cliente_id:form.clienteId,status:'Pendente',total:q*v,observacoes:form.observacao||null,data_entrega_prometida:form.dataEntrega||null}).select('id,numero').single()
   if(pedido.error)throw pedido.error
   const ins=await supabase.from('erp_pedidos_venda_itens').insert({empresa_id:id,pedido_id:pedido.data.id,produto_id:form.produtoId,descricao:product?.nome??'',quantidade:q,valor_unitario:v,desconto:0,total:q*v})
   if(ins.error)throw ins.error
   setMessage('Pedido gravado. Ele permanece PENDENTE até o responsável pelo PCP receber a demanda.')
   setForm({pedidoCliente:'',clienteId:'',dataEntrada:new Date().toISOString().slice(0,10),dataEntrega:'',prioridade:'3',observacao:'',produtoId:'',quantidade:'1',valor:'0'})
   setArea('pendentes');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar o pedido.')}finally{setBusy(false)}
 }
 async function sendToPCP(order:OrderRow){
  if(!order.item){setError('Pedido sem item. Não é possível enviar ao PCP.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id');if(empresa.error||!empresa.data)throw empresa.error??new Error('Empresa não identificada.')
   const id=String(empresa.data)
   const exists=await supabase.from('erp_ordens_producao').select('id').eq('empresa_id',id).eq('pedido_venda_id',order.id).eq('produto_id',order.item.produto_id).limit(1)
   if(exists.error)throw exists.error
   if(!exists.data?.length){
    const op=await supabase.from('erp_ordens_producao').insert({empresa_id:id,numero_op:'OP-'+order.numero+'-'+order.item.codigo,produto_id:order.item.produto_id,quantidade:Number(order.item.quantidade),status:'Aguardando PCP',pedido_venda_id:order.id,data_prevista:order.data_entrega_prometida||null,observacoes:'Demanda enviada pela Carteira de Vendas.'})
    if(op.error)throw op.error
   }
   setMessage('Demanda enviada ao PCP. A Vendas não altera o status de produção.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao enviar a demanda ao PCP.')}finally{setBusy(false)}
 }
 return <main className="erp-page-v3 commercial-compact">
  <header className="erp-page-header-v3 commercial-head"><div><span className="erp-eyebrow">COMERCIAL • VENDAS</span><h1>Pedidos de Venda</h1><p>Cadastro e carteira em uma única tela. PCP, Fiscal e Estoque são responsáveis pelos próprios estados.</p></div><button className="erp-btn-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button></header>
  {(message||error)&&<div className={error?'error':'notice'}>{error||message}</div>}
  <nav className="erp-tabs-v3 compact-tabs"><button className={area==='pendentes'?'active':''} onClick={()=>setArea('pendentes')}><ClipboardList size={16}/> Pedidos Pendentes</button><button className={area==='pedido'?'active':''} onClick={()=>setArea('pedido')}><Plus size={16}/> Cadastro de Pedido</button><button className={area==='clientes'?'active':''} onClick={()=>setArea('clientes')}><Users size={16}/> Clientes</button></nav>

  {area==='pedido'&&<section className="erp-card-v3 compact-card"><div className="section-title-line"><div><span>LANÇAMENTO</span><h2>Cadastro de Pedido de Venda</h2></div><span className="flow-note">Pedido → PCP → Fiscal → Estoque → Expedição</span></div>
   <div className="compact-form-grid">
    <label style={label}>Nº Pedido<input style={compactInput} value={orders.length?String(Math.max(...orders.map(o=>Number(o.numero)||0))+1).padStart(3,'0'):'001'} readOnly/></label>
    <label style={label}>Nº Pedido Cliente<input style={compactInput} value={form.pedidoCliente} onChange={e=>setField('pedidoCliente',e.target.value)} placeholder="Ex.: 45789"/></label>
    <label style={label}>Cliente<select style={compactInput} value={form.clienteId} onChange={e=>setField('clienteId',e.target.value)}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
    <label style={label}>Código Cliente<input style={compactInput} value={selectedClient?.codigo??''} readOnly placeholder="Auto"/></label>
    <label style={label}>Data Entrada<input style={compactInput} type="date" value={form.dataEntrada} onChange={e=>setField('dataEntrada',e.target.value)}/></label>
    <label style={label}>Data Entrega<input style={compactInput} type="date" value={form.dataEntrega} onChange={e=>setField('dataEntrega',e.target.value)}/></label>
    <label style={label}>Prioridade<select style={compactInput} value={form.prioridade} onChange={e=>setField('prioridade',e.target.value)}><option value="1">1 • Urgente</option><option value="2">2 • Alta</option><option value="3">3 • Normal</option><option value="4">4 • Baixa</option><option value="5">5 • Programada</option></select></label>
    <label style={{...label,gridColumn:'span 2'}}>Observação<input style={compactInput} value={form.observacao} onChange={e=>setField('observacao',e.target.value)} placeholder="Informação comercial do pedido"/></label>
   </div>
   <div className="compact-item-box"><div className="compact-subtitle"><span>ITEM DO PEDIDO</span><small>Descrição preenchida automaticamente pelo cadastro do produto</small></div>
    <div className="compact-item-grid">
     <label style={label}>Código Interno<select style={compactInput} value={form.produtoId} onChange={e=>chooseProduct(e.target.value)}><option value="">Selecione o código</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo}</option>)}</select></label>
     <label style={{...label,gridColumn:'span 2'}}>Descrição<input style={compactInput} value={product?.nome??''} readOnly placeholder="Auto preenchimento"/></label>
     <label style={label}>Quantidade<input style={compactInput} type="number" min="1" value={form.quantidade} onChange={e=>setField('quantidade',e.target.value)}/></label>
     <label style={label}>Unidade<input style={compactInput} value={product?.unidade??''} readOnly/></label>
     <label style={label}>Preço Unitário<input style={compactInput} type="number" min="0" step="0.01" value={form.valor} onChange={e=>setField('valor',e.target.value)}/></label>
     <label style={label}>Estoque Atual<input style={compactInput} value={product?String(product.estoque_atual):''} readOnly/></label>
    </div>
   </div>
   <div className="compact-actions"><button className="erp-btn-secondary" type="button" onClick={()=>setArea('pendentes')}>Cancelar</button><button className="erp-btn-primary" disabled={busy} onClick={()=>void saveOrder()}><Save size={16}/> Gravar Pedido</button></div>
  </section>}

  {area==='pendentes'&&<section className="erp-card-v3 compact-card"><div className="section-title-line"><div><span>CARTEIRA COMERCIAL</span><h2>Pedidos Pendentes</h2></div><button className="erp-btn-primary" onClick={()=>setArea('pedido')}><Plus size={16}/> Novo Pedido</button></div>
   <div className="pending-toolbar"><div className="pending-search"><Search size={16}/><input placeholder="Pedido, pedido cliente, cliente, código ou descrição..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{filtered.length} pedidos pendentes</span></div>
   <div className="erp-table-scroll pending-table"><table className="erp-table-v3"><thead><tr><th>Pedido</th><th>Pedido Cliente</th><th>Cliente</th><th>Cód. Cliente</th><th>Cód. Interno</th><th>Descrição</th><th>Qtd.</th><th>Entrega</th><th>PCP</th><th>Fiscal</th><th>Estoque</th><th>Ação</th></tr></thead><tbody>{filtered.map(o=>{const c=client(o.cliente_id);return <tr key={o.id}><td><b>PV-{o.numero}</b></td><td>{o.pedido_cliente||'—'}</td><td>{c?.nome||'—'}</td><td>{c?.codigo||'—'}</td><td>{o.item?.codigo||'—'}</td><td>{o.item?.descricao||'—'}</td><td>{o.item?.quantidade??'—'}</td><td>{o.data_entrega_prometida||'—'}</td><td><StatusBadge kind="pcp" value={o.pcp}/></td><td><StatusBadge kind="fiscal" value="AGUARDANDO NF"/></td><td><StatusBadge kind="estoque" value={o.item?'AGUARDANDO':'SEM ITEM'}/></td><td><div className="row-actions"><button className="erp-btn-secondary" title="Enviar demanda ao PCP" onClick={()=>void sendToPCP(o)}><Factory size={14}/> Enviar ao PCP</button><button className="erp-btn-secondary" title="Consultar pedido"><Eye size={14}/></button></div></td></tr>})}{!filtered.length&&<tr><td colSpan={12} className="crud-empty">Nenhum pedido pendente encontrado.</td></tr>}</tbody></table></div>
   <div className="status-legend"><span><i className="dot pending"/>Aguardando</span><span><i className="dot active"/>Em processamento</span><span><i className="dot done"/>Concluído</span><small>O botão de Vendas apenas encaminha a demanda ao PCP. Produção, NF e movimentação de estoque não são marcadas pela Vendas.</small></div>
  </section>}

  {area==='clientes'&&<section className="erp-card-v3 compact-card"><div className="section-title-line"><div><span>CADASTRO MESTRE</span><h2>Clientes</h2></div><button className="erp-btn-secondary" onClick={()=>location.href='/clientes'}><Users size={16}/> Abrir cadastro completo</button></div><div className="erp-table-scroll"><table className="erp-table-v3"><thead><tr><th>Código</th><th>Cliente</th><th>Documento</th><th>Status</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td>{c.codigo||'—'}</td><td>{c.nome}</td><td>{c.documento||'—'}</td><td>Ativo</td></tr>)}</tbody></table></div></section>}
 </main>
}

function StatusBadge({kind,value}:{kind:'pcp'|'fiscal'|'estoque';value:string}){
 const normalized=value.toUpperCase()
 const done=normalized.includes('AUTORIZ')||normalized.includes('LIBER')||normalized.includes('CONCLU')
 const active=normalized.includes('ENVIAD')||normalized.includes('PROCESS')
 const Icon=done?CheckCircle2:active?Clock3:kind==='fiscal'?FileText:kind==='estoque'?Boxes:Factory
 return <span className={done?'flow-badge done':active?'flow-badge active':'flow-badge pending'}><Icon size={13}/>{value}</span>
}
