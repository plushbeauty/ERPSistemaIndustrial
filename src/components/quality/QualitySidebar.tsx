import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BookOpenCheck, CircleHelp, ClipboardCheck, ClipboardList, FileText, FolderGit2, Gauge, ListChecks, LineChart, SearchCheck, ShieldCheck, Target, Wrench, X } from 'lucide-react'

const items = [
  ['Visão Geral da Qualidade', '/qualidade'],
  ['Cadastro de Documentos', '/qualidade/ged-documentos'],
  ['Indicadores RNC / CAPA', '/qualidade/dashboard-rnc'],
  ['Especificações Técnicas', '/qualidade/especificacoes'],
  ['Inspeções de Lotes', '/qualidade/inspecoes'],
  ['Matriz FMEA / PFMEA', '/qualidade/fmea'],
  ['RNC & Planos CAPA', '/qualidade/rnc-capa'],
  ['Inspeção em Processo', '/qualidade/inspecao-processo'],
  ['Registro RPNC / CAPA', '/qualidade/rnc'],
  ['8D — Ações Corretivas', '/qualidade/metodologia-8d'],
  ['Auditoria 5S', '/qualidade/auditoria-5s'],
  ['PFMEA / Risco', '/qualidade/pfmea'],
  ['Lista Mestre', '/qualidade/lista-mestre'],
  ['Relatórios SGQ', '/qualidade/relatorios-documentos'],
  ['Calibração / Metrologia', '/qualidade/metrologia'],
]

const itemIcons = [Activity, Gauge, SearchCheck, ClipboardCheck, Target, ListChecks, ClipboardList, ShieldCheck, BookOpenCheck, ClipboardList, Target, FileText, FileText, FileText, Wrench]

export default function QualitySidebar({ active }: { active: string }) {
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
    <aside className="col-span-full min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-[#123B50] to-[#185c78] px-3 py-2 text-white">
        <ShieldCheck size={16} className="shrink-0" />
        <p className="text-[11px] font-extrabold uppercase tracking-wider">Qualidade · Navegação do SGQ</p>
        <span className="ml-auto text-[10px] text-sky-100">Acesso rápido aos módulos</span>
      </div>
      <nav aria-label="Navegação da qualidade" className="flex min-w-0 flex-wrap items-center gap-1.5 p-2">
        {items.map(([label, path], index) => {
          const Icon = itemIcons[index] ?? FileText
          return (
            <Link
              key={path}
              to={path}
              aria-current={active === path ? 'page' : undefined}
              className={`inline-flex min-h-9 flex-none items-center gap-2 whitespace-nowrap rounded-[2px] border px-3 py-1.5 text-[11px] transition-colors ${
                active === path
                  ? 'border-[#2D8DB8] bg-gradient-to-r from-[#123B50] to-[#2D8DB8] font-bold text-white shadow-sm'
                  : 'border-slate-200 bg-[#F4FBFD] font-semibold text-[#123B50] hover:border-[#2D8DB8] hover:bg-[#E5F3F8]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {label}
            </Link>
          )
        })}
        <div className="flex flex-wrap items-center gap-1.5 border-l border-slate-200 pl-2">
          <span className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap px-2 text-[10px] font-bold uppercase text-[#123B50]">
            <ShieldCheck size={14} /> Gestão da Qualidade
          </span>
          <Link to="/qualidade/cep" aria-current={active === '/qualidade/cep' ? 'page' : undefined} className={`inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-[2px] border px-3 py-1.5 text-[11px] font-semibold ${
            active === '/qualidade/cep' ? 'border-[#2D8DB8] bg-[#123B50] text-white' : 'border-slate-200 bg-[#F4FBFD] text-[#123B50] hover:border-[#2D8DB8] hover:bg-[#E5F3F8]'
          }`}>
            <LineChart size={14} /> Cartas de Controle CEP
          </Link>
        </div>
        <button type="button" onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen} aria-controls="quality-context-help" className="ml-auto inline-flex min-h-9 flex-none items-center gap-2 rounded-[2px] border border-[#2D8DB8] bg-[#E5F3F8] px-3 py-1.5 text-[11px] font-bold text-[#123B50] hover:bg-[#D4EAF3]">
          {helpOpen ? <X size={14} /> : <CircleHelp size={14} />} {helpOpen ? 'Fechar ajuda' : 'Ajuda desta tela'}
        </button>
      </nav>
      {helpOpen && <section id="quality-context-help" className="border-t border-sky-200 bg-gradient-to-r from-[#EAF5F9] to-[#F5FAFC] p-3 text-[#123B50]" role="region" aria-label="Ajuda contextual da qualidade">
        <div className="flex items-center gap-2 text-[11px] font-semibold"><CircleHelp size={15} /> {activeLabel}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{helpText}</p>
      </section>}
    </aside>
}
