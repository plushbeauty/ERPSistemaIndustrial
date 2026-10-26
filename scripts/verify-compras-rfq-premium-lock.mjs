import { readFileSync } from 'node:fs'

const page = readFileSync('src/pages/ComprasRFQ.tsx', 'utf8')
const styles = readFileSync('src/styles/synqra-workspace.css', 'utf8')
const purchaseOrder = readFileSync('src/pages/ComprasPedidoCompra.tsx', 'utf8')
const legacyPurchaseOrder = readFileSync('src/pages/PedidoCompra.tsx', 'utf8')
const requiredPageMarkers = [
  '@DATA_REVISAO_APROVACAO 2026-10-26',
  '@STATUS_APROVACAO REV-RFQ-PREMIUM-001',
  'className="synqra-rfq-page"',
  'rfq-panel-heading',
  'rfq-save-button',
  "supabase.rpc('erp_current_empresa_id')",
  ".from('erp_rfq')",
  ".from('erp_rfq_fornecedores')",
  ".from('erp_rfq_itens')",
]
const requiredStyleMarkers = [
  '.synqra-rfq-page',
  '.rfq-main-grid',
  '.rfq-fields-grid',
  '.rfq-table',
  '.rfq-save-button',
]
const missing = [
  ...requiredPageMarkers.filter(marker => !page.includes(marker)).map(marker => `página: ${marker}`),
  ...requiredStyleMarkers.filter(marker => !styles.includes(marker)).map(marker => `CSS: ${marker}`),
]
if (/<style>/.test(page)) missing.push('página: estilo inline antigo não pode voltar')
if (page.includes('compras-rfq-compact')) missing.push('página: wrapper legado compras-rfq-compact detectado')
for (const marker of ['@DATA_REVISAO_APROVACAO 2026-10-26', '@STATUS_APROVACAO REV-COMPRAS-PO-PREMIUM-001', 'erp_compras_salvar_pedido', 'aliquota_ipi', 'aliquota_icms', 'centro_custo', 'synqra-po-page']) {
  if (!purchaseOrder.includes(marker)) missing.push(`pedido de compra: ${marker}`)
}
if (!/^\\s*\\/\\*\\*?[^]*?\\*\\/\\s*export \\{ default \\} from '\\.\\/ComprasPedidoCompra'\\s*$/m.test(legacyPurchaseOrder)) missing.push('PedidoCompra.tsx: implementação antiga deve permanecer removida e só reexportar a tela premium')
if (missing.length) {
  process.stderr.write(`FAIL — trava da RFQ premium: marcadores ausentes/legado detectado: ${missing.join('; ')}\n`)
  process.exit(1)
}
process.stdout.write('PASS — RFQ e Pedido de Compra premium presentes; implementações antigas bloqueadas.\n')
