import { useEffect, useMemo, useState } from 'react'
import { Factory, Plus, Save, Trash2, X, Search, Printer, CircleDot, Layers3, Paintbrush, Stamp, Boxes, ChevronRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;unidade:string|null}
type Machine={id:string;codigo:string;nome:string}
type Kind='PRENSADOS'|'INJETADOS'|'ACABAMENTO'|'ESTAMPARIA'|'DIVERSOS'
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;unidade_rendimento:string;observacoes:string|null;ativa:boolean}
type BomRow={id?:string;componente_id:string;quantidade:string;perda_percentual:string;lote_obrigatorio:boolean;tipo_item:'COMPRADO'|'FABRICADO';sequencia:number}
type OpRow={id?:string;sequencia:number;operacao:string;maquina_id:string;molde_id:string;setup_min:string;ciclo_seg:string;instrucoes:string}
type QualityRow={id?:string;codigo:string;caracteristica:string;unidade:string;nominal:string;limite_inferior:string;limite_superior:string;frequencia:string;status:string}

const kinds:{id:Kind;title:string;description:string;icon:any}[]=[
 {id:'PRENSADOS',title:'Ficha de Processo — Prensados',description:'Composto, pré-forma, prensa, molde, pressão, temperatura, cura e pós-cura.',icon:CircleDot},
 {id:'INJETADOS',title:'Ficha de Processo — Injetados',description:'Material, secagem, molde, cavidades, temperaturas, injeção, recalque, dosagem e ciclo.',icon:Factory},
 {id:'ACABAMENTO',title:'Ficha de Processo — Acabamento',description:'Preparação, operação, equipamento, parâmetros, cura/secagem, inspeção e embalagem.',icon:Paintbrush},
 {id:'ESTAMPARIA',title:'Ficha de Processo — Estampo',description:'Chapa, espessura, ferramenta, prensa, força, avanço, lubrificação e inspeção.',icon:Stamp},
 {id:'DIVERSOS',title:'Ficha de Processo — Diversos',description:'Outros processos industriais configuráveis sem forçar o processo para outro modelo.',icon:Boxes}
]

const emptyBom=():BomRow=>({componente_id:'',quantidade:'1',perda_percentual:'0',lote_obrigatorio:false,tipo_item:'COMPRADO',sequencia:10})
const emptyOp=():OpRow=>({sequencia:10,operacao:'',maquina_id:'',molde_id:'',setup_min:'0',ciclo_seg:'0',instrucoes:''})
const emptyQuality=():QualityRow=>({codigo:'',caracteristica:'',unidade:'',nominal:'',limite_inferior:'',limite_superior:'',frequencia:'100%',status:'ativo'})
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Operação recusada pelo banco.')

export default function FichaEngenharia(){
 const [kind,setKind]=useState<Kind|null>(null),[products,setProducts]=useState<Product[]>([]),[machines,setMachines]=useState<Machine[]>([])
 const [ficha,setFicha]=useState<Ficha|null>(null),[productId,setProductId]=useState(''),[version,setVersion]=useState('1'),[rendimento,setRendimento]=useState('1'),[unit,setUnit]=useState('UN')
 const [processCode,setProcessCode]=useState(''),[processName,setProcessName]=useState(''),[notes,setNotes]=useState('')
 const [bom,setBom]=useState<BomRow[]>([emptyBom()]),[ops,setOps]=useState<OpRow[]>([emptyOp()]),[quality,setQuality]=useState<QualityRow[]>([emptyQuality()])
 const [spec,setSpec]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[search,setSearch]=useState('')

 const selected=useMemo(()=>products.find(p=>p.id===productId),[products,productId])
 useEffect(()=>{void loadBase()},[])

 async function company(){const r=await supabase.rpc('erp_current_empresa_id');if(r.error||!r.data)throw new Error('Empresa da sessão não identificada.');return String(r.data)}
 async function loadBase(){
  setLoading(true)
  try{
   const[p,m]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome').not('status','eq','INATIVA').order('codigo').limit(500)
   ])
   if(p.error)throw p.error;if(m.error)throw m.error
   setProducts((p.data??[]) as Product[]);setMachines((m.data??[]) as Machine[])
  }catch(e){setNotice(errorText(e))}finally{setLoading(false)}
 }
 async function loadFicha(id:string){
  if(!id||!kind)return
  setBusy(true);setNotice('')
  try{
   const empresaId=await company()
   const f=await supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').eq('empresa_id',empresaId).eq('produto_id',id).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
   if(f.error)throw f.error
   if(!f.data){resetForm(true,id);return}
   const current=f.data as Ficha
   setFicha(current);setVersion(String(current.versao));setRendimento(String(current.rendimento));setUnit(current.unidade_rendimento)
   try{const j=JSON.parse(current.observacoes||'{}');setKind((j.kind||kind) as Kind);setProcessCode(j.processCode||'');setProcessName(j.processName||'');setNotes(j.notes||'');setSpec(j.spec||{})}catch{setSpec({})}
   const[bi,ro,qi]=await Promise.all([
    supabase.from('erp_ficha_itens').select('id,componente_id,quantidade,perda_percentual,lote_obrigatorio,tipo_item,sequencia').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg,instrucoes').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,limite_inferior,limite_superior,frequencia,status').eq('empresa_id',empresaId).eq('produto_id',id).order('codigo').limit(200)
   ])
   if(bi.error)throw bi.error;if(ro.error)throw ro.error;if(qi.error)throw qi.error
   setBom((bi.data??[]).map(x=>({id:x.id,componente_id:x.componente_id,quantidade:String(x.quantidade),perda_percentual:String(x.perda_percentual),lote_obrigatorio:Boolean(x.lote_obrigatorio),tipo_item:x.tipo_item,sequencia:x.sequencia})))
   setOps((ro.data??[]).map(x=>({id:x.id,sequencia:x.sequencia,operacao:x.operacao,maquina_id:x.maquina_id??'',molde_id:x.molde_id??'',setup_min:String(x.setup_min),ciclo_seg:String(x.ciclo_seg),instrucoes:x.instrucoes??''})))
   setQuality((qi.data??[]).map(x=>({id:x.id,codigo:x.codigo,caracteristica:x.caracteristica,unidade:x.unidade??'',nominal:'',limite_inferior:x.limite_inferior==null?'':String(x.limite_inferior),limite_superior:x.limite_superior==null?'':String(x.limite_superior),frequencia:x.frequencia??'',status:x.status})).concat((qi.data??[]).length?[]:[emptyQuality()]))
  }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 function resetForm(keepProduct=false,id=''){
  setFicha(null);if(!keepProduct){setProductId('');setKind(null)}else setProductId(id)
  setVersion('1');setRendimento('1');setUnit('UN');setProcessCode('');setProcessName('');setNotes('');setSpec({});setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()])
 }
 function setS(k:string,v:string){setSpec(x=>({...x,[k]:v}))}
 function setBomField(i:number,k:keyof BomRow,v:string|boolean){setBom(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setOpField(i:number,k:keyof OpRow,v:string|number){setOps(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setQualityField(i:number,k:keyof QualityRow,v:string){setQuality(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}

 async function save(){
  if(!kind)return setNotice('Selecione o tipo de ficha.')
  if(!productId)return setNotice('Selecione o produto produzido.')
  if(bom.some(x=>!x.componente_id||Number(x.quantidade)<=0))return setNotice('Preencha todos os materiais da BOM.')
  if(ops.some(x=>!x.operacao.trim()||Number(x.setup_min)<0||Number(x.ciclo_seg)<0))return setNotice('Preencha todas as operações e tempos.')
  setBusy(true);setNotice('')
  try{
   const empresaId=await company()
   const payload={kind,processCode,processName,notes,spec}
   const saved=await supabase.from('erp_fichas_tecnicas').upsert({empresa_id:empresaId,produto_id:productId,versao:Number(version),rendimento:Number(rendimento)||1,unidade_rendimento:unit.trim()||'UN',observacoes:JSON.stringify(payload),ativa:true},{onConflict:'empresa_id,produto_id,versao'}).select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').single()
   if(saved.error)throw saved.error
   const fichaId=String(saved.data.id)
   const db=await supabase.from('erp_ficha_itens').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(db.error)throw db.error
   const ib=await supabase.from('erp_ficha_itens').insert(bom.map(x=>({empresa_id:empresaId,ficha_id:fichaId,componente_id:x.componente_id,quantidade:Number(x.quantidade),perda_percentual:Number(x.perda_percentual),lote_obrigatorio:x.lote_obrigatorio,tipo_item:x.tipo_item,sequencia:x.sequencia})));if(ib.error)throw ib.error
   const dops=await supabase.from('erp_ficha_operacoes').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(dops.error)throw dops.error
   const io=await supabase.from('erp_ficha_operacoes').insert(ops.map(x=>({empresa_id:empresaId,ficha_id:fichaId,sequencia:x.sequencia,operacao:x.operacao.trim(),maquina_id:x.maquina_id||null,molde_id:x.molde_id||null,setup_min:Number(x.setup_min),ciclo_seg:Number(x.ciclo_seg),instrucoes:x.instrucoes.trim()||null})));if(io.error)throw io.error
   for(const q of quality.filter(x=>x.caracteristica.trim())){
    const qp={empresa_id:empresaId,codigo:q.codigo.trim()||('CQ-'+Date.now()),produto_id:productId,caracteristica:q.caracteristica.trim(),unidade:q.unidade.trim()||null,limite_inferior:q.limite_inferior===''?null:Number(q.limite_inferior),limite_superior:q.limite_superior===''?null:Number(q.limite_superior),frequencia:q.frequencia.trim()||'100%',status:q.status}
    const qr=q.id?await supabase.from('erp_planos_inspecao').update(qp).eq('id',q.id).eq('empresa_id',empresaId):await supabase.from('erp_planos_inspecao').insert(qp)
    if(qr.error)throw qr.error
   }
   setFicha(saved.data as Ficha);setNotice('Ficha de processo gravada: parâmetros, materiais, roteiro e controles de qualidade registrados.')
  }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }

 if(loading)return <main className="industrial-form-page"><div className="industrial-panel">Carregando Fichas de Processo…</div></main>
 if(!kind)return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header"><div><span className="industrial-eyebrow">INDUSTRIA ERP • ENGENHARIA / PROCESSOS</span><h1>Fichas de Processo</h1><p>Modelos separados por tecnologia. Cada ficha possui seus próprios parâmetros, controles e roteiro.</p></div><button className="industrial-secondary" type="button" onClick={()=>resetForm(false)}><X size={16}/> Limpar</button></header>
  <section className="industrial-panel" style={{marginBottom:16}}><div className="process-section-heading"><span>ESCOLHA O PROCESSO</span><h2>Não misturar tecnologias</h2><p>Prensados, Injetados, Acabamento, Estampo e Diversos possuem campos específicos.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{kinds.map(k=>{const I=k.icon;return <button key={k.id} type="button" className="industrial-panel text-left" style={{cursor:'pointer',border:'2px solid #d7e6eb'}} onClick={()=>{setKind(k.id);setProcessName(k.title.replace('Ficha de Processo — ',''));setProcessCode('FP-'+k.id+'-001')}}><div className="flex items-center gap-4"><span style={{display:'grid',placeItems:'center',width:64,height:64,borderRadius:16,background:'#eef7f9'}}><I size={34}/></span><div><strong style={{fontSize:20}}>{k.title}</strong><p style={{marginTop:5,color:'#5a6d75'}}>{k.description}</p></div><ChevronRight style={{marginLeft:'auto'}}/></div></button>})}</div></section>
  <section className="industrial-panel"><div className="process-section-heading"><span>PADRÃO DO DOCUMENTO</span><h2>Ficha única, sem abas</h2><p>Identificação → materiais → parâmetros específicos → roteiro → controle de qualidade → aprovação.</p></div><div className="grid md:grid-cols-3 gap-4"><Info title="Documento controlado" text="Código, revisão, produto, desenho, responsável e aprovação."/><Info title="Chão de fábrica" text="Máquina, ferramenta, setup, ciclo, instruções e parâmetros que o PCP usa na OP."/><Info title="Qualidade" text="Características, nominal, limites, unidade, frequência e critério de aceitação."/></div></section>
 </main>

 const labels=kind==='PRENSADOS'?['Composto / material','Código do composto','Dureza alvo','Prensa','Molde','Pressão de prensagem','Temperatura','Tempo de cura','Pós-cura','Desmoldante / agente']:kind==='INJETADOS'?['Matéria-prima','Código da MP','Cor / pigmento','Máquina injetora','Molde','Nº cavidades','Secagem do material','Temperatura do molde','Pressão de injeção','Velocidade de injeção','Comutação','Pressão de recalque','Tempo de recalque','Resfriamento','Dosagem','Contrapressão','Descompressão','Ciclo alvo','Câmara quente']:kind==='ESTAMPARIA'?['Material / chapa','Espessura','Largura do blank','Comprimento do blank','Prensa','Tonelagem','Ferramenta / estampo','Curso','Velocidade','Avanço','Passo','Lubrificação','Operações de corte','Operações de dobra','Operações de conformação','Rebarba máxima']:kind==='ACABAMENTO'?['Tipo de acabamento','Preparação da superfície','Equipamento','Ferramenta / abrasivo','Produto químico / tinta','Diluição / mistura','Velocidade de aplicação','Pressão','Temperatura de secagem','Tempo de secagem','Tempo de cura','Espessura alvo','Método de inspeção','Embalagem']:['Tipo de processo','Objetivo','Equipamento','Ferramenta / dispositivo','Material de entrada','Parâmetro 1','Parâmetro 2','Parâmetro 3','Tempo padrão','Critério de aceitação','EPI / segurança','Instrução especial']

 return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header"><div><span className="industrial-eyebrow">INDUSTRIA ERP • ENGENHARIA / PROCESSOS</span><h1>{kinds.find(x=>x.id===kind)?.title}</h1><p>Ficha operacional completa para orientar Engenharia, PCP, Produção e Qualidade.</p></div><div className="process-sheet-actions"><button className="industrial-secondary" onClick={()=>setKind(null)}><X size={16}/>Tipos</button><button className="industrial-secondary" onClick={()=>window.print()}><Printer size={16}/>Imprimir</button><button className="industrial-primary" onClick={()=>void save()} disabled={busy}><Save size={16}/>{busy?'Gravando…':'Gravar'}</button></div></header>
  <div className="process-sheet-toolbar"><button onClick={()=>resetForm(false)}>Novo</button><button onClick={()=>void save()} disabled={busy}>Gravar</button><button onClick={()=>productId&&void loadFicha(productId)} disabled={busy}><Search size={15}/>Pesquisar</button><button onClick={()=>window.print()}><Printer size={15}/>Imprimir</button><span className="process-sheet-toolbar-status">{notice||'Documento operacional controlado'}</span></div>

  <section className="process-sheet-module-title"><div><b>FICHA DE PROCESSO {kind}</b><span>Engenharia • PCP • Produção • Qualidade</span></div><div className="process-sheet-document-id"><span>Código</span><strong>{processCode||'—'}</strong><small>Revisão {version}</small></div></section>

  <section className="industrial-panel">
   <div className="process-section-heading"><span>1 • IDENTIFICAÇÃO E CONTROLE DO DOCUMENTO</span><h2>Dados mestres</h2></div>
   <div className="process-form-grid">
    <label>Produto / peça<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
    <label>Código da ficha<input value={processCode} onChange={e=>setProcessCode(e.target.value)}/></label>
    <label>Revisão<input type="number" min="1" value={version} onChange={e=>setVersion(e.target.value)}/></label>
    <label>Nome do processo<input value={processName} onChange={e=>setProcessName(e.target.value)}/></label>
    <label>Rendimento<input type="number" min="0.001" step="0.001" value={rendimento} onChange={e=>setRendimento(e.target.value)}/></label>
    <label>Unidade<input value={unit} onChange={e=>setUnit(e.target.value.toUpperCase())}/></label>
    <label>Desenho / especificação<input value={spec.desenho||''} onChange={e=>setS('desenho',e.target.value)} placeholder="Código e revisão do desenho"/></label>
    <label>Responsável<input value={spec.responsavel||''} onChange={e=>setS('responsavel',e.target.value)}/></label>
    <label>Data de aprovação<input type="date" value={spec.dataAprovacao||''} onChange={e=>setS('dataAprovacao',e.target.value)}/></label>
   </div>
  </section>

  <section className="industrial-panel">
   <div className="process-section-heading"><span>2 • PARÂMETROS ESPECÍFICOS DO PROCESSO</span><h2>{kinds.find(x=>x.id===kind)?.title.replace('Ficha de Processo — ','')}</h2><p>Campos técnicos específicos para não transformar todas as tecnologias em uma ficha genérica.</p></div>
   <div className="process-form-grid">{labels.map(label=><label key={label}>{label}<input value={spec[label]||''} onChange={e=>setS(label,e.target.value)} placeholder="Informar valor / faixa / condição"/></label>)}</div>
   <label style={{display:'block',marginTop:16}}>Observações e condições especiais<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Setup, segurança, sequência, restrições, parâmetros críticos, condições de partida e parada."/></label>
  </section>

  <section className="industrial-panel process-sheet-table-panel">
   <div className="process-section-heading"><span>3 • MATERIAIS / BOM</span><h2>Materiais consumidos pelo processo</h2><p>O PCP/MRP usa esta estrutura para calcular necessidade e o Almoxarifado para rastrear lotes.</p></div>
   <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Seq.</th><th>Componente</th><th>Qtd.</th><th>Un.</th><th>Perda %</th><th>Lote</th><th>Origem</th><th></th></tr></thead><tbody>{bom.map((r,i)=>{const p=products.find(x=>x.id===r.componente_id);return <tr key={r.id||i}><td>{r.sequencia}</td><td><select value={r.componente_id} onChange={e=>setBomField(i,'componente_id',e.target.value)}><option value="">Selecionar</option>{products.filter(p=>p.id!==productId).map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></td><td><input type="number" min="0.001" step="0.001" value={r.quantidade} onChange={e=>setBomField(i,'quantidade',e.target.value)}/></td><td>{p?.unidade||'UN'}</td><td><input type="number" min="0" step="0.01" value={r.perda_percentual} onChange={e=>setBomField(i,'perda_percentual',e.target.value)}/></td><td><input type="checkbox" checked={r.lote_obrigatorio} onChange={e=>setBomField(i,'lote_obrigatorio',e.target.checked)}/></td><td><select value={r.tipo_item} onChange={e=>setBomField(i,'tipo_item',e.target.value as BomRow['tipo_item'])}><option value="COMPRADO">Comprado</option><option value="FABRICADO">Fabricado</option></select></td><td><button className="icon-button danger" onClick={()=>setBom(x=>x.length===1?[emptyBom()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td></tr>})}</tbody></table></div>
   <button className="industrial-secondary process-add-row" onClick={()=>setBom(r=>[...r,{...emptyBom(),sequencia:(r.at(-1)?.sequencia||0)+10}])}><Plus size={16}/>Adicionar material</button>
  </section>

  <section className="industrial-panel process-sheet-table-panel">
   <div className="process-section-heading"><span>4 • ROTEIRO</span><h2>Sequência de operações</h2><p>Operação, recurso, ferramenta, setup, ciclo e instrução de trabalho.</p></div>
   <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Seq.</th><th>Operação</th><th>Máquina / centro</th><th>Molde / ferramenta</th><th>Setup min</th><th>Ciclo s</th><th>Instrução</th><th></th></tr></thead><tbody>{ops.map((r,i)=><tr key={r.id||i}><td><input type="number" value={r.sequencia} onChange={e=>setOpField(i,'sequencia',Number(e.target.value))}/></td><td><input value={r.operacao} onChange={e=>setOpField(i,'operacao',e.target.value)} placeholder="Ex.: preparação / produção / inspeção"/></td><td><select value={r.maquina_id} onChange={e=>setOpField(i,'maquina_id',e.target.value)}><option value="">Selecionar</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></td><td><input value={r.molde_id} onChange={e=>setOpField(i,'molde_id',e.target.value)} placeholder="Molde / estampo / dispositivo"/></td><td><input type="number" min="0" step="0.1" value={r.setup_min} onChange={e=>setOpField(i,'setup_min',e.target.value)}/></td><td><input type="number" min="0" step="0.001" value={r.ciclo_seg} onChange={e=>setOpField(i,'ciclo_seg',e.target.value)}/></td><td><textarea rows={2} value={r.instrucoes} onChange={e=>setOpField(i,'instrucoes',e.target.value)} placeholder="Como executar e quais parâmetros não podem variar"/></td><td><button className="icon-button danger" onClick={()=>setOps(x=>x.length===1?[emptyOp()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
   <button className="industrial-secondary process-add-row" onClick={()=>setOps(r=>[...r,{...emptyOp(),sequencia:(r.at(-1)?.sequencia||0)+10}])}><Plus size={16}/>Adicionar operação</button>
  </section>

  <section className="industrial-panel process-sheet-table-panel">
   <div className="process-section-heading"><span>5 • CONTROLE DE QUALIDADE</span><h2>Características e critérios de aceitação</h2><p>Controle ligado ao processo, não apenas um texto livre.</p></div>
   <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Código</th><th>Característica</th><th>Un.</th><th>Nominal</th><th>Mín.</th><th>Máx.</th><th>Frequência</th><th>Status</th><th></th></tr></thead><tbody>{quality.map((r,i)=><tr key={r.id||i}><td><input value={r.codigo} onChange={e=>setQualityField(i,'codigo',e.target.value)}/></td><td><input value={r.caracteristica} onChange={e=>setQualityField(i,'caracteristica',e.target.value)} placeholder="Dimensão, dureza, peso, aparência…"/></td><td><input value={r.unidade} onChange={e=>setQualityField(i,'unidade',e.target.value)}/></td><td><input value={r.nominal} onChange={e=>setQualityField(i,'nominal',e.target.value)}/></td><td><input value={r.limite_inferior} onChange={e=>setQualityField(i,'limite_inferior',e.target.value)}/></td><td><input value={r.limite_superior} onChange={e=>setQualityField(i,'limite_superior',e.target.value)}/></td><td><input value={r.frequencia} onChange={e=>setQualityField(i,'frequencia',e.target.value)}/></td><td><select value={r.status} onChange={e=>setQualityField(i,'status',e.target.value)}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></td><td><button className="icon-button danger" onClick={()=>setQuality(x=>x.length===1?[emptyQuality()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
   <button className="industrial-secondary process-add-row" onClick={()=>setQuality(r=>[...r,emptyQuality()])}><Plus size={16}/>Adicionar controle</button>
  </section>

  <section className="process-sheet-approval"><div><span>ENGENHARIA / PROCESSO</span><strong>{spec.responsavel||'Responsável não informado'}</strong><small>Revisão {version}</small></div><div><span>QUALIDADE</span><strong>Liberação da ficha</strong><small>Critérios de aceitação registrados</small></div><div><span>PCP / PRODUÇÃO</span><strong>Documento operacional</strong><small>Disponível para roteiro e OP</small></div></section>
  {notice&&<div className="industrial-notice" role="status">{notice}</div>}
 </main>
}

function Info({title,text}:{title:string;text:string}){return <div className="industrial-panel" style={{background:'#f7fbfc'}}><CheckCircle2 size={20}/><strong style={{display:'block',marginTop:8}}>{title}</strong><p style={{color:'#5a6d75'}}>{text}</p></div>}
