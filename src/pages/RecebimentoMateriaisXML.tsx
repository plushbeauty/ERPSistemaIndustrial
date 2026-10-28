import { useEffect, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, FileCode2, RefreshCw, ShieldCheck, Upload, Warehouse } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Tab='xml'|'conferencia'|'estoque'
type Product={id:string;codigo:string;nome:string}
type Supplier={id:string;documento:string|null;ativo:boolean|null}
type Order={id:string;numero:number|string;fornecedor_id:string;status:string}
type OrderItem={id:string;pedido_id:string;produto_id:string;codigo_produto:string;descricao_produto:string;quantidade:number;unidade:string;preco_unitario:number}
type Item={item_nfe:number;codigo_xml:string;descricao_xml:string;ncm:string;unidade_xml:string;quantidade:number;valor_unitario:number;valor_total:number;produto_id:string;pedido_item_id:string;lote_interno:string;lote_fabricante:string;data_validade:string;endereco:string}
type Header={chave_acesso:string;numero_nfe:string;serie:string;cnpj_fornecedor:string;razao_social_fornecedor:string;data_emissao:string;valor_total:number;xml_nome_arquivo:string}
type Receipt={id:string;numero_nfe:string;serie:string|null;chave_acesso:string;cnpj_fornecedor:string|null;valor_total:number|null;status:string}
const empty:Header={chave_acesso:'',numero_nfe:'',serie:'',cnpj_fornecedor:'',razao_social_fornecedor:'',data_emissao:'',valor_total:0,xml_nome_arquivo:''}
const input='h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-600 disabled:bg-slate-100'
const label='mb-1 block text-[10px] font-black uppercase text-slate-500'
const btn='inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold disabled:opacity-50'
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n||0))
const digits=(s:string)=>s.replace(/\D/g,'')
function tag(p:Element|Document,name:string):string{return Array.from(p.getElementsByTagName('*')).find(x=>x.localName===name)?.textContent?.trim()||''}
function parseXml(source:string,filename:string):{header:Header;items:Item[]}{
 const doc=new DOMParser().parseFromString(source,'application/xml')
 if(doc.querySelector('parsererror'))throw new Error('XML inválido.')
 const inf=Array.from(doc.getElementsByTagName('*')).find(x=>x.localName==='infNFe')
 if(!inf)throw new Error('XML sem infNFe. Selecione o XML original da NF-e modelo 55.')
 const ide=Array.from(inf.children).find(x=>x.localName==='ide'),emit=Array.from(inf.children).find(x=>x.localName==='emit'),total=Array.from(inf.children).find(x=>x.localName==='total')
 if(!ide||!emit||!total)throw new Error('NF-e incompleta: faltam ide, emit ou total.')
 const key=(inf.getAttribute('Id')||'').replace(/^NFe/i,'')||tag(doc,'chNFe')
 const num=tag(ide,'nNF'),serie=tag(ide,'serie'),cnpj=digits(tag(emit,'CNPJ')||tag(emit,'CPF')),nome=tag(emit,'xNome'),data=tag(ide,'dhEmi')||tag(ide,'dEmi'),valor=Number(tag(total,'vNF'))
 if(!/^\d{44}$/.test(key)||!num||!serie||!cnpj||!nome||!Number.isFinite(valor))throw new Error('Cabeçalho da NF-e inválido.')
 const items:Item[]=Array.from(inf.getElementsByTagName('*')).filter(x=>x.localName==='det').map((det,i)=>{
  const prod=Array.from(det.children).find(x=>x.localName==='prod');if(!prod)throw new Error('Item sem grupo prod.')
  const read=(n:string)=>tag(prod,n),q=Number(read('qCom')),p=Number(read('vUnCom')),v=Number(read('vProd')),n=Number(det.getAttribute('nItem')||i+1)
  if(!read('cProd')||!read('xProd')||!Number.isFinite(q)||q<=0||!Number.isFinite(p)||p<0||!Number.isFinite(v)||v<0)throw new Error('Item NF-e inválido: '+n)
  return {item_nfe:n,codigo_xml:read('cProd'),descricao_xml:read('xProd'),ncm:read('NCM'),unidade_xml:read('uCom')||'UN',quantidade:q,valor_unitario:p,valor_total:v,produto_id:'',pedido_item_id:'',lote_interno:'',lote_fabricante:'',data_validade:'',endereco:''}
 })
 if(!items.length)throw new Error('NF-e sem itens.')
 return {header:{chave_acesso:key,numero_nfe:num,serie,cnpj_fornecedor:cnpj,razao_social_fornecedor:nome,data_emissao:data.slice(0,10),valor_total:valor,xml_nome_arquivo:filename},items}
}
export default function RecebimentoMateriaisXML(){
 const [tab,setTab]=useState<Tab>('xml'),[tenant,setTenant]=useState(''),[header,setHeader]=useState<Header>(empty),[items,setItems]=useState<Item[]>([])
 const [products,setProducts]=useState<Product[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]),[orders,setOrders]=useState<Order[]>([]),[orderItems,setOrderItems]=useState<OrderItem[]>([]),[orderId,setOrderId]=useState('')
 const [receipts,setReceipts]=useState<Receipt[]>([]),[filter,setFilter]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('')
 async function load():Promise<void>{
  setLoading(true);setError('')
  try{
   const c=await supabase.rpc('erp_current_empresa_id');if(c.error||!c.data)throw c.error??new Error('Empresa da sessão não identificada.')
   const id=String(c.data)
   const [p,s,o,r]=await Promise.all([
    fetchAllPages<Product>((a,b)=>supabase.from('erp_produtos').select('id,codigo,nome',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('codigo').range(a,b)),
    fetchAllPages<Supplier>((a,b)=>supabase.from('erp_fornecedores').select('id,documento,ativo',{count:'exact'}).eq('empresa_id',id).range(a,b)),
    fetchAllPages<Order>((a,b)=>supabase.from('erp_pedidos_compra').select('id,numero,fornecedor_id,status',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Receipt>((a,b)=>supabase.from('erp_recebimento_notas').select('id,numero_nfe,serie,chave_acesso,cnpj_fornecedor,valor_total,status',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b))
   ])
   setTenant(id);setProducts(p);setSuppliers(s);setOrders(o);setReceipts(r)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar dados reais do ERP.')}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 async function upload(e:ChangeEvent<HTMLInputElement>):Promise<void>{
  const f=e.target.files?.[0];e.target.value='';if(!f)return;setBusy(true);setError('');setMessage('')
  try{if(!/\.xml$/i.test(f.name))throw new Error('Selecione arquivo .xml.');const v=parseXml(await f.text(),f.name);if(receipts.some(r=>r.chave_acesso===v.header.chave_acesso))throw new Error('Esta NF-e já foi recebida.');setHeader(v.header);setItems(v.items);setOrderId('');setOrderItems([]);setTab('conferencia')}
  catch(x){setError(x instanceof Error?x.message:'Falha na leitura XML.')}finally{setBusy(false)}
 }
 async function chooseOrder(id:string):Promise<void>{
  setOrderId(id);setOrderItems([]);if(!id||!tenant)return;setBusy(true)
  try{setOrderItems(await fetchAllPages<OrderItem>((a,b)=>supabase.from('erp_pedidos_compra_itens').select('id,pedido_id,produto_id,codigo_produto,descricao_produto,quantidade,unidade,preco_unitario',{count:'exact'}).eq('empresa_id',tenant).eq('pedido_id',id).range(a,b)))}
  catch(x){setError(x instanceof Error?x.message:'Falha ao carregar itens do pedido.')}finally{setBusy(false)}
 }
 const order=orders.find(x=>x.id===orderId)
 const supplierOk=suppliers.some(s=>s.ativo!==false&&digits(s.documento||'')===digits(header.cnpj_fornecedor))
 const orderSupplierOk=Boolean(order&&suppliers.some(s=>s.id===order.fornecedor_id&&s.ativo!==false&&digits(s.documento||'')===digits(header.cnpj_fornecedor)))
 const matches=items.map(x=>{const p=products.find(y=>y.id===x.produto_id),o=orderItems.find(y=>y.id===x.pedido_item_id);return {item:x,orderItem:o,ok:Boolean(p&&o&&p.id===o.produto_id&&Math.abs(Number(o.preco_unitario)-x.valor_unitario)<=.01&&x.quantidade>0&&x.quantidade<=Number(o.quantidade))}})
 const allOk=matches.length>0&&matches.every(x=>x.ok),lotsMissing=items.some(x=>!x.lote_interno.trim()||!x.lote_fabricante.trim()||!x.endereco.trim())
 function change(i:number,v:Partial<Item>):void{setItems(old=>old.map((x,j)=>i===j?{...x,...v}:x))}
 async function confirm():Promise<void>{
  setError('');setMessage('')
  if(!order||!header.chave_acesso){setError('Selecione NF-e e pedido.');return}
  if(!supplierOk||!orderSupplierOk){setError('CNPJ do emitente não corresponde ao fornecedor ativo do pedido.');return}
  if(!allOk){setError('Bloqueado: há divergência de produto, quantidade ou preço.');return}
  if(lotsMissing){setError('Preencha lotes e endereço físico em todos os itens.');setTab('estoque');return}
  setBusy(true)
  try{
   const payload=items.map(x=>{const p=products.find(y=>y.id===x.produto_id);if(!p)throw new Error('Vincule o produto mestre no item '+x.item_nfe);return {item_nfe:x.item_nfe,codigo_produto:p.codigo,descricao_produto:x.descricao_xml,unidade:x.unidade_xml,quantidade_total:x.quantidade,valor_unitario:x.valor_unitario,valor_total:x.valor_total,produto_id:x.produto_id,pedido_item_id:x.pedido_item_id}})
   const lots=items.map(x=>({item_nfe:x.item_nfe,lote_interno:x.lote_interno.trim(),lote_fabricante:x.lote_fabricante.trim(),data_validade:x.data_validade||null,quantidade:x.quantidade,endereco:x.endereco.trim()}))
   const {data,error:e}=await supabase.rpc('erp_confirmar_recebimento_nfe_com_pedido',{p_header:{...header,pedido_compra_id:orderId},p_items:payload,p_lotes:lots,p_pedido_id:orderId})
   if(e)throw e;if(!data)throw new Error('Banco não retornou o protocolo de recebimento.')
   setMessage('Entrada concluída. Protocolo '+String(data)+'. Estoque atualizado pela transação do banco.');setHeader(empty);setItems([]);setOrderId('');setOrderItems([]);setTab('xml');await load()
  }catch(x){setError(x instanceof Error?x.message:'Recebimento não confirmado.')}finally{setBusy(false)}
 }
 const receiptsFiltered=receipts.filter(x=>[x.numero_nfe,x.chave_acesso,x.cnpj_fornecedor||'',x.status].some(y=>String(y).toLowerCase().includes(filter.toLowerCase())))
 return <main className="mx-auto w-full min-w-0 max-w-[1500px] space-y-4 p-3 md:p-5">
  <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-white"><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">WMS · Suprimentos · Fiscal</p><h1 className="text-base font-extrabold">Recebimento de Materiais e Entrada de Estoque</h1><p className="text-[11px] text-slate-300">XML NF-e · conferência de três vias · rastreabilidade por lote.</p></div><span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-[10px] font-bold text-cyan-200"><ShieldCheck size={14} className="mr-1 inline"/>Atualizado · Padrão Premium · 28/10/2026</span></header>
  {(error||message)&&<div role={error?'alert':'status'} className={'flex gap-2 rounded-lg border px-3 py-2 text-xs '+(error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error?<AlertTriangle size={16}/>:<CheckCircle2 size={16}/>}<span>{error||message}</span></div>}
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><nav className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">{([{id:'xml',name:'1. Arquivo XML',icon:FileCode2},{id:'conferencia',name:'2. Conferência de 3 vias',icon:CheckCircle2},{id:'estoque',name:'3. Lotes / armazenagem',icon:Warehouse}] as const).map(t=><button key={t.id} className={btn+' '+(tab===t.id?'bg-white text-sky-700 shadow':'text-slate-500')} onClick={()=>setTab(t.id)} disabled={t.id!=='xml'&&!items.length}><t.icon size={14}/>{t.name}</button>)}<span className="ml-auto p-2 text-[10px] text-slate-400">{loading?'Carregando…':products.length+' produtos · '+orders.length+' pedidos'}</span></nav>
  {tab==='xml'&&<div className="space-y-4 p-4"><div className="grid gap-3 lg:grid-cols-2"><div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileCode2 size={30} className="mx-auto text-slate-400"/><h2 className="mt-2 text-sm font-extrabold">Importar XML original da NF-e</h2><p className="mt-1 text-[11px] text-slate-500">Leitura real do arquivo; nenhum registro demonstrativo.</p><label className={btn+' mt-4 cursor-pointer bg-slate-900 text-white'}><Upload size={14}/>{busy?'Processando…':'Selecionar .XML'}<input type="file" accept=".xml,application/xml,text/xml" className="sr-only" onChange={e=>void upload(e)} disabled={busy||loading}/></label></div><div className="rounded-xl border p-4 text-[11px] text-slate-600"><b className="mb-2 block text-xs text-slate-800">Travas de segurança</b><p>• Chave NF-e com 44 dígitos.</p><p>• CNPJ do emitente comparado ao fornecedor.</p><p>• Produto, quantidade e preço conferidos com o pedido.</p><p>• Lote e endereço exigidos antes da entrada.</p><p>• Atualização do saldo por RPC transacional.</p></div></div>
   <div className="overflow-x-auto rounded-lg border"><div className="flex items-center justify-between bg-slate-50 p-2"><b className="text-[11px] uppercase">Histórico de recebimentos</b><input className={input+' max-w-64'} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar NF / chave / status"/></div><table className="w-full min-w-[700px] text-left text-[11px]"><thead className="bg-slate-100"><tr><th className="p-2">NF / série</th><th className="p-2">Chave</th><th className="p-2">CNPJ</th><th className="p-2">Valor</th><th className="p-2">Status</th></tr></thead><tbody>{receiptsFiltered.map(r=><tr key={r.id} className="border-t"><td className="p-2">{r.numero_nfe} / {r.serie||'—'}</td><td className="p-2 font-mono">{r.chave_acesso}</td><td className="p-2">{r.cnpj_fornecedor||'—'}</td><td className="p-2">{money(Number(r.valor_total||0))}</td><td className="p-2">{r.status}</td></tr>)}{!receiptsFiltered.length&&<tr><td colSpan={5} className="p-4 text-center text-slate-400">Nenhum recebimento encontrado.</td></tr>}</tbody></table></div></div>}
  {tab==='conferencia'&&<div className="space-y-4 p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">{[['Chave NF-e',header.chave_acesso],['Número / série',header.numero_nfe+' / '+header.serie],['Emissão',header.data_emissao],['Valor NF-e',money(header.valor_total)],['CNPJ emitente',header.cnpj_fornecedor],['Razão social',header.razao_social_fornecedor]].map(([n,v])=><div key={n} className="min-w-0"><label className={label}>{n}</label><input className={input} value={v} readOnly/></div>)}<div className="sm:col-span-2 xl:col-span-3"><label className={label}>Pedido de compra *</label><select className={input} value={orderId} onChange={e=>void chooseOrder(e.target.value)}><option value="">Selecione pedido real…</option>{orders.filter(o=>!/cancel|rejeit/i.test(o.status)).map(o=><option key={o.id} value={o.id}>PC {o.numero} · {o.status}</option>)}</select></div></div>
   <div className={'rounded-lg border px-3 py-2 text-[11px] font-bold '+(supplierOk&&orderSupplierOk?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-amber-200 bg-amber-50 text-amber-800')}>Via 1/3 — {supplierOk&&orderSupplierOk?'CNPJ do fornecedor conferido.':'pendente: confirme fornecedor e pedido.'}</div>
   <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1050px] text-left text-[11px]"><thead className="bg-slate-100"><tr><th className="p-2">Item XML</th><th className="p-2">Produto mestre</th><th className="p-2">Item pedido</th><th className="p-2">Qtd</th><th className="p-2">Preço NF</th><th className="p-2">Preço pedido</th><th className="p-2">Resultado</th></tr></thead><tbody>{items.map((x,i)=>{const m=matches[i];return <tr key={x.item_nfe} className="border-t"><td className="p-2"><b>{x.codigo_xml}</b><div>{x.descricao_xml}</div><small>NCM {x.ncm||'—'}</small></td><td className="p-2"><select className={input+' min-w-48'} value={x.produto_id} onChange={e=>change(i,{produto_id:e.target.value,pedido_item_id:''})}><option value="">Vincular produto…</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></td><td className="p-2"><select className={input+' min-w-48'} value={x.pedido_item_id} onChange={e=>change(i,{pedido_item_id:e.target.value})} disabled={!orderId}><option value="">Vincular item…</option>{orderItems.filter(o=>!x.produto_id||o.produto_id===x.produto_id).map(o=><option key={o.id} value={o.id}>{o.codigo_produto} · {o.descricao_produto}</option>)}</select></td><td className="p-2">{x.quantidade} {x.unidade_xml}</td><td className="p-2">{money(x.valor_unitario)}</td><td className="p-2">{m?.orderItem?money(Number(m.orderItem.preco_unitario)):'—'}</td><td className="p-2">{m?.ok?<span className="font-bold text-emerald-700">OK</span>:<span className="font-bold text-red-700">{m?.orderItem&&!m.ok?'DIVERGENTE':'PENDENTE'}</span>}</td></tr>})}</tbody></table></div>
   <div className="flex justify-between gap-3 rounded-lg border bg-slate-50 p-3 text-[11px]"><span>Vias 2/3 e 3/3: produto, pedido, quantidade e preço (± R$ 0,01).</span><button className={btn+' bg-sky-700 text-white'} onClick={()=>setTab('estoque')} disabled={!allOk||!orderSupplierOk}>Avançar para lotes</button></div></div>}
  {tab==='estoque'&&<div className="space-y-4 p-4"><p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-[11px]">Informe lote interno, lote do fabricante e endereço físico para cada item.</p><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[950px] text-left text-[11px]"><thead className="bg-slate-100"><tr><th className="p-2">Produto</th><th className="p-2">Qtd</th><th className="p-2">Lote interno *</th><th className="p-2">Lote fornecedor *</th><th className="p-2">Validade</th><th className="p-2">Endereço *</th></tr></thead><tbody>{items.map((x,i)=><tr key={x.item_nfe} className="border-t"><td className="p-2">{products.find(p=>p.id===x.produto_id)?.codigo||x.codigo_xml}<div>{x.descricao_xml}</div></td><td className="p-2">{x.quantidade} {x.unidade_xml}</td><td className="p-2"><input className={input} value={x.lote_interno} onChange={e=>change(i,{lote_interno:e.target.value})}/></td><td className="p-2"><input className={input} value={x.lote_fabricante} onChange={e=>change(i,{lote_fabricante:e.target.value})}/></td><td className="p-2"><input type="date" className={input} value={x.data_validade} onChange={e=>change(i,{data_validade:e.target.value})}/></td><td className="p-2"><input className={input} value={x.endereco} onChange={e=>change(i,{endereco:e.target.value})} placeholder="A-03-02"/></td></tr>)}</tbody></table></div><div className="flex justify-between gap-3 border-t pt-4"><button className={btn+' border bg-white'} onClick={()=>setTab('conferencia')}><RefreshCw size={14}/>Voltar</button><button className={btn+' bg-emerald-700 text-white'} disabled={busy||loading||!allOk||!orderSupplierOk||lotsMissing||!items.length} onClick={()=>void confirm()}><CheckCircle2 size={14}/>{busy?'Processando…':'Efetivar entrada e atualizar estoque'}</button></div></div>}
  </section>
 </main>
}
