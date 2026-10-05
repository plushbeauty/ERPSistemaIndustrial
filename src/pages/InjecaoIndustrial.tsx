import { useEffect, useMemo, useState } from 'react'
import { Boxes, Factory, History, PackageSearch, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, XCircle } from 'lucide-react'
import VendasLayout, { type SalesNavSection } from './VendasLayout'
import { supabase } from '../lib/supabaseClient'

type Machine = { id:string; codigo:string; nome:string; tipo:string|null; fabricante:string|null; modelo:string|null; status:string|null; ativo:boolean; valor_hora_custo:number }
type Mold = { id:string; codigo:string; nome:string; tipo:string; status:string; produto_id:string|null; numero_cavidades:number; cavidades_ativas:number; ciclos_atuais:number; limite_ciclos:number; ativo:boolean; localizacao_fisica:string|null }
type ProductionOrder = { id:string; numero_op:string; quantidade:number; quantidade_produzida:number; status:string; maquina_id:string|null }
type HistoryRow = { id:string; entidade:string; entidade_id:string; acao:string; codigo:string|null; descricao:string|null; criado_em:string }
type MachineForm = { id:string|null; codigo:string; nome:string; tipo:string; fabricante:string; modelo:string; valor_hora_custo:string }
type MoldForm = { id:string|null; codigo:string; nome:string; status:string; numero_cavidades:string; cavidades_ativas:string; limite_ciclos:string; localizacao_fisica:string }

const nav: SalesNavSection[] = [
  { label:'Injeção', items:[
    { label:'Painel de injeção', href:'/processos/injecao', icon:Factory },
    { label:'Processos e receitas', href:'/processos/injecao', icon:Settings2 },
    { label:'Fichas de processo', href:'/fichas-processo', icon:Settings2 },
  ]},
  { label:'Integrações', items:[
    { label:'PCP e ordens', href:'/pcp', icon:Boxes },
    { label:'Qualidade', href:'/qualidade', icon:ShieldCheck },
    { label:'Estoque', href:'/estoque', icon:PackageSearch },
  ]},
]
const emptyMachine:MachineForm={id:null,codigo:'',nome:'',tipo:'INJETORA',fabricante:'',modelo:'',valor_hora_custo:'0'}
const emptyMold:MoldForm={id:null,codigo:'',nome:'',status:'DISPONIVEL',numero_cavidades:'1',cavidades_ativas:'1',limite_ciclos:'0',localizacao_fisica:''}

function errorText(value:unknown,fallback:string):string{return value instanceof Error?value.message:fallback}

export default function InjecaoIndustrial(){
  const [empresaId,setEmpresaId]=useState('')
  const [machines,setMachines]=useState<Machine[]>([])
  const [molds,setMolds]=useState<Mold[]>([])
  const [orders,setOrders]=useState<ProductionOrder[]>([])
  const [history,setHistory]=useState<HistoryRow[]>([])
  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('TODOS')
  const [historyFilter,setHistoryFilter]=useState('TODOS')
  const [form,setForm]=useState<'machine'|'mold'|null>(null)
  const [machineForm,setMachineForm]=useState<MachineForm>(emptyMachine)
  const [moldForm,setMoldForm]=useState<MoldForm>(emptyMold)
  const [busy,setBusy]=useState(false)
  const [canView,setCanView]=useState(false)
  const [canCreate,setCanCreate]=useState(false)
  const [canEdit,setCanEdit]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  async function load():Promise<void>{
    setBusy(true);setError('')
    try{
      const company=await supabase.rpc('erp_current_empresa_id')
      if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
      const id=String(company.data);setEmpresaId(id)
      const [m,mo,o,pv,pc,pe,h]=await Promise.all([
        supabase.from('erp_maquinas').select('id,codigo,nome,tipo,fabricante,modelo,status,ativo,valor_hora_custo').eq('empresa_id',id).order('codigo'),
        supabase.from('erp_moldes').select('id,codigo,nome,tipo,status,produto_id,numero_cavidades,cavidades_ativas,ciclos_atuais,limite_ciclos,ativo,localizacao_fisica').eq('empresa_id',id).eq('tipo','INJECAO').order('codigo'),
        supabase.from('erp_ordens_producao').select('id,numero_op,quantidade,quantidade_produzida,status,maquina_id').eq('empresa_id',id).order('numero_op',{ascending:false}).limit(100),
        supabase.rpc('erp_has_permission',{permission_code:'production.read'}),
        supabase.rpc('erp_has_permission',{permission_code:'production.create'}),
        supabase.rpc('erp_has_permission',{permission_code:'production.update'}),
        supabase.from('erp_injecao_historico').select('id,entidade,entidade_id,acao,codigo,descricao,criado_em').eq('empresa_id',id).order('criado_em',{ascending:false}).limit(150),
      ])
      for(const result of [m,mo,o])if(result.error)throw result.error
      setMachines((m.data??[]) as Machine[]);setMolds((mo.data??[]) as Mold[]);setOrders((o.data??[]) as ProductionOrder[])
      setCanView(!pv.error&&Boolean(pv.data));setCanCreate(!pc.error&&Boolean(pc.data));setCanEdit(!pe.error&&Boolean(pe.data))
      if(pv.error)throw pv.error
      if(!pv.data)throw new Error('Usuário sem permissão production.read para o módulo de injeção.')
      setHistory(h.error?[]:(h.data??[]) as HistoryRow[])
    }catch(cause){setError(errorText(cause,'Falha ao carregar o módulo de injeção.'))}
    finally{setBusy(false)}
  }

  useEffect(()=>{void load()},[])

  const filteredMachines=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('pt-BR')
    return machines.filter(item=>(statusFilter==='TODOS'||(item.ativo?(item.status??'ATIVO'):'INATIVO')===statusFilter)&&(!q||[item.codigo,item.nome,item.tipo??'',item.status??''].some(v=>v.toLocaleLowerCase('pt-BR').includes(q))))
  },[machines,query,statusFilter])
  const filteredMolds=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('pt-BR')
    return molds.filter(item=>(statusFilter==='TODOS'||(item.ativo?item.status:'INATIVO')===statusFilter)&&(!q||[item.codigo,item.nome,item.status,item.localizacao_fisica??''].some(v=>v.toLocaleLowerCase('pt-BR').includes(q))))
  },[molds,query,statusFilter])
  const openOrders=orders.filter(item=>!['concluida','concluído','cancelada','cancelado'].includes(item.status.toLocaleLowerCase('pt-BR')))
  const visibleHistory=history.filter(item=>historyFilter==='TODOS'||item.entidade===historyFilter)

  async function recordHistory(entidade:'INJETORA'|'MOLDE', entidade_id:string, acao:string, codigo:string, descricao:string, detalhes:Record<string,unknown>={}):Promise<void>{
    const user=await supabase.auth.getUser()
    const result=await supabase.from('erp_injecao_historico').insert({empresa_id:empresaId,entidade,entidade_id,acao,codigo,descricao,detalhes,usuario_id:user.data.user?.id??null})
    if(result.error)throw result.error
  }

  async function saveMachine():Promise<void>{
    if(machineForm.id?!canEdit:!canCreate){setError('Sem permissão para esta operação.');return}
    if(!empresaId||!machineForm.codigo.trim()||!machineForm.nome.trim()){setError('Código e nome da injetora são obrigatórios.');return}
    if(Number(machineForm.valor_hora_custo)<0){setError('Custo/hora não pode ser negativo.');return}
    setBusy(true);setError('');setMessage('')
    try{
      const payload={empresa_id:empresaId,codigo:machineForm.codigo.trim(),nome:machineForm.nome.trim(),tipo:machineForm.tipo.trim()||'INJETORA',fabricante:machineForm.fabricante.trim()||null,modelo:machineForm.modelo.trim()||null,valor_hora_custo:Number(machineForm.valor_hora_custo||0),ativo:true}
      const result=machineForm.id?await supabase.from('erp_maquinas').update(payload).eq('id',machineForm.id).eq('empresa_id',empresaId).select('id').single():await supabase.from('erp_maquinas').insert(payload).select('id').single()
      if(result.error)throw result.error
      const machineId=machineForm.id??result.data?.id
      if(machineId)await recordHistory('INJETORA',machineId,machineForm.id?'EDITAR':'CRIAR',payload.codigo,machineForm.id?'Injetora atualizada.':'Injetora cadastrada.',{tipo:payload.tipo})
      setMessage(machineForm.id?'Injetora atualizada.':'Injetora cadastrada.');setForm(null);setMachineForm(emptyMachine);await load()
    }catch(cause){setError(errorText(cause,'Não foi possível gravar a injetora.'))}finally{setBusy(false)}
  }

  async function saveMold():Promise<void>{
    if(moldForm.id?!canEdit:!canCreate){setError('Sem permissão para esta operação.');return}
    if(!empresaId||!moldForm.codigo.trim()||!moldForm.nome.trim()){setError('Código e nome do molde são obrigatórios.');return}
    const cavities=Math.max(1,Number(moldForm.numero_cavidades||0));const active=Math.max(0,Math.min(cavities,Number(moldForm.cavidades_ativas||0)))
    setBusy(true);setError('');setMessage('')
    try{
      const payload={empresa_id:empresaId,codigo:moldForm.codigo.trim(),nome:moldForm.nome.trim(),tipo:'INJECAO',status:moldForm.status,numero_cavidades:cavities,cavidades:cavities,cavidades_ativas:active,limite_ciclos:Math.max(0,Number(moldForm.limite_ciclos||0)),localizacao_fisica:moldForm.localizacao_fisica.trim()||null,ativo:true}
      const result=moldForm.id?await supabase.from('erp_moldes').update(payload).eq('id',moldForm.id).eq('empresa_id',empresaId).select('id').single():await supabase.from('erp_moldes').insert(payload).select('id').single()
      if(result.error)throw result.error
      const moldId=moldForm.id??result.data?.id
      if(moldId)await recordHistory('MOLDE',moldId,moldForm.id?'EDITAR':'CRIAR',payload.codigo,moldForm.id?'Molde atualizado.':'Molde cadastrado.',{status:payload.status,numero_cavidades:cavities})
      setMessage(moldForm.id?'Molde atualizado.':'Molde cadastrado.');setForm(null);setMoldForm(emptyMold);await load()
    }catch(cause){setError(errorText(cause,'Não foi possível gravar o molde.'))}finally{setBusy(false)}
  }

  async function inactivate(table:'erp_maquinas'|'erp_moldes',id:string):Promise<void>{
    if(!canEdit){setError('Sem permissão para inativar registros.');return}
    if(!window.confirm('Inativar este registro?'))return
    setBusy(true);setError('');setMessage('')
    try{
      const result=await supabase.from(table).update({ativo:false}).eq('id',id).eq('empresa_id',empresaId)
      if(result.error)throw result.error
      const row=table==='erp_maquinas'?machines.find(item=>item.id===id):molds.find(item=>item.id===id)
      if(row)await recordHistory(table==='erp_maquinas'?'INJETORA':'MOLDE',id,'INATIVAR',row.codigo,table==='erp_maquinas'?'Injetora inativada.':'Molde inativado.')
      setMessage(table==='erp_maquinas'?'Injetora inativada.':'Molde inativado.');await load()
    }catch(cause){setError(errorText(cause,'Não foi possível inativar o registro.'))}finally{setBusy(false)}
  }

  return <VendasLayout title="Injeção Plástica" subtitle="Injetoras • moldes • ordens • histórico" onRefresh={()=>void load()} navSections={nav}>
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-xs text-slate-800 md:p-4">
      <header className="mb-3 flex flex-wrap items-center gap-2 border border-slate-300 bg-white px-3 py-2">
        <Factory size={18} className="text-[#3A9D78]"/><div className="mr-auto"><span className="text-[10px] tracking-wide text-[#3A9D78]">MANUFATURA • INJEÇÃO</span><h1 className="text-lg text-[#123B50]">Injeção Plástica</h1><p className="text-[11px] text-slate-500">Injetoras, moldes, cavidades, ciclos e ordens reais.</p></div>
        <button type="button" onClick={()=>void load()} disabled={busy} className="flex h-8 items-center gap-1 border border-slate-300 bg-white px-2"><RefreshCw size={13}/>Atualizar</button>
      </header>
      {(error||message)&&<div role={error?'alert':'status'} className={error?'mb-3 border border-red-300 bg-red-50 px-3 py-2 text-red-800':'mb-3 border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-800'}>{error||message}</div>}
      {!canView&&<div role="alert" className="mb-3 border border-red-300 bg-red-50 px-3 py-2 text-red-800">Acesso negado: production.read.</div>}
      <section className="mb-3 flex flex-wrap gap-2 border border-slate-300 bg-white p-2">
        <label className="flex h-8 min-w-64 flex-1 items-center gap-2 border border-slate-300 px-2"><Search size={13}/><input className="min-w-0 flex-1 outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, nome, tipo, status..."/></label>
        <select aria-label="Status" className="h-8 border border-slate-300 bg-white px-2" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="TODOS">Todos</option><option value="DISPONIVEL">Disponível</option><option value="ATIVA">Ativa</option><option value="EM_PRODUCAO">Em produção</option><option value="EM_MANUTENCAO">Em manutenção</option><option value="INATIVO">Inativo</option></select>
        <button type="button" disabled={!canCreate||busy} onClick={()=>{setMachineForm(emptyMachine);setForm('machine')}} className="flex h-8 items-center gap-1 border border-slate-400 bg-white px-2"><Plus size={13}/>Nova Injetora</button>
        <button type="button" disabled={!canCreate||busy} onClick={()=>{setMoldForm(emptyMold);setForm('mold')}} className="flex h-8 items-center gap-1 border border-slate-400 bg-white px-2"><Plus size={13}/>Novo Molde</button>
      </section>
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">{[['Injetoras',machines.filter(x=>x.ativo).length],['Moldes',molds.filter(x=>x.ativo).length],['OPs abertas',openOrders.length],['Cavidades ativas',molds.filter(x=>x.ativo).reduce((s,x)=>s+x.cavidades_ativas,0)]].map(([label,value])=><div key={String(label)} className="border border-slate-300 bg-white px-3 py-2"><span className="block text-[10px] text-slate-500">{String(label)}</span><strong className="text-base text-[#123B50]">{String(value)}</strong></div>)}</section>
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="overflow-x-auto border border-slate-300 bg-white"><div className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Injetoras</h2><span className="text-[10px] text-slate-500">{filteredMachines.length} registros</span></div><table className="w-full min-w-[760px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">Código</th><th className="p-2">Nome</th><th className="p-2">Fabricante/Modelo</th><th className="p-2">Status</th><th className="p-2 text-right">Custo/h</th><th className="p-2">Ações</th></tr></thead><tbody>{filteredMachines.map(item=><tr key={item.id} className="border-t border-slate-200"><td className="p-2">{item.codigo}</td><td className="p-2">{item.nome}</td><td className="p-2">{[item.fabricante,item.modelo].filter(Boolean).join(' / ')||'—'}</td><td className="p-2">{item.ativo?(item.status??'ATIVO'):'INATIVA'}</td><td className="p-2 text-right">{Number(item.valor_hora_custo).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="p-2"><div className="flex gap-1"><button type="button" title="Editar" disabled={!canEdit||busy} onClick={()=>{setMachineForm({id:item.id,codigo:item.codigo,nome:item.nome,tipo:item.tipo??'INJETORA',fabricante:item.fabricante??'',modelo:item.modelo??'',valor_hora_custo:String(item.valor_hora_custo??0)});setForm('machine')}} className="flex h-7 w-7 items-center justify-center border border-slate-300"><Pencil size={13}/></button>{item.ativo&&<button type="button" title="Inativar" disabled={!canEdit||busy} onClick={()=>void inactivate('erp_maquinas',item.id)} className="flex h-7 w-7 items-center justify-center border border-slate-300"><XCircle size={13}/></button>}</div></td></tr>)}</tbody></table></section>
        <section className="overflow-x-auto border border-slate-300 bg-white"><div className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Moldes de injeção</h2><span className="text-[10px] text-slate-500">{filteredMolds.length} registros</span></div><table className="w-full min-w-[760px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">Código</th><th className="p-2">Nome</th><th className="p-2">Cavidades</th><th className="p-2">Ciclos</th><th className="p-2">Localização</th><th className="p-2">Ações</th></tr></thead><tbody>{filteredMolds.map(item=><tr key={item.id} className="border-t border-slate-200"><td className="p-2">{item.codigo}</td><td className="p-2">{item.nome}</td><td className="p-2">{item.cavidades_ativas}/{item.numero_cavidades}</td><td className="p-2">{item.ciclos_atuais}/{item.limite_ciclos||'∞'}</td><td className="p-2">{item.localizacao_fisica??'—'}</td><td className="p-2"><div className="flex gap-1"><button type="button" title="Editar" disabled={!canEdit||busy} onClick={()=>{setMoldForm({id:item.id,codigo:item.codigo,nome:item.nome,status:item.status,numero_cavidades:String(item.numero_cavidades),cavidades_ativas:String(item.cavidades_ativas),limite_ciclos:String(item.limite_ciclos),localizacao_fisica:item.localizacao_fisica??''});setForm('mold')}} className="flex h-7 w-7 items-center justify-center border border-slate-300"><Pencil size={13}/></button>{item.ativo&&<button type="button" title="Inativar" disabled={!canEdit||busy} onClick={()=>void inactivate('erp_moldes',item.id)} className="flex h-7 w-7 items-center justify-center border border-slate-300"><XCircle size={13}/></button>}</div></td></tr>)}</tbody></table></section>
      </div>
      <section className="mt-3 overflow-x-auto border border-slate-300 bg-white"><div className="border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">Ordens de produção vinculadas</h2></div><table className="w-full min-w-[700px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">OP</th><th className="p-2">Status</th><th className="p-2">Planejada</th><th className="p-2">Produzida</th><th className="p-2">Injetora</th></tr></thead><tbody>{openOrders.map(item=><tr key={item.id} className="border-t border-slate-200"><td className="p-2">{item.numero_op}</td><td className="p-2">{item.status}</td><td className="p-2">{item.quantidade}</td><td className="p-2">{item.quantidade_produzida}</td><td className="p-2">{machines.find(m=>m.id===item.maquina_id)?.codigo??'—'}</td></tr>)}</tbody></table>{!openOrders.length&&<p className="p-5 text-center text-slate-500">Nenhuma OP aberta.</p>}</section>
      <section className="mt-3 overflow-x-auto border border-slate-300 bg-white"><div className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><div><h2 className="text-sm text-[#123B50]">Histórico</h2><span className="text-[10px] text-slate-500">Eventos registrados pelo banco.</span></div><div className="flex items-center gap-2"><History size={14}/><select className="h-8 border border-slate-300 bg-white px-2 text-[11px]" value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}><option value="TODOS">Todos</option><option value="INJETORA">Injetoras</option><option value="MOLDE">Moldes</option></select></div></div><table className="w-full min-w-[700px] border-collapse text-[11px]"><thead><tr className="bg-slate-100 text-left"><th className="p-2">Data</th><th className="p-2">Entidade</th><th className="p-2">Código</th><th className="p-2">Ação</th><th className="p-2">Descrição</th></tr></thead><tbody>{visibleHistory.map(item=><tr key={item.id} className="border-t border-slate-200"><td className="p-2">{new Date(item.criado_em).toLocaleString('pt-BR')}</td><td className="p-2">{item.entidade}</td><td className="p-2">{item.codigo??'—'}</td><td className="p-2">{item.acao}</td><td className="p-2">{item.descricao??'—'}</td></tr>)}{!visibleHistory.length&&<tr><td colSpan={5} className="p-5 text-center text-slate-500">Nenhum evento.</td></tr>}</tbody></table></section>
      {form&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3" role="dialog" aria-modal="true"><div className="w-full max-w-2xl border border-slate-300 bg-white"><header className="flex items-center justify-between border-b border-slate-300 px-3 py-2"><h2 className="text-sm text-[#123B50]">{form==='machine'?(machineForm.id?'Editar Injetora':'Nova Injetora'):(moldForm.id?'Editar Molde':'Novo Molde')}</h2><button type="button" title="Fechar" onClick={()=>setForm(null)} className="flex h-7 w-7 items-center justify-center border border-slate-300"><XCircle size={14}/></button></header>{form==='machine'?<div className="grid gap-2 p-3 sm:grid-cols-2"><input placeholder="Código" value={machineForm.codigo} onChange={e=>setMachineForm({...machineForm,codigo:e.target.value})}/><input placeholder="Nome" value={machineForm.nome} onChange={e=>setMachineForm({...machineForm,nome:e.target.value})}/><input placeholder="Tipo" value={machineForm.tipo} onChange={e=>setMachineForm({...machineForm,tipo:e.target.value})}/><input placeholder="Fabricante" value={machineForm.fabricante} onChange={e=>setMachineForm({...machineForm,fabricante:e.target.value})}/><input placeholder="Modelo" value={machineForm.modelo} onChange={e=>setMachineForm({...machineForm,modelo:e.target.value})}/><input type="number" min="0" step="0.0001" placeholder="Custo/hora" value={machineForm.valor_hora_custo} onChange={e=>setMachineForm({...machineForm,valor_hora_custo:e.target.value})}/><div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3"><button type="button" onClick={()=>setForm(null)} className="h-8 border border-slate-300 px-3">Cancelar</button><button type="button" disabled={busy} onClick={()=>void saveMachine()} className="h-8 border border-[#3A9D78] bg-[#3A9D78] px-3 text-white">Gravar Injetora</button></div></div>:<div className="grid gap-2 p-3 sm:grid-cols-2"><input placeholder="Código" value={moldForm.codigo} onChange={e=>setMoldForm({...moldForm,codigo:e.target.value})}/><input placeholder="Nome" value={moldForm.nome} onChange={e=>setMoldForm({...moldForm,nome:e.target.value})}/><select value={moldForm.status} onChange={e=>setMoldForm({...moldForm,status:e.target.value})}><option value="DISPONIVEL">Disponível</option><option value="EM_PRODUCAO">Em produção</option><option value="EM_MANUTENCAO">Em manutenção</option></select><input type="number" min="1" placeholder="Nº cavidades" value={moldForm.numero_cavidades} onChange={e=>setMoldForm({...moldForm,numero_cavidades:e.target.value})}/><input type="number" min="0" placeholder="Cavidades ativas" value={moldForm.cavidades_ativas} onChange={e=>setMoldForm({...moldForm,cavidades_ativas:e.target.value})}/><input type="number" min="0" placeholder="Limite de ciclos" value={moldForm.limite_ciclos} onChange={e=>setMoldForm({...moldForm,limite_ciclos:e.target.value})}/><input placeholder="Localização física" value={moldForm.localizacao_fisica} onChange={e=>setMoldForm({...moldForm,localizacao_fisica:e.target.value})}/><div className="sm:col-span-2 flex justify-end gap-2 border-t pt-3"><button type="button" onClick={()=>setForm(null)} className="h-8 border border-slate-300 px-3">Cancelar</button><button type="button" disabled={busy} onClick={()=>void saveMold()} className="h-8 border border-[#3A9D78] bg-[#3A9D78] px-3 text-white">Gravar Molde</button></div></div>}</div></div>}
    </main>
  </VendasLayout>
}
