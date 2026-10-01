import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type FormFieldSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type FormFieldProps = {
  label?: ReactNode
  span?: Span
  size?: FormFieldSize
  id?: string
  children: ReactNode
  className?: string
}

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Form({ children, className, ...props }: ComponentPropsWithoutRef<'form'>) {
  return <form {...props} className={classes('erp-form', className)}>{children}</form>
}

export function FormRow({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={classes('erp-form-row', className)}>{children}</div>
}

export function FormField({ label, span, size, id, children, className }: FormFieldProps) {
  const fieldSpan = span ?? (size ? { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 }[size] : 12)
  return (
    <div className={classes('erp-form-field', `erp-w-${fieldSpan}`, size && `erp-field-${size}`, className)}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      {children}
    </div>
  )
}

export function FormInput({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} className={classes('erp-form-control', className)} />
}

export function FormSelect({ className, ...props }: ComponentPropsWithoutRef<'select'>) {
  return <select {...props} className={classes('erp-form-control', className)} />
}

export function FormDate({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} type="date" className={classes('erp-form-control', className)} />
}

export function FormTime({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} type="time" className={classes('erp-form-control', className)} />
}

export function FormNumber({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} type="number" className={classes('erp-form-control', className)} />
}

export function FormMoney({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} type="number" inputMode="decimal" step="0.01" className={classes('erp-form-control', className)} />
}

export function FormTextarea({ className, ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea {...props} className={classes('erp-form-control', className)} />
}

export function FormCheckbox({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input {...props} type="checkbox" className={classes('erp-form-checkbox', className)} />
}

export function FormActions({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={classes('erp-form-actions', className)}>{children}</div>
}

export function FormSection({ title, children, className, ...props }: ComponentPropsWithoutRef<'section'> & { title?: ReactNode }) {
  return (
    <section {...props} className={classes('erp-form-section', className)}>
      {title ? <h2 className="erp-form-section-title">{title}</h2> : null}
      {children}
    </section>
  )
}
