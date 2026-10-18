import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — reviewed 2026-10-18, approval revision APROV-006. Explicitly preserve the approved home dashboard, institutional login, admin settings, product form and Vendas screen.
 * Any edit to a frozen file must fail CI until the user explicitly approves a new revision.
 * Do not update these hashes as part of ordinary styling/refactor work.
 */
const approved = [
  { path: 'src/components/IndustrialCommandDashboard.tsx', sha: '16cb49413073d7f52e903aa73594d7b3bf4cb184', label: 'Início / Dashboard principal aprovado', source: 'approved recovery baseline: ad704aa4 dashboard update plus 0ef3f154 schema correction' },
  { path: 'src/IndustrialLoginDirect.tsx', sha: '33aa130d751b10265b0c8d9e710d8d40e6a62750', label: 'Login institucional — roteamento desktop', source: 'explicit user authorization APROV-005 — remove device-based tablet redirect; OPERADOR_FABRIL now enters PCP desktop, 2026-10-18' },
  { path: 'src/pages/configuracoes/ConfiguracoesADM.tsx', sha: '7299116e3bea43db83bdc1e3bbae6a386eb4d1e3', label: 'Configurações administrativas aprovadas', source: 'approved settings revision from ad704aa4; keep unchanged unless user requests a new revision' },
  { path: 'src/pages/VendasCentral.tsx', sha: '9177ae072e85e2cd5bd2b62780671f9aad20cf28', label: 'Vendas / Status do pedido', source: 'explicit user-authorized revision APROV-004 — wider cards and real order/production/quality/expedition/fiscal stages; frozen after this revision' },
  { path: 'src/pages/NovoPedido.tsx', sha: '942308732a71ce93cdb615220ec2a5b63677dd4b', label: 'Vendas / Novo Pedido', source: 'explicit user-authorized layout revision APROV-007 — full-width customer, compact order/logistics columns and item fields, 2026-10-18' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: '100fa049257c3cc4edccefe54f2b5da727942928', label: 'Login institucional', source: 'explicit user-authorized revision APROV-006 — white bold institutional welcome copy with black outline, 2026-10-18' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
  { path: 'src/components/TabletMenuModal.tsx', sha: '5a416adfe3154227f7b4a652543584dca88e58d0', label: 'Qualidade / Modal Tablet padrão (22 módulos)', source: 'approved modal design — keep unchanged unless explicitly authorized' },
  { path: 'src/pages/PCPTabletOperador.tsx', sha: 'a8384f3e0319a60a05592213cbb065006795cf2f', label: 'PCP / Tablet do operador', source: 'approved PCP tablet standard — keep unchanged unless explicitly authorized' },
]

let failed = false
for (const item of approved) {
  // Hash the Git-normalized text so core.autocrlf on Windows does not make an unchanged approved file look modified.
  const content = Buffer.from(readFileSync(item.path, 'utf8').replace(/\r\n/g, '\n'), 'utf8')
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
