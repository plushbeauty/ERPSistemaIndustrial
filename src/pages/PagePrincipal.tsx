/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
/**
 * SYSNQRA ERP INDUSTRIAL — workspace padrão.
 * @REVISAO 28/10/2026
 * Todas as telas operacionais são renderizadas dentro do shell Windows 11.
 * Esta página não duplica cabeçalhos, menus nem dados.
 */
import { Outlet } from 'react-router-dom'

export default function PagePrincipal() {
  return (
    <section aria-label="Área de trabalho SYSNQRA" className="synqra-module-shell w-full min-w-0">
      <Outlet />
    </section>
  )
}
