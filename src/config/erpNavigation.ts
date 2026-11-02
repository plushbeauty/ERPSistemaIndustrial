/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-31
 * @REVISAO: REV-NAVIGACAO-UNICA-20261101-02 — catálogo único de menu e selos, sem barra de atalhos
 * @STATUS_APROVACAO: PENDENTE de homologação pelo proprietário
 *
 * Fonte única de navegação do ERP. O shell horizontal consome este catálogo e não
 * declara rotas próprias. Os selos do menu nunca são decorativos: são derivados de
 * erpScreenRegistry, que registra a evidência real da tela.
 */
import { Archive, ArrowLeftRight, BarChart3, Barcode, BookOpen, Boxes, Calculator, CircleHelp, ClipboardList, Factory, FilePlus2, FileText, FileWarning, FolderOpen, History, Home, Landmark, LayoutDashboard, Monitor, Percent, RotateCcw, Route, Ruler, Scale, Settings, ShieldCheck, ShoppingCart, UserCog, UserRound, Users, Wallet, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { erpScreenHasBadge, erpScreenRecord, normalizeErpRoute } from './erpScreenRegistry'

export type MenuItem = {
  label: string
  route: string
  icon?: LucideIcon
  isNew?: boolean
  isUpdated?: boolean
  action?: 'pcpTablet'
  minNivel?: number
  children?: MenuItem[]
}

/** Semente do menu: rótulo, rota, ícone e restrição de nível. Os selos vêm do registro de evidência. */
type MenuSeed = Omit<MenuItem, 'isNew' | 'isUpdated' | 'children'> & { children?: MenuSeed[] }

const menuSeeds: MenuSeed[] = [
  { label: 'Financeiro', route: '/pageprincipal/financeiro', icon: Landmark, children: [
    { label: 'Central Financeira', route: '/pageprincipal/financeiro', icon: Wallet },
    { label: 'Conciliação Bancária', route: '/pageprincipal/financeiro/conciliacao-bancaria', icon: ClipboardList },
    { label: 'Importar Extratos', route: '/pageprincipal/financeiro/importar-extratos', icon: FileText },
    { label: 'Lista de Preços por Cliente', route: '/pageprincipal/financeiro/lista-precos-cliente', icon: ShoppingCart },
    { label: 'Retificação de Pedido', route: '/pageprincipal/financeiro/retificacao', icon: RotateCcw },
    { label: 'Notas de Débito', route: '/pageprincipal/financeiro/notas-debito', icon: FileWarning },
    { label: 'Configurações de Notas de Débito', route: '/pageprincipal/financeiro/notas-debito/configuracoes', icon: Settings },
  ] },
  { label: 'Comissões', route: '/pageprincipal/comissoes', icon: Calculator, children: [
    { label: 'Regras de Comissão', route: '/pageprincipal/comissoes/regras', icon: ClipboardList },
    { label: 'Cálculo de Comissão', route: '/pageprincipal/comissoes/calculo', icon: Calculator },
    { label: 'Perfil do Vendedor', route: '/pageprincipal/comissoes/perfil', icon: UserRound },
  ] },
  { label: 'Controladoria', route: '/pageprincipal/controladoria', icon: BookOpen, children: [
    { label: 'Lucratividade e Margens', route: '/pageprincipal/controladoria/lucratividade', icon: ClipboardList },
    { label: 'Razão Geral', route: '/pageprincipal/controladoria/razao-geral', icon: Landmark },
    { label: 'Cadastro de Decimais', route: '/pageprincipal/controladoria/cadastro-decimais', icon: Settings },
    { label: 'Estorno Documental', route: '/pageprincipal/controladoria/retificacao-assistente', icon: FileText },
    { label: 'Auditoria de Comissões', route: '/pageprincipal/controladoria/auditoria-comissoes', icon: Calculator },
  ] },
  { label: 'Principal', route: '/pageprincipal', icon: Home },
  { label: 'Cadastros Mestres', route: '/pageprincipal/cadastros/produtos', icon: Boxes, children: [
    { label: 'Cadastro de Produtos', route: '/pageprincipal/cadastros/produtos', icon: Boxes },
    { label: 'Ficha Técnica e Etiquetas', route: '/pageprincipal/cadastros/produtos/ficha-tecnica', icon: FileText },
    { label: 'Parâmetros de Código', route: '/pageprincipal/cadastros/produtos/parametros-codigo', icon: Barcode },
  ] },
  { label: 'RH / Departamento Pessoal', route: '/pageprincipal/rh', icon: Users },
  { label: 'Engenharia e PCP', route: '/pageprincipal/pcp', icon: Factory, children: [
    { label: 'Dashboard do PCP', route: '/pageprincipal/pcp/dashboard', icon: LayoutDashboard },
    { label: 'Central PCP', route: '/pageprincipal/pcp', icon: ClipboardList },
    { label: 'Fichas de Processo', route: '/pageprincipal/pcp/fichas-processo', icon: ClipboardList },
    { label: 'Roteiro de Operações', route: '/pageprincipal/pcp/roteiros', icon: Route },
    { label: 'Carga e Capacidade', route: '/pageprincipal/pcp/capacidade', icon: BarChart3 },
  ] },
  { label: 'Chão de Fábrica', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, children: [
    { label: 'Portal do Operador', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor },
    { label: 'Postos de Trabalho', route: '/pageprincipal/chao-de-fabrica/postos', icon: ClipboardList },
  ] },
  { label: 'Estoque e Almoxarifado', route: '/pageprincipal/estoque/almoxarifado', icon: Warehouse, children: [
    { label: 'Almoxarifado', route: '/pageprincipal/estoque/almoxarifado', icon: Warehouse },
    { label: 'Auditoria de Saldos', route: '/pageprincipal/estoque/auditoria-saldos', icon: Scale },
    { label: 'Balanço de Estoque', route: '/pageprincipal/estoque/balanco', icon: Archive },
    { label: 'Regras de Depreciação', route: '/pageprincipal/estoque/depreciacao', icon: Percent },
    { label: 'Baixa por Lote', route: '/pageprincipal/estoque/baixa-por-lote', icon: ArrowLeftRight },
    { label: 'Rastreabilidade de Lote', route: '/pageprincipal/estoque/rastreabilidade-lote', icon: History },
  ] },
  { label: 'Qualidade / Paquímetro', route: '/pageprincipal/paquimetro', icon: Ruler, children: [
    { label: 'Paquímetro Digital', route: '/pageprincipal/paquimetro', icon: Ruler },
    { label: 'RPNC', route: '/pageprincipal/qualidade/rpnc', icon: ClipboardList },
    { label: 'Formulário RPNC (Ishikawa / 5 Porquês / CAPA)', route: '/pageprincipal/qualidade/rpnc-formulario', icon: FileText },
    { label: 'Auditorias da Qualidade', route: '/pageprincipal/qualidade/auditorias', icon: ShieldCheck },
    { label: 'GED / Documentos da Qualidade', route: '/pageprincipal/qualidade/ged', icon: FolderOpen },
  ] },
  { label: 'Compras', route: '/pageprincipal/compras', icon: ShoppingCart, children: [
    { label: 'Central de Compras', route: '/pageprincipal/compras', icon: ShoppingCart },
    { label: 'Solicitação de Compra', route: '/pageprincipal/compras/solicitacao', icon: FilePlus2 },
    { label: 'Requisições de Compra', route: '/pageprincipal/compras/requisicoes', icon: ClipboardList },
  ] },
  { label: 'Configurações', route: '/pageprincipal/administracao-configuracoes', icon: Settings },
  { label: 'Configurações de Usuário', route: '/pageprincipal/configuracoes-usuario', icon: UserCog, minNivel: 8 },
  { label: 'Fiscal', route: '/pageprincipal/fiscal', icon: FileText, children: [
    { label: 'Central Fiscal', route: '/pageprincipal/fiscal', icon: FileText },
    { label: 'Ano Fiscal', route: '/pageprincipal/fiscal/ano', icon: BookOpen },
    { label: 'Classificação Fiscal', route: '/pageprincipal/fiscal/classificacao', icon: Landmark },
    { label: 'Auditoria Documental', route: '/pageprincipal/fiscal/auditoria-documental', icon: ShieldCheck },
    { label: 'Estorno de Lançamentos', route: '/pageprincipal/fiscal/estorno', icon: RotateCcw },
    { label: 'Painel Razão Geral', route: '/pageprincipal/fiscal/razao', icon: Scale },
  ] },
  { label: 'Central de Ajuda', route: '/pageprincipal/ajuda', icon: CircleHelp },
]

/** Selo ligado somente pela evidência registrada: tela validada e sem migration pendente. */
function decorate(seed: MenuSeed): MenuItem {
  const item: MenuItem = { label: seed.label, route: seed.route, icon: seed.icon, isUpdated: erpScreenHasBadge(seed.route) }
  if (seed.action) item.action = seed.action
  if (seed.minNivel !== undefined) item.minNivel = seed.minNivel
  if (seed.children) item.children = seed.children.map(decorate)
  return item
}

export const erpMenus: MenuItem[] = menuSeeds.map(decorate)

/** Rótulo do menu por rota — usado pelo card de abertura e pela busca do shell. */
export const erpMenuLabelByRoute: Record<string, string> = {}
for (const menu of erpMenus) {
  erpMenuLabelByRoute[menu.route] = menu.label
  for (const child of menu.children ?? []) erpMenuLabelByRoute[child.route] = child.label
}

const modulePrefixes: Array<[string, string]> = [
  ['/pageprincipal/cadastros', 'Cadastros Mestres'],
  ['/pageprincipal/comissoes', 'Comissões'],
  ['/pageprincipal/controladoria', 'Controladoria'],
  ['/pageprincipal/pcp', 'Engenharia e PCP'],
  ['/pageprincipal/chao-de-fabrica', 'Chão de Fábrica'],
  ['/pageprincipal/estoque', 'Estoque e Almoxarifado'],
  ['/pageprincipal/qualidade', 'Qualidade / Paquímetro'],
  ['/pageprincipal/rh', 'RH / Departamento Pessoal'],
  ['/pageprincipal/paquimetro', 'Qualidade / Paquímetro'],
  ['/pageprincipal/compras', 'Compras'],
  ['/pageprincipal/administracao-configuracoes', 'Configurações'],
  ['/pageprincipal/financeiro', 'Financeiro'],
  ['/pageprincipal/fiscal', 'Fiscal'],
  ['/cadastros', 'Cadastros Mestres'],
  ['/comissoes', 'Comissões'],
  ['/controladoria', 'Controladoria'],
  ['/pcp', 'Engenharia e PCP'],
  ['/chao-de-fabrica', 'Chão de Fábrica'],
  ['/estoque', 'Estoque e Almoxarifado'],
  ['/qualidade', 'Qualidade / Paquímetro'],
  ['/rh', 'RH / Departamento Pessoal'],
  ['/paquimetro', 'Qualidade / Paquímetro'],
  ['/compras', 'Compras'],
  ['/configuracoes-adm', 'Configurações'],
  ['/administracao-configuracoes', 'Configurações'],
  ['/financeiro', 'Financeiro'],
  ['/fiscal', 'Fiscal'],
]

/** Módulo da rota atual; os prefixos /pageprincipal são verificados antes dos legados. */
export function erpModuleLabel(pathname: string): string | null {
  for (const [prefix, label] of modulePrefixes) if (pathname.startsWith(prefix)) return label
  return null
}

export { erpScreenRecord, normalizeErpRoute }
