import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-19, approval revision APROV-008 (compact edit sizing and removal of duplicated zone controls explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido), APROV-006 (Vendas / Status), and APROV-011 (single top Windows 11 navigation with visible Menu control) are frozen alongside the restored screens.
 * Explicit user authorization on 2026-10-23 permits PCPFichasProcesso.tsx REV-FICHA-010: standardize the SGQ/IT-PCP-001 header and light document cards, and highlight the Nova Ficha action with a violet icon/button. Other frozen files remain unchanged.
 * Do not update these hashes as part of ordinary styling/refactor work. On 2026-10-26 the user explicitly authorized a shared master cadastro for Products, Customers and Suppliers, including new premium alignment and redirecting legacy entry points; the revised screens are frozen below.
 * Explicit user authorization on 2026-10-27 permits a light, readable revision of Quality Lot Inspections and shared SGQ navigation; only its recorded hash is updated below. Explicit user authorization on 2026-10-26 permits premium visual revisions and freezing each completed screen. Explicit user authorization on 2026-10-27 consolidates product/customer/supplier entry points into one master screen and removes duplicate cadastro menu entries; explicit authorization on 2026-10-27 adds the compact commercial/fiscal/finance cockpit route and its orange menu entry; real CRUD and tenant isolation remain mandatory. Fiscal central, standard-cost pricing, cost-variance analysis, cash forecast, NF-e pending queue, NF-e wallet, tax rules, NF-e draft workspace, active stock warehouse page, active materials-receipt workspace, and RH central were revised and frozen in this batch; preserve their business logic and visual layout unless the user authorizes another revision.
 */
const approved = [
  { path: 'src/pages/Fiscal.tsx', sha: '8c5198778cb3e4d1ba27ec8377c18b63a6948089', label: 'Fiscal / Central Fiscal Premium', source: 'preservar a tela fiscal aprovada e sua lógica' },
  { path: 'src/components/fiscal/FiscalSidebar.tsx', sha: '60385bd15ac4e42003ffd523bd65867e9747dc46', label: 'Fiscal / navegação de módulo premium', source: 'preservar navegação fiscal aprovada' },
  { path: 'src/pages/QualidadePaquimetroDigital.tsx', sha: '3c355adb13c288e66c54556fd9123700e6956097', label: 'Qualidade / Paquímetro Digital', source: 'preservar a tela aprovada e integração real' },
  { path: 'src/components/DigitalCaliper.tsx', sha: '2de2550896b0ccb33730432bc0457085f693b488', label: 'Qualidade / componente Paquímetro Digital', source: 'preservar integração real e validação do instrumento' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'preservar visual aprovado do login' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: '60bf035ae3bd3e89be45577ca62714058f56b1bc', label: 'PCP / Menu Tablet e Chão de Fábrica', source: 'preservar menu tablet PCP aprovado' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: '56025b0f555c3cafe25f6545d597a87fd37014b7', label: 'Shell global / menu e barra Windows 11', source: 'revisão de navegação da Fase 1 autorizada em 2026-10-28' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: 'fa49460b6fb18a7686a3e6ac20b6e516eb2e0275', label: 'Dashboard principal industrial', source: 'preservar dashboard industrial aprovado' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '5c6a08d84d9d942ac6f274bb32a3a12d39e964bd', label: 'Página inicial pública / Carrossel e planos', source: 'preservar página pública aprovada' },
  { path: 'src/components/PCPMoldPhotoPanel.tsx', sha: '7764fc6d527cfecac69ff8f32c8dd589ecd047d9', label: 'PCP / Fotos da ficha de processo', source: 'preservar painel de fotos PCP' },
  { path: 'src/pages/PagePrincipal.tsx', sha: '5eaa44875a124221f9624203c9414e52bea0a084', label: 'PagePrincipal / workspace central', source: 'página padrão da Fase 1; área central sem menu/cabeçalho duplicado' },
  { path: 'src/pages/PCPWorkspace.tsx', sha: '922f30ca33d9618ec1320eeb0f3e4f62b4a03961', label: 'PCP / workspace compartilhado', source: 'workspace PCP dentro da PagePrincipal, sem cabeçalho duplicado' },
]

let failed = false
for (const item of approved) {
  // Compare the committed Git blob and require a clean worktree for this path.
  // Hashing the raw Windows working file can produce a false CRLF mismatch.
  const actual = execFileSync('git', ['rev-parse', `HEAD:${item.path}`], { encoding: 'utf8' }).trim()
  let worktreeClean = true
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', item.path], { stdio: 'ignore' })
  } catch {
    worktreeClean = false
  }
  const ok = worktreeClean && actual === item.sha
  const reason = !worktreeClean ? 'arquivo modificado na árvore de trabalho' : `hash divergente; esperado=${item.sha}; encontrado=${actual}`
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : reason}\n`)
  if (!ok) failed = true
}

const routeContent = readFileSync('src/AppEntryV2.tsx', 'utf8')
const requiredRoutes = [
  ['Page Principal contém o dashboard aprovado', '<Route path="/pageprincipal" element={<PagePrincipal />}>'],
  ['PCP aprovado permanece dentro da Page Principal', '<Route path="pcp" element={<PCPWorkspace />} />'],
  ['Paquímetro aprovado permanece dentro da Page Principal', '<Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />'],
  ['Dashboard aprovado permanece dentro da Page Principal', '<Route index element={<AppIndustrial />} />'],
  ['Fiscal aprovada permanece dentro da Page Principal', '<Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />'],
  ['URL fiscal antiga continua compatível', '<Route path="/fiscal" element={<Navigate to="/pageprincipal/fiscal" replace />} />'],
  ['Rotas antigas redirecionam para a Page Principal', '<Route path="*" element={<Navigate to="/pageprincipal" replace />} />'],
]
for (const [label, route] of requiredRoutes) {
  const ok = routeContent.includes(route)
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${label}\n`)
  if (!ok) failed = true
}
if (routeContent.includes("import('./pages/FinanceiroFluxoCaixa')")) {
  process.stderr.write('Approved route lock: a tela legada de Fluxo de Caixa foi reintroduzida.\n')
  failed = true
}

if (failed) {
  process.stderr.write('Approved UI lock: alterações em telas aprovadas são bloqueadas. Restaure o conteúdo aprovado ou obtenha autorização explícita para nova revisão e atualização do contrato.\n')
  process.exit(1)
}

