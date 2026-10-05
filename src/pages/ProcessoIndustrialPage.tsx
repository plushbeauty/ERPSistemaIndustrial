import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Factory, Gauge, Hammer, Layers3, Plus, RefreshCw, Save, ShieldCheck, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type ProcessType = 'INJECAO'|'PRENSADOS'|'ESTAMPARIA'|'FERRAMENTARIA'|'EXTRUSAO'|'USINAGEM'|'SOLDAGEM'|'MONTAGEM'|'CORTE'|'PINTURA'
type ProcessRow = { id:string; codigo:string; nome:string; tipo:ProcessType; descricao:string|null; capacidade_hora:number|null; setup_padrao_min:number; ciclo_padrao_seg:number|null; ativo:boolean }
type ToolRow = { id:string; codigo:string; nome:string; tipo:string; numero_cavidades:number|null; vida_ciclos:number|null; ciclos_realizados:number; status:string; revisao:string|null; ativo:boolean }
type RecipeRow = { id:string; processo_id:string; produto_id:string|null; ferramenta_id:string|null; maquina_id:string|null; versao:number; status:string; parametros:Record<string,unknown>; ciclo_seg:number|null; setup_min:number|null; rendimento_percent:number|null; perda_percent:number|null }
type Product = { id:string; codigo:string; nome:string }
type Machine = { id:string; codigo:string; nome:string; status:string }

const labels:Record<ProcessType,string> = {
  INJECAO:'Injeção Plástica', PRENSADOS:'Prensados', ESTAMPARIA:'Estamparia', FERRAMENTARIA:'Ferramentaria',
  EXTRUSAO:'Extrusão', USINAGEM:'Usinagem', SOLDAGEM:'Soldagem', MONTAGEM:'Montagem', CORTE:'Corte e Preparação', PINTURA:'Pintura e Acabamento'
}
const types=Object.keys(labels) as ProcessType[]
const icons:Record<ProcessType,typeof Factory> = {
  INJECAO:Factory, PRENSADOS:Layers3, ESTAMPARIA:Gauge, FERRAMENTARIA:Hammer, EXTRUSAO:Factory,
  USINAGEM:Wrench, SOLDAGEM:ShieldCheck, MONTAGEM:Layers3, CORTE:Gauge, PINTURA:Factory
}
const toolTypes:Record<ProcessType,string[]> = {
  INJECAO:['MOLDE'], PRENSADOS:['FERRAMENTA','MATRIZ'], ESTAMPARIA:['ESTAMPO','MATRIZ'], FERRAMENTARIA:['FERRAMENTA','DISPOSITIVO'],
  EXTRUSAO:['MATRIZ'], USINAGEM:['FERRAMENTA','DISPOSITIVO'], SOLDAGEM:['DISPOSITIVO'], MONTAGEM:['DISPOSITIVO'],
  CORTE:['FERRAMENTA','DISPOSITIVO'], PINTURA:['DISPOSITIVO']
}
function getType():ProcessType {
  const key=window.location.pathname.split('/').filter(Boolean).pop()?.toUpperCase() as ProcessType|undefined
  return types.includes(key as ProcessType) ? key as ProcessType : 'INJECAO'
}

export default function ProcessoIndustrialPage(){
  const type=getType()
  const [processes,setProcesses]=useState<ProcessRow[]>([])
  const [tools,setTools]=useState<ToolRow[]>([])
  const [recipes,setRecipes]=useState<RecipeRow[]>([])
  const [products,setProducts]=useState<Product[]>([])
  const [machines,setMachines]=useState<Machine[]>([])
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const [canView,setCanView]=useState(false),[canCreate,setCanCreate]=useState(false),[canEdit,setCanEdit]=useState(false)
  const [selectedProcess,setSelectedProcess]=useState('')
  const [query,setQuery]=useState('')
  const [editingProcess,setEditingProcess]=useState('')
  const [editingTool,setEditingTool]=useState('')
  const [showProcess,setShowProcess]=useState(false),[showTool,setShowTool]=useState(false),[showRecipe,setShowRecipe]=useState(false)
  const [processForm,setProcessForm]=useState({codigo:'',nome:'',descricao:'',capacidade:'',setup:'0',ciclo:''})
  const [toolForm,setToolForm]=useState({codigo:'',nome:'',tipo:toolTypes[type][0],cavidades:'',vida:''})
  const [recipeForm,setRecipeForm]=useState({produto_id:'',ferramenta_id:'',maquina_id:'',ciclo:'',setup:'',rendimento:'',perda:'',parametros:'{}'})
  const Icon=icons[type]

  async function load(){
    setBusy(true);setError('')
    try{
      const [viewPerm,createPerm,editPerm]=await Promise.all([
        supabase.rpc('erp_has_permission',{permission_code:'producao.ver'}),
        supabase.rpc('erp_has_permission',{permission_code:'producao.criar'}),
        supabase.rpc('erp_has_permission',{permission_code:'producao.editar'})
      ])
      if(viewPerm.error) throw viewPerm.error
      setCanView(Boolean(viewPerm.data));setCanCreate(Boolean(createPerm.data));setCanEdit(Boolean(editPerm.data))
      if(!viewPerm.data) throw new Error('Usuário sem permissão producao.ver para este módulo.')
      const [p,t,r,pr,m]=await Promise.all([
        supabase.from('erp_processos_industriais').select('id,codigo,nome,tipo,descricao,capacidade_hora,setup_padrao_min,ciclo_padrao_seg,ativo').eq('tipo',type).eq('ativo',true).order('codigo'),
        supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo,numero_cavidades,vida_ciclos,ciclos_realizados,status,revisao,ativo').in('tipo',toolTypes[type]).eq('ativo',true).order('codigo'),
        supabase.from('erp_receitas_processos').select('id,processo_id,produto_id,ferramenta_id,maquina_id,versao,status,parametros,ciclo_seg,setup_min,rendimento_percent,perda_percent').eq('status','APROVADA').order('versao',{ascending:false}),
        supabase.from('erp_produtos').select('id,codigo,nome').eq('ativo',true).order('codigo').limit(2000),
        supabase.from('erp_maquinas').select('id,codigo,nome,status').not('status','eq','INATIVA').order('codigo').limit(1000)
      ])
      for(const x of [p,t,r,pr,m]) if(x.error) throw x.error
      setProcesses((p.data??[]) as ProcessRow[]);setTools((t.data??[]) as ToolRow[]);setRecipes((r.data??[]) as RecipeRow[]);setProducts((pr.data??[]) as Product[]);setMachines((m.data??[]) as Machine[])
    }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar o processo industrial.')}finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[type])

  const selected=processes.find(p=>p.id===selectedProcess)
  const needle=query.trim().toLocaleLowerCase('pt-BR')
  const filteredProcesses=processes.filter(p=>!needle||[p.codigo,p.nome,p.descricao??''].some(v=>v.toLocaleLowerCase('pt-BR').includes(needle)))
  const filteredTools=tools.filter(t=>!needle||[t.codigo,t.nome,t.tipo,t.status].some(v=>v.toLocaleLowerCase('pt-BR').includes(needle)))
  const selectedRecipes=useMemo(()=>recipes.filter(r=>r.processo_id===selectedProcess),[recipes,selectedProcess])

  async function companyId(){
    const company=await supabase.rpc('erp_current_empresa_id')
    if(company.error||!company.data) throw company.error??new Error('Empresa da sessão não identificada.')
    return company.data as string
  }
  async function saveProcess(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(!processForm.codigo.trim()||!processForm.nome.trim()) throw new Error('Código e nome são obrigatórios.')
      const id=await companyId()
      const payload={empresa_id:id,codigo:processForm.codigo.trim(),nome:processForm.nome.trim(),tipo:type,descricao:processForm.descricao||null,capacidade_hora:Number(processForm.capacidade)||null,setup_padrao_min:Number(processForm.setup)||0,ciclo_padrao_seg:Number(processForm.ciclo)||null}
      const r=editingProcess
        ? await supabase.from('erp_processos_industriais').update(payload).eq('id',editingProcess).eq('empresa_id',id)
        : await supabase.from('erp_processos_industriais').insert(payload)
      if(r.error) throw r.error
      setMessage(editingProcess?'Processo atualizado no banco.':'Processo cadastrado no banco.')
      setShowProcess(false);setEditingProcess('');setProcessForm({codigo:'',nome:'',descricao:'',capacidade:'',setup:'0',ciclo:''});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar o processo.')}finally{setBusy(false)}
  }
  async function inactivate(table:'erp_processos_industriais'|'erp_ferramentas_industriais',id:string){
    setBusy(true);setError('');setMessage('')
    try{
      const company=await companyId()
      const r=await supabase.from(table).update({ativo:false}).eq('id',id).eq('empresa_id',company)
      if(r.error) throw r.error
      setMessage(table==='erp_processos_industriais'?'Processo inativado.':'Ferramenta inativada.')
      if(selectedProcess===id) setSelectedProcess('')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível inativar o registro.')}finally{setBusy(false)}
  }
  async function saveTool(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(!toolForm.codigo.trim()||!toolForm.nome.trim()) throw new Error('Código e nome são obrigatórios.')
      const id=await companyId()
      const payload={empresa_id:id,codigo:toolForm.codigo.trim(),nome:toolForm.nome.trim(),tipo:toolForm.tipo,numero_cavidades:Number(toolForm.cavidades)||null,vida_ciclos:Number(toolForm.vida)||null}
      const r=editingTool
        ? await supabase.from('erp_ferramentas_industriais').update(payload).eq('id',editingTool).eq('empresa_id',id)
        : await supabase.from('erp_ferramentas_industriais').insert(payload)
      if(r.error) throw r.error
      setMessage(editingTool?'Ferramenta atualizada no banco.':'Ferramenta cadastrada no banco.')
      setShowTool(false);setEditingTool('');setToolForm({codigo:'',nome:'',tipo:toolTypes[type][0],cavidades:'',vida:''});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a ferramenta.')}finally{setBusy(false)}
  }
  async function createRecipe(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(!selectedProcess) throw new Error('Selecione um processo.')
      const id=await companyId()
      let params:Record<string,unknown>={}
      try{params=JSON.parse(recipeForm.parametros||'{}') as Record<string,unknown>}catch{throw new Error('Parâmetros devem estar em JSON válido.')}
      const r=await supabase.from('erp_receitas_processos').insert({empresa_id:id,processo_id:selectedProcess,produto_id:recipeForm.produto_id||null,ferramenta_id:recipeForm.ferramenta_id||null,maquina_id:recipeForm.maquina_id||null,versao:1,status:'RASCUNHO',parametros:params,ciclo_seg:Number(recipeForm.ciclo)||null,setup_min:Number(recipeForm.setup)||null,rendimento_percent:Number(recipeForm.rendimento)||null,perda_percent:Number(recipeForm.perda)||null}).select('id').single()
      if(r.error) throw r.error
      setMessage('Receita criada como RASCUNHO para aprovação.');setShowRecipe(false);await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a receita.')}finally{setBusy(false)}
  }

  return <main className="industrial-route-content" style={{padding:'28px',maxWidth:1500,margin:'0 auto'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:16,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}><Icon size={42}/><div><div style={{fontSize:13,fontWeight:900,letterSpacing:'.08em'}}>PROCESSO INDUSTRIAL</div><h1 style={{margin:'4px 0'}}>{labels[type]}</h1><p style={{margin:0,color:'#607681'}}>Cadastro, ferramental, capacidade e receitas reais integrados ao PCP.</p></div></div>
      <button type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> Atualizar</button>
    </header>
    {error&&<div role="alert" style={{padding:14,marginBottom:16,border:'1px solid #d8a8ad',borderRadius:10}}>{error}</div>}
    {message&&<div role="status" style={{padding:14,marginBottom:16,border:'1px solid #b9d2da',borderRadius:10}}>{message}</div>}
    <section style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}><input aria-label="Pesquisar processo industrial" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar código, nome, ferramenta ou status" style={{flex:'1 1 360px',height:34,border:'1px solid #c8d8e0',borderRadius:2,padding:'0 10px'}}/><button type="button" onClick={()=>setQuery('')} disabled={!query}>Limpar filtro</button></section>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10,marginBottom:18}}>
      <article><strong>{filteredProcesses.length}</strong><span> processos ativos</span></article>
      <article><strong>{filteredTools.length}</strong><span> ferramentas disponíveis</span></article>
      <article><strong>{recipes.length}</strong><span> receitas aprovadas</span></article>
      <article><strong>{machines.length}</strong><span> máquinas disponíveis</span></article>
    </section>
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)',gap:20}}>
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2>Processos</h2><button type="button" disabled={!canCreate} onClick={()=>setShowProcess(true)}><Plus size={16}/> Novo processo</button></div><div style={{display:'grid',gap:8}}>
        {filteredProcesses.map(p=><div key={p.id} type="button" onClick={()=>setSelectedProcess(p.id)} style={{textAlign:'left',padding:12,border:selectedProcess===p.id?'2px solid #2d8db8':'1px solid #cfe1e7',background:'white'}}><strong>{p.codigo} — {p.nome}</strong><div style={{float:'right',display:'flex',gap:4}}><button type='button' title='Editar processo' disabled={!canEdit} onClick={e=>{e.stopPropagation();setEditingProcess(p.id);setProcessForm({codigo:p.codigo,nome:p.nome,descricao:p.descricao??'',capacidade:String(p.capacidade_hora??''),setup:String(p.setup_padrao_min),ciclo:String(p.ciclo_padrao_seg??'')});setShowProcess(true)}}>Editar</button><button type='button' title='Inativar processo' disabled={!canEdit} onClick={e=>{e.stopPropagation();void inactivate('erp_processos_industriais',p.id)}}>Inativar</button></div><div style={{fontSize:13,color:'#607681',marginTop:6}}>Capacidade: {p.capacidade_hora??'—'} / h • Setup: {p.setup_padrao_min} min • Ciclo: {p.ciclo_padrao_seg??'—'} s</div></div>)}
        {!processes.length&&<div style={{padding:24,border:'1px dashed #b9d2da',borderRadius:12}}>Nenhum processo {labels[type]} cadastrado.</div>}
      </div></div>
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2>Ferramentas</h2><button type="button" disabled={!canCreate} onClick={()=>setShowTool(true)}><Plus size={16}/> Nova ferramenta</button></div><div style={{display:'grid',gap:8}}>
        {filteredTools.map(t=><div key={t.id} style={{padding:14,border:'1px solid #cfe1e7',borderRadius:2,background:'white'}}><strong>{t.codigo} — {t.nome}</strong><div style={{float:'right',display:'flex',gap:4}}><button type='button' title='Editar ferramenta' disabled={!canEdit} onClick={()=>{setEditingTool(t.id);setToolForm({codigo:t.codigo,nome:t.nome,tipo:t.tipo,cavidades:String(t.numero_cavidades??''),vida:String(t.vida_ciclos??'')});setShowTool(true)}}>Editar</button><button type='button' title='Inativar ferramenta' disabled={!canEdit} onClick={()=>void inactivate('erp_ferramentas_industriais',t.id)}>Inativar</button></div><div style={{fontSize:13,color:'#607681',marginTop:5}}>{t.tipo} • Vida: {t.vida_ciclos??'—'} ciclos • Realizados: {t.ciclos_realizados}</div></div>)}
        {!tools.length&&<div style={{padding:24,border:'1px dashed #b9d2da',borderRadius:12}}>Nenhuma ferramenta cadastrada.</div>}
      </div></div>
    </section>
    <section style={{marginTop:24}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div><h2 style={{marginBottom:4}}>Receitas de processo</h2><span style={{color:'#607681'}}>{selected?'Processo selecionado: '+selected.codigo+' — '+selected.nome:'Selecione um processo para consultar receitas.'}</span></div>{selected&&<button type="button" disabled={!canCreate} onClick={()=>setShowRecipe(true)}><Plus size={16}/> Nova receita</button>}</div>
      {selected&&<div style={{overflowX:'auto'}}><table><thead><tr><th>Produto</th><th>Ferramenta</th><th>Máquina</th><th>Versão</th><th>Status</th><th>Ciclo</th><th>Perda</th></tr></thead><tbody>{selectedRecipes.map(r=><tr key={r.id}><td>{products.find(p=>p.id===r.produto_id)?.codigo??'Todos'}</td><td>{tools.find(t=>t.id===r.ferramenta_id)?.codigo??'—'}</td><td>{machines.find(m=>m.id===r.maquina_id)?.codigo??'—'}</td><td>{r.versao}</td><td>{r.status}</td><td>{r.ciclo_seg??'—'}</td><td>{r.perda_percent??'—'}%</td></tr>)}</tbody></table></div>}
    </section>
    {!canView&&<div role="alert" style={{padding:14,border:'1px solid #d8a8ad',borderRadius:2}}>Acesso negado: producao.ver.</div>}
    {showProcess&&<dialog open><form onSubmit={saveProcess}><h2>{editingProcess?'Editar':'Novo'} processo — {labels[type]}</h2><input required placeholder="Código" value={processForm.codigo} onChange={e=>setProcessForm({...processForm,codigo:e.target.value})}/><input required placeholder="Nome" value={processForm.nome} onChange={e=>setProcessForm({...processForm,nome:e.target.value})}/><textarea placeholder="Descrição" value={processForm.descricao} onChange={e=>setProcessForm({...processForm,descricao:e.target.value})}/><input type="number" min="0" step="0.0001" placeholder="Capacidade/hora" value={processForm.capacidade} onChange={e=>setProcessForm({...processForm,capacidade:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Setup padrão (min)" value={processForm.setup} onChange={e=>setProcessForm({...processForm,setup:e.target.value})}/><input type="number" min="0" step="0.0001" placeholder="Ciclo padrão (seg)" value={processForm.ciclo} onChange={e=>setProcessForm({...processForm,ciclo:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Salvar</button><button type="button" onClick={()=>setShowProcess(false)}>Cancelar</button></form></dialog>}
    {showTool&&<dialog open><form onSubmit={saveTool}><h2>{editingTool?'Editar':'Nova'} ferramenta</h2><input required placeholder="Código" value={toolForm.codigo} onChange={e=>setToolForm({...toolForm,codigo:e.target.value})}/><input required placeholder="Nome" value={toolForm.nome} onChange={e=>setToolForm({...toolForm,nome:e.target.value})}/><select value={toolForm.tipo} onChange={e=>setToolForm({...toolForm,tipo:e.target.value})}>{toolTypes[type].map(x=><option key={x}>{x}</option>)}</select><input type="number" min="0" placeholder="Cavidades" value={toolForm.cavidades} onChange={e=>setToolForm({...toolForm,cavidades:e.target.value})}/><input type="number" min="0" placeholder="Vida em ciclos" value={toolForm.vida} onChange={e=>setToolForm({...toolForm,vida:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Salvar</button><button type="button" onClick={()=>setShowTool(false)}>Cancelar</button></form></dialog>}
    {showRecipe&&<dialog open><form onSubmit={createRecipe}><h2>Nova receita — RASCUNHO</h2><select value={recipeForm.produto_id} onChange={e=>setRecipeForm({...recipeForm,produto_id:e.target.value})}><option value="">Todos os produtos</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select><select value={recipeForm.ferramenta_id} onChange={e=>setRecipeForm({...recipeForm,ferramenta_id:e.target.value})}><option value="">Sem ferramenta</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} — {t.nome}</option>)}</select><select value={recipeForm.maquina_id} onChange={e=>setRecipeForm({...recipeForm,maquina_id:e.target.value})}><option value="">Sem máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select><input type="number" min="0" step="0.0001" placeholder="Ciclo (seg)" value={recipeForm.ciclo} onChange={e=>setRecipeForm({...recipeForm,ciclo:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Setup (min)" value={recipeForm.setup} onChange={e=>setRecipeForm({...recipeForm,setup:e.target.value})}/><input type="number" min="0" max="100" step="0.001" placeholder="Rendimento %" value={recipeForm.rendimento} onChange={e=>setRecipeForm({...recipeForm,rendimento:e.target.value})}/><input type="number" min="0" max="100" step="0.001" placeholder="Perda %" value={recipeForm.perda} onChange={e=>setRecipeForm({...recipeForm,perda:e.target.value})}/><textarea placeholder='Parâmetros JSON' value={recipeForm.parametros} onChange={e=>setRecipeForm({...recipeForm,parametros:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Criar rascunho</button><button type="button" onClick={()=>setShowRecipe(false)}>Cancelar</button></form></dialog>}
  </main>
}
