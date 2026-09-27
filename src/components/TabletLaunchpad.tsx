/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-046
 * Alterações: Usar o ícone Search oficial no lugar de componente incompatível.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { useEffect,useState } from 'react'
import { Activity, ArrowLeft, BarChart3, BookOpen, Boxes, ClipboardCheck, ClipboardList, Factory, FileCheck2, FileText, Gauge, HelpCircle, Landmark, LayoutDashboard, Package, Search, Settings, ShieldCheck, ShoppingCart, Users, Warehouse, Wrench, X, UserRound, SlidersHorizontal, Truck, Languages } from 'lucide-react'
type IconComponent = typeof Activity
type Action={label:string;description:string;icon:IconComponent;route:string}
type Module={label:string;description:string;icon:IconComponent;actions:Action[]}
const A=(label:string,description:string,icon:IconComponent,route:string):Action=>({label,description,icon,route})
const modules:Module[]=[
 {label:'PCP • Planejamento e Controle',description:'Um único workspace para demanda, BOM, OP, materiais, programação, capacidade e chão de fábrica.',icon:Factory,actions:[
  A('Abrir PCP','Entrar no workspace completo do PCP',LayoutDashboard,'/pcp')
 ]},
 {label:'Qualidade • SGQ',description:'Inspeções, RPNC, calibração, documentos vivos e auditorias.',icon:ShieldCheck,actions:[
  A('Painel SGQ','Indicadores e Pareto',Gauge,'/qualidade'),
  A('Inspeções','Controle de recebimento, processo e final',ClipboardCheck,'/qualidade?tab=inspecao'),
  A('RPNC / CAPA','Não conformidade e ações corretivas',FileCheck2,'/qualidade?tab=rpnc'),
  A('Calibração','Equipamentos, certificados e revisões',Gauge,'/qualidade/calibracao'),
  A('Documentos Vivos','Revisão, validade, aprovação e histórico',FileText,'/qualidade/documentos'),
  A('Auditorias','Plano, execução e evidências',ClipboardList,'/qualidade?tab=auditorias'),
  A('Planos de Inspeção','Características e limites',Settings,'/qualidade?tab=planos')
 ]},
 {label:'Almoxarifado • WMS',description:'Recebimento, lotes, endereços, reservas, separação e rastreabilidade.',icon:Warehouse,actions:[
  A('Almoxarifado','Movimentações e saldos',Warehouse,'/almoxarifado'),A('Estoque','Saldo, inventário e movimentos',Package,'/estoque'),A('Recebimento','Conferência de materiais',Package,'/recebimento-materiais'),A('Rastreabilidade','Lotes e histórico',ShieldCheck,'/estoque')
 ]},
 {label:'Fiscal • Financeiro',description:'NF-e, faturamento, documentos e caixa.',icon:Landmark,actions:[
  A('Fiscal','Documentos e liberações',Landmark,'/fiscal'),A('Nova NF-e','Modelo 55 / simulador',FileText,'/fiscal/nova'),A('Previsão de Caixa','Entradas e saídas',Activity,'/fiscal/previsao-caixa')
 ]},
 {label:'Vendas • Comercial',description:'Um único workspace para pedidos, carteira, clientes, metas e configurações de vendas.',icon:ShoppingCart,actions:[
  A('Abrir Vendas','Entrar no workspace completo de Vendas',ShoppingCart,'/pedidos-vendas')
 ]},
 {label:'Moldes & Ferramentaria',description:'Moldes, ciclos, preventiva, localização e ordens de serviço.',icon:Wrench,actions:[A('Moldes & Ferramentaria','Ficha técnica, ciclos e histórico de O.S.',Wrench,'/moldes-injecao')]},
 {label:'Compras',description:'Solicitações, fornecedores, pedidos e recebimento.',icon:ShoppingCart,actions:[
  A('Solicitação de Compra','Necessidades internas',ClipboardList,'/compras-solicitacao'),A('Fornecedores','Cadastro e qualificação',Users,'/fornecedores'),A('Recebimento','Entrada e conferência',Package,'/recebimento-materiais')
 ]},
 {label:'Administração',description:'Usuários, permissões, empresa, identidade e infraestrutura.',icon:Settings,actions:[
  A('Configurações','Identidade e empresa',Settings,'/configuracoes-adm'),A('Usuários / ACL','Permissões por colaborador',Users,'/usuarios'),A('Empresa','Dados e identidade visual',SlidersHorizontal,'/erp-industrial'),A('ACL e Prefixos','Permissões por colaborador e numeração',ShieldCheck,'/configuracoes-adm')
 ]},
 {label:'Relatórios',description:'Indicadores e consultas do ERP.',icon:BarChart3,actions:[
  A('Dashboard Industrial','Visão executiva',Gauge,'/erp-industrial'),A('PCP / Produção','Planejado x realizado',Factory,'/pcp'),A('Qualidade','Pareto e RPNC',ShieldCheck,'/qualidade'),A('Estoque','Saldos e movimentos',Boxes,'/estoque'),A('Fiscal / Financeiro','Documentos e caixa',Landmark,'/fiscal')
 ]},
 {label:'Ajuda',description:'Manual operacional e ajuda contextual.',icon:HelpCircle,actions:[A('Manual do Usuário','Como operar cada módulo',BookOpen,'/manual-usuario'),A('Ajuda do módulo','Orientação contextual',HelpCircle,'/manual-usuario')]}
]
export default function TabletLaunchpad({onNavigate,isOpen,onClose}:{onNavigate:(route:string)=>void;isOpen:boolean;onClose:()=>void}){
 const[selected,setSelected]=useState<Module|null>(null)
 useEffect(()=>{if(!isOpen)setSelected(null)},[isOpen])
 if(!isOpen)return null

 const openModule=(module:Module)=>{
  if(module.label.startsWith('PCP')){onNavigate('/pcp');return}
  if(module.label.startsWith('Vendas')){onNavigate('/pedidos-vendas');return}
  setSelected(module)
 }

 return <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true">
  <section className="flex max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-white shadow-2xl">
   <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 bg-slate-950 px-5 py-4">
    <div className="flex min-w-0 items-center gap-4">
     <img src="/logo-industrial.svg" alt="ERP Industrial" className="h-16 w-auto max-w-[360px] object-contain sm:h-20"/>
     <div className="min-w-0 border-l border-slate-700 pl-4">
      <span className="block text-sm font-extrabold uppercase tracking-[0.18em] text-sky-300">SGQ ERP INDUSTRIAL</span>
      <strong className="block truncate text-xl font-extrabold sm:text-2xl">{selected?selected.label:'Tablet Operacional'}</strong>
      <small className="block truncate text-base text-slate-300">{selected?selected.description:'Ambiente de operação industrial'}</small>
     </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
     <button className="rounded-md border border-slate-600 bg-slate-800 p-3 text-slate-100 hover:bg-slate-700" onClick={()=>{const n=localStorage.getItem('erp-lang')==='en-US'?'pt-BR':'en-US';localStorage.setItem('erp-lang',n);location.reload()}} title="Idioma"><Languages size={24}/></button>
     {selected&&<button onClick={()=>setSelected(null)} className="rounded-md border border-slate-600 bg-slate-800 p-3 text-slate-100 hover:bg-slate-700" title="Voltar"><ArrowLeft size={24}/></button>}
     <button onClick={onClose} className="rounded-md border border-red-700 bg-red-700/20 p-3 text-red-300 hover:bg-red-700 hover:text-white" title="Fechar tablet"><X size={26}/></button>
    </div>
   </header>

   <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
    {!selected?<div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-700 pb-5">
       <div><span className="text-sm font-extrabold uppercase tracking-[0.18em] text-sky-300">WORKSPACES OPERACIONAIS</span><h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Escolha o ambiente de trabalho</h2><p className="mt-1 text-base text-slate-300">Cada módulo abre diretamente sua área operacional, sem uma segunda tela de seleção.</p></div>
       <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100"><UserRound size={21}/><b>Operação ERP</b></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       {modules.slice(0,6).map(m=><ModuleCard key={m.label} module={m} onClick={()=>openModule(m)}/>)}
      </div>
      <div className="border-t border-slate-700 pt-5">
       <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-sky-300">CONFIGURAÇÕES E APOIO</span>
       <h3 className="mt-1 text-xl font-extrabold text-white">Cadastros e administração</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       {modules.slice(6).map(m=><ModuleCard key={m.label} module={m} onClick={()=>openModule(m)}/>)}
      </div>
    </div>:<div className="space-y-5">
      <button className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 py-3 text-base font-extrabold text-white hover:bg-slate-700" onClick={()=>setSelected(null)}><ArrowLeft size={19}/> Todos os módulos</button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{selected.actions.map(a=>{const I=a.icon;return <button key={a.label} className="flex min-h-28 items-center gap-4 rounded-md border border-slate-700 bg-slate-800 p-5 text-left text-white shadow-lg hover:border-sky-500 hover:bg-slate-750" onClick={()=>onNavigate(a.route)}><span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-sky-700 text-white"><I size={30}/></span><span className="min-w-0 flex-1"><b className="block text-lg font-extrabold">{a.label}</b><small className="mt-1 block text-base text-slate-300">{a.description}</small></span><span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-extrabold text-sky-300">ABRIR</span></button>})}</div>
    </div>}
   </div>
   <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-300"><span>© FernandoSch_System</span><span>ERP Industrial • Operação integrada • RLS</span></footer>
  </section>
 </div>
}
function ModuleCard({module,onClick}:{module:Module;onClick:()=>void}){const I=module.icon;return <button className="group flex min-h-32 items-center gap-4 rounded-md border border-slate-700 bg-slate-800 p-5 text-left text-white shadow-xl transition hover:-translate-y-0.5 hover:border-sky-500 hover:bg-slate-750" onClick={onClick}><span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-slate-950 text-sky-300 ring-1 ring-slate-700 group-hover:bg-sky-700 group-hover:text-white"><I size={40}/></span><span className="min-w-0 flex-1"><b className="block text-lg font-extrabold leading-tight">{module.label}</b><small className="mt-2 block text-base leading-6 text-slate-300">{module.description}</small></span><span className="text-3xl text-slate-400 group-hover:text-sky-300">›</span></button>}
