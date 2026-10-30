/**
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-01 — card de abertura compartilhado
 * @AUTOR: Fernando Schuinsekel
 * @STATUS: PADRÃO DE ABERTURA APLICADO A TODAS AS TELAS DO ERP EM 2026-10-30
 */
import '../../styles/page-intro-card.css'

export type PageIntro = {
  module?: string
  title: string
  description: string
}

export default function PageIntroCard({ module, title, description }: PageIntro) {
  return (
    <header className="erp-page-intro" aria-label={`Abertura da tela ${title}`}>
      <div className="erp-page-intro-text">
        {module && <p className="erp-page-intro-module">{module}</p>}
        <h1>{title}</h1>
        <p className="erp-page-intro-description">{description}</p>
      </div>
    </header>
  )
}
