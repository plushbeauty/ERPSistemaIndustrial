import { useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Factory, FileText, Gauge, LayoutGrid, LockKeyhole, Package, Plus, Search, ShieldCheck, ShoppingCart, Tablet, Truck, TriangleAlert, Users, UsersRound, WalletCards, Warehouse, Wrench, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Group={id:string;title:string;icon:LucideIcon;detail:string;sub:string[];kind?:string}
type DemoRow={id:string;name:string;status:string;detail:string;value:string}

const groups:Group[]=[
 {id:'dashboard',title:'Dashboard Executivo',icon:BarChart3,detail:'Visão consolidada da fábrica',sub:['Produção','Qualidade','Estoque','Compras','Vendas','Financeiro']},
 {id:'clientes',title:'Clientes',icon:Users,detail:'Cadastro comercial completo',sub:['Dados cadastrais','Contatos','Documentos','Pedidos','Financeiro'],kind:'clientes'},
 {id:'produtos',title:'Produtos e Materiais',icon:Package,detail:'Cadastro mestre e estoque',sub:['Cadastro','Estoque','Custos','Preços','Movimentações'],kind:'produtos'},
 {id:'engenharia',title:'Engenharia / BOM',icon:Boxes,detail:'Estrutura e roteiro de fabricação',sub:['BOM','Ficha técnica','Roteiros','Versões','Engenharia de mudança']},
 {id:'moldes',title:'Moldes e Ferramentas',icon:Wrench,detail:'Ferramentaria e vida útil',sub:['Cadastro','Cavidades','Setup','Manutenção','Histórico']},
 {id:'maquinas',title:'Máquinas e Equipamentos',icon:Factory,detail:'Recursos produtivos e capacidade',sub:['Cadastro','Disponibilidade','OEE','Manutenção','Histórico']},
 {id:'processos',title:'Processos',icon:Wrench,detail:'Operações e tempos padrão',sub:['Operações','Tempos','Recursos','Sequência','Parâmetros']},
 {id:'pcp',title:'PCP / Programação',icon:CalendarDays,detail:'Planejamento e sequenciamento',sub:['Carteira','MPS','MRP','Capacidade','Gantt'],kind:'pcp'},
 {id:'mrp',title:'MRP',icon:Boxes,detail:'Necessidades de materiais',sub:['Necessidades','Sugestões de compra','Sugestões de produção','BOM','Disponibilidade']},
 {id:'ordens',title:'Ordens de Produção',icon:Factory,detail:'OP do planejamento ao encerramento',sub:['Abertas','Programação','Apontamento','Qualidade','Encerramento'],kind:'op'},
 {id:'apontamentos',title:'Apontamentos',icon:ClipboardCheck,detail:'Chão de fábrica em tempo real',sub:['Produção boa','Refugo','Paradas','Setup','Ocorrências']},
 {id:'setup',title:'Setup e Troca',icon:Wrench,detail:'Preparação e troca de recurso',sub:['Agenda','Checklist','Tempo padrão','Tempo real','Perdas']},
 {id:'refugo',title:'Refugo e Perdas',icon:TriangleAlert,detail:'Causas e análise de perdas',sub:['Registro','Causas','Retrabalho','Pareto','Custos']},
 {id:'oee',title:'OEE e Indicadores',icon:Gauge,detail:'Disponibilidade, performance e qualidade',sub:['OEE','Disponibilidade','Performance','Qualidade','Paradas']},
 {id:'materia-prima',title:'Matéria-prima',icon:Package,detail:'Lotes, consumo e validade',sub:['Lotes','Reservas','Consumo','Validade','Rastreabilidade']},
 {id:'estoque',title:'Estoque / WMS',icon:Warehouse,detail:'Saldos e movimentações',sub:['Saldo','Entrada','Saída','Transferência','Inventário']},
 {id:'compras',title:'Compras',icon:ShoppingCart,detail:'Solicitações, cotações e pedidos',sub:['Solicitações','Cotações','Pedidos','Recebimento','Fornecedores']},
 {id:'qualidade',title:'Qualidade',icon:ShieldCheck,detail:'Centro completo de qualidade',sub:['Dashboard','RPNC','Inspeções','Auditorias','Controle de Documentos','Equipamentos de Medição','Planos de Inspeção','RIAI'],kind:'qualidade'},
 {id:'rpnc',title:'RPNC / Não conformidades',icon:TriangleAlert,detail:'Tratamento de desvios',sub:['Abertas','Causa raiz','Ação corretiva','Eficácia','Histórico']},
 {id:'rastreabilidade',title:'Rastreabilidade',icon:Search,detail:'Lote → produção → expedição',sub:['Lote origem','Consumo','OP','Produto acabado','Expedição']},
 {id:'manutencao',title:'Manutenção',icon:Wrench,detail:'Preventiva e corretiva',sub:['Ordens','Preventiva','Corretiva','Peças','Histórico']},
 {id:'custos',title:'Custos Industriais',icon:WalletCards,detail:'Custo real e margem',sub:['Custo padrão','Custo real','Componentes','Margem','Por OP']},
 {id:'expedicao',title:'Expedição',icon:Truck,detail:'Separação, conferência e entrega',sub:['A expedir','Separação','Conferência','Romaneio','Entregas']},
 {id:'financeiro',title:'Financeiro',icon:WalletCards,detail:'Contas e fluxo de caixa',sub:['A pagar','A receber','Caixa','Conciliação','Fluxo']},
 {id:'fiscal',title:'Fiscal / NF-e',icon:FileText,detail:'Documentos e emissão fiscal',sub:['Notas','Emitir','XML','Chaves','Configuração'],kind:'fiscal'},
 {id:'relatorios',title:'Relatórios',icon:BarChart3,detail:'Indicadores e consultas',sub:['Produção','Qualidade','Estoque','Financeiro','Gerenciais']},
 {id:'fmea',title:'FMEA',icon:ShieldCheck,detail:'Risco de produto e processo',sub:['FMEA produto','FMEA processo','Risco','Ações','Revisões']},
 {id:'capa',title:'CAPA',icon:ClipboardCheck,detail:'Ações corretivas e preventivas',sub:['Ações','Responsáveis','Prazos','Evidências','Eficácia']},
 {id:'auditorias',title:'Auditorias',icon:Search,detail:'Plano e execução de auditorias',sub:['Plano anual','Checklists','Auditorias','Constatações','Ações']},
 {id:'treinamentos',title:'Treinamentos',icon:UsersRound,detail:'Capacitação e evidências',sub:['Plano','Cursos','Turmas','Presença','Certificados']},
 {id:'competencias',title:'Matriz de Competências',icon:UsersRound,detail:'Cargos, competências e gaps',sub:['Cargos','Competências','Matriz','Gaps','Plano']},
 {id:'calibracao',title:'Calibração',icon:Gauge,detail:'Equipamentos e certificados',sub:['Equipamentos','Plano','Certificados','Vencimentos','Histórico']},
 {id:'documentos',title:'Documentos',icon:FileText,detail:'Controle e revisão documental',sub:['Documentos','Revisões','Aprovação','Distribuição','Histórico']},
]

const demoNames=['Plastibor Componentes','MetalSul Industrial','NovaForma Peças','TecnoVale','IndusPrime','Mecânica Horizonte','AçoNorte','ProMold','QualiParts','Fábrica Central']
const records=(g:Group):DemoRow[]=>demoNames.map((name,i)=>({id:`DEMO-${g.id.toUpperCase()}-${String(i+1).padStart(2,'0')}`,name:g.id==='clientes'?name:g.id==='ordens'?`OP-${String(480+i).padStart(4,'0')} · ${name}`:`${name} · ${g.title}`,status:g.id==='ordens'?['Programada','Em produção','Em atraso','Concluída'][i%4]:['Ativo','Em análise','Pendente','Concluído'][i%4],detail:g.detail,value:g.id==='financeiro'?['R$ 12.400','R$ 8.900','R$ 21.300'][i%3]:g.id==='ordens'?[`${800+i*100} UN`,'72%','Hoje'][i%3]:'DEMO'}))

function initialSelected(){if(typeof window==='undefined')return null;return new URLSearchParams(window.location.search).get('module')}

export default function DemoIndustrial(){
 const [q,setQ]=useState('');const [selected,setSelected]=useState<string|null>(initialSelected());const [sub,setSub]=useState('');const [detail,setDetail]=useState<DemoRow|null>(null)
 const visible=useMemo(()=>groups.filter(g=>!q||`${g.title} ${g.detail}`.toLowerCase().includes(q.toLowerCase())),[q])
 const current=groups.find(g=>g.id===selected||g.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')===selected)
 const go=(id:string)=>{setSelected(id);setSub('')}
 const Icon=current?.icon??LayoutGrid

 return <main className="demo-industrial">
   <div className="demo-warning"><LockKeyhole size={14}/> AMBIENTE DEMONSTRATIVO — dados fictícios locais, somente leitura</div>
   <header className="demo-top"><a href="/erp-industrial" className="demo-back"><ArrowLeft size={18}/></a><div className="demo-brand"><img src="/logo-industrial.svg" alt="SGQ ERP"/><div><b>SGQ ERP Industrial</b><span>Ambiente de demonstração</span></div></div><div className="demo-actions"><a href="/erp-industrial"><ArrowLeft size={15}/> Operacional</a><button onClick={()=>{setSelected(null);setSub('')}}><LayoutGrid size={15}/> Tablet</button></div></header>
   <section className="demo-shell">
    <aside className="demo-sidebar"><div className="demo-sidebar-title">MÓDULOS INDUSTRIAIS</div><div className="demo-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar módulo"/></div><nav>{visible.map(g=>{const I=g.icon;return <button key={g.id} className={selected===g.id?'active':''} onClick={()=>go(g.id)}><I size={16}/><span>{g.title}</span></button>})}</nav></aside>
    <section className="demo-main">
      {!current?<DemoDashboard onOpen={go}/>:<><div className="demo-module-head"><div><span>SGQ ERP • DEMO</span><h1><Icon size={27}/>{current.title}</h1><p>{current.detail}</p></div><div className="demo-module-actions"><button onClick={()=>setSelected(null)}><ArrowLeft size={15}/> Módulos</button><button className="demo-primary" onClick={()=>setSub(current.sub[0]||'Visão geral')}><Plus size={15}/> Abrir operação</button></div></div>
       <div className="demo-subnav">{current.sub.map((s,i)=><button key={s} className={sub===(s)||(!sub&&i===0)?'active':''} onClick={()=>setSub(s)}>{s}</button>)}</div>
       <DemoModuleBody group={current} sub={sub||current.sub[0]} onDetail={setDetail}/>
      </>}
    </section>
   </section>
   <button className="demo-floating-tablet" onClick={()=>setSelected(null)}><Tablet size={19}/><span>TABLET</span></button>
   {detail&&<div className="modal" onMouseDown={()=>setDetail(null)}><div className="modal-card demo-detail" onMouseDown={e=>e.stopPropagation()}><header><div><span>DEMO • FICHA COMPLETA</span><h2>{detail.name}</h2></div><button onClick={()=>setDetail(null)}><X size={18}/></button></header><div className="demo-detail-grid"><div><span>ID</span><b>{detail.id}</b></div><div><span>Status</span><b>{detail.status}</b></div><div><span>Módulo</span><b>{current?.title}</b></div><div><span>Ambiente</span><b>DEMO</b></div><div><span>Descrição</span><b>{detail.detail}</b></div><div><span>Indicador</span><b>{detail.value}</b></div></div><div className="notice">Esta ficha é demonstrativa. O ambiente DEMO não grava no Supabase operacional.</div><button className="secondary-v2" onClick={()=>setDetail(null)}>Fechar</button></div></div>}
 </main>
}

function DemoDashboard({onOpen}:{onOpen:(id:string)=>void}){
 const cards=[['OPs abertas','24',Factory],['Produção hoje','8.420 UN',ClipboardCheck],['RPNC abertas','7',TriangleAlert],['Pedidos de compra','13',ShoppingCart],['Pedidos para entrega','9',Truck],['Estoque crítico','6',Warehouse],['OEE médio','87,4%',Gauge],['A receber','R$ 184.200',WalletCards]]
 return <><div className="demo-hero"><span>VISÃO EXECUTIVA</span><h1>Centro de Controle Industrial</h1><p>Uma tela para enxergar produção, qualidade, estoque, compras, expedição e financeiro antes de entrar em cada setor.</p></div><div className="demo-kpis">{cards.map(([label,value,I])=>{const Icon=I as LucideIcon;return <article key={String(label)}><Icon/><span>{label}</span><strong>{value}</strong><small>Indicador demonstrativo</small></article>})}</div><div className="demo-dashboard-grid"><article><header><div><span>PRODUÇÃO</span><h2>Ordens por situação</h2></div><Factory/></header><div className="demo-bars">{[['Programadas',34],['Em produção',72],['Em atraso',18],['Concluídas',86]].map(([l,v])=><div key={String(l)}><div><b>{l}</b><span>{v}%</span></div><i><em style={{width:`${v}%`}}/></i></div>)}</div></article><article><header><div><span>QUALIDADE</span><h2>Saúde do SGQ</h2></div><ShieldCheck/></header><div className="demo-quality-grid"><button onClick={()=>onOpen('qualidade')}><b>7</b><span>RPNC abertas</span></button><button onClick={()=>onOpen('qualidade')}><b>18</b><span>Inspeções</span></button><button onClick={()=>onOpen('qualidade')}><b>4</b><span>Auditorias</span></button><button onClick={()=>onOpen('calibracao')}><b>3</b><span>Calibrações próximas</span></button></div></article></div><div className="demo-sector-cards">{groups.slice(1,13).map(g=>{const I=g.icon;return <button key={g.id} onClick={()=>onOpen(g.id)}><I/><div><b>{g.title}</b><span>{g.detail}</span></div><ArrowLeft size={15}/></button>})}</div></>
}

function DemoModuleBody({group,sub,onDetail}:{group:Group;sub:string;onDetail:(r:DemoRow)=>void}){
 if(group.kind==='fiscal')return <div className="demo-special-grid"><article className="demo-special-card"><FileText/><span>DOCUMENTOS FISCAIS</span><h2>Notas fiscais eletrônicas</h2><div className="demo-mini-kpis"><b>18<small>Rascunhos</small></b><b>42<small>Autorizadas</small></b><b>3<small>Rejeitadas</small></b></div><button className="demo-primary">Nova NF-e</button></article><DemoTable group={group} onDetail={onDetail}/></div>
 if(group.kind==='qualidade')return <div className="demo-quality-layout"><aside><ShieldCheck/><h3>Centro da Qualidade</h3>{group.sub.map(s=><button key={s} onClick={()=>undefined} className={sub===s?'active':''}>{s}</button>)}</aside><section><div className="demo-quality-kpis"><b>7<small>RPNC abertas</small></b><b>18<small>Inspeções</small></b><b>4<small>Auditorias</small></b><b>12<small>Documentos controlados</small></b></div><DemoTable group={group} onDetail={onDetail}/></section></div>
 if(group.kind==='pcp')return <div className="demo-pcp"><div className="demo-pcp-head"><b>Programação da produção</b><span>Capacidade finita • visão demonstrativa</span></div>{['Prensa 01','Prensa 02','Injetora 03','CNC 04'].map((m,i)=><div className="demo-pcp-row" key={m}><b>{m}</b><div><i style={{left:`${10+i*6}%`,width:`${35+i*8}%`}}>OP-{480+i}</i><i style={{left:`${52+i*3}%`,width:'24%'}}>OP-{490+i}</i></div></div>)}</div>
 if(group.kind==='clientes')return <DemoTable group={group} onDetail={onDetail} />
 if(group.kind==='produtos')return <DemoTable group={group} onDetail={onDetail} />
 if(group.kind==='op')return <DemoTable group={group} onDetail={onDetail} />
 return <><div className="demo-feature-cards">{group.sub.map((s,i)=><article key={s}><span>{i+1}</span><div><b>{s}</b><p>Fluxo demonstrativo com indicadores, filtros, cadastro, consulta e histórico desta rotina.</p></div><CheckCircle2/></article>)}</div><DemoTable group={group} onDetail={onDetail}/></>
}

function DemoTable({group,onDetail}:{group:Group;onDetail:(r:DemoRow)=>void}){
 const rows=records(group)
 return <section className="demo-table-card"><header><div><span>REGISTROS • {group.title.toUpperCase()}</span><h2>{group.sub[0]||'Registros'}</h2></div><button className="demo-primary">Nova operação</button></header><div className="demo-table-wrap"><table><thead><tr><th>ID</th><th>Registro</th><th>Status</th><th>Indicador</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.id}</td><td><b>{r.name}</b><small>{r.detail}</small></td><td><span className="demo-status">{r.status}</span></td><td>{r.value}</td><td><button onClick={()=>onDetail(r)}>Ver ficha</button></td></tr>)}</tbody></table></div></section>
}
