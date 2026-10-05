import { FileText, LayoutDashboard, Receipt, Settings, ShoppingCart, Truck } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { href:'/fiscal', label:'Dashboard Fiscal', icon:LayoutDashboard },
  { href:'/fiscal/pendencias', label:'Pendências', icon:Truck },
  { href:'/fiscal/emissao', label:'Emissão NF-e', icon:FileText },
  { href:'/fiscal/carteira-nfe', label:'Carteira NF-e', icon:Receipt },
  { href:'/fiscal/impostos', label:'Regras tributárias', icon:Settings },
  { href:'/fiscal/compras', label:'Fiscal de Compras', icon:ShoppingCart },
]

export default function FiscalSidebar(){
  return <nav aria-label="Navegação fiscal" className="flex w-full flex-wrap items-center gap-1 border-b border-slate-300 bg-white px-2 py-2">
    <span className="mr-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#123B50]">Fiscal</span>
    {items.map(({href,label,icon:Icon})=><NavLink key={href} to={href} end={href==='/fiscal'} className={({isActive})=>'flex h-8 items-center gap-1 border px-2 text-[11px] '+(isActive?'border-blue-700 bg-blue-700 text-white':'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
      <Icon size={13}/><span>{label}</span>
    </NavLink>)}
  </nav>
}
