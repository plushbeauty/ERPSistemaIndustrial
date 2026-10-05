import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, RefreshCw, Search, ShoppingCart, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Product={id:string;codigo:string;codigo_barras:string|null;nome:string;preco_venda:number;unidade:string;categoria:string|null;estoque_atual:number}
type CartItem=Product&{quantidade:number}
type Box={id:string;codigo:string;descricao:string}
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

export default function VendasPDV(){
 const [products,setProducts]=useState<Product[]>([])
 const [boxes,setBoxes]=useState<Box[]>([])
 const [cart,setCart]=useState<CartItem[]>([])
 const [box,setBox]=useState('')
 const [query,setQuery]=useState('')
 const [payment,setPayment]=useState('DINHEIRO')
 const [discount,setDiscount]=useState('0')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const checkoutKey=useRef<string|null>(null)

 const load=async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa não identificada.')
   const id=String(company.data)
   const [p,b]=await Promise.all([
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,codigo_barras,nome,preco_venda,unidade,categoria,estoque_atual',{count:'exact'}).eq('empresa_id',id).eq('ativo',true).order('nome').range(from,to)),
    supabase.from('erp_caixas').select('id,codigo,descricao').eq('empresa_id',id).eq('ativo',true).order('codigo')
   ])
   if(b.error)throw b.error
   setProducts(p);setBoxes((b.data??[]) as Box[])
   if(!box&&b.data?.[0])setBox(b.data[0].id)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar o PDV.');setProducts([]);setBoxes([])}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return products.filter(p=>!q||p.codigo.toLowerCase().includes(q)||p.nome.toLowerCase().includes(q)||(p.codigo_barras??'').includes(q))},[products,query])
 const subtotal=cart.reduce((s,i)=>s+i.quantidade*Number(i.preco_venda||0),0)
 const disc=Math.min(subtotal,Math.max(0,Number(discount)||0))
 const total=subtotal-disc
 const add=(p:Product)=>{checkoutKey.current=null;setCart(c=>{const old=c.find(i=>i.id===p.id);return old?c.map(i=>i.id===p.id?{...i,quantidade:i.quantidade+1}:i):[...c,{...p,quantidade:1}]})}
 const finish=async()=>{
  if(!box){setError('Selecione o caixa operacional.');return}
  if(!cart.length){setError('Carrinho vazio.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const key=checkoutKey.current??crypto.randomUUID();checkoutKey.current=key
   const result=await supabase.rpc('erp_pdv_finalizar_venda',{p_caixa_id:box,p_cliente_id:null,p_forma_pagamento:payment,p_desconto:disc,p_chave_idempotencia:key,p_itens:cart.map(i=>({produto_id:i.id,quantidade:i.quantidade}))})
   if(result.error)throw result.error
   const row=(Array.isArray(result.data)?result.data[0]:result.data) as {numero?:number|string;total?:number}|null
   if(!row||row.numero==null||row.total==null)throw new Error('A finalização não retornou a venda persistida.')
   setMessage('Venda PDV #'+String(row.numero)+' finalizada · '+money(Number(row.total))+'.')
   setCart([]);setDiscount('0');checkoutKey.current=null
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível finalizar o PDV.')}
  finally{setBusy(false)}
 }

 return <VendasLayout title='PDV / venda rápida' subtitle='Caixa operacional · venda direta' onRefresh={()=>void load()}>
  <main className='sales-workspace sales-detail'>
   <div className='sales-orders-card' style={{padding:14,marginBottom:10}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
     <div><span className='sales-eyebrow'>OPERAÇÃO / PDV</span><h1 style={{margin:'5px 0 0',fontSize:18,fontWeight:650,color:'#123b50'}}>Caixa operacional</h1></div>
     <label style={{display:'flex',alignItems:'center',gap:7,fontSize:10,fontWeight:650,color:'#526a73'}}>Caixa<select aria-label='Caixa operacional' disabled={busy} value={box} onChange={e=>{checkoutKey.current=null;setBox(e.target.value)}} style={{height:30,border:'1px solid #d3e0e3',borderRadius:4,padding:'0 8px',fontSize:11}}>{boxes.map(b=><option key={b.id} value={b.id}>{b.codigo} — {b.descricao}</option>)}</select></label>
    </div>
   </div>
   {(error||message)&&<div className='sales-alert' style={{color:error?'#a43f35':'#23734e',background:error?'#fff5f3':'#eaf6ef',borderColor:error?'#f2c8c3':'#c9e5d5'}}>{error||message}</div>}
   <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(360px,440px)',gap:12}}>
    <section className='sales-orders-card' style={{padding:14}}>
     <div style={{display:'flex',gap:7}}><div className='sales-search' style={{flex:1}}><Search size={14}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder='Código, código de barras ou nome...'/></div><button type='button' onClick={()=>void load()} disabled={busy} className='sales-icon-action' title='Atualizar'><RefreshCw size={14}/></button></div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,marginTop:12}}>
      {visible.map(p=><button key={p.id} type='button' disabled={busy} onClick={()=>add(p)} style={{textAlign:'left',border:'1px solid #dfe8ea',background:'#fff',padding:10,borderRadius:5,color:'#294650'}}><span style={{display:'block',fontSize:9,color:'#71838a'}}>{p.codigo}</span><strong style={{display:'block',marginTop:3,fontSize:11,fontWeight:650,color:'#123b50'}}>{p.nome}</strong><span style={{display:'flex',justifyContent:'space-between',marginTop:9,fontSize:9,color:'#71838a'}}><span>Estoque {p.estoque_atual}</span><b style={{fontSize:10,color:'#315660'}}>{money(Number(p.preco_venda))}</b></span></button>)}
      {!visible.length&&<div className='sales-empty-state' style={{gridColumn:'1/-1'}}>Nenhum produto encontrado.</div>}
     </div>
    </section>
    <section className='sales-orders-card' style={{padding:14}}>
     <div style={{display:'flex',alignItems:'center',gap:7,color:'#123b50'}}><ShoppingCart size={16}/><strong style={{fontSize:12,fontWeight:650}}>Carrinho</strong></div>
     <div style={{maxHeight:380,overflow:'auto',marginTop:8}}>
      {cart.map(i=><div key={i.id} style={{display:'flex',alignItems:'center',gap:7,borderBottom:'1px solid #edf1f2',padding:'9px 0'}}><div style={{minWidth:0,flex:1}}><div style={{fontSize:11,fontWeight:600,color:'#294650',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{i.nome}</div><div style={{fontSize:9,color:'#87989d'}}>{money(i.preco_venda)} / {i.unidade}</div></div><input type='number' min='1' disabled={busy} aria-label={'Quantidade de '+i.nome} value={i.quantidade} onChange={e=>{checkoutKey.current=null;setCart(c=>c.map(x=>x.id===i.id?{...x,quantidade:Math.max(1,Number(e.target.value))}:x))}} style={{width:54,height:28,border:'1px solid #d3e0e3',borderRadius:3,textAlign:'center',fontSize:10}}/><strong style={{fontSize:10,color:'#315660'}}>{money(i.quantidade*i.preco_venda)}</strong></div>)}
      {!cart.length&&<div style={{padding:'45px 0',textAlign:'center',fontSize:10,color:'#8a999e'}}>Nenhum item no carrinho.</div>}
     </div>
     <div style={{borderTop:'1px solid #e5edef',marginTop:8,paddingTop:9,fontSize:10}}>
      <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:7}}><span>Desconto</span><input type='number' min='0' step='0.01' disabled={busy} value={discount} onChange={e=>{checkoutKey.current=null;setDiscount(e.target.value)}} style={{width:90,height:28,border:'1px solid #d3e0e3',borderRadius:3,padding:'0 7px',textAlign:'right',fontSize:10}}/></div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:9,fontSize:17,color:'#123b50'}}><span>Total</span><strong>{money(total)}</strong></div>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,marginTop:10}}>{[['DINHEIRO',Wallet],['CARTAO',CreditCard],['PIX',ShoppingCart]].map(([name,Icon])=><button key={String(name)} type='button' disabled={busy} onClick={()=>{checkoutKey.current=null;setPayment(String(name))}} style={{height:34,border:'1px solid #d7e3e6',borderRadius:4,background:payment===name?'#123b50':'#fff',color:payment===name?'#fff':'#526b74',fontSize:9}}><Icon size={13}/>{String(name)}</button>)}</div>
     <button type='button' disabled={busy||!cart.length} onClick={()=>void finish()} style={{width:'100%',height:38,marginTop:8,border:'1px solid #2d8db8',borderRadius:4,background:'#2d8db8',color:'#fff',fontSize:10,fontWeight:650}}>{busy?'FINALIZANDO…':'FINALIZAR VENDA'}</button>
    </section>
   </div>
  </main>
 </VendasLayout>
}
