import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Ishikawa6MData } from '../types/qualidade'

type RPNCRef = { id: string; numero_rpnc: string; descricao_nao_conformidade: string; status: string; criado_em: string }
type Row = RPNCRef & { ishikawa_data: Ishikawa6MData | null; cinco_porques: string[] | null; prazo_eficacia_dias: 30 | 60 | null; data_verificacao_eficacia: string | null; parecer_eficacia: string | null; eficacia_aprovada: boolean | null }
type Props = { companyId: string; record: RPNCRef; onClose: () => void; onSaved: () => void }
type CauseKey = keyof Ishikawa6MData
const groups: Array<{key: CauseKey; label: string}> = [
 {key:'Metodo',label:'Método'},{key:'Maquina',label:'Máquina'},{key:'Medida',label:'Medição'},
 {key:'MeioAmbiente',label:'Meio ambiente'},{key:'MaoDeObra',label:'Mão de obra'},{key:'Material',label:'Material'}
]
const emptyFishbone = (): Ishikawa6MData => ({Metodo:[],Maquina:[],Medida:[],MeioAmbiente:[],MaoDeObra:[],Material:[]})
const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#2D8DB8] disabled:bg-slate-100'
const labelClass = 'grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500'
const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50'
const message = (e: unknown) => e instanceof Error ? e.message : 'Operação não concluída. Consulte os logs do Supabase.'

export default function QualidadeRPNCTratamento({companyId,record,onClose,onSaved}: Props) {
 const [row,setRow] = useState<Row|null>(null)
 const [fishbone,setFishbone] = useState<Ishikawa6MData>(emptyFishbone)
 const [whys,setWhys] = useState<string[]>(['','','','',''])
 const [days,setDays] = useState<30|60>(30)
 const [parecer,setParecer] = useState('')
 const [eficaz,setEficaz] = useState(true)
 const [loading,setLoading] = useState(true)
 const [saving,setSaving] = useState(false)
 const [error,setError] = useState('')
 const [notice,setNotice] = useState('')
 const load = useCallback(async () => {
  setLoading(true); setError('')
  try {
   const auth = await supabase.auth.getUser()
   if (auth.error) throw auth.error
   if (!auth.data.user) throw new Error('Sessão expirada. Entre novamente.')
   const result = await supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,status,criado_em,ishikawa_data,cinco_porques,prazo_eficacia_dias,data_verificacao_eficacia,parecer_eficacia,eficacia_aprovada').eq('id',record.id).eq('empresa_id',companyId).single()
   if (result.error) throw result.error
   const current = result.data as Row
   setRow(current); setFishbone(current.ishikawa_data ?? emptyFishbone())
   setWhys(Array.from({length:5},(_,i)=>current.cinco_porques?.[i] ?? ''))
   setDays(current.prazo_eficacia_dias === 60 ? 60 : 30)
   setParecer(current.parecer_eficacia ?? ''); setEficaz(current.eficacia_aprovada ?? true)
  } catch(e) { setError(message(e)) } finally { setLoading(false) }
 },[companyId,record.id])
 useEffect(()=>{void load()},[load])
 const addCause = (key: CauseKey,value: string) => { const v=value.trim(); if(v) setFishbone(old=>({...old,[key]:[...old[key],v]})) }
 const saveAnalysis = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault(); setSaving(true); setError(''); setNotice('')
  try {
   const auth=await supabase.auth.getUser(); if(auth.error) throw auth.error; if(!auth.data.user) throw new Error('Sessão expirada.')
   if(whys.some(v=>v.trim().length<3)) throw new Error('Responda os cinco porquês com pelo menos 3 caracteres.')
   const result=await supabase.rpc('erp_sgq_salvar_analise_rpnc',{p_rpnc_id:record.id,p_ishikawa:fishbone,p_cinco_porques:whys.map(v=>v.trim()),p_prazo_dias:days})
   if(result.error) throw result.error
   setNotice('Investigação salva no Supabase.'); await load(); onSaved()
  } catch(e) {setError(message(e))} finally {setSaving(false)}
 }
 const stageTarget = row?.status === 'em análise' ? 'em tratamento' : row?.status === 'em tratamento' ? 'aguardando eficácia' : null
 const advanceStage = async () => {
  if (!stageTarget) return
  setSaving(true); setError(''); setNotice('')
  try {
   const auth = await supabase.auth.getUser()
   if (auth.error) throw auth.error
   if (!auth.data.user) throw new Error('Sessão expirada.')
   const result = await supabase.rpc('erp_sgq_transicionar_rpnc', { p_rpnc_id: record.id, p_status: stageTarget })
   if (result.error) throw result.error
   setNotice('Etapa da RPNC atualizada no workflow.')
   await load(); onSaved()
  } catch (e) { setError(message(e)) } finally { setSaving(false) }
 }
 const saveEfficacy = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault(); setSaving(true); setError(''); setNotice('')
  try {
   const auth=await supabase.auth.getUser(); if(auth.error) throw auth.error; if(!auth.data.user) throw new Error('Sessão expirada.')
   const result=await supabase.rpc('erp_sgq_registrar_eficacia_rpnc',{p_rpnc_id:record.id,p_parecer:parecer.trim(),p_eficaz:eficaz})
   if(result.error) throw result.error
   setNotice(eficaz?'Eficácia aprovada; RPNC encerrada.':'Eficácia não comprovada; RPNC retornou à análise.')
   await load(); onSaved()
  } catch(e) {setError(message(e))} finally {setSaving(false)}
 }
 const dueDate=row?.data_verificacao_eficacia ?? ''
 const canVerify=Boolean(dueDate && new Date().toISOString().slice(0,10)>=dueDate && row?.prazo_eficacia_dias && row?.status==='aguardando eficácia')
 return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-busy={loading||saving}>
  <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2"><div className="min-w-0 flex-1"><h2 className="text-xs font-extrabold">Investigação e eficácia · {record.numero_rpnc}</h2><p className="text-[11px] text-slate-500">{record.descricao_nao_conformidade}</p></div><button type="button" className={buttonClass} onClick={onClose}><X size={13}/> Fechar</button></header>
  {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={14}/>{error}</div>}
  {notice && <div role="status" className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={14}/>{notice}</div>}
  {loading||!row ? <p className="text-xs text-slate-500">Consultando Supabase…</p> : <>
   <form onSubmit={event=>void saveAnalysis(event)} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-extrabold">Tela B · Ishikawa 6M e 5 Porquês</h3><label className={labelClass}>Carência de eficácia<select className={inputClass} value={days} onChange={event=>setDays(Number(event.target.value) as 30|60)}><option value={30}>30 dias</option><option value={60}>60 dias</option></select></label></div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map(group=><CauseEditor key={group.key} label={group.label} values={fishbone[group.key]} disabled={saving} onAdd={value=>addCause(group.key,value)} onRemove={index=>setFishbone(old=>({...old,[group.key]:old[group.key].filter((_,i)=>i!==index)}))}/>)}</div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{whys.map((why,index)=><label key={index} className={labelClass}>Por quê {index+1}{index===4?' · causa raiz':''}<textarea className="min-h-20 w-full rounded-lg border border-slate-200 p-2 text-xs font-normal normal-case text-slate-800" value={why} onChange={event=>setWhys(old=>old.map((v,i)=>i===index?event.target.value:v))} minLength={3} required disabled={saving} placeholder={index===0?'Por que o desvio ocorreu?':'Por que a resposta anterior aconteceu?'}/></label>)}</div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><p className="text-[10px] text-slate-500">Cinco respostas obrigatórias; o PostgreSQL valida empresa, permissão, status e JSONB.</p><div className="flex flex-wrap gap-2">{stageTarget && <button type="button" onClick={() => void advanceStage()} disabled={saving} className={buttonClass}>Avançar para {stageTarget}</button>}<button type="submit" disabled={saving||whys.some(v=>v.trim().length<3)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#123B50] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Save size={14}/>Salvar investigação</button></div></footer>
   </form>
   <form onSubmit={event=>void saveEfficacy(event)} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xs font-extrabold">Tela C · Verificação de eficácia</h3><p className="text-[11px] text-slate-500">Abertura: {new Date(row.criado_em).toLocaleDateString('pt-BR')} · Data mínima: {dueDate?new Date(dueDate+'T12:00:00').toLocaleDateString('pt-BR'):'salve a investigação'}</p></div><span className={'rounded-md px-2 py-1 text-[10px] font-bold '+(canVerify?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800')}>{canVerify?'Prazo cumprido':'Em carência'}</span></div>
    <label className={labelClass}>Parecer de eficácia<textarea className="min-h-20 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal normal-case text-slate-800 disabled:bg-slate-100" value={parecer} onChange={event=>setParecer(event.target.value)} minLength={10} required disabled={saving||!canVerify||row.status==='encerrada'} placeholder="Registre evidências objetivas do resultado."/></label>
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={eficaz} onChange={event=>setEficaz(event.target.checked)} disabled={saving||!canVerify||row.status==='encerrada'}/> Eficácia comprovada</label>
    {row.eficacia_aprovada!==null && <p className="text-xs font-bold">Resultado registrado: {row.eficacia_aprovada?'Eficaz':'Ineficaz'}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-slate-500">O banco valida novamente a carência; o relógio do navegador não autoriza a operação.</p><button type="submit" disabled={saving||!canVerify||row.status==='encerrada'||parecer.trim().length<10} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#123B50] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Save size={14}/>Registrar eficácia</button></footer>
   </form>
  </>}
 </section>
}
function CauseEditor({label,values,disabled,onAdd,onRemove}:{label:string;values:string[];disabled:boolean;onAdd:(value:string)=>void;onRemove:(index:number)=>void}) {
 const [draft,setDraft]=useState('')
 return <section className="rounded-lg border border-slate-200 p-2.5"><h4 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">{label}</h4><div className="flex gap-1"><input className={inputClass} value={draft} onChange={event=>setDraft(event.target.value)} disabled={disabled} placeholder="Causa potencial"/><button type="button" className={buttonClass} disabled={disabled||draft.trim().length<2} onClick={()=>{onAdd(draft);setDraft('')}}>Adicionar</button></div><ul className="mt-2 space-y-1">{values.map((value,index)=><li key={index} className="flex items-start gap-2 rounded bg-slate-50 p-2 text-xs"><span className="min-w-0 flex-1">{value}</span><button type="button" className="text-slate-500 hover:text-rose-700" aria-label="Remover causa" onClick={()=>onRemove(index)} disabled={disabled}>×</button></li>)}</ul></section>
}
