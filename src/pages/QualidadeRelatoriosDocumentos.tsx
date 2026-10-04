import { useEffect, useMemo, useState } from 'react'
import { FileText, Filter, Printer, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'

type Doc={
 id:string
 codigo:string
 titulo:string
 area:string|null
 setor:string|null
 tipo:string
 revisao:number
 status:string
 data_emissao:string|null
 data_revisao:string|null
 validade_ate:string|null
 proxima_revisao:string|null
}

const input='min-h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const label='grid gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-800'

const activeStatuses=new Set(['vigente','liberada','aprovada'])
const formTypes=new Set(['formulário','formulario','form','registro'])

export default function QualidadeRelatoriosDocumentos(){
 const[docs,setDocs]=useState<Doc[]>([])
 const[department,setDepartment]=useState('TODOS')
 const[type,setType]=useState('TODOS')
 const[status,setStatus]=useState('VIGENTES')
 const[includeForms,setIncludeForms]=useState(false)
 const[query,setQuery]=useState('')
 const[busy,setBusy]=useState(false)
 const[error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error||new Error('Empresa ERP não identificada.')
   const r=await supabase.from('erp_documentos_qualidade')
    .select('id,codigo,titulo,area,setor,tipo,revisao,status,data_emissao,data_revisao,validade_ate,proxima_revisao')
    .eq('empresa_id',company.data)
    .order('codigo')
   if(r.error)throw r.error
   setDocs((r.data??[]) as Doc[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar os documentos.')}
  finally{setBusy(false)}
 }

 useEffect(()=>{void load()},[])

 const departments=useMemo(()=>Array.from(new Set(docs.flatMap(d=>[d.area,d.setor]).filter((x):x is string=>Boolean(x?.trim())))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[docs])
 const types=useMemo(()=>Array.from(new Set(docs.map(d=>d.tipo).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[docs])

 const rows=useMemo(()=>docs.filter(d=>{
  const hay=[d.codigo,d.titulo,d.area,d.setor,d.tipo].filter(Boolean).join(' ').toLowerCase()
  const departmentOk=department==='TODOS'||d.area===department||d.setor===department
  const typeOk=type==='TODOS'||d.tipo===type
  const statusOk=status==='TODOS'||(status==='VIGENTES'?activeStatuses.has(d.status.toLowerCase()):status==='OBSOLETOS'?['obsoleta','substituida'].includes(d.status.toLowerCase()):!activeStatuses.has(d.status.toLowerCase()))
  const formOk=includeForms||!formTypes.has(d.tipo.toLowerCase())
  return departmentOk&&typeOk&&statusOk&&formOk&&(!query||hay.includes(query.toLowerCase()))
 }),[docs,department,type,status,includeForms,query])

 const printTitle=status==='VIGENTES'?'LISTA MESTRE — DOCUMENTOS VIGENTES':status==='OBSOLETOS'?'RELAÇÃO DE DOCUMENTOS OBSOLETOS':'ÍNDICE DE DOCUMENTOS CONTROLADOS'

 return <main className="min-h-screen bg-slate-100 text-slate-900">
  <style>{`
   @media print{
    body{background:#fff!important;color:#000!important}
    .quality-report-screen,.quality-report-screen *{color:#000!important}
    .quality-report-no-print{display:none!important}
    .quality-report-paper{box-shadow:none!important;border:0!important;padding:0!important}
    .quality-report-paper table{font-size:10pt!important}
    .quality-report-paper th,.quality-report-paper td{border:1px solid #000!important}
    .quality-report-paper thead{background:#fff!important;color:#000!important}
    .quality-report-paper{background:#fff!important}
   }
  `}</style>
  <header className="quality-report-no-print border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
   <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
    <div><p className="text-sm font-extrabold uppercase tracking-[0.18em] text-sky-300">QUALIDADE &gt; CONTROLE DE DOCUMENTOS &gt; RELATÓRIOS</p><h1 className="text-2xl font-extrabold">Relatórios e Índices do SGQ</h1></div>
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>void load()} disabled={busy} className="rounded-md border border-slate-500 px-4 py-3 text-base font-extrabold text-white"><RefreshCw size={18} className="mr-2 inline"/>{busy?'ATUALIZANDO…':'ATUALIZAR'}</button>
     <button type="button" onClick={()=>window.print()} className="rounded-md bg-sky-600 px-5 py-3 text-base font-extrabold text-white"><Printer size={18} className="mr-2 inline"/>IMPRIMIR ÍNDICE</button>
    </div>
   </div>
  </header>
  <div className="quality-report-screen mx-auto grid max-w-[1800px] grid-cols-1 gap-5 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
   <div className="quality-report-no-print"><QualitySidebar active="/qualidade/relatorios-documentos"/></div>
   <section className="space-y-5">
    {error&&<div className="quality-report-no-print rounded-md border border-red-200 bg-red-50 p-4 text-base font-bold text-red-800">{error}</div>}
    <section className="quality-report-no-print rounded-md border border-slate-200 bg-white p-5 shadow-sm">
     <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4"><Filter size={22}/><div><h2 className="text-xl font-extrabold">Filtros do controle documental</h2><p className="text-base text-slate-600">A qualidade pode emitir a lista por departamento sem misturar formulários com procedimentos, salvo quando solicitado.</p></div></div>
     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className={label}>DEPARTAMENTO<select className={input} value={department} onChange={e=>setDepartment(e.target.value)}><option>TODOS</option>{departments.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className={label}>TIPO<select className={input} value={type} onChange={e=>setType(e.target.value)}><option>TODOS</option>{types.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className={label}>SITUAÇÃO<select className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="VIGENTES">VIGENTES</option><option value="TODOS">TODOS</option><option value="OBSOLETOS">OBSOLETOS</option><option value="OUTROS">OUTROS</option></select></label>
      <label className={label}>PESQUISAR<input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, título ou área"/><Search size={18} className="relative -mt-[37px] ml-auto mr-3 text-slate-500"/></label>
     </div>
     <label className="mt-4 flex min-h-12 items-center gap-3 rounded-md border border-slate-300 bg-slate-50 px-4 text-base font-bold text-slate-800"><input type="checkbox" checked={includeForms} onChange={e=>setIncludeForms(e.target.checked)} className="h-5 w-5"/> Incluir formulários/registros no relatório</label>
    </section>

    <section className="quality-report-paper rounded-md border border-slate-200 bg-white p-6 shadow-sm">
     <div className="mb-5 border-b-2 border-slate-900 pb-4">
      <div className="flex items-start justify-between gap-5">
       <div><p className="text-sm font-extrabold tracking-widest">SYSNQRA ERP & SGQ INDUSTRIAL INDUSTRIAL • SISTEMA DE GESTÃO DA QUALIDADE</p><h2 className="mt-2 text-2xl font-black">{printTitle}</h2><p className="mt-1 text-base font-semibold">Departamento: {department} • Emissão: {new Date().toLocaleDateString('pt-BR')}</p></div>
       <div className="text-right"><p className="text-sm font-bold">TOTAL</p><p className="text-3xl font-black">{rows.length}</p></div>
      </div>
     </div>
     <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse text-base">
       <thead className="bg-slate-900 text-white"><tr><th className="h-[54px] border border-slate-700 p-3 text-left">Nº DOCUMENTO</th><th className="border border-slate-700 p-3 text-left">TÍTULO</th><th className="border border-slate-700 p-3 text-left">DEPARTAMENTO / SETOR</th><th className="border border-slate-700 p-3 text-left">TIPO</th><th className="border border-slate-700 p-3 text-left">REVISÃO</th><th className="border border-slate-700 p-3 text-left">DATA</th><th className="border border-slate-700 p-3 text-left">VALIDADE</th><th className="border border-slate-700 p-3 text-left">STATUS</th></tr></thead>
       <tbody>
        {rows.map(d=><tr key={d.id} className="border-b border-slate-200"><td className="h-[54px] border border-slate-200 p-3 font-black">{d.codigo}</td><td className="border border-slate-200 p-3 font-semibold">{d.titulo}</td><td className="border border-slate-200 p-3">{d.area||d.setor||'—'}{d.area&&d.setor&&d.area!==d.setor?' / '+d.setor:''}</td><td className="border border-slate-200 p-3">{d.tipo}</td><td className="border border-slate-200 p-3 font-black">Rev. {d.revisao}</td><td className="border border-slate-200 p-3">{d.data_revisao||d.data_emissao||'—'}</td><td className="border border-slate-200 p-3">{d.validade_ate||d.proxima_revisao||'—'}</td><td className="border border-slate-200 p-3 font-bold">{d.status}</td></tr>)}
        {!rows.length&&<tr><td colSpan={8} className="border border-slate-200 p-10 text-center font-bold text-slate-600"><FileText size={32} className="mx-auto mb-2"/>Nenhum documento corresponde aos filtros.</td></tr>}
       </tbody>
      </table>
     </div>
     <footer className="mt-6 grid grid-cols-2 gap-8 border-t border-slate-900 pt-6 text-sm font-bold"><div>Responsável pela emissão: ______________________________</div><div>Revisado / aprovado por: ______________________________</div></footer>
    </section>
   </section>
  </div>
 </main>
}
