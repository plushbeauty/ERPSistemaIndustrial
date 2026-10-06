import type { ReactNode } from 'react'
import { BarChart3, BookOpen, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, LogOut, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Tablet, Target, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'

export type SalesNavItem = { label:string; href:string; icon:typeof LayoutDashboard }
export type SalesNavSection = { label:string; items:SalesNavItem[] }

export const sections:SalesNavSection[]=[
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
 const tabletMode=isMobile
 const activeSections=navSections??sections
 const logout=async()=>{await supabase.auth.signOut();window.location.assign('/login')}
 const active=(href:string)=>href==='/vendas'?pathname==='/vendas':pathname===href||pathname.startsWith(href+'/')
 const mainRoute=pathname.startsWith('/vendas')?'/vendas':pathname.startsWith('/pcp')?'/pcp':(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))?'/estoque':pathname.startsWith('/qualidade')?'/qualidade':'/erp-industrial'
 return <div className={`vendas-standard min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode?'tablet-mode':''}`}>
  <main className="min-w-0">
   <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3">
    <div className="flex min-w-0 items-center gap-2">
     <div className="vendas-brand-logo"><img src="/logo/sgq-erp.png" alt="SGQERP" /></div><div className="vendas-brand-title"><strong>SGQERP INDUSTRIAL</strong><span>CENTRAL DE CONTROLE</span></div>
    </div>
    <div className="flex items-center gap-1">
     <button type="button" onClick={()=>window.location.assign(mainRoute)} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar"><span>←</span>Voltar</button>
     <button type="button" onClick={()=>window.location.assign('/vendas/tablet')} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Abrir Tablet de Vendas"><Tablet size={13}/>TABLET VENDAS</button>
     {onRefresh&&<button type="button" onClick={onRefresh} className="flex h-7 items-center border border-slate-300 bg-white px-2" title="Atualizar"><RefreshCw size={13}/></button>}
     <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair"><LogOut size={13}/>Sair</button>
    </div>
   </header>
   <div className="p-2 lg:p-3">
    <div className="mb-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
     {[
      ['Atrasados','41','bg-red-50 border-red-300 text-red-700'],
      ['Produção','0','bg-orange-50 border-orange-300 text-orange-700'],
      ['Acabamento','0','bg-yellow-50 border-yellow-300 text-yellow-700'],
      ['Almoxarifado','0','bg-blue-50 border-blue-300 text-blue-700'],
      ['Liberado NF','0','bg-cyan-50 border-cyan-300 text-cyan-700'],
      ['Total pendente','50','bg-slate-50 border-slate-300 text-[#123B50]']
     ].map(([label,value,tone])=><div key={label} className={`border px-2.5 py-2 ${tone}`}>
      <span className="block text-[8px] uppercase tracking-wide">{label}</span><strong className="block text-[17px] leading-5 font-medium">{value}</strong>
     </div>)}
    </div>
    {topContent}{children}</div>
  </main>
  <style>{`
.vendas-standard .rounded,.vendas-standard .rounded-sm,.vendas-standard .rounded-md,.vendas-standard .rounded-lg,.vendas-standard .rounded-xl,.vendas-standard .rounded-2xl{border-radius:2px!important}
.vendas-standard .font-bold,.vendas-standard .font-extrabold,.vendas-standard .font-black{font-weight:500!important}
.vendas-standard h1,.vendas-standard h2,.vendas-standard h3,.vendas-standard p,.vendas-standard label{font-weight:500!important}
.vendas-standard{font-size:10px}
.vendas-brand-logo{height:38px;min-width:118px;display:flex;align-items:center}.vendas-brand-logo img{height:100%;width:auto;object-fit:contain}.vendas-brand-title{display:flex;flex-direction:column;justify-content:center;border-left:1px solid #cbd5e1;padding-left:10px;line-height:1.1}.vendas-brand-title strong{font-size:13px;font-weight:600;color:#123B50}.vendas-brand-title span{margin-top:3px;font-size:8px;font-weight:500;letter-spacing:.12em;color:#64748b}
.vendas-standard button{border-radius:2px}
.vendas-standard input:not([type=checkbox]):not([type=radio]):not([type=range]),.vendas-standard select{border-radius:2px}
`}</style>{tabletMode&&<style>{`.tablet-mode input,.tablet-mode select,.tablet-mode button{min-height:36px}`}</style>}
 </div>
}
