import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Boxes, ClipboardList, Factory, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product = { id:string; codigo:string; nome:string; unidade:string|null }
type Order = { id:string; numero_op:number|string; produto_id:string|null; quantidade:number|null; quantidade_planejada:number|null; quantidade_produzida:number|null; status:string; data_prevista:string|null; maquina_id:string|null }
type Machine = { id:string; codigo:string; nome:string }
type Process = { id:string; codigo:string; nome:string }
type Entry = { id:string; ordem_producao_id:string; maquina_id:string|null; processo_id:string|null; inicio_em:string|null; fim_em:string|null; quantidade_planejada:number|null; quantidade_boa:number|null; quantidade_refugada:number|null; motivo_parada:string|null; observacoes:string|null; created_at:string }
type Material = { produto_id:string; codigo:string; descricao:string; nivel:number; necessidade_bruta:number; saldo_disponivel:number; necessidade_liquida:number; perda_estimada:number }

const field='h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] outline-none focus:border-sky-600'
const label='mb-[2px] block text-[9px] font-bold uppercase tracking-wide text-slate-600'
const btn='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold hover:bg-slate-50 disabled:opacity-50'
const primary='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-sky-700 bg-sky-700 px-3 text-[10px] font-semibold text-white hover:bg-sky-800 disabled:opacity-50'
const th='h-[30px] border-b border-slate-200 bg-slate-100 px-2 text-left text-[9px] font-bold uppercase text-slate-600'
const td='h-[32px] border-b border-slate-100 px-2 text-[10px] text-slate-700'
const localDateTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const messageOf=(e:unknown)=>e instanceof Error?e.message:'Falha na execução do PCP.'

export default function PCPExecucaoIndustrial(){
 const [tab,setTab]=useState<'ordens'|'apontamentos'|'mrp'>('ordens')
 const [products,setProducts]=useState<Product[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [processes,setProcesses]=useState<Process[]>([])
 const [entries,setEntries]=useState<Entry[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [query,setQuery]=useState('')
 const [entry,setEntry]=useState({ordem_producao_id:'',maquina_id:'',processo_id:'',inicio_em:localDateTime(),fim_em:'',quantidade_planejada:'1',quantidade_boa:'0',quantidade_refugada:'0',motivo_parada:'',observacoes:''})
 const [mrpProduct,setMrpProduct]=useState('')
 const [mrpQty,setMrpQty]=useState('1')
 const [materials,setMaterials]=useState<Material[]>([])

 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada; PCP bloqueado.')
   const company=tenant.data
   const [p,o,m,pr,a]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade_planejada,quantidade_produzida,status,data_prevista,maquina_id').eq('empresa_id',company).order('created_at',{ascending:false}).limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_processos_industriais').select('id,codigo,nome').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,processo_id,inicio_em,fim_em,quantidade_planejada,quantidade_boa,quantidade_refugada,motivo_parada,observacoes,created_at').eq('empresa_id',company).order('created_at',{ascending:false}).limit(1000)
   ])
   for(const r of [p,o,m,pr,a])if(r.error)throw r.error
   setProducts((p.data??[]) as Product[]);setOrders((o.data??[]) as Order[]);setMachines((m.data??[]) as Machine[]);setProcesses((pr.data??[]) as Process[]);setEntries((a.data??[]) as Entry[])
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const productMap=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products])
 const machineMap=useMemo(()=>new Map(machines.map(m=>[m.id,m])),[machines])
 const processMap=useMemo(()=>new Map(processes.map(p=>[p.id,p])),[processes])
 const orderMap=useMemo(()=>new Map(orders.map(o=>[o.id,o])),[orders])
 const progressByOrder=useMemo(()=>{const result=new Map<string,{good:number;scrap:number}>();for(const row of entries){const current=result.get(row.ordem_producao_id)??{good:0,scrap:0};current.good+=Number(row.quantidade_boa??0);current.scrap+=Number(row.quantidade_refugada??0);result.set(row.ordem_producao_id,current)}return result},[entries])
 const visibleOrders=useMemo(()=>orders.filter(o=>{const p=productMap.get(o.produto_id??'');return [String(o.numero_op),o.status,p?.codigo,p?.nome].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))}),[orders,productMap,query])
 const totals=useMemo(()=>({open:orders.filter(o=>!['concluida','encerrada','cancelada','cancelado'].includes(o.status.toLowerCase())).length,good:entries.reduce((n,r)=>n+Number(r.quantidade_boa||0),0),scrap:entries.reduce((n,r)=>n+Number(r.quantidade_refugada||0),0)}),[orders,entries])

 async function saveEntry(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('')
  const good=Number(entry.quantidade_boa),scrap=Number(entry.quantidade_refugada),planned=Number(entry.quantidade_planejada)
  const start=new Date(entry.inicio_em),end=entry.fim_em?new Date(entry.fim_em):null
  if(!entry.ordem_producao_id||!entry.maquina_id||!entry.processo_id){setError('Selecione OP, máquina e processo cadastrados.');return}
  if(!Number.isFinite(planned)||planned<=0||!Number.isFinite(good)||!Number.isFinite(scrap)||good<0||scrap<0||good+scrap<=0){setError('Quantidade planejada deve ser positiva e total bom + refugo deve ser maior que zero.');return}
  if(!Number.isFinite(start.getTime())||(end&&(!Number.isFinite(end.getTime())||end<=start))){setError('Confira os horários de início e fim.');return}
  setBusy(true)
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa não identificada.')
   const result=await supabase.from('erp_apontamentos_processo').insert({empresa_id:tenant.data,ordem_producao_id:entry.ordem_producao_id,maquina_id:entry.maquina_id,processo_id:entry.processo_id,inicio_em:start.toISOString(),fim_em:end?.toISOString()??null,quantidade_planejada:planned,quantidade_boa:good,quantidade_refugada:scrap,motivo_parada:entry.motivo_parada.trim()||null,observacoes:entry.observacoes.trim()||null})
   if(result.error)throw result.error
   setNotice('Apontamento gravado no registro industrial existente, com vínculo à OP, máquina e processo.')
   setEntry(v=>({...v,quantidade_boa:'0',quantidade_refugada:'0',motivo_parada:'',observacoes:''}))
   await load()
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }

 async function runMrp(){
  setError('');setNotice('');setMaterials([])
  const qty=Number(mrpQty)
  if(!mrpProduct||!Number.isFinite(qty)||qty<=0){setError('Selecione produto e quantidade maior que zero.');return}
  setBusy(true)
  try{
   const result=await supabase.rpc('erp_pcp_mrp_explodir',{p_produto_pai_id:mrpProduct,p_quantidade:qty})
   if(result.error)throw result.error
   setMaterials((result.data??[]) as Material[])
   setNotice('Necessidades calculadas pelo MRP no PostgreSQL para a empresa da sessão.')
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4 print:bg-white print:p-0"><div className="mx-auto max-w-[1600px]">
  <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 print:mb-2"><div className="flex h-9 w-9 items-center justify-center bg-[#123B50] text-white"><Factory size={18}/></div><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-sky-700">SGQ ERP INDUSTRIAL / PCP</p><h1 className="text-base font-semibold">Execução e controle da produção</h1><p className="text-[10px] text-slate-500">Carteira de OPs reais · apontamento por processo · MRP multinível</p></div><div className="ml-auto flex gap-1.5 print:hidden"><button className={btn} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button><button className={btn} onClick={()=>window.print()}><Printer size={12}/> Imprimir</button></div></header>
  <section className="mb-3 grid grid-cols-3 gap-2">{[['OPs abertas',totals.open],['Peças boas',totals.good],['Peças refugadas',totals.scrap]].map(([name,value])=><div key={String(name)} className="border border-slate-200 bg-white p-2"><p className={label}>{name}</p><strong className="text-base tabular-nums">{Number(value).toLocaleString('pt-BR')}</strong></div>)}</section>
  {error&&<div role="alert" className="mb-2 flex gap-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800"><AlertTriangle size={13}/>{error}</div>}{notice&&<div role="status" className="mb-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</div>}
  <nav className="mb-3 flex gap-1 border-b border-slate-200 print:hidden">{([{id:'ordens',label:'Ordens de produção',icon:ClipboardList},{id:'apontamentos',label:'Apontamentos',icon:Activity},{id:'mrp',label:'MRP / materiais',icon:Boxes}] as const).map(t=><button key={t.id} className={tab===t.id?'h-[30px] border-b-2 border-sky-700 bg-white px-3 text-[10px] font-bold text-sky-800':'h-[30px] px-3 text-[10px] text-slate-600'} onClick={()=>setTab(t.id)}><t.icon className="mr-1 inline" size={12}/>{t.label}</button>)}</nav>
  {tab==='ordens'&&<section className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 p-2"><h2 className="mr-auto text-[10px] font-bold uppercase">Ordens cadastradas</h2><input className={field+' max-w-[300px]'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar OP, produto ou status"/></div><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['OP','Produto','Quantidade planejada','Produzida','Avanço','Entrega','Status'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{visibleOrders.map(o=><tr key={o.id}><td className={td+' font-semibold'}>OP-{o.numero_op}</td><td className={td}>{productMap.get(o.produto_id??'')?.codigo??'—'} · {productMap.get(o.produto_id??'')?.nome??'Produto não localizado'}</td><td className={td+' text-right'}>{Number(o.quantidade_planejada??o.quantidade??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(o.quantidade_produzida??progressByOrder.get(o.id)?.good??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{(()=>{const planned=Number(o.quantidade_planejada??o.quantidade??0);const done=Number(o.quantidade_produzida??progressByOrder.get(o.id)?.good??0);return planned>0?`${Math.min(100,done/planned*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—'})()}</td><td className={td}>{o.data_prevista?new Date(o.data_prevista).toLocaleDateString('pt-BR'):'—'}</td><td className={td}>{o.status}</td></tr>)}{visibleOrders.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={7}>{busy?'Carregando…':'Nenhuma OP para os filtros informados.'}</td></tr>}</tbody></table></div></section>}
  {tab==='apontamentos'&&<div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]"><form onSubmit={saveEntry} className="h-fit border border-slate-200 bg-white p-3"><h2 className="mb-3 text-[10px] font-bold uppercase">Novo apontamento de produção</h2>
   <label className={label}>Ordem de produção<select className={field} value={entry.ordem_producao_id} onChange={e=>{const order=orderMap.get(e.target.value);setEntry(v=>({...v,ordem_producao_id:e.target.value,maquina_id:order?.maquina_id??v.maquina_id}))}} required><option value="">Selecione OP</option>{orders.filter(o=>!['concluida','encerrada','cancelada','cancelado'].includes(o.status.toLowerCase())).map(o=><option key={o.id} value={o.id}>OP-{o.numero_op} · {o.status}</option>)}</select></label>
   <label className={label}>Máquina<select className={field} value={entry.maquina_id} onChange={e=>setEntry(v=>({...v,maquina_id:e.target.value}))} required><option value="">Selecione máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
   <label className={label}>Processo industrial<select className={field} value={entry.processo_id} onChange={e=>setEntry(v=>({...v,processo_id:e.target.value}))} required><option value="">Selecione processo</option>{processes.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
   <div className="grid grid-cols-2 gap-2"><label className={label}>Início<input className={field} type="datetime-local" value={entry.inicio_em} onChange={e=>setEntry(v=>({...v,inicio_em:e.target.value}))} required/></label><label className={label}>Fim<input className={field} type="datetime-local" value={entry.fim_em} onChange={e=>setEntry(v=>({...v,fim_em:e.target.value}))}/></label></div>
   <div className="grid grid-cols-3 gap-2"><label className={label}>Lote planejado<input className={field} type="number" min="0.000001" step="0.000001" value={entry.quantidade_planejada} onChange={e=>setEntry(v=>({...v,quantidade_planejada:e.target.value}))} required/></label><label className={label}>Peças boas<input className={field} type="number" min="0" step="0.000001" value={entry.quantidade_boa} onChange={e=>setEntry(v=>({...v,quantidade_boa:e.target.value}))} required/></label><label className={label}>Refugo<input className={field} type="number" min="0" step="0.000001" value={entry.quantidade_refugada} onChange={e=>setEntry(v=>({...v,quantidade_refugada:e.target.value}))} required/></label></div>
   <label className={label}>Motivo de parada / refugo<input className={field} value={entry.motivo_parada} onChange={e=>setEntry(v=>({...v,motivo_parada:e.target.value}))} maxLength={500}/></label><label className={label}>Observações<textarea className={field+' min-h-[64px] py-1'} value={entry.observacoes} onChange={e=>setEntry(v=>({...v,observacoes:e.target.value}))} maxLength={3000}/></label>
   <button className={primary+' mt-2 w-full'} type="submit" disabled={busy}><Save size={12}/> Gravar apontamento</button>
  </form><section className="min-w-0 border border-slate-200 bg-white"><h2 className="border-b border-slate-200 p-2 text-[10px] font-bold uppercase">Histórico de apontamentos</h2><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['OP','Processo','Máquina','Início','Fim','Boas','Refugo','Motivo'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{entries.map(r=><tr key={r.id}><td className={td}>OP-{orderMap.get(r.ordem_producao_id)?.numero_op??'—'}</td><td className={td}>{processMap.get(r.processo_id??'')?.codigo??'—'}</td><td className={td}>{machineMap.get(r.maquina_id??'')?.codigo??'—'}</td><td className={td}>{r.inicio_em?new Date(r.inicio_em).toLocaleString('pt-BR'):'—'}</td><td className={td}>{r.fim_em?new Date(r.fim_em).toLocaleString('pt-BR'):'—'}</td><td className={td+' text-right'}>{Number(r.quantidade_boa??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(r.quantidade_refugada??0).toLocaleString('pt-BR')}</td><td className={td}>{r.motivo_parada??'—'}</td></tr>)}{entries.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={8}>Sem apontamentos registrados.</td></tr>}</tbody></table></div></section></div>}
  {tab==='mrp'&&<section className="border border-slate-200 bg-white p-3"><h2 className="mb-3 text-[10px] font-bold uppercase">Explosão de necessidades</h2><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]"><label className={label}>Produto acabado<select className={field} value={mrpProduct} onChange={e=>setMrpProduct(e.target.value)} required><option value="">Selecione produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label><label className={label}>Quantidade<input className={field} type="number" min="0.000001" step="0.000001" value={mrpQty} onChange={e=>setMrpQty(e.target.value)}/></label><button className={primary+' self-end'} onClick={()=>void runMrp()} disabled={busy}><Boxes size={12}/> Calcular MRP</button></div><div className="mt-3 overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['Nível','Componente','Necessidade bruta','Saldo','Necessidade líquida','Perda estimada'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{materials.map((m,i)=><tr key={m.produto_id+i}><td className={td}>{m.nivel}</td><td className={td}>{m.codigo} · {m.descricao}</td><td className={td+' text-right'}>{Number(m.necessidade_bruta).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.saldo_disponivel).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.necessidade_liquida).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.perda_estimada).toLocaleString('pt-BR')}</td></tr>)}{materials.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={6}>Selecione o produto e execute o MRP para consultar necessidades reais.</td></tr>}</tbody></table></div></section>}
 </div></main>
}
