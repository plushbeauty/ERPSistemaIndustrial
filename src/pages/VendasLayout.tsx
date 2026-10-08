import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BarChart3, BookOpen, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Target, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'
import '../styles/synqra-workspace.css'
import ERPHorizontalShell from '../components/layout/ERPHorizontalShell'

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
 {label:'VISÃO GERAL',items:[{label:'Dashboard comercial',href:'/vendas',icon:LayoutDashboard},{label:'Faturamento / NF-e',href:'/fiscal/emissao',icon:FilePlus2}]},
 {label:'OPERAÇÃO',items:[{label:'Pedidos de venda',href:'/vendas/pedidos',icon:ClipboardList},{label:'Novo pedido',href:'/vendas/novo-pedido',icon:FilePlus2},{label:'Pedidos pendentes',href:'/vendas/pendentes',icon:ListChecks},{label:'Status do pedido',href:'/vendas/status',icon:ListChecks},{label:'Carteira de pedidos',href:'/vendas/carteira',icon:FolderKanban},{label:'PDV / venda rápida',href:'/vendas/pdv',icon:ShoppingCart}]},
 {label:'COMERCIAL',items:[{label:'Clientes',href:'/vendas/clientes',icon:Users},{label:'Orçamentos e custos',href:'/vendas/orcamentos',icon:PackageSearch},{label:'Análise de custos',href:'/vendas/analise-custos',icon:PackageSearch},{label:'Metas',href:'/vendas/metas',icon:Target},{label:'Vendedores / comissões',href:'/comissoes/perfil',icon:Users},{label:'Relatórios',href:'/vendas/relatorios',icon:BookOpen},{label:'Cadastro de Produtos',href:'/produtos-vendas',icon:PackagePlus}]},
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

export default function VendasLayout({children,title,subtitle,onRefresh,topContent,titleActions}:{
 children:ReactNode;title:string;subtitle?:string;onRefresh?:()=>void;navSections?:SalesNavSection[];topContent?:ReactNode;titleActions?:ReactNode
}){
 const {pathname}=useLocation()
 const isVendas=pathname.startsWith('/vendas')
 const vendas=useVendasStatus()
 useEffect(()=>{if(isVendas)void vendas.load().catch(()=>undefined)},[isVendas,vendas.load])

 return <ERPHorizontalShell>
  <main className="synqra-workspace-main">
    {isVendas&&<VendasStatusCards status={vendas.status} loading={vendas.loading}/>} 
    <div className="synqra-workspace-title"><div>{titleActions&&<div className="synqra-title-actions">{titleActions}</div>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{onRefresh&&<button className="synqra-tool-button" type="button" onClick={onRefresh}><RefreshCw size={13}/>Atualizar</button>}</div>
    {topContent}{children}
  </main>
 </ERPHorizontalShell>
}
