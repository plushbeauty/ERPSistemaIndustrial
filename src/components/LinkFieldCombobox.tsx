import { ChevronDown, Search } from 'lucide-react'
import { useMemo,useState } from 'react'
export type LinkOption={value:string;label:string;description?:string}
type Props={value:string;options:LinkOption[];onChange:(value:string)=>void;placeholder?:string;disabled?:boolean}
export default function LinkFieldCombobox({value,options,onChange,placeholder='Pesquisar...',disabled=false}:Props){
 const [query,setQuery]=useState('');const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?options.filter(o=>(o.label+' '+o.value+' '+(o.description||'')).toLowerCase().includes(q)):options},[options,query]);const selected=options.find(o=>o.value===value)
 return <div className="relative"><div className="relative"><Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/><input value={query||selected?.label||''} disabled={disabled} onChange={e=>setQuery(e.target.value)} placeholder={placeholder} className="h-7 w-full rounded-md border border-gray-200 bg-white pl-7 pr-7 text-[11px]"/><ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"/></div>{query&&<div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white">{filtered.map(o=><button type="button" key={o.value} className="block h-7 w-full px-2 text-left text-[11px]" onClick={()=>{onChange(o.value);setQuery('')}}>{o.label}</button>)}</div>}</div>
}
