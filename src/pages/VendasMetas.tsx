import { useEffect, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n)

export default function VendasMetas(){
 const [empresa,setEmpresa]=useState('')
 const [mes,setMes]=useState(new Date().toISOString().slice(0,7))
 const [valor,setValor]=useState('0')
 const [pedidos,setPedidos]=useState('0')
 const [realizado,setRealizado]=useState(0)
 const [pedidosRealizados,setPedidosRealizados]=useState(0)
 const [msg,setMsg]=useState('')

 const load=async()=>{
  const e=await supabase.rpc('erp_current_empresa_id')
  if(e.error||!e.data){setMsg(e.error?.message||'Empresa não identificada.');return}
  const id=String(e.data)
  setEmpresa(id)
  const nextMonth=new Date(mes+'-01T00:00:00')
  nextMonth.setMonth(nextMonth.getMonth()+1)
  const [m,p]=await Promise.all([
   supabase.from('erp_vendas_metas').select('id,competencia,meta_faturamento,meta_pedidos').eq('empresa_id',id).eq('competencia',mes+'-01').maybeSingle(),
   supabase.from('erp_pedidos_venda').select('total,status').eq('empresa_id',id).gte('data_entrega_prometida',mes+'-01').lt('data_entrega_prometida',nextMonth.toISOString().slice(0,10))
  ])
  if(m.error||p.error){setMsg(m.error?.message||p.error?.message||'Falha ao carregar metas.');return}
  setValor(String(Number(m.data?.meta_faturamento??0)))
  setPedidos(String(Number(m.data?.meta_pedidos??0)))
  const validOrders=(p.data??[]).filter(x=>!String(x.status??'').toLowerCase().includes('cancel'))
  setRealizado(validOrders.reduce((sum,row)=>sum+Number(row.total??0),0))
  setPedidosRealizados(validOrders.length)
 }
 useEffect(()=>{void load()},[mes])

 const save=async()=>{
  const r=await supabase.from('erp_vendas_metas').upsert({empresa_id:empresa,competencia:mes+'-01',meta_faturamento:Number(valor)||0,meta_pedidos:Number(pedidos)||0},{onConflict:'empresa_id,competencia'})
  setMsg(r.error?r.error.message:'Meta gravada com sucesso.')
  if(!r.error)void load()
 }

 const pct=Number(valor)>0?Math.min((realizado/Number(valor))*100,999):0
 const pctPedidos=Number(pedidos)>0?Math.min((pedidosRealizados/Number(pedidos))*100,999):0
 const metrics=[
  {label:'Faturamento',actual:realizado,target:Number(valor)||0,actualLabel:brl(realizado),targetLabel:brl(Number(valor)||0),percent:pct},
  {label:'Quantidade de pedidos',actual:pedidosRealizados,target:Number(pedidos)||0,actualLabel:String(pedidosRealizados),targetLabel:String(Number(pedidos)||0),percent:pctPedidos},
 ]
 return <VendasLayout title='Metas comerciais' subtitle='Duas metas acompanhadas: faturamento e quantidade de pedidos' onRefresh={()=>void load()} showStatusCards={false}>
  <main className='sales-workspace sales-detail'>
   <section className='sales-orders-card'>
    <div className='sales-list-toolbar'>
     <div style={{flex:1}}>
      <span className='sales-eyebrow'>COMERCIAL / METAS</span>
      <h2 style={{margin:'4px 0',fontSize:15,fontWeight:650,color:'#17333f'}}>Metas da empresa</h2>
      <p style={{margin:0,fontSize:10,color:'#71838a'}}>Os valores realizados são consolidados da empresa; esta tela não atribui vendas individuais sem vínculo confirmado ao vendedor.</p>
     </div>
     <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#526a73'}}>Competência<input type='month' value={mes} onChange={e=>setMes(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:2,padding:'0 7px',fontSize:11}}/></label>
      <button type='button' className='sales-button sales-button--secondary' onClick={()=>{setValor('0');setPedidos('0');setMsg('Preencha as duas metas e grave para salvar.')}}><Plus size={13}/>Nova meta</button>
      <button type='button' className='sales-button sales-button--primary' onClick={()=>void save()}><Save size={13}/>Gravar</button>
     </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8,padding:'0 12px 12px'}}>
     <label style={{display:'grid',gap:2,fontSize:9,fontWeight:600,textTransform:'uppercase',color:'#526a73'}}>Meta de faturamento<input type='number' min='0' step='0.01' value={valor} onChange={e=>setValor(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:2,padding:'0 8px',fontSize:11}}/></label>
     <label style={{display:'grid',gap:2,fontSize:9,fontWeight:600,textTransform:'uppercase',color:'#526a73'}}>Meta de pedidos<input type='number' min='0' step='1' value={pedidos} onChange={e=>setPedidos(e.target.value)} style={{height:30,border:'1px solid #d3e0e3',borderRadius:2,padding:'0 8px',fontSize:11}}/></label>
    </div>
    {msg&&<div role='status' style={{margin:'0 12px 10px',padding:'7px 9px',border:'1px solid #cce1e6',background:'#f1f8fa',color:'#315c69',fontSize:10}}>{msg}</div>}
    <div style={{padding:'0 12px 12px'}}>
     <div style={{marginBottom:8,fontSize:10,fontWeight:650,color:'#123b50'}}>Atingimento no período</div>
     <div style={{display:'grid',gap:12}}>
      {metrics.map(metric=><div key={metric.label} style={{display:'grid',gap:4}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,fontSize:10}}><strong style={{color:'#123b50'}}>{metric.label}</strong><span style={{color:'#526a73'}}>{metric.actualLabel} de {metric.targetLabel} • {metric.percent.toFixed(0)}%</span></div>
       <div role='img' aria-label={metric.label+': '+metric.percent.toFixed(0)+' por cento da meta'} style={{height:12,background:'#e5edef',border:'1px solid #d3e0e3',overflow:'hidden'}}><div style={{height:'100%',width:String(Math.min(metric.percent,100))+'%',background:metric.percent>=100?'#3A9D78':'#2D8DB8',transition:'width 180ms ease'}}/></div>
      </div>)}
     </div>
    </div>
   </section>
  </main>
 </VendasLayout>
}