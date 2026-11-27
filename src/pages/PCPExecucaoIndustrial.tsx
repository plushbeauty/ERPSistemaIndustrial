/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — o botão Imprimir deixa de capturar a tela e passa a emitir o relatório A4 de execução da produção (carteira de OPs e apontamentos) montado pelo motor de relatório com dados do banco
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 — "Não basta adicionar CSS @media print para imprimir a tela atual. Quero uma estrutura própria de relatório."
 */
/**
 * HISTÓRICO: REV-COLUNAS-BANCO-20261104-01 — ordem do proprietário "telas travadas vc destrava": os apontamentos liam e ordenavam por 'created_at', coluna que não existe em erp_apontamentos_processo (o nome real é 'criado_em'); a query do Promise.all falhava e a aba de apontamentos não carregava.
 * HISTÓRICO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 */
/**
 * ERPSis — CONTROLE DE REVISÃO VISUAL
 * Data Atual: 2026-10-21
 * Revisão Incremental: REV-062 — alinhamento de controles e grade à referência PCPOrdens
 * Escopo: padronização industrial de inputs, seletores, botões e densidade tipográfica;
 * cantos retos, foco azul, cabeçalhos escuros e alinhamento de dados conforme aplicável.
 * Escopo funcional preservado: consultas Supabase, validações, tenant, RPCs e gravações.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Boxes, ClipboardList, Factory, Printer, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { abrirRelatorio } from '../lib/report/abrirRelatorio'
import type { Bloco } from '../lib/report/documento'

type Product = { id:string; codigo:string; nome:string; unidade:string|null }
type Order = { id:string; numero_op:number|string; produto_id:string|null; quantidade:number|null; quantidade_planejada:number|null; quantidade_produzida:number|null; status:string; data_prevista:string|null; maquina_id:string|null }
type Machine = { id:string; codigo:string; nome:string }
type Employee = { id:string; matricula:string|null; nome:string|null; nome_completo:string|null }
type Recipe = { id:string; processo_id:string; produto_id:string; versao:number; status:string; maquina_id:string|null; ferramenta_id:string|null; ciclo_seg:number|null }
type Process = { id:string; codigo:string; nome:string }
type Entry = { id:string; ordem_producao_id:string; maquina_id:string|null; processo_id:string|null; inicio_em:string|null; fim_em:string|null; quantidade_planejada:number|null; quantidade_boa:number|null; quantidade_refugada:number|null; motivo_parada:string|null; observacoes:string|null; criado_em:string }
type Material = { produto_id:string; codigo:string; descricao:string; nivel:number; necessidade_bruta:number; saldo_disponivel:number; quantidade_em_compra:number; necessidade_liquida:number; perda_estimada:number; sugestao:string }
type RawLot = {id:string;produto_id:string;lote_fornecedor:string;quantidade_disponivel:number;status_qualidade:string}
type FinishedLotRow = {id:string;lote_interno:string;quantidade_recebida:number;modo_lote:string|null;data_producao:string|null}
type LotAllocation = {lote_id:string;ordem_producao_id:string}
type FinishedLotOption = FinishedLotRow & {ordem_producao_id:string}

const field='h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100'
const label='flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500'
const btn='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50'
const primary='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-sky-700 bg-sky-700 px-3 text-[10px] font-semibold text-white hover:bg-sky-800 disabled:opacity-50'
const th='h-[30px] border-b border-slate-200 bg-slate-100 px-2 text-left align-middle text-[9px] font-bold uppercase text-slate-600'
const td='h-[30px] border-b border-slate-100 px-2 align-middle text-[10px] font-semibold text-slate-700'
const localDateTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const messageOf=(e:unknown)=>e instanceof Error?e.message:'Falha na execução do PCP.'
const dataHoraRelatorio=(value:string|null|undefined)=>{if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):value}
const dataRelatorio=(value:string|null|undefined)=>{if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):value}
const quantidadeRelatorio=(value:number|string|null|undefined)=>{const n=Number(value??0);return Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:2}):'—'}
const numeroSeguro=(value:number|string|null|undefined)=>{const n=Number(value??0);return Number.isFinite(n)?n:0}

export default function PCPExecucaoIndustrial(){
 const [tab,setTab]=useState<'ordens'|'apontamentos'|'mrp'>('ordens')
 const [company,setCompany]=useState('')
 const [products,setProducts]=useState<Product[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [machines,setMachines]=useState<Machine[]>([])
 const [processes,setProcesses]=useState<Process[]>([])
 const [employees,setEmployees]=useState<Employee[]>([])
 const [recipes,setRecipes]=useState<Recipe[]>([])
 const [entries,setEntries]=useState<Entry[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [query,setQuery]=useState('')
 const [entry,setEntry]=useState({ordem_producao_id:'',maquina_id:'',processo_id:'',receita_id:'',operador_id:'',inicio_em:localDateTime(),fim_em:'',quantidade_planejada:'1',quantidade_boa:'0',quantidade_refugada:'0',motivo_parada:'',observacoes:''})
 const [mrpProduct,setMrpProduct]=useState('')
 const [mrpQty,setMrpQty]=useState('1')
 const [materials,setMaterials]=useState<Material[]>([])
 const [rawLots,setRawLots]=useState<RawLot[]>([])
 const [finishedLots,setFinishedLots]=useState<FinishedLotOption[]>([])
 const [consumption,setConsumption]=useState({ordem_producao_id:'',lote_acabado_id:'',lote_insumo_id:'',quantidade:'1'})

 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||typeof tenant.data!=='string'||!tenant.data)throw tenant.error??new Error('Empresa da sessão não identificada; PCP bloqueado.')
   const company=tenant.data
   setCompany(company)
   const [p,o,m,pr,a,r,e,lots,allocations,finished]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,unidade').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade_planejada,quantidade_produzida,status,data_prevista,maquina_id').eq('empresa_id',company).order('created_at',{ascending:false}).limit(2000),
    supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_processos_industriais').select('id,codigo,nome').eq('empresa_id',company).eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_apontamentos_processo').select('id,ordem_producao_id,maquina_id,processo_id,inicio_em,fim_em,quantidade_planejada,quantidade_boa,quantidade_refugada,motivo_parada,observacoes,criado_em').eq('empresa_id',company).order('criado_em',{ascending:false}).limit(1000),
    supabase.from('erp_receitas_processos').select('id,processo_id,produto_id,versao,status,maquina_id,ferramenta_id,ciclo_seg').eq('empresa_id',company).eq('status','APROVADA').order('versao',{ascending:false}).limit(3000),
    supabase.from('erp_funcionarios').select('id,matricula,nome,nome_completo').eq('empresa_id',company).is('data_demissao',null).order('nome').limit(2000),
    supabase.from('erp_estoque_lotes_rastreabilidade').select('id,produto_id,lote_fornecedor,quantidade_disponivel,status_qualidade').eq('empresa_id',company).eq('status_qualidade','APROVADO').gt('quantidade_disponivel',0).order('created_at',{ascending:false}).limit(2000),
    fetchAllPages<LotAllocation>((from,to)=>supabase.from('erp_estoque_lotes_alocacoes').select('lote_id,ordem_producao_id',{count:'exact'}).eq('empresa_id',company).range(from,to)),
    fetchAllPages<FinishedLotRow>((from,to)=>supabase.from('erp_estoque_lotes').select('id,lote_interno,quantidade_recebida,modo_lote,data_producao',{count:'exact'}).eq('empresa_id',company).eq('origem_lote','PRODUCAO').gt('quantidade_recebida',0).range(from,to))
   ])
   for(const result of [p,o,m,pr,a,r,e,lots])if(result.error)throw result.error
   setProducts((p.data??[]) as Product[]);setOrders((o.data??[]) as Order[]);setMachines((m.data??[]) as Machine[]);setProcesses((pr.data??[]) as Process[]);setEntries((a.data??[]) as Entry[]);setRecipes((r.data??[]) as Recipe[]);setEmployees((e.data??[]) as Employee[]);setRawLots((lots.data??[]) as RawLot[])
   const finishedMap=new Map((finished??[]).map(row=>[row.id,row]))
   setFinishedLots((allocations??[]).flatMap(link=>{const lot=finishedMap.get(link.lote_id);return lot?[{...lot,ordem_producao_id:link.ordem_producao_id}]:[]}))
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const productMap=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products])
 const machineMap=useMemo(()=>new Map(machines.map(m=>[m.id,m])),[machines])
 const processMap=useMemo(()=>new Map(processes.map(p=>[p.id,p])),[processes])
 const orderMap=useMemo(()=>new Map(orders.map(o=>[o.id,o])),[orders])
 const progressByOrder=useMemo(()=>{const result=new Map<string,{good:number;scrap:number}>();for(const row of entries){const current=result.get(row.ordem_producao_id)??{good:0,scrap:0};current.good+=Number(row.quantidade_boa??0);current.scrap+=Number(row.quantidade_refugada??0);result.set(row.ordem_producao_id,current)}return result},[entries])
 const visibleOrders=useMemo(()=>orders.filter(o=>{const p=productMap.get(o.produto_id??'');return [String(o.numero_op),o.status,p?.codigo,p?.nome].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))}),[orders,productMap,query])
 const totals=useMemo(()=>({open:orders.filter(o=>!['concluida','encerrada','cancelada','cancelado'].includes(o.status.toLowerCase())).length,good:entries.reduce((n,r)=>n+Number(r.quantidade_boa||0),0),scrap:entries.reduce((n,r)=>n+Number(r.quantidade_refugada||0),0)}),[orders,entries])

 async function saveEntry(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('')
  const good=Number(entry.quantidade_boa),scrap=Number(entry.quantidade_refugada),planned=Number(entry.quantidade_planejada)
  const start=new Date(entry.inicio_em),end=entry.fim_em?new Date(entry.fim_em):null
  if(!entry.ordem_producao_id||!entry.maquina_id||!entry.processo_id||!entry.receita_id||!entry.operador_id){setError('Selecione OP, máquina, processo, receita aprovada e operador.');return}
  if(!Number.isFinite(planned)||planned<=0||!Number.isFinite(good)||!Number.isFinite(scrap)||good<0||scrap<0){setError('Confira a quantidade planejada, peças boas e refugo.');return}
  if(end&&good+scrap<=0){setError('Para finalizar o apontamento, informe peças boas ou refugadas.');return}
  if(!end&&good+scrap>0){setError('Informe o horário final para registrar quantidades produzidas.');return}
  if(!Number.isFinite(start.getTime())||(end&&(!Number.isFinite(end.getTime())||end<=start))){setError('Confira os horários de início e fim.');return}
  setBusy(true)
  try{
   const result=await supabase.rpc('erp_apontamento_registrar_manual',{
    p_ordem_producao_id:entry.ordem_producao_id,p_processo_id:entry.processo_id,p_receita_id:entry.receita_id,
    p_maquina_id:entry.maquina_id,p_ferramenta_id:recipes.find(r=>r.id===entry.receita_id)?.ferramenta_id??null,
    p_operador_id:entry.operador_id,p_inicio_em:start.toISOString(),p_fim_em:end?.toISOString()??null,
    p_quantidade_planejada:planned,p_quantidade_boa:good,p_quantidade_refugada:scrap,
    p_motivo_parada:entry.motivo_parada.trim()||null,p_observacoes:entry.observacoes.trim()||null,p_programacao_id:null
   })
   if(result.error)throw result.error
   const data=(result.data??{}) as {lote_interno?:string|null;modo_lote?:string|null}
   setNotice(end
    ? 'Apontamento finalizado no servidor; OP atualizada.'+(data.lote_interno?' Lote '+data.lote_interno+' criado, aguardando liberação da Qualidade.':'')
    : 'Apontamento iniciado no servidor e vinculado à OP, máquina, receita aprovada e operador.')
   setEntry(v=>({...v,fim_em:'',quantidade_boa:'0',quantidade_refugada:'0',motivo_parada:'',observacoes:''}))
   await load()
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }

 async function registerConsumption(){
  setError('');setNotice('')
  const qty=Number(consumption.quantidade)
  if(!consumption.ordem_producao_id||!consumption.lote_acabado_id||!consumption.lote_insumo_id||!Number.isFinite(qty)||qty<=0){setError('Selecione a OP, o lote acabado, o lote aprovado de insumo e uma quantidade válida.');return}
  setBusy(true)
  try{
   const result=await supabase.rpc('erp_registrar_consumo_lote_producao',{p_ordem_producao_id:consumption.ordem_producao_id,p_lote_acabado_id:consumption.lote_acabado_id,p_lote_insumo_id:consumption.lote_insumo_id,p_quantidade:qty})
   if(result.error)throw result.error
   setNotice('Consumo registrado: saldo do lote fornecedor baixado e genealogia vinculada ao lote acabado da OP.')
   setConsumption(v=>({...v,lote_acabado_id:'',lote_insumo_id:'',quantidade:'1'}))
   await load()
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }

 async function runMrp(){
  setError('');setNotice('');setMaterials([])
  const qty=Number(mrpQty)
  if(!company||!mrpProduct||!Number.isFinite(qty)||qty<=0){setError('Selecione produto e quantidade maior que zero.');return}
  setBusy(true)
  try{
   const run=await supabase.rpc('erp_mrp_explodir',{p_produto_id:mrpProduct,p_quantidade:qty,p_demanda_ref:'PCP_EXECUCAO'})
   if(run.error)throw run.error
   const runId=String(run.data??'')
   if(!runId)throw new Error('O servidor não retornou o identificador do cálculo MRP.')
   const needs=await fetchAllPages<{componente_id:string;nivel:number;quantidade_bruta:number;quantidade_disponivel:number;quantidade_em_compra:number;necessidade_liquida:number;perda_estimada:number;sugestao:string}>((from,to)=>supabase.from('erp_mrp_necessidades').select('componente_id,nivel,quantidade_bruta,quantidade_disponivel,quantidade_em_compra,necessidade_liquida,perda_estimada,sugestao',{count:'exact'}).eq('empresa_id',company).eq('run_id',runId).order('nivel').range(from,to))
   const ids=[...new Set(needs.map(n=>n.componente_id))]
   const productRows=ids.length?await fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,unidade',{count:'exact'}).eq('empresa_id',company).in('id',ids).order('codigo').range(from,to)):[]
   const byId=new Map(productRows.map(p=>[p.id,p]))
   setMaterials(needs.map(n=>{const p=byId.get(n.componente_id);return {produto_id:n.componente_id,codigo:p?.codigo??'—',descricao:p?.nome??'Componente sem cadastro',nivel:n.nivel,necessidade_bruta:n.quantidade_bruta,saldo_disponivel:n.quantidade_disponivel,quantidade_em_compra:n.quantidade_em_compra,necessidade_liquida:n.necessidade_liquida,perda_estimada:n.perda_estimada,sugestao:n.sugestao}}))
   setNotice('MRP executado sobre a ficha técnica/BOM, estoque reservado e compras ainda não recebidas.')
  }catch(e){setError(messageOf(e))}finally{setBusy(false)}
 }

 /**
  * Relatório A4 da execução industrial. Usa somente a carteira de OPs, os apontamentos,
  * o MRP calculado e os cadastros que a própria tela já carregou do banco.
  */
 async function emitirRelatorioExecucao(){
  setError('')
  try{
   if(!company)throw new Error('Empresa da sessão não identificada. Use Atualizar antes de imprimir.')
   const rotuloTab:Record<'ordens'|'apontamentos'|'mrp',string>={ordens:'Ordens de produção',apontamentos:'Apontamentos de produção',mrp:'MRP / materiais'}
   const abertas=orders.filter(o=>!['concluida','encerrada','cancelada','cancelado'].includes(o.status.toLowerCase()))
   const boaTotal=entries.reduce((n,r)=>n+numeroSeguro(r.quantidade_boa),0)
   const refugoTotal=entries.reduce((n,r)=>n+numeroSeguro(r.quantidade_refugada),0)
   const planejadoApontamentos=entries.reduce((n,r)=>n+numeroSeguro(r.quantidade_planejada),0)
   const produzidoNasOPs=orders.reduce((n,o)=>n+numeroSeguro(o.quantidade_produzida),0)
   const planejadoNasOPs=orders.reduce((n,o)=>n+numeroSeguro(o.quantidade_planejada??o.quantidade),0)
   const totalApontado=boaTotal+refugoTotal
   const refugoPct=totalApontado>0?`${(refugoTotal/totalApontado*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—'
   const blocos:Bloco[]=[
    {tipo:'campos',titulo:'Identificação do relatório',colunas:2,itens:[
      {rotulo:'Escopo impresso',valor:`Carteira de execução · aba ativa: ${rotuloTab[tab]}`},
      {rotulo:'Filtro aplicado na tela',valor:query.trim()?`Pesquisa: ${query.trim()}`:'Sem filtro — carteira completa'},
      {rotulo:'Ordens de produção carregadas',valor:orders.length},
      {rotulo:'OPs abertas',valor:abertas.length},
      {rotulo:'Apontamentos carregados',valor:entries.length},
      {rotulo:'OPs com apontamento',valor:progressByOrder.size},
      {rotulo:'Máquinas ativas',valor:machines.length},
      {rotulo:'Processos industriais',valor:processes.length},
      {rotulo:'Produtos cadastrados',valor:products.length},
      {rotulo:'MRP calculado na tela',valor:materials.length>0?`${materials.length} componente(s)`:'Nenhum cálculo executado'}
    ]},
    {tipo:'campos',titulo:'Quantidades e perdas da carteira',colunas:3,itens:[
      {rotulo:'Planejado nas OPs',valor:quantidadeRelatorio(planejadoNasOPs)},
      {rotulo:'Produzido informado nas OPs',valor:quantidadeRelatorio(produzidoNasOPs)},
      {rotulo:'Planejado nos apontamentos',valor:quantidadeRelatorio(planejadoApontamentos)},
      {rotulo:'Peças boas apontadas',valor:quantidadeRelatorio(boaTotal)},
      {rotulo:'Peças refugadas apontadas',valor:quantidadeRelatorio(refugoTotal)},
      {rotulo:'Total apontado',valor:quantidadeRelatorio(totalApontado)},
      {rotulo:'Índice de refugo',valor:refugoPct},
      {rotulo:'Pendência de produção',valor:quantidadeRelatorio(Math.max(0,planejadoNasOPs-produzidoNasOPs))},
      {rotulo:'Apontamentos sem fim registrado',valor:entries.filter(r=>!r.fim_em).length}
    ]},
    {tipo:'tabela',titulo:'Ordens de produção da carteira',colunas:[
      {titulo:'OP',larguraMm:16},
      {titulo:'Produto',larguraMm:46},
      {titulo:'Planejada',larguraMm:20,alinhar:'direita'},
      {titulo:'Produzida',larguraMm:20,alinhar:'direita'},
      {titulo:'Avanço',larguraMm:16,alinhar:'direita'},
      {titulo:'Entrega',larguraMm:18},
      {titulo:'Status'}
    ],linhas:visibleOrders.map(o=>{
      const planned=numeroSeguro(o.quantidade_planejada??o.quantidade)
      const done=numeroSeguro(o.quantidade_produzida??progressByOrder.get(o.id)?.good)
      const produto=productMap.get(o.produto_id??'')
      return [`OP-${o.numero_op}`,produto?`${produto.codigo} — ${produto.nome}`:'Produto não localizado',quantidadeRelatorio(planned),quantidadeRelatorio(done),planned>0?`${Math.min(100,done/planned*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—',dataRelatorio(o.data_prevista),o.status]
    }),nota:`Quantidades planejadas e produzidas lidas de erp_ordens_producao; "produzida" usa o apontamento acumulado quando o campo da OP está vazio.`},
    {tipo:'tabela',titulo:'Apontamentos de produção registrados',colunas:[
      {titulo:'OP',larguraMm:16},
      {titulo:'Processo',larguraMm:18},
      {titulo:'Máquina',larguraMm:16},
      {titulo:'Início',larguraMm:24},
      {titulo:'Fim',larguraMm:24},
      {titulo:'Boa',larguraMm:16,alinhar:'direita'},
      {titulo:'Refugo',larguraMm:16,alinhar:'direita'},
      {titulo:'Motivo / observação'}
    ],linhas:entries.map(r=>[
      `OP-${orderMap.get(r.ordem_producao_id)?.numero_op??'—'}`,
      processMap.get(r.processo_id??'')?.codigo??'—',
      machineMap.get(r.maquina_id??'')?.codigo??'—',
      dataHoraRelatorio(r.inicio_em),
      dataHoraRelatorio(r.fim_em),
      quantidadeRelatorio(r.quantidade_boa),
      quantidadeRelatorio(r.quantidade_refugada),
      [r.motivo_parada,r.observacoes].filter(Boolean).join(' · ')||'—'
    ]),nota:entries.length>=1000?'A consulta da tela retorna os 1000 apontamentos mais recentes; o banco pode ter mais registros fora desta janela.':undefined}
   ]
   if(materials.length>0){
    blocos.push({tipo:'tabela',titulo:'Necessidades de materiais calculadas pelo MRP',colunas:[
      {titulo:'Nível',larguraMm:12,alinhar:'centro'},
      {titulo:'Componente',larguraMm:42},
      {titulo:'Necessidade bruta',larguraMm:20,alinhar:'direita'},
      {titulo:'Saldo disponível',larguraMm:20,alinhar:'direita'},
      {titulo:'Necessidade líquida',larguraMm:20,alinhar:'direita'},
      {titulo:'Perda estimada',larguraMm:18,alinhar:'direita'},
      {titulo:'Produto pai',larguraMm:18}
    ],linhas:materials.map(m=>[m.nivel,`${m.codigo} — ${m.descricao}`,quantidadeRelatorio(m.necessidade_bruta),quantidadeRelatorio(m.saldo_disponivel),quantidadeRelatorio(m.necessidade_liquida),quantidadeRelatorio(m.perda_estimada),productMap.get(mrpProduct)?.codigo??null]),nota:'Explosão calculada pela RPC erp_pcp_mrp_explodir para o produto e quantidade informados na tela.'})
   }
   blocos.push({tipo:'assinaturas',titulo:'Aprovações',assinantes:[
     {papel:'Planejamento e controle da produção'},
     {papel:'Liderança de produção'},
     {papel:'Controle da qualidade'}
   ]})
   await abrirRelatorio({
    modulo:'PCP',
    tipo:'Apontamento de Produção',
    titulo:`Execução industrial da produção · ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}`,
    codigo:`EXEC-${localDateTime().slice(0,10)}`,
    subtitulo:`${orders.length} OP(s) · ${entries.length} apontamento(s) · ${abertas.length} em aberto`,
    blocos
   })
  }catch(e){setError(e instanceof Error?e.message:'Falha ao emitir o relatório de execução da produção.')}
 }
 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 md:p-4 print:bg-white print:p-0"><div className="mx-auto max-w-[1600px]">
  <header className="mb-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 print:mb-2"><div className="flex h-9 w-9 items-center justify-center bg-[#123B50] text-white"><Factory size={18}/></div><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-sky-700">SGQ ERP INDUSTRIAL / PCP</p><h1 className="text-base font-semibold">Execução e controle da produção</h1><p className="text-[10px] text-slate-500">Carteira de OPs reais · apontamento por processo · MRP multinível</p></div><div className="ml-auto flex flex-wrap gap-1.5 print:hidden"><button className={primary} type="button" onClick={()=>{window.location.href='/pcp?tab=novaop'}}><Factory size={12}/> Nova OP</button><button className={btn} onClick={()=>void load()} disabled={busy}><RefreshCw size={12}/> Atualizar</button><button className={btn} onClick={()=>{void emitirRelatorioExecucao()}}><Printer size={12}/> Imprimir</button></div></header>
  <section className="mb-3 grid grid-cols-3 gap-2">{[['OPs abertas',totals.open],['Peças boas',totals.good],['Peças refugadas',totals.scrap]].map(([name,value])=><div key={String(name)} className="border border-slate-200 bg-white p-2"><p className={label}>{name}</p><strong className="text-base tabular-nums">{Number(value).toLocaleString('pt-BR')}</strong></div>)}</section>
  {error&&<div role="alert" className="mb-2 flex gap-2 border border-rose-300 bg-rose-50 p-2 text-[10px] text-rose-800"><AlertTriangle size={13}/>{error}</div>}{notice&&<div role="status" className="mb-2 border border-emerald-300 bg-emerald-50 p-2 text-[10px] text-emerald-800">{notice}</div>}
  <nav className="mb-3 flex gap-1 border-b border-slate-200 print:hidden">{([{id:'ordens',label:'Ordens de produção',icon:ClipboardList},{id:'apontamentos',label:'Apontamentos',icon:Activity},{id:'mrp',label:'MRP / materiais',icon:Boxes}] as const).map(t=><button key={t.id} className={tab===t.id?'h-8 border-b-2 border-sky-700 bg-white px-3 text-[10px] font-bold text-sky-800':'h-8 px-3 text-[10px] text-slate-600'} onClick={()=>setTab(t.id)}><t.icon className="mr-1 inline" size={12}/>{t.label}</button>)}</nav>
  {tab==='ordens'&&<section className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 p-2"><h2 className="mr-auto text-[10px] font-bold uppercase">Ordens cadastradas</h2><input className={field+' max-w-[300px]'} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar OP, produto ou status"/></div><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['OP','Produto','Quantidade planejada','Produzida','Avanço','Entrega','Status'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{visibleOrders.map(o=><tr key={o.id}><td className={td+' font-semibold'}>OP-{o.numero_op}</td><td className={td}>{productMap.get(o.produto_id??'')?.codigo??'—'} · {productMap.get(o.produto_id??'')?.nome??'Produto não localizado'}</td><td className={td+' text-right'}>{Number(o.quantidade_planejada??o.quantidade??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(o.quantidade_produzida??progressByOrder.get(o.id)?.good??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{(()=>{const planned=Number(o.quantidade_planejada??o.quantidade??0);const done=Number(o.quantidade_produzida??progressByOrder.get(o.id)?.good??0);return planned>0?`${Math.min(100,done/planned*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—'})()}</td><td className={td}>{o.data_prevista?new Date(o.data_prevista).toLocaleDateString('pt-BR'):'—'}</td><td className={td}>{o.status}</td></tr>)}{visibleOrders.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={7}>{busy?'Carregando…':'Nenhuma OP para os filtros informados.'}</td></tr>}</tbody></table></div></section>}
  {tab==='apontamentos'&&<div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]"><form onSubmit={saveEntry} className="h-fit border border-slate-200 bg-white p-3"><h2 className="mb-3 text-[10px] font-bold uppercase">Novo apontamento de produção</h2>
   <label className={label}>Ordem de produção<select className={field} value={entry.ordem_producao_id} onChange={e=>{const order=orderMap.get(e.target.value);setEntry(v=>({...v,ordem_producao_id:e.target.value,maquina_id:order?.maquina_id??v.maquina_id,receita_id:''}))}} required><option value="">Selecione OP</option>{orders.filter(o=>!['concluida','encerrada','cancelada','cancelado'].includes(o.status.toLowerCase())).map(o=><option key={o.id} value={o.id}>OP-{o.numero_op} · {o.status}</option>)}</select></label>
   <label className={label}>Operador<select className={field} value={entry.operador_id} onChange={e=>setEntry(v=>({...v,operador_id:e.target.value}))} required><option value="">Selecione funcionário</option>{employees.map(person=><option key={person.id} value={person.id}>{person.matricula??'—'} · {person.nome_completo??person.nome??'Funcionário'}</option>)}</select></label>
   <label className={label}>Máquina<select className={field} value={entry.maquina_id} onChange={e=>setEntry(v=>({...v,maquina_id:e.target.value,receita_id:''}))} required><option value="">Selecione máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} · {m.nome}</option>)}</select></label>
   <label className={label}>Processo industrial<select className={field} value={entry.processo_id} onChange={e=>setEntry(v=>({...v,processo_id:e.target.value,receita_id:''}))} required><option value="">Selecione processo</option>{processes.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label>
   <label className={label}>Receita / ficha aprovada<select className={field} value={entry.receita_id} onChange={e=>setEntry(v=>({...v,receita_id:e.target.value}))} required><option value="">Selecione receita aprovada</option>{recipes.filter(r=>r.produto_id===orderMap.get(entry.ordem_producao_id)?.produto_id&&r.processo_id===entry.processo_id&&(!r.maquina_id||r.maquina_id===entry.maquina_id)).map(r=><option key={r.id} value={r.id}>Versão {r.versao} · ciclo {r.ciclo_seg??'—'} s</option>)}</select></label>
   <div className="grid grid-cols-2 gap-2"><label className={label}>Início<input className={field} type="datetime-local" value={entry.inicio_em} onChange={e=>setEntry(v=>({...v,inicio_em:e.target.value}))} required/></label><label className={label}>Fim<input className={field} type="datetime-local" value={entry.fim_em} onChange={e=>setEntry(v=>({...v,fim_em:e.target.value}))}/></label></div>
   <div className="grid grid-cols-3 gap-2"><label className={label}>Lote planejado<input className={field} type="number" min="0.000001" step="0.000001" value={entry.quantidade_planejada} onChange={e=>setEntry(v=>({...v,quantidade_planejada:e.target.value}))} required/></label><label className={label}>Peças boas<input className={field} type="number" min="0" step="0.000001" value={entry.quantidade_boa} onChange={e=>setEntry(v=>({...v,quantidade_boa:e.target.value}))} required/></label><label className={label}>Refugo<input className={field} type="number" min="0" step="0.000001" value={entry.quantidade_refugada} onChange={e=>setEntry(v=>({...v,quantidade_refugada:e.target.value}))} required/></label></div>
   <label className={label}>Motivo de parada / refugo<input className={field} value={entry.motivo_parada} onChange={e=>setEntry(v=>({...v,motivo_parada:e.target.value}))} maxLength={500}/></label><label className={label}>Observações<textarea className={field+' min-h-[64px] py-1'} value={entry.observacoes} onChange={e=>setEntry(v=>({...v,observacoes:e.target.value}))} maxLength={3000}/></label>
   <button className={primary+' mt-2 w-full'} type="submit" disabled={busy}><Save size={12}/> Gravar apontamento</button>
  </form><section className="min-w-0 border border-slate-200 bg-white"><h2 className="border-b border-slate-200 p-2 text-[10px] font-bold uppercase">Histórico de apontamentos</h2><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['OP','Processo','Máquina','Início','Fim','Boas','Refugo','Motivo'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{entries.map(r=><tr key={r.id}><td className={td}>OP-{orderMap.get(r.ordem_producao_id)?.numero_op??'—'}</td><td className={td}>{processMap.get(r.processo_id??'')?.codigo??'—'}</td><td className={td}>{machineMap.get(r.maquina_id??'')?.codigo??'—'}</td><td className={td}>{r.inicio_em?new Date(r.inicio_em).toLocaleString('pt-BR'):'—'}</td><td className={td}>{r.fim_em?new Date(r.fim_em).toLocaleString('pt-BR'):'—'}</td><td className={td+' text-right'}>{Number(r.quantidade_boa??0).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(r.quantidade_refugada??0).toLocaleString('pt-BR')}</td><td className={td}>{r.motivo_parada??'—'}</td></tr>)}{entries.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={8}>Sem apontamentos registrados.</td></tr>}</tbody></table></div></section></div>}
  {tab==='mrp'&&<section className="border border-slate-200 bg-white p-3"><h2 className="mb-3 text-[10px] font-bold uppercase">Explosão de necessidades</h2><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]"><label className={label}>Produto acabado<select className={field} value={mrpProduct} onChange={e=>setMrpProduct(e.target.value)} required><option value="">Selecione produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}</select></label><label className={label}>Quantidade<input className={field} type="number" min="0.000001" step="0.000001" value={mrpQty} onChange={e=>setMrpQty(e.target.value)}/></label><button className={primary+' self-end'} onClick={()=>void runMrp()} disabled={busy}><Boxes size={12}/> Calcular MRP</button></div><div className="mt-3 overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{['Nível','Componente','Necessidade bruta','Saldo livre','Em compra','Necessidade líquida','Perda estimada','Ação'].map(x=><th key={x} className={th}>{x}</th>)}</tr></thead><tbody>{materials.map((m,i)=><tr key={m.produto_id+i}><td className={td}>{m.nivel}</td><td className={td}>{m.codigo} · {m.descricao}</td><td className={td+' text-right'}>{Number(m.necessidade_bruta).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.saldo_disponivel).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.quantidade_em_compra).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.necessidade_liquida).toLocaleString('pt-BR')}</td><td className={td+' text-right'}>{Number(m.perda_estimada).toLocaleString('pt-BR')}</td><td className={td}>{m.sugestao}</td></tr>)}{materials.length===0&&<tr><td className={td+' py-5 text-center'} colSpan={8}>Selecione o produto e execute o MRP para consultar necessidades reais.</td></tr>}</tbody></table></div>
   <section className="mt-4 border border-slate-200 bg-slate-50 p-3">
    <h3 className="mb-1 text-[10px] font-bold uppercase">Rastreabilidade de consumo por lote</h3>
    <p className="mb-3 text-[10px] text-slate-500">Registre o lote de matéria-prima efetivamente consumido após gerar o lote acabado. O sistema valida a BOM, baixa o saldo e grava a genealogia.</p>
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px_auto]">
     <label className={label}>Ordem de produção<select className={field} value={consumption.ordem_producao_id} onChange={e=>setConsumption(v=>({...v,ordem_producao_id:e.target.value,lote_acabado_id:'',lote_insumo_id:''}))}><option value="">Selecione OP com produção</option>{orders.filter(o=>Number(o.quantidade_produzida??0)>0).map(o=><option key={o.id} value={o.id}>OP-{o.numero_op} · {productMap.get(o.produto_id??'')?.codigo??'Produto'}</option>)}</select></label>
     <label className={label}>Lote acabado da OP<select className={field} value={consumption.lote_acabado_id} onChange={e=>setConsumption(v=>({...v,lote_acabado_id:e.target.value}))}><option value="">Selecione lote acabado</option>{finishedLots.filter(lot=>lot.ordem_producao_id===consumption.ordem_producao_id).map(lot=><option key={lot.id} value={lot.id}>{lot.lote_interno} · {lot.modo_lote??'PRODUCAO'} · {Number(lot.quantidade_recebida).toLocaleString('pt-BR')}</option>)}</select></label>
<label className={label}>Lote de matéria-prima<select className={field} value={consumption.lote_insumo_id} onChange={e=>setConsumption(v=>({...v,lote_insumo_id:e.target.value}))}><option value="">Selecione lote aprovado</option>{rawLots.map(lot=><option key={lot.id} value={lot.id}>{productMap.get(lot.produto_id)?.codigo??'MP'} · {lot.lote_fornecedor} · saldo {Number(lot.quantidade_disponivel).toLocaleString('pt-BR')}</option>)}</select></label>
     <label className={label}>Quantidade consumida<input className={field} type="number" min="0.000001" step="0.000001" value={consumption.quantidade} onChange={e=>setConsumption(v=>({...v,quantidade:e.target.value}))}/></label>
     <button className={primary+' self-end'} type="button" disabled={busy||!rawLots.length||!finishedLots.some(lot=>lot.ordem_producao_id===consumption.ordem_producao_id)} onClick={()=>void registerConsumption()}><Save size={12}/> Registrar consumo</button>
    </div>
   </section></section>}
 </div></main>
}
