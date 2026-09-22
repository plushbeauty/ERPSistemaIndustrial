import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck,
  Factory, Gauge, LayoutGrid, Package, RefreshCw, ShieldCheck, ShoppingCart,
  Truck, Users, Wrench, X, Zap
} from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'

type Props = { onNavigate: (route: string) => void; profileName: string; isMaster?: boolean }

type Metrics = {
  ops: number; produced: number; scrap: number; rpnc: number; products: number
  machines: number; inspections: number; purchases: number
}

const n = (v: unknown) => {
  const value = Number(v)
  return Number.isFinite(value) ? value : 0
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

export default function IndustrialCommandDashboard({ onNavigate, profileName, isMaster = false }: Props) {
  const [metrics, setMetrics] = useState<Metrics>({
    ops: 0, produced: 0, scrap: 0, rpnc: 0, products: 0, machines: 0, inspections: 0, purchases: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabletOpen, setTabletOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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
          Number(profile?.nivel_admin ?? 0) === 100 &&
          String(profile?.perfil ?? '').toUpperCase() === 'MASTER' &&
          profile?.empresa_id === null

        if (!master && !profile?.empresa_id) throw new Error('Perfil empresarial não encontrado.')
        const empresaId = profile?.empresa_id ?? null

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
          ? supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa').limit(5000)
          : supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa').eq('empresa_id', empresaId as string).limit(5000)

        const [ops, rpnc, products, machines, inspections, purchases, production] = await Promise.all([
          count('erp_ordens_producao', 'status', ['concluida', 'concluído', 'cancelada', 'cancelado']),
          count('erp_rpnc', 'status', ['encerrada', 'fechada', 'concluida', 'concluído']),
          count('erp_produtos'),
          count('erp_maquinas'),
          count('erp_inspecoes'),
          count('erp_pedidos_compra', 'status', ['concluido', 'concluída', 'cancelado', 'cancelada']),
          productionQuery
        ])

        if (production.error) throw production.error
        const produced = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_boa), 0)
        const scrap = (production.data ?? []).reduce((s, row) => s + n(row.quantidade_defeituosa), 0)

        if (!alive) return
        setMetrics({ ops, rpnc, products, machines, inspections, purchases, produced, scrap })
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Não foi possível carregar os indicadores.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [refreshKey])

  const total = metrics.produced + metrics.scrap
  const quality = total ? (metrics.produced / total) * 100 : 0
  const cards = [
    { label: 'Ordens de produção', value: metrics.ops, helper: 'OPs em aberto', icon: Factory, route: '/pcp', tone: 'teal' },
    { label: 'Produção boa', value: metrics.produced, helper: 'Peças apontadas', icon: CheckCircle2, route: '/operacao-industrial', tone: 'green' },
    { label: 'Qualidade', value: total ? `${quality.toFixed(1).replace('.', ',')}%` : '—', helper: 'Boa / total produzido', icon: Gauge, route: '/qualidade', tone: 'blue' },
    { label: 'RPNC abertas', value: metrics.rpnc, helper: 'Não conformidades', icon: AlertTriangle, route: '/qualidade?tab=rpnc', tone: 'amber' },
  ] as const

  const modules = [
    { label: 'PCP & MRP', desc: 'OPs, demanda, materiais e programação', icon: Factory, route: '/pcp' },
    { label: 'Engenharia / BOM', desc: 'Estrutura, roteiro e ficha de processo', icon: Boxes, route: '/engenharia' },
    { label: 'Chão de Fábrica', desc: 'Tablet, apontamento, refugo e paradas', icon: Zap, route: '/operacao-industrial' },
    { label: 'Qualidade / SGQ', desc: 'Inspeção, RPNC, calibração e auditoria', icon: ShieldCheck, route: '/qualidade' },
    { label: 'Almoxarifado', desc: 'Lotes, endereços, reservas e rastreio', icon: Package, route: '/estoque' },
    { label: 'Compras', desc: 'Solicitações, fornecedores e recebimento', icon: ShoppingCart, route: '/compras-solicitacao' },
    { label: 'Manutenção', desc: 'Máquinas, planos e ordens', icon: Wrench, route: '/operacao-industrial' },
    { label: 'RH & Competências', desc: 'Operadores, treinamentos e autorizações', icon: Users, route: '/rh' },
  ] as const

  return <>
    <div className="icd">
      <section className="icd-hero">
        <div className="icd-hero-copy">
          <div className="icd-kicker"><span className="icd-live-dot" /> CENTRO DE COMANDO INDUSTRIAL</div>
          <h1>Bom dia, {profileName.split(' ')[0]}.</h1>
          <p>Controle a fábrica, qualidade, materiais e administração em uma única operação.</p>
          <div className="icd-hero-actions">
            <button className="icd-primary" onClick={() => setTabletOpen(true)}><LayoutGrid size={18} /> Abrir Tablet Industrial</button>
            <button className="icd-secondary" onClick={() => onNavigate('/pcp')}><Factory size={18} /> Abrir PCP</button>
            <button className="icd-icon-btn" title="Atualizar indicadores" onClick={() => setRefreshKey(v => v + 1)}><RefreshCw size={18} /></button>
          </div>
        </div>
        <div className="icd-hero-side">
          <div className="icd-status"><span /> SISTEMA ONLINE</div>
          <strong>{isMaster ? 'Visão Master' : 'Operação da empresa'}</strong>
          <small>Dados consultados diretamente no Supabase</small>
          <div className="icd-mini-grid">
            <div><b>{loading ? '…' : fmt(metrics.machines)}</b><span>Máquinas</span></div>
            <div><b>{loading ? '…' : fmt(metrics.products)}</b><span>Produtos</span></div>
          </div>
        </div>
      </section>

      {error && <div className="icd-alert"><AlertTriangle size={18} /><div><b>Indicadores parcialmente indisponíveis</b><span>{error}</span></div></div>}

      <section className="icd-kpis">
        {cards.map(card => {
          const Icon = card.icon
          return <button key={card.label} className={`icd-kpi ${card.tone}`} onClick={() => onNavigate(card.route)}>
            <span className="icd-kpi-icon"><Icon size={20} /></span>
            <span className="icd-kpi-text"><small>{card.label}</small><strong>{loading ? '…' : typeof card.value === 'number' ? fmt(card.value) : card.value}</strong><em>{card.helper}</em></span>
            <ArrowUpRight size={17} />
          </button>
        })}
      </section>

      <section className="icd-tablet-banner">
        <div className="icd-tablet-icon"><LayoutGrid size={30} /></div>
        <div><span>ACESSO OPERACIONAL</span><h2>Tablet Industrial</h2><p>PCP, Produção, Qualidade, Estoque, Compras, Engenharia, Manutenção, Fiscal e RH.</p></div>
        <button onClick={() => setTabletOpen(true)}>Abrir todos os módulos <ArrowUpRight size={16} /></button>
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
          <HealthRow icon={AlertTriangle} label="Refugo" value={fmt(metrics.scrap)} warning={metrics.scrap > 0} />
          <HealthRow icon={ClipboardCheck} label="Inspeções" value={fmt(metrics.inspections)} />
          <HealthRow icon={ShoppingCart} label="Compras abertas" value={fmt(metrics.purchases)} />
          <HealthRow icon={Truck} label="Máquinas ativas" value={fmt(metrics.machines)} />
        </article>
      </section>

      <section className="icd-process">
        <div><span>FLUXO INDUSTRIAL</span><h2>Pedido → Engenharia → PCP → Produção → Qualidade → Estoque → Expedição</h2><p>O dashboard é o centro de comando; cada etapa abre a operação correspondente sem telas decorativas.</p></div>
        <div className="icd-flow"><b>1</b><i /><b>2</b><i /><b>3</b><i /><b>4</b><i /><b>5</b><i /><b>6</b><i /><b>7</b></div>
      </section>

      <footer className="icd-footer"><span>SGQ ERP Industrial</span><span>Multiempresa · RLS · Rastreabilidade</span><span>FernandoSch_System</span></footer>
    </div>
    <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={route => { setTabletOpen(false); onNavigate(route) }} />
  </>
}

function HealthRow({ icon: Icon, label, value, warning = false }: { icon: typeof CheckCircle2; label: string; value: string; warning?: boolean }) {
  return <div className="icd-health-row"><span className={warning ? 'warn' : ''}><Icon size={17} /></span><div><b>{label}</b><small>Registro atual</small></div><strong>{value}</strong></div>
}
