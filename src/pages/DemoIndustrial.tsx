import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Factory, Gauge, Layers3, ShieldCheck, Tablet, Wrench, X } from 'lucide-react'
import FloatingTabletHeader from '../components/FloatingTabletHeader'
import UnifiedTabletDashboard from '../components/UnifiedTabletDashboard'
import { demoBlockK, demoCoils, demoInjection, demoMoldes, demoProductionQueue, demoTools } from '../data/demoData'
import './demo-industrial-light.css'

type View='dashboard'|'injecao'|'prensados'|'pcp'|'bloco-k'
type Detail={title:string;body:string}
const number=(value:number)=>value.toLocaleString('pt-BR')
const pct=(value:number)=>value.toFixed(1)+'%'

export default function DemoIndustrial(){
 const [view,setView]=useState<View>('dashboard'); const [detail,setDetail]=useState<Detail|null>(null)
 return <main className="industrial-demo-light">
  <FloatingTabletHeader title="SGQ ERP Industrial" subtitle="PCP Brasil • Injeção Plástica • Prensados / Estamparia" onBack={()=>{window.location.href='/erp-industrial'}} onTablet={()=>setView('dashboard')}/>
  <div className="industrial-demo-body">
   <nav className="industrial-demo-nav" aria-label="Módulos da demonstração">
    <button className={view==='dashboard'?'active':''} onClick={()=>setView('dashboard')}><Gauge size={17}/> Visão geral</button>
    <button className={view==='injecao'?'active':''} onClick={()=>setView('injecao')}><Layers3 size={17}/> Injeção plástica</button>
    <button className={view==='prensados'?'active':''} onClick={()=>setView('prensados')}><Wrench size={17}/> Prensados / Estamparia</button>
    <button className={view==='pcp'?'active':''} onClick={()=>setView('pcp')}><Factory size={17}/> PCP / APS</button>
    <button className={view==='bloco-k'?'active':''} onClick={()=>setView('bloco-k')}><ShieldCheck size={17}/> Bloco K</button>
   </nav>
   <section className="industrial-demo-content">
    {view==='dashboard' && <><UnifiedTabletDashboard/><section className="industrial-demo-sector-grid">
      <button onClick={()=>setView('injecao')}><Layers3/><b>Injeção plástica</b><span>Moldes, cavidades, ciclos, setup e refugo.</span></button>
      <button onClick={()=>setView('prensados')}><Wrench/><b>Prensados / estamparia</b><span>Golpes, ferramentas, bobinas, retalhos e sucata.</span></button>
      <button onClick={()=>setView('pcp')}><Factory/><b>PCP / APS</b><span>Fila de OPs e carga finita por máquina.</span></button>
      <button onClick={()=>setView('bloco-k')}><ShieldCheck/><b>Bloco K</b><span>Simulação somente leitura de K200 e K230.</span></button>
    </section></>}
    {view==='injecao' && <InjectionView onDetail={setDetail}/>}
    {view==='prensados' && <PressView onDetail={setDetail}/>}
    {view==='pcp' && <PcpView onDetail={setDetail}/>}
    {view==='bloco-k' && <BlockKView onDetail={setDetail}/>}
   </section>
  </div>
  <button type="button" className="erp-floating-tablet" onClick={()=>setView('dashboard')}><Tablet size={21}/> TABLET • chão de fábrica</button>
  {detail && <div className="industrial-demo-modal" role="presentation" onMouseDown={()=>setDetail(null)}><div className="industrial-demo-modal-card" role="dialog" aria-modal="true" onMouseDown={event=>event.stopPropagation()}><header><div><span>DETALHE DEMONSTRATIVO</span><h2>{detail.title}</h2></div><button onClick={()=>setDetail(null)} aria-label="Fechar"><X size={18}/></button></header><p>{detail.body}</p><button type="button" className="industrial-secondary" onClick={()=>setDetail(null)}>Fechar</button></div></div>}
 </main>
}

function InjectionView({onDetail}:{onDetail:(detail:Detail)=>void}){
 const averageDelta=useMemo(()=>demoInjection.reduce((sum,item)=>sum+((item.cicloRealSec-item.cicloTeoricoSec)/item.cicloTeoricoSec)*100,0)/demoInjection.length,[])
 return <ViewShell title="Injeção Plástica" icon={<Layers3/>} subtitle="Controle de moldes, cavidades, ciclo real, setup e perdas.">
  <DataCards cards={[['Moldes monitorados',String(demoMoldes.length)],['Cavidades ativas',demoMoldes.reduce((s,m)=>s+m.cavidadesAtivas,0)+' / '+demoMoldes.reduce((s,m)=>s+m.cavidadesTotais,0)],['Setup em execução','1'],['Ciclo real × teórico','+'+averageDelta.toFixed(1)+'%']]}/>
  <Panel title="Controle de moldes" subtitle="Cavidades ativas versus totais e vida útil por ciclos / batidas."><Table headers={['Molde','Cavidades','Ciclos','Vida útil','Status']} rows={demoMoldes.map(m=>[m.codigo,m.cavidadesAtivas+'/'+m.cavidadesTotais,number(m.ciclosAtuais),pct(m.percentualVidaUtil),m.status])} onDetail={row=>onDetail({title:row[0],body:'Molde com '+row[1]+' cavidades ativas. Vida útil consumida: '+row[3]+'. Última manutenção: '+(demoMoldes.find(m=>m.codigo===row[0])?.ultimaManutencao??'não informada')+'.'})}/></Panel>
  <Panel title="Apontamento de produção" subtitle="Refugo de peças, defeitos e galhos de injeção."><Table headers={['OP','Máquina','Produto','Ciclo','Boas','Refugo']} rows={demoInjection.map(i=>[i.op,i.maquina,i.produto,i.cicloRealSec+'s / '+i.cicloTeoricoSec+'s',number(i.pecasBoas),number(i.refugoTotal)])} onDetail={row=>onDetail({title:row[0],body:'Ciclo real '+row[3]+'. Produção boa '+row[4]+' peças. Refugo total '+row[5]+', incluindo defeitos e galhos de injeção.'})}/></Panel>
 </ViewShell>
}
function PressView({onDetail}:{onDetail:(detail:Detail)=>void}){
 return <ViewShell title="Prensados / Estamparia" icon={<Wrench/>} subtitle="Ferramentas, golpes, bobinas, consumo, retalhos e sucata por OP.">
  <DataCards cards={[['Ferramentas monitoradas',String(demoTools.length)],['Afiação próxima',String(demoTools.filter(t=>t.status==='AFIAR_EM_BREVE').length)],['Bobinas',String(demoCoils.length)],['Sucata registrada',number(demoCoils.reduce((s,c)=>s+c.sucataKg,0))+' kg']]}/>
  <Panel title="Estampos e facas" subtitle="Vida útil monitorada pelo número de golpes da prensa."><Table headers={['Código','Tipo','Prensa','Golpes','Vida útil','Status']} rows={demoTools.map(t=>[t.codigo,t.tipo,t.prensa,number(t.golpesAtuais),pct(t.percentualVidaUtil),t.status])} onDetail={row=>onDetail({title:row[0],body:row[1]+' em '+row[2]+'. '+row[3]+' golpes registrados.'})}/></Panel>
  <Panel title="Bobinas / matéria-prima" subtitle="Consumo em kg e metros, retalhos e sucata por OP."><Table headers={['OP','Bobina','Material','Consumo kg','Metros','Retalho','Sucata']} rows={demoCoils.map(c=>[c.op,c.bobina,c.material,number(c.consumoKg),number(c.consumoMetros),number(c.retalhoKg)+' kg',number(c.sucataKg)+' kg'])} onDetail={row=>onDetail({title:row[0],body:'Bobina '+row[1]+': consumo '+row[3]+' kg / '+row[4]+' m, retalho '+row[5]+', sucata '+row[6]+'.'})}/></Panel>
 </ViewShell>
}
function PcpView({onDetail}:{onDetail:(detail:Detail)=>void}){
 return <ViewShell title="PCP / APS Simplificado" icon={<Factory/>} subtitle="Sequenciamento de carga de máquina, prioridade, setup e ciclo.">
  <Panel title="Fila de OPs" subtitle="Capacidade finita simulada para injetoras e prensas."><Table headers={['Prioridade','OP','Máquina','Produto','Qtd.','Produzido','Setup','Status']} rows={demoProductionQueue.map(q=>[String(q.prioridade),q.op,q.maquina,q.produto,number(q.quantidade),number(q.quantidadeProduzida),q.setupMin+' min',q.status])} onDetail={row=>onDetail({title:row[1],body:row[2]+' • '+row[3]+'. Quantidade '+row[5]+' de '+row[4]+'. Setup previsto '+row[6]+'.'})}/></Panel>
  <Panel title="Regra operacional" subtitle="Sequenciamento demonstrativo por disponibilidade, setup, prazo e capacidade."><div className="industrial-rule-grid"><div><strong>1</strong><span>Prioridade da OP</span></div><div><strong>2</strong><span>Compatibilidade da máquina</span></div><div><strong>3</strong><span>Setup previsto</span></div><div><strong>4</strong><span>Prazo e capacidade</span></div></div></Panel>
 </ViewShell>
}
function BlockKView({onDetail}:{onDetail:(detail:Detail)=>void}){
 return <ViewShell title="Bloco K • demonstração fiscal" icon={<ShieldCheck/>} subtitle="Registros K200 e K230 simulados, somente leitura.">
  <DataCards cards={[['K200 • estoque',String(demoBlockK.filter(k=>k.registro==='K200').length)],['K230 • produção',String(demoBlockK.filter(k=>k.registro==='K230').length)],['Período','09/2026'],['Modo','Somente leitura']]}/>
  <Panel title="Apontamentos fiscais simulados" subtitle="Estrutura demonstrativa para SPED EFD ICMS/IPI; não é transmissão fiscal."><Table headers={['Registro','Item','Descrição','Quantidade','Unid.','OP']} rows={demoBlockK.map(k=>[k.registro,k.codigoItem,k.descricao,number(k.quantidade),k.unidade,k.op??'—'])} onDetail={row=>onDetail({title:row[0],body:'Item '+row[1]+' • '+row[2]+' • '+row[3]+' '+row[4]+'. '+(row[5]!=='—'?'Vinculado à '+row[5]+'.':'Saldo de estoque simulado.')})}/></Panel>
 </ViewShell>
}
function ViewShell({title,subtitle,icon,children}:{title:string;subtitle:string;icon:ReactNode;children:ReactNode}){return <div className="industrial-view-shell"><header><div><span>SGQ ERP • PCP BRASIL</span><h1>{icon}{title}</h1><p>{subtitle}</p></div></header>{children}</div>}
function DataCards({cards}:{cards:Array<[string,string]>}){return <section className="industrial-data-cards">{cards.map(card=><article key={card[0]}><span>{card[0]}</span><strong>{card[1]}</strong></article>)}</section>}
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="industrial-panel"><header><div><span>CONTROLE</span><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</section>}
function Table({headers,rows,onDetail}:{headers:string[];rows:string[][];onDetail:(row:string[])=>void}){return <div className="industrial-table-wrap"><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}<th>Ação</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.join('|')+index}>{row.map((cell,i)=><td key={headers[i]}>{cell}</td>)}<td><button type="button" onClick={()=>onDetail(row)}>Ver</button></td></tr>)}</tbody></table></div>}
