/**
 * SYSNQRA ERP INDUSTRIAL — tile de indicador.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import type { ComponentType, ReactNode } from 'react'
import '../../styles/synqra-premium-foundation-20261031.css'

export type MetricTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export type MetricDelta = {
  direction: 'up' | 'down' | 'flat'
  label: string
}

type ERPMetricCardProps = {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  delta?: MetricDelta
  tone?: MetricTone
  icon?: ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean }>
  spark?: number[]
  compact?: boolean
}

const toneClass: Record<MetricTone, string> = {
  info: '',
  success: ' sxp-kpi--success',
  warning: ' sxp-kpi--warning',
  danger: ' sxp-kpi--danger',
  neutral: ' sxp-kpi--neutral',
}

const MAX_SPARK = 12

function sparkHeights(values: number[]): number[] {
  const visible = values.slice(-MAX_SPARK)
  if (visible.length === 0) return []
  const max = Math.max(...visible)
  const min = Math.min(...visible)
  const span = max - min
  return visible.map((value) => (span === 0 ? 60 : 18 + ((value - min) / span) * 82))
}

export function ERPMetricCard({ label, value, unit, hint, delta, tone = 'info', icon: Icon, spark, compact = false }: ERPMetricCardProps) {
  const bars = spark ? sparkHeights(spark) : []
  return (
    <article className={`sxp-kpi${toneClass[tone]}`}>
      <div className="sxp-kpi__head">
        <span className="sxp-kpi__label">{label}</span>
        {Icon && <span className="sxp-kpi__icon"><Icon size={13} aria-hidden /></span>}
      </div>
      <strong className={`sxp-kpi__value${compact ? ' sxp-kpi__value--sm' : ''}`}>
        {value}
        {unit && <span className="sxp-kpi__unit">{unit}</span>}
      </strong>
      {(hint || delta || bars.length > 0) && (
        <div className="sxp-kpi__foot">
          {delta && <span className={`sxp-kpi__delta sxp-kpi__delta--${delta.direction}`}>{delta.label}</span>}
          {hint && <span>{hint}</span>}
          {bars.length > 0 && (
            <span className="sxp-kpi__spark" aria-hidden>
              {bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
