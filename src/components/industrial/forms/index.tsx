import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type Span = 1|2|3|4|5|6|7|8|9|10|11|12
type FieldProps = { label?: ReactNode; span?: Span; children: ReactNode; className?: string }

export function Form({ children, className='' }: { children: ReactNode; className?: string }) {
  return <form className={'erp-form erp-form-grid ' + className}>{children}</form>
}
export function FormRow({ children }: { children: ReactNode }) { return <div className="erp-form-row">{children}</div> }
export function FormField({ label, span=12, children, className='' }: FieldProps) {
  return <div className={'erp-form-field erp-w-' + span + ' ' + className}>{label ? <label>{label}</label> : null}{children}</div>
}
export function FormInput(props: ComponentPropsWithoutRef<'input'>) { return <input {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormSelect(props: ComponentPropsWithoutRef<'select'>) { return <select {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormDate(props: ComponentPropsWithoutRef<'input'>) { return <input type="date" {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormTime(props: ComponentPropsWithoutRef<'input'>) { return <input type="time" {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormNumber(props: ComponentPropsWithoutRef<'input'>) { return <input type="number" {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormMoney(props: ComponentPropsWithoutRef<'input'>) { return <input type="number" inputMode="decimal" step="0.01" {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormTextarea(props: ComponentPropsWithoutRef<'textarea'>) { return <textarea {...props} className={'erp-form-control ' + (props.className ?? '')} /> }
export function FormCheckbox(props: ComponentPropsWithoutRef<'input'>) { return <input type="checkbox" {...props} /> }
export function FormActions({ children, className='' }: { children: ReactNode; className?: string }) { return <div className={'erp-form-actions ' + className}>{children}</div> }
export function FormSection({ title, children, className='' }: { title?: ReactNode; children: ReactNode; className?: string }) { return <section className={'erp-form-section ' + className}>{title ? <h2 className="erp-form-section-title">{title}</h2> : null}{children}</section> }
