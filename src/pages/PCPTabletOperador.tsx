import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, CloudOff, LogOut, RefreshCw, ShieldAlert, Wifi } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type OP = { id: string; numero_op: number; produto_id: string | null; maquina_id: string | null; quantidade_planejada: number }
type Receita = { processo_id: string; ferramenta_id: string | null; maquina_id: string | null }
type Pending = { id: string; createdAt: string; opId: string; found: number; defects: number; reason: string; instrument: string }
type LoadState = 'loading' | 'success' | 'empty' | 'error'
const QUEUE_KEY = 'erp:pcp:tablet:pending-apontamentos:v1'
const input = 'min-h-[54px] w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 outline-none focus:border-sky-600 disabled:bg-slate-100'
const button = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50'
function isPending(value: unknown): value is Pending {
 if (typeof value !== 'object' || value === null) return false
 const item = value as Record<string, unknown>
 return typeof item.id === 'string' && typeof item.createdAt === 'string' && typeof item.opId === 'string' &&
  typeof item.found === 'number' && typeof item.defects === 'number' && typeof item.reason === 'string' && typeof item.instrument === 'string'
}
function readQueue(): Pending[] {
 try { const value: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); return Array.isArray(value) ? value.filter(isPending) : [] } catch { return [] }
}
function writeQueue(value: Pending[]): void { localStorage.setItem(QUEUE_KEY, JSON.stringify(value)) }
function networkFailure(error: unknown): boolean {
 if (!navigator.onLine || error instanceof TypeError) return true
 if (typeof error !== 'object' || error === null || !('code' in error)) return false
 const code = String(error.code)
 return code.startsWith('08') || ['PGRST000','PGRST001','PGRST003'].includes(code)
}
function errorText(error: unknown): string { return error instanceof Error ? error.message : 'Falha técnica. Consulte os logs do Supabase.' }

export default function PCPTabletOperador() {
 const [ops,setOps] = useState<OP[]>([])
 const [opId,setOpId] = useState('')
 const [found,setFound] = useState(0)
 const [defects,setDefects] = useState(0)
 const [reason,setReason] = useState('')
 const [instrument,setInstrument] = useState('')
 const [instrumentValid,setInstrumentValid] = useState(false)
 const [blocked,setBlocked] = useState('')
 const [notice,setNotice] = useState('')
 const [error,setError] = useState('')
 const [busy,setBusy] = useState(false)
 const [online,setOnline] = useState(navigator.onLine)
 const [pendingCount,setPendingCount] = useState(()=>readQueue().length)
 const [loadState,setLoadState] = useState<LoadState>('loading')
 const [loadError,setLoadError] = useState('')

 const load = useCallback(async () => {
  setLoadState('loading'); setLoadError('')
  try {
   const auth=await supabase.auth.getUser()
   if(auth.error) throw auth.error
   if(!auth.data.user) throw new Error('Sessão expirada. Entre novamente no SYSNQRA.')
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error) throw tenant.error
   if(typeof tenant.data!=='string'||!tenant.data) throw new Error('Empresa do operador não identificada.')
   const result=await supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,quantidade_planejada').eq('empresa_id',tenant.data).in('status',['pendente','EM_EXECUCAO','EM_PRODUCAO','em_execucao']).order('numero_op',{ascending:false}).limit(200)
   if(result.error) throw result.error
   const rows=(result.data??[]) as OP[]
   setOps(rows); setLoadState(rows.length?'success':'empty')
  } catch(e) {setLoadState('error');setLoadError(errorText(e))}
 },[])

 const resolvePayload = useCallback(async (item: Pending) => {
  const auth=await supabase.auth.getUser()
  if(auth.error) throw auth.error
  if(!auth.data.user) throw new Error('Sessão do operador não encontrada.')
  const tenant=await supabase.rpc('erp_current_empresa_id')
  if(tenant.error) throw tenant.error
  if(typeof tenant.data!=='string'||!tenant.data) throw new Error('Empresa do operador não identificada.')
  const empresaId=tenant.data
  const selected=ops.find(op=>op.id===item.opId)
  let op=selected
  if(!op) {
   const result=await supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,quantidade_planejada').eq('empresa_id',empresaId).eq('id',item.opId).maybeSingle()
   if(result.error) throw result.error
   op=(result.data??undefined) as OP|undefined
  }
  if(!op) throw new Error('A OP deste apontamento não está mais disponível.')
  if(item.found<=0||item.defects<0||item.defects>item.found) throw new Error('Quantidade encontrada/refugo inválida.')
  if(item.defects>0&&!item.reason.trim()) throw new Error('Motivo de refugo obrigatório.')
  if(!item.instrument.trim()) throw new Error('TAG do instrumento obrigatória.')
  const recipeResult=await supabase.from('erp_receitas_processos').select('processo_id,ferramenta_id,maquina_id').eq('empresa_id',empresaId).eq('produto_id',op.produto_id??'').eq('status','APROVADA').order('versao',{ascending:false}).limit(1).maybeSingle()
  if(recipeResult.error) throw recipeResult.error
  const recipe=(recipeResult.data??null) as Receita|null
  if(!recipe) throw new Error('Não existe receita de processo APROVADA para o produto desta OP.')
  const meter=await supabase.from('erp_equipamentos_medicao').select('status,proxima_calibracao').eq('empresa_id',empresaId).eq('codigo',item.instrument).maybeSingle()
  if(meter.error) throw meter.error
  const expired=Boolean(meter.data?.proxima_calibracao&&new Date(meter.data.proxima_calibracao+'T23:59:59')<new Date())
  if(!meter.data||String(meter.data.status??'').trim().toUpperCase()!=='APROVADO'||expired) throw new Error('TAG bloqueada: instrumento vencido ou não aprovado no banco.')
  return {
   empresa_id:empresaId,processo_id:recipe.processo_id,ordem_producao_id:op.id,
   maquina_id:op.maquina_id??recipe.maquina_id,ferramenta_id:recipe.ferramenta_id,
   inicio_em:new Date(item.createdAt).toISOString(),fim_em:new Date().toISOString(),
   quantidade_planejada:op.quantidade_planejada,quantidade_boa:item.found-item.defects,
   quantidade_refugada:item.defects,quantidade_reprocessada:0,
   // O esquema não possui vínculo verificado entre erp_usuarios e erp_funcionarios.
   // Mantém autoria real em auth.users e não grava UUID incompatível em operador_id.
   operador_id:null,criado_por:auth.data.user.id,client_transaction_id:item.id,
   parametros_reais:{instrumento:item.instrument,motivo_refugo:item.reason,client_transaction_id:item.id}
  }
 },[ops])

 const syncQueue=useCallback(async()=>{
  if(!navigator.onLine||busy) return
  const queue=readQueue()
  if(!queue.length){setPendingCount(0);return}
  setBusy(true);setNotice('Sincronizando apontamentos pendentes…');setError('')
  try {
   for(const item of queue) {
    const payload=await resolvePayload(item)
    const result=await supabase.from('erp_apontamentos_processo').insert(payload)
    if(result.error&&result.error.code!=='23505') throw result.error
    writeQueue(readQueue().filter(entry=>entry.id!==item.id))
   }
   setPendingCount(readQueue().length);setNotice('Apontamentos pendentes sincronizados com o Supabase.')
  } catch(e) {setPendingCount(readQueue().length);setError(networkFailure(e)?'Conexão indisponível. O apontamento permanece na fila local.':errorText(e))}
  finally {setBusy(false)}
 },[busy,resolvePayload])

 useEffect(()=>{void load()},[load])
 useEffect(()=>{
  const onlineHandler=()=>{setOnline(true);void syncQueue()}
  const offlineHandler=()=>{setOnline(false);setNotice('OFFLINE: novos apontamentos serão mantidos na fila local.')}
  window.addEventListener('online',onlineHandler);window.addEventListener('offline',offlineHandler)
  return ()=>{window.removeEventListener('online',onlineHandler);window.removeEventListener('offline',offlineHandler)}
 },[syncQueue])
 useEffect(()=>{if(online) void syncQueue()},[online,syncQueue])

 const op=ops.find(item=>item.id===opId)
 const good=Math.max(0,found-defects)
 const quality=found>0?(good/found)*100:0
 const checkInstrument=async()=>{
  const code=instrument.trim().toUpperCase();setInstrument(code);setInstrumentValid(false);setBlocked('')
  if(!code){setBlocked('TAG do instrumento obrigatória.');return}
  try {
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error) throw tenant.error
   if(typeof tenant.data!=='string'||!tenant.data) throw new Error('Empresa da sessão não identificada.')
   const result=await supabase.from('erp_equipamentos_medicao').select('status,proxima_calibracao').eq('empresa_id',tenant.data).eq('codigo',code).maybeSingle()
   if(result.error) throw result.error
   const expired=Boolean(result.data?.proxima_calibracao&&new Date(result.data.proxima_calibracao+'T23:59:59')<new Date())
   const valid=Boolean(result.data)&&String(result.data?.status??'').trim().toUpperCase()==='APROVADO'&&!expired
   setInstrumentValid(valid);if(!valid)setBlocked('TAG bloqueada: calibração vencida ou instrumento não aprovado.')
  } catch(e){setBlocked(errorText(e))}
 }
 const save=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setNotice('')
  if(busy||!op||found<=0||defects>found||(defects>0&&!reason.trim())||!instrumentValid){setError('Complete a OP, quantidade, motivo de refugo e TAG calibrada antes de gravar.');return}
  const item:Pending={id:crypto.randomUUID(),createdAt:new Date().toISOString(),opId,found,defects,reason:reason.trim(),instrument:instrument.trim().toUpperCase()}
  if(!navigator.onLine){writeQueue([...readQueue(),item]);setPendingCount(readQueue().length);setNotice('OFFLINE: apontamento protegido na fila local.');setFound(0);setDefects(0);setReason('');return}
  setBusy(true)
  try {
   const payload=await resolvePayload(item)
   const result=await supabase.from('erp_apontamentos_processo').insert(payload)
   if(result.error&&result.error.code!=='23505') throw result.error
   setNotice(result.error?.code==='23505'?'Apontamento já registrado; duplicidade bloqueada.':'Apontamento gravado no Supabase.')
   setFound(0);setDefects(0);setReason('')
  } catch(e) {
   if(networkFailure(e)){writeQueue([...readQueue(),item]);setPendingCount(readQueue().length);setNotice('Conexão instável: apontamento preservado na fila local.');setFound(0);setDefects(0);setReason('')}
   else setError(errorText(e))
  } finally {setBusy(false)}
 }
 return <main className="space-y-4 p-2 text-slate-800">
  <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
   <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#2D8DB8]">Chão de fábrica · terminal touch</p><h1 className="text-lg font-extrabold text-[#123B50]">Terminal do Operador</h1><p className="text-[11px] text-slate-500">Apontamento real, validação de instrumento e sincronização idempotente.</p></div>
   <span className={'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold '+(online?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}>{online?<Wifi size={14}/>:<CloudOff size={14}/>} {online?'ONLINE':'OFFLINE'} · {pendingCount} pendente(s)</span>
   <button type="button" className={button+' border border-slate-200 bg-white'} onClick={()=>void load()} disabled={busy||loadState==='loading'}><RefreshCw size={14}/> Atualizar OPs</button>
   <button type="button" className={button+' bg-slate-800 text-white'} onClick={()=>void supabase.auth.signOut().then(()=>window.location.replace('/login'))} disabled={busy}><LogOut size={14}/> Sair</button>
  </header>
  {error&&<div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={15}/>{error}</div>}
  {notice&&<div role="status" className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15}/>{notice}</div>}
  {blocked&&<div role="alert" className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><ShieldAlert size={15}/>{blocked}</div>}
  {loadState==='loading'&&<p className="rounded-lg border border-slate-200 bg-white p-4 text-xs">Carregando ordens reais do Supabase…</p>}
  {loadState==='error'&&<p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{loadError}</p>}
  {loadState==='empty'&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">Nenhuma OP disponível nesta empresa.</p>}
  <form onSubmit={event=>void save(event)} className="space-y-4">
   <section className="rounded-xl border border-slate-200 bg-white p-3"><label className="grid gap-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Ordem de produção<select className={input} value={opId} onChange={event=>setOpId(event.target.value)} disabled={busy||loadState!=='success'} required><option value="">Selecione uma OP real</option>{ops.map(item=><option key={item.id} value={item.id}>OP-{item.numero_op} · planejado {item.quantidade_planejada}</option>)}</select></label></section>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-3"><h2 className="text-xs font-extrabold">Produção e refugo</h2>
     <Counter label="Peças encontradas" value={found} onChange={setFound} disabled={busy}/>
     <Counter label="Refugo" value={defects} onChange={value=>setDefects(Math.min(found,value))} max={found} disabled={busy}/>
     {defects>0&&<label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">Motivo do refugo · obrigatório<input className={input} value={reason} onChange={event=>setReason(event.target.value)} required disabled={busy}/></label>}
     <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-500">TAG do paquímetro / instrumento<input className={input} value={instrument} onChange={event=>{setInstrument(event.target.value.toUpperCase());setInstrumentValid(false);setBlocked('')}} onBlur={()=>void checkInstrument()} required disabled={busy} placeholder="BIPAR / DIGITAR TAG"/></label>
     <p className={'text-xs font-bold '+(instrumentValid?'text-emerald-700':'text-amber-700')}>{instrumentValid?'Calibração válida · apontamento liberado':'TAG ainda não validada no banco'}</p>
    </section>
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"><h2 className="text-xs font-extrabold">Conferência em tempo real</h2><div className="grid grid-cols-2 gap-3">{[['Planejada',op?.quantidade_planejada??0],['Encontradas',found],['Peças boas',good],['Refugo',defects],['Qualidade',quality.toFixed(1)+'%']].map(([label,value])=><article key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase text-slate-500">{label}</span><strong className="mt-1 block text-2xl tabular-nums text-slate-900">{value}</strong></article>)}</div><p className="text-[10px] text-slate-500">O apontamento só é gravado depois de validar a receita aprovada e a calibração vigente do instrumento.</p></section>
   </div>
   <footer className="flex justify-end"><button type="submit" className={button+' bg-[#123B50] text-white'} disabled={busy||!op||found<=0||defects>found||(defects>0&&!reason.trim())||!instrumentValid}> {busy?'Gravando…':'Registrar apontamento real'}</button></footer>
  </form>
 </main>
}
function Counter({label,value,onChange,disabled,max=Number.POSITIVE_INFINITY}:{label:string;value:number;onChange:(value:number)=>void;disabled:boolean;max?:number}) {
 return <div><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</h3><div className="grid grid-cols-5 gap-2">{[-10,-1].map(delta=><button key={delta} type="button" disabled={disabled} onClick={()=>onChange(Math.max(0,Math.min(max,value+delta)))} className="min-h-[48px] rounded-lg bg-slate-100 text-sm font-extrabold disabled:opacity-40">{delta}</button>)}<strong className="grid min-h-[48px] place-items-center rounded-lg border border-slate-200 bg-slate-50 text-2xl tabular-nums">{value}</strong>{[1,10].map(delta=><button key={delta} type="button" disabled={disabled} onClick={()=>onChange(Math.max(0,Math.min(max,value+delta)))} className="min-h-[48px] rounded-lg bg-[#1D5FD1] text-sm font-extrabold text-white disabled:opacity-40">+{delta}</button>)}</div></div>
}
