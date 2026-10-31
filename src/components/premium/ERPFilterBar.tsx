/**
 * SYSNQRA ERP INDUSTRIAL — barra de filtros premium.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import type { ReactNode } from 'react'
import '../../styles/synqra-premium-foundation-20261031.css'

export function ERPFilterBar({ children, tags }: { children: ReactNode; tags?: ReactNode }) {
  return (
    <div className="sxp-filters" role="search">
      {children}
      {tags && <div className="sxp-filters__tags">{tags}</div>}
    </div>
  )
}

export function ERPFilterField({ label, grow, children }: { label: string; grow?: boolean; children: ReactNode }) {
  return (
    <div className={`sxp-filters__field${grow ? ' sxp-filters__grow' : ''}`}>
      <span className="sxp-field__label">{label}</span>
      {children}
    </div>
  )
}

export function ERPFilterSpacer() {
  return <span className="sxp-filters__spacer" aria-hidden />
}
