/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-MODULO-PREMIUM-20261101-01 — navegação lateral única por módulo
 * @STATUS_APROVACAO: APLICACAO A TODOS OS MODULOS AUTORIZADA PELO PROPRIETARIO EM 2026-11-01
 *
 * Fonte única do rail lateral das telas operacionais. Só entram rotas
 * realmente registradas em AppEntryV2: link morto de menu já causou retrabalho
 * neste projeto, então cada item aqui precisa continuar correspondendo a uma
 * rota viva.
 */
import {
  Archive,
  BarChart3,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ListOrdered,
  Package,
  Percent,
  Scale,
  ScanLine,
  Settings,
  Warehouse,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type ModuleNavItem = { label: string; route: string; icon: LucideIcon }
export type ModuleNav = {
  key: string
  title: string
  subtitle: string
  items: ModuleNavItem[]
  footItems: ModuleNavItem[]
}

const workspace = '/pageprincipal'

/** Rodapé igual em todos os rails: configuração por usuário e ajuda do módulo. */
const footComum: ModuleNavItem[] = [
  { label: 'Configurações', route: `${workspace}/configuracoes-usuario`, icon: Settings },
  { label: 'Ajuda', route: `${workspace}/ajuda`, icon: HelpCircle },
]

export const moduleNavs: ModuleNav[] = [
  {
    key: 'pcp',
    title: 'PCP',
    subtitle: 'Planejamento e controle da produção',
    items: [
      { label: 'Dashboard', route: `${workspace}/pcp/dashboard`, icon: LayoutDashboard },
      { label: 'Central PCP', route: `${workspace}/pcp`, icon: ClipboardList },
      { label: 'Fichas de Processo', route: `${workspace}/pcp/fichas-processo`, icon: FileText },
      { label: 'Roteiro de Operações', route: `${workspace}/pcp/roteiros`, icon: ListOrdered },
      { label: 'Carga e Capacidade', route: `${workspace}/pcp/capacidade`, icon: BarChart3 },
      { label: 'Portal do Operador', route: `${workspace}/chao-de-fabrica/portal-operador`, icon: ScanLine },
      { label: 'Postos de Trabalho', route: `${workspace}/chao-de-fabrica/postos`, icon: Workflow },
    ],
    footItems: footComum,
  },
  {
    key: 'estoque',
    title: 'Estoque',
    subtitle: 'Almoxarifado, saldos e inventário',
    items: [
      { label: 'Almoxarifado', route: `${workspace}/estoque/almoxarifado`, icon: Warehouse },
      { label: 'Auditoria de Saldos', route: `${workspace}/estoque/auditoria-saldos`, icon: Scale },
      { label: 'Balanço de Estoque', route: `${workspace}/estoque/balanco`, icon: Archive },
      { label: 'Regras de Depreciação', route: `${workspace}/estoque/depreciacao`, icon: Percent },
      { label: 'Cadastro de Produtos', route: `${workspace}/cadastros/produtos`, icon: Package },
      { label: 'Portal do Operador', route: `${workspace}/chao-de-fabrica/portal-operador`, icon: ScanLine },
    ],
    footItems: footComum,
  },
]

/** Corresponde pelo prefixo de rota mais longo, igual ao critério do card de abertura. Itens de rodapé não definem o módulo. */
export function resolveModuleNav(pathname: string): ModuleNav | null {
  const normalized = pathname.replace(/\/+$/, '') === '' ? '/' : pathname.replace(/\/+$/, '')
  let best: { nav: ModuleNav; length: number } | null = null
  for (const nav of moduleNavs) {
    for (const item of nav.items) {
      const base = item.route.replace(/\/+$/, '')
      const matches = normalized === base || normalized.startsWith(`${base}/`)
      if (matches && (!best || base.length > best.length)) best = { nav, length: base.length }
    }
  }
  return best?.nav ?? null
}
