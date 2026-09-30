/**
 * Desenvolvedor: FernandoSch
 * Status do Build Local: Não executado — validação será feita no gate remoto.
 */
import type { ReactNode } from 'react'
import { ArrowLeft, ClipboardList, X } from 'lucide-react'
import IndustrialReferenceShell from '../../layout/IndustrialReferenceShell'

export type PageAction = {
  label: string
  onClick?: () => void
  type?: 'primary' | 'success' | 'danger' | 'neutral'
  icon?: ReactNode
  disabled?: boolean
}

type Props = {
  module: string
  title: string
  subtitle?: string
  children: ReactNode
  actions?: PageAction[]
  backHref?: string
  footer?: ReactNode
  tablet?: boolean
}

const actionClass: Record<NonNullable<PageAction['type']>, string> = {
  primary: 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800',
  success: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
  danger: 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800',
  neutral: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
}

export default function IndustrialPageShell({ module, title, subtitle, children, actions = [], backHref, footer }: Props) {
  const nav = [{ id: 'current', label: title, icon: ClipboardList }]

  const actionNodes = (
    <>
      {backHref && (
        <button type="button" className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3 text-xs font-black shadow-sm ${actionClass.neutral}`} onClick={() => { window.location.href = backHref }}>
          <ArrowLeft size={16} /> VOLTAR
        </button>
      )}
      {actions.map((action, index) => (
        <button
          key={action.label + index}
          type="button"
          disabled={action.disabled}
          className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3 text-xs font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${actionClass[action.type ?? 'neutral']}`}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </>
  )

  return (
    <IndustrialReferenceShell
      moduleLabel={module}
      title={title}
      nav={nav}
      activeId="current"
      onNav={() => {}}
      onHome={() => { window.location.href = '/tablet/dashboard' }}
      actions={actionNodes}
    >
      <div className="erp-dense space-y-4">
        {subtitle && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
          </div>
        )}
        {children}
        {footer ?? (
          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm">
            <span>SYSNQRA ERP & SGQ INDUSTRIAL</span>
            <span>Dados reais • RLS por empresa • Sem dados fictícios</span>
          </footer>
        )}
      </div>
    </IndustrialReferenceShell>
  )
}

export function SectionCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}><h2 className="mb-3 text-base font-black text-slate-900">{title}</h2>{children}</section>
}

export function Field({ label, children, required = false, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return <label className={`grid gap-1 text-[12px] font-black text-slate-700 ${className}`}><span>{label}{required && ' *'}</span>{children}</label>
}

export function ToolbarButton({ children, onClick, tone = 'neutral', disabled = false }: { children: ReactNode; onClick?: () => void; tone?: PageAction['type']; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-3 text-[13px] font-black shadow-sm disabled:opacity-50 ${actionClass[tone ?? 'neutral']}`}>{children}</button>
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] border-collapse text-[13px]">{children}</table></div>
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50" onClick={onClick} aria-label="Fechar"><X size={20} /></button>
}
