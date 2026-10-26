import { readFileSync } from 'node:fs'

const page = readFileSync('src/pages/ComprasRFQ.tsx', 'utf8')
const analysisPage = readFileSync('src/pages/ComprasAnalisePrecos.tsx', 'utf8')
const styles = readFileSync('src/styles/synqra-workspace.css', 'utf8')
const purchaseOrder = readFileSync('src/pages/ComprasPedidoCompra.tsx', 'utf8')
const legacyPurchaseOrder = readFileSync('src/pages/PedidoCompra.tsx', 'utf8')
const purchaseOrderMigration = readFileSync('supabase/migrations/20261026120000_erp_compras_pedido_fiscal_items.sql', 'utf8')

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
const requiredAnalysisMarkers = [
  '@DATA_REVISAO_APROVACAO 2026-10-26',
  '@STATUS_APROVACAO REV-COMPRAS-ANALISE-PREMIUM-001',
  'synqra-analysis-page',
  'CircleDollarSign',
  'ClipboardCheck',
  'RefreshCw',
  'supabase.rpc(\'erp_current_empresa_id\')',
  ".from('erp_rfq')",
  'Finalizar análise e enviar para aprovação',
]
const requiredStyleMarkers = [
  '.synqra-rfq-page',
  '.rfq-main-grid',
  '.rfq-fields-grid',
  '.rfq-table',
  '.rfq-save-button',
]
const requiredPurchaseOrderMarkers = [
  '@DATA_REVISAO_APROVACAO 2026-10-26',
  '@STATUS_APROVACAO REV-COMPRAS-PO-PREMIUM-001',
  'erp_compras_salvar_pedido',
  'aliquota_ipi',
  'aliquota_icms',
  'centro_custo',
  'synqra-po-page',
]

const missing = [
  ...requiredPageMarkers.filter(marker => !page.includes(marker)).map(marker => `RFQ: marcador ausente — ${marker}`),
  ...requiredStyleMarkers.filter(marker => !styles.includes(marker)).map(marker => `CSS RFQ: seletor ausente — ${marker}`),
  ...requiredAnalysisMarkers.filter(marker => !analysisPage.includes(marker)).map(marker => `Análise de preços: marcador ausente — ${marker}`),
  ...requiredPurchaseOrderMarkers.filter(marker => !purchaseOrder.includes(marker)).map(marker => `Pedido de compra: marcador ausente — ${marker}`),
]

if (/<style\s*>/i.test(page)) missing.push('RFQ: estilo inline legado detectado')
if (/<style\s*>/i.test(analysisPage)) missing.push('Análise de preços: estilo inline legado detectado')
for (const marker of ['.synqra-analysis-page', '.synqra-analysis-table', '.synqra-analysis-action-primary', '.synqra-analysis-kpis']) {
  if (!styles.includes(marker)) missing.push(`CSS análise de preços: seletor ausente — ${marker}`)
}
if (page.includes('compras-rfq-compact')) missing.push('RFQ: wrapper legado compras-rfq-compact detectado')
if (
  !legacyPurchaseOrder.includes("export { default } from './ComprasPedidoCompra'") ||
  legacyPurchaseOrder.includes('function PedidoCompra') ||
  legacyPurchaseOrder.length > 500
) {
  missing.push('PedidoCompra.tsx: a implementação antiga deve permanecer removida e apenas reexportar a tela premium')
}

if (missing.length > 0) {
  process.stderr.write(`FAIL — trava de regressão Compras premium: ${missing.join('; ')}\n`)
  process.exit(1)
}

process.stdout.write('PASS — RFQ e Pedido de Compra premium presentes; implementações antigas bloqueadas.\n')
