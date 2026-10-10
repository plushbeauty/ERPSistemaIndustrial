import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Lock, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type Plan = 'BASICO' | 'OURO' | 'DIAMANTE'
type PlanState = { plan: Plan | null; loading: boolean; error: string | null }

const rank: Record<Plan, number> = { BASICO: 1, OURO: 2, DIAMANTE: 3 }

function normalizePlan(value: unknown): Plan | null {
  const plan = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  if (plan.includes('DIAMANTE') || plan.includes('DIAMOND') || plan.includes('ENTERPRISE')) return 'DIAMANTE'
  if (plan.includes('OURO') || plan.includes('GOLD') || plan.includes('PROFISSIONAL') || plan.includes('PROFESSIONAL') || plan === 'PRO' || plan.includes('PREMIUM')) return 'OURO'
  if (plan.includes('BASICO') || plan.includes('BASIC') || plan.includes('ESSENCIAL') || plan.includes('ESSENTIAL') || plan === 'STARTER') return 'BASICO'
  return null
}

function requiredPlan(path: string): Plan {
  path = path.replace(/\/+$/, '') || '/'
  if (path === '/qualidade/inspecoes') return 'BASICO'

  const goldRoutes = [
    '/qualidade/especificacoes', '/qualidade/fmea', '/qualidade/pfmea', '/qualidade/rnc-capa',
    '/engenharia/bom', '/pcp/engenharia-bom', '/pcp/ordens', '/pcp/ordens-industriais',
    '/pcp/apontamentos',
  ]
  if (goldRoutes.includes(path)) return 'OURO'

  // Premium features are Diamond by default, including GED/CEP, advanced Quality,
  // machine scheduling, process sheets, Fiscal/Costs and Industrial HR.
  if (
    path.startsWith('/qualidade/') ||
    path === '/qualidade' ||
    path.startsWith('/pcp') ||
    path.startsWith('/engenharia') ||
    path.startsWith('/fiscal') ||
    path.startsWith('/financeiro') ||
    path.startsWith('/rh') ||
    ['/central-custos-industrial', '/custos', '/vendas/fiscal', '/vendas/rh', '/vendas/engenharia'].includes(path)
  ) return 'DIAMANTE'

  return 'BASICO'
}

export default function QualityPlanGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<PlanState>({ plan: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    async function loadPlan() {
      setState({ plan: null, loading: true, error: null })
      try {
        const session = await supabase.auth.getSession()
        if (session.error) throw session.error
        if (!session.data.session) throw new Error('Sessão autenticada não encontrada.')
        const company = await supabase.rpc('erp_current_empresa_id')
        if (company.error) throw company.error
        if (!company.data) throw new Error('A sessão não possui empresa vinculada.')
        const result = await supabase.from('erp_empresas').select('plano,plan_type').eq('id', company.data).maybeSingle()
        if (result.error) throw result.error
        if (!result.data) throw new Error('Plano da empresa não encontrado.')
        const plan = normalizePlan(result.data.plano) ?? normalizePlan(result.data.plan_type)
        if (!plan) throw new Error('Plano da empresa não está mapeado. Solicite a revisão da assinatura ao administrador.')
        if (active) setState({ plan, loading: false, error: null })
      } catch (cause) {
        if (active) setState({ plan: null, loading: false, error: cause instanceof Error ? cause.message : 'Não foi possível validar o plano da empresa.' })
      }
    }
    void loadPlan()
    return () => { active = false }
  }, [location.pathname])

  if (state.loading) return <div className="grid min-h-[45vh] place-items-center bg-[#F4FBFD]"><div className="border border-slate-200 bg-white px-5 py-4 text-[10px] text-slate-600"><span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-700 border-t-transparent align-middle" />VALIDANDO PLANO SAAS E PERMISSÕES…</div></div>

  if (state.error || !state.plan) return <div className="grid min-h-[45vh] place-items-center bg-[#F4FBFD] p-4"><section role="alert" className="w-full max-w-xl border border-amber-300 bg-white p-5"><div className="mb-2 flex items-center gap-2 text-amber-800"><ShieldCheck size={16}/><strong className="text-[11px] uppercase">Validação de plano indisponível</strong></div><p className="text-[11px] text-slate-600">{state.error ?? 'Não foi possível validar a assinatura.'}</p><button className="mt-3 h-[30px] border border-slate-300 px-3 text-[10px] font-bold" onClick={() => window.location.reload()}>TENTAR NOVAMENTE</button></section></div>

  const required = requiredPlan(location.pathname)
  if (rank[state.plan] >= rank[required]) return <>{children}</>

  return <div className="grid min-h-[calc(100vh-48px)] place-items-center bg-[#F4FBFD] p-4">
    <section className="w-full max-w-lg border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur-md">
      <div className="mx-auto mb-3 grid size-11 place-items-center border border-sky-100 bg-sky-50 text-[#2D8DB8]"><Lock size={14}/></div>
      <p className="text-center text-[9px] font-bold uppercase tracking-[.18em] text-[#2D8DB8]">SGQ · CONTROLE DE ACESSO</p>
      <h1 className="mt-2 text-center text-lg font-semibold text-[#123B50]">Recurso disponível no plano {required}</h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-[11px] leading-5 text-slate-600">O plano atual da empresa é <strong>{state.plan}</strong>. Faça o upgrade para liberar este módulo e manter os controles de acesso vinculados à assinatura da empresa.</p>
      <div className="mt-5 flex justify-center"><button onClick={() => navigate('/planos')} className="inline-flex h-[30px] items-center gap-2 bg-[#2D8DB8] px-4 text-[10px] font-bold uppercase text-white hover:bg-[#236f91]">Solicitar upgrade <ArrowUpRight size={14}/></button></div>
    </section>
  </div>
}
