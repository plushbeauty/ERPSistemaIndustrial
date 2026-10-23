/**
 * SYSNQRA INDUSTRIAL — componentes visuais reutilizáveis
 * Data: 2026-10-23 | Revisão: UI-BASE-001
 * Escopo: primitives visuais opt-in; não altera estilos globais nem páginas existentes.
 * Contrato: controles comuns de 30px, labels compactos, bordas de 2px e paleta industrial.
 */
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...values: Array<string | undefined | false | null>) {
  return twMerge(clsx(values))
}

export type IndustrialLabelProps = LabelHTMLAttributes<HTMLLabelElement>

export function IndustrialLabel({ children, className, ...props }: IndustrialLabelProps) {
  return (
    <label
      className={cn('mb-0.5 block truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500', className)}
      {...props}
    >
      {children}
    </label>
  )
}

export interface IndustrialInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function IndustrialInput({
  label,
  error,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: IndustrialInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="w-full min-w-0">
      {label && <IndustrialLabel htmlFor={inputId}>{label}</IndustrialLabel>}
      <input
        {...props}
        id={inputId}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={[ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'h-[30px] w-full rounded-[2px] border bg-white px-2 text-xs text-slate-800 transition-colors placeholder:text-slate-400 focus:border-[#2D8DB8] focus:outline-none focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:cursor-not-allowed disabled:bg-slate-100',
          error ? 'border-red-500' : 'border-slate-300',
          className,
        )}
      />
      {error && <span id={errorId} role="alert" className="mt-0.5 block text-[10px] leading-tight text-red-600">{error}</span>}
    </div>
  )
}

export interface IndustrialSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export function IndustrialSelect({
  label,
  error,
  id,
  className,
  children,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: IndustrialSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="w-full min-w-0">
      {label && <IndustrialLabel htmlFor={selectId}>{label}</IndustrialLabel>}
      <select
        {...props}
        id={selectId}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={[ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'h-[30px] w-full rounded-[2px] border bg-white px-2 text-xs text-slate-800 transition-colors focus:border-[#2D8DB8] focus:outline-none focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:cursor-not-allowed disabled:bg-slate-100',
          error ? 'border-red-500' : 'border-slate-300',
          className,
        )}
      >
        {children}
      </select>
      {error && <span id={errorId} role="alert" className="mt-0.5 block text-[10px] leading-tight text-red-600">{error}</span>}
    </div>
  )
}

export type IndustrialButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
export interface IndustrialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IndustrialButtonVariant
  size?: 'sm' | 'md'
}

const buttonVariants: Record<IndustrialButtonVariant, string> = {
  primary: 'border border-[#2D8DB8] bg-[#2D8DB8] text-white hover:bg-[#237497] hover:border-[#237497]',
  secondary: 'border border-[#123B50] bg-[#123B50] text-white hover:bg-[#0c2837]',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  success: 'border border-[#3A9D78] bg-[#3A9D78] text-white hover:bg-[#2d7d5f]',
  danger: 'border border-[#D65B61] bg-[#D65B61] text-white hover:bg-[#b8484e]',
}

export function IndustrialButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
  ...props
}: IndustrialButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[2px] px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D8DB8]/40 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'px-2',
        buttonVariants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export interface IndustrialCardProps {
  title?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function IndustrialCard({ title, badge, actions, children, className, bodyClassName }: IndustrialCardProps) {
  return (
    <section className={cn('mb-3 rounded-[2px] border border-slate-200 bg-white shadow-sm', className)}>
      {title && (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/80 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[11px] font-bold uppercase tracking-wide text-[#123B50]">{title}</h2>
            {badge}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}

export type IndustrialBadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral'
export interface IndustrialBadgeProps {
  variant?: IndustrialBadgeVariant
  children: ReactNode
  className?: string
}

const badgeVariants: Record<IndustrialBadgeVariant, string> = {
  info: 'border-sky-200 bg-sky-50 text-[#2D8DB8]',
  success: 'border-emerald-200 bg-emerald-50 text-[#3A9D78]',
  warning: 'border-amber-200 bg-amber-50 text-[#9a670d]',
  danger: 'border-rose-200 bg-rose-50 text-[#D65B61]',
  neutral: 'border-slate-300 bg-slate-100 text-slate-600',
}

export function IndustrialBadge({ variant = 'neutral', children, className }: IndustrialBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', badgeVariants[variant], className)}>
      {children}
    </span>
  )
}

export interface IndustrialTableProps {
  headers: string[]
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export function IndustrialTable({ headers, children, className, ariaLabel }: IndustrialTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-[2px] border border-slate-200">
      <table aria-label={ariaLabel} className={cn('w-full border-collapse text-left', className)}>
        <thead>
          <tr className="h-7 border-b border-slate-200 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            {headers.map((header, index) => <th key={`${header}-${index}`} scope="col" className="px-2.5 py-1">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">{children}</tbody>
      </table>
    </div>
  )
}
