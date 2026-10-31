/**
 * SYSNQRA ERP INDUSTRIAL — seções e campos de formulário premium.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import type { ReactNode } from 'react'
import '../../styles/synqra-premium-foundation-20261031.css'

type ERPFormSectionProps = {
  title: string
  index?: number | string
  hint?: ReactNode
  actions?: ReactNode
  columns?: 1 | 2 | 3 | 4
  children: ReactNode
}

export function ERPFormSection({ title, index, hint, actions, columns = 3, children }: ERPFormSectionProps) {
  return (
    <section className="sxp-section">
      <header className="sxp-section__head">
        <h3 className="sxp-section__title">
          {index != null && <span className="sxp-section__index">{index}</span>}
          {title}
        </h3>
        <span className="sxp-panel__actions">
          {hint && <span className="sxp-panel__hint">{hint}</span>}
          {actions}
        </span>
      </header>
      <div className="sxp-section__body" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {children}
      </div>
    </section>
  )
}

export function ERPFormGrid({ columns = 3, children, span }: { columns?: 1 | 2 | 3 | 4; children: ReactNode; span?: number }) {
  return (
    <div
      className="sxp-section__body"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        ...(span ? { gridColumn: `span ${span}` } : {}),
      }}
    >
      {children}
    </div>
  )
}

type ERPFormFieldProps = {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  /** Quantidade de colunas que o campo ocupa na grade do formulário. */
  span?: number
  children: ReactNode
}

export function ERPFormField({ label, htmlFor, required, hint, error, span, children }: ERPFormFieldProps) {
  return (
    <div className="sxp-field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label className="sxp-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="sxp-field__req" aria-hidden>*</span>}
      </label>
      {children}
      {error
        ? <span className="sxp-field__error" role="alert">{error}</span>
        : hint ? <span className="sxp-field__hint">{hint}</span> : null}
    </div>
  )
}

export function ERPFormNote({ tone = 'warning', children }: { tone?: 'warning' | 'danger' | 'success'; children: ReactNode }) {
  return <p className={`sxp-note sxp-note--${tone}`}>{children}</p>
}
