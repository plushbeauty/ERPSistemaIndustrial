import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Check, FileDown, ImagePlus, Printer, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'

type Product={id:string;codigo:string;nome:string;descricao?:string|null}
type Client={id:string;codigo:string;nome:string;documento?:string|null}
type Tool={id:string;codigo:string;nome:string;tipo:string;numero_cavidades:number|null;cavidades_ativas?:number|null}
type Machine={id:string;codigo:string;nome:string;tipo:string|null;status:string}
type Status='RASCUNHO'|'EM_ANALISE'|'APROVADA'|'LIBERADA'|'OBSOLETA'
type FormState={
 id:string
 codigo_ficha:string
 produto_id:string
 codigo_cliente:string
 ferramenta_id:string
 maquina_id:string
 cavidades_ativas:string
 revisao:string
 status:Status
 forca_fechamento:string
 pressao_trabalho:string
 temperatura_trabalho:string
 pressao_injecao:string
 ciclo_seg:string
 peso_peca:string
 peso_canal:string
 zona1:string
 zona2:string
 zona3:string
 zona4:string
 imagem_url:string
 observacoes_setup:string
 observacoes:string
}

const blank:FormState={
 id:'',codigo_ficha:'',produto_id:'',codigo_cliente:'',ferramenta_id:'',maquina_id:'',
 cavidades_ativas:'1',revisao:'1',status:'RASCUNHO',forca_fechamento:'',pressao_trabalho:'',
 temperatura_trabalho:'',pressao_injecao:'',ciclo_seg:'',peso_peca:'',peso_canal:'',
 zona1:'',zona2:'',zona3:'',zona4:'',imagem_url:'',observacoes_setup:'',observacoes:''
}

const field='mt-2 h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const label='block text-sm font-bold uppercase tracking-wide text-slate-800'
const card='rounded-md border border-slate-200 bg-white p-5 shadow-sm'

export default function FichasProcesso(){
 const [form,setForm]=useState<FormState>(blank)
 const [products,setProducts]=useState<Product[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [tools,setTools]=useState<Tool[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [rows,setRows]=useState<FormState[]>([])
 const [query,setQuery]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const [preview,setPreview]=useState('')
 const [dragging,setDragging]=useState(false)
 const fileRef=useRef<HTMLInputElement>(null)

 async function load(){
  setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data) throw company.error||new Error('Empresa ERP não identificada.')
   const [p,c,t,m,f]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,descricao').eq('empresa_id',company.data).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_clientes').select('id,codigo,nome,documento').eq('empresa_id',company.data).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_ferramentas_industriais').select('id,codigo,nome,tipo,numero_cavidades,parametros').eq('empresa_id',company.data).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome,tipo,status').eq('empresa_id',company.data).not('status','eq','INATIVA').order('codigo').limit(2000),
    supabase.from('erp_fichas_processo').select('*').eq('empresa_id',company.data).order('codigo_ficha').limit(500)
   ])
   for(const x of [p,c,t,m,f]) if(x.error) throw x.error
   setProducts((p.data??[]) as Product[])
   setClients((c.data??[]) as Client[])
   setTools((t.data??[]) as Tool[])
   setMachines((m.data??[]) as Machine[])
   setRows(((f.data??[]) as Record<string,unknown>[]).map(fromDb))
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar fichas de processo.')}
 }

 function fromDb(x:Record<string,unknown>):FormState{
  const z=(x.zonas_temperatura??{}) as Record<string,unknown>
  return {
   id:String(x.id??''),codigo_ficha:String(x.codigo_ficha??''),produto_id:String(x.produto_id??''),
   codigo_cliente:String(x.codigo_cliente??''),ferramenta_id:String(x.ferramenta_id??''),maquina_id:String(x.maquina_id??''),
   cavidades_ativas:String(x.cavidades_ativas??1),revisao:String(x.revisao??1),status:(String(x.status??'RASCUNHO') as Status),
   forca_fechamento:String(x.forca_fechamento??''),pressao_trabalho:String(x.pressao_trabalho??''),
   temperatura_trabalho:String(x.temperatura_trabalho??''),pressao_injecao:String(x.pressao_injecao??''),
   ciclo_seg:String(x.ciclo_seg??''),peso_peca:String(x.peso_peca??''),peso_canal:String(x.peso_canal??''),
   zona1:String(z.zona1??''),zona2:String(z.zona2??''),zona3:String(z.zona3??''),zona4:String(z.zona4??''),
   imagem_url:String(x.imagem_url??''),observacoes_setup:String(x.observacoes_setup??''),observacoes:String(x.observacoes??'')
  }
 }

 useEffect(()=>{void load()},[])

 const filtered=useMemo(()=>rows.filter(x=>!query||[x.codigo_ficha,x.codigo_cliente,x.status].join(' ').toLowerCase().includes(query.toLowerCase())),[rows,query])
 const product=products.find(x=>x.id===form.produto_id)
 const tool=tools.find(x=>x.id===form.ferramenta_id)
 const machine=machines.find(x=>x.id===form.maquina_id)

 function update<K extends keyof FormState>(key:K,value:FormState[K]){setForm(x=>({...x,[key]:value}));setMessage('');setError('')}

 function newFicha(){setForm(blank);setPreview('');setMessage('Nova ficha pronta para preenchimento.');setError('')}

 function openFicha(x:FormState){setForm(x);setPreview(x.imagem_url);setMessage('');setError('')}

 async function handleFile(file?:File){
  if(!file)return
  if(!['image/png','image/jpeg'].includes(file.type)){setError('Use PNG ou JPG.');return}
  if(file.size>5*1024*1024){setError('A imagem deve ter no máximo 5 MB.');return}
  const company=await supabase.rpc('erp_current_empresa_id')
  if(company.error||!company.data){setError('Empresa ERP não identificada para o upload.');return}
  const path=company.data+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
  setBusy(true);setError('')
  try{
   const upload=await supabase.storage.from('erp-fichas-processo').upload(path,file,{upsert:false,contentType:file.type})
   if(upload.error)throw upload.error
   const signed=await supabase.storage.from('erp-fichas-processo').createSignedUrl(path,60*60*24*30)
   if(signed.error)throw signed.error
   update('imagem_url',signed.data.signedUrl)
   setPreview(signed.data.signedUrl)
   setMessage('Imagem técnica carregada e vinculada à ficha.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao enviar a imagem técnica.')}
  finally{setBusy(false)}
 }

 async function save(){
  setBusy(true);setError('');setMessage('')
  try{
   if(!form.codigo_ficha.trim())throw new Error('Código da ficha é obrigatório.')
   if(!form.produto_id)throw new Error('Informe o código do produto.')
   const company=await supabase.rpc('erp_current_empresa_id')
   const user=await supabase.auth.getUser()
   if(company.error||!company.data)throw company.error||new Error('Empresa ERP não identificada.')
   const payload={
    empresa_id:company.data,codigo_ficha:form.codigo_ficha.trim(),produto_id:form.produto_id,codigo_cliente:form.codigo_cliente.trim()||null,
    ferramenta_id:form.ferramenta_id||null,maquina_id:form.maquina_id||null,cavidades_ativas:Math.max(0,Number(form.cavidades_ativas)||0),
    revisao:Math.max(0,Number(form.revisao)||0),status:form.status,
    forca_fechamento:Number(form.forca_fechamento)||null,pressao_trabalho:Number(form.pressao_trabalho)||null,
    temperatura_trabalho:Number(form.temperatura_trabalho)||null,pressao_injecao:Number(form.pressao_injecao)||null,
    ciclo_seg:Number(form.ciclo_seg)||null,peso_peca:Number(form.peso_peca)||null,peso_canal:Number(form.peso_canal)||null,
    zonas_temperatura:{zona1:form.zona1,zona2:form.zona2,zona3:form.zona3,zona4:form.zona4},
    imagem_url:form.imagem_url||null,observacoes_setup:form.observacoes_setup.trim()||null,observacoes:form.observacoes.trim()||null,
    atualizado_por:user.data.user?.id||null,atualizado_em:new Date().toISOString()
   }
   const result=form.id
    ? await supabase.from('erp_fichas_processo').update(payload).eq('id',form.id).select('*').single()
    : await supabase.from('erp_fichas_processo').insert({...payload,criado_por:user.data.user?.id||null}).select('*').single()
   if(result.error)throw result.error
   setForm(fromDb(result.data as Record<string,unknown>))
   setPreview(String((result.data as Record<string,unknown>).imagem_url??''))
   setMessage('Ficha de processo gravada com sucesso.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a ficha.')}
  finally{setBusy(false)}
 }

 async function remove(){
  if(!form.id)return
  if(!window.confirm('Excluir esta ficha de processo?'))return
  setBusy(true);setError('')
  try{
   const r=await supabase.from('erp_fichas_processo').delete().eq('id',form.id)
   if(r.error)throw r.error
   newFicha();setMessage('Ficha excluída.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir a ficha.')}finally{setBusy(false)}
 }

 return <main className="min-h-screen bg-slate-100 text-slate-900">
  <div className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-lg">
   <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4">
    <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">ERP INDUSTRIAL • ENGENHARIA</p><h1 className="text-xl font-extrabold sm:text-2xl">Ficha de Processo Premium</h1></div>
    <div className="flex flex-wrap items-center justify-end gap-2">
     <button type="button" onClick={newFicha} className="rounded-md border border-slate-500 px-4 h-[54px] text-sm font-bold text-white hover:bg-slate-800"><FileDown size={16} className="mr-2 inline"/>NOVO</button>
     <button type="button" onClick={()=>void save()} disabled={busy} className="rounded-md bg-sky-600 px-5 h-[54px] text-sm font-extrabold text-white hover:bg-sky-500 disabled:opacity-50"><Save size={16} className="mr-2 inline"/>{busy?'GRAVANDO…':'GRAVAR'}</button>
     <button type="button" onClick={()=>window.print()} className="rounded-md border border-slate-500 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"><Printer size={16} className="mr-2 inline"/>IMPRIMIR</button>
     <button type="button" onClick={()=>void load()} className="rounded-md border border-slate-500 p-2.5 text-white hover:bg-slate-800" title="Atualizar"><RotateCcw size={18}/></button>
     <button type="button" onClick={()=>void remove()} disabled={!form.id||busy} className="rounded-md bg-red-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-600 disabled:opacity-40"><Trash2 size={16} className="mr-2 inline"/>DELETAR</button>
    </div>
   </div>
  </div>

  <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-5 p-4 lg:grid-cols-[290px_minmax(0,1fr)]">
   <aside className="rounded-md border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">FICHAS CADASTRADAS</p><div className="mt-3 flex gap-2"><input className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código / status"/><button type="button" className="rounded-md bg-slate-900 px-3 text-white" title="Pesquisar"><Search size={18}/></button></div></div>
    <div className="max-h-[70vh] overflow-auto p-2">
     {filtered.map(x=><button key={x.id} type="button" onClick={()=>openFicha(x)} className={x.id===form.id?'mb-2 w-full rounded-md border border-sky-400 bg-sky-50 p-3 text-left text-slate-900':'mb-2 w-full rounded-md border border-slate-200 bg-white p-3 text-left text-slate-900 hover:border-sky-300 hover:bg-slate-50'}><b className="block text-base">{x.codigo_ficha}</b><span className="block text-sm text-slate-700">{products.find(p=>p.id===x.produto_id)?.nome||'Produto não identificado'}</span><span className="mt-1 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Rev. {x.revisao} • {x.status}</span></button>)}
     {!filtered.length&&<div className="p-5 text-center text-sm font-semibold text-slate-600">Nenhuma ficha cadastrada.</div>}
    </div>
   </aside>

   <section className="min-w-0 space-y-5">
    {(error||message)&&<div className={error?'rounded-md border border-red-200 bg-red-50 p-4 text-base font-bold text-red-800':'rounded-md border border-emerald-200 bg-emerald-50 p-4 text-base font-bold text-emerald-800'}>{error||message}</div>}

    <section className={card}>
     <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-sm font-extrabold uppercase tracking-wider text-sky-700">1. IDENTIFICAÇÃO DO PRODUTO E FERRAMENTAL</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Cadastro mestre da ficha</h2></div><span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Status: {form.status}</span></div>
     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className={label}>CÓD. DA FICHA<input className={field} value={form.codigo_ficha} onChange={e=>update('codigo_ficha',e.target.value)} placeholder="FCH-2026-089"/></label>
      <label className={label}>REVISÃO<input className={field} type="number" min="0" value={form.revisao} onChange={e=>update('revisao',e.target.value)}/></label>
      <EntityCodeLookup label="CÓDIGO DO CLIENTE" value={form.codigo_cliente} records={clients.map(client=>({id:client.codigo,codigo:client.codigo,nome:client.nome,documento:client.documento,codigo_cliente:client.codigo}))} onChange={v=>update('codigo_cliente',v)} onSelect={client=>update('codigo_cliente',client.codigo??client.id)} helper="Digite o código exato do cliente ou abra a lupa para consultar." />
      <label className={label}>CAVIDADES ATIVAS<input className={field} type="number" min="0" value={form.cavidades_ativas} onChange={e=>update('cavidades_ativas',e.target.value)}/></label>
      <div><EntityCodeLookup label="CÓDIGO DO PRODUTO / PEÇA" value={form.produto_id} records={products} onChange={v=>update('produto_id',v)} onSelect={r=>{update('produto_id',r.id);setMessage('Produto '+(r.codigo||'')+' localizado automaticamente.')}} required helper="Digite o código exato ou use a lupa para consulta avançada."/></div>
      <div><EntityCodeLookup label="CÓDIGO DO MOLDE / FERRAMENTAL" value={form.ferramenta_id} records={tools.map(t=>({id:t.id,codigo:t.codigo,nome:t.nome,dimensoes:t.tipo,molde:t.nome}))} onChange={v=>update('ferramenta_id',v)} onSelect={r=>{update('ferramenta_id',r.id);update('cavidades_ativas',String((tools.find(t=>t.id===r.id)?.cavidades_ativas??tools.find(t=>t.id===r.id)?.numero_cavidades??1)));}} required helper="Busca por código, descrição ou molde."/></div>
      <div><EntityCodeLookup label="RECURSO / MÁQUINA" value={form.maquina_id} records={machines.map(m=>({id:m.id,codigo:m.codigo,nome:m.nome,dimensoes:m.tipo}))} onChange={v=>update('maquina_id',v)} onSelect={r=>update('maquina_id',r.id)} helper="Código direto ou lupa de consulta."/></div>
      <label className={label}>STATUS DA REVISÃO<select className={field} value={form.status} onChange={e=>update('status',e.target.value as Status)}><option>RASCUNHO</option><option>EM_ANALISE</option><option>APROVADA</option><option>LIBERADA</option><option>OBSOLETA</option></select></label>
     </div>
     <div className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-4 text-base md:grid-cols-3">
      <div><b className="text-slate-800">Produto:</b> <span>{product?.codigo||'—'} • {product?.nome||'Não selecionado'}</span></div>
      <div><b className="text-slate-800">Ferramental:</b> <span>{tool?.codigo||'—'} • {tool?.nome||'Não selecionado'}</span></div>
      <div><b className="text-slate-800">Máquina:</b> <span>{machine?.codigo||'—'} • {machine?.nome||'Não selecionada'}</span></div>
     </div>
    </section>

    <section className={card}>
     <div className="mb-5 border-b border-slate-200 pb-4"><p className="text-sm font-extrabold uppercase tracking-wider text-sky-700">2. CONFIGURAÇÃO DE PARÂMETROS CRÍTICOS DA MÁQUINA</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Parâmetros que alimentam o PCP</h2><p className="mt-1 text-base text-slate-600">Valores numéricos são armazenados na ficha e podem ser usados para cálculo de ciclo, capacidade e setup.</p></div>
     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
       ['Força de fechamento / tonelagem','forca_fechamento','Ton / Bar'],['Pressão de trabalho','pressao_trabalho','Bar'],['Temperatura de trabalho','temperatura_trabalho','°C'],['Pressão de injeção / recalque','pressao_injecao','MPa'],
       ['Tempo de ciclo nominal','ciclo_seg','Segundos'],['Peso líquido da peça','peso_peca','kg'],['Peso canal / refugo','peso_canal','kg'],['Cavidades ativas','cavidades_ativas','un']
      ].map(([l,k,u])=><label key={k} className={label}>{l}<div className="mt-2 flex"><input className="min-h-12 w-full rounded-l-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="number" step="any" value={form[k as keyof FormState] as string} onChange={e=>update(k as keyof FormState,e.target.value as never)}/><span className="grid min-w-24 place-items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-100 px-2 text-sm font-bold text-slate-700">{u}</span></div></label>)}
     </div>
     <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-md border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-sky-800">CAPACIDADE NOMINAL</p><p className="mt-1 text-2xl font-black text-slate-950">{Number(form.ciclo_seg)>0?((3600/Number(form.ciclo_seg))*Math.max(1,Number(form.cavidades_ativas)||1)).toFixed(1):'—'} <span className="text-sm font-bold">peças/h</span></p><p className="mt-1 text-sm font-semibold text-slate-700">Base: ciclo nominal × cavidades ativas.</p></div>
      <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">MASSA DA PEÇA</p><p className="mt-1 text-2xl font-black text-slate-950">{form.peso_peca||'—'} <span className="text-sm font-bold">kg</span></p><p className="mt-1 text-sm font-semibold text-slate-700">Peso líquido unitário.</p></div>
      <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">CANAL / REFUGO</p><p className="mt-1 text-2xl font-black text-slate-950">{form.peso_canal||'—'} <span className="text-sm font-bold">kg</span></p><p className="mt-1 text-sm font-semibold text-slate-700">Massa informada para o canal/refugo.</p></div>
     </div>
     <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4"><h3 className="text-base font-extrabold text-slate-900">Temperatura das zonas / aquecimento</h3><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Zona 1','zona1'],['Zona 2','zona2'],['Zona 3','zona3'],['Zona 4','zona4']].map(([l,k])=><label key={k} className={label}>{l}<input className={field} value={form[k as keyof FormState] as string} onChange={e=>update(k as keyof FormState,e.target.value as never)} placeholder="°C"/></label>)}</div></div>
    </section>

    <section className={card}>
     <div className="mb-4"><p className="text-sm font-extrabold uppercase tracking-wider text-sky-700">3. CONTROLE VISUAL</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Imagem técnica da peça / molde</h2></div>
     <div role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileRef.current?.click()}} onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e:DragEvent<HTMLDivElement>)=>{e.preventDefault();setDragging(false);void handleFile(e.dataTransfer.files?.[0])}} className={'flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 text-center transition '+(dragging?'border-sky-700 bg-sky-50':'border-indigo-400 bg-slate-50 hover:border-sky-600 hover:bg-sky-50')}>
      {preview?<img src={preview} alt="Imagem técnica da ficha" className="max-h-72 rounded-md object-contain"/>:<><Upload size={40} className="text-indigo-600"/><span className="mt-3 text-lg font-extrabold text-slate-800">CLIQUE OU ARRASTE A IMAGEM TÉCNICA DA PEÇA AQUI</span><span className="mt-1 text-base text-slate-600">PNG ou JPG • Máximo 5 MB • visualização otimizada para tablet</span></>}
     </div>
     <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e=>void handleFile(e.target.files?.[0])}/>
    </section>

    <section className={card}>
     <div className="mb-4"><p className="text-sm font-extrabold uppercase tracking-wider text-sky-700">4. INSTRUÇÕES DE SETUP E SEGURANÇA OPERACIONAL</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Orientações obrigatórias para o operador</h2></div>
     <textarea className="min-h-36 w-full rounded-md border border-slate-300 bg-white p-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" value={form.observacoes_setup} onChange={e=>update('observacoes_setup',e.target.value)} placeholder="Pré-aquecimento, fixação, desmoldante, sequência de setup, pontos de segurança…"/>
     <textarea className="mt-4 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" value={form.observacoes} onChange={e=>update('observacoes',e.target.value)} placeholder="Observações gerais da Engenharia de Processos…"/>
     <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <span className="text-base font-semibold text-slate-600">Ficha {form.id?'existente no Supabase':'nova'} • {form.status}</span>
      <div className="flex gap-2"><button type="button" onClick={newFicha} className="rounded-md border border-slate-400 bg-white px-5 py-3 text-base font-extrabold text-slate-800 hover:bg-slate-50"><X size={17} className="mr-2 inline"/>LIMPAR</button><button type="button" onClick={()=>void save()} disabled={busy} className="rounded-md bg-sky-700 px-6 py-3 text-base font-extrabold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"><Save size={18} className="mr-2 inline"/>GRAVAR FICHA</button></div>
     </div>
    </section>
   </section>
  </div>
 </main>
}
