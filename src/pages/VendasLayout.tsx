import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BarChart3, BookOpen, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, LogOut, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Tablet, Target, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import { useIsMobile } from '../hooks/useIsMobile'

export type SalesNavItem = { label:string; href:string; icon:typeof LayoutDashboard }
export type SalesNavSection = { label:string; items:SalesNavItem[] }

type VendasStatus = { atrasados:number; producao:number; acabamento:number; almoxarifado:number; liberadoNF:number; totalPendente:number }
type Operator = { nome:string|null; email:string|null }
const initialVendasStatus:VendasStatus={atrasados:0,producao:0,acabamento:0,almoxarifado:0,liberadoNF:0,totalPendente:0}
const normalizeVendasStatus=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()

export function useVendasStatus(){
 const [status,setStatus]=useState<VendasStatus>(initialVendasStatus)
 const [loading,setLoading]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true)
  try{
   const empresa=await supabase.rpc('erp_current_empresa_id')
   if(empresa.error||!empresa.data) throw empresa.error??new Error('Empresa não identificada.')
   const rows=await fetchAllPages<{status:string|null;data_entrega_prometida:string|null}>((from,to)=>supabase.from('erp_pedidos_venda').select('status,data_entrega_prometida',{count:'exact'}).eq('empresa_id',String(empresa.data)).range(from,to))
   const today=new Date();today.setHours(0,0,0,0)
   let atrasados=0,producao=0,acabamento=0,almoxarifado=0,liberadoNF=0,totalPendente=0
   for(const row of rows){
    const s=normalizeVendasStatus(String(row.status??''))
    const finalizado=s.includes('fatur')||s.includes('cancel')||s.includes('conclu')
    const due=row.data_entrega_prometida?new Date(String(row.data_entrega_prometida).slice(0,10)+'T00:00:00'):null
    if(due&&due<today&&!finalizado) atrasados++
    if(s.includes('produc')||s.includes('fabric')) producao++
    if(s.includes('acab')) acabamento++
    if(s.includes('almox')||s.includes('mater')) almoxarifado++
    if((s.includes('liber')&&s.includes('nf'))||s.includes('fatur')) liberadoNF++
    if(!finalizado) totalPendente++
   }
   setStatus({atrasados,producao,acabamento,almoxarifado,liberadoNF,totalPendente})
  }finally{setLoading(false)}
 },[])
 return {status,loading,load}
}

export function VendasStatusCards({status,loading}:{status:VendasStatus;loading:boolean}){
 const cards=[['Atrasados',status.atrasados,'bg-red-50 border-red-300 text-red-700'],['Produção',status.producao,'bg-orange-50 border-orange-300 text-orange-700'],['Acabamento',status.acabamento,'bg-yellow-50 border-yellow-300 text-yellow-700'],['Almoxarifado',status.almoxarifado,'bg-blue-50 border-blue-300 text-blue-700'],['Liberado NF',status.liberadoNF,'bg-cyan-50 border-cyan-300 text-cyan-700'],['Total pendente',status.totalPendente,'bg-slate-50 border-slate-300 text-[#123B50]']] as const
 return <div className="mb-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label,value,tone])=><div key={label} className={`border px-2.5 py-2 ${tone}`}><span className="block text-[8px] uppercase tracking-wide">{label}</span><strong className="block text-[17px] leading-5 font-medium">{loading?'—':value}</strong></div>)}</div>
}

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

export default function VendasLayout({children,title,subtitle,onRefresh,navSections:_navSections,topContent}:{children:ReactNode;title:string;subtitle?:string;onRefresh?:()=>void;navSections?:SalesNavSection[];topContent?:ReactNode}){
 const {pathname}=useLocation()
 const tabletMode=useIsMobile()
 const isVendas=pathname.startsWith('/vendas')
 const {status,loading:statusLoading,load:loadStatus}=useVendasStatus()
 const [operator,setOperator]=useState<Operator>({nome:null,email:null})
 const [now,setNow]=useState(new Date())
 const logout=async()=>{await supabase.auth.signOut();window.location.assign('/login')}
 const mainRoute=isVendas?'/vendas':pathname.startsWith('/pcp')?'/pcp':(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))?'/estoque':pathname.startsWith('/qualidade')?'/qualidade':pathname.startsWith('/compras')?'/compras':pathname.startsWith('/financeiro')?'/financeiro':pathname.startsWith('/rh')?'/rh':pathname.startsWith('/manutencao')?'/manutencao':'/erp-industrial'
 const tabletLabel=isVendas?'TABLET VENDAS':pathname.startsWith('/pcp')?'TABLET PCP':pathname.startsWith('/estoque')||pathname.startsWith('/inventario')?'TABLET ESTOQUE':pathname.startsWith('/qualidade')?'TABLET QUALIDADE':pathname.startsWith('/compras')?'TABLET COMPRAS':pathname.startsWith('/financeiro')?'TABLET FINANCEIRO':pathname.startsWith('/rh')?'TABLET RH':pathname.startsWith('/manutencao')?'TABLET MANUTENÇÃO':'TABLET GLOBAL'
 useEffect(()=>{let mounted=true;void supabase.auth.getUser().then(({data})=>{if(mounted&&data.user)setOperator({nome:(data.user.user_metadata?.nome as string|undefined)??null,email:data.user.email??null})});const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>{mounted=false;window.clearInterval(timer)}},[])
 useEffect(()=>{if(isVendas)void loadStatus().catch(()=>undefined)},[isVendas,loadStatus])
 const operatorLabel=operator.nome??operator.email??'Operador autenticado'
 const dateLabel=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(now)
 const timeLabel=new Intl.DateTimeFormat('pt-BR',{timeStyle:'short'}).format(now)
 return <div className={`vendas-standard min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode?'tablet-mode':''}`}>
  <main className="min-w-0">
   <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3">
    <div className="flex min-w-0 items-center gap-2">
     <div className="vendas-brand-logo"><img src="/logo/sgq-erp.png" alt="SGQERP" /></div><div className="vendas-brand-title"><strong>SGQERP INDUSTRIAL</strong><span>CENTRAL DE CONTROLE</span></div>
    </div>
    <div className="flex items-center gap-1 text-[9px] text-slate-600"><span className="hidden lg:inline">{operatorLabel}</span><span>{dateLabel} {timeLabel}</span><span>DADOS: SUPABASE</span>
     <button type="button" onClick={()=>window.location.assign(mainRoute)} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar"><span>←</span>Voltar</button>
     <button type="button" onClick={()=>window.location.assign('/vendas/tablet')} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Abrir Tablet do módulo"><Tablet size={13}/>{tabletLabel}</button>
     {onRefresh&&<button type="button" onClick={onRefresh} className="flex h-7 items-center border border-slate-300 bg-white px-2" title="Atualizar"><RefreshCw size={13}/></button>}
     <button type="button" onClick={()=>void logout()} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair"><LogOut size={13}/>SAIR</button>
    </div>
   </header>
   <div className="p-2 lg:p-3">
    {isVendas&&<VendasStatusCards status={status} loading={statusLoading}/>} 
    <div className="mb-2 border-b border-slate-200 pb-1"><h1 className="text-[13px] leading-4 font-medium text-[#123B50]">{title}</h1>{subtitle&&<p className="text-[9px] text-slate-500">{subtitle}</p>}</div>
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
