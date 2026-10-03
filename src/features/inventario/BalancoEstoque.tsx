import { Download, ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;unidade:string|null;estoque_atual:number|null;custo_medio:number|null}
type Warehouse={id:string;codigo:string;nome:string}
type Row=Product & {saldo:number;custo:number;total:number;status:string}

const input='h-7 rounded-md border border-gray-200 bg-white px-2 text-[11px] leading-none outline-none focus:border-blue-400'
const label='mb-0.5 text-[10px] font-bold uppercase text-gray-500'
const button='inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-bold'
function fuzzy(value:string,query:string){const q=query.trim().toLowerCase();if(!q)return true;let i=0;for(const c of value.toLowerCase()){if(c===q[i])i++;if(i===q.length)return true}return false}

function exportXlsx(rows:Row[],date:string){
 const headers=['SKU','Descrição','Saldo Físico','Unidade','Custo Unitário','Custo Total R$','Status do Lote']
 const lines=[headers,...rows.map(r=>[r.codigo,r.nome,r.saldo,r.unidade??'',r.custo,r.total,r.status])].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';'))
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'})
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`balanco-estoque-${date}.xlsx.csv`;a.click();URL.revokeObjectURL(url)
}

export default function BalancoEstoque(){
 const navigate=useNavigate();const [cut,setCut]=useState(new Date().toISOString().slice(0,10));const [warehouse,setWarehouse]=useState('');const [method,setMethod]=useState('Custo Médio Ponderado');const [warehouses,setWarehouses]=useState<Warehouse[]>([]);const [products,setProducts]=useState<Product[]>([]);const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('')
 useEffect(()=>{void (async()=>{try{const [w,p]=await Promise.all([supabase.from('erp_almoxarifados').select('id,codigo,nome').eq('ativo',true).order('codigo'),supabase.from('erp_produtos').select('id,codigo,nome,unidade,estoque_atual,custo_medio').eq('ativo',true).order('codigo').limit(5000)]);if(w.error)throw w.error;if(p.error)throw p.error;setWarehouses((w.data??[]) as Warehouse[]);setProducts((p.data??[]) as Product[])}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar balanço.')}finally{setLoading(false)}})()},[])
 const rows=useMemo<Row[]>(()=>products.filter(p=>fuzzy(p.codigo+' '+p.nome,search)).map(p=>{const saldo=Number(p.estoque_atual??0);const custo=Number(p.custo_medio??0);return {...p,saldo,custo,total:saldo*custo,status:saldo<0?'DIVERGENTE':'ATIVO'}}),[products,search])
 const total=rows.reduce((s,r)=>s+r.total,0)
 return <main className="min-h-screen bg-slate-50 p-3 text-gray-800">
  <div className="mx-auto max-w-[1600px] space-y-2">
   <div className="flex items-center gap-2"><button type="button" onClick={()=>navigate('/estoque')} className={button+' border border-gray-200 bg-white text-gray-600'}><ArrowLeft size={12}/>Voltar</button><h1 className="text-[13px] font-bold text-gray-700">VALORAÇÃO CONTÁBIL DE ESTOQUE</h1></div>
   {error&&<div className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">{error}</div>}
   <section className="rounded-md border border-gray-200 bg-white p-2 shadow-sm"><div className="flex items-end gap-2">
    <div className="w-[110px] shrink-0"><label className={label}>Data Inventário</label><input className={input+' w-[110px]'} type="date" value={cut} onChange={e=>setCut(e.target.value)}/></div>
    <div className="w-[160px] shrink-0"><label className={label}>Almoxarifado / Filial</label><select className={input+' w-[160px]'} value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="">Todos</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.codigo} - {w.nome}</option>)}</select></div>
    <div className="w-[140px] shrink-0"><label className={label}>Método de Custo</label><select className={input+' w-[140px]'} value={method} onChange={e=>setMethod(e.target.value)}><option>Custo Médio Ponderado</option><option>PEPS (Primeiro que Entra, Primeiro que Sai)</option><option>Último Preço de Compra</option></select></div>
    <div className="min-w-0 flex-1"><label className={label}>Buscar SKU / Descrição</label><input className={input+' w-full'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="SKU ou descrição"/></div>
    <button id="btnExportarXLSX" type="button" onClick={()=>exportXlsx(rows,cut)} className={button+' w-[150px] shrink-0 bg-amber-500 text-black hover:bg-amber-600'}><Download size={12}/>Exportar XLSX</button>
   </div></section>
   <section id="gridValoration" className="h-[250px] overflow-auto rounded-md border border-gray-200 bg-white shadow-sm">
    <table className="w-full min-w-[900px] border-collapse text-[10px]"><thead className="sticky top-0 z-10 bg-slate-700 text-white"><tr className="h-7"><th className="w-[110px] px-2 text-left font-normal">SKU</th><th className="px-2 text-left font-normal">Descrição</th><th className="w-[100px] px-2 text-right font-normal">Saldo Físico</th><th className="w-[70px] px-2 text-left font-normal">Unidade</th><th className="w-[110px] px-2 text-right font-normal">Custo Unitário</th><th className="w-[130px] px-2 text-right font-normal">Custo Total R$</th><th className="w-[110px] px-2 text-center font-normal">Status do Lote</th></tr></thead><tbody>{loading?<tr><td colSpan={7} className="h-20 text-center text-gray-400">Carregando estoque real…</td></tr>:rows.map(r=><tr key={r.id} className="h-[26px] border-b border-gray-100 even:bg-slate-50"><td className="px-2 font-semibold">{r.codigo}</td><td className="px-2">{r.nome}</td><td className="px-2 text-right">{r.saldo.toLocaleString('pt-BR')}</td><td className="px-2">{r.unidade??'UN'}</td><td className="px-2 text-right">{r.custo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-right font-semibold">{r.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-center">{r.status}</td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={7} className="h-16 text-center text-gray-400">Nenhum item real encontrado.</td></tr>}</tbody></table>
   </section>
   <div className="flex h-7 items-center justify-end gap-4 rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold shadow-sm"><span>Total Itens: {rows.length}</span><span>Custo Total Ativo: {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>
  </div>
 </main>
}
