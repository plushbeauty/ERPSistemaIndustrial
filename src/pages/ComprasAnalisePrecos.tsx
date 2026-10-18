/**
 * @DATA_REVISAO_APROVACAO: 2026-10-18
 * @STATUS_APROVACAO: ANALISE-PRECOS-PREMIUM-UI-OK
 * @REVISAO: SUP-UI-001
 */
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ArrowLeft, Check, TrendingUp, DollarSign, Award, Layers, FileText, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'
type Rfq={id:string;numero:number;status:string;data_emissao:string;prazo_resposta:string|null}
type Quote={id:string;rfq_id:string;fornecedor_id:string;status:string;valor_total:number|null;valor_frete:number;valor_desconto:number;prazo_entrega_dias:number|null;condicao_pagamento:string|null}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type RfqItem={rfq_id:string;codigo:string;descricao:string;quantidade:number;unidade:string}
const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export default function ComprasAnalisePrecos(){
 const[rfqs,setRfqs]=useState<Rfq[]>([]),[quotes,setQuotes]=useState<Quote[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]),[items,setItems]=useState<RfqItem[]>([])
 const[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[empresaId,setEmpresaId]=useState('')
 async function load(){
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id');if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const tenant=String(company.data);setEmpresaId(tenant)
   const[r,q,s,i]=await Promise.all([
    fetchAllPages<Rfq>((from,to)=>supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta',{count:'exact'}).eq('empresa_id',tenant).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<Quote>((from,to)=>supabase.from('erp_rfq_fornecedores').select('id,rfq_id,fornecedor_id,status,valor_total,valor_frete,valor_desconto,prazo_entrega_dias,condicao_pagamento',{count:'exact'}).eq('empresa_id',tenant).range(from,to)),
    fetchAllPages<Supplier>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia',{count:'exact'}).eq('empresa_id',tenant).eq('ativo',true).order('razao_social').range(from,to)),
    fetchAllPages<RfqItem>((from,to)=>supabase.from('erp_rfq_itens').select('rfq_id,codigo,descricao,quantidade,unidade',{count:'exact'}).eq('empresa_id',tenant).range(from,to))
   ])
   setRfqs(r);setQuotes(q);setSuppliers(s);setItems(i);setSelected(current=>current&&r.some(row=>row.id===current)?current:(r[0]?.id??null))
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar análise de preços.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s.nome_fantasia||s.razao_social])),[suppliers])
 const selectedRfq=rfqs.find(r=>r.id===selected)
 const rows=useMemo(()=>quotes.filter(q=>q.rfq_id===selected).map(q=>({...q,custo:Number(q.valor_total||0)+Number(q.valor_frete||0)-Number(q.valor_desconto||0)})).sort((a,b)=>a.custo-b.custo),[quotes,selected])
 const winner=rows[0],itemSummary=items.filter(i=>i.rfq_id===selected).map(i=>i.codigo+' — '+i.descricao+' ('+i.quantidade+' '+i.unidade+')').join(' • ')
 const spread=rows.length>1?rows[rows.length-1].custo-rows[0].custo:0
 return <VendasLayout title="Mapa Comparativo de Preços (RFQ)" subtitle="Análise técnica e financeira de propostas reais de suprimentos" onRefresh={()=>void load()}>
  <main className="space-y-3 bg-[#F4FBFD] p-2 text-[11px] text-[#123B50]">
   <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2"><div><span className="text-[9px] font-black uppercase tracking-widest text-sky-700">COMPRAS • SOURCING & RFQ</span><h2 className="text-base font-black">Análise executiva de propostas</h2><p className="text-[10px] text-slate-500">Menor custo é sugestão econômica, não homologação automática.</p></div><div className="flex flex-wrap gap-1.5"><Link to="/ajuda/compras-analise-precos" className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><FileText size={12}/> POP</Link><Link to="/compras/rfq" className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><ArrowLeft size={12}/> RFQ</Link><button type="button" disabled={busy} onClick={()=>void load()} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><RefreshCw size={12} className={busy?'animate-spin':''}/> Atualizar</button></div></header>
   {error&&<div role="alert" className="flex gap-2 border border-red-300 bg-red-50 p-2 font-bold text-red-800"><AlertCircle size={13}/>{error}</div>}
   <section className="grid grid-cols-1 items-end gap-2 border border-slate-200 bg-white p-2 md:grid-cols-12">
    <label className="grid gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500 md:col-span-8"><span className="flex items-center gap-1"><Layers size={11}/> Mapa de cotação / RFQ</span><select value={selected??''} onChange={e=>setSelected(e.target.value||null)} className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs font-bold focus:border-sky-600"><option value="">Selecione uma requisição de cotação...</option>{rfqs.map(r=><option key={r.id} value={r.id}>RFQ-{String(r.numero).padStart(5,'0')} • {r.status.toUpperCase()} • {r.data_emissao}</option>)}</select></label>
    <div className="flex gap-1.5 md:col-span-4"><span className="flex h-8 min-w-0 flex-1 items-center border border-slate-200 bg-slate-50 px-2 text-[10px]">Empresa {empresaId?empresaId.slice(0,8):'—'}</span><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex h-8 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold"><RefreshCw size={11}/> Atualizar</button></div>
   </section>
   {selectedRfq&&<section className="space-y-3">
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
     <div className="flex min-w-0 items-center justify-between gap-2 border border-slate-200 border-l-4 border-l-slate-400 bg-gradient-to-br from-slate-50 to-white p-3"><div className="min-w-0"><span className="block text-[9px] font-black uppercase text-slate-500">Itens da requisição</span><strong className="mt-1 block truncate text-[10px]">{itemSummary||'Nenhum item vinculado'}</strong></div><FileText size={16}/></div>
     <div className="flex items-center justify-between gap-2 border border-slate-200 border-l-4 border-l-sky-600 bg-gradient-to-br from-sky-50 to-white p-3"><div><span className="block text-[9px] font-black uppercase text-slate-500">Propostas registradas</span><strong className="mt-1 block text-xl font-black text-sky-900">{rows.length}</strong></div><TrendingUp size={17} className="text-sky-700"/></div>
     <div className={'flex items-center justify-between gap-2 border border-slate-200 border-l-4 bg-gradient-to-br from-emerald-50 to-white p-3 '+(winner?'border-l-emerald-500':'border-l-slate-300')}><div className="min-w-0"><span className="block text-[9px] font-black uppercase text-slate-500">Menor custo calculado</span><strong className="mt-1 block truncate text-sm font-black text-emerald-800">{winner?(supplierMap.get(winner.fornecedor_id)||'Fornecedor não localizado'):'Aguardando propostas'}</strong>{winner&&<span className="mt-1 inline-flex border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-black">LÍQUIDO {money(winner.custo)}</span>}</div><Award size={18} className="shrink-0 text-emerald-700"/></div>
    </div>
    <section className="overflow-hidden border border-slate-200 bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-2 border-b bg-[#123B50] px-3 py-2 text-white"><span className="flex items-center gap-1.5 text-[10px] font-black uppercase"><DollarSign size={13}/> Comparativo financeiro</span><span className="text-[9px]">RFQ-{String(selectedRfq.numero).padStart(5,'0')}</span></header>
     <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-[10px]"><thead className="bg-slate-100 text-[9px] font-black uppercase text-slate-600"><tr className="h-8 border-b"><th className="px-2">Fornecedor</th><th className="px-2 text-right">Bruto</th><th className="px-2 text-right">Frete (+)</th><th className="px-2 text-right">Desconto (-)</th><th className="px-2 text-right">Custo líquido</th><th className="px-2">Prazo</th><th className="px-2">Pagamento</th><th className="px-2">Status</th><th className="px-2 text-center">Menor</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.id} className={'h-9 border-b border-slate-100 '+(index===0?'bg-emerald-50 font-semibold':'even:bg-slate-50')}><td className="px-2">{supplierMap.get(row.fornecedor_id)||'Fornecedor não localizado'}</td><td className="px-2 text-right">{money(Number(row.valor_total||0))}</td><td className="px-2 text-right">{money(Number(row.valor_frete||0))}</td><td className="px-2 text-right">{money(Number(row.valor_desconto||0))}</td><td className="px-2 text-right font-mono font-black">{money(row.custo)}</td><td className="px-2">{row.prazo_entrega_dias??'—'} dias</td><td className="px-2">{row.condicao_pagamento||'—'}</td><td className="px-2">{row.status}</td><td className="px-2 text-center">{index===0&&row.custo>=0?<span className="inline-flex items-center gap-1 font-black text-emerald-700"><Check size={14}/> MENOR</span>:'—'}</td></tr>)}{!rows.length&&<tr><td colSpan={9} className="h-16 text-center text-slate-500">Nenhuma proposta registrada para esta RFQ.</td></tr>}</tbody></table></div>
     {winner&&<footer className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200 bg-emerald-50 px-3 py-2"><p className="text-[10px] text-emerald-950">Menor custo registrado: <strong>{supplierMap.get(winner.fornecedor_id)||'Fornecedor não localizado'}</strong> — {money(winner.custo)}.</p><span className="inline-flex items-center gap-1 border border-emerald-300 bg-white px-2 py-1 text-[9px] font-black uppercase text-emerald-800"><Check size={11}/> Sugestão econômica</span></footer>}
    </section>
    <p className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900"><AlertCircle size={13} className="shrink-0"/>Cálculo: valor total + frete − desconto. Valide requisitos técnicos, prazo, pagamento e homologação antes da decisão.</p>
    {rows.length>1&&<p className="text-[9px] text-slate-500">Diferença entre maior e menor custo calculado: {money(spread)}.</p>}
   </section>}
  </main>
 </VendasLayout>
}
