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
 const [ficha,setFicha]=useState<Ficha|null>(null),[productId,setProductId]=useState(''),[productCode,setProductCode]=useState(''),[version,setVersion]=useState('1'),[rendimento,setRendimento]=useState('1'),[unit,setUnit]=useState('UN')
 const [processCode,setProcessCode]=useState(''),[processName,setProcessName]=useState(''),[notes,setNotes]=useState('')
 const [bom,setBom]=useState<BomRow[]>([emptyBom()]),[ops,setOps]=useState<OpRow[]>([emptyOp()]),[quality,setQuality]=useState<QualityRow[]>([emptyQuality()])
 const [spec,setSpec]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[catalogKind,setCatalogKind]=useState<Kind|''>(''),[catalogMold,setCatalogMold]=useState(''),[previewKind,setPreviewKind]=useState<Kind|null>(null),[activePhotoTab,setActivePhotoTab]=useState(0)

 const selected=useMemo(()=>products.find(p=>p.id===productId),[products,productId])
 useEffect(()=>{void loadBase()},[])
 useEffect(()=>{
  const requestedKind=new URLSearchParams(location.search).get('tipo')
  if(requestedKind&&kinds.some(k=>k.id===requestedKind)){
   const nextKind=requestedKind as Kind
   setFicha(null);setVersion('1');setRendimento('1');setUnit('UN');setProcessCode(`FP-${nextKind}-001`);setProcessName(kinds.find(k=>k.id===nextKind)?.title.replace('Ficha de Processo — ','')||'');setNotes('');setSpec({});setBom([emptyBom()]);setOps([emptyOp()]);setQuality([emptyQuality()]);setKind(nextKind)
   if(!new URLSearchParams(location.search).get('produto')){setProductId('');setProductCode('')}
  }
 },[location.search])
 useEffect(()=>{
  const requestedProduct=new URLSearchParams(location.search).get('produto')
  if(requestedProduct){const target=products.find(p=>p.id===requestedProduct||p.codigo.toLowerCase()===requestedProduct.toLowerCase());if(target){setProductId(target.id);setProductCode(target.codigo)}}
 },[location.search,products])
 useEffect(()=>{if(selected)setProductCode(selected.codigo)},[selected])
 useEffect(()=>{if(!productId||!kind)return;void loadFicha(productId,kind)},[productId,kind])

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
 async function loadFicha(id:string, selectedKind:Kind|null=kind){
  if(!id||!selectedKind)return
  setKind(selectedKind)
  setBusy(true);setNotice('')
  try{
   const empresaId=await company()
   const f=await supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa').eq('empresa_id',empresaId).eq('produto_id',id).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
   if(f.error)throw f.error
   if(!f.data){resetForm(true,id);return}
   const current=f.data as Ficha
   setFicha(current);setVersion(String(current.versao));setRendimento(String(current.rendimento));setUnit(current.unidade_rendimento)
   try{const j=JSON.parse(current.observacoes||'{}');setKind((j.kind||selectedKind) as Kind);setProcessCode(j.processCode||'');setProcessName(j.processName||'');setNotes(j.notes||'');setSpec(j.spec||{})}catch{setSpec({})}
   const[bi,ro,qi]=await Promise.all([
    supabase.from('erp_ficha_itens').select('id,componente_id,quantidade,perda_percentual,lote_obrigatorio,tipo_item,sequencia').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_ficha_operacoes').select('id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg,instrucoes').eq('empresa_id',empresaId).eq('ficha_id',current.id).order('sequencia'),
    supabase.from('erp_planos_inspecao').select('id,codigo,caracteristica,unidade,limite_inferior,limite_superior,frequencia,status').eq('empresa_id',empresaId).eq('produto_id',id).order('codigo').limit(200)
   ])
   if(bi.error)throw bi.error;if(ro.error)throw ro.error;if(qi.error)throw qi.error
   setBom((bi.data??[]).map(x=>({id:x.id,componente_id:x.componente_id,quantidade:String(x.quantidade),perda_percentual:String(x.perda_percentual),lote_obrigatorio:Boolean(x.lote_obrigatorio),tipo_item:x.tipo_item,sequencia:x.sequencia})))
   setOps((ro.data??[]).map(x=>({id:x.id,sequencia:x.sequencia,operacao:x.operacao,maquina_id:x.maquina_id??'',molde_id:x.molde_id??'',setup_min:String(x.setup_min),ciclo_seg:String(x.ciclo_seg),instrucoes:x.instrucoes??''})))
   const loadedQuality: QualityRow[] = (qi.data??[]).map(x=>({id:x.id,codigo:x.codigo,caracteristica:x.caracteristica,unidade:x.unidade??'',nominal:'',limite_inferior:x.limite_inferior==null?'':String(x.limite_inferior),limite_superior:x.limite_superior==null?'':String(x.limite_superior),frequencia:x.frequencia??'',status:x.status})); setQuality(loadedQuality.length ? loadedQuality : [emptyQuality()])
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
 function setPhoto(key:'fotoPrincipal'|'fotoSecundaria',file:File|null){if(!file)return;if(file.size>2*1024*1024){setNotice('A foto deve ter no máximo 2 MB.');return}if(!file.type.startsWith('image/')){setNotice('Selecione um arquivo de imagem.');return}const reader=new FileReader();reader.onload=()=>setS(key,String(reader.result));reader.readAsDataURL(file)}

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
   const payload={kind,processCode,processName,notes,spec,updatedAt:new Date().toISOString()}
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
    catalog.filter(row=>{const j=(()=>{try{return JSON.parse(row.observacoes||'{}')}catch{return {}}})();const prod=products.find(p=>p.id===row.produto_id);const mold=molds.find(m=>m.id===j.spec?.moldeId);const hay=[j.kind,j.processCode,j.processName,prod?.codigo,prod?.nome,mold?.codigo,mold?.nome].join(' ').toLowerCase();return (!search.trim()||hay.includes(search.trim().toLowerCase()))&&(!catalogKind||j.kind===catalogKind)&&(!catalogMold||j.spec?.moldeId===catalogMold)}).map(row=>{const j=(()=>{try{return JSON.parse(row.observacoes||'{}')}catch{return {}}})();const prod=products.find(p=>p.id===row.produto_id);const mold=molds.find(m=>m.id===j.spec?.moldeId);return <tr key={row.id}><td>{j.kind||'—'}</td><td>{prod?.codigo||'—'} — {prod?.nome||'Produto'}</td><td>{j.processCode||'—'}</td><td>{mold?mold.codigo+' — '+mold.nome:'—'}</td><td>{mold?.cavidades??'—'}</td><td>{row.versao}</td><td><button className="industrial-secondary" onClick={()=>{setKind((j.kind||'DIVERSOS') as Kind);setProductId(row.produto_id);setVersion(String(row.versao));void loadFicha(row.produto_id,(j.kind||'DIVERSOS') as Kind)}}><Search size={14}/> Abrir</button></td></tr>})}</tbody></table></div>
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

 const labels=kind==='PRENSADOS'?['Composto / material','Código do composto','Dureza alvo','Prensa','Molde','Pressão de prensagem','Temperatura','Tempo de cura','Pós-cura','Desmoldante / agente']:kind==='INJETADOS'?['Matéria-prima','Código da MP','Cor / pigmento','Máquina injetora','Tonelagem mínima','Tonelagem máxima','Molde','Nº cavidades','Secagem do material','Temperatura do molde','Pressão de injeção','Velocidade de injeção','Comutação','Pressão de recalque','Tempo de recalque','Resfriamento','Dosagem','Contrapressão','Descompressão','Ciclo alvo','Câmara quente']:kind==='ESTAMPARIA'?['Material / chapa','Espessura','Largura do blank','Comprimento do blank','Prensa','Tonelagem','Ferramenta / estampo','Curso','Velocidade','Avanço','Passo','Lubrificação','Operações de corte','Operações de dobra','Operações de conformação','Rebarba máxima']:kind==='CORTE_VINCO'?['Material / substrato','Espessura','Faca / forma de corte','Matriz / contraforma','Prensa / equipamento','Pressão de corte','Pressão de vinco','Altura do vinco','Registro / alinhamento','Velocidade de avanço','Folga de corte','Sequência de corte','Sequência de vinco','Descarte / refile','Amostragem de inspeção']:kind==='ACABAMENTO'?['Tipo de acabamento','Preparação da superfície','Equipamento','Ferramenta / abrasivo','Produto químico / tinta','Diluição / mistura','Velocidade de aplicação','Pressão','Temperatura de secagem','Tempo de secagem','Tempo de cura','Espessura alvo','Método de inspeção','Embalagem']:['Tipo de processo','Objetivo','Equipamento','Ferramenta / dispositivo','Material de entrada','Parâmetro 1','Parâmetro 2','Parâmetro 3','Tempo padrão','Critério de aceitação','EPI / segurança','Instrução especial']

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
   <div className="process-section-heading"><span>IDENTIFICAÇÃO VISUAL DA FICHA</span><h2>Referências técnicas por etapa</h2><p>Quatro referências vinculadas à ficha e à revisão. Use URL HTTPS de imagem aprovada pela Engenharia.</p></div>
   <div role="tablist" aria-label="Abas de fotos técnicas" style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
    {['Setup / peça','Lado fixo','Defeitos padrão','Embalagem'].map((label,index)=><button key={label} type="button" role="tab" aria-selected={activePhotoTab===index} onClick={()=>setActivePhotoTab(index)} style={{height:30,padding:'0 12px',fontSize:10,fontWeight:800,border:'1px solid '+(activePhotoTab===index?'#2D8DB8':'#c7dce8'),background:activePhotoTab===index?'#123B50':'#fff',color:activePhotoTab===index?'#fff':'#365564',borderRadius:2}}>{label}</button>)}
   </div>
   <div className="process-form-grid">
    <label>{['Foto de setup / peça','Foto do lado fixo','Foto de defeito padrão','Foto de embalagem'][activePhotoTab]}<input value={spec['fotoUrl'+(activePhotoTab+1)]||''} onChange={e=>setS('fotoUrl'+(activePhotoTab+1),e.target.value)} placeholder="https://…"/></label>
    <label>Observação da referência<input value={spec['fotoNota'+(activePhotoTab+1)]||''} onChange={e=>setS('fotoNota'+(activePhotoTab+1),e.target.value)} placeholder="Identificação, revisão ou critério visual"/></label>
   </div>
   <div style={{marginTop:12,minHeight:170,border:'1px dashed #9dc5d5',background:'#f4fbfd',padding:10,display:'grid',placeItems:'center'}}>
    {spec['fotoUrl'+(activePhotoTab+1)] ? <img src={spec['fotoUrl'+(activePhotoTab+1)]} alt={['Setup / peça','Lado fixo','Defeitos padrão','Embalagem'][activePhotoTab]} style={{maxWidth:'100%',maxHeight:280,objectFit:'contain'}} onError={e=>{e.currentTarget.style.display='none'}}/> : <div style={{textAlign:'center',color:'#607987',fontSize:11}}><ImageIcon size={28}/><p style={{margin:'6px 0 0'}}>Nenhuma imagem informada nesta aba.</p></div>}
   </div>
   <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>{[0,1,2,3].map(index=><span key={index} style={{fontSize:9,padding:'4px 7px',border:'1px solid #c7dce8',background:spec['fotoUrl'+(index+1)]?'#e2f3fa':'#fff',color:'#365564'}}>{['Setup','Lado fixo','Defeitos','Embalagem'][index]}: {spec['fotoUrl'+(index+1)]?'referência informada':'sem imagem'}</span>)}</div>
  </section>

  {(kind==='INJETADOS'||kind==='PRENSADOS')&&<section className="industrial-panel">
   <div className="process-section-heading"><span>PERFIL TÉRMICO DO PROCESSO</span><h2>{kind==='INJETADOS'?'Canhão de plastificação e bico':'Platôs térmicos da prensa'}</h2><p>Parâmetros diretos por zona; os valores ficam gravados no campo técnico da ficha.</p></div>
   {kind==='INJETADOS'?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,alignItems:'end'}}>
    {[1,2,3].map(zone=><label key={zone} style={{display:'block',border:'1px solid #c7dce8',background:'#f4fbfd',padding:10,color:'#365564',fontSize:10,fontWeight:800}}>ZONA 0{zone} (°C)<input type="number" value={spec['temp_z'+zone]||''} onChange={e=>setS('temp_z'+zone,e.target.value)} style={{display:'block',width:'100%',height:32,marginTop:6,border:'1px solid #c7dce8',background:'#fff',padding:'0 8px',color:'#123B50',fontWeight:800}}/></label>)}
    <label style={{display:'block',border:'1px solid #e7c8c8',background:'#fff7f7',padding:10,color:'#9f3838',fontSize:10,fontWeight:800}}>BICO / NOZZLE (°C)<input type="number" value={spec.temp_bico||''} onChange={e=>setS('temp_bico',e.target.value)} style={{display:'block',width:'100%',height:32,marginTop:6,border:'1px solid #e7c8c8',background:'#fff',padding:'0 8px',color:'#9f3838',fontWeight:800}}/></label>
   </div>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
    <label style={{display:'block',border:'1px solid #c7dce8',background:'#f4fbfd',padding:10,color:'#365564',fontSize:10,fontWeight:800}}>PLATÔ SUPERIOR (°C)<input type="number" value={spec.temp_placa_sup||''} onChange={e=>setS('temp_placa_sup',e.target.value)} style={{display:'block',width:'100%',height:32,marginTop:6,border:'1px solid #c7dce8',background:'#fff',padding:'0 8px',color:'#123B50',fontWeight:800}}/></label>
    <label style={{display:'block',border:'1px solid #c7dce8',background:'#f4fbfd',padding:10,color:'#365564',fontSize:10,fontWeight:800}}>PLATÔ INFERIOR (°C)<input type="number" value={spec.temp_placa_inf||''} onChange={e=>setS('temp_placa_inf',e.target.value)} style={{display:'block',width:'100%',height:32,marginTop:6,border:'1px solid #c7dce8',background:'#fff',padding:'0 8px',color:'#123B50',fontWeight:800}}/></label>
    <label style={{display:'block',border:'1px solid #f0dfb7',background:'#fffaf0',padding:10,color:'#8a5a12',fontSize:10,fontWeight:800}}>PRESSÃO DA BOMBA (bar)<input type="number" value={spec.pressao_bomba||''} onChange={e=>setS('pressao_bomba',e.target.value)} style={{display:'block',width:'100%',height:32,marginTop:6,border:'1px solid #f0dfb7',background:'#fff',padding:'0 8px',color:'#8a5a12',fontWeight:800}}/></label>
   </div>}
  </section>}

  <section className="industrial-panel">
   <div className="process-section-heading"><span>2 • PARÂMETROS ESPECÍFICOS DO PROCESSO</span><h2>{kinds.find(x=>x.id===kind)?.title.replace('Ficha de Processo — ','')}</h2><p>Campos técnicos específicos para não transformar todas as tecnologias em uma ficha genérica.</p></div>
   {kind==='INJETADOS'&&<div style={{margin:'12px 0 16px',padding:12,border:'1px solid #9bc8d9',background:'#f4fbfd',borderRadius:2}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}><strong style={{fontSize:11,color:'#123B50'}}>PERFIL TÉRMICO DO CANHÃO / INJETORA</strong><span style={{fontSize:9,color:'#526b76'}}>Valores editáveis sobre as zonas do desenho • °C</span></div>
    <div style={{position:'relative',minHeight:174,border:'1px solid #c6dce6',background:'linear-gradient(180deg,#fff,#eaf5f9)',overflow:'hidden'}}>
     <svg viewBox="0 0 900 210" role="img" aria-label="Desenho técnico do canhão da injetora dividido em zonas de aquecimento" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
      <defs><linearGradient id="barrel-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8c8d0"/><stop offset="45%" stopColor="#eef4f6"/><stop offset="100%" stopColor="#91a7b2"/></linearGradient></defs>
      <path d="M28 68 L105 68 L148 88 L750 88 L790 72 L850 84 L850 126 L790 138 L750 122 L148 122 L105 142 L28 142 Z" fill="url(#barrel-metal)" stroke="#426273" strokeWidth="3"/>
      {[0,1,2,3,4].map((n)=><g key={n}><rect x={155+n*119} y="91" width="112" height="28" rx="2" fill={n===4?'#48b7c7':n===3?'#3a9d78':'#8fc4d6'} stroke="#31566a" strokeWidth="2"/><path d={`M${160+n*119} 95 h102`} stroke="#fff" strokeWidth="2" opacity=".65"/></g>)}
      <path d="M28 80 L80 80 L112 95 L112 115 L80 130 L28 130 Z" fill="#8ba4af" stroke="#426273" strokeWidth="3"/><path d="M850 84 L878 96 L878 114 L850 126 Z" fill="#8ba4af" stroke="#426273" strokeWidth="3"/>
      <text x="450" y="36" textAnchor="middle" fill="#123b50" fontSize="18" fontWeight="700">CANHÃO • ZONAS DE AQUECIMENTO</text>
      {[0,1,2,3,4].map((n)=><text key={n} x={211+n*119} y="166" textAnchor="middle" fill="#31566a" fontSize="14" fontWeight="700">{n===0?'Z1':n===1?'Z2':n===2?'Z3':n===3?'Z4':'ALIM.'}</text>)}
     </svg>
     <div style={{position:'absolute',left:'15.2%',right:'5.5%',top:'43%',display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:4}}>
      {([{key:'tempZona1',label:'Zona 1'},{key:'tempZona2',label:'Zona 2'},{key:'tempZona3',label:'Zona 3'},{key:'tempZona4',label:'Zona 4'},{key:'tempAlimentacao',label:'Aliment.'}] as const).map(z=><label key={z.key} style={{fontSize:8,fontWeight:800,color:'#123b50',textAlign:'center',minWidth:0}}>{z.label}<input aria-label={z.label+' (°C)'} type="number" value={spec[z.key]||''} onChange={e=>setS(z.key,e.target.value)} placeholder="°C" style={{display:'block',boxSizing:'border-box',width:'100%',height:26,padding:'2px 4px',fontSize:10,textAlign:'center',border:'1px solid #6da9bf',borderRadius:2,background:'#fff'}}/></label>)}
     </div>
     <label style={{position:'absolute',left:8,bottom:7,width:'18%',fontSize:8,fontWeight:800,color:'#123b50'}}>Bico (°C)<input aria-label="Temperatura do bico em °C" type="number" value={spec.tempBico||''} onChange={e=>setS('tempBico',e.target.value)} placeholder="°C" style={{display:'block',boxSizing:'border-box',width:'100%',height:25,padding:'2px 4px',fontSize:10,textAlign:'center',border:'1px solid #6da9bf',borderRadius:2,background:'#fff'}}/></label>
     <label style={{position:'absolute',right:8,bottom:7,width:'18%',fontSize:8,fontWeight:800,color:'#123b50'}}>Molde (°C)<input aria-label="Temperatura do molde em °C" type="number" value={spec.tempMolde||''} onChange={e=>setS('tempMolde',e.target.value)} placeholder="°C" style={{display:'block',boxSizing:'border-box',width:'100%',height:25,padding:'2px 4px',fontSize:10,textAlign:'center',border:'1px solid #6da9bf',borderRadius:2,background:'#fff'}}/></label>
    </div>
   </div>}
   {kind==='PRENSADOS'&&<div style={{margin:'12px 0 16px',padding:12,border:'1px solid #9bc8d9',background:'#f4fbfd',borderRadius:2}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}><strong style={{fontSize:11,color:'#123B50'}}>TEMPERATURA DOS PLATÔS DA PRENSA</strong><span style={{fontSize:9,color:'#526b76'}}>Campos editáveis sobre os platôs • °C</span></div>
    <div style={{position:'relative',minHeight:260,border:'1px solid #c6dce6',background:'linear-gradient(180deg,#fff,#eaf5f9)',overflow:'hidden'}}>
     <svg viewBox="0 0 900 360" role="img" aria-label="Desenho técnico de prensa hidráulica com platô superior e inferior" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
      <defs><linearGradient id="press-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dbe4e8"/><stop offset="50%" stopColor="#8da2ad"/><stop offset="100%" stopColor="#e7eef1"/></linearGradient></defs>
      <rect x="210" y="24" width="480" height="22" rx="2" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/><rect x="250" y="46" width="30" height="250" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/><rect x="620" y="46" width="30" height="250" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/>
      <rect x="370" y="46" width="160" height="46" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/><rect x="340" y="90" width="220" height="18" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/>
      <rect x="300" y="111" width="300" height="32" fill="#d65b61" stroke="#7f3439" strokeWidth="3"/><rect x="300" y="215" width="300" height="32" fill="#d65b61" stroke="#7f3439" strokeWidth="3"/>
      <rect x="280" y="143" width="340" height="16" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/><rect x="280" y="199" width="340" height="16" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/>
      <rect x="210" y="296" width="480" height="22" fill="url(#press-metal)" stroke="#526b76" strokeWidth="3"/><rect x="360" y="318" width="180" height="24" fill="#2d8db8" stroke="#31566a" strokeWidth="3"/>
      <text x="450" y="18" textAnchor="middle" fill="#123b50" fontSize="17" fontWeight="700">PRENSA HIDRÁULICA • ZONAS AQUECIDAS</text>
      <text x="450" y="182" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">ÁREA DE PRENSAGEM</text>
     </svg>
     <label style={{position:'absolute',left:'34%',top:'31%',width:'32%',fontSize:9,fontWeight:800,color:'#123b50',textAlign:'center'}}>Platô superior (°C)<input aria-label="Temperatura do platô superior em °C" type="number" value={spec.tempPlatoSuperior||''} onChange={e=>setS('tempPlatoSuperior',e.target.value)} placeholder="°C" style={{display:'block',boxSizing:'border-box',width:'100%',height:29,padding:'3px 5px',fontSize:11,textAlign:'center',border:'1px solid #6da9bf',borderRadius:2,background:'#fff'}}/></label>
     <label style={{position:'absolute',left:'34%',top:'61%',width:'32%',fontSize:9,fontWeight:800,color:'#123b50',textAlign:'center'}}>Platô inferior (°C)<input aria-label="Temperatura do platô inferior em °C" type="number" value={spec.tempPlatoInferior||''} onChange={e=>setS('tempPlatoInferior',e.target.value)} placeholder="°C" style={{display:'block',boxSizing:'border-box',width:'100%',height:29,padding:'3px 5px',fontSize:11,textAlign:'center',border:'1px solid #6da9bf',borderRadius:2,background:'#fff'}}/></label>
    </div>
    <div className="process-form-grid" style={{marginTop:8}}><label>Pressão de prensagem<input type="number" value={spec.pressaoPrensagem||''} onChange={e=>setS('pressaoPrensagem',e.target.value)} placeholder="bar / MPa"/></label><label>Tempo de cura (s)<input type="number" value={spec.tempoCura||''} onChange={e=>setS('tempoCura',e.target.value)} placeholder="segundos"/></label><label>Pós-cura / temperatura<input value={spec.posCura||''} onChange={e=>setS('posCura',e.target.value)} placeholder="°C / tempo"/></label></div>
   </div>}
   <div className="process-form-grid">{labels.filter(label=>!(kind==='INJETADOS'&&label==='Temperatura do molde')&&!(kind==='PRENSADOS'&&label==='Temperatura')).map(label=><label key={label}>{label}<input value={spec[label]||''} onChange={e=>setS(label,e.target.value)} placeholder="Informar valor / faixa / condição"/></label>)}</div>
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
