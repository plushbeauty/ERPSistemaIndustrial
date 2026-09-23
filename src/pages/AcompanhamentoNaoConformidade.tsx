import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Clock3, FileText,
  Filter, Plus, RefreshCw, Save, Search, ShieldCheck, Target, UserRound, X
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Rpn = {
  id:string
  numero_rpnc:string|null
  descricao_nao_conformidade:string|null
  acao_corretiva:string|null
  status:string|null
}
type Action = {
  id:string
  origem_id:string|null
  what:string
  why:string|null
  where_to:string|null
  when_date:string|null
  who_id:string|null
  how:string|null
  how_much:number|null
  status:string
  eficacia:string|null
}
type User = { id:string; nome:string|null; matricula:string|null }
type Ishikawa = {
  id:string
  rpnc_id:string|null
  efeito:string
  maquina:string|null
  metodo:string|null
  mao_de_obra:string|null
  material:string|null
  medicao:string|null
  meio_ambiente:string|null
  cinco_porques:string|null
}

const CLOSED = ['encerrada','fechada','concluida','concluído','cancelada','cancelado']
const STATUS = ['aberta','em análise','em tratamento','aguardando eficácia','encerrada']
const inputStyle:React.CSSProperties={width:'100%',minHeight:44,boxSizing:'border-box',border:'1px solid #cbd5e1',borderRadius:10,padding:'9px 11px',fontSize:15,background:'#fff',color:'#17333f'}
const card:React.CSSProperties={background:'#fff',border:'1px solid #d7e4e8',borderRadius:16,padding:18,boxShadow:'0 8px 28px rgba(23,51,63,.06)'}

export default function AcompanhamentoNaoConformidade(){
  const [rpnc,setRpnc]=useState<Rpn[]>([])
  const [actions,setActions]=useState<Action[]>([])
  const [users,setUsers]=useState<User[]>([])
  const [ishikawa,setIshikawa]=useState<Ishikawa[]>([])
  const [selected,setSelected]=useState<Rpn|null>(null)
  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('todos')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [showNew,setShowNew]=useState(false)
  const [showAction,setShowAction]=useState(false)
  const [showCause,setShowCause]=useState(false)
  const [newForm,setNewForm]=useState({numero:'',descricao:'',acao:'',status:'aberta'})
  const [actionForm,setActionForm]=useState({what:'',why:'',where_to:'',when_date:'',who_id:'',how:'',how_much:'0'})
  const [causeForm,setCauseForm]=useState({efeito:'',maquina:'',metodo:'',mao_de_obra:'',material:'',medicao:'',meio_ambiente:'',cinco_porques:''})

  const load=async()=>{
    setBusy(true);setError('')
    try{
      const [r,a,u,i]=await Promise.all([
        supabase.from('erp_rpnc').select('id,numero_rpnc,descricao_nao_conformidade,acao_corretiva,status').order('criado_em',{ascending:false}).limit(1000),
        supabase.from('erp_qualidade_acoes').select('id,origem_id,what,why,where_to,when_date,who_id,how,how_much,status,eficacia').eq('origem_tipo','RPNC').order('when_date',{ascending:true}).limit(2000),
        supabase.from('erp_usuarios').select('id,nome,matricula').eq('ativo',true).is('deleted_at',null).order('nome').limit(500),
        supabase.from('erp_qualidade_ishikawa').select('id,rpnc_id,efeito,maquina,metodo,mao_de_obra,material,medicao,meio_ambiente,cinco_porques').order('created_at',{ascending:false}).limit(1000)
      ])
      for(const x of [r,a,u,i]) if(x.error) throw x.error
      setRpnc((r.data||[]) as Rpn[]);setActions((a.data||[]) as Action[]);setUsers((u.data||[]) as User[]);setIshikawa((i.data||[]) as Ishikawa[])
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar o acompanhamento de não conformidades.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[])

  const actionFor=(id:string)=>actions.filter(a=>a.origem_id===id)
  const dueFor=(id:string)=>{
    const dates=actionFor(id).map(a=>a.when_date).filter(Boolean) as string[]
    return dates.sort()[0]||null
  }
  const overdue=(id:string)=>{
    const due=dueFor(id);return !!due && new Date(due+'T23:59:59')<new Date() && !CLOSED.includes(String(selected?.status||'').toLowerCase())
  }
  const metrics=useMemo(()=>{
    const open=rpnc.filter(r=>!CLOSED.includes(String(r.status||'').toLowerCase())).length
    const late=rpnc.filter(r=>{const due=dueFor(r.id);return !!due&&new Date(due+'T23:59:59')<new Date()&&!CLOSED.includes(String(r.status||'').toLowerCase())}).length
    const analysis=rpnc.filter(r=>['em análise','em tratamento','aguardando eficácia'].includes(String(r.status||'').toLowerCase())).length
    const closed=rpnc.length-open
    return {total:rpnc.length,open,late,analysis,closed}
  },[rpnc,actions])

  const visible=useMemo(()=>rpnc.filter(r=>{
    const text=JSON.stringify(r).toLowerCase()
    const q=query.trim().toLowerCase()
    return (!q||text.includes(q))&&(statusFilter==='todos'||String(r.status||'').toLowerCase()===statusFilter)
  }),[rpnc,query,statusFilter])

  const select=(r:Rpn)=>{setSelected(r);setMessage('');setError('')}

  const saveNew=async()=>{
    if(!newForm.descricao.trim()){setError('Informe a descrição objetiva da não conformidade.');return}
    setBusy(true);setError('')
    try{
      const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee||new Error('Empresa da sessão não identificada.')
      const {data,error}=await supabase.from('erp_rpnc').insert({
        empresa_id:String(empresa),
        numero_rpnc:newForm.numero.trim()||'RPNC-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6),
        descricao_nao_conformidade:newForm.descricao.trim(),
        acao_corretiva:newForm.acao.trim()||null,
        status:newForm.status
      }).select('id,numero_rpnc,descricao_nao_conformidade,acao_corretiva,status').single()
      if(error)throw error
      setMessage('Não conformidade registrada no banco real.')
      setShowNew(false);setNewForm({numero:'',descricao:'',acao:'',status:'aberta'});await load();if(data)setSelected(data as Rpn)
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a não conformidade.')}
    finally{setBusy(false)}
  }

  const changeStatus=async(status:string)=>{
    if(!selected)return
    setBusy(true);setError('')
    try{
      const {error}=await supabase.from('erp_rpnc').update({status}).eq('id',selected.id);if(error)throw error
      setSelected({...selected,status});setRpnc(prev=>prev.map(x=>x.id===selected.id?{...x,status}:x));setMessage('Status atualizado.')
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar o status.')}
    finally{setBusy(false)}
  }

  const saveAction=async()=>{
    if(!selected||!actionForm.what.trim()){setError('Informe a ação corretiva.');return}
    setBusy(true);setError('')
    try{
      const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee||new Error('Empresa da sessão não identificada.')
      const {error}=await supabase.from('erp_qualidade_acoes').insert({
        empresa_id:String(empresa),origem_tipo:'RPNC',origem_id:selected.id,
        what:actionForm.what.trim(),why:actionForm.why.trim()||null,where_to:actionForm.where_to.trim()||null,
        when_date:actionForm.when_date||null,who_id:actionForm.who_id||null,how:actionForm.how.trim()||null,
        how_much:Number(actionForm.how_much||0),status:'aberta'
      });if(error)throw error
      setMessage('Ação corretiva adicionada ao plano de acompanhamento.')
      setShowAction(false);setActionForm({what:'',why:'',where_to:'',when_date:'',who_id:'',how:'',how_much:'0'});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a ação corretiva.')}
    finally{setBusy(false)}
  }

  const saveCause=async()=>{
    if(!selected||!causeForm.efeito.trim()){setError('Informe o efeito/problema analisado.');return}
    setBusy(true);setError('')
    try{
      const {data:empresa,error:ee}=await supabase.rpc('erp_current_empresa_id');if(ee||!empresa)throw ee||new Error('Empresa da sessão não identificada.')
      const {error}=await supabase.from('erp_qualidade_ishikawa').insert({
        empresa_id:String(empresa),rpnc_id:selected.id,efeito:causeForm.efeito.trim(),
        maquina:causeForm.maquina.trim()||null,metodo:causeForm.metodo.trim()||null,mao_de_obra:causeForm.mao_de_obra.trim()||null,
        material:causeForm.material.trim()||null,medicao:causeForm.medicao.trim()||null,meio_ambiente:causeForm.meio_ambiente.trim()||null,
        cinco_porques:causeForm.cinco_porques.trim()||null
      });if(error)throw error
      setMessage('Análise de causa registrada.')
      setShowCause(false);setCauseForm({efeito:'',maquina:'',metodo:'',mao_de_obra:'',material:'',medicao:'',meio_ambiente:'',cinco_porques:''});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a análise de causa.')}
    finally{setBusy(false)}
  }

  const updateAction=async(id:string,status:string)=>{
    setBusy(true);setError('')
    try{const{error}=await supabase.from('erp_qualidade_acoes').update({status}).eq('id',id);if(error)throw error;setActions(prev=>prev.map(a=>a.id===id?{...a,status}:a));setMessage('Ação atualizada.')}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar a ação.')}finally{setBusy(false)}
  }

  const selectedActions=selected?actionFor(selected.id):[]
  const selectedCauses=selected?ishikawa.filter(x=>x.rpnc_id===selected.id):[]

  return <main style={{minHeight:'calc(100vh - 82px)',background:'#f4f8f9',padding:'24px 24px 48px',color:'#17333f'}}>
    <div style={{maxWidth:1800,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:18,flexWrap:'wrap'}}>
        <div>
          <button type="button" onClick={()=>location.href='/qualidade'} style={{border:'1px solid #cbdde3',background:'#fff',borderRadius:10,padding:'9px 13px',display:'inline-flex',alignItems:'center',gap:7,cursor:'pointer',fontWeight:800,color:'#31525f'}}><ArrowLeft size={17}/> Qualidade</button>
          <div style={{fontSize:12,fontWeight:900,letterSpacing:'.12em',color:'#17736f',marginTop:15}}>SGQ • CONTROLE E ACOMPANHAMENTO</div>
          <h1 style={{margin:'5px 0 4px',fontSize:32}}>Acompanhamento de Não Conformidade</h1>
          <p style={{margin:0,color:'#617783',fontSize:15}}>Registro, análise de causa, plano de ação, prazo, execução e verificação da eficácia — sem planilha paralela.</p>
        </div>
        <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}>
          <button type="button" onClick={()=>void load()} disabled={busy} style={{...inputStyle,width:'auto',display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:800}}><RefreshCw size={16}/>{busy?'Atualizando…':'Atualizar'}</button>
          <button type="button" onClick={()=>setShowNew(true)} style={{minHeight:44,border:0,borderRadius:10,padding:'0 15px',display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',fontWeight:900,background:'#0f766e',color:'#fff'}}><Plus size={17}/> Nova não conformidade</button>
        </div>
      </header>

      {(message||error)&&<div role="alert" style={{...card,marginBottom:16,borderColor:error?'#e6b7b7':'#b7ddd5',background:error?'#fff7f7':'#f3fbf9',color:error?'#9f2d2d':'#17675f'}}>{error||message}</div>}

      <section style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(150px,1fr))',gap:12,marginBottom:16}}>
        <Metric icon={FileText} label="Total" value={metrics.total}/>
        <Metric icon={AlertTriangle} label="Em aberto" value={metrics.open}/>
        <Metric icon={Clock3} label="Em atraso" value={metrics.late}/>
        <Metric icon={Target} label="Em tratamento" value={metrics.analysis}/>
        <Metric icon={CheckCircle2} label="Encerradas" value={metrics.closed}/>
      </section>

      <section style={{...card,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:'1 1 320px'}}><Search size={17} style={{position:'absolute',left:12,top:13,color:'#78909c'}}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar número, descrição, ação..." style={{...inputStyle,paddingLeft:38}}/></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}><Filter size={17}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inputStyle,width:220}}><option value="todos">Todos os status</option>{STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      </section>

      <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(390px,.85fr)',gap:16,alignItems:'start'}}>
        <div style={{...card,padding:0,overflow:'hidden'}}>
          <div style={{padding:'15px 18px',borderBottom:'1px solid #dfe9ec',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><strong>Registro de não conformidades</strong><div style={{fontSize:12,color:'#6b7f88',marginTop:3}}>{visible.length} ocorrência(s) encontrada(s)</div></div><ShieldCheck size={19} color="#17736f"/></div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead><tr>{['RPNC','Não conformidade','Status','Prazo','Ações','Acompanhamento'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 13px',background:'#f7fafb',borderBottom:'1px solid #dfe9ec',fontSize:11,letterSpacing:'.06em',textTransform:'uppercase',color:'#5c717b'}}>{h}</th>)}</tr></thead>
              <tbody>{visible.map(r=>{
                const acts=actionFor(r.id),due=dueFor(r.id),late=!!due&&new Date(due+'T23:59:59')<new Date()&&!CLOSED.includes(String(r.status||'').toLowerCase())
                return <tr key={r.id} onClick={()=>select(r)} style={{cursor:'pointer',background:selected?.id===r.id?'#eef9f7':'#fff'}}>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4',fontWeight:900,whiteSpace:'nowrap'}}>{r.numero_rpnc||r.id.slice(0,8)}</td>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4',minWidth:280}}><div style={{fontWeight:800}}>{r.descricao_nao_conformidade||'Sem descrição'}</div><small style={{color:'#748892'}}>Clique para abrir o acompanhamento</small></td>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4'}}><StatusPill status={r.status||'aberta'}/></td>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4',whiteSpace:'nowrap',color:late?'#a22b2b':'#536a75',fontWeight:late?900:600}}>{due||'—'}{late&&<span style={{display:'block',fontSize:11}}>ATRASADO</span>}</td>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4',textAlign:'center',fontWeight:900}}>{acts.length}</td>
                  <td style={{padding:'13px',borderBottom:'1px solid #edf2f4'}}><Progress actions={acts}/></td>
                </tr>
              })}{!visible.length&&<tr><td colSpan={6} style={{padding:36,textAlign:'center',color:'#6f838c'}}>Nenhuma não conformidade encontrada.</td></tr>}</tbody>
            </table>
          </div>
        </div>

        <aside style={{...card,minHeight:500}}>
          {!selected?<EmptyDetail/>:<>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',borderBottom:'1px solid #e2eaed',paddingBottom:14}}>
              <div><div style={{fontSize:11,fontWeight:900,letterSpacing:'.08em',color:'#17736f'}}>ACOMPANHAMENTO</div><h2 style={{margin:'4px 0',fontSize:22}}>{selected.numero_rpnc||'RPNC sem número'}</h2><div style={{color:'#617783',fontSize:13}}>{selected.descricao_nao_conformidade||'Sem descrição'}</div></div><button type="button" onClick={()=>setSelected(null)} style={{border:0,background:'transparent',cursor:'pointer'}}><X size={19}/></button>
            </div>
            <label style={{display:'block',marginTop:14,fontSize:12,fontWeight:900,color:'#536b76'}}>STATUS<select value={selected.status||'aberta'} onChange={e=>void changeStatus(e.target.value)} style={{...inputStyle,marginTop:5}}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
              <button type="button" onClick={()=>setShowAction(true)} style={detailButton}><Plus size={16}/> Adicionar ação</button>
              <button type="button" onClick={()=>setShowCause(true)} style={detailButton}><Target size={16}/> Analisar causa</button>
            </div>

            <section style={{marginTop:18}}>
              <div style={sectionTitle}>PLANO DE AÇÃO CORRETIVA <span>{selectedActions.length}</span></div>
              {!selectedActions.length?<div style={emptyBox}>Nenhuma ação cadastrada. Registre o que será feito, responsável e prazo.</div>:selectedActions.map(a=><div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid #e7edef'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{a.what}</strong><select value={a.status} onChange={e=>void updateAction(a.id,e.target.value)} style={{border:'1px solid #cbdde3',borderRadius:8,padding:'4px 7px',fontSize:12}}><option>aberta</option><option>em execução</option><option>concluída</option><option>cancelada</option></select></div>
                <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:6,fontSize:12,color:'#617783'}}>{a.who_id&&<span><UserRound size={13}/> {users.find(u=>u.id===a.who_id)?.nome||'Responsável'}</span>}{a.when_date&&<span><Clock3 size={13}/> {a.when_date}</span>}{a.where_to&&<span>Local: {a.where_to}</span>}{a.how_much? <span>Custo: R$ {Number(a.how_much).toFixed(2).replace('.',',')}</span>:null}</div>
                {a.why&&<div style={{marginTop:6,fontSize:13,color:'#536a75'}}><b>Por quê:</b> {a.why}</div>}
                {a.how&&<div style={{marginTop:4,fontSize:13,color:'#536a75'}}><b>Como:</b> {a.how}</div>}
                {a.eficacia&&<div style={{marginTop:6,fontSize:13,color:'#17675f'}}><b>Eficácia:</b> {a.eficacia}</div>}
              </div>)}
            </section>

            <section style={{marginTop:18}}>
              <div style={sectionTitle}>ANÁLISE DE CAUSA / ISHIKAWA <span>{selectedCauses.length}</span></div>
              {!selectedCauses.length?<div style={emptyBox}>Nenhuma análise de causa registrada.</div>:selectedCauses.map(c=><div key={c.id} style={{background:'#f7fafb',border:'1px solid #e0e9ec',borderRadius:10,padding:12,marginTop:8}}>
                <strong>{c.efeito}</strong>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:8,fontSize:12,color:'#5e747e'}}>{[['Máquina',c.maquina],['Método',c.metodo],['Mão de obra',c.mao_de_obra],['Material',c.material],['Medição',c.medicao],['Meio ambiente',c.meio_ambiente]].map(([k,v])=>v?<div key={k}><b>{k}:</b> {v}</div>:null)}</div>
                {c.cinco_porques&&<div style={{marginTop:8,fontSize:13}}><b>5 Porquês:</b><div style={{whiteSpace:'pre-wrap',color:'#536a75',marginTop:3}}>{c.cinco_porques}</div></div>}
              </div>)}
            </section>

            <section style={{marginTop:18,paddingTop:14,borderTop:'1px solid #e2eaed'}}>
              <div style={sectionTitle}>VERIFICAÇÃO DE EFICÁCIA</div>
              <p style={{margin:'7px 0 0',fontSize:13,color:'#617783'}}>A ação só deve ser encerrada depois de registrar evidência e confirmar que a causa foi tratada. O campo de eficácia fica vinculado ao plano de ação.</p>
              <button type="button" onClick={()=>setMessage('Para registrar a eficácia, abra a ação correspondente e utilize o fluxo de conclusão do plano.')} style={{...detailButton,width:'100%',marginTop:9}}><ClipboardCheck size={16}/> Verificar eficácia</button>
            </section>
          </>}
        </aside>
      </section>
    </div>

    {showNew&&<Modal title="Nova não conformidade" close={()=>setShowNew(false)}>
      <Field label="Número RPNC (opcional — o sistema gera se vazio)"><input value={newForm.numero} onChange={e=>setNewForm({...newForm,numero:e.target.value})} style={inputStyle}/></Field>
      <Field label="Descrição objetiva da não conformidade *"><textarea value={newForm.descricao} onChange={e=>setNewForm({...newForm,descricao:e.target.value})} style={{...inputStyle,minHeight:100,resize:'vertical'}}/></Field>
      <Field label="Ação corretiva inicial"><textarea value={newForm.acao} onChange={e=>setNewForm({...newForm,acao:e.target.value})} style={{...inputStyle,minHeight:85,resize:'vertical'}}/></Field>
      <Field label="Status"><select value={newForm.status} onChange={e=>setNewForm({...newForm,status:e.target.value})} style={inputStyle}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></Field>
      <ModalActions cancel={()=>setShowNew(false)} save={()=>void saveNew()} busy={busy}/>
    </Modal>}

    {showAction&&<Modal title={'Plano de ação • '+(selected?.numero_rpnc||'RPNC')} close={()=>setShowAction(false)}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Field label="O quê? *"><input value={actionForm.what} onChange={e=>setActionForm({...actionForm,what:e.target.value})} style={inputStyle}/></Field>
        <Field label="Por quê?"><input value={actionForm.why} onChange={e=>setActionForm({...actionForm,why:e.target.value})} style={inputStyle}/></Field>
        <Field label="Onde?"><input value={actionForm.where_to} onChange={e=>setActionForm({...actionForm,where_to:e.target.value})} style={inputStyle}/></Field>
        <Field label="Quando?"><input type="date" value={actionForm.when_date} onChange={e=>setActionForm({...actionForm,when_date:e.target.value})} style={inputStyle}/></Field>
        <Field label="Quem?"><select value={actionForm.who_id} onChange={e=>setActionForm({...actionForm,who_id:e.target.value})} style={inputStyle}><option value="">Selecionar responsável</option>{users.map(u=><option key={u.id} value={u.id}>{u.nome||u.matricula||u.id.slice(0,8)}</option>)}</select></Field>
        <Field label="Quanto? (R$)"><input type="number" min="0" step="0.01" value={actionForm.how_much} onChange={e=>setActionForm({...actionForm,how_much:e.target.value})} style={inputStyle}/></Field>
      </div>
      <Field label="Como?"><textarea value={actionForm.how} onChange={e=>setActionForm({...actionForm,how:e.target.value})} style={{...inputStyle,minHeight:90,resize:'vertical'}}/></Field>
      <ModalActions cancel={()=>setShowAction(false)} save={()=>void saveAction()} busy={busy}/>
    </Modal>}

    {showCause&&<Modal title={'Análise de causa • '+(selected?.numero_rpnc||'RPNC')} close={()=>setShowCause(false)}>
      <Field label="Efeito / problema *"><textarea value={causeForm.efeito} onChange={e=>setCauseForm({...causeForm,efeito:e.target.value})} style={{...inputStyle,minHeight:80,resize:'vertical'}}/></Field>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {(['maquina','metodo','mao_de_obra','material','medicao','meio_ambiente'] as const).map(k=><Field key={k} label={k.replace('_',' ')}><input value={causeForm[k]} onChange={e=>setCauseForm({...causeForm,[k]:e.target.value})} style={inputStyle}/></Field>)}
      </div>
      <Field label="5 Porquês / causa raiz"><textarea value={causeForm.cinco_porques} onChange={e=>setCauseForm({...causeForm,cinco_porques:e.target.value})} placeholder={'1º Por quê?\n2º Por quê?\n3º Por quê?\n4º Por quê?\n5º Por quê? / Causa raiz'} style={{...inputStyle,minHeight:140,resize:'vertical'}}/></Field>
      <ModalActions cancel={()=>setShowCause(false)} save={()=>void saveCause()} busy={busy}/>
    </Modal>}
  </main>
}

function Metric({icon:Icon,label,value}:{icon:typeof AlertTriangle;label:string;value:number}){return <article style={{...card,display:'flex',alignItems:'center',gap:12,padding:15}}><span style={{width:38,height:38,borderRadius:10,background:'#edf7f6',display:'grid',placeItems:'center',color:'#0f766e'}}><Icon size={19}/></span><div><div style={{fontSize:12,color:'#687d87',fontWeight:800}}>{label}</div><strong style={{fontSize:25}}>{value}</strong></div></article>}
function StatusPill({status}:{status:string}){const s=status.toLowerCase();const bg=CLOSED.includes(s)?'#eaf6ef':s.includes('atras')?'#fff0f0':s.includes('análise')||s.includes('tratamento')?'#fff7e8':'#eef6fa';const color=CLOSED.includes(s)?'#18704a':s.includes('atras')?'#a32e2e':s.includes('análise')||s.includes('tratamento')?'#98600a':'#286273';return <span style={{display:'inline-flex',padding:'5px 8px',borderRadius:999,background:bg,color,fontWeight:900,fontSize:11,whiteSpace:'nowrap'}}>{status}</span>}
function Progress({actions}:{actions:Action[]}){if(!actions.length)return <span style={{fontSize:12,color:'#82949c'}}>Sem plano</span>;const done=actions.filter(a=>['concluída','concluida','encerrada'].includes(a.status.toLowerCase())).length;return <div style={{minWidth:100}}><div style={{height:7,borderRadius:99,background:'#e7eff1',overflow:'hidden'}}><i style={{display:'block',height:'100%',width:(done/actions.length*100)+'%',background:'#23856f'}}/></div><small style={{color:'#607782'}}>{done}/{actions.length} concluída(s)</small></div>}
function EmptyDetail(){return <div style={{minHeight:480,display:'grid',placeItems:'center',textAlign:'center',color:'#6a808a'}}><div><ShieldCheck size={42} color="#8bb7b0"/><h3 style={{color:'#365460'}}>Selecione uma não conformidade</h3><p>O acompanhamento abre aqui com status, prazos, ações corretivas e análise de causa.</p></div></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:'block',fontSize:12,fontWeight:900,color:'#536b76',marginTop:11}}>{label}<div style={{marginTop:5}}>{children}</div></label>}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){return <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(15,38,47,.48)',display:'grid',placeItems:'center',padding:20}}><section style={{background:'#fff',width:'min(900px,100%)',maxHeight:'92vh',overflow:'auto',borderRadius:16,boxShadow:'0 25px 80px rgba(0,0,0,.25)',padding:22}}><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><span style={{fontSize:11,fontWeight:900,letterSpacing:'.08em',color:'#17736f'}}>SGQ • FORMULÁRIO</span><h2 style={{margin:'5px 0 0'}}>{title}</h2></div><button type="button" onClick={close} style={{border:0,background:'transparent',cursor:'pointer'}}><X size={21}/></button></header>{children}</section></div>}
function ModalActions({cancel,save,busy}:{cancel:()=>void;save:()=>void;busy:boolean}){return <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><button type="button" onClick={cancel} style={{minHeight:42,border:'1px solid #cbdde3',background:'#fff',borderRadius:9,padding:'0 14px',cursor:'pointer',fontWeight:800}}>Cancelar</button><button type="button" onClick={save} disabled={busy} style={{minHeight:42,border:0,background:'#0f766e',color:'#fff',borderRadius:9,padding:'0 15px',cursor:'pointer',fontWeight:900,display:'inline-flex',alignItems:'center',gap:7}}><Save size={16}/>{busy?'Salvando…':'Salvar'}</button></div>}
const detailButton:React.CSSProperties={minHeight:42,border:'1px solid #bcd4d9',background:'#f8fbfc',borderRadius:9,padding:'0 10px',cursor:'pointer',fontWeight:900,color:'#275662',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}
const sectionTitle:React.CSSProperties={fontSize:11,fontWeight:950,letterSpacing:'.07em',color:'#536b76',display:'flex',justifyContent:'space-between'}
const emptyBox:React.CSSProperties={marginTop:8,padding:12,borderRadius:10,background:'#f7fafb',border:'1px dashed #cbdde3',color:'#70858e',fontSize:13}
