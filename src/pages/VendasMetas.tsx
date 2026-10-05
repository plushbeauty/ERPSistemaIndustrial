import { useEffect, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Func={id:string;nome:string;matricula:string|null}
type Meta={id:string;competencia:string;meta_faturamento:number;meta_pedidos:number}
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n)

export default function VendasMetas(){
 const [empresa,setEmpresa]=useState('')
 const [func,setFunc]=useState<Func[]>([])
 const [meta,setMeta]=useState<Meta|null>(null)
 const [mes,setMes]=useState(new Date().toISOString().slice(0,7))
 const [valor,setValor]=useState('0')
 const [pedidos,setPedidos]=useState('0')
 const [realizado,setRealizado]=useState(0)
 const [msg,setMsg]=useState('')

 const load=async()=>{
  const e=await supabase.rpc('erp_current_empresa_id')
  if(e.error||!e.data){setMsg(e.error?.message||'Empresa não identificada.');return}
  const id=String(e.data)
  setEmpresa(id)
  const nextMonth=new Date(mes+'-01T00:00:00')
  nextMonth.setMonth(nextMonth.getMonth()+1)
  const [f,m,p]=await Promise.all([
   supabase.from('erp_funcionarios').select('id,nome,matricula').eq('empresa_id',id).eq('status','ATIVO').order('nome'),
   supabase.from('erp_vendas_metas').select('id,competencia,meta_faturamento,meta_pedidos').eq('empresa_id',id).eq('competencia',mes+'-01').maybeSingle(),
   supabase.from('erp_pedidos_venda').select('total,status').eq('empresa_id',id).gte('data_entrega_prometida',mes+'-01').lt('data_entrega_prometida',nextMonth.toISOString().slice(0,10))
  ])
  if(f.error||m.error||p.error){setMsg(f.error?.message||m.error?.message||p.error?.message||'Falha ao carregar metas.');return}
  setFunc((f.data??[]) as Func[])
  setMeta((m.data??null) as Meta|null)
  setValor(String(Number(m.data?.meta_faturamento??0)))
  setPedidos(String(Number(m.data?.meta_pedidos??0)))
  setRealizado((p.data??[]).filter(x=>x.status!=='cancelado').reduce((s,x)=>s+Number(x.total??0),0))
 }
 useEffect(()=>{void load()},[mes])

 const save=async()=>{
  const r=await supabase.from('erp_vendas_metas').upsert({empresa_id:empresa,competencia:mes+'-01',meta_faturamento:Number(valor)||0,meta_pedidos:Number(pedidos)||0},{onConflict:'empresa_id,competencia'})
  setMsg(r.error?r.error.message:'Meta gravada com sucesso.')
  if(!r.error)void load()
 }

 const pct=Math.min((realizado/(Number(valor)||1))*100,999)
 return <VendasLayout title='Metas comerciais' subtitle='Metas, atingimento e desempenho da equipe' onRefresh={()=>void load()}>
  <main className='sales-workspace sales-detail'>
   <section className='sales-orders-card'>
    <div className='sales-list-toolbar'>
     <div style={{flex:1}}>
      <span className='sales-eyebrow'>COMERCIAL / METAS</span>
      <h1 style={{margin:'6px 0 3px',fontSize:22,fontWeight:650,color:'#17333f'}}>Controle de metas da equipe comercial</h1>
      <p style={{margin:0,fontSize:11,color:'#71838a'}}>Defina competência, faturamento e quantidade de pedidos.</p>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#526a73'}}>Competência<input type='month' value={mes} onChange={e=>setMes(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:4,padding:'0 7px',fontSize:11}}/></label>
      <button type='button' className='sales-button sales-button--secondary' onClick={()=>{setValor('0');setPedidos('0');setMsg('Nova meta pronta para preenchimento.')}}><Plus size={13}/>Nova meta</button>
      <button type='button' className='sales-button sales-button--primary' onClick={()=>void save()}><Save size={13}/>Gravar</button>
     </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,padding:'0 14px 14px'}}>
     <label style={{display:'grid',gap:4,fontSize:10,fontWeight:600,color:'#526a73'}}>Meta de faturamento<input type='number' min='0' step='0.01' value={valor} onChange={e=>setValor(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:4,padding:'0 8px',fontSize:11}}/></label>
     <label style={{display:'grid',gap:4,fontSize:10,fontWeight:600,color:'#526a73'}}>Meta de pedidos<input type='number' min='0' step='1' value={pedidos} onChange={e=>setPedidos(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:4,padding:'0 8px',fontSize:11}}/></label>
     <div style={{border:'1px solid #dfe8ea',background:'#f7f9fa',padding:'7px 10px'}}><span style={{fontSize:10,color:'#71838a'}}>Realizado</span><strong style={{display:'block',marginTop:3,fontSize:18,color:'#123b50'}}>{brl(realizado)}</strong></div>
    </div>
    {msg&&<div style={{margin:'0 14px 12px',padding:'8px 10px',border:'1px solid #cce1e6',background:'#f1f8fa',color:'#315c69',fontSize:10}}>{msg}</div>}
    <div className='sales-table-scroll'>
     <table className='sales-orders-table'>
      <thead><tr><th>Vendedor</th><th>Meta de faturamento</th><th>Realizado</th><th>Atingimento</th></tr></thead>
      <tbody>
       {func.map(f=><tr key={f.id}><td className='sales-client-name'>{f.nome}</td><td>{brl(Number(valor)||0)}</td><td>{brl(realizado)}</td><td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{height:6,flex:1,background:'#e5edef'}}><div style={{height:'100%',width:String(Math.min(pct,100))+'%',background:'#2D8DB8'}}/></div><strong style={{fontSize:10}}>{pct.toFixed(0)}%</strong></div></td></tr>)}
       {!func.length&&<tr><td colSpan={4} className='sales-empty-state'>Nenhum vendedor ativo cadastrado.</td></tr>}
      </tbody>
     </table>
    </div>
   </section>
  </main>
 </VendasLayout>
}
