import { useEffect, useMemo, useState } from "react";
import { Filter, Plus, Printer, RefreshCw, Search, ExternalLink, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Pedido={id:string;numero:number;pedido_cliente:string|null;status:string;total:number;data_entrega_prometida:string|null;cliente:{nome:string}|null};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);

export default function VendasCarteira(){
 const [rows,setRows]=useState<Pedido[]>([]);
 const [q,setQ]=useState("");
 const [status,setStatus]=useState("");
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 const load=async()=>{
  setBusy(true);setError("");
  const e=await supabase.rpc("erp_current_empresa_id");
  if(e.error||!e.data){setError(e.error?.message||"Empresa não identificada.");setBusy(false);return}
  const r=await supabase.from("erp_pedidos_venda")
   .select("id,numero,pedido_cliente,status,total,data_entrega_prometida,cliente:erp_clientes(nome)")
   .eq("empresa_id",String(e.data)).order("numero",{ascending:false}).limit(500);
  if(r.error)setError(r.error.message);
  setRows((r.data??[]) as unknown as Pedido[]);
  setBusy(false);
 };
 useEffect(()=>{void load()},[]);

 const statuses=useMemo(()=>Array.from(new Set(rows.map(x=>x.status).filter(Boolean))).sort(),[rows]);
 const filtered=useMemo(()=>{
  const needle=q.trim().toLowerCase();
  return rows.filter(x=>
   (!needle||String(x.numero).includes(needle)||(x.cliente?.nome??"").toLowerCase().includes(needle)||(x.pedido_cliente??"").toLowerCase().includes(needle)) &&
   (!status||x.status===status)
  );
 },[rows,q,status]);

 return <div className="sales-list-page">
  <header className="sales-list-header">
   <div>
    <div className="sales-list-kicker">ERP INDUSTRIAL • VENDAS</div>
    <h1>Carteira de pedidos</h1>
   </div>
   <div className="sales-list-actions">
    <button type="button" className="sales-list-icon" title="Novo pedido" aria-label="Novo pedido" onClick={()=>location.assign("/vendas/novo-pedido")}><Plus size={16}/></button>
    <button type="button" className={`sales-list-icon ${filtersOpen?"active":""}`} title="Mostrar ou ocultar filtros" aria-label="Filtros" onClick={()=>setFiltersOpen(x=>!x)}><Filter size={16}/></button>
    <button type="button" className="sales-list-icon" title="Imprimir lista de pedidos" aria-label="Imprimir" onClick={()=>window.print()}><Printer size={16}/></button>
    <button type="button" className="sales-list-icon" title="Atualizar lista" aria-label="Atualizar" disabled={busy} onClick={()=>void load()}><RefreshCw size={16} className={busy?"animate-spin":""}/></button>
   </div>
  </header>
  <main className="sales-list-main">
   <section className="sales-list-card">
    <div className="sales-list-toolbar">
     <div className="sales-list-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nº, cliente ou referência" aria-label="Pesquisar pedidos"/></div>
     <span className="sales-list-count">{filtered.length} pedido(s)</span>
    </div>
    {filtersOpen&&<div className="sales-list-filters">
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{statuses.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      {(q||status)&&<button type="button" className="sales-list-clear" title="Limpar filtros" onClick={()=>{setQ("");setStatus("")}}><X size={14}/>Limpar</button>}
    </div>}
    {error&&<div className="sales-list-error">{error}</div>}
    <div className="sales-list-table-wrap">
     <table className="sales-list-table">
      <thead><tr><th>Nº</th><th>Pedido cliente</th><th>Cliente</th><th>Entrega</th><th>Total</th><th>Status</th><th className="action-col">Ação</th></tr></thead>
      <tbody>{filtered.map(x=><tr key={x.id}>
       <td className="code-cell">{String(x.numero).padStart(6,"0")}</td><td>{x.pedido_cliente||"—"}</td><td>{x.cliente?.nome||"—"}</td><td>{x.data_entrega_prometida||"—"}</td><td>{brl(Number(x.total||0))}</td><td><span className="sales-status">{x.status}</span></td>
       <td className="action-col"><button type="button" className="sales-open-btn" title="Abrir acompanhamento do pedido" onClick={()=>location.assign("/vendas/pedido/"+x.id)}><ExternalLink size={14}/>Abrir</button></td>
      </tr>)}{!filtered.length&&<tr><td colSpan={7} className="sales-list-empty">Nenhum pedido real encontrado.</td></tr>}</tbody>
     </table>
    </div>
   </section>
  </main>
  <style>{`
   .sales-list-page{min-height:100vh;background:#f4fbfd;color:#17333f}
   .sales-list-header{min-height:58px;background:#fff;border-bottom:1px solid #c9dce3;display:flex;align-items:center;justify-content:space-between;padding:7px 16px;gap:10px}
   .sales-list-kicker{font-size:9px;font-weight:600;letter-spacing:.11em;color:#2d7896}.sales-list-header h1{margin:2px 0 0;font-size:17px;font-weight:600}
   .sales-list-actions{display:flex;gap:4px}.sales-list-icon{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #bfd1d8;background:#fff;color:#35515d;border-radius:3px;cursor:pointer}.sales-list-icon:hover,.sales-list-icon.active{background:#eef7fa;border-color:#8ebaca;color:#176487}.sales-list-icon:disabled{opacity:.45}
   .sales-list-main{max-width:1260px;margin:0 auto;padding:14px 16px}.sales-list-card{background:#fff;border:1px solid #c9dce3;border-radius:4px;box-shadow:0 1px 4px rgba(23,51,63,.03);padding:12px}
   .sales-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px}.sales-list-search{height:32px;width:min(380px,100%);display:flex;align-items:center;gap:6px;border:1px solid #bfd1d8;border-radius:3px;padding:0 8px;color:#68808b}.sales-list-search input{border:0;outline:0;width:100%;height:30px;font-size:12px;color:#17333f}.sales-list-count{font-size:10px;color:#68808b}
   .sales-list-filters{display:flex;align-items:end;gap:7px;margin-top:8px;padding:8px;background:#f4fbfd;border:1px solid #d7e3e7;border-radius:3px}.sales-list-filters label{display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:500}.sales-list-filters select{height:30px;min-width:150px;border:1px solid #bfd1d8;border-radius:3px;background:#fff;padding:0 7px;font-size:11px}.sales-list-clear{height:30px;border:1px solid #bfd1d8;background:#fff;border-radius:3px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;font-size:10px}
   .sales-list-error{margin-top:8px;padding:8px;border:1px solid #e2b9b9;background:#fff2f2;color:#9b2525;border-radius:3px;font-size:11px}
   .sales-list-table-wrap{overflow:auto;margin-top:8px;border:1px solid #d7e3e7;border-radius:3px}.sales-list-table{width:100%;border-collapse:collapse;min-width:820px}.sales-list-table th{height:34px;padding:0 7px;background:#eaf2f5;border-bottom:1px solid #c9dce3;text-align:left;font-size:9px;font-weight:600;text-transform:uppercase;color:#17333f}.sales-list-table td{height:36px;padding:0 7px;border-bottom:1px solid #edf3f5;font-size:11px}.sales-list-table tr:hover{background:#f8fcfd}.code-cell{font-weight:600}.action-col{width:100px}.sales-status{display:inline-flex;align-items:center;min-height:21px;padding:0 6px;border-radius:3px;background:#eef4f6;color:#35515d;font-size:9px;font-weight:600}.sales-open-btn{height:27px;border:1px solid #bfd1d8;background:#fff;border-radius:3px;display:inline-flex;align-items:center;gap:4px;padding:0 7px;color:#176487;font-size:10px;cursor:pointer}.sales-open-btn:hover{background:#eef7fa}.sales-list-empty{text-align:center;height:80px;color:#68808b}
   @media(max-width:700px){.sales-list-main{padding:10px}.sales-list-toolbar{align-items:stretch;flex-direction:column}.sales-list-search{width:100%}.sales-list-filters{align-items:stretch;flex-direction:column}.sales-list-filters select{width:100%}}
  `}</style>
 </div>
}
