import { Award, Factory, ShoppingCart, TrendingUp } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../context/SidebarContext'
import { usePonto } from '../context/PontoContext'

export default function Sidebar(){
 const {isExpanded,isMobileOpen}=useSidebar();const location=useLocation();const navigate=useNavigate();const {perfilRole}=usePonto();const financeAllowed=['ADMINISTRADOR','MASTER','FINANCEIRO','CONTROLADORIA'].includes(perfilRole??'')
 if(!isExpanded&&!isMobileOpen)return null
 const active=(route:string)=>location.pathname===route||location.pathname.startsWith(route+'/')
 return <aside className="fixed left-0 top-[64px] z-[80] h-[calc(100vh-64px)] w-[210px] border-r border-gray-200 bg-white shadow-sm">
  <div className="border-b border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Navegação</div>
  <button type="button" onClick={()=>navigate('/vendas')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/vendas')?'font-bold text-blue-700 bg-slate-50':'text-gray-700 hover:bg-slate-50'}`}><ShoppingCart size={14}/>Vendas</button>
  <div className="mt-2 border-t border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Controladoria Comercial</div>
  <button type="button" onClick={()=>navigate('/comissoes')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/comissoes')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Award size={14} className="text-gray-600 mr-2"/>Comissões & Metas</button>
  {financeAllowed&&<><div className="mt-2 border-t border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Financeiro / Controladoria</div>
  <button type="button" onClick={()=>navigate('/financeiro/reconciliacao')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/financeiro/reconciliacao')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}>Conciliação Bancária</button>
  <button type="button" onClick={()=>navigate('/financeiro/importar-extratos')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/financeiro/importar-extratos')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}>Importador de Extratos</button>
  <button type="button" onClick={()=>navigate('/financeiro/lista-precos-cliente')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/financeiro/lista-precos-cliente')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}>Lista de Preços Cliente</button></>}
  <div className="mt-2 border-t border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Controladoria de Estoque</div>
  <button type="button" onClick={()=>navigate('/inventario/balanco')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/inventario')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><TrendingUp size={14} className="text-gray-600 mr-2"/>Valoração Estoque</button>
  <button type="button" onClick={()=>navigate('/inventario/depreciacao')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/inventario/depreciacao')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><TrendingUp size={14} className="text-gray-600 mr-2"/>Depreciação</button>
  <button type="button" onClick={()=>navigate('/inventario/auditoria')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/inventario/auditoria')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><TrendingUp size={14} className="text-gray-600 mr-2"/>Auditoria de Saldos</button>
  <div className="mt-2 border-t border-gray-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">PCP & Engenharia</div>
  <button type="button" onClick={()=>navigate('/pcp/engenharia-bom')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/pcp/engenharia-bom')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Factory size={14} className="text-gray-600 mr-2"/>Engenharia BOM</button>
  <button type="button" onClick={()=>navigate('/pcp/roteiro-operacoes')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/pcp/roteiro-operacoes')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Factory size={14} className="text-gray-600 mr-2"/>Roteiro de Operações</button>
  <button type="button" onClick={()=>navigate('/pcp/postos-trabalho')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/pcp/postos-trabalho')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Factory size={14} className="text-gray-600 mr-2"/>Postos de Trabalho</button>
  <button type="button" onClick={()=>navigate('/pcp/painel-ordens')} className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[11px] ${active('/pcp/painel-ordens')?'font-bold text-blue-700':'text-gray-700 hover:bg-slate-50'}`}><Factory size={14} className="text-gray-600 mr-2"/>Fila de OPs</button>
 </aside>
}
