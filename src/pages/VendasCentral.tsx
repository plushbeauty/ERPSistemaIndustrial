import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  PackagePlus,
  RefreshCw,
  Settings,
  ShoppingCart,
  Target,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Order = {
  id: string
  numero: number
  status: string
  total: number
  data_entrega_prometida: string | null
  cliente_id: string
  cliente_nome: string
}

type Company = {
  nome_fantasia: string | null
  razao_social: string | null
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—'

const normalizeStatus = (value: string) => value.trim().toLowerCase()

const statusLabel: Record<string, string> = {
  cotacao: 'Cotação',
  em_analise: 'Em análise',
  necessita_producao: 'Necessita produção',
  parcial: 'Parcial',
  reservado: 'Reservado',
  separado: 'Separado',
  faturado: 'Faturado',
  cancelado: 'Cancelado',
}

const statusClass: Record<string, string> = {
  cotacao: 'bg-amber-50 text-amber-900 border-amber-200',
  em_analise: 'bg-sky-50 text-sky-900 border-sky-200',
  necessita_producao: 'bg-orange-50 text-orange-900 border-orange-200',
  parcial: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  reservado: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  separado: 'bg-violet-50 text-violet-900 border-violet-200',
  faturado: 'bg-teal-50 text-teal-900 border-teal-200',
  cancelado: 'bg-slate-100 text-slate-700 border-slate-200',
}

type ViewCard = {
  title: string
  description: string
  href: string
  icon: typeof BarChart3
}

const views: ViewCard[] = [
  {
    title: 'Novo pedido',
    description: 'Criar pedido, analisar estoque e registrar necessidade líquida.',
    href: '/vendas/novo-pedido',
    icon: PackagePlus,
  },
  {
    title: 'Carteira de pedidos',
    description: 'Consultar pedidos reais da empresa e acompanhar status.',
    href: '/vendas/carteira',
    icon: ClipboardList,
  },
  {
    title: 'Clientes',
    description: 'Cadastro comercial, dados fiscais e De-Para de produtos.',
    href: '/vendas/clientes',
    icon: Users,
  },
  {
    title: 'Catálogo digital',
    description: 'Produtos liberados para consulta e solicitação de cotação.',
    href: '/vendas/catalogo-digital',
    icon: ShoppingCart,
  },
  {
    title: 'Metas',
    description: 'Metas comerciais e acompanhamento do realizado.',
    href: '/vendas/metas',
    icon: Target,
  },
  {
    title: 'Relatórios',
    description: 'Relatório operacional da carteira de pedidos.',
    href: '/vendas/relatorios',
    icon: FileBarChart,
  },
  {
    title: 'Dashboard analítico',
    description: 'Indicadores de faturamento por cliente e período.',
    href: '/vendas/dashboard-graficos',
    icon: BarChart3,
  },
  {
    title: 'Análise de custos',
    description: 'Composição de custos e margem comercial por produto.',
    href: '/vendas/analise-custos',
    icon: BarChart3,
  },
]

export default function VendasCentral() {
  const [company, setCompany] = useState<Company | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const companyId = await supabase.rpc('erp_current_empresa_id')
      if (companyId.error || !companyId.data) {
        throw companyId.error ?? new Error('Empresa ERP não identificada.')
      }

      const id = String(companyId.data)

      const [companyResult, ordersResult, clientsResult] = await Promise.all([
        supabase
          .from('erp_empresas')
          .select('nome_fantasia,razao_social')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('erp_pedidos_venda')
          .select('id,numero,status,total,data_entrega_prometida,cliente_id')
          .eq('empresa_id', id)
          .order('numero', { ascending: false })
          .limit(500),
        supabase
          .from('erp_clientes')
          .select('id,nome')
          .eq('empresa_id', id)
          .eq('ativo', true)
          .limit(3000),
      ])

      if (companyResult.error) throw companyResult.error
      if (ordersResult.error) throw ordersResult.error
      if (clientsResult.error) throw clientsResult.error

      const clients = new Map(
        (clientsResult.data ?? []).map(client => [String(client.id), String(client.nome)]),
      )

      setCompany((companyResult.data ?? null) as Company | null)
      setOrders(
        (ordersResult.data ?? []).map(order => ({
          ...order,
          cliente_nome: clients.get(String(order.cliente_id)) ?? 'Cliente não identificado',
        })) as Order[],
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o módulo de Vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const metrics = useMemo(() => {
    const active = orders.filter(order => !['faturado', 'cancelado'].includes(normalizeStatus(order.status)))
    const production = orders.filter(order => normalizeStatus(order.status) === 'necessita_producao')
    const openValue = active.reduce((sum, order) => sum + Number(order.total || 0), 0)
    return {
      total: orders.length,
      active: active.length,
      production: production.length,
      openValue,
    }
  }, [orders])

  const open = (href: string) => {
    window.location.assign(href)
  }

  return (
    <main className="min-h-screen bg-[#F4FBFD] text-[#17333F]">
      <header className="sticky top-0 z-30 border-b border-[#CFE1E7] bg-white">
        <div className="mx-auto flex min-h-[82px] max-w-[1700px] items-center justify-between gap-5 px-5 lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2D8DB8]">
              ERP INDUSTRIAL • VENDAS
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#123B50]">Central Comercial</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {company?.nome_fantasia || company?.razao_social || 'Empresa ERP'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            ATUALIZAR
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1700px] space-y-5 px-5 py-6 lg:px-8">
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pedidos na carteira" value={String(metrics.total)} icon={<ClipboardList size={20} />} />
          <Metric label="Pedidos em processamento" value={String(metrics.active)} icon={<ShoppingCart size={20} />} />
          <Metric label="Necessidade de produção" value={String(metrics.production)} icon={<PackagePlus size={20} />} />
          <Metric label="Valor em processamento" value={money(metrics.openValue)} icon={<BarChart3 size={20} />} />
        </div>

        <section className="rounded-lg border border-[#CFE1E7] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2D8DB8]">
                Operação comercial
              </p>
              <h2 className="mt-1 text-xl font-black text-[#123B50]">Acessar Vendas</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Cada acesso abre a tela operacional correspondente e usa os dados reais da empresa.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {views.map(view => {
              const Icon = view.icon
              return (
                <button
                  key={view.href}
                  type="button"
                  onClick={() => open(view.href)}
                  className="group min-h-[154px] rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2D8DB8] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#48B7C7]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#E7F5FA] text-[#176487]">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-base font-black text-[#123B50]">{view.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{view.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-[#CFE1E7] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2D8DB8]">
                Carteira recente
              </p>
              <h2 className="mt-1 text-xl font-black text-[#123B50]">Últimos pedidos</h2>
            </div>
            <button
              type="button"
              onClick={() => open('/vendas/carteira')}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2D8DB8] px-4 text-sm font-black text-white hover:bg-[#24789B]"
            >
              <ClipboardList size={17} />
              ABRIR CARTEIRA
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#F4FBFD] text-[11px] font-black uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left">Pedido</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-center">Entrega</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map(order => {
                  const key = normalizeStatus(order.status)
                  return (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-black">PV-{String(order.numero).padStart(6, '0')}</td>
                      <td className="px-5 py-3 font-semibold">{order.cliente_nome}</td>
                      <td className="px-5 py-3 text-center">{date(order.data_entrega_prometida)}</td>
                      <td className="px-5 py-3 text-right font-black">{money(order.total)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${statusClass[key] ?? 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                          {statusLabel[key] ?? order.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!loading && !orders.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center font-semibold text-slate-500">
                      Nenhum pedido real encontrado para a empresa atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-center justify-end gap-2 pb-4">
          <button
            type="button"
            onClick={() => open('/vendas/configuracoes')}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-700"
          >
            <Settings size={17} />
            CONFIGURAÇÕES
          </button>
        </footer>
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[#CFE1E7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#E7F5FA] text-[#176487]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-black text-[#123B50]">{value}</p>
    </div>
  )
}
