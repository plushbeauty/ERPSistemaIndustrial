/**
 * SYSNQRA ERP & SGQ INDUSTRIAL — shell inline das telas operacionais.
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-SHELL-INLINE-COMPACTO-20261105-03 — modo hospedado sem titulo, rodape com estado de banco provado e ToolbarButton sem uso removido
 * @STATUS_APROVACAO: revisao tecnica do proprietario em 2026-11-05 (itens 1, 4 e 6), sobre o incremento
 *   aprovado visualmente em /pageprincipal/financeiro/fluxo-caixa.
 *
 * Divisao de papel com o ERPHorizontalShell (item 1 da revisao):
 * - hospedado (padrao): o titulo, o modulo e a ajuda da tela ja saem no PageIntroCard do shell
 *   global, entao esta folha nao desenha cabecalho nem breadcrumb — so a barra de acoes, que o
 *   shell global nao tem espaco proprio (some-la tiraria funcionalidade da tela).
 * - standalone (standalone={true}): para tela servida fora do shell global, ai o titulo e do shell.
 * - [data-synqra-density='30px'] fica no MESMO elemento da raiz (.ips-page). A regua de
 *   stock-sales-premium.css usa seletores sem tag ([data-synqra-density='30px'] table th), entao
 *   ela pega o elemento pelo atributo e nao pelo nome da etiqueta.
 * - nenhum estilo aqui depende de IndustrialReferenceShell: o trilho navy e a barra propia so
 *   existiam naquele componente e nao sao mais montados nesta rota.
 */
import type { ReactNode } from 'react'
import './industrial-page-shell.css'

export type PageAction = {
  label: string
  onClick?: () => void
  type?: 'primary' | 'success' | 'danger' | 'neutral'
  icon?: ReactNode
  disabled?: boolean
}

/**
 * Estado de banco provado por consulta, nunca por texto fixo (revisao tecnica de 2026-11-05, item 4).
 * quem desenha a tela e quem passou a consultar decide o status; o shell so veste o rotulo.
 */
export type PageConnection = {
  status: 'consultando' | 'ok' | 'erro'
  message: string
}

type Props = {
  module: string
  title: string
  children: ReactNode
  actions?: PageAction[]
  /** true quando a tela e servida fora do ERPHorizontalShell (sem card de abertura global). */
  standalone?: boolean
  connection?: PageConnection
}

const actionClass: Record<NonNullable<PageAction['type']>, string> = {
  primary: 'ips-action ips-action-primary',
  success: 'ips-action ips-action-success',
  danger: 'ips-action ips-action-danger',
  neutral: 'ips-action',
}

export default function IndustrialPageShell({ module, title, children, actions = [], standalone = false, connection }: Props) {
  const showTitle = standalone
  return (
    <main data-synqra-density="30px" className="ips-page">
      {(showTitle || actions.length > 0) && (
        <div className={`ips-bar${showTitle ? '' : ' ips-bar-actions-only'}`}>
          {showTitle && (
            <div className="ips-bar-title">
              <strong>{title}</strong>
              <span>{module}</span>
            </div>
          )}
          <div className="ips-toolbar">
            {actions.map((action, index) => (
              <button
                key={action.label + index}
                type="button"
                disabled={action.disabled}
                className={actionClass[action.type ?? 'neutral']}
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="ips-workspace">{children}</div>
      <footer className="ips-footer">
        <span>SYSNQRA ERP &amp; SGQ INDUSTRIAL</span>
        {connection && (
          <span className={`ips-conn ips-conn-${connection.status}`} role="status">
            <i aria-hidden />
            {connection.message}
          </span>
        )}
      </footer>
    </main>
  )
}

export function SectionCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`ips-card ${className}`}><h2>{title}</h2>{children}</section>
}

export function Field({ label, children, required = false, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return <label className={`ips-field ${className}`}><span>{label}{required && ' *'}</span>{children}</label>
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="ips-tablewrap"><table className="ips-table">{children}</table></div>
}
