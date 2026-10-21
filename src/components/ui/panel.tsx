import React, { ReactNode } from "react";

// Tipagem estrita exigida pelo compilador do Vercel
interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Panel({ title, children, className = "", action }: PanelProps) {
  return (
    <section className={`rounded-xl bg-white border border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

interface PageHeaderProps {
  crumb: string;
  title: string;
  right?: ReactNode;
}

export function PageHeader({ crumb, title, right }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/60 pb-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{crumb}</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      </div>
      {right}
    </div>
  );
}
