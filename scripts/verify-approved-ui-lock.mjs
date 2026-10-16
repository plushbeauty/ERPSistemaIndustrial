import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Approved UI lock — 2026-10-16, approval revision APROV-002.
 * Explicit user authorization: remove login logos, center the institutional message,
 * and use light gold #E8D49A with a navy overlay for legibility.
 * Only the approved login stylesheet hash is refreshed for this authorized revision;
 * all other frozen UI contracts remain unchanged.
 */
const approved = [
  { path: 'src/pages/NovoPedido.tsx', sha: '8650bcf2af2f8a8813e80c082fbe4de33cbb47ab', label: 'Vendas / Novo Pedido', source: 'Vercel READY commit 94da86b985c12801525661328577f7bd96188b85' },
  { path: 'src/pages/ProdutosVendasIndustrial.tsx', sha: 'b1cbdd042c95c547c7d315afb0ee94bba529865f', label: 'Cadastros / Produtos', source: 'approved UI contract' },
  { path: 'src/styles/industrial-login.css', sha: 'bb70a55d779e8aa3d0ca192e51637aacbafa657e', label: 'Login institucional', source: 'approved UI contract' },
  { path: 'src/pages/QualidadeCentralTablet.tsx', sha: '3f8e359a770f0d433f1ed1d24d383254e04e7c1e', label: 'Qualidade / Tablet SGQ', source: 'user-approved tablet revision' },
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
