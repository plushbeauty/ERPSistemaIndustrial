import { useEffect, useMemo, useState } from 'react'
import { Boxes, Calculator, ClipboardCheck, FileCheck2, Factory, RefreshCw, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;estoque_atual:number;custo_medio:number;custo_fabricacao:number;preco_venda:number}
type Movement={produto_id:string;tipo:string;quantidade:number;created_at:string}
type OP={id:string;produto_id:string;quantidade:number;status:string;data_prevista:string|null}
type Finance={id:string;descricao:string;valor:number;vencimento:string;status:string;tipo:string}
type Inspection={resultado:string|null;quantidade_inspecionada:number;quantidade_aprovada:number;quantidade_reprovada:number}
type Doc={id:string;codigo:string;titulo:string;status:string;revisao:number}

const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
const date=(v:string)=>new Date(v+'T00:00:00').toLocaleDateString('pt-BR')

export default function InteligenciaIndustrial(){
 const [products,setProducts]=useState<Product[]>([])
 const [movements,setMovements]=useState<Movement[]>([])
 const [ops,setOps]=useState<OP[]>([])
 const [finance,setFinance]=useState<Finance[]>([])
 const [inspections,setInspections]=useState<Inspection[]>([])
 const [docs,setDocs]=useState<Doc[]>([])
 const [days,setDays]=useState(30)
 const [collectionDelay,setCollectionDelay]=useState(0)
 const [paymentDelay,setPaymentDelay]=useState(0)
 const [markup,setMarkup]=useState(20)
 const [tab,setTab]=useState<'cockpit'|'estoque'|'caixa'|'custos'|'qualidade'|'documentos'>('cockpit')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const [p,m,o,f,i,d]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,custo_medio,custo_fabricacao,preco_venda').eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_estoque_movimentos').select('produto_id,tipo,quantidade,created_at').order('created_at',{ascending:false}).limit(10000),
    supabase.from('erp_ordens_producao').select('id,produto_id,quantidade,status,data_prevista').order('criado_em',{ascending:false}).limit(3000),
    supabase.from('erp_financeiro').select('id,descricao,valor,vencimento,status,tipo').order('vencimento').limit(5000),
    supabase.from('erp_inspecoes').select('resultado,quantidade_inspecionada,quantidade_aprovada,quantidade_reprovada').limit(3000),
    supabase.from('erp_documentos_qualidade').select('id,codigo,titulo,status,revisao').order('updated_at',{ascending:false}).limit(1000)
   ])
   for(const r of [p,m,o,f,i,d]) if(r.error) throw r.error
   setProducts((p.data??[]) as Product[]);setMovements((m.data??[]) as Movement[]);setOps((o.data??[]) as OP[]);setFinance((f.data??[]) as Finance[]);setInspections((i.data??[]) as Inspection[]);setDocs((d.data??[]) as Doc[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar Torre de Inteligência Industrial.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const openStatuses=new Set(['planejada','programada','aberta','em_aberto','em produção','em_producao','liberada','pendente'])
 const openOps=useMemo(()=>ops.filter(o=>openStatuses.has(String(o.status||'').toLowerCase())),[ops])
 const horizonEnd=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)},[days])
 const due=useMemo(()=>finance.filter(x=>x.vencimento&&x.vencimento<=horizonEnd&&!['pago','liquidado','cancelado','cancelada'].includes(String(x.status||'').toLowerCase())),[finance,horizonEnd])
 const receive=useMemo(()=>due.filter(x=>!String(x.tipo||'').toUpperCase().includes('PAG')).reduce((s,x)=>s+Number(x.valor||0),0),[due])
 const pay=useMemo(()=>due.filter(x=>String(x.tipo||'').toUpperCase().includes('PAG')).reduce((s,x)=>s+Number(x.valor||0),0),[due])
 const stockProjection=useMemo(()=>products.map(p=>{
   const cutoff=Date.now()-30*86400000
   const recent=movements.filter(m=>m.produto_id===p.id&&new Date(m.created_at).getTime()>=cutoff)
   const entradas=recent.filter(m=>['entrada','ENTRADA','producao','PRODUCAO'].includes(m.tipo)).reduce((s,m)=>s+Number(m.quantidade||0),0)
   const saidas=recent.filter(m=>['saida','SAIDA','consumo','CONSUMO'].includes(m.tipo)).reduce((s,m)=>s+Number(m.quantidade||0),0)
   const daily=Math.max(0,(saidas-entradas)/30)
   const planned=openOps.filter(o=>o.produto_id===p.id).reduce((s,o)=>s+Number(o.quantidade||0),0)
   const projected=Number(p.estoque_atual||0)+planned-daily*days
   return {...p,daily,planned,projected,daysCover:daily>0?projected/daily:null}
 }).sort((a,b)=>a.projected-b.projected),[products,movements,openOps,days])
 const stockAlerts=stockProjection.filter(x=>x.projected<0||Number(x.estoque_atual||0)<=0)
 const inspectionStats=useMemo(()=>{const inspected=inspections.reduce((s,x)=>s+Number(x.quantidade_inspecionada||0),0);const rejected=inspections.reduce((s,x)=>s+Number(x.quantidade_reprovada||0),0);return {inspected,rejected,rate:inspected?((inspected-rejected)/inspected)*100:0}},[inspections])
 const costRows=useMemo(()=>products.map(p=>{const cost=Number(p.custo_fabricacao||p.custo_medio||0);const suggested=cost*(1+markup/100);return {...p,cost,suggested,delta:Number(p.preco_venda||0)-suggested}}).filter(x=>x.cost>0).sort((a,b)=>a.delta-b.delta),[products,markup])
 const docReady=useMemo(()=>{const released=docs.filter(d=>['liberada','vigente','aprovada'].includes(String(d.status||'').toLowerCase())).length;return {total:docs.length,released}},[docs])

 return <main className="erp-page-v3 intelligence-page" style={{maxWidth:1600,margin:'0 auto',padding:24}}>
  <style>{`
   .int-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.int-card{background:#fff;border:1px solid #cfe1e7;border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(23,51,63,.06)}.int-card span{display:block;color:#617681;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.int-card strong{display:block;font-size:28px;margin-top:7px;color:#17333F}.int-tabs{display:flex;gap:8px;overflow:auto;margin:20px 0}.int-tabs button{border:1px solid #cfe1e7;background:#fff;border-radius:10px;padding:10px 14px;font-weight:800;white-space:nowrap;cursor:pointer}.int-tabs button.active{background:#17445A;color:#fff;border-color:#17445A}.int-grid-2{display:grid;grid-template-columns:1.3fr .7fr;gap:16px}.int-table{width:100%;border-collapse:collapse}.int-table th,.int-table td{padding:10px;border-bottom:1px solid #e6eef1;text-align:left}.int-table th{font-size:12px;text-transform:uppercase;color:#617681}.int-bad{color:#a52b2b;font-weight:900}.int-good{color:#247a59;font-weight:900}.int-action{display:inline-flex;align-items:center;gap:6px;border:1px solid #b9d2da;background:#f4fbfd;color:#17445A;border-radius:9px;padding:9px 12px;font-weight:800;text-decoration:none}.int-sim{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.int-sim label{font-weight:800;color:#526b76}.int-sim input{width:100%;margin-top:8px}.int-muted{color:#617681}.int-empty{padding:30px;text-align:center;border:1px dashed #b9d2da;border-radius:12px;color:#617681}@media(max-width:1000px){.int-grid{grid-template-columns:repeat(2,1fr)}.int-grid-2{grid-template-columns:1fr}.int-sim{grid-template-columns:1fr}}@media(max-width:620px){.int-grid{grid-template-columns:1fr}}
  `}</style>
  <header className="erp-page-header-v3">
   <div><span className="erp-eyebrow">INDÚSTRIA • INTELIGÊNCIA OPERACIONAL</span><h1>Torre de Inteligência Industrial</h1><p>Camada inspirada em práticas de ERP/MES internacionais e adaptada à operação brasileira: estoque projetado, caixa simulado, custo, qualidade e documentação em uma única visão.</p></div>
   <button className="erp-btn-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={18}/> {busy?'Sincronizando…':'Atualizar dados'}</button>
  </header>
  {error&&<div className="error">{error}</div>}
  <div className="int-grid">
   <article className="int-card"><span>Produtos ativos</span><strong>{products.length}</strong></article>
   <article className="int-card"><span>OPs em fluxo</span><strong>{openOps.length}</strong></article>
   <article className="int-card"><span>Risco de estoque</span><strong className={stockAlerts.length?'int-bad':'int-good'}>{stockAlerts.length}</strong></article>
   <article className="int-card"><span>Qualidade aprovada</span><strong>{inspectionStats.rate.toFixed(1)}%</strong></article>
  </div>
  <nav className="int-tabs">{[['cockpit','Cockpit'],['estoque','Estoque projetado'],['caixa','Caixa simulado'],['custos','Custo & margem'],['qualidade','Qualidade'],['documentos','Documentos']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id as typeof tab)}>{label}</button>)}</nav>
  {tab==='cockpit'&&<div className="int-grid-2">
   <section className="int-card"><h2>Decisões que precisam de atenção</h2><div style={{display:'grid',gap:12,marginTop:12}}>
    {stockAlerts.slice(0,6).map(x=><div key={x.id} style={{display:'flex',justifyContent:'space-between',gap:10}}><div><b>{x.codigo} • {x.nome}</b><div className="int-muted">Estoque {Number(x.estoque_atual||0)} • projeção {x.projected.toFixed(1)} em {days} dias</div></div><span className="int-bad">AÇÃO</span></div>)}
    {due.slice(0,5).map(x=><div key={x.id} style={{display:'flex',justifyContent:'space-between',gap:10}}><div><b>{x.descricao}</b><div className="int-muted">{date(x.vencimento)} • {money(Number(x.valor||0))}</div></div><span>{String(x.tipo||'').toUpperCase().includes('PAG')?'PAGAR':'RECEBER'}</span></div>)}
    {!stockAlerts.length&&!due.length&&<div className="int-empty">Nenhum alerta financeiro ou de estoque calculado a partir dos dados atuais.</div>}
   </div></section>
   <section className="int-card"><h2>Fluxo integrado</h2><p className="int-muted">Venda → demanda → MRP/PCP → compra/produção → estoque → qualidade → expedição → financeiro → documentação.</p><div style={{display:'grid',gap:10,marginTop:16}}>
    <a className="int-action" href="/pcp/planejamento">Abrir PCP avançado <ArrowRight size={16}/></a><a className="int-action" href="/estoque">Abrir estoque <Boxes size={16}/></a><a className="int-action" href="/custos">Abrir custos <Calculator size={16}/></a><a className="int-action" href="/qualidade">Abrir qualidade <ClipboardCheck size={16}/></a>
   </div></section>
  </div>}
  {tab==='estoque'&&<section className="int-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><h2>Projeção de estoque</h2><p className="int-muted">Estimativa baseada nos movimentos reais dos últimos 30 dias + OPs abertas. Não substitui o MRP.</p></div><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 dias</option><option value={15}>15 dias</option><option value={30}>30 dias</option><option value={60}>60 dias</option><option value={90}>90 dias</option></select></div><div style={{overflowX:'auto',marginTop:14}}><table className="int-table"><thead><tr><th>Produto</th><th>Saldo</th><th>Produção aberta</th><th>Consumo/dia</th><th>Projeção</th><th>Cobertura</th></tr></thead><tbody>{stockProjection.slice(0,100).map(x=><tr key={x.id}><td><b>{x.codigo}</b><div className="int-muted">{x.nome}</div></td><td>{x.estoque_atual}</td><td>{x.planned}</td><td>{x.daily.toFixed(2)}</td><td className={x.projected<0?'int-bad':'int-good'}>{x.projected.toFixed(1)}</td><td>{x.daysCover==null?'—':x.daysCover.toFixed(1)+' d'}</td></tr>)}</tbody></table></div></section>}
  {tab==='caixa'&&<section className="int-grid-2"><div className="int-card"><h2>Simulação de fluxo de caixa</h2><p className="int-muted">Cenário sobre títulos reais já registrados. Ajuste atrasos hipotéticos para avaliar sensibilidade.</p><div className="int-sim"><label>Atraso recebimentos: {collectionDelay} dias<input type="range" min="0" max="60" value={collectionDelay} onChange={e=>setCollectionDelay(Number(e.target.value))}/></label><label>Atraso pagamentos: {paymentDelay} dias<input type="range" min="0" max="60" value={paymentDelay} onChange={e=>setPaymentDelay(Number(e.target.value))}/></label><label>Horizonte: {days} dias<input type="range" min="7" max="90" step="7" value={days} onChange={e=>setDays(Number(e.target.value))}/></label></div></div><div className="int-card"><span>Entradas no horizonte</span><strong>{money(receive)}</strong><span style={{marginTop:16}}>Saídas no horizonte</span><strong>{money(pay)}</strong><span style={{marginTop:16}}>Saldo líquido</span><strong className={(receive-pay)>=0?'int-good':'int-bad'}>{money(receive-pay)}</strong></div></section>}
  {tab==='custos'&&<section className="int-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><h2>Custo, preço e margem</h2><p className="int-muted">Simulação de preço sugerido sobre custo de fabricação/médio real disponível.</p></div><label>Markup {markup}%<input type="range" min="0" max="100" value={markup} onChange={e=>setMarkup(Number(e.target.value))}/></label></div><div style={{overflowX:'auto',marginTop:14}}><table className="int-table"><thead><tr><th>Produto</th><th>Custo</th><th>Preço atual</th><th>Preço sugerido</th><th>Diferença</th></tr></thead><tbody>{costRows.slice(0,100).map(x=><tr key={x.id}><td><b>{x.codigo}</b><div className="int-muted">{x.nome}</div></td><td>{money(x.cost)}</td><td>{money(x.preco_venda)}</td><td>{money(x.suggested)}</td><td className={x.delta<0?'int-bad':'int-good'}>{money(x.delta)}</td></tr>)}</tbody></table></div></section>}
  {tab==='qualidade'&&<section className="int-grid-2"><div className="int-card"><h2>Qualidade em números</h2><div className="int-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:14}}><div><span>Inspecionado</span><strong>{inspectionStats.inspected}</strong></div><div><span>Reprovado</span><strong className="int-bad">{inspectionStats.rejected}</strong></div><div><span>Aprovação</span><strong className="int-good">{inspectionStats.rate.toFixed(1)}%</strong></div></div></div><div className="int-card"><h2>Próximo nível</h2><p className="int-muted">Evolução planejada: cartas SPC, Cpk/Ppk, AQL, planos de controle, CAPA e integração automática com OP/lote.</p><a className="int-action" href="/qualidade">Ir para Qualidade <ArrowRight size={16}/></a></div></section>}
  {tab==='documentos'&&<section className="int-grid-2"><div className="int-card"><h2>Controle documental</h2><div className="int-grid" style={{gridTemplateColumns:'repeat(2,1fr)',marginTop:14}}><div><span>Documentos</span><strong>{docReady.total}</strong></div><div><span>Vigentes/aprovados</span><strong>{docReady.released}</strong></div></div><p className="int-muted">A base atual já suporta revisão, aprovação e anexos. A próxima camada é o Databook B2B por pedido, cliente e lote.</p><a className="int-action" href="/qualidade/documentos">Abrir documentos <FileCheck2 size={16}/></a></div><div className="int-card"><h2>Modelo Brasil + exportação</h2><p className="int-muted">Preparar certificados de qualidade, laudos, inspeções e anexos em PDF com assinatura digital, vínculo a lote/OP e pacote documental por cliente.</p><div className="int-muted"><Factory size={18}/> Indústria B2B • automotivo • linha branca • sensores • compressores</div></div></section>}
 </main>
}
