import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ArrowLeft, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Rfq={id:string;numero:number;status:string;data_emissao:string;prazo_resposta:string|null}
type Quote={id:string;rfq_id:string;fornecedor_id:string;status:string;valor_total:number|null;valor_frete:number;valor_desconto:number;prazo_entrega_dias:number|null;condicao_pagamento:string|null}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type RfqItem={rfq_id:string;codigo:string;descricao:string;quantidade:number;unidade:string}
const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

export default function ComprasAnalisePrecos(){
 const [rfqs,setRfqs]=useState<Rfq[]>([]),[quotes,setQuotes]=useState<Quote[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]),[items,setItems]=useState<RfqItem[]>([])
 const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const empresaId=String(company.data)
   const [r,q,s,i]=await Promise.all([
    fetchAllPages<Rfq>((from,to)=>supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta',{count:'exact'}).eq('empresa_id',empresaId).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<Quote>((from,to)=>supabase.from('erp_rfq_fornecedores').select('id,rfq_id,fornecedor_id,status,valor_total,valor_frete,valor_desconto,prazo_entrega_dias,condicao_pagamento',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
    fetchAllPages<Supplier>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('razao_social').range(from,to)),
    fetchAllPages<RfqItem>((from,to)=>supabase.from('erp_rfq_itens').select('rfq_id,codigo,descricao,quantidade,unidade',{count:'exact'}).eq('empresa_id',empresaId).range(from,to))
   ])
   setRfqs(r);setQuotes(q);setSuppliers(s);setItems(i)
   setSelected(current=>current&&r.some(row=>row.id===current)?current:(r[0]?.id??null))
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar análise de preços.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s.nome_fantasia||s.razao_social])),[suppliers])
 const selectedRfq=rfqs.find(r=>r.id===selected)
 const rows=useMemo(()=>quotes.filter(q=>q.rfq_id===selected).map(q=>({...q,custo:Number(q.valor_total||0)+Number(q.valor_frete||0)-Number(q.valor_desconto||0)})).sort((a,b)=>a.custo-b.custo),[quotes,selected])
 const winner=rows[0]
 return <VendasLayout title="Análise de preços" subtitle="Mapa comparativo real de propostas RFQ para decisão de suprimentos" onRefresh={()=>void load()}>
  <main className="min-h-screen bg-slate-50 p-2 text-slate-900">
   <header className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
    <div><span className="text-[9px] uppercase tracking-wider text-sky-700">COMPRAS • ANÁLISE</span><h1 className="text-lg font-medium">Análise de preços</h1><p className="text-[10px] text-slate-500">Comparação somente com propostas existentes no banco.</p></div>
    <div className="flex gap-1"><button type="button" className="h-[30px] rounded-[2px] border bg-white px-2 text-[11px]" onClick={()=>void load()} disabled={busy}><RefreshCw size={13}/></button><Link className="flex h-[30px] items-center gap-1 rounded-[2px] border bg-white px-2 text-[11px]" to="/compras/rfq"><ArrowLeft size={13}/> RFQ</Link></div>
   </header>
   {error&&<div role="alert" className="mb-2 border border-red-500 bg-red-50 px-2 py-1 text-[10px] text-red-800">{error}</div>}
   <section className="mb-2 border border-slate-200 bg-white p-2">
    <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">RFQ</div>
    <select value={selected??''} onChange={e=>setSelected(e.target.value||null)} className="h-[30px] w-full rounded-[2px] border px-2 text-[11px]">
     <option value="">Selecione uma RFQ</option>{rfqs.map(r=><option key={r.id} value={r.id}>RFQ-{String(r.numero).padStart(4,'0')} • {r.status} • {r.data_emissao}</option>)}
    </select>
   </section>
   {selectedRfq&&<section className="border border-slate-200 bg-white">
    <div className="border-b px-2 py-1 text-[10px] text-slate-600">{items.filter(i=>i.rfq_id===selected).map(i=>i.codigo+' — '+i.descricao+' ('+i.quantidade+' '+i.unidade+')').join(' • ')||'Sem itens registrados'}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-[10px]"><thead className="bg-slate-700 text-white"><tr className="h-7"><th className="px-2 text-left font-normal">Fornecedor</th><th className="px-2 text-right font-normal">Valor total</th><th className="px-2 text-right font-normal">Frete</th><th className="px-2 text-right font-normal">Desconto</th><th className="px-2 text-right font-normal">Custo líquido</th><th className="px-2 text-left font-normal">Prazo</th><th className="px-2 text-left font-normal">Condição</th><th className="px-2 text-left font-normal">Status</th><th className="px-2 text-center font-normal">Menor</th></tr></thead>
    <tbody>{rows.map((row,index)=><tr key={row.id} className="h-[30px] border-t border-slate-200 even:bg-slate-50"><td className="px-2">{supplierMap.get(row.fornecedor_id)||'Fornecedor não localizado'}</td><td className="px-2 text-right">{money(Number(row.valor_total||0))}</td><td className="px-2 text-right">{money(Number(row.valor_frete||0))}</td><td className="px-2 text-right">{money(Number(row.valor_desconto||0))}</td><td className="px-2 text-right font-medium">{money(row.custo)}</td><td className="px-2">{row.prazo_entrega_dias??'—'} dias</td><td className="px-2">{row.condicao_pagamento||'—'}</td><td className="px-2">{row.status}</td><td className="px-2 text-center">{index===0?<Check size={13}/>:''}</td></tr>)}{!rows.length&&<tr><td colSpan={9} className="p-6 text-center text-slate-500">Nenhuma proposta respondida para esta RFQ.</td></tr>}</tbody></table></div>
    {winner&&<div className="border-t bg-slate-50 px-2 py-1 text-[10px]">Menor custo registrado: <strong>{supplierMap.get(winner.fornecedor_id)||'Fornecedor não localizado'}</strong> — {money(winner.custo)}. A decisão de compra continua no fluxo de aprovação existente.</div>}
   </section>}
  </main>
 </VendasLayout>
}
