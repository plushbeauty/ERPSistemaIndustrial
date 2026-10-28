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
