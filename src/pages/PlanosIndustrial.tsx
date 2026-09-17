import { ArrowLeft, ArrowRight, Check, Factory } from 'lucide-react'
import { useMemo, useState } from 'react'

const moduleLabels:Record<string,string>={pcp:'PCP e Produção',estoque:'Estoque e Materiais',recebimento:'Recebimento de Materiais',qualidade:'Qualidade',manutencao:'Manutenção',fiscal:'Financeiro e Fiscal',indicadores:'Indicadores',engenharia:'Engenharia e BOM',compras:'Compras e Fornecedores',clientes:'Clientes',rastreabilidade:'Rastreabilidade',custos:'Custos Industriais',expedicao:'Expedição',fmea:'FMEA e Risco',rh:'RH e Competências'}
const plans=[
 {key:'essencial',name:'Essencial',price:'R$ 199',note:'Base operacional para estruturar a empresa.',features:['Empresas e usuários','Clientes e fornecedores','Produtos e materiais','Estoque e movimentações','Produção básica e OP','Acessos e permissões']},
 {key:'profissional',name:'Profissional',price:'R$ 349',note:'Operação integrada para empresas em crescimento.',features:['Tudo do Essencial','PCP e produção avançada','Qualidade e não conformidades','Manutenção preventiva e corretiva','Compras e recebimento','Indicadores e relatórios avançados','Custos industriais']},
 {key:'diamante',name:'Diamante',price:'R$ 549',note:'Visão completa para gestão industrial.',features:['Tudo do Profissional','Fiscal e financeiro integrado','BI e indicadores gerenciais','Rastreabilidade completa','Engenharia e BOM','FMEA e gestão de riscos','Auditoria e trilhas de controle','Multiempresa e integrações']},
] as const
const modulePlan=(module:string,plan:string)=>{const all=plan==='diamante';const prof=plan==='profissional'||all; if(module==='fiscal'||module==='rastreabilidade'||module==='engenharia'||module==='fmea')return all?'Incluído no Diamante':'Disponível no Diamante';if(['pcp','qualidade','manutencao','compras','recebimento','indicadores','custos'].includes(module))return prof?'Incluído no Profissional':'Disponível no Profissional';return 'Incluído no Essencial'}
export default function PlanosIndustrial(){
 const params=useMemo(()=>new URLSearchParams(location.search),[])
 const module=params.get('modulo')||''
 const moduleName=moduleLabels[module]||''
 const initial=params.get('plano')||'profissional'
 const [selected,setSelected]=useState(plans.some(p=>p.key===initial)?initial:'profissional')
 const selectedPlan=plans.find(p=>p.key===selected)??plans[1]
 return <main className="industrial-plans-page"><div className="industrial-plans-shell">
  <a className="industrial-plans-back" href={module?`/modulos/${module}`:'/' }><ArrowLeft size={17}/> {module?'Voltar ao módulo':'Voltar ao site'}</a>
  <header className="industrial-plans-header"><span>SGQ ERP INDUSTRIAL • PLANOS</span><h1>Escolha o plano para sua operação.</h1><p>{moduleName?<>Você está conhecendo o <strong>{moduleName}</strong>. Veja em qual plano ele está incluído e compare tudo o que sua empresa recebe.</>:<>Compare os planos, veja tudo o que está incluído e escolha como começar.</>}</p></header>
  {moduleName&&<div className="industrial-plan-context"><div><Factory size={22}/><div><small>MÓDULO SELECIONADO</small><strong>{moduleName}</strong></div></div><a href={`/modulos/${module}`}>Ver detalhes do módulo <ArrowRight size={15}/></a></div>}
  <section className="industrial-plan-grid">{plans.map(plan=><article key={plan.key} className={`industrial-plan-card ${selected===plan.key?'selected':''}`}>
   <div className="industrial-plan-top"><span>{plan.key==='profissional'?'MAIS COMPLETO PARA OPERAÇÃO':'PLANO SGQ ERP'}</span><button type="button" onClick={()=>setSelected(plan.key)} aria-pressed={selected===plan.key}>{selected===plan.key?'Selecionado':'Selecionar'}</button></div>
   <h2>{plan.name}</h2><div className="industrial-plan-price">{plan.price}<small>/mês</small></div><p>{plan.note}</p>
   {moduleName&&<div className="industrial-plan-module-status"><strong>{modulePlan(module,plan.key)}</strong>{modulePlan(module,plan.key).startsWith('Incluído')&&<Check size={16}/>}</div>}
   <ul>{plan.features.map(f=><li key={f}><Check size={16}/><span>{f}</span></li>)}</ul>
   <a className="industrial-plan-cta" href={`/cadastro-empresa?plano=${plan.key}${module?`&modulo=${module}`:''}`}>Escolher {plan.name} <ArrowRight size={16}/></a>
  </article>)}</section>
  <section className="industrial-plan-selection"><div><small>SUA ESCOLHA</small><h2>{selectedPlan.name} • {selectedPlan.price}/mês</h2><p>{moduleName?`Inclui o ${moduleName} conforme a composição acima.`:'Você poderá concluir o cadastro da empresa no próximo passo.'}</p></div><a href={`/cadastro-empresa?plano=${selectedPlan.key}${module?`&modulo=${module}`:''}`}>Continuar para cadastro <ArrowRight size={17}/></a></section>
  <p className="industrial-plan-footnote">Os recursos exibidos representam a composição comercial do SGQ ERP. A disponibilidade operacional pode depender da configuração e permissões da empresa.</p>
 </div></main>
}
