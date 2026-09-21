/*
 * 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
 * - Arquivo: src/pages/DemoIndustrial.tsx
 * - Status Atual: Revisão 3 (Módulo Industrial Avançado)
 * - Total de Linhas Gerado: 94
 * - Assinatura de Entrada (Primeiros 3 Imports): import { useState } from 'react' | import type { ReactNode } from 'react' | import { Activity, Factory, Gauge, Layers3, Package, ShieldCheck, Tablet, Wrench, X } from 'lucide-react'
 * - Regra de Negócio Senior/Nomus Incorporada: a demonstração usa o mesmo modal e o mesmo contrato visual do ativo de ferramentaria, mas permanece explicitamente separada dos dados de produção.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, Factory, Gauge, Layers3, Package, ShieldCheck, Tablet, Wrench, X } from 'lucide-react'
import UnifiedTabletDashboard from '../components/UnifiedTabletDashboard'
import ModalDetalhesMolde from '../components/ModalDetalhesMolde'

type View = 'dashboard' | 'injecao' | 'prensados' | 'pcp' | 'bloco-k'
type Detail = { title: string; body: string }
type Mold = { codigo: string; descricao: string; ativas: number; totais: number; ciclos: number; vida: number; status: string }
type Injection = { op: string; maquina: string; produto: string; cicloReal: number; cicloTeorico: number; boas: number; refugo: number; galhos: number }
type Tool = { codigo: string; tipo: string; prensa: string; golpes: number; limite: number; status: string }
type Coil = { op: string; bobina: string; material: string; kg: number; metros: number; retalho: number; sucata: number }
type Queue = { prioridade: number; op: string; maquina: string; produto: string; quantidade: number; produzido: number; setup: number; status: string }
type BlockK = { registro: 'K200' | 'K230'; item: string; descricao: string; quantidade: number; unidade: string; op?: string }

const moldes: Mold[] = [
 { codigo:'MOL-001', descricao:'Tampa técnica 4 cavidades', ativas:4, totais:4, ciclos:184200, vida:36.8, status:'Em uso' },
 { codigo:'MOL-014', descricao:'Carcaça ABS 8 cavidades', ativas:7, totais:8, ciclos:392800, vida:78.6, status:'Em uso' },
 { codigo:'MOL-021', descricao:'Componente PP 2 cavidades', ativas:2, totais:2, ciclos:74200, vida:24.7, status:'Disponível' },
]
const injecao: Injection[] = [
 { op:'OP-0480', maquina:'Injetora 03', produto:'Tampa técnica', cicloReal:22.4, cicloTeorico:21.5, boas:8420, refugo:222, galhos:74 },
 { op:'OP-0491', maquina:'Injetora 05', produto:'Carcaça ABS', cicloReal:30.8, cicloTeorico:29, boas:5160, refugo:137, galhos:41 },
]
const ferramentas: Tool[] = [
 { codigo:'EST-021', tipo:'Estampo', prensa:'Prensa 01', golpes:384000, limite:500000, status:'Afiar em breve' },
 { codigo:'FAC-014', tipo:'Faca', prensa:'Prensa 02', golpes:128000, limite:300000, status:'Normal' },
]
const bobinas: Coil[] = [
 { op:'OP-0512', bobina:'BOB-26091', material:'Aço SAE 1020 1,20 mm', kg:982, metros:1840, retalho:38, sucata:24 },
 { op:'OP-0520', bobina:'BOB-26102', material:'Aço galvanizado 0,90 mm', kg:744, metros:1625, retalho:31, sucata:19 },
]
const fila: Queue[] = [
 { prioridade:1, op:'OP-0480', maquina:'Injetora 03', produto:'Tampa técnica', quantidade:10000, produzido:8420, setup:72, status:'Em produção' },
 { prioridade:2, op:'OP-0491', maquina:'Injetora 05', produto:'Carcaça ABS', quantidade:8000, produzido:5160, setup:91, status:'Programada' },
 { prioridade:1, op:'OP-0512', maquina:'Prensa 01', produto:'Suporte estampado', quantidade:12000, produzido:9400, setup:38, status:'Em produção' },
 { prioridade:3, op:'OP-0520', maquina:'Prensa 02', produto:'Chapa conformada', quantidade:7000, produzido:0, setup:46, status:'Aguardando' },
]
const blocoK: BlockK[] = [
 { registro:'K200', item:'MP-ABS-001', descricao:'Resina ABS natural', quantidade:1280, unidade:'KG' },
 { registro:'K200', item:'CH-1020-120', descricao:'Aço SAE 1020 1,20 mm', quantidade:2680, unidade:'KG' },
 { registro:'K230', item:'PA-001', descricao:'Tampa técnica', quantidade:8420, unidade:'UN', op:'OP-0480' },
 { registro:'K230', item:'PA-014', descricao:'Suporte estampado', quantidade:9400, unidade:'UN', op:'OP-0512' },
]

const n = (value:number) => value.toLocaleString('pt-BR')
const pct = (value:number) => value.toFixed(1) + '%'

export default function DemoIndustrial() {
 const params = new URLSearchParams(window.location.search)
 const requested = params.get('module')
 const initialView: View = requested === 'injecao' || requested === 'prensados' || requested === 'pcp' || requested === 'bloco-k' ? requested : 'dashboard'
 const [view,setView] = useState<View>(initialView)
 const [tabletMode,setTabletMode] = useState(false)
 const [demoMold,setDemoMold] = useState<Mold|null>(null)
 const [detail,setDetail] = useState<Detail|null>(null)
 const [brightness,setBrightness] = useState(100)
 const [largeText,setLargeText] = useState(false)
 const openDetail=(title:string,body:string)=>setDetail({title,body})
 if (tabletMode) return <UnifiedTabletDashboard onExit={() => setTabletMode(false)} />
 return <main className="erp4-demo" style={{fontSize:largeText?'106%':'100%',filter:'brightness('+brightness+'%)'}}>
  <style>{`
   .erp4-demo{min-height:100vh;background:#f8f9fa;color:#212529;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.erp4-head{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 20px;background:#fff;border-bottom:1px solid #d9e2df;box-shadow:0 4px 16px rgba(33,37,41,.07)}.erp4-brand{display:flex;align-items:center;gap:10px}.erp4-brand img{width:38px;height:38px}.erp4-brand b,.erp4-brand small{display:block}.erp4-brand small{color:#66736f;font-size:11px;margin-top:2px}.erp4-controls{display:flex;gap:7px}.erp4-controls button,.erp4-nav button,.erp4-action{border:1px solid #d3dfdc;background:#fff;color:#212529;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.erp4-controls button:hover,.erp4-nav button:hover{background:#f0f4f2}.erp4-tablet{background:#ff6b00!important;border-color:#ff6b00!important;color:#fff!important;box-shadow:0 8px 22px rgba(255,107,0,.25)}.erp4-nav{position:sticky;top:63px;z-index:90;display:flex;gap:6px;overflow:auto;padding:8px 12px;background:#fff;border-bottom:1px solid #d9e2df}.erp4-nav button{white-space:nowrap}.erp4-nav .active{background:#e8f4f1;border-color:#a9ccc6;color:#0f766e}.erp4-main{max-width:1700px;margin:0 auto;padding:22px}.erp4-hero,.erp4-panel,.erp4-card{background:#fff;border:1px solid #d9e2df;border-radius:18px;box-shadow:0 8px 26px rgba(33,37,41,.05)}.erp4-hero{display:flex;justify-content:space-between;gap:20px;padding:25px}.erp4-eyebrow{font-size:9px;letter-spacing:.14em;font-weight:950;color:#0f766e}.erp4-hero h1,.erp4-view h1{margin:7px 0 5px;font-size:clamp(28px,4vw,46px);letter-spacing:-.04em}.erp4-hero p,.erp4-view header p{margin:0;color:#60706b;max-width:850px}.erp4-oee{display:grid;place-items:center;min-width:125px;border:7px solid #dcece9;border-radius:22px;color:#0f766e}.erp4-oee strong{font-size:26px}.erp4-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:13px 0}.erp4-card{padding:16px}.erp4-card span{display:block;color:#66736f;font-size:10px;font-weight:800}.erp4-card strong{display:block;margin-top:6px;font-size:25px}.erp4-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:13px 0}.erp4-action{text-align:left;justify-content:flex-start;padding:15px}.erp4-action svg{color:#ff6b00}.erp4-action small{display:block;color:#66736f;margin-top:3px}.erp4-two{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin:13px 0}.erp4-panel{padding:18px}.erp4-panel header{margin-bottom:13px}.erp4-panel h2{margin:4px 0;font-size:18px}.erp4-panel header p{color:#66736f;font-size:11px;margin:0}.erp4-table{overflow:auto}.erp4-table table{width:100%;border-collapse:collapse;min-width:720px;font-size:11px}.erp4-table th,.erp4-table td{padding:10px;border-bottom:1px solid #edf1ef;text-align:left}.erp4-table th{background:#f1f4f3;color:#60706b;font-size:9px;text-transform:uppercase}.erp4-table td button{border:1px solid #c6d9d4;background:#fff;color:#0f766e;border-radius:8px;padding:7px 9px;font-weight:800;cursor:pointer}.erp4-queue{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.erp4-queue article{padding:13px;border:1px solid #e2eae7;border-radius:12px;background:#f1f4f3}.erp4-queue i{font-style:normal;background:#ff6b00;color:#fff;border-radius:7px;padding:5px 7px;font-weight:900;font-size:10px}.erp4-queue b,.erp4-queue small,.erp4-queue span{display:block;margin-top:8px}.erp4-queue small,.erp4-queue span{color:#66736f}.erp4-view h1{display:flex;gap:9px;align-items:center}.erp4-view h1 svg{color:#ff6b00}.erp4-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:rgba(33,37,41,.45)}.erp4-modal-card{width:min(600px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.25)}.erp4-modal-card header{display:flex;justify-content:space-between}.erp4-modal-card header button{border:0;background:transparent;cursor:pointer}.erp4-modal-card p{color:#60706b;line-height:1.7}.erp4-nav-hidden{display:none!important}.erp4-main-tablet{max-width:none;width:100%;padding:18px 22px}.erp4-main-tablet .erp4-hero{min-height:180px}.erp4-float{position:fixed;right:22px;bottom:22px;z-index:150;border:0;border-radius:15px;padding:15px 19px;background:#ff6b00;color:#fff;font-weight:950;box-shadow:0 15px 38px rgba(255,107,0,.3);cursor:pointer}@media(max-width:1000px){.erp4-grid4,.erp4-actions{grid-template-columns:repeat(2,1fr)}.erp4-queue{grid-template-columns:repeat(2,1fr)}.erp4-two{grid-template-columns:1fr}}@media(max-width:700px){.erp4-head{padding:10px}.erp4-brand small{display:none}.erp4-controls button span{display:none}.erp4-main{padding:12px}.erp4-grid4,.erp4-actions,.erp4-queue{grid-template-columns:1fr}.erp4-hero{display:grid}.erp4-float{right:12px;bottom:12px}}
  `}</style>
  <header className="erp4-head"><div className="erp4-brand"><img src="/logo-industrial.svg" alt="SGQ ERP"/><div><b>SGQ ERP Industrial</b><small>PCP Brasil • Injeção Plástica • Prensados</small></div></div><div className="erp4-controls"><button onClick={()=>setBrightness(v=>v>=120?90:v+10)} aria-label="Iluminação"><Gauge size={17}/><span>{brightness}%</span></button><button onClick={()=>setLargeText(v=>!v)} aria-pressed={largeText}><Activity size={17}/><span>Acessibilidade</span></button><button className="erp4-tablet" onClick={()=>setTabletMode(v=>!v)} aria-pressed={tabletMode}><Tablet size={18}/><span>{tabletMode ? 'SAIR TABLET' : 'TABLET'}</span></button></div></header>
  <nav className={tabletMode ? 'erp4-nav erp4-nav-hidden' : 'erp4-nav'} aria-label="Demonstração industrial"><button className={view==='dashboard'?'active':''} onClick={()=>setView('dashboard')}><Gauge size={16}/> Visão geral</button><button className={view==='injecao'?'active':''} onClick={()=>setView('injecao')}><Layers3 size={16}/> Injeção</button><button className={view==='prensados'?'active':''} onClick={()=>setView('prensados')}><Wrench size={16}/> Prensados</button><button className={view==='pcp'?'active':''} onClick={()=>setView('pcp')}><Factory size={16}/> PCP / APS</button><button className={view==='bloco-k'?'active':''} onClick={()=>setView('bloco-k')}><ShieldCheck size={16}/> Bloco K</button></nav>
  <section className={tabletMode ? 'erp4-main erp4-main-tablet' : 'erp4-main'}>
   {view==='dashboard' && <Dashboard open={setView}/>}
   {view==='injecao' && <Injection openDetail={openDetail}/>}
   {view==='prensados' && <Press openDetail={openDetail}/>}
   {view==='pcp' && <PCP openDetail={openDetail}/>}
   {view==='bloco-k' && <BlockK openDetail={openDetail}/>}
  </section>
  <button className="erp4-float" onClick={()=>setTabletMode(v=>!v)} aria-pressed={tabletMode}><Tablet size={20}/> {tabletMode ? 'SAIR DO TABLET' : 'TABLET • CHÃO DE FÁBRICA'}</button>
  {demoMold && <ModalDetalhesMolde moldId={demoMold.codigo} open={true} onClose={()=>setDemoMold(null)} demo={{codigo:demoMold.codigo,nome:demoMold.descricao,status:demoMold.status,data_fabricacao:'2024-01-10',numero_cavidades:demoMold.totais,cavidades_ativas:demoMold.ativas,ciclos_atuais:demoMold.ciclos,limite_ciclos:500000}}/>}
  {detail && <div className="erp4-modal" onMouseDown={()=>setDetail(null)}><div className="erp4-modal-card" onMouseDown={event=>event.stopPropagation()}><header><div><span className="erp4-eyebrow">DETALHE DEMONSTRATIVO</span><h2>{detail.title}</h2></div><button onClick={()=>setDetail(null)} aria-label="Fechar"><X size={18}/></button></header><p>{detail.body}</p><button className="erp4-action" onClick={()=>setDetail(null)}>Fechar</button></div></div>}
 </main>
}

function Dashboard({open}:{open:(view:View)=>void}){return <><section className="erp4-hero"><div><span className="erp4-eyebrow">CHÃO DE FÁBRICA • VISÃO OPERACIONAL</span><h1>Controle de Produção Industrial</h1><p>Ambiente demonstrativo somente leitura para PCP brasileiro, Injeção Plástica e Prensados / Estamparia.</p></div><div className="erp4-oee"><Gauge size={22}/><strong>85,5%</strong><small>OEE demo</small></div></section><section className="erp4-grid4"><Metric label="Disponibilidade" value="91,2%"/><Metric label="Performance" value="95,4%"/><Metric label="Qualidade" value="98,1%"/><Metric label="Setups em execução" value="1"/></section><section className="erp4-actions"><Action icon={<Factory/>} title="Abertura de OP" text="Consultar ordem"/><Action icon={<Activity/>} title="Parada de máquina" text="Registrar ocorrência"/><Action icon={<Package/>} title="Apontamento de refugo" text="Registrar perda"/><Action icon={<Wrench/>} title="Troca de molde" text="Abrir setup"/></section><section className="erp4-two"><Panel title="Moldes de injeção" text="Cavidades ativas / totais e vida útil em ciclos."><Table heads={['Molde','Cavidades','Ciclos','Vida útil','Status']} rows={moldes.map(m=>[m.codigo,m.ativas+'/'+m.totais,n(m.ciclos),pct(m.vida),m.status])} detail={row=>{const found=moldes.find(m=>m.codigo===row[0]);if(found)setDemoMold(found)}}/></Panel><Panel title="Estampos e facas" text="Afiação monitorada por golpes da prensa."><Table heads={['Ferramenta','Prensa','Golpes','Limite','Status']} rows={ferramentas.map(t=>[t.codigo,t.prensa,n(t.golpes),n(t.limite),t.status])}/></Panel></section><Panel title="APS simplificado" text="Fila de OPs e carga de máquina."><div className="erp4-queue">{fila.map(q=><article key={q.op}><i>#{q.prioridade}</i><b>{q.op}</b><small>{q.maquina} • {q.produto}</small><span>{n(q.produzido)} / {n(q.quantidade)} UN • setup {q.setup} min</span></article>)}</div></Panel></>}

function Injection({openDetail}:{openDetail:(title:string,body:string)=>void}){return <View title="Injeção Plástica" icon={<Layers3/>} text="Moldes, cavidades, setup, ciclo real versus teórico e refugo."><Panel title="Controle de moldes" text="Vida útil e cavidades."><Table heads={['Molde','Descrição','Cavidades','Ciclos','Vida útil']} rows={moldes.map(m=>[m.codigo,m.descricao,m.ativas+'/'+m.totais,n(m.ciclos),pct(m.vida)])} detail={row=>openDetail(row[0],'Molde '+row[0]+' com '+row[2]+' cavidades ativas. Vida útil '+row[4]+'.')}/></Panel><Panel title="Apontamento de produção" text="Peças boas, defeitos e galhos de injeção."><Table heads={['OP','Máquina','Produto','Ciclo','Boas','Refugo','Galhos']} rows={injecao.map(i=>[i.op,i.maquina,i.produto,i.cicloReal+'s / '+i.cicloTeorico+'s',n(i.boas),n(i.refugo),n(i.galhos)])} detail={row=>openDetail(row[0],'Ciclo real '+row[3]+'. Produção boa '+row[4]+'. Refugo '+row[5]+' e galhos '+row[6]+'.')}/></Panel><Panel title="Setup" text="Troca de molde, aquecimento de canhão e troca de cor."><div className="erp4-grid4"><Metric label="Troca de molde" value="42 min"/><Metric label="Aquecimento do canhão" value="18 min"/><Metric label="Troca de cor" value="12 min"/><Metric label="Setup total" value="72 min"/></div></Panel></View>}

function Press({openDetail}:{openDetail:(title:string,body:string)=>void}){return <View title="Prensados / Estamparia" icon={<Wrench/>} text="Golpes de prensa, ferramentas, bobinas, retalhos e sucata por OP."><Panel title="Estampos e facas" text="Vida útil baseada em golpes."><Table heads={['Código','Tipo','Prensa','Golpes','Limite','Status']} rows={ferramentas.map(t=>[t.codigo,t.tipo,t.prensa,n(t.golpes),n(t.limite),t.status])} detail={row=>openDetail(row[0],row[1]+' na '+row[2]+'. '+row[3]+' golpes registrados de '+row[4]+'.')}/></Panel><Panel title="Bobinas / matéria-prima" text="Consumo em kg e metros, retalhos e sucata."><Table heads={['OP','Bobina','Material','Consumo kg','Metros','Retalho','Sucata']} rows={bobinas.map(c=>[c.op,c.bobina,c.material,n(c.kg),n(c.metros),n(c.retalho)+' kg',n(c.sucata)+' kg'])} detail={row=>openDetail(row[0],'Bobina '+row[1]+': consumo '+row[3]+' kg / '+row[4]+' m; retalho '+row[5]+'; sucata '+row[6]+'.')}/></Panel></View>}

function PCP({openDetail}:{openDetail:(title:string,body:string)=>void}){return <View title="PCP / APS" icon={<Factory/>} text="Sequenciamento de carga de máquina com capacidade finita simulada."><Panel title="Fila de OPs" text="Injetoras e prensas."><Table heads={['Prioridade','OP','Máquina','Produto','Quantidade','Produzido','Setup','Status']} rows={fila.map(q=>[String(q.prioridade),q.op,q.maquina,q.produto,n(q.quantidade),n(q.produzido),q.setup+' min',q.status])} detail={row=>openDetail(row[1],row[2]+' • '+row[3]+'. Produção '+row[5]+' de '+row[4]+'.')}/></Panel><Panel title="Regras do sequenciamento" text="Ordem demonstrativa de decisão."><div className="erp4-grid4"><Metric label="1" value="Prioridade da OP"/><Metric label="2" value="Compatibilidade"/><Metric label="3" value="Setup"/><Metric label="4" value="Prazo / capacidade"/></div></Panel></View>}

function BlockK({openDetail}:{openDetail:(title:string,body:string)=>void}){return <View title="Bloco K" icon={<ShieldCheck/>} text="Simulação somente leitura dos registros K200 e K230."><Panel title="Apontamentos fiscais simulados" text="Estrutura de dados demonstrativa para SPED EFD ICMS/IPI; não transmite dados fiscais."><Table heads={['Registro','Item','Descrição','Quantidade','Unidade','OP']} rows={blocoK.map(k=>[k.registro,k.item,k.descricao,n(k.quantidade),k.unidade,k.op??'—'])} detail={row=>openDetail(row[0],'Item '+row[1]+' • '+row[2]+' • '+row[3]+' '+row[4]+'.')}/></Panel></View>}

function View({title,icon,text,children}:{title:string;icon:ReactNode;text:string;children:ReactNode}){return <div className="erp4-view"><header><span className="erp4-eyebrow">SGQ ERP • PCP BRASIL</span><h1>{icon}{title}</h1><p>{text}</p></header>{children}</div>}
function Metric({label,value}:{label:string;value:string}){return <article className="erp4-card"><span>{label}</span><strong>{value}</strong></article>}
function Action({icon,title,text}:{icon:ReactNode;title:string;text:string}){return <button className="erp4-action" type="button" onClick={()=>undefined}>{icon}<span><b>{title}</b><small>{text}</small></span></button>}
function Panel({title,text,children}:{title:string;text:string;children:ReactNode}){return <section className="erp4-panel"><header><span className="erp4-eyebrow">CONTROLE</span><h2>{title}</h2><p>{text}</p></header>{children}</section>}
function Table({heads,rows,detail}:{heads:string[];rows:string[][];detail?:(row:string[])=>void}){return <div className="erp4-table"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}{detail&&<th>Ação</th>}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.join('|')+index}>{row.map((cell,i)=><td key={heads[i]}>{cell}</td>)}{detail&&<td><button onClick={()=>detail(row)}>Ver</button></td>}</tr>)}</tbody></table></div>}
