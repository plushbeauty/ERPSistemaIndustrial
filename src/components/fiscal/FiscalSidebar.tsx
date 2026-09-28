import React from 'react'
import { FileText, Receipt, Settings, Truck } from 'lucide-react'

const items=[
  {href:'/fiscal/pendencias',label:'Painel de Pendências',icon:Truck},
  {href:'/fiscal/emissao',label:'Emissão NF-e',icon:FileText},
  {href:'/fiscal/carteira-nfe',label:'Central de NF-e',icon:Receipt},
  {href:'/fiscal/impostos',label:'Configuração Impostos',icon:Settings},
]
export default function FiscalSidebar(){
  return <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-3 lg:w-64 lg:border-b-0 lg:border-r">
    <div className="mb-3 px-2 text-sm font-black uppercase tracking-wide text-slate-950">Fiscal Central</div>
    <nav className="grid gap-2">{items.map(({href,label,icon:Icon})=><button key={href} type="button" onClick={()=>{location.href=href}} className={'flex min-h-[54px] items-center gap-3 rounded-md border px-3 text-left text-base font-semibold '+(location.pathname===href?'border-blue-600 bg-blue-50 text-blue-900':'border-slate-200 bg-white text-slate-900 hover:bg-slate-50')}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </aside>
}