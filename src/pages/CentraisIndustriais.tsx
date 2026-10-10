import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import QualitySidebar from '../components/quality/QualitySidebar'
import { ArrowDownCircle, ArrowUpCircle, ClipboardCheck, Factory, FileText, Gauge, Plus, RefreshCw, Truck, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Module = 'financeiro'|'expedicao'|'metrologia'|'treinamentos'|'auditoria'|'paradas'|'refugos'|'materiais'
type Profile = { empresa_id:string|null; is_master:boolean }
type Row = Record<string, unknown> & { id: string }

const money=(v:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const date=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('pt-BR'):'—'

export default function CentraisIndustriais({module}:{module:Module}){
 const [profile,setProfile]=useState<Profile|null>(null),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[query,setQuery]=useState(''),[form,setForm]=useState(false)
 useEffect(()=>{let alive=true;void(async()=>{try{
  const {data:u}=await supabase.auth.getUser(); if(!u.user) throw new Error('Sessão não encontrada.')
  const {data:p,error:pe}=await supabase.from('erp_usuarios').select('empresa_id,is_master').eq('auth_user_id',u.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle(); if(pe)throw pe
  if(!p?.empresa_id&&!p?.is_master)throw new Error('Empresa não identificada.')
  if(alive)setProfile(p)
 }catch(e){if(alive)setError(e instanceof Error?e.message:'Não foi possível validar o acesso.') }})();return()=>{alive=false}},[])
 useEffect(()=>{if(!profile)return;let alive=true;void(async()=>{setLoading(true);setError('')
  try{
   const config:{table:string;select:string;order:string;ascending?:boolean}=
    module==='financeiro'?{table:'erp_contas_pagar',select:'id,descricao,documento,valor,vencimento,pagamento,status,created_at',order:'vencimento'}:
    module==='expedicao'?{table:'erp_expedicoes',select:'id,numero,status,transportadora,rastreio,data_expedicao,observacoes,created_at',order:'numero',ascending:false}:
    module==='metrologia'?{table:'erp_equipamentos_medicao',select:'id,codigo,descricao,fabricante,modelo,status,proxima_calibracao,setor_localizacao,ultima_calibracao',order:'codigo'}:
    module==='treinamentos'?{table:'erp_treinamentos',select:'id,titulo,instrutor,data,carga_horas,status,evidencia_storage_path',order:'data',ascending:false}:
    module==='paradas'?{table:'erp_pcp_paradas',select:'id,programacao_id,maquina_id,molde_id,lado_prensagem,inicio,fim,categoria,motivo,setup_changeover,observacoes',order:'inicio',ascending:false}:
    module==='refugos'?{table:'erp_refugos_retrabalhos',select:'id,ordem_producao_id,produto_id,tipo,quantidade,motivo,custo,created_at',order:'created_at',ascending:false}:
    {table:'erp_auditorias',select:'id,auditor,criterio,data_auditoria,resultado,evidencia,created_at',order:'data_auditoria',ascending:false}
   let q=supabase.from(config.table).select(config.select).order(config.order,{ascending:config.ascending??true}).limit(500)
   if(!profile.is_master)q=q.eq('empresa_id',profile.empresa_id as string)
   const {data,error:e}=await q;if(e)throw e;if(alive)setRows((data??[]) as unknown as Row[])
  }catch(e){if(alive)setError(e instanceof Error?e.message:'Falha ao carregar os dados.')}finally{if(alive)setLoading(false)}
 })();return()=>{alive=false}},[profile,module,refresh])
 const filtered=useMemo(()=>rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase())),[rows,query])
 const title={financeiro:'Central Financeira',expedicao:'Expedição e Logística',metrologia:'Metrologia e Calibração',treinamentos:'Treinamentos e Competências',auditoria:'Auditorias e Conformidade',paradas:'Paradas, Setup e Downtime',refugos:'Refugo e Retrabalho',materiais:'Materiais e Estoque'}[module]
 const desc={financeiro:'Contas a pagar, fluxo financeiro e compromissos reais da empresa.',expedicao:'Separação, transporte, rastreio e expedição vinculados aos pedidos.',metrologia:'Equipamentos de medição, validade de calibração e certificados.',treinamentos:'Capacitação, presença, conclusão e evidências dos treinamentos.',auditoria:'Programação, execução, evidências e resultados das auditorias.',paradas:'Acompanhamento de paradas, setup/changeover e motivos no PCP.',refugos:'Apontamento de refugo, retrabalho, motivo e custo de qualidade.',materiais:'Materiais e saldos de estoque vinculados à operação industrial.'}[module]
 async function addFinance(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!profile?.empresa_id)return;const f=new FormData(e.currentTarget);const {error}=await supabase.from('erp_contas_pagar').insert({empresa_id:profile.empresa_id,descricao:String(f.get('descricao')),documento:String(f.get('documento')||''),valor:Number(f.get('valor')),vencimento:String(f.get('vencimento')),status:'aberta'});if(error){setError(error.message);return}setForm(false);setRefresh(x=>x+1)}
 async function addExpedicao(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!profile?.empresa_id)return;const f=new FormData(e.currentTarget);const {error}=await supabase.from('erp_expedicoes').insert({empresa_id:profile.empresa_id,numero:Number(f.get('numero')),status:'preparacao',transportadora:String(f.get('transportadora')||''),rastreio:String(f.get('rastreio')||''),observacoes:String(f.get('observacoes')||'')});if(error){setError(error.message);return}setForm(false);setRefresh(x=>x+1)}
 return <main style={{minHeight:'100vh',background:'#F4FBFD',padding:'12px',fontFamily:'Inter,system-ui,sans-serif',color:'#123B50'}}>
  {(module==='metrologia'||module==='refugos')&&<QualitySidebar active={module==='metrologia'?'/qualidade/metrologia':'/qualidade/refugos'} />}
  <header style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
   <div><div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',color:'#2D8DB8'}}>ERP INDUSTRIAL / OPERAÇÃO</div><h1 style={{margin:'4px 0',fontSize:16,fontWeight:700}}>{title}</h1><p style={{margin:0,color:'#536B76',fontSize:11}}>{desc}</p></div>
   <div style={{display:'flex',gap:8}}><button onClick={()=>setRefresh(x=>x+1)} aria-label="Atualizar" style={btn(false)}><RefreshCw size={17}/></button>{(module==='financeiro'||module==='expedicao')&&!profile?.is_master&&<button onClick={()=>setForm(true)} style={btn(true)}><Plus size={17}/> Novo registro</button>}</div>
  </header>
  <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:18}}>
   <Kpi icon={module==='financeiro'?ArrowDownCircle:module==='expedicao'?Truck:module==='metrologia'?Gauge:module==='treinamentos'?Users:ClipboardCheck} label="Registros" value={loading?'…':filtered.length.toString()}/>
   {module==='financeiro'&&<Kpi icon={ArrowUpCircle} label="Total a pagar" value={money(rows.reduce((s,r)=>s+Number(r.valor||0),0))}/>}
   {module==='expedicao'&&<Kpi icon={Truck} label="Em trânsito" value={rows.filter(r=>/transito|transporte/i.test(String(r.status))).length.toString()}/>}
   {module==='metrologia'&&<Kpi icon={Gauge} label="Próximas calibrações" value={rows.filter(r=>r.proxima_calibracao&&new Date(String(r.proxima_calibracao))<=new Date(Date.now()+30*86400000)).length.toString()}/>}
   {module==='treinamentos'&&<Kpi icon={Users} label="Concluídos" value={rows.filter(r=>/conclu/i.test(String(r.status))).length.toString()}/>}
   {module==='paradas'&&<Kpi icon={Factory} label="Paradas abertas" value={rows.filter(r=>!r.fim).length.toString()}/>} {module==='refugos'&&<Kpi icon={ClipboardCheck} label="Quantidade" value={rows.reduce((s,r)=>s+Number(r.quantidade||0),0).toString()}/>} {module==='auditoria'&&<Kpi icon={ClipboardCheck} label="Conformes" value={rows.filter(r=>/conforme/i.test(String(r.resultado))).length.toString()}/>}
  </section>
  <div style={{display:'flex',gap:8,marginBottom:10}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar por descrição, código, status ou documento…" style={input}/></div>
  {error&&<div role="alert" style={{padding:10,background:'#fff1f1',border:'1px solid #e1b7b7',borderRadius:2,marginBottom:10}}>{error}</div>}
  <section style={{background:'#fff',border:'1px solid #cfe1e7',borderRadius:2,overflow:'auto',boxShadow:'0 1px 3px rgba(18,59,80,.05)'}}>
   {loading?<div style={{padding:40}}>Carregando dados reais…</div>:filtered.length===0?<div style={{padding:50,textAlign:'center'}}><FileText size={28}/><h3>Nenhum registro encontrado</h3><p>Esta tela não cria dados fictícios. Cadastre ou importe registros reais.</p></div>:
   <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{headers(module).map(h=><th key={h[0]} style={th}>{h[1]}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.id}>{headers(module).map(h=><td key={h[0]} style={td}>{formatCell(module,r,h[0])}</td>)}</tr>)}</tbody></table>}
  </section>
  {form&&<div role="dialog" aria-modal="true" style={overlay}><div style={{background:'#fff',width:'min(620px,94vw)',borderRadius:18,padding:24,border:'1px solid #cfe1e7'}}><div style={{display:'flex',justifyContent:'space-between'}}><h2 style={{marginTop:0}}>{module==='financeiro'?'Nova conta a pagar':'Nova expedição'}</h2><button onClick={()=>setForm(false)} style={btn(false)}><X size={18}/></button></div>{module==='financeiro'?<form onSubmit={addFinance} style={formGrid}><Field name="descricao" label="Descrição" required/><Field name="documento" label="Documento"/><Field name="valor" label="Valor" type="number" step="0.01" required/><Field name="vencimento" label="Vencimento" type="date" required/><button style={{...btn(true),gridColumn:'1/-1'}}>Salvar conta</button></form>:<form onSubmit={addExpedicao} style={formGrid}><Field name="numero" label="Número da expedição" type="number" required/><Field name="transportadora" label="Transportadora"/><Field name="rastreio" label="Rastreio"/><Field name="observacoes" label="Observações"/><button style={{...btn(true),gridColumn:'1/-1'}}>Criar expedição</button></form>}</div></div>}
 </main>
}
function Kpi({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:string}){return <article style={{background:'#fff',border:'1px solid #cfe1e7',borderRadius:2,padding:12,display:'flex',gap:10,alignItems:'center'}}><span style={{width:32,height:32,borderRadius:2,display:'grid',placeItems:'center',background:'#e9f6fa',color:'#2D8DB8'}}><Icon size={20}/></span><div><small style={{display:'block',color:'#536B76',fontSize:11}}>{label}</small><strong style={{fontSize:18}}>{value}</strong></div></article>}
function Field({name,label,type='text',required=false,step}:{name:string;label:string;type?:string;required?:boolean;step?:string}){return <label style={{display:'grid',gap:6}}>{label}<input name={name} type={type} required={required} step={step} style={input}/></label>}
function headers(m:Module){return m==='financeiro'?[['descricao','Descrição'],['documento','Documento'],['valor','Valor'],['vencimento','Vencimento'],['pagamento','Pagamento'],['status','Status']] :m==='expedicao'?[['numero','Número'],['status','Status'],['transportadora','Transportadora'],['rastreio','Rastreio'],['data_expedicao','Data'],['observacoes','Observações']]:m==='metrologia'?[['codigo','Código'],['descricao','Descrição'],['status','Status'],['proxima_calibracao','Próxima calibração'],['setor_localizacao','Localização']]:m==='treinamentos'?[['titulo','Treinamento'],['instrutor','Instrutor'],['data','Data'],['carga_horas','Horas'],['status','Status']]:m==='paradas'?[['lado_prensagem','Lado'],['inicio','Início'],['fim','Fim'],['categoria','Categoria'],['motivo','Motivo'],['setup_changeover','Setup']]:m==='refugos'?[['tipo','Tipo'],['quantidade','Quantidade'],['motivo','Motivo'],['custo','Custo'],['created_at','Registro']]:[['auditor','Auditor'],['criterio','Critério'],['data_auditoria','Data'],['resultado','Resultado'],['evidencia','Evidência']]}
function formatCell(m:Module,r:Row,k:string){if(k==='valor')return money(r[k]);if(k.includes('data')||k==='vencimento'||k==='pagamento'||k==='proxima_calibracao')return date(r[k]);const value=r[k];return value==null||value===''?'—':String(value)}
const btn=(primary:boolean):React.CSSProperties=>({border:primary?'0':'1px solid #b9d2da',background:primary?'#2D8DB8':'#fff',color:primary?'#fff':'#123B50',borderRadius:2,minHeight:30,height:30,padding:'0 9px',fontSize:11,fontWeight:700,display:'inline-flex',gap:7,alignItems:'center',cursor:'pointer'})
const input:React.CSSProperties={width:'100%',minHeight:30,height:30,boxSizing:'border-box',border:'1px solid #b9d2da',borderRadius:2,padding:'0 8px',fontSize:11,background:'#fff',color:'#123B50'}
const th:React.CSSProperties={padding:8,textAlign:'left',fontSize:10,letterSpacing:'.04em',borderBottom:'1px solid #dbe8ed',background:'#f4fbfd'}
const td:React.CSSProperties={padding:8,borderBottom:'1px solid #edf3f5'}
const overlay:React.CSSProperties={position:'fixed',inset:0,background:'rgba(18,59,80,.35)',display:'grid',placeItems:'center',zIndex:10000}
const formGrid:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}
