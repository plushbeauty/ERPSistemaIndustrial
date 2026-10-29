/**
 * SYSNQRA ERP INDUSTRIAL — Dashboard Stat + Card visual prototype
 * @REVISAO 2026-10-29
 * @STATUS_APROVACAO PROTOTIPO_ISOLADO
 *
 * Visual-only prototype based on the existing approved dashboard KPI treatment.
 * The dashboard itself is frozen and intentionally not modified by this change.
 * @santi020k/lumen-react is not present in package.json/package-lock.json, so
 * this uses React markup rather than importing an unavailable dependency.
 * Pass only values calculated from the authenticated, tenant-scoped dashboard data.
 */
import type { ReactNode } from 'react'

export type DashboardStatTone = 'navy' | 'green' | 'orange' | 'cyan'

export interface DashboardStatCardProps {
  label: string
  value: string
  suffix?: string
  icon?: ReactNode
  tone?: DashboardStatTone
  loading?: boolean
  className?: string
}

const tones: Record<DashboardStatTone, { background: string; border: string; glow: string; icon: string }> = {
  navy: { background: 'linear-gradient(135deg,#17445A,#0B3042)', border: '#082838', glow: 'rgba(72,183,199,.32)', icon: 'linear-gradient(145deg,#2D8DB8 0%,#17445A 58%,#0B3042 100%)' },
  green: { background: 'linear-gradient(135deg,#0F6748,#063C2A)', border: '#052E21', glow: 'rgba(72,183,199,.18)', icon: 'linear-gradient(145deg,#31B982 0%,#0F6748 58%,#063C2A 100%)' },
  orange: { background: 'linear-gradient(135deg,#A94F00,#6E2F00)', border: '#542300', glow: 'rgba(255,255,255,.14)', icon: 'linear-gradient(145deg,#E58A36 0%,#A94F00 58%,#6E2F00 100%)' },
  cyan: { background: 'linear-gradient(135deg,#247E91,#145564)', border: '#0F4652', glow: 'rgba(18,59,80,.20)', icon: 'linear-gradient(145deg,#48B7C7 0%,#247E91 58%,#145564 100%)' },
}

export function DashboardStatCard({
  label,
  value,
  suffix,
  icon,
  tone = 'navy',
  loading = false,
  className = '',
}: DashboardStatCardProps) {
  const palette = tones[tone]

  return (
    <article
      className={`dashboard-stat-card ${className}`.trim()}
      aria-busy={loading}
      style={{ background: palette.background, borderColor: palette.border }}
    >
      <span className="dashboard-stat-card__glow" aria-hidden="true" style={{ background: palette.glow }} />
      {icon ? (
        <span className="dashboard-stat-card__icon" aria-hidden="true" style={{ background: palette.icon }}>
          {icon}
        </span>
      ) : null}
      <div className="dashboard-stat-card__content">
        <div className="dashboard-stat-card__label">{label}</div>
        <div className="dashboard-stat-card__value" aria-live="polite">
          {loading ? <span className="dashboard-stat-card__skeleton" aria-label="Carregando" /> : value}
          {!loading && suffix ? <span className="dashboard-stat-card__suffix">{suffix}</span> : null}
        </div>
      </div>
      <style>{`
        .dashboard-stat-card{position:relative;isolation:isolate;box-sizing:border-box;display:flex;align-items:center;gap:13px;min-width:0;min-height:76px;padding:12px 14px;border:1px solid;border-radius:14px;box-shadow:0 10px 24px rgba(8,40,56,.24);overflow:hidden;color:#fff}
        .dashboard-stat-card__glow{position:absolute;z-index:-1;right:-26px;bottom:-38px;width:104px;height:104px;border-radius:50%;pointer-events:none}
        .dashboard-stat-card__icon{position:relative;z-index:1;display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;border-radius:15px;color:#fff;border:1px solid rgba(255,255,255,.42);box-shadow:0 11px 0 rgba(5,28,39,.38),0 17px 24px rgba(5,28,39,.24),inset 0 2px 2px rgba(255,255,255,.45),inset 0 -7px 10px rgba(0,0,0,.2);transform:perspective(180px) rotateX(4deg)}
        .dashboard-stat-card__icon svg{width:21px;height:21px}
        .dashboard-stat-card__content{position:relative;z-index:1;min-width:0;flex:1}
        .dashboard-stat-card__label{font-size:13px;font-weight:950;letter-spacing:.04em;line-height:1.2;color:#fff;overflow-wrap:anywhere;text-shadow:0 1px 2px rgba(0,0,0,.55)}
        .dashboard-stat-card__value{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin-top:5px;font-size:29px;font-weight:950;line-height:1.08;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55);overflow-wrap:anywhere}
        .dashboard-stat-card__suffix{font-size:12px;font-weight:900;letter-spacing:0}
        .dashboard-stat-card__skeleton{display:inline-block;width:72px;height:25px;border-radius:5px;background:linear-gradient(90deg,rgba(255,255,255,.16) 25%,rgba(255,255,255,.35) 50%,rgba(255,255,255,.16) 75%);background-size:200% 100%;animation:dashboard-stat-shimmer 1.4s ease-in-out infinite}
        @keyframes dashboard-stat-shimmer{to{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.dashboard-stat-card__skeleton{animation:none}}
        @media(max-width:640px){.dashboard-stat-card{gap:10px;padding:11px 12px;min-height:70px}.dashboard-stat-card__icon{flex-basis:40px;width:40px;height:40px;border-radius:12px}.dashboard-stat-card__value{font-size:25px}.dashboard-stat-card__label{font-size:11px}}
      `}</style>
    </article>
  )
}

export default DashboardStatCard
