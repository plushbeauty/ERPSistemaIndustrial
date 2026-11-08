/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-PADRAO-COR-CLARO-20261104-01 — console do tablet convertido do tema escuro para o padrão industrial claro (fundo #F4FBFD, painéis brancos, texto #123B50) e marca alinhada para SYSNQRA; nenhuma alteração de lógica ou de consulta
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: PADRAO UNICO DE COR APLICADO POR ORDEM DO PROPRIETARIO EM 2026-11-04
 */
/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @REVISAO: REV-TABELAS-REAIS-SGQ-20261104-01 — Central tablet: RNC em aberto consulta erp_rpnc e os 30 dias de calibração usam o relógio do Postgres
 */
/**
 * @DATA_REVISAO_ANTERIOR: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: MOLDPLÁS ERP INDUSTRIAL
 * @STATUS_ANTERIOR: CENTRAL-TABLET-HIGH-CONTRAST-FIX
 * @REVISAO_VISUAL: Contraste explícito, grade compacta e cards quadrados
 * @REVISAO_ANTERIOR: Bento grid compacto, indicadores consultados no Supabase e navegação SGQ.
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
import { relogioDoServidor } from '../lib/serverClock'

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
  { label: 'Quarentena de lotes', description: 'Materiais retidos e isolamento de carga.', route: '/qualidade/quarentena', icon: ShieldAlert, badge: 'Retido', badgeColor: 'border-rose-200 bg-rose-50 text-rose-700' },
  { label: 'Genealogia de lotes', description: 'Rastreabilidade reversa e vínculos de insumos.', route: '/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'Sala RNC / RPNC', description: 'Contenção, investigação e acompanhamento de ocorrências.', route: '/qualidade/sala-rnc', icon: ClipboardList },
  { label: 'Cadastro de RNC', description: 'Abertura e acompanhamento de não conformidades.', route: '/qualidade/rnc', icon: Shield },
  { label: 'Ishikawa — causa raiz', description: 'Investigação de causas pelo método 6M.', route: '/qualidade/ishikawa', icon: Workflow },
  { label: 'Plano CAPA / 5W2H', description: 'Ações corretivas, preventivas e responsáveis.', route: '/qualidade/capa', icon: ListChecks },
  { label: 'Metodologia 8D', description: 'Resolução estruturada de problemas em oito disciplinas.', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA (AIAG)', description: 'Cabeçalho controlado, matriz de risco e impressão A4 com QR Code.', route: '/qualidade/fmea', icon: Activity },
  { label: 'Plano de Controle (CPP)', description: 'Controles por operação ligados à linha do FMEA.', route: '/qualidade/plano-controle', icon: ClipboardCheck },
  { label: 'Documentos controlados', description: 'Documentos do SGQ, revisões e vigência.', route: '/qualidade/ged-documentos', icon: FileText },
  { label: 'Controle de desenhos técnicos', description: 'Revisões de moldes e homologação CAD.', route: '/qualidade/controle-desenhos', icon: FileCheck2 },
  { label: 'Procedimentos e PDFs', description: 'Manuais técnicos e instruções operacionais.', route: '/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestre', description: 'Índice controlado da documentação interna.', route: '/qualidade/lista-mestre', icon: FileText },
  { label: 'Auditoria 5S', description: 'Organização, disciplina e melhoria contínua.', route: '/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'CEP / Cartas de controle', description: 'Monitoramento estatístico e desvios de processo.', route: '/qualidade/cep', icon: Activity },
  { label: 'Metrologia e calibração', description: 'Rastreabilidade de instrumentos e prazos de calibração.', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Instruções de trabalho', description: 'Padrões operacionais de execução de processos.', route: '/qualidade/editor-it', icon: ClipboardCheck },
  { label: 'Relatórios do SGQ', description: 'Consultas e dossiês consolidados da Qualidade.', route: '/qualidade/relatorios-documentos', icon: FileText },
]

const qualityCategories = [
  'Todos',
  'Inspeção e processo',
  'RNC e melhoria',
  'Rastreabilidade e risco',
  'Documentação e auditoria',
] as const

type QualityCategory = typeof qualityCategories[number]

function categoryForRoute(route: string): QualityCategory {
  if (['/qualidade/inspecoes', '/qualidade/inspecao-processo', '/qualidade/especificacoes', '/qualidade/liberacao-lote', '/qualidade/quarentena', '/qualidade/cep', '/qualidade/calibracao'].includes(route)) return 'Inspeção e processo'
  if (['/qualidade/sala-rnc', '/qualidade/rnc', '/qualidade/ishikawa', '/qualidade/capa', '/qualidade/metodologia-8d', '/qualidade/auditoria-5s'].includes(route)) return 'RNC e melhoria'
  if (['/qualidade/genealogia-lote', '/qualidade/fmea', '/qualidade/plano-controle', '/qualidade/controle-desenhos'].includes(route)) return 'Rastreabilidade e risco'
  return 'Documentação e auditoria'
}

const toneClasses = {
  green: 'border-l-emerald-500 text-emerald-700',
  amber: 'border-l-amber-500 text-amber-800',
  red: 'border-l-rose-500 text-rose-700',
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
  const [activeCategory, setActiveCategory] = useState<QualityCategory>('Todos')

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const tenant = await supabase.rpc('erp_current_empresa_id')
      if (tenant.error || !tenant.data) throw new Error('Empresa da sessão autenticada não identificada.')
      const empresaId = String(tenant.data)
      // Os 30 dias de calibração são medidos pelo relógio do Postgres, não pelo relógio do tablet.
      const relogio = await relogioDoServidor()
      const todayISO = relogio.agora ? relogio.agora.toISOString().slice(0, 10) : null
      const horizonISO = relogio.agora ? new Date(relogio.agora.getTime() + 30 * 86400000).toISOString().slice(0, 10) : null

      const [inspections, rncs, fmeas, calibrations] = await Promise.all([
        supabase.from('qualidade_inspecoes').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('erp_rpnc').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).not('status', 'in', '(encerrada,Encerrada,Cancelada,cancelada)'),
        supabase.from('qualidade_fmea').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        todayISO && horizonISO
          ? supabase.from('erp_equipamentos_medicao').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).gte('proxima_calibracao', todayISO).lte('proxima_calibracao', horizonISO)
          : Promise.resolve({ data: null, count: null, error: { message: relogio.aviso || 'Relógio do servidor indisponível.' } as unknown as Error }),
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

  const visibleModules = activeCategory === 'Todos'
    ? qualityModules
    : qualityModules.filter(module => categoryForRoute(module.route) === activeCategory)

  return (
    <main className="min-h-screen bg-[#F4FBFD] p-3 text-[#123B50] antialiased sm:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3.5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CFE1E7] pb-3.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#176487]">SYSNQRA ERP · CONSOLE CENTRAL DO TABLET</p>
            <h1 className="text-base font-black uppercase tracking-tight text-[#123B50]">Sistema de Gestão da Qualidade Mestre</h1>
            <p className="text-[10px] font-medium text-slate-500">Monitoramento dos registros de inspeção, não conformidade, risco e metrologia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 border border-[#CFE1E7] bg-[#EAF6FA] px-3 text-[10px] font-bold text-[#176487]">
              <Radio size={12} className={loading ? 'animate-pulse text-amber-600' : 'text-emerald-600'} />
              <span className="font-mono text-slate-600">{loading ? 'SINCRONIZANDO SGQ' : 'SESSÃO / TENANT'}</span>
            </div>
            <button type="button" onClick={() => void loadMetrics()} disabled={loading} className="inline-flex h-8 items-center gap-1.5 border border-[#2D8DB8] bg-[#123B50] px-2.5 text-[9px] font-black uppercase text-white hover:bg-[#18516B] disabled:cursor-wait disabled:opacity-60">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </header>

        {error && <div role="status" className="border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">{error}</div>}

        <div className="flex items-center gap-2 border border-[#CFE1E7] bg-white px-3 py-2 text-[10px] font-semibold text-[#123B50]">
          <span className="h-2 w-2 shrink-0 bg-[#2D8DB8]" aria-hidden="true" />
          <span>PAINEL SGQ · títulos e descrições no padrão industrial claro; falhas de consulta são informadas acima.</span>
        </div>

        <section aria-label="Indicadores operacionais do SGQ" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className={`flex min-h-[82px] min-w-0 items-center justify-between gap-2 border border-[#CFE1E7] border-l-4 bg-white p-3 shadow-sm ${toneClasses[metric.tone]}`}>
                <div className="min-w-0">
                  <span className="block text-[8px] font-black uppercase tracking-wide text-slate-500">{metric.label}</span>
                  <strong className="mt-1 block font-mono text-lg font-black text-[#123B50]">{metric.value}</strong>
                  <span className="block text-[9px] text-slate-500">{metric.detail}</span>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#CFE1E7] bg-[#F8FAFC] text-[#176487]">
                  <Icon size={15} />
                </span>
              </article>
            )
          })}
        </section>

        <section className="border border-[#CFE1E7] bg-white p-3.5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#CFE1E7] pb-2">
            <div className="space-y-0.5">
              <h2 className="text-[11px] font-black uppercase tracking-wide text-[#123B50]">Módulos de conformidade e rastreabilidade</h2>
              <p className="text-[9px] font-medium text-slate-500">Atalhos operacionais do SGQ com grade responsiva de alta densidade.</p>
            </div>
            <span className="shrink-0 border border-[#CFE1E7] bg-[#EAF6FA] px-2.5 py-1 text-[8px] font-black text-[#176487]">{qualityModules.length} MÓDULOS</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias do SGQ">
            {qualityCategories.map(category => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`inline-flex h-[30px] items-center border px-3 text-[9px] font-bold uppercase tracking-wide transition-colors ${activeCategory === category ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-[#CFE1E7] bg-[#F8FAFC] text-[#456477] hover:border-[#2D8DB8] hover:bg-[#EAF6FA]'}`}
              >
                {category}
                <span className="ml-1.5 opacity-75">{category === 'Todos' ? qualityModules.length : qualityModules.filter(module => categoryForRoute(module.route) === category).length}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {visibleModules.map(({ label, description, route, icon: Icon, badge, badgeColor }) => (
              <Link key={route} to={route} className="group relative flex min-h-[108px] min-w-0 flex-col justify-between rounded-none border border-[#CFE1E7] bg-[#F8FAFC] p-3 text-[#123B50] shadow-sm transition-colors hover:border-[#2D8DB8] hover:bg-[#EAF6FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]">
                <div className="flex w-full min-w-0 items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#CFE1E7] bg-white text-[#176487] transition-colors group-hover:border-[#2D8DB8]">
                    <Icon size={14} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-[10px] font-black uppercase leading-tight tracking-wide text-[#123B50] transition-colors group-hover:text-[#176487]">{label}</span>
                    <span className="line-clamp-2 block text-[9px] leading-[1.35] text-slate-500">{description}</span>
                  </span>
                </div>
                {badge && <span className={`absolute bottom-2 right-2 border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badgeColor ?? 'border-[#CFE1E7] bg-[#EAF6FA] text-[#176487]'}`}>{badge}</span>}
                <span className="mt-2 flex items-center justify-between border-t border-[#CFE1E7] pt-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#176487]">
                  <span>Acessar módulo</span><span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#CFE1E7] pt-2 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500">
          <span>SYSNQRA ERP INDUSTRIAL · SGQ CORE SYSTEM</span>
          <span>{lastUpdated ? `Indicadores atualizados às ${lastUpdated}` : 'Indicadores aguardando sincronização'}</span>
        </footer>
      </div>
    </main>
  )
}
