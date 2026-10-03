import { Award, ShoppingCart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'

export default function Sidebar(){
 const {isExpanded,isMobileOpen}=useSidebar();const location=useLocation();const navigate=useNavigate()
 if(!isExpanded&&!isMobileOpen)return null
 const active=(route:string)=>location.pathname===route||location.pathname.startsWith(route+'/')
 return <aside className="fixed left-0 top-[64px] z-[80] h-[calc(100vh-64px)] w-[210px] border-r border-gray-200 bg-white shadow-sm">
  <div className="border-b border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Navegação</div>
  <button type="button" onClick={()=>navigate('/vendas')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/vendas')?'font-bold text-blue-700 bg-slate-50':'text-gray-700 hover:bg-slate-50'}`}><ShoppingCart size={14}/>Vendas</button>
  <div className="mt-2 border-t border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Controladoria Comercial</div>
  <button type="button" onClick={()=>navigate('/comissoes')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/comissoes')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Award size={14} className="text-gray-600 mr-2"/>Comissões & Metas</button>
 </aside>
}
