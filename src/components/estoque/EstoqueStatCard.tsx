/**
 * SYSNQRA ERP INDUSTRIAL — Estoque Stat + Card (protótipo visual)
 * Revisão: 2026-10-29
 *
 * Compatibilidade visual inspirada no contrato Stat + Card do Lumen UI.
 * Este componente não importa o pacote Lumen enquanto ele não estiver instalado
 * e fixado no package.json/package-lock.json. Não consulta nem inventa dados:
 * label/value são fornecidos pelo componente pai.
 */
import type { ReactNode } from 'react'

export type EstoqueStatCardTone = 'navy' | 'success' | 'warning' | 'danger' | 'cyan'

export interface EstoqueStatCardProps {
  label: string
  value: string
  description?: string
  icon?: ReactNode
  tone?: EstoqueStatCardTone
  loading?: boolean
  className?: string
}

const tones: Record<EstoqueStatCardTone, { background: string; border: string; iconBackground: string }> = {
  navy: { background: '#123B50', border: '#0B3042', iconBackground: '#2D8DB8' },
  success: { background: '#0F6748', border: '#052E21', iconBackground: '#16865D' },
  warning: { background: '#A94F00', border: '#6E2F00', iconBackground: '#D97722' },
  danger: { background: '#9F3039', border: '#74212A', iconBackground: '#C44750' },
  cyan: { background: '#247E91', border: '#145564', iconBackground: '#48B7C7' },
}

export function EstoqueStatCard({
  label,
  value,
  description,
  icon,
  tone = 'navy',
  loading = false,
  className = '',
}: EstoqueStatCardProps) {
  const palette = tones[tone]

  return (
    <article
      aria-busy={loading}
      className={`estoque-stat-card ${className}`.trim()}
      style={{
        background: palette.background,
        borderColor: palette.border,
      }}
    >
      <div className="estoque-stat-card__icon" aria-hidden="true" style={{ background: palette.iconBackground }}>
        {icon}
      </div>
      <div className="estoque-stat-card__content">
        <div className="estoque-stat-card__label">{label}</div>
        <div className="estoque-stat-card__value" aria-live="polite">
          {loading ? <span className="estoque-stat-card__skeleton" aria-label="Carregando" /> : value}
        </div>
        {description && !loading && <div className="estoque-stat-card__description">{description}</div>}
      </div>
      <style>{`
        .estoque-stat-card{position:relative;display:flex;align-items:center;gap:12px;min-width:0;min-height:88px;padding:14px;border:1px solid;border-radius:14px;overflow:hidden;box-shadow:0 8px 20px rgba(18,59,80,.12);color:#fff}
        .estoque-stat-card:after{content:"";position:absolute;right:-24px;bottom:-34px;width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.10);pointer-events:none}
        .estoque-stat-card__icon{position:relative;z-index:1;display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid rgba(255,255,255,.35);border-radius:12px;color:#fff;box-shadow:inset 0 1px 1px rgba(255,255,255,.25)}
        .estoque-stat-card__icon svg{width:20px;height:20px}
        .estoque-stat-card__content{position:relative;z-index:1;min-width:0}
        .estoque-stat-card__label{color:#fff;font-size:10px;font-weight:900;letter-spacing:.06em;line-height:1.35;text-transform:uppercase;overflow-wrap:anywhere}
        .estoque-stat-card__value{margin-top:5px;color:#fff;font-size:26px;font-weight:950;line-height:1.05;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
        .estoque-stat-card__description{margin-top:5px;color:rgba(255,255,255,.84);font-size:10px;font-weight:650;line-height:1.35}
        .estoque-stat-card__skeleton{display:block;width:78px;height:25px;border-radius:5px;background:rgba(255,255,255,.20);animation:estoque-stat-pulse 1.3s ease-in-out infinite}
        @keyframes estoque-stat-pulse{50%{opacity:.45}}
        @media(prefers-reduced-motion:reduce){.estoque-stat-card__skeleton{animation:none}}
        @media(max-width:640px){.estoque-stat-card{min-height:78px;padding:11px;gap:9px}.estoque-stat-card__icon{flex-basis:36px;width:36px;height:36px}.estoque-stat-card__value{font-size:23px}}
      `}</style>
    </article>
  )
}

export default EstoqueStatCard
