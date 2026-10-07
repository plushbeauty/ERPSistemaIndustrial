import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Factory,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'

type Props = {
  onNavigate: (route: string) => void
}

type Profile = {
  empresa_id: string | null
  is_master: boolean
  nivel_admin: number | null
  perfil: string | null
  nome: string | null
}

type Machine = {
  id: string
  codigo: string
  nome: string
  status: string
}

type Product = {
  id: string
  codigo: string
  nome: string
  estoque_atual: number | null
  ponto_reposicao: number | null
  estoque_maximo: number | null
}

type Order = {
  id: string
  numero_op: string | number
  produto_id: string | null
  maquina_id: string | null
  quantidade: number | null
  quantidade_planejada: number | null
  status: string
  data_prevista: string | null
  criado_em: string | null
}

type Pointing = {
  ordem_producao_id: string
  quantidade_boa: number | null
  quantidade_refugo: number | null
  setup_min: number | null
  paradas_min: number | null
  inicio: string | null
  fim: string | null
}

type ProductionOrderDefinition = {
  id: string
  quantidade_planejada: number | null
  velocidade_nominal_hora: number | null
  tempo_estimado_horas: number | null
}

type Stop = {
  maquina_id: string | null
  motivo: string
  inicio: string | null
  fim: string | null
  status: string | null
}

type CreatedOrder = {
  id: string
  numero_op: number
  maquina_id: string | null
  tempo_estimado_horas: number
}

type StockStatus = {
  label: string
  className: string
}

type ChartPoint = {
  label: string
  value: number
}

const numberValue = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatNumber = (value: number, digits = 0): string =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)

const formatPercent = (value: number): string => \`\${formatNumber(value, 1)}%\`

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value))

const normalizeStatus = (value: string): string => {
  const normalized = value.trim().toLowerCase()

  if (normalized.includes('manut')) return 'MANUTENÇÃO'
  if (normalized.includes('parad')) return 'PARADA'
  if (normalized.includes('inativ')) return 'INATIVA'
  if (normalized.includes('setup')) return 'SETUP'
  if (normalized.includes('produ') || normalized.includes('oper')) return 'OPERANDO'

  return value.trim().toUpperCase() || 'SEM STATUS'
}

const statusClass = (status: string): string => {
  const normalized = normalizeStatus(status)

  if (normalized === 'OPERANDO') return 'text-emerald-600'
  if (normalized === 'SETUP') return 'text-amber-600'
  if (normalized === 'MANUTENÇÃO') return 'text-orange-600'
  if (normalized === 'PARADA') return 'text-red-600'
  return 'text-slate-500'
}

const stockStatus = (product: Product): StockStatus => {
  const current = numberValue(product.estoque_atual)
  const reorder = numberValue(product.ponto_reposicao)

  if (current <= 0) {
    return {
      label: 'SEM ESTOQUE',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (reorder > 0 && current <= reorder) {
    return {
      label: 'REPOR',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'DISPONÍVEL',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

const durationMinutes = (start: string | null, end: string | null): number => {
  if (!start) return 0

  const startMs = new Date(start).getTime()
  const endMs = end ? new Date(end).getTime() : Date.now()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 0
  }

  return (endMs - startMs) / 60000
}

export default function DashboardPrincipal({ onNavigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pointings, setPointings] = useState<Pointing[]>([])
  const [orderDefinitions, setOrderDefinitions] = useState<ProductionOrderDefinition[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [openRpncs, setOpenRpncs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingOrder, setSavingOrder] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderProductId, setOrderProductId] = useState('')
  const [orderMachineId, setOrderMachineId] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const auth = await supabase.auth.getUser()

      if (auth.error) throw auth.error
      if (!auth.data.user) throw new Error('Sessão não autenticada.')

      const profileResult = await supabase
        .from('erp_usuarios')
        .select('empresa_id,is_master,nivel_admin,perfil,nome')
        .eq('auth_user_id', auth.data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profileResult.error) throw profileResult.error
      if (!profileResult.data) throw new Error('Perfil ERP ativo não encontrado.')

      const nextProfile: Profile = {
        empresa_id: profileResult.data.empresa_id ?? null,
        is_master: Boolean(profileResult.data.is_master),
        nivel_admin: profileResult.data.nivel_admin == null ? null : Number(profileResult.data.nivel_admin),
        perfil: profileResult.data.perfil ?? null,
        nome: profileResult.data.nome ?? null,
      }

      const master =
        nextProfile.is_master &&
        nextProfile.nivel_admin === 100 &&
        String(nextProfile.perfil ?? '').trim().toUpperCase() === 'MASTER' &&
        nextProfile.empresa_id === null

      if (!master && !nextProfile.empresa_id) {
        throw new Error('Empresa do usuário não identificada.')
      }

      const empresaId = nextProfile.empresa_id

      const machineQuery = supabase
        .from('erp_maquinas')
        .select('id,codigo,nome,status')
        .eq('ativo', true)
        .order('codigo')
        .limit(500)

      const productQuery = supabase
        .from('erp_produtos')
        .select('id,codigo,nome,estoque_atual,ponto_reposicao,estoque_maximo')
        .eq('ativo', true)
        .order('codigo')
        .limit(5000)

      const orderQuery = supabase
        .from('erp_ordens_producao')
        .select('id,numero_op,produto_id,maquina_id,quantidade,quantidade_planejada,status,data_prevista,criado_em')
        .order('criado_em', { ascending: false })
        .limit(100)

      const pointingQuery = supabase
        .from('erp_producao_apontamentos')
        .select('ordem_producao_id,quantidade_boa,quantidade_refugo,setup_min,paradas_min,inicio,fim')
        .gte('inicio', new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(10000)

      const definitionQuery = supabase
        .from('erp_ordens_producao')
        .select('id,quantidade_planejada,velocidade_nominal_hora,tempo_estimado_horas')
        .limit(10000)

      const stopQuery = supabase
        .from('erp_producao_paradas')
        .select('maquina_id,motivo,inicio,fim,status')
        .gte('inicio', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('inicio', { ascending: false })
        .limit(10000)

      const rpncQuery = supabase
        .from('erp_rpnc')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'encerrada')

      if (!master && empresaId) {
        machineQuery.eq('empresa_id', empresaId)
        productQuery.eq('empresa_id', empresaId)
        orderQuery.eq('empresa_id', empresaId)
        pointingQuery.eq('empresa_id', empresaId)
        definitionQuery.eq('empresa_id', empresaId)
        stopQuery.eq('empresa_id', empresaId)
        rpncQuery.eq('empresa_id', empresaId)
      }

      const [
        machinesResult,
        productsResult,
        ordersResult,
        pointingsResult,
        definitionsResult,
        stopsResult,
        rpncResult,
      ] = await Promise.all([
        machineQuery,
        productQuery,
        orderQuery,
        pointingQuery,
        definitionQuery,
        stopQuery,
        rpncQuery,
      ])

      for (const result of [
        machinesResult,
        productsResult,
        ordersResult,
        pointingsResult,
        definitionsResult,
        stopsResult,
        rpncResult,
      ]) {
        if (result.error) throw result.error
      }

      setProfile(nextProfile)
      setMachines((machinesResult.data ?? []) as Machine[])
      setProducts((productsResult.data ?? []) as Product[])
      setOrders((ordersResult.data ?? []) as Order[])
      setPointings((pointingsResult.data ?? []) as Pointing[])
      setOrderDefinitions((definitionsResult.data ?? []) as ProductionOrderDefinition[])
      setStops((stopsResult.data ?? []) as Stop[])
      setOpenRpncs(rpncResult.count ?? 0)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar o centro de comando.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [refreshKey])

  const productMap = useMemo(
    () => new Map(products.map(product => [product.id, product])),
    [products],
  )

  const orderMap = useMemo(
    () => new Map(orderDefinitions.map(order => [order.id, order])),
    [orderDefinitions],
  )

  const productionMetrics = useMemo(() => {
    let plannedMinutes = 0
    let downtimeMinutes = 0
    let good = 0
    let scrap = 0
    let idealPieces = 0

    for (const row of pointings) {
      const definition = orderMap.get(row.ordem_producao_id)
      const duration = durationMinutes(row.inicio, row.fim)
      const stop = Math.min(
        duration,
        Math.max(0, numberValue(row.setup_min)) + Math.max(0, numberValue(row.paradas_min)),
      )
      const runtime = Math.max(0, duration - stop)

      plannedMinutes += definition
        ? Math.max(0, numberValue(definition.tempo_estimado_horas)) * 60
        : duration

      downtimeMinutes += stop
      good += Math.max(0, numberValue(row.quantidade_boa))
      scrap += Math.max(0, numberValue(row.quantidade_refugo))

      const nominalRate = definition
        ? Math.max(0, numberValue(definition.velocidade_nominal_hora))
        : 0

      idealPieces += (runtime / 60) * nominalRate
    }

    const availability = plannedMinutes > 0
      ? clampPercent(((plannedMinutes - downtimeMinutes) / plannedMinutes) * 100)
      : 0

    const performance = idealPieces > 0
      ? clampPercent((good / idealPieces) * 100)
      : 0

    const quality = good + scrap > 0
      ? clampPercent((good / (good + scrap)) * 100)
      : 0

    const oee = (availability * performance * quality) / 10000

    return {
      plannedMinutes,
      downtimeMinutes,
      runtimeMinutes: Math.max(0, plannedMinutes - downtimeMinutes),
      good,
      scrap,
      availability,
      performance,
      quality,
      oee,
    }
  }, [orderMap, pointings])

  const productionByHour = useMemo<ChartPoint[]>(() => {
    const buckets = new Map<number, number>()

    for (const row of pointings) {
      if (!row.inicio) continue

      const hour = new Date(row.inicio).getHours()
      const value = numberValue(row.quantidade_boa)

      buckets.set(hour, (buckets.get(hour) ?? 0) + value)
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, value]) => ({
        label: \`\${String(hour).padStart(2, '0')}:00\`,
        value,
      }))
  }, [pointings])

  const scrapByDay = useMemo<ChartPoint[]>(() => {
    const buckets = new Map<string, number>()

    for (const row of pointings) {
      if (!row.inicio) continue

      const day = row.inicio.slice(0, 10)
      const value = numberValue(row.quantidade_refugo)

      buckets.set(day, (buckets.get(day) ?? 0) + value)
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([day, value]) => ({
        label: day.slice(5).replace('-', '/'),
        value,
      }))
  }, [pointings])

  const downtimeByReason = useMemo<ChartPoint[]>(() => {
    const buckets = new Map<string, number>()

    for (const row of stops) {
      const reason = row.motivo.trim() || 'Sem motivo'
      buckets.set(reason, (buckets.get(reason) ?? 0) + durationMinutes(row.inicio, row.fim))
    }

    return [...buckets.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({
        label,
        value: Math.round(value),
      }))
  }, [stops])

  const machineCounts = useMemo(() => {
    return machines.reduce(
      (accumulator, machine) => {
        const status = normalizeStatus(machine.status)
        if (status === 'OPERANDO') accumulator.operando += 1
        else if (status === 'SETUP') accumulator.setup += 1
        else if (status === 'MANUTENÇÃO') accumulator.manutencao += 1
        else if (status === 'PARADA') accumulator.parada += 1
        else accumulator.outros += 1
        return accumulator
      },
      { operando: 0, setup: 0, manutencao: 0, parada: 0, outros: 0 },
    )
  }, [machines])

  const criticalProducts = useMemo(
    () =>
      products
        .filter(product => {
          const current = numberValue(product.estoque_atual)
          const reorder = numberValue(product.ponto_reposicao)
          return current <= 0 || (reorder > 0 && current <= reorder)
        })
        .sort((a, b) => numberValue(a.estoque_atual) - numberValue(b.estoque_atual))
        .slice(0, 8),
    [products],
  )

  const activeOrders = useMemo(
    () =>
      orders
        .filter(order => {
          const status = String(order.status).toLowerCase()
          return !status.includes('concl') && !status.includes('cancel')
        })
        .slice(0, 10),
    [orders],
  )

  const openOrder = async () => {
    const quantity = numberValue(orderQuantity)

    if (!orderProductId) {
      setError('Selecione o produto da OP.')
      return
    }

    if (quantity <= 0) {
      setError('Informe uma quantidade maior que zero.')
      return
    }

    setSavingOrder(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase.rpc('erp_criar_ordem_producao_v2', {
        p_produto_id: orderProductId,
        p_quantidade: quantity,
        p_pedido_venda_id: null,
        p_maquina_id: orderMachineId || null,
        p_velocidade_nominal_hora: null,
        p_operacao_dupla: false,
      })

      if (result.error) throw result.error

      const created = Array.isArray(result.data)
        ? (result.data[0] as CreatedOrder | undefined)
        : (result.data as CreatedOrder | null)

      setMessage(
        created
          ? \`OP \${created.numero_op} criada pelo fluxo transacional do PCP.\`
          : 'OP criada pelo fluxo transacional do PCP.',
      )

      setOrderProductId('')
      setOrderMachineId('')
      setOrderQuantity('')
      setShowOrderForm(false)
      setRefreshKey(value => value + 1)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a ordem de produção.')
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="industrial-premium-dashboard min-w-0 space-y-3 pb-5">
      <section className="border border-slate-200 bg-white px-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              SYSNQRA ERP & SGQ INDUSTRIAL • CENTRO DE COMANDO
            </span>
            <h2 className="mt-1 text-[15px] uppercase tracking-wide text-slate-900">
              Monitoramento operacional
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Dados reais do Supabase • {profile?.nome ?? 'Operador'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey(value => value + 1)}
            disabled={loading}
            className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] uppercase text-white disabled:opacity-50"
          >
            <RefreshCw size={13} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => setShowOrderForm(true)}
            className="inline-flex h-[30px] items-center gap-1 rounded-[2px] bg-slate-900 px-3 text-[10px] uppercase text-white"
          >
            <Factory size={13} />
            Nova OP
          </button>
        </div>
      </section>

      {error && (
        <section className="border border-red-300 bg-red-50 px-3 py-2 text-[10px] text-red-700" role="alert">
          <div className="flex items-start justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Fechar erro">
              <X size={13} />
            </button>
          </div>
        </section>
      )}

      {message && (
        <section className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700" role="status">
          {message}
        </section>
      )}

      {showOrderForm && (
        <section className="border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">PCP / ORDEM DE PRODUÇÃO</span>
              <h3 className="text-[12px] uppercase text-slate-800">Abertura transacional</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowOrderForm(false)}
              className="h-[30px] rounded-[2px] border border-slate-300 px-3 text-[9px] uppercase text-slate-600"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="block">
              <span className="mb-[2px] block text-[9px] uppercase tracking-wider text-slate-600">Produto *</span>
              <select
                value={orderProductId}
                onChange={event => setOrderProductId(event.target.value)}
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]"
              >
                <option value="">Selecionar produto</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.codigo} · {product.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-[2px] block text-[9px] uppercase tracking-wider text-slate-600">Máquina</span>
              <select
                value={orderMachineId}
                onChange={event => setOrderMachineId(event.target.value)}
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]"
              >
                <option value="">Usar ficha de processo</option>
                {machines
                  .filter(machine => normalizeStatus(machine.status) !== 'INATIVA')
                  .map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.codigo} · {machine.nome}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-[2px] block text-[9px] uppercase tracking-wider text-slate-600">Quantidade *</span>
              <input
                value={orderQuantity}
                onChange={event => setOrderQuantity(event.target.value)}
                type="number"
                min="0"
                step="0.001"
                placeholder="Preencher..."
                className="h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[11px]"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void openOrder()}
              disabled={savingOrder}
              className="h-[30px] rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] uppercase text-white disabled:opacity-50"
            >
              {savingOrder ? 'Criando...' : 'Criar OP'}
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2 xl:grid-cols-6">
        <Metric label="OEE" value={loading ? '—' : formatPercent(productionMetrics.oee)} icon={Gauge} />
        <Metric label="Disponibilidade" value={loading ? '—' : formatPercent(productionMetrics.availability)} icon={ShieldCheck} />
        <Metric label="Performance" value={loading ? '—' : formatPercent(productionMetrics.performance)} icon={BarChart3} />
        <Metric label="Qualidade" value={loading ? '—' : formatPercent(productionMetrics.quality)} icon={CheckCircle2} />
        <Metric label="Produção boa" value={loading ? '—' : formatNumber(productionMetrics.good)} icon={Factory} />
        <Metric label="Refugo" value={loading ? '—' : formatNumber(productionMetrics.scrap)} icon={AlertTriangle} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <article className="border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">OEE / PERFORMANCE</span>
            <h3 className="text-[11px] uppercase text-slate-700">Produção por hora</h3>
          </header>
          <div className="h-[250px] p-3">
            {productionByHour.length === 0 ? (
              <Empty text="Sem apontamentos de produção no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionByHour}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Peças boas']} />
                  <Line type="monotone" dataKey="value" stroke="#2D8DB8" strokeWidth={2} dot={{ r: 2 }} name="Peças boas" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">PARADAS</span>
            <h3 className="text-[11px] uppercase text-slate-700">Tempo por motivo</h3>
          </header>
          <div className="h-[250px] p-3">
            {downtimeByReason.length === 0 ? (
              <Empty text="Sem paradas registradas no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={downtimeByReason} layout="vertical">
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 8 }} />
                  <Tooltip formatter={(value: number) => [\`\${formatNumber(value)} min\`, 'Tempo']} />
                  <Bar dataKey="value" fill="#D65B61" name="Minutos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <article className="border border-slate-200 bg-white xl:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">LINHAS / MÁQUINAS</span>
              <h3 className="text-[11px] uppercase text-slate-700">Status operacional</h3>
            </div>
            <span className="text-[9px] text-slate-400">{machines.length} máquinas</span>
          </header>

          <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-5">
            <StatusTile label="Operando" value={machineCounts.operando} className="text-emerald-600" />
            <StatusTile label="Setup" value={machineCounts.setup} className="text-amber-600" />
            <StatusTile label="Manutenção" value={machineCounts.manutencao} className="text-orange-600" />
            <StatusTile label="Parada" value={machineCounts.parada} className="text-red-600" />
            <StatusTile label="Outros" value={machineCounts.outros} className="text-slate-500" />
          </div>

          <div className="max-h-[250px] overflow-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="h-[30px] border-b border-slate-200">
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">Código</th>
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">Máquina</th>
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(machine => (
                  <tr key={machine.id} className="h-[30px] border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 text-left">{machine.codigo}</td>
                    <td className="px-3 text-left">{machine.nome}</td>
                    <td className={\`px-3 text-left \${statusClass(machine.status)}\`}>
                      {normalizeStatus(machine.status)}
                    </td>
                  </tr>
                ))}
                {!loading && machines.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-5 text-center text-[10px] text-slate-400">
                      Nenhuma máquina operacional cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">ESTOQUE</span>
              <h3 className="text-[11px] uppercase text-slate-700">Níveis críticos</h3>
            </div>
            <Boxes size={15} className="text-[#2D8DB8]" />
          </header>

          <div className="max-h-[315px] overflow-auto">
            {criticalProducts.map(product => {
              const status = stockStatus(product)
              return (
                <div key={product.id} className="border-b border-slate-100 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-slate-500">{product.codigo}</div>
                      <div className="truncate text-[11px] text-slate-800">{product.nome}</div>
                    </div>
                    <span className={\`shrink-0 border px-1.5 py-0.5 text-[8px] uppercase \${status.className}\`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-slate-500">
                    <span>Saldo: {formatNumber(numberValue(product.estoque_atual), 3)}</span>
                    <span>Reposição: {formatNumber(numberValue(product.ponto_reposicao), 3)}</span>
                  </div>
                </div>
              )
            })}

            {!loading && criticalProducts.length === 0 && (
              <div className="px-3 py-8 text-center text-[10px] text-emerald-600">
                Nenhum item abaixo do ponto de reposição.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <article className="border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">PCP</span>
              <h3 className="text-[11px] uppercase text-slate-700">Ordens de produção ativas</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/pcp')}
              className="inline-flex h-[28px] items-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[9px] uppercase text-white"
            >
              PCP <ArrowUpRight size={12} />
            </button>
          </header>

          <div className="overflow-auto">
            <table className="w-full min-w-[700px] border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr className="h-[30px] border-b border-slate-200">
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">OP</th>
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">Produto</th>
                  <th className="px-3 text-right text-[9px] uppercase tracking-wider text-slate-500">Quantidade</th>
                  <th className="px-3 text-left text-[9px] uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map(order => {
                  const product = order.produto_id ? productMap.get(order.produto_id) : undefined
                  return (
                    <tr key={order.id} className="h-[31px] border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 font-mono text-left text-[10px]">{String(order.numero_op)}</td>
                      <td className="px-3 text-left">
                        {product ? \`\${product.codigo} · \${product.nome}\` : 'Produto não identificado'}
                      </td>
                      <td className="px-3 text-right">
                        {formatNumber(numberValue(order.quantidade ?? order.quantidade_planejada))}
                      </td>
                      <td className="px-3 text-left text-[10px] text-slate-600">
                        {String(order.status).toUpperCase()}
                      </td>
                    </tr>
                  )
                })}

                {!loading && activeOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-5 text-center text-[10px] text-slate-400">
                      Nenhuma OP ativa encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">PERDAS / QUALIDADE</span>
            <h3 className="text-[11px] uppercase text-slate-700">Refugo e não conformidades</h3>
          </header>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="border border-slate-200 p-3">
              <span className="text-[9px] uppercase text-slate-500">Refugo</span>
              <strong className="mt-1 block text-[20px] text-red-600">
                {formatNumber(productionMetrics.scrap)}
              </strong>
              <span className="text-[9px] text-slate-400">últimos 30 dias</span>
            </div>

            <div className="border border-slate-200 p-3">
              <span className="text-[9px] uppercase text-slate-500">RPNCs abertas</span>
              <strong className="mt-1 block text-[20px] text-amber-600">
                {formatNumber(openRpncs)}
              </strong>
              <span className="text-[9px] text-slate-400">status diferente de encerrada</span>
            </div>
          </div>

          <div className="h-[180px] px-3 pb-3">
            {scrapByDay.length === 0 ? (
              <Empty text="Sem refugo apontado no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scrapByDay}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Refugo']} />
                  <Bar dataKey="value" fill="#D65B61" name="Refugo" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">COMPOSIÇÃO DO OEE</span>
            <h3 className="text-[11px] uppercase text-slate-700">Disponibilidade × Performance × Qualidade</h3>
          </header>

          <div className="grid grid-cols-3 gap-px bg-slate-200">
            <OeeCell label="Disponibilidade" value={formatPercent(productionMetrics.availability)} />
            <OeeCell label="Performance" value={formatPercent(productionMetrics.performance)} />
            <OeeCell label="Qualidade" value={formatPercent(productionMetrics.quality)} />
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 text-[9px] text-slate-500">
            <span>Planejado: {formatNumber(productionMetrics.plannedMinutes)} min</span>
            <span>Paradas: {formatNumber(productionMetrics.downtimeMinutes)} min</span>
            <span>Operação: {formatNumber(productionMetrics.runtimeMinutes)} min</span>
          </div>
        </article>

        <article className="border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-3 py-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">ATALHOS OPERACIONAIS</span>
            <h3 className="text-[11px] uppercase text-slate-700">Módulos integrados</h3>
          </header>

          <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
            <Shortcut label="Estoque" icon={Boxes} onClick={() => onNavigate('/estoque/saldos')} />
            <Shortcut label="PCP" icon={Factory} onClick={() => onNavigate('/pcp')} />
            <Shortcut label="Qualidade" icon={ShieldCheck} onClick={() => onNavigate('/qualidade')} />
            <Shortcut label="Manutenção" icon={Wrench} onClick={() => onNavigate('/operacao-industrial')} />
          </div>
        </article>
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Gauge
}) {
  return (
    <article className="border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
        <Icon size={14} className="text-[#2D8DB8]" />
      </div>
      <strong className="mt-1 block text-[20px] text-slate-900">{value}</strong>
    </article>
  )
}

function StatusTile({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="bg-white px-3 py-2">
      <span className="block text-[8px] uppercase tracking-wider text-slate-500">{label}</span>
      <strong className={\`mt-1 block text-[18px] \${className}\`}>{value}</strong>
    </div>
  )
}

function OeeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <span className="block text-[8px] uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="mt-1 block text-[16px] text-slate-800">{value}</strong>
    </div>
  )
}

function Shortcut({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Boxes
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[60px] items-center gap-2 bg-white px-3 text-left hover:bg-slate-50"
    >
      <Icon size={17} className="text-[#2D8DB8]" />
      <span className="text-[10px] uppercase text-slate-700">{label}</span>
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-3 text-center text-[10px] text-slate-400">
      {text}
    </div>
  )
}
