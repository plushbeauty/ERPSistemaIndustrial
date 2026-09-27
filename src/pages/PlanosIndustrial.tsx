import { ArrowLeft, ArrowRight, Check, Factory, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type PlanResource = { features?: string[] }
type PlanModule = {
  plano_codigo: string
  modulo_codigo: string
  modulo_nome: string
  recursos: PlanResource | null
}
type Plan = {
  codigo: string
  nome: string
  preco_mensal: number
  descricao: string
  modulos: string[]
  recursos: string[]
}

const moduleLabels: Record<string, string> = {
  pcp: 'PCP e Produção',
  estoque: 'Estoque e Materiais',
  recebimento: 'Recebimento de Materiais',
  qualidade: 'Qualidade',
  manutencao: 'Manutenção',
  fiscal: 'Financeiro e Fiscal',
  indicadores: 'Indicadores',
  engenharia: 'Engenharia e BOM',
  compras: 'Compras e Fornecedores',
  clientes: 'Clientes',
  rastreabilidade: 'Rastreabilidade',
  custos: 'Custos Industriais',
  expedicao: 'Expedição',
  fmea: 'FMEA e Risco',
  rh: 'RH e Competências',
  injecao: 'Injeção Plástica',
  prensados: 'Prensados',
  estamparia: 'Estamparia',
  ferramentaria: 'Ferramentaria',
  extrusao: 'Extrusão',
  usinagem: 'Usinagem',
  soldagem: 'Soldagem',
  montagem: 'Montagem',
  corte: 'Corte e Preparação',
  pintura: 'Pintura e Acabamento',
  'sgq-tpm': 'SGQ Avançado e TPM',
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function resourceFeatures(resources: PlanModule['recursos']): string[] {
  return Array.isArray(resources?.features) ? resources.features.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

export default function PlanosIndustrial() {
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const module = params.get('modulo') ?? ''
  const moduleName = moduleLabels[module] ?? ''
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState(params.get('plano') ?? 'profissional')
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')

  const load = async () => {
    setStatus('loading')
    setError('')

    try {
      const [plansResult, modulesResult] = await Promise.all([
        supabase
          .from('erp_planos_catalogo')
          .select('codigo,nome,preco_mensal,descricao,ordem')
          .eq('ativo', true)
          .order('ordem'),
        supabase
          .from('erp_plano_modulos')
          .select('plano_codigo,modulo_codigo,modulo_nome,recursos')
          .eq('acesso', true)
          .order('modulo_nome'),
      ])

      if (plansResult.error) throw plansResult.error
      if (modulesResult.error) throw modulesResult.error

      const moduleRows = (modulesResult.data ?? []) as PlanModule[]
      const rows = (plansResult.data ?? []).map((plan) => {
        const modules = moduleRows.filter((item) => item.plano_codigo === plan.codigo)
        return {
          codigo: plan.codigo,
          nome: plan.nome,
          preco_mensal: Number(plan.preco_mensal),
          descricao: plan.descricao ?? '',
          modulos: modules.map((item) => item.modulo_codigo),
          recursos: modules.flatMap((item) => resourceFeatures(item.recursos)),
        }
      })

      setPlans(rows)
      if (rows.length === 0) {
        setStatus('empty')
        return
      }
      if (!rows.some((plan) => plan.codigo === selected)) setSelected(rows[0].codigo)
      setStatus('success')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Falha técnica ao carregar o catálogo comercial do Supabase.')
    }
  }

  useEffect(() => {
    void load()
  }, [location.search])

  const current = plans.find((plan) => plan.codigo === selected) ?? plans[0]
  const included = (plan: Plan) => (module ? plan.modulos.includes(module) : true)
  const href = (plan: string) =>
    '/cadastro-empresa?plano=' +
    encodeURIComponent(plan) +
    (module ? '&modulo=' + encodeURIComponent(module) : '')

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <a
          className="inline-flex min-h-[54px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 hover:bg-slate-100"
          href={module ? '/modulos/' + module : '/'}
        >
          <ArrowLeft size={17} /> {module ? 'Voltar ao módulo' : 'Voltar ao site'}
        </a>

        <header className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">SGQ ERP INDUSTRIAL · PLANOS</span>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Planos carregados do catálogo comercial</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                Compare a composição atualmente cadastrada no banco ERP. Recursos e valores exibidos abaixo são lidos do catálogo ativo.
              </p>
            </div>
            <a
              href="/cadastro-empresa"
              className="inline-flex min-h-[54px] items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700"
            >
              Configurar empresa <ArrowRight className="ml-2" size={17} />
            </a>
          </div>
        </header>

        {moduleName && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
            <Factory size={22} />
            <div>
              <small className="block text-xs font-black uppercase tracking-wide text-blue-700">MÓDULO SELECIONADO</small>
              <strong className="text-base">{moduleName}</strong>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8" aria-live="polite">
            <div className="flex items-center gap-3 text-slate-700">
              <RefreshCw className="animate-spin" size={20} />
              <strong>LOADING · Carregando composição comercial real do Supabase…</strong>
            </div>
          </section>
        )}

        {status === 'error' && (
          <section className="mt-6 rounded-2xl border border-rose-300 bg-white p-8" role="alert">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-rose-700" size={22} />
              <div>
                <strong className="text-rose-900">ERROR · Falha técnica do Supabase</strong>
                <p className="mt-2 break-words text-sm text-slate-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 inline-flex min-h-[54px] items-center gap-2 rounded-lg bg-rose-600 px-4 font-black text-white hover:bg-rose-700"
                >
                  <RefreshCw size={17} /> Tentar novamente
                </button>
              </div>
            </div>
          </section>
        )}

        {status === 'empty' && (
          <section className="mt-6 rounded-2xl border border-amber-300 bg-white p-8" role="status">
            <strong className="text-slate-950">EMPTY · Nenhum plano comercial ativo foi encontrado.</strong>
            <p className="mt-2 text-sm text-slate-700">A tela não apresenta preços fictícios. Cadastre um plano no catálogo ERP para disponibilizá-lo.</p>
          </section>
        )}

        {status === 'success' && (
          <>
            <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const isEnterpriseGold = plan.codigo === 'enterprise_gold'
                const isSelected = selected === plan.codigo

                return (
                  <article
                    key={plan.codigo}
                    className={[
                      'flex min-h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition',
                      isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200',
                      isEnterpriseGold ? 'shadow-xl shadow-slate-900/10' : '',
                    ].join(' ')}
                  >
                    <div className="flex min-h-[54px] items-start justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">PLANO SGQ ERP</span>
                      <button
                        type="button"
                        onClick={() => setSelected(plan.codigo)}
                        aria-pressed={isSelected}
                        className={[
                          'min-h-[54px] rounded-lg border px-3 text-xs font-black',
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </button>
                    </div>

                    {isEnterpriseGold && (
                      <span className="mt-4 inline-flex w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
                        ✨ NOVO: MÓDULO SGQ AVANÇADO E TPM
                      </span>
                    )}

                    <h2 className="mt-4 text-2xl font-black text-slate-950">{plan.nome}</h2>
                    <div className="mt-3 text-3xl font-black text-slate-950">
                      {money(plan.preco_mensal)}
                      <small className="ml-1 text-sm font-bold text-slate-500">/mês</small>
                    </div>
                    <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-700">{plan.descricao}</p>

                    {moduleName && (
                      <div className="mt-4 flex min-h-[54px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black">
                        {included(plan) ? <Check className="text-emerald-700" size={17} /> : <Wrench className="text-slate-500" size={17} />}
                        <span className={included(plan) ? 'text-emerald-900' : 'text-slate-700'}>
                          {included(plan) ? 'Incluído neste plano' : 'Não incluído neste plano'}
                        </span>
                      </div>
                    )}

                    <ul className="mt-5 space-y-2 border-t border-slate-200 pt-5">
                      {plan.modulos.map((modulo) => (
                        <li key={modulo} className="flex min-h-[54px] items-center gap-2 border-b border-slate-100 text-sm font-bold text-slate-800">
                          <Check className="shrink-0 text-blue-700" size={17} />
                          <span>{moduleLabels[modulo] ?? modulo}</span>
                        </li>
                      ))}
                    </ul>

                    {isEnterpriseGold && plan.recursos.length > 0 && (
                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Rastreabilidade e recursos</h3>
                        <ul className="mt-2 space-y-2">
                          {plan.recursos.map((feature) => (
                            <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-800">
                              <Check className="mt-1 shrink-0 text-emerald-700" size={15} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <a
                      className="mt-auto inline-flex min-h-[54px] items-center justify-center rounded-lg bg-blue-600 px-4 pt-4 text-sm font-black text-white hover:bg-blue-700"
                      href={href(plan.codigo)}
                    >
                      Escolher {plan.nome} <ArrowRight className="ml-2" size={17} />
                    </a>
                  </article>
                )
              })}
            </section>

            {current && (
              <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <small className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">SUCCESS · SUA ESCOLHA</small>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{current.nome} · {money(current.preco_mensal)}/mês</h2>
                  <p className="mt-1 text-sm text-slate-700">
                    {moduleName
                      ? included(current)
                        ? 'O módulo selecionado está incluído na composição atual.'
                        : 'O módulo selecionado não está incluído na composição atual.'
                      : 'A composição é lida diretamente do catálogo comercial.'}
                  </p>
                </div>
                <a href={href(current.codigo)} className="inline-flex min-h-[54px] items-center justify-center rounded-lg bg-blue-600 px-5 font-black text-white hover:bg-blue-700">
                  Continuar para cadastro <ArrowRight className="ml-2" size={17} />
                </a>
              </section>
            )}
          </>
        )}

        <p className="mt-6 text-xs font-bold text-slate-500">
          DISABLED · Durante uma ação de atualização, controles de seleção e gravação devem permanecer desativados para evitar duplicidade.
        </p>
      </div>
    </main>
  )
}
