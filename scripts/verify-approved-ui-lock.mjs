import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-18, approval revision APROV-006. User explicitly authorized restoring the approved login stylesheet and hiding carousel movement controls while enlarging the public-home image card; all other locked screens remain immutable.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '99cdbdb065ef5c2e4182dfb1ff8d267c6adce3c2', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-007 — balanced wide cards, visible five-stage legend and real order tracking' },
  { path: 'src/pages/NovoPedido.tsx', sha: '350786aa95de8a2c3cfe514b8394859bb44253b6', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized revision APROV-007 — 30px controls, 9px labels, three aligned top cards' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: 'c77134e5eaf528438eb137f6a1f6e737aeb5d863', label: 'Login institucional', source: 'restored exact approved stylesheet APROV-002; no unauthorized APROV-005 overrides' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'a8384f3e0319a60a05592213cbb065006795cf2f', label: 'PCP / Tablet do operador', source: 'approved PCP tablet standard — keep unchanged unless explicitly authorized' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: 'b02e84ec48381d26b50d05362d35cee24f378f37', label: 'PCP / Submenu Fichas de Processo', source: 'explicit user-approved submenu revision 2026-10-18 — freeze labels and destinations unless explicitly authorized' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: '8bcf940773f34515475d65d1f7fa1f6334c67307', label: 'PCP / Fichas de Processo (Prensados, Injetados, Acabamento, Montagem)', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/PublicIndustrialHome.tsx', sha: '016caccb2266ea5c4777c230095ed133c1f4cda0', label: 'Página inicial pública / Carrossel e planos', source: 'APROV-006 — explicit user authorization: hide carousel movement controls and enlarge the hero image card; freeze after this revision' },
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
