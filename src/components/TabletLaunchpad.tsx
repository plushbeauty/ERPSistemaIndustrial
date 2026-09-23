import { useEffect,useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Activity, ArrowLeft, BarChart3, BookOpen, Boxes, CalendarCheck2, ClipboardCheck, ClipboardList, Factory, FileCheck2, FileText, Gauge, HelpCircle, Landmark, LayoutDashboard, Package, Receipt, Settings, ShieldCheck, ShoppingCart, Users, Warehouse, Wrench, X, UserRound, SlidersHorizontal, Truck, Languages } from 'lucide-react'
type IconComponent = typeof Activity
 type Action={label:string;description:string;icon:IconComponent;route:string}
type Module={label:string;description:string;icon:IconComponent;actions:Action[]}
const A=(label:string,description:string,icon:IconComponent,route:string):Action=>({label,description,icon,route})
const modules:Module[]=[
 {label:'PCP • Produção',description:'Demanda, MRP, BOM, OP, programação, materiais e chão de fábrica.',icon:Factory,actions:[
  A('Centro PCP','Ordens, demandas, capacidade e prioridades',LayoutDashboard,'/pcp'),
  A('Pedidos / Demanda','Pedidos que alimentam o planejamento',ClipboardList,'/produtos-vendas'),
  A('MRP / Materiais','Necessidade, reserva e disponibilidade',Boxes,'/pcp'),
  A('BOM / Engenharia','Estrutura, roteiro e ficha de processo',Settings,'/engenharia'),
  A('Ficha de Processo','Operações, máquina, ciclo e instruções',FileText,'/ficha-engenharia'),
  A('Programação','Máquinas, capacidade e sequência',CalendarCheck2,'/pcp'),
  A('Apontamento','Boa, refugo, retrabalho e parada',Factory,'/operacao-industrial'),
  A('Lotes / Rastreabilidade','Lote de MP, PA e OP',ShieldCheck,'/estoque')
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
  A('Almoxarifado','Movimentações e saldos',Warehouse,'/almoxarifado'),
  A('Estoque','Saldo, inventário e movimentos',Package,'/estoque'),
  A('Recebimento','Conferência de materiais',Package,'/recebimento-materiais'),
  A('Rastreabilidade','Lotes e histórico',ShieldCheck,'/estoque')
 ]},
 {label:'Qualidade • PPAP / RIA',description:'Plano dimensional, amostras, tolerâncias e PSW / FAI.',icon:ShieldCheck,actions:[A('PPAP / RIA','PSW e certificado FAI',ShieldCheck,'/qualidade/ppap-ria')]},
 {label:'Fiscal • Financeiro',description:'NF-e, faturamento, documentos e caixa.',icon:Landmark,actions:[
  A('Fiscal','Documentos e liberações',Landmark,'/fiscal'),
  A('Nova NF-e','Modelo 55 / simulador',FileText,'/fiscal/nova'),
  A('Previsão de Caixa','Entradas e saídas',Activity,'/fiscal/previsao-caixa')
 ]},
 {label:'Vendas • Comercial',description:'Clientes, pedidos, produtos, preços e faturamento.',icon:ShoppingCart,actions:[
  A('Clientes','Cadastro e histórico',Users,'/clientes'),
  A('Produtos','Cadastro mestre e preços',Package,'/produtos-vendas'),
  A('Pedidos','Pedidos de venda e itens',ShoppingCart,'/produtos-vendas'),
  A('Tabelas de Preços','Condições comerciais',Receipt,'/tabelas-preco')
 ]},
 {label:'Moldes & Ferramentaria',description:'Moldes, ciclos, preventiva, localização e ordens de serviço.',icon:Wrench,actions:[A('Moldes & Ferramentaria','Ficha técnica, ciclos e histórico de O.S.',Wrench,'/moldes-injecao')]},
 {label:'Comercial & Suprimentos',description:'Clientes, vendas, pedidos pendentes, fornecedores e compras.',icon:ShoppingCart,actions:[A('Pedidos Pendentes','Pedidos não faturados que alimentam PCP e Fiscal',ClipboardList,'/comercial'),A('Clientes','Cadastro comercial',Users,'/comercial'),A('Novo Pedido de Venda','Lançamento comercial',ShoppingCart,'/comercial'),A('Fornecedores','Cadastro e qualificação',Users,'/comercial'),A('Compras','Pedidos e recebimento',Package,'/comercial')]},
 {label:'Compras',description:'Solicitações, fornecedores, pedidos e recebimento.',icon:ShoppingCart,actions:[
  A('Solicitação de Compra','Necessidades internas',ClipboardList,'/compras-solicitacao'),
  A('Fornecedores','Cadastro e qualificação',Users,'/fornecedores'),
  A('Recebimento','Entrada e conferência',Package,'/recebimento-materiais')
 ]},
 {label:'Administração',description:'Usuários, permissões, empresa, identidade e infraestrutura.',icon:Settings,actions:[
  A('Configurações','Identidade, empresa e relatórios',Settings,'/configuracao-adm-master'),
  A('Usuários / ACL','Permissões por colaborador',Users,'/usuarios'),
  A('Empresa','Dados e identidade visual',SlidersHorizontal,'/erp-industrial'),A('ACL e Prefixos','Permissões por colaborador e numeração',ShieldCheck,'/configuracoes-adm')
 ]},
 {label:'Relatórios',description:'Indicadores e consultas do ERP.',icon:BarChart3,actions:[
  A('Dashboard Industrial','Visão executiva',Gauge,'/erp-industrial'),
  A('PCP / Produção','Planejado x realizado',Factory,'/pcp'),
  A('Qualidade','Pareto e RPNC',ShieldCheck,'/qualidade'),
  A('Estoque','Saldos e movimentos',Boxes,'/estoque'),
  A('Fiscal / Financeiro','Documentos e caixa',Landmark,'/fiscal')
 ]},
 {label:'Ajuda',description:'Manual operacional e ajuda contextual.',icon:HelpCircle,actions:[
  A('Manual do Usuário','Como operar cada módulo',BookOpen,'/manual-usuario'),
  A('Ajuda do módulo','Orientação contextual',HelpCircle,'/manual-usuario')
 ]}
]
export default function TabletLaunchpad({onNavigate,isOpen,onClose}:{onNavigate:(route:string)=>void;isOpen:boolean;onClose:()=>void}){
 const[selected,setSelected]=useState<Module|null>(null),[isMaster,setIsMaster]=useState(false),[purging,setPurging]=useState(false),[confirmOpen,setConfirmOpen]=useState(false),[confirmText,setConfirmText]=useState('');
 useEffect(()=>{if(!isOpen){setSelected(null);return}void (async()=>{try{const{data}=await supabase.rpc('erp_is_master');setIsMaster(data===true)}catch{setIsMaster(false)}})()},[isOpen]);
 async function purge(){if(confirmText.trim().toUpperCase()!=='ZERAR BANCO PLASTIBOR')return;setPurging(true);try{const{error}=await supabase.rpc('erp_master_purge_plastibor',{p_confirmation:confirmText});if(error)throw error;alert('Limpeza Plastibor concluída com segurança para o tenant atual.');setConfirmOpen(false);setConfirmText('')}catch(e){alert(e instanceof Error?e.message:'Falha ao executar a limpeza.')}finally{setPurging(false)}};if(!isOpen)return null
 return <div className="tablet-overlay" role="dialog" aria-modal="true"><section className="tablet-frame"><header className="tablet-head"><div className="tablet-brand"><img src="/logo-industrial.svg" alt=""/><div><span>SGQ ERP INDUSTRIAL</span><strong>{selected?selected.label:'Tablet Operacional'}</strong><small>{selected?selected.description:'Acesso rápido aos módulos da fábrica'}</small></div></div><div className="tablet-head-actions"><button className="tablet-icon-btn" onClick={()=>{const n=localStorage.getItem('erp-lang')==='en-US'?'pt-BR':'en-US';localStorage.setItem('erp-lang',n);location.reload()}} title="Idioma"><Languages size={23}/></button>{selected&&<button onClick={()=>setSelected(null)} className="tablet-icon-btn" title="Voltar"><ArrowLeft size={22}/></button>}<button onClick={onClose} className="tablet-icon-btn" title="Fechar tablet"><X size={23}/></button></div></header><div className="tablet-body">{!selected?<><div className="tablet-section-title"><div><span>VISUALIZAÇÃO E OPERAÇÃO</span><h2>Escolha o ambiente de trabalho</h2></div><div className="tablet-user"><UserRound size={20}/><b>Operação ERP</b></div></div><div className="tablet-grid">{modules.slice(0,8).map(m=><ModuleCard key={m.label} module={m} onClick={()=>setSelected(m)}/>)}</div><div className="tablet-section-title tablet-config-title"><div><span>CONFIGURAÇÕES E CADASTROS MESTRES</span><h2>Administração e apoio</h2></div></div><div className="tablet-grid tablet-grid-small">{modules.slice(8).map(m=><ModuleCard key={m.label} module={m} onClick={()=>setSelected(m)}/>)}</div>{isMaster&&<div className="tablet-danger-zone"><div><span>MASTER • CONTINGÊNCIA</span><h3>Limpeza controlada da Plastibor</h3><p>Exclusivo para Master. A operação é escopada ao tenant atual e exige confirmação em dois níveis.</p></div><button className="tablet-purge-btn" disabled={purging} onClick={()=>setConfirmOpen(true)}>{purging?'EXECUTANDO…':'ZERAR BANCO PLASTIBOR'}</button>{confirmOpen&&<div className="tablet-purge-dialog"><strong>Confirmação de segurança 1/2</strong><p>Esta ação remove os dados transacionais da empresa atual. Digite exatamente <b>ZERAR BANCO PLASTIBOR</b>.</p><input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="ZERAR BANCO PLASTIBOR"/><div><button onClick={()=>setConfirmOpen(false)}>Cancelar</button><button className="tablet-purge-btn" disabled={confirmText.trim().toUpperCase()!=='ZERAR BANCO PLASTIBOR'||purging} onClick={()=>void purge()}>Confirmar limpeza 2/2</button></div></div>}</div></>:<><button className="tablet-back" onClick={()=>setSelected(null)}><ArrowLeft size={19}/> Todos os módulos</button><div className="tablet-action-grid">{selected.actions.map(a=>{const I=a.icon;return <button key={a.label} className="tablet-action-card" onClick={()=>onNavigate(a.route)}><span className="tablet-action-icon"><I size={30}/></span><div><b>{a.label}</b><small>{a.description}</small></div><span className="tablet-open">ABRIR</span></button>})}</div></>}</div><footer className="tablet-foot"><span>© FernandoSch_System</span><span>ERP Industrial • Operação integrada • RLS</span></footer></section></div>
}
function ModuleCard({module,onClick}:{module:Module;onClick:()=>void}){const I=module.icon;return <button className="tablet-module-card" onClick={onClick}><span className="tablet-module-icon"><I size={42}/></span><div><b>{module.label}</b><small>{module.description}</small></div><span className="tablet-chevron">›</span></button>}
