/**
 * SYSNQRA ERP INDUSTRIAL — componente reutilizável Stat + Card
 * @REVISAO 2026-10-29
 * @STATUS_APROVACAO PROTOTIPO_ISOLADO
 *
 * Padrão visual inspirado no contrato Stat + Card do Lumen UI.
 * @santi020k/lumen-react não consta nos manifests atuais; implementação React
 * nativa para validar o padrão sem introduzir uma dependência não instalada.
 * O componente não busca dados nem acessa Supabase: valores vêm do módulo pai.
 */
import type { ReactNode } from 'react'

export type StatCardTone = 'navy' | 'blue' | 'cyan' | 'success' | 'warning' | 'danger'

export interface StatCardProps {
  label: string
  value: string | number
  supportingText?: string
  suffix?: string
  icon?: ReactNode
  tone?: StatCardTone
  loading?: boolean
  className?: string
  ariaLabel?: string
}

const palettes: Record<StatCardTone, { background: string; border: string; accent: string; iconBackground: string }> = {
  navy: { background: '#123B50', border: '#0B3042', accent: '#48B7C7', iconBackground: '#205D75' },
  blue: { background: '#1D5FD1', border: '#164AA5', accent: '#9FC5FF', iconBackground: '#174DAE' },
  cyan: { background: '#247E91', border: '#145564', accent: '#8CE5EE', iconBackground: '#1B6879' },
  success: { background: '#176B4D', border: '#0D5038', accent: '#8AE0B8', iconBackground: '#10583E' },
  warning: { background: '#8A4A08', border: '#673506', accent: '#FFD18A', iconBackground: '#713B07' },
  danger: { background: '#963640', border: '#74212A', accent: '#FFB0B5', iconBackground: '#7D2932' },
}

export function StatCard({
  label,
  value,
  supportingText,
  suffix,
  icon,
  tone = 'navy',
  loading = false,
  className = '',
  ariaLabel,
}: StatCardProps) {
  const palette = palettes[tone]

  return (
    <article
      className={`sysnqra-stat-card ${className}`.trim()}
      aria-busy={loading}
      aria-label={ariaLabel}
      style={{ background: palette.background, borderColor: palette.border }}
    >
      {icon ? (
        <span className="sysnqra-stat-card__icon" aria-hidden="true" style={{ background: palette.iconBackground, color: palette.accent }}>
          {icon}
        </span>
      ) : null}
      <div className="sysnqra-stat-card__body">
        <div className="sysnqra-stat-card__label">{label}</div>
        <div className="sysnqra-stat-card__value" aria-live="polite">
          {loading ? <span className="sysnqra-stat-card__skeleton" aria-label="Carregando" /> : (
            <>
              <span>{value}</span>
              {suffix ? <span className="sysnqra-stat-card__suffix">{suffix}</span> : null}
            </>
          )}
        </div>
        {supportingText && !loading ? <div className="sysnqra-stat-card__supporting">{supportingText}</div> : null}
      </div>
      <style>{`
        .sysnqra-stat-card{position:relative;isolation:isolate;box-sizing:border-box;display:flex;align-items:center;gap:12px;min-width:0;min-height:88px;padding:14px 16px;border:1px solid;border-radius:12px;overflow:hidden;box-shadow:0 5px 16px rgba(8,40,56,.14);color:#fff}
        .sysnqra-stat-card:after{content:"";position:absolute;z-index:-1;right:-28px;bottom:-38px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none}
        .sysnqra-stat-card__icon{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(255,255,255,.24);border-radius:10px}
        .sysnqra-stat-card__icon svg{width:19px;height:19px}
        .sysnqra-stat-card__body{flex:1;min-width:0}
        .sysnqra-stat-card__label{font-size:10px;font-weight:850;line-height:1.4;letter-spacing:.055em;text-transform:uppercase;color:#fff;overflow-wrap:anywhere}
        .sysnqra-stat-card__value{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin-top:5px;font-size:27px;font-weight:900;line-height:1.08;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:#fff;overflow-wrap:anywhere}
        .sysnqra-stat-card__suffix{font-size:11px;font-weight:800;letter-spacing:0}
        .sysnqra-stat-card__supporting{margin-top:5px;font-size:10px;font-weight:600;line-height:1.4;color:rgba(255,255,255,.82);overflow-wrap:anywhere}
        .sysnqra-stat-card__skeleton{display:inline-block;width:76px;height:24px;border-radius:5px;background:linear-gradient(90deg,rgba(255,255,255,.14) 25%,rgba(255,255,255,.32) 50%,rgba(255,255,255,.14) 75%);background-size:200% 100%;animation:sysnqra-stat-shimmer 1.4s ease-in-out infinite}
        @keyframes sysnqra-stat-shimmer{to{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.sysnqra-stat-card__skeleton{animation:none}}
        @media(max-width:640px){.sysnqra-stat-card{min-height:78px;padding:11px 12px;gap:9px}.sysnqra-stat-card__icon{flex-basis:34px;width:34px;height:34px}.sysnqra-stat-card__value{font-size:23px}}
      `}</style>
    </article>
  )
}

export default StatCard
