/**
 * SYSNQRA ERP INDUSTRIAL — fundação visual premium.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 * Botão e grupo de ações padrão de todas as telas.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import '../../styles/synqra-premium-foundation-20261031.css'

export type ERPActionVariant = 'primary' | 'navy' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost'
export type ERPActionSize = 'sm' | 'md' | 'lg'

type ERPActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ERPActionVariant
  size?: ERPActionSize
  icon?: ReactNode
  loading?: boolean
  children: ReactNode
}

const sizeClass: Record<ERPActionSize, string> = { sm: ' sxp-btn--sm', md: '', lg: ' sxp-btn--lg' }

export function ERPAction({ variant = 'secondary', size = 'md', icon, loading = false, disabled, children, className = '', type = 'button', ...rest }: ERPActionProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`sxp-btn sxp-btn--${variant}${sizeClass[size]}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {loading ? <LoaderCircle className="sxp-btn__spinner" size={14} aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  )
}

export function ERPPageActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sxp-actions${className ? ` ${className}` : ''}`}>{children}</div>
}
