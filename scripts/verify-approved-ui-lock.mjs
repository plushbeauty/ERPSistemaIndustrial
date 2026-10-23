import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-19, approval revision APROV-008 (compact edit sizing and removal of duplicated zone controls explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido), APROV-006 (Vendas / Status), and APROV-011 (single top Windows 11 navigation with visible Menu control) are frozen alongside the restored screens.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '3aa44f48901c8777344a7c7c72f9fd9b81e399a5', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-006 — consistent card alignment and visible color legend; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '6d1368026d51f186baa297f71569a61a1f79e944', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-005 — compact controls, 30px fields, 9px labels and compact buttons; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: '89140b15d4a94cbf8bb3b3f64f23851fcf7c649a', label: 'Cadastro Mestre de Produtos / padrão visual PCP compacto', source: 'revisão visual explicitamente autorizada pelo usuário em 2026-10-21 — grid responsivo de 12 colunas, campos com spans proporcionais, limite de 1280px, controles de 30px e alinhamento de labels; CRUD e regras de dados preservados; congelar após esta revisão' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'explicit user-authorized revision APROV-005 — institutional copy white with black outline for contrast' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: 'c22e09abb06f2ac9dd5f07f247f66590f5626aa8', label: 'Qualidade / Tablet SGQ', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-21 — consolidar o código do tablet de Qualidade enviado em 19–21/10; preservar e congelar esta versão' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'e7c407a6a21df06081f374b06805c39d69086597', label: 'PCP / Tablet do operador', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-21 — consolidar o código do tablet PCP enviado em 19–21/10; preservar e congelar esta versão' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: '60bf035ae3bd3e89be45577ca62714058f56b1bc', label: 'PCP / Menu Tablet e Chão de Fábrica', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — incluir atalho Chão de Fábrica / Portal do Funcionário; preservar módulos anteriores' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: '15938fa579f6fcdb3238924755195aa7a3eb4f64', label: 'Shell global / menu superior único Windows 11', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — incluir Chão de Fábrica no submenu Manufatura / PCP; preservar shell e demais rotas aprovadas' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: '401ebc0bac073c346a67b419b44763a57668f3d4', label: 'PCP / Fichas de Processo (Prensados, Injetados, Estamparia, Montagem)', source: 'explicit user-authorized UI revision REV-FICHA-003 on 2026-10-21 — light PCP standard, temperature and pressure fields editable in a compact form outside the equipment illustration, separate mold photo card; freeze after this revision' },
  { path: 'src/pages/QualidadeInspecoesIndustrial.tsx', sha: 'ebb5bd1e523f38a2ab6169bda4e7a9855ee3e65a', label: 'Qualidade / Inspeções de Lotes', source: 'explicit user-provided approval directive 2026-10-19 — Steel Blue split-screen, compact h-8 controls and dense inspection grid; frozen after revision' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '5c6a08d84d9d942ac6f274bb32a3a12d39e964bd', label: 'Página inicial pública / Carrossel e planos', source: 'explicit user-authorized revision 2026-10-21 — image zoom 85%, white logo header and 13px default typography; frozen after this revision' },
  { path: 'src/components/PCPMoldPhotoPanel.tsx', sha: '7764fc6d527cfecac69ff8f32c8dd589ecd047d9', label: 'PCP / Fotos da ficha de processo', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
]

let failed = false
for (const item of approved) {
  const content = readFileSync(item.path)
  const header = Buffer.from(`blob ${content.byteLength}\0`, 'utf8')
  const actual = createHash('sha1').update(header).update(content).digest('hex')
  const ok = actual === item.sha
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : `hash divergente; esperado=${item.sha}; encontrado=${actual}`}\n`)
  if (!ok) failed = true
}
if (failed) {
  process.stderr.write('Approved UI lock: alterações em telas aprovadas são bloqueadas. Restaure o conteúdo aprovado ou obtenha autorização explícita para nova revisão e atualização do contrato.\n')
  process.exit(1)
}
