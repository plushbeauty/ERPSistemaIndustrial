import { useState } from 'react'
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

export default function VendasLayout({children,title,subtitle,onRefresh,navSections,topContent}:{children:ReactNode;title:string;subtitle?:string;onRefresh?:()=>void;navSections?:SalesNavSection[];topContent?:ReactNode}){
 const {pathname}=useLocation()
 const isMobile=useIsMobile()
 const [tablet,setTablet]=useState(false)
 const tabletMode=tablet||isMobile
 const activeSections=navSections??sections
 const logout=async()=>{await supabase.auth.signOut();window.location.assign('/login')}
 const active=(href:string)=>href==='/vendas'?pathname==='/vendas':pathname===href||pathname.startsWith(href+'/')
 const mainRoute=pathname.startsWith('/vendas')?'/vendas':pathname.startsWith('/pcp')?'/pcp':(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))?'/estoque':pathname.startsWith('/qualidade')?'/qualidade':'/erp-industrial'
 return <div className={`vendas-standard min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode?'tablet-mode':''}`}>
  <main className="min-w-0">
   <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3">
    <div className="min-w-0 truncate"><span className="mr-2 text-[10px] font-medium text-[#2D8DB8]">VENDAS</span><span className="text-[12px] font-medium text-[#123B50]">{title}</span>{subtitle&&<span className="ml-2 text-[10px] text-slate-500">{subtitle}</span>}</div>
    <div className="flex items-center gap-1">
     <button type="button" onClick={()=>window.location.assign(mainRoute)} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar"><span>←</span>Voltar</button>
     <button type="button" onClick={()=>{setTablet(true);document.documentElement.classList.add('tablet-mode')}} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Modo tablet"><Tablet size={13}/>Tablet</button>
     {onRefresh&&<button type="button" onClick={onRefresh} className="flex h-7 items-center border border-slate-300 bg-white px-2" title="Atualizar"><RefreshCw size={13}/></button>}
     <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair"><LogOut size={13}/>Sair</button>
    </div>
   </header>
   <div className="p-2 lg:p-3">{topContent}<nav aria-label="Navegação de Vendas" className="mb-2 overflow-x-auto border border-slate-300 bg-white"><div className="flex min-w-max items-center gap-1 p-1">{activeSections.flatMap(section=>section.items).map(item=>{const Icon=item.icon;const on=active(item.href);return <Link key={item.href} to={item.href} aria-current={on?'page':undefined} className={`flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-medium whitespace-nowrap transition ${on?'border-[#2D8DB8] bg-[#2D8DB8] text-white':'border-transparent text-slate-600 hover:border-slate-200 hover:bg-[#F4FBFD]'}`} title={item.label}><Icon size={13} strokeWidth={1.8}/>{item.label}</Link>})}</div></nav>{children}</div>
  </main>
  <style>{`\n.vendas-standard .rounded,.vendas-standard .rounded-sm,.vendas-standard .rounded-md,.vendas-standard .rounded-lg,.vendas-standard .rounded-xl,.vendas-standard .rounded-2xl{border-radius:2px!important}\n.vendas-standard .font-bold,.vendas-standard .font-extrabold,.vendas-standard .font-black{font-weight:500!important}\n.vendas-standard button{border-radius:2px}\n.vendas-standard input:not([type=checkbox]):not([type=radio]):not([type=range]),.vendas-standard select{border-radius:2px}\n`}</style>{tabletMode&&<style>{`.tablet-mode input,.tablet-mode select,.tablet-mode button{min-height:36px}`}</style>}
 </div>
}
