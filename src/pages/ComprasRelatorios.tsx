/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, FileDown, FileSpreadsheet, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'
import { Link } from 'react-router-dom'

type Purchase = { id:string; numero:number; status:string; total:number; created_at:string; fornecedor_id:string|null; data_prevista:string|null }
type Request = { id:string; status:string; prioridade:string; created_at:string }
type Rfq = { id:string; status:string; created_at:string; prazo_resposta:string|null; fornecedor_escolhido_id:string|null; justificativa_escolha:string|null }
type Supplier = { id:string; razao_social:string; nome_fantasia:string|null }

const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const monthKey=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR',{month:'2-digit',year:'2-digit'})}

export default function ComprasRelatorios(){
 const [purchases,setPurchases]=useState<Purchase[]>([]),[requests,setRequests]=useState<Request[]>([]),[rfqs,setRfqs]=useState<Rfq[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([])
 const [busy,setBusy]=useState(false),[q,setQ]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [rfqStatusFilter,setRfqStatusFilter]=useState('TODOS'),[rfqStartDate,setRfqStartDate]=useState(''),[rfqEndDate,setRfqEndDate]=useState('')
 const [purchasePage,setPurchasePage]=useState(1),[rfqPage,setRfqPage]=useState(1)
 const pageSize=25
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id');if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const id=String(company.data)
   const [p,r,f,s]=await Promise.all([
    fetchAllPages<Purchase>((a,b)=>supabase.from('erp_pedidos_compra').select('id,numero,status,total,created_at,fornecedor_id,data_prevista',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Request>((a,b)=>supabase.from('erp_solicitacoes_compra').select('id,status,prioridade,created_at',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Rfq>((a,b)=>supabase.from('erp_rfq').select('id,status,created_at,prazo_resposta,fornecedor_escolhido_id,justificativa_escolha',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Supplier>((a,b)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia',{count:'exact'}).eq('empresa_id',id).range(a,b)),
   ])
   setPurchases(p);setRequests(r);setRfqs(f);setSuppliers(s)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar relatórios de compras.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s.nome_fantasia||s.razao_social])),[suppliers])
 const visibleRfqs=useMemo(()=>rfqs.filter(r=>{
  const status=String(r.status||'EM_ANALISE')
  const date=String(r.created_at||'').slice(0,10)
  return (rfqStatusFilter==='TODOS'||status===rfqStatusFilter)
   &&(!rfqStartDate||date>=rfqStartDate)&&(!rfqEndDate||date<=rfqEndDate)
 }),[rfqs,rfqStatusFilter,rfqStartDate,rfqEndDate])
 const visible=purchases.filter(p=>`${p.numero} ${supplierMap.get(p.fornecedor_id||'')||''} ${p.status}`.toLowerCase().includes(q.toLowerCase()))
 const total=visible.reduce((s,p)=>s+Number(p.total||0),0)
 const approved=visible.filter(p=>p.status==='APROVADO'||p.status==='RECEBIMENTO_PARCIAL'||p.status==='RECEBIDO')
 const pending=visible.filter(p=>p.status==='PENDENTE_APROVACAO').length
 const withoutSupplier=visible.filter(p=>!p.fornecedor_id).length
 const byMonth=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible){const k=monthKey(p.created_at);map.set(k,(map.get(k)||0)+Number(p.total||0))}
  return [...map.entries()].reverse().slice(-12).map(([mes,total])=>({mes,total}))
 },[visible])
 const byStatus=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible)map.set(p.status,(map.get(p.status)||0)+1)
  return [...map.entries()].map(([status,quantidade])=>({status,quantidade}))
 },[visible])
 const purchasePageCount=Math.max(1,Math.ceil(visible.length/pageSize))
 const visiblePurchasePage=visible.slice((purchasePage-1)*pageSize,purchasePage*pageSize)
 const rfqPageCount=Math.max(1,Math.ceil(visibleRfqs.length/pageSize))
 const visibleRfqPage=visibleRfqs.slice((rfqPage-1)*pageSize,rfqPage*pageSize)
 useEffect(()=>setPurchasePage(1),[q])
 useEffect(()=>setRfqPage(1),[rfqStatusFilter,rfqStartDate,rfqEndDate])
 const exportPurchasesCsv=()=>{
  const lines=[['Pedido','Fornecedor','Status','Previsão','Data de registro','Total'],...visible.map(p=>['PC-'+String(p.numero).padStart(4,'0'),supplierMap.get(p.fornecedor_id||'')||'',p.status,p.data_prevista||'',p.created_at,p.total])]
  const csv='\\ufeff'+lines.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\\r\\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=window.document.createElement('a');a.href=url;a.download='relatorio-pedidos-compra.csv';a.click();URL.revokeObjectURL(url)
 }
 const exportRfqsCsv=()=>{
  const lines=[['RFQ','Status','Prazo resposta','Fornecedor escolhido','Justificativa'],...visibleRfqs.map(r=>[r.id,r.status,r.prazo_resposta||'',supplierMap.get(r.fornecedor_escolhido_id||'')||'',r.justificativa_escolha||''])]
  const csv='\\ufeff'+lines.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\\r\\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=window.document.createElement('a');a.href=url;a.download='auditoria-rfq.csv';a.click();URL.revokeObjectURL(url)
 }
 const topSuppliers=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible)if(p.fornecedor_id)map.set(p.fornecedor_id,(map.get(p.fornecedor_id)||0)+Number(p.total||0))
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,total])=>({fornecedor:(supplierMap.get(id)||'Fornecedor').slice(0,24),total}))
 },[visible])
 const print=()=>window.print()
 return <VendasLayout title="Relatórios de compras" subtitle="Indicadores • gastos • fornecedores • aprovações • fiscal" onRefresh={()=>void load()}>
  <main className="buy-report print:bg-white print:p-0"><div className="hidden border-b-2 border-[#123B50] pb-3 print:block"><strong className="text-[19px] tracking-[.16em]">PLASTIBOR</strong><p className="text-[10px]">Compras · Relatórios e auditoria</p><p className="text-[10px]">Emitido em {new Date().toLocaleString()}</p></div>
   <style>{`.buy-report{min-height:100vh;background:#f8fafc;color:#0f172a;padding:20px}.buy-report-wrap{max-width:1500px;margin:0 auto}.buy-report-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}.buy-report-head h1{margin:4px 0;font-size:27px}.buy-report-head p{margin:0;color:#64748b;font-size:12px}.buy-report-actions{display:flex;gap:8px;flex-wrap:wrap}.buy-report-btn{display:inline-flex;min-height:40px;align-items:center;gap:6px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:9px 12px;font-weight:800;cursor:pointer}.buy-report-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}.buy-report-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.buy-report-kpis article,.buy-report-card{background:#fff;border:1px solid #dbe3ea;border-radius:8px;box-shadow:0 2px 8px rgba(15,23,42,.04)}.buy-report-kpis article{padding:14px}.buy-report-kpis span{display:block;color:#64748b;font-size:10px;font-weight:800}.buy-report-kpis strong{display:block;font-size:22px;margin-top:6px}.buy-report-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;margin-top:10px}.buy-report-card{padding:15px}.buy-report-card h2{margin:0 0 10px;font-size:15px}.buy-report-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}.buy-report-search{display:flex;height:40px;align-items:center;gap:7px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:0 9px;max-width:420px;width:100%}.buy-report-search input{height:40px;border:0;outline:0;padding:9px;width:100%}.buy-report-filter{height:40px;min-width:120px;border:1px solid #cbd5e1;border-radius:3px;background:#fff;padding:0 8px;color:#334155;font-size:11px}.buy-report-table{width:100%;border-collapse:collapse;font-size:11px}.buy-report-table th,.buy-report-table td{height:48px;padding:9px;border-bottom:1px solid #edf1f4;text-align:left}.buy-report-table th{font-size:9px;color:#64748b;text-transform:uppercase}.buy-report-empty{padding:25px;text-align:center;color:#64748b}@media(max-width:1000px){.buy-report-kpis{grid-template-columns:repeat(3,1fr)}.buy-report-grid{grid-template-columns:1fr}}@media(max-width:650px){.buy-report{padding:12px}.buy-report-kpis{grid-template-columns:1fr 1fr}.buy-report-head{flex-direction:column}}@media print{@page{size:landscape;margin:12mm}.buy-report-head,.buy-report-actions,.buy-report-search,.buy-report-filter,.buy-report-manual,.buy-report-pagination{display:none!important}.buy-report{background:#fff;padding:0}.buy-report-card,.buy-report-kpis article{box-shadow:none}}`}</style>
   <div className="buy-report-wrap">
    <header className="buy-report-head print:hidden"><div><span style={{fontSize:9,fontWeight:900,color:'#2563eb',letterSpacing:'.12em'}}>COMPRAS • GESTÃO</span><h1>Relatórios e gráficos</h1><p>Valores e volumes derivados dos documentos reais da empresa.</p></div><div className="buy-report-actions"><Link to="/pageprincipal/compras" className="buy-report-btn" style={{height:38,width:115,borderRadius:999,justifyContent:"center"}}><ArrowLeft size={14}/> Voltar</Link><button className="buy-report-btn" onClick={exportPurchasesCsv} disabled={!visible.length}><FileSpreadsheet size={14}/> Pedidos CSV</button><button className="buy-report-btn" onClick={exportRfqsCsv} disabled={!visibleRfqs.length}><FileSpreadsheet size={14}/> RFQs CSV</button><button className="buy-report-btn" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Atualizar</button><button className="buy-report-btn" onClick={print}><FileDown size={14}/> Imprimir / PDF</button></div></header>
    {(message||error)&&<div style={{marginBottom:10,padding:10,borderRadius:7,background:error?'#fef2f2':'#ecfdf5',color:error?'#991b1b':'#166534'}}>{error||message}</div>}
    <section className="buy-report-kpis">
      <article><span>Pedidos filtrados</span><strong>{busy?"Carregando…":error?"—":visible.length}</strong></article>
      <article><span>Valor dos pedidos</span><strong>{busy?"Carregando…":error?"—":money(total)}</strong></article>
      <article><span>Aprovados / recebidos</span><strong>{busy?"Carregando…":error?"—":approved.length}</strong></article>
      <article><span>Aguardando aprovação</span><strong>{busy?"Carregando…":error?"—":pending}</strong></article>
      <article><span>Sem fornecedor vinculado</span><strong>{busy?"Carregando…":error?"—":withoutSupplier}</strong></article>
    </section>
    <div className="buy-report-grid">
      <section className="buy-report-card"><h2>Gasto por mês</h2><div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes"/><YAxis/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="total" name="Compras"/></BarChart></ResponsiveContainer></div></section>
      <section className="buy-report-card"><h2>Status dos pedidos</h2><div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={byStatus} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="status" width={130}/><Tooltip/><Bar dataKey="quantidade" name="Pedidos"/></BarChart></ResponsiveContainer></div></section>
    </div>
    <section className="buy-report-card" style={{marginTop:10}}><h2>Maiores fornecedores por valor</h2><div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><BarChart data={topSuppliers} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="fornecedor" width={170}/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="total" name="Valor comprado"/></BarChart></ResponsiveContainer></div></section>
    <section className="buy-report-card" style={{marginTop:10}}><div className="buy-report-toolbar"><div className="buy-report-search"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pedido, fornecedor, status ou fiscal..."/></div><span style={{fontSize:11,color:'#64748b'}}>{requests.length} solicitações • {rfqs.length} RFQs • {suppliers.length} fornecedores</span></div>
      <div style={{overflowX:'auto'}}><table className="buy-report-table"><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Status</th><th>Previsão</th><th>Data de registro</th><th>Total</th></tr></thead><tbody>{visiblePurchasePage.map(p=><tr key={p.id}><td>PC-{String(p.numero).padStart(4,'0')}</td><td>{supplierMap.get(p.fornecedor_id||'')||'—'}</td><td>{p.status}</td><td>{p.data_prevista?new Date(p.data_prevista+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td><td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td><td>{money(p.total)}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="buy-report-empty">Nenhum pedido encontrado.</td></tr>}</tbody><tfoot><tr><td colSpan={5} style={{fontWeight:800}}>TOTALIZADORES: {visible.length} pedido(s)</td><td style={{fontWeight:800}}>{money(total)}</td></tr></tfoot></table></div>{purchasePageCount>1&&<div className="buy-report-pagination" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:10,fontSize:11}}><span>Página {purchasePage} de {purchasePageCount} · {visible.length} pedidos</span><div style={{display:'flex',gap:8}}><button className="buy-report-btn" disabled={purchasePage<=1} onClick={()=>setPurchasePage(v=>Math.max(1,v-1))}>Anterior</button><button className="buy-report-btn" disabled={purchasePage>=purchasePageCount} onClick={()=>setPurchasePage(v=>Math.min(purchasePageCount,v+1))}>Próxima</button></div></div>}
    </section>
    <section className="buy-report-card" style={{marginTop:10}}>
      <div className="buy-report-toolbar" style={{flexWrap:'wrap'}}>
        <div style={{marginRight:'auto'}}><h2 style={{margin:0}}>Auditoria de cotações (RFQ)</h2><span style={{fontSize:10,color:'#64748b'}}>Decisão comercial, prazo e justificativa de custo da empresa autenticada.</span></div>
        <select aria-label="Filtrar status de aprovação das RFQs" className="buy-report-filter" value={rfqStatusFilter} onChange={e=>setRfqStatusFilter(e.target.value)}>
          <option value="TODOS">Todos os status</option><option value="EM_ANALISE">Em análise</option><option value="APROVADO">Aprovado</option><option value="REJEITADO">Rejeitado</option>
        </select>
        <input aria-label="Data inicial das RFQs" className="buy-report-filter" type="date" value={rfqStartDate} onChange={e=>setRfqStartDate(e.target.value)}/>
        <input aria-label="Data final das RFQs" className="buy-report-filter" type="date" value={rfqEndDate} onChange={e=>setRfqEndDate(e.target.value)}/>
      </div>
      <div style={{overflowX:'auto'}}><table className="buy-report-table"><thead><tr><th>RFQ</th><th>Status</th><th>Prazo de resposta</th><th>Fornecedor escolhido</th><th>Justificativa</th></tr></thead><tbody>
        {visibleRfqPage.map(r=><tr key={r.id}><td style={{fontFamily:'monospace',color:'#2563eb'}}>{r.id.slice(0,8)}</td><td>{r.status||'EM_ANALISE'}</td><td>{r.prazo_resposta?new Date(r.prazo_resposta+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td><td>{supplierMap.get(r.fornecedor_escolhido_id||'')||'—'}</td><td title={r.justificativa_escolha||''} style={{maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.justificativa_escolha||'—'}</td></tr>)}
        {!visibleRfqs.length&&<tr><td colSpan={5} className="buy-report-empty">Nenhuma cotação encontrada para os filtros selecionados.</td></tr>}
      </tbody><tfoot><tr><td colSpan={5} style={{fontWeight:800}}>TOTALIZADORES: {visibleRfqs.length} RFQ(s) · {visibleRfqs.filter(r=>r.fornecedor_escolhido_id).length} com fornecedor escolhido</td></tr></tfoot></table></div>{rfqPageCount>1&&<div className="buy-report-pagination" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:10,fontSize:11}}><span>Página {rfqPage} de {rfqPageCount} · {visibleRfqs.length} RFQs</span><div style={{display:'flex',gap:8}}><button className="buy-report-btn" disabled={rfqPage<=1} onClick={()=>setRfqPage(v=>Math.max(1,v-1))}>Anterior</button><button className="buy-report-btn" disabled={rfqPage>=rfqPageCount} onClick={()=>setRfqPage(v=>Math.min(rfqPageCount,v+1))}>Próxima</button></div></div>}
    </section>
   </div>
  </main>
 </VendasLayout>
}
