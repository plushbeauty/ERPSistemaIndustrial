import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Printer, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type CostRow={codigo_produto:string;custo_padrao_total:number;custo_real_total:number;data_apuracao:string}
type ChartRow={produto:string;padrao:number;real:number;desvio:number}

export default function FinanceiroGraficoDesvios():JSX.Element{
 const [rows,setRows]=useState<CostRow[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 async function load(){ 
  setBusy(true);setError('')
  try{
   const result=await supabase.from('erp_financeiro_apuracao_custos').select('codigo_produto,custo_padrao_total,custo_real_total,data_apuracao').order('data_apuracao',{ascending:false}).limit(500)
   if(result.error)throw result.error
   setRows((result.data??[]) as CostRow[])
  }catch(e){setRows([]);setError(e instanceof Error?e.message:'Não foi possível carregar a apuração real de custos.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const data=useMemo<ChartRow[]>(()=>rows.map(r=>{const padrao=Number(r.custo_padrao_total)||0;const real=Number(r.custo_real_total)||0;return{produto:r.codigo_produto,padrao,real,desvio:real-padrao}}),[rows])
 const critical=data.some(x=>x.padrao>0&&x.real>x.padrao*1.2)
 return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
  <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4 print:hidden">
   <div><p className="text-sm font-black text-slate-600">FINANCEIRO &gt; CUSTOS INDUSTRIAIS</p><h1 className="text-2xl font-black">Custo Padrão × Custo Real Absorvido</h1><p className="mt-1 text-sm text-slate-600">Somente apurações persistidas no banco. Ausência de apuração não é preenchida por estimativa.</p></div>
   <div className="ml-auto flex gap-2"><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex min-h-[54px] items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-bold"><RefreshCw size={16} className={busy?'animate-spin':''}/> ATUALIZAR</button><button type="button" onClick={()=>window.print()} className="inline-flex min-h-[54px] items-center gap-2 rounded-md bg-slate-900 px-4 font-bold text-white"><Printer size={16}/> IMPRIMIR</button></div>
  </header>
  {critical&&<div className="mt-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-4 font-black text-rose-900"><AlertTriangle size={19}/> Desvio superior a 20% identificado em apuração real.</div>}
  {error&&<div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-900" role="alert">{error}</div>}
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
   <div className="mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-sky-700"/><h2 className="text-lg font-black">Apuração por produto</h2></div>
   {rows.length===0&&!busy?<p className="rounded-md bg-slate-50 p-6 font-semibold text-slate-600">Nenhuma apuração de custo real disponível para a empresa atual.</p>:<div className="h-[430px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="produto" stroke="#0f172a"/><YAxis stroke="#0f172a"/><Tooltip formatter={(value)=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/><Legend/><Bar dataKey="padrao" fill="#2563eb" name="Custo padrão orçado"/><Bar dataKey="real" fill="#dc2626" name="Custo real absorvido"/></BarChart></ResponsiveContainer></div>}
  </section>
 </main>
}
