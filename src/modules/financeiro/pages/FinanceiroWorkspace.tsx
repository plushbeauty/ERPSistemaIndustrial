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
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleHelp, FilePlus2, Printer, RefreshCw, Search, Wallet } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { fetchAllPages } from '../../../lib/supabasePagination'

type Kind = 'PAGAR' | 'RECEBER'
type Title = { id:string; tipo:Kind; parceiro_tipo:string; parceiro_id:string; descricao:string; documento:string|null; categoria:string|null; centro_custo:string|null; data_emissao:string; valor_total:number; status:string; origem_tipo:string; criado_em:string }
type Installment = { id:string; titulo_id:string; numero:number; vencimento:string; valor:number; saldo:number; status:string }
type Baixa = { id:string; titulo_id:string; parcela_id:string; valor:number; ocorrido_em:string; forma_pagamento:string; referencia:string|null }
type Partner = { id:string; tipo_parceiro:Kind; razao_social?:string; nome_fantasia?:string; codigo?:string }
type PartnerRow = { id:string; razao_social:string; nome_fantasia:string|null; codigo:string|null }
const input='h-10 min-h-10 w-full rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const label='mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'
const button='inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const localDate=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
const buildMonthlyInstallments=(total:number,count:number,firstDate:string)=>{
 const cents=Math.round(total*100)
 if(!Number.isInteger(count)||count<1||count>120||cents<count)throw new Error('Informe de 1 a 120 parcelas, com valor mínimo de R$ 0,01 por parcela.')
 const [year,month,day]=firstDate.split('-').map(Number)
 if(!year||!month||!day)throw new Error('Informe um primeiro vencimento válido.')
 const base=Math.floor(cents/count),remainder=cents-base*count
 return Array.from({length:count},(_,index)=>{
  const monthIndex=month-1+index,targetYear=year+Math.floor(monthIndex/12),targetMonth=monthIndex%12
  const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate(),targetDay=Math.min(day,lastDay)
  return {numero:index+1,vencimento:`${targetYear}-${String(targetMonth+1).padStart(2,'0')}-${String(targetDay).padStart(2,'0')}`,valor:Number(((base+(index<remainder?1:0))/100).toFixed(2))}
 })
}
const errText=(e:unknown)=>e instanceof Error?e.message:'Não foi possível concluir a operação.'
export default function FinanceiroWorkspace(){
 const [tab,setTab]=useState<'RESUMO'|Kind|'BAIXAS'>('RESUMO')
 const [company,setCompany]=useState('')
 const [titles,setTitles]=useState<Title[]>([])
 const [installments,setInstallments]=useState<Installment[]>([])
 const [baixas,setBaixas]=useState<Baixa[]>([])
 const [selectedTitleId,setSelectedTitleId]=useState('')
 const [titlePage,setTitlePage]=useState(1)
 const [partPage,setPartPage]=useState(1)
 const [baixaPage,setBaixaPage]=useState(1)
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
 const [installmentCount,setInstallmentCount]=useState('1')
 const [editingTitleId,setEditingTitleId]=useState<string|null>(null)
 const [payPart,setPayPart]=useState<Installment|null>(null)
 const [payValue,setPayValue]=useState('')
 const [payDate,setPayDate]=useState(localDate())
 const [payMethod,setPayMethod]=useState('PIX')
 const [reference,setReference]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const companyResult=await supabase.rpc('erp_current_empresa_id')
   if(companyResult.error)throw companyResult.error
   if(typeof companyResult.data!=='string'||!companyResult.data)throw new Error('Empresa ativa não identificada. Confira a sessão e o vínculo do usuário.')
   const empresa=companyResult.data;setCompany(empresa)
   const [t,p,r]=await Promise.all([
    fetchAllPages<Title>((from,to)=>supabase.from('erp_financeiro_titulos').select('id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,origem_tipo,criado_em',{count:'exact'}).eq('empresa_id',empresa).order('criado_em',{ascending:false}).order('id',{ascending:false}).range(from,to)),
    fetchAllPages<PartnerRow>((from,to)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia,codigo',{count:'exact'}).eq('empresa_id',empresa).eq('ativo',true).order('razao_social').order('id').range(from,to)),
    fetchAllPages<PartnerRow>((from,to)=>supabase.from('erp_clientes').select('id,razao_social,nome_fantasia,codigo',{count:'exact'}).eq('empresa_id',empresa).eq('ativo',true).order('razao_social').order('id').range(from,to))
   ])
   setTitles(t)
   const [parts,baixasRows]=await Promise.all([
    fetchAllPages<Installment>((from,to)=>supabase.from('erp_financeiro_parcelas').select('id,titulo_id,numero,vencimento,valor,saldo,status',{count:'exact'}).eq('empresa_id',empresa).order('vencimento').order('id').range(from,to)),
    fetchAllPages<Baixa>((from,to)=>supabase.from('erp_financeiro_baixas').select('id,titulo_id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia',{count:'exact'}).eq('empresa_id',empresa).order('ocorrido_em',{ascending:false}).order('id',{ascending:false}).range(from,to))
   ])
   setInstallments(parts)
   setBaixas(baixasRows)
   const partnerRows: Partner[] = [
    ...p.map(row=>({ id:row.id, tipo_parceiro:'PAGAR' as const, razao_social:row.razao_social, nome_fantasia:row.nome_fantasia??undefined, codigo:row.codigo??undefined })),
    ...r.map(row=>({ id:row.id, tipo_parceiro:'RECEBER' as const, razao_social:row.razao_social, nome_fantasia:row.nome_fantasia??undefined, codigo:row.codigo??undefined }))
   ]
   setPartners(partnerRows)
  }catch(e){setError(errText(e))}finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const filtered=titles.filter(t=>(tab==='PAGAR'||tab==='RECEBER'?t.tipo===tab:true)&&[t.descricao,t.documento??'',t.categoria??'',t.status].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
 const visibleTitles=filtered.filter(t=>tab==='PAGAR'||tab==='RECEBER'?t.tipo===tab:true)
 const openParts=installments.filter(p=>p.saldo>0&&p.status!=='CANCELADO'&&(!selectedTitleId||p.titulo_id===selectedTitleId))
 const baixaRows=baixas.filter(b=>!selectedTitleId||b.titulo_id===selectedTitleId)
 const titlePageCount=Math.max(1,Math.ceil(visibleTitles.length/20)),partPageCount=Math.max(1,Math.ceil(openParts.length/20)),baixaPageCount=Math.max(1,Math.ceil(baixaRows.length/20))
 const pageTitles=visibleTitles.slice((titlePage-1)*20,titlePage*20),pageParts=openParts.slice((partPage-1)*20,partPage*20),pageBaixas=baixaRows.slice((baixaPage-1)*20,baixaPage*20)
 useEffect(()=>{setTitlePage(p=>Math.min(p,titlePageCount));setPartPage(p=>Math.min(p,partPageCount));setBaixaPage(p=>Math.min(p,baixaPageCount))},[titlePageCount,partPageCount,baixaPageCount])
 const totalPay=installments.filter(p=>p.saldo>0&&titles.some(t=>t.id===p.titulo_id&&t.tipo==='PAGAR'&&t.status!=='CANCELADO')).reduce((s,p)=>s+Number(p.saldo),0)
 const totalReceive=installments.filter(p=>p.saldo>0&&titles.some(t=>t.id===p.titulo_id&&t.tipo==='RECEBER'&&t.status!=='CANCELADO')).reduce((s,p)=>s+Number(p.saldo),0)
 const totalOpen=openParts.reduce((s,p)=>s+Number(p.saldo),0)
 const partnerLabel=(id:string)=>{const p=partners.find(x=>x.id===id);return p?.nome_fantasia||p?.razao_social||p?.codigo||'Parceiro cadastrado'}
 const beginCreate=(k:Kind)=>{setEditingTitleId(null);setSelectedTitleId('');setKind(k);setPartner('');setDescription('');setDocument('');setCategory('');setCostCenter('');setIssueDate(localDate());setDueDate(localDate());setAmount('');setInstallmentCount('1');setShowForm(true);setError('');setMessage('')}
 const beginEdit=(title:Title)=>{const parts=installments.filter(p=>p.titulo_id===title.id).sort((a,b)=>a.numero-b.numero);if(!parts.length)return;setEditingTitleId(title.id);setKind(title.tipo);setPartner(title.parceiro_id);setDescription(title.descricao);setDocument(title.documento??'');setCategory(title.categoria??'');setCostCenter(title.centro_custo??'');setIssueDate(title.data_emissao);setDueDate(parts[0].vencimento);setAmount(Number(title.valor_total).toFixed(2));setInstallmentCount(String(parts.length));setShowForm(true);setError('');setMessage('')}
 async function saveTitle(e:FormEvent){
  e.preventDefault();setError('');setMessage('')
  const value=Number(amount)
  if(!company||!partner||!description.trim()||!Number.isFinite(value)||value<=0||!dueDate){setError('Preencha parceiro, descrição, vencimento e valor maior que zero.');return}
  let parcelas:{numero:number;vencimento:string;valor:number}[]
  try{parcelas=buildMonthlyInstallments(value,Number(installmentCount),dueDate)}catch(e){setError(errText(e));return}
  setBusy(true)
  try{
   const {data:uid,error:uidError}=await supabase.rpc('erp_financeiro_salvar_titulo',{p_titulo_id:editingTitleId,p_empresa_id:company,p_tipo:kind,p_parceiro_id:partner,p_descricao:description.trim(),p_documento:document.trim()||null,p_categoria:category.trim()||null,p_centro_custo:costCenter.trim()||null,p_data_emissao:issueDate,p_origem_tipo:'MANUAL',p_origem_id:null,p_chave_idempotencia:crypto.randomUUID(),p_parcelas:parcelas})
   if(uidError)throw uidError
   if(!uid)throw new Error('O banco não retornou o identificador do título.')
   setShowForm(false);setEditingTitleId(null);await load();setMessage(editingTitleId?'Título atualizado no Financeiro.':'Título gravado no Financeiro.')
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
   setPayPart(null);setReference('');await load();setMessage('Baixa financeira registrada.')
  }catch(e){setError(errText(e))}finally{setBusy(false)}
 }
 function exportCsv(){
  const headers=tab==='BAIXAS'?['Título','Parcela','Data','Valor','Forma','Referência']:['Tipo','Descrição','Parceiro','Documento','Categoria','Emissão','Valor total','Status']
  const rows=tab==='BAIXAS'?baixaRows.map(b=>{const t=titles.find(x=>x.id===b.titulo_id),p=installments.find(x=>x.id===b.parcela_id);return [t?.descricao??'',String(p?.numero??''),b.ocorrido_em,money(Number(b.valor)),b.forma_pagamento,b.referencia??'']}):visibleTitles.map(t=>[t.tipo,t.descricao,partnerLabel(t.parceiro_id),t.documento??'',t.categoria??'',t.data_emissao,money(Number(t.valor_total)),t.status])
  const csv=[headers,...rows].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(';')).join('\r\n')
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'}))
  const a=document.createElement('a');a.href=url;a.download=`financeiro-${tab.toLowerCase()}-${localDate()}.csv`;a.click();URL.revokeObjectURL(url)
 }
 const tabs=[['RESUMO','Visão geral'],['PAGAR','Contas a pagar'],['RECEBER','Contas a receber'],['BAIXAS','Parcelas / baixas']] as const
  <style>{`
   @media print{
    @page{size:A4 landscape;margin:12mm}
    body{background:#fff!important}
    .financeiro-actions,.financeiro-tabs,.financeiro-help,.financeiro-footer,.financeiro-modal,.financeiro-pagination{display:none!important}
    .financeiro-print-brand{display:block!important;color:#123B50!important}
    .financeiro-page header{background:#fff!important;color:#123B50!important;box-shadow:none!important;border-bottom:2px solid #123B50}
    .financeiro-page section{break-inside:avoid;box-shadow:none!important}
    .financeiro-page tr{height:48px;break-inside:avoid}
   }
  `}</style>
 return <main className="financeiro-page min-h-full bg-[#F4FBFD] p-3 text-slate-800 sm:p-4">
  <div className="mx-auto max-w-[1500px] space-y-3">
   <header className="rounded-xl bg-[#123B50] px-4 py-4 text-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#48B7C7]">FINANCEIRO › CONTROLADORIA › TÍTULOS E BAIXAS</span><h1 className="mt-1 text-xl font-extrabold">Financeiro</h1><p className="mt-1 text-xs text-slate-300">Títulos, vencimentos, parcelas e liquidações da empresa ativa</p></div><div className="financeiro-actions flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} className={button+' border border-white/20 bg-white/10 text-white'}><RefreshCw size={14}/> Atualizar</button><button type="button" onClick={exportCsv} className={button+' border border-white/20 bg-white/10 text-white'}>Exportar CSV</button><button type="button" onClick={()=>window.print()} className={button+' border border-white/20 bg-white/10 text-white'}><Printer size={14}/> Imprimir / PDF</button></div></div><div className="financeiro-print-brand hidden pt-2 text-[10px] font-black tracking-[.12em] text-white print:block">PLASTIBOR · SYSNQRA ERP INDUSTRIAL</div></header>
   <nav className="financeiro-tabs flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1" aria-label="Seções do financeiro">{tabs.map(([id,label])=><button key={id} type="button" onClick={()=>{setTab(id);setError('');setMessage('')}} className={button+' '+(tab===id?'bg-[#123B50] text-white':'bg-white text-slate-600 hover:bg-slate-50')}>{label}</button>)}</nav>
   <details className="financeiro-help rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"><summary className="cursor-pointer font-bold text-[#123B50]">Como usar esta tela</summary><p className="mt-2 leading-6"><strong>Para que serve:</strong> controlar contas a pagar, contas a receber, parcelas e baixas financeiras. <strong>Passo a passo:</strong> lance o título com parceiro, descrição, emissão, primeiro vencimento, valor e número de parcelas; consulte o saldo por parcela e registre baixas parciais ou totais. <strong>Regras:</strong> a RPC valida empresa, parceiro, permissão, idempotência e saldo; títulos com baixa não podem ser editados.</p></details>
   {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
   {message&&<div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div>}
   {tab==='RESUMO'&&<><section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['A pagar em aberto',money(totalPay),'#D65B61'],['A receber em aberto',money(totalReceive),'#3A9D78'],['Saldo de parcelas pendentes',money(totalOpen),'#2D8DB8'],['Títulos carregados',String(titles.length),'#123B50']].map(([title,value,color])=><article key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-xl font-extrabold" style={{color}}>{value}</p><p className="mt-1 text-[10px] text-slate-400">Calculado a partir dos registros retornados</p></article>)}</section><section className="grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>beginCreate('PAGAR')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600"><ArrowUpRight size={20}/></span><span><strong className="block text-sm">Lançar conta a pagar</strong><small className="text-xs text-slate-500">Fornecedor, vencimento, valor e centro de custo</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button><button type="button" onClick={()=>beginCreate('RECEBER')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ArrowDownLeft size={20}/></span><span><strong className="block text-sm">Lançar conta a receber</strong><small className="text-xs text-slate-500">Cliente, vencimento, valor e categoria</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button></section></>}
   {(tab==='PAGAR'||tab==='RECEBER')&&<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-sm font-extrabold">{tab==='PAGAR'?'Contas a pagar':'Contas a receber'}</h2><p className="mt-1 text-[10px] text-slate-500">Empresa ativa · registros reais do Supabase</p></div><button type="button" onClick={()=>beginCreate(tab)} className={button+' bg-[#2D8DB8] text-white'}><FilePlus2 size={14}/> Novo título</button></div><div className="border-b border-slate-100 p-3"><label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className={input+' pl-8'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar descrição, documento, categoria ou status"/></label></div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Descrição','Parceiro','Emissão','Valor','Status','Parcelas','Ações'].map(x=><th key={x} className="px-3 py-2 font-semibold">{x}</th>)}</tr></thead><tbody>{pageTitles.map(t=>{const ps=installments.filter(p=>p.titulo_id===t.id);const canEdit=t.origem_tipo==='MANUAL'&&t.status==='ABERTO'&&!baixas.some(b=>b.titulo_id===t.id);return <tr key={t.id} className="h-12 border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t.descricao}</strong><small className="block text-[10px] text-slate-400">{t.documento||t.categoria||'Sem documento/categoria'}</small></td><td className="px-3 py-2">{partnerLabel(t.parceiro_id)}</td><td className="px-3 py-2">{t.data_emissao}</td><td className="px-3 py-2 font-bold">{money(Number(t.valor_total))}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{t.status}</span></td><td className="px-3 py-2">{ps.length} · {money(ps.reduce((sum,p)=>sum+Number(p.saldo),0))} aberto</td><td className="px-3 py-2"><div className="flex gap-1"><button type="button" onClick={()=>{setSelectedTitleId(t.id);setTab('BAIXAS')}} className={button+' h-8 border border-slate-200 bg-white text-slate-700'}>Parcelas</button>{canEdit&&<button type="button" onClick={()=>beginEdit(t)} className={button+' h-8 bg-[#2D8DB8] text-white'}>Editar</button>}</div></td></tr>})}{!loading&&visibleTitles.length===0&&<tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhum título encontrado para este filtro.</td></tr>}</tbody></table></div><nav className="financeiro-pagination flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500"><span>{visibleTitles.length} títulos · Página {titlePage} de {titlePageCount}</span><div className="flex gap-2"><button type="button" disabled={titlePage===1} onClick={()=>setTitlePage(p=>Math.max(1,p-1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Anterior</button><button type="button" disabled={titlePage===titlePageCount} onClick={()=>setTitlePage(p=>Math.min(titlePageCount,p+1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Próxima</button></div></nav></div></section>}
   {tab==='BAIXAS'&&<><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-sm font-extrabold">Parcelas em aberto</h2><p className="mt-1 text-[10px] text-slate-500">Selecione uma parcela para registrar pagamento ou recebimento parcial/total.</p></div>{selectedTitleId&&<button type="button" onClick={()=>setSelectedTitleId('')} className={button+' border border-slate-200 bg-white text-slate-600'}>Limpar filtro do título</button>}</div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Título','Parcela','Vencimento','Valor','Saldo','Ação'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{pageParts.map(p=>{const t=titles.find(x=>x.id===p.titulo_id);return <tr key={p.id} className="h-12 border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t?.descricao??'Título não encontrado'}</strong><small className="block text-[10px] text-slate-400">{t?.tipo==='PAGAR'?'A pagar':'A receber'} · {t?partnerLabel(t.parceiro_id):'—'}</small></td><td className="px-3 py-2">{p.numero}</td><td className="px-3 py-2">{p.vencimento}</td><td className="px-3 py-2">{money(Number(p.valor))}</td><td className="px-3 py-2 font-bold">{money(Number(p.saldo))}</td><td className="px-3 py-2"><button type="button" onClick={()=>{setPayPart(p);setPayValue(String(p.saldo));setPayDate(localDate());setError('')}} className={button+' bg-[#2D8DB8] text-white'}><Banknote size={13}/> Baixar</button></td></tr>})}{!loading&&openParts.length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Não há parcelas em aberto retornadas para a empresa ativa.</td></tr>}</tbody></table></div><nav className="financeiro-pagination flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500"><span>{openParts.length} parcelas · Página {partPage} de {partPageCount}</span><div className="flex gap-2"><button type="button" disabled={partPage===1} onClick={()=>setPartPage(p=>Math.max(1,p-1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Anterior</button><button type="button" disabled={partPage===partPageCount} onClick={()=>setPartPage(p=>Math.min(partPageCount,p+1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Próxima</button></div></nav></section><section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-3"><h2 className="text-sm font-extrabold">Histórico de baixas registradas</h2><p className="mt-1 text-[10px] text-slate-500">{baixaRows.length} baixa(s) · registros reais do banco</p></div><div className="max-h-[50vh] overflow-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Título','Parcela','Data','Valor','Forma','Referência'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{pageBaixas.map(b=>{const t=titles.find(x=>x.id===b.titulo_id),p=installments.find(x=>x.id===b.parcela_id);return <tr key={b.id} className="h-12 border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2">{t?.descricao??'Título não encontrado'}</td><td className="px-3 py-2">{p?.numero??'—'}</td><td className="px-3 py-2">{new Date(b.ocorrido_em).toLocaleString('pt-BR')}</td><td className="px-3 py-2 font-bold">{money(Number(b.valor))}</td><td className="px-3 py-2">{b.forma_pagamento}</td><td className="px-3 py-2">{b.referencia||'—'}</td></tr>})}{!loading&&baixaRows.length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Nenhuma baixa registrada para este filtro.</td></tr>}</tbody></table></div><nav className="financeiro-pagination flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500"><span>{baixaRows.length} baixas · Página {baixaPage} de {baixaPageCount}</span><div className="flex gap-2"><button type="button" disabled={baixaPage===1} onClick={()=>setBaixaPage(p=>Math.max(1,p-1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Anterior</button><button type="button" disabled={baixaPage===baixaPageCount} onClick={()=>setBaixaPage(p=>Math.min(baixaPageCount,p+1))} className={button+' border border-slate-200 bg-white text-slate-600'}>Próxima</button></div></nav></section></>}
   {loading&&<div role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">Carregando dados financeiros reais…</div>}
   <footer className="financeiro-footer flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><Wallet size={13}/> Acesso protegido pela sessão Supabase e pelas políticas RLS. <button type="button" onClick={()=>setMessage('Ajuda: lance títulos pelas abas Contas a pagar/receber. A baixa é feita pela aba Parcelas/baixas e exige permissão financeiro.lancar. Bancos, conciliação e centros de custo dependem das tabelas/serviços correspondentes no ambiente.')} className="inline-flex items-center gap-1 font-bold text-[#2D8DB8]"><CircleHelp size={12}/> Ajuda desta tela</button></footer>
   {showForm&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="finance-title" className="financeiro-modal max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="finance-title" className="text-sm font-extrabold">{editingTitleId?'Editar título financeiro':kind==='PAGAR'?'Novo título a pagar':'Novo título a receber'}</h2><p className="mt-1 text-[10px] text-slate-300">Gravação transacional pela RPC erp_financeiro_salvar_titulo</p></header><form onSubmit={e=>void saveTitle(e)} className="space-y-3 p-4"><div className="grid gap-3 md:grid-cols-2"><div><label className={label}>{kind==='PAGAR'?'Fornecedor':'Cliente'} *</label><select required className={input} value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Selecione um cadastro real</option>{partners.filter(p=>p.tipo_parceiro===kind).map(p=><option key={p.id} value={p.id}>{p.codigo? p.codigo+' · ':''}{p.nome_fantasia||p.razao_social||p.codigo||p.id}</option>)}</select></div><div><label className={label}>Descrição *</label><input required className={input} value={description} onChange={e=>setDescription(e.target.value)} maxLength={180}/></div><div><label className={label}>Documento</label><input className={input} value={document} onChange={e=>setDocument(e.target.value)} maxLength={80}/></div><div><label className={label}>Categoria</label><input className={input} value={category} onChange={e=>setCategory(e.target.value)} maxLength={100}/></div><div><label className={label}>Centro de custo</label><input className={input} value={costCenter} onChange={e=>setCostCenter(e.target.value)} maxLength={100}/></div><div><label className={label}>Data de emissão *</label><input required type="date" className={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)}/></div><div><label className={label}>Primeiro vencimento *</label><input required type="date" className={input} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div><div><label className={label}>Valor total (R$) *</label><input required type="number" min="0.01" step="0.01" className={input} value={amount} onChange={e=>setAmount(e.target.value)}/></div><div><label className={label}>Número de parcelas *</label><input required type="number" min="1" max="120" step="1" className={input} value={installmentCount} onChange={e=>setInstallmentCount(e.target.value)}/></div></div><p className="rounded-md bg-sky-50 p-2 text-[10px] text-sky-900">O valor total será distribuído em parcelas mensais, com ajuste de centavos. O banco valida até 120 parcelas e impede edição após uma baixa.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>{setShowForm(false);setEditingTitleId(null)}} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Gravando…':editingTitleId?'Salvar alterações':'Gravar título'}</button></div></form></section></div>}
   {payPart&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="baixa-title" className="financeiro-modal w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="baixa-title" className="text-sm font-extrabold">Registrar baixa financeira</h2><p className="mt-1 text-[10px] text-slate-300">Saldo da parcela: {money(Number(payPart.saldo))}</p></header><form onSubmit={e=>void registerPayment(e)} className="space-y-3 p-4"><div><label className={label}>Valor da baixa (R$) *</label><input required type="number" min="0.01" max={payPart.saldo} step="0.01" className={input} value={payValue} onChange={e=>setPayValue(e.target.value)}/></div><div className="grid grid-cols-2 gap-3"><div><label className={label}>Data *</label><input required type="date" className={input} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div><div><label className={label}>Forma de pagamento *</label><select required className={input} value={payMethod} onChange={e=>setPayMethod(e.target.value)}>{['PIX','TRANSFERENCIA','BOLETO','DINHEIRO','CARTAO','CHEQUE','OUTRO'].map(x=><option key={x}>{x}</option>)}</select></div></div><div><label className={label}>Referência / comprovante</label><input className={input} value={reference} onChange={e=>setReference(e.target.value)} maxLength={160}/></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setPayPart(null)} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Registrando…':'Confirmar baixa'}</button></div></form></section></div>}
  </div>
 </main>
}
