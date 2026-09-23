import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Factory, Gauge, HelpCircle, Package, Play, Plus, RefreshCw, Search, ShieldCheck, Wrench, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Tab='visao'|'pedidos'|'ops'|'materiais'|'producao'|'programacao'|'capacidade'|'qualidade'
type Modal='ajuda'|'op'|'programacao'|null
type Order={id:string;numero:number;cliente_id:string;status:string;total:number}
type OP={id:string;numero_op:string;produto_id:string|null;quantidade:number;status:string;pedido_venda_id:string|null;data_prevista:string|null}
type Product={id:string;codigo:string;nome:string;estoque_atual:number;categoria:string|null}
type Program={id:string;ordem_producao_id:string|null;maquina_id:string|null;produto_id:string|null;inicio_planejado:string;fim_planejado:string;quantidade_planejada:number;quantidade_produzida:number;quantidade_refugada:number;status:string}
type Machine={id:string;codigo:string;nome:string;tipo:string|null;status:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number}
type Ficha={id:string;produto_id:string;versao:number;rendimento:number;ativa:boolean}
type FItem={id:string;ficha_id:string;componente_id:string;quantidade:number;perda_percentual:number}

const help:Record<Tab,{title:string;what:string;how:string;action:string}> = {
 visao:{title:'Visão geral',what:'É o painel de comando do PCP. Mostra a situação atual e orienta o usuário pelo fluxo completo.',how:'Comece pelos pedidos, confirme materiais, crie/libere a OP, programe máquina, aponte a produção e acompanhe qualidade.',action:'Use os atalhos abaixo para executar cada etapa.'},
 pedidos:{title:'Pedidos / Demanda',what:'Mostra pedidos comerciais que podem gerar necessidade de fabricação.',how:'Consulte um pedido, veja quantas OPs estão vinculadas e use a rotina Comercial para gerar as OPs necessárias.',action:'Aqui a função principal é consulta e rastreabilidade da demanda.'},
 ops:{title:'Ordens de Produção',what:'É o cadastro operacional da fabricação: produto, quantidade, prazo e status da OP.',how:'Clique em Nova OP, informe produto, quantidade e data prevista. Depois abra a OP para consultar materiais e apontar produção.',action:'Nova OP'},
 materiais:{title:'Materiais / MRP',what:'Compara a necessidade da ficha técnica da OP com o estoque atual.',how:'Selecione uma OP. O sistema calcula a necessidade dos componentes e mostra o saldo após a necessidade.',action:'Selecionar OP'},
 producao:{title:'Apontar produção',what:'Registra o que realmente saiu da fábrica, separando quantidade boa e defeituosa.',how:'Selecione a OP, informe quantidade encontrada e defeituosa, detalhe os defeitos e confirme. A rotina transacional atualiza produção/estoque/refugo.',action:'Conferir e lançar'},
 programacao:{title:'Programação / Gantt',what:'Organiza as OPs por máquina e horário.',how:'Clique em Programar OP, escolha OP, máquina, início, fim e quantidade. O registro fica disponível para acompanhamento.',action:'Programar OP'},
 capacidade:{title:'Capacidade / Máquinas',what:'Mostra as máquinas disponíveis e quantas programações cada uma possui.',how:'Use essa visão para identificar concentração de carga e apoiar o sequenciamento.',action:'Programar OP'},
 qualidade:{title:'Qualidade / Defeitos',what:'Consulta os defeitos apontados durante a produção.',how:'Os defeitos entram pelo apontamento. Depois podem ser tratados nas rotinas de Qualidade/RPNC.',action:'Apontar produção'}
}

export default function PCPIndustrial(){
 const [tab,setTab]=useState<Tab>('visao'),[modal,setModal]=useState<Modal>(null)
 const [ops,setOps]=useState<OP[]>([]),[orders,setOrders]=useState<Order[]>([]),[products,setProducts]=useState<Product[]>([]),[programs,setPrograms]=useState<Program[]>([]),[machines,setMachines]=useState<Machine[]>([]),[defects,setDefects]=useState<Defect[]>([]),[fichas,setFichas]=useState<Ficha[]>([]),[fitems,setFitems]=useState<FItem[]>([])
 const [selectedOp,setSelectedOp]=useState(''),[found,setFound]=useState(''),[bad,setBad]=useState(''),[defectText,setDefectText]=useState(''),[location,setLocation]=useState(''),[query,setQuery]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [opForm,setOpForm]=useState({produto_id:'',quantidade:'',data_prevista:'',status:'Planejada',observacoes:''})
 const [progForm,setProgForm]=useState({ordem_producao_id:'',maquina_id:'',inicio:'',fim:'',quantidade:'',status:'Programada'})

 async function load(){
  setBusy(true);setError('')
  try{
   const [o,op,p,pr,m,d,f,fi]=await Promise.all([
    supabase.from('erp_pedidos_venda').select('id,numero,cliente_id,status,total').order('numero',{ascending:false}).limit(300),
    supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status,pedido_venda_id,data_prevista').order('criado_em',{ascending:false}).limit(500),
    supabase.from('erp_produtos').select('id,codigo,nome,estoque_atual,categoria').eq('ativo',true).order('codigo').limit(1000),
    supabase.from('erp_pcp_programacoes').select('id,ordem_producao_id,maquina_id,produto_id,inicio_planejado,fim_planejado,quantidade_planejada,quantidade_produzida,quantidade_refugada,status').order('inicio_planejado').limit(500),
    supabase.from('erp_maquinas').select('id,codigo,nome,tipo,status').not('status','eq','INATIVA').order('codigo'),
    supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade').order('created_at',{ascending:false}).limit(500),
    supabase.from('erp_fichas_tecnicas').select('id,produto_id,versao,rendimento,ativa').eq('ativa',true),
    supabase.from('erp_ficha_itens').select('id,ficha_id,componente_id,quantidade,perda_percentual').order('sequencia')
   ])
   for(const x of [o,op,p,pr,m,d,f,fi]) if(x.error) throw x.error
   setOrders((o.data||[]) as Order[]);setOps((op.data||[]) as OP[]);setProducts((p.data||[]) as Product[]);setPrograms((pr.data||[]) as Program[]);setMachines((m.data||[]) as Machine[]);setDefects((d.data||[]) as Defect[]);setFichas((f.data||[]) as Ficha[]);setFitems((fi.data||[]) as FItem[])
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar PCP.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[])

 const current=ops.find(o=>o.id===selectedOp)
 const currentPrograms=programs.filter(p=>p.ordem_producao_id===selectedOp)
 const productionFound=currentPrograms.reduce((s,p)=>s+Number(p.quantidade_produzida||0),0)
 const productionBad=currentPrograms.reduce((s,p)=>s+Number(p.quantidade_refugada||0),0)
 const productionGood=Math.max(0,productionFound-productionBad)
 const currentFicha=current?fichas.find(f=>f.produto_id===current.produto_id):undefined
 const materials=currentFicha?fitems.filter(i=>i.ficha_id===currentFicha.id).map(i=>({...i,product:products.find(p=>p.id===i.componente_id)})):[]
 const filteredOps=ops.filter(o=>!query||o.numero_op.toLowerCase().includes(query.toLowerCase())||String(o.status).toLowerCase().includes(query.toLowerCase()))
 const schedule=useMemo(()=>programs.map(p=>({...p,op:ops.find(o=>o.id===p.ordem_producao_id),machine:machines.find(m=>m.id===p.maquina_id),product:products.find(x=>x.id===p.produto_id)})),[programs,ops,machines,products])

 function openNewOP(){setError('');setMessage('');setOpForm({produto_id:'',quantidade:'',data_prevista:'',status:'Planejada',observacoes:''});setModal('op')}
 function openProgram(opId=selectedOp){setError('');setMessage('');setProgForm({ordem_producao_id:opId,maquina_id:'',inicio:'',fim:'',quantidade:opId?String(ops.find(o=>o.id===opId)?.quantidade||''):'',status:'Programada'});setModal('programacao')}

 async function createOP(e:FormEvent){
  e.preventDefault();const quantidade=Number(opForm.quantidade)
  if(!opForm.produto_id||quantidade<=0){setError('Produto e quantidade maior que zero são obrigatórios.');return}
  setBusy(true);setError('');setMessage('')
  try{
   const product=products.find(p=>p.id===opForm.produto_id)
   const numero='OP-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(Date.now()).slice(-6)
   const r=await supabase.from('erp_ordens_producao').insert({numero_op:numero,produto_id:opForm.produto_id,quantidade,status:opForm.status,data_prevista:opForm.data_prevista||null,observacoes:opForm.observacoes||null}).select('id,numero_op').single()
   if(r.error) throw r.error
   setMessage('OP '+(r.data?.numero_op||numero)+' criada para '+(product?.codigo||product?.nome||'produto')+'.')
   setModal(null);setSelectedOp(r.data?.id||'');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a OP.')}
  finally{setBusy(false)}
 }

 async function createProgram(e:FormEvent){
  e.preventDefault();const qty=Number(progForm.quantidade)
  if(!progForm.ordem_producao_id||!progForm.maquina_id||!progForm.inicio||!progForm.fim||qty<=0){setError('OP, máquina, início, fim e quantidade são obrigatórios.');return}
  if(new Date(progForm.fim)<=new Date(progForm.inicio)){setError('O fim deve ser posterior ao início.');return}
  const op=ops.find(x=>x.id===progForm.ordem_producao_id)
  setBusy(true);setError('');setMessage('')
  try{
   const r=await supabase.from('erp_pcp_programacoes').insert({ordem_producao_id:progForm.ordem_producao_id,maquina_id:progForm.maquina_id,produto_id:op?.produto_id||null,inicio_planejado:progForm.inicio,fim_planejado:progForm.fim,quantidade_planejada:qty,quantidade_produzida:0,quantidade_refugada:0,status:progForm.status}).select('id').single()
   if(r.error) throw r.error
   setMessage('Programação criada e vinculada à OP.')
   setModal(null);setSelectedOp(progForm.ordem_producao_id);await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível programar a OP.')}
  finally{setBusy(false)}
 }

 async function confirmProduction(){
  if(!selectedOp){setError('Selecione uma OP.');return}
  const f=Number(found),b=Number(bad)
  if(f<0||b<0||b>f){setError('Quantidade encontrada/defeituosa inválida.');return}
  const defectsJson=defectText.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const parts=x.split(':');return{defeito:parts[0].trim(),quantidade:Number(parts[1]||0),observacao:parts.slice(2).join(':').trim()||null}}).filter(x=>x.defeito&&x.quantidade>0)
  setBusy(true);setError('')
  try{
   const {data,error}=await supabase.rpc('erp_registrar_conferencia_producao',{p_ordem_producao_id:selectedOp,p_quantidade_encontrada:f,p_quantidade_defeituosa:b,p_defeitos:defectsJson,p_localizacao_destino_id:location||null,p_acabamento:false,p_observacao:'Conferência realizada no PCP'})
   if(error)throw error
   const r=data as {quantidade_boa?:number;saldo_producao?:number}
   setMessage('Conferência registrada: '+Number(r.quantidade_boa||0)+' boas, '+b+' em refugo. Saldo de produção: '+Number(r.saldo_producao||0)+'.')
   setFound('');setBad('');setDefectText('');await load()
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar a produção.')}finally{setBusy(false)}
 }

 function selectTab(next:Tab){setTab(next);setError('');setMessage('')}

 const tabs:[Tab,string,LucideIcon][]=[['visao','Visão geral',Gauge],['pedidos','Pedidos / Demanda',ClipboardList],['ops','Ordens de Produção',Factory],['materiais','Materiais / MRP',Package],['producao','Apontar produção',Play],['programacao','Programação / Gantt',CalendarDays],['capacidade','Capacidade / Máquinas',Wrench],['qualidade','Qualidade / Defeitos',ShieldCheck]]

 return <main className="pcp-modern-page">
  <header className="pcp-modern-header">
   <div><button className="pcp-back-modern" onClick={()=>location.href='/erp-industrial'}><ArrowLeft size={18}/> Voltar ao Tablet</button><span>PCP • PLANEJAMENTO E CONTROLE DA PRODUÇÃO</span><h1>PCP Industrial</h1><p>Demanda → MRP → materiais → OP → programação → produção → estoque → qualidade.</p></div>
   <div className="pcp-modern-actions"><button className="pcp-help-btn" onClick={()=>setModal('ajuda')}><HelpCircle size={18}/> Como funciona?</button><div className="pcp-live-modern"><span/> DADOS SUPABASE</div><button className="pcp-refresh-modern" onClick={()=>void load()} disabled={busy}><RefreshCw size={18}/>{busy?'Atualizando…':'Atualizar'}</button></div>
  </header>
  {(message||error)&&<div className={error?'error':'notice'} style={{margin:'12px 0'}}>{error||message}</div>}

  <section className="pcp-quick-actions">
   <div><strong>O que você quer fazer?</strong><small>O PCP não é só consulta. Use uma ação para iniciar o trabalho.</small></div>
   <button onClick={openNewOP}><Plus size={18}/> Nova OP</button>
   <button onClick={()=>openProgram()}><CalendarDays size={18}/> Programar OP</button>
   <button onClick={()=>selectTab('producao')}><Play size={18}/> Apontar produção</button>
   <button onClick={()=>selectTab('materiais')}><Package size={18}/> Ver MRP</button>
  </section>

  <nav className="pcp-modern-tabs">{tabs.map(([id,label,I])=><button key={id} className={tab===id?'active':''} onClick={()=>selectTab(id)}><I size={16}/>{label}<span className="tab-help">?</span></button>)}</nav>

  {tab==='visao'&&<section>
   <div className="quality-kpis"><article><span>Pedidos</span><strong>{orders.length}</strong></article><article><span>OPs</span><strong>{ops.length}</strong></article><article><span>Programações</span><strong>{programs.length}</strong></article><article><span>Defeitos</span><strong>{defects.reduce((s,d)=>s+Number(d.quantidade||0),0)}</strong></article></div>
   <div className="pcp-flow">
    {(['pedidos','ops','materiais','programacao','producao','qualidade'] as Tab[]).map((id,i)=><button key={id} onClick={()=>selectTab(id)}><b>{i+1}</b><strong>{help[id].title}</strong><small>{help[id].what}</small><em>{help[id].action} →</em></button>)}
   </div>
   <div className="pcp-info"><AlertTriangle size={20}/><div><strong>Regra de uso</strong><p>Pedido é a demanda. OP é a autorização de fabricação. MRP verifica materiais. Programação define onde/quando fabricar. Apontamento registra o realizado. Qualidade trata desvios.</p></div></div>
  </section>}

  {tab==='pedidos'&&<section><Table title="Pedidos que alimentam o PCP" cols={['Pedido','Status','Total','OPs vinculadas']} rows={orders.filter(o=>!query||String(o.numero).includes(query)).map(o=>[o.numero,o.status,o.total,ops.filter(x=>x.pedido_venda_id===o.id).length])} search={query} setSearch={setQuery}/></section>}

  {tab==='ops'&&<section className="crud-list">
   <div className="crud-list-head"><div><strong>Ordens de Produção</strong><small>Cadastre, consulte e abra uma OP para continuar o processo.</small></div><div className="pcp-list-actions"><div className="module-search"><Search size={16}/><input placeholder="OP / status" value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="primary-v2" onClick={openNewOP}><Plus size={17}/> Nova OP</button></div></div>
   <div className="crud-table-wrap"><table><thead><tr><th>OP</th><th>Produto</th><th>Quantidade</th><th>Status</th><th>Prevista</th><th>Ações</th></tr></thead><tbody>{filteredOps.map(o=><tr key={o.id}><td><strong>{o.numero_op}</strong></td><td>{products.find(p=>p.id===o.produto_id)?.codigo||'—'} • {products.find(p=>p.id===o.produto_id)?.nome||'Produto não localizado'}</td><td>{o.quantidade}</td><td>{o.status}</td><td>{o.data_prevista||'—'}</td><td className="pcp-row-actions"><button className="secondary-v2" onClick={()=>{setSelectedOp(o.id);selectTab('materiais')}}>Materiais</button><button className="secondary-v2" onClick={()=>{setSelectedOp(o.id);selectTab('producao')}}>Apontar</button><button className="secondary-v2" onClick={()=>openProgram(o.id)}>Programar</button></td></tr>)}</tbody></table></div>
  </section>}

  {tab==='materiais'&&<section>
   <div className="erp-card" style={{padding:18,marginBottom:14}}><span className="v2-eyebrow">BOM / MRP</span><h2>Necessidade de materiais</h2><p className="pcp-help-text">Selecione uma OP. O sistema usa a ficha técnica ativa e compara a necessidade com o estoque atual.</p><select value={selectedOp} onChange={e=>setSelectedOp(e.target.value)}><option value="">Selecione a OP</option>{ops.map(o=><option key={o.id} value={o.id}>{o.numero_op} • {o.quantidade}</option>)}</select></div>
   <Table title={current?'Necessidade calculada para '+current.numero_op:'Selecione uma OP para calcular'} cols={['Componente','Necessidade','Estoque atual','Saldo após necessidade','Situação']} rows={materials.map(i=>{const need=Number(i.quantidade)*Number(current?.quantidade||0)*(1+Number(i.perda_percentual||0)/100);const stock=Number(i.product?.estoque_atual||0);return[i.product?.codigo+' • '+i.product?.nome,need,stock,stock-need,stock>=need?'ATENDE':'FALTA']})} search="" setSearch={()=>{}}/>
  </section>}

  {tab==='producao'&&<section className="pcp-production-modern">
   <section className="pcp-modern-panel"><div className="pcp-modern-panel-head"><div><span>CONFERÊNCIA DE PRODUÇÃO</span><h2>Entrada real do que saiu da fábrica</h2><p>Registre o resultado da OP. O lançamento usa a rotina transacional do ERP.</p></div><Play size={24}/></div>
    <div className="pcp-form-grid-modern">
     <label><span>OP</span><select value={selectedOp} onChange={e=>setSelectedOp(e.target.value)}><option value="">Selecione a OP</option>{ops.map(o=><option key={o.id} value={o.id}>{o.numero_op} • planejado {o.quantidade}</option>)}</select></label>
     <label><span>Quantidade Encontrada</span><input type="number" min="0" step="any" value={found} onChange={e=>setFound(e.target.value)} inputMode="decimal"/></label>
     <label><span>Quantidade Defeituosa</span><input type="number" min="0" step="any" value={bad} onChange={e=>setBad(e.target.value)} inputMode="decimal"/></label>
     <label><span>Localização de Destino</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="ID da localização"/></label>
     <label className="wide"><span>Detalhes de Qualidade</span><textarea rows={4} value={defectText} onChange={e=>setDefectText(e.target.value)} placeholder="Defeito:quantidade:observação — um por linha"/></label>
    </div>
    <div className="pcp-modern-form-footer"><span>Boa = encontrada − defeituosa.</span><button className="pcp-conferir" disabled={busy} onClick={()=>void confirmProduction()}><Play size={21}/>{busy?'Lançando…':'CONFERIR E LANÇAR'}</button></div>
   </section>
   <section className="pcp-modern-panel"><div className="pcp-modern-panel-head"><div><span>STATUS DA OP</span><h2>{current?current.numero_op:'Selecione uma OP'}</h2><p>{current?'Indicadores atuais das programações.':'Selecione uma OP para acompanhar.'}</p></div><Gauge size={24}/></div>
    <div className="pcp-stock-modern-grid"><article><ClipboardList/><small>Planejada</small><strong>{current?.quantidade??0}</strong><em>Plano da OP</em></article><article><Package/><small>Encontrada</small><strong>{productionFound}</strong><em>Apontada</em></article><article className="red"><XCircle/><small>Defeituosa</small><strong>{productionBad}</strong><em>Refugo</em></article><article className="green"><CheckCircle2/><small>Boa</small><strong>{productionGood}</strong><em>Quantidade boa</em></article></div>
   </section>
  </section>}

  {tab==='programacao'&&<section><div className="pcp-section-toolbar"><div><strong>Programação da fábrica</strong><small>Defina máquina, início, fim e quantidade para cada OP.</small></div><button className="primary-v2" onClick={()=>openProgram()}><Plus size={17}/> Programar OP</button></div><Table title="OPs programadas" cols={['OP','Máquina','Produto','Início','Fim','Qtd planejada','Status']} rows={schedule.map(x=>[x.op?.numero_op||'—',x.machine?.codigo||'—',x.product?.codigo||'—',new Date(x.inicio_planejado).toLocaleString('pt-BR'),new Date(x.fim_planejado).toLocaleString('pt-BR'),x.quantidade_planejada,x.status])} search={query} setSearch={setQuery}/></section>}

  {tab==='capacidade'&&<section><div className="pcp-capacity-grid">{machines.map(m=><article key={m.id}><div><span>{m.codigo}</span><strong>{m.nome}</strong><small>{m.tipo||'Máquina'} • {m.status}</small></div><b>{programs.filter(p=>p.maquina_id===m.id).length} programação(ões)</b><button onClick={()=>openProgram()}><CalendarDays size={16}/> Programar</button></article>)}</div></section>}

  {tab==='qualidade'&&<Table title="Defeitos enviados pela produção" cols={['Defeito','Quantidade','OP']} rows={defects.filter(d=>!query||d.defeito.toLowerCase().includes(query.toLowerCase())||d.ordem_producao_id.includes(query)).map(d=>[d.defeito,d.quantidade,d.ordem_producao_id])} search={query} setSearch={setQuery}/>}

  {modal==='ajuda'&&<Modal title="Como usar o PCP Industrial" onClose={()=>setModal(null)}><div className="pcp-help-modal">{tabs.map(([id,label,I])=><button key={id} onClick={()=>{selectTab(id);setModal(null)}}><I size={20}/><div><strong>{label}</strong><p>{help[id].what}</p><small>Como usar: {help[id].how}</small></div><span>→</span></button>)}</div><div className="pcp-info"><CheckCircle2 size={20}/><div><strong>Fluxo recomendado</strong><p>Pedido → OP → MRP → Programação → Apontamento → Estoque/Qualidade. Cada etapa tem uma finalidade; não é necessário preencher tudo de uma vez.</p></div></div></Modal>}

  {modal==='op'&&<Modal title="Nova Ordem de Produção" onClose={()=>setModal(null)}><form className="pcp-modal-form" onSubmit={createOP}><label>Produto<select value={opForm.produto_id} onChange={e=>setOpForm(v=>({...v,produto_id:e.target.value}))}><option value="">Selecione o produto</option>{products.map(p=><option key={p.id} value={p.id}>{p.codigo} • {p.nome}</option>)}</select></label><label>Quantidade<input type="number" min="0.0001" step="any" value={opForm.quantidade} onChange={e=>setOpForm(v=>({...v,quantidade:e.target.value}))}/></label><label>Data prevista<input type="date" value={opForm.data_prevista} onChange={e=>setOpForm(v=>({...v,data_prevista:e.target.value}))}/></label><label>Status<select value={opForm.status} onChange={e=>setOpForm(v=>({...v,status:e.target.value}))}><option>Planejada</option><option>Aguardando PCP</option><option>Em produção</option><option>Concluída</option></select></label><label className="wide">Observações<textarea value={opForm.observacoes} onChange={e=>setOpForm(v=>({...v,observacoes:e.target.value}))}/></label><div className="pcp-modal-footer"><button type="button" className="secondary-v2" onClick={()=>setModal(null)}>Cancelar</button><button className="primary-v2" disabled={busy}>{busy?'Criando…':'Criar OP'}</button></div></form></Modal>}

  {modal==='programacao'&&<Modal title="Programar Ordem de Produção" onClose={()=>setModal(null)}><form className="pcp-modal-form" onSubmit={createProgram}><label>Ordem de Produção<select value={progForm.ordem_producao_id} onChange={e=>setProgForm(v=>({...v,ordem_producao_id:e.target.value,quantidade:String(ops.find(o=>o.id===e.target.value)?.quantidade||'')}))}><option value="">Selecione a OP</option>{ops.map(o=><option key={o.id} value={o.id}>{o.numero_op} • {o.quantidade}</option>)}</select></label><label>Máquina<select value={progForm.maquina_id} onChange={e=>setProgForm(v=>({...v,maquina_id:e.target.value}))}><option value="">Selecione a máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{m.codigo} • {m.nome}</option>)}</select></label><label>Início<input type="datetime-local" value={progForm.inicio} onChange={e=>setProgForm(v=>({...v,inicio:e.target.value}))}/></label><label>Fim<input type="datetime-local" value={progForm.fim} onChange={e=>setProgForm(v=>({...v,fim:e.target.value}))}/></label><label>Quantidade planejada<input type="number" min="0.0001" step="any" value={progForm.quantidade} onChange={e=>setProgForm(v=>({...v,quantidade:e.target.value}))}/></label><label>Status<select value={progForm.status} onChange={e=>setProgForm(v=>({...v,status:e.target.value}))}><option>Programada</option><option>Em produção</option><option>Concluída</option><option>Cancelada</option></select></label><div className="pcp-modal-footer"><button type="button" className="secondary-v2" onClick={()=>setModal(null)}>Cancelar</button><button className="primary-v2" disabled={busy}>{busy?'Gravando…':'Gravar programação'}</button></div></form></Modal>}

  <style>{`
.pcp-modern-page{min-height:calc(100vh - 82px);background:#F4FBFD;color:#17333F;padding:28px 32px 44px;box-sizing:border-box;font-size:16px}.pcp-modern-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:22px}.pcp-modern-header>div:first-child>span{display:block;color:#2D8DB8;font-size:12px;font-weight:900;letter-spacing:.16em}.pcp-modern-header h1{font-size:36px;line-height:1.05;margin:8px 0 10px;letter-spacing:-.03em}.pcp-modern-header p{margin:0;color:#536B76;font-size:17px;line-height:1.55}.pcp-back-modern{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:#48616C;padding:0;margin-bottom:15px;font-size:16px;font-weight:800;cursor:pointer}.pcp-modern-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pcp-help-btn,.pcp-refresh-modern,.pcp-modern-actions button{min-height:46px;display:inline-flex;align-items:center;gap:8px;padding:0 15px;border:1px solid #B9D2DA;border-radius:10px;background:#FFFFFF;color:#17333F;font-size:15px;font-weight:850;cursor:pointer}.pcp-live-modern{height:46px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid #B9D2DA;border-radius:10px;background:#EAF7FA;color:#17333F;font-size:13px;font-weight:900}.pcp-live-modern span{width:9px;height:9px;border-radius:50%;background:#16845B;box-shadow:0 0 0 5px rgba(58,157,120,.12)}.pcp-quick-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#123B50;color:#fff;border-radius:14px;padding:15px 18px;margin-bottom:16px}.pcp-quick-actions>div{margin-right:auto;min-width:260px}.pcp-quick-actions strong,.pcp-quick-actions small{display:block}.pcp-quick-actions small{color:#C9E2E8;margin-top:3px}.pcp-quick-actions button{min-height:44px;border:1px solid #4FA8C9;border-radius:9px;background:#fff;color:#123B50;padding:0 14px;font-weight:900;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.pcp-modern-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:7px;background:#FFFFFF;border:1px solid #CFE1E7;border-radius:13px;margin-bottom:18px}.pcp-modern-tabs button{min-height:48px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:1px solid transparent;border-radius:9px;background:transparent;color:#48616C;font-size:15px;font-weight:800;cursor:pointer}.pcp-modern-tabs button.active{background:#123B50;border-color:#2d8db8;color:#fff}.tab-help{width:18px;height:18px;border-radius:50%;border:1px solid currentColor;display:inline-flex;align-items:center;justify-content:center;font-size:11px}.pcp-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.pcp-flow button{background:#fff;border:1px solid #D4E4EA;border-radius:14px;padding:18px;text-align:left;cursor:pointer;box-shadow:0 8px 20px rgba(20,60,80,.07)}.pcp-flow b{width:32px;height:32px;border-radius:50%;background:#123B50;color:#fff;display:inline-flex;align-items:center;justify-content:center}.pcp-flow strong,.pcp-flow small,.pcp-flow em{display:block}.pcp-flow strong{font-size:19px;margin-top:12px}.pcp-flow small{color:#536B76;line-height:1.5;margin-top:7px}.pcp-flow em{color:#2D8DB8;font-style:normal;font-weight:900;margin-top:10px}.pcp-info{display:flex;gap:12px;align-items:flex-start;background:#FFF8E7;border:1px solid #E9D28D;color:#5D4B1C;border-radius:12px;padding:15px;margin-top:16px}.pcp-info p{margin:4px 0 0;line-height:1.5}.pcp-section-toolbar,.pcp-list-actions{display:flex;align-items:center;gap:12px}.pcp-section-toolbar{justify-content:space-between;background:#fff;border:1px solid #D4E4EA;border-radius:12px;padding:14px 16px;margin-bottom:12px}.pcp-section-toolbar strong,.pcp-section-toolbar small{display:block}.pcp-section-toolbar small{color:#536B76;margin-top:4px}.pcp-list-actions{flex-wrap:wrap}.pcp-row-actions{display:flex;gap:6px;flex-wrap:wrap}.pcp-capacity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pcp-capacity-grid article{background:#fff;border:1px solid #D4E4EA;border-radius:14px;padding:18px}.pcp-capacity-grid span,.pcp-capacity-grid strong,.pcp-capacity-grid small{display:block}.pcp-capacity-grid span{color:#2D8DB8;font-weight:900}.pcp-capacity-grid strong{font-size:20px;margin:6px 0}.pcp-capacity-grid small{color:#536B76}.pcp-capacity-grid b{display:block;margin:14px 0}.pcp-capacity-grid button{min-height:40px;border:1px solid #B9D2DA;background:#F4FBFD;border-radius:8px;padding:0 12px;font-weight:800;cursor:pointer}.pcp-help-text{color:#536B76;line-height:1.5}.pcp-production-modern{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(380px,.8fr);gap:16px}.pcp-modern-panel{background:#FFFFFF;border:1px solid #D4E4EA;border-radius:14px;padding:22px;box-shadow:0 12px 28px rgba(0,0,0,.08)}.pcp-modern-panel-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:20px}.pcp-modern-panel-head>svg{color:#2D8DB8;flex:none}.pcp-modern-panel-head span{display:block;color:#2D8DB8;font-size:12px;font-weight:900;letter-spacing:.14em}.pcp-modern-panel-head h2{font-size:24px;margin:5px 0;color:#17333F}.pcp-modern-panel-head p{margin:0;color:#536B76;font-size:15px;line-height:1.5}.pcp-form-grid-modern,.pcp-modal-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pcp-form-grid-modern label,.pcp-modal-form label{display:flex;flex-direction:column;gap:8px;color:#17333F;font-size:16px;font-weight:850}.pcp-form-grid-modern label.wide,.pcp-modal-form label.wide{grid-column:1/-1}.pcp-form-grid-modern input,.pcp-form-grid-modern select,.pcp-form-grid-modern textarea,.pcp-modal-form input,.pcp-modal-form select,.pcp-modal-form textarea{width:100%;box-sizing:border-box;min-height:50px;border:1px solid #B9D2DA;border-radius:9px;background:#F4FBFD;color:#17333F;padding:11px 13px;font-size:16px;outline:none}.pcp-form-grid-modern textarea,.pcp-modal-form textarea{min-height:110px;resize:vertical}.pcp-modern-form-footer,.pcp-modal-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px;padding-top:18px;border-top:1px solid #D4E4EA}.pcp-modern-form-footer span{color:#536B76;font-size:14px}.pcp-conferir,.primary-v2{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;border:1px solid #2D8DB8;border-radius:9px;background:#2D8DB8;color:#fff;font-size:16px;font-weight:900;cursor:pointer}.secondary-v2{min-height:40px;padding:0 11px;border:1px solid #B9D2DA;border-radius:8px;background:#fff;color:#17333F;font-weight:800;cursor:pointer}.pcp-stock-modern-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pcp-stock-modern-grid article{position:relative;min-height:130px;padding:16px;border:1px solid #CFE1E7;border-radius:12px;background:#F7FBFC}.pcp-stock-modern-grid article>svg{position:absolute;right:13px;top:13px;width:40px;height:40px;padding:8px;box-sizing:border-box;border-radius:10px;background:#123B50;color:#48b7c7}.pcp-stock-modern-grid small,.pcp-stock-modern-grid strong,.pcp-stock-modern-grid em{display:block}.pcp-stock-modern-grid small{color:#536B76}.pcp-stock-modern-grid strong{font-size:31px;margin-top:22px;line-height:1}.pcp-stock-modern-grid em{margin-top:7px;color:#607985;font-size:13px;font-style:normal}.pcp-stock-modern-grid article.red{border-color:#E1A4AA}.pcp-stock-modern-grid article.red>svg{background:#FDECEC;color:#C74646}.pcp-stock-modern-grid article.green{border-color:#9ED5BF}.pcp-stock-modern-grid article.green>svg{background:#E8F7F1;color:#16845B}.pcp-modal-backdrop{position:fixed;inset:0;background:rgba(8,25,34,.58);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}.pcp-modal{width:min(900px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.3);padding:22px}.pcp-modal-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.pcp-modal-head h2{margin:0;font-size:25px}.pcp-modal-close{border:0;background:#F1F5F7;border-radius:8px;width:40px;height:40px;cursor:pointer}.pcp-help-modal{display:grid;gap:8px}.pcp-help-modal button{display:grid;grid-template-columns:28px 1fr 20px;gap:12px;align-items:start;text-align:left;border:1px solid #D4E4EA;background:#F8FBFC;border-radius:10px;padding:13px;cursor:pointer}.pcp-help-modal button strong{font-size:16px}.pcp-help-modal button p{margin:4px 0;color:#536B76;line-height:1.4}.pcp-help-modal button small{color:#607985}.pcp-help-modal button>span{font-size:22px;color:#2D8DB8}.quality-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.quality-kpis article{background:#fff;border:1px solid #D4E4EA;border-radius:12px;padding:16px}.quality-kpis span{color:#536B76}.quality-kpis strong{display:block;font-size:30px;margin-top:8px}@media(max-width:1050px){.pcp-production-modern{grid-template-columns:1fr}.pcp-flow{grid-template-columns:repeat(2,minmax(0,1fr))}.pcp-capacity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.pcp-modern-page{padding:16px}.pcp-modern-header,.pcp-modern-actions,.pcp-section-toolbar,.pcp-modern-form-footer{flex-direction:column;align-items:stretch}.pcp-quick-actions{align-items:stretch}.pcp-quick-actions>div{margin-right:0}.pcp-modern-tabs{overflow:auto;flex-wrap:nowrap}.pcp-modern-tabs button{white-space:nowrap}.pcp-form-grid-modern,.pcp-modal-form{grid-template-columns:1fr}.pcp-form-grid-modern label.wide,.pcp-modal-form label.wide{grid-column:auto}.pcp-stock-modern-grid,.quality-kpis,.pcp-flow,.pcp-capacity-grid{grid-template-columns:1fr}.pcp-conferir,.primary-v2{width:100%}.pcp-list-actions{align-items:stretch;flex-direction:column}}
`}</style>
 </main>
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 return <div className="pcp-modal-backdrop" role="dialog" aria-modal="true"><div className="pcp-modal"><div className="pcp-modal-head"><h2>{title}</h2><button className="pcp-modal-close" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>{children}</div></div>
}

function Table({title,cols,rows,search,setSearch}:{title:string;cols:string[];rows:(string|number)[][];search:string;setSearch:(v:string)=>void}){
 return <section className="crud-list"><div className="crud-list-head"><div><strong>{title}</strong><small>{rows.length} registros</small></div><div className="module-search"><Search size={16}/><input placeholder="Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="crud-table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{String(v??'—')}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={cols.length} className="crud-empty">Nenhum registro encontrado.</td></tr>}</tbody></table></div></section>
}
