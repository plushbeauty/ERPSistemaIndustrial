import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-16, approval revision APROV-004. Novo Pedido geometry and Vendas / Status cards were explicitly authorized by the user; all locked screens remain immutable after this revision.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/NovoPedido.tsx', sha: '4599c62858e41846db7064512f79bfd6356e5193', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized geometry revision APROV-003 — frozen after alignment' },
  { path: 'src/pages/VendasCentral.tsx', sha: '5b4de32ea3b68656eff3d7f14369a412ede08592', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-004 — wider cards and production/expedition/fiscal stages; frozen after this revision' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: '77cc1e5367c939ccdd7a4edec3ab8a97c572ac76', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: '09aacff2cc473aec5c3717616890935307f36531', label: 'Login institucional', source: 'explicit user-approved revision APROV-002 — remove secondary CTAs and decorative key icon; center institutional copy' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'a8384f3e0319a60a05592213cbb065006795cf2f', label: 'PCP / Tablet do operador', source: 'approved PCP tablet standard — keep unchanged unless explicitly authorized' },
]

let failed = false
for (const item of approved) {
  const content = readFileSync(item.path)
  const header = Buffer.from(`blob ${content.byteLength}\0`, 'utf8')
  const actual = createHash('sha1').update(header).update(content).digest('hex')
  const ok = actual === item.sha
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : 'arquivo alterado; exige nova aprovação explícita'}\n`)
  if (!ok) failed = true
}
if (failed) {
  process.stderr.write('Approved UI lock: alterações em telas aprovadas são bloqueadas. Restaure o conteúdo aprovado ou obtenha autorização explícita para nova revisão e atualização do contrato.\n')
  process.exit(1)
}
