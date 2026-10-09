import { useEffect, useMemo, useState } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Product={id:string;codigo:string;codigo_barras:string|null;nome:string;preco_venda:number;unidade:string;categoria:string|null;estoque_atual:number;permite_estoque_negativo:boolean}
type CartItem=Product&{quantidade:number}
type Box={id:string;codigo:string;descricao:string}
type Customer={id:string;codigo:string|null;nome:string;documento:string|null}

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export default function VendasPDV(){
 const [products,setProducts]=useState<Product[]>([]),[boxes,setBoxes]=useState<Box[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[cart,setCart]=useState<CartItem[]>([])
 const [box,setBox]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('TODOS'),[payment,setPayment]=useState('DINHEIRO'),[discount,setDiscount]=useState('0'),[customerId,setCustomerId]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [saleKey,setSaleKey]=useState(()=>crypto.randomUUID())
 const load=async()=>{setBusy(true);setError('');const company=await supabase.rpc('erp_current_empresa_id');if(company.error||!company.data){setError(company.error?.message||'Empresa não identificada.');setBusy(false);return}
  const [p,b,cu]=await Promise.all([
   fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,codigo_barras,nome,preco_venda,unidade,categoria,estoque_atual,permite_estoque_negativo',{count:'exact'}).eq('empresa_id',String(company.data)).eq('ativo',true).order('nome').range(from,to)),
   fetchAllPages<Box>((from,to)=>supabase.from('erp_caixas').select('id,codigo,descricao',{count:'exact'}).eq('empresa_id',String(company.data)).eq('ativo',true).order('codigo').range(from,to)),
   fetchAllPages<Customer>((from,to)=>supabase.from('erp_clientes').select('id,codigo,nome,documento',{count:'exact'}).eq('empresa_id',String(company.data)).eq('ativo',true).order('nome').range(from,to)),
  ])
  setProducts(p);setBoxes(b);setCustomers(cu);if(!box&&b[0])setBox(b[0].id);setBusy(false)}
 useEffect(()=>{void load()},[])
 const categories=useMemo(()=>{const values=products.map(product=>product.categoria).filter((value):value is string=>Boolean(value?.trim()));return Array.from(new Set(values)).sort((a,b)=>a.localeCompare(b,'pt-BR'))},[products])
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return products.filter(p=>(category==='TODOS'||p.categoria===category)&&(!q||p.codigo.toLowerCase().includes(q)||p.nome.toLowerCase().includes(q)||(p.codigo_barras||'').includes(q)))},[products,query,category])
 const subtotal=cart.reduce((s,i)=>s+i.quantidade*Number(i.preco_venda||0),0),disc=Math.min(subtotal,Math.max(0,Number(discount)||0)),total=subtotal-disc
 const add=(p:Product)=>{if(!p.permite_estoque_negativo&&p.estoque_atual<=0){setError(`Produto ${p.codigo} sem estoque disponível.`);return}setError('');setSaleKey(crypto.randomUUID());setCart(c=>{const found=c.find(i=>i.id===p.id);return found?c.map(i=>i.id===p.id?{...i,quantidade:i.quantidade+1}:i):[...c,{...p,quantidade:1}]})}
 const finish=async()=>{
  if(!box){setError('Selecione o caixa operacional.');return}
  if(!cart.length){setError('Carrinho vazio.');return}
  if(!Number.isFinite(Number(discount))||Number(discount)<0||Number(discount)>subtotal){setError('Desconto inválido: confira o valor informado e o subtotal.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const result=await supabase.rpc('erp_pdv_finalizar_venda',{
    p_caixa_id:box,
    p_cliente_id:customerId||null,
    p_forma_pagamento:payment,
    p_desconto:disc,
    p_chave_idempotencia:saleKey,
    p_itens:cart.map(item=>({produto_id:item.id,quantidade:item.quantidade}))
   })
   if(result.error)throw result.error
   const saved=Array.isArray(result.data)?result.data[0]:result.data
   if(!saved||typeof saved!=='object'||!('movimento_id' in saved)||!('numero' in saved)||!('total' in saved))throw new Error('O banco não confirmou o fechamento da venda.')
   setMessage('Venda PDV #'+String(saved.numero)+' finalizada. Total confirmado pelo banco: '+money(Number(saved.total)))
   setCart([]);setDiscount('0');setSaleKey(crypto.randomUUID())
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível finalizar o PDV.')}finally{setBusy(false)}
 }
 return (
  <VendasLayout title="PDV / Venda Rápida" subtitle="Frente de caixa • registrar venda, pagamento e itens" onRefresh={() => void load()} showStatusCards={false}>
   <main className="grid min-w-0 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section className="min-w-0 border border-slate-200 bg-white p-2">
     <div className="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_210px]">
      <label className="grid min-w-0 gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">Buscar produto / código de barras
       <span className="relative block"><Search size={14} className="absolute left-2 top-2 text-slate-400"/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Digite código ou nome do produto" className="h-[30px] w-full border border-slate-300 pl-7 pr-2 text-[11px] outline-none focus:border-[#2D8DB8]"/></span>
      </label>
      <label className="grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">Caixa operacional
       <select value={box} onChange={event=>{setBox(event.target.value);setSaleKey(crypto.randomUUID())}} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-[#2D8DB8]">
        <option value="">Selecione o caixa</option>{boxes.map(item=><option key={item.id} value={item.id}>{item.codigo} — {item.descricao}</option>)}
       </select>
      </label>
     </div>
     <div className="mb-2 flex min-h-[30px] flex-wrap items-center gap-1 border-y border-slate-100 py-1">
      <span className="mr-1 text-[9px] font-semibold uppercase text-slate-500">Categoria</span>
      <button type="button" onClick={()=>setCategory('TODOS')} className={category==='TODOS'?'h-[25px] border border-[#2D8DB8] bg-[#EAF6FA] px-2 text-[10px] text-[#123B50]':'h-[25px] border border-slate-200 px-2 text-[10px]'}>Todas</button>
      {categories.map(value=><button type="button" key={value} onClick={()=>setCategory(value)} className={category===value?'h-[25px] border border-[#2D8DB8] bg-[#EAF6FA] px-2 text-[10px] text-[#123B50]':'h-[25px] border border-slate-200 px-2 text-[10px]'}>{value}</button>)}
      <span className="ml-auto text-[10px] text-slate-500">{busy?'Carregando…':visible.length+' produto(s)'}</span>
     </div>
     {error&&<div role="alert" className="mb-2 border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">{error}</div>}
     <div className="grid min-w-0 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(product=><button type="button" key={product.id} onClick={()=>add(product)} disabled={busy} className="flex min-h-[82px] min-w-0 flex-col border border-slate-200 bg-white p-2 text-left transition hover:border-[#2D8DB8] hover:bg-[#F7FCFD] focus:outline-none focus:ring-1 focus:ring-[#2D8DB8] disabled:opacity-50">
       <span className="flex w-full items-start justify-between gap-2"><span className="truncate text-[9px] text-slate-500">{product.codigo}</span><span className="shrink-0 text-[9px] text-slate-500">{product.categoria||'Sem categoria'}</span></span>
       <strong className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-[#123B50]">{product.nome}</strong>
       <span className="mt-auto flex w-full items-end justify-between gap-2 pt-2"><span className="text-[9px] text-slate-500">Saldo: {product.estoque_atual} {product.unidade}</span><strong className="text-[11px] text-[#123B50]">{money(Number(product.preco_venda))}</strong></span>
      </button>)}
      {!busy&&!visible.length&&<div className="col-span-full border border-dashed border-slate-300 p-8 text-center text-[11px] text-slate-500">Nenhum produto encontrado com os filtros selecionados.</div>}
     </div>
    </section>
    <section className="min-w-0 border border-slate-200 bg-white p-2">
     <div className="flex items-center justify-between border-b border-slate-200 pb-2"><div className="flex items-center gap-2"><ShoppingCart size={15}/><h2 className="text-[12px] font-semibold text-[#123B50]">Venda atual</h2></div><span className="text-[10px] text-slate-500">{cart.reduce((sum,item)=>sum+item.quantidade,0)} item(ns)</span></div>
     <div className="mt-1 max-h-[min(44vh,420px)] overflow-auto">
      {cart.map(item=><div key={item.id} className="grid grid-cols-[minmax(0,1fr)_54px_auto] items-center gap-2 border-b border-slate-100 py-2">
       <div className="min-w-0"><div className="truncate text-[10px] font-medium text-slate-800">{item.nome}</div><div className="text-[9px] text-slate-500">{money(item.preco_venda)} / {item.unidade}</div></div>
       <input aria-label={'Quantidade '+item.nome} type="number" min="1" value={item.quantidade} onChange={event=>{setSaleKey(crypto.randomUUID());setCart(current=>current.map(row=>row.id===item.id?{...row,quantidade:Math.max(1,Number(event.target.value)||1)}:row))}} className="h-[30px] w-full border border-slate-300 px-1 text-center text-[11px]"/>
       <strong className="text-right text-[10px]">{money(item.quantidade*item.preco_venda)}</strong>
      </div>)}
      {!cart.length&&<div className="py-10 text-center text-[11px] text-slate-500">Carrinho vazio. Selecione um produto para iniciar a venda.</div>}
     </div>
     <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2">
      <label className="grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">Cliente (opcional)
       <select value={customerId} onChange={event=>{setCustomerId(event.target.value);setSaleKey(crypto.randomUUID())}} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]"><option value="">Consumidor não identificado</option>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.codigo?customer.codigo+' — ':''}{customer.nome}{customer.documento?' • '+customer.documento:''}</option>)}</select>
      </label>
      <div className="flex items-center justify-between text-[10px]"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
      <label className="flex items-center justify-between gap-3 text-[10px]">Desconto (R$)<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={event=>{setDiscount(event.target.value);setSaleKey(crypto.randomUUID())}} className="h-[30px] w-28 border border-slate-300 px-2 text-right text-[11px]"/></label>
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[12px] font-semibold text-[#123B50]"><span>TOTAL</span><strong>{money(total)}</strong></div>
      <label className="grid gap-[2px] text-[9px] font-medium uppercase tracking-wide text-slate-600">Forma de pagamento
       <select value={payment} onChange={event=>{setPayment(event.target.value);setSaleKey(crypto.randomUUID())}} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[11px]"><option value="DINHEIRO">Dinheiro</option><option value="CARTAO">Cartão</option><option value="PIX">PIX</option></select>
      </label>
      {message&&<div role="status" className="border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-800">{message}</div>}
      <button type="button" disabled={busy||!cart.length||!box} onClick={()=>void finish()} className="h-[32px] w-full bg-[#2D8DB8] px-2 text-[10px] font-semibold uppercase text-white hover:bg-[#236f91] focus:outline-none focus:ring-2 focus:ring-[#2D8DB8] disabled:cursor-not-allowed disabled:opacity-50">{busy?'Processando…':'Finalizar venda'}</button>
      <button type="button" disabled={busy||!cart.length} onClick={()=>{setCart([]);setDiscount('0');setSaleKey(crypto.randomUUID());setError('');setMessage('Venda em edição cancelada.')}} className="h-[30px] w-full border border-slate-300 bg-white px-2 text-[10px] font-medium text-slate-600 disabled:opacity-50">Limpar venda</button>
     </div>
    </section>
   </main>
  </VendasLayout>
 )
}