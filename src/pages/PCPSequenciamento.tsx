import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarRange, RefreshCw, Search, Shuffle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Machine = { id:string; codigo:string; nome:string }
type Order = { id:string; numero_op:string|number; produto_id:string|null; status:string }
type Slot = { id:string; maquina_id:string; ordem_producao_id:string; molde_id:string|null; quantidade_programada:number; lote_producao:string|null; data_hora_inicio:string; data_hora_fim:string; status:string }
const btn='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40'
const th='h-[30px] border-b border-slate-200 bg-slate-100 px-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-600'
const td='h-[32px] border-b border-slate-100 px-2 text-[10px] text-slate-700'
const monday=(d:Date)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const fmt=(v:string)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))
const errMsg=(e:unknown)=>e instanceof Error?e.message:'Não foi possível carregar o sequenciamento.'
export default function PCPSequenciamento(){
 const [company,setCompany]=useState('')
 const [machines,setMachines]=useState<Machine[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [slots,setSlots]=useState<Slot[]>([])
 const [week,setWeek]=useState(()=>monday(new Date()))
 const [machineFilter,setMachineFilter]=useState('TODAS')
 const [statusFilter,setStatusFilter]=useState('ATIVAS')
 const [query,setQuery]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const endWeek=useMemo(()=>{const d=new Date(week);d.setDate(d.getDate()+7);return d},[week])
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   const id=tenant.data;setCompany(id)
   const [m,o,a]=await Promise.all([
    supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status').eq('empresa_id',id).order('numero_op',{ascending:false}).limit(3000),
    supabase.from('pcp_agenda_maquinas').select('id,maquina_id,ordem_producao_id,molde_id,quantidade_programada,lote_producao,data_hora_inicio,data_hora_fim,status').eq('empresa_id',id).gte('data_hora_inicio',week.toISOString()).lt('data_hora_inicio',endWeek.toISOString()).order('maquina_id').order('data_hora_inicio').limit(5000)
   ])
   for(const r of [m,o,a])if(r.error)throw r.error
   setMachines((m.data??[]) as Machine[]);setOrders((o.data??[]) as Order[]);setSlots((a.data??[]) as Slot[])
  }catch(e){setError(errMsg(e))}finally{setBusy(false)}
 },[week,endWeek])
 useEffect(()=>{void load()},[load])
 const machineMap=useMemo(()=>new Map(machines.map(m=>[m.id,m])),[machines])
 const orderMap=useMemo(()=>new Map(orders.map(o=>[o.id,o])),[orders])
 const visible=useMemo(()=>slots.filter(s=>{
  if(machineFilter!=='TODAS'&&s.maquina_id!==machineFilter)return false
  if(statusFilter==='ATIVAS'&&s.status==='cancelada')return false
  if(statusFilter!=='TODAS'&&statusFilter!=='ATIVAS'&&s.status!==statusFilter)return false
  const machine=machineMap.get(s.maquina_id);const order=orderMap.get(s.ordem_producao_id)
  return !query||[String(order?.numero_op??''),s.lote_producao??'',machine?.codigo??'',machine?.nome??'',s.status].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
 }),[slots,machineFilter,statusFilter,query,machineMap,orderMap])
 const move=async(slot:Slot,direction:-1|1)=>{
  const sameMachine=visible.filter(s=>s.maquina_id===slot.maquina_id&&new Date(s.data_hora_inicio).toDateString()===new Date(slot.data_hora_inicio).toDateString()).sort((a,b)=>a.data_hora_inicio.localeCompare(b.data_hora_inicio))
  const i=sameMachine.findIndex(s=>s.id===slot.id);const other=sameMachine[i+direction]
  if(!other){setError('A troca só pode ocorrer entre programações da mesma máquina e do mesmo dia.');return}
  if(slot.status==='em_execucao'||slot.status==='concluida'||other.status==='em_execucao'||other.status==='concluida'){setError('Programações em execução ou concluídas não podem ser reordenadas.');return}
  setBusy(true);setError('');setNotice('')
  try{
   const r=await supabase.rpc('erp_pcp_reordenar_agenda_maquinas',{p_agenda_id:slot.id,p_vizinha_id:other.id})
   if(r.error)throw r.error
   setNotice('Sequência atualizada pela rotina transacional do banco.')
   await load()
  }catch(e){setError(errMsg(e))}finally{setBusy(false)}
 }
 const labelWeek=`${week.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} – ${new Date(endWeek.getTime()-86400000).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}`
 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4"><div className="mx-auto max-w-[1700px]">
  <header className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2"><span className="flex h-8 w-8 items-center justify-center bg-[#123B50] text-white"><Shuffle size={16}/></span><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#2D8DB8]">MANUFATURA / PCP</p><h1 className="text-[16px] font-semibold">Sequenciamento de produção</h1><p className="text-[10px] text-slate-500">Fila por máquina · capacidade finita · troca transacional de intervalos</p></div><div className="ml-auto flex flex-wrap gap-1"><button className={btn} onClick={()=>setWeek(d=>{const n=new Date(d);n.setDate(n.getDate()-7);return n})}>← Semana</button><button className={btn} onClick={()=>setWeek(monday(new Date()))}>Hoje</button><button className={btn} onClick={()=>setWeek(d=>{const n=new Date(d);n.setDate(n.getDate()+7);return n})}>Semana →</button><button className={btn} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button></div></header>
  <section className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[180px_180px_minmax(220px,1fr)_auto]"><div className="border border-slate-200 bg-white p-2"><span className="mb-[2px] block text-[9px] font-bold uppercase text-slate-500">Período</span><span className="text-[11px] font-semibold">{labelWeek}</span></div><label className="border border-slate-200 bg-white p-2"><span className="mb-[2px] block text-[9px] font-bold uppercase text-slate-500">Máquina</span><select className="h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-[10px]" value={machineFilter} onChange={e=>setMachineFilter(e.target.value)}><option value="TODAS">Todas as máquinas</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label><label className="border border-slate-200 bg-white p-2"><span className="mb-[2px] block text-[9px] font-bold uppercase text-slate-500">Pesquisa</span><span className="relative block"><Search size={12} className="absolute left-2 top-2.5 text-slate-400"/><input className="h-[30px] w-full rounded-[2px] border border-slate-300 pl-7 pr-2 text-[10px]" value={query} onChange={e=>setQuery(e.target.value)} placeholder="OP, lote ou máquina"/></span></label><label className="border border-slate-200 bg-white p-2"><span className="mb-[2px] block text-[9px] font-bold uppercase text-slate-500">Estado</span><select className="h-[30px] w-full rounded-[2px] border border-slate-300 px-2 text-[10px]" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ATIVAS">Não canceladas</option><option value="TODAS">Todos</option><option value="planejada">Planejada</option><option value="confirmada">Confirmada</option><option value="em_execucao">Em execução</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></label></section>
  {error&&<div role="alert" className="mb-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800">{error}</div>}{notice&&<div role="status" className="mb-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</div>}
  <section className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 p-2"><CalendarRange size={13} className="text-sky-700"/><h2 className="mr-auto text-[10px] font-bold uppercase">Fila programada</h2><span className="text-[9px] text-slate-500">{visible.length} programação(ões)</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] border-collapse"><thead><tr>{['Máquina','OP','Lote','Início','Término','Quantidade','Estado','Reordenar'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{visible.map(slot=>{const machine=machineMap.get(slot.maquina_id);const order=orderMap.get(slot.ordem_producao_id);const canMove=!['em_execucao','concluida','cancelada'].includes(slot.status);return <tr key={slot.id} className="hover:bg-slate-50"><td className={td}><span className="font-bold">{machine?.codigo??'—'}</span><span className="ml-1 text-slate-500">{machine?.nome??'Máquina não localizada'}</span></td><td className={td+' font-semibold'}>OP-{order?.numero_op??'—'}</td><td className={td}>{slot.lote_producao??'—'}</td><td className={td+' text-right tabular-nums'}>{fmt(slot.data_hora_inicio)}</td><td className={td+' text-right tabular-nums'}>{fmt(slot.data_hora_fim)}</td><td className={td+' text-right tabular-nums'}>{Number(slot.quantidade_programada).toLocaleString('pt-BR')}</td><td className={td}>{slot.status}</td><td className={td}><div className="flex justify-center gap-1"><button className={btn} title="Subir na sequência" aria-label="Subir na sequência" disabled={busy||!canMove} onClick={()=>void move(slot,-1)}><ArrowUp size={12}/></button><button className={btn} title="Descer na sequência" aria-label="Descer na sequência" disabled={busy||!canMove} onClick={()=>void move(slot,1)}><ArrowDown size={12}/></button></div></td></tr>})}{visible.length===0&&<tr><td colSpan={8} className="h-[48px] text-center text-[10px] text-slate-500">{busy?'Carregando programação…':'Nenhuma programação para os filtros e período selecionados.'}</td></tr>}</tbody></table></div></section>
  <p className="mt-2 text-[9px] text-slate-500">A reordenação usa a função transacional do PostgreSQL e só é concluída se os intervalos continuarem válidos. OPs em execução ou concluídas ficam bloqueadas para troca.</p>
 </div></main>
}
