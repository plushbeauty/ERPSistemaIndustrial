/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-CENTRAL-AJUDA-TELAS-20261104-01 — card de abertura ganhou o bloco de ajuda (para que serve, como preencher, como usar) alimentado pelo catalogo
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-04: "todas as telas tem que explicar para que serve, como preencher e como usar"
 */
import { useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import '../../styles/page-intro-card.css'

export type PageIntroHelp = {
  fill?: string[]
  use?: string[]
  watch?: string
}

export type PageIntro = {
  module?: string
  title: string
  description: string
  help?: PageIntroHelp
}

export default function PageIntroCard({ module, title, description, help }: PageIntro) {
  const [open, setOpen] = useState(false)
  const fillItems = help?.fill ?? []
  const useItems = help?.use ?? []
  const hasHelp = fillItems.length > 0 || useItems.length > 0 || Boolean(help?.watch)
  const panelId = `erp-page-intro-help-${title.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <header className="erp-page-intro" aria-label={`Abertura da tela ${title}`}>
      <div className="erp-page-intro-text">
        {module && <p className="erp-page-intro-module">{module}</p>}
        <h1>{title}</h1>
        <p className="erp-page-intro-description"><span className="erp-page-intro-lead">Para que serve:</span> {description}</p>
      </div>
      {hasHelp && (
        <button
          type="button"
          className="erp-page-intro-help-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <CircleHelp size={14} />
          {open ? 'Fechar ajuda' : 'Como usar esta tela'}
        </button>
      )}
      {hasHelp && open && (
        <div id={panelId} role="region" aria-label={`Ajuda de uso da tela ${title}`} className="erp-page-intro-help">
          <div className="erp-page-intro-help-head">
            <h2>Ajuda rápida · {title}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar ajuda rápida"><X size={14} /></button>
          </div>
          {fillItems.length > 0 && (
            <section className="erp-page-intro-help-block">
              <h3>Como preencher</h3>
              <ul>{fillItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          {useItems.length > 0 && (
            <section className="erp-page-intro-help-block">
              <h3>Como usar no sistema</h3>
              <ul>{useItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          {help?.watch && <p className="erp-page-intro-help-note">{help.watch}</p>}
        </div>
      )}
    </header>
  )
}
