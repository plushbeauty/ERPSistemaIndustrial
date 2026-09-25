import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, Factory, Gauge, Plus, RefreshCw, Save, Shuffle, Target, Boxes } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;estoque_atual:number}
type MPS={id:string;produto_id:string;periodo_inicio:string;periodo_fim:string;quantidade_prevista:number;estoque_alvo:number;demanda_confirmada:number;status:string}
type Planned={id:string;produto_id:string;quantidade:number;data_necessaria:string;origem:string;status:string}
type Center={id:string;codigo:string;nome:string;capacidade_horas_dia:number;eficiencia_percent:number;ativo:boolean}
type Program={id:string;maquina_id:string|null;inicio_planejado:string;fim_planejado:string;quantidade_planejada:number;status:string}
type Machine={id:string;codigo:string;nome:string;status:string}
type AlertRow={id:string;tipo:string;severidade:string;mensagem:string;status:string;created_at:string}

const today=()=>new Date().toISOString().slice(0,10)
const productLabel=(p:Product)=>p.codigo+' • '+p.nome

export default function PCPPlanejamentoIndustrial(){
 const [tab,setTab]=useState<'mps'|'necessidades'|'capacidade'|'alertas'>('mps')
 const [products,setProducts]=useState<Product[]>([])
 const [mps,setMps]=useState<MPS[]>([])
 const [planned,setPlanned]=useState<Planned[]>([])
 const [centers,setCenters]=useState<Center[]>([])
 const [programs,setPrograms]=useState<Program[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [alerts,setAlerts]=useState<AlertRow[]>([])
 const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[target,setTarget]=useState(''),[start,setStart]=useState(today()),[end,setEnd]=useState(today())
 const [center,setCenter]=useState({codigo:'',nome:'',capacidade_horas_dia:'8',eficiencia_percent:'85'})
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const [p,m,o,c,pr,ma,a]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual').eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_pcp_planos_mestres').select('id,produto_id,periodo_inicio,periodo_fim,quantidade_prevista,estoque_alvo,demanda_confirmada,status').order('periodo_inicio').limit(1000),
    supabase.from('erp_pcp_ordens_planejadas').select('id,produto_id,quantidade,data_necessaria,origem,status').order('data_necessaria').limit(1000),
    supabase.from('erp_pcp_centros_trabalho').select('id,codigo,nome,capacidade_horas_dia,eficiencia_percent,ativo').eq('ativo',true).order('codigo'),
    supabase.from('erp_pcp_programacoes').select('id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,status').neq('status','cancelada').order('inicio_planejado').limit(3000),
    supabase.from('erp_maquinas').select('id,codigo,nome,status').not('status','eq','INATIVA').order('codigo'),
    supabase.from('erp_pcp_alertas').select('id,tipo,severidade,mensagem,status,created_at').neq('status','RESOLVIDO').order('created_at',{ascending:false}).limit(500)
   ])
   for(const r of [p,m,o,c,pr,ma,a]) if(r.error) throw r.error
   setProducts((p.data??[]) as Product[]);setMps((m.data??[]) as MPS[]);setPlanned((o.data??[]) as Planned[]);setCenters((c.data??[]) as Center[]);setPrograms((pr.data??[]) as Program[]);setMachines((ma.data??[]) as Machine[]);setAlerts((a.data??[]) as AlertRow[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar planejamento PCP.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const names=useMemo(()=>new Map(products.map(p=>[p.id,productLabel(p)])),[products])
 const machineLoad=useMemo(()=>machines.map(m=>{
  const rows=programs.filter(p=>p.maquina_id===m.id)
  const hours=rows.reduce((s,p)=>s+Math.max(0,(new Date(p.fim_planejado).getTime()-new Date(p.inicio_planejado).getTime())/3600000),0)
  return {m,rows,hours}
 }),[machines,programs])
 const shortages=useMemo(()=>products.filter(p=>Number(p.estoque_atual||0)<0),[products])

 async function createMPS(){
  const q=Number(qty),t=Number(target)
  if(!productId||q<0||t<0||!start||!end){setError('Produto, período e quantidades válidas são obrigatórios.');return}
  if(end<start){setError('O fim do período não pode ser anterior ao início.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.from('erp_pcp_planos_mestres').insert({produto_id:productId,periodo_inicio:start,periodo_fim:end,quantidade_prevista:q,estoque_alvo:t,demanda_confirmada:0,status:'ABERTO'}).select('id').single()
   if(r.error)throw r.error
   setMessage('Plano mestre criado e disponível para revisão do PCP.');setQty('');setTarget('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar o plano mestre.')}finally{setBusy(false)}
 }

 async function generatePlanned(){
  setBusy(true);setError('');setMessage('')
  try{
   const {data,error}=await supabase.from('erp_mrp_necessidades').select('componente_id,necessidade_liquida').gt('necessidade_liquida',0).limit(3000)
   if(error)throw error
   const rows=(data??[]).map((r:{componente_id:string;necessidade_liquida:number})=>({produto_id:r.componente_id,quantidade:Number(r.necessidade_liquida),data_necessaria:today(),origem:'MRP',status:'PLANEJADA'}))
   if(!rows.length){setMessage('Não existem necessidades líquidas abertas para gerar ordens planejadas.');return}
   const ins=await supabase.from('erp_pcp_ordens_planejadas').insert(rows)
   if(ins.error)throw ins.error
   setMessage(rows.length+' necessidades líquidas transformadas em ordens planejadas.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar ordens planejadas.')}finally{setBusy(false)}
 }

 async function createCenter(){
  if(!center.codigo.trim()||!center.nome.trim()){setError('Código e nome do centro de trabalho são obrigatórios.');return}
  const cap=Number(center.capacidade_horas_dia),eff=Number(center.eficiencia_percent)
  if(cap<=0||eff<=0||eff>100){setError('Capacidade e eficiência devem ser maiores que zero; eficiência máxima 100%.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.from('erp_pcp_centros_trabalho').insert({codigo:center.codigo.trim().toUpperCase(),nome:center.nome.trim(),capacidade_horas_dia:cap,eficiencia_percent:eff,ativo:true})
   if(r.error)throw r.error
   setCenter({codigo:'',nome:'',capacidade_horas_dia:'8',eficiencia_percent:'85'});setMessage('Centro de trabalho cadastrado.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar o centro de trabalho.')}finally{setBusy(false)}
 }

 async function resolveAlert(id:string){
  setBusy(true);setError('')
  try{const r=await supabase.from('erp_pcp_alertas').update({status:'RESOLVIDO'}).eq('id',id);if(r.error)throw r.error;setMessage('Alerta resolvido.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível resolver o alerta.')}finally{setBusy(false)}
 }

 return <main className="industrial-form-page" style={{maxWidth:1500,margin:'0 auto'}}>
  <header className="process-sheet-header"><div><button className="industrial-secondary" type="button" onClick={()=>location.href='/pcp'}>← PCP</button><span className="industrial-eyebrow">PCP • PLANEJAMENTO AVANÇADO</span><h1>Planejamento Mestre, Capacidade e Sequenciamento</h1><p>MPS → MRP → ordens planejadas → capacidade → carga → alertas → reprogramação.</p></div><button className="industrial-secondary" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button></header>
  {(message||error)&&<div className={error?'error':'notice'} style={{margin:'12px 0'}}>{error||message}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:16}}>
   <article className="industrial-panel"><Target size={20}/><small>Planos mestres</small><strong>{mps.length}</strong></article>
   <article className="industrial-panel"><Boxes size={20}/><small>Ordens planejadas</small><strong>{planned.length}</strong></article>
   <article className="industrial-panel"><Gauge size={20}/><small>Horas programadas</small><strong>{machineLoad.reduce((s,x)=>s+x.hours,0).toFixed(1)} h</strong></article>
   <article className="industrial-panel"><AlertTriangle size={20}/><small>Alertas abertos</small><strong>{alerts.length}</strong></article>
  </div>
  <nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{[['mps','MPS / Plano Mestre'],['necessidades','Ordens Planejadas / MRP'],['capacidade','Capacidade / Centros'],['alertas','Alertas / Exceções']].map(([id,label])=><button key={id} className={tab===id?'industrial-primary':'industrial-secondary'} onClick={()=>setTab(id as typeof tab)}>{label}</button>)}</nav>

  {tab==='mps'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>MPS</span><h2>Plano Mestre de Produção</h2><p>Registre previsão, demanda confirmada e estoque-alvo por produto e período. O plano é uma entrada explícita para o MRP.</p></div>
   <div className="process-form-grid"><label>Produto<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select></label><label>Quantidade prevista<input type="number" min="0" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Estoque alvo<input type="number" min="0" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Início<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Fim<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><div style={{display:'flex',alignItems:'end'}}><button className="industrial-primary" type="button" onClick={()=>void createMPS()} disabled={busy}><Save size={16}/> Gravar MPS</button></div></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Produto</th><th>Período</th><th>Previsto</th><th>Demanda confirmada</th><th>Estoque alvo</th><th>Status</th></tr></thead><tbody>{mps.map(x=><tr key={x.id}><td>{names.get(x.produto_id)||x.produto_id}</td><td>{x.periodo_inicio} → {x.periodo_fim}</td><td>{x.quantidade_prevista}</td><td>{x.demanda_confirmada}</td><td>{x.estoque_alvo}</td><td>{x.status}</td></tr>)}{!mps.length&&<tr><td colSpan={6}>Nenhum plano mestre cadastrado.</td></tr>}</tbody></table></div>
  </section>}

  {tab==='necessidades'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>MRP → PCP</span><h2>Ordens planejadas</h2><p>Transforme necessidades líquidas já calculadas pelo motor MRP em ordens planejadas para revisão antes da liberação.</p></div>
   <button className="industrial-primary" type="button" onClick={()=>void generatePlanned()} disabled={busy}><Shuffle size={16}/> Gerar a partir das necessidades MRP</button>
   <div className="industrial-table-scroll" style={{marginTop:16}}><table className="industrial-table"><thead><tr><th>Produto</th><th>Quantidade</th><th>Necessária em</th><th>Origem</th><th>Status</th></tr></thead><tbody>{planned.map(x=><tr key={x.id}><td>{names.get(x.produto_id)||x.produto_id}</td><td>{x.quantidade}</td><td>{x.data_necessaria}</td><td>{x.origem}</td><td>{x.status}</td></tr>)}{!planned.length&&<tr><td colSpan={5}>Nenhuma ordem planejada aberta.</td></tr>}</tbody></table></div>
  </section>}

  {tab==='capacidade'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>FINITE CAPACITY</span><h2>Capacidade e carga</h2><p>Compare horas programadas com a capacidade nominal dos centros de trabalho e máquinas.</p></div>
   <div className="process-form-grid"><label>Código<input value={center.codigo} onChange={e=>setCenter({...center,codigo:e.target.value})}/></label><label>Nome<input value={center.nome} onChange={e=>setCenter({...center,nome:e.target.value})}/></label><label>Horas/dia<input type="number" min="0.5" value={center.capacidade_horas_dia} onChange={e=>setCenter({...center,capacidade_horas_dia:e.target.value})}/></label><label>Eficiência %<input type="number" min="1" max="100" value={center.eficiencia_percent} onChange={e=>setCenter({...center,eficiencia_percent:e.target.value})}/></label><div style={{display:'flex',alignItems:'end'}}><button className="industrial-primary" type="button" onClick={()=>void createCenter()} disabled={busy}><Plus size={16}/> Cadastrar centro</button></div></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginTop:16}}>{centers.map(c=><article key={c.id} style={{border:'1px solid #cfe1e7',borderRadius:12,padding:16}}><strong>{c.codigo}</strong><h3>{c.nome}</h3><p>{c.capacidade_horas_dia} h/dia • {c.eficiencia_percent}% eficiência</p></article>)}</div>
   <div className="industrial-table-scroll" style={{marginTop:16}}><table className="industrial-table"><thead><tr><th>Máquina</th><th>Programações</th><th>Horas carregadas</th><th>Utilização</th><th>Status</th></tr></thead><tbody>{machineLoad.map(x=><tr key={x.m.id}><td>{x.m.codigo} • {x.m.nome}</td><td>{x.rows.length}</td><td>{x.hours.toFixed(1)} h</td><td>{x.hours>0?'Carga registrada':'Livre'}</td><td>{x.m.status}</td></tr>)}</tbody></table></div>
  </section>}

  {tab==='alertas'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>EXCEÇÕES</span><h2>Alertas do PCP</h2><p>Fila de exceções que exige ação do planejador: atraso, falta, capacidade, conflito e máquina indisponível.</p></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Data</th><th>Tipo</th><th>Severidade</th><th>Mensagem</th><th>Ação</th></tr></thead><tbody>{alerts.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString('pt-BR')}</td><td>{a.tipo}</td><td>{a.severidade}</td><td>{a.mensagem}</td><td><button className="industrial-secondary" onClick={()=>void resolveAlert(a.id)} disabled={busy}><CheckCircle2 size={15}/> Resolver</button></td></tr>)}{!alerts.length&&<tr><td colSpan={5}>Nenhum alerta aberto.</td></tr>}</tbody></table></div>
  </section>}
 </main>
}
