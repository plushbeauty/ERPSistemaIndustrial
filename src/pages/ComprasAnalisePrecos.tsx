import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ArrowLeft, Check, Pencil, Save, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Rfq={id:string;numero:number;status:string;data_emissao:string;prazo_resposta:string|null}
type Quote={id:string;rfq_id:string;fornecedor_id:string;status:string;valor_total:number|null;valor_frete:number;valor_desconto:number;prazo_entrega_dias:number|null;condicao_pagamento:string|null;validade_proposta:string|null;observacoes_resposta:string|null;resposta_recebida_em:string|null}
type Supplier={id:string;razao_social:string;nome_fantasia:string|null}
type RfqItem={rfq_id:string;codigo:string;descricao:string;quantidade:number;unidade:string}
const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

export default function ComprasAnalisePrecos(){
 const [rfqs,setRfqs]=useState<Rfq[]>([]),[quotes,setQuotes]=useState<Quote[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]),[items,setItems]=useState<RfqItem[]>([])
 const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [editingQuote,setEditingQuote]=useState<string|null>(null),[savingQuote,setSavingQuote]=useState(false)
 const [quoteForm,setQuoteForm]=useState({valor_total:'',valor_frete:'0',valor_desconto:'0',prazo_entrega_dias:'',condicao_pagamento:'',validade_proposta:'',observacoes_resposta:''})
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const empresaId=String(company.data)
   const [r,q,s,i]=await Promise.all([
    fetchAllPages<Rfq>((from,to)=>supabase.from('erp_rfq').select('id,numero,status,data_emissao,prazo_resposta',{count:'exact'}).eq('empresa_id',empresaId).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<Quote>((from,to)=>supabase.from('erp_rfq_fornecedores').select('id,rfq_id,fornecedor_id,status,valor_total,valor_frete,valor_desconto,prazo_entrega_dias,condicao_pagamento,validade_proposta,observacoes_resposta,resposta_recebida_em',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
    fetchAllPages<Supplier>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('razao_social').range(from,to)),
    fetchAllPages<RfqItem>((from,to)=>supabase.from('erp_rfq_itens').select('rfq_id,codigo,descricao,quantidade,unidade',{count:'exact'}).eq('empresa_id',empresaId).range(from,to))
   ])
   setRfqs(r);setQuotes(q);setSuppliers(s);setItems(i)
   setSelected(current=>current&&r.some(row=>row.id===current)?current:(r[0]?.id??null))
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar análise de preços.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const beginEdit=(row:Quote)=>{setError('');setEditingQuote(row.id);setQuoteForm({valor_total:row.valor_total===null?'':String(row.valor_total),valor_frete:String(row.valor_frete??0),valor_desconto:String(row.valor_desconto??0),prazo_entrega_dias:row.prazo_entrega_dias===null?'':String(row.prazo_entrega_dias),condicao_pagamento:row.condicao_pagamento??'',validade_proposta:row.validade_proposta??'',observacoes_resposta:row.observacoes_resposta??''})}
 const saveQuote=async()=>{
  if(!editingQuote)return
  const total=Number(quoteForm.valor_total),frete=Number(quoteForm.valor_frete||0),desconto=Number(quoteForm.valor_desconto||0),prazo=quoteForm.prazo_entrega_dias===''?null:Number(quoteForm.prazo_entrega_dias)
  if(quoteForm.valor_total.trim()===''||!Number.isFinite(total)||total<0||!Number.isFinite(frete)||frete<0||!Number.isFinite(desconto)||desconto<0||(prazo!==null&&(!Number.isInteger(prazo)||prazo<0))){setError('Informe valor total válido e não negativo; frete/desconto não negativos; prazo em dias inteiro e não negativo.');return}
  setSavingQuote(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const empresaId=String(company.data)
   const result=await supabase.from('erp_rfq_fornecedores').update({valor_total:total,valor_frete:frete,valor_desconto:desconto,prazo_entrega_dias:prazo,condicao_pagamento:quoteForm.condicao_pagamento.trim()||null,validade_proposta:quoteForm.validade_proposta||null,observacoes_resposta:quoteForm.observacoes_resposta.trim()||null,resposta_recebida_em:new Date().toISOString()}).eq('id',editingQuote).eq('empresa_id',empresaId).select('id').maybeSingle()
   if(result.error)throw result.error
   if(!result.data)throw new Error('Nenhuma proposta foi atualizada. Verifique a permissão de edição e a empresa da sessão.')
   setEditingQuote(null);await load()
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao registrar a proposta do fornecedor.')}finally{setSavingQuote(false)}
 }
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s.nome_fantasia||s.razao_social])),[suppliers])
 const selectedRfq=rfqs.find(r=>r.id===selected)
 const rows=useMemo(()=>quotes.filter(q=>q.rfq_id===selected).map(q=>({...q,custo:q.valor_total===null?null:Number(q.valor_total)+Number(q.valor_frete||0)-Number(q.valor_desconto||0)})).sort((a,b)=>{if(a.custo===null)return 1;if(b.custo===null)return -1;return a.custo-b.custo}),[quotes,selected])
 const winner=rows.find(row=>row.custo!==null)
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
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-[10px]"><thead className="bg-slate-700 text-white"><tr className="h-7"><th className="px-2 text-left font-normal">Fornecedor</th><th className="px-2 text-right font-normal">Valor total</th><th className="px-2 text-right font-normal">Frete</th><th className="px-2 text-right font-normal">Desconto</th><th className="px-2 text-right font-normal">Custo líquido</th><th className="px-2 text-left font-normal">Prazo</th><th className="px-2 text-left font-normal">Condição</th><th className="px-2 text-left font-normal">Status</th><th className="px-2 text-center font-normal">Menor</th><th className="px-2 text-center font-normal">Proposta</th></tr></thead>
    <tbody>{rows.map((row,index)=><tr key={row.id} className="h-[30px] border-t border-slate-200 even:bg-slate-50"><td className="px-2">{supplierMap.get(row.fornecedor_id)||'Fornecedor não localizado'}</td><td className="px-2 text-right">{money(Number(row.valor_total||0))}</td><td className="px-2 text-right">{money(Number(row.valor_frete||0))}</td><td className="px-2 text-right">{money(Number(row.valor_desconto||0))}</td><td className="px-2 text-right font-medium">{row.custo===null?'Aguardando proposta':money(row.custo)}</td><td className="px-2">{row.prazo_entrega_dias??'—'} dias</td><td className="px-2">{row.condicao_pagamento||'—'}</td><td className="px-2">{row.status}</td><td className="px-2 text-center">{winner?.id===row.id?<Check size={13}/>:''}</td><td className="px-2 text-center"><button type="button" className="erp-row-action inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-sky-700 px-2 text-[10px] text-sky-800" onClick={()=>beginEdit(row)} disabled={busy||savingQuote}><Pencil size={11}/>{row.valor_total===null?'Registrar':'Editar'}</button></td></tr>)}{!rows.length&&<tr><td colSpan={10} className="p-6 text-center text-slate-500">Nenhuma proposta respondida para esta RFQ.</td></tr>}</tbody></table></div>
    {editingQuote&&rows.some(row=>row.id===editingQuote)&&<form className="grid grid-cols-1 gap-2 border-t border-slate-200 bg-sky-50 p-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e=>{e.preventDefault();void saveQuote()}}>
     <div className="sm:col-span-2 lg:col-span-4 text-[10px] font-semibold uppercase tracking-wider text-sky-900">Registrar resposta comercial — {supplierMap.get(rows.find(row=>row.id===editingQuote)?.fornecedor_id??'')||'Fornecedor'}</div>
     <label className="text-[9px] font-bold uppercase tracking-wider">Valor total *<input required type="number" min="0" step="0.01" value={quoteForm.valor_total} onChange={e=>setQuoteForm(v=>({...v,valor_total:e.target.value}))} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider">Frete<input type="number" min="0" step="0.01" value={quoteForm.valor_frete} onChange={e=>setQuoteForm(v=>({...v,valor_frete:e.target.value}))} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider">Desconto<input type="number" min="0" step="0.01" value={quoteForm.valor_desconto} onChange={e=>setQuoteForm(v=>({...v,valor_desconto:e.target.value}))} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider">Prazo de entrega (dias)<input type="number" min="0" step="1" value={quoteForm.prazo_entrega_dias} onChange={e=>setQuoteForm(v=>({...v,prazo_entrega_dias:e.target.value}))} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider">Condição de pagamento<input value={quoteForm.condicao_pagamento} onChange={e=>setQuoteForm(v=>({...v,condicao_pagamento:e.target.value}))} maxLength={500} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider">Validade da proposta<input type="date" value={quoteForm.validade_proposta} onChange={e=>setQuoteForm(v=>({...v,validade_proposta:e.target.value}))} className="mt-1 h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]" /></label>
     <label className="text-[9px] font-bold uppercase tracking-wider sm:col-span-2">Observações da resposta<textarea rows={2} value={quoteForm.observacoes_resposta} onChange={e=>setQuoteForm(v=>({...v,observacoes_resposta:e.target.value}))} maxLength={4000} className="mt-1 w-full rounded-[2px] border border-slate-300 bg-white p-2 text-[11px]" /></label>
     <div className="flex items-end gap-1 sm:col-span-2 lg:col-span-4"><button disabled={savingQuote} type="submit" className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-sky-700 px-3 text-[11px] text-white disabled:opacity-50"><Save size={12}/>{savingQuote?'Salvando…':'Salvar proposta'}</button><button type="button" disabled={savingQuote} onClick={()=>setEditingQuote(null)} className="inline-flex h-[30px] items-center gap-1 rounded-[2px] border bg-white px-3 text-[11px]"><X size={12}/>Cancelar</button></div>
    </form>}
    {winner&&<div className="border-t bg-slate-50 px-2 py-1 text-[10px]">Menor custo entre propostas com valor registrado: <strong>{supplierMap.get(winner.fornecedor_id)||'Fornecedor não localizado'}</strong> — {money(winner.custo!)}. A decisão de compra continua no fluxo de aprovação existente.</div>}
   </section>}
  </main>
 </VendasLayout>
}
