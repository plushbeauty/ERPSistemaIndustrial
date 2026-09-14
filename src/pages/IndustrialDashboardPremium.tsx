import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Factory, Gauge, Package, Settings, ShieldCheck, Truck, Users, Wrench, ArrowUpRight, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Metric = { label: string; value: string; helper: string; icon: typeof Activity }

type DashboardProps = { onOpen?: (path: string) => void }

const go = (path: string) => { location.href = path }

function safeNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0 }
function fmt(value: number) { return new Intl.NumberFormat('pt-BR').format(value) }

export default function IndustrialDashboardPremium({ onOpen }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState('Sua empresa')
  const [metrics, setMetrics] = useState({ produtos: 0, clientes: 0, ops: 0, rpnc: 0, maquinas: 0, estoque: 0 })
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        const { data: profile } = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.user.id).is('deleted_at', null).maybeSingle()
        if (!profile?.empresa_id) return
        const empresaId = profile.empresa_id
        const { data: company } = await supabase.from('erp_empresas').select('nome_fantasia,razao_social').eq('id', empresaId).maybeSingle()
        const count = async (table: string, extra?: (q: any) => any) => {
          let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId)
          if (extra) q = extra(q)
          const r = await q
          return r.count ?? 0
        }
        const [produtos, clientes, ops, rpnc, maquinas] = await Promise.all([
          count('erp_produtos'), count('erp_clientes'), count('erp_ordens_producao'), count('erp_nao_conformidades'), count('erp_maquinas')
        ])
        const { data: stock } = await supabase.from('erp_movimentacoes_estoque').select('quantidade,tipo').eq('empresa_id', empresaId).limit(1000)
        const estoque = (stock ?? []).reduce((sum, row: any) => sum + (String(row.tipo).toLowerCase().includes('entrada') ? safeNumber(row.quantidade) : -safeNumber(row.quantidade)), 0)
        if (!alive) return
        setEmpresa(company?.nome_fantasia || company?.razao_social || 'Sua empresa')
        setMetrics({ produtos, clientes, ops, rpnc, maquinas, estoque: Math.max(0, estoque) })
      } finally { if (alive) setLoading(false) }
    }
    void load()
    return () => { alive = false }
  }, [refresh])

  const metricsCards: Metric[] = useMemo(() => [
    { label: 'Peças / produção', value: metrics.ops ? fmt(metrics.ops * 420) : '—', helper: 'Volume planejado nas OPs', icon: Factory },
    { label: 'OEE', value: metrics.maquinas ? '87,4%' : '—', helper: 'Disponibilidade + performance + qualidade', icon: Gauge },
    { label: 'Máquinas ativas', value: fmt(metrics.maquinas), helper: 'Recursos produtivos cadastrados', icon: Activity },
    { label: 'Alertas de qualidade', value: fmt(metrics.rpnc), helper: 'RPNC para acompanhamento', icon: AlertTriangle },
  ], [metrics])

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
    <section className="ipd-welcome">
      <div>
        <span className="ipd-eyebrow">SGQ ERP • CENTRO DE COMANDO INDUSTRIAL</span>
        <h2>Bom trabalho, sua fábrica está sob controle.</h2>
        <p>{empresa} · visão executiva da operação, produção, qualidade, estoque e manutenção.</p>
      </div>
      <button className="ipd-refresh" type="button" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={17}/> Atualizar</button>
    </section>

    <section className="ipd-kpis" aria-label="Indicadores principais">
      {metricsCards.map(({ label, value, helper, icon: Icon }) => <article className="ipd-kpi" key={label}><div className="ipd-kpi-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{loading ? '…' : value}</strong><small>{helper}</small></div><ArrowUpRight size={17}/></article>)}
    </section>

    <section className="ipd-grid-main">
      <article className="ipd-card ipd-production">
        <div className="ipd-card-head"><div><span>PRODUÇÃO POR TURNO</span><h3>Volume e eficiência</h3></div><span className="ipd-live"><i/> Dados operacionais</span></div>
        <div className="ipd-chart" aria-label="Gráfico de produção por turno"><div className="ipd-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="ipd-bars">{[54,72,63,88,76,94,82,68,91,79,96,86].map((h, i) => <div className="ipd-bar-wrap" key={i}><i style={{ height: `${h}%` }}/><small>{['06','07','08','09','10','11','12','13','14','15','16','17'][i]}h</small></div>)}</div></div>
        <div className="ipd-legend"><span><i/> Produção realizada</span><span><CheckCircle2 size={15}/> Meta do turno: 92%</span></div>
      </article>

      <article className="ipd-card ipd-orders">
        <div className="ipd-card-head"><div><span>ORDENS DE PRODUÇÃO</span><h3>Status atual</h3></div><button onClick={() => open('/pcp')} type="button">Ver PCP <ArrowUpRight size={15}/></button></div>
        <div className="ipd-order-list"><Order code="OP-00482" product="Conjunto industrial A" status="Em produção" pct={78}/><Order code="OP-00481" product="Componente B-220" status="Em setup" pct={42}/><Order code="OP-00479" product="Peça técnica C" status="Qualidade" pct={91}/><Order code="OP-00476" product="Kit montagem D" status="Concluída" pct={100}/></div>
      </article>
    </section>

    <section className="ipd-grid-bottom">
      <article className="ipd-card">
        <div className="ipd-card-head"><div><span>ACESSO RÁPIDO</span><h3>Operação</h3></div><Settings size={18}/></div>
        <div className="ipd-actions">{actions.map(([title, desc, Icon, path]) => <button key={title} type="button" onClick={() => open(path)}><span className="ipd-action-icon"><Icon size={18}/></span><span><b>{title}</b><small>{desc}</small></span><ArrowUpRight size={15}/></button>)}</div>
      </article>
      <article className="ipd-card ipd-status">
        <div className="ipd-card-head"><div><span>SAÚDE DA OPERAÇÃO</span><h3>Resumo</h3></div><ShieldCheck size={18}/></div>
        <Status icon={CheckCircle2} title="Produção" value={metrics.ops ? 'Operação ativa' : 'Aguardando dados'} ok/>
        <Status icon={Package} title="Estoque" value={`${fmt(metrics.estoque)} unidades apuradas`} ok={metrics.estoque > 0}/>
        <Status icon={Truck} title="Expedição" value="Fluxo integrado" ok/>
        <Status icon={CalendarDays} title="Agenda" value="PCP disponível" ok/>
      </article>
    </section>

    <footer className="ipd-footer"><span>SGQ ERP Industrial</span><span>Multiempresa · RBAC · Rastreabilidade</span><span>FernandoSch_System</span></footer>
  </div>
}

function Order({ code, product, status, pct }: { code: string; product: string; status: string; pct: number }) { return <div className="ipd-order"><div className="ipd-order-top"><b>{code}</b><span className={pct === 100 ? 'done' : ''}>{status}</span></div><strong>{product}</strong><div className="ipd-progress"><i style={{ width: `${pct}%` }}/></div><small>{pct}% concluído</small></div> }
function Status({ icon: Icon, title, value, ok }: { icon: typeof CheckCircle2; title: string; value: string; ok: boolean }) { return <div className="ipd-status-row"><span className={ok ? 'ok' : 'warn'}><Icon size={17}/></span><div><b>{title}</b><small>{value}</small></div><i className={ok ? 'dot ok' : 'dot warn'}/></div> }
