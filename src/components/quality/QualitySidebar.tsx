import type { ReactNode } from 'react'

/**
 * O acesso aos módulos da Qualidade fica centralizado em /qualidade.
 * As telas operacionais não devem repetir um menu de navegação em cada página.
 */
export default function QualitySidebar({ active }: { active: string }): ReactNode {
  void active
  return null
}
