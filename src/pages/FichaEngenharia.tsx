import { useEffect, useMemo, useState } from 'react'
import { Factory, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;unidade:string|null}
type Machine={id:string;codigo:string;nome:string}
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;unidade_rendimento:string;observacoes:string|null;ativa:boolean}
type BomRow={id?:string;componente_id:string;quantidade:string;perda_percentual:string;lote_obrigatorio:boolean;tipo_item:'COMPRADO'|'FABRICADO';sequencia:number}
type OpRow={id?:string;sequencia:number;operacao:string;maquina_id:string;molde_id:string;setup_min:string;ciclo_seg:string;instrucoes:string}
type QualityRow={id?:string;codigo:string;caracteristica:string;unidade:string;limite_inferior:string;limite_superior:string;frequencia:string;status:string}
type AuditRow={id:string;action:string;module:string;entity:string;created_at:string;new_data:Record<string,unknown>|null}
const emptyBom=():BomRow=>({componente_id:'',quantidade:'1',perda_percentual:'0',lote_obrigatorio:false,tipo_item:'COMPRADO',sequencia:10})
const emptyOp=():OpRow=>({sequencia:10,operacao:'',maquina_id:'',molde_id:'',setup_min:'0',ciclo_seg:'0',instrucoes:''})
const emptyQuality=():QualityRow=>({codigo:'',caracteristica:'',unidade:'',limite_inferior:'',limite_superior:'',frequencia:'100%',status:'ativo'})
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Operação recusada pelo banco.')

export default function FichaEngenharia(){
 const [products,setProducts]=useState<Product[]>([]),[machines,setMachines]=useState<Machine[]>([]),[ficha,setFicha]=useState<Ficha|null>(null)
 const [productId,setProductId]=useState(''),[version,setVersion]=useState('1'),[rendimento,setRendimento]=useState('1'),[unit,setUnit]=useState('UN'),[notes,setNotes]=useState('')
 const [processCode,setProcessCode]=useState(''),[processName,setProcessName]=useState(''),[objective,setObjective]=useState(''),[inputSpec,setInputSpec]=useState(''),[outputSpec,setOutputSpec]=useState('')
 const [bom,setBom]=useState<BomRow[]>([emptyBom()]),[ops,setOps]=useState<OpRow[]>([emptyOp()]),[quality,setQuality]=useState<QualityRow[]>([emptyQuality()])
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[audit,setAudit]=useState<AuditRow[]>([])
 const selected=useMemo(()=>products.find(p=>p.id===productId),[products,productId])
 const totalTime=useMemo(()=>ops.reduce((s,o)=>s+(Number(o.setup_min)||0)+(Number(o.ciclo_seg)||0)*Number(rendimento||0),0),[ops,rendimento])

 useEffect(()=>{void loadBase()},[])
 async function company(){const r=await supabase.rpc('erp_current_empresa_id');if(r.error||!r.data)throw new Error('Empresa da sessão não identificada.');return String(r.data)}
 async function loadBase(){
   setLoading(true)
   try{
     const [p,m]=await Promise.all([
       supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('ativo',true).order('codigo').limit(2000),
       supabase.from('erp_maquinas').select('id,codigo,nome').not('status','eq','INATIVA').order('codigo').limit(500)
     ])
     if(p.error)throw p.error;if(m.error)throw m.error
     setProducts((p.data??[]) as Product[]);setMachines((m.data??[]) as Machine[])
   }catch(e){setNotice(errorText(e))}finally{setLoading(false)}
 }
 async function loadFicha(id:string){
   if(!id){reset(false);return}
   setBusy(true)
   try{
     const empresaId=await company()
     const f=await supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').eq('empresa_id',empresaId).eq('produto_id',id).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
     if(f.error)throw f.error
     if(!f.data){reset(true);setProductId(id);setProcessCode('FP-'+id.slice(0,8).toUpperCase()+'-1');return}
     const current=f.data as Ficha
     setFicha(current);setVersion(String(current.versao));setRendimento(String(current.rendimento));setUnit(current.unidade_rendimento);setNotes(current.observacoes??'')
     setProcessCode('FP-'+id.slice(0,8).toUpperCase()+'-'+current.versao);setProcessName('Processo de fabricação')
     const [bi,ro,qi]=await Promise.all([
       supabase.from('erp_ficha_itens').select('id,componente_id,quantidade,perda_percentual,lote_obrigatorio,tipo_item,sequencia').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
       supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg,instrucoes').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
       supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,limite_inferior,limite_superior,frequencia,status').eq('empresa_id',empresaId).eq('produto_id',id).order('codigo').limit(200)
     ])
     if(bi.error)throw bi.error;if(ro.error)throw ro.error;if(qi.error)throw qi.error
     setBom((bi.data??[]).map(x=>({id:x.id,componente_id:x.componente_id,quantidade:String(x.quantidade),perda_percentual:String(x.perda_percentual),lote_obrigatorio:Boolean(x.lote_obrigatorio),tipo_item:x.tipo_item,sequencia:x.sequencia})))
     setOps((ro.data??[]).map(x=>({id:x.id,sequencia:x.sequencia,operacao:x.operacao,maquina_id:x.maquina_id??'',molde_id:x.molde_id??'',setup_min:String(x.setup_min),ciclo_seg:String(x.ciclo_seg),instrucoes:x.instrucoes??''})))
     setQuality((qi.data??[]).map(x=>({id:x.id,codigo:x.codigo,caracteristica:x.caracteristica,unidade:x.unidade??'',limite_inferior:x.limite_inferior==null?'':String(x.limite_inferior),limite_superior:x.limite_superior==null?'':String(x.limite_superior),frequencia:x.frequencia??'',status:x.status})).concat((qi.data??[]).length?[]:[emptyQuality()]))
     const ar=await supabase.from('erp_audit_logs').select('id,action,module,entity,created_at,new_data').eq('company_id',empresaId).eq('entity_id',current.id).order('created_at',{ascending:false}).limit(50)
     if(!ar.error)setAudit((ar.data??[]) as AuditRow[])
   }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 useEffect(()=>{void loadFicha(productId)},[productId])
 function reset(keepProduct:boolean){setFicha(null);if(!keepProduct)setProductId('');setVersion('1');setRendimento('1');setUnit('UN');setNotes('');setProcessCode('');setProcessName('');setObjective('');setInputSpec('');setOutputSpec('');setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()]);setAudit([])}
 function setBomField(i:number,k:keyof BomRow,v:string|boolean){setBom(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setOpField(i:number,k:keyof OpRow,v:string|number){setOps(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setQualityField(i:number,k:keyof QualityRow,v:string){setQuality(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 async function save(){
   setBusy(true);setNotice('')
   try{
     if(!productId)throw new Error('Selecione o produto produzido.')
     if(Number(rendimento)<=0)throw new Error('Rendimento deve ser maior que zero.')
     if(bom.some(x=>!x.componente_id||Number(x.quantidade)<=0))throw new Error('Preencha todos os materiais da BOM.')
     if(ops.some(x=>!x.operacao.trim()||Number(x.setup_min)<0||Number(x.ciclo_seg)<0))throw new Error('Preencha todas as operações e tempos.')
     const empresaId=await company()
     const saved=await supabase.from('erp_fichas_tecnicas').upsert({empresa_id:empresaId,produto_id:productId,versao:Number(version),rendimento:Number(rendimento),unidade_rendimento:unit.trim()||'UN',observacoes:JSON.stringify({processCode,processName,objective,inputSpec,outputSpec,notes}),ativa:true},{onConflict:'empresa_id,produto_id,versao'}).select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').single()
     if(saved.error)throw saved.error
     const fichaId=String(saved.data.id)
     const delBom=await supabase.from('erp_ficha_itens').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(delBom.error)throw delBom.error
     const insBom=await supabase.from('erp_ficha_itens').insert(bom.map(x=>({empresa_id:empresaId,ficha_id:fichaId,componente_id:x.componente_id,quantidade:Number(x.quantidade),perda_percentual:Number(x.perda_percentual),lote_obrigatorio:x.lote_obrigatorio,tipo_item:x.tipo_item,sequencia:x.sequencia})));if(insBom.error)throw insBom.error
     const delOps=await supabase.from('erp_ficha_operacoes').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(delOps.error)throw delOps.error
     const insOps=await supabase.from('erp_ficha_operacoes').insert(ops.map(x=>({empresa_id:empresaId,ficha_id:fichaId,sequencia:x.sequencia,operacao:x.operacao.trim(),maquina_id:x.maquina_id||null,molde_id:x.molde_id||null,setup_min:Number(x.setup_min),ciclo_seg:Number(x.ciclo_seg),instrucoes:x.instrucoes.trim()||null})));if(insOps.error)throw insOps.error
     for(const q of quality.filter(x=>x.caracteristica.trim())){
       const payload={empresa_id:empresaId,codigo:q.codigo.trim(),produto_id:productId,caracteristica:q.caracteristica.trim(),unidade:q.unidade.trim()||null,limite_inferior:q.limite_inferior===''?null:Number(q.limite_inferior),limite_superior:q.limite_superior===''?null:Number(q.limite_superior),frequencia:q.frequencia.trim(),status:q.status}
       const qr=q.id?await supabase.from('erp_planos_inspecao').update(payload).eq('id',q.id).eq('empresa_id',empresaId):await supabase.from('erp_planos_inspecao').insert(payload)
       if(qr.error)throw qr.error
     }
     const auth=await supabase.auth.getUser()
     await supabase.from('erp_audit_logs').insert({company_id:empresaId,user_id:auth.data.user?.id??null,action:ficha?'UPDATE':'CREATE',module:'ENGENHARIA',entity:'erp_fichas_tecnicas',entity_id:fichaId,new_data:{produto_id:productId,versao:Number(version),materiais:bom.length,operacoes:ops.length,controles:quality.filter(q=>q.caracteristica.trim()).length}})
     setFicha(saved.data as Ficha);setNotice('Ficha de processo salva no banco: BOM, roteiro, qualidade e auditoria registrados.')
     const ar=await supabase.from('erp_audit_logs').select('id,action,module,entity,created_at,new_data').eq('company_id',empresaId).eq('entity_id',fichaId).order('created_at',{ascending:false}).limit(50);if(!ar.error)setAudit((ar.data??[]) as AuditRow[])
   }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 if(loading)return <main className="industrial-form-page"><div className="industrial-panel">Carregando ficha de processo…</div></main>
 const tabs=[['identificacao','Identificação'],['materiais','Materiais / BOM'],['processo','Roteiro do Processo'],['qualidade','Controle da Qualidade'],['documentos','Documentos / Instruções'],['historico','Histórico']] as const
 return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header">
    <div>
      <span className="industrial-eyebrow">INDUSTRIA ERP • Engenharia / Processos</span>
      <h1>Ficha de Processo</h1>
      <p>Documento operacional único para fabricação, roteiro, parâmetros, qualidade e aprovação.</p>
    </div>
    <div className="process-sheet-actions">
      <button className="industrial-secondary" type="button" onClick={()=>reset(false)}><X size={16}/>Novo</button>
      <button className="industrial-primary" type="button" onClick={()=>void save()} disabled={busy}><Save size={16}/>{busy?'Gravando…':'Gravar'}</button>
    </div>
  </header>

  <div className="process-sheet-toolbar">
    <button type="button" onClick={()=>reset(false)}>Novo</button>
    <button type="button" onClick={()=>void save()} disabled={busy}>Gravar</button>
    <button type="button" onClick={()=>productId&&void loadFicha(productId)} disabled={busy}>Pesquisar</button>
    <button type="button" onClick={()=>window.print()}>Imprimir</button>
    <span className="process-sheet-toolbar-status">{notice||'Ficha de processo • edição operacional'}</span>
  </div>

  <section className="process-sheet-module-title">
    <div><b>FICHA DE PROCESSO</b><span>Módulo: Engenharia / Qualidade</span></div>
    <div className="process-sheet-document-id"><span>Código</span><strong>{processCode||'—'}</strong><small>Revisão {version}</small></div>
  </section>

  <section className="industrial-panel process-sheet-selector">
    <div className="process-section-heading"><span>IDENTIFICAÇÃO</span><h2>Dados do processo</h2></div>
    <div className="process-form-grid">
      <label>Produto<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
      <label>Processo<input value={processName} onChange={e=>setProcessName(e.target.value)} placeholder="Usinagem / Injeção / Montagem"/></label>
      <label>Versão<input type="number" min="1" value={version} onChange={e=>setVersion(e.target.value)}/></label>
      <label>Rendimento<input type="number" min="0.000001" step="0.001" value={rendimento} onChange={e=>setRendimento(e.target.value)}/></label>
      <label>Unidade<input value={unit} onChange={e=>setUnit(e.target.value.toUpperCase())}/></label>
      <label>Status<input value={ficha?.ativa?'Ativa':'Rascunho'} readOnly/></label>
      <label className="process-form-span-2">Código da ficha<input value={processCode} onChange={e=>setProcessCode(e.target.value)} placeholder="FP-0001"/></label>
      <label className="process-form-span-2">Objetivo<textarea rows={3} value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Finalidade do processo e requisitos que devem ser atendidos."/></label>
    </div>
  </section>

  <section className="industrial-panel process-sheet-operation-head">
    <div className="process-section-heading"><span>ROTEIRO DE FABRICAÇÃO</span><h2>Operações</h2><p>Sequência, centro/máquina, setup, ciclo, ferramental e instrução.</p></div>
    <button className="industrial-secondary" type="button" onClick={()=>setOps(r=>[...r,{...emptyOp(),sequencia:(r.at(-1)?.sequencia??0)+10}])}><Plus size={16}/>Adicionar operação</button>
  </section>
  <section className="industrial-panel process-sheet-table-panel">
    <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Seq.</th><th>Operação</th><th>Centro / Máquina</th><th>Molde / Ferramenta</th><th>Setup</th><th>Ciclo</th><th>Mão de obra</th><th>Instrução</th><th></th></tr></thead><tbody>{ops.map((r,i)=><tr key={r.id??'o'+i}>
      <td><input type="number" value={r.sequencia} onChange={e=>setOpField(i,'sequencia',Number(e.target.value))}/></td>
      <td><input value={r.operacao} onChange={e=>setOpField(i,'operacao',e.target.value)} placeholder="Operação"/></td>
      <td><select value={r.maquina_id} onChange={e=>setOpField(i,'maquina_id',e.target.value)}><option value="">Selecionar</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></td>
      <td><input value={r.molde_id} onChange={e=>setOpField(i,'molde_id',e.target.value)} placeholder="Ferramenta / molde"/></td>
      <td><input type="number" min="0" step="0.1" value={r.setup_min} onChange={e=>setOpField(i,'setup_min',e.target.value)}/></td>
      <td><input type="number" min="0" step="0.001" value={r.ciclo_seg} onChange={e=>setOpField(i,'ciclo_seg',e.target.value)}/></td>
      <td><input value="1 operador" readOnly/></td>
      <td><textarea rows={2} value={r.instrucoes} onChange={e=>setOpField(i,'instrucoes',e.target.value)} placeholder="Instrução controlada / parâmetro crítico"/></td>
      <td><button type="button" className="icon-button danger" onClick={()=>setOps(x=>x.length===1?[emptyOp()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td>
    </tr>)}</tbody></table></div>
  </section>

  <section className="industrial-panel process-sheet-table-panel">
    <div className="process-section-heading"><span>ESTRUTURA DO PRODUTO</span><h2>Materiais / BOM</h2><p>Componentes, quantidade, unidade, perda, lote e origem.</p></div>
    <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Seq.</th><th>Componente</th><th>Descrição</th><th>Qtd.</th><th>Un.</th><th>Perda %</th><th>Lote</th><th>Origem</th><th></th></tr></thead><tbody>{bom.map((r,i)=>{const p=products.find(x=>x.id===r.componente_id);return <tr key={r.id??'b'+i}>
      <td>{r.sequencia}</td><td><select value={r.componente_id} onChange={e=>setBomField(i,'componente_id',e.target.value)}><option value="">Selecionar</option>{products.filter(p=>p.id!==productId).map(p=><option key={p.id} value={p.id}>{p.codigo}</option>)}</select></td>
      <td>{p?.nome??'—'}</td><td><input type="number" min="0.000001" step="0.001" value={r.quantidade} onChange={e=>setBomField(i,'quantidade',e.target.value)}/></td>
      <td>{p?.unidade??'UN'}</td><td><input type="number" min="0" step="0.01" value={r.perda_percentual} onChange={e=>setBomField(i,'perda_percentual',e.target.value)}/></td>
      <td><input type="checkbox" checked={r.lote_obrigatorio} onChange={e=>setBomField(i,'lote_obrigatorio',e.target.checked)}/></td>
      <td><select value={r.tipo_item} onChange={e=>setBomField(i,'tipo_item',e.target.value as BomRow['tipo_item'])}><option value="COMPRADO">Comprado</option><option value="FABRICADO">Fabricado</option></select></td>
      <td><button type="button" className="icon-button danger" onClick={()=>setBom(x=>x.length===1?[emptyBom()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td>
    </tr>})}</tbody></table></div>
    <button className="industrial-secondary process-add-row" type="button" onClick={()=>setBom(r=>[...r,{...emptyBom(),sequencia:(r.at(-1)?.sequencia??0)+10}])}><Plus size={16}/>Adicionar material</button>
  </section>

  <section className="process-sheet-two-columns">
    <article className="industrial-panel">
      <div className="process-section-heading"><span>PARÂMETROS DO PROCESSO</span><h2>Entradas e saídas</h2></div>
      <label>Entradas / materiais recebidos<textarea rows={6} value={inputSpec} onChange={e=>setInputSpec(e.target.value)} placeholder="Matéria-prima, componentes, lotes, desenhos e documentos."/></label>
      <label>Saídas / produto entregue<textarea rows={6} value={outputSpec} onChange={e=>setOutputSpec(e.target.value)} placeholder="Produto, subproduto, lote, embalagem e registros de liberação."/></label>
    </article>
    <article className="industrial-panel">
      <div className="process-section-heading"><span>DOCUMENTOS / INSTRUÇÕES</span><h2>Documentação controlada</h2></div>
      <label>POP / IT / desenho / parâmetros<textarea rows={12} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Códigos, revisões, normas, desenho técnico, instrução de trabalho e parâmetros críticos…"/></label>
    </article>
  </section>

  <section className="industrial-panel process-sheet-table-panel">
    <div className="process-section-heading"><span>CONTROLE DA QUALIDADE</span><h2>Parâmetros e critérios de aceitação</h2><p>Inspeção ligada ao produto e ao processo.</p></div>
    <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Código</th><th>Parâmetro / característica</th><th>Un.</th><th>Valor nominal</th><th>Tol. mín.</th><th>Tol. máx.</th><th>Frequência</th><th>Status</th><th></th></tr></thead><tbody>{quality.map((r,i)=><tr key={r.id??'q'+i}>
      <td><input value={r.codigo} onChange={e=>setQualityField(i,'codigo',e.target.value)} placeholder="CQ-001"/></td><td><input value={r.caracteristica} onChange={e=>setQualityField(i,'caracteristica',e.target.value)} placeholder="Dimensão / peso / aparência"/></td><td><input value={r.unidade} onChange={e=>setQualityField(i,'unidade',e.target.value)} placeholder="mm"/></td>
      <td><input placeholder="—"/></td><td><input type="number" step="0.001" value={r.limite_inferior} onChange={e=>setQualityField(i,'limite_inferior',e.target.value)}/></td><td><input type="number" step="0.001" value={r.limite_superior} onChange={e=>setQualityField(i,'limite_superior',e.target.value)}/></td>
      <td><input value={r.frequencia} onChange={e=>setQualityField(i,'frequencia',e.target.value)}/></td><td><select value={r.status} onChange={e=>setQualityField(i,'status',e.target.value)}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></td>
      <td><button type="button" className="icon-button danger" onClick={()=>setQuality(x=>x.length===1?[emptyQuality()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td>
    </tr>)}</tbody></table></div>
    <button className="industrial-secondary process-add-row" type="button" onClick={()=>setQuality(r=>[...r,emptyQuality()])}><Plus size={16}/>Adicionar controle</button>
  </section>

  <section className="process-sheet-approval">
    <div><span>APROVAÇÃO</span><strong>Responsável Engenharia</strong><small>Nome / assinatura / data</small></div>
    <div><span>QUALIDADE</span><strong>Responsável CQ</strong><small>Nome / assinatura / data</small></div>
    <div><span>STATUS DA FICHA</span><strong>{ficha?.ativa?'ATIVA':'RASCUNHO'}</strong><small>Revisão {version} • {selected?.codigo??'produto não selecionado'}</small></div>
  </section>

  {audit.length>0&&<section className="industrial-panel process-sheet-history"><div className="process-section-heading"><span>HISTÓRICO</span><h2>Auditoria da ficha</h2></div>{audit.slice(0,8).map(a=><div className="process-history-row" key={a.id}><b>{a.action}</b><span>{a.module} • {a.entity}</span><time>{new Date(a.created_at).toLocaleString('pt-BR')}</time></div>)}</section>}
  {notice&&<div className="industrial-notice" role="status">{notice}</div>}
 </main>