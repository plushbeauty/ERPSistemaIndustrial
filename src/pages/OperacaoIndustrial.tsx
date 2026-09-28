/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-064
 * Alterações: Usar window.location no retorno ao Tablet para evitar colisão com o estado location.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-055
 * Alterações: Adicionar o ícone X usado pelo diálogo de ajuda.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, HelpCircle, Play, RefreshCw, Search, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type OP={id:string;numero_op:string;produto_id:string|null;quantidade:number;status:string;data_prevista:string|null}
type Product={id:string;codigo:string;nome:string}
type Defect={id:string;ordem_producao_id:string;defeito:string;quantidade:number;created_at:string}

export default function OperacaoIndustrial(){
 const [ops,setOps]=useState<OP[]>([]),[products,setProducts]=useState<Product[]>([]),[defects,setDefects]=useState<Defect[]>([])
 const [selectedOp,setSelectedOp]=useState(''),[found,setFound]=useState(''),[bad,setBad]=useState(''),[location,setLocation]=useState(''),[defectText,setDefectText]=useState(''),[query,setQuery]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[help,setHelp]=useState(false)
 const load=async()=>{setBusy(true);setError('');try{const [o,p,d]=await Promise.all([
  supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status,data_prevista').order('criado_em',{ascending:false}).limit(500),
  supabase.from('erp_produtos').select('id,codigo,nome').eq('ativo',true).order('codigo').limit(2000),
  supabase.from('erp_producao_defeitos').select('id,ordem_producao_id,defeito,quantidade,created_at').order('created_at',{ascending:false}).limit(500)
 ]);for(const x of[o,p,d])if(x.error)throw x.error;setOps((o.data||[]) as OP[]);setProducts((p.data||[]) as Product[]);setDefects((d.data||[]) as Defect[])}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar apontamento.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const current=ops.find(x=>x.id===selectedOp)
 const filtered=ops.filter(x=>!query||x.numero_op.toLowerCase().includes(query.toLowerCase())||String(x.status).toLowerCase().includes(query.toLowerCase()))
 const productName=(id:string|null)=>products.find(x=>x.id===id)?.codigo||'—'
 const launch=async(e:FormEvent)=>{e.preventDefault();const f=Number(found),b=Number(bad);if(!selectedOp){setError('Selecione a OP liberada para apontamento.');return}if(f<0||b<0||b>f){setError('Quantidade encontrada/defeituosa inválida.');return}setBusy(true);setError('');setMessage('');try{
  const defs=defectText.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const p=x.split(':');return{defeito:p[0].trim(),quantidade:Number(p[1]||0),observacao:p.slice(2).join(':').trim()||null}}).filter(x=>x.defeito&&x.quantidade>0)
  const {data,error}=await supabase.rpc('erp_registrar_conferencia_producao',{p_ordem_producao_id:selectedOp,p_quantidade_encontrada:f,p_quantidade_defeituosa:b,p_defeitos:defs,p_localizacao_destino_id:location||null,p_acabamento:false,p_observacao:'Apontamento realizado no chão de fábrica'})
  if(error)throw error
  const r=data as {quantidade_boa?:number;saldo_producao?:number}
  setMessage('Apontamento gravado: '+Number(r.quantidade_boa||0)+' peças boas, '+b+' defeituosas.')
  setFound('');setBad('');setLocation('');setDefectText('');await load()
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível gravar o apontamento.')}finally{setBusy(false)}}
 return <main className="pcp-page" style={{padding:24,maxWidth:1600,margin:'0 auto'}}>
  <header className="pcp-toolbar" style={{alignItems:'flex-start'}}><div><button className="secondary-v2" onClick={()=>window.location.href='/erp-industrial'}><ArrowLeft size={17}/> Voltar</button><span className="v2-eyebrow" style={{display:'block',marginTop:12}}>PRODUÇÃO • CHÃO DE FÁBRICA</span><h1 style={{margin:'6px 0'}}>Apontamento de Produção</h1><p style={{margin:0,color:'#64777d',maxWidth:900}}>Registre o que realmente aconteceu na OP: quantidade produzida, refugo, defeitos e destino. <b>Ordens de Produção são cadastradas e planejadas no PCP.</b></p></div><div style={{display:'flex',gap:8}}><button className="secondary-v2" onClick={()=>setHelp(true)}><HelpCircle size={17}/> Para que serve?</button><button className="menu-green" onClick={()=>void load()} disabled={busy}><RefreshCw size={17}/> Atualizar</button></div></header>
  {(message||error)&&<div className={error?'error':'notice'} style={{margin:'12px 0'}}>{error||message}</div>}
  <section style={{display:'grid',gridTemplateColumns:'minmax(330px,.8fr) minmax(0,1.2fr)',gap:16,alignItems:'start'}}>
   <form onSubmit={launch} className="erp-card" style={{padding:20}}><span className="v2-eyebrow">APONTAMENTO REAL</span><h2 style={{margin:'6px 0 5px'}}>Lançar produção</h2><p style={{color:'#64777d',lineHeight:1.5}}>A OP precisa existir no PCP antes de ser apontada aqui.</p>
    <label style={label}>OP<select value={selectedOp} onChange={e=>setSelectedOp(e.target.value)} style={input}><option value="">Selecione a OP</option>{ops.map(o=><option key={o.id} value={o.id}>{o.numero_op} • {productName(o.produto_id)} • planejado {o.quantidade}</option>)}</select></label>
    <div style={grid}><label style={label}>Quantidade encontrada<input type="number" min="0" step="any" value={found} onChange={e=>setFound(e.target.value)} style={input}/></label><label style={label}>Quantidade defeituosa<input type="number" min="0" step="any" value={bad} onChange={e=>setBad(e.target.value)} style={input}/></label></div>
    <label style={label}>Localização de destino<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Localização do estoque de destino" style={input}/></label>
    <label style={label}>Defeitos — um por linha<textarea rows={5} value={defectText} onChange={e=>setDefectText(e.target.value)} placeholder="Ex.: Rebarba:10:linha de prensa 2" style={{...input,height:120,padding:10}}/></label>
    <button className="menu-green" disabled={busy||!selectedOp} style={{width:'100%',minHeight:48}}><Play size={18}/>{busy?'Gravando…':'CONFERIR E APONTAR'}</button>
   </form>
   <section><div className="quality-kpis"><article><span>OP selecionada</span><strong>{current?.numero_op||'—'}</strong></article><article><span>Planejada</span><strong>{current?.quantidade||0}</strong></article><article><span>Defeitos recentes</span><strong>{selectedOp?defects.filter(x=>x.ordem_producao_id===selectedOp).reduce((s,x)=>s+Number(x.quantidade||0),0):0}</strong></article><article><span>Status</span><strong>{current?.status||'—'}</strong></article></div>
    <section className="erp-card" style={{padding:18,marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><div><span className="v2-eyebrow">OPs DISPONÍVEIS</span><h2 style={{margin:'5px 0'}}>Selecione uma ordem para apontar</h2></div><div style={{display:'flex',alignItems:'center',gap:6}}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="OP / status" style={{...input,maxWidth:220}}/></div></div><div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['OP','Produto','Planejada','Status','Ação'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td style={td}><b>{o.numero_op}</b></td><td style={td}>{productName(o.produto_id)}</td><td style={td}>{o.quantidade}</td><td style={td}>{o.status}</td><td style={td}><button type="button" className="secondary-v2" onClick={()=>setSelectedOp(o.id)}>Apontar</button></td></tr>)}{!filtered.length&&<tr><td colSpan={5} style={{padding:30,textAlign:'center',color:'#64777d'}}>Nenhuma OP encontrada. Cadastre/libere a OP no PCP.</td></tr>}</tbody></table></div></section></section>
  </section>
  {help&&<div style={backdrop}><div style={modal}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2>Para que serve o Apontamento?</h2><button className="secondary-v2" onClick={()=>setHelp(false)}><X size={17}/></button></div><p>Esta tela é do <b>chão de fábrica</b>. Ela não cadastra OP, não faz FMEA e não administra estoque.</p><ol style={{lineHeight:1.8}}><li>O PCP cria/libera a Ordem de Produção.</li><li>O operador seleciona a OP aqui.</li><li>Informa quantidade produzida e defeituosa.</li><li>Registra defeitos e destino.</li><li>O lançamento é enviado à operação transacional do ERP.</li><li>Qualidade recebe os defeitos/RPNC para tratamento.</li></ol><div className="pcp-info"><AlertTriangle size={18}/><span><b>Regra:</b> se você precisa criar uma OP, volte ao <b>PCP</b>. Se precisa tratar FMEA, RPNC ou competências, vá para <b>Qualidade / SGQ</b>.</span></div></div></div>}
 </main>
}
const label:React.CSSProperties={display:'grid',gap:7,marginBottom:14,fontWeight:800,color:'#243746'}
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',minHeight:46,border:'1px solid #cbd5e1',borderRadius:9,padding:'0 10px',fontSize:15,background:'#fff'}
const grid:React.CSSProperties={display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}
const th:React.CSSProperties={textAlign:'left',padding:10,background:'#f5f8f9',borderBottom:'1px solid #dfe7e4'}
const td:React.CSSProperties={padding:10,borderBottom:'1px solid #edf1f2'}
const backdrop:React.CSSProperties={position:'fixed',inset:0,background:'rgba(15,23,42,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}
const modal:React.CSSProperties={background:'#fff',borderRadius:16,padding:24,width:'min(680px,100%)',boxShadow:'0 25px 80px rgba(0,0,0,.25)'}
