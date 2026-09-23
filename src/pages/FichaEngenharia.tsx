import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Factory, FileText, History, Plus, Search, Save, Settings2, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;unidade:string|null;categoria?:string|null}
type Client={id:string;codigo:string|null;nome:string;documento:string|null}
type Machine={id:string;codigo:string;nome:string}
type Operation={id:string;codigo:string;nome:string;descricao:string|null}
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;unidade_rendimento:string;observacoes:string|null;ativa:boolean;cliente_id:string|null;codigo_cliente:string|null;desenho:string|null;modelo:string|null}
type BomRow={id?:string;componente_id:string;quantidade:string;unidade_medida:string;perda_percentual:string;lote_obrigatorio:boolean;tipo_item:'COMPRADO'|'FABRICADO';sequencia:number}
type OpRow={id?:string;sequencia:number;operacao_id:string;operacao_texto:string;maquina_id:string;molde_id:string;setup_min:string;ciclo_seg:string;instrucoes:string}
type QualityRow={id:string;codigo:string;caracteristica:string;unidade:string;limite_inferior:string;limite_superior:string;frequencia:string;status:string}
type AuditRow={id:string;action:string;module:string;entity:string;created_at:string;new_data:Record<string,unknown>|null}
type MasterRow={id:string;produto_id:string;versao:number;produto?:Product;cliente?:Client;created_at:string;ativa:boolean}

const emptyBom=():BomRow=>({componente_id:'',quantidade:'1',unidade_medida:'UN',perda_percentual:'0',lote_obrigatorio:false,tipo_item:'COMPRADO',sequencia:10})
const emptyOp=():OpRow=>({sequencia:10,operacao_id:'',operacao_texto:'',maquina_id:'',molde_id:'',setup_min:'0',ciclo_seg:'0',instrucoes:''})
const emptyQuality=():QualityRow=>({id:'new-quality-'+Date.now(),codigo:'',caracteristica:'',unidade:'',limite_inferior:'',limite_superior:'',frequencia:'100%',status:'ativo'})
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Operação recusada pelo banco.')

export default function FichaEngenharia(){
 const [products,setProducts]=useState<Product[]>([]),[clients,setClients]=useState<Client[]>([]),[machines,setMachines]=useState<Machine[]>([]),[operations,setOperations]=useState<Operation[]>([])
 const [master,setMaster]=useState<MasterRow[]>([]),[ficha,setFicha]=useState<Ficha|null>(null)
 const [productId,setProductId]=useState(''),[clientId,setClientId]=useState(''),[clientCode,setClientCode]=useState(''),[drawing,setDrawing]=useState(''),[model,setModel]=useState('')
 const [version,setVersion]=useState('1'),[yieldQty,setYieldQty]=useState('1'),[yieldUnit,setYieldUnit]=useState('UN'),[processCode,setProcessCode]=useState(''),[processName,setProcessName]=useState('Processo de fabricação'),[notes,setNotes]=useState('')
 const [bom,setBom]=useState<BomRow[]>([emptyBom()]),[ops,setOps]=useState<OpRow[]>([emptyOp()]),[quality,setQuality]=useState<QualityRow[]>([emptyQuality()])
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[error,setError]=useState('')
 const [materialModal,setMaterialModal]=useState(false),[materialRow,setMaterialRow]=useState(0),[materialCode,setMaterialCode]=useState(''),[materialGroup,setMaterialGroup]=useState(''),[materialDesc,setMaterialDesc]=useState('')
 const [clientSearch,setClientSearch]=useState(''),[masterSearch,setMasterSearch]=useState(''),[newOpCode,setNewOpCode]=useState(''),[newOpName,setNewOpName]=useState('')
 const [audit,setAudit]=useState<AuditRow[]>([])

 const selected=useMemo(()=>products.find(p=>p.id===productId),[products,productId])
 const selectedClient=useMemo(()=>clients.find(c=>c.id===clientId),[clients,clientId])
 const materialGroups=useMemo(()=>Array.from(new Set(products.map(p=>(p.categoria||'').trim()).filter(Boolean))).sort(),[products])
 const materialResults=useMemo(()=>products.filter(p=>p.id!==productId&&(!materialGroup||materialGroup==='TODOS'||(p.categoria||'').toUpperCase()===materialGroup.toUpperCase())&&(!materialCode||p.codigo.toLowerCase().includes(materialCode.toLowerCase()))&&(!materialDesc||p.nome.toLowerCase().includes(materialDesc.toLowerCase()))).slice(0,300),[products,productId,materialGroup,materialCode,materialDesc])
 const filteredClients=useMemo(()=>clients.filter(c=>!clientSearch||`${c.codigo??''} ${c.nome} ${c.documento??''}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0,100),[clients,clientSearch])
 const filteredMaster=useMemo(()=>master.filter(r=>!masterSearch||`${r.produto?.codigo??''} ${r.produto?.nome??''} ${r.cliente?.nome??''}`.toLowerCase().includes(masterSearch.toLowerCase())),[master,masterSearch])
 const totalCycle=useMemo(()=>ops.reduce((s,o)=>s+(Number(o.setup_min)||0)+(Number(o.ciclo_seg)||0)*Number(yieldQty||0),0),[ops,yieldQty])
 const materialName=(id:string)=>products.find(p=>p.id===id)?.nome??'—'
 const machineName=(id:string)=>machines.find(m=>m.id===id)?.codigo??'—'

 useEffect(()=>{void loadBase()},[])
 useEffect(()=>{if(products.length)void loadMaster()},[products,clients])
 async function company(){const r=await supabase.rpc('erp_current_empresa_id');if(r.error||!r.data)throw new Error('Empresa da sessão não identificada.');return String(r.data)}

 async function loadBase(){
   setLoading(true);setError('')
   try{
     const [p,c,m,o]=await Promise.all([
       supabase.from('erp_produtos').select('id,codigo,nome,unidade,categoria').eq('ativo',true).order('codigo').limit(5000),
       supabase.from('erp_clientes').select('id,codigo,nome,documento').eq('ativo',true).order('nome').limit(3000),
       supabase.from('erp_maquinas').select('id,codigo,nome').not('status','eq','INATIVA').order('codigo').limit(1000),
       supabase.from('erp_operacoes_mestre').select('id,codigo,nome,descricao').eq('ativo',true).order('codigo').limit(500)
     ])
     for(const r of [p,c,m,o])if(r.error)throw r.error
     setProducts((p.data??[]) as Product[]);setClients((c.data??[]) as Client[]);setMachines((m.data??[]) as Machine[]);setOperations((o.data??[]) as Operation[])
   }catch(e){setError(errorText(e))}finally{setLoading(false)}
 }

 async function loadMaster(){
   try{
     const empresaId=await company()
     const r=await supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,created_at,ativa,cliente_id').eq('empresa_id',empresaId).order('created_at',{ascending:false}).limit(500)
     if(r.error)throw r.error
     const rows=(r.data??[]) as MasterRow[]
     setMaster(rows.map(x=>({...x,produto:products.find(p=>p.id===x.produto_id),cliente:clients.find(c=>c.id===x.cliente_id)})))
   }catch(e){setError(errorText(e))}
 }

 async function loadFicha(id:string){
   if(!id){reset(false);return}
   setBusy(true);setError('');setNotice('')
   try{
     const empresaId=await company()
     const f=await supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa,cliente_id,codigo_cliente,desenho,modelo').eq('empresa_id',empresaId).eq('id',id).single()
     if(f.error)throw f.error
     const current=f.data as Ficha
     setFicha(current);setProductId(current.produto_id);setClientId(current.cliente_id??'');setClientCode(current.codigo_cliente??'');setDrawing(current.desenho??'');setModel(current.modelo??'')
     setVersion(String(current.versao));setYieldQty(String(current.rendimento));setYieldUnit(current.unidade_rendimento)
     const raw=current.observacoes?JSON.parse(current.observacoes) as {processCode?:string;processName?:string;notes?:string}:{}
     setProcessCode(raw.processCode??'FP-'+current.produto_id.slice(0,8).toUpperCase()+'-'+current.versao);setProcessName(raw.processName??'Processo de fabricação');setNotes(raw.notes??'')
     const [bi,ro,qi,ar]=await Promise.all([
       supabase.from('erp_ficha_itens').select('id,componente_id,quantidade,unidade_medida,perda_percentual,lote_obrigatorio,tipo_item,sequencia').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
       supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg,instrucoes').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
       supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,limite_inferior,limite_superior,frequencia,status').eq('empresa_id',empresaId).eq('produto_id',current.produto_id).order('codigo').limit(300),
       supabase.from('erp_audit_logs').select('id,action,module,entity,created_at,new_data').eq('company_id',empresaId).eq('entity_id',current.id).order('created_at',{ascending:false}).limit(50)
     ])
     for(const r of [bi,ro,qi])if(r.error)throw r.error
     setBom((bi.data??[]).map(x=>({id:x.id,componente_id:x.componente_id,quantidade:String(x.quantidade),unidade_medida:x.unidade_medida||products.find(p=>p.id===x.componente_id)?.unidade||'UN',perda_percentual:String(x.perda_percentual),lote_obrigatorio:Boolean(x.lote_obrigatorio),tipo_item:x.tipo_item,sequencia:x.sequencia})).concat((bi.data??[]).length?[]:[emptyBom()]))
     setOps((ro.data??[]).map(x=>({id:x.id,sequencia:x.sequencia,operacao_id:'',operacao_texto:x.operacao,maquina_id:x.maquina_id??'',molde_id:x.molde_id??'',setup_min:String(x.setup_min),ciclo_seg:String(x.ciclo_seg),instrucoes:x.instrucoes??''})).concat((ro.data??[]).length?[]:[emptyOp()]))
     setQuality((qi.data??[]).map(x=>({id:x.id,codigo:x.codigo,caracteristica:x.caracteristica,unidade:x.unidade??'',limite_inferior:x.limite_inferior==null?'':String(x.limite_inferior),limite_superior:x.limite_superior==null?'':String(x.limite_superior),frequencia:x.frequencia??'',status:x.status})).concat((qi.data??[]).length?[]:[emptyQuality()]))
     if(!ar.error)setAudit((ar.data??[]) as AuditRow[])
   }catch(e){setError(errorText(e))}finally{setBusy(false)}
 }

 function reset(clearProduct=true){
   setFicha(null);if(clearProduct){setProductId('');setClientId('');setClientCode('');setDrawing('');setModel('')}
   setVersion('1');setYieldQty('1');setYieldUnit('UN');setProcessCode('');setProcessName('Processo de fabricação');setNotes('')
   setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()]);setAudit([]);setNotice('');setError('')
 }

 async function selectMaster(id:string){await loadFicha(id)}

 function setBomField(i:number,k:keyof BomRow,v:string|boolean){setBom(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setOpField(i:number,k:keyof OpRow,v:string|number){setOps(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setQualityField(i:number,k:keyof QualityRow,v:string){setQuality(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}

 function chooseMaterial(id:string){
   const p=products.find(x=>x.id===id);if(!p)return
   setBom(r=>r.map((x,i)=>i===materialRow?{...x,componente_id:id,unidade_medida:p.unidade||'UN'}:x))
   setMaterialModal(false);setMaterialCode('');setMaterialDesc('')
 }

 async function saveOperationMaster(){
   setError('');setNotice('')
   try{
     const empresaId=await company();if(!newOpCode.trim()||!newOpName.trim())throw new Error('Informe código e nome da operação.')
     const r=await supabase.from('erp_operacoes_mestre').insert({empresa_id:empresaId,codigo:newOpCode.trim().toUpperCase(),nome:newOpName.trim(),ativo:true}).select('id,codigo,nome,descricao').single()
     if(r.error)throw r.error
     setOperations(x=>[...x,r.data as Operation].sort((a,b)=>a.codigo.localeCompare(b.codigo)));setNewOpCode('');setNewOpName('');setNotice('Operação cadastrada com sucesso.')
   }catch(e){setError(errorText(e))}
 }

 async function save(){
   setBusy(true);setNotice('');setError('')
   try{
     if(!productId)throw new Error('Informe o produto produzido.')
     if(Number(yieldQty)<=0)throw new Error('Quantidade/rendimento deve ser maior que zero.')
     if(bom.some(x=>!x.componente_id||Number(x.quantidade)<=0||!x.unidade_medida.trim()))throw new Error('Complete código, quantidade e unidade de todos os materiais.')
     if(ops.some(x=>!x.operacao_texto.trim()||Number(x.setup_min)<0||Number(x.ciclo_seg)<0))throw new Error('Complete operação, setup e ciclo.')
     const empresaId=await company()
     const payload={empresa_id:empresaId,produto_id:productId,versao:Number(version),rendimento:Number(yieldQty),unidade_rendimento:yieldUnit.trim()||'UN',cliente_id:clientId||null,codigo_cliente:clientCode.trim()||null,desenho:drawing.trim()||null,modelo:model.trim()||null,observacoes:JSON.stringify({processCode,processName,notes}),ativa:true}
     const saved=await supabase.from('erp_fichas_tecnicas').upsert(payload,{onConflict:'empresa_id,produto_id,versao'}).select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa,cliente_id,codigo_cliente,desenho,modelo').single()
     if(saved.error)throw saved.error
     const fichaId=String(saved.data.id)
     const delBom=await supabase.from('erp_ficha_itens').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(delBom.error)throw delBom.error
     const insBom=await supabase.from('erp_ficha_itens').insert(bom.map(x=>({empresa_id:empresaId,ficha_id:fichaId,componente_id:x.componente_id,quantidade:Number(x.quantidade),unidade_medida:x.unidade_medida.trim(),perda_percentual:Number(x.perda_percentual),lote_obrigatorio:x.lote_obrigatorio,tipo_item:x.tipo_item,sequencia:x.sequencia})));if(insBom.error)throw insBom.error
     const delOps=await supabase.from('erp_ficha_operacoes').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(delOps.error)throw delOps.error
     const insOps=await supabase.from('erp_ficha_operacoes').insert(ops.map(x=>({empresa_id:empresaId,ficha_id:fichaId,sequencia:x.sequencia,operacao:x.operacao_texto.trim(),maquina_id:x.maquina_id||null,molde_id:x.molde_id||null,setup_min:Number(x.setup_min),ciclo_seg:Number(x.ciclo_seg),instrucoes:x.instrucoes.trim()||null})));if(insOps.error)throw insOps.error
     for(const q of quality.filter(x=>x.caracteristica.trim())){
       const qp={empresa_id:empresaId,codigo:q.codigo.trim()||'CQ-'+Math.random().toString(36).slice(2,7).toUpperCase(),produto_id:productId,caracteristica:q.caracteristica.trim(),unidade:q.unidade.trim()||null,limite_inferior:q.limite_inferior===''?null:Number(q.limite_inferior),limite_superior:q.limite_superior===''?null:Number(q.limite_superior),frequencia:q.frequencia.trim(),status:q.status}
       const qr=q.id.startsWith('new-quality-')?await supabase.from('erp_planos_inspecao').insert(qp):await supabase.from('erp_planos_inspecao').update(qp).eq('id',q.id).eq('empresa_id',empresaId)
       if(qr.error)throw qr.error
     }
     const auth=await supabase.auth.getUser()
     const ar=await supabase.from('erp_audit_logs').insert({company_id:empresaId,user_id:auth.data.user?.id??null,action:ficha?'UPDATE':'CREATE',module:'ENGENHARIA',entity:'erp_fichas_tecnicas',entity_id:fichaId,new_data:{produto_id:productId,cliente_id:clientId||null,desenho,modelo,materiais:bom.length,operacoes:ops.length,controles:quality.filter(q=>q.caracteristica.trim()).length}})
     if(ar.error)console.warn('[ERP] auditoria da ficha não registrada:',ar.error.message)
     setFicha(saved.data as Ficha);setNotice('Salvo com sucesso. Ficha, materiais, roteiro, qualidade e auditoria foram registrados.')
     await loadMaster()
     const hist=await supabase.from('erp_audit_logs').select('id,action,module,entity,created_at,new_data').eq('company_id',empresaId).eq('entity_id',fichaId).order('created_at',{ascending:false}).limit(50);if(!hist.error)setAudit((hist.data??[]) as AuditRow[])
   }catch(e){setError(errorText(e))}finally{setBusy(false)}
 }

 if(loading)return <main className="industrial-form-page"><div className="industrial-panel">Carregando ficha de processo…</div></main>

 return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header">
   <div><span className="industrial-eyebrow">ENGENHARIA • PCP • ALMOXARIFADO • SGQ</span><h1>Ficha de Processo</h1><p>Uma ficha única: produto, cliente, desenho, materiais, operações, tempos e controles de medida.</p></div>
   <div className="process-sheet-actions"><button className="industrial-secondary" type="button" onClick={()=>reset(true)}><X size={16}/>Nova ficha</button><button className="industrial-primary" type="button" onClick={()=>void save()} disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar'}</button></div>
  </header>

  {(error||notice)&&<div className={error?'industrial-error':'industrial-notice'} role="status">{error||notice}</div>}

  <section className="process-sheet-banner">
   <div><b>FICHA</b><strong>{processCode||'NOVA'}</strong><span>Revisão {version}</span></div>
   <div><b>PRODUTO</b><strong>{selected?selected.codigo+' — '+selected.nome:'Não selecionado'}</strong><span>{selected?.unidade??'—'}</span></div>
   <div><b>CLIENTE</b><strong>{selectedClient?.nome||clientCode||'Não informado'}</strong><span>{drawing||'Sem desenho'}</span></div>
   <div><b>STATUS</b><strong>{ficha?.ativa?'ATIVA':'NOVA / RASCUNHO'}</strong><span>Tenant isolado</span></div>
  </section>

  <section className="industrial-panel process-sheet-selector">
   <div className="process-section-title"><Settings2/><div><span>IDENTIFICAÇÃO</span><h2>Dados que realmente identificam a ficha</h2></div></div>
   <div className="process-form-grid">
    <label>Produto produzido<select value={productId} onChange={e=>{setProductId(e.target.value);if(e.target.value)setProcessCode('FP-'+e.target.value.slice(0,8).toUpperCase()+'-1')}}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
    <label>Código da ficha<input value={processCode} onChange={e=>setProcessCode(e.target.value)} placeholder="FP-0001"/></label>
    <label>Revisão<input type="number" min="1" value={version} onChange={e=>setVersion(e.target.value)}/></label>
    <label>Operação / processo<input value={processName} onChange={e=>setProcessName(e.target.value)} placeholder="Ex.: Injeção / Prensagem / Acabamento"/></label>
    <label>Código cliente<input value={clientCode} onChange={e=>setClientCode(e.target.value)} placeholder="Código usado pelo cliente"/></label>
    <label>Cliente<select value={clientId} onChange={e=>{setClientId(e.target.value);setClientCode(clients.find(c=>c.id===e.target.value)?.codigo??'')}}><option value="">Selecione o cliente</option>{filteredClients.map(c=><option key={c.id} value={c.id}>{c.codigo?c.codigo+' — ':''}{c.nome}</option>)}</select></label>
    <label>Desenho<input value={drawing} onChange={e=>setDrawing(e.target.value)} placeholder="Código / revisão do desenho"/></label>
    <label>Modelo<input value={model} onChange={e=>setModel(e.target.value)} placeholder="Modelo / referência"/></label>
    <label>Quantidade do ciclo / rendimento<input type="number" min="0.000001" step="0.001" value={yieldQty} onChange={e=>setYieldQty(e.target.value)}/></label>
    <label>Unidade do rendimento<input value={yieldUnit} onChange={e=>setYieldUnit(e.target.value.toUpperCase())} placeholder="UN / KG / M"/></label>
   </div>
  </section>

  <section className="industrial-panel">
   <div className="industrial-section-head"><div><span>MATERIAIS</span><h2>Lista de materiais — consumo, perda, lote, origem e unidade</h2><p>Não existe lista infinita para rolar. Primeiro informe o código; se não souber, use a lupa para consultar.</p></div><button className="industrial-secondary" type="button" onClick={()=>setBom(r=>[...r,{...emptyBom(),sequencia:(r.at(-1)?.sequencia??0)+10}])}><Plus size={16}/>Adicionar material</button></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Seq.</th><th style={{minWidth:300}}>Código / descrição</th><th>Qtd.</th><th>Unidade</th><th>Perda %</th><th>Lote</th><th>Origem</th><th/></tr></thead><tbody>{bom.map((r,i)=><tr key={r.id??'b'+i}>
    <td>{r.sequencia}</td>
    <td><div style={{display:'flex',gap:8,alignItems:'center'}}><input value={products.find(p=>p.id===r.componente_id)?.codigo??''} onChange={e=>{const p=products.find(x=>x.codigo.toLowerCase()===e.target.value.trim().toLowerCase());setMaterialCode(e.target.value);if(p)setBomField(i,'componente_id',p.id)}} placeholder="Digite o código" style={{maxWidth:150}}/><button className="icon-button" type="button" title="Consultar matéria-prima" onClick={()=>{setMaterialRow(i);setMaterialModal(true)}}><Search size={17}/></button><span style={{fontWeight:600}}>{materialName(r.componente_id)}</span></div></td>
    <td><input type="number" min="0.000001" step="0.001" value={r.quantidade} onChange={e=>setBomField(i,'quantidade',e.target.value)}/></td>
    <td><input value={r.unidade_medida} onChange={e=>setBomField(i,'unidade_medida',e.target.value.toUpperCase())} placeholder="KG / M / UN"/></td>
    <td><input type="number" min="0" step="0.01" value={r.perda_percentual} onChange={e=>setBomField(i,'perda_percentual',e.target.value)}/></td>
    <td><input type="checkbox" checked={r.lote_obrigatorio} onChange={e=>setBomField(i,'lote_obrigatorio',e.target.checked)}/></td>
    <td><select value={r.tipo_item} onChange={e=>setBomField(i,'tipo_item',e.target.value as BomRow['tipo_item'])}><option value="COMPRADO">Comprado</option><option value="FABRICADO">Fabricado</option></select></td>
    <td><button type="button" className="icon-button danger" onClick={()=>setBom(x=>x.length===1?[emptyBom()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td>
   </tr>)}</tbody></table></div>
  </section>

  <section className="industrial-panel">
   <div className="industrial-section-head"><div><span>ROTEIRO</span><h2>Operações da fábrica</h2><p>As operações vêm do cadastro mestre. Máquina vem do cadastro de Máquinas e Equipamentos.</p></div><button className="industrial-secondary" type="button" onClick={()=>setOps(r=>[...r,{...emptyOp(),sequencia:(r.at(-1)?.sequencia??0)+10}])}><Plus size={16}/>Adicionar operação</button></div>
   <div className="process-inline-master"><input value={newOpCode} onChange={e=>setNewOpCode(e.target.value)} placeholder="Código da operação"/><input value={newOpName} onChange={e=>setNewOpName(e.target.value)} placeholder="Nome: ACABAMENTO / PRENSADO / INJETADO"/><button className="industrial-secondary" type="button" onClick={()=>void saveOperationMaster()}><Plus size={16}/>Cadastrar operação mestre</button></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Seq.</th><th>Operação</th><th>Máquina</th><th>Setup (min)</th><th>Ciclo (seg)</th><th>Instrução</th><th/></tr></thead><tbody>{ops.map((r,i)=><tr key={r.id??'o'+i}>
    <td><input type="number" value={r.sequencia} onChange={e=>setOpField(i,'sequencia',Number(e.target.value))}/></td>
    <td><select value={r.operacao_id} onChange={e=>{const o=operations.find(x=>x.id===e.target.value);setOps(x=>x.map((z,n)=>n===i?{...z,operacao_id:e.target.value,operacao_texto:o?.nome??''}:z))}}><option value="">Selecione operação</option>{operations.map(o=><option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}{r.operacao_texto&&!r.operacao_id&&<option value="">Atual: {r.operacao_texto}</option>}</select>{r.operacao_id=== ''&&<input value={r.operacao_texto} onChange={e=>setOpField(i,'operacao_texto',e.target.value)} placeholder="ou digite a operação" />}</td>
    <td><select value={r.maquina_id} onChange={e=>setOpField(i,'maquina_id',e.target.value)}><option value="">Selecione máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></td>
    <td><input type="number" min="0" step="0.1" value={r.setup_min} onChange={e=>setOpField(i,'setup_min',e.target.value)}/></td>
    <td><input type="number" min="0" step="0.001" value={r.ciclo_seg} onChange={e=>setOpField(i,'ciclo_seg',e.target.value)}/></td>
    <td><input value={r.instrucoes} onChange={e=>setOpField(i,'instrucoes',e.target.value)} placeholder="Parâmetro / instrução controlada"/></td>
    <td><button type="button" className="icon-button danger" onClick={()=>setOps(x=>x.length===1?[emptyOp()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td>
   </tr>)}</tbody></table></div>
   <div className="process-metrics"><div><b>{ops.length}</b><span>Operações</span></div><div><b>{machines.length}</b><span>Máquinas cadastradas</span></div><div><b>{totalCycle.toFixed(1)}</b><span>Tempo calculado</span></div></div>
  </section>

  <section className="industrial-panel">
   <div className="industrial-section-head"><div><span>QUALIDADE</span><h2>Desenho e medidas do produto</h2><p>Aqui entram somente características dimensionais, unidade e limites. Peso/consumo da matéria-prima fica na lista de materiais.</p></div><button className="industrial-secondary" type="button" onClick={()=>setQuality(r=>[...r,emptyQuality()])}><Plus size={16}/>Adicionar medida</button></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Código</th><th>Característica / medida</th><th>Unidade</th><th>Mín.</th><th>Máx.</th><th>Frequência</th><th>Status</th><th/></tr></thead><tbody>{quality.map((r,i)=><tr key={r.id}><td><input value={r.codigo} onChange={e=>setQualityField(i,'codigo',e.target.value)} placeholder="CQ-001"/></td><td><input value={r.caracteristica} onChange={e=>setQualityField(i,'caracteristica',e.target.value)} placeholder="Ø 25,00 / comprimento / espessura"/></td><td><input value={r.unidade} onChange={e=>setQualityField(i,'unidade',e.target.value)} placeholder="mm / kg / °C"/></td><td><input type="number" step="0.001" value={r.limite_inferior} onChange={e=>setQualityField(i,'limite_inferior',e.target.value)}/></td><td><input type="number" step="0.001" value={r.limite_superior} onChange={e=>setQualityField(i,'limite_superior',e.target.value)}/></td><td><input value={r.frequencia} onChange={e=>setQualityField(i,'frequencia',e.target.value)}/></td><td><select value={r.status} onChange={e=>setQualityField(i,'status',e.target.value)}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></td><td><button className="icon-button danger" type="button" onClick={()=>setQuality(x=>x.length===1?[emptyQuality()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
  </section>

  <section className="industrial-panel">
   <div className="industrial-section-head"><div><span>DOCUMENTOS</span><h2>Desenho / instrução controlada</h2><p>Use o código e revisão do desenho acima; este campo guarda referências da ficha.</p></div></div>
   <textarea rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Código do desenho, revisão, IT/POP, parâmetros críticos, observações de processo…"/>
  </section>

  <section className="industrial-panel">
   <div className="industrial-section-head"><div><span>LISTA MESTRE</span><h2>Todas as fichas cadastradas</h2><p>Clique em uma ficha para carregar a última revisão e toda a árvore abaixo.</p></div><div style={{minWidth:300}}><input value={masterSearch} onChange={e=>setMasterSearch(e.target.value)} placeholder="Pesquisar código ou produto"/></div></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Produto</th><th>Cliente</th><th>Revisão</th><th>Data</th><th>Status</th><th/></tr></thead><tbody>{filteredMaster.map(r=><tr key={r.id}><td><b>{r.produto?.codigo??'—'}</b> — {r.produto?.nome??'Produto'}</td><td>{r.cliente?.nome??'—'}</td><td>v{r.versao}</td><td>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td><td>{r.ativa?'ATIVA':'INATIVA'}</td><td><button className="industrial-secondary" type="button" onClick={()=>void selectMaster(r.id)}>Abrir ficha</button></td></tr>)}{!filteredMaster.length&&<tr><td colSpan={6}>Nenhuma ficha encontrada.</td></tr>}</tbody></table></div>
  </section>

  <section className="industrial-panel">
   <div className="process-card-title"><History/><div><span>AUDITORIA</span><h2>Histórico</h2></div></div>
   {audit.length?<div className="process-history">{audit.map(a=><article key={a.id}><b>{a.action}</b><span>{a.module} • {a.entity}</span><time>{new Date(a.created_at).toLocaleString('pt-BR')}</time></article>)}</div>:<div className="industrial-empty">Salve a ficha para registrar o histórico.</div>}
  </section>

  {materialModal&&<div className="process-modal-backdrop" role="dialog" aria-modal="true">
   <div className="process-modal">
    <header><div><span>CONSULTA DE MATERIA-PRIMA</span><h2>Localizar por código ou descrição</h2></div><button className="icon-button" type="button" onClick={()=>setMaterialModal(false)}><X/></button></header>
    <div className="process-modal-filters"><label>Grupo<select value={materialGroup} onChange={e=>setMaterialGroup(e.target.value)}><option value="TODOS">Todos os grupos</option>{materialGroups.map(g=><option key={g} value={g}>{g}</option>)}</select></label><label>Código<input autoFocus value={materialCode} onChange={e=>setMaterialCode(e.target.value)} placeholder="Digite parte do código"/></label><label>Descrição<input value={materialDesc} onChange={e=>setMaterialDesc(e.target.value)} placeholder="Digite a descrição"/></label></div>
    <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Código</th><th>Descrição</th><th>Grupo</th><th>Unidade</th><th/></tr></thead><tbody>{materialResults.map(p=><tr key={p.id}><td><b>{p.codigo}</b></td><td>{p.nome}</td><td>{p.categoria??'—'}</td><td>{p.unidade??'UN'}</td><td><button className="industrial-primary" type="button" onClick={()=>chooseMaterial(p.id)}>Selecionar</button></td></tr>)}{!materialResults.length&&<tr><td colSpan={5}>Nenhum material encontrado. Ajuste o grupo, código ou descrição.</td></tr>}</tbody></table></div>
   </div>
  </div>}
 </main>
}
