import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, Factory, Gauge, ListChecks, TrendingDown } from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = { onNavigate: (route: string) => void }
type ProductionPoint = { date: string; boa: number; refugo: number; refugoPercent: number }
type OrderStatusPoint = { status: string; quantidade: number }
type LatestOP = { id: string; numero_op: number | string; produto: string; status: string; created_at: string | null }
type Metrics = { ops:number; completedOps:number; produced:number; scrap:number; rpnc:number }

const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0
const fmt = (v:number) => new Intl.NumberFormat('pt-BR').format(v)

const statusLabel = (status:string) => {
  const v = status.toLowerCase()
  if (v.includes('concl')) return 'Concluída'
  if (v.includes('cancel')) return 'Cancelada'
  if (v.includes('exec')) return 'Em execução'
  if (v.includes('planej')) return 'Planejada'
  return status || 'Sem status'
}

export default function IndustrialCommandDashboard({ onNavigate }: Props) {
  const [metrics,setMetrics] = useState<Metrics>({ops:0,completedOps:0,produced:0,scrap:0,rpnc:0})
  const [production,setProduction] = useState<ProductionPoint[]>([])
  const [orderStatus,setOrderStatus] = useState<OrderStatusPoint[]>([])
  const [latestOps,setLatestOps] = useState<LatestOP[]>([])
  const [usuarioNome,setUsuarioNome] = useState('Usuário')
  const [empresaNome,setEmpresaNome] = useState('Empresa industrial')
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [clock,setClock] = useState(new Date())
  const [tabletOpen,setTabletOpen] = useState(false)

  useEffect(() => {
    const id=window.setInterval(()=>setClock(new Date()),1000)
    return ()=>window.clearInterval(id)
  },[])

  useEffect(() => {
    let alive=true
    async function load(){
      setLoading(true); setError('')
      try{
        const {data:auth,error:authError}=await supabase.auth.getUser()
        if(authError) throw authError
        if(!auth.user) throw new Error('Sessão não encontrada.')
        const {data:profile,error:profileError}=await supabase.from('erp_usuarios')
          .select('nome,empresa_id,is_master,perfil,nivel_admin').eq('auth_user_id',auth.user.id)
          .eq('ativo',true).is('deleted_at',null).maybeSingle()
        if(profileError) throw profileError
        const master=profile?.is_master===true && Number(profile?.nivel_admin??0)===100 &&
          String(profile?.perfil??'').toUpperCase()==='MASTER' && profile?.empresa_id===null
        if(!master && !profile?.empresa_id) throw new Error('Perfil empresarial não encontrado.')
        const empresaId=profile?.empresa_id??null
        if(profile?.nome) setUsuarioNome(String(profile.nome))
        if(empresaId){
          const company=await supabase.from('erp_empresas').select('nome_fantasia,razao_social')
            .eq('id',empresaId).eq('ativo',true).maybeSingle()
          if(company.error) throw company.error
          setEmpresaNome(String(company.data?.nome_fantasia??company.data?.razao_social??'Empresa industrial'))
        } else if(master) setEmpresaNome('Visão Master do Ecossistema')

        const count=async(table:string,excluded:string[]=[])=>{
          let q=supabase.from(table).select('*',{count:'exact',head:true})
          if(!master) q=q.eq('empresa_id',empresaId as string)
          if(excluded.length) q=q.not('status','in',`(${excluded.join(',')})`)
          const r=await q
          if(r.error) throw r.error
          return r.count??0
        }

        const prodQuery=master
          ? supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').limit(5000)
          : supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').eq('empresa_id',empresaId as string).limit(5000)
        const opStatusQuery=master
          ? supabase.from('erp_ordens_producao').select('status').limit(5000)
          : supabase.from('erp_ordens_producao').select('status').eq('empresa_id',empresaId as string).limit(5000)

        const [ops,completedOps,rpnc,prodRows,opStatusRows]=await Promise.all([
          count('erp_ordens_producao',['concluida','concluído','cancelada','cancelado']),
          count('erp_ordens_producao',['aberta','aberto','planejada','planejado','em execução','em_execucao','em andamento','em_andamento','cancelada','cancelado']),
          count('erp_rpnc',['encerrada','fechada','concluida','concluído']),
          prodQuery,opStatusQuery
        ])
        if(prodRows.error) throw prodRows.error
        if(opStatusRows.error) throw opStatusRows.error

        const byDay=new Map<string,ProductionPoint>()
        let produced=0,scrap=0
        for(const row of prodRows.data??[]){
          produced+=num(row.quantidade_boa); scrap+=num(row.quantidade_defeituosa)
          const raw=String(row.created_at??''); const key=raw.slice(0,10)
          if(!key) continue
          const p=byDay.get(key)??{date:key.slice(5).split('-').reverse().join('/'),boa:0,refugo:0,refugoPercent:0}
          p.boa+=num(row.quantidade_boa); p.refugo+=num(row.quantidade_defeituosa); p.refugoPercent=p.boa+p.refugo?Number(((p.refugo/(p.boa+p.refugo))*100).toFixed(2)):0; byDay.set(key,p)
        }
        const statusMap=new Map<string,number>()
        for(const row of opStatusRows.data??[]){const k=statusLabel(String(row.status??''));statusMap.set(k,(statusMap.get(k)??0)+1)}

        const opQuery=master
          ? supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status,created_at').order('created_at',{ascending:false}).limit(8)
          : supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status,created_at').eq('empresa_id',empresaId as string).order('created_at',{ascending:false}).limit(8)
        const {data:opRows,error:opError}=await opQuery
        if(opError) throw opError
        const ids=[...new Set((opRows??[]).map(r=>String(r.produto_id??'')).filter(Boolean))]
        const {data:products,error:productsError}=ids.length
          ? await supabase.from('erp_produtos').select('id,codigo,nome').in('id',ids)
          : {data:[],error:null}
        if(productsError) throw productsError
        const map=new Map((products??[]).map(r=>[String(r.id),String(r.codigo??r.nome??'Produto')]))
        if(!alive) return
        setMetrics({ops,completedOps,produced,scrap,rpnc})
        setProduction([...byDay.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-14).map(([,v])=>v))
        setOrderStatus([...statusMap.entries()].sort((a,b)=>b[1]-a[1]).map(([status,quantidade])=>({status,quantidade})))
        setLatestOps((opRows??[]).map(r=>({id:String(r.id),numero_op:r.numero_op,produto:map.get(String(r.produto_id??''))??'Produto não informado',status:String(r.status??'—'),created_at:r.created_at?String(r.created_at):null})))
      }catch(e){if(alive)setError(e instanceof Error?e.message:'Não foi possível carregar os indicadores.')}
      finally{if(alive)setLoading(false)}
    }
    void load()
    return ()=>{alive=false}
  },[])

  const total=metrics.produced+metrics.scrap
  const efficiency=total?(metrics.produced/total)*100:0
  const scrapRate=total?(metrics.scrap/total)*100:0
  const cards=[
    {label:'ORDENS ATIVAS',value:fmt(metrics.ops),hint:'OPs não concluídas',icon:Factory,route:'/pcp'},
    {label:'OPs CONCLUÍDAS',value:fmt(metrics.completedOps),hint:'Ordens encerradas',icon:CheckCircle2,route:'/pcp'},
    {label:'ALERTAS CRÍTICOS',value:fmt(metrics.rpnc),hint:'RPN / RPNC em aberto',icon:AlertTriangle,route:'/qualidade'},
    {label:'EFICIÊNCIA',value:total?efficiency.toFixed(1).replace('.',',')+'%':'—',hint:'Peças boas ÷ total',icon:Gauge,route:'/operacao-industrial'}
  ]

  return <>
    <style>{`
      .icd-shell{min-height:calc(100vh - 78px);background:#f1f5f9;color:#0f172a}
      .icd-main{width:100%;max-width:1600px;margin:0 auto;padding:24px 30px 40px}
      .icd-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}
      .icd-heading h1{margin:3px 0 4px;font-size:29px;font-weight:950;letter-spacing:-.02em}
      .icd-heading p{margin:0;color:#475569;font-weight:600}
      .icd-heading-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .icd-online{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:11px;font-weight:950}
      .icd-dot{width:7px;height:7px;border-radius:50%;background:#16a34a}
      .icd-date{font-size:12px;color:#475569;font-weight:800}
      .icd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
      .icd-kpi{display:flex;align-items:center;gap:12px;min-width:0;padding:15px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;text-align:left;box-shadow:0 1px 2px rgba(15,23,42,.05);cursor:pointer}
      .icd-kpi:hover{border-color:#60a5fa}
      .icd-kpi-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:8px;background:#eff6ff;color:#1d4ed8;flex:none}
      .icd-kpi-text{min-width:0;flex:1}.icd-kpi small{display:block;font-size:11px;font-weight:900;color:#475569}.icd-kpi strong{display:block;margin:2px 0;font-size:24px;line-height:1;font-weight:950;color:#020617}.icd-kpi em{display:block;font-style:normal;font-size:10px;color:#64748b;font-weight:700}
      .icd-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.icd-grid+.icd-grid{margin-top:16px}
      .icd-panel{background:#fff;border:1px solid #cbd5e1;border-radius:9px;box-shadow:0 1px 2px rgba(15,23,42,.04);overflow:hidden}
      .icd-panel-head{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid #e2e8f0}
      .icd-panel-head span{display:block;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.12em}.icd-panel-head h2{margin:3px 0 0;font-size:16px;font-weight:950}
      .icd-chart{height:235px;padding:10px 10px 6px}.icd-empty{height:235px;display:grid;place-items:center;padding:20px;color:#64748b;font-weight:700;text-align:center}
      .icd-orders{margin-top:16px}.icd-table-wrap{overflow:auto}.icd-table{width:100%;border-collapse:collapse;font-size:12px}.icd-table th{padding:10px 13px;background:#f8fafc;color:#475569;text-align:left;font-size:10px;font-weight:950;border-bottom:1px solid #e2e8f0}.icd-table td{padding:11px 13px;border-bottom:1px solid #eef2f7;font-weight:650;white-space:nowrap}.icd-table tr:last-child td{border-bottom:0}.icd-status{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:10px;font-weight:900}.icd-empty-row{text-align:center!important;color:#64748b!important;padding:28px!important}
      .icd-alert{display:flex;gap:9px;align-items:flex-start;margin-bottom:14px;padding:11px 13px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:8px}.icd-alert span{display:block;margin-top:2px;font-size:12px}
      @media(max-width:1050px){.icd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.icd-grid{grid-template-columns:1fr}.icd-main{padding:20px}}
      @media(max-width:640px){.icd-kpis{grid-template-columns:1fr}.icd-heading{align-items:flex-start;flex-direction:column}.icd-heading-meta{justify-content:flex-start}.icd-main{padding:14px}}
    `}</style>
    <div className="icd-shell">
      <main className="icd-main">
        {error&&<div className="icd-alert" role="alert"><AlertTriangle size={18}/><div><b>Indicadores com erro de leitura</b><span>{error}</span></div></div>}
        <header className="icd-heading">
          <div><div style={{fontSize:11,fontWeight:950,letterSpacing:'.12em',color:'#2563eb'}}>VISÃO GERAL DO CLIENTE</div><h1>Olá, {usuarioNome}!</h1><p>Bem-vindo ao sistema de controle fabril da <strong>{empresaNome}</strong>.</p></div>
          <div className="icd-heading-meta"><span className="icd-online"><i className="icd-dot"/> ONLINE · SUPABASE</span><span className="icd-date">{clock.toLocaleDateString('pt-BR')} · {clock.toLocaleTimeString('pt-BR')}</span></div>
        </header>
        <section className="icd-kpis">
          {cards.map(({label,value,hint,icon:Icon,route})=><button key={label} className="icd-kpi" type="button" onClick={()=>onNavigate(route)}><span className="icd-kpi-icon"><Icon size={19}/></span><span className="icd-kpi-text"><small>{label}</small><strong>{loading?'…':value}</strong><em>{hint}</em></span><ArrowUpRight size={15}/></button>)}
        </section>
        <section className="icd-grid">
          <article className="icd-panel"><div className="icd-panel-head"><div><span>PRODUÇÃO REAL</span><h2>Eficiência de produção</h2></div><Activity size={18}/></div>{production.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={production}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="boa" name="Peças boas" stroke="#16a34a" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="refugo" name="Refugo" stroke="#dc2626" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div>:<div className="icd-empty">Sem apontamentos de produção registrados. O gráfico será preenchido quando houver dados reais.</div>}</article>
          <article className="icd-panel"><div className="icd-panel-head"><div><span>QUALIDADE</span><h2>Taxa de refugo</h2></div><TrendingDown size={18}/></div>{production.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={production}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis unit="%"/><Tooltip formatter={(v:number)=>[`${v.toFixed(2)}%`,'Refugo']}/><Bar dataKey="refugoPercent" name="Refugo %" fill="#dc2626"/></BarChart></ResponsiveContainer></div>:<div className="icd-empty">Sem dados reais de refugo registrados.</div>}</article>
        </section>
        <section className="icd-grid">
          <article className="icd-panel"><div className="icd-panel-head"><div><span>PCP · ORDENS</span><h2>Ordens de produção por status</h2></div><ListChecks size={18}/></div>{orderStatus.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderStatus} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="status" width={95}/><Tooltip/><Bar dataKey="quantidade" name="Ordens" fill="#2563eb"/></BarChart></ResponsiveContainer></div>:<div className="icd-empty">Nenhuma ordem de produção encontrada.</div>}</article>
          <article className="icd-panel"><div className="icd-panel-head"><div><span>VOLUME REAL</span><h2>Peças boas x refugo</h2></div><BarChart3 size={18}/></div>{production.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={production}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Bar dataKey="boa" name="Peças boas" fill="#16a34a"/><Bar dataKey="refugo" name="Refugo" fill="#dc2626"/></BarChart></ResponsiveContainer></div>:<div className="icd-empty">Sem dados reais de produção registrados.</div>}</article>
        </section>
        <section className="icd-panel icd-orders"><div className="icd-panel-head"><div><span>PCP · DADOS REAIS</span><h2>Últimas ordens de produção atualizadas</h2></div><ListChecks size={18}/></div><div className="icd-table-wrap"><table className="icd-table"><thead><tr><th>COD_OP</th><th>PRODUTO</th><th>DATA</th><th>STATUS</th></tr></thead><tbody>{latestOps.length?latestOps.map(op=><tr key={op.id}><td><b>OP-{op.numero_op}</b></td><td>{op.produto}</td><td>{op.created_at?new Date(op.created_at).toLocaleDateString('pt-BR'):'—'}</td><td><span className="icd-status">{statusLabel(op.status)}</span></td></tr>):<tr><td colSpan={4} className="icd-empty-row">Nenhuma ordem de produção encontrada para esta empresa.</td></tr>}</tbody></table></div></section>
      </main>
    </div>
    <TabletLaunchpad isOpen={tabletOpen} onClose={()=>setTabletOpen(false)} onNavigate={route=>{setTabletOpen(false);onNavigate(route)}}/>
  </>
}
