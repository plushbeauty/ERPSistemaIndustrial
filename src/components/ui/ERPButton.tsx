import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

export type ERPButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'neutral'

type ERPButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ERPButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  loading?: boolean
  children: ReactNode
}

export function ERPButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ERPButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`erp-button erp-button--${variant} erp-button--${size} ${className}`}
    >
      {loading ? <LoaderCircle className="erp-button__spinner" size={16} aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  )
}
