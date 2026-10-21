import * as React from 'react'
import { ChevronDown } from 'lucide-react'

type AccordionContextValue = { openItems: string[]; toggle: (value: string) => void }
const AccordionContext = React.createContext<AccordionContextValue | null>(null)

type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
}

function Accordion({ type = 'single', collapsible = true, defaultValue, value, onValueChange, className, children, ...props }: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    const initial = value ?? defaultValue
    return Array.isArray(initial) ? initial : initial ? [initial] : []
  })
  const controlled = value !== undefined
  const raw = controlled ? value : internalValue
  const openItems = Array.isArray(raw) ? raw : raw ? [raw] : []
  const toggle = (item: string) => {
    let next: string[]
    if (openItems.includes(item)) next = collapsible || type === 'multiple' ? openItems.filter((v) => v !== item) : openItems
    else next = type === 'multiple' ? [...openItems, item] : [item]
    if (!controlled) setInternalValue(next)
    onValueChange?.(type === 'multiple' ? next : next[0] ?? '')
  }
  return <AccordionContext.Provider value={{ openItems, toggle }}><div data-slot="accordion" className={className} {...props}>{children}</div></AccordionContext.Provider>
}

function AccordionItem({ value, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error('AccordionItem precisa estar dentro de Accordion')
  return <div data-slot="accordion-item" data-state={context.openItems.includes(value) ? 'open' : 'closed'} className={['border-b border-slate-200/80 last:border-b-0', className].filter(Boolean).join(' ')} {...props}>{React.Children.map(children, (child) => React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ 'data-accordion-value'?: string }>, { 'data-accordion-value': value }) : child)}</div>
}

function AccordionTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(AccordionContext)
  const item = React.useContext(AccordionItemValueContext)
  const value = (props as TriggerPropsWithAccordionValue)['data-accordion-value'] ?? item
  const open = Boolean(value && context?.openItems.includes(value))
  return <button type="button" aria-expanded={open} className={['flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500', className].filter(Boolean).join(' ')} onClick={() => value && context?.toggle(value)} {...props}>{children}<ChevronDown aria-hidden="true" className={['h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open ? 'rotate-180 text-blue-600' : ''].join(' ')} /></button>
}
type TriggerPropsWithAccordionValue = React.ButtonHTMLAttributes<HTMLButtonElement> & { 'data-accordion-value'?: string }\nconst AccordionItemValueContext = React.createContext<string | null>(null)

function AccordionContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(AccordionContext)
  const value = (props as React.HTMLAttributes<HTMLDivElement> & { 'data-accordion-value'?: string })['data-accordion-value']
  const open = Boolean(value && context?.openItems.includes(value))
  if (!open) return null
  return <div data-slot="accordion-content" className={['pb-4 pt-0 text-sm text-slate-600', className].filter(Boolean).join(' ')} {...props}>{children}</div>
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
