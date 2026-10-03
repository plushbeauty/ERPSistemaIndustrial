import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Rule={id:string;grupo_item:string;dias_sem_giro:number;percentual_depreciacao:number;ativo:boolean}
const input='h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] leading-none'
const label='mb-0.5 text-[10px] font-bold uppercase text-gray-500'
const button='inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold'

export default function RegrasDepreciacao(){
 const navigate=useNavigate();const [rules,setRules]=useState<Rule[]>([]);const [grupo,setGrupo]=useState('');const [dias,setDias]=useState('180');const [desconto,setDesconto]=useState('20');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
 const load=async()=>{const r=await supabase.from('erp_depreciacao_regras').select('id,grupo_item,dias_sem_giro,percentual_depreciacao,ativo').eq('ativo',true).order('dias_sem_giro');if(r.error)throw r.error;setRules((r.data??[]) as Rule[])}
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar regras.'))},[])
 const save=async()=>{const d=Number(dias),p=Number(desconto);if(!grupo.trim()||!Number.isFinite(d)||d<0||!Number.isFinite(p)||p<0||p>100){setError('Informe grupo, dias e percentual válidos.');return}setBusy(true);setError('');try{const r=await supabase.rpc('erp_depreciacao_salvar_regra',{p_grupo_item:grupo.trim(),p_dias_sem_giro:d,p_percentual_depreciacao:p});if(r.error)throw r.error;setGrupo('');await load()}catch(e){setError(e instanceof Error?e.message:'Falha ao gravar regra.')}finally{setBusy(false)}}
 const remove=async(id:string)=>{setBusy(true);try{const r=await supabase.rpc('erp_depreciacao_desativar_regra',{p_regra_id:id});if(r.error)throw r.error;await load()}catch(e){setError(e instanceof Error?e.message:'Falha ao desativar regra.')}finally{setBusy(false)}}
 return <main className="min-h-screen bg-slate-50 p-3 text-gray-800"><div className="mx-auto max-w-[1600px] space-y-2">
  <div className="flex items-center gap-2"><button type="button" onClick={()=>navigate('/estoque')} className={button+' border border-gray-200 bg-white text-gray-600'}><ArrowLeft size={12}/>Voltar</button><h1 className="text-[13px] font-bold text-gray-700">REGRAS DE DEPRECIAÇÃO DE ESTOQUE</h1></div>
  {error&&<div className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">{error}</div>}
  <section className="rounded-md border border-gray-200 bg-white p-2 shadow-sm"><div className="flex items-end gap-2">
   <div className="w-[160px] shrink-0"><label className={label}>Grupo Produto</label><input id="cbGrupoItem" className={input+' w-[160px]'} value={grupo} onChange={e=>setGrupo(e.target.value)} placeholder="Grupo de matérias-primas"/></div>
   <div className="w-[80px] shrink-0"><label className={label}>Dias sem Giro</label><input id="edDias" className={input+' w-[80px] text-center'} type="number" min="0" value={dias} onChange={e=>setDias(e.target.value)}/></div>
   <div className="w-[80px] shrink-0"><label className={label}>% Depreciação</label><input id="edDesconto" className={input+' w-[80px] text-center'} type="number" min="0" max="100" step="0.01" value={desconto} onChange={e=>setDesconto(e.target.value)}/></div>
   <button id="btnSalvar" type="button" disabled={busy} onClick={()=>void save()} className={button+' w-[95px] bg-blue-600 text-white hover:bg-blue-700'}><Save size={12}/>Gravar Regra</button>
  </div></section>
  <section id="gridDepreciacoes" className="h-[200px] overflow-auto rounded-md border border-gray-200 bg-white shadow-sm"><table className="w-full border-collapse text-[10px]"><thead className="sticky top-0 bg-slate-700 text-white"><tr className="h-7"><th className="px-2 text-left font-normal">Grupo Produto</th><th className="w-[120px] px-2 text-right font-normal">Dias sem Giro</th><th className="w-[130px] px-2 text-right font-normal">% Depreciação</th><th className="w-[70px] px-2 text-center font-normal">Ações</th></tr></thead><tbody>{rules.map(r=><tr key={r.id} className="h-[26px] border-b border-gray-100 even:bg-slate-50"><td className="px-2">{r.grupo_item}</td><td className="px-2 text-right">{r.dias_sem_giro}</td><td className="px-2 text-right">{Number(r.percentual_depreciacao).toFixed(2)}%</td><td className="px-2 text-center"><button type="button" disabled={busy} onClick={()=>void remove(r.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50"><Trash2 size={11}/></button></td></tr>)}{!rules.length&&<tr><td colSpan={4} className="h-16 text-center text-gray-400">Nenhuma regra vigente.</td></tr>}</tbody></table></section>
 </div></main>
}
