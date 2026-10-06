import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, BookOpen, Boxes, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, LogOut, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Tablet, Target, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'

export type SalesNavItem = { label:string; href:string; icon:typeof LayoutDashboard }
export type SalesNavSection = { label:string; items:SalesNavItem[] }

const sections:SalesNavSection[]=[
 {label:'Visão geral',items:[
  {label:'Dashboard comercial',href:'/vendas',icon:LayoutDashboard},
  {label:'Faturamento',href:'/vendas/dashboard-graficos',icon:BarChart3},
 ]},
 {label:'Operação',items:[
  {label:'Pedidos de venda',href:'/vendas/pedidos',icon:ClipboardList},
  {label:'Novo pedido',href:'/vendas/novo-pedido',icon:FilePlus2},
  {label:'Pedidos pendentes',href:'/vendas/pendentes',icon:ListChecks},
  {label:'Status do pedido',href:'/vendas/status',icon:ListChecks},
  {label:'Carteira de pedidos',href:'/vendas/carteira',icon:FolderKanban},
  {label:'PDV / venda rápida',href:'/vendas/pdv',icon:ShoppingCart},
 ]},
 {label:'Comercial',items:[
  {label:'Clientes',href:'/vendas/clientes',icon:Users},
  {label:'Orçamentos e custos',href:'/vendas/orcamentos',icon:PackageSearch},
  {label:'Análise de custos',href:'/vendas/analise-custos',icon:PackageSearch},
  {label:'Metas',href:'/vendas/metas',icon:Target},
  {label:'Vendedores / comissões',href:'/comissoes/perfil',icon:Users},
  {label:'Relatórios',href:'/vendas/relatorios',icon:BookOpen},
  {label:'Cadastro de Produtos',href:'/produtos-vendas',icon:PackagePlus},
 ]},
 {label:'Ferramentas',items:[
  {label:'Catálogo digital',href:'/vendas/catalogo-digital',icon:BookOpen},
  {label:'Gestão do catálogo',href:'/vendas/catalogo-digital/gestao',icon:BookOpen},
  {label:'Ajuste global / preços',href:'/vendas/reajuste',icon:Settings2},
 ]}
]

export default function VendasLayout({children,title,subtitle,onRefresh,navSections}:{children:ReactNode;title:string;subtitle?:string;onRefresh?:()=>void;navSections?:SalesNavSection[]}){
 const {pathname}=useLocation()
 const isMobile=useIsMobile()
 const [tablet,setTablet]=useState(false)
 const tabletMode=tablet||isMobile
 const activeSections=navSections??sections
 useEffect(()=>{if(!isMobile)return},[isMobile])
 const logout=async()=>{await supabase.auth.signOut();window.location.assign('/login')}
 const active=(href:string)=>href==='/vendas'?pathname==='/vendas':pathname===href||pathname.startsWith(href+'/')
 const mainRoute=pathname.startsWith('/vendas')?'/vendas':pathname.startsWith('/pcp')?'/pcp':(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))?'/estoque':pathname.startsWith('/qualidade')?'/qualidade':'/erp-industrial'
 return <div className={`min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode?'tablet-mode':''}`}>
  <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-300 bg-white ${tabletMode?'hidden':''}`}>
   <div className="border-b border-slate-200 px-3 py-3"><div className="text-[10px] font-medium uppercase tracking-widest text-[#2D8DB8]">ERP INDUSTRIAL</div><div className="mt-1 text-[13px] font-medium text-[#123B50]">Módulo de Vendas</div></div>
   <nav className="flex-1 overflow-y-auto px-2 py-2">
    {activeSections.map(section=><div key={section.label} className="mb-3"><div className="px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-slate-400">{section.label}</div>{section.items.map(item=>{const Icon=item.icon;const on=active(item.href);return <Link key={item.href} to={item.href} aria-current={on?'page':undefined} className={`mb-1 flex h-8 w-full items-center gap-2 border px-2 text-left text-[11px] transition ${on?'border-[#2D8DB8] bg-[#2D8DB8] text-white':'border-transparent text-slate-600 hover:border-slate-200 hover:bg-[#F4FBFD]'}`}><Icon size={14} strokeWidth={1.8}/><span className="truncate">{item.label}</span></Link>})}</div>)}
   </nav>
   <div className="border-t border-slate-200 px-3 py-2 text-[9px] text-slate-400">Vendas • Estoque • PCP • Fiscal</div>
  </aside>
  <main className={tabletMode?'min-w-0':'ml-60 min-w-0'}>
   <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3">
    <div className="min-w-0 truncate"><span className="mr-2 text-[10px] font-medium text-[#2D8DB8]">VENDAS</span><span className="text-[12px] font-medium text-[#123B50]">{title}</span>{subtitle&&<span className="ml-2 text-[10px] text-slate-500">{subtitle}</span>}</div>
    <div className="flex items-center gap-1">
     <button type="button" onClick={()=>window.location.assign(mainRoute)} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar"><span>←</span>Voltar</button>
     <button type="button" onClick={()=>{setTablet(true);document.documentElement.classList.add('tablet-mode')}} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Modo tablet"><Tablet size={13}/>Tablet</button>
     {onRefresh&&<button type="button" onClick={onRefresh} className="flex h-7 items-center border border-slate-300 bg-white px-2" title="Atualizar"><RefreshCw size={13}/></button>}
     <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair"><LogOut size={13}/>Sair</button>
    </div>
   </header>
   <div className="p-2 lg:p-3">{children}</div>
  </main>
  <style>{`
   .tablet-mode input,.tablet-mode select,.tablet-mode button{min-height:36px}
   .tablet-mode aside{display:none}
   .tablet-mode main{margin-left:0}
  `}</style>
 </div>
}
