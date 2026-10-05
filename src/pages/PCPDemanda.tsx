import { useEffect, useMemo, useState } from 'react'
import { Calculator, RefreshCw, Factory, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Product = { id:string; codigo:string; nome:string; estoque_minimo:number; estoque_atual:number }
type Row = Product & { pedido:number; reservado:number; emProducao:number; disponivel:number; necessidade:number; pedidosIds:string[] }
type SalesOrder = { id:string; status:string; data_entrada:string|null; data_entrega_prometida:string|null }
type SalesItem = { pedido_id:string; produto_id:string; quantidade:number }
type Reservation = { pedido_venda_id:string|null; produto_id:string; quantidade:number; status:string }
type ProductionOrder = { produto_id:string|null; quantidade_planejada:number|null; status:string }
const activeOrderStatus = (status:string) => ['aguardando produção','aprovado','liberado para produção'].includes(status.trim().toLowerCase())

export default function PCPDemanda(){
 const [rows,setRows]=useState<Row[]>([]),[periodo,setPeriodo]=useState(new Date().toISOString().slice(0,7)),[loading,setLoading]=useState(true),[processing,setProcessing]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function load(){
  setLoading(true);setError('');setMessage('')
  try{
   const tenant=await supabase.rpc('erp_current_empresa_id')
   if(tenant.error||!tenant.data)throw tenant.error||new Error('Empresa ERP não identificada.')
   const empresaId=String(tenant.data)
   const [products,orders,items,reservations,productionOrders]=await Promise.all([
    fetchAllPages<Product>((from,to)=>supabase.from('erp_produtos').select('id,codigo,nome,estoque_minimo,estoque_atual',{count:'exact'}).eq('empresa_id',empresaId).eq('ativo',true).order('codigo').range(from,to)),
    fetchAllPages<SalesOrder>((from,to)=>supabase.from('erp_pedidos_venda').select('id,status,data_entrada,data_entrega_prometida',{count:'exact'}).eq('empresa_id',empresaId).order('data_entrada',{ascending:false}).range(from,to)),
    fetchAllPages<SalesItem>((from,to)=>supabase.from('erp_pedidos_venda_itens').select('pedido_id,produto_id,quantidade',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
    fetchAllPages<Reservation>((from,to)=>supabase.from('erp_estoque_reservas').select('pedido_venda_id,produto_id,quantidade,status',{count:'exact'}).eq('empresa_id',empresaId).range(from,to)),
    fetchAllPages<ProductionOrder>((from,to)=>supabase.from('erp_ordens_producao').select('produto_id,quantidade_planejada,status',{count:'exact'}).eq('empresa_id',empresaId).range(from,to))
   ])
   const validOrders=new Map(orders.filter(o=>{const date=o.data_entrega_prometida??o.data_entrada??'';return activeOrderStatus(o.status)&&(!date||date.startsWith(periodo))}).map(o=>[o.id,o]))
   const pedido:Record<string,number>={}, pedidosIds:Record<string,string[]>={}
   for(const x of items){const pid=x.pedido_id,prod=x.produto_id;if(!validOrders.has(pid)||!prod)continue;pedido[prod]=(pedido[prod]??0)+Number(x.quantidade??0);pedidosIds[prod]??=[];if(!pedidosIds[prod].includes(pid))pedidosIds[prod].push(pid)}
   const emProducao:Record<string,number>={};for(const x of productionOrders){const status=String(x.status??'').toLowerCase();if(['cancelado','cancelada','concluido','concluída','concluida','finalizado','finalizada'].includes(status))continue;const prod=String(x.produto_id??'');if(prod)emProducao[prod]=(emProducao[prod]??0)+Number(x.quantidade_planejada??0)}
   const reservado:Record<string,number>={}
   for(const x of reservations){const status=String(x.status??'').toLowerCase();if(['cancelado','cancelada','liberado','liberada'].includes(status))continue;const prod=String(x.produto_id??'');if(prod)reservado[prod]=(reservado[prod]??0)+Number(x.quantidade??0)}
   setRows(products.map(p=>{const pedidoQty=pedido[p.id]??0,reservaQty=reservado[p.id]??0,producaoQty=emProducao[p.id]??0,disponivel=Math.max(0,Number(p.estoque_atual||0)-reservaQty),necessidade=Math.max(0,pedidoQty+Number(p.estoque_minimo||0)-disponivel-producaoQty);return {...p,pedido:pedidoQty,reservado:reservaQty,emProducao:producaoQty,disponivel,necessidade,pedidosIds:pedidosIds[p.id]??[]}}).filter(r=>r.pedido>0||r.necessidade>0))
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível calcular a demanda real.')}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[periodo])
 const totalFabricar=useMemo(()=>rows.reduce((s,r)=>s+r.necessidade,0),[rows]),deficitRows=useMemo(()=>rows.filter(r=>r.necessidade>0),[rows])
 async function gerarLote(){
  const targetRows=deficitRows
  if(!targetRows.length){setMessage('Não há necessidade líquida positiva para gerar OPs.');return}
  setProcessing(true);setError('');setMessage('')
  let created=0
  try{
   for(const row of targetRows){
    const pedidoId=row.pedidosIds.length===1?row.pedidosIds[0]:null
    const createdOrder=await supabase.rpc('erp_criar_ordem_producao_v2',{p_produto_id:row.id,p_quantidade:row.necessidade,p_pedido_venda_id:pedidoId,p_maquina_id:null,p_velocidade_nominal_hora:null,p_operacao_dupla:false})
    if(createdOrder.error)throw createdOrder.error
    const order=Array.isArray(createdOrder.data)?createdOrder.data[0] as {id:string;numero_op:number}|undefined:undefined
    if(!order)throw new Error('A criação da OP não retornou número e identificador.')
    created++
    const mrp=await supabase.rpc('erp_mrp_explodir',{p_produto_id:row.id,p_quantidade:row.necessidade,p_demanda_ref:`PCP_DEMANDA_${periodo}_OP_${order.numero_op}`});if(mrp.error)throw mrp.error
   }
   setMessage(created+' OP(s) gerada(s) com numeração transacional e MRP vinculado por OP. Quando houver vários pedidos para o mesmo produto, a OP fica sem pedido único para preservar rastreabilidade.')
   await load()
  }catch(e){
   const detail=e instanceof Error?e.message:'Não foi possível gerar as OPs do lote.'
   if(created>0){await load();setError(`${detail} ${created} OP(s) foram criadas antes da falha; as necessidades foram recalculadas.`)}
   else setError(detail)
  }finally{setProcessing(false)}
 }

 return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto max-w-[1600px] space-y-5">
  <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4"><div><p className="text-sm font-black uppercase tracking-wide text-sky-700">MÓDULO: PCP › PLANEJAMENTO</p><h1 className="text-2xl font-black">Plano de Demanda Líquida</h1><p className="mt-1 text-base text-slate-600">Carteira real de vendas + reservas + estoque físico + estoque mínimo.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} className="flex h-[54px] items-center gap-2 rounded-md border border-slate-300 bg-white px-4 font-black"><RefreshCw size={19}/> RECALCULAR NECESSIDADES</button><button type="button" onClick={()=>void gerarLote()} disabled={processing||loading||deficitRows.length===0} className="flex h-[54px] items-center gap-2 rounded-md bg-sky-700 px-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Factory size={19}/> {processing?'GERANDO...':'GERAR ORDENS DE PRODUÇÃO LOTE'}</button></div></header>
  {(message||error)&&<div className={error?'rounded-md border border-rose-300 bg-rose-50 p-4 font-bold text-rose-800':'rounded-md border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800'}>{error||message}</div>}
  <section className="grid gap-4 md:grid-cols-3"><article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-black text-slate-500">PRODUTOS COM DEMANDA</span><strong className="mt-1 block text-3xl">{rows.length}</strong></article><article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-black text-slate-500">NECESSIDADE LÍQUIDA</span><strong className="mt-1 block text-3xl">{totalFabricar.toLocaleString('pt-BR')}</strong></article><article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><label className="text-sm font-black text-slate-700">PERÍODO DO PLANO<input type="month" value={periodo} onChange={e=>setPeriodo(e.target.value)} className="mt-2 h-[54px] w-full rounded-md border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900"/></label></article></section>
  <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4"><Calculator size={21} className="text-sky-700"/><div><h2 className="text-xl font-black">CÁLCULO DE NECESSIDADES DE FABRICAÇÃO</h2><p className="text-sm font-semibold text-slate-600">Linhas operacionais de 54px • somente dados encontrados no Supabase.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-base"><thead className="bg-slate-100 text-left text-sm font-black uppercase text-slate-800"><tr><th className="h-[54px] px-4">Produto</th><th className="px-4 text-right">Pedido</th><th className="px-4 text-right">Estoque Físico</th><th className="px-4 text-right">Reservado</th><th className="px-4 text-right">Em OP</th><th className="px-4 text-right">Estoque Mín.</th><th className="px-4 text-right">Necessidade Líq.</th><th className="px-4">Situação</th></tr></thead><tbody>{loading?<tr><td colSpan={8} className="p-10 text-center font-bold">Consultando carteira, reservas e estoque reais...</td></tr>:rows.length===0?<tr><td colSpan={8} className="p-10 text-center font-bold text-slate-600">Nenhuma demanda real encontrada para os produtos ativos.</td></tr>:rows.map(r=><tr key={r.id} className="border-t border-slate-200"><td className="h-[54px] px-4"><strong>{r.codigo}</strong><span className="ml-3 text-slate-600">{r.nome}</span></td><td className="px-4 text-right font-semibold">{r.pedido.toLocaleString('pt-BR')}</td><td className="px-4 text-right">{r.estoque_atual.toLocaleString('pt-BR')}</td><td className="px-4 text-right">{r.reservado.toLocaleString('pt-BR')}</td><td className="px-4 text-right">{r.emProducao.toLocaleString('pt-BR')}</td><td className="px-4 text-right">{r.estoque_minimo.toLocaleString('pt-BR')}</td><td className="px-4 text-right font-black">{r.necessidade.toLocaleString('pt-BR')}</td><td className="px-4">{r.necessidade>0?<span className="inline-flex items-center gap-2 font-black text-amber-700"><AlertTriangle size={18}/> FABRICAR</span>:<span className="inline-flex items-center gap-2 font-black text-emerald-700"><CheckCircle2 size={18}/> GARANTIDO</span>}</td></tr>)}</tbody></table></div></section>
 </div></main>
}