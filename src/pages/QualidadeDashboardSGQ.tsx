import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import VendasLayout from './VendasLayout'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Inspection = { id:string; resultado:string; tipo:string; created_at:string; quantidade_inspecionada:number|null; quantidade_aprovada:number|null; quantidade_reprovada:number|null }
type Document = { id:string; codigo:string; titulo:string; status:string; revisao:number }
export default function QualidadeDashboardSGQ(){
 const [inspections,setInspections]=useState<Inspection[]>([])
 const [documents,setDocuments]=useState<Document[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const [inspectionRows,documentRows]=await Promise.all([
    fetchAllPages<Inspection>((from,to)=>supabase.from('erp_inspecoes')
     .select('id,resultado,tipo,created_at,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada',{count:'exact'})
     .eq('empresa_id',company.data).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<Document>((from,to)=>supabase.from('erp_documentos_qualidade')
     .select('id,codigo,titulo,status,revisao',{count:'exact'})
     .eq('empresa_id',company.data).order('codigo').range(from,to))
   ])
   setInspections(inspectionRows);setDocuments(documentRows)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os indicadores reais do SGQ.')}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const approved=inspections.filter(x=>String(x.resultado).toUpperCase()==='APROVADO').length
 const rejected=inspections.filter(x=>String(x.resultado).toUpperCase()==='REPROVADO').length
 const docsActive=documents.filter(x=>['vigente','liberada','aprovada','ativo'].includes(String(x.status).toLowerCase())).length
 const monthly=Array.from({length:6},(_,index)=>{const date=new Date();date.setMonth(date.getMonth()-(5-index));const key=date.toISOString().slice(0,7);const data=inspections.filter(x=>String(x.created_at).slice(0,7)===key);return {mes:date.toLocaleDateString('pt-BR',{month:'short'}),aprovadas:data.filter(x=>String(x.resultado).toUpperCase()==='APROVADO').length,reprovadas:data.filter(x=>String(x.resultado).toUpperCase()==='REPROVADO').length}})
 return <div className="quality-approved-dashboard"><style>{`.quality-approved-dashboard .synqra-workspace-title{position:relative;justify-content:center;min-height:42px}.quality-approved-dashboard .synqra-title-main{text-align:center;flex:1}.quality-approved-dashboard .synqra-title-actions{position:absolute;left:0;top:50%;transform:translateY(-50%)}.quality-approved-dashboard .synqra-tool-button{position:absolute;right:0;top:50%;transform:translateY(-50%)}`}</style><VendasLayout title="Painel de Gestão da Qualidade" subtitle="Indicadores calculados a partir dos registros da empresa autenticada." onRefresh={() => void load()} titleActions={<button type="button" onClick={() => window.dispatchEvent(new Event('erp:open-quality-tablet'))} className="inline-flex h-[30px] items-center gap-1 border border-[#A94F00] bg-[#F28C28] px-3 text-[10px] font-extrabold uppercase text-white shadow-[0_2px_0_#A94F00] hover:bg-[#D97706]">Menu SGQ</button>} topContent={<div className="mb-3 flex min-h-[30px] items-center border border-[#C8E3EE] bg-[#EAF6FA] px-3 py-1 text-[#123B50]"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">SGQ INDUSTRIAL · INDICADORES</p></div>}>
  {error&&<p role="alert" className="border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</p>}
  <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
   {[{label:'Inspeções carregadas',value:inspections.length,Icon:Activity,tone:'border-[#145A75] bg-[#176B87] text-white',iconTone:'border-white bg-[#D8EEF6] text-[#145A75]',labelTone:'text-white'},{label:'Inspeções aprovadas',value:approved,Icon:CheckCircle2,tone:'border-[#12633F] bg-[#18794E] text-white',iconTone:'border-white bg-[#D3EEDF] text-[#12633F]',labelTone:'text-white'},{label:'Inspeções reprovadas',value:rejected,Icon:AlertTriangle,tone:'border-[#922B35] bg-[#B42332] text-white',iconTone:'border-white bg-[#F9DADD] text-[#922B35]',labelTone:'text-white'},{label:'Documentos controlados',value:documents.length,Icon:FileText,tone:'border-[#934A05] bg-[#B96A05] text-white',iconTone:'border-white bg-[#FBE8C9] text-[#934A05]',labelTone:'text-white'}].map(({label,value,Icon,tone,iconTone,labelTone})=><article key={label} className={`flex min-h-[88px] items-center gap-3 border px-3 py-3 ${tone} shadow-[0_3px_0_rgba(18,59,80,0.24)]`}><span className={`grid h-9 w-9 place-items-center border-2 rounded-[3px] shadow-[3px_3px_0_rgba(0,0,0,0.22)] ${iconTone}`}><Icon size={19} strokeWidth={2.5}/></span><div><p className={`text-[9px] font-extrabold uppercase ${labelTone}`}>{label}</p><p className="text-[20px] font-extrabold tabular-nums text-white">{value}</p></div></article>)}
  </section>
  <section className="grid gap-3">
   <article className="min-h-[300px] border border-slate-200 bg-white p-4 text-slate-900"><div className="mb-2 flex items-center gap-2"><Activity size={15} className="text-[#2D8DB8]"/><div><h2 className="text-[11px] font-bold">Resultados de inspeção · últimos 6 meses</h2><p className="text-[9px] text-slate-500">Contagem de registros reais; períodos sem registros aparecem como zero.</p></div></div><div className="h-[260px]">{busy?<p className="p-8 text-center text-[10px] text-slate-500">Carregando...</p>:<ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis allowDecimals={false} tick={{fontSize:9}}/><Tooltip/><Bar dataKey="aprovadas" name="Aprovadas" fill="#2D8DB8" radius={[2,2,0,0]}/><Bar dataKey="reprovadas" name="Reprovadas" fill="#D65B61" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>}</div></article>
  </section>
  <section className="border border-[#D8E8EE] bg-white p-2">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-2"><FileText size={15} className="text-[#2D8DB8]"/><div><h2 className="text-[11px] font-bold">Cadastro de Documentos</h2><p className="text-[9px] text-slate-500">Cadastro, revisão e rastreabilidade dos documentos controlados do SGQ.</p></div></div>
    <Link to="/qualidade/ged-documentos" className="inline-flex h-[30px] items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white hover:bg-[#24789D]">Abrir cadastro →</Link>
   </div>
  </section>
  <section className="grid gap-3">
   <article className="border border-[#D8E8EE] bg-white p-3"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={15} className="text-[#2D8DB8]"/><h2 className="text-[11px] font-bold">Documentação do SGQ</h2></div><div className="grid grid-cols-2 gap-2"><div className="border border-[#3A9D78] bg-[#E8F6EE] p-3 text-[#276749]"><p className="text-[9px] uppercase">Vigentes / liberados</p><p className="text-[20px] font-semibold text-[#123B50]">{docsActive}</p></div><div className="border border-[#E6A34A] bg-[#FFF4E4] p-3 text-[#87500E]"><p className="text-[9px] uppercase">A revisar</p><p className="text-[20px] font-semibold text-[#123B50]">{Math.max(0,documents.length-docsActive)}</p></div></div><div className="mt-3 grid gap-1.5">{[['Inspeção em processo','/qualidade/inspecao-processo'],['CEP / cartas de controle','/qualidade/cep'],['Especificações técnicas','/qualidade/especificacoes'],['Relatórios e lista mestre','/qualidade/relatorios-documentos']].map(([label,href])=><Link key={href} to={href} className="flex h-[30px] items-center justify-between border border-slate-200 px-2 text-[10px] hover:border-[#2D8DB8] hover:bg-[#F4FBFD]">{label}<span className="text-[#2D8DB8]">Abrir →</span></Link>)}</div></article>
  </section>
  <section className="border border-[#D8E8EE] bg-white"><header className="border-b border-slate-200 px-3 py-2"><h2 className="text-[11px] font-bold">Inspeções recentes</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[10px]"><thead className="bg-[#EAF4F7] text-[9px] uppercase"><tr><th className="h-[30px] px-2">Data</th><th className="px-2">Tipo</th><th className="px-2">Resultado</th><th className="px-2">Inspecionada</th><th className="px-2">Aprovada</th><th className="px-2">Reprovada</th></tr></thead><tbody>{inspections.slice(0,12).map(x=><tr key={x.id} className="h-[30px] border-t border-slate-100"><td className="px-2">{new Date(x.created_at).toLocaleString('pt-BR')}</td><td className="px-2">{x.tipo}</td><td className="px-2">{x.resultado}</td><td className="px-2">{x.quantidade_inspecionada??'—'}</td><td className="px-2">{x.quantidade_aprovada??'—'}</td><td className="px-2">{x.quantidade_reprovada??'—'}</td></tr>)}{!inspections.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma inspeção cadastrada para esta empresa.</td></tr>}</tbody></table></div></section>
 </VendasLayout></div>
}
