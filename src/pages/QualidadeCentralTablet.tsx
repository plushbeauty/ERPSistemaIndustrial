/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_APROVACAO: CENTRAL-TABLET-HIGH-DENSITY-STEEL-BLUE
 * @REVISAO: Bento grid compacto, indicadores consultados no Supabase e navegação SGQ.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertOctagon, BookOpenCheck, CheckCircle2, ClipboardCheck, ClipboardList,
  FileCheck2, FileText, Gauge, GitBranch, ListChecks, Microscope, Radio, RefreshCw,
  SearchCheck, Shield, ShieldAlert, ShieldCheck, Target, Wrench, Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type QualityModule = {
  label: string
  description: string
  route: string
  icon: LucideIcon
  badge?: string
  badgeColor?: string
}

type Metric = {
  label: string
  value: string
  detail: string
  tone: 'green' | 'amber' | 'red' | 'blue'
  icon: LucideIcon
}

const qualityModules: readonly QualityModule[] = [
  { label: 'Inspeções de lotes', description: 'Amostragem, resultados e laudos analíticos de insumos.', route: '/qualidade/inspecoes', icon: ClipboardCheck },
  { label: 'Inspeção em processo', description: 'Verificações dimensionais durante a produção.', route: '/qualidade/inspecao-processo', icon: Microscope, badge: 'PCP' },
  { label: 'Especificações técnicas', description: 'Consulta de critérios, tolerâncias e revisões vigentes.', route: '/qualidade/especificacoes', icon: FileCheck2 },
  { label: 'Liberação de lotes', description: 'Decisões de aprovação e integração de saldo.', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
  { label: 'Quarentena de lotes', description: 'Materiais retidos e isolamento de carga.', route: '/qualidade/quarentena', icon: ShieldAlert, badge: 'Retido', badgeColor: 'border-red-900 bg-red-950 text-red-300' },
  { label: 'Genealogia de lotes', description: 'Rastreabilidade reversa e vínculos de insumos.', route: '/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'Sala RNC / RPNC', description: 'Contenção, investigação e acompanhamento de ocorrências.', route: '/qualidade/sala-rnc', icon: ClipboardList },
  { label: 'Cadastro de RNC', description: 'Abertura e acompanhamento de não conformidades.', route: '/qualidade/rnc', icon: Shield },
  { label: 'Ishikawa — causa raiz', description: 'Investigação de causas pelo método 6M.', route: '/qualidade/ishikawa', icon: Workflow },
  { label: 'Plano CAPA / 5W2H', description: 'Ações corretivas, preventivas e responsáveis.', route: '/qualidade/capa', icon: ListChecks },
  { label: 'Metodologia 8D', description: 'Resolução estruturada de problemas em oito disciplinas.', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA / PFMEA', description: 'Matriz de risco de produto e processo.', route: '/qualidade/pfmea', icon: Activity },
  { label: 'Documentos controlados', description: 'Documentos do SGQ, revisões e vigência.', route: '/qualidade/ged-documentos', icon: FileText },
  { label: 'Procedimentos e PDFs', description: 'Manuais técnicos e instruções operacionais.', route: '/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestre', description: 'Índice controlado da documentação interna.', route: '/qualidade/lista-mestre', icon: FileText },
  { label: 'Auditoria 5S', description: 'Organização, disciplina e melhoria contínua.', route: '/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'CEP / Cartas de controle', description: 'Monitoramento estatístico e desvios de processo.', route: '/qualidade/cep', icon: Activity },
  { label: 'Metrologia e calibração', description: 'Rastreabilidade de instrumentos e prazos de calibração.', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Instruções de trabalho', description: 'Padrões operacionais de execução de processos.', route: '/qualidade/editor-it', icon: ClipboardCheck },
  { label: 'Relatórios do SGQ', description: 'Consultas e dossiês consolidados da Qualidade.', route: '/qualidade/relatorios-documentos', icon: FileText },
]

const toneClasses = {
  green: 'border-l-emerald-500 text-emerald-300',
  amber: 'border-l-amber-500 text-amber-300',
  red: 'border-l-red-500 text-red-300',
  blue: 'border-l-sky-500 text-sky-300',
} as const

const metricIcons = {
  green: ShieldCheck,
  amber: Gauge,
  red: AlertOctagon,
  blue: Wrench,
} as const

export default function QualidadeCentralTablet() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'Inspeções registradas', value: '—', detail: 'Aguardando consulta', tone: 'green', icon: ShieldCheck },
    { label: 'RNC em aberto', value: '—', detail: 'Aguardando consulta', tone: 'amber', icon: Gauge },
    { label: 'Análises FMEA', value: '—', detail: 'Aguardando consulta', tone: 'red', icon: AlertOctagon },
    { label: 'Calibrações em 30 dias', value: '—', detail: 'Aguardando consulta', tone: 'blue', icon: Wrench },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw new Error('Empresa da sessão autenticada não identificada.')
      const empresaId = String(tenant.data)
      const today = new Date()
      const horizon = new Date(today)
      horizon.setDate(horizon.getDate() + 30)
      const todayISO = today.toISOString().slice(0, 10)
      const horizonISO = horizon.toISOString().slice(0, 10)

      const [inspections, rncs, fmeas, calibrations] = await Promise.all([
        supabase.from('qualidade_inspecoes').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('erp_rncs').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).not('status', 'in', '(ENCERRADA,CANCELADA,FECHADA)'),
        supabase.from('qualidade_fmea').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('erp_equipamentos_medicao').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).gte('proxima_calibracao', todayISO).lte('proxima_calibracao', horizonISO),
      ])
      const failed = [inspections, rncs, fmeas, calibrations].filter(result => result.error)
      if (failed.length === 4) throw new Error('Não foi possível consultar os indicadores do SGQ no banco de dados.')
      setMetrics([
        { label: 'Inspeções registradas', value: inspections.error ? '—' : String(inspections.count ?? 0), detail: inspections.error ? 'Consulta indisponível' : 'Registros da empresa', tone: 'green', icon: ShieldCheck },
        { label: 'RNC em aberto', value: rncs.error ? '—' : String(rncs.count ?? 0), detail: rncs.error ? 'Consulta indisponível' : 'Ocorrências não encerradas', tone: 'amber', icon: Gauge },
        { label: 'Análises FMEA', value: fmeas.error ? '—' : String(fmeas.count ?? 0), detail: fmeas.error ? 'Consulta indisponível' : 'Análises cadastradas', tone: 'red', icon: AlertOctagon },
        { label: 'Calibrações em 30 dias', value: calibrations.error ? '—' : String(calibrations.count ?? 0), detail: calibrations.error ? 'Consulta indisponível' : 'Prazos até os próximos 30 dias', tone: 'blue', icon: Wrench },
      ])
      if (failed.length) setError('Alguns indicadores não puderam ser consultados. Os campos indisponíveis aparecem como —.')
      setLastUpdated(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao sincronizar indicadores do SGQ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadMetrics() }, [loadMetrics])

  return (
    <main className="min-h-screen bg-[#0E1E2F] p-3 text-[#F4FBFD] antialiased sm:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3.5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E4A62] pb-3.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#48B7C7]">MOLDPLÁS ERP · CONSOLE CENTRAL DO TABLET</p>
            <h1 className="text-base font-black uppercase tracking-tight text-white">Sistema de Gestão da Qualidade Mestre</h1>
            <p className="text-[10px] font-medium text-slate-400">Monitoramento dos registros de inspeção, não conformidade, risco e metrologia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-[#2E4A62] bg-[#071522] px-3 text-[10px] font-bold text-[#48B7C7] shadow-inner">
              <Radio size={12} className={loading ? 'animate-pulse text-amber-400' : 'text-emerald-500'} />
              <span className="font-mono text-slate-300">{loading ? 'SINCRONIZANDO SGQ' : 'SESSÃO / TENANT'}</span>
            </div>
            <button type="button" onClick={() => void loadMetrics()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#2E4A62] bg-[#123B50] px-2.5 text-[9px] font-black uppercase text-white hover:border-[#48B7C7] disabled:cursor-wait disabled:opacity-60">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="status" className="border border-amber-800 bg-[#2B2113] px-3 py-2 text-[10px] font-bold text-amber-300">{error}</div>}

        <section aria-label="Indicadores operacionais do SGQ" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className={`flex min-h-[82px] min-w-0 items-center justify-between gap-2 border border-[#2E4A62] border-l-4 bg-[#0D2638] p-3 shadow-sm ${toneClasses[metric.tone]}`}>
                <div className="min-w-0">
                  <span className="block text-[8px] font-black uppercase tracking-wide text-slate-400">{metric.label}</span>
                  <strong className="mt-1 block font-mono text-lg font-black text-white">{metric.value}</strong>
                  <span className="block text-[9px] text-slate-400">{metric.detail}</span>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#2E4A62] bg-[#071522]">
                  <Icon size={15} />
                </span>
              </article>
            )
          })}
        </section>

        <section className="border border-[#2E4A62] bg-[#0D2638] p-3.5 shadow-2xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#2E4A62]/60 pb-2">
            <div className="space-y-0.5">
              <h2 className="text-[11px] font-black uppercase tracking-wide text-white">Módulos de conformidade e rastreabilidade</h2>
              <p className="text-[9px] font-medium text-slate-400">Atalhos operacionais do SGQ com grade responsiva de alta densidade.</p>
            </div>
            <span className="shrink-0 border border-[#2E4A62] bg-[#071522] px-2.5 py-1 text-[8px] font-black text-[#48B7C7]">20 MÓDULOS</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {qualityModules.map(({ label, description, route, icon: Icon, badge, badgeColor }) => (
              <Link key={route} to={route} className="group relative flex min-h-[100px] min-w-0 flex-col justify-between border border-[#2E4A62] bg-[#071522] p-2.5 shadow-sm transition-colors hover:border-[#48B7C7] hover:bg-[#123B50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48B7C7]">
                <div className="flex w-full min-w-0 items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#2E4A62] bg-[#0D2638] text-[#48B7C7] transition-colors group-hover:border-[#48B7C7]">
                    <Icon size={14} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-[10px] font-black uppercase leading-tight tracking-wide text-white transition-colors group-hover:text-[#48B7C7]">{label}</span>
                    <span className="line-clamp-2 block text-[9px] leading-[1.35] text-slate-400">{description}</span>
                  </span>
                </div>
                {badge && <span className={`absolute bottom-2 right-2 border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badgeColor ?? 'border-sky-800 bg-sky-950 text-sky-300'}`}>{badge}</span>}
                <span className="mt-2 flex items-center justify-between border-t border-[#2E4A62]/60 pt-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#48B7C7]">
                  <span>Acessar módulo</span><span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2E4A62] pt-2 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500">
          <span>MOLDPLÁS S.A. · SGQ CORE SYSTEM</span>
          <span>{lastUpdated ? `Indicadores atualizados às ${lastUpdated}` : 'Indicadores aguardando sincronização'}</span>
        </footer>
      </div>
    </main>
  )
}
