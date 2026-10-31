/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-31
 * @REVISAO: REV-NAVIGACAO-UNICA-20261031-01 — catálogo único de menu, atalhos e selos
 * @STATUS_APROVACAO: PENDENTE de homologação pelo proprietário
 *
 * Fonte única de navegação do ERP. O shell horizontal e a barra Windows 11 consomem
 * este catálogo; nenhum dos dois declara rotas próprias. Os selos do menu nunca são
 * decorativos: são derivados de erpScreenRegistry, que registra a evidência real da tela.
 */
import { Archive, BarChart3, Barcode, BookOpen, Boxes, Calculator, CalendarClock, CircleHelp, ClipboardList, Factory, FilePlus2, FileText, FileWarning, FolderOpen, Home, Landmark, Monitor, Percent, RotateCcw, Route, Ruler, Scale, Settings, ShieldCheck, ShoppingCart, UserCog, UserRound, Users, Wallet, Warehouse } from 'lucide-react'
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
    { label: 'Central PCP', route: '/pageprincipal/pcp', icon: ClipboardList },
    { label: 'Fichas de Processo', route: '/pageprincipal/pcp/fichas-processo', icon: ClipboardList },
    { label: 'Roteiro de Operações', route: '/pageprincipal/pcp/roteiros', icon: Route },
    { label: 'Carga e Capacidade', route: '/pageprincipal/pcp/capacidade', icon: BarChart3 },
  ] },
  { label: 'Chão de Fábrica', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor, children: [
    { label: 'Portal do Operador', route: '/pageprincipal/chao-de-fabrica/portal-operador', icon: Monitor },
    { label: 'Postos de Trabalho', route: '/pageprincipal/chao-de-fabrica/postos', icon: ClipboardList },
  ] },
  { label: 'Estoque e Almoxarifado', route: '/pageprincipal/estoque/auditoria-saldos', icon: Warehouse, children: [
    { label: 'Auditoria de Saldos', route: '/pageprincipal/estoque/auditoria-saldos', icon: Scale },
    { label: 'Balanço de Estoque', route: '/pageprincipal/estoque/balanco', icon: Archive },
    { label: 'Regras de Depreciação', route: '/pageprincipal/estoque/depreciacao', icon: Percent },
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

export type TaskbarApp = { id: string; nome: string; icone: LucideIcon; cor: string; rota: string }

/** Atalhos da barra Windows 11. Cada atalho aponta para uma rota deste mesmo catálogo. */
export const erpTaskbarApps: TaskbarApp[] = [
  { id: 'home', nome: 'Página principal', icone: Home, cor: '#123b50', rota: '/pageprincipal' },
  { id: 'rh', nome: 'RH / Departamento Pessoal', icone: Users, cor: '#f97316', rota: '/pageprincipal/rh' },
  { id: 'fichas', nome: 'Fichas de Processo', icone: ClipboardList, cor: '#f97316', rota: '/pageprincipal/pcp/fichas-processo' },
  { id: 'comissoes', nome: 'Comissões', icone: Calculator, cor: '#f97316', rota: '/pageprincipal/comissoes' },
  { id: 'controladoria', nome: 'Controladoria', icone: BookOpen, cor: '#f97316', rota: '/pageprincipal/controladoria' },
  { id: 'financeiro', nome: 'Financeiro', icone: Landmark, cor: '#f97316', rota: '/pageprincipal/financeiro' },
  { id: 'pcp', nome: 'PCP', icone: CalendarClock, cor: '#0078d4', rota: '/pageprincipal/pcp' },
  { id: 'paq', nome: 'Paquímetro', icone: Ruler, cor: '#111827', rota: '/pageprincipal/paquimetro' },
  { id: 'fiscal', nome: 'Fiscal', icone: FileText, cor: '#d97706', rota: '/pageprincipal/fiscal' },
  { id: 'compras', nome: 'Central de Compras', icone: ShoppingCart, cor: '#d97706', rota: '/pageprincipal/compras' },
  { id: 'solicitacao', nome: 'Solicitação de Compra', icone: FilePlus2, cor: '#f97316', rota: '/pageprincipal/compras/solicitacao' },
  { id: 'requisicoes', nome: 'Requisições de Compra', icone: ClipboardList, cor: '#f97316', rota: '/pageprincipal/compras/requisicoes' },
  { id: 'rpnc', nome: 'RPNC', icone: ClipboardList, cor: '#111827', rota: '/pageprincipal/qualidade/rpnc' },
]

/** Destino de cada atalho, derivado do próprio atalho — sem mapa paralelo dentro do shell. */
export const erpTaskbarDestinations: Record<string, string> = Object.fromEntries(erpTaskbarApps.map(app => [app.id, app.rota]))

function workspaceKey(path: string): string {
  return path.startsWith('/pageprincipal') ? path.slice('/pageprincipal'.length) : path
}

/** Atalho ativo = rota catalogada que for o prefixo mais longo do caminho atual. */
export function erpTaskbarActiveId(pathname: string): string {
  const key = workspaceKey(pathname)
  let matched: TaskbarApp | undefined
  for (const app of erpTaskbarApps) {
    const routeKey = workspaceKey(app.rota)
    const inside = routeKey === '' || key === routeKey || key.startsWith(`${routeKey}/`)
    if (inside && (!matched || workspaceKey(matched.rota).length <= routeKey.length)) matched = app
  }
  return matched?.id ?? ''
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
