import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Factory,
  LogOut,
  PackageSearch,
  ShoppingCart,
  Wrench,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Profile = { nome: string | null; perfil: string | null }
type Metric = { value: number | null; label: string }

const tabletIconAssets = import.meta.glob(
  '../assets/icones-tablet/*.{svg,png,webp,jpg,jpeg}',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function resolveIcon(name: string) {
  const wanted = normalize(name)
  const entry = Object.entries(tabletIconAssets).find(([path]) => {
    const file = normalize(path.split('/').pop()?.replace(/\\.[^.]+$/, '') ?? '')
    return file === wanted || file.startsWith(`${wanted}_`)
  })
  return entry?.[1] ?? null
}

async function countRows(table: string, empresaId: string) {
  const result = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)

  return result.error ? null : result.count ?? 0
}

export default function TabletDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [now, setNow] = useState(new Date())
  const [metrics, setMetrics] = useState<Record<string, Metric>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    void (async () => {
      const auth = await supabase.auth.getUser()
      if (!auth.data.user) {
        location.href = '/login?returnTo=/tablet/dashboard'
        return
      }

      const profileResult = await supabase
        .from('erp_usuarios')
        .select('nome,perfil,empresa_id')
        .eq('auth_user_id', auth.data.user.id)
        .eq('ativo', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (profileResult.error || !profileResult.data?.empresa_id) {
        setError(profileResult.error?.message ?? 'Empresa não identificada.')
        return
      }

      const empresaId = profileResult.data.empresa_id
      setProfile({
        nome: profileResult.data.nome ?? 'Usuário',
        perfil: profileResult.data.perfil ?? '',
      })

      const [orders, ops, rncs, lots, products, machines] = await Promise.all([
        countRows('erp_pedidos_venda', empresaId),
        countRows('erp_ordens_producao', empresaId),
        countRows('erp_rncs', empresaId),
        countRows('erp_estoque_lotes', empresaId),
        countRows('erp_produtos', empresaId),
        countRows('erp_maquinas', empresaId),
      ])

      setMetrics({
        vendas: { value: orders, label: 'Pedidos na carteira' },
        pcp: { value: ops, label: 'Ordens de produção' },
        qualidade: { value: rncs, label: 'RNCs registradas' },
        estoque: { value: lots, label: 'Lotes em estoque' },
        produtos: { value: products, label: 'Produtos cadastrados' },
        maquinas: { value: machines, label: 'Máquinas cadastradas' },
      })
    })()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    location.href = '/login'
  }

  const workspaces = [
    {
      key: 'vendas',
      icon: 'vendas',
      title: 'COMERCIAL / VENDAS',
      description: 'Pedidos, carteira e acompanhamento comercial.',
      metric: metrics.vendas,
      fallback: <ShoppingCart size={30} />,
      links: [
        ['Novo Pedido', '/comercial?view=pedido'],
        ['Carteira de Pedidos', '/comercial?view=carteira'],
      ],
    },
    {
      key: 'pcp',
      icon: 'pcp',
      title: 'PCP CENTRAL',
      description: 'Ordens, demanda, materiais e paradas.',
      metric: metrics.pcp,
      fallback: <Factory size={30} />,
      links: [
        ['Ordens de Produção', '/pcp/ordens'],
        ['Demanda', '/pcp/demanda'],
        ['Materiais', '/pcp/materiais'],
        ['Paradas', '/pcp/paradas'],
      ],
    },
    {
      key: 'qualidade',
      icon: 'qualidade',
      title: 'QUALIDADE / SGQ',
      description: 'RNC, auditorias e documentos do sistema da qualidade.',
      metric: metrics.qualidade,
      fallback: <ClipboardCheck size={30} />,
      links: [
        ['RNC', '/qualidade/rnc'],
        ['Metodologia 8D', '/qualidade/metodologia-8d'],
        ['Auditoria 5S', '/qualidade/auditoria-5s'],
        ['Lista Mestre', '/qualidade/lista-mestre'],
      ],
    },
    {
      key: 'estoque',
      icon: 'estoque',
      title: 'ESTOQUE / ALMOXARIFADO',
      description: 'Saldos, ajustes, separação e etiquetas.',
      metric: metrics.estoque,
      fallback: <Boxes size={30} />,
      links: [
        ['Saldos', '/estoque/saldos'],
        ['Ajustes', '/estoque/ajustes'],
        ['Separação', '/estoque/separacao'],
        ['Etiquetas', '/estoque/etiquetas'],
      ],
    },
    {
      key: 'compras',
      icon: 'compras',
      title: 'COMPRAS',
      description: 'Fornecedores e solicitações de compra.',
      fallback: <PackageSearch size={30} />,
      links: [
        ['Fornecedores', '/compras/fornecedores'],
        ['Solicitação Manual', '/compras/solicitacao-manual'],
        ['Solicitação de Compra', '/solicitacao-compra'],
      ],
    },
    {
      key: 'financeiro',
      icon: 'financeiro',
      title: 'FINANCEIRO',
      description: 'Custos e análise financeira operacional.',
      fallback: <BarChart3 size={30} />,
      links: [
        ['Custo Padrão', '/financeiro/custo-padrao'],
        ['Gráfico de Desvios', '/financeiro/grafico-desvios'],
      ],
    },
    {
      key: 'manutencao',
      icon: 'manutencao',
      title: 'MANUTENÇÃO',
      description: 'Ordens de manutenção e acompanhamento de ativos.',
      fallback: <Wrench size={30} />,
      links: [['Ordens de Manutenção', '/manutencao/ordens']],
    },
    {
      key: 'engenharia',
      icon: 'engenharia',
      title: 'ENGENHARIA',
      description: 'Fichas técnicas e documentação de processo.',
      fallback: <PackageSearch size={30} />,
      links: [
        ['Engenharia', '/engenharia'],
        ['Ficha de Engenharia', '/engenharia/ficha'],
        ['Fichas de Processo', '/engenharia/fichas-processo'],
      ],
    },
    {
      key: 'fiscal',
      icon: 'fiscal',
      title: 'FISCAL',
      description: 'Operações fiscais e carteira de documentos.',
      fallback: <ClipboardCheck size={30} />,
      links: [
        ['Fiscal', '/fiscal'],
        ['Carteira NF-e', '/fiscal/carteira'],
        ['Previsão de Caixa', '/fiscal/previsao-caixa'],
      ],
    },
  ] as const

  const iconMap = useMemo(
    () => Object.fromEntries(workspaces.map(workspace => [workspace.key, resolveIcon(workspace.icon)])),
    [workspaces],
  )

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4">
          <img
            src="/logo/sgq-erp.png"
            className="h-[64px] w-[64px] shrink-0 rounded-md bg-white object-contain"
            alt="SYNQRA ERP Industrial"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-black text-[#123B50]">PAINEL OPERACIONAL</h1>
            <p className="text-sm font-bold text-slate-500">
              {now.toLocaleDateString('pt-BR')} • {now.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-[#123B50] md:inline-flex">
              {profile?.nome ?? 'Usuário'} • {profile?.perfil ?? 'Perfil'}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-11 items-center gap-2 rounded-md bg-[#123B50] px-4 text-sm font-black text-white"
            >
              <LogOut size={18} /> SAIR
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-4 py-5 lg:px-8">
        <div className="mb-5 flex items-center gap-3">
          <BarChart3 size={26} className="text-[#2D8DB8]" />
          <div>
            <h2 className="text-2xl font-black text-[#123B50]">WORKSPACES OPERACIONAIS</h2>
            <p className="font-semibold text-slate-500">
              Acesso direto aos módulos. Indicadores exibidos somente quando vêm do banco real.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-md border border-rose-300 bg-rose-50 p-4 font-bold text-rose-800">
            <AlertTriangle className="mr-2 inline" size={18} /> {error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          {workspaces.map(workspace => (
            <article
              key={workspace.key}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-blue-100 bg-white p-2 text-blue-700">
                  {iconMap[workspace.key] ? (
                    <img
                      src={iconMap[workspace.key]}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    workspace.fallback
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-[#123B50]">{workspace.title}</h3>
                  <p className="text-sm font-semibold text-slate-500">{workspace.description}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {workspace.links.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center rounded-md border border-blue-100 bg-white px-3 text-sm font-black text-blue-700 hover:bg-blue-50"
                  >
                    {label}
                  </a>
                ))}
              </div>

              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                {workspace.metric ? (
                  <>
                    <strong className="block text-2xl font-black text-[#123B50]">
                      {workspace.metric.value == null ? '—' : workspace.metric.value}
                    </strong>
                    <span className="text-xs font-bold text-slate-500">{workspace.metric.label}</span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-500">Acesso operacional disponível</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <PackageSearch className="text-[#2D8DB8]" />
            <strong className="mt-2 block text-2xl font-black text-[#123B50]">
              {metrics.produtos?.value == null ? '—' : metrics.produtos.value}
            </strong>
            <span className="text-sm font-bold text-slate-500">Produtos cadastrados</span>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Wrench className="text-[#2D8DB8]" />
            <strong className="mt-2 block text-2xl font-black text-[#123B50]">
              {metrics.maquinas?.value == null ? '—' : metrics.maquinas.value}
            </strong>
            <span className="text-sm font-bold text-slate-500">Máquinas cadastradas</span>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <ShoppingCart className="text-[#2D8DB8]" />
            <strong className="mt-2 block text-2xl font-black text-[#123B50]">
              {metrics.vendas?.value == null ? '—' : metrics.vendas.value}
            </strong>
            <span className="text-sm font-bold text-slate-500">Pedidos na carteira</span>
          </article>
        </div>
      </section>
    </main>
  )
}
