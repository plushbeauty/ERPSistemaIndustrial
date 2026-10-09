import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileText,
  Gauge,
  History,
  ListChecks,
  ShieldCheck,
  ShieldX,
  Wrench,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSynqraLayout } from '../../layout/SynqraLayoutContext'

const items = [
  { label: 'Visão geral da Qualidade', path: '/qualidade', icon: ShieldCheck },
  { label: 'Inspeções de lotes', path: '/qualidade/liberacao-lote', icon: ClipboardList },
  { label: 'Inspeção em processo', path: '/qualidade/inspecao-processo', icon: ListChecks },
  { label: 'Matriz FMEA / PFMEA', path: '/qualidade/pfmea', icon: AlertTriangle },
  { label: 'RNC e planos CAPA', path: '/qualidade/rnc', icon: ShieldX },
  { label: 'Painel CEP / gráficos', path: '/qualidade/dashboard-rnc', icon: BarChart3 },
  { label: 'Quarentena de lotes', path: '/qualidade/quarentena', icon: History },
  { label: 'Especificações e documentos', path: '/qualidade/documentos', icon: FileText },
  { label: 'Procedimentos', path: '/qualidade/procedimentos', icon: FileText },
  { label: 'Metrologia / calibração', path: '/qualidade/metrologia', icon: Gauge },
  { label: 'Auditoria 5S', path: '/qualidade/auditoria-5s', icon: Wrench },
]

export default function QualitySidebar({ active }: { active: string }) {
  const hostedBySynqra = useSynqraLayout()

  return (
    <aside
      className={hostedBySynqra
        ? 'col-span-full min-w-0 overflow-hidden border border-slate-200 bg-white'
        : 'hidden border border-slate-200 bg-white lg:block'}
    >
      {!hostedBySynqra && (
        <div className="border-b border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck size={16} aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wide">Qualidade</p>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Workspace Industrial</p>
        </div>
      )}
      <nav
        aria-label="Navegação da qualidade"
        className={hostedBySynqra
          ? 'flex min-w-0 gap-1 overflow-x-auto p-1'
          : 'space-y-px p-1'}
      >
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            aria-current={active === path ? 'page' : undefined}
            className={({ isActive }) => {
              const selected = isActive || active === path
              return `${hostedBySynqra
                ? 'min-h-8 flex-none gap-1.5 whitespace-nowrap px-2 text-[10px]'
                : 'min-h-8 w-full gap-2 px-2 text-left text-[11px]'} flex items-center rounded-[2px] border-l-2 transition-colors ${
                selected
                  ? 'border-[#2D8DB8] bg-neutral-100 font-semibold text-[#123B50]'
                  : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-[#123B50]'
              }`
            }}
          >
            <Icon size={hostedBySynqra ? 14 : 14} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
