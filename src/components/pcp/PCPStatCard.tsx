/**
 * SYSNQRA ERP INDUSTRIAL — PCP Stat + Card visual prototype
 * @REVISAO 2026-10-29
 *
 * Pattern prototype aligned to the Lumen UI Card + Stat contract.
 * The Lumen package is not yet installed in this repository, so this component
 * uses local React markup/styles and does not claim to be the library component.
 * Values must come from the caller's authenticated, tenant-scoped data source.
 * No demo values, database calls, or changes to approved PCP pages are included.
 */
import type { ReactNode } from 'react'

export type PCPStatTone = 'default' | 'production' | 'queue' | 'completed' | 'alert'

export interface PCPStatCardProps {
  label: string
  value: string
  supportingText?: string
  icon?: ReactNode
  tone?: PCPStatTone
  loading?: boolean
  className?: string
}

const toneClass: Record<PCPStatTone, string> = {
  default: 'pcp-stat-card--default',
  production: 'pcp-stat-card--production',
  queue: 'pcp-stat-card--queue',
  completed: 'pcp-stat-card--completed',
  alert: 'pcp-stat-card--alert',
}

export function PCPStatCard({
  label,
  value,
  supportingText,
  icon,
  tone = 'default',
  loading = false,
  className = '',
}: PCPStatCardProps) {
  return (
    <article
      className={`pcp-stat-card ${toneClass[tone]} ${className}`.trim()}
      aria-busy={loading}
    >
      <div className="pcp-stat-card__top">
        <div className="pcp-stat-card__label">{label}</div>
        {icon ? <span className="pcp-stat-card__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="pcp-stat-card__value" aria-live="polite">
        {loading ? <span className="pcp-stat-card__skeleton" aria-label="Carregando" /> : value}
      </div>
      {supportingText && !loading ? (
        <div className="pcp-stat-card__supporting">{supportingText}</div>
      ) : null}
      <style>{`
        .pcp-stat-card{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;min-width:0;min-height:112px;padding:14px 16px;background:#fff;border:1px solid #dbe4ea;border-top:3px solid #2d8db8;border-radius:12px;box-shadow:0 2px 8px rgba(18,59,80,.06);color:#123b50}
        .pcp-stat-card__top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
        .pcp-stat-card__label{font-size:10px;font-weight:850;line-height:1.4;letter-spacing:.055em;text-transform:uppercase;color:#476273;overflow-wrap:anywhere}
        .pcp-stat-card__icon{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border:1px solid #d6e8ef;border-radius:9px;background:#f0f9fc;color:#247e91}
        .pcp-stat-card__icon svg{width:16px;height:16px}
        .pcp-stat-card__value{font-size:27px;font-weight:900;line-height:1.05;letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:#123b50;overflow-wrap:anywhere}
        .pcp-stat-card__supporting{font-size:10px;font-weight:600;line-height:1.4;color:#617987}
        .pcp-stat-card__skeleton{display:block;width:76px;height:25px;border-radius:5px;background:linear-gradient(90deg,#edf3f6 25%,#f7fafb 50%,#edf3f6 75%);background-size:200% 100%;animation:pcp-stat-shimmer 1.4s ease-in-out infinite}
        .pcp-stat-card--production{border-top-color:#2d8db8}
        .pcp-stat-card--queue{border-top-color:#e6a34a}
        .pcp-stat-card--completed{border-top-color:#3a9d78}
        .pcp-stat-card--alert{border-top-color:#d65b61}
        .pcp-stat-card--queue .pcp-stat-card__icon{background:#fff8ec;border-color:#f5dfbd;color:#a96310}
        .pcp-stat-card--completed .pcp-stat-card__icon{background:#eef9f3;border-color:#ccebd9;color:#27805e}
        .pcp-stat-card--alert .pcp-stat-card__icon{background:#fff1f1;border-color:#f2d0d2;color:#b43e48}
        @keyframes pcp-stat-shimmer{to{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.pcp-stat-card__skeleton{animation:none}}
        @media(max-width:640px){.pcp-stat-card{min-height:100px;padding:12px}.pcp-stat-card__value{font-size:24px}}
      `}</style>
    </article>
  )
}

export default PCPStatCard
