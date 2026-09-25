import { useEffect, useState } from 'react'
import { Boxes, RefreshCw, Play, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Product={id:string;codigo:string;nome:string;estoque_atual:number;fabricado:boolean}
type Need={id:string;componente_id:string;nivel:number;quantidade_bruta:number;estoque_atual:number;reservado:number;quantidade_disponivel:number;necessidade_liquida:number;sugestao:string}
type Run={id:string;produto_raiz_id:string;quantidade_raiz:number;demanda_ref:string|null;status:string;created_at:string}

export default function MRPIndustrial(){
 const[products,setProducts]=useState<Product[]>([])
 const[runs,setRuns]=useState<Run[]>([])
 const[needs,setNeeds]=useState<Need[]>([])
 const[productId,setProductId]=useState('')
 const[quantity,setQuantity]=useState('1')
 const[demandRef,setDemandRef]=useState('')
 const[selectedRun,setSelectedRun]=useState('')
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

 async function load(){
  setBusy(true);setError('')
  try{
   const[p,r]=await Promise.all([
    supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,fabricado').eq('ativo',true).order('codigo').limit(3000),
    supabase.from('erp_mrp_runs').select('id,produto_raiz_id,quantidade_raiz,demanda_ref,status,created_at').order('created_at',{ascending:false}).limit(100)
   ])
   if(p.error)throw p.error;if(r.error)throw r.error
   setProducts((p.data??[]) as Product[]);setRuns((r.data??[]) as Run[])
   if(!selectedRun&&r.data?.[0]){setSelectedRun(r.data[0].id);await loadNeeds(r.data[0].id)}
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar MRP.')}finally{setBusy(false)}
 }
 async function loadNeeds(runId:string){
  setSelectedRun(runId)
  const r=await supabase.from('erp_mrp_necessidades').select('id,componente_id,nivel,quantidade_bruta,estoque_atual,reservado,quantidade_disponivel,necessidade_liquida,sugestao').eq('run_id',runId).order('nivel').order('componente_id')
  if(r.error)setError(r.error.message);else setNeeds((r.data??[]) as Need[])
 }
 useEffect(()=>{void load()},[])
 async function calculate(){
  const qty=Number(quantity)
  if(!productId||qty<=0){setError('Selecione o produto e informe uma quantidade maior que zero.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.rpc('erp_mrp_explodir',{p_produto_id:productId,p_quantidade:qty,p_demanda_ref:demandRef.trim()||null})
   if(r.error)throw r.error
   const runId=String(r.data);setSelectedRun(runId);setMessage('MRP calculado pela estrutura multinível da ficha técnica, considerando perda, estoque e reservas.');await load();await loadNeeds(runId)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível executar o MRP.')}finally{setBusy(false)}
 }
 const productName=(id:string)=>{const p=products.find(x=>x.id===id);return p?p.codigo+' • '+p.nome:id}
 return <main className="industrial-form-page">
  <header className="process-sheet-header"><div><button className="industrial-secondary" type="button" onClick={()=>location.href='/pcp'}><ArrowLeft size={16}/> PCP</button><span className="industrial-eyebrow">PLANEJAMENTO • MRP MULTINÍVEL</span><h1>Necessidades de Materiais</h1><p>Explosão BOM → estoque disponível → necessidade líquida → sugestão de compra ou produção.</p></div><button className="industrial-secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button></header>
  {(message||error)&&<div className={error?'error':'notice'} style={{margin:'12px 0'}}>{error||message}</div>}
  <section className="industrial-panel" style={{marginBottom:16}}>
   <div className="process-section-heading"><span>EXECUTAR MRP</span><h2>Demanda de fabricação</h2><p>O cálculo usa a ficha técnica ativa e percorre BOMs filhas sem permitir ciclos.</p></div>
   <div className="process-form-grid">
    <label>Produto raiz<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}</select></label>
    <label>Quantidade<input type="number" min="0.001" step="0.001" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
    <label>Referência da demanda<input value={demandRef} onChange={e=>setDemandRef(e.target.value)} placeholder="Pedido, OP, previsão…"/></label>
    <div style={{display:'flex',alignItems:'end'}}><button className="industrial-primary" type="button" onClick={()=>void calculate()} disabled={busy}><Play size={16}/>{busy?'Calculando…':'Calcular MRP'}</button></div>
   </div>
  </section>
  <section className="industrial-panel" style={{marginBottom:16}}>
   <div className="process-section-heading"><span>HISTÓRICO</span><h2>Execuções MRP</h2></div>
   <div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Data</th><th>Produto raiz</th><th>Qtd.</th><th>Referência</th><th>Status</th><th></th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString('pt-BR')}</td><td>{productName(r.produto_raiz_id)}</td><td>{r.quantidade_raiz}</td><td>{r.demanda_ref||'—'}</td><td>{r.status}</td><td><button className="industrial-secondary" onClick={()=>void loadNeeds(r.id)}>Abrir</button></td></tr>)}</tbody></table></div>
  </section>
  <section className="industrial-panel">
   <div className="process-section-heading"><span>EXPLOSÃO MULTINÍVEL</span><h2>Necessidades calculadas</h2></div>
   {!selectedRun?<p>Nenhuma execução selecionada.</p>:<div className="industrial-table-scroll"><table className="industrial-table"><thead><tr><th>Nível</th><th>Componente</th><th>Bruta</th><th>Estoque</th><th>Reservado</th><th>Disponível</th><th>Necessidade líquida</th><th>Sugestão</th></tr></thead><tbody>{needs.map(n=><tr key={n.id}><td>{n.nivel}</td><td>{productName(n.componente_id)}</td><td>{n.quantidade_bruta}</td><td>{n.estoque_atual}</td><td>{n.reservado}</td><td>{n.quantidade_disponivel}</td><td><strong>{n.necessidade_liquida}</strong></td><td><strong>{n.sugestao}</strong></td></tr>)}</tbody></table></div>}
  </section>
  <div className="pcp-info" style={{marginTop:16}}><Boxes size={20}/><div><strong>Arquitetura aplicada</strong><p>Technical/BOM → MRP → Planning/PCP → Production → Warehouse/Quality. O motor é tenant-aware e executa no PostgreSQL, não no navegador.</p></div></div>
 </main>
}
