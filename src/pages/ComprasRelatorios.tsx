import { useEffect, useMemo, useState } from 'react'
import { BarChart3, FileDown, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import VendasLayout from './VendasLayout'

type Purchase = { id:string; numero:number; status:string; total:number; data_pedido:string; fornecedor_id:string|null; fiscal_status:string|null }
type Request = { id:string; status:string; prioridade:string; created_at:string }
type Rfq = { id:string; status:string; created_at:string }
type Supplier = { id:string; razao_social:string; nome_fantasia:string|null }

const money=(v:number)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const monthKey=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR',{month:'2-digit',year:'2-digit'})}

export default function ComprasRelatorios(){
 const [purchases,setPurchases]=useState<Purchase[]>([]),[requests,setRequests]=useState<Request[]>([]),[rfqs,setRfqs]=useState<Rfq[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([])
 const [busy,setBusy]=useState(false),[q,setQ]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
 const load=async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id');if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const id=String(company.data)
   const [p,r,f,s]=await Promise.all([
    fetchAllPages<Purchase>((a,b)=>supabase.from('erp_pedidos_compra').select('id,numero,status,total,data_pedido,fornecedor_id,fiscal_status',{count:'exact'}).eq('empresa_id',id).order('data_pedido',{ascending:false}).range(a,b)),
    fetchAllPages<Request>((a,b)=>supabase.from('erp_solicitacoes_compra').select('id,status,prioridade,created_at',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Rfq>((a,b)=>supabase.from('erp_rfq').select('id,status,created_at',{count:'exact'}).eq('empresa_id',id).order('created_at',{ascending:false}).range(a,b)),
    fetchAllPages<Supplier>((a,b)=>supabase.from('erp_fornecedores').select('id,razao_social,nome_fantasia',{count:'exact'}).eq('empresa_id',id).range(a,b)),
   ])
   setPurchases(p);setRequests(r);setRfqs(f);setSuppliers(s)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar relatórios de compras.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const supplierMap=useMemo(()=>new Map(suppliers.map(s=>[s.id,s.nome_fantasia||s.razao_social])),[suppliers])
 const visible=purchases.filter(p=>`${p.numero} ${supplierMap.get(p.fornecedor_id||'')||''} ${p.status} ${p.fiscal_status||''}`.toLowerCase().includes(q.toLowerCase()))
 const total=visible.reduce((s,p)=>s+Number(p.total||0),0)
 const approved=visible.filter(p=>p.status==='APROVADO'||p.status==='RECEBIMENTO_PARCIAL'||p.status==='RECEBIDO')
 const pending=visible.filter(p=>p.status==='PENDENTE_APROVACAO').length
 const blockedFiscal=visible.filter(p=>p.fiscal_status==='BLOQUEADO').length
 const byMonth=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible){const k=monthKey(p.data_pedido);map.set(k,(map.get(k)||0)+Number(p.total||0))}
  return [...map.entries()].reverse().slice(-12).map(([mes,total])=>({mes,total}))
 },[visible])
 const byStatus=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible)map.set(p.status,(map.get(p.status)||0)+1)
  return [...map.entries()].map(([status,quantidade])=>({status,quantidade}))
 },[visible])
 const topSuppliers=useMemo(()=>{
  const map=new Map<string,number>();for(const p of visible)if(p.fornecedor_id)map.set(p.fornecedor_id,(map.get(p.fornecedor_id)||0)+Number(p.total||0))
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,total])=>({fornecedor:(supplierMap.get(id)||'Fornecedor').slice(0,24),total}))
 },[visible])
 const print=()=>window.print()
 return <VendasLayout title="Relatórios de compras" subtitle="Indicadores • gastos • fornecedores • aprovações • fiscal" onRefresh={()=>void load()}>
  <main className="buy-report">
   <style>{`.buy-report{min-height:100vh;background:#f8fafc;color:#0f172a;padding:20px}.buy-report-wrap{max-width:1500px;margin:0 auto}.buy-report-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}.buy-report-head h1{margin:4px 0;font-size:27px}.buy-report-head p{margin:0;color:#64748b;font-size:12px}.buy-report-actions{display:flex;gap:8px;flex-wrap:wrap}.buy-report-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:9px 12px;font-weight:800;cursor:pointer}.buy-report-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}.buy-report-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.buy-report-kpis article,.buy-report-card{background:#fff;border:1px solid #dbe3ea;border-radius:8px;box-shadow:0 2px 8px rgba(15,23,42,.04)}.buy-report-kpis article{padding:14px}.buy-report-kpis span{display:block;color:#64748b;font-size:10px;font-weight:800}.buy-report-kpis strong{display:block;font-size:22px;margin-top:6px}.buy-report-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;margin-top:10px}.buy-report-card{padding:15px}.buy-report-card h2{margin:0 0 10px;font-size:15px}.buy-report-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:10px}.buy-report-search{display:flex;align-items:center;gap:7px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:0 9px;max-width:420px;width:100%}.buy-report-search input{border:0;outline:0;padding:9px;width:100%}.buy-report-table{width:100%;border-collapse:collapse;font-size:11px}.buy-report-table th,.buy-report-table td{padding:9px;border-bottom:1px solid #edf1f4;text-align:left}.buy-report-table th{font-size:9px;color:#64748b;text-transform:uppercase}.buy-report-empty{padding:25px;text-align:center;color:#64748b}@media(max-width:1000px){.buy-report-kpis{grid-template-columns:repeat(3,1fr)}.buy-report-grid{grid-template-columns:1fr}}@media(max-width:650px){.buy-report{padding:12px}.buy-report-kpis{grid-template-columns:1fr 1fr}.buy-report-head{flex-direction:column}}@media print{.buy-report-actions,.buy-report-search{display:none!important}.buy-report{background:#fff;padding:0}.buy-report-card,.buy-report-kpis article{box-shadow:none}}`}</style>
   <div className="buy-report-wrap">
    <header className="buy-report-head"><div><span style={{fontSize:9,fontWeight:900,color:'#2563eb',letterSpacing:'.12em'}}>COMPRAS • GESTÃO</span><h1>Relatórios e gráficos</h1><p>Valores e volumes derivados dos documentos reais da empresa.</p></div><div className="buy-report-actions"><button className="buy-report-btn" onClick={()=>void load()} disabled={busy}><RefreshCw size={14}/> Atualizar</button><button className="buy-report-btn" onClick={print}><FileDown size={14}/> Imprimir / PDF</button></div></header>
    {(message||error)&&<div style={{marginBottom:10,padding:10,borderRadius:7,background:error?'#fef2f2':'#ecfdf5',color:error?'#991b1b':'#166534'}}>{error||message}</div>}
    <section className="buy-report-kpis">
      <article><span>Pedidos filtrados</span><strong>{visible.length}</strong></article>
      <article><span>Valor dos pedidos</span><strong>{money(total)}</strong></article>
      <article><span>Aprovados / recebidos</span><strong>{approved.length}</strong></article>
      <article><span>Aguardando aprovação</span><strong>{pending}</strong></article>
      <article><span>Bloqueios fiscais</span><strong>{blockedFiscal}</strong></article>
    </section>
    <div className="buy-report-grid">
      <section className="buy-report-card"><h2>Gasto por mês</h2><div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes"/><YAxis/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="total" name="Compras"/></BarChart></ResponsiveContainer></div></section>
      <section className="buy-report-card"><h2>Status dos pedidos</h2><div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={byStatus} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="status" width={130}/><Tooltip/><Bar dataKey="quantidade" name="Pedidos"/></BarChart></ResponsiveContainer></div></section>
    </div>
    <section className="buy-report-card" style={{marginTop:10}}><h2>Maiores fornecedores por valor</h2><div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><BarChart data={topSuppliers} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="fornecedor" width={170}/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="total" name="Valor comprado"/></BarChart></ResponsiveContainer></div></section>
    <section className="buy-report-card" style={{marginTop:10}}><div className="buy-report-toolbar"><div className="buy-report-search"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pedido, fornecedor, status ou fiscal..."/></div><span style={{fontSize:11,color:'#64748b'}}>{requests.length} solicitações • {rfqs.length} RFQs • {suppliers.length} fornecedores</span></div>
      <div style={{overflowX:'auto'}}><table className="buy-report-table"><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Status</th><th>Fiscal</th><th>Data</th><th>Total</th></tr></thead><tbody>{visible.slice(0,100).map(p=><tr key={p.id}><td>PC-{String(p.numero).padStart(4,'0')}</td><td>{supplierMap.get(p.fornecedor_id||'')||'—'}</td><td>{p.status}</td><td>{p.fiscal_status||'NAO_ANALISADO'}</td><td>{new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td><td>{money(p.total)}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="buy-report-empty">Nenhum pedido encontrado.</td></tr>}</tbody></table></div>
    </section>
   </div>
  </main>
 </VendasLayout>
}
