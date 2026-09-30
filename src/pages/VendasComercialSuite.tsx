import { useEffect, useState, type ReactNode } from 'react'
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, FileCheck2, PackageCheck, Plus, RefreshCw, Settings, ShoppingCart, Truck, Users, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type View = 'dashboard'|'crm'|'clientes'|'precos'|'orcamentos'|'pedidos'|'faturamento'|'expedicao'|'comissoes'|'rma'
type Client = { id:string; codigo:string; nome:string; documento:string|null; email:string|null; limite_credito:number|null; ativo:boolean }
type Product = { id:string; codigo:string; nome:string; preco_venda:number|null; custo_ultimo:number|null; ativo:boolean }
type Opportunity = { id:string; titulo:string; cliente_id:string|null; valor_estimado:number; probabilidade:number; etapa:string; proxima_acao:string|null; motivo_perda:string|null }
type Quote = { id:string; numero:number; cliente_id:string; status:string; validade:string|null; total:number; margem_percentual:number|null; created_at:string }
type Order = { id:string; numero:number; cliente_id:string|null; status:string; total:number; data_entrada:string; data_entrega_prometida:string|null; pedido_cliente:string|null; credito_status:string|null; credito_motivo:string|null }
type Nfe = { id:string; numero:number|null; serie:number; status:string; destinatario_nome:string; valor_total:number; data_emissao:string; chave_acesso:string|null; mensagem_sefaz:string|null }
type PriceTable = { id:string; codigo:string; nome:string; ativo:boolean }
type Romaneio = { id:string; numero:number; status:string; transportadora:string|null; peso_total_kg:number; data_expedicao:string|null }
type CommissionRule = { id:string; nome:string; percentual:number; tipo:string; margem_minima:number|null; por_recebimento:boolean; ativo:boolean }
type CommissionLaunch = { id:string; funcionario_id:string; data_referencia:string; receita_base:number; percentual:number; valor_comissao:number; status:string }
type SalesMeta = { competencia:string; meta_faturamento:number; meta_pedidos:number }
type OrderItem = { id:string; pedido_id:string; produto_id:string; descricao:string|null; quantidade:number; total:number|null }
type ProductionOrder = { id:string; status:string; quantidade:number|null; quantidade_planejada:number|null }

const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0)
const dateBR=(v:string|null)=>v?new Date(v).toLocaleDateString('pt-BR'):'—'
const views: Array<{id:View;label:string;icon:typeof ShoppingCart}> = [
 {id:'dashboard',label:'Painel Comercial',icon:BarChart3},{id:'crm',label:'CRM & Pipeline',icon:Users},{id:'clientes',label:'Clientes',icon:Users},
 {id:'precos',label:'Preços & Políticas',icon:Settings},{id:'orcamentos',label:'Propostas & Orçamentos',icon:FileCheck2},
 {id:'pedidos',label:'Pedidos de Venda',icon:ShoppingCart},{id:'faturamento',label:'Faturamento / NF-e',icon:FileCheck2},
 {id:'expedicao',label:'Expedição & Romaneio',icon:Truck},{id:'comissoes',label:'Comissões',icon:BarChart3},{id:'rma',label:'Devoluções / RMA',icon:XCircle}
]

export default function VendasComercialSuite(){
 const path=window.location.pathname
 const query=new URLSearchParams(window.location.search).get('view') as View|null
 const initial=(query&&views.some(v=>v.id===query)?query:null) ?? (path.includes('/vendas/crm')?'crm':path.includes('/vendas/clientes')?'clientes':path.includes('/vendas/precos')?'precos':path.includes('/vendas/orcamentos')?'orcamentos':path.includes('/vendas/pedidos')?'pedidos':path.includes('/vendas/faturamento')?'faturamento':path.includes('/vendas/expedicao')?'expedicao':path.includes('/vendas/comissoes')?'comissoes':path.includes('/vendas/rma')?'rma':'dashboard')
 const [view,setView]=useState<View>(initial)
 const [empresa,setEmpresa]=useState('')
 const [clients,setClients]=useState<Client[]>([])
 const [products,setProducts]=useState<Product[]>([])
 const [opps,setOpps]=useState<Opportunity[]>([])
 const [quotes,setQuotes]=useState<Quote[]>([])
 const [orders,setOrders]=useState<Order[]>([])
 const [nfes,setNfes]=useState<Nfe[]>([])
 const [prices,setPrices]=useState<PriceTable[]>([])
 const [priceItems,setPriceItems]=useState<Array<{id:string;tabela_preco_id:string;produto_id:string;preco:number}>>([])
 const [romaneios,setRomaneios]=useState<Romaneio[]>([])
 const [rules,setRules]=useState<CommissionRule[]>([])
 const [launches,setLaunches]=useState<CommissionLaunch[]>([])
 const [devolucoes,setDevolucoes]=useState<Array<{id:string;numero:number;cliente_id:string;tipo:string;motivo:string;status:string;tratamento_sgq:string;valor_credito:number}>>([])
 const [meta,setMeta]=useState<SalesMeta|null>(null)
 const [orderItems,setOrderItems]=useState<OrderItem[]>([])
 const [productionOrders,setProductionOrders]=useState<ProductionOrder[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const e=await supabase.rpc('erp_current_empresa_id')
   if(e.error||!e.data) throw e.error??new Error('Empresa não identificada.')
   const id=String(e.data);setEmpresa(id)
   const results=await Promise.all([
    supabase.from('erp_clientes').select('id,codigo,nome,documento,email,limite_credito,ativo').eq('empresa_id',id).eq('ativo',true).order('nome').limit(1000),
    supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,custo_ultimo,ativo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_vendas_oportunidades').select('id,titulo,cliente_id,valor_estimado,probabilidade,etapa,proxima_acao,motivo_perda').eq('empresa_id',id).order('updated_at',{ascending:false}).limit(500),
    supabase.from('erp_vendas_orcamentos').select('id,numero,cliente_id,status,validade,total,margem_percentual,created_at').eq('empresa_id',id).order('created_at',{ascending:false}).limit(300),
    supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrada,data_entrega_prometida,pedido_cliente,credito_status,credito_motivo').eq('empresa_id',id).order('created_at',{ascending:false}).limit(500),
    supabase.from('erp_documentos_fiscais').select('id,numero,serie,status,destinatario_nome,valor_total,data_emissao,chave_acesso,mensagem_sefaz').eq('empresa_id',id).eq('tipo','saida').order('data_emissao',{ascending:false}).limit(300),
    supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo').eq('empresa_id',id).order('codigo'),
    supabase.from('erp_tabelas_preco_itens').select('id,tabela_preco_id,produto_id,preco').eq('empresa_id',id).limit(10000),
    supabase.from('erp_expedicoes').select('id,numero,status,transportadora,peso_total_kg,data_expedicao').eq('empresa_id',id).order('created_at',{ascending:false}).limit(200),
    supabase.from('erp_vendas_regras_comissao').select('id,nome,percentual,tipo,margem_minima,por_recebimento,ativo').eq('empresa_id',id).order('nome'),
    supabase.from('erp_vendas_comissoes_lancamentos').select('id,funcionario_id,data_referencia,receita_base,percentual,valor_comissao,status').eq('empresa_id',id).order('data_referencia',{ascending:false}).limit(300),
    supabase.from('erp_vendas_metas').select('competencia,meta_faturamento,meta_pedidos').eq('empresa_id',id).order('competencia',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,descricao,quantidade,total').eq('empresa_id',id).limit(10000),
    supabase.from('erp_ordens_producao').select('id,status,quantidade,quantidade_planejada').eq('empresa_id',id).order('id',{ascending:false}).limit(1000),
    supabase.from('erp_vendas_devolucoes').select('id,numero,cliente_id,tipo,motivo,status,tratamento_sgq,valor_credito').eq('empresa_id',id).order('created_at',{ascending:false}).limit(300)
   ])
   for(const r of results) if(r.error) throw r.error
   setClients((results[0].data??[]) as Client[]);setProducts((results[1].data??[]) as Product[]);setOpps((results[2].data??[]) as Opportunity[])
   setQuotes((results[3].data??[]) as Quote[]);setOrders((results[4].data??[]) as Order[]);setNfes((results[5].data??[]) as Nfe[])
   setPrices((results[6].data??[]) as PriceTable[]);setPriceItems((results[7].data??[]) as typeof priceItems);setRomaneios((results[8].data??[]) as Romaneio[])
   setRules((results[9].data??[]) as CommissionRule[]);setLaunches((results[10].data??[]) as CommissionLaunch[])
   setMeta((results[11].data??null) as SalesMeta|null);setOrderItems((results[12].data??[]) as OrderItem[]);setProductionOrders((results[13].data??[]) as ProductionOrder[]);setDevolucoes((results[14].data??[]) as typeof devolucoes)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar o módulo Vendas & Comercial.')}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const navigate=(next:View)=>{
  setView(next);window.history.replaceState({},'',`/vendas/${next==='dashboard'?'':next}${next==='dashboard'?'':'?view='+next}`)
 }

 const convertOpportunity=async(o:Opportunity)=>{if(!o.cliente_id){setError('A oportunidade precisa de cliente para ser convertida em orçamento.');return}const r=await supabase.from('erp_vendas_orcamentos').insert({empresa_id:empresa,cliente_id:o.cliente_id,status:'RASCUNHO',total:0,subtotal:0,oportunidade_id:o.id});if(r.error){setError(r.error.message);return}const u=await supabase.from('erp_vendas_oportunidades').update({etapa:'PROPOSTA'}).eq('id',o.id).eq('empresa_id',empresa);if(u.error){setError(u.error.message);return}setMessage('Oportunidade convertida em orçamento RASCUNHO.');void load()}
 const doOpportunity=async(title:string,clientId:string,value:string)=>{
  if(!title.trim()) return
  const r=await supabase.from('erp_vendas_oportunidades').insert({empresa_id:empresa,titulo:title.trim(),cliente_id:clientId||null,valor_estimado:Number(value)||0})
  if(r.error)setError(r.error.message);else{setMessage('Oportunidade criada.');void load()}
 }
 const moveOpportunity=async(id:string,etapa:string)=>{
  const payload:Record<string,string|null>={etapa}
  if(etapa==='PERDIDO'){const reason=window.prompt('Motivo obrigatório da perda:');if(!reason?.trim())return;payload.motivo_perda=reason.trim()}
  const r=await supabase.from('erp_vendas_oportunidades').update(payload).eq('id',id).eq('empresa_id',empresa)
  if(r.error)setError(r.error.message);else void load()
 }
 const createQuote=async(clientId:string,validade:string)=>{
  if(!clientId)return
  const r=await supabase.from('erp_vendas_orcamentos').insert({empresa_id:empresa,cliente_id:clientId,validade:validade||null,status:'RASCUNHO'})
  if(r.error)setError(r.error.message);else{setMessage('Orçamento criado em RASCUNHO.');void load()}
 }
 const convertQuote=async(q:Quote)=>{
  if(q.status==='CONVERTIDO')return
  const r=await supabase.rpc('erp_converter_orcamento_em_pedido',{p_orcamento_id:q.id})
  if(r.error){setError(r.error.message);return}
  setMessage('Orçamento convertido para pedido com os itens e análise de estoque/produção.');void load()
 }
 const createRma=async(clientId:string,reason:string)=>{
  if(!clientId||!reason.trim())return
  const r=await supabase.from('erp_vendas_devolucoes').insert({empresa_id:empresa,cliente_id:clientId,motivo:reason.trim(),tipo:'GARANTIA_RMA',tratamento_sgq:'QUARENTENA'})
  if(r.error)setError(r.error.message);else{setMessage('RMA aberto com tratamento padrão de quarentena.');void load()}
 }

 return <div className="erp-dense erp-vendas-suite">
  
  <div className="vcs-shell">
   <aside className="vcs-side">
    <div className="vcs-brand"><span>ERP INDUSTRIAL • VENDAS</span><strong>Vendas & Comercial</strong></div>
    {views.map(({id,label,icon:Icon})=><button key={id} className={`vcs-nav ${view===id?'active':''}`} onClick={()=>navigate(id)}><Icon size={17}/>{label}</button>)}
   </aside>
   <main className="vcs-main">
    <header className="vcs-head"><div><div className="vcs-mobile"><button className="vcs-btn" onClick={()=>navigate('dashboard')}><BarChart3 size={16}/></button></div><h1>{views.find(v=>v.id===view)?.label}</h1><small>Escala ERP Industrial • dados da empresa atual • sem dados demonstrativos</small></div><div className="vcs-actions"><button className="vcs-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Atualizar</button></div></header>
    <section className="vcs-content">
     {error&&<div className="vcs-section" style={{borderColor:'#e2b9b9',color:'#9b2525'}}>{error}</div>}
     {message&&<div className="vcs-section" style={{borderColor:'#b9dfcd',color:'#287a5c'}}>{message}</div>}
     {loading?<div className="vcs-section"><div className="vcs-empty">Consultando dados reais do módulo comercial…</div></div>:<>
      {view==='dashboard'&&<Dashboard orders={orders} nfes={nfes} clients={clients} meta={meta} orderItems={orderItems} products={products} productionOrders={productionOrders} quotes={quotes} opps={opps}/>} 
      {view==='crm'&&<CRM opps={opps} clients={clients} onCreate={doOpportunity} onMove={moveOpportunity} onConvert={convertOpportunity}/>}
      {view==='clientes'&&<Clientes clients={clients} empresa={empresa} onSaved={()=>void load()}/>}
      {view==='precos'&&<Precos prices={prices} priceItems={priceItems} products={products} empresa={empresa} onSaved={()=>void load()}/>}
      {view==='orcamentos'&&<Orcamentos quotes={quotes} clients={clients} onCreate={createQuote} onConvert={convertQuote}/>}
      {view==='pedidos'&&<Pedidos orders={orders} clients={clients}/>}
      {view==='faturamento'&&<Faturamento nfes={nfes}/>}
      {view==='expedicao'&&<Expedicao romaneios={romaneios}/>}
      {view==='comissoes'&&<Comissoes rules={rules} launches={launches}/>}
      {view==='rma'&&<Rma clients={clients} devolucoes={devolucoes} onCreate={createRma}/>} 
     </>}
    </section>
   </main>
  </div>
 </div>
}

function Dashboard({orders,nfes,clients,meta,orderItems,products,productionOrders,quotes,opps}:{orders:Order[];nfes:Nfe[];clients:Client[];meta:SalesMeta|null;orderItems:OrderItem[];products:Product[];productionOrders:ProductionOrder[];quotes:Quote[];opps:Opportunity[]}){
 const [period,setPeriod]=useState<'HOJE'|'SEMANA'|'MES'|'TRIMESTRE'>('MES')
 const now=new Date()
 const startDate=()=>{const d=new Date(now);if(period==='HOJE')d.setHours(0,0,0,0);if(period==='SEMANA'){const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));d.setHours(0,0,0,0)}if(period==='MES'){d.setDate(1);d.setHours(0,0,0,0)}if(period==='TRIMESTRE'){d.setMonth(Math.floor(d.getMonth()/3)*3,1);d.setHours(0,0,0,0)}return d}
 const from=startDate()
 const to=new Date(now);to.setHours(23,59,59,999)
 const periodNfes=nfes.filter(n=>{const dt=new Date(n.data_emissao);return dt>=from&&dt<=to&&['AUTORIZADA','autorizada','100','processada'].includes(n.status)})
 const periodOrders=orders.filter(o=>{const dt=new Date(o.data_entrada);return dt>=from&&dt<=to})
 const faturamento=periodNfes.reduce((s,n)=>s+Number(n.valor_total||0),0)
 const abertos=periodOrders.filter(o=>['APROVADO','EM_PRODUCAO','EM PRODUÇÃO'].includes(o.status)).length
 const periodQuotes=quotes.filter(q=>{const dt=new Date(q.created_at);return dt>=from&&dt<=to})
 const convertedQuotes=periodQuotes.filter(q=>q.status==='CONVERTIDO').length
 const conversao=periodQuotes.length?Math.min(convertedQuotes/periodQuotes.length*100,100):0
 const chartMap=new Map<string,{data:string;faturamento:number;meta:number}>()
 for(const n of nfes){const dt=new Date(n.data_emissao);if(dt<from||!['AUTORIZADA','autorizada','100','processada'].includes(n.status))continue;const key=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});const row=chartMap.get(key)??{data:key,faturamento:0,meta:0};row.faturamento+=Number(n.valor_total||0);chartMap.set(key,row)}
 const chartData=[...chartMap.values()]
 const productMap=new Map<string,{nome:string;quantidade:number;receita:number}>()
 for(const item of orderItems){const order=orders.find(o=>o.id===item.pedido_id);if(order){const dt=new Date(order.data_entrada);if(dt<from||dt>to)continue}const p=products.find(x=>x.id===item.produto_id);const key=item.produto_id;const row=productMap.get(key)??{nome:p?.nome??item.descricao??'Produto sem descrição',quantidade:0,receita:0};row.quantidade+=Number(item.quantidade||0);row.receita+=Number(item.total||0);productMap.set(key,row)}
 const topProducts=[...productMap.values()].sort((a,b)=>b.receita-a.receita).slice(0,5)
 const pcp=productionOrders.reduce((acc,o)=>{const k=String(o.status||'SEM STATUS');acc[k]=(acc[k]??0)+1;return acc},{} as Record<string,number>)
 const progress=meta&&Number(meta.meta_faturamento)>0?Math.min(100,(faturamento/Number(meta.meta_faturamento))*100):0
 const creditBlocked=periodOrders.filter(o=>o.credito_status==='BLOQUEADO')
 return <><div className="vcs-toolbar"><div><strong>Visão comercial real</strong><div style={{fontSize:12,color:'#617984'}}>Somente registros da empresa autenticada. Período aplicado ao faturamento fiscal.</div></div><label className="vcs-field" style={{width:125}}>Período<select value={period} onChange={e=>setPeriod(e.target.value as typeof period)}><option value="HOJE">Hoje</option><option value="SEMANA">Esta semana</option><option value="MES">Este mês</option><option value="TRIMESTRE">Este trimestre</option></select></label></div>
 <div className="vcs-grid"><article className="vcs-card vcs-kpi"><p>Faturamento fiscal autorizado</p><strong>{brl(faturamento)}</strong></article><article className="vcs-card vcs-kpi"><p>Meta comercial</p><strong>{meta?brl(meta.meta_faturamento):'—'}</strong><small>{meta?progress.toFixed(1)+'% realizado':'Nenhuma meta cadastrada'}</small></article><article className="vcs-card vcs-kpi"><p>Pedidos Aprovados / Em Produção</p><strong>{abertos}</strong></article><article className="vcs-card vcs-kpi"><p>Taxa de conversão registrada</p><strong>{conversao.toFixed(1)}%</strong></article></div>
 <section className="vcs-section"><div className="vcs-section-title"><strong>Faturamento × meta no período</strong><span>{chartData.length} ponto(s) real(is)</span></div>{chartData.length?<div style={{height:260}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="data"/><YAxis tickFormatter={v=>brl(Number(v))}/><Tooltip formatter={(v)=>brl(Number(v))}/><Area type="monotone" dataKey="faturamento" name="Faturamento"/></AreaChart></ResponsiveContainer></div>:<div className="vcs-empty">Nenhum dado disponível para o período selecionado.</div>}</section>
 <section className="vcs-section"><div className="vcs-section-title"><strong>Top 5 produtos por receita</strong><span>Base: itens reais de pedidos</span></div>{topProducts.length?<DataTable headers={['Produto','Quantidade','Receita']} rows={topProducts.map(p=>[p.nome,p.quantidade.toLocaleString('pt-BR'),brl(p.receita)])}/>:<div className="vcs-empty">Nenhum dado disponível para o período selecionado.</div>}</section>
 <section className="vcs-section"><div className="vcs-section-title"><strong>Pedidos recentes e situação comercial</strong><span>{orders.length} registro(s)</span></div><DataTable headers={['Pedido','Cliente','Status','Total','Entrega']} rows={orders.slice(0,12).map(o=>[String(o.numero).padStart(6,'0'),clients.find(c=>c.id===o.cliente_id)?.nome??'—',o.status,brl(o.total),dateBR(o.data_entrega_prometida)])}/></section>
 <section className="vcs-section"><div className="vcs-section-title"><strong>Indicadores de PCP</strong><span>{productionOrders.length} OP(s) consultadas</span></div>{productionOrders.length?<DataTable headers={['Status','Quantidade de OPs']} rows={Object.entries(pcp).map(([status,count])=>[status,count])}/>:<div className="vcs-empty">Nenhuma ordem de produção encontrada.</div>}</section>
 <section className="vcs-section"><div className="vcs-section-title"><strong>Pedidos bloqueados por crédito</strong><span>{creditBlocked.length} no período</span></div>{creditBlocked.length?<DataTable headers={['Pedido','Cliente','Total','Motivo']} rows={creditBlocked.slice(0,20).map(o=>[String(o.numero).padStart(6,'0'),clients.find(c=>c.id===o.cliente_id)?.nome??'—',brl(o.total),o.credito_motivo??'Bloqueio financeiro'])}/>:<div className="vcs-empty">Nenhum pedido bloqueado por crédito no período selecionado.</div>}</section></>
}
function CRM({opps,clients,onCreate,onMove,onConvert}:{opps:Opportunity[];clients:Client[];onCreate:(t:string,c:string,v:string)=>Promise<void>;onMove:(id:string,e:string)=>Promise<void>;onConvert:(o:Opportunity)=>Promise<void>}){
 const [title,setTitle]=useState('');const [client,setClient]=useState('');const [value,setValue]=useState('')
 const stages=[['PROSPECCAO','Prospecção'],['QUALIFICACAO','Qualificação'],['PROPOSTA','Proposta Enviada'],['NEGOCIACAO','Em Negociação'],['GANHO','Ganho'],['PERDIDO','Perdido']] as const
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Nova oportunidade</strong></div><div className="vcs-form"><label className="vcs-field wide">Título<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="vcs-field">Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Selecionar</option>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo} • {c.nome}</option>)}</select></label><label className="vcs-field">Valor estimado<input className="erp-field-money" type="number" step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} onClick={()=>void onCreate(title,client,value)}><Plus size={16}/> Criar oportunidade</button></div></div></section>
 <section className="vcs-section"><div className="vcs-kanban">{stages.map(([id,label])=><div className="vcs-column" key={id} onDragOver={e=>e.preventDefault()} onDrop={e=>{const oppId=e.dataTransfer.getData('text/plain');if(oppId)void onMove(oppId,id)}}><strong>{label.toUpperCase()}</strong>{opps.filter(o=>o.etapa===id).map(o=><article className="vcs-op" key={o.id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',o.id)}><strong>{o.titulo}</strong><small>{clients.find(c=>c.id===o.cliente_id)?.nome??'Sem cliente'}</small><small>{brl(o.valor_estimado)} • {o.probabilidade}%</small><small>{o.proxima_acao||'Sem próxima ação'}</small><div className="vcs-op-actions">{id!=='GANHO'&&id!=='PERDIDO'&&<button onClick={()=>void onMove(o.id,'GANHO')}>Marcar ganho</button>}{id!=='PERDIDO'&&<button onClick={()=>void onMove(o.id,'PERDIDO')}>Perdido</button>}{(id==='PROPOSTA'||id==='NEGOCIACAO'||id==='GANHO')&&o.cliente_id&&<button onClick={()=>void onConvert(o)}>Converter em orçamento</button>}</div></article>)}</div>)}</div></section></>
}

function Clientes({clients,empresa,onSaved}:{clients:Client[];empresa:string;onSaved:()=>void}){
 const [tab,setTab]=useState<'geral'|'logistica'|'credito'|'historico'|'contatos'>('geral')
 const [open,setOpen]=useState(false);const [form,setForm]=useState({codigo:'',nome:'',documento:'',email:'',limite:'0'})
 const save=async()=>{if(!form.nome.trim()||!form.codigo.trim())return;const r=await supabase.from('erp_clientes').insert({empresa_id:empresa,codigo:form.codigo.trim(),nome:form.nome.trim(),documento:form.documento.trim()||null,email:form.email.trim()||null,limite_credito:Number(form.limite)||0,ativo:true});if(!r.error){setOpen(false);setForm({codigo:'',nome:'',documento:'',email:'',limite:'0'});onSaved()}}
 const selected=clients.filter(c=>c.ativo)
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Cadastro e gestão de clientes</strong><button className="vcs-btn primary" onClick={()=>setOpen(v=>!v)}><Plus size={16}/> Novo cliente</button></div><div className="vcs-actions">{[['geral','Ficha Geral'],['logistica','Endereços & Logística'],['credito','Crédito & Financeiro'],['historico','Histórico de Compras'],['contatos','Contatos']].map(([id,label])=><button key={id} className={`vcs-btn ${tab===id?'primary':''}`} onClick={()=>setTab(id as typeof tab)}>{label}</button>)}</div></section>
 {tab==='geral'&&<><section className="vcs-section">{open&&<div className="vcs-form"><label className="vcs-field erp-field-code">Código<input className="erp-field-code" value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/></label><label className="vcs-field wide">Razão Social / Nome<input className="erp-field-name" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></label><label className="vcs-field erp-field-cnpj">CNPJ / CPF<input className="erp-field-cnpj" value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})}/></label><label className="vcs-field wide">E-mail<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="vcs-field erp-field-money">Limite de crédito<input className="erp-field-money" type="number" step="0.01" value={form.limite} onChange={e=>setForm({...form,limite:e.target.value})}/></label><div><button className="vcs-btn primary" onClick={()=>void save()}><Plus size={16}/> Salvar cliente</button></div></div>}</section><section className="vcs-section"><DataTable headers={['Código','Cliente','Documento','E-mail','Limite','Situação']} rows={selected.map(c=>[c.codigo,c.nome,c.documento??'—',c.email??'—',brl(Number(c.limite_credito||0)),c.ativo?'ATIVO':'INATIVO'])}/></section></>}
 {tab==='credito'&&<section className="vcs-section"><div className="vcs-section-title"><strong>Crédito & Financeiro</strong><span>Dados reais do cadastro</span></div><DataTable headers={['Cliente','Limite cadastrado','Status do cadastro']} rows={selected.map(c=>[c.nome,brl(Number(c.limite_credito||0)),Number(c.limite_credito||0)>0?'COM LIMITE':'SEM LIMITE'])}/><div className="vcs-empty">A disponibilidade efetiva de crédito deve ser calculada pelo módulo Financeiro. Nenhum saldo financeiro é inventado nesta tela.</div></section>}
 {tab==='logistica'&&<section className="vcs-section"><div className="vcs-empty">Nenhum cadastro de endereço/logística adicional foi carregado nesta consulta. A tela não cria endereços fictícios.</div></section>}
 {tab==='historico'&&<section className="vcs-section"><div className="vcs-empty">O histórico de compras será exibido quando houver documentos comerciais/fiscais vinculados ao cliente na consulta desta empresa.</div></section>}
 {tab==='contatos'&&<section className="vcs-section"><div className="vcs-empty">Nenhum contato adicional foi retornado pela fonte de dados atual.</div></section>}</>
}
function Precos({prices,priceItems,products,empresa,onSaved}:{prices:PriceTable[];priceItems:Array<{id:string;tabela_preco_id:string;produto_id:string;preco:number}>;products:Product[];empresa:string;onSaved:()=>void}){
 const [code,setCode]=useState('');const [name,setName]=useState('');const [adjustment,setAdjustment]=useState('0');const [adjusting,setAdjusting]=useState(false)
 const save=async()=>{if(!code.trim()||!name.trim())return;const r=await supabase.from('erp_tabelas_preco').insert({empresa_id:empresa,codigo:code.trim(),nome:name.trim(),ativo:true});if(!r.error){setCode('');setName('');onSaved()}}\n const adjust=async()=>{if(!prices.length)return;const pct=Number(adjustment);if(!Number.isFinite(pct)||pct===0)return;setAdjusting(true);try{const r=await supabase.rpc('erp_reajustar_tabela_preco_em_lote',{p_tabela_id:prices[0].id,p_percentual:pct,p_respeitar_custo:true});if(r.error)throw r.error;onSaved()}catch(e){window.alert(e instanceof Error?e.message:'Não foi possível aplicar o reajuste em lote.')}finally{setAdjusting(false)}}
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Tabelas de preço</strong></div><div className="vcs-form"><label className="vcs-field erp-field-code">Código<input value={code} onChange={e=>setCode(e.target.value)}/></label><label className="vcs-field wide">Nome<input value={name} onChange={e=>setName(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} onClick={()=>void save()}><Plus size={16}/> Criar tabela</button></div></div></section><section className="vcs-section"><div className="vcs-section-title"><strong>Tabelas comerciais</strong><span>{prices.length} tabela(s)</span></div><DataTable headers={['Código','Tabela','Status']} rows={prices.map(p=>[p.codigo,p.nome,p.ativo?'ATIVA':'INATIVA'])}/><div className="vcs-form" style={{marginTop:10}}><label className="vcs-field erp-field-percent">Reajuste %<input type="number" step="0.01" value={adjustment} onChange={e=>setAdjustment(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} disabled={adjusting||!prices.length} onClick={()=>void adjust()}><RefreshCw size={16}/> {adjusting?'Aplicando…':'Reajustar tabela em lote'}</button></div></div><p style={{fontSize:12,color:'#617984',marginBottom:0}}>O reajuste usa transação no banco e bloqueia preço abaixo do custo/margem mínima cadastrada.</p></section><section className="vcs-section"><strong>Itens de tabela cadastrados</strong><DataTable headers={['Tabela','Produto','Preço','Custo']} rows={priceItems.slice(0,50).map(i=>[prices.find(p=>p.id===i.tabela_preco_id)?.nome??'—',products.find(p=>p.id===i.produto_id)?.nome??'—',brl(Number(i.preco||0)),brl(Number(products.find(p=>p.id===i.produto_id)?.custo_ultimo||0))])}/></section></>
}

function Orcamentos({quotes,clients,onCreate,onConvert}:{quotes:Quote[];clients:Client[];onCreate:(c:string,v:string)=>Promise<void>;onConvert:(q:Quote)=>Promise<void>}){
 const productsForQuote=useProductsForQuote()
 const [client,setClient]=useState('');const [validade,setValidade]=useState('');const [quoteId,setQuoteId]=useState('');const [produto,setProduto]=useState('');const [quantidade,setQuantidade]=useState('1');const [preco,setPreco]=useState('');const [items,setItems]=useState<Array<{id:string;orcamento_id:string;produto_id:string;quantidade:number;preco_unitario:number;total:number}>>([]);const [itemLoading,setItemLoading]=useState(false)
 const refreshItems=async(id:string)=>{const r=await supabase.from('erp_vendas_orcamentos_itens').select('id,orcamento_id,produto_id,quantidade,preco_unitario,total').eq('orcamento_id',id).eq('empresa_id',await supabase.rpc('erp_current_empresa_id').then(x=>String(x.data||''))).order('created_at');if(!r.error)setItems((r.data??[]) as typeof items)}
 const addItem=async()=>{if(!quoteId||!produto||Number(quantidade)<=0||Number(preco)<0)return;setItemLoading(true);try{const empresaId=await supabase.rpc('erp_current_empresa_id').then(x=>String(x.data||''));const r=await supabase.from('erp_vendas_orcamentos_itens').insert({empresa_id:empresaId,orcamento_id:quoteId,produto_id:produto,quantidade:Number(quantidade),preco_unitario:Number(preco),desconto_percentual:0});if(r.error)throw r.error;const rows=await supabase.from('erp_vendas_orcamentos_itens').select('total').eq('orcamento_id',quoteId).eq('empresa_id',empresaId);if(rows.error)throw rows.error;const total=(rows.data??[]).reduce((s,x)=>s+Number(x.total||0),0);const up=await supabase.from('erp_vendas_orcamentos').update({subtotal:total,total}).eq('id',quoteId).eq('empresa_id',empresaId);if(up.error)throw up.error;setProduto('');setQuantidade('1');setPreco('');await refreshItems(quoteId)}catch(e){window.alert(e instanceof Error?e.message:'Não foi possível adicionar o item.')}finally{setItemLoading(false)}}
 const selectedQuote=quotes.find(q=>q.id===quoteId)\n const printQuote=()=>{if(!selectedQuote)return;const clientName=clients.find(c=>c.id===selectedQuote.cliente_id)?.nome??'Cliente';const rows=items.map(i=>`<tr><td>${productsForQuote.find(p=>p.id===i.produto_id)?.codigo??''}</td><td>${productsForQuote.find(p=>p.id===i.produto_id)?.nome??''}</td><td>${i.quantidade}</td><td>${brl(i.preco_unitario)}</td><td>${brl(i.total)}</td></tr>`).join('');const w=window.open('','_blank','noopener,noreferrer,width=1000,height=800');if(!w)return;w.document.write(`<html><head><title>Orçamento ${selectedQuote.numero}</title><style>body{font-family:Arial,sans-serif;color:#123b50;margin:40px}header{border-bottom:2px solid #2d8db8;padding-bottom:16px}h1{margin:0;font-size:24px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:9px;border-bottom:1px solid #d7e6eb;text-align:left}th{background:#f1f7f9}.total{text-align:right;font-size:20px;font-weight:800;margin-top:20px}.terms{margin-top:30px;color:#526a76;white-space:pre-wrap}@media print{body{margin:18mm}}</style></head><body><header><div>ERP INDUSTRIAL • VENDAS & COMERCIAL</div><h1>PROPOSTA / ORÇAMENTO Nº ${selectedQuote.numero}</h1><div>Cliente: ${clientName}</div><div>Validade: ${dateBR(selectedQuote.validade)}</div></header><table><thead><tr><th>Código</th><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${brl(items.reduce((s,i)=>s+Number(i.total||0),0))}</div><div class="terms">Condições e termos: ${'Conforme cadastro comercial.'}</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Novo orçamento</strong></div><div className="vcs-form"><label className="vcs-field wide">Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Selecionar</option>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo} • {c.nome}</option>)}</select></label><label className="vcs-field erp-field-date">Validade<input type="date" value={validade} onChange={e=>setValidade(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} onClick={()=>void onCreate(client,validade)}><Plus size={16}/> Criar rascunho</button></div></div></section><section className="vcs-section"><div className="vcs-section-title"><strong>Orçamentos</strong><span>Selecione um orçamento para editar itens e gerar PDF</span></div><DataTable headers={['Orçamento','Cliente','Status','Validade','Total','Ação']} rows={quotes.map(q=>[String(q.numero).padStart(6,'0'),clients.find(c=>c.id===q.cliente_id)?.nome??'—',q.status,dateBR(q.validade),brl(q.total),q.status==='CONVERTIDO'?'—':<button className="vcs-btn" onClick={()=>{setQuoteId(q.id);void refreshItems(q.id)}}>{quoteId===q.id?'Selecionado':'Itens'}</button>])}/></section>{selectedQuote&&selectedQuote.status!=='CONVERTIDO'&&<section className="vcs-section"><div className="vcs-section-title"><strong>Itens do orçamento {String(selectedQuote.numero).padStart(6,'0')}</strong></div><div className="vcs-form"><label className="vcs-field wide">Produto<select value={produto} onChange={e=>{setProduto(e.target.value);const p=productsForQuote.find(x=>x.id===e.target.value);if(p)setPreco(String(p.preco_venda??0))}}><option value="">Selecionar</option>{productsForQuote.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label><label className="vcs-field erp-field-qty">Quantidade<input type="number" min="0.001" step="0.001" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label><label className="vcs-field erp-field-money">Preço unitário<input className="erp-field-money" type="number" min="0" step="0.0001" value={preco} onChange={e=>setPreco(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} disabled={itemLoading} onClick={()=>void addItem()}><Plus size={16}/> Adicionar item</button></div></div>{items.length?<DataTable headers={['Produto','Quantidade','Preço','Total']} rows={items.map(i=>[productsForQuote.find(p=>p.id===i.produto_id)?.nome??'—',i.quantidade,brl(i.preco_unitario),brl(i.total)])}/>:<div className="vcs-empty">Nenhum item cadastrado neste orçamento.</div>}<div className="vcs-actions" style={{justifyContent:'flex-end',marginTop:10}}><button className="vcs-btn" disabled={!items.length} onClick={printQuote}><FileCheck2 size={16}/> Gerar PDF / Imprimir</button><strong>Total: {brl(items.reduce((s,i)=>s+Number(i.total||0),0)||selectedQuote.total)}</strong><button className="vcs-btn primary" disabled={!items.length} onClick={()=>void onConvert(selectedQuote)}><ShoppingCart size={16}/> Converter para pedido</button></div></section>}</>
}

function useProductsForQuote(){const [productsForQuote,setProductsForQuote]=useState<Product[]>([]);useEffect(()=>{let active=true;void supabase.rpc('erp_current_empresa_id').then(e=>{if(e.error||!e.data)return supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,custo_ultimo,ativo').eq('ativo',true).limit(0);return supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,custo_ultimo,ativo').eq('empresa_id',String(e.data)).eq('ativo',true).order('codigo').limit(2000)}).then(r=>{if(active&&!r.error)setProductsForQuote((r.data??[]) as Product[])});return()=>{active=false}},[]);return productsForQuote}
function Pedidos({orders,clients}:{orders:Order[];clients:Client[]}){const [credit,setCredit]=useState<Record<string,string>>({});const [busy,setBusy]=useState<string|null>(null);const analyze=async(id:string)=>{setBusy(id);try{const r=await supabase.rpc('erp_validar_credito_pedido',{p_pedido_id:id});if(r.error)throw r.error;setCredit(v=>({...v,[id]:String((r.data as {status?:string;motivo?:string})?.status||'—')}))}catch(e){setCredit(v=>({...v,[id]:e instanceof Error?e.message:'Falha na análise'}))}finally{setBusy(null)}};return <><section className="vcs-section"><div className="vcs-section-title"><strong>Central de pedidos de venda</strong><button className="vcs-btn primary" onClick={()=>window.location.href='/vendas/novo-pedido'}><Plus size={16}/> Novo pedido</button></div><div className="vcs-flow"><span>Crédito aprovado</span><b>→</b><span>Estoque reservado</span><b>→</b><span>Necessidade líquida → PCP</span><b>→</b><span>Fisicamente pronto</span><b>→</b><span>Faturamento</span></div></section><section className="vcs-section"><DataTable headers={['Pedido','Cliente','Entrada','Entrega','Status','Crédito','Total','Pedido cliente','Ação']} rows={orders.map(o=>[String(o.numero).padStart(6,'0'),clients.find(c=>c.id===o.cliente_id)?.nome??'—',dateBR(o.data_entrada),dateBR(o.data_entrega_prometida),o.status,credit[o.id]??'NÃO ANALISADO',brl(o.total),o.pedido_cliente??'—',<button className="vcs-btn" disabled={busy===o.id} onClick={()=>void analyze(o.id)}>{busy===o.id?'Analisando…':'Analisar crédito'}</button>])}/></section></>}

function Faturamento({nfes}:{nfes:Nfe[]}){return <><section className="vcs-section"><div className="vcs-section-title"><strong>Faturamento & NF-e</strong><button className="vcs-btn primary" onClick={()=>window.location.href='/nfe-emissao'}><FileCheck2 size={16}/> Abrir emissão NF-e</button></div><p style={{fontSize:12,color:'#617984'}}>Somente NF-e reais da empresa atual são exibidas. A transmissão SEFAZ permanece no fluxo fiscal existente; esta central não simula autorização.</p></section><section className="vcs-section"><DataTable headers={['NF-e','Série','Destinatário','Status','Valor','Emissão','Chave / erro']} rows={nfes.map(n=>[n.numero??'—',n.serie,n.destinatario_nome,n.status,brl(n.valor_total),dateBR(n.data_emissao),n.chave_acesso??n.mensagem_sefaz??'—'])}/></section></>}

function Expedicao({romaneios}:{romaneios:Romaneio[]}){return <><section className="vcs-section"><div className="vcs-section-title"><strong>Expedição & Romaneiro</strong><button className="vcs-btn primary" onClick={()=>window.location.href='/expedicao/roteirizacao'}><PackageCheck size={16}/> Abrir expedição</button></div><p style={{fontSize:12,color:'#617984'}}>A saída deve permanecer bloqueada enquanto houver volumes divergentes. O romaneio usa dados reais de expedição.</p></section><section className="vcs-section"><DataTable headers={['Romaneio','Status','Transportadora','Peso','Data']} rows={romaneios.map(r=>[String(r.numero),r.status,r.transportadora??'—',`${Number(r.peso_total_kg||0).toLocaleString('pt-BR')} kg`,dateBR(r.data_expedicao)])}/></section></>}

function Comissoes({rules,launches}:{rules:CommissionRule[];launches:CommissionLaunch[]}){const [busy,setBusy]=useState(false);const generateAP=async()=>{setBusy(true);try{const r=await supabase.rpc('erp_gerar_contas_pagar_comissoes',{p_data:new Date().toISOString().slice(0,10)});if(r.error)throw r.error;window.alert('Contas a pagar de comissão processadas.');}catch(e){window.alert(e instanceof Error?e.message:'Falha ao gerar contas a pagar.')}finally{setBusy(false)}};return <><section className="vcs-section"><div className="vcs-section-title"><strong>Regras comerciais de comissão</strong><span>{rules.length} regra(s)</span></div><DataTable headers={['Regra','Tipo','Percentual','Margem mínima','Por recebimento','Status']} rows={rules.map(r=>[r.nome,r.tipo,`${Number(r.percentual).toFixed(2)}%`,r.margem_minima==null?'—':`${Number(r.margem_minima).toFixed(2)}%`,r.por_recebimento?'SIM':'NÃO',r.ativo?'ATIVA':'INATIVA'])}/></section><section className="vcs-section"><div className="vcs-section-title"><strong>Lançamentos de comissão</strong><button className="vcs-btn primary" disabled={busy} onClick={()=>void generateAP()}><Plus size={16}/> {busy?'Processando…':'Gerar Contas a Pagar'}</button></div><DataTable headers={['Data','Receita base','Percentual','Comissão','Status']} rows={launches.map(l=>[dateBR(l.data_referencia),brl(l.receita_base),`${Number(l.percentual).toFixed(2)}%`,brl(l.valor_comissao),l.status])}/></section></>}

function Rma({clients,devolucoes,onCreate}:{clients:Client[];devolucoes:Array<{id:string;numero:number;cliente_id:string;tipo:string;motivo:string;status:string;tratamento_sgq:string;valor_credito:number}>;onCreate:(c:string,r:string)=>Promise<void>}){const [action,setAction]=useState<Record<string,string>>({});const treat=async(id:string)=>{const a=action[id]||'QUARENTENA';const r=await supabase.rpc('erp_registrar_tratamento_rma',{p_devolucao_id:id,p_acao_sgq:a,p_observacao:null});if(r.error)window.alert(r.error.message);};
 const [client,setClient]=useState('');const [reason,setReason]=useState('')
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Nova devolução / troca / garantia RMA</strong></div><div className="vcs-form"><label className="vcs-field wide">Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Selecionar</option>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo} • {c.nome}</option>)}</select></label><label className="vcs-field wide">Motivo<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Descreva o motivo para análise comercial e SGQ."/></label><div><button className="vcs-btn primary" style={{marginTop:20}} onClick={()=>void onCreate(client,reason)}><Plus size={16}/> Abrir RMA</button></div></div></section><section className="vcs-section"><strong>RMA registrados</strong><DataTable headers={['RMA','Cliente','Tipo','Motivo','Status','SGQ','Crédito','Tratamento']} rows={devolucoes.map(d=>[String(d.numero).padStart(6,'0'),clients.find(c=>c.id===d.cliente_id)?.nome??'—',d.tipo,d.motivo,d.status,d.tratamento_sgq,brl(d.valor_credito),<div className="vcs-actions"><select value={action[d.id]??d.tratamento_sgq} onChange={e=>setAction(v=>({...v,[d.id]:e.target.value}))}><option>QUARENTENA</option><option>RETRABALHO</option><option>SUCATA</option><option>LIBERACAO</option></select><button className="vcs-btn" onClick={()=>void treat(d.id)}>Registrar SGQ</button></div>])}/></section><section className="vcs-section"><strong>Regra de tratamento</strong><p style={{fontSize:12,color:'#617984'}}>Todo RMA novo entra em <b>QUARENTENA</b>. Depois, a análise do SGQ define liberação, retrabalho ou sucata. O crédito/refund só deve ocorrer após o tratamento fiscal e financeiro correspondente.</p></section></>
}

function DataTable({headers,rows}:{headers:string[];rows:Array<Array<ReactNode>>}){return <div className="vcs-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length}><div className="vcs-empty">Nenhum registro real encontrado para a empresa atual.</div></td></tr>}</tbody></table></div>}
