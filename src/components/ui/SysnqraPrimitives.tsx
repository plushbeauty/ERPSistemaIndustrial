import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

export function SysnqraButton({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button {...props} type={type} className={`sysnqra-button sysnqra-button--${variant} ${className}`.trim()} />
}

export function SysnqraInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`sysnqra-input ${className}`.trim()} />
}

type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function SysnqraCard({ title, description, actions, className = '', children, ...props }: CardProps) {
  return (
    <section {...props} className={`sysnqra-card ${className}`.trim()}>
      {(title || description || actions) && (
        <header className="sysnqra-card__header">
          <div>
            {title && <h2 className="sysnqra-card__title">{title}</h2>}
            {description && <p className="sysnqra-card__description">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function SysnqraTable({
  className = '',
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="sysnqra-table-scroll">
      <table {...props} className={`sysnqra-table ${className}`.trim()}>{children}</table>
    </div>
  )
}
