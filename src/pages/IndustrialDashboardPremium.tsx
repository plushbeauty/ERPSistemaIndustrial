import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Factory, Gauge, Package, RefreshCw, Settings, ShieldCheck, Truck, Users, Wrench, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type DashboardProps = { onOpen?: (path: string) => void; isMaster?: boolean }
type ProductionRow = { ordem_producao_id: string; quantidade_boa: number | null; quantidade_defeituosa: number | null }
type OrderRow = { id: string; numero_op: string; produto_id: string; quantidade: number; produced: number; status: string; data_prevista: string | null }
type ProductRow = { id: string; nome: string; codigo: string }

const go = (path: string) => { window.location.href = path }
const safeNumber = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0 }
const fmt = (value: number, digits = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)
const pct = (value: number) => `${fmt(value, 1)}%`

export default function IndustrialDashboardPremium({ onOpen, isMaster = false }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState('Sua empresa')
  const [refresh, setRefresh] = useState(0)
  const [metrics, setMetrics] = useState({ planned: 0, produced: 0, scrap: 0, stock: 0, machines: 0, openNc: 0, downtime: 0, setup: 0 })
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<Record<string, ProductRow>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('AUTH_SESSION_REQUIRED')

        const { data: profile, error: profileError } = await supabase
          .from('erp_usuarios')
          .select('empresa_id,is_master,perfil,nivel_admin')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()
        if (profileError) throw profileError
        const masterProfile = profile?.is_master === true && Number(profile?.nivel_admin ?? 0) === 9 && String(profile?.perfil ?? '').trim().toUpperCase() === 'MASTER' && profile?.empresa_id === null
        if (!masterProfile && !profile?.empresa_id) throw new Error('Perfil empresarial não encontrado.')
        const empresaId = profile?.empresa_id ?? null

        let ordersQuery = supabase.from('erp_ordens_producao').select('id,numero_op,produto_id,quantidade,status,data_prevista').order('criado_em', { ascending: false }).limit(6)
        let productionQuery = supabase.from('erp_producao_conferencias').select('ordem_producao_id,quantidade_boa,quantidade_defeituosa').limit(5000)
        let stockQuery = supabase.from('erp_estoque_movimentos').select('tipo,quantidade').limit(5000)
        let machinesQuery = supabase.from('erp_maquinas').select('id', { count: 'exact', head: true }).not('status', 'eq', 'INATIVA')
        let ncQuery = supabase.from('erp_rpnc').select('id', { count: 'exact', head: true }).neq('status', 'encerrada')
        if (!masterProfile && empresaId) {
          ordersQuery = ordersQuery.eq('empresa_id', empresaId)
          productionQuery = productionQuery.eq('empresa_id', empresaId)
          stockQuery = stockQuery.eq('empresa_id', empresaId)
          machinesQuery = machinesQuery.eq('empresa_id', empresaId)
          ncQuery = ncQuery.eq('empresa_id', empresaId)
        }

        const [companyResult, ordersResult, productionResult, stockResult, machinesResult, ncResult] = await Promise.all([
          masterProfile
            ? supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('ativo', true).limit(500)
            : supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', empresaId as string).eq('ativo', true).maybeSingle(),
          ordersQuery,
          productionQuery,
          stockQuery,
          machinesQuery,
          ncQuery,
        ])

        if (ordersResult.error) throw ordersResult.error
        if (productionResult.error) throw productionResult.error
        if (stockResult.error) throw stockResult.error
        if (machinesResult.error) throw machinesResult.error
        if (ncResult.error) throw ncResult.error

        const production = (productionResult.data ?? []) as ProductionRow[]
        const producedByOrder = production.reduce<Record<string, number>>((acc, row) => { acc[row.ordem_producao_id] = (acc[row.ordem_producao_id] ?? 0) + safeNumber(row.quantidade_boa); return acc }, {})
        const nextOrders = ((ordersResult.data ?? []) as Omit<OrderRow, 'produced'>[]).map(row => ({ ...row, produced: producedByOrder[row.id] ?? 0 }))
        const productIds = [...new Set(nextOrders.map(row => row.produto_id).filter(Boolean))]
        const productResult = productIds.length ? (masterProfile ? await supabase.from('erp_produtos').select('id,nome,codigo').in('id', productIds) : await supabase.from('erp_produtos').select('id,nome,codigo').eq('empresa_id', empresaId as string).in('id', productIds)) : { data: [], error: null }
        if (productResult.error) throw productResult.error

        const produced = production.reduce((sum, row) => sum + safeNumber(row.quantidade_boa), 0)
        const scrap = production.reduce((sum, row) => sum + safeNumber(row.quantidade_defeituosa), 0)
        const setup = 0
        const downtime = 0
        const planned = nextOrders.reduce((sum, row) => sum + safeNumber(row.quantidade), 0)
        const stock = (stockResult.data ?? []).reduce((sum, row) => {
          const quantity = safeNumber(row.quantidade)
          const type = String(row.tipo ?? '').toLowerCase()
          return sum + (type.includes('entrada') || type.includes('transfer') ? quantity : -quantity)
        }, 0)

        if (!alive) return
        const companyName = masterProfile
          ? `Visão Master · ${Array.isArray(companyResult.data) ? companyResult.data.length : 0} empresas`
          : (!Array.isArray(companyResult.data) && (companyResult.data?.nome_fantasia || companyResult.data?.razao_social)) || 'Sua empresa'
        setEmpresa(companyName)
        setOrders(nextOrders)
        setProducts(Object.fromEntries(((productResult.data ?? []) as ProductRow[]).map(product => [product.id, product])))
        setMetrics({ planned, produced, scrap, stock: Math.max(0, stock), machines: machinesResult.count ?? 0, openNc: ncResult.count ?? 0, downtime, setup })
      } catch (loadError) {
        if (!alive) return
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os indicadores.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [refresh])

  const qualityRate = useMemo(() => {
    const total = metrics.produced + metrics.scrap
    return total > 0 ? (metrics.produced / total) * 100 : 0
  }, [metrics.produced, metrics.scrap])

  const actions = [
    ['Nova OP', 'Criar ordem de produção', Factory, '/pcp'],
    ['Estoque', 'Consultar materiais e saldos', Package, '/erp-industrial'],
    ['Qualidade', 'RPNC, auditorias e inspeções', ClipboardCheck, '/qualidade'],
    ['Manutenção', 'Máquinas e ordens preventivas', Wrench, '/erp-industrial'],
    ['Produtos', 'Itens, BOM e engenharia', Boxes, '/produtos-vendas'],
    ['Usuários', 'Acessos e permissões', Users, '/usuarios'],
  ] as const
  const open = (path: string) => onOpen ? onOpen(path) : go(path)

  return <div className="industrial-premium-dashboard">
    <section className="ipd-welcome"><div><span className="ipd-eyebrow">SGQ ERP • CENTRO DE COMANDO INDUSTRIAL</span><h2>Visão real da operação</h2><p>{empresa} · indicadores calculados a partir dos registros atuais do Supabase.</p></div><button className="ipd-refresh" type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17}/> Atualizar</button></section>
    {error && <div className="ipd-card" role="alert" style={{ marginBottom: 18, borderColor: '#efb8b8' }}><strong>Não foi possível carregar todos os indicadores.</strong><p>{error}</p></div>}
    <section className="ipd-kpis" aria-label="Indicadores principais"><Kpi icon={Factory} label="Planejado nas OPs" value={loading ? '…' : fmt(metrics.planned)} helper="Quantidade planejada nas OPs recentes" /><Kpi icon={CheckCircle2} label="Produção boa" value={loading ? '…' : fmt(metrics.produced)} helper="Apontamentos de produção registrados" /><Kpi icon={Gauge} label="Qualidade da produção" value={loading ? '…' : metrics.produced + metrics.scrap > 0 ? pct(qualityRate) : '—'} helper="Boa ÷ (boa + refugo)" /><Kpi icon={AlertTriangle} label="Não conformidades abertas" value={loading ? '…' : fmt(metrics.openNc)} helper="Registros ainda não encerrados" /></section>
    <section className="ipd-grid-main"><article className="ipd-card ipd-orders"><div className="ipd-card-head"><div><span>ORDENS DE PRODUÇÃO</span><h3>Últimas OPs registradas</h3></div><button onClick={() => open('/pcp')} type="button">Ver PCP <ArrowUpRight size={15}/></button></div>{orders.length ? <div className="ipd-order-list">{orders.map(order => { const product = products[order.produto_id]; const progress = order.quantidade > 0 ? Math.min(100, (safeNumber(order.produced) / safeNumber(order.quantidade)) * 100) : 0; return <div className="ipd-order" key={order.id}><div className="ipd-order-top"><b>OP {order.numero_op}</b><span className={progress >= 100 ? 'done' : ''}>{order.status}</span></div><strong>{product ? `${product.codigo} · ${product.nome}` : `Produto ${order.produto_id}`}</strong><div className="ipd-progress"><i style={{ width: `${progress}%` }}/></div><small>{fmt(order.produced)} / {fmt(order.quantidade)} · {pct(progress)}</small></div> })}</div> : <Empty text="Nenhuma ordem de produção encontrada para esta empresa." />}</article><article className="ipd-card ipd-status"><div className="ipd-card-head"><div><span>SAÚDE DA OPERAÇÃO</span><h3>Dados atuais</h3></div><ShieldCheck size={18}/></div><Status icon={Factory} title="Máquinas ativas" value={fmt(metrics.machines)} ok={metrics.machines > 0}/><Status icon={Package} title="Saldo movimentado" value={`${fmt(metrics.stock)} unidades apuradas`} ok={metrics.stock > 0}/><Status icon={CalendarDays} title="Setup" value={`${fmt(metrics.setup)} min registrados`} ok={metrics.setup === 0}/><Status icon={Truck} title="Paradas" value={`${fmt(metrics.downtime)} min registrados`} ok={metrics.downtime === 0}/></article></section>
    <section className="ipd-grid-bottom"><article className="ipd-card"><div className="ipd-card-head"><div><span>ACESSO RÁPIDO</span><h3>Operação</h3></div><Settings size={18}/></div><div className="ipd-actions">{actions.map(([title, desc, Icon, path]) => <button key={title} type="button" onClick={() => open(path)}><span className="ipd-action-icon"><Icon size={18}/></span><span><b>{title}</b><small>{desc}</small></span><ArrowUpRight size={15}/></button>)}</div></article><article className="ipd-card ipd-production"><div className="ipd-card-head"><div><span>PRODUÇÃO</span><h3>Composição dos apontamentos</h3></div><Activity size={18}/></div><MetricLine label="Produção boa" value={fmt(metrics.produced)} /><MetricLine label="Refugo" value={fmt(metrics.scrap)} /><MetricLine label="Setup" value={`${fmt(metrics.setup)} min`} /><MetricLine label="Paradas" value={`${fmt(metrics.downtime)} min`} /></article></section>
    <footer className="ipd-footer"><span>SGQ ERP Industrial</span><span>Multiempresa · RBAC · Rastreabilidade</span><span>FernandoSch_System</span></footer>
  </div>
}

function Kpi({ icon: Icon, label, value, helper }: { icon: typeof Activity; label: string; value: string; helper: string }) { return <article className="ipd-kpi"><div className="ipd-kpi-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div><ArrowUpRight size={17}/></article> }
function Status({ icon: Icon, title, value, ok }: { icon: typeof CheckCircle2; title: string; value: string; ok: boolean }) { return <div className="ipd-status-row"><span className={ok ? 'ok' : 'warn'}><Icon size={17}/></span><div><b>{title}</b><small>{value}</small></div><i className={ok ? 'dot ok' : 'dot warn'}/></div> }
function MetricLine({ label, value }: { label: string; value: string }) { return <div className="ipd-status-row"><span className="ok"><Activity size={17}/></span><div><b>{label}</b><small>Registro real do Supabase</small></div><strong style={{ marginLeft: 'auto' }}>{value}</strong></div> }
function Empty({ text }: { text: string }) { return <div className="ipd-card" style={{ boxShadow: 'none', textAlign: 'center', padding: 28 }}><p>{text}</p></div> }