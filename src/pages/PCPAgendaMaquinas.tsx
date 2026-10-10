import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Factory, RefreshCw, Plus, Play, ArrowUpDown, X, Printer, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Machine = { id:string; codigo:string; nome:string; status:string|null; ativo:boolean }
type Mold = { id:string; codigo:string; nome:string; status:string; ativo:boolean }
type Order = { id:string; numero_op:string|number; produto_id:string|null; maquina_id:string|null; status:string; ordem_sequencia:number|null }
type Slot = { id:string; maquina_id:string; ordem_producao_id:string; molde_id:string|null; quantidade_programada:number; lote_producao:string|null; data_hora_inicio:string; data_hora_fim:string; status:string }
type Calendar = { dias_trabalho:string[]; horario_inicio_jornada:string; horario_fim_jornada:string }
type Cell = { machine:Machine; date:Date }
const input='h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] outline-none focus:border-sky-600'
const label='mb-[2px] block text-[9px] font-bold uppercase tracking-wide text-slate-600'
const btn='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase hover:bg-slate-50 disabled:opacity-40'
const primary='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-sky-700 bg-[#2D8DB8] px-2 text-[9px] font-bold uppercase text-white hover:bg-sky-800 disabled:opacity-40'
const weekdays=[{key:'seg',label:'SEG'},{key:'ter',label:'TER'},{key:'qua',label:'QUA'},{key:'qui',label:'QUI'},{key:'sex',label:'SEX'},{key:'sab',label:'SÁB'},{key:'dom',label:'DOM'}]
const fmt=(value:string)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))
const localValue=(d:Date)=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,16)}
const monday=(d:Date)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const dayKey=(d:Date)=>weekdays[(d.getDay()+6)%7].key
const messageOf=(e:unknown)=>e instanceof Error?e.message:'Falha ao carregar a agenda de máquinas.'

export default function PCPAgendaMaquinas(){
 const [company,setCompany]=useState('')
 const [machines,setMachines]=useState<Machine[]>([])
 const [molds,setMolds]=useState<Mold[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [slots,setSlots]=useState<Slot[]>([])
 const [calendar,setCalendar]=useState<Calendar>({dias_trabalho:['seg','ter','qua','qui','sex'],horario_inicio_jornada:'06:00:00',horario_fim_jornada:'22:00:00'})
 const [weekStart,setWeekStart]=useState(()=>monday(new Date()))
 const [selected,setSelected]=useState<Cell|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [form,setForm]=useState({ordem_producao_id:'',molde_id:'',quantidade_programada:'1',lote_producao:'',data_hora_inicio:'',data_hora_fim:'',status:'planejada'})
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   const id=tenant.data;setCompany(id)
   const start=new Date(weekStart);const end=new Date(start);end.setDate(end.getDate()+7)
   const [m,o,mo,a,c]=await Promise.all([
    supabase.from('erp_maquinas').select('id,codigo,nome,status,ativo').eq('empresa_id',id).eq('ativo',true).order('codigo'),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,maquina_id,status,ordem_sequencia').eq('empresa_id',id).not('status','in','(concluida,cancelada,cancelado)').order('numero_op',{ascending:false}).limit(2000),
    supabase.from('erp_moldes').select('id,codigo,nome,status,ativo').eq('empresa_id',id).eq('ativo',true).order('codigo'),
    supabase.from('pcp_agenda_maquinas').select('id,maquina_id,ordem_producao_id,molde_id,quantidade_programada,lote_producao,data_hora_inicio,data_hora_fim,status').eq('empresa_id',id).neq('status','cancelada').gte('data_hora_inicio',start.toISOString()).lt('data_hora_inicio',end.toISOString()).order('data_hora_inicio').limit(5000),
    supabase.from('erp_pcp_calendario_trabalho').select('dias_trabalho,horario_inicio_jornada,horario_fim_jornada').eq('empresa_id',id).maybeSingle()
   ])
   for(const r of [m,o,mo,a,c])if(r.error)throw r.error
   setMachines((m.data??[]) as Machine[]);setOrders((o.data??[]) as Order[]);setMolds((mo.data??[]) as Mold[]);setSlots((a.data??[]) as Slot[])
   if(c.data)setCalendar(c.data as Calendar)
  }catch(e){setError(messageOf(e))}
  finally{setBusy(false)}
 },[weekStart])
 useEffect(()=>{void load()},[load])
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d}),[weekStart])
 const visibleDays=days.filter(d=>calendar.dias_trabalho.includes(dayKey(d)))
 const orderMap=useMemo(()=>new Map(orders.map(o=>[o.id,o])),[orders])
 const moldMap=useMemo(()=>new Map(molds.map(m=>[m.id,m])),[molds])
 const weekLabel=useMemo(()=>`Semana ${Math.ceil((weekStart.getDate()+6)/7)} · ${weekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} a ${days[6].toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`,[weekStart,days])
 const cellSlots=(machineId:string,date:Date)=>slots.filter(s=>s.maquina_id===machineId&&new Date(s.data_hora_inicio).toDateString()===date.toDateString()).sort((a,b)=>a.data_hora_inicio.localeCompare(b.data_hora_inicio))
 const selectCell=(machine:Machine,date:Date)=>{setSelected({machine,date});setError('');setNotice('');const start=new Date(date);const [h='06',min='00']=calendar.horario_inicio_jornada.split(':');start.setHours(Number(h),Number(min),0,0);const end=new Date(start);end.setHours(end.getHours()+1);setForm({ordem_producao_id:'',molde_id:'',quantidade_programada:'1',lote_producao:'',data_hora_inicio:localValue(start),data_hora_fim:localValue(end),status:'planejada'})}
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||!company)return
  const start=new Date(form.data_hora_inicio),end=new Date(form.data_hora_fim),qty=Number(form.quantidade_programada)
  if(!form.ordem_producao_id||!Number.isFinite(qty)||qty<=0||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){setError('Informe OP, quantidade positiva e intervalo válido.');return}
  if(start.toDateString()!==selected.date.toDateString()||end.toDateString()!==selected.date.toDateString()){setError('O início e o término precisam estar dentro do dia selecionado.');return}
  setBusy(true);setError('');setNotice('')
  try{
   const r=await supabase.from('pcp_agenda_maquinas').insert({empresa_id:company,maquina_id:selected.machine.id,ordem_producao_id:form.ordem_producao_id,molde_id:form.molde_id||null,quantidade_programada:qty,lote_producao:form.lote_producao.trim()||null,data_hora_inicio:start.toISOString(),data_hora_fim:end.toISOString(),status:form.status})
   if(r.error)throw r.error
   setNotice('OP programada. O banco validou empresa, máquina, molde e conflito de horário.');await load()
  }catch(e){setError(messageOf(e))}
  finally{setBusy(false)}
 }
 async function startSlot(slot:Slot){
  setBusy(true);setError('');setNotice('')
  try{const r=await supabase.from('pcp_agenda_maquinas').update({status:'em_execucao'}).eq('id',slot.id).eq('empresa_id',company);if(r.error)throw r.error;setNotice('Programação marcada em execução.');await load()}catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }
 async function moveSlot(slot:Slot,direction:number){
  const row=cellSlots(slot.maquina_id,new Date(slot.data_hora_inicio));const index=row.findIndex(x=>x.id===slot.id);const other=row[index+direction]
  if(!other)return
  setError('A sequência só pode ser alterada sem sobrepor intervalos. Edite os horários para reordenar a máquina; a validação do banco bloqueará conflitos.')
 }
 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4 print:bg-white print:p-0">
  <div className="mx-auto max-w-[1800px]">
   <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 print:mb-2">
    <span className="flex h-8 w-8 items-center justify-center bg-[#123B50] text-white"><CalendarRange size={17}/></span>
    <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">MANUFATURA / PCP</p><h1 className="text-[16px] font-semibold leading-5">Agenda de máquinas · capacidade finita</h1><p className="text-[10px] text-slate-500">{weekLabel} · Jornada {calendar.horario_inicio_jornada.slice(0,5)}–{calendar.horario_fim_jornada.slice(0,5)}</p></div>
    <div className="ml-auto flex flex-wrap gap-1 print:hidden"><button className={btn} onClick={()=>setWeekStart(d=>{const x=new Date(d);x.setDate(x.getDate()-7);return x})}>← Semana</button><button className={btn} onClick={()=>setWeekStart(monday(new Date()))}>Hoje</button><button className={btn} onClick={()=>setWeekStart(d=>{const x=new Date(d);x.setDate(x.getDate()+7);return x})}>Semana →</button><button className={btn} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button><button className={btn} onClick={()=>window.print()}><Printer size={12}/> Imprimir</button></div>
   </header>
   <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 border border-slate-200 bg-white px-2 py-1.5 text-[9px]"><span className="font-bold uppercase text-slate-600">Legenda</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-600"/>Concluída / liberada</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-600"/>Em execução</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500"/>Planejada / pendente</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-600"/>Bloqueada / cancelada</span><span className="ml-auto text-slate-500">Clique em uma célula máquina/dia para consultar e programar OPs</span></div>
   {error&&<div role="alert" className="mb-2 flex items-start gap-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800"><CircleAlert size={13}/>{error}</div>}
   {notice&&<div role="status" className="mb-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</div>}
   {machines.length===0&&!busy?<div className="border border-dashed border-slate-300 bg-white p-8 text-center text-[11px] text-slate-500">Nenhuma máquina ativa cadastrada para esta empresa. Cadastre uma máquina antes de programar capacidade.</div>:<div className="overflow-auto border border-slate-200 bg-white">
    <div className="grid min-w-[980px]" style={{gridTemplateColumns:`150px repeat(${visibleDays.length}, minmax(135px, 1fr))`}}>
     <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 p-2 text-[9px] font-bold uppercase">Máquina / recurso</div>
     {visibleDays.map(date=><div key={date.toISOString()} className="border-b border-r border-slate-200 bg-slate-100 p-2"><p className="text-[9px] font-bold uppercase">{weekdays[(date.getDay()+6)%7].label}</p><p className="text-[11px] font-semibold">{date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</p></div>)}
     {machines.map(machine=><div key={machine.id} className="contents">
      <div className="sticky left-0 z-[1] flex min-h-[96px] flex-col justify-center border-b border-r border-slate-200 bg-white px-2"><span className="flex items-center gap-1 text-[10px] font-bold"><Factory size={12} className="text-sky-700"/>{machine.codigo}</span><span className="text-[9px] text-slate-500">{machine.nome}</span><span className="mt-1 text-[8px] uppercase text-slate-400">{machine.status??'Ativa'}</span></div>
      {visibleDays.map(date=>{const list=cellSlots(machine.id,date);const hours=list.reduce((sum,s)=>sum+Math.max(0,new Date(s.data_hora_fim).getTime()-new Date(s.data_hora_inicio).getTime())/3600000,0);const dayHours=Math.max(0,(Number(calendar.horario_fim_jornada.split(':')[0])-Number(calendar.horario_inicio_jornada.split(':')[0])));const loadPct=dayHours?Math.min(100,hours/dayHours*100):0;return <button key={date.toISOString()} type="button" onClick={()=>selectCell(machine,date)} className="min-h-[96px] border-b border-r border-slate-200 p-1.5 text-left transition-colors hover:bg-neutral-50/80 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-sky-600">
       <div className="mb-1 flex items-center justify-between"><span className="text-[8px] text-slate-500">{list.length} OP(s)</span><span className="text-[8px] font-semibold tabular-nums">{hours.toFixed(1)}h</span></div>
       <div className="mb-1 h-1 overflow-hidden bg-slate-100"><div className={loadPct>=100?'h-full bg-rose-500':'h-full bg-sky-500'} style={{width:`${loadPct}%`}}/></div>
       {list.slice(0,2).map(slot=><div key={slot.id} className="mb-1 border-l-2 border-sky-500 bg-sky-50 px-1 py-1 text-[9px] leading-3"><span className="block font-bold">OP-{orderMap.get(slot.ordem_producao_id)?.numero_op??'—'}</span><span className="block truncate text-slate-600">{slot.quantidade_programada} pç · {slot.status}</span></div>)}
       {list.length>2&&<span className="text-[8px] text-slate-500">+{list.length-2} programação(ões)</span>}
       {list.length===0&&<span className="flex items-center gap-1 pt-3 text-[9px] text-slate-400"><Plus size={11}/> Programar OP</span>}
      </button>})}
     </div>)}
    </div>
   </div>}
   <p className="mt-2 text-[9px] text-slate-500">Agenda semanal filtrada pelos dias de trabalho configurados. Programações não podem se sobrepor na mesma máquina; intervalos são validados no banco. Horas alocadas consideram as programações visíveis.</p>
  </div>
  {selected&&<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm print:hidden" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside role="dialog" aria-modal="true" aria-label="Programação da máquina" className="flex h-full w-full max-w-[900px] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
   <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 p-3 backdrop-blur-sm"><div className="min-w-0"><p className="text-[9px] font-bold uppercase text-sky-700">DBGrid · programação por recurso</p><h2 className="text-[14px] font-semibold">{selected.machine.codigo} · {selected.machine.nome}</h2><p className="text-[10px] text-slate-500">{selected.date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</p></div><button className={btn+' ml-auto'} onClick={()=>setSelected(null)} aria-label="Fechar painel"><X size={13}/></button></header>
   <section className="border-b border-slate-200 p-3"><h3 className="mb-2 text-[10px] font-bold uppercase">OPs programadas para o dia</h3><div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[720px] border-collapse"><thead><tr>{['Pedido / OP','Molde','Quantidade','Lote','Início / Término','Estado','Ação'].map(t=><th key={t} className="h-[30px] bg-slate-100 px-2 text-left text-[9px] font-bold uppercase text-slate-600">{t}</th>)}</tr></thead><tbody>{cellSlots(selected.machine.id,selected.date).map(slot=><tr key={slot.id} className="h-[32px] hover:bg-neutral-50/80"><td className="border-t border-slate-100 px-2 text-[10px]">OP-{orderMap.get(slot.ordem_producao_id)?.numero_op??'—'}</td><td className="border-t border-slate-100 px-2 text-[10px]">{slot.molde_id?moldMap.get(slot.molde_id)?.codigo??'Molde indisponível':'—'}</td><td className="border-t border-slate-100 px-2 text-right text-[10px] tabular-nums">{Number(slot.quantidade_programada).toLocaleString('pt-BR')}</td><td className="border-t border-slate-100 px-2 text-[10px]">{slot.lote_producao??'—'}</td><td className="border-t border-slate-100 px-2 text-right text-[9px] tabular-nums">{fmt(slot.data_hora_inicio)} – {fmt(slot.data_hora_fim)}</td><td className="border-t border-slate-100 px-2 text-[9px]">{slot.status}</td><td className="border-t border-slate-100 px-1"><div className="flex gap-1"><button className={btn} title="Apontar início" onClick={()=>void startSlot(slot)} disabled={busy||slot.status==='em_execucao'||slot.status==='concluida'}><Play size={12}/></button><button className={btn} title="Reordenar sequência" onClick={()=>void moveSlot(slot,1)}><ArrowUpDown size={12}/></button></div></td></tr>)}{cellSlots(selected.machine.id,selected.date).length===0&&<tr><td colSpan={7} className="h-[42px] text-center text-[10px] text-slate-500">Nenhuma OP programada para esta máquina e dia.</td></tr>}</tbody></table></div></section>
   <form onSubmit={save} className="grid gap-2 p-3 md:grid-cols-2"><h3 className="md:col-span-2 text-[10px] font-bold uppercase">Nova programação</h3>
    <label className={label}>Ordem de produção *<select className={input} value={form.ordem_producao_id} onChange={e=>setForm(v=>({...v,ordem_producao_id:e.target.value}))} required><option value="">Selecione uma OP real</option>{orders.filter(o=>!['concluida','cancelada','cancelado'].includes(String(o.status).toLowerCase())).map(o=><option key={o.id} value={o.id}>OP-{o.numero_op} · {o.status}</option>)}</select></label>
    <label className={label}>Molde cadastrado<select className={input} value={form.molde_id} onChange={e=>setForm(v=>({...v,molde_id:e.target.value}))}><option value="">Sem molde vinculado</option>{molds.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
    <label className={label}>Quantidade programada<input className={input} type="number" min="0.000001" step="0.000001" value={form.quantidade_programada} onChange={e=>setForm(v=>({...v,quantidade_programada:e.target.value}))} required/></label>
    <label className={label}>Lote de produção<input className={input} value={form.lote_producao} onChange={e=>setForm(v=>({...v,lote_producao:e.target.value}))} maxLength={100} placeholder="Informar lote gerado"/></label>
    <label className={label}>Data/hora início<input className={input} type="datetime-local" value={form.data_hora_inicio} onChange={e=>setForm(v=>({...v,data_hora_inicio:e.target.value}))} required/></label>
    <label className={label}>Data/hora término<input className={input} type="datetime-local" value={form.data_hora_fim} onChange={e=>setForm(v=>({...v,data_hora_fim:e.target.value}))} required/></label>
    <label className={label}>Situação<select className={input} value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}><option value="planejada">Planejada</option><option value="confirmada">Confirmada</option></select></label>
    <div className="flex items-end"><button className={primary+' w-full'} type="submit" disabled={busy}><Plus size={12}/> Gravar programação real</button></div>
    <p className="md:col-span-2 text-[9px] text-slate-500">O banco rejeita conflitos de horário, máquina inativa e vínculos entre empresas. A reordenação deve respeitar os intervalos sem sobreposição.</p>
   </form>
  </aside></div>}
 </main>
}
