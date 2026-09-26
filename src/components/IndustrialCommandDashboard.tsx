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

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck,
  Factory, Gauge, LayoutGrid, Package, ShieldCheck, ShoppingCart,
  Truck, Users, Wrench, Zap
} from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = { onNavigate: (route: string) => void }

type Metrics = {
  ops: number; produced: number; scrap: number; rpnc: number; products: number
  machines: number; inspections: number; purchases: number
}
type ProductionPoint = { date: string; boa: number; refugo: number }

const n = (v: unknown) => {
  const value = Number(v)
  return Number.isFinite(value) ? value : 0
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

export default function IndustrialCommandDashboard({ onNavigate }: Props) {
  const [metrics, setMetrics] = useState<Metrics>({
    ops: 0, produced: 0, scrap: 0, rpnc: 0, products: 0, machines: 0, inspections: 0, purchases: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabletOpen, setTabletOpen] = useState(false)
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
          ? supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').limit(5000)
          : supabase.from('erp_producao_conferencias').select('quantidade_boa,quantidade_defeituosa,created_at').eq('empresa_id', empresaId as string).limit(5000)

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
        setMetrics({ ops, rpnc, products, machines, inspections, purchases, produced, scrap })
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
    <div className="icd icd-clean">
      {error && <div className="icd-alert" role="alert"><AlertTriangle size={18} /><div><b>Não foi possível carregar todos os indicadores</b><span>{error}</span></div></div>}

      <section className="icd-kpis" aria-label="Indicadores principais">
        {cards.map(card => {
          const Icon = card.icon
          return <button key={card.label} className={`icd-kpi ${card.tone}`} onClick={() => onNavigate(card.route)}>
            <span className="icd-kpi-icon"><Icon size={20} /></span>
            <span className="icd-kpi-text"><small>{card.label}</small><strong>{loading ? '…' : typeof card.value === 'number' ? fmt(card.value) : card.value}</strong><em>{card.helper}</em></span>
            <ArrowUpRight size={17} />
          </button>
        })}
      </section>

      <section className="icd-overview-grid">
        <article className="icd-panel icd-health">
          <header><div><span>OPERAÇÃO</span><h2>Visão rápida</h2></div><ShieldCheck size={19} /></header>
          <HealthRow icon={CheckCircle2} label="Produção boa" value={fmt(metrics.produced)} />
          <HealthRow icon={AlertTriangle} label="Refugo" value={fmt(metrics.scrap)} warning={metrics.scrap > 0} />
          <HealthRow icon={ClipboardCheck} label="Inspeções" value={fmt(metrics.inspections)} />
          <HealthRow icon={ShoppingCart} label="Compras abertas" value={fmt(metrics.purchases)} />
          <HealthRow icon={Truck} label="Máquinas ativas" value={fmt(metrics.machines)} />
        </article>

        <article className="icd-panel icd-chart-panel">
          <header><div><span>PRODUÇÃO REAL</span><h2>Boa x refugo por dia</h2></div><Activity size={19} /></header>
          {productionSeries.length ? <div className="icd-chart"><ResponsiveContainer width="100%" height={255}><LineChart data={productionSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="boa" name="Boa" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="refugo" name="Refugo" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div> : <div className="icd-chart-empty">Não existem registros de produção no período disponível.</div>}
        </article>
      </section>

      <section className="icd-charts-grid">
        <article className="icd-panel icd-chart-panel">
          <header><div><span>QUALIDADE</span><h2>Produção acumulada</h2></div><Gauge size={19} /></header>
          {productionSeries.length ? <div className="icd-chart"><ResponsiveContainer width="100%" height={255}><BarChart data={productionSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Bar dataKey="boa" name="Boa"/><Bar dataKey="refugo" name="Refugo"/></BarChart></ResponsiveContainer></div> : <div className="icd-chart-empty">Sem dados para gerar o gráfico.</div>}
        </article>
      </section>

      <section className="icd-panel icd-modules-panel">
        <header><div><span>OPERAÇÃO INDUSTRIAL</span><h2>Módulos principais</h2></div><LayoutGrid size={19} /></header>
        <div className="icd-module-grid">
          {modules.map(item => {
            const Icon = item.icon
            return <button key={item.label} onClick={() => onNavigate(item.route)}>
              <span><Icon size={20} /></span><div><b>{item.label}</b><small>{item.desc}</small></div><ArrowUpRight size={15} />
            </button>
          })}
        </div>
      </section>

      <footer className="icd-footer"><span>SGQ ERP Industrial</span><span>RLS · Rastreabilidade</span><span>FernandoSch_System</span></footer>
    </div>
    <TabletLaunchpad isOpen={tabletOpen} onClose={() => setTabletOpen(false)} onNavigate={route => { setTabletOpen(false); onNavigate(route) }} />
  </>

function HealthRow({ icon: Icon, label, value, warning = false }: { icon: typeof CheckCircle2; label: string; value: string; warning?: boolean }) {
  return <div className="icd-health-row"><span className={warning ? 'warn' : ''}><Icon size={17} /></span><div><b>{label}</b><small>Registro atual</small></div><strong>{value}</strong></div>
}
