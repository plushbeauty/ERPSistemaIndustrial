import { BarChart3, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import VendasLayout from '../../pages/VendasLayout'
import { supabase } from '../../lib/supabaseClient'
import { makeXlsx } from '../../utils/makeXlsx'

type Product={id:string;codigo:string;nome:string;unidade:string|null;estoque_atual:number|null}
type Cost={produto_id:string;custo_total:number|null;quantidade_base:number|null}
type Warehouse={id:string;codigo:string;nome:string}
type Row=Product & {saldo:number;custo:number;total:number;status:string}

const input='h-7 rounded-sm border border-gray-300 bg-white px-2 text-[11px] leading-none outline-none focus:border-blue-500'
const label='mb-0.5 text-[10px] font-medium uppercase text-gray-500'
const button='inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-gray-300 bg-white px-2 text-[10px] font-medium'
function fuzzy(value:string,query:string){const q=query.trim().toLowerCase();if(!q)return true;let i=0;for(const c of value.toLowerCase()){if(c===q[i])i++;if(i===q.length)return true}return false}

function exportXlsx(rows:Row[],date:string){const data=[['SKU','Descrição','Saldo Físico','Unidade','Custo Unitário','Custo Total R$','Status do Lote'],...rows.map(r=>[r.codigo,r.nome,String(r.saldo),r.unidade??'',r.custo.toFixed(6),r.total.toFixed(2),r.status])];const blob=makeXlsx(data,'Valoração');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='balanco-estoque-'+date+'.xlsx';a.click();URL.revokeObjectURL(url)}

export default function BalancoEstoque(){
const [cut,setCut]=useState(new Date().toISOString().slice(0,10));const [warehouse,setWarehouse]=useState('');const [method,setMethod]=useState('Custo Médio Ponderado');const [warehouses,setWarehouses]=useState<Warehouse[]>([]);const [products,setProducts]=useState<Product[]>([]);const [costs,setCosts]=useState<Cost[]>([]);const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('')
 useEffect(()=>{void (async()=>{try{const emp=await supabase.rpc('erp_current_empresa_id');if(emp.error||!emp.data)throw emp.error??new Error('Empresa não identificada.');const empresaId=String(emp.data);const [w,p,c]=await Promise.all([supabase.from('erp_almoxarifados').select('id,codigo,nome').eq('empresa_id',empresaId).eq('ativo',true).order('codigo'),supabase.from('erp_produtos').select('id,codigo,nome,unidade,estoque_atual').eq('empresa_id',empresaId).eq('ativo',true).order('codigo').limit(5000),supabase.from('erp_custos_produtos').select('produto_id,custo_total,quantidade_base').eq('empresa_id',empresaId).order('created_at',{ascending:false}).limit(10000)]);if(w.error)throw w.error;if(p.error)throw p.error;if(c.error)throw c.error;setWarehouses((w.data??[]) as Warehouse[]);setProducts((p.data??[]) as Product[]);setCosts((c.data??[]) as Cost[])}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar balanço.')}finally{setLoading(false)}})()},[])
 const rows=useMemo<Row[]>(()=>products.filter(p=>fuzzy(p.codigo+' '+p.nome,search)).map(p=>{const saldo=Number(p.estoque_atual??0);const latest=costs.find(c=>c.produto_id===p.id);const base=Number(latest?.quantidade_base??0);const custo=base>0?Number(latest?.custo_total??0)/base:0;return {...p,saldo,custo,total:saldo*custo,status:saldo<0?'DIVERGENTE':'ATIVO'}}),[products,costs,search])
 const total=rows.reduce((s,r)=>s+r.total,0)
 return <VendasLayout title="Balanço de Estoque" subtitle="Inventário e valoração real" navSections={[{label:'Estoque',items:[{label:'Estoque / Almoxarifado',href:'/estoque',icon:BarChart3},{label:'Balanço de Estoque',href:'/inventario/balanco',icon:Download}]}]}>
  <div className="mx-auto max-w-[1600px] space-y-2">
   <div className="flex h-8 items-center justify-between border-b border-slate-300"><h1 className="text-[13px] font-medium text-slate-700">BALANÇO DE ESTOQUE</h1><span className="text-[10px] text-slate-500">Valoração contábil</span></div>
   {error&&<div className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">{error}</div>}
   <section className="border border-gray-300 bg-white p-2"><div className="flex items-end gap-2">
    <div className="w-[110px] shrink-0"><label className={label}>Data Inventário</label><input className={input+' w-[110px]'} type="date" value={cut} onChange={e=>setCut(e.target.value)}/></div>
    <div className="w-[160px] shrink-0"><label className={label}>Almoxarifado / Filial</label><select className={input+' w-[160px]'} value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="">Todos</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.codigo} - {w.nome}</option>)}</select></div>
    <div className="w-[140px] shrink-0"><label className={label}>Método de Custo</label><select className={input+' w-[140px]'} value={method} onChange={e=>setMethod(e.target.value)}><option>Custo Médio Ponderado</option><option>PEPS (Primeiro que Entra, Primeiro que Sai)</option><option>Último Preço de Compra</option></select></div>
    <div className="min-w-0 flex-1"><label className={label}>Buscar SKU / Descrição</label><input className={input+' w-full'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="SKU ou descrição"/></div>
    <button id="btnExportarXLSX" type="button" onClick={()=>exportXlsx(rows,cut)} className={button+' w-[150px] shrink-0 bg-amber-500 text-black hover:bg-amber-600'}><Download size={12}/>Exportar XLSX</button>
   </div></section>
   <section id="gridValoration" className="h-[250px] overflow-auto border border-gray-300 bg-white">
    <table className="w-full min-w-[900px] border-collapse text-[10px]"><thead className="sticky top-0 z-10 bg-slate-700 text-white"><tr className="h-7"><th className="w-[110px] px-2 text-left font-normal">SKU</th><th className="px-2 text-left font-normal">Descrição</th><th className="w-[100px] px-2 text-right font-normal">Saldo Físico</th><th className="w-[70px] px-2 text-left font-normal">Unidade</th><th className="w-[110px] px-2 text-right font-normal">Custo Unitário</th><th className="w-[130px] px-2 text-right font-normal">Custo Total R$</th><th className="w-[110px] px-2 text-center font-normal">Status do Lote</th></tr></thead><tbody>{loading?<tr><td colSpan={7} className="h-20 text-center text-gray-400">Carregando estoque real…</td></tr>:rows.map(r=><tr key={r.id} className="h-[26px] border-b border-gray-100 even:bg-slate-50"><td className="px-2 font-semibold">{r.codigo}</td><td className="px-2">{r.nome}</td><td className="px-2 text-right">{r.saldo.toLocaleString('pt-BR')}</td><td className="px-2">{r.unidade??'UN'}</td><td className="px-2 text-right">{r.custo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-right font-semibold">{r.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td className="px-2 text-center">{r.status}</td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={7} className="h-16 text-center text-gray-400">Nenhum item real encontrado.</td></tr>}</tbody></table>
   </section>
   <div className="flex h-7 items-center justify-end gap-4 border border-gray-300 bg-white px-2 text-[11px] font-medium"><span>Total Itens: {rows.length}</span><span>Custo Total Ativo: {total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>
  </div>
 </main>
}
