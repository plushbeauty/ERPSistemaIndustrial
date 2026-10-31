import type { ComponentType, ReactNode, SVGProps } from 'react'

const badgeTones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  yellow: 'bg-amber-50 text-amber-800 ring-amber-600/10',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  gray: 'bg-slate-100 text-slate-600 ring-slate-600/10',
} as const

export type ERPBadgeTone = keyof typeof badgeTones

export function Badge({ tone, children }: { tone: ERPBadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  )
}

type KpiIcon = ComponentType<SVGProps<SVGSVGElement>>

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string
  hint?: string
  icon: KpiIcon
  tone?: ERPBadgeTone
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center gap-4">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 ring-inset ${badgeTones[tone]}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-0.5 font-mono text-2xl font-bold text-slate-900">{value}</div>
        {hint && <div className="mt-0.5 text-xs font-medium text-slate-400">{hint}</div>}
      </div>
    </div>
  )
}
