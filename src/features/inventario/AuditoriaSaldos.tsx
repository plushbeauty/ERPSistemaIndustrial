import { ArrowLeft, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Log={id:string;ajustado_em:string;operador:string;sku:string;saldo_antigo:number;saldo_novo:number;ajuste_financeiro:number;motivo:string;justificativa:string}
const input='h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] leading-none'
const label='mb-0.5 text-[10px] font-bold uppercase text-gray-500'
const button='inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold'

export default function AuditoriaSaldos(){
 const navigate=useNavigate();const [date,setDate]=useState('');const [motivo,setMotivo]=useState('');const [sku,setSku]=useState('');const [rows,setRows]=useState<Log[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');try{let q=supabase.from('erp_inventario_auditoria_saldos').select('id,ajustado_em,operador,sku,saldo_antigo,saldo_novo,ajuste_financeiro,motivo,justificativa').order('ajustado_em',{ascending:false}).limit(500);if(date)q=q.gte('ajustado_em',date+'T00:00:00').lt('ajustado_em',date+'T23:59:59');if(motivo)q=q.eq('motivo',motivo);if(sku)q=q.ilike('sku','%'+sku+'%');const r=await q;if(r.error)throw r.error;setRows((r.data??[]) as Log[])}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar auditoria.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 return <main className="min-h-screen bg-slate-50 p-3 text-gray-800"><div className="mx-auto max-w-[1600px] space-y-2">
  <div className="flex items-center gap-2"><button type="button" onClick={()=>navigate('/estoque')} className={button+' border border-gray-200 bg-white text-gray-600'}><ArrowLeft size={12}/>Voltar</button><h1 className="text-[13px] font-bold text-gray-700">AUDITORIA DE SALDOS E INVENTÁRIO FÍSICO</h1></div>
  {error&&<div className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">{error}</div>}
  <section className="rounded-md border border-gray-200 bg-white p-2 shadow-sm"><div className="flex items-end gap-2">
   <div className="w-[110px] shrink-0"><label className={label}>Data Ajuste</label><input id="edDataLog" className={input+' w-[110px]'} type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
   <div className="w-[160px] shrink-0"><label className={label}>Motivo Divergência</label><select id="cbMotivoLog" className={input+' w-[160px]'} value={motivo} onChange={e=>setMotivo(e.target.value)}><option value="">Todos</option><option>Quebra de Estoque</option><option>Sobra de Inventário</option><option>Ajuste Técnico</option></select></div>
   <div className="w-[120px] shrink-0"><label className={label}>Buscar SKU</label><input id="edSkuLog" className={input+' w-[120px]'} value={sku} onChange={e=>setSku(e.target.value)}/></div>
   <button id="btnFiltrar" type="button" onClick={()=>void load()} className={button+' w-[95px] bg-blue-600 text-white'}><Search size={12}/>Filtrar</button>
  </div></section>
  <section id="gridLogValores" className="scroll-fade-x h-[250px] overflow-auto rounded-md border border-gray-200 bg-white shadow-sm"><table className="w-full min-w-[850px] border-collapse text-[10px]"><thead className="sticky top-0 bg-slate-700 text-white"><tr className="h-7"><th className="w-[125px] px-2 text-left font-normal">Data</th><th className="w-[150px] px-2 text-left font-normal">Operador</th><th className="w-[110px] px-2 text-left font-normal">SKU</th><th className="w-[100px] px-2 text-right font-normal">Saldo Antigo</th><th className="w-[100px] px-2 text-right font-normal">Saldo Novo</th><th className="w-[130px] px-2 text-right font-normal">Ajuste Financeiro R$</th><th className="px-2 text-left font-normal">Justificativa</th></tr></thead><tbody>{loading?<tr><td colSpan={7} className="h-16 text-center text-gray-400">Consultando logs…</td></tr>:rows.map(r=><tr key={r.id} className="h-[26px] border-b border-gray-100 even:bg-slate-50"><td className="px-2 whitespace-nowrap">{new Date(r.ajustado_em).toLocaleString('pt-BR')}</td><td className="px-2">{r.operador}</td><td className="px-2 font-semibold">{r.sku}</td><td className="px-2 text-right">{r.saldo_antigo}</td><td className="px-2 text-right">{r.saldo_novo}</td><td className="px-2 text-right">{Number(r.ajuste_financeiro).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2">{r.justificativa}</td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={7} className="h-16 text-center text-gray-400">Nenhum ajuste registrado.</td></tr>}</tbody></table></section>
 </div></main>
}
