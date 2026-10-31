/**
 * SYSNQRA ERP INDUSTRIAL — selo de status, estados vazio/carregando/erro.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import '../../styles/synqra-premium-foundation-20261031.css'
import { ERPAction } from './ERPPageActions'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'navy'

const STATUS_BY_LABEL: Record<string, StatusTone> = {
  aberto: 'info', pendente: 'warning', aguardando: 'warning', aprovado: 'success', liberado: 'success',
  concluido: 'success', finalizado: 'success', ativo: 'success', pago: 'success', recebido: 'success',
  cancelado: 'danger', recusado: 'danger', bloqueado: 'danger', vencido: 'danger', reprovado: 'danger',
  rascunho: 'neutral', draft: 'neutral',
}

export function ERPStatusBadge({ label, tone, dot = true }: { label: string; tone?: StatusTone; dot?: boolean }) {
  const resolved: StatusTone = tone ?? STATUS_BY_LABEL[label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] ?? 'neutral'
  return <span className={`sxp-chip sxp-chip--${resolved}`}>{dot && <i className="sxp-chip__dot" aria-hidden />}{label}</span>
}

export function ERPEmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="sxp-emptystate">
      <span className="sxp-emptystate__icon">{icon ?? <Inbox size={17} aria-hidden />}</span>
      <h3 className="sxp-emptystate__title">{title}</h3>
      {description && <p className="sxp-emptystate__desc">{description}</p>}
      {action && <div className="sxp-emptystate__action">{action}</div>}
    </div>
  )
}

export function ERPErrorState({ message, onRetry, action, title = 'Não foi possível carregar' }: { message: string; onRetry?: () => void; action?: ReactNode; title?: string }) {
  return (
    <div className="sxp-errorstate" role="alert">
      <span className="sxp-errorstate__icon"><AlertTriangle size={17} aria-hidden /></span>
      <h3 className="sxp-errorstate__title">{title}</h3>
      <p className="sxp-errorstate__desc">{message}</p>
      <div className="sxp-errorstate__actions">
        {onRetry && <ERPAction variant="primary" icon={<RefreshCw size={13} aria-hidden />} onClick={onRetry}>TENTAR NOVAMENTE</ERPAction>}
        {action}
      </div>
    </div>
  )
}

export function ERPLoadingState({ rows = 5, columns = 4, label = 'Carregando dados…' }: { rows?: number; columns?: number; label?: string }) {
  const widths = Array.from({ length: columns }, (_, index) => (index === 0 ? 26 : index === columns - 1 ? 14 : 100 / (columns - 1)))
  return (
    <div className="sxp-loading" aria-busy="true" aria-live="polite">
      <span className="sxp-visually-hidden">{label}</span>
      <div className="sxp-skeleton">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="sxp-skeleton__row">
            {widths.map((width, columnIndex) => (
              <span key={columnIndex} className="sxp-skeleton__cell" style={{ width: `${width}%`, flexGrow: 1 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
