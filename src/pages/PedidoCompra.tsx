import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, FileText, Printer, Search, Send, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Supplier={id:string;codigo:string|null;razao_social:string;nome_fantasia:string|null;documento:string|null}
type Product={id:string;codigo:string;nome:string;unidade:string|null;descricao:string|null;custo_ultimo:number}
type Item={produto_id:string;codigo:string;descricao:string;quantidade:string;unidade:string;preco:string;total:number}
type Order={id:string;numero:number;fornecedor_id:string;comprador_nome:string|null;condicao_pagamento:string|null;prazo_entrega:string|null;status:string;data_pedido:string;total:number}

const PAGE_SIZE=25
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const date=(v:string)=>new Date(v).toLocaleDateString('pt-BR')
const emptyItem=():Item=>({produto_id:'',codigo:'',descricao:'',quantidade:'1',unidade:'UN',preco:'0',total:0})

export default function PedidoCompra(){
 const [empresaId,setEmpresaId]=useState(''),[orders,setOrders]=useState<Order[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]),[products,setProducts]=useState<Product[]>([])
 const [page,setPage]=useState(0)
 const [selected,setSelected]=useState<string|null>(null),[supplierId,setSupplierId]=useState(''),[buyer,setBuyer]=useState(''),[payment,setPayment]=useState(''),[deadline,setDeadline]=useState(''),[notes,setNotes]=useState(''),[costCenter,setCostCenter]=useState(''),[deliveryLocation,setDeliveryLocation]=useState(''),[specification,setSpecification]=useState(''),[quoteRef,setQuoteRef]=useState(''),[fiscalStatus,setFiscalStatus]=useState('NAO_ANALISADO'),[fiscalOpinion,setFiscalOpinion]=useState('')
 const [items,setItems]=useState<Item[]>([emptyItem()]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [canEditOrder,setCanEditOrder]=useState(true)
 const selectedOrder=useMemo(()=>selected?orders.find(o=>o.id===selected):undefined,[selected,orders])
 const [lookup,setLookup]=useState<'supplier'|'product'|null>(null),[lookupIndex,setLookupIndex]=useState(0),[lookupText,setLookupText]=useState('')

 const load=async()=>{
  setBusy(true);setError('')
  try{
   const emp=await supabase.rpc('erp_current_empresa_id'); if(emp.error||!emp.data) throw emp.error??new Error('Empresa da sessão não identificada.')
   setEmpresaId(String(emp.data))
   const u=await supabase.auth.getUser()
   if(u.data.user){
    const p=await supabase.from('erp_usuarios').select('id,nome').eq('auth_user_id',u.data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle()
    if(p.data?.nome)setBuyer(p.data.nome)
   }
   const [s,p,o]=await Promise.all([
    fetchAllPages<Supplier>((from,to)=>supabase.from('erp_fornecedores').select('id,codigo,razao_social,nome_fantasia,documento',{count:'exact'}).eq('empresa_id',String(emp.data)).eq('ativo',true).order('razao_social').range(from,to)),
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,descricao,unidade,custo_ultimo',{count:'exact'}).eq('empresa_id',String(emp.data)).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<Order>((from,to)=>supabase.from('erp_pedidos_compra').select('id,numero,fornecedor_id,comprador_nome,condicao_pagamento,prazo_entrega,status,data_pedido,total',{count:'exact'}).eq('empresa_id',String(emp.data)).order('created_at',{ascending:false}).range(from,to))
   ])
   setSuppliers(s);setProducts(p);setOrders(o);setPage(current=>Math.min(current,Math.max(0,Math.ceil(o.length/PAGE_SIZE)-1)))
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar Pedido de Compra.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s])),[suppliers])
 const visibleOrders=orders.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)
 const pageCount=Math.max(1,Math.ceil(orders.length/PAGE_SIZE))
 const total=items.reduce((sum,i)=>sum+(Number(i.quantidade||0)*Number(i.preco||0)),0)
 const filteredSuppliers=suppliers.filter(s=>`${s.codigo??''} ${s.razao_social} ${s.nome_fantasia??''} ${s.documento??''}`.toLowerCase().includes(lookupText.toLowerCase()))
 const filteredProducts=products.filter(p=>`${p.codigo} ${p.nome} ${p.descricao??''}`.toLowerCase().includes(lookupText.toLowerCase()))

 const selectProduct=(p:Product,index:number)=>{
  setItems(current=>current.map((item,i)=>i===index?{...item,produto_id:p.id,codigo:p.codigo,descricao:p.nome,unidade:p.unidade||'UN',preco:String(Number(p.custo_ultimo||0)),total:Number(item.quantidade||0)*Number(p.custo_ultimo||0)}:item))
  setLookup(null);setLookupText('')
 }
 const updateItem=(index:number,patch:Partial<Item>)=>setItems(current=>current.map((item,i)=>{if(i!==index)return item;const next={...item,...patch};return {...next,total:Number(next.quantidade||0)*Number(next.preco||0)}}))

 const reset=()=>{setSelected(null);setCanEditOrder(true);setSupplierId('');setPayment('');setDeadline('');setNotes('');setCostCenter('');setDeliveryLocation('');setSpecification('');setQuoteRef('');setFiscalStatus('NAO_ANALISADO');setFiscalOpinion('');setItems([emptyItem()]);setMessage('');setError('')}
 const save=async(status:'RASCUNHO'|'PENDENTE_APROVACAO')=>{
  setBusy(true);setError('');setMessage('')
  try{
   if(!canEditOrder)throw new Error('Pedidos finalizados não podem ser alterados.')
   if(!empresaId)throw new Error('Empresa não identificada.')
   if(!supplierId)throw new Error('Selecione o fornecedor.')
   const valid=items.filter(i=>i.produto_id&&Number(i.quantidade)>0)
   if(!valid.length)throw new Error('Inclua ao menos um produto real no pedido.')
   if(valid.some(i=>Number(i.preco)<0))throw new Error('Preço unitário inválido.')
   const result=await supabase.rpc('erp_compras_salvar_pedido',{
    p_pedido_id:selected,
    p_fornecedor_id:supplierId,
    p_comprador_nome:buyer.trim()||null,
    p_condicao_pagamento:payment.trim()||null,
    p_prazo_entrega:deadline||null,
    p_observacoes:notes.trim()||null,
    p_status:status,
    p_itens:valid.map(i=>({produto_id:i.produto_id,quantidade:Number(i.quantidade),unidade:i.unidade||'UN',preco_unitario:Number(i.preco||0)}))
   })
   if(result.error)throw result.error
   const saved=Array.isArray(result.data)?result.data[0]:result.data
   if(!saved||typeof saved!=='object'||!('id' in saved))throw new Error('O banco não retornou o pedido salvo.')
   const id=String(saved.id)
   const meta=await supabase.from('erp_pedidos_compra').update({centro_custo:costCenter.trim()||null,local_entrega:deliveryLocation.trim()||null,especificacao_tecnica:specification.trim()||null,referencia_cotacao:quoteRef.trim()||null}).eq('id',id).eq('empresa_id',empresaId).select('id').single()
   if(meta.error) throw meta.error
   setMessage(status==='PENDENTE_APROVACAO'?'Pedido enviado para aprovação.':'Pedido salvo como rascunho.')
   await load()
   setSelected(id)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o pedido.')}finally{setBusy(false)}
 }
 const openOrder=async(id:string)=>{
  setBusy(true);setError('');setMessage('')
  try{
   const [o,i]=await Promise.all([
    supabase.from('erp_pedidos_compra').select('*').eq('id',id).eq('empresa_id',empresaId).single(),
    supabase.from('erp_pedidos_compra_itens').select('*').eq('pedido_id',id).eq('empresa_id',empresaId).order('created_at')
   ])
   if(o.error)throw o.error;if(i.error)throw i.error
   setSelected(id);setCanEditOrder(['RASCUNHO','PENDENTE_APROVACAO'].includes(o.data.status));setSupplierId(o.data.fornecedor_id);setBuyer(o.data.comprador_nome??'');setPayment(o.data.condicao_pagamento??'');setDeadline(o.data.prazo_entrega??'');setNotes(o.data.observacoes??'');setCostCenter(o.data.centro_custo??'');setDeliveryLocation(o.data.local_entrega??'');setSpecification(o.data.especificacao_tecnica??'');setQuoteRef(o.data.referencia_cotacao??'');setFiscalStatus(o.data.fiscal_status??'NAO_ANALISADO');setFiscalOpinion(o.data.fiscal_parecer??'')
   setItems((i.data??[]).map(x=>({produto_id:x.produto_id,codigo:x.codigo_produto,descricao:x.descricao_produto,quantidade:String(x.quantidade),unidade:x.unidade,preco:String(x.preco_unitario),total:Number(x.total)})))
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o pedido.')}finally{setBusy(false)}
 }
 const decideApproval=async(approved:boolean)=>{if(!selected)return;setBusy(true);setError('');setMessage('');try{const r=await supabase.rpc('erp_compras_aprovar_pedido',{p_pedido_id:selected,p_aprovado:approved,p_motivo:approved?null:'Pedido devolvido para revisão.'});if(r.error)throw r.error;setMessage(approved?'Pedido aprovado para compra.':'Pedido rejeitado e devolvido para revisão.');await load();await openOrder(selected)}catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a aprovação.')}finally{setBusy(false)}}
 const remove=async()=>{if(!selected||!canEditOrder)return;if(!window.confirm('Excluir este pedido de compra?'))return;setBusy(true);try{const r=await supabase.from('erp_pedidos_compra').delete().eq('id',selected).eq('empresa_id',empresaId).select('id').single();if(r.error)throw r.error;reset();await load();setMessage('Pedido excluído.')}catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir o pedido.')}finally{setBusy(false)}}
 const print=()=>window.print()

 return <VendasLayout title="Pedido de compra" subtitle="Suprimentos • fornecedor • aprovação • recebimento"><main className="pc-page">
  <style>{`.pc-page{min-height:100vh;background:#f8fafc;color:#0f172a;padding:24px}.pc-wrap{max-width:1500px;margin:0 auto}.pc-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.pc-eyebrow{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2563eb}.pc-header h1{margin:5px 0;font-size:30px}.pc-header p{margin:0;color:#64748b}.pc-actions{display:flex;gap:8px;flex-wrap:wrap}.pc-btn{min-height:44px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;padding:0 13px;display:inline-flex;align-items:center;gap:7px;font-weight:800;cursor:pointer}.pc-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}.pc-btn.danger{color:#b91c1c;border-color:#fecaca;background:#fff}.pc-msg{padding:10px 12px;margin-bottom:12px;border-radius:7px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0}.pc-error{padding:10px 12px;margin-bottom:12px;border-radius:7px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca}.pc-list,.pc-card{background:#fff;border:1px solid #dbe3ea;border-radius:8px;box-shadow:0 2px 8px rgba(15,23,42,.05)}.pc-table{width:100%;border-collapse:collapse}.pc-table th,.pc-table td{height:54px;padding:0 12px;text-align:left;border-bottom:1px solid #edf1f4}.pc-table th{background:#f8fafc;color:#64748b;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.pc-table td{font-size:12px}.pc-table tbody tr{cursor:pointer}.pc-table tbody tr:hover{background:#f8fafc}.pc-status{font-size:10px;font-weight:900;padding:5px 8px;border-radius:5px;background:#eef2ff;color:#3730a3}.pc-detail{margin-top:16px;padding:18px}.pc-detail-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}.pc-detail-head h2{margin:0;font-size:19px}.pc-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:12px}.pc-field{display:grid;gap:6px;font-size:11px;font-weight:800;color:#334155}.pc-field input,.pc-field textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#111827;padding:10px 11px;font:inherit}.pc-field textarea{min-height:70px;resize:vertical}.pc-field.wide{grid-column:1/-1}.pc-supplier{display:flex;gap:7px}.pc-supplier input{flex:1}.pc-lupa{width:44px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;display:grid;place-items:center;cursor:pointer}.pc-items{margin-top:18px;overflow-x:auto}.pc-items table{min-width:850px}.pc-items input{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:5px;padding:8px;color:#111827;background:#fff}.pc-item-actions{display:flex;justify-content:flex-end;margin-top:9px}.pc-total{display:flex;justify-content:flex-end;align-items:center;gap:16px;margin-top:16px;font-size:13px}.pc-total strong{font-size:24px}.pc-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0}.pc-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.62);display:grid;place-items:center;padding:20px;z-index:10000}.pc-modal{width:min(950px,100%);max-height:85vh;overflow:auto;background:#fff;border-radius:9px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.25)}.pc-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.pc-modal-head h3{margin:0}.pc-search{display:flex;align-items:center;gap:8px;border:1px solid #cbd5e1;border-radius:7px;padding:0 10px;margin-bottom:12px}.pc-search input{border:0;outline:0;width:100%;padding:11px;color:#111827}.pc-empty{padding:30px;text-align:center;color:#64748b}.pc-remove{border:0;background:transparent;color:#b91c1c;cursor:pointer}@media(max-width:900px){.pc-page{padding:14px}.pc-header{flex-direction:column}.pc-grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.pc-grid{grid-template-columns:1fr}.pc-actions,.pc-footer{justify-content:stretch}.pc-actions .pc-btn,.pc-footer .pc-btn{flex:1}}
@media print{.pc-page{background:#fff;padding:0}.pc-header,.pc-list,.pc-footer,.pc-actions,.pc-eyebrow,.pc-msg,.pc-error,.pc-item-actions{display:none!important}.pc-detail{box-shadow:none;border:0;margin:0}.pc-field input,.pc-field textarea{border:0;padding:0}.pc-page *{color:#000!important}.pc-items{overflow:visible}.pc-table th,.pc-table td{height:54px}}`}</style>
  <div className="pc-wrap">
   <header className="pc-header"><div><div className="pc-eyebrow">COMPRAS • PEDIDO DE COMPRA</div><h1>Pedido de Compra</h1><p>Solicitação formal de aquisição com fornecedor, itens, preços e aprovação.</p></div><div className="pc-actions"><Link className="pc-btn" to="/compras/rfq"><ChevronLeft size={16}/> Cotações</Link><button type="button" className="pc-btn" onClick={()=>{reset();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}}><FileText size={16}/> Novo pedido</button><button type="button" className="pc-btn" onClick={print}><Printer size={16}/> Imprimir</button></div></header>
   {message&&<div className="pc-msg">{message}</div>}{error&&<div className="pc-error">{error}</div>}
   <section className="pc-list"><table className="pc-table"><thead><tr><th>Nº</th><th>Fornecedor</th><th>Status</th><th>Data</th><th>Total</th></tr></thead><tbody>{visibleOrders.map((o,index)=><tr key={o.id} style={{background:index%2?'#f8fafc':'#fff'}} onClick={()=>void openOrder(o.id)}><td><strong>PC-{String(o.numero).padStart(4,'0')}</strong></td><td>{supplierMap.get(o.fornecedor_id)?.razao_social??'Fornecedor não localizado'}</td><td><span className="pc-status">{o.status}</span></td><td>{date(o.data_pedido)}</td><td>{money(Number(o.total))}</td></tr>)}{!visibleOrders.length&&<tr><td className="pc-empty" colSpan={5}>Nenhum Pedido de Compra cadastrado.</td></tr>}</tbody></table></section>
   <nav aria-label="Paginação dos pedidos" style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10,margin:'10px 0'}}><button className="pc-btn" type="button" disabled={page===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Anterior</button><span aria-live="polite">Página {page+1} de {pageCount}</span><button className="pc-btn" type="button" disabled={page+1>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount-1,value+1))}>Próxima</button></nav>

   <section className="pc-card pc-detail">
    <div className="pc-detail-head"><h2>{selected?'Detalhe do Pedido':'Novo Pedido de Compra'}</h2>{selected&&canEditOrder&&<button className="pc-btn danger" disabled={busy} onClick={()=>void remove()}><Trash2 size={16}/> Excluir</button>}</div>
    {!canEditOrder&&<div className="pc-msg" role="status">Pedido finalizado: somente consulta disponível.</div>}
    <fieldset disabled={!canEditOrder} style={{border:0,padding:0,margin:0,minWidth:0}}>
    <div className="pc-grid">
    <label className="pc-field"><span>Centro de custo</span><input value={costCenter} onChange={e=>setCostCenter(e.target.value)} placeholder="Ex.: Produção / PCP"/></label>
    <label className="pc-field"><span>Local de entrega</span><input value={deliveryLocation} onChange={e=>setDeliveryLocation(e.target.value)} placeholder="Almoxarifado / endereço"/></label>
    <label className="pc-field"><span>Referência da cotação</span><input value={quoteRef} onChange={e=>setQuoteRef(e.target.value)} placeholder="RFQ / proposta"/></label>
    <label className="pc-field"><span>Validação fiscal</span><input value={fiscalStatus} readOnly/></label>
    <label className="pc-field wide"><span>Parecer fiscal</span><input value={fiscalOpinion} readOnly placeholder="Ainda não analisado pelo Fiscal"/></label>
    <label className="pc-field wide"><span>Especificação técnica da compra</span><textarea value={specification} onChange={e=>setSpecification(e.target.value)} placeholder="Material, norma, dimensão, acabamento, tolerância, lote, certificado, embalagem e demais requisitos."/></label>

     <label className="pc-field">Fornecedor
      <div className="pc-supplier"><input value={supplierMap.get(supplierId)?.razao_social??''} readOnly placeholder="Use a lupa para localizar fornecedor"/><button className="pc-lupa" type="button" onClick={()=>{setLookup('supplier');setLookupText('')}}><Search size={18}/></button></div>
     </label>
     <label className="pc-field">Condição de pagamento<input value={payment} onChange={e=>setPayment(e.target.value)} placeholder="Ex.: 28/42 dias"/></label>
     <label className="pc-field">Prazo de entrega<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
     <label className="pc-field">Comprador<input value={buyer} onChange={e=>setBuyer(e.target.value)} /></label>
     <label className="pc-field wide">Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)} /></label>
    </div>
    <div className="pc-items"><table className="pc-table"><thead><tr><th>ITEM / PRODUTO</th><th>QTD</th><th>UN</th><th>PREÇO</th><th>TOTAL</th><th></th></tr></thead><tbody>{items.map((item,index)=><tr key={index}><td><div className="pc-supplier"><input value={item.codigo?item.codigo+' — '+item.descricao:''} readOnly placeholder="Localizar produto"/><button className="pc-lupa" type="button" onClick={()=>{setLookupIndex(index);setLookup('product');setLookupText('')}}><Search size={16}/></button></div></td><td><input type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e=>updateItem(index,{quantidade:e.target.value})}/></td><td>{item.unidade}</td><td><input type="number" min="0" step="0.0001" value={item.preco} onChange={e=>updateItem(index,{preco:e.target.value})}/></td><td><strong>{money(item.total)}</strong></td><td><button className="pc-remove" type="button" onClick={()=>setItems(v=>v.length>1?v.filter((_,i)=>i!==index):[emptyItem()])}><X size={17}/></button></td></tr>)}</tbody></table></div>
    <div className="pc-item-actions"><button className="pc-btn" type="button" onClick={()=>setItems(v=>[...v,emptyItem()])}>+ Adicionar item</button></div>
    <div className="pc-total"><span>TOTAL DO PEDIDO</span><strong>{money(total)}</strong></div>
    </fieldset>
    <footer className="pc-footer"><button className="pc-btn" type="button" onClick={reset}><ChevronLeft size={16}/> Cancelar</button>{selectedOrder?.status==='PENDENTE_APROVACAO'&&<><button className="pc-btn" type="button" disabled={busy} onClick={()=>void decideApproval(false)}>Rejeitar</button><button className="pc-btn primary" type="button" disabled={busy} onClick={()=>void decideApproval(true)}><Check size={16}/> Aprovar compra</button></>}{canEditOrder&&<><button className="pc-btn" type="button" disabled={busy} onClick={()=>void save('RASCUNHO')}><Check size={16}/> Salvar</button><button className="pc-btn primary" type="button" disabled={busy} onClick={()=>void save('PENDENTE_APROVACAO')}><Send size={16}/> Enviar aprovação</button></>}</footer>
   </section>
  </div>
  {lookup&&<div className="pc-modal-bg" onMouseDown={e=>{if(e.currentTarget===e.target)setLookup(null)}}><div className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-lookup-title"><div className="pc-modal-head"><div><div className="pc-eyebrow">PESQUISA REAL</div><h3 id="pc-lookup-title">{lookup==='supplier'?'Localizar fornecedor':'Localizar produto / material'}</h3></div><button type="button" className="pc-btn" aria-label="Fechar pesquisa" onClick={()=>setLookup(null)}><X size={16}/></button></div><div className="pc-search"><Search size={17}/><input autoFocus value={lookupText} onChange={e=>setLookupText(e.target.value)} placeholder="Código, descrição, CNPJ ou nome…"/></div>{lookup==='supplier'?<table className="pc-table"><thead><tr><th>Código</th><th>Razão social</th><th>Nome fantasia</th><th>Documento</th></tr></thead><tbody>{filteredSuppliers.map(s=><tr key={s.id} onClick={()=>{setSupplierId(s.id);setLookup(null);setLookupText('')}}><td>{s.codigo||'—'}</td><td>{s.razao_social}</td><td>{s.nome_fantasia||'—'}</td><td>{s.documento||'—'}</td></tr>)}</tbody></table>:<table className="pc-table"><thead><tr><th>Código</th><th>Produto</th><th>Un.</th><th>Custo último</th></tr></thead><tbody>{filteredProducts.map(p=><tr key={p.id} onClick={()=>selectProduct(p,lookupIndex)}><td>{p.codigo}</td><td>{p.nome}</td><td>{p.unidade||'UN'}</td><td>{money(Number(p.custo_ultimo||0))}</td></tr>)}</tbody></table>}</div></div>}
 </main></VendasLayout>
}
