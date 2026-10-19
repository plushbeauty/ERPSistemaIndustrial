import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-19, approval revision APROV-007 (PCP Fichas de Processo revision explicitly authorized by user). Explicitly authorized revisions APROV-005 (Novo Pedido) and APROV-006 (Vendas / Status) are frozen alongside the restored screens.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '3aa44f48901c8777344a7c7c72f9fd9b81e399a5', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-006 — consistent card alignment and visible color legend; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '6d1368026d51f186baa297f71569a61a1f79e944', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-005 — compact controls, 30px fields, 9px labels and compact buttons; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: 'fcbea255f1a476c1e228c7490052a7cea0a507b0', label: 'Login institucional', source: 'explicit user-authorized revision APROV-005 — institutional copy white with black outline for contrast' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'a8384f3e0319a60a05592213cbb065006795cf2f', label: 'PCP / Tablet do operador', source: 'approved PCP tablet standard — keep unchanged unless explicitly authorized' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: 'b02e84ec48381d26b50d05362d35cee24f378f37', label: 'PCP / Submenu Fichas de Processo', source: 'explicit user-approved submenu revision 2026-10-18 — freeze labels and destinations unless explicitly authorized' },
  { path: 'src/components/layout/ERPHorizontalShell.tsx', sha: 'd144dc7ad0f06fb77e4cbd9871f95ba07f59517a', label: 'Shell horizontal / launcher tablet Qualidade', source: 'explicit restoration and regression fix 2026-10-19 — Qualidade opens tablet; arrow preserves module submenu' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: '3989410149e573726525660a4d2cc6d25a9f279c', label: 'PCP / Fichas de Processo (Prensados, Injetados, Estamparia, Montagem)', source: 'explicitly authorized UI revision 2026-10-19 — white contrast, compact fields, edit/update flow, A4 print and packaging photo workflow; frozen after this revision' },
  { path: 'src/pages/QualidadeInspecoesIndustrial.tsx', sha: '0bb60081b70df3065aed2f8a838a3852cdc87994', label: 'Qualidade / Inspeções de Lotes', source: 'explicit user-provided approval directive 2026-10-19 — Steel Blue split-screen, compact h-8 controls and dense inspection grid; frozen after revision' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '37f0e2efd19f0f6e635d3a0d921a514ebf9a0cbc', label: 'Página inicial pública / Carrossel e planos', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
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
