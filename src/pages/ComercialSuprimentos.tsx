import {useEffect,useMemo,useState} from 'react'
import {CheckCircle2,FileDown,Filter,Plus,RefreshCw,Search,ShoppingCart,Truck,UploadCloud,X,Save,Factory} from 'lucide-react'
import {supabase} from '../lib/supabaseClient'

type Client={id:string;nome:string;documento:string|null}
type Product={id:string;codigo:string;nome:string;preco_venda:number;estoque_atual:number;unidade:string;referencia_cliente:string|null}
type Order={id:string;numero:number;cliente_id:string;status:string;total:number;data_entrega_prometida:string|null;created_at:string;pedido_cliente:string|null}
type Item={id:string;pedido_id:string;produto_id:string|null;descricao:string;quantidade:number;valor_unitario:number;total:number;produto_cliente:string|null;data_fabricacao:string|null;lote_fabricacao:string|null}
type OP={id:string;numero_op:string;produto_id:string|null;pedido_venda_id:string|null;quantidade:number;status:string;data_prevista:string|null}
type Program={ordem_producao_id:string;inicio_real:string|null;fim_real:string|null;quantidade_produzida:number;quantidade_refugada:number;status:string}

const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateBR=(v:string|null)=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'—'

export default function ComercialSuprimentos(){
 const [empresaId,setEmpresaId]=useState('')
 const [clients,setClients]=useState<Client[]>([])
 const [products,setProducts]=useState<Product[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [items,setItems]=useState<Item[]>([])
 const [ops,setOps]=useState<OP[]>([])
 const [programs,setPrograms]=useState<Program[]>([])
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [statusFilter,setStatusFilter]=useState('TODOS')
 const [clientQuery,setClientQuery]=useState('')
 const [productQuery,setProductQuery]=useState('')
 const [draftItems,setDraftItems]=useState<Array<{produto_id:string;produto_cliente:string;descricao:string;quantidade:string;valor:string;data_fabricacao:string;lote_fabricacao:string}>>([])
 const [form,setForm]=useState({cliente_id:'',numero_cliente:'',data_entrada:new Date().toISOString().slice(0,10),entrega:'',produto_id:'',produto_cliente:'',quantidade:'1',valor:'0',data_fabricacao:'',lote_fabricacao:''})
 const [selectedOrder,setSelectedOrder]=useState<string|null>(null)

 async function load(){
  setBusy(true);setError('')
  try{
   const er=await supabase.rpc('erp_current_empresa_id')
   if(er.error||!er.data) throw er.error??new Error('Empresa ERP não identificada.')
   const id=String(er.data);setEmpresaId(id)
   const [c,p,o,i,op,pr]=await Promise.all([
    supabase.from('erp_clientes').select('id,nome,documento').eq('empresa_id',id).eq('ativo',true).order('nome').limit(500),
    supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,estoque_atual,unidade,referencia_cliente').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrega_prometida,created_at,pedido_cliente').eq('empresa_id',id).order('numero',{ascending:false}).limit(500),
    supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total,produto_cliente,data_fabricacao,lote_fabricacao').eq('empresa_id',id).order('id'),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,pedido_venda_id,quantidade,status,data_prevista').eq('empresa_id',id).order('criado_em',{ascending:false}).limit(1000),
    supabase.from('erp_pcp_programacoes').select('ordem_producao_id,inicio_real,fim_real,quantidade_produzida,quantidade_refugada,status').eq('empresa_id',id).limit(2000)
   ])
   for(const r of [c,p,o,i,op,pr]) if(r.error) throw r.error
   setClients((c.data||[]) as Client[]);setProducts((p.data||[]).map(x=>({...x,preco_venda:Number(x.preco_venda||0),estoque_atual:Number(x.estoque_atual||0)})) as Product[])
   setOrders((o.data||[]).map(x=>({...x,numero:Number(x.numero),total:Number(x.total||0)})) as Order[])
   setItems((i.data||[]).map(x=>({...x,quantidade:Number(x.quantidade||0),valor_unitario:Number(x.valor_unitario||0),total:Number(x.total||0)})) as Item[])
   setOps((op.data||[]).map(x=>({...x,quantidade:Number(x.quantidade||0)})) as OP[])
   setPrograms((pr.data||[]).map(x=>({...x,quantidade_produzida:Number(x.quantidade_produzida||0),quantidade_refugada:Number(x.quantidade_refugada||0)})) as Program[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar pedidos pendentes.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const clientResults=useMemo(()=>clients.filter(c=>!clientQuery||((c.nome+' '+(c.documento||'')).toLowerCase().includes(clientQuery.toLowerCase()))).slice(0,20),[clients,clientQuery])
 const productResults=useMemo(()=>products.filter(p=>!productQuery||((p.codigo+' '+p.nome+' '+(p.referencia_cliente||'')).toLowerCase().includes(productQuery.toLowerCase()))).slice(0,20),[products,productQuery])
 const rows=useMemo(()=>{
  return orders.flatMap(order=>{
   const its=items.filter(i=>i.pedido_id===order.id)
   return its.map(item=>{
    const product=products.find(p=>p.id===item.produto_id)
    const orderOps=ops.filter(op=>op.pedido_venda_id===order.id&&op.produto_id===item.produto_id)
    const produced=orderOps.reduce((sum,op)=>sum+programs.filter(p=>p.ordem_producao_id===op.id).reduce((s,p)=>s+p.quantidade_produzida,0),0)
    const opStatus=orderOps.some(op=>['concluida','concluído','finalizado','concluido'].includes(op.status.toLowerCase()))?'Finalizado':orderOps.length?'Produzindo':order.status
    const rowStatus=opStatus==='Finalizado'?'Finalizado':opStatus==='Produzindo'?'Produzindo':order.status||'Pendente'
    return {order,item,product,stock:Number(product?.estoque_atual||0),produced}
   })
  }).filter(r=>{
   const text=(r.order.numero+' '+(r.order.pedido_cliente||'')+' '+clients.find(c=>c.id===r.order.cliente_id)?.nome+' '+(r.item.produto_cliente||'')+' '+(r.product?.codigo||'')+' '+r.item.descricao).toLowerCase()
   return (!query||text.includes(query.toLowerCase()))&&(statusFilter==='TODOS'||r.rowStatus===statusFilter)
  })
 },[orders,items,products,ops,programs,clients,query,statusFilter])

 function selectClient(c:Client){setForm({...form,cliente_id:c.id});setClientQuery(c.nome)}
 function selectProduct(p:Product){setForm({...form,produto_id:p.id,produto_cliente:p.referencia_cliente||'',valor:String(p.preco_venda||0)});setProductQuery(p.codigo+' • '+p.nome)}
 function addDraftItem(){
  const p=products.find(x=>x.id===form.produto_id)
  if(!p){setError('Selecione o produto pelo campo de pesquisa.');return}
  const q=Number(form.quantidade);if(!Number.isFinite(q)||q<=0){setError('Informe uma quantidade válida.');return}
  setDraftItems([...draftItems,{produto_id:p.id,produto_cliente:form.produto_cliente,descricao:p.nome,quantidade:String(q),valor:form.valor,data_fabricacao:form.data_fabricacao,lote_fabricacao:form.lote_fabricacao}])
  setForm({...form,produto_id:'',produto_cliente:'',quantidade:'1',valor:'0',data_fabricacao:'',lote_fabricacao:''});setProductQuery('')
 }
 async function saveOrder(){
  if(!empresaId||!form.cliente_id||draftItems.length===0){setError('Informe o cliente e adicione pelo menos um item ao pedido.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const max=await supabase.from('erp_pedidos_venda').select('numero').eq('empresa_id',empresaId).order('numero',{ascending:false}).limit(1)
   if(max.error)throw max.error
   const numero=Number(max.data?.[0]?.numero||0)+1
   const total=draftItems.reduce((s,i)=>s+Number(i.quantidade)*Number(i.valor),0)
   const p=await supabase.from('erp_pedidos_venda').insert({empresa_id:empresaId,numero,cliente_id:form.cliente_id,status:'Pendente',total,pedido_cliente:form.numero_cliente||null,data_entrega_prometida:form.entrega||null}).select('id,numero').single()
   if(p.error)throw p.error
   const ins=await supabase.from('erp_pedidos_venda_itens').insert(draftItems.map(i=>({empresa_id:empresaId,pedido_id:p.data.id,produto_id:i.produto_id,descricao:i.descricao,quantidade:Number(i.quantidade),valor_unitario:Number(i.valor),desconto:0,total:Number(i.quantidade)*Number(i.valor),produto_cliente:i.produto_cliente||null,data_fabricacao:i.data_fabricacao||null,lote_fabricacao:i.lote_fabricacao||null})))
   if(ins.error)throw ins.error
   setMessage('Pedido '+p.data.numero+' gravado no banco como Pendente.')
   setDraftItems([]);setForm({...form,numero_cliente:'',entrega:'',produto_id:'',produto_cliente:'',quantidade:'1',valor:'0',data_fabricacao:'',lote_fabricacao:''});setClientQuery('')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gravar pedido.')}finally{setBusy(false)}
 }
 async function changeStatus(orderId:string,status:string){
  setBusy(true);setError('');setMessage('')
  const r=await supabase.from('erp_pedidos_venda').update({status}).eq('id',orderId).eq('empresa_id',empresaId)
  if(r.error)setError(r.error.message);else{setMessage('Status atualizado no banco.');await load()}
  setBusy(false)
 }
 async function generateOP(row:typeof rows[number]){
  if(!row.product?.id){setError('O item não possui produto interno vinculado. Não é possível gerar OP.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const existing=ops.find(op=>op.pedido_venda_id===row.order.id&&op.produto_id===row.product?.id&&['pendente','programada','em_producao','produzindo'].includes(op.status.toLowerCase()))
   if(existing){setMessage('Já existe OP aberta para este item: '+existing.numero_op);setBusy(false);return}
   const max=await supabase.from('erp_ordens_producao').select('numero_op').eq('empresa_id',empresaId).order('criado_em',{ascending:false}).limit(200)
   if(max.error)throw max.error
   const nums=(max.data||[]).map(x=>Number(String(x.numero_op).replace(/\D/g,''))).filter(Number.isFinite)
   const next=Math.max(0,...nums)+1
   const op=await supabase.from('erp_ordens_producao').insert({empresa_id:empresaId,numero_op:'OP-'+String(next).padStart(6,'0'),produto_id:row.product.id,quantidade:Number(row.item.quantidade),status:'pendente',pedido_venda_id:row.order.id,data_prevista:row.order.data_entrega_prometida})
   if(op.error)throw op.error
   const upd=await supabase.from('erp_pedidos_venda').update({status:'Produzindo'}).eq('id',row.order.id).eq('empresa_id',empresaId)
   if(upd.error)throw upd.error
   setMessage('OP criada e pedido enviado para Produção/PCP.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gerar OP.')}finally{setBusy(false)}
 }
 function importXml(file:File){
  const reader=new FileReader()
  reader.onload=()=>{try{
   const xml=new DOMParser().parseFromString(String(reader.result),'text/xml')
   if(xml.querySelector('parsererror'))throw new Error('XML inválido.')
   const tag=(name:string)=>xml.getElementsByTagName(name)[0]?.textContent?.trim()||''
   const nfe=xml.getElementsByTagName('infNFe')[0]
   const ide=nfe?.getElementsByTagName('ide')[0],dest=nfe?.getElementsByTagName('dest')[0]
   const cliente=dest?.getElementsByTagName('xNome')[0]?.textContent?.trim()||''
   const pedido=ide?.getElementsByTagName('nNF')[0]?.textContent?.trim()||''
   const dh=ide?.getElementsByTagName('dhEmi')[0]?.textContent?.trim()?.slice(0,10)||''
   const det=Array.from(xml.getElementsByTagName('det')).map(d=>{const prod=d.getElementsByTagName('prod')[0];return {produto_cliente:prod?.getElementsByTagName('cProd')[0]?.textContent?.trim()||'',descricao:prod?.getElementsByTagName('xProd')[0]?.textContent?.trim()||'',quantidade:prod?.getElementsByTagName('qCom')[0]?.textContent?.trim()||'0',valor:prod?.getElementsByTagName('vUnCom')[0]?.textContent?.trim()||'0'}})
   setMessage('XML lido para conferência. Cliente: '+cliente+' • Pedido: '+pedido+' • Itens: '+det.length+'.')
   if(pedido)setForm(x=>({...x,numero_cliente:pedido,data_entrada:dh||x.data_entrada}))
   setProductQuery('')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao ler XML.')} }
  reader.readAsText(file)
 }
 const selected=rows.find(r=>r.order.id===selectedOrder)
 return <main className="erp-page-v3">
  <header className="erp-page-header-v3"><div><span className="erp-eyebrow">COMERCIAL • PEDIDOS</span><h1>Entrada de Pedidos Pendentes</h1><p>Entrada no topo; lista operacional abaixo. A estrutura segue o fluxo pedido → produto → estoque → OP → PCP.</p></div><div className="flex flex-wrap gap-2"><label className="erp-btn-secondary cursor-pointer"><UploadCloud size={18}/> Importar pedido XML<input type="file" accept=".xml,text/xml" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)importXml(file)}}/></label><button className="erp-btn-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={18}/> Atualizar</button></div></header>

  {error&&<div className="erp-alert-error">{error}</div>}{message&&<div className="erp-alert-success">{message}</div>}

  <section className="erp-card-v3">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Entrada do Pedido Pendente</h2><p>Preencha o cabeçalho, adicione os itens e só então grave no Supabase.</p></div><span className="erp-badge-warn">PENDENTE</span></div>
   <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
    <label>Cliente<input value={clientQuery} onChange={e=>setClientQuery(e.target.value)} placeholder="Pesquisar cliente por nome/CNPJ"/>{clientQuery&&form.cliente_id===''&&<div className="relative z-30 mt-1 max-h-56 overflow-auto rounded-xl border bg-white shadow-lg">{clientResults.map(c=><button type="button" key={c.id} onClick={()=>selectClient(c)} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-50">{c.nome}{c.documento?' • '+c.documento:''}</button>)}</div>}</label>
    <label>Pedido Cliente<input value={form.numero_cliente} onChange={e=>setForm({...form,numero_cliente:e.target.value})} placeholder="B12002887"/></label>
    <label>Entrada do Pedido<input type="date" value={form.data_entrada} onChange={e=>setForm({...form,data_entrada:e.target.value})}/></label>
    <label>Data de entrega<input type="date" value={form.entrega} onChange={e=>setForm({...form,entrega:e.target.value})}/></label>
   </div>
   <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
    <label>Produto / código<input value={productQuery} onChange={e=>{setProductQuery(e.target.value);setForm({...form,produto_id:''})}} placeholder="Digite código ou descrição"/>{productQuery&&form.produto_id===''&&<div className="relative z-30 mt-1 max-h-56 overflow-auto rounded-xl border bg-white shadow-lg">{productResults.map(p=><button type="button" key={p.id} onClick={()=>selectProduct(p)} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-50"><b>{p.codigo}</b> • {p.nome}{p.referencia_cliente?' • cliente: '+p.referencia_cliente:''}</button>)}</div>}</label>
    <label>Produto Cliente<input value={form.produto_cliente} onChange={e=>setForm({...form,produto_cliente:e.target.value})}/></label>
    <label>Quantidade<input type="number" min="0.001" step="0.001" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})}/></label>
    <label>Valor unitário<input type="number" min="0" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></label>
    <label>Data fabricação<input type="date" value={form.data_fabricacao} onChange={e=>setForm({...form,data_fabricacao:e.target.value})}/></label>
    <label>Lote fabricação<input value={form.lote_fabricacao} onChange={e=>setForm({...form,lote_fabricacao:e.target.value})} placeholder="ex.: 1610-23"/></label>
    <button type="button" className="erp-btn-secondary" onClick={addDraftItem}><Plus size={18}/> Adicionar item</button>
   </div>
   {draftItems.length>0&&<div className="mt-5 overflow-auto rounded-2xl border border-slate-200"><table className="erp-table-v3 min-w-[900px]"><thead><tr><th>Produto Cliente</th><th>Código Interno</th><th>Descrição</th><th>Qtde</th><th>Valor</th><th>Fabricação</th><th>Lote</th><th></th></tr></thead><tbody>{draftItems.map((i,idx)=>{const p=products.find(x=>x.id===i.produto_id);return <tr key={i.produto_id+idx}><td>{i.produto_cliente||'—'}</td><td>{p?.codigo||'—'}</td><td>{i.descricao}</td><td>{i.quantidade}</td><td>{money(Number(i.valor))}</td><td>{i.data_fabricacao||'—'}</td><td>{i.lote_fabricacao||'—'}</td><td><button type="button" onClick={()=>setDraftItems(draftItems.filter((_,n)=>n!==idx))} className="erp-btn-secondary" title="Remover item"><X size={15}/></button></td></tr>})}</tbody></table></div>}
   <div className="mt-5 flex justify-end"><button type="button" className="erp-btn-primary" onClick={()=>void saveOrder()} disabled={busy||draftItems.length===0}><Save size={18}/> Gravar pedido pendente</button></div>
  </section>

  <section className="erp-card-v3">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><h2>Lista de Pedidos / Produção</h2><p>Lista operacional inferior, com dados do pedido e do item. Nenhuma célula é preenchida com número fictício.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label>Pesquisar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pedido, cliente, código, descrição..."/></label><label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>TODOS</option><option>Pendente</option><option>Produzindo</option><option>Finalizado</option></select></label></div></div>
   <div className="mt-5 overflow-auto rounded-2xl border border-slate-200"><table className="erp-table-v3 min-w-[1700px]"><thead><tr><th>Cliente</th><th>Pedido</th><th>Pedido Cliente</th><th>Entrada do Pedido</th><th>Produto Cliente</th><th>Código Interno</th><th>Descrição da Peça / Produto</th><th>Data de entrega</th><th>Qtde Pedido</th><th>Estoque</th><th>Data Fabricação</th><th>Lote Fabricação</th><th>Status</th><th>Qtde Produzida</th><th>Ações</th></tr></thead><tbody>{rows.map(r=>{const client=clients.find(c=>c.id===r.order.cliente_id);return <tr key={r.item.id} onClick={()=>setSelectedOrder(r.order.id)} className={selectedOrder===r.order.id?'bg-sky-50':''}><td>{client?.nome||'—'}</td><td className="font-black">PV-{r.order.numero}</td><td>{r.order.pedido_cliente||'—'}</td><td>{dateBR(r.order.created_at)}</td><td>{r.item.produto_cliente||r.product?.referencia_cliente||'—'}</td><td className="font-black">{r.product?.codigo||'—'}</td><td>{r.item.descricao}</td><td>{dateBR(r.order.data_entrega_prometida)}</td><td>{r.item.quantidade}</td><td>{r.stock}</td><td>{dateBR(r.item.data_fabricacao)}</td><td>{r.item.lote_fabricacao||'—'}</td><td><span className={r.rowStatus==='Finalizado'?'erp-badge-success':r.rowStatus==='Produzindo'?'erp-badge-info':'erp-badge-warn'}>{r.rowStatus}</span></td><td>{r.produced}</td><td><div className="flex gap-2"><button type="button" className="erp-btn-secondary" onClick={e=>{e.stopPropagation();setSelectedOrder(r.order.id)}}>Abrir</button>{r.rowStatus==='Pendente'&&<button type="button" className="erp-btn-primary" onClick={e=>{e.stopPropagation();void generateOP(r)}}><Factory size={15}/> Gerar OP</button>}{r.rowStatus==='Produzindo'&&<button type="button" className="erp-btn-secondary" onClick={e=>{e.stopPropagation();location.href='/pcp'}}>Enviar PCP</button>}</div></td></tr>})}</tbody></table>{rows.length===0&&<div className="p-8 text-center text-sm text-slate-500">Nenhum pedido/item encontrado no banco para os filtros atuais.</div>}</div>
  </section>

  {selected&&<section className="erp-card-v3"><div className="flex items-center justify-between"><div><h2>Pedido selecionado</h2><p>Detalhe operacional real do pedido escolhido na lista inferior.</p></div><button type="button" onClick={()=>setSelectedOrder(null)} className="erp-btn-secondary"><X size={16}/> Fechar</button></div><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4 items-end"><div><span className="text-xs font-black">Pedido</span><strong className="block text-xl">PV-{selected.order.numero}</strong></div><div><span className="text-xs font-black">Cliente</span><strong className="block">{clients.find(c=>c.id===selected.order.cliente_id)?.nome||'—'}</strong></div><div><span className="text-xs font-black">Status</span><strong className="block">{selected.rowStatus}</strong></div><div><span className="text-xs font-black">Estoque atual</span><strong className="block">{selected.stock}</strong></div></div></section>}
 </main>
}
