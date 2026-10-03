import { useEffect, useRef, useState } from 'react'
import { HelpCircle, Upload, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Row={id:string;cnpj_cliente:string;sku_produto:string;preco_especial:number;validade_tabela:string}

export default function ListaPrecosCliente(){
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const fileRef=useRef<HTMLInputElement>(null)
 const load=async()=>{setLoading(true);setError('');const r=await supabase.from('erp_tabela_precos_cliente').select('id,cnpj_cliente,sku_produto,preco_especial,validade_tabela').order('validade_tabela',{ascending:true}).limit(1000);if(r.error)setError(r.error.message);else setRows((r.data??[]) as Row[]);setLoading(false)}
 useEffect(()=>{void load()},[])
 const importar=async(file:File)=>{setLoading(true);setError('');setMessage('');try{const body=new FormData();body.append('file',file);const r=await supabase.functions.invoke('importar-lista-precos-cliente',{body});if(r.error)throw r.error;setMessage('Lista importada: '+String(r.data?.inserted??0)+' registro(s).');await load()}catch(e){setError(e instanceof Error?e.message:'Falha ao importar Excel.')}finally{setLoading(false)}}
 return <VendasLayout title="Lista de Preços por Cliente" subtitle="Preços comerciais diferenciados por empresa"><div className="space-y-2 text-[11px]">
  <section className="rounded border border-gray-200 bg-white p-3">
   <div className="flex items-end gap-2">
    <div><label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Importação</label><input ref={fileRef} className="hidden" type="file" accept=".xlsx,.xls" onChange={e=>{const f=e.target.files?.[0];if(f)void importar(f);e.currentTarget.value=''}}/><button type="button" disabled={loading} onClick={()=>fileRef.current?.click()} className="flex h-7 items-center gap-1 rounded border border-emerald-600 bg-emerald-600 px-3 text-[11px] font-bold text-white"><Upload size={12}/>Puxar Lista de Preços (Excel)</button></div>
    <div className="pb-1" title="Colunas obrigatórias e exatas: cnpj_cliente (14 dígitos), sku_produto (código interno ERP), preco_especial (decimal), validade_tabela (data)."><HelpCircle size={15} className="text-gray-500"/></div>
    <button type="button" onClick={()=>void load()} className="mb-0 flex h-7 items-center gap-1 rounded border border-gray-300 px-2"><RefreshCw size={12}/>Atualizar</button>
   </div>
   <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-[10px] text-gray-600">Modelo estrito: <b>cnpj_cliente</b> · <b>sku_produto</b> · <b>preco_especial</b> · <b>validade_tabela</b>.</div>
   {(error||message)&&<div className={`mt-2 rounded border px-2 py-1 ${error?'border-red-200 bg-red-50 text-red-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error||message}</div>}
  </section>
  <section className="overflow-auto rounded border border-gray-200 bg-white"><table className="w-full border-collapse text-[10px]"><thead><tr className="h-7 bg-slate-700 text-left text-white"><th className="px-2 font-normal">CNPJ Cliente</th><th className="px-2 font-normal">SKU Produto</th><th className="px-2 text-right font-normal">Preço Especial</th><th className="px-2 font-normal">Validade</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="h-7 border-t border-gray-100 even:bg-slate-50"><td className="px-2">{r.cnpj_cliente}</td><td className="px-2">{r.sku_produto}</td><td className="px-2 text-right">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(r.preco_especial)}</td><td className="px-2">{r.validade_tabela}</td></tr>)}{!rows.length&&<tr><td colSpan={4} className="h-12 text-center text-gray-400">Nenhuma tabela diferenciada cadastrada.</td></tr>}</tbody></table></section>
 </div></VendasLayout>
}
