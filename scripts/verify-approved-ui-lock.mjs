import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-16, approval revision APROV-004. Vendas / Status cards and process-stage view explicitly authorized by the user; all locked screens remain immutable after this revision.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '9177ae072e85e2cd5bd2b62780671f9aad20cf28', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-004 — wider cards and real order/production/quality/expedition/fiscal stages; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '8650bcf2af2f8a8813e80c082fbe4de33cbb47ab', label: 'Vendas / Novo Pedido', source: 'Vercel READY commit 94da86b985c12801525661328577f7bd96188b85' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: 'c77134e5eaf528438eb137f6a1f6e737aeb5d863', label: 'Login institucional', source: 'explicit user-approved revision APROV-002 — remove secondary CTAs and decorative key icon; center institutional copy' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'a8384f3e0319a60a05592213cbb065006795cf2f', label: 'PCP / Tablet do operador', source: 'approved PCP tablet standard — keep unchanged unless explicitly authorized' },
  { path: 'src/components/PCPTabletMenuModal.tsx', sha: 'b02e84ec48381d26b50d05362d35cee24f378f37', label: 'PCP / Submenu Fichas de Processo', source: 'explicit user-approved submenu revision 2026-10-18 — freeze labels and destinations unless explicitly authorized' },
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '821b2cb2add9ec0a31d0c81e906a2c1f6e84118b', label: 'Dashboard principal industrial', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
  { path: 'src/pages/PCPFichasProcesso.tsx', sha: '8bcf940773f34515475d65d1f7fa1f6334c67307', label: 'PCP / Fichas de Processo (Prensados, Injetados, Acabamento, Montagem)', source: 'restored from user-provided archive 2026-10-18; freeze unless explicitly authorized' },
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
