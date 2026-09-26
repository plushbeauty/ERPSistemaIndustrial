import type { ReactNode } from 'react'
import { ArrowLeft, Save, Printer, X } from 'lucide-react'
import './industrial-page-shell.css'

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
  primary: 'ips-action ips-action-blue',
  success: 'ips-action ips-action-green',
  danger: 'ips-action ips-action-red',
  neutral: 'ips-action ips-action-slate',
}

export default function IndustrialPageShell({ module, title, subtitle, children, actions = [], backHref, footer, tablet = false }: Props) {
  return (
    <main className={tablet ? 'ips-page ips-page-tablet' : 'ips-page'}>
      <div className="ips-page-inner">
        <header className="ips-header">
          <div className="ips-heading">
            <div className="ips-breadcrumb">ERP INDUSTRIAL <span>/</span> {module}</div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="ips-toolbar" aria-label="Ações da tela">
            {backHref && <button type="button" className={actionClass.neutral} onClick={() => { window.location.href = backHref }}><ArrowLeft size={18} /> VOLTAR</button>}
            {actions.map((action, index) => (
              <button key={action.label + index} type="button" disabled={action.disabled} className={actionClass[action.type ?? 'neutral']} onClick={action.onClick}>
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </header>

        <section className="ips-workspace">
          {children}
        </section>

        {footer ?? (
          <footer className="ips-footer">
            <span>ERP Industrial</span>
            <span>Dados reais • RLS por empresa • Sem dados fictícios</span>
          </footer>
        )}
      </div>
    </main>
  )
}

export function SectionCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`ips-card ${className}`}><h2>{title}</h2>{children}</section>
}

export function Field({ label, children, required = false, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return <label className={`ips-field ${className}`}><span>{label}{required && ' *'}</span>{children}</label>
}

export function ToolbarButton({ children, onClick, tone = 'neutral', disabled = false }: { children: ReactNode; onClick?: () => void; tone?: PageAction['type']; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={actionClass[tone ?? 'neutral']}>{children}</button>
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="ips-table-wrap"><table className="ips-table">{children}</table></div>
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="ips-close" onClick={onClick} aria-label="Fechar"><X size={20} /></button>
}
