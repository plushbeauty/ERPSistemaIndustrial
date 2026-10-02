import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabaseClient'
import {Plus,Save,Trash2,RefreshCw,Factory,ShoppingCart,Users,BarChart3,Settings,ClipboardList,PanelLeftClose,PanelLeftOpen,LogOut,Tablet} from 'lucide-react'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'
import { FormField, FormInput, FormDate, FormNumber, FormSelect, FormTextarea } from '../components/industrial/forms'

type Client={id:string;nome:string;documento:string|null;codigo?:string|null;email?:string|null;tabela_preco_id:string|null;desconto_padrao_percentual?:number|null}
type CustomerMapping={produto_id:string;codigoCliente:string;dimensoes:string;canal:string;molde:string}
type Product={id:string;codigo:string;nome:string;estoque_atual:number;preco_venda:number;unidade:string}
type PriceItem={tabela_preco_id:string;produto_id:string;preco:number}
type Item={produto_id:string;codigo:string;codigoCliente:string;descricao:string;quantidade:string;valor:string;desconto:string;unidade:string;estoque:number;reservadoQtd:number}
type Order={id:string;numero:number;status:string;total:number;data_entrega_prometida:string|null;cliente_id:string}

const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

function SalesCustomerView({empresa,products,onSaved}:{empresa:string;products:Product[];onSaved:()=>void}){
 const [form,setForm]=useState({codigo:'',nome:'',documento:'',endereco:'',email:''})
 const [mapping,setMapping]=useState<CustomerMapping[]>([])
 const [produto,setProduto]=useState('')
 const [codigoCliente,setCodigoCliente]=useState('')
 const [dimensoes,setDimensoes]=useState('')
 const [canal,setCanal]=useState('')
 const [molde,setMolde]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
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
   <section className="sales-customer-card"><div className="sales-customer-section-title">2. VÍNCULO DE CÓDIGOS (DE-PARA DE PRODUTOS DO CLIENTE)</div><p className="sales-customer-help">Cruza o código interno da fábrica com o código que o cliente usa no XML/pedido. Digite o código; a lupa é somente para consulta.</p>
    <div className="sales-customer-link-grid"><div className="sales-field-span-4"><EntityCodeLookup label="Nosso Cód. Interno" value={produto} records={products} onChange={setProduto} onSelect={p=>setProduto(p.id)} helper="Código exato da peça/produto"/></div><label>Código que o Cliente Usa<input value={codigoCliente} onChange={e=>setCodigoCliente(e.target.value)} placeholder="COD-CLI-X9"/></label><label>Dimensões<input value={dimensoes} onChange={e=>setDimensoes(e.target.value)}/></label><label className="sales-field-span-1">Canal<input value={canal} onChange={e=>setCanal(e.target.value)}/></label><label className="sales-field-span-1">Molde<input value={molde} onChange={e=>setMolde(e.target.value)}/></label><button type="button" className="sales-btn" onClick={addMapping}><Plus size={16}/> Vincular Novo Código</button></div>
    <div className="sales-customer-table"><table><thead><tr><th>Nosso Cód Interno</th><th>Descrição</th><th>Código que o Cliente Usa no XML/Pedido</th><th>Dimensões</th><th>Canal</th><th>Molde</th></tr></thead><tbody>{mapping.map((m,i)=><tr key={i}><td><b>{products.find(p=>p.id===m.produto_id)?.codigo||'—'}</b></td><td>{products.find(p=>p.id===m.produto_id)?.nome||'—'}</td><td>{m.codigoCliente}</td><td>{m.dimensoes||'—'}</td><td>{m.canal||'—'}</td><td>{m.molde||'—'}</td></tr>)}{!mapping.length&&<tr><td colSpan={6}>Nenhum vínculo adicionado. O cadastro pode ser salvo sem DE-PARA e completado depois.</td></tr>}</tbody></table></div>
   </section>
   <footer className="sales-customer-footer"><button type="button" className="sales-btn danger" onClick={()=>history.back()}>Cancelar</button><button type="button" className="sales-btn primary" disabled={busy} onClick={()=>void save()}><Save size={17}/> {busy?'SALVANDO…':'SALVAR CLIENTE'}</button></footer>
 </div>
}
export default function PedidoVendaCompleto(){
 const[empresa,setEmpresa]=useState('')
 const requestedView=new URLSearchParams(window.location.search).get('view');const pathView=window.location.pathname==='/vendas/clientes'?'clientes':window.location.pathname==='/vendas/carteira'?'carteira':window.location.pathname==='/vendas/novo-pedido'?'pedido':null;const activeView=requestedView??pathView??'pedido';const customerView=activeView==='clientes',[clients,setClients]=useState<Client[]>([]),[products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([])
 const[client,setClient]=useState(''),[entryVia,setEntryVia]=useState(''),[emailAttachment,setEmailAttachment]=useState<File|null>(null),[priceItems,setPriceItems]=useState<PriceItem[]>([]),[number,setNumber]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[delivery,setDelivery]=useState(''),[pedidoCliente,setPedidoCliente]=useState(''),[observacoes,setObservacoes]=useState(''),[condicaoPagamento,setCondicaoPagamento]=useState(''),[vendedor,setVendedor]=useState('')
 const[items,setItems]=useState<Item[]>([]),[draft,setDraft]=useState({produto:'',qtd:'1',valor:'0',desconto:'0',codigoCliente:''}),[selectedItemIndex,setSelectedItemIndex]=useState<number|null>(null),[printOpen,setPrintOpen]=useState(false),[printFilter,setPrintFilter]=useState('TODOS'),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[processed,setProcessed]=useState(false),[sidebar,setSidebar]=useState(true)

 const load=async()=>{
  setErr('')
  const e=await supabase.rpc('erp_current_empresa_id')
  if(e.error||!e.data)throw e.error??new Error('Empresa não identificada')
  const id=String(e.data);setEmpresa(id)
  const [c,p,pi,o]=await Promise.all([
   supabase.from('erp_clientes').select('id,nome,documento,codigo,email,tabela_preco_id,desconto_padrao_percentual').eq('empresa_id',id).eq('ativo',true).order('nome'),
   supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,preco_venda,unidade').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
   supabase.from('erp_tabelas_preco_itens').select('tabela_preco_id,produto_id,preco').eq('empresa_id',id).limit(10000),
   supabase.from('erp_pedidos_venda').select('id,numero,status,total,data_entrega_prometida,cliente_id').eq('empresa_id',id).order('numero',{ascending:false}).limit(100)
  ])
  for(const x of[c,p,pi,o])if(x.error)throw x.error
  setClients(c.data||[]);setProducts(p.data||[]);setPriceItems((pi.data||[]) as PriceItem[]);setOrders(o.data||[])
  const u=await supabase.auth.getUser(); if(u.data.user){const ur=await supabase.from('erp_usuarios').select('nome').eq('auth_user_id',u.data.user.id).eq('empresa_id',id).eq('ativo',true).is('deleted_at',null).maybeSingle();if(ur.data?.nome)setVendedor(ur.data.nome)}
  const firstClient=(c.data||[])[0] as Client|undefined
  if(firstClient) 
  setNumber(String((Number(o.data?.[0]?.numero||0)+1)).padStart(6,'0'))
 }
 useEffect(()=>{void load().catch(e=>setErr(e.message))},[])

 const selected=products.find(p=>p.id===draft.produto)
 const selectedClient=clients.find(c=>c.id===client)
 const priceFor=(product:Product)=>{const specific=selectedClient?.tabela_preco_id?priceItems.find(x=>x.tabela_preco_id===selectedClient.tabela_preco_id&&x.produto_id===product.id):undefined;return specific?.preco??product.preco_venda}
 const priceSource=(product:Product)=>selectedClient?.tabela_preco_id&&priceItems.some(x=>x.tabela_preco_id===selectedClient.tabela_preco_id&&x.produto_id===product.id)?'PREÇO DO CLIENTE':'PREÇO PADRÃO'
 const subtotal=useMemo(()=>items.reduce((s,i)=>s+Math.max(Number(i.quantidade)*Number(i.valor)-Math.max(Number(i.desconto)||0,0),0),0),[items]); const total=subtotal
 const analyzed=items.map(i=>({...i,disponivel:Math.max(i.estoque-i.reservadoQtd,0),reserva:Math.min(Number(i.quantidade),Math.max(i.estoque-i.reservadoQtd,0)),falta:Math.max(Number(i.quantidade)-Math.max(i.estoque-i.reservadoQtd,0),0)}))
 const faltantes=analyzed.filter(i=>i.falta>0)
 const verdes=analyzed.filter(i=>i.falta===0)

 function choose(id:string){const p=products.find(x=>x.id===id);if(!p)return;setDraft({...draft,produto:id,valor:String(priceFor(p)||0),desconto:String(selectedClient?.desconto_padrao_percentual??0)})}
 function add(){
  if(!selected||Number(draft.qtd)<=0)return
  setItems(x=>[...x,{produto_id:selected.id,codigo:selected.codigo,codigoCliente:draft.codigoCliente,descricao:selected.nome,quantidade:draft.qtd,valor:draft.valor||String(selected.preco_venda||0),desconto:String((Number(draft.qtd)*Number(draft.valor)*Math.min(Math.max(Number(draft.desconto)||0,0),100))/100),unidade:selected.unidade||'UN',estoque:Number(selected.estoque_atual||0),reservadoQtd:0}])
  setDraft({produto:'',qtd:'1',valor:'0',desconto:String(selectedClient?.desconto_padrao_percentual??0),codigoCliente:''})
 }
 async function finalize(){
  if(!empresa||!client||!items.length){setErr('Cliente e pelo menos um item são obrigatórios.');return}
  setBusy(true);setErr('');setMsg('')
  try{
   const r=await supabase.rpc('erp_finalizar_pedido_venda',{p_cliente_id:client,p_desconto:0,p_itens:items.map(i=>({produto_id:i.produto_id,quantidade:Number(i.quantidade),valor_unitario:Number(i.valor),desconto:Number(i.desconto)||0,codigo_cliente:i.codigoCliente||null,codigo:i.codigo})),p_data_entrada:date||null,p_data_entrega:delivery||null,p_pedido_cliente:pedidoCliente.trim()||null,p_observacoes:observacoes.trim()||null,p_condicao_pagamento:condicaoPagamento.trim()||null,p_vendedor_nome:vendedor.trim()||null,p_valor_frete:0,p_valor_outras_despesas:0})
   if(r.error)throw r.error
   if(r.data){
 const pedidoId=String(r.data)
 const update=await supabase.from('erp_pedidos_venda').update({observacoes:observacoes.trim()||null,pedido_cliente:pedidoCliente.trim()||null,entrada_via:entryVia||null}).eq('id',pedidoId).eq('empresa_id',empresa)
 if(update.error)throw update.error
 if(entryVia==='EMAIL'&&emailAttachment){
   const safeName=emailAttachment.name.replace(/[^a-zA-Z0-9._-]/g,'_')
   const path=`${empresa}/${pedidoId}/${crypto.randomUUID()}-${safeName}`
   const upload=await supabase.storage.from('erp-pedidos-anexos').upload(path,emailAttachment,{contentType:emailAttachment.type||'application/octet-stream',upsert:false})
   if(upload.error)throw upload.error
   const bytes=await emailAttachment.arrayBuffer()
   const digest=await crypto.subtle.digest('SHA-256',bytes)
   const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')
   const meta=await supabase.from('erp_pedido_anexos').insert({empresa_id:empresa,pedido_id:pedidoId,nome_arquivo:emailAttachment.name,caminho_storage:path,mime_type:emailAttachment.type||null,tamanho_bytes:emailAttachment.size,sha256:hash,origem:'EMAIL'})
   if(meta.error){await supabase.storage.from('erp-pedidos-anexos').remove([path]);throw meta.error}
 }
}
   setEmailAttachment(null);setProcessed(true)
   setMsg('Pedido finalizado com sucesso. O estoque disponível foi reservado e somente a necessidade líquida foi enviada ao PCP.')
   setItems(analyzed.map(i=>({...i,reservadoQtd:i.reserva})))
   await load()
  }catch(e){setErr(e instanceof Error?e.message:'Falha ao finalizar pedido.')}
  finally{setBusy(false)}
 }
 function cancel(){setItems([]);setSelectedItemIndex(null);setClient('');setDelivery('');setPedidoCliente('');setObservacoes('');setCondicaoPagamento('');setProcessed(false);setMsg('');setErr('')}
 function go(path:string){location.href=path}
 function selectEntryVia(value:string){setEntryVia(value);if(value!=='EMAIL')setEmailAttachment(null)}
 function deleteSelectedItem(){if(selectedItemIndex===null)return;setItems(x=>x.filter((_,i)=>i!==selectedItemIndex));setSelectedItemIndex(null)}
 function printOrders(filter:string){setPrintFilter(filter);setPrintOpen(false);setTimeout(()=>window.print(),80)}


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
   .sales-main{flex:1;min-width:0}.sales-top{min-height:54px;background:#fff;border-bottom:1px solid #cfe1e7;display:flex;align-items:center;justify-content:space-between;padding:5px 12px;box-sizing:border-box;gap:15px}
   .sales-top-title span,.sales-kicker{font-size:10px;font-weight:900;letter-spacing:.12em;color:#2d8db8}.sales-top-title strong{display:inline-block;font-size:14px;margin:0 0 0 8px}.sales-top-title small{display:block;color:#68808b;margin-top:1px;font-size:10px}
   .sales-content{padding:6px 10px;max-width:1600px;margin:0 auto}.sales-actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.sales-btn svg{display:block;flex:none;width:14px;height:14px}.sales-email-attachment{display:flex;align-items:center;gap:4px;margin-top:2px;min-width:0}.sales-attach-btn{height:22px;display:inline-flex;align-items:center;padding:0 6px;border:1px solid #9fb9c4;border-radius:3px;background:#f5fafc;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}.sales-email-attachment span{font-size:9px;color:#49636d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sales-btn{white-space:nowrap}
   .sales-btn{min-height:26px;border-radius:3px;border:1px solid #bfd7df;background:#fff;color:#17333f;padding:0 6px;display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;cursor:pointer}.sales-btn.primary{background:#2d8db8;border-color:#2d8db8;color:#fff}.sales-btn.danger{background:#fff5f5;border-color:#e3b8bc;color:#9b2525}.sales-btn:disabled{opacity:.55;cursor:not-allowed}
   .sales-card{background:#fff;border:1px solid #b9cfd7;border-radius:4px;box-shadow:0 1px 4px rgba(23,51,63,.04);padding:8px;margin-top:5px}.sales-delphi-form{border-radius:3px}.sales-form-title{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #d7e6eb;padding-bottom:4px;margin-bottom:5px}.sales-form-title h2{font-size:13px;margin:0;display:inline-block;margin-left:10px}.sales-readonly-note{font-size:9px;color:#68808b}.sales-compact-grid{column-gap:5px;row-gap:4px}.sales-compact-grid .sales-field{gap:2px;font-size:10px;font-weight:500}.sales-compact-grid .sales-field input,.sales-compact-grid .sales-field select{min-height:26px;height:26px;border-radius:3px;padding:0 6px;font-size:12px;font-weight:400}.sales-compact-grid .sales-code-field{min-width:82px}.sales-compact-grid .sales-code-field label{font-size:10px!important;font-weight:500!important;letter-spacing:0!important;text-transform:none!important}.sales-compact-grid .sales-code-field input{font-size:12px!important;font-weight:500!important}.sales-compact-grid .sales-code-field .mt-1{margin-top:0}.sales-compact-grid .sales-code-field .sr-only{display:none}.sales-compact-grid .sales-code-field button{height:26px;width:26px}.sales-small-field input{font-variant-numeric:tabular-nums}
   .sales-card h2{margin:0 0 4px;font-size:18px}.sales-card p{margin:0;color:#68808b}.sales-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:6px;row-gap:6px}.sales-grid > .sales-field-span-1,.sales-grid > .erp-w-1{grid-column:span 1}.sales-grid > .sales-field-span-2,.sales-grid > .erp-w-2{grid-column:span 2}.sales-grid > .sales-field-span-4,.sales-grid > .erp-w-4{grid-column:span 4}.sales-grid > .erp-w-12{grid-column:span 12}.sales-grid .sales-btn{align-self:end;min-height:26px}.sales-grid .sales-field input,.sales-grid .sales-field select{min-height:26px;height:26px;border-radius:3px;padding:0 6px;font-size:12px}.sales-grid .sales-field{display:flex;flex-direction:column;gap:2px;font-size:10px;font-weight:500}.sales-grid .sales-field input,.sales-grid .sales-field select{border:1px solid #bdd3da;background:#fff;color:#17333f;box-sizing:border-box;width:100%}.sales-compact-grid .erp-w-1 .erp-form-control{width:84px;max-width:84px}.sales-compact-grid .sales-code-field .mt-1>input{width:84px!important;max-width:84px}.sales-item-grid .sales-item-code .mt-1>input{width:84px!important;max-width:84px}.sales-item-grid .sales-item-code .mt-1>button{width:26px}.sales-item-grid .erp-w-1 .erp-form-control{width:84px;max-width:84px}.sales-item-grid .erp-w-4 .erp-form-control{width:100%}.sales-item-actions{grid-column:span 2}.sales-row-selected{background:#e7f5fa}.sales-order-footer{padding-top:5px;padding-bottom:5px}.sales-print-overlay{position:fixed;inset:0;z-index:11000;background:rgba(15,31,40,.55);display:grid;place-items:center;padding:20px}.sales-print-modal{width:min(520px,100%);background:#fff;border:1px solid #bfd7df;border-radius:5px;padding:12px;box-shadow:0 18px 50px rgba(0,0,0,.2)}.sales-print-option{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:600;margin:12px 0}.sales-print-option select{height:30px;border:1px solid #bdd3da;border-radius:3px;padding:0 7px;background:#fff}.sales-field{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:500}.sales-field input,.sales-field select{min-height:43px;border:1px solid #bdd3da;border-radius:9px;background:#fff;padding:0 11px;color:#17333f;box-sizing:border-box;width:100%}
   .sales-table-wrap{overflow:auto;border:1px solid #d7e6eb;border-radius:12px;margin-top:16px}.sales-table{width:100%;border-collapse:collapse;min-width:900px}.sales-table th{background:#f4fbfd;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding:7px;border-bottom:1px solid #d7e6eb}.sales-table td{padding:6px;border-bottom:1px solid #edf3f5;font-size:12px;vertical-align:middle}
   .status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;white-space:nowrap}.status.ok{background:#e8f7f0;color:#287a5c}.status.warn{background:#fff2e5;color:#b45b12}.status.done{background:#e7f5fa;color:#176487}
   .sales-summary{display:flex;justify-content:space-between;gap:6px;align-items:center;flex-wrap:wrap}.sales-summary strong{font-size:16px}.sales-total-inline{display:flex;align-items:center;gap:7px;padding:2px 7px;border:1px solid #cfe1e7;background:#f4fbfd;border-radius:3px}.sales-total-inline span,.sales-total-inline small{font-size:9px;color:#68808b}.sales-total-inline strong{font-size:15px;color:#17445a}.sales-note{font-size:12px;color:#68808b}.sales-message{padding:12px 14px;border-radius:10px;margin:0 0 14px;background:#e8f7f0;color:#287a5c;border:1px solid #b9dfcd;font-weight:750}.sales-error{padding:12px 14px;border-radius:10px;margin:0 0 14px;background:#fff2f2;color:#9b2525;border:1px solid #e2b9b9;font-weight:750}
   .sales-result{border:1px solid #b9dfcd;background:#f2fbf6;border-radius:12px;padding:18px;margin-top:16px}.sales-final-fields{align-items:start}.sales-final-fields textarea{min-height:96px;resize:vertical;border:1px solid #bdd3da;border-radius:9px;background:#fff;padding:10px 11px;color:#17333f;font:inherit}.sales-total{padding:12px;border:1px solid #cfe1e7;border-radius:10px;background:#f4fbfd}.sales-total strong{font-size:22px;color:#17445a}.sales-total small{color:#68808b}.sales-result h3{margin:0 0 10px;color:#287a5c}
   .sales-field-span-2{grid-column:span 2}.sales-field-span-4{grid-column:span 4}.sales-field-span-1{grid-column:span 1}.sales-customer{max-width:1180px;margin:0 auto}.sales-customer-head{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px}.sales-customer-head span{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2d8db8}.sales-customer-head h1{margin:4px 0;font-size:28px}.sales-customer-badge{padding:9px 12px;border:1px solid #b9d2da;background:#f4fbfd;border-radius:7px;font-size:11px;font-weight:900;color:#17445a}.sales-customer-card{background:#fff;border:1px solid #cfe1e7;border-radius:9px;box-shadow:0 5px 16px rgba(23,51,63,.05);padding:18px;margin-bottom:14px}.sales-customer-section-title{font-size:13px;font-weight:900;color:#17445a;margin-bottom:14px}.sales-customer-grid,.sales-customer-link-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sales-customer-grid label,.sales-customer-link-grid label{display:grid;gap:6px;font-size:12px;font-weight:850;color:#172033}.sales-customer-grid label.wide{grid-column:1/-1}.sales-customer-grid input,.sales-customer-link-grid input{min-height:42px;border:1px solid #b9cbd3;border-radius:7px;background:#fff;color:#172033;padding:0 11px;box-sizing:border-box}.sales-customer-help{color:#536b76;font-size:13px;margin:0 0 14px}.sales-customer-table{overflow:auto;margin-top:14px;border:1px solid #d7e6eb;border-radius:8px}.sales-customer-table table{width:100%;border-collapse:collapse;min-width:800px}.sales-customer-table th,.sales-customer-table td{text-align:left;padding:11px;border-bottom:1px solid #e5edf0;font-size:12px;color:#172033}.sales-customer-table th{background:#edf6f8;font-size:11px;text-transform:uppercase}.sales-customer-footer{display:flex;justify-content:flex-end;gap:9px;padding-bottom:10px}@media(max-width:700px){.sales-customer-grid,.sales-customer-link-grid{grid-template-columns:1fr}.sales-customer-grid label.wide{grid-column:auto}.sales-customer-head{align-items:flex-start;flex-direction:column}.sales-field-span-2{grid-column:auto}}\n   @media(max-width:1000px){.sales-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.sales-grid > .erp-w-4,.sales-grid > .sales-field-span-4{grid-column:span 3}.sales-grid > .erp-w-2,.sales-grid > .sales-field-span-2{grid-column:span 2}.sales-side{position:fixed;z-index:9500;left:0;top:0;bottom:0;transform:translateX(-100%);transition:.2s}.sales-side.open{transform:translateX(0)}.sales-toggle{display:inline-flex;min-height:30px}.sales-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sales-content{padding:16px}.sales-top{padding:10px 14px}}
   @media(max-width:560px){.sales-grid{grid-template-columns:1fr}.sales-grid > *{grid-column:1/-1!important}.sales-top-title small{display:none}.sales-actions{width:100%}.sales-btn{flex:1;justify-content:center}.sales-top{align-items:flex-start}.sales-content{padding:10px}}
  `}</style>
  {sidebar&&<aside className="sales-side open">
   <div className="sales-brand"><img src="/logo/sgq-erp.png" alt="SGQ ERP"/><div><strong>ERP INDUSTRIAL</strong><small>MÓDULO DE VENDAS</small></div></div>
   <div className="sales-section">VENDAS</div>
   <button className="sales-nav" onClick={()=>go('/vendas')}><BarChart3 size={18}/> Painel Comercial</button>
   <button className={new URLSearchParams(window.location.search).get('view')==='clientes'?'sales-nav':'sales-nav active'} onClick={()=>go('/vendas/novo-pedido')}><Plus size={18}/> Novo Pedido</button>
   <button className="sales-nav" onClick={()=>go('/pedidos-vendas?view=carteira')}><ClipboardList size={18}/> Carteira de Pedidos</button>
   <button className={new URLSearchParams(window.location.search).get('view')==='clientes'?'sales-nav active':'sales-nav'} onClick={()=>go('/vendas/clientes')}><Users size={18}/> Cadastro Clientes</button>
   <button className="sales-nav" onClick={()=>go('/pedidos-vendas?view=carteira')}><BarChart3 size={18}/> Metas e Gráficos</button>
   <div className="sales-spacer"/>
   <button className="sales-nav" onClick={()=>go('/configuracoes-adm')}><Settings size={18}/> Configurações Vendas</button>
  </aside>}
  <section className="sales-main">
   <header className="sales-top">
    <div className="sales-top-title"><span>VENDAS</span><strong>{customerView?'Cadastro de Cliente':'Novo Pedido de Cliente'}</strong><small>{customerView?'Dados cadastrais + DE-PARA de produtos do cliente':'Pedido → análise de estoque → reserva → necessidade líquida → PCP'}</small></div>
    <div className="sales-actions">{!customerView&&<button className="sales-btn" disabled title="Integração Microsoft Outlook requer conexão do tenant Microsoft 365"><ShoppingCart size={16}/> Importar pedido do Outlook</button>}<button className="sales-btn" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button><button className="sales-btn danger" onClick={()=>void supabase.auth.signOut().then(()=>{location.replace('/login')})}><LogOut size={16}/> SAIR</button></div>
   </header>
   <main className="sales-content">{customerView?<SalesCustomerView empresa={empresa} products={products} onSaved={()=>void load()}/>:<>
    {err&&<div className="sales-error">{err}</div>}{msg&&<div className="sales-message">{msg}</div>}
    {!processed&&<section className="sales-card sales-delphi-form">
      <div className="sales-form-title"><div className="sales-form-title-main"><div className="sales-kicker">1. IDENTIFICAÇÃO DO PEDIDO</div><h2>Entrada do pedido de venda</h2></div><div className="sales-actions"><button type="button" className="sales-btn" onClick={()=>setDraft({produto:"",qtd:"1",valor:"0",desconto:String(selectedClient?.desconto_padrao_percentual??0),codigoCliente:""})}><Plus size={13}/> NOVO</button><button type="button" className="sales-btn primary" disabled={busy||!items.length} onClick={()=>void finalize()}><Save size={13}/> GRAVAR</button></div></div>
      <div className="erp-form sales-grid sales-compact-grid">
       <FormField label="Nº Pedido" span={1} className="sales-field sales-small-field"><FormInput id="edPedido" value={number ? number : 'AUTO'} readOnly/></FormField>
       <FormField label="Data Entrada" span={1} className="sales-field sales-small-field"><FormDate id="edDataEntrada" value={date} onChange={e=>setDate(e.target.value)}/></FormField>
       <FormField span={1} className="sales-field sales-code-field"><EntityCodeLookup compact label="Código Cliente" value={client} records={clients} required onChange={value=>setClient(value)} onSelect={x=>{setClient(x.id);setItems([]);setDraft({produto:'',qtd:'1',valor:'0',desconto:String(x.desconto_padrao_percentual??0),codigoCliente:''})}}/></FormField>
       <FormField label="Nome do Cliente" span={3} className="sales-field"><FormInput id="edNomeCliente" value={selectedClient?.nome??''} readOnly/></FormField>
       <FormField label="Vendedor" span={2} className="sales-field"><FormInput id="edVendedor" value={vendedor} onChange={e=>setVendedor(e.target.value)} maxLength={120}/></FormField>
       <FormField label="Entrada | Via" span={2} className="sales-field sales-small-field"><FormSelect id="edEntradaVia" value={entryVia} onChange={e=>selectEntryVia(e.target.value)}><option value="">Selecionar</option><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp</option><option value="TELEFONE">Telefone</option></FormSelect>{entryVia==='EMAIL'&&<div className="sales-email-attachment"><input id="sales-email-attachment" type="file" accept=".eml,.msg,message/rfc822,application/vnd.ms-outlook" onChange={e=>setEmailAttachment(e.target.files?.[0]??null)} className="sr-only"/><label htmlFor="sales-email-attachment" className="sales-attach-btn">ANEXAR E-MAIL</label>{emailAttachment&&<span title={emailAttachment.name}>{emailAttachment.name}</span>}</div>}</FormField>
       <FormField label="Data Entrega" span={1} className="sales-field sales-small-field"><FormDate id="edDataEntrega" value={delivery} onChange={e=>setDelivery(e.target.value)}/></FormField>
       <FormField label="Pedido / Referência Cliente" span={1} className="sales-field"><FormInput id="edReferenciaCliente" value={pedidoCliente} onChange={e=>setPedidoCliente(e.target.value)} maxLength={120}/></FormField>
       <FormField label="Condição de Pagamento" span={1} className="sales-field"><FormInput id="edCondicaoPagamento" value={condicaoPagamento} onChange={e=>setCondicaoPagamento(e.target.value)} maxLength={120}/></FormField>
       
      </div>
     </section>}
    {!processed&&<section className="sales-card sales-order-footer"><div className="sales-summary"><div className="sales-total-inline"><span>Valor total do pedido</span><strong>{money(total)}</strong><small>{items.length} item(ns)</small></div><div className="sales-actions"><button type="button" className="sales-btn" onClick={()=>setPrintOpen(true)}>IMPRIMIR</button><button type="button" className="sales-btn" onClick={()=>setDraft({produto:"",qtd:"1",valor:"0",desconto:String(selectedClient?.desconto_padrao_percentual??0),codigoCliente:""})}><Plus size={13}/> NOVO ITEM</button><button type="button" className="sales-btn danger" onClick={cancel}><Trash2 size={13}/> CANCELAR</button><button type="button" className="sales-btn primary" disabled={busy||!items.length} onClick={()=>void finalize()}><Save size={13}/> FINALIZAR PEDIDO</button></div></div></section>}
    {processed&&<section className="sales-result">
      <h3>Pedido salvo com sucesso</h3>
      <p>{msg}</p>
      <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Item</th><th>Qtd.</th><th>Reserva</th><th>Produção</th><th>Status</th></tr></thead><tbody>{analyzed.map(i=><tr key={i.produto_id}><td><b>{i.codigo}</b> — {i.descricao}</td><td>{Number(i.quantidade).toLocaleString('pt-BR')}</td><td>{i.reserva.toLocaleString('pt-BR')} un</td><td>{i.falta.toLocaleString('pt-BR')} un</td><td><span className={`status ${i.falta?'warn':'ok'}`}>{i.falta?'PCP PENDENTE':'RESERVADO'}</span></td></tr>)}</tbody></table></div>
      {faltantes.length>0&&<div className="sales-summary mt-3"><span>Existem produtos em falta. A necessidade líquida já foi criada para análise do PCP.</span><button className="sales-btn primary" onClick={()=>go('/pcp')}><Factory size={17}/> ENVIAR PRODUTOS FALTANTES PARA PCP</button></div>}
      {faltantes.length===0&&<div className="sales-summary"><span>Todos os itens foram atendidos por reserva de estoque.</span><button className="sales-btn" onClick={()=>go('/comercial')}>Voltar para Carteira</button></div>}
    </section>}
   </>}
   </main>
  </section>
 {printOpen&&<div className="sales-print-overlay" role="dialog" aria-modal="true"><section className="sales-print-modal"><div className="sales-form-title"><div><div className="sales-kicker">IMPRESSÃO</div><h2>Relatório de pedidos</h2></div><button className="sales-btn" onClick={()=>setPrintOpen(false)}>FECHAR</button></div><label className="sales-print-option">Filtro<select value={printFilter} onChange={e=>setPrintFilter(e.target.value)}><option value="TODOS">Todos os pedidos</option><option value="PRONTOS">Pedidos prontos</option><option value="PENDENTES">Pedidos pendentes</option><option value="PRODUZINDO">Pedidos produzindo</option></select></label><p className="sales-note">A impressão deve usar o layout oficial da empresa/cliente, identificar Vendas e registrar o usuário responsável.</p><div className="sales-actions"><button className="sales-btn" onClick={()=>setPrintOpen(false)}>CANCELAR</button><button className="sales-btn primary" onClick={()=>printOrders(printFilter)}>IMPRIMIR RELATÓRIO</button></div></section></div>}
 </div>

}
