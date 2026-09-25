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
  const [selectedProcess,setSelectedProcess]=useState('')
  const [showProcess,setShowProcess]=useState(false),[showTool,setShowTool]=useState(false),[showRecipe,setShowRecipe]=useState(false)
  const [processForm,setProcessForm]=useState({codigo:'',nome:'',descricao:'',capacidade:'',setup:'0',ciclo:''})
  const [toolForm,setToolForm]=useState({codigo:'',nome:'',tipo:toolTypes[type][0],cavidades:'',vida:''})
  const [recipeForm,setRecipeForm]=useState({produto_id:'',ferramenta_id:'',maquina_id:'',ciclo:'',setup:'',rendimento:'',perda:'',parametros:'{}'})
  const Icon=icons[type]

  async function load(){
    setBusy(true);setError('')
    try{
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
  const selectedRecipes=useMemo(()=>recipes.filter(r=>r.processo_id===selectedProcess),[recipes,selectedProcess])

  async function companyId(){
    const company=await supabase.rpc('erp_current_empresa_id')
    if(company.error||!company.data) throw company.error??new Error('Empresa da sessão não identificada.')
    return company.data as string
  }
  async function createProcess(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(!processForm.codigo.trim()||!processForm.nome.trim()) throw new Error('Código e nome são obrigatórios.')
      const id=await companyId()
      const r=await supabase.from('erp_processos_industriais').insert({empresa_id:id,codigo:processForm.codigo.trim(),nome:processForm.nome.trim(),tipo,descricao:processForm.descricao||null,capacidade_hora:Number(processForm.capacidade)||null,setup_padrao_min:Number(processForm.setup)||0,ciclo_padrao_seg:Number(processForm.ciclo)||null}).select('id').single()
      if(r.error) throw r.error
      setMessage('Processo cadastrado no banco.');setShowProcess(false);setProcessForm({codigo:'',nome:'',descricao:'',capacidade:'',setup:'0',ciclo:''});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar o processo.')}finally{setBusy(false)}
  }
  async function createTool(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(!toolForm.codigo.trim()||!toolForm.nome.trim()) throw new Error('Código e nome são obrigatórios.')
      const id=await companyId()
      const r=await supabase.from('erp_ferramentas_industriais').insert({empresa_id:id,codigo:toolForm.codigo.trim(),nome:toolForm.nome.trim(),tipo:toolForm.tipo,numero_cavidades:Number(toolForm.cavidades)||null,vida_ciclos:Number(toolForm.vida)||null}).select('id').single()
      if(r.error) throw r.error
      setMessage('Ferramenta cadastrada no banco.');setShowTool(false);setToolForm({codigo:'',nome:'',tipo:toolTypes[type][0],cavidades:'',vida:''});await load()
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar a ferramenta.')}finally{setBusy(false)}
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
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:24,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}><Icon size={42}/><div><div style={{fontSize:13,fontWeight:900,letterSpacing:'.08em'}}>PROCESSO INDUSTRIAL</div><h1 style={{margin:'4px 0'}}>{labels[type]}</h1><p style={{margin:0,color:'#607681'}}>Cadastro, ferramental, capacidade e receitas reais integrados ao PCP.</p></div></div>
      <button type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> Atualizar</button>
    </header>
    {error&&<div role="alert" style={{padding:14,marginBottom:16,border:'1px solid #d8a8ad',borderRadius:10}}>{error}</div>}
    {message&&<div role="status" style={{padding:14,marginBottom:16,border:'1px solid #b9d2da',borderRadius:10}}>{message}</div>}
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,marginBottom:24}}>
      <article><strong>{processes.length}</strong><span> processos ativos</span></article>
      <article><strong>{tools.length}</strong><span> ferramentas disponíveis</span></article>
      <article><strong>{recipes.length}</strong><span> receitas aprovadas</span></article>
      <article><strong>{machines.length}</strong><span> máquinas disponíveis</span></article>
    </section>
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)',gap:20}}>
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2>Processos</h2><button type="button" onClick={()=>setShowProcess(true)}><Plus size={16}/> Novo processo</button></div><div style={{display:'grid',gap:8}}>
        {processes.map(p=><button key={p.id} type="button" onClick={()=>setSelectedProcess(p.id)} style={{textAlign:'left',padding:16,border:selectedProcess===p.id?'2px solid #2d8db8':'1px solid #cfe1e7',borderRadius:12,background:'white'}}><strong>{p.codigo} — {p.nome}</strong><div style={{fontSize:13,color:'#607681',marginTop:6}}>Capacidade: {p.capacidade_hora??'—'} / h • Setup: {p.setup_padrao_min} min • Ciclo: {p.ciclo_padrao_seg??'—'} s</div></button>)}
        {!processes.length&&<div style={{padding:24,border:'1px dashed #b9d2da',borderRadius:12}}>Nenhum processo {labels[type]} cadastrado.</div>}
      </div></div>
      <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2>Ferramentas</h2><button type="button" onClick={()=>setShowTool(true)}><Plus size={16}/> Nova ferramenta</button></div><div style={{display:'grid',gap:8}}>
        {tools.map(t=><div key={t.id} style={{padding:14,border:'1px solid #cfe1e7',borderRadius:12,background:'white'}}><strong>{t.codigo} — {t.nome}</strong><div style={{fontSize:13,color:'#607681',marginTop:5}}>{t.tipo} • Vida: {t.vida_ciclos??'—'} ciclos • Realizados: {t.ciclos_realizados}</div></div>)}
        {!tools.length&&<div style={{padding:24,border:'1px dashed #b9d2da',borderRadius:12}}>Nenhuma ferramenta cadastrada.</div>}
      </div></div>
    </section>
    <section style={{marginTop:24}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div><h2 style={{marginBottom:4}}>Receitas de processo</h2><span style={{color:'#607681'}}>{selected?'Processo selecionado: '+selected.codigo+' — '+selected.nome:'Selecione um processo para consultar receitas.'}</span></div>{selected&&<button type="button" onClick={()=>setShowRecipe(true)}><Plus size={16}/> Nova receita</button>}</div>
      {selected&&<div style={{overflowX:'auto'}}><table><thead><tr><th>Produto</th><th>Ferramenta</th><th>Máquina</th><th>Versão</th><th>Status</th><th>Ciclo</th><th>Perda</th></tr></thead><tbody>{selectedRecipes.map(r=><tr key={r.id}><td>{products.find(p=>p.id===r.produto_id)?.codigo??'Todos'}</td><td>{tools.find(t=>t.id===r.ferramenta_id)?.codigo??'—'}</td><td>{machines.find(m=>m.id===r.maquina_id)?.codigo??'—'}</td><td>{r.versao}</td><td>{r.status}</td><td>{r.ciclo_seg??'—'}</td><td>{r.perda_percent??'—'}%</td></tr>)}</tbody></table></div>}
    </section>
    {showProcess&&<dialog open><form onSubmit={createProcess}><h2>Novo processo — {labels[type]}</h2><input required placeholder="Código" value={processForm.codigo} onChange={e=>setProcessForm({...processForm,codigo:e.target.value})}/><input required placeholder="Nome" value={processForm.nome} onChange={e=>setProcessForm({...processForm,nome:e.target.value})}/><textarea placeholder="Descrição" value={processForm.descricao} onChange={e=>setProcessForm({...processForm,descricao:e.target.value})}/><input type="number" min="0" step="0.0001" placeholder="Capacidade/hora" value={processForm.capacidade} onChange={e=>setProcessForm({...processForm,capacidade:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Setup padrão (min)" value={processForm.setup} onChange={e=>setProcessForm({...processForm,setup:e.target.value})}/><input type="number" min="0" step="0.0001" placeholder="Ciclo padrão (seg)" value={processForm.ciclo} onChange={e=>setProcessForm({...processForm,ciclo:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Salvar</button><button type="button" onClick={()=>setShowProcess(false)}>Cancelar</button></form></dialog>}
    {showTool&&<dialog open><form onSubmit={createTool}><h2>Nova ferramenta</h2><input required placeholder="Código" value={toolForm.codigo} onChange={e=>setToolForm({...toolForm,codigo:e.target.value})}/><input required placeholder="Nome" value={toolForm.nome} onChange={e=>setToolForm({...toolForm,nome:e.target.value})}/><select value={toolForm.tipo} onChange={e=>setToolForm({...toolForm,tipo:e.target.value})}>{toolTypes[type].map(x=><option key={x}>{x}</option>)}</select><input type="number" min="0" placeholder="Cavidades" value={toolForm.cavidades} onChange={e=>setToolForm({...toolForm,cavidades:e.target.value})}/><input type="number" min="0" placeholder="Vida em ciclos" value={toolForm.vida} onChange={e=>setToolForm({...toolForm,vida:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Salvar</button><button type="button" onClick={()=>setShowTool(false)}>Cancelar</button></form></dialog>}
    {showRecipe&&<dialog open><form onSubmit={createRecipe}><h2>Nova receita — RASCUNHO</h2><select value={recipeForm.produto_id} onChange={e=>setRecipeForm({...recipeForm,produto_id:e.target.value})}><option value="">Todos os produtos</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select><select value={recipeForm.ferramenta_id} onChange={e=>setRecipeForm({...recipeForm,ferramenta_id:e.target.value})}><option value="">Sem ferramenta</option>{tools.map(t=><option key={t.id} value={t.id}>{t.codigo} — {t.nome}</option>)}</select><select value={recipeForm.maquina_id} onChange={e=>setRecipeForm({...recipeForm,maquina_id:e.target.value})}><option value="">Sem máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select><input type="number" min="0" step="0.0001" placeholder="Ciclo (seg)" value={recipeForm.ciclo} onChange={e=>setRecipeForm({...recipeForm,ciclo:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Setup (min)" value={recipeForm.setup} onChange={e=>setRecipeForm({...recipeForm,setup:e.target.value})}/><input type="number" min="0" max="100" step="0.001" placeholder="Rendimento %" value={recipeForm.rendimento} onChange={e=>setRecipeForm({...recipeForm,rendimento:e.target.value})}/><input type="number" min="0" max="100" step="0.001" placeholder="Perda %" value={recipeForm.perda} onChange={e=>setRecipeForm({...recipeForm,perda:e.target.value})}/><textarea placeholder='Parâmetros JSON' value={recipeForm.parametros} onChange={e=>setRecipeForm({...recipeForm,parametros:e.target.value})}/><button disabled={busy} type="submit"><Save size={16}/> Criar rascunho</button><button type="button" onClick={()=>setShowRecipe(false)}>Cancelar</button></form></dialog>}
  </main>
}
