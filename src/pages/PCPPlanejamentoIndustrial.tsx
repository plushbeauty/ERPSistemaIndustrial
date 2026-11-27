/**
 * @REVISAO: REV-MRP-SEM-TRUNCAMENTO-20261104-01 — a geração de ordens planejadas lia as necessidades do MRP com .limit(3000) e somava no navegador: run maior que isso gravava ordem com quantidade menor que a real. Agregação e gravação movidas para a RPC erp_pcp_gerar_ordens_planejadas_do_mrp (migration 20261104172000), sobre todas as linhas do último run da empresa.
 * @REVISAO: REV-COLUNAS-BANCO-20261106-01 — alertas alinhados à coluna real created_at de erp_pcp_alertas; correção funcional sem alteração visual.
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Gauge, Plus, RefreshCw, Save, Shuffle, Target, Boxes } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-premium.css'

type Product={id:string;codigo:string;nome:string;estoque_atual:number}
type MPS={id:string;produto_id:string;periodo_inicio:string;periodo_fim:string;quantidade_prevista:number;estoque_alvo:number;demanda_confirmada:number;status:string}
type Planned={id:string;produto_id:string;quantidade:number;data_necessaria:string;origem:string;status:string}
type Center={id:string;codigo_posto:string;nome_posto:string;taxa_hora:number;ativo:boolean}
type Program={id:string;maquina_id:string|null;inicio_planejado:string;fim_planejado:string;quantidade_planejada:number;status:string}
type Machine={id:string;codigo:string;nome:string;status:string}
type AlertRow={id:string;tipo:string;severidade:string;mensagem:string;status:string;created_at:string}
type QueueDemand={id:string;pedido_numero:string;pedido_venda_id:string;pedido_item_id:string;produto_id:string;cliente_nome:string;produto_codigo:string;produto_nome:string;unidade:string;quantidade_pedida:number;quantidade_pcp:number;quantidade_reservada:number;quantidade_op_aberta:number;data_necessaria:string|null;prioridade:string;status:string;ordem_producao_id:string|null;created_at:string}
type ProductDetail={id:string;codigo:string;nome:string;desenho:string|null;codigo_cliente:string|null;material:string|null;unidade:string;numero_cavidades:number|null;peso_injecao:number|null;peso_peca:number|null;cor_peca:string|null;resina_tipo:string|null;cor_resina:string|null;temp_bico_padrao:number|null;tempo_ciclo_padrao:number|null;maquina_preferencial_id:string|null;foto_molde_url:string|null}
type BomRow={componente_id:string;quantidade:number;perda_percentual:number|null;unidade_medida:string|null}
type DemandDetail={product:ProductDetail;foto:string|null;ficha:{id:string;codigo:string|null;titulo:string|null;versao:number;status:string|null}|null;operation:{operacao:string;maquina_id:string|null;molde_id:string|null;ciclo_seg:number|null;capacidade_hora:number|null;capacidade_dia:number|null;ferramenta:string|null}|null;mold:{codigo:string;nome:string;numero_cavidades:number|null;cavidades_ativas:number|null}|null;machine:{codigo:string;nome:string;horas_capacidade_dia:number|null}|null;recipeStatus:string|null;recipeVersion:number|null;bom:Array<{componente_id:string;codigo:string;nome:string;quantidade:number;perda_percentual:number;unidade_medida:string}>;needs:Array<{componente_id:string;codigo:string;nome:string;nivel:number;quantidade_bruta:number;quantidade_disponivel:number;quantidade_em_compra:number;necessidade_liquida:number;perda_estimada:number;sugestao:string}>;runId:string|null}

const today=()=>new Date().toISOString().slice(0,10)
const productLabel=(p:Product)=>p.codigo+' • '+p.nome

export default function PCPPlanejamentoIndustrial(){
 const [tab,setTab]=useState<'fila'|'mps'|'necessidades'|'capacidade'|'alertas'>('fila')
 const [products,setProducts]=useState<Product[]>([])
 const [mps,setMps]=useState<MPS[]>([])
 const [planned,setPlanned]=useState<Planned[]>([])
 const [centers,setCenters]=useState<Center[]>([])
 const [programs,setPrograms]=useState<Program[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [alerts,setAlerts]=useState<AlertRow[]>([])
 const [queue,setQueue]=useState<QueueDemand[]>([])
 const [lotMode,setLotMode]=useState<'DIA'|'PRODUCAO'>('PRODUCAO')
 const [selectedDemand,setSelectedDemand]=useState<QueueDemand|null>(null)
 const [demandDetail,setDemandDetail]=useState<DemandDetail|null>(null)
 const [detailLoading,setDetailLoading]=useState(false)
 const [detailError,setDetailError]=useState('')
 const [productId,setProductId]=useState(''),[qty,setQty]=useState(''),[target,setTarget]=useState(''),[start,setStart]=useState(today()),[end,setEnd]=useState(today())
 const [center,setCenter]=useState({codigo_posto:'',nome_posto:'',taxa_hora:'0'})
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data) throw tenant.error??new Error('Empresa da sessão não identificada; planejamento bloqueado.')
   const empresaId=tenant.data
   const [p,m,o,c,pr,ma,a]=await Promise.all([
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<MPS>((from,to)=>supabase.from('erp_pcp_planos_mestres').select('id,produto_id,periodo_inicio,periodo_fim,quantidade_prevista,estoque_alvo,demanda_confirmada,status',{count:'exact'}).eq('empresa_id',empresaId).order('periodo_inicio').range(from,to)),
    fetchAllPages<Planned>((from,to)=>supabase.from('erp_pcp_ordens_planejadas').select('id,produto_id,quantidade,data_necessaria,origem,status',{count:'exact'}).eq('empresa_id',empresaId).order('data_necessaria').range(from,to)),
    fetchAllPages<Center>((from,to)=>supabase.from('erp_postos_trabalho').select('id,codigo_posto,nome_posto,taxa_hora,ativo',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo_posto').range(from,to)),
    fetchAllPages<Program>((from,to)=>supabase.from('erp_pcp_programacoes').select('id,maquina_id,inicio_planejado,fim_planejado,quantidade_planejada,status',{count:'exact'}).eq('empresa_id',empresaId).neq('status','cancelada').order('inicio_planejado').range(from,to)),
    fetchAllPages<Machine>((from,to)=>supabase.from('erp_maquinas').select('id,codigo,nome,status',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<AlertRow>((from,to)=>supabase.from('erp_pcp_alertas').select('id,tipo,severidade,mensagem,status,created_at',{count:'exact'}).eq('empresa_id',empresaId).neq('status','RESOLVIDO').order('created_at',{ascending:false}).range(from,to))
   ])
   const q=await fetchAllPages<QueueDemand>((from,to)=>supabase.from('erp_pcp_fila_demanda').select('id,pedido_numero,pedido_venda_id,pedido_item_id,produto_id,cliente_nome,produto_codigo,produto_nome,unidade,quantidade_pedida,quantidade_pcp,quantidade_reservada,quantidade_op_aberta,data_necessaria,prioridade,status,ordem_producao_id,created_at',{count:'exact'}).eq('empresa_id',empresaId).in('status',['AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA']).order('created_at',{ascending:false}).range(from,to))
   const lotConfig=await supabase.from('erp_configuracoes_producao_lote').select('modo_lote').eq('empresa_id',empresaId).maybeSingle()
   if(lotConfig.error)throw lotConfig.error
   setLotMode(lotConfig.data?.modo_lote==='DIA'?'DIA':'PRODUCAO')
   setProducts(p);setMps(m);setPlanned(o);setCenters(c);setPrograms(pr);setMachines(ma);setAlerts(a);setQueue(q)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar planejamento PCP.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const names=useMemo(()=>new Map(products.map(p=>[p.id,productLabel(p)])),[products])
 const machineLoad=useMemo(()=>machines.map(m=>{
  const rows=programs.filter(p=>p.maquina_id===m.id)
  const hours=rows.reduce((s,p)=>s+Math.max(0,(new Date(p.fim_planejado).getTime()-new Date(p.inicio_planejado).getTime())/3600000),0)
  return {m,rows,hours}
 }),[machines,programs])
 const shortages=useMemo(()=>products.filter(p=>Number(p.estoque_atual||0)<0),[products])

 async function saveLotMode(){
  setBusy(true);setError('');setMessage('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   const result=await supabase.from('erp_configuracoes_producao_lote').upsert({empresa_id:tenant.data,modo_lote:lotMode,updated_at:new Date().toISOString()},{onConflict:'empresa_id'}).select('empresa_id').maybeSingle()
   if(result.error)throw result.error
   setMessage(lotMode==='DIA'?'Lote por dia configurado: produto, máquina e data compartilham o lote, com alocações individuais por OP/pedido.':'Lote por produção configurado: cada OP terá seu próprio lote.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar o modo de lote.')}
  finally{setBusy(false)}
 }

 async function openDemandDetail(demand:QueueDemand){
  setSelectedDemand(demand);setDemandDetail(null);setDetailError('');setDetailLoading(true)
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.')
   const empresaId=tenant.data
   const productResult=await supabase.from('erp_produtos').select('id,codigo,nome,desenho,codigo_cliente,material,unidade,numero_cavidades,peso_injecao,peso_peca,cor_peca,resina_tipo,cor_resina,temp_bico_padrao,tempo_ciclo_padrao,maquina_preferencial_id,foto_molde_url').eq('id',demand.produto_id).eq('empresa_id',empresaId).maybeSingle()
   if(productResult.error)throw productResult.error
   if(!productResult.data)throw new Error('Produto da demanda não encontrado nesta empresa.')
   const product=productResult.data as ProductDetail
   const fichaResult=await supabase.from('erp_fichas_tecnicas').select('id,codigo,titulo,versao,status').eq('empresa_id',empresaId).eq('produto_id',product.id).eq('ativa',true).order('versao',{ascending:false}).limit(1).maybeSingle()
   if(fichaResult.error)throw fichaResult.error
   const ficha=fichaResult.data
   const [operationResult,recipeResult]=await Promise.all([
    ficha?.id?supabase.from('erp_ficha_operacoes').select('operacao,maquina_id,molde_id,ciclo_seg,capacidade_hora,capacidade_dia,ferramenta').eq('empresa_id',empresaId).eq('ficha_id',ficha.id).order('sequencia').limit(1).maybeSingle():Promise.resolve({data:null,error:null}),
    supabase.from('erp_receitas_processos').select('status,versao').eq('empresa_id',empresaId).eq('produto_id',product.id).order('versao',{ascending:false}).limit(1).maybeSingle()
   ])
   if(operationResult.error)throw operationResult.error
   if(recipeResult.error)throw recipeResult.error
   const operation=operationResult.data
   const moldId=operation?.molde_id
   const machineId=operation?.maquina_id??product.maquina_preferencial_id
   const [moldResult,machineResult,bomResult]=await Promise.all([
    moldId?supabase.from('erp_moldes').select('codigo,nome,numero_cavidades,cavidades_ativas').eq('empresa_id',empresaId).eq('id',moldId).maybeSingle():supabase.from('erp_moldes').select('codigo,nome,numero_cavidades,cavidades_ativas').eq('empresa_id',empresaId).eq('produto_id',product.id).eq('ativo',true).limit(1).maybeSingle(),
    machineId?supabase.from('erp_maquinas').select('codigo,nome,horas_capacidade_dia').eq('empresa_id',empresaId).eq('id',machineId).maybeSingle():Promise.resolve({data:null,error:null}),
    ficha?.id?supabase.from('erp_ficha_itens').select('componente_id,quantidade,perda_percentual,unidade_medida').eq('empresa_id',empresaId).eq('ficha_id',ficha.id).order('sequencia'):Promise.resolve({data:[],error:null})
   ])
   if(moldResult.error)throw moldResult.error
   if(machineResult.error)throw machineResult.error
   if(bomResult.error)throw bomResult.error
   const bomRows=(bomResult.data??[]) as BomRow[]
   const componentIds=[...new Set(bomRows.map(row=>row.componente_id))]
   const componentProducts=componentIds.length?await fetchAllPages<{id:string;codigo:string;nome:string}>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome',{count:'exact'}).eq('empresa_id',empresaId).in('id',componentIds).order('codigo').range(from,to)):[]
   const componentMap=new Map(componentProducts.map(row=>[row.id,row]))
   const bom=bomRows.map(row=>{const component=componentMap.get(row.componente_id);return {componente_id:row.componente_id,codigo:component?.codigo??'—',nome:component?.nome??'Componente',quantidade:Number(row.quantidade),perda_percentual:Number(row.perda_percentual??0),unidade_medida:row.unidade_medida??'UN'}})
   let needs:DemandDetail['needs']=[]
   let runId:string|null=null
   if(bom.length){
    const mrp=await supabase.rpc('erp_mrp_explodir',{p_produto_id:product.id,p_quantidade:demand.quantidade_pcp,p_demanda_ref:'PCP_FILA:'+demand.id})
    if(mrp.error)throw mrp.error
    runId=String(mrp.data??'')
    const needRows=await fetchAllPages<{componente_id:string;nivel:number;quantidade_bruta:number;quantidade_disponivel:number;quantidade_em_compra:number;necessidade_liquida:number;perda_estimada:number;sugestao:string}>((from,to)=>supabase.from('erp_mrp_necessidades').select('componente_id,nivel,quantidade_bruta,quantidade_disponivel,quantidade_em_compra,necessidade_liquida,perda_estimada,sugestao',{count:'exact'}).eq('empresa_id',empresaId).eq('run_id',runId).order('nivel').range(from,to))
    const needIds=[...new Set(needRows.map(row=>row.componente_id))]
    const needProducts=needIds.length?await fetchAllPages<{id:string;codigo:string;nome:string}>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome',{count:'exact'}).eq('empresa_id',empresaId).in('id',needIds).order('codigo').range(from,to)):[]
    const needMap=new Map(needProducts.map(row=>[row.id,row]))
    needs=needRows.map(row=>{const component=needMap.get(row.componente_id);return {componente_id:row.componente_id,codigo:component?.codigo??'—',nome:component?.nome??'Componente',nivel:row.nivel,quantidade_bruta:Number(row.quantidade_bruta),quantidade_disponivel:Number(row.quantidade_disponivel),quantidade_em_compra:Number(row.quantidade_em_compra),necessidade_liquida:Number(row.necessidade_liquida),perda_estimada:Number(row.perda_estimada),sugestao:row.sugestao}})
   }
   let foto:string|null=null
   if(product.foto_molde_url){const signed=await supabase.storage.from('documentos-erp').createSignedUrl(product.foto_molde_url,900);if(!signed.error)foto=signed.data?.signedUrl??null}
   setDemandDetail({product,foto,ficha:ficha??null,operation:operation??null,mold:moldResult.data??null,machine:machineResult.data??null,recipeStatus:recipeResult.data?.status??null,recipeVersion:recipeResult.data?.versao??null,bom,needs,runId})
  }catch(e){setDetailError(e instanceof Error?e.message:'Falha ao carregar ficha e materiais da demanda.')}
  finally{setDetailLoading(false)}
 }

 async function createPurchaseRequest(){
  if(!selectedDemand||!demandDetail?.runId)return
  setBusy(true);setError('');setMessage('')
  try{
   const result=await supabase.rpc('erp_pcp_gerar_requisicao_compra',{p_fila_id:selectedDemand.id,p_run_id:demandDetail.runId})
   if(result.error)throw result.error
   const data=(result.data??{}) as {codigo?:string;itens?:number;ja_existia?:boolean}
   setMessage('Requisição '+(data.codigo??'PCP')+' criada para '+(data.itens??0)+' item(ns) com falta de matéria-prima.')
  }catch(e){setDetailError(e instanceof Error?e.message:'Não foi possível criar a requisição de compra.')}
  finally{setBusy(false)}
 }

 async function convertQueueToOp(id:string){
  setBusy(true);setError('');setMessage('')
  try{
   const result=await supabase.rpc('erp_pcp_converter_demanda_em_op',{p_fila_id:id})
   if(result.error)throw result.error
   const data=(result.data??{}) as {numero_op?:number|string;produto_codigo?:string}
   setMessage('OP-'+String(data.numero_op??'').padStart(6,'0')+' criada para '+(data.produto_codigo??'produto')+'. A demanda comercial foi vinculada à ordem de produção.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível converter a demanda em OP.')}
  finally{setBusy(false)}
 }

 async function updateQueueStatus(id:string,status:'EM_ANALISE'|'PROGRAMADA'){
  setBusy(true);setError('');setMessage('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data) throw tenant.error??new Error('Empresa da sessão não identificada.')
   const now=new Date().toISOString()
   const patch=status==='EM_ANALISE'?{status,updated_at:now,analisado_em:now}:{status,updated_at:now}
   const result=await supabase.from('erp_pcp_fila_demanda').update(patch).eq('id',id).eq('empresa_id',tenant.data).select('id').maybeSingle()
   if(result.error)throw result.error
   if(!result.data)throw new Error('A demanda não foi atualizada. Verifique a permissão de PCP.')
   setMessage(status==='EM_ANALISE'?'Demanda assumida para análise do PCP.':'Demanda marcada como programada.')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar a fila do PCP.')}
  finally{setBusy(false)}
 }

 async function createMPS(){
  const q=Number(qty),t=Number(target)
  if(!productId||q<0||t<0||!start||!end){setError('Produto, período e quantidades válidas são obrigatórios.');return}
  if(end<start){setError('O fim do período não pode ser anterior ao início.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data) throw tenant.error??new Error('Empresa da sessão não identificada.')
   const r=await supabase.from('erp_pcp_planos_mestres').insert({empresa_id:tenant.data,produto_id:productId,periodo_inicio:start,periodo_fim:end,quantidade_prevista:q,estoque_alvo:t,demanda_confirmada:0,status:'ABERTO'}).select('id').single()
   if(r.error)throw r.error
   setMessage('Plano mestre criado e disponível para revisão do PCP.');setQty('');setTarget('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar o plano mestre.')}finally{setBusy(false)}
 }

 type MrpPlannedResult={ok:boolean;run_id:string|null;criadas:number;quantidade_total:number;necessidades_produzir?:number;aviso?:string}

 async function generatePlanned(){
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.rpc('erp_pcp_gerar_ordens_planejadas_do_mrp',{p_data_necessaria:today()})
   if(r.error){
    if(r.error.code==='PGRST202'||/does not exist|not found/i.test(r.error.message))
     setError('Função erp_pcp_gerar_ordens_planejadas_do_mrp ainda não está no banco. Aplique supabase/migrations/20261104172000_erp_pcp_gerar_ordens_planejadas_do_mrp.sql no SQL Editor do Supabase.')
    else throw r.error
    return
   }
   const out=(r.data ?? {ok:false,run_id:null,criadas:0,quantidade_total:0}) as MrpPlannedResult
   if(out.aviso==='MRP_NAO_EXECUTADO'){setMessage('Execute o MRP primeiro; não existe cálculo de necessidades para esta empresa.');return}
   if(!out.criadas){setMessage('As necessidades do último MRP já possuem ordens planejadas abertas; nenhuma duplicata foi criada.');return}
   setMessage(out.criadas+' ordens planejadas criadas a partir do último MRP ('+Number(out.quantidade_total).toLocaleString('pt-BR',{maximumFractionDigits:3})+' unidades agregadas no banco, sobre todas as linhas do run).')
   await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar ordens planejadas.')}finally{setBusy(false)}
 }

 async function createCenter(){
  if(!center.codigo_posto.trim()||!center.nome_posto.trim()){setError('Código e nome do posto de trabalho são obrigatórios.');return}
  const rate=Number(center.taxa_hora)
  if(!Number.isFinite(rate)||rate<0){setError('A taxa por hora deve ser um valor válido e não negativo.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data) throw tenant.error??new Error('Empresa da sessão não identificada.')
   const r=await supabase.from('erp_postos_trabalho').insert({empresa_id:tenant.data,codigo_posto:center.codigo_posto.trim().toUpperCase(),nome_posto:center.nome_posto.trim(),taxa_hora:rate,ativo:true})
   if(r.error)throw r.error
   setCenter({codigo_posto:'',nome_posto:'',taxa_hora:'0'});setMessage('Centro de trabalho cadastrado.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível cadastrar o centro de trabalho.')}finally{setBusy(false)}
 }

 async function resolveAlert(id:string){
  setBusy(true);setError('')
  try{const tenant=await supabase.rpc('erp_current_empresa_id');if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada.');const r=await supabase.from('erp_pcp_alertas').update({status:'RESOLVIDO'}).eq('empresa_id',tenant.data).eq('id',id);if(r.error)throw r.error;setMessage('Alerta resolvido.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível resolver o alerta.')}finally{setBusy(false)}
 }

 return <main className="industrial-form-page" style={{maxWidth:1500,margin:'0 auto'}}>
  <header className="process-sheet-header"><div><button className="industrial-secondary" type="button" onClick={()=>location.href='/pcp'}>← PCP</button><span className="industrial-eyebrow">PCP • PLANEJAMENTO AVANÇADO</span><h1>Planejamento Mestre, Capacidade e Sequenciamento</h1><p>MPS → MRP → ordens planejadas → capacidade → carga → alertas → reprogramação.</p></div><button className="industrial-secondary" type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button></header>
  {(message||error)&&<div className={error?'error':'notice'} style={{margin:'12px 0'}}>{error||message}</div>}
  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <article className="industrial-panel"><Target size={20}/><small>Planos mestres</small><strong>{mps.length}</strong></article>
   <article className="industrial-panel"><Boxes size={20}/><small>Ordens planejadas</small><strong>{planned.length}</strong></article>
   <article className="industrial-panel"><Gauge size={20}/><small>Horas programadas</small><strong>{machineLoad.reduce((s,x)=>s+x.hours,0).toFixed(1)} h</strong></article>
   <article className="industrial-panel"><AlertTriangle size={20}/><small>Alertas abertos</small><strong>{alerts.length}</strong></article>
  </div>
  <nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{[['fila','Fila de demanda'],['mps','MPS / Plano Mestre'],['necessidades','Ordens Planejadas / MRP'],['capacidade','Capacidade / Centros'],['alertas','Alertas / Exceções']].map(([id,label])=><button key={id} className={tab===id?'industrial-primary':'industrial-secondary'} onClick={()=>setTab(id as typeof tab)}>{label}</button>)}</nav>

  {tab==='fila'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>COMERCIAL → PCP</span><h2>Fila de demanda para análise</h2><p>Itens encaminhados pela carteira comercial. O PCP valida ficha, molde, máquina, capacidade, estoque e materiais antes de liberar uma OP.</p></div>
   <div className="flex flex-wrap items-end justify-between gap-3 rounded-[2px] border border-slate-200 bg-slate-50 p-3 mb-3">
    <label className="flex min-w-[260px] flex-col gap-1 text-[10px] font-bold uppercase text-slate-600">Modo de geração dos lotes
     <select className="industrial-select" value={lotMode} onChange={e=>setLotMode(e.target.value as 'DIA'|'PRODUCAO')}><option value="PRODUCAO">Por produção — um lote por OP</option><option value="DIA">Por dia — produto + máquina + data</option></select>
    </label>
    <button className="industrial-primary" type="button" disabled={busy} onClick={()=>void saveLotMode()}>Salvar modo de lote</button>
   </div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Qtd. pedida</th><th>Qtd. a planejar</th><th>Reservado</th><th>OP em aberto</th><th>Entrega</th><th>Prioridade</th><th>Status / ação</th></tr></thead><tbody>
    {queue.map(q=><tr key={q.id}><td>PV-{q.pedido_numero}</td><td>{q.cliente_nome}</td><td>{q.produto_codigo} • {q.produto_nome}</td><td>{Number(q.quantidade_pedida).toLocaleString('pt-BR')}</td><td><strong>{Number(q.quantidade_pcp).toLocaleString('pt-BR')} {q.unidade}</strong></td><td>{Number(q.quantidade_reservada).toLocaleString('pt-BR')}</td><td>{Number(q.quantidade_op_aberta).toLocaleString('pt-BR')}</td><td>{q.data_necessaria||'—'}</td><td>{q.prioridade}</td><td><div className="flex gap-1"><button className="industrial-secondary" type="button" disabled={busy} onClick={()=>void openDemandDetail(q)}>Detalhes</button>{q.status==='AGUARDANDO_PCP'&&<button className="industrial-primary" type="button" disabled={busy} onClick={()=>void updateQueueStatus(q.id,'EM_ANALISE')}>Analisar</button>}{q.status==='EM_ANALISE'&&<button className="industrial-secondary" type="button" disabled={busy} onClick={()=>void updateQueueStatus(q.id,'PROGRAMADA')}>Marcar programada</button>}{q.status==='PROGRAMADA'&&<button className="industrial-primary" type="button" disabled={busy} onClick={()=>void convertQueueToOp(q.id)}>Gerar OP</button>}{q.status}</div></td></tr>)}
    {!queue.length&&<tr><td colSpan={10}>Nenhuma demanda aguardando análise do PCP.</td></tr>}
   </tbody></table></div>
  </section>}

  {tab==='mps'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>MPS</span><h2>Plano Mestre de Produção</h2><p>Registre previsão, demanda confirmada e estoque-alvo por produto e período. O plano é uma entrada explícita para o MRP.</p></div>
   <div className="process-form-grid"><label>Produto<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione</option>{products.map(p=><option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select></label><label>Quantidade prevista<input type="number" min="0" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Estoque alvo<input type="number" min="0" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Início<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Fim<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><div style={{display:'flex',alignItems:'end'}}><button className="industrial-primary" type="button" onClick={()=>void createMPS()} disabled={busy}><Save size={16}/> Gravar MPS</button></div></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Produto</th><th>Período</th><th>Previsto</th><th>Demanda confirmada</th><th>Estoque alvo</th><th>Status</th></tr></thead><tbody>{mps.map(x=><tr key={x.id}><td>{names.get(x.produto_id)||x.produto_id}</td><td>{x.periodo_inicio} → {x.periodo_fim}</td><td>{x.quantidade_prevista}</td><td>{x.demanda_confirmada}</td><td>{x.estoque_alvo}</td><td>{x.status}</td></tr>)}{!mps.length&&<tr><td colSpan={6}>Nenhum plano mestre cadastrado.</td></tr>}</tbody></table></div>
  </section>}

  {tab==='necessidades'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>MRP → PCP</span><h2>Ordens planejadas</h2><p>Transforme necessidades líquidas já calculadas pelo motor MRP em ordens planejadas para revisão antes da liberação.</p></div>
   <button className="industrial-primary" type="button" onClick={()=>void generatePlanned()} disabled={busy}><Shuffle size={16}/> Gerar a partir das necessidades MRP</button>
   <div className="industrial-table-scroll" style={{marginTop:16}}><table className="industrial-table"><thead><tr><th>Produto</th><th>Quantidade</th><th>Necessária em</th><th>Origem</th><th>Status</th></tr></thead><tbody>{planned.map(x=><tr key={x.id}><td>{names.get(x.produto_id)||x.produto_id}</td><td>{x.quantidade}</td><td>{x.data_necessaria}</td><td>{x.origem}</td><td>{x.status}</td></tr>)}{!planned.length&&<tr><td colSpan={5}>Nenhuma ordem planejada aberta.</td></tr>}</tbody></table></div>
  </section>}

  {tab==='capacidade'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>FINITE CAPACITY</span><h2>Capacidade e carga</h2><p>Consulte postos de trabalho cadastrados e acompanhe a carga horária derivada das programações reais das máquinas.</p></div>
   <div className="process-form-grid"><label>Código do posto<input value={center.codigo_posto} onChange={e=>setCenter({...center,codigo_posto:e.target.value})}/></label><label>Nome do posto<input value={center.nome_posto} onChange={e=>setCenter({...center,nome_posto:e.target.value})}/></label><label>Taxa por hora (R$)<input type="number" min="0" step="0.01" value={center.taxa_hora} onChange={e=>setCenter({...center,taxa_hora:e.target.value})}/></label><div style={{display:'flex',alignItems:'end'}}><button className="industrial-primary" type="button" onClick={()=>void createCenter()} disabled={busy}><Plus size={16}/> Cadastrar posto</button></div></div>
   <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{centers.map(c=><article key={c.id} style={{border:'1px solid #E4E9F2',borderRadius:12,padding:12}}><strong>{c.codigo_posto}</strong><h3>{c.nome_posto}</h3><p>Taxa por hora: {Number(c.taxa_hora).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></article>)}</div>
   <div className="industrial-table-scroll" style={{marginTop:16}}><table className="industrial-table"><thead><tr><th>Máquina</th><th>Programações</th><th>Horas carregadas</th><th>Utilização</th><th>Status</th></tr></thead><tbody>{machineLoad.map(x=><tr key={x.m.id}><td>{x.m.codigo} • {x.m.nome}</td><td>{x.rows.length}</td><td>{x.hours.toFixed(1)} h</td><td>{x.hours>0?'Carga registrada':'Livre'}</td><td>{x.m.status}</td></tr>)}</tbody></table></div>
  </section>}

  {tab==='alertas'&&<section className="industrial-panel">
   <div className="process-section-heading"><span>EXCEÇÕES</span><h2>Alertas do PCP</h2><p>Fila de exceções que exige ação do planejador: atraso, falta, capacidade, conflito e máquina indisponível.</p></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Data</th><th>Tipo</th><th>Severidade</th><th>Mensagem</th><th>Ação</th></tr></thead><tbody>{alerts.map(a=><tr key={a.id}><td>{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : 'Sem data'}</td><td>{a.tipo}</td><td>{a.severidade}</td><td>{a.mensagem}</td><td><button className="industrial-secondary" onClick={()=>void resolveAlert(a.id)} disabled={busy}><CheckCircle2 size={15}/> Resolver</button></td></tr>)}{!alerts.length&&<tr><td colSpan={5}>Nenhum alerta aberto.</td></tr>}</tbody></table></div>
  </section>}
  {selectedDemand&&<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-3" onClick={()=>setSelectedDemand(null)}>
   <section className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[4px] border border-slate-300 bg-white shadow-2xl" onClick={event=>event.stopPropagation()}>
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
     <div><span className="text-[10px] font-bold uppercase tracking-wide text-cyan-700">Análise técnica da demanda</span><h2 className="text-sm font-bold text-slate-900">PV-{selectedDemand.pedido_numero} · {selectedDemand.produto_codigo} · {selectedDemand.produto_nome}</h2><p className="text-[10px] text-slate-500">{selectedDemand.cliente_nome} · fabricar {Number(selectedDemand.quantidade_pcp).toLocaleString('pt-BR')} {selectedDemand.unidade}</p></div>
     <button type="button" className="rounded border border-slate-300 px-3 py-2 text-xs" onClick={()=>setSelectedDemand(null)}>Fechar</button>
    </header>
    {detailLoading?<div className="p-8 text-center text-sm text-slate-500">Carregando ficha, processo, molde, estoque e MRP…</div>:detailError?<div className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{detailError}</div>:demandDetail&&<>
     <div className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Código / desenho</span><p className="text-xs font-bold">{demandDetail.product.codigo} / {demandDetail.product.desenho??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Código cliente</span><p className="text-xs font-bold">{demandDetail.product.codigo_cliente??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Ficha técnica</span><p className="text-xs font-bold">{demandDetail.ficha?.codigo??demandDetail.ficha?.titulo??'Não cadastrada'} · v{demandDetail.ficha?.versao??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Processo / receita</span><p className="text-xs font-bold">{demandDetail.operation?.operacao??'—'} / {demandDetail.recipeStatus??'Sem receita'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Molde / cavidades</span><p className="text-xs font-bold">{demandDetail.mold?.codigo??'—'} / {demandDetail.mold?.cavidades_ativas??demandDetail.product.numero_cavidades??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Máquina</span><p className="text-xs font-bold">{demandDetail.machine?demandDetail.machine.codigo+' · '+demandDetail.machine.nome:'Não definida'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Ciclo / capacidade hora</span><p className="text-xs font-bold">{demandDetail.operation?.ciclo_seg??demandDetail.product.tempo_ciclo_padrao??'—'} s / {demandDetail.operation?.capacidade_hora??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Capacidade diária</span><p className="text-xs font-bold">{demandDetail.operation?.capacidade_dia??(demandDetail.operation?.capacidade_hora&&demandDetail.machine?.horas_capacidade_dia?demandDetail.operation.capacidade_hora*demandDetail.machine.horas_capacidade_dia:'—')}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Peso peça / injeção</span><p className="text-xs font-bold">{demandDetail.product.peso_peca??'—'} g / {demandDetail.product.peso_injecao??'—'} g</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Resina / cor</span><p className="text-xs font-bold">{demandDetail.product.resina_tipo??demandDetail.product.material??'—'} / {demandDetail.product.cor_resina??demandDetail.product.cor_peca??'—'}</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Temperatura bico</span><p className="text-xs font-bold">{demandDetail.product.temp_bico_padrao??'—'} °C</p></div>
       <div className="border border-slate-200 p-2"><span className="text-[9px] uppercase text-slate-500">Unidade</span><p className="text-xs font-bold">{demandDetail.product.unidade}</p></div>
      </div>
      <div className="flex min-h-40 items-center justify-center border border-slate-200 bg-slate-50 p-2">{demandDetail.foto?<img src={demandDetail.foto} alt="Foto do molde" className="max-h-56 max-w-full object-contain"/>:<span className="text-[10px] text-slate-400">Foto do molde não cadastrada</span>}</div>
     </div>
     <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
      <section className="border border-slate-200">
       <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase">Estrutura da ficha / BOM</h3>
       <div className="overflow-x-auto"><table className="w-full text-[10px]"><thead><tr className="text-left"><th className="p-2">Componente</th><th className="p-2 text-right">Qtd/un</th><th className="p-2 text-right">Perda</th></tr></thead><tbody>{demandDetail.bom.map(row=><tr key={row.componente_id} className="border-t border-slate-100"><td className="p-2">{row.codigo} · {row.nome}</td><td className="p-2 text-right">{row.quantidade} {row.unidade_medida}</td><td className="p-2 text-right">{row.perda_percentual}%</td></tr>)}{!demandDetail.bom.length&&<tr><td colSpan={3} className="p-3 text-center text-slate-500">BOM não cadastrada para esta ficha.</td></tr>}</tbody></table></div>
      </section>
      <section className="border border-slate-200">
       <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase">Disponibilidade MRP para esta demanda</h3>
       <div className="overflow-x-auto"><table className="w-full text-[10px]"><thead><tr className="text-left"><th className="p-2">Material</th><th className="p-2 text-right">Bruta</th><th className="p-2 text-right">Livre</th><th className="p-2 text-right">Compra</th><th className="p-2 text-right">Falta</th></tr></thead><tbody>{demandDetail.needs.map(row=><tr key={row.componente_id} className="border-t border-slate-100"><td className="p-2">{row.codigo} · {row.nome}<span className="block text-slate-500">{row.sugestao}</span></td><td className="p-2 text-right">{row.quantidade_bruta.toLocaleString('pt-BR')}</td><td className="p-2 text-right">{row.quantidade_disponivel.toLocaleString('pt-BR')}</td><td className="p-2 text-right">{row.quantidade_em_compra.toLocaleString('pt-BR')}</td><td className="p-2 text-right font-bold">{row.necessidade_liquida.toLocaleString('pt-BR')}</td></tr>)}{!demandDetail.needs.length&&<tr><td colSpan={5} className="p-3 text-center text-slate-500">Sem necessidade MRP calculada. Cadastre BOM para explodir os materiais.</td></tr>}</tbody></table></div>
       <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3"><span className="text-[10px] text-slate-500">Receita: {demandDetail.recipeStatus??'não cadastrada'} {demandDetail.recipeVersion?'· v'+demandDetail.recipeVersion:''}</span>{selectedDemand.status==='PROGRAMADA'&&demandDetail.needs.some(row=>row.sugestao==='COMPRAR'&&row.necessidade_liquida>0)&&<button className="industrial-primary" type="button" disabled={busy||!demandDetail.runId} onClick={()=>void createPurchaseRequest()}><Save size={14}/> Gerar requisição de compra</button>}</div>
      </section>
     </div>
    </>}
   </section>
  </div>}
 </main>
}
