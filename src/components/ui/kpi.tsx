import React, { ReactNode } from "react";

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  yellow: "bg-amber-50 text-amber-800 ring-amber-600/10",
  red: "bg-rose-50 text-rose-700 ring-rose-600/10",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/10",
  gray: "bg-slate-100 text-slate-600 ring-slate-600/10",
} as const;

interface BadgeProps {
  tone: keyof typeof tones;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

interface KpiProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof tones;
}

export function Kpi({ label, value, hint, icon: Icon, tone = "blue" }: KpiProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center gap-4 p-4">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 ring-inset ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="font-mono text-2xl font-bold text-slate-900 mt-0.5">{value}</div>
        {hint && <div className="text-xs font-medium text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}
