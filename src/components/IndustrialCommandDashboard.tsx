/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-044
 * Alterações: Unificar a consulta de produção incluindo created_at nos dois ramos.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CalendarDays, CheckCircle2, ClipboardCheck,
  Factory, Gauge, LayoutGrid, ListChecks, Package, Plus, ShieldCheck, ShoppingCart,
  Truck, Users, Wrench, Zap
} from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = { onNavigate: (route: string) => void }

type Metrics = {
  ops: number; completedOps: number; produced: number; scrap: number; rpnc: number; products: number
  machines: number; inspections: number; purchases: number; sales: number
}
type ProductionPoint = { date: string; boa: number; refugo: number }
type LatestOP = { id: string; numero_op: number | string; produto: string; status: string; created_at: string | null }

const n = (v: unknown) => {
  const value = Number(v)
  return Number.isFinite(value) ? value : 0
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

export default function IndustrialCommandDashboard({ onNavigate }: Props) {
  const [metrics, setMetrics] = useState<Metrics>({
    ops: 0, completedOps: 0, produced: 0, scrap: 0, rpnc: 0, products: 0, machines: 0, inspections: 0, purchases: 0, sales: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabletOpen, setTabletOpen] = useState(false)
  const [productionSeries, setProductionSeries] = useState<ProductionPoint[]>([])
  const [usuarioNome, setUsuarioNome] = useState('Usuário autenticado')
  const [empresaNome, setEmpresaNome] = useState('Empresa industrial')
  const [clock, setClock] = useState(new Date())
  const [latestOps, setLatestOps] = useState<LatestOP[]>([])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Sessão não encontrada.')

        const { data: profile, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('nome,empresa_id,is_master,perfil,nivel_admin')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()

        if (profileError) throw profileError
        const master = profile?.is_master === true &&
          Number(profile?.nivel_admin ?? 0) === 100 &&
          String(profile?.perfil ?? '').toUpperCase() === 'MASTER' &&
          profile?.empresa_id === null

        if (!master && !profile?.empresa_id) throw new Error('Perfil empresarial não encontrado.')
        const empresaId = profile?.empresa_id ?? null
        if (profile?.nome) setUsuarioNome(String(profile.nome))
        if (empresaId) {
          const company = await supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', empresaId).eq('ativo', true).maybeSingle()
          if (company.error) throw company.error
          setEmpresaNome(String(company.data?.nome_fantasia ?? company.data?.razao_social ?? 'Empresa industrial'))
        } else if (master) {
          setEmpresaNome('Visão Master do Ecossistema')
        }

        const count = async (table: string, statusColumn?: string, excluded: string[] = []) => {
          let q = supabase.from(table).select('*', { count: 'exact', head: true })
          if (master) {
            if (statusColumn && excluded.length) q = q.not(statusColumn, 'in', `(${excluded.join(',')})`)
          } else {
            q = q.eq('empresa_id', empresaId as string)
            if (statusColumn && excluded.length) q = q.not(statusColumn, 'in', `(${excluded.join(',')})`)
          }
          const result = await q
          if (result.error) throw result.error
          return result.count ?? 0
        }

        const productionQuery = master
          ? supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').limit(5000)
          : supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').eq('empresa_id', empresaId as string).limit(5000)

        const [ops, completedOps, rpnc, products, machines, inspections, purchases, sales, production] = await Promise.all([
          count('erp_ordens_producao', 'status', ['concluida', 'concluído', 'cancelada', 'cancelado']),
          count('erp_ordens_producao', 'status', ['aberta', 'aberto', 'planejada', 'planejado', 'em execução', 'em_execucao', 'em andamento', 'em_andamento', 'cancelada', 'cancelado']),
          count('erp_rpnc', 'status', ['encerrada', 'fechada', 'concluida', 'concluído']),
          count('erp_produtos'),
          count('erp_maquinas'),
          count('erp_inspecoes'),
          count('erp_pedidos_compra', 'status', ['concluido', 'concluída', 'cancelado', 'cancelada']),
          count('erp_pedidos_venda', 'status', ['faturado', 'concluido', 'concluído', 'cancelado', 'cancelada']),
          productionQuery
        ])

        if (production.error) throw production.error
        const produced = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_boa), 0)
        const scrap = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_defeituosa), 0)
        const byDay = new Map<string, ProductionPoint>()
        for (const row of production.data ?? []) {
          const date = String(row.created_at ?? '').slice(0, 10)
          if (!date) continue
          const point = byDay.get(date) ?? { date: date.slice(5).split('-').reverse().join('/'), boa: 0, refugo: 0 }
          point.boa += n(row.quantidade_boa)
          point.refugo += n(row.quantidade_defeituosa)
          byDay.set(date, point)
        }

        if (!alive) return
        setProductionSeries([...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([, value]) => value))
        const opQuery = master
          ? supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status,created_at').order('created_at', { ascending: false }).limit(8)
          : supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,status,created_at').eq('empresa_id', empresaId as string).order('created_at', { ascending: false }).limit(8)
        const { data: opRows, error: opError } = await opQuery
        if (opError) throw opError
        const productIds = [...new Set((opRows ?? []).map(row => String(row.produto_id ?? '')).filter(Boolean))]
        const { data: productRows, error: productError } = productIds.length
          ? await supabase.from('erp_produtos').select('id,codigo,nome').in('id', productIds)
          : { data: [], error: null }
        if (productError) throw productError
        const productMap = new Map((productRows ?? []).map(row => [String(row.id), String(row.codigo ?? row.nome ?? 'Produto')]))
        setLatestOps((opRows ?? []).map(row => ({ id: String(row.id), numero_op: row.numero_op, produto: productMap.get(String(row.produto_id ?? '')) ?? 'Produto não informado', status: String(row.status ?? '—'), created_at: row.created_at ? String(row.created_at) : null })))
        setMetrics({ ops, completedOps, rpnc, products, machines, inspections, purchases, sales, produced, scrap })
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Não foi possível carregar os indicadores.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const total = metrics.produced + metrics.scrap
  const efficiency = total ? (metrics.produced / total) * 100 : 0
  const nav = [
    { label: 'Dashboard / Visão Geral', icon: Activity, route: '/erp-industrial' },
    { label: 'Criar Nova OP', icon: Plus, route: '/pcp/nova-op' },
    { label: 'Demanda / Central OPs', icon: ListChecks, route: '/pcp/demanda' },
    { label: 'Materiais / MRP', icon: Package, route: '/pcp/mrp' },
    { label: 'Calendário / Programação', icon: CalendarDays, route: '/pcp/programacao' },
    { label: 'Centros de Trabalho', icon: Factory, route: '/pcp/centros-trabalho' },
    { label: 'Estrutura de Produto / BOM', icon: Boxes, route: '/engenharia' },
    { label: 'Apontamento de Produção', icon: CheckCircle2, route: '/operacao-industrial' },
    { label: 'Paradas / Setup', icon: Zap, route: '/pcp/paradas' },
    { label: 'Qualidade / Defeitos', icon: ShieldCheck, route: '/qualidade' },
  ] as const
  const statusLabel = (status: string) => {
    const value = status.toLowerCase()
    if (value.includes('concl')) return 'Concluída'
    if (value.includes('cancel')) return 'Cancelada'
    if (value.includes('exec')) return 'Em execução'
    if (value.includes('planej')) return 'Planejada'
    return status || 'Sem status'
  }
  return <>
    <style>{'.icd-shell{display:grid;grid-template-columns:270px minmax(0,1fr);min-height:calc(100vh - 78px);background:#f1f5f9;color:#0f172a}.icd-side{position:sticky;top:0;height:calc(100vh - 78px);overflow:auto;background:#0b1220;border-right:1px solid #1e293b;padding:18px 12px}.icd-side-title{padding:8px 12px 16px;color:#fff;font-weight:950;font-size:15px}.icd-side-title small{display:block;color:#94a3b8;font-size:10px;letter-spacing:.12em;margin-top:4px}.icd-nav{display:flex;flex-direction:column;gap:4px}.icd-nav button{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;border:1px solid transparent;border-radius:7px;padding:0 11px;background:transparent;color:#cbd5e1;text-align:left;font-size:13px;font-weight:800;cursor:pointer}.icd-nav button:hover{background:#172033;color:#fff}.icd-nav button.active{background:#1d4ed8;color:#fff;border-color:#3b82f6}.icd-main{min-width:0;padding:26px 28px 40px}.icd-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:20px}.icd-heading h1{margin:3px 0 4px;font-size:29px;font-weight:950;letter-spacing:-.02em}.icd-heading p{margin:0;color:#475569;font-weight:600}.icd-heading-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.icd-online{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:11px;font-weight:950}.icd-dot{width:7px;height:7px;border-radius:50%;background:#16a34a}.icd-date{font-size:12px;color:#475569;font-weight:800}.icd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.icd-kpi{display:flex;align-items:center;gap:12px;min-width:0;padding:16px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;text-align:left;box-shadow:0 1px 2px rgba(15,23,42,.05);cursor:pointer}.icd-kpi:hover{border-color:#94a3b8}.icd-kpi-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:8px;background:#eff6ff;color:#1d4ed8;flex:none}.icd-kpi-text{min-width:0;flex:1}.icd-kpi small,.icd-kpi em{display:block}.icd-kpi small{font-size:11px;font-weight:900;color:#475569}.icd-kpi strong{display:block;margin:2px 0;font-size:25px;line-height:1;font-weight:950;color:#020617}.icd-kpi em{font-style:normal;font-size:10px;color:#64748b;font-weight:700}.icd-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.9fr);gap:16px}.icd-panel{background:#fff;border:1px solid #cbd5e1;border-radius:9px;box-shadow:0 1px 2px rgba(15,23,42,.04);overflow:hidden}.icd-panel-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #e2e8f0}.icd-panel-head span{display:block;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.12em}.icd-panel-head h2{margin:3px 0 0;font-size:17px;font-weight:950}.icd-chart{height:280px;padding:14px 12px 8px}.icd-empty{height:280px;display:grid;place-items:center;padding:20px;color:#64748b;font-weight:700;text-align:center}.icd-actions{padding:16px;display:grid;gap:9px}.icd-action{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #dbe3ee;border-radius:7px;background:#f8fafc;text-align:left;cursor:pointer}.icd-action:hover{background:#eff6ff;border-color:#93c5fd}.icd-action span{display:grid;place-items:center;width:34px;height:34px;border-radius:7px;background:#dbeafe;color:#1d4ed8}.icd-action b{display:block;font-size:12px}.icd-action small{display:block;color:#64748b;margin-top:2px}.icd-orders{margin-top:16px}.icd-table-wrap{overflow:auto}.icd-table{width:100%;border-collapse:collapse;font-size:12px}.icd-table th{padding:11px 14px;background:#f8fafc;color:#475569;text-align:left;font-size:10px;font-weight:950;letter-spacing:.05em;border-bottom:1px solid #e2e8f0}.icd-table td{padding:12px 14px;border-bottom:1px solid #eef2f7;font-weight:650;white-space:nowrap}.icd-table tr:last-child td{border-bottom:0}.icd-status{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:10px;font-weight:900}.icd-empty-row{text-align:center!important;color:#64748b!important;padding:30px!important}.icd-production{margin-top:16px}.icd-alert{display:flex;gap:9px;align-items:flex-start;margin-bottom:14px;padding:11px 13px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:8px}.icd-alert span{display:block;margin-top:2px;font-size:12px}@media(max-width:1050px){.icd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.icd-grid{grid-template-columns:1fr}.icd-side{height:auto;position:relative}.icd-shell{grid-template-columns:1fr}.icd-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.icd-main{padding:20px}}@media(max-width:640px){.icd-kpis{grid-template-columns:1fr}.icd-nav{grid-template-columns:1fr}.icd-heading{align-items:flex-start;flex-direction:column}.icd-heading-meta{justify-content:flex-start}.icd-main{padding:14px}}'}</style>
    <div className="icd-shell">
      <aside className="icd-side" aria-label="Navegação industrial">
        <div className="icd-side-title">ERPSistema INDUSTRIAL<small>SGQ · WORKSPACE</small></div>
        <nav className="icd-nav">{nav.map(item => { const Icon=item.icon; const active=item.route==='/erp-industrial'; return <button key={item.label} className={active?'active':''} type="button" onClick={()=>onNavigate(item.route)}><Icon size={17}/><span>{item.label}</span></button> })}</nav>
      </aside>
      <main className="icd-main">
        {error && <div className="icd-alert" role="alert"><AlertTriangle size={18}/><div><b>Indicadores com erro de leitura</b><span>{error}</span></div></div>}
        <header className="icd-heading">
          <div><div style={{fontSize:11,fontWeight:950,letterSpacing:'.12em',color:'#2563eb'}}>VISÃO GERAL DO CLIENTE</div><h1>Olá, {usuarioNome}!</h1><p>Bem-vindo ao sistema de controle fabril da <strong>{empresaNome}</strong>.</p></div>
          <div className="icd-heading-meta"><span className="icd-online"><i className="icd-dot"/> ONLINE · SUPABASE</span><span className="icd-date">{clock.toLocaleDateString('pt-BR')} · {clock.toLocaleTimeString('pt-BR')}</span></div>
        </header>
        <section className="icd-kpis">
          <button className="icd-kpi" type="button" onClick={()=>onNavigate('/pcp')}><span className="icd-kpi-icon"><Factory size={20}/></span><span className="icd-kpi-text"><small>ORDENS ATIVAS</small><strong>{loading?'…':fmt(metrics.ops)}</strong><em>OPs não concluídas</em></span><ArrowUpRight size={16}/></button>
          <button className="icd-kpi" type="button" onClick={()=>onNavigate('/pcp')}><span className="icd-kpi-icon"><CheckCircle2 size={20}/></span><span className="icd-kpi-text"><small>OPs CONCLUÍDAS</small><strong>{loading?'…':fmt(metrics.completedOps)}</strong><em>Ordens encerradas</em></span><ArrowUpRight size={16}/></button>
          <button className="icd-kpi" type="button" onClick={()=>onNavigate('/qualidade')}><span className="icd-kpi-icon"><AlertTriangle size={20}/></span><span className="icd-kpi-text"><small>ALERTAS CRÍTICOS</small><strong>{loading?'…':fmt(metrics.rpnc)}</strong><em>RPN / RPNC em aberto</em></span><ArrowUpRight size={16}/></button>
          <button className="icd-kpi" type="button" onClick={()=>onNavigate('/operacao-industrial')}><span className="icd-kpi-icon"><Gauge size={20}/></span><span className="icd-kpi-text"><small>EFICIÊNCIA</small><strong>{loading?'…':total?efficiency.toFixed(1).replace('.',',')+'%':'—'}</strong><em>Boa ÷ total produzido</em></span><ArrowUpRight size={16}/></button>
        </section>
        <section className="icd-grid">
          <article className="icd-panel icd-production"><div className="icd-panel-head"><div><span>PRODUÇÃO REAL</span><h2>Eficiência de produção</h2></div><Activity size={19}/></div>{productionSeries.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={productionSeries} margin={{top:8,right:16,left:0,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="boa" name="Boa" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="refugo" name="Refugo" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>:<div className="icd-empty">Sem apontamentos de produção registrados. O gráfico será preenchido automaticamente quando houver dados reais.</div>}</article>
          <aside className="icd-panel icd-production"><div className="icd-panel-head"><div><span>AÇÕES RÁPIDAS</span><h2>Central operacional</h2></div><LayoutGrid size={19}/></div><div className="icd-actions">
            <button className="icd-action" type="button" onClick={()=>onNavigate('/pcp/nova-op')}><span><Plus size={18}/></span><div><b>Criar Nova OP</b><small>Abrir ordem de produção</small></div></button>
            <button className="icd-action" type="button" onClick={()=>onNavigate('/pcp')}><span><ListChecks size={18}/></span><div><b>Central de OPs</b><small>Demanda e acompanhamento</small></div></button>
            <button className="icd-action" type="button" onClick={()=>onNavigate('/pcp/mrp')}><span><Package size={18}/></span><div><b>Materiais / MRP</b><small>Consultar materiais e necessidades</small></div></button>
            <button className="icd-action" type="button" onClick={()=>setTabletOpen(true)}><span><LayoutGrid size={18}/></span><div><b>TABLET INDUSTRIAL</b><small>Operação de chão de fábrica</small></div></button>
          </div></aside>
        </section>
        <section className="icd-panel icd-orders"><div className="icd-panel-head"><div><span>PCP · DADOS REAIS</span><h2>Últimas ordens de produção atualizadas</h2></div><ListChecks size={19}/></div><div className="icd-table-wrap"><table className="icd-table"><thead><tr><th>COD_OP</th><th>PRODUTO</th><th>DATA</th><th>STATUS</th></tr></thead><tbody>{latestOps.length?latestOps.map(op=><tr key={op.id}><td><b>OP-{op.numero_op}</b></td><td>{op.produto}</td><td>{op.created_at?new Date(op.created_at).toLocaleDateString('pt-BR'):'—'}</td><td><span className="icd-status">{statusLabel(op.status)}</span></td></tr>):<tr><td colSpan={4} className="icd-empty-row">Nenhuma ordem de produção encontrada para esta empresa.</td></tr>}</tbody></table></div></section>
        <section className="icd-panel icd-production"><div className="icd-panel-head"><div><span>QUALIDADE</span><h2>Boa x refugo por dia</h2></div><Gauge size={19}/></div>{productionSeries.length?<div className="icd-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={productionSeries} margin={{top:8,right:16,left:0,bottom:8}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Bar dataKey="boa" name="Boa"/><Bar dataKey="refugo" name="Refugo"/></BarChart></ResponsiveContainer></div>:<div className="icd-empty">Sem dados reais para gerar este gráfico.</div>}</section>
      </main>
    </div>
    <TabletLaunchpad isOpen={tabletOpen} onClose={()=>setTabletOpen(false)} onNavigate={route=>{setTabletOpen(false);onNavigate(route)}}/>
  </>
}

function HealthRow({ icon: Icon, label, value, warning = false }: { icon: typeof CheckCircle2; label: string; value: string; warning?: boolean }) {
  return <div className="icd-health-row"><span className={warning ? 'warn' : ''}><Icon size={17} /></span><div><b>{label}</b><small>Registro atual</small></div><strong>{value}</strong></div>
}

