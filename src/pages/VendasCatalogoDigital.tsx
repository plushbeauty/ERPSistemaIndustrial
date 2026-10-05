import { useEffect, useMemo, useState } from "react";
import { Copy, Search, Send, ShoppingCart } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import VendasLayout from "./VendasLayout";

type Produto={id:string;codigo:string;nome:string;descricao:string|null;preco_venda:number|null;unidade:string;foto_url:string|null;catalogo_disponivel:boolean;grupo:string|null;subgrupo:string|null};
type Empresa={nome_fantasia:string|null;razao_social:string|null;logo_url:string|null;logo_impressao_url:string|null};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);

export default function VendasCatalogoDigital(){
 const [produtos,setProdutos]=useState<Produto[]>([]);
 const [empresa,setEmpresa]=useState<Empresa|null>(null);
 const [selected,setSelected]=useState<Record<string,boolean>>({});
 const [quantidades,setQuantidades]=useState<Record<string,number>>({});
 const [filtro,setFiltro]=useState("");
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 const [cliente,setCliente]=useState("");

 const load=async()=>{
  setBusy(true);setError("");
  try{
   const e=await supabase.rpc("erp_current_empresa_id");
   if(e.error||!e.data)throw e.error||new Error("Empresa não identificada.");
   const id=String(e.data);
   const [p,emp]=await Promise.all([
    supabase.from("erp_produtos").select("id,codigo,nome,descricao,preco_venda,unidade,foto_url,catalogo_disponivel,grupo,subgrupo").eq("empresa_id",id).eq("ativo",true).eq("catalogo_disponivel",true).order("grupo").order("subgrupo").order("codigo"),
    supabase.from("erp_empresas").select("nome_fantasia,razao_social,logo_url,logo_impressao_url").eq("id",id).maybeSingle()
   ]);
   if(p.error)throw p.error;
   if(emp.error)throw emp.error;
   setProdutos((p.data??[]) as Produto[]);setEmpresa((emp.data??null) as Empresa|null);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar o catálogo.");setProdutos([])}
  finally{setBusy(false)}
 };
 useEffect(()=>{void load()},[]);
 const rows=useMemo(()=>produtos.filter(p=>{const q=filtro.trim().toLowerCase();return !q||p.codigo.toLowerCase().includes(q)||p.nome.toLowerCase().includes(q)||(p.descricao??"").toLowerCase().includes(q)||(p.grupo??"").toLowerCase().includes(q)||(p.subgrupo??"").toLowerCase().includes(q)}),[produtos,filtro]);
 const groups=useMemo(()=>Array.from(new Set(rows.map(p=>p.grupo||"Sem grupo"))),[rows]);
 const cart=rows.filter(p=>selected[p.id]).map(p=>({produto_id:p.id,codigo:p.codigo,descricao:p.nome,quantidade:Math.max(1,quantidades[p.id]??1)}));
 const link=window.location.origin+"/vendas/catalogo-digital";
 const copy=async()=>{await navigator.clipboard.writeText(link)};
 const send=async()=>{const text="Catálogo: "+link+"\nCliente: "+(cliente||"Não informado")+"\n\nItens selecionados:\n"+cart.map(x=>x.codigo+" - "+x.descricao+" x "+x.quantidade).join("\n");if(navigator.share)await navigator.share({title:"Solicitação de cotação",text}).catch(()=>undefined);else await navigator.clipboard.writeText(text)};
 return <VendasLayout title="Catálogo digital" subtitle="Produtos por grupo, descrição e imagem • sem preços" onRefresh={()=>void load()}>
  <main className="sales-workspace sales-detail">
   <section className="rounded-md border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div className="flex items-center gap-4">
      {(empresa?.logo_url||empresa?.logo_impressao_url)&&<img src={empresa.logo_url||empresa.logo_impressao_url||""} alt="Logo da empresa" className="h-14 w-28 object-contain rounded border bg-white p-1"/>}
      <div><span className="sales-eyebrow">CATÁLOGO COMERCIAL</span><h1 className="text-xl font-semibold text-[#1c3c49]">{empresa?.nome_fantasia||empresa?.razao_social||"Catálogo de produtos"}</h1><p className="text-xs text-slate-500">Apresentação dos produtos sem exibição de preço.</p></div>
     </div>
     <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>void copy()} className="sales-button sales-button--secondary"><Copy size={14}/> COPIAR LINK</button>
      <button type="button" onClick={()=>void send()} disabled={!cart.length} className="sales-button sales-button--primary"><Send size={14}/> ENVIAR SELEÇÃO</button>
     </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_260px]">
     <label className="grid gap-1 text-xs font-semibold text-slate-600">Pesquisar produto, grupo ou descrição<span className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400"/><input value={filtro} onChange={e=>setFiltro(e.target.value)} className="h-9 w-full rounded-md border pl-9 pr-3" placeholder="Código, produto, grupo..."/></span></label>
     <label className="grid gap-1 text-xs font-semibold text-slate-600">Cliente / referência<input value={cliente} onChange={e=>setCliente(e.target.value)} className="h-9 rounded-md border px-3" placeholder="Opcional"/></label>
    </div>
    {error&&<div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</div>}
   </section>
   <section className="rounded-md border bg-white p-5">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold text-[#123b50]">Produtos por grupo</h2><p className="text-xs text-slate-500">{rows.length} produto(s) publicado(s)</p></div><span className="text-xs font-semibold text-slate-500"><ShoppingCart size={14} className="mr-1 inline"/> {cart.length} selecionado(s)</span></div>
    {busy&&<div className="py-10 text-center text-sm text-slate-500">Carregando catálogo…</div>}
    {!busy&&groups.map(group=><div key={group} className="mb-6 last:mb-0"><div className="border-b border-slate-200 pb-2"><h3 className="text-sm font-bold text-[#123b50]">{group}</h3><p className="text-[11px] text-slate-500">{rows.filter(p=>(p.grupo||"Sem grupo")===group).length} item(ns)</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.filter(p=>(p.grupo||"Sem grupo")===group).map(p=><article key={p.id} className="overflow-hidden rounded-md border border-slate-200 bg-white"><div className="flex h-44 items-center justify-center bg-slate-50">{p.foto_url?<img src={p.foto_url} alt={p.nome} className="h-full w-full object-contain"/>:<div className="text-xs text-slate-400">Sem imagem</div>}</div><div className="p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-mono text-[10px] text-slate-500">{p.codigo}</div><h4 className="mt-1 text-sm font-semibold text-[#123b50]">{p.nome}</h4></div><input type="checkbox" aria-label={`Selecionar ${p.nome}`} checked={!!selected[p.id]} onChange={e=>setSelected(v=>({...v,[p.id]:e.target.checked}))} className="h-4 w-4"/></div><p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">{p.descricao||"Sem descrição cadastrada."}</p>{p.subgrupo&&<span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{p.subgrupo}</span>}{selected[p.id]&&<div className="mt-3"><label className="text-[10px] font-semibold text-slate-500">Quantidade<input type="number" min="1" value={quantidades[p.id]??1} onChange={e=>setQuantidades(v=>({...v,[p.id]:Math.max(1,Number(e.target.value)||1)}))} className="ml-2 h-7 w-16 rounded border px-2 text-center text-xs"/></label></div>}</div></article>)}</div></div>)}
    {!busy&&!rows.length&&<div className="py-12 text-center text-sm text-slate-500">Nenhum produto publicado corresponde ao filtro.</div>}
   </section>
  </main>
 </VendasLayout>
}
