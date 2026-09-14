import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, ClipboardCheck, Gauge, Plus, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Nc={id:string;numero:number|null;numero_rpnc:string|null;origem:string;severidade:string;descricao:string;status:string;quantidade_afetada:number|null;rpn:number|null;empresa_id:string}
type Audit={id:string;codigo:string;tipo:string;norma:string|null;data_planejada:string|null;status:string;empresa_id:string}

type Metric={label:string;value:number;kind:'warning'|'gauge'|'audit'}

export default function QualidadeIndustrial(){
 const[tab,setTab]=useState<'dashboard'|'rpnc'|'auditorias'>('dashboard')
 const[ncs,setNcs]=useState<Nc[]>([]),[audits,setAudits]=useState<Audit[]>([]),[empresaId,setEmpresaId]=useState('')
 const[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[descricao,setDescricao]=useState(''),[origem,setOrigem]=useState('Processo produtivo'),[severidade,setSeveridade]=useState('media'),[saving,setSaving]=useState(false)
 const load=async()=>{setLoading(true);setMessage('');try{
   const{data:tenant,error:tenantError}=await supabase.rpc('erp_current_empresa_id')
   if(tenantError||!tenant)throw new Error('Empresa da sessão não identificada.')
   const id=String(tenant);setEmpresaId(id)
   const[n,a]=await Promise.all([
     supabase.from('erp_nao_conformidades').select('id,numero,numero_rpnc,origem,severidade,descricao,status,quantidade_afetada,rpn,empresa_id').eq('empresa_id',id).is('deleted_at',null).order('created_at',{ascending:false}).limit(200),
     supabase.from('erp_auditorias').select('id,codigo,tipo,norma,data_planejada,status,empresa_id').eq('empresa_id',id).is('deleted_at',null).order('data_planejada',{ascending:false}).limit(100)
   ])
   if(n.error)throw n.error;if(a.error)throw a.error
   setNcs((n.data??[]) as unknown as Nc[]);setAudits((a.data??[]) as unknown as Audit[])
 }catch(e){setMessage(e instanceof Error?e.message:'Falha ao carregar qualidade.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 const metrics:Metric[]=useMemo(()=>[
   {label:'RPNC abertas',value:ncs.filter(n=>n.status!=='encerrada').length,kind:'warning'},
   {label:'RPN crítico ≥200',value:ncs.filter(n=>Number(n.rpn??0)>=200).length,kind:'gauge'},
   {label:'Auditorias pendentes',value:audits.filter(a=>a.status!=='concluida').length,kind:'audit'}
 ],[ncs,audits])
 const createNc=async()=>{if(!descricao.trim()){setMessage('Descreva a não conformidade.');return}if(!empresaId){setMessage('Empresa da sessão não identificada.');return}setSaving(true);setMessage('');try{
   const{error}=await supabase.from('erp_nao_conformidades').insert({empresa_id:empresaId,origem,severidade,descricao:descricao.trim(),status:'aberta',quantidade_afetada:0,numero_rpnc:`RPNC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`})
   if(error)throw error;setDescricao('');setMessage('RPNC registrada no tenant atual.');await load()
 }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível registrar RPNC.')}finally{setSaving(false)}}
 const iconFor=(kind:Metric['kind'])=>kind==='warning'?<TriangleAlert size={22}/>:kind==='gauge'?<Gauge size={22}/>:<ShieldCheck size={22}/>
 return <div className="pcp-page" style={{padding:28,maxWidth:1500,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><button className="secondary-v2" onClick={()=>location.href='/erp-industrial'}><ArrowLeft size={17}/> Voltar</button><span className="v2-eyebrow" style={{display:'block',marginTop:16}}>SGQ • QUALIDADE INDUSTRIAL</span><h1>Centro de Controle da Qualidade</h1><p>RPNC, indicadores e auditorias usando dados reais do Supabase.</p></div><button className="menu-green" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{loading?'Atualizando…':'Atualizar'}</button></div>
  <div style={{display:'flex',gap:8,margin:'20px 0'}}>{[['dashboard','Dashboard'],['rpnc','RPNC'],['auditorias','Auditorias']].map(([id,label])=><button key={id} className={tab===id?'menu-green':'secondary-v2'} onClick={()=>setTab(id as typeof tab)}>{label}</button>)}</div>
  {message&&<div className="notice" style={{marginBottom:12}}>{message}</div>}
  {tab==='dashboard'&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>{metrics.map(metric=><article className="erp-card" key={metric.label} style={{padding:18}}>{iconFor(metric.kind)}<strong style={{display:'block',fontSize:28}}>{metric.value}</strong><span>{metric.label}</span></article>)}</div><section className="erp-card" style={{padding:22,marginTop:16}}><BarChart3/><h2>Indicadores reais</h2><p>{ncs.length===0&&audits.length===0?'Sem dados.':'Indicadores calculados exclusivamente com registros do tenant atual.'}</p></section></>}
  {tab==='rpnc'&&<div style={{display:'grid',gridTemplateColumns:'minmax(320px,500px) 1fr',gap:16}}><section className="erp-card" style={{padding:22}}><ClipboardCheck/><h2>Nova RPNC</h2><label>Origem<select value={origem} onChange={e=>setOrigem(e.target.value)}><option>Processo produtivo</option><option>Inspeção final</option><option>Cliente</option><option>Fornecedor</option><option>Auditoria</option></select></label><label>Severidade<select value={severidade} onChange={e=>setSeveridade(e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label><label>Descrição<textarea rows={6} value={descricao} onChange={e=>setDescricao(e.target.value)}/></label><button className="menu-green" disabled={saving} onClick={()=>void createNc()}><Plus size={17}/> {saving?'Registrando…':'Registrar RPNC'}</button></section><section className="crud-list"><div className="crud-list-head"><strong>RPNCs recentes</strong><span>{ncs.length} registros</span></div>{!ncs.length?<div className="crud-empty">Sem dados.</div>:<div className="crud-table-wrap"><table><thead><tr><th>RPNC</th><th>Origem</th><th>Severidade</th><th>RPN</th><th>Status</th></tr></thead><tbody>{ncs.map(n=><tr key={n.id}><td>{n.numero_rpnc||n.numero||n.id}</td><td>{n.origem}</td><td>{n.severidade}</td><td>{n.rpn??0}</td><td>{n.status}</td></tr>)}</tbody></table></div>}</section></div>}
  {tab==='auditorias'&&<section className="crud-list"><div className="crud-list-head"><strong>Auditorias</strong><span>{audits.length} registros</span></div>{!audits.length?<div className="crud-empty">Sem dados.</div>:<div className="crud-table-wrap"><table><thead><tr><th>Código</th><th>Tipo</th><th>Norma</th><th>Data</th><th>Status</th></tr></thead><tbody>{audits.map(a=><tr key={a.id}><td>{a.codigo}</td><td>{a.tipo}</td><td>{a.norma||'—'}</td><td>{a.data_planejada||'—'}</td><td>{a.status}</td></tr>)}</tbody></table></div>}</section>}
 </div>
}
