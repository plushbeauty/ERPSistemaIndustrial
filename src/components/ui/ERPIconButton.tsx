import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import './erp-ui.css'

type ERPIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  variant?: 'neutral' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function ERPIconButton({ icon: Icon, label, variant = 'neutral', size = 'md', className = '', ...props }: ERPIconButtonProps) {
  return <button {...props} aria-label={label} title={label} className={`erp-icon-button erp-icon-button--${variant} erp-icon-button--${size} ${className}`}>
    <Icon aria-hidden="true" />
  </button>
}
