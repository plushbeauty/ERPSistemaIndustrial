import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, ClipboardCheck, FileText, Gauge, Plus, RefreshCw, Ruler, Search, ShieldCheck, TriangleAlert, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Rpn={id:string;numero_rpnc:string|null;descricao_nao_conformidade:string|null;acao_corretiva:string|null;status:string|null;criado_em:string|null}
type Audit={id:string;auditor:string|null;criterio:string|null;data_auditoria:string|null;resultado:string|null;evidencia:string|null}
type Inspection={id:string;tipo:string|null;resultado:string|null;quantidade_inspecionada:number|null;quantidade_aprovada:number|null;quantidade_reprovada:number|null;ordem_producao_id:string|null;created_at:string|null}
type QualityDoc={id:string;codigo:string|null;sigla:string|null;titulo:string|null;area:string|null;status:string|null;revisao:number|null;proxima_revisao:string|null}
type GaugeRow={id:string;codigo:string;descricao:string;fabricante:string|null;modelo:string|null;unidade:string|null;status:string|null;proxima_calibracao:string|null}

type Tab='dashboard'|'rpnc'|'inspecoes'|'auditorias'|'documentos'|'medicao'|'planos'|'riai'

export default function QualidadeIndustrial(){
 const [tab,setTab]=useState<Tab>('dashboard')
 const [empresaId,setEmpresaId]=useState('')
 const [rpnc,setRpnc]=useState<Rpn[]>([]),[audits,setAudits]=useState<Audit[]>([]),[inspections,setInspections]=useState<Inspection[]>([])
 const [docs,setDocs]=useState<QualityDoc[]>([]),[gauges,setGauges]=useState<GaugeRow[]>([]),[plans,setPlans]=useState<any[]>([])
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('')
 const [description,setDescription]=useState(''),[action,setAction]=useState('')
 const [search,setSearch]=useState('')

 const load=async()=>{
   setLoading(true);setMessage('')
   try{
     const {data:tenant,error:tenantError}=await supabase.rpc('erp_current_empresa_id')
     if(tenantError||!tenant)throw new Error('Empresa da sessão não identificada.')
     const id=String(tenant);setEmpresaId(id)
     const [r,a,i,d,g,p]=await Promise.all([
       supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,acao_corretiva,status,criado_em').eq('empresa_id',id).order('criado_em',{ascending:false}).limit(200),
       supabase.from('erp_auditorias').select('id,auditor,criterio,data_auditoria,resultado,evidencia').eq('empresa_id',id).order('data_auditoria',{ascending:false}).limit(100),
       supabase.from('erp_inspecoes').select('id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,ordem_producao_id,created_at').eq('empresa_id',id).order('created_at',{ascending:false}).limit(200),
       supabase.from('erp_documentos_qualidade').select('id,codigo,sigla,titulo,area,status,revisao,proxima_revisao').eq('empresa_id',id).order('updated_at',{ascending:false}).limit(200),
       supabase.from('erp_equipamentos_medicao').select('id,codigo,descricao,fabricante,modelo,unidade,status,proxima_calibracao').eq('empresa_id',id).order('codigo').limit(200),
       supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,frequencia,status').eq('empresa_id',id).order('codigo').limit(200)
     ])
     for(const x of [r,a,i,d,g,p])if(x.error)throw x.error
     setRpnc((r.data??[]) as Rpn[]);setAudits((a.data??[]) as Audit[]);setInspections((i.data??[]) as Inspection[])
     setDocs((d.data??[]) as QualityDoc[]);setGauges((g.data??[]) as GaugeRow[]);setPlans(p.data??[])
   }catch(e){setMessage(e instanceof Error?e.message:'Falha ao carregar o centro de qualidade.')}
   finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const metrics=useMemo(()=>({
   open:rpnc.filter(x=>!['encerrada','fechada','concluida','concluído'].includes(String(x.status||'').toLowerCase())).length,
   rejected:inspections.reduce((s,x)=>s+Number(x.quantidade_reprovada||0),0),
   audits:audits.filter(x=>!['concluida','concluído','encerrada'].includes(String(x.resultado||'').toLowerCase())).length,
   calibration:gauges.filter(x=>x.proxima_calibracao&&x.proxima_calibracao<=new Date(Date.now()+30*86400000).toISOString().slice(0,10)).length
 }),[rpnc,inspections,audits,gauges])

 const createRpn=async()=>{
   if(!description.trim()){setMessage('Descreva a não conformidade antes de registrar.');return}
   if(!empresaId)return
   setSaving(true);setMessage('')
   try{
     const {error}=await supabase.from('erp_rpnc').insert({empresa_id:empresaId,numero_rpnc:`RPNC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,descricao_nao_conformidade:description.trim(),acao_corretiva:action.trim()||null,status:'aberta'})
     if(error)throw error
     setDescription('');setAction('');setMessage('RPNC registrada no banco da empresa atual.');await load()
   }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível registrar a RPNC.')}
   finally{setSaving(false)}
 }

 const tabs:[Tab,string,any][]=[
  ['dashboard','Visão geral',BarChart3],['rpnc','RPNC / Não conformidades',TriangleAlert],['inspecoes','Inspeções',ClipboardCheck],
  ['auditorias','Auditorias',Search],['documentos','Controle de Documentos',FileText],['medicao','Equipamentos de Medição',Ruler],
  ['planos','Planos de Inspeção',ShieldCheck],['riai','RIAI / Registros de Inspeção',Gauge]
 ]
 const filtered=(items:any[])=>{const q=search.trim().toLowerCase();return q?items.filter(x=>JSON.stringify(x).toLowerCase().includes(q)):items}

 return <main className="pcp-page quality-center">
   <header className="quality-head">
    <div><button className="secondary-v2" onClick={()=>location.href='/erp-industrial'}><ArrowLeft size={17}/> Voltar ao ERP</button><span className="v2-eyebrow">SGQ • QUALIDADE INDUSTRIAL</span><h1>Centro de Controle da Qualidade</h1><p>Qualidade deixou de ser uma lista: agora cada rotina abre seu próprio espaço operacional, com dados reais do tenant.</p></div>
    <button className="menu-green" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{loading?'Atualizando…':'Atualizar dados'}</button>
   </header>
   <nav className="quality-tabs">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</nav>
   {message&&<div className="notice" style={{marginBottom:12}}>{message}</div>}
   {tab==='dashboard'&&<section>
    <div className="quality-kpis">
      <article><TriangleAlert/><span>RPNC abertas</span><strong>{metrics.open}</strong></article>
      <article><ClipboardCheck/><span>Reprovações em inspeção</span><strong>{metrics.rejected}</strong></article>
      <article><Search/><span>Auditorias pendentes</span><strong>{metrics.audits}</strong></article>
      <article><Ruler/><span>Calibrações ≤ 30 dias</span><strong>{metrics.calibration}</strong></article>
    </div>
    <div className="quality-dashboard-grid">
      <article className="erp-card quality-panel"><header><div><span>CONTROLE DE DOCUMENTOS</span><h2>Documentos da qualidade</h2></div><FileText/></header><strong>{docs.length}</strong><p>Documentos cadastrados no controle de revisões.</p><button className="secondary-v2" onClick={()=>setTab('documentos')}>Abrir controle</button></article>
      <article className="erp-card quality-panel"><header><div><span>EQUIPAMENTOS</span><h2>Instrumentos de medição</h2></div><Ruler/></header><strong>{gauges.length}</strong><p>Equipamentos acompanhados pelo plano de calibração.</p><button className="secondary-v2" onClick={()=>setTab('medicao')}>Abrir equipamentos</button></article>
      <article className="erp-card quality-panel"><header><div><span>INSPEÇÃO</span><h2>Planos e registros</h2></div><ShieldCheck/></header><strong>{plans.length + inspections.length}</strong><p>Planos de inspeção e registros executados.</p><button className="secondary-v2" onClick={()=>setTab('inspecoes')}>Abrir inspeções</button></article>
    </div>
   </section>}
   {tab==='rpnc'&&<section className="quality-split"><article className="erp-card quality-form"><ClipboardCheck/><h2>Nova RPNC</h2><label>Descrição da não conformidade<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} placeholder="Descreva o desvio, requisito ou evidência encontrada."/></label><label>Ação corretiva inicial<textarea value={action} onChange={e=>setAction(e.target.value)} rows={4} placeholder="Ação imediata ou contenção, se aplicável."/></label><button className="menu-green" disabled={saving} onClick={()=>void createRpn()}><Plus size={17}/>{saving?'Registrando…':'Registrar RPNC'}</button></article><QualityTable title="RPNCs recentes" columns={['RPNC','Descrição','Ação','Status']} rows={filtered(rpnc).map(x=>[x.numero_rpnc||x.id,x.descricao_nao_conformidade||'—',x.acao_corretiva||'—',x.status||'—'])}/></section>}
   {tab==='inspecoes'&&<QualityTable title="Inspeções de qualidade" columns={['Tipo','Resultado','Inspecionada','Aprovada','Reprovada','OP']} rows={filtered(inspections).map(x=>[x.tipo||'—',x.resultado||'—',x.quantidade_inspecionada??0,x.quantidade_aprovada??0,x.quantidade_reprovada??0,x.ordem_producao_id||'—'])}/>}
   {tab==='auditorias'&&<QualityTable title="Auditorias" columns={['Auditor','Critério','Data','Resultado','Evidência']} rows={filtered(audits).map(x=>[x.auditor||'—',x.criterio||'—',x.data_auditoria||'—',x.resultado||'—',x.evidencia||'—'])}/>}
   {tab==='documentos'&&<QualityTable title="Controle de Documentos" columns={['Código','Sigla','Título','Área','Status','Revisão','Próxima revisão']} rows={filtered(docs).map(x=>[x.codigo||'—',x.sigla||'—',x.titulo||'—',x.area||'—',x.status||'—',x.revisao??'—',x.proxima_revisao||'—'])}/>}
   {tab==='medicao'&&<QualityTable title="Controle de Equipamentos de Medição" columns={['Código','Descrição','Fabricante','Modelo','Unidade','Status','Próxima calibração']} rows={filtered(gauges).map(x=>[x.codigo,x.descricao,x.fabricante||'—',x.modelo||'—',x.unidade||'—',x.status||'—',x.proxima_calibracao||'—'])}/>}
   {tab==='planos'&&<QualityTable title="Planos de Inspeção" columns={['Código','Característica','Unidade','Frequência','Status']} rows={filtered(plans).map(x=>[x.codigo||'—',x.caracteristica||'—',x.unidade||'—',x.frequencia||'—',x.status||'—'])}/>}
   {tab==='riai'&&<section className="erp-card riai-panel"><Gauge size={30}/><span className="v2-eyebrow">RIAI / REGISTROS DE INSPEÇÃO</span><h2>Registro integrado de inspeção e análise</h2><p>Esta área concentra os registros de inspeção já realizados e permite acompanhar resultado, quantidade aprovada/reprovada e vínculo com OP. Os dados exibidos vêm de <b>erp_inspecoes</b>; não são números inventados.</p><button className="menu-green" onClick={()=>setTab('inspecoes')}>Abrir registros de inspeção</button></section>}
 </main>
}

function QualityTable({title,columns,rows}:{title:string;columns:string[];rows:any[][]}){
 return <section className="crud-list"><div className="crud-list-head"><div><strong>{title}</strong><small>{rows.length} registro(s) encontrados</small></div><span>Supabase • tenant atual</span></div><div className="crud-table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{String(cell??'—')}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={columns.length} className="crud-empty">Nenhum registro encontrado para esta empresa.</td></tr>}</tbody></table></div></section>
}
