/**
 * SYSNQRA ERP INDUSTRIAL — visualizador de documentos (GED / SGQ).
 * Revisão: PREMIUM-FOUNDATION-20261031-01 | Desenvolvedor: Fernando Schuinsekel
 */
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Download, ExternalLink, FileText, Maximize2, Minimize2 } from 'lucide-react'
import '../../styles/synqra-premium-foundation-20261031.css'
import { ERPAction } from './ERPPageActions'
import { ERPEmptyState, ERPErrorState } from './ERPStatusBadge'

type ERPDocumentViewerProps = {
  /** URL assinada ou pública do arquivo no Supabase Storage. */
  src: string | null
  title: string
  /** Código do documento (ex.: QMD-001 rev. 04) exibido na barra. */
  code?: string
  meta?: string
  /** Permite download direto; recebe a URL do arquivo original. */
  downloadUrl?: string | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  height?: string
}

export function ERPDocumentViewer({
  src, title, code, meta, downloadUrl, loading = false, error = null, onRetry, height = '72vh',
}: ERPDocumentViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const extension = useMemo(() => {
    const clean = (src ?? '').split('?')[0]
    const dot = clean.lastIndexOf('.')
    return dot > 0 ? clean.slice(dot + 1).toUpperCase().slice(0, 4) : 'DOC'
  }, [src])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  const isPdf = extension === 'PDF'

  return (
    <div className="sxp-docviewer">
      <div className="sxp-docviewer__bar">
        <span className="sxp-panel__titles">
          <span className="sxp-panel__title"><FileText size={13} /> {code ? `${code} — ${title}` : title}</span>
          {meta && <span className="sxp-panel__hint">{meta}</span>}
        </span>
        <span className="sxp-panel__actions">
          <ERPAction variant="ghost" size="sm" icon={expanded ? Minimize2 : Maximize2} onClick={() => setExpanded((v) => !v)} disabled={!src}>
            {expanded ? 'REDUZIR' : 'AMPLIAR'}
          </ERPAction>
          {src && <a className="sxp-btn sxp-btn--sm" href={src} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} /> ABRIR</a>}
          {downloadUrl && <a className="sxp-btn sxp-btn--sm sxp-btn--primary" href={downloadUrl} download><Download size={12} /> BAIXAR</a>}
        </span>
      </div>
      <div className="sxp-docviewer__frame" style={{ '--sxp-doc-h': expanded ? '88vh' : height } as CSSProperties}>
        {error
          ? <div className="sxp-table__state"><ERPErrorState message={error} onRetry={onRetry} /></div>
          : loading
            ? <div className="sxp-table__state"><span className="sxp-loadingbar" aria-hidden><i /></span></div>
            : !src
              ? <div className="sxp-table__state"><ERPEmptyState icon={<FileText size={17} aria-hidden />} title="Documento indisponível" description="Nenhum arquivo foi anexado a este registro." /></div>
              : isPdf
                ? <iframe className="sxp-docviewer__page" src={src} title={title} loading="lazy" />
                : (
                  <div className="sxp-docviewer__page" style={{ display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
                    <div>
                      <FileText size={34} style={{ color: 'var(--sxp-blue)' }} />
                      <p className="sxp-panel__title" style={{ marginTop: 8 }}>{title}</p>
                      <p className="sxp-panel__hint">Formato {extension} não tem pré-visualização embutida.</p>
                      {downloadUrl && <a className="sxp-btn sxp-btn--primary" href={downloadUrl} download style={{ marginTop: 10 }}><Download size={13} /> BAIXAR ARQUIVO</a>}
                    </div>
                  </div>
                )}
      </div>
    </div>
  )
}
