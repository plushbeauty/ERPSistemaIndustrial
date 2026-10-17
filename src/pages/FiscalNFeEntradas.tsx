import { useCallback, useEffect, useState } from 'react'
import { FileInput, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import FiscalSidebar from '../components/fiscal/FiscalSidebar'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id:string; codigo:string; descricao_tecnica:string; unidade_medida:string }
type Lot = { id:string; produto_id:string; numero_lote:string; status:string; validade_em:string|null }
type Address = { id:string; codigo:string; descricao:string|null; rua:string; prateleira:string; nivel:string }
type InvoiceItem = { produto_id:string; lote_id:string; endereco_id:string; quantidade:string; valor_liquido_unitario:string }
type Invoice = { id:string; chave_acesso:string; numero:string; serie:string; cnpj_emitente:string; razao_social_emitente:string; valor_total:number; itens:InvoiceItem[]; status:string; escriturada_em:string|null; created_at:string }
const blankItem=():InvoiceItem=>({produto_id:'',lote_id:'',endereco_id:'',quantidade:'',valor_liquido_unitario:''})
const input='h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20'
const label='mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600'
const button='inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export default function FiscalNFeEntradas(){
 const [company,setCompany]=useState('')
 const [products,setProducts]=useState<Product[]>([])
 const [lots,setLots]=useState<Lot[]>([])
 const [addresses,setAddresses]=useState<Address[]>([])
 const [rows,setRows]=useState<Invoice[]>([])
 const [editing,setEditing]=useState('')
 const [form,setForm]=useState({chave_acesso:'',numero:'',serie:'',cnpj_emitente:'',razao_social_emitente:'',valor_total:''})
 const [items,setItems]=useState<InvoiceItem[]>([blankItem()])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')

 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   setCompany(tenant.data)
   const [productRows,lotRows,addressRows,invoiceRows]=await Promise.all([
    fetchAllPages<Product>((from,to)=>supabase.from('engenharia_produtos').select('id,codigo,descricao_tecnica,unidade_medida',{count:'exact'}).eq('empresa_id',tenant.data).eq('ativo',true).order('codigo').order('id').range(from,to)),
    fetchAllPages<Lot>((from,to)=>supabase.from('estoque_lotes').select('id,produto_id,numero_lote,status,validade_em',{count:'exact'}).eq('empresa_id',tenant.data).order('numero_lote').order('id').range(from,to)),
    fetchAllPages<Address>((from,to)=>supabase.from('estoque_enderecos').select('id,codigo,descricao,rua,prateleira,nivel',{count:'exact'}).eq('empresa_id',tenant.data).eq('ativo',true).order('codigo').order('id').range(from,to)),
    fetchAllPages<Invoice>((from,to)=>supabase.from('fiscal_nfe_entradas').select('id,chave_acesso,numero,serie,cnpj_emitente,razao_social_emitente,valor_total,itens,status,escriturada_em,created_at',{count:'exact'}).eq('empresa_id',tenant.data).order('created_at',{ascending:false}).order('id').range(from,to)),
   ])
   setProducts(productRows);setLots(lotRows);setAddresses(addressRows);setRows(invoiceRows)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar a escrituração fiscal.')}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{void load()},[load])

 function reset(){setEditing('');setForm({chave_acesso:'',numero:'',serie:'',cnpj_emitente:'',razao_social_emitente:'',valor_total:''});setItems([blankItem()]);setError('');setNotice('')}
 function edit(row:Invoice){
  if(row.status!=='rascunho')return
  setEditing(row.id);setForm({chave_acesso:row.chave_acesso,numero:row.numero,serie:row.serie,cnpj_emitente:row.cnpj_emitente,razao_social_emitente:row.razao_social_emitente,valor_total:String(row.valor_total)});setItems((row.itens??[]).map(item=>({produto_id:item.produto_id,lote_id:item.lote_id,endereco_id:item.endereco_id,quantidade:String(item.quantidade),valor_liquido_unitario:String(item.valor_liquido_unitario)})));setError('');setNotice('')
 }
 function updateItem(index:number,key:keyof InvoiceItem,value:string){setItems(current=>current.map((item,i)=>i===index?{...item,[key]:value,...(key==='produto_id'?{lote_id:''}:{})}:item))}
 async function save(){
  setBusy(true);setError('');setNotice('')
  try{
   if(!company)throw new Error('Empresa da sessão não identificada.')
   const accessKey=form.chave_acesso.replace(/\D/g,'')
   const cnpj=form.cnpj_emitente.replace(/\D/g,'')
   if(accessKey.length!==44)throw new Error('A chave de acesso deve conter exatamente 44 dígitos.')
   if(cnpj.length!==14)throw new Error('O CNPJ do emitente deve conter 14 dígitos.')
   const total=Number(form.valor_total)
   if(!Number.isFinite(total)||total<0)throw new Error('Informe um valor total válido e não negativo.')
   if(!form.numero.trim()||!form.serie.trim()||!form.razao_social_emitente.trim())throw new Error('Número, série e razão social do emitente são obrigatórios.')
   if(!items.length)throw new Error('Adicione pelo menos um item à nota.')
   const cleanItems=items.map((item,index)=>{
    const quantity=Number(item.quantidade),unitCost=Number(item.valor_liquido_unitario)
    if(!item.produto_id||!item.lote_id||!item.endereco_id||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitCost)||unitCost<0)throw new Error(`Confira produto, lote, endereço, quantidade e custo no item ${index+1}.`)
    const lot=lots.find(candidate=>candidate.id===item.lote_id)
    if(!lot||lot.produto_id!==item.produto_id)throw new Error(`O lote do item ${index+1} não pertence ao produto selecionado.`)
    return {produto_id:item.produto_id,lote_id:item.lote_id,endereco_id:item.endereco_id,quantidade:quantity,valor_liquido_unitario:unitCost}
   })
   const payload={empresa_id:company,chave_acesso:accessKey,numero:form.numero.trim(),serie:form.serie.trim(),cnpj_emitente:cnpj,razao_social_emitente:form.razao_social_emitente.trim(),valor_total:total,itens:cleanItems}
   const result=editing
    ? await supabase.from('fiscal_nfe_entradas').update(payload).eq('empresa_id',company).eq('id',editing).eq('status','rascunho').select('id').single()
    : await supabase.from('fiscal_nfe_entradas').insert(payload).select('id').single()
   if(result.error)throw result.error
   reset();setNotice(editing?'Rascunho da NF-e atualizado.':'NF-e de entrada salva como rascunho.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a NF-e.')}
  finally{setBusy(false)}
 }
 async function post(id:string){
  setBusy(true);setError('');setNotice('')
  try{const result=await supabase.rpc('erp_escriturar_nfe_entrada',{p_nfe_id:id});if(result.error)throw result.error;setNotice('NF-e escriturada e estoque/custo médio atualizados transacionalmente.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível escriturar a NF-e.')}
  finally{setBusy(false)}
 }

 return <main className="erp-dense fiscal-workspace min-h-screen bg-[#f8fafc] p-2 text-slate-900 md:p-3">
  <FiscalSidebar/>
  <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"><div className="flex items-center gap-2"><FileInput size={18} className="text-sky-700"/><div><p className="text-[9px] font-bold uppercase tracking-wider text-[#2D8DB8]">FISCAL · ESTOQUE · CUSTO MÉDIO</p><h1 className="text-sm font-semibold">NF-e de entrada</h1><p className="text-[10px] text-slate-500">Rascunho de documento, itens por produto/lote/endereço e escrituração transacional.</p></div></div><button type="button" className={button} onClick={()=>void load()} disabled={busy}><RefreshCw size={13}/> Atualizar</button></header>
  {(error||notice)&&<div role={error?'alert':'status'} className={`mb-3 border p-2 text-xs ${error?'border-rose-300 bg-rose-50 text-rose-800':'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error||notice}</div>}
  <section className="mb-3 border border-slate-200 bg-white p-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold">{editing?'Editar rascunho':'Nova entrada'}</h2>{editing&&<button type="button" className={button} onClick={reset}>Cancelar edição</button>}</div>
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
    <label><span className={label}>Chave de acesso (44 dígitos)</span><input className={input} inputMode="numeric" maxLength={60} value={form.chave_acesso} onChange={e=>setForm({...form,chave_acesso:e.target.value})}/></label>
    <label><span className={label}>Número</span><input className={input} maxLength={20} value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})}/></label>
    <label><span className={label}>Série</span><input className={input} maxLength={10} value={form.serie} onChange={e=>setForm({...form,serie:e.target.value})}/></label>
    <label><span className={label}>CNPJ emitente</span><input className={input} inputMode="numeric" maxLength={18} value={form.cnpj_emitente} onChange={e=>setForm({...form,cnpj_emitente:e.target.value})}/></label>
    <label className="sm:col-span-2"><span className={label}>Razão social do emitente</span><input className={input} maxLength={200} value={form.razao_social_emitente} onChange={e=>setForm({...form,razao_social_emitente:e.target.value})}/></label>
    <label><span className={label}>Valor total da nota</span><input className={input} type="number" min="0" step="0.01" value={form.valor_total} onChange={e=>setForm({...form,valor_total:e.target.value})}/></label>
   </div>
   <div className="mt-3 flex items-center justify-between"><h3 className="text-xs font-semibold">Itens para recebimento</h3><button type="button" className={button} onClick={()=>setItems(current=>[...current,blankItem()])}><Plus size={13}/> Adicionar item</button></div>
   <div className="mt-2 space-y-2">{items.map((item,index)=><div key={index} className="grid grid-cols-1 gap-2 border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 xl:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto]">
    <label><span className={label}>Produto</span><select className={input} value={item.produto_id} onChange={e=>updateItem(index,'produto_id',e.target.value)}><option value="">Selecione produto</option>{products.map(product=><option key={product.id} value={product.id}>{product.codigo} · {product.descricao_tecnica}</option>)}</select></label>
    <label><span className={label}>Lote</span><select className={input} value={item.lote_id} onChange={e=>updateItem(index,'lote_id',e.target.value)} disabled={!item.produto_id}><option value="">Selecione lote</option>{lots.filter(lot=>lot.produto_id===item.produto_id).map(lot=><option key={lot.id} value={lot.id}>{lot.numero_lote} · {lot.status}{lot.validade_em?` · Val. ${lot.validade_em}`:''}</option>)}</select></label>
    <label><span className={label}>Endereço de destino</span><select className={input} value={item.endereco_id} onChange={e=>updateItem(index,'endereco_id',e.target.value)}><option value="">Selecione endereço</option>{addresses.map(address=><option key={address.id} value={address.id}>{address.codigo} · {address.rua}/{address.prateleira}/{address.nivel}{address.descricao?` · ${address.descricao}`:''}</option>)}</select></label>
    <label><span className={label}>Quantidade</span><input className={input} type="number" min="0.000001" step="any" value={item.quantidade} onChange={e=>updateItem(index,'quantidade',e.target.value)}/></label>
    <label><span className={label}>Custo líquido unitário</span><input className={input} type="number" min="0" step="0.000001" value={item.valor_liquido_unitario} onChange={e=>updateItem(index,'valor_liquido_unitario',e.target.value)}/></label>
    <button type="button" className={`${button} self-end text-rose-700`} aria-label={`Remover item ${index+1}`} disabled={items.length===1} onClick={()=>setItems(current=>current.filter((_,i)=>i!==index))}><Trash2 size={14}/></button>
   </div>)}</div>
   <div className="mt-3 flex justify-end"><button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-[2px] bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50" onClick={()=>void save()} disabled={busy}><Save size={13}/>{busy?'Salvando…':'Salvar rascunho'}</button></div>
  </section>
  <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 p-2"><h2 className="text-xs font-semibold">Documentos de entrada</h2></div><div className="overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr>{['Número','Série','Chave','Emitente','Valor','Itens','Situação','Criada em','Ações'].map(name=><th key={name} className="h-8 whitespace-nowrap border-b border-[#2D8DB8] px-2 font-bold uppercase tracking-wide">{name}</th>)}</tr></thead><tbody>{busy&&!rows.length?<tr><td colSpan={9} className="p-4 text-center">Carregando…</td></tr>:rows.map(row=><tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50"><td className="px-2 py-2">{row.numero}</td><td className="px-2 py-2">{row.serie}</td><td className="max-w-48 truncate px-2 py-2" title={row.chave_acesso}>{row.chave_acesso}</td><td className="max-w-56 truncate px-2 py-2" title={row.razao_social_emitente}>{row.razao_social_emitente}</td><td className="whitespace-nowrap px-2 py-2 text-right">{Number(row.valor_total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 py-2 text-right">{row.itens?.length??0}</td><td className="px-2 py-2 font-semibold">{row.status}</td><td className="whitespace-nowrap px-2 py-2">{new Date(row.created_at).toLocaleString('pt-BR')}</td><td className="whitespace-nowrap px-2 py-2"><div className="flex gap-1">{row.status==='rascunho'&&<><button type="button" className={button} disabled={busy} onClick={()=>edit(row)}>Editar</button><button type="button" className={`${button} border-sky-800 bg-sky-800 text-white hover:bg-sky-900`} disabled={busy} onClick={()=>void post(row.id)}>Escriturar</button></>}</div></td></tr>)}{!busy&&!rows.length&&<tr><td colSpan={9} className="p-4 text-center text-slate-500">Nenhuma NF-e de entrada cadastrada.</td></tr>}</tbody></table></div></section>
 </main>
}
