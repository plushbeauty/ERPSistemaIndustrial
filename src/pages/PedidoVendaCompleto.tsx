import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabaseClient'
import {Plus,Save,Trash2,RefreshCw,PackageCheck,Factory,LayoutGrid,ShoppingCart,Users,BarChart3,Settings,ClipboardList,PanelLeftClose,PanelLeftOpen,Search} from 'lucide-react'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'

type Client={id:string;nome:string;documento:string|null;codigo?:string|null;email?:string|null}
type CustomerMapping={produto_id:string;codigoCliente:string;dimensoes:string;canal:string;molde:string}
type Product={id:string;codigo:string;nome:string;estoque_atual:number;preco_venda:number;unidade:string}
type Item={produto_id:string;codigo:string;codigoCliente:string;descricao:string;quantidade:string;valor:string;estoque:number;reservadoQtd:number}
type Order={id:string;numero:number;status:string;total:number;data_entrega_prometida:string|null;cliente_id:string}

const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

function SalesCustomerView({empresa,products,clients,onSaved}:{empresa:string;products:Product[];clients:Client[];onSaved:()=>void}){
 const [form,setForm]=useState({codigo:'',nome:'',documento:'',endereco:'',email:''})
 const [mapping,setMapping]=useState<CustomerMapping[]>([])
 const [produto,setProduto]=useState('')
 const [codigoCliente,setCodigoCliente]=useState('')
 const [dimensoes,setDimensoes]=useState('')
 const [canal,setCanal]=useState('')
 const [molde,setMolde]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const product=products.find(p=>p.id===produto)
 const addMapping=()=>{if(!produto||!codigoCliente.trim()){setError('Informe o código interno do produto e o código que o cliente usa.');return}setMapping(x=>[...x,{produto_id:produto,codigoCliente:codigoCliente.trim(),dimensoes,canal,molde}]);setProduto('');setCodigoCliente('');setDimensoes('');setCanal('');setMolde('')}
 const save=async()=>{if(!empresa||!form.nome.trim()){setError('Razão Social é obrigatória.');return}setBusy(true);setError('');setMessage('');try{
   const r=await supabase.from('erp_clientes').insert({empresa_id:empresa,codigo:form.codigo.trim()||null,nome:form.nome.trim(),documento:form.documento.trim()||null,endereco:form.endereco.trim()||null,email:form.email.trim()||null,ativo:true}).select('id').single()
   if(r.error)throw r.error
   if(mapping.length){const rows=mapping.map(m=>({empresa_id:empresa,cliente_id:r.data.id,produto_id:m.produto_id,codigo_cliente:m.codigoCliente,dimensoes:m.dimensoes.trim()||null,canal:m.canal.trim()||null,molde:m.molde.trim()||null,ativo:true}));const mr=await supabase.from('erp_cliente_produto_de_para').upsert(rows,{onConflict:'empresa_id,cliente_id,produto_id'});if(mr.error)throw mr.error}
   setMessage('Cliente e vínculos DE-PARA salvos no banco.');setForm({codigo:'',nome:'',documento:'',endereco:'',email:''});setMapping([]);onSaved()
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o cliente.')}finally{setBusy(false)}}
 return <div className="sales-customer">
   <div className="sales-customer-head"><div><span>FICHA DO CLIENTE</span><h1>NOVO CLIENTE</h1></div><div className="sales-customer-badge">VENDAS / CADASTRO</div></div>
   {error&&<div className="sales-error">{error}</div>}{message&&<div className="sales-message">{message}</div>}
   <section className="sales-customer-card"><div className="sales-customer-section-title">👉 1. DADOS CADASTRAIS</div>
    <div className="sales-customer-grid"><label>Razão Social *<input value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Metalúrgica Silva LTDA"/></label><label>CNPJ / CPF<input value={form.documento} onChange={e=>setForm(v=>({...v,documento:e.target.value}))} placeholder="00.000.000/0001-00"/></label><label className="wide">Endereço<input value={form.endereco} onChange={e=>setForm(v=>({...v,endereco:e.target.value}))} placeholder="Av. Industrial, 1000"/></label><label>E-mail<input type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="compras@cliente.com"/></label><label>Código interno do cliente<input value={form.codigo} onChange={e=>setForm(v=>({...v,codigo:e.target.value}))} placeholder="CLI-0001"/></label></div>
   </section>
   <section className="sales-customer-card"><div className="sales-customer-section-title">👉 2. VÍNCULO DE CÓDIGOS (DE-PARA DE PRODUTOS DO CLIENTE)</div><p className="sales-customer-help">Cruza o código interno da fábrica com o código que o cliente usa no XML/pedido. Digite o código; a lupa é somente para consulta.</p>
    <div className="sales-customer-link-grid"><EntityCodeLookup label="Nosso Cód. Interno" value={produto} records={products} onChange={setProduto} onSelect={p=>setProduto(p.id)} helper="Código exato da peça/produto"/><label>Código que o Cliente Usa<input value={codigoCliente} onChange={e=>setCodigoCliente(e.target.value)} placeholder="COD-CLI-X9"/></label><label>Dimensões<input value={dimensoes} onChange={e=>setDimensoes(e.target.value)}/></label><label>Canal<input value={canal} onChange={e=>setCanal(e.target.value)}/></label><label>Molde<input value={molde} onChange={e=>setMolde(e.target.value)}/></label><button type="button" className="sales-btn" onClick={addMapping}><Plus size={16}/> Vincular Novo Código</button></div>
    <div className="sales-customer-table"><table><thead><tr><th>Nosso Cód Interno</th><th>Descrição</th><th>Código que o Cliente Usa no XML/Pedido</th><th>Dimensões</th><th>Canal</th><th>Molde</th></tr></thead><tbody>{mapping.map((m,i)=><tr key={i}><td><b>{products.find(p=>p.id===m.produto_id)?.codigo||'—'}</b></td><td>{products.find(p=>p.id===m.produto_id)?.nome||'—'}</td><td>{m.codigoCliente}</td><td>{m.dimensoes||'—'}</td><td>{m.canal||'—'}</td><td>{m.molde||'—'}</td></tr>)}{!mapping.length&&<tr><td colSpan={6}>Nenhum vínculo adicionado. O cadastro pode ser salvo sem DE-PARA e completado depois.</td></tr>}</tbody></table></div>
   </section>
   <footer className="sales-customer-footer"><button type="button" className="sales-btn danger" onClick={()=>history.back()}>❌ Cancelar</button><button type="button" className="sales-btn primary" disabled={busy} onClick={()=>void save()}><Save size={17}/> {busy?'SALVANDO…':'SALVAR CLIENTE'}</button></footer>
 </div>
}
export default function PedidoVendaCompleto(){
 const[empresa,setEmpresa]=useState('')
 const requestedView=new URLSearchParams(window.location.search).get('view');const pathView=window.location.pathname==='/vendas/clientes'?'clientes':window.location.pathname==='/vendas/carteira'?'carteira':window.location.pathname==='/vendas/novo-pedido'?'pedido':null;const activeView=requestedView??pathView??'pedido';const customerView=activeView==='clientes',[clients,setClients]=useState<Client[]>([]),[products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([])
 const[client,setClient]=useState(''),[clientDoc,setClientDoc]=useState(''),[number,setNumber]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[delivery,setDelivery]=useState('')
 const[items,setItems]=useState<Item[]>([]),[draft,setDraft]=useState({produto:'',qtd:'1',valor:'0',codigoCliente:''}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[processed,setProcessed]=useState(false),[sidebar,setSidebar]=useState(true)

 const load=async()=>{
  setErr('')
  const e=await supabase.rpc('erp_current_empresa_id')
  if(e.error||!e.data)throw e.error??new Error('Empresa não identificada')
  const id=String(e.data);setEmpresa(id)
  const [c,p,o]=await Promise.all([
   supabase.from('erp_clientes').select('id,nome,documento,codigo,email').eq('empresa_id',id).eq('ativo',true).order('nome'),
   supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,preco_venda,unidade').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
   supabase.from('erp_pedidos_venda').select('id,numero,status,total,data_entrega_prometida,cliente_id').eq('empresa_id',id).order('numero',{ascending:false}).limit(100)
  ])
  for(const x of[c,p,o])if(x.error)throw x.error
  setClients(c.data||[]);setProducts(p.data||[]);setOrders(o.data||[])
  setNumber(String((Number(o.data?.[0]?.numero||0)+1)).padStart(6,'0'))
 }
 useEffect(()=>{void load().catch(e=>setErr(e.message))},[])

 const selected=products.find(p=>p.id===draft.produto)
 const total=useMemo(()=>items.reduce((s,i)=>s+Number(i.quantidade)*Number(i.valor),0),[items])
 const analyzed=items.map(i=>({...i,disponivel:Math.max(i.estoque-i.reservadoQtd,0),reserva:Math.min(Number(i.quantidade),Math.max(i.estoque-i.reservadoQtd,0)),falta:Math.max(Number(i.quantidade)-Math.max(i.estoque-i.reservadoQtd,0),0)}))
 const faltantes=analyzed.filter(i=>i.falta>0)
 const verdes=analyzed.filter(i=>i.falta===0)

 function choose(id:string){const p=products.find(x=>x.id===id);if(!p)return;setDraft({...draft,produto:id,valor:String(p.preco_venda||0)})}
 function add(){
  if(!selected||Number(draft.qtd)<=0)return
  setItems(x=>[...x,{produto_id:selected.id,codigo:selected.codigo,codigoCliente:draft.codigoCliente,descricao:selected.nome,quantidade:draft.qtd,valor:draft.valor||String(selected.preco_venda||0),estoque:Number(selected.estoque_atual||0),reservadoQtd:0}])
  setDraft({produto:'',qtd:'1',valor:'0',codigoCliente:''})
 }
 async function finalize(){
  if(!empresa||!client||!items.length){setErr('Cliente e pelo menos um item são obrigatórios.');return}
  setBusy(true);setErr('');setMsg('')
  try{
   const r=await supabase.rpc('erp_finalizar_pedido_planejado',{p_cliente_id:client,p_data_entrada:date,p_data_entrega:delivery||null,p_itens:items.map(i=>({produto_id:i.produto_id,codigo:i.codigo,quantidade:Number(i.quantidade),valor_unitario:Number(i.valor)}))})
   if(r.error)throw r.error
   setProcessed(true)
   setMsg('Pedido finalizado com sucesso. O estoque disponível foi reservado e somente a necessidade líquida foi enviada ao PCP.')
   setItems(analyzed.map(i=>({...i,reservadoQtd:i.reserva})))
   await load()
  }catch(e){setErr(e instanceof Error?e.message:'Falha ao finalizar pedido.')}
  finally{setBusy(false)}
 }
 function cancel(){setItems([]);setClient('');setClientDoc('');setDelivery('');setProcessed(false);setMsg('');setErr('')}
 function go(path:string){location.href=path}

 return <div className="sales-shell">
  <style>{`
   .sales-shell{min-height:100vh;background:#f4fbfd;color:#17333f;display:flex}
   .sales-side{width:270px;flex:none;background:#fff;border-right:1px solid #cfe1e7;display:flex;flex-direction:column;padding:18px 14px;box-sizing:border-box}
   .sales-brand{display:flex;align-items:center;gap:11px;padding:6px 8px 20px;border-bottom:1px solid #e1edf1;margin-bottom:14px}
   .sales-brand img{width:42px;height:42px;object-fit:contain}.sales-brand strong{display:block;font-size:17px}.sales-brand small{display:block;color:#68808b;font-size:11px;margin-top:3px}
   .sales-section{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2d8db8;margin:7px 8px 8px}
   .sales-nav{width:100%;border:0;background:transparent;color:#36525e;border-radius:10px;padding:11px 10px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;margin-bottom:4px}
   .sales-nav:hover{background:#f4fbfd}.sales-nav.active{background:#e7f5fa;color:#176487;font-weight:900;box-shadow:inset 3px 0 #2d8db8}
   .sales-spacer{flex:1}.sales-toggle{display:none}
   .sales-main{flex:1;min-width:0}.sales-top{min-height:76px;background:#fff;border-bottom:1px solid #cfe1e7;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;box-sizing:border-box;gap:15px}
   .sales-top-title span,.sales-kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2d8db8}.sales-top-title strong{display:block;font-size:18px;margin-top:3px}.sales-top-title small{display:block;color:#68808b;margin-top:2px}
   .sales-content{padding:24px;max-width:1500px;margin:0 auto}.sales-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
   .sales-btn{min-height:44px;border-radius:10px;border:1px solid #bfd7df;background:#fff;color:#17333f;padding:0 15px;display:inline-flex;align-items:center;gap:8px;font-weight:850;cursor:pointer}.sales-btn.primary{background:#2d8db8;border-color:#2d8db8;color:#fff}.sales-btn.danger{background:#fff5f5;border-color:#e3b8bc;color:#9b2525}.sales-btn:disabled{opacity:.55;cursor:not-allowed}
   .sales-card{background:#fff;border:1px solid #cfe1e7;border-radius:14px;box-shadow:0 6px 20px rgba(23,51,63,.06);padding:20px;margin-top:16px}
   .sales-card h2{margin:0 0 4px;font-size:18px}.sales-card p{margin:0;color:#68808b}.sales-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.sales-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:850}.sales-field input,.sales-field select{min-height:43px;border:1px solid #bdd3da;border-radius:9px;background:#fff;padding:0 11px;color:#17333f;box-sizing:border-box;width:100%}
   .sales-table-wrap{overflow:auto;border:1px solid #d7e6eb;border-radius:12px;margin-top:16px}.sales-table{width:100%;border-collapse:collapse;min-width:900px}.sales-table th{background:#f4fbfd;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:12px;border-bottom:1px solid #d7e6eb}.sales-table td{padding:12px;border-bottom:1px solid #edf3f5;font-size:13px;vertical-align:middle}
   .status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;white-space:nowrap}.status.ok{background:#e8f7f0;color:#287a5c}.status.warn{background:#fff2e5;color:#b45b12}.status.done{background:#e7f5fa;color:#176487}
   .sales-summary{display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap}.sales-summary strong{font-size:18px}.sales-note{font-size:12px;color:#68808b}.sales-message{padding:12px 14px;border-radius:10px;margin:0 0 14px;background:#e8f7f0;color:#287a5c;border:1px solid #b9dfcd;font-weight:750}.sales-error{padding:12px 14px;border-radius:10px;margin:0 0 14px;background:#fff2f2;color:#9b2525;border:1px solid #e2b9b9;font-weight:750}
   .sales-result{border:1px solid #b9dfcd;background:#f2fbf6;border-radius:12px;padding:18px;margin-top:16px}.sales-result h3{margin:0 0 10px;color:#287a5c}
   .sales-field-span-2{grid-column:span 2}.sales-customer{max-width:1180px;margin:0 auto}.sales-customer-head{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.sales-customer-head span{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2d8db8}.sales-customer-head h1{margin:4px 0;font-size:28px}.sales-customer-badge{padding:9px 12px;border:1px solid #b9d2da;background:#f4fbfd;border-radius:7px;font-size:11px;font-weight:900;color:#17445a}.sales-customer-card{background:#fff;border:1px solid #cfe1e7;border-radius:9px;box-shadow:0 5px 16px rgba(23,51,63,.05);padding:18px;margin-bottom:14px}.sales-customer-section-title{font-size:13px;font-weight:900;color:#17445a;margin-bottom:14px}.sales-customer-grid,.sales-customer-link-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sales-customer-grid label,.sales-customer-link-grid label{display:grid;gap:6px;font-size:12px;font-weight:850;color:#172033}.sales-customer-grid label.wide{grid-column:1/-1}.sales-customer-grid input,.sales-customer-link-grid input{min-height:42px;border:1px solid #b9cbd3;border-radius:7px;background:#fff;color:#172033;padding:0 11px;box-sizing:border-box}.sales-customer-help{color:#536b76;font-size:13px;margin:0 0 14px}.sales-customer-table{overflow:auto;margin-top:14px;border:1px solid #d7e6eb;border-radius:8px}.sales-customer-table table{width:100%;border-collapse:collapse;min-width:800px}.sales-customer-table th,.sales-customer-table td{text-align:left;padding:11px;border-bottom:1px solid #e5edf0;font-size:12px;color:#172033}.sales-customer-table th{background:#edf6f8;font-size:11px;text-transform:uppercase}.sales-customer-footer{display:flex;justify-content:flex-end;gap:9px;padding-bottom:10px}@media(max-width:700px){.sales-customer-grid,.sales-customer-link-grid{grid-template-columns:1fr}.sales-customer-grid label.wide{grid-column:auto}.sales-customer-head{align-items:flex-start;flex-direction:column}.sales-field-span-2{grid-column:auto}}\n   @media(max-width:1000px){.sales-side{position:fixed;z-index:9500;left:0;top:0;bottom:0;transform:translateX(-100%);transition:.2s}.sales-side.open{transform:translateX(0)}.sales-toggle{display:inline-flex}.sales-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sales-content{padding:16px}.sales-top{padding:10px 14px}}
   @media(max-width:560px){.sales-grid{grid-template-columns:1fr}.sales-top-title small{display:none}.sales-actions{width:100%}.sales-btn{flex:1;justify-content:center}.sales-top{align-items:flex-start}.sales-content{padding:10px}}
  `}</style>
  {sidebar&&<aside className="sales-side open">
   <div className="sales-brand"><img src="/logo/sgq-erp.png" alt="SGQ ERP"/><div><strong>ERP INDUSTRIAL</strong><small>MÓDULO DE VENDAS</small></div></div>
   <div className="sales-section">VENDAS</div>
   <button className="sales-nav" onClick={()=>go('/pedidos-vendas?view=carteira')}><BarChart3 size={18}/> Painel Comercial</button>
   <button className={new URLSearchParams(window.location.search).get('view')==='clientes'?'sales-nav':'sales-nav active'} onClick={()=>go('/pedidos-vendas?view=pedido')}><Plus size={18}/> Novo Pedido</button>
   <button className="sales-nav" onClick={()=>go('/pedidos-vendas?view=carteira')}><ClipboardList size={18}/> Carteira de Pedidos</button>
   <button className={new URLSearchParams(window.location.search).get('view')==='clientes'?'sales-nav active':'sales-nav'} onClick={()=>go('/pedidos-vendas?view=clientes')}><Users size={18}/> Cadastro Clientes</button>
   <button className="sales-nav" onClick={()=>go('/pedidos-vendas?view=carteira')}><BarChart3 size={18}/> Metas e Gráficos</button>
   <div className="sales-spacer"/>
   <button className="sales-nav" onClick={()=>go('/configuracoes-adm')}><Settings size={18}/> Configurações Vendas</button>
  </aside>}
  <section className="sales-main">
   <header className="sales-top">
    <div className="sales-top-title"><button className="sales-btn sales-toggle" onClick={()=>setSidebar(x=>!x)}>{sidebar?<PanelLeftClose/>:<PanelLeftOpen/>}</button><span>ERP INDUSTRIAL • VENDAS</span><strong>{customerView?'Cadastro de Cliente':'Novo Pedido de Cliente'}</strong><small>{customerView?'Dados cadastrais + DE-PARA de produtos do cliente':'Pedido → análise de estoque → reserva → necessidade líquida → PCP'}</small></div>
    <div className="sales-actions">{!customerView&&<button className="sales-btn" disabled title="Integração Microsoft Outlook requer conexão do tenant Microsoft 365"><ShoppingCart size={16}/> Importar pedido do Outlook</button>}<button className="sales-btn" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button></div>
   </header>
   <main className="sales-content">{customerView?<SalesCustomerView empresa={empresa} products={products} clients={clients} onSaved={()=>void load()}/>:<>
    {err&&<div className="sales-error">{err}</div>}{msg&&<div className="sales-message">{msg}</div>}
    {!processed&&<section className="sales-card">
      <div className="sales-kicker">1. CABEÇALHO DO PEDIDO</div>
      <h2>Dados gerais</h2>
      <div className="sales-grid mt-3">
       <label className="sales-field">Nº Pedido<input value={number} readOnly/></label>
       <label className="sales-field">Data Entrada<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
       <div className="sales-field sales-field-span-2"><EntityCodeLookup label="Cliente" value={client} records={clients} required onChange={value=>setClient(value)} onSelect={x=>{setClient(x.id);setClientDoc(String(x.documento??''))}} helper="Digite o código exato do cliente. A lupa abre a consulta quando necessário."/></div>
       <label className="sales-field">Documento<input value={clientDoc} readOnly/></label>
       <label className="sales-field">Data Entrega<input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/></label>
      </div>
     </section>}
    {!processed&&<section className="sales-card">
      <div className="sales-kicker">2. ITENS DO PEDIDO</div><h2>Grid dinâmico com análise de estoque</h2>
      <div className="sales-grid">
       <div className="sales-field sales-field-span-2"><EntityCodeLookup label="Código Interno / Produto" value={draft.produto} records={products} required onChange={value=>setDraft(v=>({...v,produto:value}))} onSelect={p=>choose(p.id)} helper="Digite o código da peça/produto. Não é necessário percorrer uma lista de milhares de itens."/></div>
       <label className="sales-field">Cód. Cliente<input value={draft.codigoCliente} onChange={e=>setDraft({...draft,codigoCliente:e.target.value})} placeholder="COD-CLI"/></label>
       <label className="sales-field">Quantidade<input type="number" min="1" value={draft.qtd} onChange={e=>setDraft({...draft,qtd:e.target.value})}/></label>
       <label className="sales-field">Valor unitário<input type="number" step="0.01" value={draft.valor} onChange={e=>setDraft({...draft,valor:e.target.value})}/></label>
       <button className="sales-btn primary" onClick={add} disabled={!selected}><Plus size={17}/> Adicionar Produto</button>
      </div>
      <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Cód. Int.</th><th>Cód. Cliente</th><th>Produto</th><th>Qtd.</th><th>Est. Fís.</th><th>Disponível</th><th>Status</th><th>Destino</th><th/></tr></thead><tbody>
       {analyzed.map((i,n)=><tr key={n}><td><b>{i.codigo}</b></td><td>{i.codigoCliente||'—'}</td><td>{i.descricao}</td><td>{Number(i.quantidade).toLocaleString('pt-BR')}</td><td>{i.estoque.toLocaleString('pt-BR')}</td><td>{i.disponivel.toLocaleString('pt-BR')}</td><td><span className={`status ${i.falta?'warn':'ok'}`}>{i.falta?'🟠 FALTA':'🟢 OK'}</span></td><td><b>{i.falta?`Produzir ${i.falta}`:'Reservar integral'}</b></td><td><button className="sales-btn danger" onClick={()=>setItems(items.filter((_,x)=>x!==n))}><Trash2 size={15}/></button></td></tr>)}
       {!items.length&&<tr><td colSpan={9}>Adicione os produtos do pedido. A análise usa o estoque real disponível da empresa.</td></tr>}
      </tbody></table></div>
     </section>}
    {!processed&&<section className="sales-card">
      <div className="sales-kicker">3. FINALIZAÇÃO E REQUISITOS</div>
      <div className="sales-summary"><div><strong>{money(total)}</strong><div className="sales-note">{verdes.length} item(ns) atendido(s) por reserva • {faltantes.length} item(ns) com necessidade de produção</div></div><div className="sales-actions"><button className="sales-btn danger" onClick={cancel}>Cancelar</button><button className="sales-btn primary" disabled={busy||!items.length} onClick={()=>void finalize()}><Save size={17}/> FINALIZAR PEDIDO E DISPARAR REQUISIÇÕES</button></div></div>
     </section>}
    {processed&&<section className="sales-result">
      <h3>🎉 Pedido salvo com sucesso</h3>
      <p>{msg}</p>
      <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Item</th><th>Qtd.</th><th>Reserva</th><th>Produção</th><th>Status</th></tr></thead><tbody>{analyzed.map(i=><tr key={i.produto_id}><td><b>{i.codigo}</b> — {i.descricao}</td><td>{Number(i.quantidade).toLocaleString('pt-BR')}</td><td>{i.reserva.toLocaleString('pt-BR')} un</td><td>{i.falta.toLocaleString('pt-BR')} un</td><td><span className={`status ${i.falta?'warn':'ok'}`}>{i.falta?'🟠 PCP':'🟢 Reservado'}</span></td></tr>)}</tbody></table></div>
      {faltantes.length>0&&<div className="sales-summary mt-3"><span>Existem produtos em falta. A necessidade líquida já foi criada para análise do PCP.</span><button className="sales-btn primary" onClick={()=>go('/pcp')}><Factory size={17}/> ENVIAR PRODUTOS FALTANTES PARA PCP</button></div>}
      {faltantes.length===0&&<div className="sales-summary"><span>Todos os itens foram atendidos por reserva de estoque.</span><button className="sales-btn" onClick={()=>go('/comercial')}>Voltar para Carteira</button></div>}
    </section>}
    <section className="sales-card"><div className="sales-kicker">CARTEIRA</div><h2>Pedidos recentes</h2><div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Pedido</th><th>Status</th><th>Total</th><th>Entrega</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>PV-{o.numero}</td><td>{o.status}</td><td>{money(Number(o.total))}</td><td>{o.data_entrega_prometida||'—'}</td></tr>)}{!orders.length&&<tr><td colSpan={4}>Nenhum pedido cadastrado.</td></tr>}</tbody></table></div></section>
   </>}
   </main>
  </section>
 </div>
}
