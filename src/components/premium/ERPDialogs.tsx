/**
 * SYSNQRA ERP INDUSTRIAL — modal, drawer e diálogo de confirmação premium.
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import '../../styles/synqra-premium-foundation-20261031.css'
import { ERPAction } from './ERPPageActions'

function useDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
}

type ERPModalProps = {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  width?: number
  children: ReactNode
}

export function ERPModal({ open, title, onClose, footer, width = 560, children }: ERPModalProps) {
  useDismiss(open, onClose)
  if (!open) return null
  return createPortal(
    <div
      className="sxp-backdrop"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="sxp-modal" role="dialog" aria-modal="true" aria-label={title} style={{ '--sxp-modal-w': `${width}px` } as CSSProperties}>
        <header className="sxp-modal__head">
          <h2 className="sxp-modal__title">{title}</h2>
          <button type="button" className="sxp-modal__close" onClick={onClose} aria-label="Fechar"><X size={14} /></button>
        </header>
        <div className="sxp-modal__body">{children}</div>
        {footer && <footer className="sxp-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

type ERPDrawerProps = {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  width?: number
  children: ReactNode
}

export function ERPDrawer({ open, title, onClose, footer, width = 460, children }: ERPDrawerProps) {
  useDismiss(open, onClose)
  if (!open) return null
  return createPortal(
    <>
      <div className="sxp-backdrop" onClick={onClose} aria-hidden />
      <aside className="sxp-drawer" role="dialog" aria-modal="true" aria-label={title} style={{ '--sxp-drawer-w': `${width}px` } as CSSProperties}>
        <header className="sxp-drawer__head">
          <h2 className="sxp-modal__title">{title}</h2>
          <button type="button" className="sxp-modal__close" onClick={onClose} aria-label="Fechar"><X size={14} /></button>
        </header>
        <div className="sxp-drawer__body">{children}</div>
        {footer && <footer className="sxp-drawer__foot">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}

export type ERPConfirmTone = 'danger' | 'primary' | 'success' | 'warning'

type ERPConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ERPConfirmTone
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ERPConfirmDialog({
  open, title, description, confirmLabel = 'CONFIRMAR', cancelLabel = 'CANCELAR',
  tone = 'danger', loading = false, onConfirm, onCancel,
}: ERPConfirmDialogProps) {
  return (
    <ERPModal
      open={open}
      title={title}
      onClose={loading ? () => undefined : onCancel}
      width={440}
      footer={(
        <>
          <ERPAction variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</ERPAction>
          <ERPAction variant={tone} onClick={onConfirm} disabled={loading} loading={loading}>{confirmLabel}</ERPAction>
        </>
      )}
    >
      <div className="sxp-field">{description}</div>
    </ERPModal>
  )
}
