import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3, Printer, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Movement={id:string;tipo:string;descricao:string;valor:number;status:string}
type ChartRow={categoria:string;valor:number}

export default function FinanceiroGraficoDesvios():JSX.Element{
 const [rows,setRows]=useState<ChartRow[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 async function load(){
  setBusy(true);setError('')
  try{
   const result=await supabase.from('erp_financeiro_lancamentos').select('id,tipo,descricao,valor,status').order('data_vencimento',{ascending:false}).limit(1000)
   if(result.error)throw result.error
   const movements=(result.data??[]) as Movement[]
   const grouped=new Map<string,number>()
   for(const row of movements){
    const key=row.tipo?.trim()||'OUTROS'
    grouped.set(key,(grouped.get(key)??0)+Number(row.valor??0))
   }
   setRows([...grouped.entries()].map(([categoria,valor])=>({categoria,valor})).sort((a,b)=>b.valor-a.valor))
  }catch(e){setRows([]);setError(e instanceof Error?e.message:'Não foi possível carregar os lançamentos financeiros reais.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
  <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4 print:hidden">
   <div><p className="text-sm font-black text-slate-600">FINANCEIRO &gt; ANÁLISE REAL</p><h1 className="text-2xl font-black">Movimentações Financeiras Reais</h1><p className="mt-1 text-sm text-slate-600">O gráfico usa exclusivamente lançamentos persistidos no ERP. Nenhum custo real é igualado artificialmente ao custo padrão.</p></div>
   <div className="ml-auto flex gap-2"><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex min-h-[54px] items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-bold"><RefreshCw size={16} className={busy?'animate-spin':''}/> ATUALIZAR</button><button type="button" onClick={()=>window.print()} className="inline-flex min-h-[54px] items-center gap-2 rounded-md bg-slate-900 px-4 font-bold text-white"><Printer size={16}/> IMPRIMIR</button></div>
  </header>
  {error&&<div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4 font-bold text-rose-900" role="alert">{error}</div>}
  <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
   <div className="mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-sky-700"/><h2 className="text-lg font-black">Valor real por tipo de lançamento</h2></div>
   {rows.length===0&&!busy?<p className="rounded-md bg-slate-50 p-6 font-semibold text-slate-600">Nenhum lançamento financeiro disponível para a empresa atual.</p>:<div className="h-[430px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><XAxis dataKey="categoria" stroke="#0f172a"/><YAxis stroke="#0f172a"/><Tooltip formatter={(value)=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/><Legend/><Bar dataKey="valor" fill="#2563eb" name="Valor real"/></BarChart></ResponsiveContainer></div>}
  </section>
 </main>
}
