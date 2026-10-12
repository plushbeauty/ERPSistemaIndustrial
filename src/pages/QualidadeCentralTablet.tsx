import { Link } from 'react-router-dom'
import {
  Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  Gauge, GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck,
  Target, Wrench, Workflow,
} from 'lucide-react'
import QualitySidebar from '../components/quality/QualitySidebar'
import ERPHeader from '../components/layout/ERPHeader'

const qualityModules = [
  { label: 'Inspeções de lotes', description: 'Registrar amostras e resultados de inspeção.', route: '/qualidade/inspecoes', icon: ClipboardCheck },
  { label: 'Inspeção em processo', description: 'Controlar verificações durante a produção.', route: '/qualidade/inspecao-processo', icon: Microscope },
  { label: 'Especificações técnicas', description: 'Consultar critérios e tolerâncias vigentes.', route: '/qualidade/especificacoes', icon: FileCheck2 },
  { label: 'Liberação de lotes', description: 'Acompanhar decisões de liberação.', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
  { label: 'Quarentena de lotes', description: 'Visualizar materiais bloqueados.', route: '/qualidade/quarentena', icon: ShieldAlert },
  { label: 'Genealogia de lotes', description: 'Rastrear lotes e vínculos de produção.', route: '/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'Sala RNC / RPNC', description: 'Centralizar não conformidades e pendências.', route: '/qualidade/sala-rnc', icon: ClipboardList },
  { label: 'Cadastro de RNC', description: 'Registrar e acompanhar ocorrências.', route: '/qualidade/rnc', icon: ShieldAlert },
  { label: 'Ishikawa — causa raiz', description: 'Investigar causas pelo método 6M.', route: '/qualidade/ishikawa', icon: Workflow },
  { label: 'Plano CAPA / 5W2H', description: 'Definir ações corretivas e preventivas.', route: '/qualidade/capa', icon: ListChecks },
  { label: 'Metodologia 8D', description: 'Conduzir solução estruturada de problemas.', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA / PFMEA', description: 'Analisar riscos de processo e produto.', route: '/qualidade/pfmea', icon: Activity },
  { label: 'Documentos controlados', description: 'Acessar documentos e revisões do SGQ.', route: '/qualidade/ged-documentos', icon: FileText },
  { label: 'Procedimentos e PDFs', description: 'Consultar procedimentos da qualidade.', route: '/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestre', description: 'Consultar o índice de documentos controlados.', route: '/qualidade/lista-mestre', icon: FileText },
  { label: 'Auditoria 5S', description: 'Registrar e acompanhar auditorias de organização.', route: '/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'CEP / cartas de controle', description: 'Acompanhar indicadores estatísticos de processo.', route: '/qualidade/cep', icon: Activity },
  { label: 'Metrologia e calibração', description: 'Consultar instrumentos e calibrações.', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Instruções de trabalho', description: 'Consultar e manter instruções operacionais.', route: '/qualidade/editor-it', icon: ClipboardCheck },
  { label: 'Relatórios do SGQ', description: 'Acessar relatórios de qualidade.', route: '/qualidade/relatorios-documentos', icon: FileText },
] as const

export default function QualidadeCentralTablet() {
  return (
    <main className="min-h-screen bg-[#F4FBFD] px-3 py-3 text-[#123B50] sm:px-4">
      <ERPHeader />
      <div className="mx-auto max-w-[1500px] space-y-3">
        <QualitySidebar active="/qualidade" />
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C8E3EE] pb-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#2D8DB8]">ERP INDUSTRIAL · SGQ</p>
            <h1 className="mt-1 text-[19px] font-bold leading-tight text-[#123B50]">Central da Qualidade</h1>
            <p className="mt-1 text-[11px] text-slate-600">Acesse os processos do Sistema de Gestão da Qualidade em um único painel.</p>
          </div>
          <div className="flex h-[30px] items-center gap-2 border border-[#B9DDEB] bg-white px-3 text-[10px] font-semibold text-[#17445A]">
            <Gauge size={14} className="text-[#2D8DB8]" />
            Ambiente operacional do SGQ
          </div>
        </header>

        <section className="border border-[#C8E3EE] bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-[12px] font-bold text-[#123B50]">Módulos da Qualidade</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Selecione um módulo para abrir sua tela operacional.</p>
            </div>
            <span className="shrink-0 border border-[#C8E3EE] bg-[#EAF6FA] px-2 py-1 text-[9px] font-bold text-[#2D8DB8]">SGQ · TABLET</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {qualityModules.map(({ label, description, route, icon: Icon }) => (
              <Link
                key={route}
                to={route}
                className="group flex min-h-[68px] min-w-0 items-center gap-3 border border-slate-200 bg-white p-2.5 transition-colors hover:border-[#2D8DB8] hover:bg-[#F0F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]"
              >
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8] group-hover:border-[#2D8DB8]">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-bold text-[#17445A]">{label}</span>
                  <span className="mt-1 block text-[9px] leading-[1.35] text-slate-500">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#C8E3EE] pt-2 text-[9px] text-slate-500">
          <span>ERP Industrial · Central Tablet SGQ</span>
          <span>O acesso aos registros respeita a sessão, a empresa e as permissões do ERP.</span>
        </footer>
      </div>
    </main>
  )
}
