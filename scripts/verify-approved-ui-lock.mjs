import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * @DATA_REVISAO: 2026-10-16
 * @REVISAO: APROV-005
 * @ESCOPO_REVISAO: verificador de integridade das telas aprovadas; hash de Novo Pedido sincronizado com o blob atual.
 * @VALIDACAO: exige correspondência exata dos hashes Git; não remove nem contorna o bloqueio.
 * Approved UI lock — reviewed 2026-10-16, approval revision APROV-005. Vendas / Status cards and process-stage view explicitly authorized by the user; all locked screens remain immutable after this revision.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/pages/VendasCentral.tsx', sha: '9177ae072e85e2cd5bd2b62780671f9aad20cf28', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-004 — wider cards and real order/production/quality/expedition/fiscal stages; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '49dcd6ce1a8c252a097c9cdbe6c1d6bebf89fff9', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized geometric audit APROV-005 — controls 30px, labels 9px, aligned cards and compact grid' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: 'c77134e5eaf528438eb137f6a1f6e737aeb5d863', label: 'Login institucional', source: 'explicit user-approved revision APROV-002 — remove secondary CTAs and decorative key icon; center institutional copy' },
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
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} — ${item.label} [${item.path}] — ${ok ? 'aprovado e congelado' : `hash divergente; esperado=${item.sha}; encontrado=${actual}`}\n`)
  if (!ok) failed = true
}
if (failed) {
  process.stderr.write('Approved UI lock: alterações em telas aprovadas são bloqueadas. Restaure o conteúdo aprovado ou obtenha autorização explícita para nova revisão e atualização do contrato.\n')
  process.exit(1)
}
