import { ShieldCheck,
  Activity, BarChart3, Boxes, CalendarDays, ClipboardList, Factory,
  FileSliders, Gauge, ListOrdered, PackageSearch, RefreshCw, Wrench, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ModuleItem = {
  number: string
  label: string
  description: string
  route: string
  icon: LucideIcon
}

const modules: readonly ModuleItem[] = [
  { number: 'P01', label: 'VISÃO GERAL', description: 'Indicadores, ordens abertas e alertas do PCP.', route: '/pcp', icon: Gauge },
  { number: 'P02', label: 'ORDENS INDUSTRIAIS', description: 'Carteira de ordens e apontamentos de produção.', route: '/pcp/ordens-industriais', icon: ClipboardList },
  { number: 'P03', label: 'ORDENS / MRP', description: 'Ordens, vínculo com pedidos e necessidades de materiais.', route: '/pcp/ordens', icon: Boxes },
  { number: 'P04', label: 'DEMANDA', description: 'Demanda comercial que alimenta o planejamento.', route: '/pcp/demanda', icon: PackageSearch },
  { number: 'P05', label: 'AGENDA DE MÁQUINAS', description: 'Programação semanal por máquina e molde.', route: '/pcp/agenda-maquinas', icon: CalendarDays },
  { number: 'P06', label: 'CAPACIDADE / GANTT', description: 'Carga de trabalho e recursos produtivos.', route: '/pcp/capacidade', icon: BarChart3 },
  { number: 'P07', label: 'SEQUENCIAMENTO', description: 'Fila e sequência de produção.', route: '/pcp/sequenciamento', icon: ListOrdered },
  { number: 'P08', label: 'MRP II', description: 'Necessidades de materiais e planejamento.', route: '/pcp/mrp-ii', icon: Boxes },
  { number: 'P09', label: 'FICHAS DE PROCESSO', description: 'Parâmetros técnicos, ferramentas e revisões.', route: '/pcp/fichas-processo', icon: FileSliders },
  { number: 'P10', label: 'PLANEJAMENTO', description: 'Planejamento agregado e capacidade.', route: '/pcp/planejamento', icon: Activity },
  { number: 'P11', label: 'PARADAS / SETUP', description: 'Ocorrências e tempos de parada.', route: '/pcp/paradas', icon: Wrench },
  { number: 'P12', label: 'OEE / INDICADORES', description: 'Indicadores de eficiência produtiva.', route: '/pcp/dashboard-oee', icon: RefreshCw },
  { number: 'P13', label: 'AUDITORIA PCP', description: 'Registro de conformidade, erros e melhorias do PCP.', route: '/pcp/auditoria', icon: ShieldCheck },
]

export default function PCPTabletMenuModal({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-[5px] sm:p-[18px]"
      role="dialog"
      aria-modal="true"
      aria-label="Central de módulos do PCP"
      onMouseDown={onClose}
    >
      <section
        className="flex max-h-[calc(100vh-32px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[3px] border border-[#405363] bg-[#1e222b] p-3 text-white shadow-[0_32px_100px_rgba(2,6,23,0.62)] sm:max-h-[calc(100vh-48px)] sm:p-5"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#405363] pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] text-white">
              <Factory size={22} />
            </span>
            <div className="min-w-0">
              <strong className="block text-[14px] font-bold leading-tight tracking-[0.08em] text-white">PCP · CENTRAL DE MANUFATURA</strong>
              <p className="mt-1 text-[11px] leading-tight text-slate-300">Selecione uma rotina para abrir a tela operacional correspondente.</p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px] border border-slate-500 bg-slate-100 text-slate-700 hover:bg-white"
            onClick={onClose}
            aria-label="Fechar central do PCP"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto pr-1 max-[1050px]:grid-cols-3 max-[720px]:grid-cols-2 max-[420px]:grid-cols-1">
          {modules.map(module => {
            const Icon = module.icon
            return (
              <button
                key={module.number}
                type="button"
                onClick={() => onNavigate(module.route)}
                className="group flex min-h-[106px] min-w-0 flex-col items-start border border-[#3a4654] bg-[#272d38] p-3 text-left transition-colors hover:border-[#48B7C7] hover:bg-[#303947] focus:outline-none focus:ring-2 focus:ring-[#48B7C7]"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="grid h-8 w-8 place-items-center border border-[#2D8DB8]/70 bg-[#123B50] text-[#9be4ef]">
                    <Icon size={17} />
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400">{module.number}</span>
                </span>
                <strong className="mt-2 text-[10px] font-bold tracking-wide text-white">{module.label}</strong>
                <span className="mt-1 text-[10px] leading-4 text-slate-300">{module.description}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
