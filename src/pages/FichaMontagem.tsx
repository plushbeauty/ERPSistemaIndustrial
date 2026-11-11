import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Printer, RefreshCw, Search, ClipboardList, Paintbrush, ShieldCheck, PackageCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import QualityPlanGate from '../components/quality/QualityPlanGate'
import QualidadeInspecaoProcessoVersionada from './qualidade/QualidadeInspecaoProcessoVersionada'
import QualidadeLiberacaoLotes from './qualidade/QualidadeLiberacaoLotes'
import { Panel, Btn, Pill, Th, Td } from '../components/compras/ui'

type Tab = 'montagem' | 'acabamento' | 'inspecao' | 'liberacao'
type OrderRow = { id:string; numero_op:string; produto_id:string; quantidade:number|string; quantidade_planejada:number|string|null; quantidade_produzida:number|string|null; status:string; criado_em:string; data_prevista:string|null; cliente_id:string|null; ficha_id:string|null; maquina_id:string|null; observacoes:string|null }
type Product = { id:string; codigo:string; nome:string }
type Client = { id:string; nome:string }
type Machine = { id:string; codigo:string; nome:string; setor:string|null }
type Ficha = { id:string; codigo_ficha:string; categoria_processo:string|null; versao_ficha:number|null; parametros_tecnicos:unknown; observacoes_setup:string|null; observacoes:string|null }
type ProcessOperation = { id:string; sequencial_operacao:number; descricao_operacao:string; tempo_minutos:number|string|null; posto_trabalho_id:string|null }
type PcpRecord = { id:string; operacao_codigo:string|null; operador_id:string|null; centro_trabalho:string|null; setup_inicio:string|null; setup_fim:string|null; producao_inicio:string|null; producao_fim:string|null; pecas_boas:number|string|null; pecas_refugadas:number|string|null; motivo_parada:string|null; observacoes:string|null; created_at:string }
type ProcessRecord = { id:string; lote:string|null; inicio_em:string|null; fim_em:string|null; quantidade_planejada:number|string|null; quantidade_boa:number|string|null; quantidade_refugada:number|string|null; quantidade_reprocessada:number|string|null; operador_id:string|null; observacoes:string|null; criado_em:string|null }
type FinishRecord = { id:string; posto_trabalho:string|null; quantidade_recebida:number|string|null; quantidade_acabada:number|string|null; quantidade_refugo:number|string|null; status:string; created_by:string|null; created_at:string }
type Inspection = { id:string; tipo:string|null; resultado:string|null; quantidade_inspecionada:number|string|null; quantidade_aprovada:number|string|null; quantidade_reprovada:number|string|null; observacao:string|null; tipo_defeito:string|null; defeitos_encontrados:string|null; inspetor_nome:string|null; medicoes:unknown; created_by:string|null; created_at:string }
type Scrap = { id:string; tipo:string; quantidade:number|string; motivo:string|null; created_at:string }
type Employee = { id:string; nome:string|null; nome_completo:string|null; turno_trabalho:string|null; cargo:string|null }
type StockLot = { id:string; lote_interno:string; status_inspecao:string|null }
type Quarantine = { id:string; lote_id:string; motivo:string|null; status:string; liberado_por:string|null; liberado_em:string|null; created_at:string }
type Spec = { name:string; min:number|null; max:number|null }
type Measurement = { name:string; value:number|null }

const labelClass='mb-1 block text-[9px] font-extrabold uppercase tracking-wide text-[#66808D]'
const inputClass='h-10 w-full rounded-lg border border-[#D3E3EA] bg-white px-3 text-xs font-semibold text-[#123B50] outline-none focus:border-[#2D8DB8] focus:ring-2 focus:ring-[#2D8DB8]/15'
const moneyless=(value:number|string|null|undefined)=>Number(value??0).toLocaleString('pt-BR',{maximumFractionDigits:2})
const dateLabel=(value:string|null|undefined)=>value?new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString('pt-BR'):'—'
const minutesBetween=(start:string|null|undefined,end:string|null|undefined)=>start&&end?Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000)):0
const asRecord=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null
const numberFrom=(record:Record<string,unknown>,keys:string[])=>{for(const key of keys){const value=record[key];if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))return Number(value)}return null}

function extractSpecs(value:unknown):Spec[]{
 const result:Spec[]=[]
 const visit=(node:unknown,path:string)=>{
  if(Array.isArray(node)){node.forEach((item,index)=>visit(item,path?path+' '+(index+1):String(index+1)));return}
  const record=asRecord(node)
  if(!record)return
  const name=String(record.caracteristica??record.nome??record.label??record.name??record.parametro??path??'').trim()
  const min=numberFrom(record,['minimo','min','limite_inferior','valor_minimo'])
  const max=numberFrom(record,['maximo','max','limite_superior','valor_maximo'])
  if(name&&(min!==null||max!==null)){result.push({name,min,max});return}
  for(const [key,child] of Object.entries(record))visit(child,path?path+' · '+key:key)
 }
 visit(value,'')
 return result
}
function extractMeasurements(value:unknown):Measurement[]{
 const result:Measurement[]=[]
 const visit=(node:unknown,path:string)=>{
  if(Array.isArray(node)){node.forEach(item=>visit(item,path));return}
  const record=asRecord(node)
  if(!record)return
  const name=String(record.caracteristica??record.nome??record.label??record.name??record.parametro??path??'').trim()
  const measured=numberFrom(record,['valor_medido','medido','valor','medicao','resultado'])
  if(name&&measured!==null){result.push({name,value:measured});return}
  for(const [key,child] of Object.entries(record))visit(child,path?path+' · '+key:key)
 }
 visit(value,'')
 return result
}
const tabs:Array<{id:Tab;label:string;icon:typeof ClipboardList}>=[
 {id:'montagem',label:'Montagem',icon:ClipboardList},
 {id:'acabamento',label:'Acabamento',icon:Paintbrush},
 {id:'inspecao',label:'Inspeção',icon:ShieldCheck},
 {id:'liberacao',label:'Liberação',icon:PackageCheck},
]

export default function FichaMontagem(){
 const [empresaId,setEmpresaId]=useState('')
 const [orders,setOrders]=useState<OrderRow[]>([])
 const [products,setProducts]=useState<Product[]>([])
 const [clients,setClients]=useState<Client[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [fichas,setFichas]=useState<Ficha[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [active,setActive]=useState<Tab>('montagem')
 const [operations,setOperations]=useState<ProcessOperation[]>([])
 const [pcpRows,setPcpRows]=useState<PcpRecord[]>([])
 const [processRows,setProcessRows]=useState<ProcessRecord[]>([])
 const [finishRows,setFinishRows]=useState<FinishRecord[]>([])
 const [inspections,setInspections]=useState<Inspection[]>([])
 const [scraps,setScraps]=useState<Scrap[]>([])
 const [employees,setEmployees]=useState<Employee[]>([])
 const [stockLots,setStockLots]=useState<StockLot[]>([])
 const [quarantines,setQuarantines]=useState<Quarantine[]>([])
 const [loading,setLoading]=useState(true)
 const [detailLoading,setDetailLoading]=useState(false)
 const [error,setError]=useState('')

 const loadOrders=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error)throw tenant.error
   if(typeof tenant.data!=='string'||!tenant.data)throw new Error('Empresa da sessão não identificada.')
   const companyId=tenant.data
   setEmpresaId(companyId)
   const loaded=await fetchAllPages<OrderRow>((from,to)=>supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,quantidade_planejada,quantidade_produzida,status,criado_em,data_prevista,cliente_id,ficha_id,maquina_id,observacoes',{count:'exact'}).eq('empresa_id',companyId).order('criado_em',{ascending:false}).range(from,to),500)
   setOrders(loaded)
   const productIds=[...new Set(loaded.map(row=>row.produto_id).filter(Boolean))]
   const clientIds=[...new Set(loaded.map(row=>row.cliente_id).filter((value):value is string=>Boolean(value)))]
   const machineIds=[...new Set(loaded.map(row=>row.maquina_id).filter((value):value is string=>Boolean(value)))]
   const fichaIds=[...new Set(loaded.map(row=>row.ficha_id).filter((value):value is string=>Boolean(value)))]
   const [productResult,clientResult,machineResult,fichaResult]=await Promise.all([
    productIds.length?supabase.from('erp_produtos').select('id,codigo,nome').eq('empresa_id',companyId).in('id',productIds):Promise.resolve({data:[],error:null}),
    clientIds.length?supabase.from('erp_clientes').select('id,nome').eq('empresa_id',companyId).in('id',clientIds):Promise.resolve({data:[],error:null}),
    machineIds.length?supabase.from('erp_maquinas').select('id,codigo,nome,setor').eq('empresa_id',companyId).in('id',machineIds):Promise.resolve({data:[],error:null}),
    fichaIds.length?supabase.from('erp_fichas_processo').select('id,codigo_ficha,categoria_processo,versao_ficha,parametros_tecnicos,observacoes_setup,observacoes').eq('empresa_id',companyId).in('id',fichaIds):Promise.resolve({data:[],error:null}),
   ])
   if(productResult.error)throw productResult.error
   if(clientResult.error)throw clientResult.error
   if(machineResult.error)throw machineResult.error
   if(fichaResult.error)throw fichaResult.error
   setProducts((productResult.data??[]) as Product[])
   setClients((clientResult.data??[]) as Client[])
   setMachines((machineResult.data??[]) as Machine[])
   setFichas((fichaResult.data??[]) as Ficha[])
   setSelectedId(current=>loaded.some(row=>row.id===current)?current:loaded[0]?.id??'')
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar ordens de produção.')}
  finally{setLoading(false)}
 },[])

 const loadDetails=useCallback(async(orderId:string)=>{
  if(!empresaId||!orderId){setOperations([]);setPcpRows([]);setProcessRows([]);setFinishRows([]);setInspections([]);setScraps([]);setEmployees([]);setStockLots([]);setQuarantines([]);return}
  const order=orders.find(row=>row.id===orderId)
  if(!order)return
  setDetailLoading(true);setError('')
  try{
   let operationData:ProcessOperation[]=[]
   if(order.ficha_id){
    const result=await supabase.from('erp_ficha_processo_operacoes').select('id,sequencial_operacao,descricao_operacao,tempo_minutos,posto_trabalho_id').eq('empresa_id',empresaId).eq('ficha_processo_id',order.ficha_id).order('sequencial_operacao',{ascending:true})
    if(result.error)throw result.error
    operationData=(result.data??[]) as ProcessOperation[]
   }
   if(!operationData.length){
    const result=await supabase.from('erp_pcp_roteiro_operacoes').select('id,sequencia,operacao,tempo_min,posto_id').eq('empresa_id',empresaId).eq('produto_id',order.produto_id).order('sequencia',{ascending:true})
    if(result.error)throw result.error
    operationData=(result.data??[]).map(row=>({id:row.id,sequencial_operacao:Number(row.sequencia),descricao_operacao:String(row.operacao??''),tempo_minutos:row.tempo_min,posto_trabalho_id:row.posto_id})) as ProcessOperation[]
   }
   const [pcpResult,processResult,finishResult,inspectionResult,scrapResult]=await Promise.all([
    fetchAllPages<PcpRecord>((from,to)=>supabase.from('pcp_apontamentos').select('id,operacao_codigo,operador_id,centro_trabalho,setup_inicio,setup_fim,producao_inicio,producao_fim,pecas_boas,pecas_refugadas,motivo_parada,observacoes,created_at',{count:'exact'}).eq('empresa_id',empresaId).eq('ordem_producao_id',orderId).order('created_at',{ascending:true}).range(from,to)),
    fetchAllPages<ProcessRecord>((from,to)=>supabase.from('erp_apontamentos_processo').select('id,lote,inicio_em,fim_em,quantidade_planejada,quantidade_boa,quantidade_refugada,quantidade_reprocessada,operador_id,observacoes,criado_em',{count:'exact'}).eq('empresa_id',empresaId).eq('ordem_producao_id',orderId).order('inicio_em',{ascending:true}).range(from,to)),
    fetchAllPages<FinishRecord>((from,to)=>supabase.from('erp_acabamentos').select('id,posto_trabalho,quantidade_recebida,quantidade_acabada,quantidade_refugo,status,created_by,created_at',{count:'exact'}).eq('empresa_id',empresaId).eq('ordem_producao_id',orderId).order('created_at',{ascending:true}).range(from,to)),
    fetchAllPages<Inspection>((from,to)=>supabase.from('erp_inspecoes').select('id,tipo,resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada,observacao,tipo_defeito,defeitos_encontrados,inspetor_nome,medicoes,created_by,created_at',{count:'exact'}).eq('empresa_id',empresaId).eq('ordem_producao_id',orderId).order('created_at',{ascending:true}).range(from,to)),
    fetchAllPages<Scrap>((from,to)=>supabase.from('erp_refugos_retrabalhos').select('id,tipo,quantidade,motivo,created_at',{count:'exact'}).eq('empresa_id',empresaId).eq('ordem_producao_id',orderId).order('created_at',{ascending:true}).range(from,to)),
   ])
   setOperations(operationData);setPcpRows(pcpResult);setProcessRows(processResult);setFinishRows(finishResult);setInspections(inspectionResult);setScraps(scrapResult)
   const employeeIds=[...new Set([...pcpResult.map(row=>row.operador_id),...processResult.map(row=>row.operador_id),...finishResult.map(row=>row.created_by)].filter((value):value is string=>Boolean(value)))]
   if(employeeIds.length){
    const result=await supabase.from('erp_funcionarios').select('id,nome,nome_completo,turno_trabalho,cargo').eq('empresa_id',empresaId).in('id',employeeIds)
    if(result.error)throw result.error
    setEmployees((result.data??[]) as Employee[])
   }else setEmployees([])
   const lotCodes=[...new Set(processResult.map(row=>row.lote).filter((value):value is string=>Boolean(value)))]
   if(lotCodes.length){
    const lotResult=await supabase.from('erp_estoque_lotes').select('id,lote_interno,status_inspecao').eq('empresa_id',empresaId).in('lote_interno',lotCodes)
    if(lotResult.error)throw lotResult.error
    const stock=(lotResult.data??[]) as StockLot[]
    setStockLots(stock)
    if(stock.length){
     const quarantineResult=await supabase.from('erp_quarentenas_lotes').select('id,lote_id,motivo,status,liberado_por,liberado_em,created_at').eq('empresa_id',empresaId).in('lote_id',stock.map(row=>row.id)).order('created_at',{ascending:false})
     if(quarantineResult.error)throw quarantineResult.error
     setQuarantines((quarantineResult.data??[]) as Quarantine[])
    }else setQuarantines([])
   }else{setStockLots([]);setQuarantines([])}
  }catch(cause){setError(cause instanceof Error?cause.message:'Falha ao carregar apontamentos da ordem selecionada.')}
  finally{setDetailLoading(false)}
 },[empresaId,orders])

 useEffect(()=>{void loadOrders()},[loadOrders])
 useEffect(()=>{if(selectedId)void loadDetails(selectedId);else{setOperations([]);setPcpRows([]);setProcessRows([]);setFinishRows([]);setInspections([]);setScraps([]);setEmployees([]);setStockLots([]);setQuarantines([])}},[selectedId,loadDetails])

 const selectedOrder=useMemo(()=>orders.find(row=>row.id===selectedId)??null,[orders,selectedId])
 const selectedProduct=useMemo(()=>products.find(row=>row.id===selectedOrder?.produto_id)??null,[products,selectedOrder])
 const selectedClient=useMemo(()=>clients.find(row=>row.id===selectedOrder?.cliente_id)??null,[clients,selectedOrder])
 const selectedMachine=useMemo(()=>machines.find(row=>row.id===selectedOrder?.maquina_id)??null,[machines,selectedOrder])
 const selectedFicha=useMemo(()=>fichas.find(row=>row.id===selectedOrder?.ficha_id)??null,[fichas,selectedOrder])
 const employeeMap=useMemo(()=>new Map(employees.map(row=>[row.id,row])),[employees])
 const latestPcp=pcpRows[pcpRows.length-1]
 const latestFinish=finishRows[finishRows.length-1]
 const latestInspection=inspections[inspections.length-1]
 const lotCode=processRows.find(row=>row.lote)?.lote??stockLots[0]?.lote_interno??'—'
 const shift=latestPcp?.operador_id?employeeMap.get(latestPcp.operador_id)?.turno_trabalho??'—':'—'
 const line=latestPcp?.centro_trabalho??selectedMachine?.nome??selectedMachine?.setor??'—'
 const operationRows=useMemo(()=>operations.map(operation=>{
  const operationKey=String(operation.sequencial_operacao)
  const actual=pcpRows.find(row=>{
   const code=(row.operacao_codigo??'').trim().toLowerCase()
   const description=operation.descricao_operacao.trim().toLowerCase()
   return code===operationKey||code===operationKey.padStart(2,'0')||(description.length>2&&code.includes(description))
  })
  const realMinutes=actual?minutesBetween(actual.setup_inicio,actual.setup_fim)+minutesBetween(actual.producao_inicio,actual.producao_fim):null
  const completed=Boolean(actual&&(actual.producao_fim||Number(actual.pecas_boas||0)>0))
  const operator=actual?.operador_id?employeeMap.get(actual.operador_id)?.nome_completo??employeeMap.get(actual.operador_id)?.nome??'—':'—'
  return {id:operation.id,sequence:operation.sequencial_operacao,description:operation.descricao_operacao,standard:Number(operation.tempo_minutos??0),real:realMinutes,completed,operator}
 }),[operations,pcpRows,employeeMap])
 const completedSteps=operationRows.filter(row=>row.completed).length
 const progress=operationRows.length?Math.round(completedSteps/operationRows.length*100):0
 const specs=useMemo(()=>extractSpecs(selectedFicha?.parametros_tecnicos),[selectedFicha])
 const measurements=useMemo(()=>inspections.flatMap(row=>extractMeasurements(row.medicoes)),[inspections])
 const measurementMap=useMemo(()=>new Map(measurements.map(row=>[row.name.toLowerCase(),row.value])),[measurements])
 const finishRowsView=useMemo(()=>specs.map(spec=>{
  const measured=measurementMap.get(spec.name.toLowerCase())??null
  const within=(spec.min===null||measured===null||measured>=spec.min)&&(spec.max===null||measured===null||measured<=spec.max)
  const status=measured===null?'PENDENTE':within?'OK':'FORA'
  return {...spec,measured,status}
 }),[specs,measurementMap])
 const inspected=inspections.reduce((sum,row)=>sum+Number(row.quantidade_inspecionada??0),0)
 const approved=inspections.reduce((sum,row)=>sum+Number(row.quantidade_aprovada??0),0)
 const rejected=inspections.reduce((sum,row)=>sum+Number(row.quantidade_reprovada??0),0)
 const defectPareto=useMemo(()=>{
  const counts=new Map<string,number>()
  for(const row of scraps){const key=row.motivo?.trim()||row.tipo||'Não classificado';counts.set(key,(counts.get(key)??0)+Number(row.quantidade||0))}
  for(const row of inspections){const key=row.tipo_defeito?.trim()||row.defeitos_encontrados?.trim();if(key)counts.set(key,(counts.get(key)??0)+Number(row.quantidade_reprovada||0))}
  return [...counts.entries()].map(([name,quantity])=>({name,quantity})).sort((a,b)=>b.quantity-a.quantity).slice(0,8)
 },[scraps,inspections])
 const totalDefects=defectPareto.reduce((sum,row)=>sum+row.quantity,0)
 const quarantine=quarantines[0]
 const stockStatus=(stockLots[0]?.status_inspecao??'').toUpperCase()
 const releaseStatus=(quarantine?.status??'').toUpperCase()
 const lotDecision=releaseStatus.includes('LIBER')||stockStatus.includes('APROV')?'LIBERADO':releaseStatus.includes('QUARENT')||releaseStatus.includes('REPROV')||stockStatus.includes('REPROV')?'SEGREGADO':scraps.some(row=>row.tipo.toUpperCase().includes('RETRAB'))?'RETRABALHO':'EM ABERTO'
 const signatureMontage=latestPcp?.operador_id?employeeMap.get(latestPcp.operador_id)?.nome_completo??employeeMap.get(latestPcp.operador_id)?.nome??'—':'—'
 const signatureFinish=latestFinish?.created_by?employeeMap.get(latestFinish.created_by)?.nome_completo??employeeMap.get(latestFinish.created_by)?.nome??'—':'—'
 const signatureQuality=latestInspection?.inspetor_nome??'—'
 const maxTime=Math.max(1,...operationRows.map(row=>Math.max(row.standard,row.real??0)))

 return <main className="min-h-full bg-[#F4FBFD] p-3 text-[#123B50] print:bg-white print:p-0">
  <div className="mx-auto max-w-[1680px] space-y-3">
   <header className="relative overflow-hidden rounded-xl bg-[#123B50] px-4 py-4 text-white shadow-md print:bg-white print:text-[#123B50] print:shadow-none">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{background:'radial-gradient(circle at 82% 0%, rgba(72,183,199,.45), transparent 38%), radial-gradient(circle at 8% 110%, rgba(45,141,184,.4), transparent 42%)'}}/>
    <div className="relative flex flex-wrap items-center justify-between gap-3">
     <div><div className="text-[10px] font-black tracking-[.22em] text-[#8ADCE2]">SYSNQRA ERP INDUSTRIAL</div><p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/75">Produção · Qualidade</p><h1 className="mt-1 text-lg font-black">Ficha de Montagem e Acabamento</h1><p className="mt-1 text-[10px] text-white/75">OP, roteiro técnico, apontamentos reais, inspeção e liberação rastreável.</p></div>
     <div className="flex gap-2 print:hidden"><Btn variant="secondary" onClick={()=>window.print()}><Printer size={14}/>Imprimir ficha</Btn><Btn variant="ghost" className="border-white/30 text-white hover:bg-white/10" onClick={()=>void loadOrders()} disabled={loading}><RefreshCw size={14} className={loading?'animate-spin':''}/>Atualizar</Btn></div>
    </div>
   </header>

   <div className="-mt-12 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <div className="animate-rise rounded-xl border border-[#D3E3EA] bg-white p-3 shadow-md"><p className={labelClass}>Etapas montagem</p><div className="flex items-end justify-between"><strong className="text-xl font-black tabular-nums">{completedSteps}/{operationRows.length}</strong><Pill tone={progress===100&&operationRows.length?'green':'blue'}>{progress}%</Pill></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E6EEF2]"><div className="h-full rounded-full bg-[#3A9D78]" style={{width:progress+'%'}}/></div></div>
    <div className="animate-rise rounded-xl border border-[#D3E3EA] bg-white p-3 shadow-md"><p className={labelClass}>Parâmetros acabamento</p><div className="flex items-end justify-between"><strong className="text-xl font-black tabular-nums">{finishRowsView.filter(row=>row.status!=='PENDENTE').length}/{finishRowsView.length}</strong><Pill tone={finishRowsView.some(row=>row.status==='FORA')?'red':'blue'}>Medidos</Pill></div><p className="mt-2 text-[10px] text-[#66808D]">Medições registradas na inspeção</p></div>
    <div className="animate-rise rounded-xl border border-[#D3E3EA] bg-white p-3 shadow-md"><p className={labelClass}>Peças inspecionadas</p><strong className="text-xl font-black tabular-nums">{moneyless(inspected)}</strong><p className="mt-2 text-[10px] text-[#66808D]">Aprovadas {moneyless(approved)} · Reprovadas {moneyless(rejected)}</p></div>
    <div className="animate-rise rounded-xl border border-[#D3E3EA] bg-white p-3 shadow-md"><p className={labelClass}>Situação do lote</p><strong className="mt-1 block text-sm font-black">{lotDecision==='EM ABERTO'?'Em aberto':lotDecision}</strong><p className="mt-2 truncate text-[10px] text-[#66808D]">Lote {lotCode}</p></div>
   </div>

   <Panel title="Identificação da ordem" subtitle="Dados reais da OP selecionada; campos sem vínculo cadastrado permanecem em branco.">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
     <label className="lg:col-span-1"><span className={labelClass}>Ordem de produção</span><select className={inputClass} value={selectedId} onChange={event=>setSelectedId(event.target.value)} disabled={loading}><option value="">Selecione uma OP</option>{orders.map(order=><option key={order.id} value={order.id}>{order.numero_op} · {order.status}</option>)}</select></label>
     <div className="lg:col-span-2"><span className={labelClass}>Produto</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs font-bold">{selectedProduct?.nome??'—'}</div></div>
     <div><span className={labelClass}>Código</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{selectedProduct?.codigo??'—'}</div></div>
     <div><span className={labelClass}>Cliente</span><div className="flex h-10 items-center truncate rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{selectedClient?.nome??'—'}</div></div>
     <div><span className={labelClass}>Quantidade</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs font-bold tabular-nums">{moneyless(selectedOrder?.quantidade_planejada??selectedOrder?.quantidade)}</div></div>
     <div><span className={labelClass}>Lote</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{lotCode}</div></div>
     <div><span className={labelClass}>Data</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{dateLabel(selectedOrder?.data_prevista??selectedOrder?.criado_em)}</div></div>
     <div><span className={labelClass}>Turno</span><div className="flex h-10 items-center rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{shift}</div></div>
     <div><span className={labelClass}>Linha / Posto</span><div className="flex h-10 items-center truncate rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] px-3 text-xs">{line}</div></div>
    </div>
    {selectedFicha&&<p className="mt-2 text-[10px] text-[#66808D]">Ficha {selectedFicha.codigo_ficha} · revisão {selectedFicha.versao_ficha??'—'} · {selectedFicha.categoria_processo??'Processo não classificado'}</p>}
   </Panel>

   {error&&<div role="alert" className="rounded-lg border border-[#D65B61]/30 bg-[#FFF4F4] px-3 py-2 text-xs text-[#A63C3C]">{error}</div>}
   {loading?<Panel><div className="py-8 text-center text-xs text-[#66808D]">Carregando ordens da empresa ativa…</div></Panel>:
   !orders.length?<Panel title="Nenhuma ordem encontrada"><p className="py-5 text-center text-xs text-[#66808D]">Não existem ordens de produção cadastradas para a empresa ativa.</p></Panel>:
   <Panel className="print:shadow-none">
    <nav aria-label="Abas da ficha" className="mb-3 flex flex-wrap gap-2 print:hidden">
     {tabs.map(tab=>{const Icon=tab.icon;return <button key={tab.id} type="button" aria-pressed={active===tab.id} onClick={()=>setActive(tab.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition ${active===tab.id?'border-[#176487] bg-[#176487] text-white':'border-[#D3E3EA] bg-white text-[#315466] hover:bg-[#EDF6F9]'}`}><Icon size={14}/>{tab.label}</button>})}
    </nav>
    {detailLoading?<div className="py-8 text-center text-xs text-[#66808D]">Carregando dados reais da OP…</div>:
     active==='montagem'?<div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-black">1. Montagem</h2><p className="text-[10px] text-[#66808D]">Roteiro técnico e tempos reais registrados no PCP.</p></div><Pill tone={progress===100&&operationRows.length?'green':'blue'}>{progress}% concluído</Pill></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E6EEF2]"><div className="h-full rounded-full bg-[#3A9D78] transition-all" style={{width:progress+'%'}}/></div>
      <div className="overflow-x-auto rounded-lg border border-[#D3E3EA]"><table className="w-full min-w-[900px] border-collapse"><thead><tr><Th className="w-12">Check</Th><Th className="w-16">Seq.</Th><Th>Operação</Th><Th>Padrão</Th><Th className="text-right">Padrão min</Th><Th className="text-right">Real min</Th><Th>Operador</Th></tr></thead><tbody>
       {operationRows.map(row=><tr key={row.id} className="even:bg-[#F8FBFC]"><Td>{row.completed?<CheckCircle2 size={16} className="text-[#3A9D78]"/>:<Circle size={16} className="text-[#A9BBC4]"/>}</Td><Td className="tabular-nums">{row.sequence}</Td><Td className="font-bold">{row.description}</Td><Td>{row.standard?'Ficha técnica':'—'}</Td><Td className="text-right tabular-nums">{row.standard?moneyless(row.standard):'—'}</Td><Td className="text-right tabular-nums">{row.real===null?'—':moneyless(row.real)}</Td><Td>{row.operator}</Td></tr>)}
       {!operationRows.length&&<tr><Td colSpan={7} className="h-16 text-center text-[#66808D]">A ficha desta OP ainda não possui operações cadastradas. Nenhuma etapa fictícia foi criada.</Td></tr>}
      </tbody></table></div>
      <div className="rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] p-3"><h3 className="mb-3 text-[10px] font-black uppercase tracking-wide text-[#547080]">Tempo por etapa</h3>{operationRows.length?<div className="space-y-2">{operationRows.map(row=><div key={row.id} className="grid grid-cols-[minmax(100px,180px)_1fr_70px] items-center gap-2 text-[10px]"><span className="truncate font-semibold">{row.description}</span><div className="space-y-1"><div className="h-2 rounded-full bg-[#E6EEF2]"><div className="h-full rounded-full bg-[#2D8DB8]" style={{width:Math.min(100,row.standard/maxTime*100)+'%'}}/></div><div className="h-2 rounded-full bg-[#E6EEF2]"><div className="h-full rounded-full bg-[#3A9D78]" style={{width:Math.min(100,(row.real??0)/maxTime*100)+'%'}}/></div></div><span className="text-right tabular-nums text-[#547080]">{row.real===null?'—':moneyless(row.real)+' min'}</span></div>)}</div>:<p className="text-xs text-[#66808D]">Sem tempos padrão ou reais cadastrados para esta OP.</p>}<div className="mt-3 flex gap-4 text-[9px] font-bold text-[#66808D]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2D8DB8]"/>Padrão</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#3A9D78]"/>Real</span></div></div>
     </div>:
     active==='acabamento'?<div className="space-y-3">
      <div><h2 className="text-sm font-black">2. Acabamento</h2><p className="text-[10px] text-[#66808D]">Características e limites definidos na ficha técnica, confrontados com medições reais de inspeção.</p></div>
      <div className="overflow-x-auto rounded-lg border border-[#D3E3EA]"><table className="w-full min-w-[700px] border-collapse"><thead><tr><Th>Característica</Th><Th className="text-right">Mínimo</Th><Th className="text-right">Máximo</Th><Th className="text-right">Medido</Th><Th>Resultado</Th></tr></thead><tbody>
       {finishRowsView.map((row,index)=><tr key={row.name+'-'+index} className="even:bg-[#F8FBFC]"><Td className="font-bold">{row.name}</Td><Td className="text-right tabular-nums">{row.min??'—'}</Td><Td className="text-right tabular-nums">{row.max??'—'}</Td><Td className="text-right tabular-nums">{row.measured??'—'}</Td><Td><Pill tone={row.status==='OK'?'green':row.status==='FORA'?'red':'amber'}>{row.status}</Pill></Td></tr>)}
       {!finishRowsView.length&&<tr><Td colSpan={5} className="h-16 text-center text-[#66808D]">A ficha técnica desta OP não possui limites dimensionais/de acabamento cadastrados.</Td></tr>}
      </tbody></table></div>
      <Panel title="Registros de acabamento" subtitle="Quantidades e status persistidos em erp_acabamentos.">
       <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse"><thead><tr><Th>Posto</Th><Th className="text-right">Recebidas</Th><Th className="text-right">Acabadas</Th><Th className="text-right">Refugo</Th><Th>Status</Th><Th>Data</Th></tr></thead><tbody>
        {finishRows.map(row=><tr key={row.id}><Td>{row.posto_trabalho??'—'}</Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_recebida)}</Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_acabada)}</Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_refugo)}</Td><Td><Pill tone={row.status.toUpperCase().includes('CONCLU')?'green':'blue'}>{row.status}</Pill></Td><Td>{dateLabel(row.created_at)}</Td></tr>)}
        {!finishRows.length&&<tr><Td colSpan={6} className="h-14 text-center text-[#66808D]">Nenhum apontamento de acabamento registrado para esta OP.</Td></tr>}
       </tbody></table></div>
      </Panel>
     </div>:
     active==='inspecao'?<div className="space-y-3">
      <div><h2 className="text-sm font-black">3. Inspeção</h2><p className="text-[10px] text-[#66808D]">Totais, defeitos e evidências registrados no SGQ para a ordem selecionada.</p></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-lg border border-[#D3E3EA] bg-[#F8FBFC] p-3"><span className={labelClass}>Inspecionadas</span><strong className="text-lg font-black">{moneyless(inspected)}</strong></div><div className="rounded-lg border border-[#B8E0CE] bg-[#EFF9F3] p-3"><span className={labelClass}>Aprovadas</span><strong className="text-lg font-black text-[#287B59]">{moneyless(approved)}</strong></div><div className="rounded-lg border border-[#EBC0C3] bg-[#FFF2F2] p-3"><span className={labelClass}>Refugo / Reprovadas</span><strong className="text-lg font-black text-[#A63C3C]">{moneyless(rejected+scraps.reduce((sum,row)=>sum+Number(row.quantidade||0),0))}</strong></div></div>
      <Panel title="Pareto de defeitos" subtitle="Agrupamento dos motivos de refugo e defeitos informados nas inspeções.">
       {defectPareto.length?<div className="space-y-2">{defectPareto.map(row=><div key={row.name} className="grid grid-cols-[minmax(100px,220px)_1fr_64px] items-center gap-2 text-[10px]"><span className="truncate font-semibold">{row.name}</span><div className="h-3 overflow-hidden rounded-full bg-[#E6EEF2]"><div className="h-full rounded-full bg-[#D65B61]" style={{width:Math.min(100,totalDefects?row.quantity/totalDefects*100:0)+'%'}}/></div><strong className="text-right tabular-nums">{moneyless(row.quantity)}</strong></div>)}</div>:<p className="py-3 text-center text-xs text-[#66808D]">Sem defeitos ou refugos registrados para esta OP.</p>}
      </Panel>
      <Panel title="Inspeções registradas" subtitle="Histórico real de inspeção associado à ordem de produção.">
       <div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse"><thead><tr><Th>Tipo</Th><Th>Resultado</Th><Th className="text-right">Inspecionadas</Th><Th className="text-right">Aprovadas</Th><Th className="text-right">Reprovadas</Th><Th>Inspetor</Th><Th>Data</Th></tr></thead><tbody>
        {inspections.map(row=><tr key={row.id}><Td>{row.tipo??'—'}</Td><Td><Pill tone={(row.resultado??'').toUpperCase().includes('APROV')?'green':(row.resultado??'').toUpperCase().includes('REPROV')?'red':'amber'}>{row.resultado??'PENDENTE'}</Pill></Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_inspecionada)}</Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_aprovada)}</Td><Td className="text-right tabular-nums">{moneyless(row.quantidade_reprovada)}</Td><Td>{row.inspetor_nome??'—'}</Td><Td>{dateLabel(row.created_at)}</Td></tr>)}
        {!inspections.length&&<tr><Td colSpan={7} className="h-14 text-center text-[#66808D]">Nenhuma inspeção registrada para esta OP.</Td></tr>}
       </tbody></table></div>
      </Panel>
      <QualityPlanGate><QualidadeInspecaoProcessoVersionada/></QualityPlanGate>
     </div>:
     <div className="space-y-3">
      <div><h2 className="text-sm font-black">4. Liberação</h2><p className="text-[10px] text-[#66808D]">Decisão baseada no status do lote e na trilha SGQ real; liberação transacional no módulo de lotes.</p></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
       <div className={`rounded-lg border p-3 ${lotDecision==='LIBERADO'?'border-[#3A9D78] bg-[#EFF9F3]':'border-[#D3E3EA] bg-white'}`}><Pill tone={lotDecision==='LIBERADO'?'green':'slate'}>LIBERADO</Pill><p className="mt-2 text-[10px] text-[#66808D]">Lote liberado somente quando o registro SGQ confirmar a decisão.</p></div>
       <div className={`rounded-lg border p-3 ${lotDecision==='RETRABALHO'?'border-[#E0B76F] bg-[#FFF8EA]':'border-[#D3E3EA] bg-white'}`}><Pill tone={lotDecision==='RETRABALHO'?'amber':'slate'}>RETRABALHO</Pill><p className="mt-2 text-[10px] text-[#66808D]">Retrabalho registrado: {moneyless(scraps.filter(row=>row.tipo.toUpperCase().includes('RETRAB')).reduce((sum,row)=>sum+Number(row.quantidade||0),0))} peças.</p></div>
       <div className={`rounded-lg border p-3 ${lotDecision==='SEGREGADO'?'border-[#D65B61] bg-[#FFF2F2]':'border-[#D3E3EA] bg-white'}`}><Pill tone={lotDecision==='SEGREGADO'?'red':'slate'}>SEGREGADO</Pill><p className="mt-2 text-[10px] text-[#66808D]">Quarentena: {quarantine?.motivo??'Sem bloqueio registrado.'}</p></div>
      </div>
      <Panel title="Assinaturas e rastreabilidade">
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="border-b border-[#AFC4CE] pb-2"><span className={labelClass}>Montagem</span><strong className="text-xs">{signatureMontage}</strong><p className="text-[9px] text-[#66808D]">{latestPcp?.created_at?dateLabel(latestPcp.created_at):'Sem apontamento'}</p></div><div className="border-b border-[#AFC4CE] pb-2"><span className={labelClass}>Acabamento</span><strong className="text-xs">{signatureFinish}</strong><p className="text-[9px] text-[#66808D]">{latestFinish?.created_at?dateLabel(latestFinish.created_at):'Sem apontamento'}</p></div><div className="border-b border-[#AFC4CE] pb-2"><span className={labelClass}>Qualidade</span><strong className="text-xs">{signatureQuality}</strong><p className="text-[9px] text-[#66808D]">{latestInspection?.created_at?dateLabel(latestInspection.created_at):'Sem inspeção'}</p></div></div>
       <p className="mt-3 text-[10px] text-[#66808D]">Observações da OP: {selectedOrder?.observacoes??'—'}</p>
      </Panel>
      <QualityPlanGate><QualidadeLiberacaoLotes/></QualityPlanGate>
     </div>}
   </Panel>}
   <footer className="flex flex-wrap justify-between gap-2 text-[9px] text-[#66808D] print:hidden"><span>SYSNQRA ERP INDUSTRIAL · Produção e Qualidade</span><span>Empresa: {empresaId||'—'} · OP: {selectedOrder?.numero_op??'—'}</span></footer>
  </div>
 </main>
}
