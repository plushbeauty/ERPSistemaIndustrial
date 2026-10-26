import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-26, approval revision APROV-008 (compact edit sizing and removal of duplicated zone controls explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido), APROV-006 (Vendas / Status), and APROV-011 (single top Windows 11 navigation with visible Menu control) are frozen alongside the restored screens.
 * Explicit user authorization on 2026-10-23 permits PCPFichasProcesso.tsx REV-FICHA-010: standardize the SGQ/IT-PCP-001 header and light document cards, and highlight the Nova Ficha action with a violet icon/button. Other frozen files remain unchanged.
 * Explicit user-authorized revision on 2026-10-26: add the Quality / Metrology digital-caliper menu route only; shell geometry and visual styles remain unchanged.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '3aa44f48901c8777344a7c7c72f9fd9b81e399a5', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-006 — consistent card alignment and visible color legend; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '6d1368026d51f186baa297f71569a61a1f79e944', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-005 — compact controls, 30px fields, 9px labels and compact buttons; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: '95434d18498d1a0709c0ccfb1d7ba51949b71d1d', label: 'Cadastro Mestre de Produtos / padrão visual PCP compacto', source: 'revisão visual explicitamente autorizada pelo usuário em 2026-10-23 — campos alinhados à largura disponível dentro do grid responsivo de 12 colunas, sem cortes artificiais de largura; CRUD e regras de dados preservados; congelar após esta revisão' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'explicit user-authorized revision APROV-005 — institutional copy white with black outline for contrast' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: 'f7f497572c4e82b9fdf4923bffe1388b7d234a3b', label: 'Qualidade / Tablet SGQ', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — unificar os acessos RPNC, Ishikawa e CAPA em um único formulário com abas; preservar demais módulos do tablet' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'e7c407a6a21df06081f374b06805c39d69086597', label: 'PCP / Tablet do operador', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-21 — consolidar o código do tablet PCP enviado em 19–21/10; preservar e congelar esta versão' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: '60bf035ae3bd3e89be45577ca62714058f56b1bc', label: 'PCP / Menu Tablet e Chão de Fábrica', source: 'revisão explicitamente autorizada pelo usuário em 2026-10-23 — incluir atalho Chão de Fábrica / Portal do Funcionário; preservar módulos anteriores' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: '007d7ed94cdd1d849dbb0f7d5083aaa90d341c58', label: 'Shell global / menu superior único Windows 11', source: 'revisão explicitamente autorizada em 2026-10-26 — adicionar acesso ao controle dimensional de Metrologia; geometria e estilos preservados' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: 'eed2c198fb8628719a909cbf5eb1b613025c0e14', label: 'PCP / Fichas de Processo (Prensados, Injetados, Estamparia, Montagem)', source: 'explicit user-authorized UI revision REV-FICHA-010 on 2026-10-23 — standardized SYSNQRA SGQ/IT-PCP-001 header, light document status cards, violet Nova Ficha icon/action; freeze after this revision' },
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
