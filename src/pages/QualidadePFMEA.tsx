import { useMemo, useState } from "react";
import { EntityCodeLookup } from "../components/industrial/EntityCodeLookup";
import { supabase } from "../lib/supabaseClient";

export default function QualidadePFMEA() {
  const [message,setMessage]=useState("");
  const [codigo,setCodigo]=useState("");
  const [processo,setProcesso]=useState("");
  const [falha,setFalha]=useState("");
  const [efeito,setEfeito]=useState("");
  const [gravidade,setGravidade]=useState(8);
  const [ocorrencia,setOcorrencia]=useState(4);
  const [deteccao,setDeteccao]=useState(3);
  const npr=useMemo(()=>gravidade*ocorrencia*deteccao,[gravidade,ocorrencia,deteccao]);
  const save=async()=>{
    if(!codigo.trim()||!processo.trim()||!falha.trim()){setMessage("Código, processo e modo de falha são obrigatórios.");return}
    const emp=await supabase.rpc("erp_current_empresa_id");
    if(emp.error||!emp.data){setMessage(emp.error?.message||"Empresa não identificada.");return}
    const r=await supabase.from("erp_fmea").upsert({
      empresa_id:String(emp.data),codigo:codigo.trim(),processo:processo.trim(),etapa:"",
      falha:falha.trim(),efeito:efeito.trim(),causa:"",controle:"",
      severidade:gravidade,ocorrencia,deteccao,status:"ABERTO"
    },{onConflict:"empresa_id,codigo"});
    setMessage(r.error?.message||"Revisão PFMEA gravada no banco.");
  };
  const novo=()=>{setCodigo("");setProcesso("");setFalha("");setEfeito("");setMessage("");};
  return <main className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div><p className="text-sm font-bold text-slate-600">QUALIDADE &gt; ENGENHARIA DE RISCOS</p><h1 className="text-2xl font-black">Matriz PFMEA</h1></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={novo} className="rounded-md border px-4 py-3 text-base font-bold">➕ NOVO MAPEAMENTO</button>
        <button type="button" onClick={()=>void save()} className="rounded-md bg-slate-900 px-4 py-3 text-base font-bold text-white">💾 SALVAR REVISÃO</button>
        <button type="button" onClick={()=>window.print()} className="rounded-md border px-4 py-3 text-base font-bold">🖨️ EMITIR MATRIZ</button>
      </div>
    </header>
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">1. Identificação do Processo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EntityCodeLookup label="Ficha Origem" value="" onChange={()=>undefined} entityType="ficha"/>
          <EntityCodeLookup label="Equipamento" value="" onChange={()=>undefined} entityType="machine"/>
          <label className="text-base font-semibold">Código<input value={codigo} onChange={e=>setCodigo(e.target.value)} className="mt-1 w-full rounded-md border p-3 text-slate-900" placeholder="Código PFMEA"/></label>
          <label className="text-base font-semibold">Operação Alvo<input value={processo} onChange={e=>setProcesso(e.target.value)} className="mt-1 w-full rounded-md border p-3 text-slate-900" placeholder="Estampagem / Prensa"/></label>
          <label className="text-base font-semibold md:col-span-2">Responsável<input className="mt-1 w-full rounded-md border p-3 text-base text-slate-900" placeholder="Responsável pela análise"/></label>
        </div>
      </div>
      <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">2. Modo de Falha e Risco</h2>
        <div className="mt-4 space-y-4">
          <label className="block text-base font-semibold">Modo da Falha<input value={falha} onChange={e=>setFalha(e.target.value)} className="mt-1 w-full rounded-md border p-3" placeholder="Descreva o modo de falha"/></label>
          <label className="block text-base font-semibold">Efeito da Falha<input value={efeito} onChange={e=>setEfeito(e.target.value)} className="mt-1 w-full rounded-md border p-3" placeholder="Descreva o efeito"/></label>
          <div className="overflow-x-auto"><table className="w-full text-base"><thead><tr className="h-[54px] border-b"><th>G</th><th>O</th><th>D</th><th>NPR</th></tr></thead><tbody><tr className="h-[54px] border-b">
            <td><input type="number" min="1" max="10" value={gravidade} onChange={e=>setGravidade(Number(e.target.value))} className="w-20 rounded border p-2"/></td>
            <td><input type="number" min="1" max="10" value={ocorrencia} onChange={e=>setOcorrencia(Number(e.target.value))} className="w-20 rounded border p-2"/></td>
            <td><input type="number" min="1" max="10" value={deteccao} onChange={e=>setDeteccao(Number(e.target.value))} className="w-20 rounded border p-2"/></td>
            <td className="text-2xl font-black">{npr}</td>
          </tr></tbody></table></div>
        </div>
      </div>
    </section>
    {message&&<div role="status" className="mt-4 rounded-md border bg-white p-4 font-semibold">{message}</div>}
  </div></main>
}
