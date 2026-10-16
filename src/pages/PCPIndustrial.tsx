/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-065
 * Alterações: Corrigir horas_turno e aceitar IDs opcionais na timeline estrita.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositÃ³rio.
 * =========================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import EntityCodeLookup from '../components/industrial/EntityCodeLookup'
import { useSynqraLayout } from '../layout/SynqraLayoutContext'

type Tab='visao'|'novaop'|'pedidos'|'ops'|'materiais'|'producao'|'programacao'|'capacidade'|'qualidade'
type NovaOPForm={tipo_ordem:'PEDIDO'|'ESTOQUE';pedido_venda_id:string;pedido_item_id:string;produto_id:string;cliente_id:string;quantidade:string;data_emissao:string;data_prevista:string;status:string;prioridade:string;observacoes:string}
type Modal='ajuda'|'op'|'programacao'|null
type Order={id:string;numero:number;cliente_id:string;status:string;total:number}
type OrderItem={id:string;pedido_id:string;produto_id:string;quantidade:number;descricao:string|null}
type Client={id:string;nome:string;codigo:string|null}
type OP={id:string;numero_op:string;produto_id:string|null;quantidade:number;status:string;pedido_venda_id:string|null;data_prevista:string|null}
type Product={id:string;codigo:string;nome:string;estoque_atual:number;categoria:string|null}
type Program={id:string;ordem_producao_id:string|null;maquina_id:string|null;produto_id:string|null;inicio_planejado:string;fim_planejado:string;quantidade_planejada:number;quantidade_produzida:number;quantidade_refugada:number;status:string;molde_id?:string|null;operador_frente_id?:string|null;operador_atras_id?:string|null;turnos?:number;horas_turno?:number;eficiencia_percent?:number;ciclo_seg?:number;cavidades_ativas?:number;setup_min?:number}
type Machine={id:string;codigo:string;nome:string;tipo:string|null;status:string}
type FichaOp={id:string;ficha_id:string;sequencia:number;operacao:string;maquina_id:string|null;molde_id:string|null;setup_min:number;ciclo_seg:number}
type Molde={id:string;codigo:string;nome:string;tipo:string;status:string;numero_cavidades:number;cavidades:number;cavidades_ativas:number}
type Employee={id:string;matricula:string;nome:string;cargo:string|null;status:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number}
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;ativa:boolean}
type FItem={id:string;ficha_id:string;componente_id:string;quantidade:number;perda_percentual:number;unidade_medida?:string}

function InlineIcon({name,size=18}:{name:string;size?:number}){const path=name==='Plus'?'M12 5v14M5 12h14':name==='X'?'M6 6l12 12M18 6 6 18':name==='CheckCircle2'?'M9 12l2 2 4-5':name==='XCircle'?'M8 8l8 8M16 8l-8 8':name==='ArrowLeft'?'M19 12H5M12 19l-7-7 7-7':name==='Search'?'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm6-2 4 4':name==='RefreshCw'?'M20 11a8 8 0 0 0-14.8-4L3 9M3 4v5h5M4 13a8 8 0 0 0 14.8 4L21 15M21 20v-5h-5':'M5 12h14M12 5v14';return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>}

const help:Record<Tab,{title:string;what:string;how:string;action:string}> = {
 novaop:{title:'Criar Nova OP',what:'Cadastro completo da ordem de produção com dados básicos, explosÃ£o de materiais e roteiro.',how:'Selecione produto, cliente, quantidade e prioridade. Confira BOM e roteiro e salve a OP.',action:'Salvar e gerar OP'},
 visao:{title:'Visão geral',what:'É o painel de comando do PCP. Mostra a situação atual e orienta o usuÃ¡rio pelo fluxo completo.',how:'Comece pelos pedidos, confirme materiais, crie/libere a OP, programe mÃ¡quina, aponte a produção e acompanhe qualidade.',action:'Use os atalhos abaixo para executar cada etapa.'},
 pedidos:{title:'Pedidos / Demanda',what:'Mostra pedidos comerciais que podem gerar necessidade de fabricaÃ§Ã£o.',how:'Consulte um pedido, veja quantas OPs estÃ£o vinculadas e use a rotina Comercial para gerar as OPs necessÃ¡rias.',action:'Aqui a funÃ§Ã£o principal Ã© consulta e rastreabilidade da demanda.'},
 ops:{title:'Ordens de Produção',what:'É o cadastro operacional da fabricaÃ§Ã£o: produto, quantidade, prazo e status da OP.',how:'Clique em Nova OP, informe produto, quantidade e data prevista. Depois abra a OP para consultar materiais e apontar produção.',action:'Nova OP'},
 materiais:{title:'Materiais / MRP',what:'Compara a necessidade da ficha técnica da OP com o estoque atual.',how:'Selecione uma OP. O sistema calcula a necessidade dos componentes e mostra o saldo apÃ³s a necessidade.',action:'Selecionar OP'},
 producao:{title:'Apontar produção',what:'Registra o que realmente saiu da fábrica, separando quantidade boa e defeituosa.',how:'Selecione a OP, informe quantidade encontrada e defeituosa, detalhe os defeitos e confirme. A rotina transacional atualiza produção/estoque/refugo.',action:'Conferir e lanÃ§ar'},
 programacao:{title:'Programação / Gantt',what:'Organiza as OPs por mÃ¡quina e horÃ¡rio.',how:'Clique em Programar OP, escolha OP, mÃ¡quina, inÃ­cio, fim e quantidade. O registro fica disponÃ­vel para acompanhamento.',action:'Programar OP'},
 capacidade:{title:'Capacidade / Máquinas',what:'Mostra as mÃ¡quinas disponÃ­veis e quantas programaÃ§Ãµes cada uma possui.',how:'Use essa visÃ£o para identificar concentraÃ§Ã£o de carga e apoiar o sequenciamento.',action:'Programar OP'},
 qualidade:{title:'Qualidade / Defeitos',what:'Consulta os defeitos apontados durante a produção.',how:'Os defeitos entram pelo apontamento. Depois podem ser tratados nas rotinas de Qualidade/RPNC.',action:'Apontar produção'}
}

const ganttLeftBucket=(pct:number)=>{if(pct<5)return 'left-0';if(pct<15)return 'left-[10%]';if(pct<25)return 'left-1/5';if(pct<35)return 'left-1/3';if(pct<50)return 'left-2/5';if(pct<65)return 'left-1/2';if(pct<80)return 'left-3/5';if(pct<95)return 'left-4/5';return 'left-full'}
const ganttWidthBucket=(pct:number)=>{if(pct<10)return 'w-1/12';if(pct<20)return 'w-1/5';if(pct<30)return 'w-1/4';if(pct<45)return 'w-1/3';if(pct<60)return 'w-1/2';if(pct<75)return 'w-3/5';return 'w-4/5'}
const ganttTopBucket=(index:number)=>index%3===0?'top-2':index%3===1?'top-10':'top-[72px]'

export default function PCPIndustrial(){
 const location = useLocation()
 const hostedBySynqra = useSynqraLayout()
 const routeTabMap: Partial<Record<string, Tab>> = {
  '/pcp': 'visao',
  '/pcp/ordens': 'ops',
  '/pcp/demanda': 'pedidos',
  '/pcp/materiais': 'materiais',
  '/pcp/programacao': 'programacao',
  '/pcp/apontamento': 'producao',
  '/pcp/nova-op': 'novaop'
 }
 const [tab,setTab]=useState<Tab>(() => new URLSearchParams(location.search).get('tab') === 'novaop' ? 'novaop' : (routeTabMap[location.pathname] ?? 'visao')),[modal,setModal]=useState<Modal>(null)
 const [ops,setOps]=useState<OP[]>([])
 const [companyId,setCompanyId]=useState('')
 const [orders,setOrders]=useState<Order[]>([]),[orderItems,setOrderItems]=useState<OrderItem[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [products,setProducts]=useState<Product[]>([])
 const [programs,setPrograms]=useState<Program[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [defects,setDefects]=useState<Defect[]>([])
 const [fichas,setFichas]=useState<Ficha[]>([])
 const [fitems,setFitems]=useState<FItem[]>([])
 const [fichaOps,setFichaOps]=useState<FichaOp[]>([])
 const [molds,setMolds]=useState<Molde[]>([])
 const [employees,setEmployees]=useState<Employee[]>([])
 const [selectedOp,setSelectedOp]=useState(''),[found,setFound]=useState(''),[bad,setBad]=useState(''),[defectText,setDefectText]=useState(''),[destinationLocation,setDestinationLocation]=useState(''),[query,setQuery]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [doubleMold,setDoubleMold]=useState(false),[nominalRate,setNominalRate]=useState('30'),[machineForAnalysis,setMachineForAnalysis]=useState(''),[analysisStart,setAnalysisStart]=useState('')
 const [profileName,setProfileName]=useState('UsuÃ¡rio'),[clock,setClock]=useState(new Date())
 const [opForm,setOpForm]=useState<NovaOPForm>({tipo_ordem:'PEDIDO',pedido_venda_id:'',pedido_item_id:'',produto_id:'',cliente_id:'',quantidade:'',data_emissao:new Date().toISOString().slice(0,10),data_prevista:'',status:'pendente',prioridade:'ALTA',observacoes:''})
 const [progForm,setProgForm]=useState({ordem_producao_id:'',maquina_id:'',molde_id:'',operador_frente_id:'',operador_atras_id:'',inicio:'',fim:'',quantidade:'',status:'Programada',turnos:'1',horas_turno:'8',eficiencia:'85',ciclo_seg:'0',cavidades_ativas:'1',setup_min:'0'})

 async function load(){
  setBusy(true);setError('')
  try{
   const company=await supabase.rpc('erp_current_empresa_id')
   if(company.error||!company.data)throw company.error??new Error('Empresa da sessão não identificada.')
   const empresaId=String(company.data)
   setCompanyId(empresaId)
   const [o,oi,cl,op,p,pr,m,d,f,fi,fo,mo,em]=await Promise.all([
    fetchAllPages<Order>((from,to)=>supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total',{count:'exact'}).eq('empresa_id',empresaId).order('numero',{ascending:false}).range(from,to)),
    fetchAllPages<OrderItem>((from,to)=>supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,quantidade,descricao',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
    fetchAllPages<Client>((from,to)=>supabase.from('erp_clientes').select('id,nome,codigo',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('nome').range(from,to)),
    fetchAllPages<OP>((from,to)=>supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status,pedido_venda_id,data_prevista',{count:'exact'}).eq('empresa_id',empresaId).order('criado_em',{ascending:false}).range(from,to)),
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,categoria',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<Program>((from,to)=>supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status,molde_id,operador_frente_id,operador_atras_id,turnos,horas_turno,eficiencia_percent,ciclo_seg,cavidades_ativas,setup_min',{count:'exact'}).eq('empresa_id',empresaId).order('inicio_planejado').range(from,to)),
    fetchAllPages<Machine>((from,to)=>supabase.from('erp_maquinas').select('id,codigo,nome,tipo,status',{count:'exact'}).eq('empresa_id',empresaId).not('status','eq','INATIVA').order('codigo').range(from,to)),
    fetchAllPages<Defect>((from,to)=>supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade',{count:'exact'}).eq('empresa_id',empresaId).order('created_at',{ascending:false}).range(from,to)),
    fetchAllPages<Ficha>((from,to)=>supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,ativa',{count:'exact'}).eq('empresa_id',empresaId).eq('ativa',true).range(from,to)),
    fetchAllPages<FItem>((from,to)=>supabase.from('erp_ficha_itens').select('id,ficha_id,componente_id,quantidade,perda_percentual',{count:'exact'}).eq('empresa_id',empresaId).order('sequencia').range(from,to)),
    fetchAllPages<FichaOp>((from,to)=>supabase.from('erp_ficha_operacoes').select('id,ficha_id,sequencia,operacao,maquina_id,molde_id,setup_min,ciclo_seg',{count:'exact'}).eq('empresa_id',empresaId).order('sequencia').range(from,to)),
    fetchAllPages<Molde>((from,to)=>supabase.from('erp_moldes').select('id,codigo,nome,tipo,status,numero_cavidades,cavidades,cavidades_ativas',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<Employee>((from,to)=>supabase.from('erp_funcionarios').select('id,matricula,nome,cargo,status',{count:'exact'}).eq('empresa_id',empresaId).eq('status','ativo').order('nome').range(from,to))
   ])
   setOrders(o);setOrderItems(oi);setClients(cl);setOps(op);setProducts(p);setPrograms(pr);setMachines(m);setDefects(d);setFichas(f);setFitems(fi);setFichaOps(fo);setMolds(mo);setEmployees(em)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar PCP.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{
  const next = new URLSearchParams(location.search).get('tab') === 'novaop' ? 'novaop' : (routeTabMap[location.pathname] ?? 'visao')
  setTab((current) => (current === next ? current : next))
 },[location.pathname, location.search, routeTabMap])
 useEffect(()=>{if(hostedBySynqra)return;let alive=true;void supabase.auth.getUser().then(async({data})=>{if(!alive||!data.user)return;const r=await supabase.from('erp_usuarios').select('nome').eq('auth_user_id',data.user.id).eq('ativo',true).is('deleted_at',null).maybeSingle();if(alive)setProfileName(r.data?.nome||data.user.email?.split('@')[0]||'UsuÃ¡rio')});const id=window.setInterval(()=>setClock(new Date()),1000);return()=>{alive=false;window.clearInterval(id)}},[hostedBySynqra])

 const orderProducts=products.filter(p=>orderItems.some(item=>item.pedido_id===opForm.pedido_venda_id&&item.produto_id===p.id))
 const current=ops.find(o=>o.id===selectedOp)
 const currentPrograms=programs.filter(p=>p.ordem_producao_id===selectedOp)
 const productionFound=currentPrograms.reduce((s,p)=>s+Number(p.quantidade_produzida||0),0)
 const productionBad=currentPrograms.reduce((s,p)=>s+Number(p.quantidade_refugada||0),0)
 const productionGood=Math.max(0,productionFound-productionBad)
 const currentFicha=current?fichas.find(f=>f.produto_id===current.produto_id):undefined
 const materials=currentFicha?fitems.filter(i=>i.ficha_id===currentFicha.id).map(i=>({...i,product:products.find(p=>p.id===i.componente_id)})):[]
 const filteredOps=ops.filter(o=>!query||o.numero_op.toLowerCase().includes(query.toLowerCase())||String(o.status).toLowerCase().includes(query.toLowerCase()))
 const schedule=useMemo(()=>programs.map(p=>({...p,op:ops.find(o=>o.id===p.ordem_producao_id),machine:machines.find(m=>m.id===p.maquina_id),product:products.find(x=>x.id===p.produto_id)})),[programs,ops,machines,products])

 function openNewOP(){setError('');setMessage('');setOpForm({tipo_ordem:'PEDIDO',pedido_venda_id:'',pedido_item_id:'',produto_id:'',cliente_id:'',quantidade:'',data_emissao:new Date().toISOString().slice(0,10),data_prevista:'',status:'pendente',prioridade:'ALTA',observacoes:''});setModal('op')}
 function processForOp(opId:string){const op=ops.find(x=>x.id===opId);const ficha=op?fichas.find(f=>f.produto_id===op.produto_id):undefined;return ficha?fichaOps.filter(x=>x.ficha_id===ficha.id).sort((a,b)=>a.sequencia-b.sequencia):[]}
 function openProgram(opId=selectedOp){setError('');setMessage('');const op=ops.find(o=>o.id===opId);const process=processForOp(opId)[0];const mold=process?.molde_id||'';const machine=process?.maquina_id||'';const cav=mold?(molds.find(x=>x.id===mold)?.cavidades_ativas||molds.find(x=>x.id===mold)?.numero_cavidades||1):1;const cycle=process?.ciclo_seg||0;const setup=process?.setup_min||0;setProgForm({ordem_producao_id:opId,maquina_id:machine,molde_id:mold,operador_frente_id:'',operador_atras_id:'',inicio:'',fim:'',quantidade:opId?String(op?.quantidade||''):'',status:'Programada',turnos:'1',horas_turno:'8',eficiencia:'85',ciclo_seg:String(cycle),cavidades_ativas:String(cav),setup_min:String(setup)});setModal('programacao')}

  async function createOP(e:FormEvent){
  e.preventDefault();const quantidade=Number(opForm.quantidade)
   if(!companyId){setError('A empresa da sessão ainda não foi carregada.');return}
  if(!opForm.produto_id||quantidade<=0||(opForm.tipo_ordem==='PEDIDO'&&(!opForm.pedido_venda_id||!opForm.pedido_item_id))){setError(opForm.tipo_ordem==='PEDIDO'?'Selecione pedido, item de origem, produto e quantidade maior que zero.':'Selecione produto e quantidade maior que zero para reposição de estoque.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const product=products.find(p=>p.id===opForm.produto_id)
   const sourceItem=opForm.tipo_ordem==='PEDIDO' ? orderItems.find(item=>item.id===opForm.pedido_item_id&&item.pedido_id===opForm.pedido_venda_id&&item.produto_id===opForm.produto_id) : undefined
   if(opForm.tipo_ordem==='PEDIDO'&&!sourceItem)throw new Error('Selecione o item exato do pedido que dará origem à OP.')
   const created=await supabase.rpc('erp_criar_ordem_producao_v2',{
    p_produto_id:opForm.produto_id,
    p_quantidade:quantidade,
    p_pedido_venda_id:opForm.tipo_ordem==='PEDIDO'?opForm.pedido_venda_id:null,
    p_maquina_id:null,
    p_velocidade_nominal_hora:null,
    p_operacao_dupla:false
   })
   if(created.error) throw created.error
   const row=Array.isArray(created.data) && created.data.length > 0 ? created.data[0] as {id:string;numero_op:number} : undefined
   if(!row||!row.id) throw new Error('A criação da OP não retornou o identificador.')
   const updatePayload={pedido_item_id:sourceItem?.id??null,cliente_id:opForm.tipo_ordem==='PEDIDO'?(opForm.cliente_id||null):null,status:opForm.status,prioridade:opForm.prioridade,data_prevista:opForm.data_prevista||null,observacoes:opForm.observacoes||null}
   const patch=await supabase.from('erp_ordens_producao').update(updatePayload).eq('empresa_id',companyId).eq('id',row.id).select('id').maybeSingle()
   if(patch.error) throw patch.error
   if(!patch.data)throw new Error('A OP foi criada, mas os dados complementares não foram confirmados. Atualize a tela e verifique a OP antes de tentar novamente.')
   const salesOrder=orders.find(order=>order.id===opForm.pedido_venda_id);const fichaAtiva=fichas.some(f=>f.produto_id===product?.id);setMessage(opForm.tipo_ordem==='PEDIDO'?'OP '+row.numero_op+' criada e vinculada ao pedido PV-'+(salesOrder?.numero??'—')+' para '+(product?.codigo||product?.nome||'produto')+'.':'OP '+row.numero_op+' criada para reposição de estoque do produto '+(product?.codigo||product?.nome||'produto')+'. Sem vínculo comercial, conforme selecionado.');if(!fichaAtiva)setMessage(current=>current+' Atenção: o produto não possui ficha técnica ativa; confira a ficha de processo antes de liberar a produção.')
   setModal(null);setSelectedOp(row.id);await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a OP.')}
  finally{setBusy(false)}
 }async function createProgram(e:FormEvent){
  e.preventDefault();const qty=Number(progForm.quantidade),cycle=Number(progForm.ciclo_seg),cav=Math.max(1,Number(progForm.cavidades_ativas)),eff=Math.min(100,Math.max(1,Number(progForm.eficiencia))),turnos=Math.max(1,Number(progForm.turnos)),horasTurno=Math.max(.5,Number(progForm.horas_turno)),setup=Math.max(0,Number(progForm.setup_min))
  if(!companyId){setError('A empresa da sessão ainda não foi carregada.');return}
  if(!progForm.ordem_producao_id||!progForm.maquina_id||!progForm.inicio||!progForm.fim||qty<=0){setError('OP, mÃ¡quina, inÃ­cio, fim e quantidade sÃ£o obrigatÃ³rios.');return}
  if(new Date(progForm.fim)<=new Date(progForm.inicio)){setError('O fim deve ser posterior ao inÃ­cio.');return}
  const op=ops.find(x=>x.id===progForm.ordem_producao_id)
  const machine=machines.find(x=>x.id===progForm.maquina_id)
  if(machine?.status?.toUpperCase().includes('MANUT')){setError('A mÃ¡quina selecionada estÃ¡ em manutenÃ§Ã£o e não pode receber programação.');return}
  const mold=molds.find(x=>x.id===progForm.molde_id)
  if(mold?.status?.toUpperCase().includes('MANUT')){setError('O molde selecionado estÃ¡ em manutenÃ§Ã£o e não pode receber programação.');return}
  const start=new Date(progForm.inicio)
  const end=new Date(progForm.fim)
  const activePrograms=programs.filter(p=>p.status.toLowerCase()!=='cancelada')
  const overlaps=(p:Program)=>start<new Date(p.fim_planejado)&&end>new Date(p.inicio_planejado)
  const machineConflict=activePrograms.some(p=>p.maquina_id===progForm.maquina_id&&overlaps(p))
  if(machineConflict){setError('Conflito de horÃ¡rio: a injetora jÃ¡ possui uma programação nesse intervalo.');return}
  const moldConflict=Boolean(progForm.molde_id)&&activePrograms.some(p=>p.molde_id===progForm.molde_id&&overlaps(p))
  if(moldConflict){setError('Conflito de horÃ¡rio: o mesmo molde jÃ¡ estÃ¡ programado nesse intervalo.');return}
  const dayKey=(value:Date)=>value.toISOString().slice(0,10)
  const sameMachineDay=activePrograms.filter(p=>p.maquina_id===progForm.maquina_id&&dayKey(new Date(p.inicio_planejado))===dayKey(start))
  const distinctMolds=new Set(sameMachineDay.map(p=>p.molde_id).filter((id):id is string=>Boolean(id)))
  if(progForm.molde_id)distinctMolds.add(progForm.molde_id)
  if(distinctMolds.size>2){setError('A mesma injetora suporta no mÃ¡ximo dois moldes distintos no mesmo dia.');return}
  setBusy(true);setError('');setMessage('')
  const detailed={empresa_id:companyId,ordem_producao_id:progForm.ordem_producao_id,maquina_id:progForm.maquina_id,produto_id:op?.produto_id||null,inicio_planejado:progForm.inicio,fim_planejado:progForm.fim,quantidade_planejada:qty,quantidade_produzida:0,quantidade_refugada:0,status:progForm.status,molde_id:progForm.molde_id||null,operador_frente_id:progForm.operador_frente_id||null,operador_atras_id:progForm.operador_atras_id||null,turnos,horas_turno:horasTurno,eficiencia_percent:eff,ciclo_seg:cycle,cavidades_ativas:cav,setup_min:setup}
  try{
   const r=await supabase.from('erp_pcp_programacoes').insert(detailed).select('id').single()
   if(r.error) throw r.error
   setMessage('Programação criada. A barra agora representa mÃ¡quina, dias, molde, ciclo, cavidades, equipe e quantidade.')
   setModal(null);setSelectedOp(progForm.ordem_producao_id);await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possÃ­vel programar a OP.')}
  finally{setBusy(false)}
 }

 async function confirmProduction(){
  if(!selectedOp){setError('Selecione uma OP.');return}
  const f=Number(found),b=Number(bad)
  if(f<0||b<0||b>f){setError('Quantidade encontrada/defeituosa invÃ¡lida.');return}
  const defectsJson=defectText.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const parts=x.split(':');return{defeito:parts[0].trim(),quantidade:Number(parts[1]||0),observacao:parts.slice(2).join(':').trim()||null}}).filter(x=>x.defeito&&x.quantidade>0)
  setBusy(true);setError('')
  try{
   const {data,error}=await supabase.rpc('erp_registrar_conferencia_producao',{p_ordem_producao_id:selectedOp,p_quantidade_encontrada:f,p_quantidade_defeituosa:b,p_defeitos:defectsJson,p_localizacao_destino_id:destinationLocation||null,p_acabamento:false,p_observacao:'ConferÃªncia realizada no PCP'})
   if(error)throw error
   const r=data as {quantidade_boa?:number;saldo_producao?:number}
   setMessage('ConferÃªncia registrada: '+Number(r.quantidade_boa||0)+' boas, '+b+' em refugo. Saldo de produção: '+Number(r.saldo_producao||0)+'.')
   setFound('');setBad('');setDefectText('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possÃ­vel registrar a produção.')}finally{setBusy(false)}
 }

 const analysisMachine=machines.find(m=>m.id===machineForAnalysis)||machines[0]
 const analysisMaterials=materials.map(i=>{const need=Number(i.quantidade)*Number(current?.quantidade||0)*(1+Number(i.perda_percentual||0)/100);const stock=Number(i.product?.estoque_atual||0);return {...i,need,stock,missing:Math.max(0,need-stock)}})
 const analysisRate=Math.max(1,Number(nominalRate||30))*(doubleMold?2:1)
 const analysisHours=current?Number(current.quantidade||0)/analysisRate:0
 const analysisStartDate=analysisStart?new Date(analysisStart):new Date()
 const analysisEndDate=new Date(analysisStartDate.getTime()+analysisHours*3600000)
 const analysisEnd=analysisEndDate.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
 const statusSummary=useMemo(()=>{const m:Record<string,number>={};for(const o of ops){const k=String(o.status||'Sem status');m[k]=(m[k]||0)+1}return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)},[ops])
 const productionDays=useMemo(()=>{const map:Record<string,{date:string;good:number;scrap:number}>={};for(const p of programs){const d=String(p.inicio_planejado||'').slice(0,10);if(!d)continue;map[d]??={date:d,good:0,scrap:0};map[d].good+=Math.max(0,Number(p.quantidade_produzida||0)-Number(p.quantidade_refugada||0));map[d].scrap+=Number(p.quantidade_refugada||0)}return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date)).slice(-7)},[programs])
 const maxProduction=Math.max(1,...productionDays.map(x=>x.good+x.scrap))
 const openOps=ops.filter(o=>!['concluÃ­da','concluida','finalizada','cancelada','concluÃ­do','concluido'].includes(String(o.status||'').toLowerCase())).length
 const totalGood=programs.reduce((s,p)=>s+Math.max(0,Number(p.quantidade_produzida||0)-Number(p.quantidade_refugada||0)),0)
 const totalScrap=programs.reduce((s,p)=>s+Number(p.quantidade_refugada||0),0)
 useEffect(()=>{
  const next = routeTabMap[location.pathname] ?? 'visao'
  setTab((current)=> current === next ? current : next)
 },[location.pathname, routeTabMap])
 function selectTab(next:Tab){setTab(next);setError('');setMessage('')} const widthBucket=(ratio:number)=>{
 const pct=Math.max(0,Math.min(100,ratio*100))
 if(pct<=0)return 'w-0'
 if(pct<15)return 'w-[10%]'
 if(pct<25)return 'w-1/5'
 if(pct<35)return 'w-1/3'
 if(pct<50)return 'w-2/5'
 if(pct<65)return 'w-1/2'
 if(pct<80)return 'w-3/5'
 if(pct<95)return 'w-4/5'
 return 'w-full'
}
const heightBucket=(ratio:number)=>{
 const pct=Math.max(0,Math.min(100,ratio*100))
 if(pct<=5)return 'h-1'
 if(pct<20)return 'h-6'
 if(pct<40)return 'h-12'
 if(pct<60)return 'h-20'
 if(pct<80)return 'h-28'
 return 'h-32'
}
const tabs:[Tab,string,string][]=[['visao','Visão geral','Gauge'],['novaop','Criar Nova OP','Plus'],['pedidos','Pedidos / Demanda','ClipboardList'],['ops','Ordens de Produção','Factory'],['materiais','Materiais / MRP','Package'],['producao','Apontar produção','Play'],['programacao','Programação / Gantt','CalendarDays'],['capacidade','Capacidade / Máquinas','Wrench'],['qualidade','Qualidade / Defeitos','ShieldCheck']]

 return <main className={`pcp-modern-page pcp-industrial-shell${hostedBySynqra?' pcp-hosted-by-synqra':''}`}>
  {!hostedBySynqra && (
  <nav className={`pcp-sidebar${hostedBySynqra?' pcp-sidebar-context':''}`} aria-label="Navegação do PCP">
   <div className="pcp-sidebar-brand"><img src="/logo/logo.png" alt="SYSNQRA ERP & SGQ INDUSTRIAL"/><div><strong>SYSNQRA ERP & SGQ INDUSTRIAL</strong><small>PCP INDUSTRIAL</small></div></div>
   <button className="pcp-side-item" onClick={()=>window.location.href='/erp-industrial'}><span>⌂</span> DASHBOARD</button>
   <div className="pcp-side-section">PLANEJAMENTO E CONTROLE</div>
   <button className={`pcp-side-item ${tab==='visao'?'active':''}`} aria-current={tab==='visao'?'page':undefined} onClick={()=>selectTab('visao')}><span>▦</span> VISÃƒO GERAL</button>
   <button className={`pcp-side-item ${tab==='novaop'?'active':''}`} aria-current={tab==='novaop'?'page':undefined} onClick={()=>selectTab('novaop')}><span>＋</span> CRIAR NOVA OP</button>
   <button className={`pcp-side-item ${tab==='pedidos'?'active':''}`} aria-current={tab==='pedidos'?'page':undefined} onClick={()=>window.location.href='/pcp/demanda'}><span>▤</span> DEMANDA CENTRAL</button>
   <button className={`pcp-side-item ${tab==='ops'?'active':''}`} aria-current={tab==='ops'?'page':undefined} onClick={()=>window.location.href='/pcp/ordens'}><span>□</span> ORDENS DE PRODUÇÃO</button>
   <button className={`pcp-side-item ${tab==='materiais'?'active':''}`} aria-current={tab==='materiais'?'page':undefined} onClick={()=>selectTab('materiais')}><span>◇</span> MATERIAIS / MRP</button>
   <button className={`pcp-side-item ${tab==='programacao'?'active':''}`} aria-current={tab==='programacao'?'page':undefined} onClick={()=>selectTab('programacao')}><span>◉</span> CALENDÃRIO / PROGRAMAÃ‡ÃƒO</button>
   <button className={`pcp-side-item ${tab==='capacidade'?'active':''}`} aria-current={tab==='capacidade'?'page':undefined} onClick={()=>selectTab('capacidade')}><span>▥</span> CENTROS DE TRABALHO / MÁQUINAS</button>
   <button className={`pcp-side-item ${tab==='producao'?'active':''}`} aria-current={tab==='producao'?'page':undefined} onClick={()=>selectTab('producao')}><span>▶</span> APONTAMENTO DE PRODUÇÃO</button>
   <button className="pcp-side-item" onClick={()=>window.location.href='/pcp/paradas'}><span>Ⅱ</span> PARADAS / SETUP</button>
   <button className={`pcp-side-item ${tab==='qualidade'?'active':''}`} aria-current={tab==='qualidade'?'page':undefined} onClick={()=>selectTab('qualidade')}><span>✓</span> QUALIDADE / DEFEITOS</button>
   <div className="pcp-side-section">PLANEJAMENTO AVANÃ‡ADO</div>
   <button className="pcp-side-item" onClick={()=>window.location.href='/pcp/planejamento'}><span>◈</span> MPS / CAPACIDADE</button>
   <button className="pcp-side-item" onClick={()=>window.location.href='/mrp'}><span>◌</span> MRP MULTINÃVEL</button>
   <button className="pcp-side-item" onClick={()=>window.location.href='/configuracao-lote-pcp'}><span>⚙</span> CONFIGURAÃ‡ÃƒO DE LOTE</button>
   <button className="pcp-side-item" onClick={()=>window.location.href='/qualidade/refugos'}><span>△</span> REFUGO / RETRABALHO</button>
   <button className="pcp-side-item" onClick={()=>window.location.href='/central-custos-industrial'}><span>▤</span> RELATÃ“RIOS / CUSTOS</button>
   <div className="pcp-side-spacer"/>
   <button className="pcp-side-item" onClick={()=>window.location.href='/manual-usuario'}><span>?</span> MANUAL</button>
  </nav>

  )}
  <section className="pcp-main">
   {!hostedBySynqra&&<header className="pcp-topbar">
    <div className="pcp-top-title"><button className="pcp-top-tablet" onClick={()=>window.location.href='/erp-industrial?tablet=1'}>▦ TABLET</button><div><strong>PCP Industrial</strong><small>PCP · PLANEJAMENTO E CONTROLE DA PRODUÇÃO</small></div></div>
    <div className="pcp-top-actions"><span className="pcp-supabase-dot"><i/> DADOS SUPABASE</span><span className="pcp-top-user"><i/>{profileName}</span><span className="pcp-top-clock">{clock.toLocaleDateString('pt-BR')} · {clock.toLocaleTimeString('pt-BR')}</span><button type="button" className="pcp-top-light" onClick={()=>document.documentElement.classList.toggle("dark")}>â˜¼ Light</button><button className="pcp-top-exit" onClick={()=>void supabase.auth.signOut().then(()=>window.location.replace('/login'))}>Sair</button></div>
   </header>}
   <div className="pcp-page-head"><div className="pcp-page-heading-row"><div><span>PCP · PLANEJAMENTO E CONTROLE DA PRODUÇÃO</span><h1>{tab==='visao'?'DASHBOARD':tab==='novaop'?'NOVA ORDEM DE PRODUÇÃO':help[tab].title.toUpperCase()}</h1><p>{tab==='visao'?'Visão geral da programação, produção, capacidade e qualidade da fábrica.':tab==='novaop'?'Cadastro operacional da OP, explosÃ£o de materiais e roteiro de produção.':help[tab].what}</p></div>{hostedBySynqra&&<button className="pcp-top-tablet" onClick={()=>window.location.href='/erp-industrial?tablet=1'}>▦ TABLET</button>}</div></div>
   {(message||error)&&<div className={error?'error':'notice mb-3'}>{error||message}</div>}
   <div className="pcp-content">
  {tab==='novaop'&&<NovaOPScreen orders={orders} orderItems={orderItems} products={products} clients={clients} machines={machines} fichas={fichas} fitems={fitems} fichaOps={fichaOps} onCancel={()=>selectTab('visao')} onSave={createOP} busy={busy} form={opForm} setForm={setOpForm}/>}\n\n  {tab==='visao'&&<section>
   <div className="quality-kpis">
    <article><span>PEDIDOS</span><strong>{orders.length}</strong><small>demanda registrada</small></article>
    <article><span>OPs ABERTAS</span><strong>{openOps}</strong><small>ordens em execuÃ§Ã£o</small></article>
    <article><span>PRODUÇÃO BOA</span><strong>{totalGood.toLocaleString('pt-BR')}</strong><small>quantidade apontada</small></article>
    <article><span>REFUGO / DEFEITOS</span><strong>{totalScrap.toLocaleString('pt-BR')}</strong><small>quantidade registrada</small></article>
   </div>

   <div className="pcp-dashboard-grid">
    <article className="pcp-dash-card">
     <h2>Pedidos por Status</h2>
     {statusSummary.length ? statusSummary.map(([name,n])=><div className="pcp-status-row" key={name}><span>{name}</span><div className="pcp-status-bar"><i className={widthBucket(n/Math.max(1,ops.length))}/></div><b>{n}</b></div>) : <div className="pcp-empty">Nenhuma OP real encontrada.</div>}
    </article>
    <article className="pcp-dash-card">
     <h2>Produção (últimos 7 dias)</h2>
     {productionDays.length ? <div className="pcp-prod-bars">{productionDays.map(d=><div className="pcp-prod-day" key={d.date}><b>{(d.good+d.scrap).toLocaleString('pt-BR')}</b><div className={`pcp-prod-bar ${heightBucket((d.good+d.scrap)/Math.max(1,maxProduction))}`}/><small>{new Date(d.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</small></div>)}</div> : <div className="pcp-chart-empty">Nenhuma produção apontada no período disponÃ­vel.</div>}
    </article>
    <article className="pcp-dash-card">
     <h2>Alertas do PCP</h2>
     <div className="pcp-alert-list">
      {openOps>0&&<div className="pcp-alert"><span className="pcp-alert-icon">!</span><div><strong>{openOps} OPs em aberto</strong><small>Acompanhar programação e produção.</small></div></div>}
      {totalScrap>0&&<div className="pcp-alert"><span className="pcp-alert-icon">!</span><div><strong>{totalScrap.toLocaleString('pt-BR')} peças em refugo</strong><small>Verificar Qualidade / Refugo.</small></div></div>}
      {programs.filter(p=>String(p.status||'').toLowerCase().includes('program')).length===0&&<div className="pcp-alert"><span className="pcp-alert-icon">i</span><div><strong>Sem programação ativa</strong><small>Use Programação / Gantt para carregar a fábrica.</small></div></div>}
      {!openOps&&!totalScrap&&programs.length>0&&<div className="pcp-alert"><span className="pcp-alert-icon">✓</span><div><strong>PCP sem alertas calculados</strong><small>Dados atuais não indicam pendÃªncias.</small></div></div>}
      {!ops.length&&!programs.length&&<div className="pcp-chart-empty">Sem registros reais para gerar alertas.</div>}
     </div>
    </article>
   </div>

   <div className="pcp-dashboard-tables">
    <article className="pcp-mini-table"><h2>Últimas Ordens de Produção</h2><table><thead><tr><th>OP</th><th>Produto</th><th>Quantidade</th><th>Status</th></tr></thead><tbody>{ops.slice(0,5).map(o=><tr key={o.id}><td><b>{o.numero_op}</b></td><td>{products.find(p=>p.id===o.produto_id)?.codigo||'—'}</td><td>{Number(o.quantidade||0).toLocaleString('pt-BR')}</td><td>{o.status}</td></tr>)}{!ops.length&&<tr><td colSpan={4}>Nenhuma ordem real cadastrada.</td></tr>}</tbody></table></article>
    <article className="pcp-mini-table"><h2>ProgramaÃ§Ãµes recentes</h2><table><thead><tr><th>Máquina</th><th>OP</th><th>InÃ­cio</th><th>Status</th></tr></thead><tbody>{schedule.slice(0,5).map(p=><tr key={p.id}><td>{p.machine?.codigo||'—'}</td><td>{p.op?.numero_op||'—'}</td><td>{new Date(p.inicio_planejado).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>{p.status}</td></tr>)}{!schedule.length&&<tr><td colSpan={4}>Nenhuma programação real cadastrada.</td></tr>}</tbody></table></article>
   </div>

   <div className="pcp-flow">
    {(['pedidos','ops','materiais','programacao','producao','qualidade'] as Tab[]).map((id,i)=><button key={id} onClick={()=>selectTab(id)}><b>{i+1}</b><strong>{help[id].title}</strong><small>{help[id].what}</small><em>{help[id].action} â†’</em></button>)}
   </div>
  </section>}

  {tab==='pedidos'&&<section><Table title="Pedidos que alimentam o PCP" cols={['Pedido','Status','Total','OPs vinculadas']} rows={orders.filter(o=>!query||String(o.numero).includes(query)).map(o=>[o.numero,o.status,o.total,ops.filter(x=>x.pedido_venda_id===o.id).length])} search={query} setSearch={setQuery}/></section>}

  {tab==='ops'&&<section className="crud-list">
   {current&&<section className="pcp-modern-panel mb-3"><div className="pcp-modern-panel-head"><div><span>DETALHES DA ORDEM DE PRODUÇÃO DISPARADA PELAS VENDAS</span><h2>{current.numero_op}</h2><p>Qtd. solicitada: {Number(current.quantidade).toLocaleString('pt-BR')} · Data limite: {current.data_prevista||'—'}</p></div></div><div className="pcp-form-grid-modern"><EntityCodeLookup label="Máquina destino" value={machineForAnalysis} records={machines.map(m=>({id:m.id,codigo:m.codigo,nome:m.nome}))} onChange={setMachineForAnalysis} onSelect={m=>setMachineForAnalysis(m.id)} helper="Digite o cÃ³digo da mÃ¡quina ou consulte pela lupa."/><label><span>Peças por hora nominal</span><input type="number" min="1" value={nominalRate} onChange={e=>setNominalRate(e.target.value)}/></label><label><span>InÃ­cio planejado</span><input type="datetime-local" value={analysisStart} onChange={e=>setAnalysisStart(e.target.value)}/></label><label><span>OperaÃ§Ã£o dupla</span><span className="flex min-h-[42px] items-center gap-2.5"><input type="checkbox" checked={doubleMold} onChange={e=>setDoubleMold(e.target.checked)} className="h-5 w-5"/> Dois moldes simultÃ¢neos: frente + atrÃ¡s</span></label></div><div className="pcp-planning-strip mt-3"><div><strong>CAPACIDADE AUTOMÃTICA</strong><span>{analysisRate.toLocaleString('pt-BR')} peças/h · {analysisMachine?.codigo||'mÃ¡quina não selecionada'} · tempo estimado {Math.floor(analysisHours)}h {Math.round((analysisHours%1)*60)}min</span></div><b>InÃ­cio: {analysisStart?new Date(analysisStart).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'defina o inÃ­cio'}</b><b>TÃ©rmino: {analysisStart?analysisEnd:'—'}</b></div><div className="mt-3"><strong>ANÃLISE DE DISPONIBILIDADE DE MATERIAL — EXPLOSÃƒO DA BOM</strong><div className="mt-2 overflow-x-auto"><table><thead><tr><th>Insumo requerido</th><th>Qtd. necessÃ¡ria</th><th>Estoque</th><th>Status</th></tr></thead><tbody>{analysisMaterials.map(i=><tr key={i.id}><td>{i.product?.codigo||'—'} · {i.product?.nome||'Componente'}</td><td>{i.need.toLocaleString('pt-BR',{maximumFractionDigits:3})}</td><td>{i.stock.toLocaleString('pt-BR',{maximumFractionDigits:3})}</td><td className={i.missing?'pcp-newop-warn':'pcp-newop-ok'}>{i.missing?'ðŸ”´ FALTA — '+i.missing.toLocaleString('pt-BR',{maximumFractionDigits:3}):'ðŸŸ¢ DISPONÃVEL — RESERVAR'}</td></tr>)}{!analysisMaterials.length&&<tr><td colSpan={4}>Esta OP ainda não possui BOM/ficha técnica ativa.</td></tr>}</tbody></table></div></div><div className="mt-3 flex justify-end gap-2">{analysisMaterials.some(i=>i.missing>0)&&<button className="secondary-v2" onClick={()=>window.location.href='/compras-solicitacao'}>ðŸ›’ COMPRAR MATERIAIS FALTANTES</button>}<button className="primary-v2" disabled={analysisMaterials.some(i=>i.missing>0)||!analysisMachine} onClick={()=>openProgram(current.id)}>⚙ï¸ LIBERAR OP PARA PROGRAMAÃ‡ÃƒO</button></div></section>}
   <div className="crud-list-head"><div><strong>Ordens de Produção</strong><small>Cadastre, consulte e abra uma OP para continuar o processo.</small></div><div className="pcp-list-actions"><div className="module-search"><InlineIcon name="Search" size={16}/><input placeholder="OP / status" value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="primary-v2" onClick={openNewOP}><InlineIcon name="Plus" size={17}/> Nova OP</button></div></div>
   <div className="crud-table-wrap"><table><thead><tr><th>OP</th><th>Produto</th><th>Quantidade</th><th>Status</th><th>Prevista</th><th>AÃ§Ãµes</th></tr></thead><tbody>{filteredOps.map(o=><tr key={o.id}><td><strong>{o.numero_op}</strong></td><td>{products.find(p=>p.id===o.produto_id)?.codigo||'—'} · {products.find(p=>p.id===o.produto_id)?.nome||'Produto não localizado'}</td><td>{o.quantidade}</td><td>{o.status}</td><td>{o.data_prevista||'—'}</td><td className="pcp-row-actions"><button className="secondary-v2" onClick={()=>{setSelectedOp(o.id)}}>Analisar</button><button className="secondary-v2" onClick={()=>{setSelectedOp(o.id);selectTab('materiais')}}>Materiais</button><button className="secondary-v2" onClick={()=>{setSelectedOp(o.id);selectTab('producao')}}>Apontar</button><button className="secondary-v2" onClick={()=>openProgram(o.id)}>Programar</button></td></tr>)}</tbody></table></div>
  </section>}

  {tab==='materiais'&&<section>
   <div className="erp-card pcp-code-card"><span className="v2-eyebrow">BOM / MRP</span><h2>Necessidade de materiais</h2><p className="pcp-help-text">Digite o nÃºmero/cÃ³digo da OP. A lupa abre a consulta sem obrigar a percorrer uma lista.</p><EntityCodeLookup label="CÃ³digo da OP" value={selectedOp} records={ops.map(o=>({id:o.id,codigo:o.numero_op,nome:String(o.quantidade)}))} onChange={setSelectedOp} onSelect={o=>setSelectedOp(o.id)} helper="Digite o cÃ³digo exato da OP."/></div>
   <Table title={current?'Necessidade calculada para '+current.numero_op:'Selecione uma OP para calcular'} cols={['Componente','Necessidade','Estoque atual','Saldo apÃ³s necessidade','Situação']} rows={materials.map(i=>{const need=Number(i.quantidade)*Number(current?.quantidade||0)*(1+Number(i.perda_percentual||0)/100);const stock=Number(i.product?.estoque_atual||0);return[i.product?.codigo+' · '+i.product?.nome,need,stock,stock-need,stock>=need?'ATENDE':'FALTA']})} search="" setSearch={()=>{}}/>
  </section>}

  {tab==='producao'&&<section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_.8fr]">
   <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4"><div><span className="text-sm font-extrabold uppercase tracking-wider text-sky-700">CONFERÃŠNCIA DE PRODUÇÃO</span><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Apontamento de Produção</h2><p className="mt-1 text-base text-slate-600">Registre exatamente o que saiu da fábrica nesta OP.</p></div><InlineIcon name="Play" size={26}/></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
     <div className="md:col-span-2"><EntityCodeLookup label="OP" value={selectedOp} records={ops.map(o=>({id:o.id,codigo:o.numero_op,nome:'Planejado '+o.quantidade}))} onChange={setSelectedOp} onSelect={o=>setSelectedOp(o.id)} helper="Digite o nÃºmero da OP ou use a lupa."/></div>
     <label className="grid gap-2 text-sm font-extrabold text-slate-800">QUANTIDADE ENCONTRADA<input className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="number" min="0" step="any" value={found} onChange={e=>setFound(e.target.value)} inputMode="decimal"/></label>
     <label className="grid gap-2 text-sm font-extrabold text-slate-800">QUANTIDADE DEFEITUOSA<input className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" type="number" min="0" step="any" value={bad} onChange={e=>setBad(e.target.value)} inputMode="decimal"/></label>
     <label className="grid gap-2 text-sm font-extrabold text-slate-800 md:col-span-2">LOCALIZAÃ‡ÃƒO DE DESTINO<input className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" value={destinationLocation} onChange={e=>setDestinationLocation(e.target.value)} placeholder="CÃ³digo da localizaÃ§Ã£o do estoque"/></label>
     <label className="grid gap-2 text-sm font-extrabold text-slate-800 md:col-span-2">DETALHES DE QUALIDADE<textarea className="min-h-32 rounded-md border border-slate-300 bg-white p-3 text-base font-medium text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" rows={4} value={defectText} onChange={e=>setDefectText(e.target.value)} placeholder="Defeito:quantidade:observaÃ§Ã£o — um por linha"/></label>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4"><span className="text-base font-semibold text-slate-600">Boa = encontrada âˆ’ defeituosa.</span><button type="button" className="rounded-md bg-sky-700 px-6 py-3 text-base font-extrabold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50" disabled={busy||!selectedOp} onClick={()=>void confirmProduction()}><InlineIcon name="Play" size={21}/>{busy?'LanÃ§andoâ€¦':'CONFERIR E LANÃ‡AR'}</button></div>
   </section>
   <section className="rounded-md border border-slate-200 bg-slate-900 p-5 text-white shadow-sm"><div className="mb-5 border-b border-slate-700 pb-4"><span className="text-sm font-extrabold uppercase tracking-wider text-sky-300">STATUS UNIFICADO DA OP</span><h2 className="mt-1 text-2xl font-extrabold text-white">{current?current.numero_op:'Selecione uma OP'}</h2><p className="mt-1 text-base text-slate-300">{current?'Indicadores das programaÃ§Ãµes e apontamentos reais.':'Digite ou consulte uma OP para acompanhar os nÃºmeros.'}</p></div>
    <div className="grid grid-cols-2 gap-3"><article className="rounded-md border border-slate-700 bg-slate-800 p-4"><small className="text-sm font-bold text-slate-300">PLANEJADO</small><strong className="mt-3 block text-4xl font-extrabold text-white">{current?.quantidade??0}</strong><em className="mt-1 block text-sm not-italic text-slate-400">Plano da OP</em></article><article className="rounded-md border border-slate-700 bg-slate-800 p-4"><small className="text-sm font-bold text-slate-300">ENCONTRADO</small><strong className="mt-3 block text-4xl font-extrabold text-white">{productionFound}</strong><em className="mt-1 block text-sm not-italic text-slate-400">Apontado</em></article><article className="rounded-md border border-red-800 bg-red-950/50 p-4"><small className="text-sm font-bold text-red-200">DEFEITOS</small><strong className="mt-3 block text-4xl font-extrabold text-white">{productionBad}</strong><em className="mt-1 block text-sm not-italic text-red-200">Refugo</em></article><article className="rounded-md border border-emerald-800 bg-emerald-950/50 p-4"><small className="text-sm font-bold text-emerald-200">BOAS</small><strong className="mt-3 block text-4xl font-extrabold text-white">{productionGood}</strong><em className="mt-1 block text-sm not-italic text-emerald-200">Quantidade boa</em></article></div>
   </section>
  </section>}

  {tab==='programacao'&&<ProgramacaoTimeline programs={schedule} machines={machines} molds={molds} employees={employees} onProgram={openProgram}/>} 

  {tab==='capacidade'&&<section><div className="pcp-capacity-grid">{machines.map(m=><article key={m.id}><div><span>{m.codigo}</span><strong>{m.nome}</strong><small>{m.tipo||'Máquina'} · {m.status}</small></div><b>{programs.filter(p=>p.maquina_id===m.id).length} programação(Ãµes)</b><button onClick={()=>openProgram()}><InlineIcon name="CalendarDays" size={16}/> Programar</button></article>)}</div></section>}

  {tab==='qualidade'&&<Table title="Defeitos enviados pela produção" cols={['Defeito','Quantidade','OP']} rows={defects.filter(d=>!query||d.defeito.toLowerCase().includes(query.toLowerCase())||d.ordem_producao_id.includes(query)).map(d=>[d.defeito,d.quantidade,d.ordem_producao_id])} search={query} setSearch={setQuery}/>}

  {modal==='ajuda'&&<Modal title="Como usar o PCP Industrial" onClose={()=>setModal(null)}><div className="pcp-help-modal">{tabs.map(([id,label,I])=><button key={id} onClick={()=>{selectTab(id);setModal(null)}}><InlineIcon name={I} size={20}/><div><strong>{label}</strong><p>{help[id].what}</p><small>Como usar: {help[id].how}</small></div><span>â†’</span></button>)}</div><div className="pcp-info"><InlineIcon name="CheckCircle2" size={20}/><div><strong>Fluxo recomendado</strong><p>Pedido â†’ OP â†’ MRP â†’ Programação â†’ Apontamento â†’ Estoque/Qualidade. Cada etapa tem uma finalidade; não Ã© necessÃ¡rio preencher tudo de uma vez.</p></div></div></Modal>}

  {modal==='op'&&<Modal title="Nova Ordem de Produção" onClose={()=>setModal(null)}><form className="pcp-modal-form" onSubmit={createOP}><label className="wide">Origem da ordem *<select required value={form.tipo_ordem} onChange={e=>setForm(v=>({...v,tipo_ordem:e.target.value as 'PEDIDO'|'ESTOQUE',pedido_venda_id:'',pedido_item_id:'',cliente_id:'',produto_id:'',quantidade:''}))}><option value="PEDIDO">Pedido de venda — atender demanda comercial</option><option value="ESTOQUE">Reposição de estoque — produzir peças faltantes</option></select><small>O número da OP é gerado pelo banco. Reposição de estoque não cria vínculo fictício com pedido ou cliente.</small></label>{form.tipo_ordem==='PEDIDO'&&<><label className="wide">Pedido de venda de origem *<select required value={form.pedido_venda_id} onChange={e=>{const order=orders.find(x=>x.id===e.target.value);setForm(v=>({...v,pedido_venda_id:e.target.value,pedido_item_id:'',cliente_id:order?.cliente_id||'',produto_id:'',quantidade:''}))}}><option value="">Selecione um pedido real de Vendas</option>{orders.filter(order=>!['cancelado','cancelada','rejeitado','rejeitada'].includes(String(order.status).toLowerCase())).map(order=><option key={order.id} value={order.id}>PV-{order.numero} · {order.status}</option>)}</select></label><label className="wide">Item / produto do pedido *<select required value={form.pedido_item_id} onChange={e=>{const item=orderItems.find(x=>x.id===e.target.value&&x.pedido_id===form.pedido_venda_id);setForm(v=>({...v,pedido_item_id:e.target.value,produto_id:item?.produto_id||'',quantidade:item?String(item.quantidade):''}))}}><option value="">Selecione o item que será produzido</option>{orderItems.filter(item=>item.pedido_id===form.pedido_venda_id).map(item=>{const p=products.find(x=>x.id===item.produto_id);return <option key={item.id} value={item.id}>{p?.codigo||'Produto'} · {p?.nome||item.descricao||'Item do pedido'} · Qtd. {Number(item.quantidade).toLocaleString('pt-BR')}</option>})}</select><small>A OP fica vinculada ao item específico do pedido comercial.</small></label><label>Cliente do pedido<input value={clients.find(c=>c.id===form.cliente_id)?.nome||'Cliente definido pelo pedido'} disabled/></label></>}{form.tipo_ordem==='ESTOQUE'&&<EntityCodeLookup label="Produto para reposição *" value={form.produto_id} required records={products} onChange={value=>setForm(v=>({...v,produto_id:value}))} onSelect={p=>setForm(v=>({...v,produto_id:p.id}))} helper="Selecione o produto cadastrado que precisa de reposição. A OP será criada sem pedido de venda."/>}<label>Prioridade<select value={form.prioridade} onChange={e=>setForm(v=>({...v,prioridade:e.target.value}))}><option value="ALTA">Alta</option><option value="REGULAR">Regular</option><option value="BAIXA">Baixa</option></select></label><label>Quantidade<input required type="number" min="0.0001" step="any" value={form.quantidade} onChange={e=>setForm(v=>({...v,quantidade:e.target.value}))}/></label><label>Data prevista<input type="date" value={form.data_prevista} onChange={e=>setForm(v=>({...v,data_prevista:e.target.value}))}/></label><label className="wide">ObservaÃ§Ãµes<textarea rows={2} value={form.observacoes} onChange={e=>setForm(v=>({...v,observacoes:e.target.value}))}/></label></div></article><article className="pcp-newop-card"><header><b>2</b><strong>MATÉRIAS-PRIMAS NECESSÃRIAS — EXPLOSÃƒO DE MATERIAIS / BOM</strong></header><div className="pcp-newop-help">{product?<>Produto selecionado: <strong>{product.codigo} — {product.nome}</strong> · Ficha técnica {ficha?'v'+ficha.versao:'não cadastrada'}. Quantidade da OP: <strong>{qty.toLocaleString('pt-BR')}</strong>.</>:<>Selecione o produto para calcular a necessidade pela ficha técnica ativa.</>}</div><table className="pcp-newop-table"><thead><tr><th>Item</th><th>Qtd. necessÃ¡ria</th><th>Estoque disponÃ­vel</th><th>Situação</th></tr></thead><tbody>{materials.map(i=>{const p=products.find(x=>x.id===i.componente_id);const need=Number(i.quantidade)*qty*(1+Number(i.perda_percentual||0)/100);const stock=Number(p?.estoque_atual||0);return <tr key={i.id}><td>{p?.codigo||'—'} — {p?.nome||'Componente não localizado'}</td><td>{need.toLocaleString('pt-BR')} {i.unidade_medida||'UN'}</td><td>{stock.toLocaleString('pt-BR')} {i.unidade_medida||'UN'}</td><td className={stock>=need?'pcp-newop-ok':'pcp-newop-warn'}>{stock>=need?'OK':'FALTA'}</td></tr>})}{!materials.length&&<tr><td colSpan={4}>Nenhuma estrutura BOM real cadastrada para o produto selecionado.</td></tr>}</tbody></table></article><article className="pcp-newop-card"><header><b>3</b><strong>ROTEIRO DE PRODUÇÃO — FLUXO DE MÁQUINAS</strong></header><div className="pcp-newop-route">{route.map(o=>{const m=machines.find(x=>x.id===o.maquina_id);return <div className="pcp-newop-route-row" key={o.id}><b>Seq {o.sequencia}</b><strong>{o.operacao}</strong><span>Setup: {Number(o.setup_min||0).toLocaleString('pt-BR')} min · Ciclo: {Number(o.ciclo_seg||0).toLocaleString('pt-BR')} s</span><span>C.T.: {m?.codigo||'Não definido'}</span></div>})}{!route.length&&<div className="pcp-newop-help">Nenhum roteiro real cadastrado na ficha técnica deste produto.</div>}</div></article><article className="pcp-newop-card"><header><b>4</b><strong>DESTINO DA INFORMAÇÃO</strong></header><div className="pcp-newop-actions"><button type="button" onClick={onCancel}>× Cancelar</button><button className="primary" disabled={busy} type="submit">💾 {busy?'SALVANDOâ€¦':'SALVAR E GERAR OP'}</button></div></article></form>}
function Table({title,cols,rows,search,setSearch}:{title:string;cols:string[];rows:(string|number)[][];search:string;setSearch:(v:string)=>void}){
 return <section className="crud-list"><div className="crud-list-head"><div><strong>{title}</strong><small>{rows.length} registros</small></div><div className="module-search"><InlineIcon name="Search" size={16}/><input placeholder="Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="crud-table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{String(v??'—')}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={cols.length} className="crud-empty">Nenhum registro encontrado.</td></tr>}</tbody></table></div></section>
}
