import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Status='rascunho'|'em_analise'|'aprovado'|'liberado'|'obsoleto'
type Product={id:string;codigo:string;nome:string}
type Operation={id:string;sequencia:number;operacao:string;parametro_nominal:string;tolerancia_min:string;tolerancia_max:string;unidade:string;instrumento:string;criterio_aceitacao:string;observacoes:string}
type Form={id:string;codigo:string;versao:string;titulo:string;descricao:string;status:Status;produto_id:string;observacoes:string}

const emptyOp=():Operation=>({id:crypto.randomUUID(),sequencia:1,operacao:'',parametro_nominal:'',tolerancia_min:'',tolerancia_max:'',unidade:'mm',instrumento:'Paquímetro',criterio_aceitacao:'',observacoes:''})
const emptyForm:Form={id:'',codigo:'',versao:'1',titulo:'',descricao:'',status:'rascunho',produto_id:'',observacoes:''}

function Field({label,value,onChange,className='',type='text'}:{label:string;value:string;onChange:(v:string)=>void;className?:string;type?:string}){return <label className={className}><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}

export default function FichasProcesso(){
 const [form,setForm]=useState<Form>(emptyForm),[ops,setOps]=useState<Operation[]>([emptyOp()]),[products,setProducts]=useState<Product[]>([]),[fichas,setFichas]=useState<Form[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{void load()},[])
 async function load(){
  setError('')
  try{
   const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw new Error('Sessão não localizada.')
   const profile=await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id',auth.data.user.id).eq('ativo',true).maybeSingle()
   if(profile.error||!profile.data?.empresa_id)throw new Error(profile.error?.message||'Empresa não localizada.')
   const empresaId=String(profile.data.empresa_id)
      const [p,f]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',empresaId).eq('ativo',true).order('nome').limit(500),
    supabase.from('erp_fichas_tecnicas').select('id,codigo,versao,titulo,descricao,status,produto_id,observacoes').eq('empresa_id',empresaId).order('codigo').order('versao',{ascending:false}).limit(500)
   ])
   if(p.error)throw p.error;if(f.error)throw f.error;setProducts((p.data??[]) as Product[]);setFichas((f.data??[]) as Form[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar fichas de processo.')}
 }
 function update<K extends keyof Form>(k:K,v:Form[K]){setForm(x=>({...x,[k]:v}));setMessage('');setError('')}
 function updateOp(id:string,k:keyof Operation,v:string){setOps(xs=>xs.map(x=>x.id===id?{...x,[k]:v}:x))}
 async function save(statusOverride?:Status){
  setBusy(true);setError('');setMessage('')
  try{
   const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw new Error('Sessão não localizada.')
   const profile=await supabase.from('erp_usuarios').select('id,empresa_id').eq('auth_user_id',auth.data.user.id).eq('ativo',true).maybeSingle()
   if(profile.error||!profile.data?.empresa_id)throw new Error(profile.error?.message||'Empresa não localizada.')
   const profileData=profile.data
   const usuarioId=String(profileData.id??'')
   if(!form.codigo.trim()||!form.titulo.trim())throw new Error('Código e título são obrigatórios.')
   const payload={empresa_id:String(profileData.empresa_id),produto_id:form.produto_id||null,codigo:form.codigo.trim(),versao:Number(form.versao)||1,revisao:form.versao,titulo:form.titulo.trim(),descricao:form.descricao.trim()||null,status:statusOverride ?? form.status,observacoes:form.observacoes.trim()||null,updated_at:new Date().toISOString()}
   const saved=form.id?await supabase.from('erp_fichas_tecnicas').update(payload).eq('id',form.id).select('id').single():await supabase.from('erp_fichas_tecnicas').insert(payload).select('id').single()
   if(saved.error||!saved.data)throw new Error(saved.error?.message||'Falha ao gravar ficha.')
   const id=String(saved.data.id);await supabase.from('erp_ficha_operacoes').delete().eq('ficha_id',id)
   const rows=ops.filter(o=>o.operacao.trim()).map((o,i)=>({empresa_id:String(profile.data.empresa_id),ficha_id:id,sequencia:i+1,operacao:o.operacao.trim(),parametro_nominal:o.parametro_nominal||null,tolerancia_min:o.tolerancia_min||null,tolerancia_max:o.tolerancia_max||null,unidade:o.unidade||null,instrumento:o.instrumento||null,criterio_aceitacao:o.criterio_aceitacao||null,observacoes:o.observacoes||null}))
   const inserted=rows.length?await supabase.from('erp_ficha_operacoes').insert(rows):{error:null}
   if(inserted.error)throw inserted.error
   await supabase.from('erp_logs_sistema').insert({empresa_id:String(profile.data.empresa_id),usuario_id:usuarioId,modulo:'Engenharia',acao:'FICHA_PROCESSO_SALVA',entidade:'erp_fichas_tecnicas',entidade_id:id,dados:{status:statusOverride ?? form.status,operacoes:rows.length}})
   setForm({...form,id,status:statusOverride ?? form.status});setMessage('Ficha de processo gravada no Supabase.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao gravar ficha.')}finally{setBusy(false)}
 }
 async function open(id:string){
  const f=fichas.find(x=>x.id===id);if(!f)return
  const r=await supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,parametro_nominal,tolerancia_min,tolerancia_max,unidade,instrumento,criterio_aceitacao,observacoes').eq('ficha_id',id).order('sequencia')
  if(r.error){setError(r.error.message);return}
  setForm(f);setOps((r.data??[]).map(x=>({...x,parametro_nominal:String(x.parametro_nominal??''),tolerancia_min:String(x.tolerancia_min??''),tolerancia_max:String(x.tolerancia_max??''),unidade:String(x.unidade??''),instrumento:String(x.instrumento??''),criterio_aceitacao:String(x.criterio_aceitacao??''),observacoes:String(x.observacoes??'')}))||[emptyOp()])
 }
 const nextStatus:Record<Status,Status|undefined>={rascunho:'em_analise',em_analise:'aprovado',aprovado:'liberado',liberado:undefined,obsoleto:undefined}
 async function advance(){if(!form.id)return;const status=nextStatus[form.status];if(!status)return;setForm(x=>({...x,status}));await save(status)}
 return <main className="ficha-page"><header><div><span>ENGENHARIA • FICHAS DE PROCESSO</span><h1>Fichas de Processo</h1><p>Parâmetros nominais, tolerâncias, instrumentos e aprovação controlada.</p></div><button onClick={()=>void save()} disabled={busy}>{busy?'Gravando…':'Gravar ficha'}</button></header>
 {error&&<div className="alert error">{error}</div>}{message&&<div className="alert ok">{message}</div>}
 <section className="layout"><aside><div className="side-head"><strong>Fichas cadastradas</strong><button onClick={()=>{setForm(emptyForm);setOps([emptyOp()])}}>Nova</button></div>{fichas.map(f=><button className="ficha-row" key={f.id} onClick={()=>void open(f.id)}><b>{f.codigo} v{f.versao}</b><span>{f.titulo}</span><em>{f.status.replace('_',' ')}</em></button>)}</aside>
 <section className="editor"><div className="grid"><Field label="código" value={form.codigo} onChange={v=>update('codigo',v)} className="c100"/><Field label="versão" value={form.versao} onChange={v=>update('versao',v.replace(/\D/g,''))} className="c70" type="number"/><Field label="título" value={form.titulo} onChange={v=>update('titulo',v)} className="wide"/><label><span>produto</span><select value={form.produto_id} onChange={e=>update('produto_id',e.target.value)}><option value="">Selecionar</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo||p.id.slice(0,8)} — {p.nome}</option>)}</select></label><label><span>status</span><select value={form.status} onChange={e=>update('status',e.target.value as Status)}><option value="rascunho">Rascunho</option><option value="em_analise">Em Análise</option><option value="aprovado">Aprovado</option><option value="liberado">Liberado</option><option value="obsoleto">Obsoleto</option></select></label></div>
 <div className="workflow"><span className={form.status==='rascunho'?'active':''}>Rascunho</span><i>→</i><span className={form.status==='em_analise'?'active':''}>Em Análise</span><i>→</i><span className={form.status==='aprovado'?'active':''}>Aprovado</span><i>→</i><span className={form.status==='liberado'?'active':''}>Liberado</span>{nextStatus[form.status]&&<button onClick={()=>void advance()}>Avançar etapa</button>}</div>
 <div className="ops-head"><div><h2>Operações e parâmetros</h2><p>Use instrumentos físicos do processo: paquímetro, micrômetro ou outro instrumento controlado.</p></div><button onClick={()=>setOps(xs=>[...xs,{...emptyOp(),sequencia:xs.length+1}])}>+ Operação</button></div>
 <div className="table-wrap"><table><thead><tr><th>seq.</th><th>operação</th><th>nominal</th><th>mín.</th><th>máx.</th><th>un.</th><th>instrumento</th><th>critério de aceitação</th><th/></tr></thead><tbody>{ops.map((o,i)=><tr key={o.id}><td>{i+1}</td><td><input value={o.operacao} onChange={e=>updateOp(o.id,'operacao',e.target.value)}/></td><td><input inputMode="decimal" value={o.parametro_nominal} onChange={e=>updateOp(o.id,'parametro_nominal',e.target.value)}/></td><td><input inputMode="decimal" value={o.tolerancia_min} onChange={e=>updateOp(o.id,'tolerancia_min',e.target.value)}/></td><td><input inputMode="decimal" value={o.tolerancia_max} onChange={e=>updateOp(o.id,'tolerancia_max',e.target.value)}/></td><td><input value={o.unidade} onChange={e=>updateOp(o.id,'unidade',e.target.value)}/></td><td><select value={o.instrumento} onChange={e=>updateOp(o.id,'instrumento',e.target.value)}><option>Paquímetro</option><option>Micrômetro</option><option>Relógio comparador</option><option>Balança</option><option>Outro</option></select></td><td><input value={o.criterio_aceitacao} onChange={e=>updateOp(o.id,'criterio_aceitacao',e.target.value)}/></td><td><button onClick={()=>setOps(xs=>xs.length===1?xs:xs.filter(x=>x.id!==o.id))}>×</button></td></tr>)}</tbody></table></div></section></section>
 <style>{`.ficha-page{min-height:100vh;background:#F4FBFD;color:#123B50;padding:18px 24px;font-family:Inter,Roboto,Arial,sans-serif}.ficha-page header{display:flex;justify-content:space-between;align-items:flex-start;background:#123B50;color:#fff;padding:17px 18px;border-radius:10px;margin-bottom:10px}.ficha-page header span{color:#48B7C7;font-size:10px;font-weight:950;letter-spacing:.12em}.ficha-page h1{margin:4px 0;font-size:24px}.ficha-page p{margin:3px 0;color:#CFE4E9;font-size:11px}.ficha-page header button,.ops-head button,.side-head button,.workflow button{background:#2D8DB8;color:#fff;border:0;border-radius:6px;padding:9px 12px;font-weight:900;cursor:pointer}.alert{padding:9px 11px;border-radius:7px;margin-bottom:9px;font-size:12px;font-weight:800}.error{background:#FCEBEC;color:#8B3038;border:1px solid #E6B1B5}.ok{background:#E8F7F1;color:#176C4E;border:1px solid #A9D9C3}.layout{display:grid;grid-template-columns:270px 1fr;gap:10px}.layout>aside,.editor{background:#fff;border:1px solid #D4E4EA;border-radius:9px}.side-head,.ops-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px;border-bottom:1px solid #D4E4EA}.ficha-row{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #E4EDF0;background:#fff;padding:9px 11px;cursor:pointer;color:#123B50}.ficha-row:hover{background:#F4FBFD}.ficha-row b,.ficha-row span,.ficha-row em{display:block}.ficha-row b{font-size:11px}.ficha-row span{font-size:11px;margin-top:2px}.ficha-row em{font-size:9px;color:#58717C;text-transform:uppercase;margin-top:3px}.editor{padding:12px}.grid{display:grid;grid-template-columns:100px 70px minmax(300px,1fr) 220px 130px;gap:9px;margin-bottom:12px}.grid label{min-width:0}.grid label span,.table-wrap th{display:block;font-size:9px;text-transform:uppercase;font-weight:950;color:#58717C;margin-bottom:3px}.grid input,.grid select{width:100%;box-sizing:border-box;height:34px;border:1px solid #B9D2DA;border-radius:5px;padding:6px 8px;color:#123B50;background:#FAFDFE}.workflow{display:flex;align-items:center;gap:7px;background:#F4FBFD;border:1px solid #D4E4EA;padding:9px;border-radius:7px;margin-bottom:12px}.workflow span{padding:5px 8px;border-radius:5px;background:#E7EEF0;font-size:10px;font-weight:900}.workflow span.active{background:#48B7C7;color:#123B50}.workflow i{font-style:normal;color:#78909A}.workflow button{margin-left:auto}.ops-head h2{font-size:16px;margin:0}.ops-head p{color:#667D87!important}.table-wrap{overflow:auto}.table-wrap table{width:100%;min-width:1100px;border-collapse:collapse}.table-wrap th{background:#123B50;color:#fff;text-align:left;padding:7px}.table-wrap td{border-bottom:1px solid #E1ECEF;padding:4px}.table-wrap input,.table-wrap select{width:100%;box-sizing:border-box;height:30px;border:1px solid #C5D9DF;border-radius:4px;padding:4px 6px;font-size:11px}.table-wrap td:last-child button{border:0;background:#FCEBEC;color:#9D3039;border-radius:4px;width:26px;height:26px}@media(max-width:900px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}.grid .wide{grid-column:span 2}}@media(max-width:600px){.ficha-page{padding:10px}.ficha-page header{flex-direction:column;gap:10px}.grid{grid-template-columns:1fr}.grid .wide{grid-column:auto}.workflow{flex-wrap:wrap}}`}</style></main>
}