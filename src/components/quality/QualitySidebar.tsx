import { useNavigate } from 'react-router-dom'
import {
  Activity, Archive, BarChart3, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  Gauge, GitBranch, Microscope, SearchCheck, ShieldAlert, ShieldCheck, Target, Wrench,
} from 'lucide-react'
import '../../styles/quality-workspace-standard.css'

const modules = [
  { label: 'Visão geral do SGQ', route: '/qualidade', icon: Gauge },
  { label: 'Inspeções de lotes', route: '/qualidade/inspecoes', icon: ClipboardCheck },
  { label: 'Inspeção em processo', route: '/qualidade/inspecao-processo', icon: Microscope },
  { label: 'Especificações técnicas', route: '/qualidade/especificacoes', icon: FileCheck2 },
  { label: 'Liberação de lotes', route: '/qualidade/liberacao-lote', icon: ShieldCheck },
  { label: 'Quarentena de lotes', route: '/qualidade/quarentena', icon: ShieldAlert },
  { label: 'Genealogia de lotes', route: '/qualidade/genealogia-lote', icon: GitBranch },
  { label: 'RPNC completo · formulário único por abas', route: '/qualidade/rpnc', icon: ClipboardList },
  { label: 'Metodologia 8D', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA / PFMEA', route: '/qualidade/pfmea', icon: Activity },
  { label: 'Documentos controlados / GED', route: '/qualidade/ged-documentos', icon: FileText },
  { label: 'Controle de desenhos técnicos', route: '/qualidade/controle-desenhos', icon: FileCheck2 },
  { label: 'Procedimentos e PDFs', route: '/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestra de documentos', route: '/qualidade/lista-mestre', icon: Archive },
  { label: 'Auditorias internas da planta', route: '/qualidade/auditorias-planta', icon: ClipboardCheck },
  { label: 'Auditoria 5S', route: '/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'CEP / cartas de controle', route: '/qualidade/cep', icon: Activity },
  { label: 'Metrologia e calibração', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Instruções de trabalho', route: '/qualidade/editor-it', icon: ClipboardCheck },
  { label: 'Relatórios do SGQ', route: '/qualidade/relatorios-documentos', icon: FileText },
  { label: 'Análise de refugos e perdas', route: '/qualidade/graficos-refugo', icon: BarChart3 },
] as const

export default function QualitySidebar({ active }: { active: string }) {
  const navigate = useNavigate()
  return (
    <section aria-label="Menu principal da qualidade" className="mb-3 overflow-hidden rounded-xl border border-[#B9D6E2] bg-white shadow-sm">
      <header className="flex min-h-[42px] flex-wrap items-center justify-between gap-2 border-b border-[#C8E3EE] bg-[#123B50] px-3 py-2 text-white">
        <div>
          <h2 className="text-[10px] font-extrabold uppercase tracking-[.13em]">QUALIDADE · SISTEMA DE GESTÃO DA QUALIDADE</h2>
          <p className="mt-0.5 text-[9px] text-white/85">Acesso direto aos módulos do SGQ · {modules.length} opções</p>
        </div>
        <span className="border border-white/50 bg-white/10 px-2 py-1 text-[9px] font-bold">MENU PRINCIPAL</span>
      </header>
      <nav aria-label="Menu da qualidade" className="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {modules.map(({ label, route, icon: Icon }) => (
          <button
            key={route}
            type="button"
            onClick={() => navigate(route)}
            aria-current={active === route ? 'page' : undefined}
            className={'group flex min-h-[42px] min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8] ' + (active === route ? 'border-[#2D8DB8] bg-[#E5F3F8]' : 'border-slate-200 bg-white hover:border-[#2D8DB8] hover:bg-[#F4FBFD]')}
            title={label}
          >
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8] group-hover:border-[#8CC5E0]">
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 text-[10px] font-semibold leading-[1.25] text-[#123B50]">{label}</span>
          </button>
        ))}
      </nav>
    </section>
  )
}
