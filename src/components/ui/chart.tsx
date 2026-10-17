import * as React from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

export interface ChartFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  height?: number
  hasData: boolean
  emptyMessage?: string
  children: React.ReactNode
}

/**
 * Moldura de gráfico analítico para o ERP.
 * O componente não cria séries nem valores: recebe dados reais do módulo consumidor.
 */
export function ChartFrame({
  title,
  description,
  height = 260,
  hasData,
  emptyMessage = 'Não há dados disponíveis para o período selecionado.',
  className,
  children,
  ...props
}: ChartFrameProps) {
  return (
    <section
      className={cn('min-w-0 border border-border bg-card text-card-foreground', className)}
      aria-label={title}
      {...props}
    >
      <header className="flex flex-col gap-1 border-b border-border px-3 py-2.5">
        <h3 className="text-xs font-semibold leading-4">{title}</h3>
        {description ? <p className="text-[11px] leading-4 text-muted-foreground">{description}</p> : null}
      </header>
      <div className="min-w-0 p-3">
        {hasData ? (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="flex items-center justify-center border border-dashed border-border bg-muted/40 px-4 text-center text-xs text-muted-foreground"
            style={{ minHeight: height }}
            role="status"
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
}
