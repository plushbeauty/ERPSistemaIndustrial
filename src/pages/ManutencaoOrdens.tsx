import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, Save, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { EntityCodeLookup, type LookupRecord } from '../components/industrial/EntityCodeLookup'
import VendasLayout, { type SalesNavSection } from './VendasLayout'

const maintenanceNav: SalesNavSection[] = [{label:'Manutenção',items:[{label:'Ordens',href:'/manutencao/ordens',icon:Wrench},{label:'PCP',href:'/pcp',icon:Wrench},{label:'Produção',href:'/operacao-industrial',icon:Wrench}]},{label:'Integrações',items:[{label:'Estoque',href:'/estoque',icon:Wrench},{label:'Qualidade',href:'/qualidade',icon:Wrench}]}]
type Order={id:string;numero_os:string|null;ativo_id:string;tipo:string;descricao:string;prioridade:string;status:string;data_prevista:string|null;inicio_atendimento:string|null;data_fechamento:string|null;laudo_tecnico:string|null;tecnico_id:string|null;mttr_min:number|null;relatorio_tecnico:Record<string,string>}
type Form={machineId:string;tipo:'CORRETIVA'|'PREVENTIVA'|'PREDITIVA';descricao:string;prioridade:'BAIXA'|'MEDIA'|'ALTA'|'CRITICA';dataPrevista:string}
const input='h-9 w-full border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100'
const area='min-h-24 w-full border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100'
const label='grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700'
const PAGE_SIZE=25

export default function ManutencaoOrdens(){
 const[orders,setOrders]=useState<Order[]>([]),[machines,setMachines]=useState<LookupRecord[]>([]),[products,setProducts]=useState<LookupRecord[]>([]),[technicians,setTechnicians]=useState<LookupRecord[]>([]),[page,setPage]=useState(0)
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false),[selected,setSelected]=useState<Order|null>(null)
 const[laudo,setLaudo]=useState(''),[causa,setCausa]=useState(''),[solucao,setSolucao]=useState(''),[componentId,setComponentId]=useState(''),[componentQty,setComponentQty]=useState('0')
 const[form,setForm]=useState<Form>({machineId:'',tipo:'CORRETIVA',descricao:'',prioridade:'MEDIA',dataPrevista:new Date().toISOString().slice(0,10)})

 const load=async()=>{
  setBusy(true);setError('')
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id');if(empresa.error||!empresa.data)throw new Error('Empresa não identificada.')
   const[o,m,p,t]=await Promise.all([
    fetchAllPages<Order>((from,to)=>supabase.from('erp_manutencao_ordens').select('id,numero_os,ativo_id,tipo,descricao,prioridade,status,data_prevista,inicio_atendimento,data_fechamento,laudo_tecnico,tecnico_id,mttr_min,relatorio_tecnico',{count:'exact'}).eq('empresa_id',empresa.data).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<LookupRecord>((from,to)=>supabase.from('erp_maquinas').select('id,codigo,nome',{count:'exact'}).eq('empresa_id',empresa.data).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<LookupRecord>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome',{count:'exact'}).eq('empresa_id',empresa.data).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<LookupRecord>((from,to)=>supabase.from('erp_usuarios').select('id,nome',{count:'exact'}).eq('empresa_id',empresa.data).eq('ativo',true).is('deleted_at',null).order('nome').range(from,to))
   ])
   setOrders(o);setMachines(m);setProducts(p);setTechnicians(t)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar manutenção.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 const pageCount=Math.max(1,Math.ceil(orders.length/PAGE_SIZE))
 const visibleOrders=orders.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)
 useEffect(()=>{setPage(current=>Math.min(current,pageCount-1))},[pageCount])
 const novo=()=>{setSelected(null);setLaudo('');setCausa('');setSolucao('');setComponentId('');setComponentQty('0');setOpen(true);setError('')}
 const concluir=async()=>{
  if(!selected||!laudo.trim()||!causa.trim()||!solucao.trim()){setError('Laudo, causa raiz e solução são obrigatórios.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.rpc('erp_concluir_manutencao',{p_ordem_id:selected.id,p_laudo:laudo.trim(),p_causa_raiz:causa.trim(),p_solucao:solucao.trim(),p_componente_id:componentId||null,p_quantidade:Number(componentQty)||0})
   if(r.error)throw r.error
   const result=r.data as {mttr_min:number}
   setMessage('O.S. concluída. MTTR: '+Number(result.mttr_min||0).toFixed(0)+' min. Estoque e máquina atualizados na mesma transação.')
   setSelected(null);setLaudo('');setCausa('');setSolucao('');setComponentId('');setComponentQty('0');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir a O.S.')}finally{setBusy(false)}
 }
 const abrir=async()=>{
  if(!form.machineId||!form.descricao.trim()){setError('Máquina e defeito/sintoma são obrigatórios.');return}
  setBusy(true);setError('')
  try{const r=await supabase.rpc('erp_registrar_parada_manutencao',{p_maquina_id:form.machineId,p_ordem_producao_id:null,p_motivo:form.descricao.trim(),p_tipo:form.tipo,p_prioridade:form.prioridade,p_data_prevista:form.dataPrevista});if(r.error)throw r.error;setMessage('O.S. aberta e máquina bloqueada para manutenção.');setOpen(false);await load()}catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir a O.S.')}finally{setBusy(false)}
 }

 return <VendasLayout title="Manutenção" subtitle="Ordens • ativos • execução • histórico" onRefresh={()=>void load()} navSections={maintenanceNav}><main className="min-h-screen bg-slate-100 text-slate-950">
  <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">MANUTENÇÃO › TPM</p><h1 className="text-[15px] font-black">Ordens de Serviço</h1><p className="text-sm font-semibold text-slate-500">Falha → O.S. → causa raiz → componente → estoque → MTTR → máquina liberada.</p></div><div className="ml-auto flex gap-2"><button type="button" onClick={novo} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-sky-700 px-5 font-black text-white"><Wrench size={18}/> NOVA O.S.</button><button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-4 font-black"><RefreshCw size={17}/> ATUALIZAR</button></div></div></header>
  <div className="mx-auto max-w-[1800px] space-y-5 p-5">{(error||message)&&<div className={'rounded-[2px] border p-4 font-bold '+(error?'border-rose-200 bg-rose-50 text-rose-900':'border-emerald-200 bg-emerald-50 text-emerald-900')}>{error||message}</div>}
   <section className="overflow-x-auto rounded-[2px] border border-slate-200 bg-white shadow-sm"><table className="w-full text-left"><thead className="bg-slate-900 text-white"><tr>{['O.S.','Máquina','Tipo','Falha','Prioridade','Status','Técnico','MTTR'].map(x=><th key={x} className="h-14 px-4 text-xs font-black uppercase tracking-wider">{x}</th>)}</tr></thead><tbody>{visibleOrders.map(x=><tr key={x.id} onClick={()=>{setSelected(x);setLaudo(x.laudo_tecnico??'');setCausa(x.relatorio_tecnico?.causa_raiz??'');setSolucao(x.relatorio_tecnico?.solucao??'')}} className="cursor-pointer border-t border-slate-100 hover:bg-sky-50"><td className="h-14 px-4 font-black">{x.numero_os??x.id.slice(0,8)}</td><td className="px-4 font-bold">{machines.find(m=>m.id===x.ativo_id)?.codigo??'—'}</td><td className="px-4">{x.tipo}</td><td className="max-w-[360px] truncate px-4">{x.descricao}</td><td className="px-4 font-bold">{x.prioridade}</td><td className="px-4 font-black">{x.status}</td><td className="px-4">{technicians.find(t=>t.id===x.tecnico_id)?.nome??'—'}</td><td className="px-4">{x.mttr_min?Number(x.mttr_min).toFixed(0)+' min':'—'}</td></tr>)}{orders.length===0&&<tr><td colSpan={8} className="p-12 text-center font-bold text-slate-400">Nenhuma O.S. real cadastrada.</td></tr>}</tbody></table><nav aria-label="Paginação das ordens de manutenção" className="flex items-center justify-between gap-3 border-t border-slate-200 p-3 text-sm"><span>{orders.length} ordem(ns) · página {page+1} de {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page===0} onClick={()=>setPage(current=>Math.max(0,current-1))} className="h-[30px] min-h-[30px] rounded border border-slate-300 px-3 font-bold disabled:opacity-50">Anterior</button><button type="button" disabled={page+1>=pageCount} onClick={()=>setPage(current=>Math.min(pageCount-1,current+1))} className="h-[30px] min-h-[30px] rounded border border-slate-300 px-3 font-bold disabled:opacity-50">Próxima</button></div></nav></section>
   {selected&&<section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-sky-700">O.S. {selected.numero_os??selected.id}</p><h2 className="text-[13px] font-black">{machines.find(m=>m.id===selected.ativo_id)?.codigo??'Máquina'} · {selected.status}</h2></div><button type="button" onClick={()=>setSelected(null)} className="rounded-[2px] border border-slate-300 p-2"><X size={18}/></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className={label}>LAUDO TÉCNICO<textarea className={area} value={laudo} onChange={e=>setLaudo(e.target.value)}/></label><label className={label}>CAUSA RAIZ<textarea className={area} value={causa} onChange={e=>setCausa(e.target.value)}/></label><label className={label}>SOLUÇÃO APLICADA<textarea className={area} value={solucao} onChange={e=>setSolucao(e.target.value)}/></label><div className="grid gap-4"><EntityCodeLookup label="COMPONENTE SUBSTITUÍDO" value={componentId} records={products} onChange={setComponentId} onSelect={r=>setComponentId(r.id)}/><label className={label}>QUANTIDADE<input className={input} type="number" min="0" step="0.001" value={componentQty} onChange={e=>setComponentQty(e.target.value)}/></label></div></div>{selected.status!=='CONCLUIDA'&&<button type="button" onClick={()=>void concluir()} disabled={busy} className="mt-5 inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-emerald-700 px-5 font-black text-white"><CheckCircle2 size={18}/> CONCLUIR O.S. + BAIXAR ESTOQUE</button>}</section>}
  </div>
  {open&&<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4"><section className="w-full max-w-3xl rounded-[2px] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-sky-700">TPM · NOVA O.S.</p><h2 className="text-[15px] font-black">Registrar falha da máquina</h2></div><button type="button" onClick={()=>setOpen(false)} className="rounded-[2px] border p-2"><X size={18}/></button></div><div className="mt-5 grid gap-5 md:grid-cols-2"><EntityCodeLookup label="MÁQUINA" value={form.machineId} records={machines} required onChange={v=>setForm(f=>({...f,machineId:v}))} onSelect={r=>setForm(f=>({...f,machineId:r.id}))}/><label className={label}>TIPO<select className={input} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as Form['tipo']}))}>{['CORRETIVA','PREVENTIVA','PREDITIVA'].map(x=><option key={x}>{x}</option>)}</select></label><label className={label+' md:col-span-2'}>DEFEITO / SINTOMA<textarea className={area} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/></label><label className={label}>PRIORIDADE<select className={input} value={form.prioridade} onChange={e=>setForm(f=>({...f,prioridade:e.target.value as Form['prioridade']}))}>{['BAIXA','MEDIA','ALTA','CRITICA'].map(x=><option key={x}>{x}</option>)}</select></label><label className={label}>DATA PREVISTA<input className={input} type="date" value={form.dataPrevista} onChange={e=>setForm(f=>({...f,dataPrevista:e.target.value}))}/></label></div><div className="mt-5 flex justify-end"><button type="button" onClick={()=>void abrir()} disabled={busy} className="inline-flex h-[30px] items-center gap-2 rounded-[2px] bg-sky-700 px-5 font-black text-white"><Save size={18}/> GRAVAR O.S.</button></div></section></div>}
 </main></VendasLayout>
}
