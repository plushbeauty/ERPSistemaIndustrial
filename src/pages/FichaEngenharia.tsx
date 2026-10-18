/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-063
 * Alterações: Adicionar estados de filtro de catálogo e tornar o carregamento de qualidade explicitamente QualityRow[].
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-040
 * Alterações: Restaurar o conteúdo integral perdido na revisão anterior; adicionar useMemo e LucideIcon; eliminar o any explícito da matriz de tipos.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Factory, Plus, Save, Trash2, X, Search, Printer, CircleDot, Paintbrush, Stamp, Boxes, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;unidade:string|null}
type Machine={id:string;codigo:string;nome:string}
type Mold={id:string;codigo:string;nome:string;tipo:string;status:string;produto_id:string|null;numero_cavidades:number;cavidades:number;cavidades_ativas:number;ativo:boolean}
type Kind='PRENSADOS'|'INJETADOS'|'ACABAMENTO'|'ESTAMPARIA'|'CORTE_VINCO'|'MONTAGEM_EMBALAGEM'|'MONTAGEM'|'DIVERSOS'
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;unidade_rendimento:string;observacoes:string|null;ativa:boolean}
type BomRow={id?:string;componente_id:string;quantidade:string;perda_percentual:string;lote_obrigatorio:boolean;tipo_item:'COMPRADO'|'FABRICADO';sequencia:number}
type OpRow={id?:string;sequencia:number;operacao:string;maquina_id:string;molde_id:string;setup_min:string;ciclo_seg:string;instrucoes:string}
type QualityRow={id?:string;codigo:string;caracteristica:string;unidade:string;nominal:string;limite_inferior:string;limite_superior:string;frequencia:string;status:string}

const kinds:{id:Kind;title:string;description:string;icon:LucideIcon}[]=[
 {id:'PRENSADOS',title:'Ficha de Processo — Prensados',description:'Composto, pré-forma, prensa, molde, pressão, temperatura, cura e pós-cura.',icon:CircleDot},
 {id:'INJETADOS',title:'Ficha de Processo — Injetados',description:'Material, secagem, molde, cavidades, temperaturas, injeção, recalque, dosagem e ciclo.',icon:Factory},
 {id:'ACABAMENTO',title:'Ficha de Processo — Acabamento',description:'Preparação, operação, equipamento, parâmetros, cura/secagem, inspeção e embalagem.',icon:Paintbrush},
 {id:'ESTAMPARIA',title:'Ficha de Processo — Estampo',description:'Material, espessura, prensa, ferramental, força, avanço e inspeção dimensional.',icon:Stamp},
 {id:'CORTE_VINCO',title:'Ficha de Processo — Corte e Vinco',description:'Material, faca/forma, matriz, pressão, registro, sequência de corte e vinco, descarte e critérios de qualidade.',icon:Stamp},
 {id:'MONTAGEM_EMBALAGEM',title:'Ficha de Processo — Montagem de Embalagem',description:'Montagem da caixa, saco plástico, quantidade por pacote, etiqueta e armazenamento em pallet.',icon:Boxes},
 {id:'MONTAGEM',title:'Ficha de Processo — Montagem',description:'Sequência de montagem, componentes, conferência visual e liberação da peça.',icon:Factory},
 {id:'DIVERSOS',title:'Ficha de Processo — Outros Processos',description:'Outros processos industriais configuráveis sem forçar o processo para outro modelo.',icon:Boxes}
]

const emptyBom=():BomRow=>({componente_id:'',quantidade:'1',perda_percentual:'0',lote_obrigatorio:false,tipo_item:'COMPRADO',sequencia:10})
const emptyOp=():OpRow=>({sequencia:10,operacao:'',maquina_id:'',molde_id:'',setup_min:'0',ciclo_seg:'0',instrucoes:''})
const emptyQuality=():QualityRow=>({codigo:'',caracteristica:'',unidade:'',nominal:'',limite_inferior:'',limite_superior:'',frequencia:'100%',status:'ativo'})
const errorText=(e:unknown)=>e instanceof Error?e.message:String((e as {message?:string})?.message??'Operação recusada pelo banco.')

export default function FichaEngenharia(){
 const location=useLocation()
 const [kind,setKind]=useState<Kind|null>(null),[products,setProducts]=useState<Product[]>([]),[machines,setMachines]=useState<Machine[]>([]),[molds,setMolds]=useState<Mold[]>([]),[catalog,setCatalog]=useState<{id:string;produto_id:string;versao:number;observacoes:string|null}[]>([])
 const [ficha,setFicha]=useState<Ficha|null>(null),[originalQualityIds,setOriginalQualityIds]=useState<string[]>([]),[productId,setProductId]=useState(''),[productCode,setProductCode]=useState(''),[version,setVersion]=useState('1'),[rendimento,setRendimento]=useState('1'),[unit,setUnit]=useState('UN')
 const [processCode,setProcessCode]=useState(''),[processName,setProcessName]=useState(''),[notes,setNotes]=useState('')
 const [bom,setBom]=useState<BomRow[]>([emptyBom()]),[ops,setOps]=useState<OpRow[]>([emptyOp()]),[quality,setQuality]=useState<QualityRow[]>([emptyQuality()])
 const [spec,setSpec]=useState<Record<string,string>>({}),[photoPreview,setPhotoPreview]=useState<{fotoPrincipal:string;fotoSecundaria:string}>({fotoPrincipal:'',fotoSecundaria:''}),[requestedFichaVersion,setRequestedFichaVersion]=useState<number|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[catalogKind,setCatalogKind]=useState<Kind|''>(''),[catalogMold,setCatalogMold]=useState(''),[previewKind,setPreviewKind]=useState<Kind|null>(null)

 const selected=useMemo(()=>products.find(p=>p.id===productId),[products,productId])
 useEffect(()=>{void loadBase()},[])
 useEffect(()=>{
  const requestedKind=new URLSearchParams(location.search).get('tipo')
  if(requestedKind&&kinds.some(k=>k.id===requestedKind)){
   const nextKind=requestedKind as Kind
   setFicha(null);setRequestedFichaVersion(null);setVersion('1');setRendimento('1');setUnit('UN');setProcessCode(`FP-${nextKind}-001`);setProcessName(kinds.find(k=>k.id===nextKind)?.title.replace('Ficha de Processo — ','')||'');setNotes('');setSpec({});setPhotoPreview({fotoPrincipal:'',fotoSecundaria:''});setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()]);setKind(nextKind)
   if(!new URLSearchParams(location.search).get('produto')){setProductId('');setProductCode('')}
  }
 },[location.search])
 useEffect(()=>{
  const requestedProduct=new URLSearchParams(location.search).get('produto')
  if(requestedProduct){const target=products.find(p=>p.id===requestedProduct||p.codigo.toLowerCase()===requestedProduct.toLowerCase());if(target){setProductId(target.id);setProductCode(target.codigo)}}
 },[location.search,products])
 useEffect(()=>{if(selected)setProductCode(selected.codigo)},[selected])
 useEffect(()=>{if(!productId||!kind)return;void loadFicha(productId,kind,requestedFichaVersion)},[productId,kind,requestedFichaVersion])

 async function company(){const r=await supabase.rpc('erp_current_empresa_id');if(r.error||!r.data)throw new Error('Empresa da sessão não identificada.');return String(r.data)}
 async function loadBase(){
  setLoading(true)
  try{
   const empresaId=await company()
   const[p,m,md,fc]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('empresa_id',empresaId).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id',empresaId).not('status','eq','INATIVA').order('codigo').limit(500),
    supabase.from('erp_moldes').select('id,codigo,nome,tipo,status,produto_id,numero_cavidades,cavidades,cavidades_ativas,ativo').eq('empresa_id',empresaId).eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,observacoes').eq('empresa_id',empresaId).eq('ativa',true).order('updated_at',{ascending:false}).limit(1000)
   ])
   if(p.error)throw p.error;if(m.error)throw m.error;if(md.error)throw md.error;if(fc.error)throw fc.error
   const productRows=(p.data??[]) as Product[]
   setProducts(productRows);setMachines((m.data??[]) as Machine[]);setMolds((md.data??[]) as Mold[]);setCatalog((fc.data??[]) as {id:string;produto_id:string;versao:number;observacoes:string|null}[])
   const requested=new URLSearchParams(window.location.search).get('produto')
   if(requested){const byId=productRows.find(x=>x.id===requested);const byCode=productRows.find(x=>x.codigo.toLowerCase()===requested.toLowerCase());const target=byId||byCode;if(target){setProductId(target.id);setProductCode(target.codigo)}}
  }catch(e){setNotice(errorText(e))}finally{setLoading(false)}
 }
 async function loadFicha(id:string, selectedKind:Kind|null=kind, requestedVersion:number|null=null){
  if(!id||!selectedKind)return
  setKind(selectedKind)
  setBusy(true);setNotice('')
  try{
   const empresaId=await company()
   let fichaQuery=supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').eq('empresa_id',empresaId).eq('produto_id',id).eq('ativa',true);if(requestedVersion!==null)fichaQuery=fichaQuery.eq('versao',requestedVersion);const f=await fichaQuery.order('versao',{ascending:false}).limit(1).maybeSingle()
   if(f.error)throw f.error
   if(!f.data){if(requestedVersion!==null)throw new Error(`A revisão ${requestedVersion} não foi encontrada para este produto na empresa autenticada.`);resetForm(true,id);return}
   const current=f.data as Ficha
   setFicha(current);setVersion(String(current.versao));setRendimento(String(current.rendimento));setUnit(current.unidade_rendimento)
   try{const j=JSON.parse(current.observacoes||'{}');const loadedSpec=(j.spec||{}) as Record<string,string>;setKind((j.kind||selectedKind) as Kind);setProcessCode(j.processCode||'');setProcessName(j.processName||'');setNotes(j.notes||'');setSpec(loadedSpec);const preview=async(value:string)=>{if(!value)return '';if(value.startsWith('storage:')){const signed=await supabase.storage.from('engenharia-projetos').createSignedUrl(value.slice(8),3600);if(signed.error){setNotice('A ficha foi localizada, mas uma imagem técnica não pôde ser aberta: '+signed.error.message);return ''}return signed.data.signedUrl}return value};const [principal,secundaria]=await Promise.all([preview(loadedSpec.fotoPrincipal||''),preview(loadedSpec.fotoSecundaria||'')]);setPhotoPreview({fotoPrincipal:principal,fotoSecundaria:secundaria})}catch(e){setPhotoPreview({fotoPrincipal:'',fotoSecundaria:''});throw e}
   const[bi,ro,qi]=await Promise.all([
    supabase.from('erp_ficha_itens').select('id,componente_id,quantidade,perda_percentual,lote_obrigatorio,tipo_item,sequencia').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg,instrucoes').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,valor_nominal,limite_inferior,limite_superior,frequencia,status').eq('empresa_id',empresaId).eq('produto_id',id).order('codigo').limit(200)
   ])
   if(bi.error)throw bi.error;if(ro.error)throw ro.error;if(qi.error)throw qi.error
   setBom((bi.data??[]).map(x=>({id:x.id,componente_id:x.componente_id,quantidade:String(x.quantidade),perda_percentual:String(x.perda_percentual),lote_obrigatorio:Boolean(x.lote_obrigatorio),tipo_item:x.tipo_item,sequencia:x.sequencia})))
   setOps((ro.data??[]).map(x=>({id:x.id,sequencia:x.sequencia,operacao:x.operacao,maquina_id:x.maquina_id??'',molde_id:x.molde_id??'',setup_min:String(x.setup_min),ciclo_seg:String(x.ciclo_seg),instrucoes:x.instrucoes??''})))
   const loadedQuality: QualityRow[] = (qi.data??[]).map(x=>({id:x.id,codigo:x.codigo,caracteristica:x.caracteristica,unidade:x.unidade??'',nominal:x.valor_nominal??'',limite_inferior:x.limite_inferior==null?'':String(x.limite_inferior),limite_superior:x.limite_superior==null?'':String(x.limite_superior),frequencia:x.frequencia??'',status:x.status}));setOriginalQualityIds(loadedQuality.flatMap(x=>x.id?[x.id]:[]));setQuality(loadedQuality.length ? loadedQuality : [emptyQuality()])
  }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 function resetForm(keepProduct=false,id=''){
  setFicha(null);setOriginalQualityIds([]);setRequestedFichaVersion(null);if(!keepProduct){setProductId('');setKind(null)}else setProductId(id)
  setVersion('1');setRendimento('1');setUnit('UN');setProcessCode('');setProcessName('');setNotes('');setSpec({});setPhotoPreview({fotoPrincipal:'',fotoSecundaria:''});setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()])
 }
 function setS(k:string,v:string){setSpec(x=>({...x,[k]:v}))}
 function setBomField(i:number,k:keyof BomRow,v:string|boolean){setBom(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setOpField(i:number,k:keyof OpRow,v:string|number){setOps(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 function setQualityField(i:number,k:keyof QualityRow,v:string){setQuality(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 async function setPhoto(key:'fotoPrincipal'|'fotoSecundaria',file:File|null){if(!file)return;if(!productId){setNotice('Selecione o produto antes de anexar a imagem técnica.');return}if(file.size>10*1024*1024){setNotice('A imagem técnica deve ter no máximo 10 MB.');return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setNotice('Use imagem JPG, PNG ou WebP.');return}setBusy(true);setNotice('');try{const empresaId=await company();const safeName=file.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');const storagePath=`${empresaId}/fichas-processo/${productId}/${Date.now()}-${safeName}`;const uploaded=await supabase.storage.from('engenharia-projetos').upload(storagePath,file,{upsert:false,contentType:file.type});if(uploaded.error)throw uploaded.error;const signed=await supabase.storage.from('engenharia-projetos').createSignedUrl(storagePath,3600);if(signed.error)throw signed.error;setS(key,`storage:${storagePath}`);setPhotoPreview(x=>({...x,[key]:signed.data.signedUrl}));setNotice('Imagem técnica enviada ao armazenamento da empresa autenticada. A referência será gravada junto à ficha.')}catch(e){setNotice(errorText(e))}finally{setBusy(false)}}

 async function save(){
  if(!kind)return setNotice('Selecione o tipo de ficha.')
  if(!productId)return setNotice('Selecione o produto produzido.')
  if((kind==='PRENSADOS'||kind==='INJETADOS')&&(!spec.moldeId||Number(spec.cavidades)<=0))return setNotice('Para Prensados e Injetados, informe o molde e a quantidade de cavidades.')
  if((kind==='ESTAMPARIA'||kind==='CORTE_VINCO')&&!spec.moldeId)return setNotice('Selecione o estampo/ferramental cadastrado para este processo.')
  if(bom.some(x=>!x.componente_id||Number(x.quantidade)<=0))return setNotice('Preencha todos os materiais da BOM.')
  if(ops.some(x=>!x.operacao.trim()||Number(x.setup_min)<0||Number(x.ciclo_seg)<0))return setNotice('Preencha todas as operações e tempos.')
  setBusy(true);setNotice('')
  try{
   const empresaId=await company()
   const payload={kind,processCode,processName,notes,spec,updatedAt:new Date().toISOString(),revisao:Number(version)}
   const saved=await supabase.from('erp_fichas_tecnicas').upsert({empresa_id:empresaId,produto_id:productId,versao:Number(version),rendimento:Number(rendimento)||1,unidade_rendimento:unit.trim()||'UN',observacoes:JSON.stringify(payload),ativa:true},{onConflict:'empresa_id,produto_id,versao'}).select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').single()
   if(saved.error)throw saved.error
   const fichaId=String(saved.data.id)
   const db=await supabase.from('erp_ficha_itens').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(db.error)throw db.error
   const ib=await supabase.from('erp_ficha_itens').insert(bom.map(x=>({empresa_id:empresaId,ficha_id:fichaId,componente_id:x.componente_id,quantidade:Number(x.quantidade),perda_percentual:Number(x.perda_percentual),lote_obrigatorio:x.lote_obrigatorio,tipo_item:x.tipo_item,sequencia:x.sequencia})));if(ib.error)throw ib.error
   const dops=await supabase.from('erp_ficha_operacoes').delete().eq('empresa_id',empresaId).eq('ficha_id',fichaId);if(dops.error)throw dops.error
   const io=await supabase.from('erp_ficha_operacoes').insert(ops.map(x=>({empresa_id:empresaId,ficha_id:fichaId,sequencia:x.sequencia,operacao:x.operacao.trim(),maquina_id:x.maquina_id||null,molde_id:x.molde_id||null,setup_min:Number(x.setup_min),ciclo_seg:Number(x.ciclo_seg),instrucoes:x.instrucoes.trim()||null})));if(io.error)throw io.error
   for(const q of quality.filter(x=>x.caracteristica.trim())){
    const qp={empresa_id:empresaId,codigo:q.codigo.trim()||('CQ-'+Date.now()),produto_id:productId,caracteristica:q.caracteristica.trim(),unidade:q.unidade.trim()||null,valor_nominal:q.nominal.trim()||null,limite_inferior:q.limite_inferior===''?null:Number(q.limite_inferior),limite_superior:q.limite_superior===''?null:Number(q.limite_superior),frequencia:q.frequencia.trim()||'100%',status:q.status}
    const qr=q.id?await supabase.from('erp_planos_inspecao').update(qp).eq('id',q.id).eq('empresa_id',empresaId):await supabase.from('erp_planos_inspecao').insert(qp)
    if(qr.error)throw qr.error
   }
   const retainedQualityIds=quality.flatMap(q=>q.id?[q.id]:[]);const removedQualityIds=originalQualityIds.filter(id=>!retainedQualityIds.includes(id));if(removedQualityIds.length){const removed=await supabase.from('erp_planos_inspecao').delete().eq('empresa_id',empresaId).eq('produto_id',productId).in('id',removedQualityIds);if(removed.error)throw removed.error}
   setOriginalQualityIds(retainedQualityIds)
   setFicha(saved.data as Ficha);setCatalog(rows=>[{id:String(saved.data.id),produto_id:productId,versao:Number(version),observacoes:JSON.stringify(payload)},...rows.filter(x=>x.id!==String(saved.data.id))]);setNotice('Ficha de processo gravada: parâmetros, ferramental, fotos, materiais, roteiro e controles de qualidade registrados.')
  }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }

 if(loading)return <main className="industrial-form-page"><div className="industrial-panel">Carregando Fichas de Processo…</div></main>
 if(!kind)return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header"><div><span className="industrial-eyebrow">INDUSTRIA ERP • ENGENHARIA / PROCESSOS</span><h1>Fichas de Processo</h1><p>Catálogo controlado por tecnologia, produto, molde/estampo e revisão.</p></div><button className="industrial-secondary" type="button" onClick={()=>resetForm(false)}><X size={16}/> Limpar</button></header>
  <section className="industrial-panel" style={{marginBottom:16}}>
   <div className="process-section-heading"><span>LOCALIZAR FICHA</span><h2>Filtros de engenharia</h2><p>Pesquise por código da ficha, produto, número do molde/estampo ou tecnologia.</p></div>
   <div className="process-form-grid">
    <label>Pesquisa geral<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, produto, molde, processo…"/></label>
    <label>Tipo de processo<select value={catalogKind} onChange={e=>setCatalogKind(e.target.value as Kind|'')}><option value="">Todos</option>{kinds.map(k=><option key={k.id} value={k.id}>{k.id}</option>)}</select></label>
    <label>Molde / estampo<select value={catalogMold} onChange={e=>setCatalogMold(e.target.value)}><option value="">Todos</option>{molds.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome} • {m.cavidades} cav.</option>)}</select></label>
   </div>
   <div className="industrial-table-scroll" style={{marginTop:16}}><table className="industrial-table process-sheet-table"><thead><tr><th>Tipo</th><th>Produto</th><th>Ficha</th><th>Molde / Estampo</th><th>Cavidades</th><th>Rev.</th><th>Ação</th></tr></thead><tbody>{
    catalog.filter(row=>{const j=(()=>{try{return JSON.parse(row.observacoes||'{}')}catch{return {}}})();const prod=products.find(p=>p.id===row.produto_id);const mold=molds.find(m=>m.id===j.spec?.moldeId);const hay=[j.kind,j.processCode,j.processName,prod?.codigo,prod?.nome,mold?.codigo,mold?.nome].join(' ').toLowerCase();return (!search.trim()||hay.includes(search.trim().toLowerCase()))&&(!catalogKind||j.kind===catalogKind)&&(!catalogMold||j.spec?.moldeId===catalogMold)}).map(row=>{const j=(()=>{try{return JSON.parse(row.observacoes||'{}')}catch{return {}}})();const prod=products.find(p=>p.id===row.produto_id);const mold=molds.find(m=>m.id===j.spec?.moldeId);return <tr key={row.id}><td>{j.kind||'—'}</td><td>{prod?.codigo||'—'} — {prod?.nome||'Produto'}</td><td>{j.processCode||'—'}</td><td>{mold?mold.codigo+' — '+mold.nome:'—'}</td><td>{mold?.cavidades??'—'}</td><td>{row.versao}</td><td><button className="industrial-secondary" onClick={()=>{setRequestedFichaVersion(row.versao);setKind((j.kind||'DIVERSOS') as Kind);setProductId(row.produto_id);setVersion(String(row.versao))}}><Search size={14}/> Abrir</button></td></tr>})}</tbody></table></div>
  </section>
   {(kind==='PRENSADOS'||kind==='INJETADOS'||kind==='ESTAMPARIA'||kind==='CORTE_VINCO')&&<div className="industrial-panel" style={{marginTop:16,background:'#f7fbfc'}}><div className="process-section-heading"><span>FERRAMENTAL PRINCIPAL</span><h2>Molde / Estampo</h2><p>O número do ferramental e a quantidade de cavidades são dados mestres usados para planejamento e rastreabilidade.</p></div><div className="process-form-grid"><label>Número / código do molde<select value={spec.moldeId||''} onChange={e=>{const m=molds.find(x=>x.id===e.target.value);setS('moldeId',e.target.value);setS('moldeCodigo',m?.codigo||'');setS('cavidades',String(m?.cavidades??''));setS('cavidadesAtivas',String(m?.cavidades_ativas??''))}}><option value="">Selecionar ferramental</option>{molds.filter(m=>!m.produto_id||m.produto_id===productId).map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome} • {m.cavidades} cav.</option>)}</select></label><label>Número do molde<input value={spec.moldeCodigo||''} readOnly placeholder="Preenchido pelo cadastro do molde"/></label><label>Total de cavidades<input type="number" min="1" value={spec.cavidades||''} onChange={e=>setS('cavidades',e.target.value)}/></label><label>Cavidades ativas<input type="number" min="0" value={spec.cavidadesAtivas||''} onChange={e=>setS('cavidadesAtivas',e.target.value)}/></label><label>Revisão do molde / estampo<input value={spec.moldeRevisao||''} onChange={e=>setS('moldeRevisao',e.target.value)}/></label></div></div>}
    <section className="industrial-panel" style={{marginBottom:14}}>
      <div className="process-section-heading"><span>ROTEIROS INDUSTRIAIS</span><h2>Selecione uma ficha operacional</h2><p>O cartão abre uma prévia nesta tela; a ficha completa mantém os dados reais do produto e do roteiro.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kinds.map(k=>{const I=k.icon;return <button key={k.id} type="button" className="industrial-panel text-left" style={{cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:7,minWidth:0,minHeight:112,padding:10,textAlign:'left',border:'1px solid #b8ced7',borderTop:'3px solid #2D8DB8',borderRadius:2,background:'linear-gradient(145deg,#fff 0%,#f0f9fc 100%)',boxShadow:'0 2px 5px rgba(18,59,80,.08)'}} onClick={()=>setPreviewKind(k.id)}><span style={{display:'grid',placeItems:'center',width:34,height:34,background:'linear-gradient(135deg,#123B50,#2D8DB8)',color:'#fff',borderRadius:2}}><I size={18}/></span><strong style={{display:'block',fontSize:11,lineHeight:1.25,fontWeight:800,color:'#123B50'}}>{k.title.replace('Ficha de Processo — ','')}</strong><span style={{display:'block',fontSize:9,lineHeight:1.35,color:'#526b76'}}>{k.description}</span><span style={{marginTop:'auto',fontSize:9,fontWeight:800,color:'#2D8DB8'}}>VISUALIZAR FICHA →</span></button>})}
      </div>
    </section>
    <section className="industrial-panel"><div className="process-section-heading"><span>PADRÃO INDUSTRIAL</span><h2>Documento único e controlado</h2></div><div className="grid md:grid-cols-3 gap-4"><Info title="Engenharia" text="Produto, revisão, desenho, material, molde/ferramental, parâmetros e roteiro."/><Info title="PCP / Produção" text="BOM, operações, máquina, setup, ciclo e instruções de trabalho."/><Info title="Qualidade" text="Características, limites, frequência, evidências e liberação."/><Info title="Fotos técnicas" text="Anexe imagens reais de peça, molde, ferramenta, setup e embalagem na ficha."/><Info title="Rastreabilidade" text="Número do molde/estampo, cavidades ativas e revisão ficam vinculados à ficha."/><Info title="Pesquisa" text="Filtros por tecnologia, produto, ficha e ferramental."/></div></section>
    {previewKind&&(()=>{const item=kinds.find(k=>k.id===previewKind);if(!item)return null;const I=item.icon;const packaging=previewKind==='MONTAGEM_EMBALAGEM';return <div role="presentation" className={packaging?'packaging-print-overlay':undefined} onClick={()=>setPreviewKind(null)} style={{position:'fixed',inset:0,zIndex:80,background:'rgba(9,28,39,.68)',display:'grid',placeItems:'center',padding:14}}><style>{'@media print{body *{visibility:hidden!important}.packaging-print-overlay,.packaging-print-overlay *{visibility:visible!important}.packaging-print-overlay{position:absolute!important;inset:0!important;background:#fff!important;padding:0!important;display:block!important}.packaging-print-sheet{width:100%!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;border:0!important}.packaging-print-sheet button{display:none!important}}'}</style><section role="dialog" aria-modal="true" aria-label={item.title} className={packaging?'packaging-print-sheet':undefined} onClick={e=>e.stopPropagation()} style={{width:'min(980px,100%)',maxHeight:'92vh',overflowY:'auto',background:'#f7fbfd',border:'1px solid #78b8cf',borderRadius:3,boxShadow:'0 24px 70px rgba(0,0,0,.35)'}}><header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'12px 14px',background:'linear-gradient(110deg,#123B50,#2D8DB8 72%,#48B7C7)',color:'#fff'}}><div style={{display:'flex',alignItems:'center',gap:9}}><I size={24}/><div><div style={{fontSize:9,fontWeight:800,color:'#d7f5ff'}}>ENGENHARIA • ROTEIRO OPERACIONAL</div><h2 style={{fontSize:17,fontWeight:800,margin:'2px 0'}}>{item.title}</h2></div></div><button type="button" onClick={()=>setPreviewKind(null)} className="industrial-secondary"><X size={16}/> Fechar</button></header><div style={{padding:14}}><p style={{margin:'0 0 12px',fontSize:11,color:'#526b76'}}>{item.description}</p>{packaging?<><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div style={{border:'1px solid #c7dce8',background:'#fff',padding:12}}><strong style={{fontSize:11,color:'#123B50'}}>REFERÊNCIA VISUAL / FOTOS TÉCNICAS</strong><div className="grid grid-cols-2 gap-2" style={{marginTop:8}}>{['Montagem da caixa','Saco plástico'].map((label,index)=><div key={label} style={{minHeight:130,display:'grid',placeItems:'center',gap:6,border:'1px dashed #9dc5d5',background:'#f4fbfd',padding:8,textAlign:'center'}}><Boxes size={34} color="#2D8DB8"/><span style={{fontSize:10,fontWeight:700,color:'#123B50'}}>{label}</span><small style={{fontSize:9,color:'#607987'}}>Adicionar foto na ficha técnica</small></div>)}</div><p style={{fontSize:9,color:'#607987',marginTop:8}}>As fotos oficiais devem ser anexadas na ficha para evitar uso de imagens ilustrativas como padrão de produção.</p></div><div style={{border:'1px solid #c7dce8',background:'#fff',padding:12}}><strong style={{fontSize:11,color:'#123B50'}}>PASSO A PASSO OPERACIONAL</strong><ol style={{fontSize:11,lineHeight:1.7,paddingLeft:20,margin:'8px 0',color:'#344054'}}><li>Conferir código do produto, revisão e quantidade solicitada.</li><li>Montar a caixa de papelão e verificar fechamento e integridade.</li><li>Acondicionar as peças no saco plástico limpo e íntegro.</li><li>Contar e registrar a quantidade de peças por pacote conforme a ficha aprovada.</li><li>Fechar o pacote e posicionar a etiqueta com código, descrição, lote e quantidade.</li><li>Organizar as caixas no pallet, respeitando empilhamento seguro e identificação externa.</li><li>Realizar conferência final antes de liberar para estoque/expedição.</li></ol></div></div><div style={{marginTop:10,padding:10,background:'#e2f3fa',border:'1px solid #b9dce9',fontSize:10,color:'#123B50'}}><strong>CONTROLE DE QUALIDADE:</strong> validar quantidade por pacote, etiqueta legível, saco sem danos, caixa íntegra e pallet estável.</div></>:<div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12}}><div style={{minHeight:150,display:'grid',placeItems:'center',border:'1px dashed #9dc5d5',background:'#fff',padding:16,textAlign:'center'}}><I size={44} color="#2D8DB8"/><strong style={{fontSize:11,color:'#123B50'}}>Foto técnica do processo</strong><span style={{fontSize:9,color:'#607987'}}>Disponível ao anexar imagens na ficha completa.</span></div><div style={{background:'#fff',border:'1px solid #c7dce8',padding:12}}><strong style={{fontSize:11,color:'#123B50'}}>INSTRUÇÕES DE TRABALHO</strong><p style={{fontSize:11,lineHeight:1.6,color:'#526b76'}}>{item.description}</p><p style={{fontSize:10,lineHeight:1.6,color:'#526b76'}}>Confirmar identificação do produto e revisão vigente, preparar máquina/ferramental, seguir os parâmetros aprovados, realizar inspeção da primeira peça e registrar desvios antes de liberar o lote.</p></div></div>}<footer style={{display:'flex',justifyContent:'flex-end',gap:6,marginTop:12,flexWrap:'wrap'}}><button type="button" className="industrial-secondary" onClick={()=>{setPreviewKind(null);if(packaging)window.print()}}>{packaging?<><Printer size={15}/> Imprimir instrução</>:<><X size={15}/> Fechar prévia</>}</button><button type="button" className="industrial-primary" onClick={()=>{resetForm(false);setKind(item.id);setProcessName(item.title.replace('Ficha de Processo — ',''));setProcessCode('FP-'+previewKind+'-001');setPreviewKind(null)}}><Search size={15}/> Abrir ficha completa</button></footer></div></section></div>})()}
 </main>

 const labels=kind==='PRENSADOS'?['Composto / material','Código do composto','Dureza alvo','Prensa','Molde','Pressão de prensagem','Tempo de cura','Pós-cura','Desmoldante / agente']:kind==='INJETADOS'?['Matéria-prima','Código da MP','Cor / pigmento','Máquina injetora','Tonelagem mínima','Tonelagem máxima','Molde','Nº cavidades','Secagem do material','Pressão de injeção','Velocidade de injeção','Comutação','Pressão de recalque','Tempo de recalque','Resfriamento','Dosagem','Contrapressão','Descompressão','Ciclo alvo','Câmara quente']:kind==='ESTAMPARIA'?['Material / chapa','Espessura','Largura do blank','Comprimento do blank','Prensa','Tonelagem','Ferramenta / estampo','Curso','Velocidade','Avanço','Passo','Lubrificação','Operações de corte','Operações de dobra','Operações de conformação','Rebarba máxima']:kind==='CORTE_VINCO'?['Material / substrato','Espessura','Faca / forma de corte','Matriz / contraforma','Prensa / equipamento','Pressão de corte','Pressão de vinco','Altura do vinco','Registro / alinhamento','Velocidade de avanço','Folga de corte','Sequência de corte','Sequência de vinco','Descarte / refile','Amostragem de inspeção']:kind==='ACABAMENTO'?['Tipo de acabamento','Preparação da superfície','Equipamento','Ferramenta / abrasivo','Produto químico / tinta','Diluição / mistura','Velocidade de aplicação','Pressão','Temperatura de secagem','Tempo de secagem','Tempo de cura','Espessura alvo','Método de inspeção','Embalagem']:['Tipo de processo','Objetivo','Equipamento','Ferramenta / dispositivo','Material de entrada','Parâmetro 1','Parâmetro 2','Parâmetro 3','Tempo padrão','Critério de aceitação','EPI / segurança','Instrução especial']

 return <main className="industrial-form-page process-sheet-page">
  <header className="process-sheet-header"><div><span className="industrial-eyebrow">INDUSTRIA ERP • ENGENHARIA / PROCESSOS</span><h1>{kinds.find(x=>x.id===kind)?.title}</h1><p>Ficha operacional completa para orientar Engenharia, PCP, Produção e Qualidade.</p></div><div className="process-sheet-actions"><button className="industrial-secondary" onClick={()=>setKind(null)}><X size={16}/>Tipos</button><button className="industrial-secondary" onClick={()=>window.print()}><Printer size={16}/>Imprimir</button><button className="industrial-primary" onClick={()=>void save()} disabled={busy}><Save size={16}/>{busy?'Gravando…':'Gravar'}</button></div></header>
  <div className="process-sheet-toolbar"><button onClick={()=>resetForm(false)}>Novo</button><button onClick={()=>void save()} disabled={busy}>Gravar</button><button onClick={()=>productId&&void loadFicha(productId)} disabled={busy}><Search size={15}/>Pesquisar</button><button onClick={()=>window.print()}><Printer size={15}/>Imprimir</button><span className="process-sheet-toolbar-status">{notice||'Documento operacional controlado'}</span></div>

  <section className="process-sheet-module-title"><div><b>FICHA DE PROCESSO {kind}</b><span>Engenharia • PCP • Produção • Qualidade</span></div><div className="process-sheet-document-id"><span>Código</span><strong>{processCode||'—'}</strong><small>Revisão {version}</small></div></section>

  <section className="industrial-panel">
   <div className="process-section-heading"><span>1 • IDENTIFICAÇÃO E CONTROLE DO DOCUMENTO</span><h2>Dados mestres</h2></div>
   <div className="process-form-grid">
    <label>Código do produto<input value={productCode} list="produto-codigos" onChange={e=>{const code=e.target.value.trim();setProductCode(e.target.value);const p=products.find(x=>x.codigo.toLowerCase()===code.toLowerCase());if(p)setProductId(p.id)}} placeholder="Digite o código da peça"/><datalist id="produto-codigos">{products.map(p=><option key={p.id} value={p.codigo}>{p.nome}</option>)}</datalist></label>
    <label>Produto / peça<select value={productId} onChange={e=>{setProductId(e.target.value);const p=products.find(x=>x.id===e.target.value);setProductCode(p?.codigo||'')}}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
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
   <div className="process-section-heading"><span>IDENTIFICAÇÃO VISUAL DA FICHA</span><h2>Fotos da peça, ferramental e setup</h2><p>As imagens ficam vinculadas a esta ficha de processo, junto com a revisão e os parâmetros técnicos.</p></div>
   <div className="process-form-grid"><label>Imagem técnica principal<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!productId} onChange={e=>{void setPhoto('fotoPrincipal',e.target.files?.[0]??null);e.currentTarget.value=''}}/><input value={(spec.fotoPrincipal||'').startsWith('storage:')?'Referência armazenada na empresa':spec.fotoPrincipal||''} onChange={e=>{setS('fotoPrincipal',e.target.value);setPhotoPreview(x=>({...x,fotoPrincipal:e.target.value}))}} placeholder="URL de imagem existente (opcional)"/></label><label>Imagem complementar<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!productId} onChange={e=>{void setPhoto('fotoSecundaria',e.target.files?.[0]??null);e.currentTarget.value=''}}/><input value={(spec.fotoSecundaria||'').startsWith('storage:')?'Referência armazenada na empresa':spec.fotoSecundaria||''} onChange={e=>{setS('fotoSecundaria',e.target.value);setPhotoPreview(x=>({...x,fotoSecundaria:e.target.value}))}} placeholder="URL de imagem existente (opcional)"/></label></div>
   {(photoPreview.fotoPrincipal||photoPreview.fotoSecundaria)&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12,marginTop:14}}>{([['fotoPrincipal',photoPreview.fotoPrincipal],['fotoSecundaria',photoPreview.fotoSecundaria]] as const).filter(([,src])=>Boolean(src)).map(([key,src])=><figure key={key} style={{margin:0,minWidth:0,border:'1px solid #d7e6eb',padding:8,background:'#fff'}}><div style={{position:'relative',display:'grid',placeItems:'center',minHeight:140,background:'#f8fbfc'}}><img src={src} alt={key==='fotoSecundaria'?'Imagem técnica complementar':'Imagem técnica principal'} style={{display:'block',width:'100%',maxHeight:300,objectFit:'contain'}} onError={e=>{e.currentTarget.style.display='none'}}/>{(kind==='PRENSADOS'||kind==='INJETADOS')&&key==='fotoPrincipal'&&<label style={{position:'absolute',right:8,bottom:8,display:'grid',gap:3,padding:'6px 8px',background:'rgba(18,59,80,.94)',color:'#fff',border:'1px solid #48B7C7',borderRadius:2,fontSize:9,fontWeight:800}}>{kind==='PRENSADOS'?'TEMPERATURA DA PRENSA / MOLDE (°C)':'TEMPERATURA DO MOLDE (°C)'}<input aria-label={kind==='PRENSADOS'?'Temperatura de prensagem em graus Celsius':'Temperatura do molde em graus Celsius'} type="number" step="0.1" value={spec[kind==='PRENSADOS'?'Temperatura':'Temperatura do molde']||''} onChange={e=>setS(kind==='PRENSADOS'?'Temperatura':'Temperatura do molde',e.target.value)} style={{width:112,height:28,padding:'0 6px',border:'1px solid #b8ced7',borderRadius:2,color:'#123B50',fontSize:11,fontWeight:700}}/></label>}</div><figcaption style={{display:'flex',alignItems:'center',gap:6,marginTop:7,fontSize:10,color:'#526b76'}}><ImageIcon size={14}/> {key==='fotoSecundaria'?'Imagem complementar':'Imagem principal'}{spec[key]&&String(spec[key]).startsWith('storage:')?' • Armazenada por empresa':''}</figcaption></figure>)}</div>}
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
   <div className="industrial-table-scroll"><table className="industrial-table process-sheet-table"><thead><tr><th>Seq.</th><th>Operação</th><th>Máquina / centro</th><th>Molde / ferramenta</th><th>Setup min</th><th>Ciclo s</th><th>Instrução</th><th></th></tr></thead><tbody>{ops.map((r,i)=><tr key={r.id||i}><td><input type="number" value={r.sequencia} onChange={e=>setOpField(i,'sequencia',Number(e.target.value))}/></td><td><input value={r.operacao} onChange={e=>setOpField(i,'operacao',e.target.value)} placeholder="Ex.: preparação / produção / inspeção"/></td><td><select value={r.maquina_id} onChange={e=>setOpField(i,'maquina_id',e.target.value)}><option value="">Selecionar</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}</select></td><td><select value={r.molde_id} onChange={e=>setOpField(i,'molde_id',e.target.value)}><option value="">Selecionar</option>{molds.map(m=><option key={m.id} value={m.id}>{m.codigo} — {m.nome} • {m.cavidades} cav.</option>)}</select></td><td><input type="number" min="0" step="0.1" value={r.setup_min} onChange={e=>setOpField(i,'setup_min',e.target.value)}/></td><td><input type="number" min="0" step="0.001" value={r.ciclo_seg} onChange={e=>setOpField(i,'ciclo_seg',e.target.value)}/></td><td><textarea rows={2} value={r.instrucoes} onChange={e=>setOpField(i,'instrucoes',e.target.value)} placeholder="Como executar e quais parâmetros não podem variar"/></td><td><button className="icon-button danger" onClick={()=>setOps(x=>x.length===1?[emptyOp()]:x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>
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
