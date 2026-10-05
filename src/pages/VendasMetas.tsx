import { useEffect, useState } from "react";
import { Plus, Save, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import VendasLayout from "./VendasLayout";
type Func={id:string;nome:string;matricula:string|null};
type Meta={id:string;competencia:string;meta_faturamento:number;meta_pedidos:number};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
export default function VendasMetas(){const [empresa,setEmpresa]=useState("");const [func,setFunc]=useState<Func[]>([]);const [meta,setMeta]=useState<Meta|null>(null);const [mes,setMes]=useState(new Date().toISOString().slice(0,7));const [valor,setValor]=useState("0");const [pedidos,setPedidos]=useState("0");const [realizado,setRealizado]=useState(0);const [msg,setMsg]=useState("");
 const load=async()=>{const e=await supabase.rpc("erp_current_empresa_id");if(e.error||!e.data){setMsg(e.error?.message||"Empresa não identificada.");return}const id=String(e.data);setEmpresa(id);const [f,m,p]=await Promise.all([supabase.from("erp_funcionarios").select("id,nome,matricula").eq("empresa_id",id).eq("status","ATIVO").order("nome"),supabase.from("erp_vendas_metas").select("id,competencia,meta_faturamento,meta_pedidos").eq("empresa_id",id).eq("competencia",mes+"-01").maybeSingle(),supabase.from("erp_pedidos_venda").select("total,status").eq("empresa_id",id).gte("data_entrega_prometida",mes+"-01").lt("data_entrega_prometida",new Date(new Date(mes+"-01T00:00:00").setMonth(new Date(mes+"-01T00:00:00").getMonth()+1)).toISOString().slice(0,10))]);if(f.error)setMsg(f.error.message);setFunc((f.data??[]) as Func[]);setMeta((m.data??null) as Meta|null);setValor(String(Number(m.data?.meta_faturamento??0)));setPedidos(String(Number(m.data?.meta_pedidos??0)));setRealizado((p.data??[]).filter(x=>!["cancelado"].includes(x.status)).reduce((s,x)=>s+Number(x.total??0),0))};
 useEffect(()=>{void load()},[mes]);
 const save=async()=>{const r=await supabase.from("erp_vendas_metas").upsert({empresa_id:empresa,competencia:mes+"-01",meta_faturamento:Number(valor)||0,meta_pedidos:Number(pedidos)||0},{onConflict:"empresa_id,competencia"});setMsg(r.error?r.error.message:"Meta gravada com sucesso.");void load()};
 const pct=Math.min((realizado/(Number(valor)||1))*100,999);
 return <VendasLayout title="Metas comerciais" subtitle="Metas, atingimento e desempenho da equipe" onRefresh={() => void load()}>
  <main className="sales-workspace sales-detail">
    <section className="rounded-md border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><span className="sales-eyebrow">COMERCIAL / METAS</span><h1 className="text-xl font-semibold text-[#1c3c49]">Controle de metas da equipe comercial</h1><p className="text-xs text-slate-500">Defina a competência, metas de faturamento e quantidade de pedidos.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-[36px] items-center gap-2 rounded-md border px-3 text-xs font-semibold">Competência<input type="month" className="h-8 rounded border px-2" value={mes} onChange={e=>setMes(e.target.value)}/></label>
          <button type="button" onClick={()=>{setValor("0");setPedidos("0");setMsg("Nova meta pronta para preenchimento.");}} className="sales-button sales-button--secondary"><Plus size={14}/> NOVA META</button>
          <button type="button" onClick={()=>void save()} className="sales-button sales-button--primary"><Save size={14}/> GRAVAR</button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Meta de faturamento<input type="number" min="0" step="0.01" className="h-9 rounded-md border px-3" value={valor} onChange={e=>setValor(e.target.value)}/></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Meta de pedidos<input type="number" min="0" step="1" className="h-9 rounded-md border px-3" value={pedidos} onChange={e=>setPedidos(e.target.value)}/></label>
        <div className="rounded-md border bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-500">Realizado</span><strong className="mt-1 block text-xl text-[#123b50]">{brl(realizado)}</strong></div>
      </div>
      {msg&&<div className="mt-4 rounded-md border border-sky-100 bg-sky-50 p-3 text-xs font-semibold text-sky-900">{msg}</div>}
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="h-11 bg-slate-50 text-left text-xs font-semibold text-slate-600"><th>Vendedor</th><th>Meta de faturamento</th><th>Realizado</th><th>Atingimento</th></tr></thead><tbody>{func.map(f=><tr key={f.id} className="h-12 border-t"><td className="font-semibold">{f.nome}</td><td>{brl(Number(valor)||0)}</td><td>{brl(realizado)}</td><td><div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#2D8DB8]" style={{width:`${Math.min(pct,100)}%`}}/></div><strong>{pct.toFixed(0)}%</strong></div></td></tr>)}{!func.length&&<tr><td colSpan={4} className="py-10 text-center text-slate-500">Nenhum vendedor ativo cadastrado.</td></tr>}</tbody></table></div>
    </section>
  </main>
</VendasLayout>