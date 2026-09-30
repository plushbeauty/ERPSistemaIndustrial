import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Factory, FileCheck2, PackageCheck, Plus, RefreshCw, Settings, ShieldCheck, ShoppingCart, Truck, Users, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type View = 'dashboard'|'crm'|'clientes'|'precos'|'orcamentos'|'pedidos'|'faturamento'|'expedicao'|'comissoes'|'rma'
type Client = { id:string; codigo:string; nome:string; documento:string|null; email:string|null; limite_credito:number|null; ativo:boolean }
type Product = { id:string; codigo:string; nome:string; preco_venda:number|null; custo_ultimo:number|null; estoque_atual:number|null; ativo:boolean }
type Opportunity = { id:string; titulo:string; cliente_id:string|null; valor_estimado:number; probabilidade:number; etapa:string; proxima_acao:string|null; motivo_perda:string|null }
type Quote = { id:string; numero:number; cliente_id:string; status:string; validade:string|null; contato?:string|null; vendedor_id?:string|null; tabela_preco_id?:string|null; condicao_pagamento?:string|null; tipo_frete?:string|null; valor_frete?:number|null; outras_despesas?:number|null; termos?:string|null; observacoes?:string|null; subtotal?:number|null; desconto?:number|null; total:number; margem_percentual:number|null; created_at:string }
type Order = { id:string; numero:number; cliente_id:string|null; status:string; total:number; data_entrada:string; data_entrega_prometida:string|null; pedido_cliente:string|null; credito_status:string|null; credito_motivo:string|null }
type Nfe = { id:string; numero:number|null; serie:number; status:string; destinatario_nome:string; valor_total:number; data_emissao:string; chave_acesso:string|null; mensagem_sefaz:string|null }
type PriceTable = { id:string; codigo:string; nome:string; ativo:boolean; validade_inicio?:string|null; validade_fim?:string|null; margem_minima?:number|null; desconto_maximo_vendedor?:number|null; desconto_maximo_gerente?:number|null; moeda?:string|null; condicao_pagamento?:string|null }
type Romaneio = { id:string; numero:number; status:string; transportadora:string|null; peso_total_kg:number; data_expedicao:string|null }
type CommissionRule = { id:string; nome:string; percentual:number; tipo:string; margem_minima:number|null; por_recebimento:boolean; ativo:boolean }
type CommissionLaunch = { id:string; funcionario_id:string; data_referencia:string; receita_base:number; percentual:number; valor_comissao:number; status:string }
type SalesMeta = { competencia:string; meta_faturamento:number; meta_pedidos:number }
type OrderItem = { id:string; pedido_id:string; produto_id:string; descricao:string|null; quantidade:number; total:number|null }
type ProductionOrder = { id:string; status:string; quantidade:number|null; quantidade_planejada:number|null; pedido_item_id:string|null; numero_op:string|null; data_prevista:string|null }
type StockReservation = { id:string; pedido_item_id:string; produto_id:string; quantidade:number; status:string }

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
 const [reservations,setReservations]=useState<StockReservation[]>([])
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
    supabase.from('erp_produtos').select('id,codigo,nome,preco_venda,custo_ultimo,estoque_atual,ativo').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
    supabase.from('erp_vendas_oportunidades').select('id,titulo,cliente_id,valor_estimado,probabilidade,etapa,proxima_acao,motivo_perda').eq('empresa_id',id).order('updated_at',{ascending:false}).limit(500),
    supabase.from('erp_vendas_orcamentos').select('id,numero,cliente_id,status,validade,contato,vendedor_id,tabela_preco_id,condicao_pagamento,tipo_frete,valor_frete,outras_despesas,termos,observacoes,subtotal,desconto,total,margem_percentual,created_at').eq('empresa_id',id).order('created_at',{ascending:false}).limit(300),
    supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total,data_entrada,data_entrega_prometida,pedido_cliente,credito_status,credito_motivo').eq('empresa_id',id).order('created_at',{ascending:false}).limit(500),
    supabase.from('erp_documentos_fiscais').select('id,numero,serie,status,destinatario_nome,valor_total,data_emissao,chave_acesso,mensagem_sefaz').eq('empresa_id',id).eq('tipo','saida').order('data_emissao',{ascending:false}).limit(300),
    supabase.from('erp_tabelas_preco').select('id,codigo,nome,ativo,validade_inicio,validade_fim,margem_minima,desconto_maximo_vendedor,desconto_maximo_gerente,moeda,condicao_pagamento').eq('empresa_id',id).order('codigo'),
    supabase.from('erp_tabelas_preco_itens').select('id,tabela_preco_id,produto_id,preco').eq('empresa_id',id).limit(10000),
    supabase.from('erp_expedicoes').select('id,numero,status,transportadora,peso_total_kg,data_expedicao').eq('empresa_id',id).order('created_at',{ascending:false}).limit(200),
    supabase.from('erp_vendas_regras_comissao').select('id,nome,percentual,tipo,margem_minima,por_recebimento,ativo').eq('empresa_id',id).order('nome'),
    supabase.from('erp_vendas_comissoes_lancamentos').select('id,funcionario_id,data_referencia,receita_base,percentual,valor_comissao,status').eq('empresa_id',id).order('data_referencia',{ascending:false}).limit(300),
    supabase.from('erp_vendas_metas').select('competencia,meta_faturamento,meta_pedidos').eq('empresa_id',id).order('competencia',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('erp_pedidos_venda_itens').select('id,pedido_id,produto_id,descricao,quantidade,total').eq('empresa_id',id).limit(10000),
    supabase.from('erp_ordens_producao').select('id,status,quantidade,quantidade_planejada,pedido_item_id,numero_op,data_prevista').eq('empresa_id',id).order('id',{ascending:false}).limit(1000),
    supabase.from('erp_estoque_reservas').select('id,pedido_item_id,produto_id,quantidade,status').eq('empresa_id',id).eq('status','ATIVA').limit(10000),
    supabase.from('erp_vendas_devolucoes').select('id,numero,cliente_id,tipo,motivo,status,tratamento_sgq,valor_credito').eq('empresa_id',id).order('created_at',{ascending:false}).limit(300)
   ])
   for(const r of results) if(r.error) throw r.error
   setClients((results[0].data??[]) as Client[]);setProducts((results[1].data??[]) as Product[]);setOpps((results[2].data??[]) as Opportunity[])
   setQuotes((results[3].data??[]) as Quote[]);setOrders((results[4].data??[]) as Order[]);setNfes((results[5].data??[]) as Nfe[])
   setPrices((results[6].data??[]) as PriceTable[]);setPriceItems((results[7].data??[]) as typeof priceItems);setRomaneios((results[8].data??[]) as Romaneio[])
   setRules((results[9].data??[]) as CommissionRule[]);setLaunches((results[10].data??[]) as CommissionLaunch[])
   setMeta((results[11].data??null) as SalesMeta|null);setOrderItems((results[12].data??[]) as OrderItem[]);setProductionOrders((results[13].data??[]) as ProductionOrder[]);setReservations((results[14].data??[]) as StockReservation[]);setDevolucoes((results[15].data??[]) as typeof devolucoes)
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
      {view==='orcamentos'&&<Orcamentos quotes={quotes} clients={clients} prices={prices} products={products} onCreate={createQuote} onConvert={convertQuote}/>}
      {view==='pedidos'&&<Pedidos orders={orders} clients={clients} orderItems={orderItems} products={products} reservations={reservations} productionOrders={productionOrders} onReload={()=>void load()}/>}
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
 const [selectedId,setSelectedId]=useState(prices[0]?.id??'')
 const [newCode,setNewCode]=useState('')
 const [newName,setNewName]=useState('')
 const [saving,setSaving]=useState(false)
 const [draft,setDraft]=useState<PriceTable|null>(null)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [adjustment,setAdjustment]=useState('0')
 const [volumeRules,setVolumeRules]=useState<Array<{id:string;produto_id:string|null;quantidade_minima:number;quantidade_maxima:number|null;desconto_percentual:number;validade_inicio:string|null;validade_fim:string|null;prioridade:number;ativo:boolean}>>([])
 const [itemProduct,setItemProduct]=useState('')
 const [itemPrice,setItemPrice]=useState('')
 const [volumeProduct,setVolumeProduct]=useState('')
 const [volumeMin,setVolumeMin]=useState('')
 const [volumeMax,setVolumeMax]=useState('')
 const [volumeDiscount,setVolumeDiscount]=useState('0')
 const [volumeStart,setVolumeStart]=useState('')
 const [volumeEnd,setVolumeEnd]=useState('')
 const [volumePriority,setVolumePriority]=useState('100')
 const importRef=useRef<HTMLInputElement|null>(null)
 const selected=prices.find(p=>p.id===selectedId)??null
 const selectedItems=priceItems.filter(i=>i.tabela_preco_id===selectedId)
 const loadRules=async(id:string)=>{
  if(!id){setVolumeRules([]);return}
  const r=await supabase.from('erp_tabelas_preco_regras_volume').select('id,produto_id,quantidade_minima,quantidade_maxima,desconto_percentual,validade_inicio,validade_fim,prioridade,ativo').eq('empresa_id',empresa).eq('tabela_preco_id',id).order('prioridade').order('quantidade_minima')
  if(r.error){setError(r.error.message);return}
  setVolumeRules((r.data??[]) as typeof volumeRules)
 }
 useEffect(()=>{if(!selectedId&&prices[0])setSelectedId(prices[0].id)},[prices,selectedId])
 useEffect(()=>{setDraft(selected?{...selected}:null)},[selectedId,prices])
 useEffect(()=>{void loadRules(selectedId)},[selectedId,empresa])
 const saveTable=async()=>{
  if(!newCode.trim()||!newName.trim()){setError('Código e nome da tabela são obrigatórios.');return}
  setSaving(true);setError('');setMessage('')
  try{
   const r=await supabase.from('erp_tabelas_preco').insert({empresa_id:empresa,codigo:newCode.trim(),nome:newName.trim(),ativo:true,moeda:'BRL'}).select('id').single()
   if(r.error)throw r.error
   setNewCode('');setNewName('');setSelectedId(String(r.data.id));setMessage('Tabela de preço criada.');onSaved()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a tabela.')}finally{setSaving(false)}
 }
 const saveParameters=async()=>{
  if(!draft)return
  setSaving(true);setError('');setMessage('')
  try{
   const payload={
    codigo:draft.codigo,nome:draft.nome,ativo:draft.ativo,
    validade_inicio:draft.validade_inicio||null,validade_fim:draft.validade_fim||null,
    margem_minima:Number(draft.margem_minima||0),desconto_maximo_vendedor:Number(draft.desconto_maximo_vendedor||0),
    desconto_maximo_gerente:Number(draft.desconto_maximo_gerente||0),moeda:(draft.moeda||'BRL').toUpperCase(),condicao_pagamento:draft.condicao_pagamento?.trim()||null
   }
   const r=await supabase.from('erp_tabelas_preco').update(payload).eq('id',selected.id).eq('empresa_id',empresa)
   if(r.error)throw r.error
   setMessage('Parâmetros da tabela salvos.');onSaved()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar os parâmetros.')}finally{setSaving(false)}
 }
 const patchSelected=(patch:Partial<PriceTable>)=>setDraft(current=>current?{...current,...patch}:current)
 const saveItem=async()=>{
  if(!selected||!itemProduct){setError('Selecione um produto.');return}
  const price=Number(itemPrice);if(!Number.isFinite(price)||price<0){setError('Informe um preço válido.');return}
  setSaving(true);setError('')
  try{
   const r=await supabase.from('erp_tabelas_preco_itens').upsert({empresa_id:empresa,tabela_preco_id:selected.id,produto_id:itemProduct,preco:price},{onConflict:'tabela_preco_id,produto_id'})
   if(r.error)throw r.error
   setItemProduct('');setItemPrice('');setMessage('Preço do item gravado.');onSaved()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar o item.')}finally{setSaving(false)}
 }
 const removeItem=async(id:string)=>{
  const r=await supabase.from('erp_tabelas_preco_itens').delete().eq('id',id).eq('empresa_id',empresa)
  if(r.error)setError(r.error.message);else{setMessage('Item removido da tabela.');onSaved()}
 }
 const addVolumeRule=async()=>{
  if(!selected){setError('Selecione uma tabela.');return}
  const min=Number(volumeMin),max=volumeMax.trim()?Number(volumeMax):null,disc=Number(volumeDiscount),priority=Number(volumePriority)||100
  if(!Number.isFinite(min)||min<=0||!Number.isFinite(disc)||disc<0||disc>100||(max!==null&&(!Number.isFinite(max)||max<min))){setError('Regra de escala inválida.');return}
  setSaving(true);setError('')
  try{
   const r=await supabase.from('erp_tabelas_preco_regras_volume').insert({empresa_id:empresa,tabela_preco_id:selected.id,produto_id:volumeProduct||null,quantidade_minima:min,quantidade_maxima:max,desconto_percentual:disc,validade_inicio:volumeStart||null,validade_fim:volumeEnd||null,prioridade})
   if(r.error)throw r.error
   setVolumeProduct('');setVolumeMin('');setVolumeMax('');setVolumeDiscount('0');setVolumeStart('');setVolumeEnd('');setVolumePriority('100');setMessage('Regra de escala gravada.');await loadRules(selected.id)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar a regra de escala.')}finally{setSaving(false)}
 }
 const removeVolumeRule=async(id:string)=>{
  const r=await supabase.from('erp_tabelas_preco_regras_volume').delete().eq('id',id).eq('empresa_id',empresa)
  if(r.error)setError(r.error.message);else await loadRules(selectedId)
 }
 const bulkAdjust=async()=>{
  if(!selected)return
  const pct=Number(adjustment);if(!Number.isFinite(pct)||pct===0){setError('Informe um percentual de reajuste diferente de zero.');return}
  setSaving(true);setError('')
  try{
   const r=await supabase.rpc('erp_reajustar_tabela_preco_em_lote',{p_tabela_id:selected.id,p_percentual:pct,p_respeitar_custo:true})
   if(r.error)throw r.error
   setMessage('Reajuste em lote aplicado pela transação do banco.');onSaved()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível aplicar o reajuste em lote.')}finally{setSaving(false)}
 }
 const exportCsv=()=>{
  if(!selected)return
  const header='codigo;descricao;custo_base;margem_percentual;preco_venda;desconto_maximo'
  const rows=selectedItems.map(i=>{const p=products.find(x=>x.id===i.produto_id);const cost=Number(p?.custo_ultimo||0);const margin=Number(i.preco)>0?((Number(i.preco)-cost)/Number(i.preco))*100:0;return [p?.codigo??'',p?.nome??'',cost.toFixed(4),margin.toFixed(3),Number(i.preco).toFixed(4),''].map(v=>String(v).replace(/;/g,',')).join(';')})
  const blob=new Blob([[header,...rows].join('\n')],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=selected.codigo+'-itens.csv';a.click();URL.revokeObjectURL(url)
 }
 const importCsv=async(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];e.target.value='';if(!file||!selected)return
  setSaving(true);setError('');setMessage('')
  try{
   const text=await file.text();const rows=text.split(/\r?\n/).slice(1).filter(Boolean)
   for(const row of rows){
    const [codigo,, , ,preco]=row.split(';').map(v=>v.trim());const p=products.find(x=>x.codigo===codigo)
    const value=Number(String(preco??'').replace(',','.'));if(!p||!Number.isFinite(value)||value<0)continue
    const r=await supabase.from('erp_tabelas_preco_itens').upsert({empresa_id:empresa,tabela_preco_id:selected.id,produto_id:p.id,preco:value},{onConflict:'tabela_preco_id,produto_id'})
    if(r.error)throw r.error
   }
   setMessage('Importação CSV processada com os produtos válidos encontrados no cadastro.');onSaved()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao importar CSV.')}finally{setSaving(false)}
 }
 return <><section className="vcs-section">
  <div className="vcs-section-title"><strong>Tabelas de Preço & Políticas Comerciais</strong><div className="vcs-actions"><select className="erp-field-name" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Selecionar tabela</option>{prices.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select><button className="vcs-btn primary" onClick={()=>void saveTable()} disabled={saving||!newCode.trim()||!newName.trim()}>+ Nova tabela</button></div></div>
  <div className="vcs-form"><label className="vcs-field erp-field-code">Código<input value={newCode} onChange={e=>setNewCode(e.target.value)} placeholder="Código da nova tabela"/></label><label className="vcs-field wide">Nome<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome da nova tabela"/></label></div>
 </section>
 {error&&<section className="vcs-section" style={{borderColor:'#e2b9b9',color:'#9b2525'}}>{error}</section>}
 {message&&<section className="vcs-section" style={{borderColor:'#b9dfcd',color:'#287a5c'}}>{message}</section>}
 {!selected?<section className="vcs-section"><div className="vcs-empty">Nenhuma tabela comercial selecionada.</div></section>:<><section className="vcs-section">
  <div className="vcs-section-title"><strong>Parâmetros da Tabela</strong><span>Empresa atual: {empresa}</span></div>
  <div className="vcs-form">
   <label className="vcs-field erp-field-code">Código<input readOnly value={draft?.codigo??''}/></label>
   <label className="vcs-field wide">Nome<input value={draft?.nome??''} onChange={e=>patchSelected({nome:e.target.value})}/></label>
   <label className="vcs-field erp-field-date">Validade inicial<input className="erp-field-date" type="date" value={draft?.validade_inicio??''} onChange={e=>patchSelected({validade_inicio:e.target.value||null})}/></label>
   <label className="vcs-field erp-field-date">Validade final<input className="erp-field-date" type="date" value={draft?.validade_fim??''} onChange={e=>patchSelected({validade_fim:e.target.value||null})}/></label>
   <label className="vcs-field erp-field-percent">Margem mínima<input className="erp-field-percent" type="number" step="0.001" min="0" max="100" value={draft?.margem_minima??0} onChange={e=>patchSelected({margem_minima:Number(e.target.value)})}/></label>
   <label className="vcs-field erp-field-percent">Desc. máx. vendedor<input className="erp-field-percent" type="number" step="0.001" min="0" max="100" value={draft?.desconto_maximo_vendedor??0} onChange={e=>patchSelected({desconto_maximo_vendedor:Number(e.target.value)})}/></label>
   <label className="vcs-field erp-field-percent">Desc. máx. gerente<input className="erp-field-percent" type="number" step="0.001" min="0" max="100" value={draft?.desconto_maximo_gerente??0} onChange={e=>patchSelected({desconto_maximo_gerente:Number(e.target.value)})}/></label>
   <label className="vcs-field erp-field-code">Moeda<input value={draft?.moeda??'BRL'} maxLength={3} onChange={e=>patchSelected({moeda:e.target.value.toUpperCase()})}/></label>
   <label className="vcs-field wide">Condição de pagamento<input value={draft?.condicao_pagamento??''} onChange={e=>patchSelected({condicao_pagamento:e.target.value})}/></label>
   <div><button className="vcs-btn primary" style={{marginTop:20}} disabled={saving} onClick={()=>void saveParameters()}>{saving?'Salvando…':'Salvar parâmetros'}</button></div>
  </div>
 </section>
 <section className="vcs-section">
  <div className="vcs-section-title"><strong>Itens da Tabela</strong><span>{selectedItems.length} item(ns)</span></div>
  <div className="vcs-form"><label className="vcs-field wide">Produto<select value={itemProduct} onChange={e=>setItemProduct(e.target.value)}><option value="">Selecionar produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label><label className="vcs-field erp-field-money">Preço venda<input className="erp-field-money" type="number" step="0.0001" min="0" value={itemPrice} onChange={e=>setItemPrice(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} disabled={saving} onClick={()=>void saveItem()}><Plus size={16}/> Adicionar Produto</button></div></div>
  <DataTable headers={['Código','Descrição','Custo base','Margem %','Preço venda','Desc. máx.','Ações']} rows={selectedItems.map(i=>{const p=products.find(x=>x.id===i.produto_id);const cost=Number(p?.custo_ultimo||0);const price=Number(i.preco||0);const margin=price>0?((price-cost)/price)*100:0;return [p?.codigo??'—',p?.nome??'—',brl(cost),margin.toFixed(2)+'%',brl(price),'—',<button className="vcs-icon-action" title="Remover item" onClick={()=>void removeItem(i.id)}><XCircle size={15}/></button>]})}/>
 </section>
 <section className="vcs-section">
  <div className="vcs-section-title"><strong>Regras de Desconto por Escala de Quantidade (Volume)</strong><span>{volumeRules.length} regra(s)</span></div>
  <div className="vcs-form"><label className="vcs-field wide">Produto (opcional)<select value={volumeProduct} onChange={e=>setVolumeProduct(e.target.value)}><option value="">Todos os produtos</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label><label className="vcs-field erp-field-qty">Qtd mínima<input className="erp-field-qty" type="number" step="0.001" min="0.001" value={volumeMin} onChange={e=>setVolumeMin(e.target.value)}/></label><label className="vcs-field erp-field-qty">Qtd máxima<input className="erp-field-qty" type="number" step="0.001" min="0" value={volumeMax} onChange={e=>setVolumeMax(e.target.value)}/></label><label className="vcs-field erp-field-percent">Desconto adicional %<input className="erp-field-percent" type="number" step="0.001" min="0" max="100" value={volumeDiscount} onChange={e=>setVolumeDiscount(e.target.value)}/></label><label className="vcs-field erp-field-date">Início<input className="erp-field-date" type="date" value={volumeStart} onChange={e=>setVolumeStart(e.target.value)}/></label><label className="vcs-field erp-field-date">Fim<input className="erp-field-date" type="date" value={volumeEnd} onChange={e=>setVolumeEnd(e.target.value)}/></label><label className="vcs-field erp-field-qty">Prioridade<input className="erp-field-qty" type="number" min="1" value={volumePriority} onChange={e=>setVolumePriority(e.target.value)}/></label><div><button className="vcs-btn primary" style={{marginTop:20}} disabled={saving} onClick={()=>void addVolumeRule()}><Plus size={16}/> Adicionar Regra Escala</button></div></div>
  <DataTable headers={['Produto','Qtd mínima','Qtd máxima','Desconto','Validade','Prioridade','Status','Ações']} rows={volumeRules.map(v=>[v.produto_id?products.find(p=>p.id===v.produto_id)?.codigo??'—':'Todos',Number(v.quantidade_minima).toLocaleString('pt-BR'),v.quantidade_maxima==null?'—':Number(v.quantidade_maxima).toLocaleString('pt-BR'),Number(v.desconto_percentual).toFixed(2)+'%',(v.validade_inicio??'—')+' → '+(v.validade_fim??'—'),v.prioridade,v.ativo?'ATIVA':'INATIVA',<button className="vcs-icon-action" title="Excluir regra" onClick={()=>void removeVolumeRule(v.id)}><XCircle size={15}/></button>]})}/>
 </section>
 <section className="vcs-section"><div className="vcs-actions"><button className="vcs-btn primary" disabled={saving} onClick={()=>void saveParameters()}>Salvar Alterações da Tabela</button><button className="vcs-btn" onClick={exportCsv}>Exportar Excel / CSV</button><button className="vcs-btn" onClick={()=>importRef.current?.click()}>Importar CSV</button><input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={e=>void importCsv(e)}/><label className="vcs-field erp-field-percent">Reajuste %<input className="erp-field-percent" type="number" step="0.01" value={adjustment} onChange={e=>setAdjustment(e.target.value)}/></label><button className="vcs-btn primary" disabled={saving} onClick={()=>void bulkAdjust()}><RefreshCw size={16}/> Reajuste em lote</button></div></section>
 </>}
 </>}

function Orcamentos({quotes,clients,prices,products,onCreate,onConvert}:{quotes:Quote[];clients:Client[];prices:PriceTable[];products:Product[];onCreate:(c:string,v:string)=>Promise<void>;onConvert:(q:Quote)=>Promise<void>}){
 const [quoteId,setQuoteId]=useState('');
 const [items,setItems]=useState<Array<{id:string;orcamento_id:string;produto_id:string;quantidade:number;preco_unitario:number;desconto_percentual:number;total:number}>>([]);
 const [itemLoading,setItemLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [produto,setProduto]=useState('');
 const [quantidade,setQuantidade]=useState('1');
 const [desconto,setDesconto]=useState('0');
 const [form,setForm]=useState({cliente:'',validade:'',contato:'',vendedorId:'',vendedorNome:'',tabela:'',condicao:'',tipoFrete:'CIF' as 'CIF'|'FOB',frete:'0',outras:'0',termos:'',observacoes:''});
 const selectedQuote=quotes.find(q=>q.id===quoteId);
 const selectedProduct=products.find(p=>p.id===produto);
 const [tableItems,setTableItems]=useState<Array<{produto_id:string;preco:number}>>([]);
 const selectedPrice=tableItems.find(i=>i.produto_id===produto)?.preco ?? selectedProduct?.preco_venda ?? 0;
 const subtotal=items.reduce((s,i)=>s+Number(i.total||0),0);
 const freight=Number(form.frete)||0;
 const other=Number(form.outras)||0;
 const total=subtotal+freight+other;
 const cost=items.reduce((s,i)=>s+Number(products.find(p=>p.id===i.produto_id)?.custo_ultimo||0)*Number(i.quantidade||0),0);
 const margin=subtotal>0?((subtotal-cost)/subtotal)*100:0;

 const loadItems=async(id:string)=>{
  const e=await supabase.rpc('erp_current_empresa_id'); const empresaId=String(e.data||'');
  if(!empresaId)return;
  const r=await supabase.from('erp_vendas_orcamentos_itens').select('id,orcamento_id,produto_id,quantidade,preco_unitario,desconto_percentual,total').eq('orcamento_id',id).eq('empresa_id',empresaId).order('created_at');
  if(!r.error)setItems((r.data??[]) as typeof items);
 };
 const loadTableItems=async(tableId:string)=>{
  if(!tableId){setTableItems([]);return}
  const e=await supabase.rpc('erp_current_empresa_id'); const empresaId=String(e.data||'');
  if(!empresaId)return;
  const r=await supabase.from('erp_tabelas_preco_itens').select('produto_id,preco').eq('empresa_id',empresaId).eq('tabela_preco_id',tableId);
  if(!r.error)setTableItems((r.data??[]) as typeof tableItems);
 };
 const openQuote=async(q:Quote)=>{
  setQuoteId(q.id);
  setForm({
   cliente:q.cliente_id,validade:q.validade??'',contato:q.contato??'',vendedorId:q.vendedor_id??'',vendedorNome:'',
   tabela:q.tabela_preco_id??'',condicao:q.condicao_pagamento??'',tipoFrete:(q.tipo_frete==='FOB'?'FOB':'CIF'),
   frete:String(q.valor_frete??0),outras:String(q.outras_despesas??0),termos:q.termos??'',observacoes:q.observacoes??''
  });
  await Promise.all([loadItems(q.id),loadTableItems(q.tabela_preco_id??'')]);
  const user=await supabase.auth.getUser();
  if(user.data.user){
   const u=await supabase.from('erp_usuarios').select('id,nome').eq('id',q.vendedor_id??user.data.user.id).maybeSingle();
   if(!u.error)setForm(v=>({...v,vendedorNome:u.data?.nome??''}));
  }
 };
 const saveHeader=async(status:'RASCUNHO'|'ENVIADO'= 'RASCUNHO')=>{
  if(!selectedQuote||!form.cliente){return}
  setSaving(true);
  try{
   const payload={cliente_id:form.cliente,validade:form.validade||null,contato:form.contato.trim()||null,vendedor_id:form.vendedorId||null,tabela_preco_id:form.tabela||null,condicao_pagamento:form.condicao.trim()||null,tipo_frete:form.tipoFrete,valor_frete:freight,outras_despesas:other,subtotal,desconto:items.reduce((s,i)=>s+Number(i.preco_unitario*i.quantidade*i.desconto_percentual/100),0),total,margem_percentual:margin,termos:form.termos.trim()||null,observacoes:form.observacoes.trim()||null,status};
   const r=await supabase.from('erp_vendas_orcamentos').update(payload).eq('id',selectedQuote.id);
   if(r.error)throw r.error;
  }catch(e){window.alert(e instanceof Error?e.message:'Não foi possível salvar o orçamento.')}finally{setSaving(false)}
 };
 const addItem=async()=>{
  if(!selectedQuote||!produto||Number(quantidade)<=0||selectedPrice<0)return;
  const d=Number(desconto)||0;if(d<0||d>100)return;
  setItemLoading(true);
  try{
   const empresaId=String((await supabase.rpc('erp_current_empresa_id')).data||'');if(!empresaId)throw new Error('Empresa não identificada.');
   const r=await supabase.from('erp_vendas_orcamentos_itens').insert({empresa_id:empresaId,orcamento_id:selectedQuote.id,produto_id:produto,quantidade:Number(quantidade),preco_unitario:Number(selectedPrice),desconto_percentual:d});
   if(r.error)throw r.error;
   setProduto('');setQuantidade('1');setDesconto('0');await loadItems(selectedQuote.id);
  }catch(e){window.alert(e instanceof Error?e.message:'Não foi possível adicionar o item.')}finally{setItemLoading(false)}
 };
 const removeItem=async(id:string)=>{
  const r=await supabase.from('erp_vendas_orcamentos_itens').delete().eq('id',id);
  if(r.error)window.alert(r.error.message);else if(selectedQuote)await loadItems(selectedQuote.id);
 };
 const printQuote=()=>{
  if(!selectedQuote)return;
  const clientName=clients.find(c=>c.id===form.cliente)?.nome??'Cliente';
  const rows=items.map((i,n)=>{const p=products.find(x=>x.id===i.produto_id);return '<tr><td>'+String(n+1).padStart(2,'0')+'</td><td>'+String(p?.codigo??'')+'</td><td>'+String(p?.nome??'')+'</td><td>'+Number(i.quantidade).toLocaleString('pt-BR')+'</td><td>'+brl(i.preco_unitario)+'</td><td>'+Number(i.desconto_percentual).toFixed(1)+'%</td><td>'+brl(Number(i.total)/Math.max(1,Number(i.quantidade)))+'</td><td>'+brl(i.total)+'</td></tr>'}).join('');
  const w=window.open('','_blank','noopener,noreferrer,width=1100,height=800');if(!w)return;
  w.document.write('<html><head><title>Proposta '+selectedQuote.numero+'</title><style>body{font-family:Arial,sans-serif;color:#123b50;margin:32px}header{border-bottom:2px solid #2d8db8;padding-bottom:14px}h1{margin:0 0 5px;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th,td{padding:7px;border-bottom:1px solid #d7e6eb;text-align:left}th{background:#f1f7f9}.summary{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.total{font-size:18px;font-weight:800;text-align:right;margin-top:12px}.terms{margin-top:24px;white-space:pre-wrap;color:#526a76;font-size:11px}@media print{body{margin:12mm}}</style></head><body><header><div>ERP INDUSTRIAL • VENDAS & COMERCIAL</div><h1>PROPOSTA / ORÇAMENTO Nº '+selectedQuote.numero+'</h1><div>Cliente: '+clientName+' • Validade: '+dateBR(form.validade||null)+'</div></header><table><thead><tr><th>#</th><th>Código</th><th>Descrição</th><th>Qtd</th><th>Preço Tab.</th><th>Desc %</th><th>Preço Líq.</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table><div class="summary"><div>Subtotal: '+brl(subtotal)+'</div><div>Frete '+form.tipoFrete+': '+brl(freight)+'</div><div>Outras despesas: '+brl(other)+'</div><div>Margem bruta: '+margin.toFixed(1)+'%</div></div><div class="total">TOTAL: '+brl(total)+'</div><div class="terms">Termos: '+(form.termos||'—')+'\nObservações: '+(form.observacoes||'—')+'</div><script>window.onload=()=>window.print()<\\/script></body></html>');w.document.close();
 };
 const sendEmail=()=>{
  const c=clients.find(x=>x.id===form.cliente);if(!c?.email){window.alert('O cliente selecionado não possui e-mail cadastrado.');return}
  const subject=encodeURIComponent('Proposta / Orçamento Nº '+(selectedQuote?.numero??''));
  const body=encodeURIComponent('Segue a proposta / orçamento Nº '+(selectedQuote?.numero??'')+'. Valor total: '+brl(total)+'. Validade: '+dateBR(form.validade||null));
  window.location.href='mailto:'+c.email+'?subject='+subject+'&body='+body;
 };
 useEffect(()=>{if(selectedQuote&&!form.vendedorId){void supabase.auth.getUser().then(async u=>{if(u.data.user){setForm(v=>({...v,vendedorId:u.data.user?.id??''}));const r=await supabase.from('erp_usuarios').select('id,nome').eq('id',u.data.user.id).maybeSingle();if(!r.error)setForm(v=>({...v,vendedorNome:r.data?.nome??''}))}})}},[selectedQuote,form.vendedorId]);
 useEffect(()=>{void loadTableItems(form.tabela)},[form.tabela]);

 return <><section className="vcs-section">
  <div className="vcs-section-title"><strong>Elaboração de Proposta / Cotação</strong><span>{selectedQuote?'Orçamento Nº '+String(selectedQuote.numero).padStart(6,'0'):'Selecione um orçamento'}</span></div>
  <div className="vcs-actions">
   {quotes.map(q=><button key={q.id} className={'vcs-btn '+(quoteId===q.id?'primary':'')} onClick={()=>void openQuote(q)}>#{String(q.numero).padStart(6,'0')} • {q.status}</button>)}
  </div>
 </section>
 <section className="vcs-section">
  <div className="vcs-section-title"><strong>Dados do Cabeçalho da Proposta</strong></div>
  {!selectedQuote?<div className="vcs-empty">Selecione um orçamento existente ou crie um novo rascunho acima.</div>:<div className="erp-form-grid" style={{gridTemplateColumns:'minmax(240px,2fr) minmax(180px,1fr) 125px'}}>
   <label className="erp-field-label">Cliente<select value={form.cliente} onChange={e=>setForm(v=>({...v,cliente:e.target.value}))}>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo} • {c.nome}</option>)}</select></label>
   <label className="erp-field-label">Contato<input value={form.contato} onChange={e=>setForm(v=>({...v,contato:e.target.value}))}/></label>
   <label className="erp-field-label">Validade<input className="erp-field-date" type="date" value={form.validade} onChange={e=>setForm(v=>({...v,validade:e.target.value}))}/></label>
   <label className="erp-field-label">Vendedor<input readOnly value={form.vendedorNome||'Usuário autenticado'}/></label>
   <label className="erp-field-label">Tabela de Preço<select value={form.tabela} onChange={e=>setForm(v=>({...v,tabela:e.target.value}))}><option value="">Selecionar</option>{prices.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label>
   <label className="erp-field-label">Condição de Pagamento<input value={form.condicao} onChange={e=>setForm(v=>({...v,condicao:e.target.value}))} placeholder="Ex.: 30 / 60 / 90 dias"/></label>
  </div>}
 </section>
 {selectedQuote&&<><section className="vcs-section">
  <div className="vcs-section-title"><strong>Adicionar Item ao Orçamento</strong></div>
  <div className="erp-form-grid" style={{gridTemplateColumns:'minmax(320px,2fr) 100px 100px 155px 140px'}}>
   <label className="erp-field-label">Produto<select value={produto} onChange={e=>setProduto(e.target.value)}><option value="">Selecionar produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label>
   <label className="erp-field-label">Qtd<input className="erp-field-qty" type="number" min="0.001" step="0.001" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/></label>
   <label className="erp-field-label">Preço Tab.<input className="erp-field-money" readOnly value={brl(selectedPrice)}/></label>
   <label className="erp-field-label">Desc %<input className="erp-field-percent" type="number" min="0" max="100" step="0.1" value={desconto} onChange={e=>setDesconto(e.target.value)}/></label>
   <button className="vcs-btn primary" style={{alignSelf:'end'}} disabled={itemLoading||!produto} onClick={()=>void addItem()}><Plus size={16}/> Adicionar</button>
  </div>
 </section>
 <section className="vcs-section">
  <div className="vcs-section-title"><strong>Itens Cotados</strong><span>{items.length} item(ns)</span></div>
  <DataTable headers={['#','Código','Descrição','Qtd','Preço Tab.','Desc %','Preço Líq.','Total Item','Ações']} rows={items.map((i,n)=>{const p=products.find(x=>x.id===i.produto_id);const liquid=Number(i.preco_unitario)*(1-Number(i.desconto_percentual)/100);return [String(n+1).padStart(2,'0'),p?.codigo??'—',p?.nome??'—',Number(i.quantidade).toLocaleString('pt-BR'),brl(i.preco_unitario),Number(i.desconto_percentual).toFixed(1)+'%',brl(liquid),brl(i.total),<button className="vcs-btn" title="Remover item" onClick={()=>void removeItem(i.id)}>Remover</button>]})}/>
 </section>
 <section className="vcs-section">
  <div className="vcs-section-title"><strong>Resumo Financeiro e Margem</strong></div>
  <div className="erp-form-grid" style={{gridTemplateColumns:'1fr 125px 155px 155px'}}>
   <div className="vcs-card"><span style={{fontSize:12}}>Subtotal Produtos</span><strong>{brl(subtotal)}</strong></div>
   <label className="erp-field-label">Frete<select value={form.tipoFrete} onChange={e=>setForm(v=>({...v,tipoFrete:e.target.value as 'CIF'|'FOB'}))}><option value="CIF">CIF</option><option value="FOB">FOB</option></select></label>
   <label className="erp-field-label">Valor Frete<input className="erp-field-money" type="number" step="0.01" value={form.frete} onChange={e=>setForm(v=>({...v,frete:e.target.value}))}/></label>
   <label className="erp-field-label">Outras Desp.<input className="erp-field-money" type="number" step="0.01" value={form.outras} onChange={e=>setForm(v=>({...v,outras:e.target.value}))}/></label>
  </div>
  <div className="vcs-actions" style={{justifyContent:'flex-end',marginTop:10}}><span>Margem Bruta: <strong>{margin.toFixed(1)}%</strong></span><strong style={{fontSize:18}}>TOTAL: {brl(total)}</strong></div>
 </section>
 <section className="vcs-section">
  <div className="erp-form-grid" style={{gridTemplateColumns:'minmax(360px,1fr) minmax(360px,1fr)'}}>
   <label className="erp-field-label">Termos e Condições<textarea className="erp-field-observation" value={form.termos} onChange={e=>setForm(v=>({...v,termos:e.target.value}))}/></label>
   <label className="erp-field-label">Observações<textarea className="erp-field-observation" value={form.observacoes} onChange={e=>setForm(v=>({...v,observacoes:e.target.value}))}/></label>
  </div>
 </section>
 <section className="vcs-section"><div className="vcs-actions">
  <button className="vcs-btn primary" disabled={saving||!items.length} onClick={()=>void saveHeader('RASCUNHO')}><RefreshCw size={16}/> {saving?'Salvando…':'Salvar Rascunho'}</button>
  <button className="vcs-btn" disabled={!items.length} onClick={printQuote}><FileCheck2 size={16}/> Impressão / PDF</button>
  <button className="vcs-btn" disabled={!items.length} onClick={sendEmail}>Enviar E-mail</button>
  <button className="vcs-btn primary" disabled={!items.length||selectedQuote.status==='CONVERTIDO'} onClick={()=>void onConvert(selectedQuote)}><ShoppingCart size={16}/> Converter em Pedido de Venda</button>
 </div></section></>}
 </>;
}
function Pedidos({orders,clients,orderItems,products,reservations,productionOrders,onReload}:{orders:Order[];clients:Client[];orderItems:OrderItem[];products:Product[];reservations:StockReservation[];productionOrders:ProductionOrder[];onReload:()=>void}){
 const [selectedId,setSelectedId]=useState<string|null>(orders[0]?.id??null)
 const [query,setQuery]=useState('')
 const [status,setStatus]=useState('TODOS')
 const [credit,setCredit]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState<string|null>(null)
 const selected=orders.find(o=>o.id===selectedId)??orders[0]??null
 const filtered=orders.filter(o=>{
   const q=query.trim().toLowerCase()
   const client=clients.find(c=>c.id===o.cliente_id)?.nome??''
   const matches=!q||String(o.numero).includes(q)||client.toLowerCase().includes(q)
   return matches&&(status==='TODOS'||o.status===status)
 })
 const analyze=async(id:string)=>{
   setBusy(id)
   try{
     const r=await supabase.rpc('erp_validar_credito_pedido',{p_pedido_id:id})
     if(r.error)throw r.error
     const data=r.data as {status?:string;motivo?:string}|null
     setCredit(v=>({...v,[id]:data?.status??'—'}))
     onReload()
   }catch(e){setCredit(v=>({...v,[id]:e instanceof Error?e.message:'Falha na análise'}))}
   finally{setBusy(null)}
 }
 const gerarOp=async(itemId:string)=>{
   setBusy(itemId)
   try{
     const r=await supabase.rpc('erp_gerar_op_pedido_item',{p_pedido_item_id:itemId})
     if(r.error)throw r.error
     onReload()
   }catch(e){window.alert(e instanceof Error?e.message:'Não foi possível gerar a OP.')}
   finally{setBusy(null)}
 }
 const selectedItems=selected?orderItems.filter(i=>i.pedido_id===selected.id):[]
 const clientName=selected?clients.find(c=>c.id===selected.cliente_id)?.nome??'—':'—'
 const statusOptions=[['TODOS','Todos'],['em_analise','Em análise'],['reservado','Reservado'],['necessita_producao','Necessita produção'],['parcial','Parcial'],['faturado','Faturado'],['cancelado','Cancelado']] as const
 return <>
  <section className="vcs-section">
   <div className="vcs-section-title">
    <strong>Gestão de Pedidos de Venda</strong>
    <div className="vcs-actions">
     <button className="vcs-btn" onClick={()=>void onReload()}><RefreshCw size={16}/> Atualizar</button>
    </div>
   </div>
   <div className="vcs-pedido-toolbar">
    <label className="vcs-field vcs-pedido-search">Pesquisar Pedido / Cliente<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nº pedido ou cliente"/></label>
    <label className="vcs-field vcs-pedido-status">Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statusOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   </div>
   <div className="vcs-status-filters">{statusOptions.map(([v,l])=><button key={v} className={status===v?'active':''} onClick={()=>setStatus(v)}>{l}</button>)}</div>
  </section>

  <section className="vcs-section vcs-pedidos-layout">
   <div className="vcs-pedidos-list">
    <div className="vcs-list-head"><strong>Listagem de Pedidos ({filtered.length})</strong></div>
    <div className="vcs-list-scroll">
     {filtered.map(o=>{
       const active=o.id===selected?.id
       const client=clients.find(c=>c.id===o.cliente_id)?.nome??'—'
       const creditStatus=credit[o.id]??o.credito_status??'PENDENTE'
       return <button type="button" key={o.id} className={`vcs-order-row ${active?'active':''}`} onClick={()=>setSelectedId(o.id)}>
        <span className="vcs-order-row-top"><b>PV-{String(o.numero).padStart(6,'0')}</b><strong>{brl(o.total)}</strong></span>
        <span className="vcs-order-client">{client}</span>
        <span className="vcs-order-meta"><span>Entrega: {dateBR(o.data_entrega_prometida)}</span><span className={creditStatus==='BLOQUEADO'?'danger':'ok'}>Crédito: {creditStatus}</span></span>
       </button>
     })}
     {!filtered.length&&<div className="vcs-empty">Nenhum pedido real encontrado com os filtros informados.</div>}
    </div>
   </div>

   <div className="vcs-pedido-detail">
    {!selected?<div className="vcs-empty">Selecione um pedido real para consultar o fluxo.</div>:<>
     <div className="vcs-detail-head"><div><strong>Detalhes do Pedido: PV-{String(selected.numero).padStart(6,'0')}</strong><small>{clientName} • Entrada {dateBR(selected.data_entrada)} • Entrega {dateBR(selected.data_entrega_prometida)}</small></div><span className="vcs-badge">{selected.status}</span></div>
     <div className="vcs-pipeline">
      {[
       ['Crédito','credito'],['Reserva / PCP','reserva'],['Produção','producao'],['Faturamento','faturamento'],['Expedição','expedicao']
      ].map(([label,key],idx)=>{
        const s=String(selected.status).toLowerCase()
        const rank=s==='em_analise'?0:s==='reservado'?1:s==='necessita_producao'||s==='parcial'?2:s==='pronto_faturar'?3:s==='faturado'||s==='expedido'?4:-1
        const done=rank>idx||(key==='credito'&&(selected.credito_status==='APROVADO'||credit[selected.id]==='APROVADO'))
        return <div className={`vcs-pipeline-step ${done?'done':''} `} key={key}><span>{idx+1}</span><b>{label}</b></div>
      })}
     </div>
     <div className="vcs-credit-bar">
      <div><b>Crédito</b><span className={selected.credito_status==='BLOQUEADO'?'danger':'ok'}>{credit[selected.id]??selected.credito_status??'PENDENTE'}</span>{selected.credito_motivo&&<small>{selected.credito_motivo}</small>}</div>
      <button className="vcs-btn" disabled={busy===selected.id} onClick={()=>void analyze(selected.id)}><ShieldCheck size={16}/>{busy===selected.id?'Analisando…':'Analisar crédito'}</button>
     </div>
     <div className="vcs-section-inner">
      <div className="vcs-section-title"><strong>Itens do Pedido & Reserva de Estoque</strong><span>{selectedItems.length} item(ns)</span></div>
      <div className="vcs-table"><table><thead><tr><th>Item / Código</th><th className="center">Qtd Pedida</th><th className="center">Estoque Atual</th><th className="center">Qtd Reservada</th><th className="center">Necessidade PCP</th><th className="center">Status</th><th className="center">Ação</th></tr></thead><tbody>
       {selectedItems.map(item=>{
         const product=products.find(p=>p.id===item.produto_id)
         const stock=Number(product?.estoque_atual??0)
         const reserved=reservations.filter(r=>r.pedido_item_id===item.id&&r.status==='ATIVA').reduce((s,r)=>s+Number(r.quantidade||0),0)
         const shortage=Math.max(Number(item.quantidade||0)-reserved,0)
         const op=productionOrders.find(o=>o.pedido_item_id===item.id&& !['cancelada','CANCELADA'].includes(o.status))
         const need=Math.max(shortage,0)
         const statusText=need<=0?'ATENDIDO':op?'OP GERADA':stock>0?'PARCIAL / FALTA':'FALTA'
         return <tr key={item.id}><td><b>{product?.codigo??'—'}</b><span className="vcs-item-desc">{product?.nome??item.descricao??'—'}</span></td><td className="center">{Number(item.quantidade).toLocaleString('pt-BR')}</td><td className="center">{stock.toLocaleString('pt-BR')}</td><td className="center">{reserved.toLocaleString('pt-BR')}</td><td className="center">{need.toLocaleString('pt-BR')}{op&&<small className="vcs-op-ref">{op.numero_op??'OP vinculada'}</small>}</td><td className="center"><span className={`vcs-badge ${statusText==='ATENDIDO'?'ok':'warn'}`}>{statusText}</span></td><td className="center">{need>0&&!op&&<button className="vcs-icon-action" disabled={busy===item.id} title="Gerar Ordem de Produção para este item" onClick={()=>void gerarOp(item.id)}><Factory size={15}/></button>}</td></tr>
       })}
       {!selectedItems.length&&<tr><td colSpan={7}><div className="vcs-empty">Este pedido não possui itens carregados.</div></td></tr>}
      </tbody></table></div>
     </div>
     <div className="vcs-pedido-actions">
      <button className="vcs-btn" onClick={()=>window.location.href='/nfe-emissao'} disabled={selected.credito_status!=='APROVADO' || selected.status==='faturado'}><FileCheck2 size={16}/> Gerar NF-e / Faturar</button>
      <button className="vcs-btn" onClick={()=>window.location.href='/pcp'} disabled={!selectedItems.some(i=>{const r=reservations.filter(x=>x.pedido_item_id===i.id&&x.status==='ATIVA').reduce((s,x)=>s+Number(x.quantidade||0),0);return Number(i.quantidade)>r})}><Factory size={16}/> Abrir PCP</button>
      <button className="vcs-btn" onClick={()=>window.location.href='/expedicao/roteirizacao'} disabled={selected.status!=='faturado'}><Truck size={16}/> Solicitar Expedição</button>
     </div>
    </>}
   </div>
  </section>
 </>}

function Faturamento({nfes}:{nfes:Nfe[]}){return <><section className="vcs-section"><div className="vcs-section-title"><strong>Faturamento & NF-e</strong><button className="vcs-btn primary" onClick={()=>window.location.href='/nfe-emissao'}><FileCheck2 size={16}/> Abrir emissão NF-e</button></div><p style={{fontSize:12,color:'#617984'}}>Somente NF-e reais da empresa atual são exibidas. A transmissão SEFAZ permanece no fluxo fiscal existente; esta central não simula autorização.</p></section><section className="vcs-section"><DataTable headers={['NF-e','Série','Destinatário','Status','Valor','Emissão','Chave / erro']} rows={nfes.map(n=>[n.numero??'—',n.serie,n.destinatario_nome,n.status,brl(n.valor_total),dateBR(n.data_emissao),n.chave_acesso??n.mensagem_sefaz??'—'])}/></section></>}

function Expedicao({romaneios}:{romaneios:Romaneio[]}){return <><section className="vcs-section"><div className="vcs-section-title"><strong>Expedição & Romaneiro</strong><button className="vcs-btn primary" onClick={()=>window.location.href='/expedicao/roteirizacao'}><PackageCheck size={16}/> Abrir expedição</button></div><p style={{fontSize:12,color:'#617984'}}>A saída deve permanecer bloqueada enquanto houver volumes divergentes. O romaneio usa dados reais de expedição.</p></section><section className="vcs-section"><DataTable headers={['Romaneio','Status','Transportadora','Peso','Data']} rows={romaneios.map(r=>[String(r.numero),r.status,r.transportadora??'—',`${Number(r.peso_total_kg||0).toLocaleString('pt-BR')} kg`,dateBR(r.data_expedicao)])}/></section></>}

function Comissoes({rules,launches}:{rules:CommissionRule[];launches:CommissionLaunch[]}){const [busy,setBusy]=useState(false);const generateAP=async()=>{setBusy(true);try{const r=await supabase.rpc('erp_gerar_contas_pagar_comissoes',{p_data:new Date().toISOString().slice(0,10)});if(r.error)throw r.error;window.alert('Contas a pagar de comissão processadas.');}catch(e){window.alert(e instanceof Error?e.message:'Falha ao gerar contas a pagar.')}finally{setBusy(false)}};return <><section className="vcs-section"><div className="vcs-section-title"><strong>Regras comerciais de comissão</strong><span>{rules.length} regra(s)</span></div><DataTable headers={['Regra','Tipo','Percentual','Margem mínima','Por recebimento','Status']} rows={rules.map(r=>[r.nome,r.tipo,`${Number(r.percentual).toFixed(2)}%`,r.margem_minima==null?'—':`${Number(r.margem_minima).toFixed(2)}%`,r.por_recebimento?'SIM':'NÃO',r.ativo?'ATIVA':'INATIVA'])}/></section><section className="vcs-section"><div className="vcs-section-title"><strong>Lançamentos de comissão</strong><button className="vcs-btn primary" disabled={busy} onClick={()=>void generateAP()}><Plus size={16}/> {busy?'Processando…':'Gerar Contas a Pagar'}</button></div><DataTable headers={['Data','Receita base','Percentual','Comissão','Status']} rows={launches.map(l=>[dateBR(l.data_referencia),brl(l.receita_base),`${Number(l.percentual).toFixed(2)}%`,brl(l.valor_comissao),l.status])}/></section></>}

function Rma({clients,devolucoes,onCreate}:{clients:Client[];devolucoes:Array<{id:string;numero:number;cliente_id:string;tipo:string;motivo:string;status:string;tratamento_sgq:string;valor_credito:number}>;onCreate:(c:string,r:string)=>Promise<void>}){const [action,setAction]=useState<Record<string,string>>({});const treat=async(id:string)=>{const a=action[id]||'QUARENTENA';const r=await supabase.rpc('erp_registrar_tratamento_rma',{p_devolucao_id:id,p_acao_sgq:a,p_observacao:null});if(r.error)window.alert(r.error.message);};
 const [client,setClient]=useState('');const [reason,setReason]=useState('')
 return <><section className="vcs-section"><div className="vcs-section-title"><strong>Nova devolução / troca / garantia RMA</strong></div><div className="vcs-form"><label className="vcs-field wide">Cliente<select value={client} onChange={e=>setClient(e.target.value)}><option value="">Selecionar</option>{clients.map(c=><option key={c.id} value={c.id}>{c.codigo} • {c.nome}</option>)}</select></label><label className="vcs-field wide">Motivo<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Descreva o motivo para análise comercial e SGQ."/></label><div><button className="vcs-btn primary" style={{marginTop:20}} onClick={()=>void onCreate(client,reason)}><Plus size={16}/> Abrir RMA</button></div></div></section><section className="vcs-section"><strong>RMA registrados</strong><DataTable headers={['RMA','Cliente','Tipo','Motivo','Status','SGQ','Crédito','Tratamento']} rows={devolucoes.map(d=>[String(d.numero).padStart(6,'0'),clients.find(c=>c.id===d.cliente_id)?.nome??'—',d.tipo,d.motivo,d.status,d.tratamento_sgq,brl(d.valor_credito),<div className="vcs-actions"><select value={action[d.id]??d.tratamento_sgq} onChange={e=>setAction(v=>({...v,[d.id]:e.target.value}))}><option>QUARENTENA</option><option>RETRABALHO</option><option>SUCATA</option><option>LIBERACAO</option></select><button className="vcs-btn" onClick={()=>void treat(d.id)}>Registrar SGQ</button></div>])}/></section><section className="vcs-section"><strong>Regra de tratamento</strong><p style={{fontSize:12,color:'#617984'}}>Todo RMA novo entra em <b>QUARENTENA</b>. Depois, a análise do SGQ define liberação, retrabalho ou sucata. O crédito/refund só deve ocorrer após o tratamento fiscal e financeiro correspondente.</p></section></>
}

function DataTable({headers,rows}:{headers:string[];rows:Array<Array<ReactNode>>}){return <div className="vcs-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length}><div className="vcs-empty">Nenhum registro real encontrado para a empresa atual.</div></td></tr>}</tbody></table></div>}
