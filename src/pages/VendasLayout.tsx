import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BarChart3, BookOpen, ClipboardList, FilePlus2, LayoutDashboard, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Target, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-workspace.css'
import { SynqraLayoutProvider } from '../layout/SynqraLayoutContext'

export type SalesNavItem = { label:string; href:string; icon:typeof LayoutDashboard }
export type SalesNavSection = { label:string; items:SalesNavItem[] }
type VendasStatus = { atrasados:number; producao:number; acabamento:number; almoxarifado:number; liberadoNF:number; totalPendente:number }
const normalizeStatus=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const initialVendasStatus:VendasStatus={atrasados:0,producao:0,acabamento:0,almoxarifado:0,liberadoNF:0,totalPendente:0}

export function useVendasStatus(){
 const [status,setStatus]=useState(initialVendasStatus); const [loading,setLoading]=useState(false)
 const load=useCallback(async()=>{setLoading(true);try{
  const empresa=await supabase.rpc('erp_current_empresa_id')
  if(empresa.error||!empresa.data)throw empresa.error??new Error('Empresa não identificada.')
  const rows=await fetchAllPages<{status:string|null;data_entrega_prometida:string|null}>((from,to)=>supabase.from('erp_pedidos_venda').select('status,data_entrega_prometida').eq('empresa_id',String(empresa.data)).range(from,to))
  const today=new Date();today.setHours(0,0,0,0)
  let atrasados=0,producao=0,acabamento=0,almoxarifado=0,liberadoNF=0,totalPendente=0
  for(const row of rows){const s=normalizeStatus(String(row.status??''));const finalizado=s.includes('fatur')||s.includes('cancel')||s.includes('conclu');const due=row.data_entrega_prometida?new Date(String(row.data_entrega_prometida).slice(0,10)+'T00:00:00'):null;if(due&&due<today&&!finalizado)atrasados++;if(s.includes('produc')||s.includes('fabric'))producao++;if(s.includes('acab'))acabamento++;if(s.includes('almox')||s.includes('mater'))almoxarifado++;if((s.includes('liber')&&s.includes('nf'))||s.includes('fatur'))liberadoNF++;if(!finalizado)totalPendente++}
  setStatus({atrasados,producao,acabamento,almoxarifado,liberadoNF,totalPendente})
 }finally{setLoading(false)}},[])
 return {status,loading,load}
}

export function VendasStatusCards({status,loading}:{status:VendasStatus;loading:boolean}){
 const cards=[['ATRASADOS',status.atrasados,'synqra-status-red'],['PRODUÇÃO',status.producao,'synqra-status-orange'],['ACABAMENTO',status.acabamento,'synqra-status-yellow'],['ALMOXARIFADO',status.almoxarifado,'synqra-status-blue'],['LIBERADO NF',status.liberadoNF,'synqra-status-cyan'],['TOTAL PENDENTE',status.totalPendente,'synqra-status-slate']] as const
 return <div className="synqra-status-grid">{cards.map(([label,value,tone])=><div key={label} className={`synqra-status-cell ${tone}`}><span>{label}</span><strong>{loading?'—':value}</strong></div>)}</div>
}

export const sections:SalesNavSection[]=[
 {label:'VISÃO GERAL',items:[{label:'Dashboard comercial',href:'/vendas',icon:LayoutDashboard}]},
 {label:'OPERAÇÃO',items:[{label:'Status do pedido',href:'/vendas/status',icon:ClipboardList},{label:'Novo pedido',href:'/vendas/novo-pedido',icon:FilePlus2},{label:'PDV / venda rápida',href:'/vendas/pdv',icon:ShoppingCart}]},
 {label:'COMERCIAL',items:[{label:'Clientes',href:'/vendas/clientes',icon:Users},{label:'Orçamentos e custos',href:'/vendas/orcamentos',icon:PackageSearch},{label:'Análise de custos',href:'/vendas/analise-custos',icon:PackageSearch},{label:'Metas',href:'/vendas/metas',icon:Target},{label:'Vendedores / comissões',href:'/comissoes/perfil',icon:Users},{label:'Relatórios',href:'/vendas/relatorios',icon:BookOpen}]},
 {label:'FERRAMENTAS',items:[{label:'Catálogo digital',href:'/vendas/catalogo-digital',icon:BookOpen},{label:'Gestão do catálogo',href:'/vendas/catalogo-digital/gestao',icon:BookOpen},{label:'Ajuste global / preços',href:'/vendas/reajuste',icon:Settings2}]},
]

type ModuleMenu={label:string;route:string;icon:typeof LayoutDashboard}
function moduleMenu(pathname:string):ModuleMenu{
 if(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))return{label:'MENU ESTOQUE',route:'/estoque',icon:PackagePlus}
 if(pathname.startsWith('/qualidade')||pathname.startsWith('/sgq'))return{label:'MENU QUALIDADE',route:'/qualidade',icon:ClipboardList}
 if(pathname.startsWith('/fiscal')||pathname.startsWith('/vendas/fiscal'))return{label:'MENU FISCAL',route:'/fiscal',icon:FilePlus2}
 if(pathname.startsWith('/pcp'))return{label:'MENU PCP',route:'/pcp',icon:PackagePlus}
 if(pathname.startsWith('/financeiro'))return{label:'MENU FINANCEIRO',route:'/financeiro',icon:BarChart3}
 if(pathname.startsWith('/rh'))return{label:'MENU RH',route:'/rh',icon:Users}
 if(pathname.startsWith('/engenharia'))return{label:'MENU ENGENHARIA',route:'/engenharia',icon:Settings2}
 if(pathname.startsWith('/manutencao'))return{label:'MENU MANUTENÇÃO',route:'/manutencao',icon:Settings2}
 if(pathname.startsWith('/compras'))return{label:'MENU COMPRAS',route:'/compras',icon:PackagePlus}
 if(pathname.startsWith('/vendas'))return{label:'MENU VENDAS',route:'/vendas',icon:ShoppingCart}
 return{label:'MENU PRINCIPAL',route:'/erp-industrial',icon:LayoutDashboard}
}

export default function VendasLayout({children,title,subtitle,onRefresh,topContent,titleActions,showStatusCards}:{
 children:ReactNode;title:string;subtitle?:string;onRefresh?:()=>void;navSections?:SalesNavSection[];topContent?:ReactNode;titleActions?:ReactNode;showStatusCards?:boolean
}){
 const {pathname}=useLocation()
 const isVendas=pathname.startsWith('/vendas')
 const isCompras=pathname.startsWith('/compras') || pathname === '/fiscal/compras'
 const vendas=useVendasStatus()
 useEffect(()=>{if(isVendas)void vendas.load().catch(()=>undefined)},[isVendas,vendas.load])

 useEffect(() => {
  if (!onRefresh) return
  const refreshCurrentModule = (event: Event) => { event.preventDefault(); onRefresh() }
  window.addEventListener('erp:refresh-current-module', refreshCurrentModule)
  return () => window.removeEventListener('erp:refresh-current-module', refreshCurrentModule)
 }, [onRefresh])

 const showCards=showStatusCards ?? true

 return <SynqraLayoutProvider>
  <main className="synqra-workspace-main">
    {isVendas&&showCards&&<VendasStatusCards status={vendas.status} loading={vendas.loading}/>} 
    {(title || subtitle || titleActions) && <div className="synqra-workspace-title">{titleActions&&<div className="synqra-title-actions">{titleActions}</div>}<div className="synqra-title-main">{title&&<h1>{title}</h1>}{subtitle&&<p>{subtitle}</p>}</div></div>}
    {topContent}
    {isCompras ? <div className="synqra-compras-surface">
      <style>{`
        .synqra-compras-surface{--compras-ink:#123b50;--compras-blue:#2d8db8;--compras-cyan:#48b7c7;--compras-border:#c9dde5;min-width:0;color:var(--compras-ink)}
        .synqra-compras-surface>main{min-height:0!important;padding:8px!important;background:#f4fbfd!important;color:var(--compras-ink)!important}
        .synqra-compras-surface h1,.synqra-compras-surface .buy-report-head h1,.synqra-compras-surface .buy-help-head h1{font-size:18px!important;line-height:1.25!important;font-weight:700!important;color:var(--compras-ink)!important}
        .synqra-compras-surface h2,.synqra-compras-surface .buy-report-card h2,.synqra-compras-surface .buy-help-card h2{font-size:13px!important;line-height:1.3!important;font-weight:700!important;color:var(--compras-ink)!important}
        .synqra-compras-surface p{font-size:10px;line-height:1.45}
        .synqra-compras-surface label{font-size:9px!important;font-weight:700!important;letter-spacing:.02em}
        .synqra-compras-surface input:not([type=checkbox]):not([type=radio]),.synqra-compras-surface select,.synqra-compras-surface textarea{min-width:0;max-width:100%!important;height:32px!important;min-height:32px;border:1px solid var(--compras-border)!important;border-radius:2px!important;padding:4px 7px!important;background:#fff;color:#123b50;font-size:11px!important;box-shadow:none}
        .synqra-compras-surface textarea{height:auto!important;min-height:56px!important;resize:vertical}
        .synqra-compras-surface input:focus,.synqra-compras-surface select:focus,.synqra-compras-surface textarea:focus{outline:1px solid var(--compras-blue);border-color:var(--compras-blue)!important}
        .synqra-compras-surface button,.synqra-compras-surface a[role=button]{border-radius:2px!important;font-size:10px}
        .synqra-compras-surface .rounded-full{border-radius:2px!important}
        .synqra-compras-surface .rounded-xl,.synqra-compras-surface .rounded-2xl,.synqra-compras-surface .rounded-lg,.synqra-compras-surface .rounded-md{border-radius:2px!important}
        .synqra-compras-surface .shadow,.synqra-compras-surface .shadow-sm,.synqra-compras-surface .shadow-md{box-shadow:none!important}
        .synqra-compras-surface .buy-report{min-height:0!important;padding:8px!important;background:#f4fbfd!important}
        .synqra-compras-surface .buy-report-wrap,.synqra-compras-surface .buy-help-wrap{max-width:none!important;width:100%}
        .synqra-compras-surface .buy-report-head{align-items:center;margin-bottom:8px;padding:8px 10px;background:#123b50;color:#f4fbfd}
        .synqra-compras-surface .buy-report-head h1,.synqra-compras-surface .buy-report-head p{color:#f4fbfd!important}
        .synqra-compras-surface .buy-report-kpis{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
        .synqra-compras-surface .buy-report-kpis article,.synqra-compras-surface .buy-report-card,.synqra-compras-surface .buy-help-card{border:1px solid var(--compras-border)!important;border-radius:2px!important;box-shadow:none!important;padding:8px!important}
        .synqra-compras-surface .buy-report-kpis strong{font-size:17px!important}
        .synqra-compras-surface .buy-report-grid{gap:8px;margin-top:8px}
        .synqra-compras-surface .buy-report-card [style*="height:300px"]{height:230px!important}
        .synqra-compras-surface .buy-report-card [style*="height:280px"]{height:220px!important}
        .synqra-compras-surface .buy-report-table{font-size:10px!important}
        .synqra-compras-surface .buy-report-table th{height:32px!important;padding:5px 7px!important;background:#123b50!important;color:#f4fbfd!important;font-size:9px!important}
        .synqra-compras-surface .buy-report-table td{height:32px!important;padding:5px 7px!important;border-color:var(--compras-border)!important}
        .synqra-compras-surface .buy-help-grid{gap:8px}
        .synqra-compras-surface .buy-help-card ul{font-size:10px!important;line-height:1.55!important}
        .synqra-compras-surface form .grid{grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:8px!important}
        .synqra-compras-surface form .grid>label{grid-column:span 3;max-width:none!important;width:100%!important;min-width:0}
        .synqra-compras-surface form .grid>label>*{max-width:100%!important;width:100%!important;min-width:0}
        .synqra-compras-surface form .grid>label:has(textarea){grid-column:1/-1}
        .synqra-compras-surface table{border-collapse:collapse;font-size:10px!important}
        .synqra-compras-surface table thead th{height:32px!important;padding:5px 8px!important;background:#123b50!important;color:#f4fbfd!important;font-size:9px!important;font-weight:700!important}
        .synqra-compras-surface table tbody tr{height:32px!important}
        .synqra-compras-surface table tbody td{height:32px!important;padding:5px 8px!important;border-bottom:1px solid var(--compras-border)!important;font-size:10px!important}
        .synqra-compras-surface table tbody tr:nth-child(even){background:#edf6fa!important}
        @media(max-width:900px){.synqra-compras-surface .buy-report-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.synqra-compras-surface .buy-report-grid{grid-template-columns:1fr}.synqra-compras-surface form .grid>label{grid-column:span 6}}
        @media(max-width:560px){.synqra-compras-surface form .grid>label{grid-column:1/-1}.synqra-compras-surface .buy-report-head{flex-direction:column}.synqra-compras-surface .buy-report-actions{width:100%}}
        @media print{.synqra-compras-surface>main{padding:0!important}.synqra-compras-surface .buy-report-head{background:#fff;color:#123b50}.synqra-compras-surface .buy-report-head h1,.synqra-compras-surface .buy-report-head p{color:#123b50!important}}
      `}</style>
      {children}
    </div> : children}
  </main>
 </SynqraLayoutProvider>
}
