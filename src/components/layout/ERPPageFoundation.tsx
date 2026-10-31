/**
 * SYSNQRA ERP INDUSTRIAL — cabeçalho e moldura de página.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import type { ReactNode } from 'react'
import '../../styles/synqra-premium-foundation-20261031.css'

export type ERPPageMetaTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'navy'

export type ERPPageMeta = {
  label: string
  value: ReactNode
  tone?: ERPPageMetaTone
}

type ERPPageHeaderProps = {
  module: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ERPPageMeta[]
}

export function ERPPageHeader({ module, title, description, actions, meta = [] }: ERPPageHeaderProps) {
  return (
    <header className="sxp-header">
      <div className="sxp-header__row">
        <div className="sxp-header__left">
          <span className="sxp-header__eyebrow">{module}</span>
          <h1 className="sxp-header__title">{title}</h1>
          {description && <p className="sxp-header__sub">{description}</p>}
        </div>
        {actions && <div className="sxp-header__actions">{actions}</div>}
      </div>
      {meta.length > 0 && (
        <div className="sxp-header__meta">
          {meta.map((item) => (
            <span key={item.label} className={`sxp-chip sxp-chip--${item.tone ?? 'navy'} sxp-metaitem`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      )}
    </header>
  )
}

type ERPPageLayoutProps = {
  module: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ERPPageMeta[]
  kpis?: ReactNode
  toolbar?: ReactNode
  banner?: ReactNode
  children: ReactNode
}

export function ERPPageLayout({ module, title, description, actions, meta, kpis, toolbar, banner, children }: ERPPageLayoutProps) {
  return (
    <div className="sxp-page">
      <div className="sxp-page__inner">
        <ERPPageHeader module={module} title={title} description={description} actions={actions} meta={meta} />
        {kpis}
        {banner}
        {toolbar}
        {children}
      </div>
    </div>
  )
}

type ERPPanelProps = {
  title?: ReactNode
  hint?: string
  actions?: ReactNode
  footer?: ReactNode
  flush?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function ERPPanel({ title, hint, actions, footer, flush = false, className = '', bodyClassName = '', children }: ERPPanelProps) {
  return (
    <section className={`sxp-panel${className ? ` ${className}` : ''}`}>
      {(title || actions) && (
        <div className="sxp-panel__head">
          <div className="sxp-panel__titles">
            {title && <h2 className="sxp-panel__title">{title}</h2>}
            {hint && <span className="sxp-panel__hint">{hint}</span>}
          </div>
          {actions && <div className="sxp-panel__actions">{actions}</div>}
        </div>
      )}
      <div className={`sxp-panel__body${flush ? ' sxp-panel__body--flush' : ''}${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
      {footer && <div className="sxp-panel__foot">{footer}</div>}
    </section>
  )
}

export function ERPGrid({ columns = 3, children, className = '' }: { columns?: 2 | 3 | 4 | 6; children: ReactNode; className?: string }) {
  return <div className={`sxp-grid sxp-grid--${columns}${className ? ` ${className}` : ''}`}>{children}</div>
}
