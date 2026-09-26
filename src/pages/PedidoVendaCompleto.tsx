/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-050
 * Alterações: Corrigir referências antigas qtd para o campo estrito quantidade.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-036
 * Alterações: Eliminar any da coleção de pedidos e do atualizador de itens, usando tipos Order e valores estritos.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabaseClient'
import {Plus,Trash2,Search,RefreshCw,CheckCircle2} from 'lucide-react'
type Client={id:string;nome:string;documento:string|null};type Product={id:string;codigo:string;nome:string;estoque_atual:number;preco_venda:number;unidade:string}
type Item={produto_id:string;codigo:string;descricao:string;quantidade:string;valor:string;estoque:number;reservado:boolean;produzir:boolean;reservadoQtd:number;produzirQtd:number}
type Order={id:string;numero:number;status:string;total:number;data_entrega_prometida:string|null;cliente_id:string}
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
export default function PedidoVendaCompleto(){
 const[empresa,setEmpresa]=useState(''),[savedOrderId,setSavedOrderId]=useState(''),[clients,setClients]=useState<Client[]>([]),[products,setProducts]=useState<Product[]>([]),[orders,setOrders]=useState<Order[]>([]),[client,setClient]=useState(''),[clientDoc,setClientDoc]=useState(''),[number,setNumber]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[delivery,setDelivery]=useState(''),[items,setItems]=useState<Item[]>([]),[draft,setDraft]=useState({produto:'',qtd:'1',valor:'0'}),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('')
 const load=async()=>{setErr('');const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada');const id=String(e.data);setEmpresa(id);const [c,p,o]=await Promise.all([supabase.from('erp_clientes').select('id,nome,documento').eq('empresa_id',id).eq('ativo',true).order('nome'),supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,preco_venda,unidade').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),supabase.from('erp_pedidos_venda').select('id,numero,status,total,data_entrega_prometida,cliente_id').eq('empresa_id',id).order('numero',{ascending:false}).limit(100)]);for(const x of[c,p,o])if(x.error)throw x.error;setClients(c.data||[]);setProducts(p.data||[]);setOrders(o.data||[]);setNumber(String((Number(o.data?.[0]?.numero||0)+1)).padStart(6,'0'))}
 useEffect(()=>{void load().catch(e=>setErr(e.message))},[])
 const selected=products.find(p=>p.id===draft.produto)
 const total=useMemo(()=>items.reduce((s,i)=>s+Number(i.quantidade)*Number(i.valor),0),[items])
 const needs=items.filter(i=>i.produzirQtd>0)
 const prodItems=items.filter(i=>i.produzirQtd>0)
 function choose(id:string){const p=products.find(x=>x.id===id);if(!p)return;setDraft({...draft,produto:id,valor:String(p.preco_venda||0)})}
 function add(){if(!selected||Number(draft.qtd)<=0)return;setItems([...items,{produto_id:selected.id,codigo:selected.codigo,descricao:selected.nome,quantidade:draft.qtd,valor:draft.valor||String(selected.preco_venda||0),estoque:Number(selected.estoque_atual||0),reservado:false,produzir:Number(draft.qtd)>Number(selected.estoque_atual||0),reservadoQtd:0,produzirQtd:Math.max(0,Number(draft.qtd)-Number(selected.estoque_atual||0))}]);setDraft({produto:'',qtd:'1',valor:'0'})}
  async function save(){
  if(!empresa||!client||!items.length){setErr('Cliente e pelo menos um item são obrigatórios.');return}
  setBusy(true);setErr('');setMsg('')
  try{
    const result=await supabase.rpc('erp_finalizar_pedido_planejado',{
      p_cliente_id:client,
      p_data_entrada:date,
      p_data_entrega:delivery||null,
      p_itens:items.map(item=>({
        produto_id:item.produto_id,
        codigo:item.codigo,
        quantidade:Number(item.quantidade),
        valor_unitario:Number(item.valor)
      }))
    })
    if(result.error) throw result.error
    setSavedOrderId(String(result.data))
    setMsg('Pedido finalizado. O estoque disponível foi reservado e somente a necessidade líquida foi enviada ao PCP como OP.')
    setItems(items.map(item=>({
      ...item,
      reservado:item.produzirQtd===0,
      reservadoQtd:item.produzirQtd===0?Number(item.quantidade):Math.max(0,Number(item.quantidade)-item.produzirQtd),
      produzir:item.produzirQtd>0
    })))
    await load()
  }catch(error){
    setErr(error instanceof Error?error.message:'Falha ao finalizar pedido e gerar o fluxo operacional.')
  }finally{
    setBusy(false)
  }
}
 async function reserve(item:Item){setErr('A reserva é criada automaticamente quando o pedido é finalizado.');setMsg('Use “Finalizar pedido” para reservar o estoque disponível e gerar apenas a necessidade líquida de produção.');}\n return <main className="erp-page-v3" style={{maxWidth:1550,margin:'0 auto',padding:24}}><header className="erp-page-header-v3"><div><span className="erp-eyebrow">COMERCIAL • VENDAS</span><h1>Novo Pedido de Venda</h1><p>Pedido completo: cliente → análise de disponibilidade → reserva → necessidade líquida → OP → PCP.</p></div><button className="erp-btn-secondary" onClick={()=>void load()}><RefreshCw/>Atualizar</button></header>
 {(msg||err)&&<div className={err?'error':'notice'}>{err||msg}</div>}
 <section className="erp-card-v3" style={{padding:20}}><div className="grid md:grid-cols-5 gap-4"><label>Nº Pedido<input value={number} readOnly/></label><label>Data<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="md:col-span-2">Cliente<select value={client} onChange={e=>{setClient(e.target.value);setClientDoc(clients.find(c=>c.id===e.target.value)?.documento||'')}}><option value="">Selecione o cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label>Documento<input value={clientDoc} readOnly/></label><label>Data de entrega<input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/></label></div>
 <div className="grid md:grid-cols-6 gap-3 mt-5 items-end"><label className="md:col-span-3">Código interno / Produto<select value={draft.produto} onChange={e=>choose(e.target.value)}><option value="">Digite/selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label><label>Quantidade<input type="number" min="1" value={draft.qtd} onChange={e=>setDraft({...draft,qtd:e.target.value})}/></label><label>Valor unitário<input type="number" step="0.01" value={draft.valor} onChange={e=>setDraft({...draft,valor:e.target.value})}/></label><button className="erp-btn-primary" onClick={add}><Plus/>Adicionar item</button></div>
 {selected&&<div className="mt-3 p-4 rounded-xl bg-slate-50 border"><b>{selected.codigo} • {selected.nome}</b><span className="ml-5">Estoque físico: <strong>{selected.estoque_atual} {selected.unidade}</strong></span>{Number(draft.qtd)<=Number(selected.estoque_atual)?<span className="ml-5 text-emerald-700 font-bold">🟢 Disponível para reserva</span>:<span className="ml-5 text-amber-700 font-bold">🟠 Estoque parcial → necessidade líquida será produzida</span>}</div>}
 <div className="erp-table-scroll mt-5"><table className="erp-table-v3"><thead><tr><th>Código</th><th>Descrição</th><th>Qtd.</th><th>Estoque</th><th>Valor</th><th>Total</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{items.map((i,n)=><tr key={n}><td>{i.codigo}</td><td>{i.descricao}</td><td>{i.quantidade}</td><td>{i.estoque}</td><td>{money(Number(i.valor))}</td><td>{money(Number(i.quantidade)*Number(i.valor))}</td><td>{i.reservadoQtd>=Number(i.quantidade)?<span className="text-emerald-700 font-bold">🟢 RESERVAR {i.reservadoQtd}</span>:i.produzirQtd>0?<span className="text-amber-700 font-bold">🟠 PRODUZIR {i.produzirQtd}</span>:<span className="text-slate-600">Analisar</span>}</td><td className="flex gap-2">{i.reservado&&<span className="inline-flex items-center gap-1 text-emerald-700 font-bold">✓ Reservado {i.reservadoQtd}</span>}{i.produzirQtd>0&&<span className="inline-flex items-center gap-1 text-amber-700 font-bold">⚙ Produzir {i.produzirQtd}</span>}<button className="erp-btn-secondary" onClick={()=>setItems(items.filter((_,x)=>x!==n))}><Trash2/></button></td></tr>)}{!items.length&&<tr><td colSpan={8}>Adicione os produtos do pedido.</td></tr>}</tbody></table></div>
 <div className="flex justify-between items-center mt-5 p-4 rounded-xl bg-slate-50 border"><div><b>Total do pedido: {money(total)}</b><div className="text-sm text-slate-500">Itens para produção: {prodItems.length} • Itens com saldo insuficiente: {needs.length}</div></div><div className="flex gap-3"><button className="erp-btn-primary" disabled={busy||!items.length} onClick={()=>void save()}><CheckCircle2/>{busy?'Finalizando…':'Finalizar pedido e enviar fluxo'}</button></div></div></section>
 <section className="erp-card-v3 mt-5" style={{padding:20}}><h2>Pedidos recentes</h2><div className="erp-table-scroll"><table className="erp-table-v3"><thead><tr><th>Pedido</th><th>Status</th><th>Total</th><th>Entrega</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>PV-{o.numero}</td><td>{o.status}</td><td>{money(Number(o.total))}</td><td>{o.data_entrega_prometida||'—'}</td></tr>)}</tbody></table></div></section>
 </main>
}
