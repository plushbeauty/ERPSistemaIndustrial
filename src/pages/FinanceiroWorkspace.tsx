/**
 * SYSNQRA ERP INDUSTRIAL — Central Financeira
 * @REVISAO 30/10/2026
 * Usa títulos, parcelas e baixas do schema financeiro versionado; autenticação/RLS via Supabase.
 * Não simula saldos, bancos ou centros de custo que não tenham fonte confirmada.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleHelp, FilePlus2, RefreshCw, Search, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Kind = 'PAGAR' | 'RECEBER'
type Title = { id:string; tipo:Kind; parceiro_tipo:string; parceiro_id:string; descricao:string; documento:string|null; categoria:string|null; centro_custo:string|null; data_emissao:string; valor_total:number; status:string; criado_em:string }
type Installment = { id:string; titulo_id:string; numero:number; vencimento:string; valor:number; saldo:number; status:string }
type Partner = { id:string; nome?:string; razao_social?:string; nome_fantasia?:string; codigo?:string }
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
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const companyResult=await supabase.rpc('erp_current_empresa_id')
   if(companyResult.error)throw companyResult.error
   if(typeof companyResult.data!=='string'||!companyResult.data)throw new Error('Empresa ativa não identificada. Confira a sessão e o vínculo do usuário.')
   const empresa=companyResult.data;setCompany(empresa)
   const [t,p,r]=await Promise.all([
    supabase.from('erp_financeiro_titulos').select('id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,data_emissao,valor_total,status,criado_em').eq('empresa_id',empresa).order('criado_em',{ascending:false}).limit(1000),
    supabase.from('erp_fornecedores').select('id,nome,razao_social,nome_fantasia,codigo').eq('empresa_id',empresa).eq('ativo',true).order('nome').limit(2000),
    supabase.from('erp_clientes').select('id,nome,razao_social,nome_fantasia,codigo').eq('empresa_id',empresa).eq('ativo',true).order('nome').limit(2000)
   ])
   if(t.error)throw t.error
   setTitles((t.data??[]) as Title[])
   const [parts,baixas]=await Promise.all([
    supabase.from('erp_financeiro_parcelas').select('id,titulo_id,numero,vencimento,valor,saldo,status').eq('empresa_id',empresa).order('vencimento').limit(5000),
    supabase.from('erp_financeiro_baixas').select('id,titulo_id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia').eq('empresa_id',empresa).order('ocorrido_em',{ascending:false}).limit(1000)
   ])
   if(parts.error)throw parts.error
   if(baixas.error)throw baixas.error
   setInstallments((parts.data??[]) as Installment[])
   const partnerRows=[...(p.data??[]),...(r.data??[])] as Partner[]
   setPartners(partnerRows)
  }catch(e){setError(errText(e))}finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const filtered=titles.filter(t=>(tab==='PAGAR'||tab==='RECEBER'?t.tipo===tab:true)&&[t.descricao,t.documento??'',t.categoria??'',t.status].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
 const openParts=installments.filter(p=>p.saldo>0&&p.status!=='CANCELADO')
 const totalPay=titles.filter(t=>t.tipo==='PAGAR'&&t.status!=='LIQUIDADO'&&t.status!=='CANCELADO').reduce((s,t)=>s+Number(t.valor_total),0)
 const totalReceive=titles.filter(t=>t.tipo==='RECEBER'&&t.status!=='LIQUIDADO'&&t.status!=='CANCELADO').reduce((s,t)=>s+Number(t.valor_total),0)
 const totalOpen=openParts.reduce((s,p)=>s+Number(p.saldo),0)
 const partnerLabel=(id:string)=>{const p=partners.find(x=>x.id===id);return p?.nome_fantasia||p?.razao_social||p?.nome||p?.codigo||'Parceiro cadastrado'}
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
   {tab==='RESUMO'&&<><section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['A pagar em aberto',money(totalPay),'#D65B61'],['A receber em aberto',money(totalReceive),'#3A9D78'],['Saldo de parcelas pendentes',money(totalOpen),'#2D8DB8'],['Títulos carregados',String(titles.length),'#123B50']].map(([title,value,color])=><article key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-2 text-xl font-extrabold" style={{color}}>{value}</p><p className="mt-1 text-[10px] text-slate-400">Calculado a partir dos registros retornados</p></article>)}</section><section className="grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>beginCreate('PAGAR')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-600"><ArrowUpRight size={20}/></span><span><strong className="block text-sm">Lançar conta a pagar</strong><small className="text-xs text-slate-500">Fornecedor, vencimento, valor e centro de custo</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button><button type="button" onClick={()=>beginCreate('RECEBER')} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#2D8DB8]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ArrowDownLeft size={20}/></span><span><strong className="block text-sm">Lançar conta a receber</strong><small className="text-xs text-slate-500">Cliente, vencimento, valor e categoria</small></span><FilePlus2 className="ml-auto text-slate-400" size={17}/></button></section></>}
   {(tab==='PAGAR'||tab==='RECEBER')&&<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3"><div><h2 className="text-sm font-extrabold">{tab==='PAGAR'?'Contas a pagar':'Contas a receber'}</h2><p className="mt-1 text-[10px] text-slate-500">Empresa ativa · registros reais do Supabase</p></div><button type="button" onClick={()=>beginCreate(tab)} className={button+' bg-[#2D8DB8] text-white'}><FilePlus2 size={14}/> Novo título</button></div><div className="border-b border-slate-100 p-3"><label className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className={input+' pl-8'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar descrição, documento, categoria ou status"/></label></div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Descrição','Parceiro','Emissão','Valor','Status','Parcelas'].map(x=><th key={x} className="px-3 py-2 font-semibold">{x}</th>)}</tr></thead><tbody>{filtered.filter(t=>t.tipo===tab).map(t=>{const ps=installments.filter(p=>p.titulo_id===t.id);return <tr key={t.id} className="border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t.descricao}</strong><small className="block text-[10px] text-slate-400">{t.documento||t.categoria||'Sem documento/categoria'}</small></td><td className="px-3 py-2">{partnerLabel(t.parceiro_id)}</td><td className="px-3 py-2">{t.data_emissao}</td><td className="px-3 py-2 font-bold">{money(Number(t.valor_total))}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{t.status}</span></td><td className="px-3 py-2">{ps.length} · {money(ps.reduce((s,p)=>s+Number(p.saldo),0))} aberto</td></tr>})}{!loading&&filtered.filter(t=>t.tipo===tab).length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Nenhum título encontrado para este filtro.</td></tr>}</tbody></table></div></section>}
   {tab==='BAIXAS'&&<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-3"><h2 className="text-sm font-extrabold">Parcelas e liquidação</h2><p className="mt-1 text-[10px] text-slate-500">Selecione uma parcela em aberto para registrar pagamento ou recebimento parcial/total.</p></div><div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-[#123B50] text-white"><tr>{['Título','Parcela','Vencimento','Valor','Saldo','Ação'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{openParts.map(p=>{const t=titles.find(x=>x.id===p.titulo_id);return <tr key={p.id} className="border-b border-slate-100 even:bg-slate-50/70"><td className="px-3 py-2"><strong>{t?.descricao??'Título não encontrado'}</strong><small className="block text-[10px] text-slate-400">{t?.tipo==='PAGAR'?'A pagar':'A receber'} · {t?partnerLabel(t.parceiro_id):'—'}</small></td><td className="px-3 py-2">{p.numero}</td><td className="px-3 py-2">{p.vencimento}</td><td className="px-3 py-2">{money(Number(p.valor))}</td><td className="px-3 py-2 font-bold">{money(Number(p.saldo))}</td><td className="px-3 py-2"><button type="button" onClick={()=>{setPayPart(p);setPayValue(String(p.saldo));setPayDate(localDate());setError('')}} className={button+' h-7 bg-[#2D8DB8] text-white'}><Banknote size={13}/> Baixar</button></td></tr>})}{!loading&&openParts.length===0&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Não há parcelas em aberto retornadas para a empresa ativa.</td></tr>}</tbody></table></div></section>}
   {loading&&<div role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">Carregando dados financeiros reais…</div>}
   <footer className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><Wallet size={13}/> Acesso protegido pela sessão Supabase e pelas políticas RLS. <button type="button" onClick={()=>setMessage('Ajuda: lance títulos pelas abas Contas a pagar/receber. A baixa é feita pela aba Parcelas/baixas e exige permissão financeiro.lancar. Bancos, conciliação e centros de custo dependem das tabelas/serviços correspondentes no ambiente.')} className="inline-flex items-center gap-1 font-bold text-[#2D8DB8]"><CircleHelp size={12}/> Ajuda desta tela</button></footer>
   {showForm&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="finance-title" className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="finance-title" className="text-sm font-extrabold">{kind==='PAGAR'?'Novo título a pagar':'Novo título a receber'}</h2><p className="mt-1 text-[10px] text-slate-300">Gravação transacional pela RPC erp_financeiro_salvar_titulo</p></header><form onSubmit={e=>void saveTitle(e)} className="space-y-3 p-4"><div className="grid gap-3 md:grid-cols-2"><div><label className={label}>{kind==='PAGAR'?'Fornecedor':'Cliente'} *</label><select required className={input} value={partner} onChange={e=>setPartner(e.target.value)}><option value="">Selecione um cadastro real</option>{partners.filter(p=>kind==='PAGAR'?Boolean((p as Partner & {razao_social?:string}).razao_social||p.nome):true).map(p=><option key={p.id} value={p.id}>{p.codigo? p.codigo+' · ':''}{p.nome_fantasia||p.razao_social||p.nome||p.id}</option>)}</select></div><div><label className={label}>Descrição *</label><input required className={input} value={description} onChange={e=>setDescription(e.target.value)} maxLength={180}/></div><div><label className={label}>Documento</label><input className={input} value={document} onChange={e=>setDocument(e.target.value)} maxLength={80}/></div><div><label className={label}>Categoria</label><input className={input} value={category} onChange={e=>setCategory(e.target.value)} maxLength={100}/></div><div><label className={label}>Centro de custo</label><input className={input} value={costCenter} onChange={e=>setCostCenter(e.target.value)} maxLength={100}/></div><div><label className={label}>Data de emissão *</label><input required type="date" className={input} value={issueDate} onChange={e=>setIssueDate(e.target.value)}/></div><div><label className={label}>Primeiro vencimento *</label><input required type="date" className={input} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div><div><label className={label}>Valor total (R$) *</label><input required type="number" min="0.01" step="0.01" className={input} value={amount} onChange={e=>setAmount(e.target.value)}/></div></div><p className="rounded-md bg-sky-50 p-2 text-[10px] text-sky-900">Este formulário cria uma parcela inicial. Parcelamento múltiplo, bancos e conciliação só serão ativados quando seus serviços/tabelas forem confirmados no ambiente.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setShowForm(false)} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Gravando…':'Gravar título'}</button></div></form></section></div>}
   {payPart&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="baixa-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"><header className="bg-[#123B50] px-4 py-3 text-white"><h2 id="baixa-title" className="text-sm font-extrabold">Registrar baixa financeira</h2><p className="mt-1 text-[10px] text-slate-300">Saldo da parcela: {money(Number(payPart.saldo))}</p></header><form onSubmit={e=>void registerPayment(e)} className="space-y-3 p-4"><div><label className={label}>Valor da baixa (R$) *</label><input required type="number" min="0.01" max={payPart.saldo} step="0.01" className={input} value={payValue} onChange={e=>setPayValue(e.target.value)}/></div><div className="grid grid-cols-2 gap-3"><div><label className={label}>Data *</label><input required type="date" className={input} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div><div><label className={label}>Forma de pagamento *</label><select required className={input} value={payMethod} onChange={e=>setPayMethod(e.target.value)}>{['PIX','TRANSFERENCIA','BOLETO','DINHEIRO','CARTAO','CHEQUE','OUTRO'].map(x=><option key={x}>{x}</option>)}</select></div></div><div><label className={label}>Referência / comprovante</label><input className={input} value={reference} onChange={e=>setReference(e.target.value)} maxLength={160}/></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>setPayPart(null)} className={button+' border border-slate-200 bg-white text-slate-600'}>Cancelar</button><button disabled={busy} type="submit" className={button+' bg-[#2D8DB8] text-white'}>{busy?'Registrando…':'Confirmar baixa'}</button></div></form></section></div>}
  </div>
 </main>
}
