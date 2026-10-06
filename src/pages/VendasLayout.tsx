import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, BarChart3, BookOpen, ClipboardList, FilePlus2, FolderKanban, LayoutDashboard, ListChecks, LogOut, PackagePlus, PackageSearch, RefreshCw, Settings2, ShoppingCart, Tablet, Target, Users, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
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
 const navigate=useNavigate()
 const tabletMode=useIsMobile()
 const [tabletOpen,setTabletOpen]=useState(false)
 const isVendas=pathname.startsWith('/vendas')
 const {status,loading:statusLoading,load:loadStatus}=useVendasStatus()
 const [operator,setOperator]=useState<Operator>({nome:null,email:null})
 const [now,setNow]=useState(new Date())
 const logout=async()=>{await supabase.auth.signOut();window.location.assign('/login')}
 const mainRoute=isVendas?'/vendas':pathname.startsWith('/pcp')?'/pcp':(pathname.startsWith('/estoque')||pathname.startsWith('/inventario'))?'/estoque':pathname.startsWith('/qualidade')?'/qualidade':pathname.startsWith('/compras')?'/compras':pathname.startsWith('/financeiro')?'/financeiro':pathname.startsWith('/rh')?'/rh':pathname.startsWith('/manutencao')?'/manutencao':'/erp-industrial'
 const tabletLabel=isVendas?'TABLET VENDAS':pathname.startsWith('/pcp')?'TABLET PCP':pathname.startsWith('/estoque')||pathname.startsWith('/inventario')?'TABLET ESTOQUE':pathname.startsWith('/qualidade')?'TABLET QUALIDADE':pathname.startsWith('/compras')?'TABLET COMPRAS':pathname.startsWith('/financeiro')?'TABLET FINANCEIRO':pathname.startsWith('/rh')?'TABLET RH':pathname.startsWith('/manutencao')?'TABLET MANUTENÇÃO':'TABLET GLOBAL'
 useEffect(()=>{let mounted=true;void supabase.auth.getUser().then(({data})=>{if(mounted&&data.user)setOperator({nome:(data.user.user_metadata?.nome as string|undefined)??null,email:data.user.email??null})});const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>{mounted=false;window.clearInterval(timer)}},[])
 useEffect(()=>{if(isVendas)void loadStatus().catch(()=>undefined)},[isVendas,loadStatus])
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('tablet')==='1')setTabletOpen(true)},[])
 const operatorLabel=operator.nome??operator.email??'Operador autenticado'
 const dateLabel=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(now)
 const timeLabel=new Intl.DateTimeFormat('pt-BR',{timeStyle:'short'}).format(now)
 return <div className={`vendas-standard min-h-screen bg-[#F4F7FE] text-slate-800 ${tabletMode?'tablet-mode':''}`}>
  <main className="min-w-0">
   <header className="vendas-topbar" aria-label="Barra superior do ERP">
    <div className="vendas-top-brand"><div className="vendas-logo-frame"><img src="/logo/sgq-erp.png" alt="SGQERP" /></div><div className="vendas-top-title"><strong>SGQERP INDUSTRIAL</strong><span>CENTRAL DE CONTROLE</span></div></div>
    <div className="vendas-top-actions">
      <button type="button" onClick={()=>setTabletOpen(true)} className="vendas-top-tablet" title="Abrir Tablet Vendas"><Tablet size={15}/>TABLET VENDAS</button>
      <div className="vendas-top-user"><span>OPERADOR</span><strong>{operatorLabel}</strong></div><div className="vendas-top-date"><strong>{dateLabel}</strong><span>{timeLabel}</span></div><span className="vendas-top-data">DADOS: SUPABASE</span>
      <button type="button" onClick={()=>window.location.assign(mainRoute)} className="vendas-top-back" title="Voltar"><ArrowLeft size={14}/>VOLTAR</button>
      {onRefresh&&<button type="button" onClick={onRefresh} className="vendas-top-icon" title="Atualizar"><RefreshCw size={14}/></button>}
      <button type="button" onClick={()=>void logout()} className="vendas-top-exit" title="Sair">SAIR</button>
    </div>
   </header>   <div className="p-2 lg:p-3">
    {isVendas&&<VendasStatusCards status={status} loading={statusLoading}/>} 
    <div className="mb-2 border-b border-slate-200 pb-1"><h1 className="text-[13px] leading-4 font-medium text-[#123B50]">{title}</h1>{subtitle&&<p className="text-[9px] text-slate-500">{subtitle}</p>}</div>
    {topContent}{children}</div>
  </main>
  {tabletOpen&&<div className="vendas-tablet-overlay" role="dialog" aria-modal="true" aria-label="Tablet Vendas">
    <section className="vendas-tablet-modal">
      <header className="vendas-tablet-head"><div><span>SGQERP INDUSTRIAL</span><strong>TABLET VENDAS — CENTRAL DE COMANDO</strong><small>Operações comerciais no mesmo padrão do Tablet principal.</small></div><button type="button" onClick={()=>setTabletOpen(false)} title="Fechar"><X size={18}/></button></header>
      <div className="vendas-tablet-grid">{sections.flatMap(section=>section.items).map(item=>{const Icon=item.icon;const tone=item.label==='Novo pedido'?'#F97316':item.label==='Pedidos de venda'?'#2D8DB8':item.label==='Catálogo digital'?'#22AFC0':item.label==='Análise de custos'?'#3A9D78':item.label==='Clientes'?'#22AFC0':item.label==='Pedidos pendentes'?'#6B3FA0':'#2D8DB8';return <button key={item.href} type="button" onClick={()=>{setTabletOpen(false);navigate(item.href)}} title={item.label}><span style={{color:tone,borderColor:tone+'55',background:tone+'12'}}><Icon size={20}/></span><strong>{item.label}</strong></button>})}</div>
    </section>
  </div>}
  <style>{`\n.vendas-topbar{position:relative;z-index:30;width:100%;min-height:104px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:10px 24px;background:#fff;border-bottom:1px solid #cbd5e1;box-sizing:border-box}.vendas-top-brand{display:flex;align-items:center;gap:18px;min-width:0}.vendas-logo-frame{height:80px;min-width:210px;display:flex;align-items:center}.vendas-logo-frame img{height:100%;width:auto;object-fit:contain}.vendas-top-title{display:flex;flex-direction:column;border-left:1px solid #cbd5e1;padding-left:18px;line-height:1.1}.vendas-top-title strong{font-size:20px;font-weight:600;color:#1e293b;white-space:nowrap}.vendas-top-title span{margin-top:5px;font-size:10px;font-weight:500;letter-spacing:.14em;color:#475569}.vendas-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0}.vendas-top-tablet,.vendas-top-exit,.vendas-top-back,.vendas-top-icon{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:0 12px;border-radius:2px;border:1px solid #cbd5e1;background:#fff;color:#1e293b;font-size:10px;font-weight:500;white-space:nowrap}.vendas-top-tablet{background:#ea580c;border-color:#c2410c;color:#fff}.vendas-top-exit{border-color:#fecaca;color:#991b1b}.vendas-top-user,.vendas-top-date{display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:42px;padding:0 12px;border-left:1px solid #e2e8f0;white-space:nowrap}.vendas-top-user span{font-size:9px;color:#64748b}.vendas-top-user strong{font-size:11px;font-weight:500;color:#1e293b}.vendas-top-date strong,.vendas-top-date span{font-size:10px;font-weight:500;color:#475569}.vendas-top-data{display:inline-flex;align-items:center;min-height:34px;padding:0 10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:2px;color:#065f46;font-size:9px;font-weight:500;white-space:nowrap}
.vendas-tablet-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(7,29,37,.62);backdrop-filter:blur(5px)}.vendas-tablet-modal{width:min(1180px,96vw);max-height:86vh;overflow:auto;background:#f4fbfd;border:1px solid #2D8DB8;border-radius:2px;box-shadow:0 28px 70px rgba(0,0,0,.28)}.vendas-tablet-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;background:#123b50;color:#fff;border-bottom:3px solid #2d8db8}.vendas-tablet-head span,.vendas-tablet-head strong,.vendas-tablet-head small{display:block}.vendas-tablet-head span{font-size:9px;letter-spacing:.16em;color:#8ed9e5}.vendas-tablet-head strong{margin-top:3px;font-size:18px;font-weight:600}.vendas-tablet-head small{margin-top:4px;font-size:10px;color:#d5edf3}.vendas-tablet-head button{width:34px;height:34px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff}.vendas-tablet-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:16px}.vendas-tablet-grid button{min-height:82px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px solid #c8e1e8;border-radius:2px;background:#fff;color:#123b50}.vendas-tablet-grid button:hover{border-color:#2d8db8;background:#f4fbfd}.vendas-tablet-grid button span{width:32px;height:32px;display:grid;place-items:center;background:#e7f7fa;color:#2d8db8;border:1px solid #c8e1e8}.vendas-tablet-grid button strong{font-size:9px;font-weight:500;text-align:center}@media(max-width:1180px){.vendas-logo-frame{height:72px;min-width:185px}.vendas-top-title{display:none}.vendas-tablet-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:900px){.vendas-top-date,.vendas-top-data{display:none}.vendas-logo-frame{height:64px;min-width:165px}}@media(max-width:650px){.vendas-topbar{min-height:72px;padding:7px 10px}.vendas-logo-frame{height:54px;min-width:135px}.vendas-top-user{display:none}.vendas-top-actions{gap:5px}.vendas-top-tablet,.vendas-top-exit,.vendas-top-back{min-height:36px;padding:0 8px;font-size:9px}.vendas-tablet-overlay{padding:8px}.vendas-tablet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
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
