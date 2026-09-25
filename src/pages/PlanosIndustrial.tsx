import { ArrowLeft, ArrowRight, Check, Factory, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Plan={codigo:string;nome:string;preco_mensal:number;descricao:string;modulos:string[]}
const moduleLabels:Record<string,string>={pcp:'PCP e Produção',estoque:'Estoque e Materiais',recebimento:'Recebimento de Materiais',qualidade:'Qualidade',manutencao:'Manutenção',fiscal:'Financeiro e Fiscal',indicadores:'Indicadores',engenharia:'Engenharia e BOM',compras:'Compras e Fornecedores',clientes:'Clientes',rastreabilidade:'Rastreabilidade',custos:'Custos Industriais',expedicao:'Expedição',fmea:'FMEA e Risco',rh:'RH e Competências',injecao:'Injeção Plástica',prensados:'Prensados',estamparia:'Estamparia',ferramentaria:'Ferramentaria',extrusao:'Extrusão',usinagem:'Usinagem',soldagem:'Soldagem',montagem:'Montagem',corte:'Corte e Preparação',pintura:'Pintura e Acabamento'}
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function PlanosIndustrial(){
 const params=useMemo(()=>new URLSearchParams(location.search),[])
 const module=params.get('modulo')||''
 const moduleName=moduleLabels[module]||''
 const [plans,setPlans]=useState<Plan[]>([])
 const [selected,setSelected]=useState(params.get('plano')||'profissional')
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const [p,m]=await Promise.all([
    supabase.from('erp_planos_catalogo').select('codigo,nome,preco_mensal,descricao,ordem').eq('ativo',true).order('ordem'),
    supabase.from('erp_plano_modulos').select('plano_codigo,modulo_codigo,modulo_nome').eq('acesso',true).order('modulo_nome')
   ])
   if(p.error)throw p.error
   if(m.error)throw m.error
   const rows=(p.data??[]).map(x=>({codigo:x.codigo,nome:x.nome,preco_mensal:Number(x.preco_mensal),descricao:x.descricao??'',modulos:(m.data??[]).filter(y=>y.plano_codigo===x.codigo).map(y=>y.modulo_codigo)}))
   setPlans(rows)
   if(rows.length&&!rows.some(x=>x.codigo===selected))setSelected(rows[0].codigo)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar os planos do banco.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const current=plans.find(x=>x.codigo===selected)??plans[0]
 const included=(p:Plan)=>module? p.modulos.includes(module):true
 const href=(plan:string)=>'/cadastro-empresa?plano='+encodeURIComponent(plan)+(module?'&modulo='+encodeURIComponent(module):'')

 if(busy)return <main className="industrial-plans-page"><div className="industrial-plans-shell"><p>Carregando composição comercial real…</p></div></main>
 if(error)return <main className="industrial-plans-page"><div className="industrial-plans-shell"><p role="alert">{error}</p><button type="button" onClick={()=>void load()}><RefreshCw size={16}/> Tentar novamente</button></div></main>

 return <main className="industrial-plans-page"><div className="industrial-plans-shell">
  <a className="industrial-plans-back" href={module?'/modulos/'+module:'/'}><ArrowLeft size={17}/> {module?'Voltar ao módulo':'Voltar ao site'}</a>
  <header className="industrial-plans-header"><span>SGQ ERP INDUSTRIAL • PLANOS</span><h1>Planos carregados do catálogo comercial</h1><p>{moduleName?'Consulte a disponibilidade real de '+moduleName+' em cada plano.':'Compare a composição atual cadastrada no banco do ERP.'}</p></header>
  {moduleName&&<div className="industrial-plan-context"><div><Factory size={22}/><div><small>MÓDULO SELECIONADO</small><strong>{moduleName}</strong></div></div></div>}
  <section className="industrial-plan-grid">{plans.map(plan=><article key={plan.codigo} className={'industrial-plan-card '+(selected===plan.codigo?'selected':'')}>
   <div className="industrial-plan-top"><span>PLANO SGQ ERP</span><button type="button" onClick={()=>setSelected(plan.codigo)} aria-pressed={selected===plan.codigo}>{selected===plan.codigo?'Selecionado':'Selecionar'}</button></div>
   <h2>{plan.nome}</h2><div className="industrial-plan-price">{money(plan.preco_mensal)}<small>/mês</small></div><p>{plan.descricao}</p>
   {moduleName&&<div className="industrial-plan-module-status"><strong>{included(plan)?'Incluído neste plano':'Não incluído neste plano'}</strong>{included(plan)&&<Check size={16}/>}</div>}
   <ul>{plan.modulos.map(mod=><li key={mod}><Check size={16}/><span>{moduleLabels[mod]||mod}</span></li>)}</ul>
   <a className="industrial-plan-cta" href={href(plan.codigo)}>Escolher {plan.nome} <ArrowRight size={16}/></a>
  </article>)}</section>
  {current&&<section className="industrial-plan-selection"><div><small>SUA ESCOLHA</small><h2>{current.nome} • {money(current.preco_mensal)}/mês</h2><p>{moduleName?(included(current)?'O módulo está incluído na composição atual.':'O módulo não está incluído na composição atual.'):'A composição acima é lida diretamente do catálogo comercial.'}</p></div><a href={href(current.codigo)}>Continuar para cadastro <ArrowRight size={17}/></a></section>}
  <p className="industrial-plan-footnote">A disponibilidade operacional depende das permissões e da configuração da empresa. O catálogo exibido nesta página é obtido do banco ERP.</p>
 </div></main>
}
