/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026
 * Desenvolvedor: FernandoSch
 * ID da Revisão: REV-074
 * Alterações: Reestruturação do Pedido de Venda para digitação industrial
 * rápida, formulário compacto, tabela densa e badges de status.
 * =========================================================================
 */

import {useEffect,useMemo,useState} from 'react'
import {supabase} from '../lib/supabaseClient'
import {Plus,Save,Trash2,PackageCheck,Factory,RefreshCw} from 'lucide-react'

type Client={id:string;nome:string;documento:string|null}
type Product={id:string;codigo:string;nome:string;estoque_atual:number;preco_venda:number;unidade:string}
type Item={produto_id:string;codigo:string;descricao:string;quantidade:string;valor:string;estoque:number;reservado:boolean;produzir:boolean}
type Order={id:string;numero:number;status:string;total:number;data_entrega_prometida:string|null;cliente_id:string}

const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

export default function PedidoVendaCompleto(){
 const[empresa,setEmpresa]=useState('')
 const[savedOrderId,setSavedOrderId]=useState('')
 const[clients,setClients]=useState<Client[]>([])
 const[products,setProducts]=useState<Product[]>([])
 const[orders,setOrders]=useState<Order[]>([])
 const[client,setClient]=useState('')
 const[clientDoc,setClientDoc]=useState('')
 const[number,setNumber]=useState('')
 const[date,setDate]=useState(new Date().toISOString().slice(0,10))
 const[delivery,setDelivery]=useState('')
 const[items,setItems]=useState<Item[]>([])
 const[draft,setDraft]=useState({produto:'',qtd:'1',valor:'0'})
 const[busy,setBusy]=useState(false)
 const[msg,setMsg]=useState('')
 const[err,setErr]=useState('')

 const load=async()=>{
  setErr('')
  const e=await supabase.rpc('erp_current_empresa_id')
  if(e.error||!e.data)throw e.error??new Error('Empresa não identificada')
  const id=String(e.data)
  setEmpresa(id)
  const[c,p,o]=await Promise.all([
   supabase.from('erp_clientes').select('id,nome,documento').eq('empresa_id',id).eq('ativo',true).order('nome'),
   supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,preco_venda,unidade').eq('empresa_id',id).eq('ativo',true).order('codigo').limit(2000),
   supabase.from('erp_pedidos_venda').select('id,numero,status,total,data_entrega_prometida,cliente_id').eq('empresa_id',id).order('numero',{ascending:false}).limit(100)
  ])
  for(const x of[c,p,o])if(x.error)throw x.error
  setClients(c.data||[])
  setProducts(p.data||[])
  setOrders(o.data||[])
  setNumber(String((Number(o.data?.[0]?.numero||0)+1)).padStart(6,'0'))
 }

 useEffect(()=>{void load().catch(e=>setErr(e instanceof Error?e.message:'Falha ao carregar dados.'))},[])

 const selected=products.find(p=>p.id===draft.produto)
 const total=useMemo(()=>items.reduce((s,i)=>s+Number(i.quantidade)*Number(i.valor),0),[items])
 const needs=items.filter(i=>Number(i.quantidade)>i.estoque&&!i.produzir)
 const prodItems=items.filter(i=>i.produzir||Number(i.quantidade)>i.estoque)

 function choose(id:string){
  const p=products.find(x=>x.id===id)
  if(!p)return
  setDraft({...draft,produto:id,valor:String(p.preco_venda||0)})
 }

 function add(){
  if(!selected||Number(draft.qtd)<=0)return
  setItems([...items,{
   produto_id:selected.id,
   codigo:selected.codigo,
   descricao:selected.nome,
   quantidade:draft.qtd,
   valor:draft.valor||String(selected.preco_venda||0),
   estoque:Number(selected.estoque_atual||0),
   reservado:false,
   produzir:Number(draft.qtd)>Number(selected.estoque_atual||0)
  }])
  setDraft({produto:'',qtd:'1',valor:'0'})
 }

 function update(i:number,k:keyof Item,v:string|number|boolean){
  setItems(x=>x.map((a,n)=>n===i?{...a,[k]:v}:a))
 }

 async function save(){
  if(!empresa||!client||!items.length){
   setErr('Cliente e pelo menos um item são obrigatórios.')
   return
  }
  setBusy(true)
  setErr('')
  try{
   const p=await supabase.from('erp_pedidos_venda').insert({
    empresa_id:empresa,
    numero:Number(number),
    cliente_id:client,
    status:'Pendente',
    total,
    created_at:new Date(date).toISOString(),
    data_entrega_prometida:delivery||null
   }).select('id,numero').single()
   if(p.error)throw p.error
   const rows=items.map(i=>({
    empresa_id:empresa,
    pedido_id:p.data.id,
    produto_id:i.produto_id,
    descricao:i.descricao,
    quantidade:Number(i.quantidade),
    valor_unitario:Number(i.valor),
    desconto:0,
    total:Number(i.quantidade)*Number(i.valor)
   }))
   const ins=await supabase.from('erp_pedidos_venda_itens').insert(rows).select('id,produto_id,quantidade')
   if(ins.error)throw ins.error
   setSavedOrderId(p.data.id)
   setMsg('Pedido '+p.data.numero+' gravado. Reserve o estoque disponível ou gere OP para os itens sem saldo.')
   setItems(items.map(i=>({...i,reservado:false})))
   await load()
  }catch(e){
   setErr(e instanceof Error?e.message:'Falha ao gravar pedido.')
  }finally{
   setBusy(false)
  }
 }

 async function reserve(item:Item){
  const last=savedOrderId?{id:savedOrderId}:orders.find(o=>Number(o.numero)===Number(number))
  if(!last){setErr('Grave o pedido antes de reservar.');return}
  const pi=await supabase.from('erp_pedidos_venda_itens').select('id').eq('pedido_id',last.id).eq('produto_id',item.produto_id).maybeSingle()
  if(pi.error||!pi.data){setErr(pi.error?.message||'Item não encontrado.');return}
  const r=await supabase.from('erp_estoque_reservas').insert({
   empresa_id:empresa,
   pedido_venda_id:last.id,
   pedido_item_id:pi.data.id,
   produto_id:item.produto_id,
   quantidade:Number(item.quantidade)
  })
  if(r.error)setErr(r.error.message)
  else{
   setMsg('Estoque reservado para '+item.codigo+'.')
   setItems(items.map(i=>i===item?{...i,reservado:true}:i))
  }
 }

 async function generateOP(){
  const last=savedOrderId?{id:savedOrderId}:orders.find(o=>Number(o.numero)===Number(number))
  if(!last){setErr('Grave o pedido antes de gerar OP.');return}
  setBusy(true)
  try{
   for(const i of prodItems){
    const op=await supabase.from('erp_ordens_producao').insert({
     empresa_id:empresa,
     numero_op:'OP-'+number+'-'+i.codigo,
     produto_id:i.produto_id,
     quantidade:Number(i.quantidade),
     status:'Aguardando PCP',
     pedido_venda_id:last.id,
     data_prevista:delivery||null,
     observacoes:'Gerada automaticamente pelo Pedido de Venda'
    })
    if(op.error)throw op.error
   }
   setMsg('Ordens de produção criadas e encaminhadas ao PCP.')
  }catch(e){
   setErr(e instanceof Error?e.message:'Falha ao gerar OP.')
  }finally{
   setBusy(false)
  }
 }

 return <main className="pv-industrial-page">
  <style>{`
   .pv-industrial-page{max-width:1500px;margin:0 auto;padding:14px 20px 24px;background:#f8fafc;color:#0f172a;min-height:100%}
   .pv-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}
   .pv-header h1{margin:2px 0 3px;font-size:22px;line-height:1.15;color:#0f172a}
   .pv-header p{margin:0;font-size:11px;color:#64748b}
   .pv-eyebrow{font-size:9px;font-weight:900;letter-spacing:.13em;color:#1e3a8a}
   .pv-card{background:#fff;border:1px solid #d7e2e8;border-radius:9px;box-shadow:0 3px 12px rgba(15,23,42,.045);padding:14px}
   .pv-form{display:grid;gap:10px}
   .pv-row{display:grid;gap:10px;align-items:end}
   .pv-row-main{grid-template-columns:minmax(0,7fr) minmax(170px,3fr)}
   .pv-row-item{grid-template-columns:minmax(0,6fr) minmax(110px,2fr) minmax(150px,2fr)}
   .pv-field{display:flex;flex-direction:column;gap:4px;min-width:0}
   .pv-field label{font-size:10px;font-weight:800;color:#475569}
   .pv-field input,.pv-field select{box-sizing:border-box;width:100%;height:34px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a;font-size:12px;outline:0;transition:border-color .15s,box-shadow .15s}
   .pv-field input:focus,.pv-field select:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
   .pv-field input[readonly]{background:#f8fafc;color:#475569}
   .pv-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
   .pv-action-left,.pv-action-right{display:flex;align-items:center;gap:7px}
   .pv-btn{height:32px;padding:0 11px;border-radius:6px;border:1px solid #cbd5e1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:10px;font-weight:800;cursor:pointer}
   .pv-btn svg{width:14px;height:14px}
   .pv-btn-primary{background:#2563eb;border-color:#2563eb;color:#fff}
   .pv-btn-secondary{background:#fff;color:#334155}
   .pv-btn:disabled{opacity:.5;cursor:not-allowed}
   .pv-item-preview{margin-top:9px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;font-size:10px;color:#475569}
   .pv-item-preview strong{color:#0f172a}
   .pv-table-wrap{overflow:auto;margin-top:12px;border:1px solid #dbe3ea;border-radius:7px}
   .pv-table{width:100%;border-collapse:collapse;font-size:11px}
   .pv-table th{height:28px;padding:5px 8px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;color:#475569;font-size:9px;font-weight:900;text-align:left;white-space:nowrap}
   .pv-table td{height:32px;padding:4px 8px;border-bottom:1px solid #edf1f3;color:#334155;white-space:nowrap}
   .pv-table tbody tr:last-child td{border-bottom:0}
   .pv-table tbody tr:hover{background:#f8fafc}
   .pv-status{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:900}
   .pv-status-open{background:#eff6ff;color:#1d4ed8}
   .pv-status-production{background:#ecfdf5;color:#047857}
   .pv-status-reserved{background:#f0fdf4;color:#15803d}
   .pv-status-warning{background:#fff7ed;color:#c2410c}
   .pv-status-neutral{background:#f1f5f9;color:#475569}
   .pv-row-actions{display:flex;align-items:center;justify-content:flex-start;gap:5px}
   .pv-mini-btn{height:27px;padding:0 8px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#334155;font-size:9px;font-weight:800;display:inline-flex;align-items:center;gap:4px;cursor:pointer}
   .pv-mini-btn svg{width:12px;height:12px}
   .pv-totalbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:10px 12px;border:1px solid #dbe3ea;border-radius:7px;background:#f8fafc}
   .pv-totalbar strong{font-size:15px;color:#0f172a}
   .pv-totalbar small{display:block;margin-top:2px;color:#64748b;font-size:9px}
   .pv-message{margin-bottom:10px;padding:8px 10px;border-radius:6px;font-size:10px;font-weight:700}
   .pv-message-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}
   .pv-message-error{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
   .pv-recent{margin-top:12px}
   .pv-recent h2{margin:0 0 8px;font-size:15px;color:#0f172a}
   .pv-empty{text-align:center!important;color:#94a3b8!important;padding:12px!important}
   @media(max-width:800px){
    .pv-industrial-page{padding:10px}
    .pv-row-main,.pv-row-item{grid-template-columns:1fr}
    .pv-header,.pv-actions,.pv-totalbar{align-items:flex-start;flex-direction:column}
    .pv-action-left,.pv-action-right{width:100%}
   }
  `}</style>

  <header className="pv-header">
   <div>
    <span className="pv-eyebrow">COMERCIAL • VENDAS</span>
    <h1>Novo Pedido de Venda</h1>
    <p>Digitação rápida: cliente → item → estoque → reserva → OP → PCP.</p>
   </div>
   <button className="pv-btn pv-btn-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw/>Atualizar</button>
  </header>

  {(msg||err)&&<div className={`pv-message ${err?'pv-message-error':'pv-message-ok'}`}>{err||msg}</div>}

  <section className="pv-card">
   <div className="pv-form">
    <div className="pv-row pv-row-main">
     <div className="pv-field">
      <label>Cliente</label>
      <select value={client} onChange={e=>{setClient(e.target.value);setClientDoc(clients.find(c=>c.id===e.target.value)?.documento||'')}}>
       <option value="">Selecione o cliente</option>
       {clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
     </div>
     <div className="pv-field">
      <label>Data de Entrega</label>
      <input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/>
     </div>
    </div>

    <div className="pv-row pv-row-item">
     <div className="pv-field">
      <label>Produto</label>
      <select value={draft.produto} onChange={e=>choose(e.target.value)}>
       <option value="">Digite/selecione o produto</option>
       {products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}
      </select>
     </div>
     <div className="pv-field">
      <label>Quantidade</label>
      <input type="number" min="1" value={draft.qtd} onChange={e=>setDraft({...draft,qtd:e.target.value})}/>
     </div>
     <div className="pv-field">
      <label>Valor do Pedido</label>
      <input type="number" step="0.01" value={draft.valor} onChange={e=>setDraft({...draft,valor:e.target.value})}/>
     </div>
    </div>

    {selected&&<div className="pv-item-preview">
     <strong>{selected.codigo} • {selected.nome}</strong>
     <span> · Estoque disponível: <strong>{selected.estoque_atual} {selected.unidade}</strong></span>
     {Number(draft.qtd)>Number(selected.estoque_atual)&&<span className="pv-status pv-status-warning" style={{marginLeft:8}}>Saldo insuficiente → OP necessária</span>}
    </div>}

    <div className="pv-actions">
     <div className="pv-action-left">
      <button className="pv-btn pv-btn-secondary" onClick={add} disabled={!selected||Number(draft.qtd)<=0}><Plus/>Adicionar item</button>
      <span style={{fontSize:10,color:'#64748b'}}>Pedido <strong>{number||'—'}</strong></span>
     </div>
     <div className="pv-action-right">
      <button className="pv-btn pv-btn-primary" disabled={busy||!items.length||!client} onClick={()=>void save()}><Save/>Salvar Pedido</button>
     </div>
    </div>
   </div>

   <div className="pv-table-wrap">
    <table className="pv-table">
     <thead><tr><th>Código</th><th>Descrição</th><th>Qtd.</th><th>Estoque</th><th>Valor</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
     <tbody>
      {items.map((i,n)=>{
       const status=i.reservado?'Reservado':Number(i.quantidade)>i.estoque?'Produzir':'Disponível'
       const statusClass=i.reservado?'pv-status-reserved':Number(i.quantidade)>i.estoque?'pv-status-production':'pv-status-open'
       return <tr key={n}>
        <td>{i.codigo}</td><td>{i.descricao}</td><td>{i.quantidade}</td><td>{i.estoque}</td><td>{money(Number(i.valor))}</td><td>{money(Number(i.quantidade)*Number(i.valor))}</td>
        <td><span className={`pv-status ${statusClass}`}>{status}</span></td>
        <td><div className="pv-row-actions">
         {!i.reservado&&Number(i.quantidade)<=i.estoque&&<button className="pv-mini-btn" onClick={()=>void reserve(i)}><PackageCheck/>Reservar</button>}
         {Number(i.quantidade)>i.estoque&&<button className="pv-mini-btn" onClick={()=>update(n,'produzir',true)}><Factory/>Gerar OP</button>}
         <button className="pv-mini-btn" onClick={()=>setItems(items.filter((_,x)=>x!==n))}><Trash2/></button>
        </div></td>
       </tr>
      })}
      {!items.length&&<tr><td className="pv-empty" colSpan={8}>Adicione os produtos do pedido.</td></tr>}
     </tbody>
    </table>
   </div>

   <div className="pv-totalbar">
    <div><strong>Total do pedido: {money(total)}</strong><small>Itens para produção: {prodItems.length} • Itens com saldo insuficiente: {needs.length}</small></div>
    <button className="pv-btn pv-btn-secondary" disabled={busy||!prodItems.length} onClick={()=>void generateOP()}><Factory/>Gerar OP e enviar ao PCP</button>
   </div>
  </section>

  <section className="pv-card pv-recent">
   <h2>Pedidos recentes</h2>
   <div className="pv-table-wrap" style={{marginTop:0}}>
    <table className="pv-table">
     <thead><tr><th>Pedido</th><th>Status</th><th>Total</th><th>Entrega</th></tr></thead>
     <tbody>
      {orders.map(o=>{
       const s=o.status.toLowerCase()
       const cls=s.includes('produ')?'pv-status-production':s.includes('abert')?'pv-status-open':s.includes('reserv')?'pv-status-reserved':'pv-status-neutral'
       return <tr key={o.id}><td>PV-{o.numero}</td><td><span className={`pv-status ${cls}`}>{o.status}</span></td><td>{money(Number(o.total))}</td><td>{o.data_entrega_prometida||'—'}</td></tr>
      })}
      {!orders.length&&<tr><td className="pv-empty" colSpan={4}>Nenhum pedido encontrado.</td></tr>}
     </tbody>
    </table>
   </div>
  </section>
 </main>
}
