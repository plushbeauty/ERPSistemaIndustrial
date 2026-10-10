import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BookOpenCheck, CircleHelp, ClipboardCheck, ClipboardList, FileText, FolderGit2, Gauge, ListChecks, LineChart, SearchCheck, ShieldCheck, Target, Wrench, X } from 'lucide-react'
import { useSynqraLayout } from '../../layout/SynqraLayoutContext'

const items = [
  ['Indicadores RNC / CAPA', '/qualidade/dashboard-rnc'],
  ['Visão Geral da Qualidade', '/qualidade'],
  ['Especificações Técnicas', '/qualidade/especificacoes'],
  ['Inspeções de Lotes', '/qualidade/inspecoes'],
  ['Matriz FMEA / PFMEA', '/qualidade/fmea'],
  ['RNC & Planos CAPA', '/qualidade/rnc-capa'],
  ['Inspeção em Processo', '/qualidade/inspecao-processo'],
  ['Registro RPNC / CAPA', '/qualidade/rnc'],
  ['8D — Ações Corretivas', '/qualidade/metodologia-8d'],
  ['Auditoria 5S', '/qualidade/auditoria-5s'],
  ['PFMEA / Risco', '/qualidade/pfmea'],
  ['Procedimentos e documentos', '/qualidade/documentos'],
  ['Lista Mestre', '/qualidade/lista-mestre'],
  ['Relatórios SGQ', '/qualidade/relatorios-documentos'],
  ['Calibração / Metrologia', '/qualidade/metrologia'],
]

const itemIcons = [Activity, Gauge, SearchCheck, ClipboardCheck, Target, ListChecks, ClipboardList, ShieldCheck, BookOpenCheck, ClipboardList, Target, FileText, FileText, FileText, Wrench]

export default function QualitySidebar({ active }: { active: string }) {
  const hostedBySynqra = useSynqraLayout()
  const [helpOpen, setHelpOpen] = useState(false)
  const activeLabel = items.find(([, path]) => path === active)?.[0] ?? (active.includes('ged-documentos') ? 'Controle Documental GED' : active.includes('cep') ? 'Cartas de Controle CEP' : 'Gestão da Qualidade')
  const helpText = active.includes('inspec') ? 'Selecione o lote e a especificação aprovada aplicável. Registre evidências e só libere o material após concluir a avaliação conforme o procedimento da empresa.'
    : active.includes('especificacoes') ? 'Mantenha critérios, tolerâncias, métodos de verificação, revisão e aprovação conforme desenhos e requisitos validados. Não use limites presumidos.'
    : active.includes('ged-documentos') || active.includes('documentos') || active.includes('lista-mestre') ? 'Consulte a revisão vigente, confirme a área responsável e mantenha histórico, aprovação e distribuição controlada das cópias.'
    : active.includes('rnc') || active.includes('capa') || active.includes('metodologia-8d') ? 'Registre contenção, causa raiz, responsáveis, prazos, evidências e verificação de eficácia antes de encerrar a ocorrência.'
    : active.includes('fmea') || active.includes('pfmea') ? 'Revise modos de falha, efeitos, causas, controles preventivos/detectivos e ações com base no processo real.'
    : active.includes('metrologia') || active.includes('cep') ? 'Utilize instrumentos válidos e critérios aprovados; registre os resultados e investigue desvios antes de liberar o processo.'
    : 'Use este painel para acompanhar indicadores do SGQ e acessar inspeções, documentos, riscos, auditorias e ações corretivas. Os números devem refletir registros reais da empresa.'

  return (
    <aside className={hostedBySynqra
      ? 'col-span-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
      : 'hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block'}>
      {!hostedBySynqra && <div className="rounded-t-xl border-b border-slate-700 bg-slate-900 p-4 text-white">
        <p className="text-xs font-black uppercase tracking-widest text-sky-300">QUALIDADE</p>
        <h2 className="mt-1 text-lg font-extrabold">Workspace Industrial</h2>
      </div>}
      <nav
        aria-label="Navegação da qualidade"
        className={hostedBySynqra
          ? 'flex min-w-0 gap-1 overflow-x-auto p-2'
          : 'p-2'}
      >
        {items.map(([label, path], index) => {
          const Icon = itemIcons[index] ?? FileText
          return (
          <Link
            key={path}
            to={path}
            aria-current={active === path ? 'page' : undefined}
            className={`${hostedBySynqra
              ? 'min-h-9 flex-none whitespace-nowrap gap-1.5 border px-2 text-[10px]'
              : 'mb-1 min-h-9 w-full gap-2 border px-3 py-2 text-left text-[11px]'} flex items-center rounded-md transition-colors ${
              active === path
                ? hostedBySynqra
                  ? 'border-[#2D8DB8] bg-gradient-to-r from-[#123B50] to-[#2D8DB8] font-semibold text-white shadow-sm'
                  : 'border-[#2D8DB8] bg-sky-50 font-semibold text-[#123B50]'
                : 'border-transparent font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-[#123B50]'
            }`}
          >
            <Icon size={13} className="shrink-0" />
            {label}
          </Link>
          )
        })}
      
        <div className={hostedBySynqra ? 'flex flex-none items-center gap-1 border-l border-slate-200 pl-2' : 'mt-2 border-t border-slate-200 pt-2'}>
          <div className={hostedBySynqra ? 'flex h-8 items-center gap-1 whitespace-nowrap px-2 text-[10px] font-bold uppercase text-[#123B50]' : 'mb-1 flex h-8 items-center gap-2 px-2 text-[10px] font-bold uppercase text-[#123B50]'}>
            <ShieldCheck size={16} /> Gestão da Qualidade
          </div>
          <Link to="/qualidade/ged-documentos" aria-current={active === '/qualidade/ged-documentos' ? 'page' : undefined} className={`flex h-8 items-center gap-1 whitespace-nowrap border px-2 text-[10px] font-semibold ${active.startsWith('/qualidade/ged-documentos') ? 'border-[#2D8DB8] bg-sky-50 text-[#123B50]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <FolderGit2 size={14} /> Controle Documental GED
          </Link>
          <Link to="/qualidade/cep" aria-current={active === '/qualidade/cep' ? 'page' : undefined} className={`flex h-8 items-center gap-1 whitespace-nowrap border px-2 text-[10px] font-semibold ${active === '/qualidade/cep' ? 'border-[#2D8DB8] bg-sky-50 text-[#123B50]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <LineChart size={14} /> Cartas de Controle CEP
          </Link>
        </div>
        <button type="button" onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen} aria-controls="quality-context-help" className={hostedBySynqra ? 'ml-auto flex h-8 flex-none items-center gap-1.5 border border-[#2D8DB8] bg-[#E5F3F8] px-2 text-[10px] font-semibold text-[#123B50] hover:bg-[#D4EAF3]' : 'mt-2 flex h-8 w-full items-center gap-2 border border-sky-200 bg-sky-50 px-3 text-[10px] font-semibold text-[#123B50] hover:bg-sky-100'}>
          {helpOpen ? <X size={14} /> : <CircleHelp size={14} />} {helpOpen ? 'Fechar ajuda' : 'Ajuda desta tela'}
        </button>
      </nav>
      {helpOpen && <section id="quality-context-help" className="border-t border-sky-200 bg-gradient-to-r from-[#EAF5F9] to-[#F5FAFC] p-3 text-[#123B50]" role="region" aria-label="Ajuda contextual da qualidade">
        <div className="flex items-center gap-2 text-[11px] font-semibold"><CircleHelp size={15} /> {activeLabel}</div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-700">{helpText}</p>
      </section>}
    </aside>
  )
}
