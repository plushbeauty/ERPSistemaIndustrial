import { Link } from 'react-router-dom'
import '../../styles/quality-workspace-standard.css'
import { Activity, BookOpenCheck, ClipboardCheck, FileText, FolderGit2, Gauge, LineChart, SearchCheck, ShieldCheck, Target, Wrench } from 'lucide-react'

const tiles = [
  { label: 'Documentos controlados', detail: 'Cadastro, revisão e PDFs', route: '/qualidade/documentos', icon: FileText },
  { label: 'Não conformidades — RNC', detail: 'Registro, contenção e rastreio', route: '/qualidade/rnc', icon: ShieldCheck },
  { label: 'Espinha de Peixe — 6M', detail: 'Causas, efeito e impressão A4', route: '/qualidade/ishikawa', icon: Activity },
  { label: 'CAPA / 5W2H', detail: 'Ações, responsáveis e prazos', route: '/qualidade/capa', icon: ClipboardCheck },
  { label: 'Metodologia 8D', detail: 'Equipe, ações e eficácia', route: '/qualidade/metodologia-8d', icon: BookOpenCheck },
  { label: 'Inspeções', detail: 'Recebimento e processo', route: '/qualidade/inspecoes', icon: SearchCheck },
  { label: 'Especificações técnicas', detail: 'Critérios e revisões aprovadas', route: '/qualidade/especificacoes', icon: FileText },
  { label: 'FMEA / PFMEA', detail: 'Riscos e prevenção', route: '/qualidade/fmea', icon: Target },
  { label: 'CEP', detail: 'Cartas de controle', route: '/qualidade/cep', icon: LineChart },
  { label: 'GED / Lista Mestre', detail: 'Documentos vigentes', route: '/qualidade/ged-documentos', icon: FolderGit2 },
  { label: 'Calibração / Metrologia', detail: 'Instrumentos e validade', route: '/qualidade/calibracao', icon: Wrench },
  { label: 'Indicadores SGQ', detail: 'RNC, CAPA e tendências', route: '/qualidade/dashboard-rnc', icon: Gauge },
]

export default function QualitySidebar({ active }: { active: string }) {
  if (active !== '/qualidade') return null

  return (
    <section aria-label="Atalhos da Qualidade" className="col-span-full min-w-0 rounded-[3px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <ShieldCheck size={17} className="text-[#2D8DB8]" />
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[#123B50]">Painel rápido da Qualidade</h2>
          <p className="text-[10px] text-slate-500">Atalhos para abrir cada módulo individualmente. A navegação completa fica no menu principal do ERP.</p>
        </div>
      </div>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Módulos principais da Qualidade">
        {tiles.map(({ label, detail, route, icon: Icon }) => (
          <Link key={route} to={route} className="group flex min-h-[74px] min-w-0 items-start gap-2 rounded-[2px] border border-slate-200 bg-[#F4FBFD] p-2.5 text-[#123B50] transition-colors hover:border-[#2D8DB8] hover:bg-[#E5F3F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D8DB8]">
            <Icon size={17} className="mt-0.5 shrink-0 text-[#2D8DB8]" />
            <span className="min-w-0">
              <strong className="block text-[10px] leading-tight">{label}</strong>
              <small className="mt-1 block text-[9px] leading-snug text-slate-500">{detail}</small>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  )
}
