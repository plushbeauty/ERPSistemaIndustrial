/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_APROVACAO: CENTRAL-TABLET-LIGHT-CARDS-FMEA
 * @REVISAO_VISUAL: Cards brancos, tipografia escura, contraste e grade compacta
 * @REVISAO: Cards brancos e tipografia escura; FMEA ligado à rota operacional /qualidade/fmea; indicadores reais via Supabase.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertOctagon, BookOpenCheck, ClipboardCheck, ClipboardList,
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
  { label: 'Quarentena de lotes', description: 'Materiais retidos e isolamento de carga.', route: '/qualidade/quarentena', icon: ShieldAlert, badge: 'Retido', badgeColor: 'border-red-200 bg-red-50 text-red-700' },
  { label: 'Genealogia de lotes', description: 'Rastreabilidade reversa e vínculos de insumos.', route: '/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'Sala RNC / RPNC', description: 'Contenção, investigação e acompanhamento de ocorrências.', route: '/qualidade/sala-rnc', icon: ClipboardList },
  { label: 'Cadastro de RNC', description: 'Abertura e acompanhamento de não conformidades.', route: '/qualidade/rnc', icon: Shield },
  { label: 'Ishikawa — causa raiz', description: 'Investigação de causas pelo método 6M.', route: '/qualidade/ishikawa', icon: Workflow },
  { label: 'Plano CAPA / 5W2H', description: 'Ações corretivas, preventivas e responsáveis.', route: '/qualidade/capa', icon: ListChecks },
  { label: 'Metodologia 8D', description: 'Resolução estruturada de problemas em oito disciplinas.', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA / PFMEA', description: 'Matriz de risco de produto e processo.', route: '/qualidade/fmea', icon: Activity },
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
  green: 'border-l-emerald-500 text-emerald-700',
  amber: 'border-l-amber-500 text-amber-700',
  red: 'border-l-red-500 text-red-700',
  blue: 'border-l-sky-500 text-sky-700',
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
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased sm:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3.5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2D8DB8]">MOLDPLÁS ERP · CONSOLE CENTRAL DO TABLET</p>
            <h1 className="text-base font-black uppercase tracking-tight text-slate-900">Sistema de Gestão da Qualidade Mestre</h1>
            <p className="text-[10px] font-medium text-slate-600">Monitoramento dos registros de inspeção, não conformidade, risco e metrologia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-slate-200 bg-white px-3 text-[10px] font-bold text-[#2D8DB8] shadow-inner">
              <Radio size={12} className={loading ? 'animate-pulse text-amber-400' : 'text-emerald-500'} />
              <span className="font-mono text-slate-700">{loading ? 'SINCRONIZANDO SGQ' : 'SESSÃO / TENANT'}</span>
            </div>
            <button type="button" onClick={() => void loadMetrics()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-slate-200 bg-[#2D8DB8] px-2.5 text-[9px] font-black uppercase text-slate-900 hover:border-[#2D8DB8] disabled:cursor-wait disabled:opacity-60">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="status" className="border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-900">{error}</div>}

        <div className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-900">
          <span className="h-2 w-2 shrink-0 bg-[#48B7C7]" aria-hidden="true" />
          <span>PAINEL SGQ · títulos e descrições com contraste reforçado; falhas de consulta são informadas acima.</span>
        </div>

        <section aria-label="Indicadores operacionais do SGQ" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className={`flex min-h-[82px] min-w-0 items-center justify-between gap-2 border border-slate-200 border-l-4 bg-white p-3 shadow-sm ${toneClasses[metric.tone]}`}>
                <div className="min-w-0">
                  <span className="block text-[8px] font-black uppercase tracking-wide text-slate-600">{metric.label}</span>
                  <strong className="mt-1 block font-mono text-lg font-black text-slate-900">{metric.value}</strong>
                  <span className="block text-[9px] text-slate-600">{metric.detail}</span>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center border border-slate-200 bg-white">
                  <Icon size={15} />
                </span>
              </article>
            )
          })}
        </section>

        <section className="border border-slate-200 bg-white p-3.5 shadow-2xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
            <div className="space-y-0.5">
              <h2 className="text-[11px] font-black uppercase tracking-wide text-slate-900">Módulos de conformidade e rastreabilidade</h2>
              <p className="text-[9px] font-medium text-slate-600">Atalhos operacionais do SGQ com grade responsiva de alta densidade.</p>
            </div>
            <span className="shrink-0 border border-slate-200 bg-white px-2.5 py-1 text-[8px] font-black text-[#2D8DB8]">20 MÓDULOS</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {qualityModules.map(({ label, description, route, icon: Icon, badge, badgeColor }) => (
              <Link key={route} to={route} className="group relative flex min-h-[108px] min-w-0 flex-col justify-between rounded-none border border-slate-200 bg-white p-3 text-slate-900 shadow-sm transition-colors hover:border-[#2D8DB8] hover:bg-[#2D8DB8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]">
                <div className="flex w-full min-w-0 items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-slate-200 bg-white text-[#2D8DB8] transition-colors group-hover:border-[#2D8DB8]">
                    <Icon size={14} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-[10px] font-black uppercase leading-tight tracking-wide text-slate-900 transition-colors group-hover:text-[#2D8DB8]">{label}</span>
                    <span className="line-clamp-2 block text-[9px] leading-[1.35] text-slate-600">{description}</span>
                  </span>
                </div>
                {badge && <span className={`absolute bottom-2 right-2 border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badgeColor ?? 'border-sky-200 bg-sky-50 text-sky-700'}`}>{badge}</span>}
                <span className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-600 group-hover:text-[#2D8DB8]">
                  <span>Acessar módulo</span><span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-600">
          <span>MOLDPLÁS S.A. · SGQ CORE SYSTEM</span>
          <span>{lastUpdated ? `Indicadores atualizados às ${lastUpdated}` : 'Indicadores aguardando sincronização'}</span>
        </footer>
      </div>
    </main>
  )
}
