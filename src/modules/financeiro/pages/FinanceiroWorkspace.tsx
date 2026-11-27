/**
 * @REVISAO: REV-LIMITE-DE-LISTAGEM-VISIVEL-20261104-03 — "A pagar/A receber" somavam apenas as parcelas cujo título estava dentro do teto de 1000 títulos e 5000 parcelas carregados: carteira maior que isso mostrava valor menor que o real, sem aviso. Títulos, parcelas, fornecedores e clientes passam a ser lidos por paginação completa.
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — Central Financeira
 * @REVISAO 30/10/2026
 * Usa títulos, parcelas e baixas do schema financeiro versionado; autenticação/RLS via Supabase.
 * Não simula saldos, bancos ou centros de custo que não tenham fonte confirmada.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleHelp, FilePlus2, RefreshCw, Search, Wallet } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { fetchAllPages } from '../../../lib/supabasePagination'

type Kind = 'PAGAR' | 'RECEBER'
type Title = { id:string; tipo:Kind; parceiro_tipo:string; parceiro_id:string; descricao:string; documento:string|null; categoria:string|null; centro_custo:string|null; data_emissao:string; valor_total:number; status:string; criado_em:string }
type Installment = { id:string; titulo_id:string; numero:number; vencimento:string; valor:number; saldo:number; status:string }
type Settlement = { id:string; titulo_id:string; parcela_id:string; valor:number; ocorrido_em:string; forma_pagamento:string; referencia:string|null }
type Partner = { id:string; tipo_parceiro:Kind; razao_social?:string; nome_fantasia?:string; codigo?:string }
type PartnerRow = { id:string; razao_social:string; nome_fantasia:string|null; codigo:string|null }
type TimelineScale = 'DIA' | 'SEMANA' | 'MÊS' | 'ANO'
type TimelineBucket = { key:string; label:string }
const dateKey=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
const parseDateKey=(value:string)=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day)}
const input='h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label='mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'
const button='inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
const errText=(e:unknown)=>e instanceof Error?e.message:'Não foi possível concluir a operação.'
export default function FinanceiroWorkspace(){
 const [tab,setTab]=useState<'RESUMO'|Kind|'BAIXAS'>('RESUMO')
 const [company,setCompany]=useState('')
 const [titles,setTitles]=useState<Title[]>([])
 const [installments,setInstallments]=useState<Installment[]>([])
 const [settlements,setSettlements]=useState<Settlement[]>([])
 const [partners,setPartners]=useState<Partner[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [search,setSearch]=useState('')
 const [showForm,setShowForm]=useState(false)
 const [kind,setKind]=useState<Kind>('PAGAR')
 const [partner,setPartner]=useState('')
 const [description,setDescription]=useState('')
 const [document,setDocument]=useState('')
 const [category,setCategory]=useState('')
 const [costCenter,setCostCenter]=useState('')
 const [issueDate,setIssueDate]=useState(localDate())
 const [dueDate,setDueDate]=useState(localDate())
 const [amount,setAmount]=useState('')
 const [payPart,setPayPart]=useState<Installment|null>(null)
 const [payValue,setPayValue]=useState('')
 const [payDate,setPayDate]=useState(localDate())
 const [payMethod,setPayMethod]=useState('PIX')
 const [reference,setReference]=useState('')
 const [timelineScale,setTimelineScale]=useState<TimelineScale>('DIA')
 const [timelineAnchor,setTimelineAnchor]=useState(()=>new Date())
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const companyResult=await supabase.rpc('erp_current_empresa_id')
   if(companyResult.error)throw companyResult.error
   if(typeof companyResult.data!=='string'||!companyResult.data)throw new Error('Empresa ativa não identificada. Confira a sessão e o vínculo do usuário.')
   const empresa=companyResult.data;setCompany(empresa)
   const [t,p,r]=await Promise.all([
    fetchAllPages<Title>((from,to)=>supabase.from('erp_financeiro_titulos').select('id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,criado_em',{count:'exact'}).eq('empresa_id',empresa).order('criado_em',{ascending:false}).order('id',{ascending:false}).range(from,to)),
    fetchAllPages<PartnerRow>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia,codigo',{count:'exact'}).eq('empresa_id',empresa).eq('ativo',true).order('razao_social').order('id').range(from,to)),
    fetchAllPages<PartnerRow>((from,to)=>supabase.from('erp_clientes').select('id,razao_social,nome_fantasia,codigo',{count:'exact'}).eq('empresa_id',empresa).eq('ativo',true).order('razao_social').order('id').range(from,to))
   ])
   setTitles(t)
   const [parts,baixas]=await Promise.all([
    fetchAllPages<Installment>((from,to)=>supabase.from('erp_financeiro_parcelas').select('id,titulo_id,numero,vencimento,valor,saldo,status',{count:'exact'}).eq('empresa_id',empresa).order('vencimento').order('id').range(from,to)),
    fetchAllPages<Settlement>((from,to)=>supabase.from('erp_financeiro_baixas').select('id,titulo_id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia',{count:'exact'}).eq('empresa_id',empresa).order('ocorrido_em',{ascending:false}).order('id',{ascending:false}).range(from,to))
   ])
   setInstallments(parts)
   setSettlements(baixas)
   const partnerRows: Partner[] = [
    ...p.map(row=>({ id:row.id, tipo_parceiro:'PAGAR' as const, razao_social:row.razao_social, nome_fantasia:row.nome_fantasia??undefined, codigo:row.codigo??undefined })),
    ...r.map(row=>({ id:row.id, tipo_parceiro:'RECEBER' as const, razao_social:row.razao_social, nome_fantasia:row.nome_fantasia??undefined, codigo:row.codigo??undefined }))
   ]
   setPartners(partnerRows)
  }catch(e){setError(errText(e))}finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const timelineBuckets=useMemo<TimelineBucket[]>(()=>{
  const anchor=new Date(timelineAnchor);anchor.setHours(12,0,0,0)
  const count=timelineScale==='DIA'?14:timelineScale==='SEMANA'?12:timelineScale==='MÊS'?12:5
  let start=new Date(anchor)
  if(timelineScale==='DIA')start.setDate(start.getDate()-6)
  if(timelineScale==='SEMANA'){start.setDate(start.getDate()-((start.getDay()+6)%7)-35)}
  if(timelineScale==='MÊS')start=new Date(start.getFullYear(),start.getMonth()-5,1,12)
  if(timelineScale==='ANO')start=new Date(start.getFullYear()-2,0,1,12)
  return Array.from({length:count},(_,i)=>{
   const d=new Date(start)
   if(timelineScale==='DIA')d.setDate(start.getDate()+i)
   if(timelineScale==='SEMANA')d.setDate(start.getDate()+i*7)
   if(timelineScale==='MÊS')d.setMonth(start.getMonth()+i)
   if(timelineScale==='ANO')d.setFullYear(start.getFullYear()+i)
   const label=timelineScale==='DIA'?d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}):timelineScale==='SEMANA'?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):timelineScale==='MÊS'?d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}):String(d.getFullYear())
   return {key:dateKey(d),label}
  })
 },[timelineAnchor,timelineScale])
 const periodStart=useMemo(()=>{
  const d=new Date(timelineAnchor);d.setHours(12,0,0,0)
  if(timelineScale==='SEMANA')d.setDate(d.getDate()-((d.getDay()+6)%7))
  if(timelineScale==='MÊS')d.setDate(1)
  if(timelineScale==='ANO'){d.setMonth(0,1)}
  return d
 },[timelineAnchor,timelineScale])
 const periodEnd=useMemo(()=>{
  const d=new Date(periodStart)
  if(timelineScale==='DIA')d.setDate(d.getDate()+1)
  if(timelineScale==='SEMANA')d.setDate(d.getDate()+7)
  if(timelineScale==='MÊS')d.setMonth(d.getMonth()+1)
  if(timelineScale==='ANO')d.setFullYear(d.getFullYear()+1)
  return d
 },[periodStart,timelineScale])
 const periodFrom=dateKey(periodStart),periodTo=dateKey(periodEnd)
 const periodRows=useMemo(()=>installments.filter(part=>part.vencimento>=periodFrom&&part.vencimento<periodTo&&part.saldo>0&&part.status!=='CANCELADO').map(part=>({part,title:titles.find(title=>title.id===part.titulo_id)})).filter((row):row is {part:Installment;title:Title}=>Boolean(row.title&&row.title.status!=='CANCELADO')),[installments,periodFrom,periodTo,titles])
 const periodReceive=periodRows.filter(row=>row.title.tipo==='RECEBER').reduce((sum,row)=>sum+Number(row.part.saldo),0)
 const periodPay=periodRows.filter(row=>row.title.tipo==='PAGAR').reduce((sum,row)=>sum+Number(row.part.saldo),0)
 const periodSettled=settlements.filter(row=>row.ocorrido_em.slice(0,10)>=periodFrom&&row.ocorrido_em.slice(0,10)<periodTo).map(row=>({row,title:titles.find(title=>title.id===row.titulo_id)})).filter((item):item is {row:Settlement;title:Title}=>Boolean(item.title))
 const periodReceived=periodSettled.filter(item=>item.title.tipo==='RECEBER').reduce((sum,item)=>sum+Number(item.row.valor),0)
 const periodPaid=periodSettled.filter(item=>item.title.tipo==='PAGAR').reduce((sum,item)=>sum+Number(item.row.valor),0)
 const shiftTimeline=(direction:number)=>setTimelineAnchor(current=>{const d=new Date(current);if(timelineScale==='DIA')d.setDate(d.getDate()+direction*14);if(timelineScale==='SEMANA')d.setDate(d.getDate()+direction*84);if(timelineScale==='MÊS')d.setMonth(d.getMonth()+direction*12);if(timelineScale==='ANO')d.setFullYear(d.getFullYear()+direction*5);return d})
 const filtered=titles.filter(t=>(tab==='PAGAR'||tab==='RECEBER'?t.tipo===tab:true)&&[t.descricao,t.documento??'',t.categoria??'',t.status].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
 const openParts=installments.filter(p=>p.saldo>0&&p.status!=='CANCELADO')
 const totalPay=installments.filter(p=>p.saldo>0&&titles.some(t=>t.id===p.titulo_id&&t.tipo==='PAGAR'&&t.status!=='CANCELADO')).reduce((s,p)=>s+Number(p.saldo),0)
 const totalReceive=installments.filter(p=>p.saldo>0&&titles.some(t=>t.id===p.titulo_id&&t.tipo==='RECEBER'&&t.status!=='CANCELADO')).reduce((s,p)=>s+Number(p.saldo),0)
 const totalOpen=openParts.reduce((s,p)=>s+Number(p.saldo),0)
 const partnerLabel=(id:string)=>{const p=partners.find(x=>x.id===id);return p?.nome_fantasia||p?.razao_social||p?.codigo||'Parceiro cadastrado'}
 const beginCreate=(k:Kind)=>{setKind(k);setPartner('');setDescription('');setDocument('');setCategory('');setCostCenter('');setIssueDate(localDate());setDueDate(localDate());setAmount('');setShowForm(true);setError('');setMessage('')}
 async function saveTitle(e:FormEvent){
  e.preventDefault();setError('');setMessage('')
  const value=Number(amount)
  if(!company||!partner||!description.trim()||!Number.isFinite(value)||value<=0||!dueDate){setError('Preencha parceiro, descrição, vencimento e valor maior que zero.');return}
  setBusy(true)
  try{
   const {data:uid,error:uidError}=await supabase.rpc('erp_financeiro_salvar_titulo',{p_titulo_id:null,p_empresa_id:company,p_tipo:kind,p_parceiro_id:partner,p_descricao:description.trim(),p_documento:document.trim()||null,p_categoria:category.trim()||null,p_centro_custo:costCenter.trim()||null,p_data_emissao:issueDate,p_origem_tipo:'MANUAL',p_origem_id:null,p_chave_idempotencia:crypto.randomUUID(),p_parcelas:[{numero:1,vencimento:dueDate,valor:Number(value.toFixed(2))}]})
   if(uidError)throw uidError
   if(!uid)throw new Error('O banco não retornou o identificador do título.')
   setShowForm(false);setMessage('Título gravado no Financeiro.');await load()
  }catch(e){setError(errText(e))}finally{setBusy(false)}
 }
 async function registerPayment(e:FormEvent){
  e.preventDefault();if(!payPart)return
  const value=Number(payValue)
  if(!Number.isFinite(value)||value<=0||value>Number(payPart.saldo)){setError('Informe um valor positivo que não ultrapasse o saldo da parcela.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const {error:e}=await supabase.rpc('erp_financeiro_registrar_baixa',{p_empresa_id:company,p_parcela_id:payPart.id,p_valor:Number(value.toFixed(2)),p_ocorrido_em:new Date(payDate+'T12:00:00').toISOString(),p_forma_pagamento:payMethod,p_referencia:reference.trim()||null,p_chave_idempotencia:crypto.randomUUID()})
   if(e)throw e
   setPayPart(null);setMessage('Baixa financeira registrada.');await load()
  }catch(e){setError(errText(e))}finally{setBusy(false)}
 }
 const tabs=[['RESUMO','Visão geral'],['PAGAR','Contas a pagar'],['RECEBER','Contas a receber'],['BAIXAS','Parcelas / baixas']] as const
 return <main className="min-h-full bg-[#F4FBFD] p-3 text-slate-800 sm:p-4">
  <div className="mx-auto max-w-[1500px] space-y-3">
   <header className="rounded-xl bg-[#123B50] px-4 py-4 text-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#48B7C7]">SYSNQRA ERP INDUSTRIAL · CONTROLADORIA</span><h1 className="mt-1 text-xl font-extrabold">Financeiro</h1><p className="mt-1 text-xs text-slate-300">Títulos, vencimentos, parcelas e liquidações da empresa ativa</p></div><button type="button" onClick={()=>void load()} className={button+' border border-white/20 bg-white/10 text-white'}><RefreshCw size={14}/> Atualizar</button></div></header>
   <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1" aria-label="Seções do financeiro">{tabs.map(([id,label])=><button key={id} type="button" onClick={()=>{setTab(id);setError('');setMessage('')}} className={button+' '+(tab===id?'bg-[#123B50] text-white':'bg-white text-slate-600 hover:bg-slate-50')}>{label}</button>)}</nav>
   {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
   {message&&<div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div>}
   {tab==='RESUMO'&&<>
   <section className="rounded-xl border border-[#D3E3EA] bg-white p-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#2D8DB8]">Fluxo financeiro por período</p><h2 className="text-sm font-extrabold text-[#123B50]">Entradas e saídas da empresa ativa</h2><p className="text-[10px] text-slate-500">Parcelas reais de erp_financeiro_parcelas vinculadas a títulos reais.</p></div>
     <div className="flex flex-wrap items-center gap-1">{(['DIA','SEMANA','MÊS','ANO'] as TimelineScale[]).map(scale=><button key={scale} type="button" aria-pressed={timelineScale===scale} onClick={()=>setTimelineScale(scale)} className={`h-8 rounded-md border px-3 text-[10px] font-extrabold ${timelineScale===scale?'border-[#123B50] bg-[#123B50] text-white':'border-[#D3E3EA] bg-white text-[#315466]'}`}>{scale}</button>)}</div>
    </div>
    <div className="mt-3 flex items-center gap-2">
     <button type="button" onClick={()=>shiftTimeline(-1)} aria-label="Períodos anteriores" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#D3E3EA] text-[#123B50]">‹</button>
     <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">{timelineBuckets.map(bucket=><button key={bucket.key} type="button" onClick={()=>setTimelineAnchor(parseDateKey(bucket.key))} className={`min-w-[72px] rounded-md border px-2 py-2 text-center text-[10px] font-bold ${dateKey(periodStart)===bucket.key?'border-[#F59E0B] bg-orange-50 text-orange-900':'border-[#D3E3EA] bg-[#F4FBFD] text-[#315466]'}`}>{bucket.label}</button>)}</div>
     <button type="button" onClick={()=>shiftTimeline(1)} aria-label="Próximos períodos" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#D3E3EA] text-[#123B50]">›</button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
     <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">A receber em aberto</span><strong className="mt-1 block text-lg font-black text-emerald-900">{money(periodReceive)}</strong></article>
     <article className="rounded-lg border border-rose-200 bg-rose-50 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-rose-800">A pagar em aberto</span><strong className="mt-1 block text-lg font-black text-rose-900">{money(periodPay)}</strong></article>
     <article className="rounded-lg border border-emerald-200 bg-white p-3"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Recebido no período</span><strong className="mt-1 block text-lg font-black text-emerald-900">{money(periodReceived)}</strong></article>
     <article className="rounded-lg border border-rose-200 bg-white p-3"><span className="text-[9px] font-black uppercase tracking-wider text-rose-800">Pago no período</span><strong className="mt-1 block text-lg font-black text-rose-900">{money(periodPaid)}</strong></article>
    </div>
    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[10px]"><thead><tr className="border-b border-[#D3E3EA] text-[9px] uppercase text-slate-500"><th className="p-2">Vencimento</th><th className="p-2">Título / Documento</th><th className="p-2">Tipo</th><th className="p-2 text-right">Saldo</th></tr></thead><tbody>{periodRows.slice(0,12).map(row=><tr key={row.part.id} className="border-b border-slate-100"><td className="p-2 tabular-nums">{new Date(row.part.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}</td><td className="p-2 font-semibold text-[#123B50]">{row.title.descricao}<span className="ml-2 font-normal text-slate-500">{row.title.documento||''}</span></td><td className={`p-2 font-bold ${row.title.tipo==='RECEBER'?'text-emerald-800':'text-rose-800'}`}>{row.title.tipo==='RECEBER'?'Entrada':'Saída'}</td><td className="p-2 text-right font-bold tabular-nums">{money(row.part.saldo)}</td></tr>)}{periodRows.length===0&&<tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum título em aberto neste período.</td></tr>}</tbody></table>{periodRows.length>12&&<p className="mt-1 text-right text-[9px] text-slate-500">Exibindo 12 de {periodRows.length} parcelas do período.</p>}{periodSettled.length>0&&<div className="mt-3 overflow-x-auto"><h3 className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Baixas registradas no período</h3><table className="w-full min-w-[560px] text-left text-[10px]"><thead><tr className="border-b border-[#D3E3EA] text-[9px] uppercase text-slate-500"><th className="p-2">Data</th><th className="p-2">Título</th><th className="p-2">Forma</th><th className="p-2 text-right">Valor</th></tr></thead><tbody>{periodSettled.slice(0,10).map(item=><tr key={item.row.id} className="border-b border-slate-100"><td className="p-2">{new Date(item.row.ocorrido_em).toLocaleDateString('pt-BR')}</td><td className="p-2">{item.title.descricao}</td><td className="p-2">{item.row.forma_pagamento}</td><td className="p-2 text-right font-bold">{money(item.row.valor)}</td></tr>)}</tbody></table></div>}</div>
   </section><section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['A pagar em aberto',money(totalPay),'#D65B61'],['A receber em aberto',money(totalReceive),'#3A9D78'],['Saldo de parcelas pendentes',money(totalOpen),'#2D8DB8'],['Títulos carregados',String(titles.length),'#123B50']].map(([title,value,color])=><article key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-xl font-extrabold" style={{color}}>{value}</p><p className="mt-1 text-[10px] text-slate-400">Calculado a partir dos registros retornados</p></article>)}</section><section className="grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>beginCreate('PAGAR')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600"><ArrowUpRight size={20}/></span><span><strong className="block text-sm">Lançar conta a pagar</strong><small className="text-xs text-slate-500">Fornecedor, vencimento, valor e centro de custo</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button><button type="button" onClick={()=>beginCreate('RECEBER')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ArrowDownLeft size={20}/></span><span><strong className="block text-sm">Lançar conta a receber</strong><small className="text-xs text-slate-500">Cliente, vencimento, valor e categoria</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button></section></>}
   {(tab==='PAGAR'||tab==='RECEBER')&&<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-sm font-extrabold">{tab==='PAGAR'?'Contas a pagar':'Contas a receber'}</h2><p className="mt-1 text-[10px] text-slate-500">Empresa ativa · registros reais do Supabase</p></div><button type="button" onClick={()=>beginCreate(tab)} className={button+' bg-[#2D8DB8] text-white'}><FilePlus2 size={14}/> Novo título</button></div><div className="border-b border-slate-100 p-3"><label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className={input+' pl-8'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar descrição, documento, categoria ou status"/></label></div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Descrição','Parceiro','Emissão','Valor','Status','Parcelas'].map(x=><th key={x} className="px-3 py-2 font-semibold">{x}</th>)}</tr></thead><tbody>{filtered.filter(t=>t.tipo===tab).map(t=>{const ps=installments.filter(p=>p.titulo_id===t.id);return <tr key={t.id} className="border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t.descricao}</strong><small className="block text-[10px] text-slate-400">{t.documento||t.categoria||'Sem documento/categoria'}</small></td><td className="px-3 py-2">{partnerLabel(t.parceiro_id)}</td><td className="px-3 py-2">{t.data_emissao}</td><td className="px-3 py-2 font-bold">{money(Number(t.valor_total))}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{t.status}</span></td><td className="px-3 py-2">{ps.length} · {money(ps.reduce((s,p)=>s+Number(p.saldo),0))} aberto</td></tr>})}{!loading&&filtered.filter(t=>t.tipo===tab).length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Nenhum título encontrado para este filtro.</td></tr>}</tbody></table></div></section>}
   {tab==='BAIXAS'&&<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-3"><h2 className="text-sm font-extrabold">Parcelas e liquidação</h2><p className="mt-1 text-[10px] text-slate-500">Selecione uma parcela em aberto para registrar pagamento ou recebimento parcial/total.</p></div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Título','Parcela','Vencimento','Valor','Saldo','Ação'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{openParts.map(p=>{const t=titles.find(x=>x.id===p.titulo_id);return <tr key={p.id} className="border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t?.descricao??'Título não encontrado'}</strong><small className="block text-[10px] text-slate-400">{t?.tipo==='PAGAR'?'A pagar':'A receber'} · {t?partnerLabel(t.parceiro_id):'—'}</small></td><td className="px-3 py-2">{p.numero}</td><td className="px-3 py-2">{p.vencimento}</td><td className="px-3 py-2">{money(Number(p.valor))}</td><td className="px-3 py-2 font-bold">{money(Number(p.saldo))}</td><td className="px-3 py-2"><button type="button" onClick={()=>{setPayPart(p);setPayValue(String(p.saldo));setPayDate(localDate());setError('')}} className={button+' h-7 bg-[#2D8DB8] text-white'}><Banknote size={13}/> Baixar</button></td></tr>})}{!loading&&openParts.length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Não há parcelas em aberto retornadas para a empresa ativa.</td></tr>}</tbody></table></div></section>}
   {loading&&<div role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">Carregando dados financeiros reais…</div>}
   <footer className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><Wallet size={13}/> Acesso protegido pela sessão Supabase e pelas políticas RLS. <button type="button" onClick={()=>setMessage('Ajuda: lance títulos pelas abas Contas a pagar/receber. A baixa é feita pela aba Parcelas/baixas e exige permissão financeiro.lancar. Bancos, conciliação e centros de custo dependem das tabelas/serviços correspondentes no ambiente.')} className="inline-flex items-center gap-1 font-bold text-[#2D8DB8]"><CircleHelp size={12}/> Ajuda desta tela</button></footer>
   {showForm&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="finance-title" className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="finance-title" className="text-sm font-extrabold">{kind==='PAGAR'?'Novo título a pagar':'Novo título a receber'}</h2><p className="mt-1 text-[10px] text-slate-300">Gravação transacional pela RPC erp_financeiro_salvar_titulo</p></header><form onSubmit={e=>void saveTitle(e)} className="space-y-3 p-4"><div className="grid gap-3 md:grid-cols-2"><div><label className={label}>{kind==='PAGAR'?'Fornecedor':'Cliente'} *</label><select required className={input} value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Selecione um cadastro real</option>{partners.filter(p=>p.tipo_parceiro===kind).map(p=><option key={p.id} value={p.id}>{p.codigo? p.codigo+' · ':''}{p.nome_fantasia||p.razao_social||p.codigo||p.id}</option>)}</select></div><div><label className={label}>Descrição *</label><input required className={input} value={description} onChange={e=>setDescription(e.target.value)} maxLength={180}/></div><div><label className={label}>Documento</label><input className={input} value={document} onChange={e=>setDocument(e.target.value)} maxLength={80}/></div><div><label className={label}>Categoria</label><input className={input} value={category} onChange={e=>setCategory(e.target.value)} maxLength={100}/></div><div><label className={label}>Centro de custo</label><input className={input} value={costCenter} onChange={e=>setCostCenter(e.target.value)} maxLength={100}/></div><div><label className={label}>Data de emissão *</label><input required type="date" className={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)}/></div><div><label className={label}>Primeiro vencimento *</label><input required type="date" className={input} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div><div><label className={label}>Valor total (R$) *</label><input required type="number" min="0.01" step="0.01" className={input} value={amount} onChange={e=>setAmount(e.target.value)}/></div></div><p className="rounded-md bg-sky-50 p-2 text-[10px] text-sky-900">Este formulário cria uma parcela inicial. Parcelamento múltiplo, bancos e conciliação só serão ativados quando seus serviços/tabelas forem confirmados no ambiente.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setShowForm(false)} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Gravando…':'Gravar título'}</button></div></form></section></div>}
   {payPart&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="baixa-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="baixa-title" className="text-sm font-extrabold">Registrar baixa financeira</h2><p className="mt-1 text-[10px] text-slate-300">Saldo da parcela: {money(Number(payPart.saldo))}</p></header><form onSubmit={e=>void registerPayment(e)} className="space-y-3 p-4"><div><label className={label}>Valor da baixa (R$) *</label><input required type="number" min="0.01" max={payPart.saldo} step="0.01" className={input} value={payValue} onChange={e=>setPayValue(e.target.value)}/></div><div className="grid grid-cols-2 gap-3"><div><label className={label}>Data *</label><input required type="date" className={input} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div><div><label className={label}>Forma de pagamento *</label><select required className={input} value={payMethod} onChange={e=>setPayMethod(e.target.value)}>{['PIX','TRANSFERENCIA','BOLETO','DINHEIRO','CARTAO','CHEQUE','OUTRO'].map(x=><option key={x}>{x}</option>)}</select></div></div><div><label className={label}>Referência / comprovante</label><input className={input} value={reference} onChange={e=>setReference(e.target.value)} maxLength={160}/></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setPayPart(null)} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Registrando…':'Confirmar baixa'}</button></div></form></section></div>}
  </div>
 </main>
}
