import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, BookOpenCheck, ClipboardCheck, ClipboardList, FileCheck2, FileText,
  Gauge, GitBranch, ListChecks, Microscope, SearchCheck, ShieldAlert, ShieldCheck,
  Tablet, Target, Wrench, Workflow, X,
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
  { label: 'Sala de RNC / RPNC', route: '/qualidade/sala-rnc', icon: ClipboardList },
  { label: 'Cadastro de RNC', route: '/qualidade/rnc', icon: ShieldAlert },
  { label: 'Ishikawa — causa raiz 6M', route: '/qualidade/ishikawa', icon: Workflow },
  { label: 'Plano CAPA / 5W2H', route: '/qualidade/capa', icon: ListChecks },
  { label: 'Metodologia 8D', route: '/qualidade/metodologia-8d', icon: Target },
  { label: 'FMEA / PFMEA', route: '/qualidade/pfmea', icon: Activity },
  { label: 'Documentos controlados / GED', route: '/qualidade/ged-documentos', icon: FileText },
  { label: 'Procedimentos e PDFs', route: '/qualidade/procedimentos', icon: BookOpenCheck },
  { label: 'Lista mestre', route: '/qualidade/lista-mestre', icon: FileText },
  { label: 'Auditoria 5S', route: '/qualidade/auditoria-5s', icon: SearchCheck },
  { label: 'CEP / cartas de controle', route: '/qualidade/cep', icon: Activity },
  { label: 'Metrologia e calibração', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Instruções de trabalho', route: '/qualidade/editor-it', icon: ClipboardCheck },
  { label: 'Relatórios do SGQ', route: '/qualidade/relatorios-documentos', icon: FileText },
] as const

export default function QualitySidebar({ active }: { active: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav aria-label="Menu da qualidade" className="mb-2 flex h-[30px] min-h-[30px] w-full items-center justify-between gap-2 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-white">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide">QUALIDADE · SGQ</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-[24px] shrink-0 items-center gap-1 border border-white/70 bg-white px-2 text-[10px] font-semibold text-[#17445A] hover:bg-[#E5F3F8]"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Tablet size={13} /> Central Tablet SGQ
        </button>
      </nav>
      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-3"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Central Tablet SGQ"
            className="max-h-[calc(100vh-24px)] w-full max-w-[900px] overflow-y-auto border border-slate-300 bg-white p-3 text-[#123B50] shadow-2xl"
          >
            <header className="mb-3 flex min-h-[30px] items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div className="min-w-0">
                <h2 className="text-[12px] font-bold uppercase tracking-wide">Central Tablet SGQ</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">Acesso aos processos da qualidade industrial</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-[30px] w-[30px] shrink-0 place-items-center border border-slate-300 bg-white hover:border-[#2D8DB8]" aria-label="Fechar menu do tablet">
                <X size={15} />
              </button>
            </header>
            <div className="grid grid-cols-4 gap-2 max-[650px]:grid-cols-2" aria-label="Módulos da qualidade">
              {modules.map(({ label, route, icon: Icon }) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => { setOpen(false); navigate(route) }}
                  aria-current={active === route ? 'page' : undefined}
                  className={`flex h-[54px] min-w-0 items-center gap-2 border px-2 text-left transition-colors hover:border-[#2D8DB8] hover:bg-[#F0F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8] ${active === route ? 'border-[#2D8DB8] bg-[#E5F3F8]' : 'border-slate-200 bg-white'}`}
                  title={label}
                >
                  <span className="grid h-[28px] w-[28px] shrink-0 place-items-center border border-[#C8E3EE] bg-[#EAF6FA] text-[#2D8DB8]">
                    <Icon size={15} strokeWidth={1.8} />
                  </span>
                  <span className="truncate whitespace-nowrap text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <footer className="mt-3 border-t border-slate-200 pt-2 text-[9px] text-slate-500">ERP Industrial · Dados e permissões protegidos pelo sistema</footer>
          </section>
        </div>
      )}
    </>
  )
}
