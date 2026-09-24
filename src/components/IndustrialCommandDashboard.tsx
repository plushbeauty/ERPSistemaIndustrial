import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck,
  Factory, Gauge, LayoutGrid, Package, RefreshCw, ShieldCheck, ShoppingCart,
  Truck, Users, Wrench, Zap
} from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'

type Props = { onNavigate: (route: string) => void; profileName: string; isMaster?: boolean }

type MetricValue = number | null
type Metrics = {
  ops: MetricValue
  produced: MetricValue
  scrap: MetricValue
  rpnc: MetricValue
  products: MetricValue
  machines: MetricValue
  inspections: MetricValue
  purchases: MetricValue
  expeditions: MetricValue
  receivables: MetricValue
  maintenance: MetricValue
  salesOrders: MetricValue
}
type ProductionPoint = { date: string; boa: number; refugo: number }

const n = (v: unknown) => {
  const value = Number(v)
  return Number.isFinite(value) ? value : 0
}
const fmt = (v: MetricValue) => v == null ? '—' : new Intl.NumberFormat('pt-BR').format(v)

export default function IndustrialCommandDashboard({ onNavigate, profileName, isMaster = false }: Props) {
  const [metrics, setMetrics] = useState<Metrics>({
    ops: null, produced: null, scrap: null, rpnc: null, products: null, machines: null,
    inspections: null, purchases: null, expeditions: null, receivables: null, maintenance: null, salesOrders: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabletOpen, setTabletOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [productionSeries, setProductionSeries] = useState<ProductionPoint[]>([])

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
          .select('empresa_id,is_master,perfil,nivel_admin')
          .eq('auth_user_id', auth.user.id)
          .eq('ativo', true)
          .is('deleted_at', null)
          .maybeSingle()

        if (profileError) throw profileError
        const master = profile?.is_master === true &&
          Number(profile?.nivel_admin ?? 0) === 9 &&
          String(profile?.perfil ?? '').toUpperCase() === 'MASTER' &&
          profile?.empresa_id === null

        if (!master && !profile?.empresa_id) throw new Error('Perfil empresarial não encontrado.')
        const empresaId = profile?.empresa_id ?? null

        const count = async (table: string, statusColumn?: string, excluded: string[] = []): Promise<number | null> => {
          let q = supabase.from(table).select('*', { count: 'exact', head: true })
          if (!master) q = q.eq('empresa_id', empresaId as string)
          if (statusColumn && excluded.length) q = q.not(statusColumn, 'in', `(${excluded.join(',')})`)
          const result = await q
          return result.error ? null : (result.count ?? 0)
        }

        const productionQuery = master
          ? supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').limit(5000)
          : supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').eq('empresa_id', empresaId as string).limit(5000)

        const [
          ops, rpnc, products, machines, inspections, purchases, expeditions,
          receivables, maintenance, salesOrders, production
        ] = await Promise.all([
          count('erp_ordens_producao', 'status', ['concluida', 'concluído', 'cancelada', 'cancelado']),
          count('erp_rpnc', 'status', ['encerrada', 'fechada', 'concluida', 'concluído']),
          count('erp_produtos'),
          count('erp_maquinas'),
          count('erp_inspecoes'),
          count('erp_pedidos_compra', 'status', ['concluido', 'concluída', 'cancelado', 'cancelada']),
          count('erp_expedicoes', 'status', ['entregue', 'concluido', 'concluída', 'cancelado']),
          count('erp_contas_receber', 'status', ['recebido', 'pago', 'quitado']),
          count('erp_manutencao', 'status', ['concluida', 'concluído', 'cancelada', 'cancelado']),
          count('erp_pedidos_venda', 'status', ['faturado', 'cancelado', 'cancelada', 'concluido', 'concluída']),
          productionQuery
        ])

        if (production.error) throw production.error
        const produced = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_boa), 0)
        const scrap = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_defeituosa), 0)
        const byDay = new Map<string, ProductionPoint>()
        for (const row of production.data ?? []) {
          const date = String(row.created_at ?? '').slice(0, 10)
          if (!date) continue
          const point = byDay.get(date) ?? {
            date: date.slice(5).split('-').reverse().join('/'), boa: 0, refugo: 0
          }
          point.boa += n(row.quantidade_boa)
          point.refugo += n(row.quantidade_defeituosa)
          byDay.set(date, point)
        }

        if (!alive) return
        setProductionSeries([...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([, value]) => value))
        setMetrics({
          ops, rpnc, products, machines, inspections, purchases, expeditions,
          receivables, maintenance, salesOrders, produced, scrap
        })
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Não foi possível carregar os indicadores.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [refreshKey])

  const total = (metrics.produced ?? 0) + (metrics.scrap ?? 0)
  const quality = total > 0 && metrics.produced != null ? (metrics.produced / total) * 100 : null

  const cards = [
    { label: 'OPs abertas', value: metrics.ops, helper: 'Produção', icon: Factory, route: '/pcp' },
    { label: 'Produção boa', value: metrics.produced, helper: 'Peças apontadas', icon: CheckCircle2, route: '/operacao-industrial' },
    { label: 'Qualidade', value: quality == null ? null : quality, helper: 'Boa / total produzido', icon: Gauge, route: '/qualidade', percent: true },
    { label: 'RPNC abertas', value: metrics.rpnc, helper: 'Não conformidades', icon: AlertTriangle, route: '/qualidade?tab=rpnc' },
    { label: 'Produtos', value: metrics.products, helper: 'Cadastro mestre', icon: Package, route: '/produtos-vendas' },
    { label: 'Máquinas', value: metrics.machines, helper: 'Recursos produtivos', icon: Wrench, route: '/operacao-industrial' },
    { label: 'Compras abertas', value: metrics.purchases, helper: 'Suprimentos', icon: ShoppingCart, route: '/compras-solicitacao' },
    { label: 'Expedições', value: metrics.expeditions, helper: 'Pedidos para expedir', icon: Truck, route: '/expedicao' }
  ] as const

  const systemBars = useMemo(() => [
    { name: 'PCP', value: metrics.ops },
    { name: 'Qualidade', value: metrics.inspections },
    { name: 'Compras', value: metrics.purchases },
    { name: 'Estoque', value: metrics.products },
    { name: 'Manutenção', value: metrics.maintenance },
    { name: 'Vendas', value: metrics.salesOrders },
    { name: 'Expedição', value: metrics.expeditions },
    { name: 'Financeiro', value: metrics.receivables }
  ].filter(item => item.value != null).map(item => ({ ...item, value: item.value as number })), [metrics])

  const modules = [
    { label: 'PCP & MRP', desc: 'OPs, demanda, materiais e programação', icon: Factory, route: '/pcp' },
    { label: 'Engenharia / BOM', desc: 'Estrutura, roteiro e ficha de processo', icon: Boxes, route: '/engenharia' },
    { label: 'Chão de Fábrica', desc: 'Tablet, apontamento, refugo e paradas', icon: Zap, route: '/operacao-industrial' },
    { label: 'Qualidade / SGQ', desc: 'Inspeção, RPNC, calibração e auditoria', icon: ShieldCheck, route: '/qualidade' },
    { label: 'Almoxarifado', desc: 'Lotes, endereços, reservas e rastreio', icon: Package, route: '/estoque' },
    { label: 'Compras', desc: 'Solicitações, fornecedores e recebimento', icon: ShoppingCart, route: '/compras-solicitacao' },
    { label: 'Manutenção', desc: 'Máquinas, planos e ordens', icon: Wrench, route: '/operacao-industrial' },
    { label: 'RH & Competências', desc: 'Operadores, treinamentos e autorizações', icon: Users, route: '/rh' }
  ] as const

  return <>
    <div className="icd icd-industrial-dashboard">
      <section className="icd-hero">
        <div className="icd-hero-copy">
          <div className="icd-kicker"><span className="icd-live-dot" /> CENTRO DE COMANDO INDUSTRIAL</div>
          <h1>Dashboard — Injetados / Prensados / Estampados</h1>
          <p>Visão executiva da fábrica, com indicadores reais de PCP, produção, qualidade, estoque, compras, expedição, manutenção, vendas e financeiro.</p>
          <div className="icd-hero-actions">
            <button className="icd-primary" onClick={() => setTabletOpen(true)}><LayoutGrid size={18} /> Abrir Tablet Industrial</button>
            <button className="icd-icon-btn" title="Atualizar indicadores" onClick={() => setRefreshKey(v => v + 1)}><RefreshCw size={18} /></button>
          </div>
        </div>
        <div className="icd-hero-side">
          <div className="icd-status"><span /> SISTEMA ONLINE</div>
          <strong>{isMaster ? 'Visão Master' : 'Operação da empresa'}</strong>
          <small>Indicadores consultados diretamente no Supabase. Nenhum valor é preenchido como demonstração.</small>
        </div>
      </section>

      {error && <div className="icd-alert"><AlertTriangle size={18} /><div><b>Indicadores parcialmente indisponíveis</b><span>{error}</span></div></div>}

      <section className="icd-kpis">
        {cards.map(card => {
          const Icon = card.icon
          return <button key={card.label} className="icd-kpi" onClick={() => onNavigate(card.route)}>
            <span className="icd-kpi-icon"><Icon size={20} /></span>
            <span className="icd-kpi-text">
              <small>{card.label}</small>
              <strong>{loading ? '…' : card.percent && card.value != null ? `${card.value.toFixed(1).replace('.', ',')}%` : fmt(card.value)}</strong>
              <em>{card.helper}</em>
            </span>
            <ArrowUpRight size={17} />
          </button>
        })}
      </section>

      <section className="icd-section-heading">
        <div><span>INDICADORES DOS SISTEMAS</span><h2>Gráficos da operação completa</h2></div>
        <small>Somente módulos com dados reais aparecem no gráfico.</small>
      </section>

      <section className="icd-charts-grid icd-charts-main">
        <article className="icd-panel icd-chart-panel icd-chart-wide">
          <header><div><span>PRODUÇÃO</span><h2>Boa x refugo por dia</h2></div><Factory size={19} /></header>
          {productionSeries.length ? <div className="icd-chart"><ResponsiveContainer width="100%" height={300}>
            <LineChart data={productionSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="boa" name="Boa" stroke="#0f766e" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="refugo" name="Refugo" stroke="#dc2626" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer></div> : <div className="icd-chart-empty">Sem registros de produção disponíveis para gerar a série.</div>}
        </article>

        <article className="icd-panel icd-chart-panel">
          <header><div><span>VISÃO SISTÊMICA</span><h2>Movimento por sistema</h2></div><Activity size={19} /></header>
          {systemBars.length ? <div className="icd-chart"><ResponsiveContainer width="100%" height={300}>
            <BarChart data={systemBars} layout="vertical" margin={{ top: 4, right: 20, left: 18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={76} />
              <Tooltip />
              <Bar dataKey="value" name="Registros/itens ativos" radius={[0, 5, 5, 0]}>
                {systemBars.map((item) => <Cell key={item.name} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div> : <div className="icd-chart-empty">Os sistemas ainda não possuem dados suficientes para o gráfico.</div>}
        </article>
      </section>

      <section className="icd-charts-grid icd-charts-secondary">
        <DashboardChart title="Qualidade" subtitle="Inspeções e não conformidades" icon={<ShieldCheck size={19} />} value={metrics.inspections} secondary={metrics.rpnc} primaryLabel="Inspeções" secondaryLabel="RPNC abertas" />
        <DashboardChart title="Suprimentos" subtitle="Compras e materiais cadastrados" icon={<ShoppingCart size={19} />} value={metrics.purchases} secondary={metrics.products} primaryLabel="Compras abertas" secondaryLabel="Produtos" />
        <DashboardChart title="Financeiro" subtitle="Títulos a receber" icon={<Activity size={19} />} value={metrics.receivables} secondary={metrics.salesOrders} primaryLabel="A receber" secondaryLabel="Pedidos de venda" />
        <DashboardChart title="Manutenção" subtitle="Ativos e ordens de manutenção" icon={<Wrench size={19} />} value={metrics.maintenance} secondary={metrics.machines} primaryLabel="Ordens abertas" secondaryLabel="Máquinas" />
      </section>

      <section className="icd-tablet-banner">
        <div className="icd-tablet-icon"><LayoutGrid size={30} /></div>
        <div><span>ACESSO OPERACIONAL</span><h2>Tablet Industrial</h2><p>PCP, Produção, Qualidade, Estoque, Compras, Engenharia, Manutenção, Fiscal e RH.</p></div>
        <span className="icd-tablet-hint">Use o Tablet para abrir os módulos operacionais.</span>
      </section>

      <section className="icd-main-grid">
        <article className="icd-panel">
          <header><div><span>MAPA DA OPERAÇÃO</span><h2>Setores do ERP</h2></div><Activity size={19} /></header>
          <div className="icd-module-grid">
            {modules.map(item => {
              const Icon = item.icon
              return <button key={item.label} onClick={() => onNavigate(item.route)}>
                <span><Icon size={20} /></span><div><b>{item.label}</b><small>{item.desc}</small></div><ArrowUpRight size={15} />
              </button>
            })}
          </div>
        </article>

        <article className="icd-panel icd-health">
          <header><div><span>SAÚDE OPERACIONAL</span><h2>Visão rápida</h2></div><ShieldCheck size={19} /></header>
          <HealthRow icon={CheckCircle2} label="Produção boa" value={fmt(metrics.produced)} />
          <HealthRow icon={AlertTriangle} label="Refugo" value={fmt(metrics.scrap)} warning={metrics.scrap != null && metrics.scrap > 0} />
          <HealthRow icon={ClipboardCheck} label="Inspeções" value={fmt(metrics.inspections)} />
          <HealthRow icon={ShoppingCart} label="Compras abertas" value={fmt(metrics.purchases)} />
          <HealthRow icon={Truck} label="Máquinas" value={fmt(metrics.machines)} />
        </article>
      </section>

      <section className="icd-process">
        <div><span>FLUXO INDUSTRIAL</span><h2>Pedido → Engenharia → PCP → Produção → Qualidade → Estoque → Expedição</h2><p>O dashboard é o centro de comando; cada etapa abre a operação correspondente.</p></div>
        <div className="icd-flow"><b>1</b><i /><b>2</b><i /><b>3</b><i /><b>4</b><i /><b>5</b><i /><b>6</b><i /><b>7</b></div>
      </section>

      <footer className="icd-footer"><span>SGQ ERP Industrial</span><span>Multiempresa · RLS · Rastreabilidade</span><span>FernandoSch_System</span></footer>
    </div>
    <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={route => { setTabletOpen(false); onNavigate(route) }} />
  </>
}

function DashboardChart({ title, subtitle, icon, value, secondary, primaryLabel, secondaryLabel }: {
  title: string; subtitle: string; icon: React.ReactNode; value: MetricValue; secondary: MetricValue; primaryLabel: string; secondaryLabel: string
}) {
  const data = [
    { name: primaryLabel, value: value ?? 0 },
    { name: secondaryLabel, value: secondary ?? 0 }
  ]
  const hasData = value != null || secondary != null
  return <article className="icd-panel icd-chart-panel icd-mini-chart">
    <header><div><span>INDICADOR</span><h2>{title}</h2><small>{subtitle}</small></div>{icon}</header>
    {hasData ? <div className="icd-chart"><ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" name="Valor" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer></div> : <div className="icd-chart-empty">Sem dados disponíveis.</div>}
    <div className="icd-chart-values"><span><b>{fmt(value)}</b>{primaryLabel}</span><span><b>{fmt(secondary)}</b>{secondaryLabel}</span></div>
  </article>
}

function HealthRow({ icon: Icon, label, value, warning = false }: { icon: typeof CheckCircle2; label: string; value: string; warning?: boolean }) {
  return <div className="icd-health-row"><span className={warning ? 'warn' : ''}><Icon size={17} /></span><div><b>{label}</b><small>Registro atual</small></div><strong>{value}</strong></div>
}
