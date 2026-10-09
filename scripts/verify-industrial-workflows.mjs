import { readFileSync } from 'node:fs'

const checks = []
const read = (path) => {
  try { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8') }
  catch { return '' }
}
const requireIn = (source, pattern, message) => {
  checks.push({ ok: pattern.test(source), message })
}
const bom = read('src/features/pcp/EngenhariaBOM.tsx')
const bomMigration = read('supabase/migrations/20261009170000_pcp_bom_yield_loss_v1.sql')
const routing = read('src/features/pcp/RoteiroOperacoes.tsx')
const pfmea = read('src/pages/QualidadePFMEA.tsx')
const rnc = read('src/pages/QualidadeRNC.tsx')
const rncMigration = read('supabase/migrations/20261009173000_sgq_rnc_quarantine_atomic_v1.sql')
const receiving = read('src/pages/estoque/EstoqueRecebimentoLotes.tsx')
const receivingMigration = read('supabase/migrations/20261009180000_erp_receiving_expiry_required_v1.sql')
const nfe = read('src/pages/NFeEmissaoCompact.tsx')
const finance = read('src/pages/FinancasContasPagar.tsx')

requireIn(bom, /\.eq\('empresa_id', companyId\)/, 'BOM não limita leitura à empresa atual.')
requireIn(bom, /p_rendimento_percentual:\s*yieldPercent/, 'BOM não envia rendimento ao RPC.')
requireIn(bom, /p_perda_galvanica_percentual:\s*galvanicLoss[\s\S]*p_perda_mecanica_percentual:\s*mechanicalLoss/, 'BOM não envia as perdas galvânica e mecânica.')
requireIn(bom, /const walkTree[\s\S]*walkTree\(item\.produto_id/, 'BOM não renderiza a estrutura multinível.')
requireIn(bomMigration, /rendimento_percentual[\s\S]*perda_galvanica_percentual[\s\S]*perda_mecanica_percentual/, 'Migration BOM não define rendimento e perdas.')
requireIn(bomMigration, /where id = p_produto_pai_id and empresa_id = v_empresa_id and ativo = true/, 'RPC BOM não valida o produto pai no tenant.')
requireIn(routing, /\.eq\('empresa_id', companyId\)/, 'Roteiro não limita cadastros à empresa atual.')
requireIn(routing, /tempo padrão deve ser zero ou maior/, 'Roteiro não valida o tempo de operação.')
requireIn(pfmea, /form\.severidade \* form\.ocorrencia \* form\.deteccao/, 'PFMEA não calcula NPR em tempo real.')
requireIn(pfmea, /Number\.isInteger\(value\) && value >= 1 && value <= 10/, 'PFMEA não valida escalas de risco de 1 a 10.')
requireIn(rnc, /segregatedQuantity > Number\(lotResult\.data\.quantidade_disponivel/, 'RNC não valida quantidade segregada contra saldo disponível.')
requireIn(rncMigration, /perform public\.erp_reter_lote\([\s\S]*v_result\.numero_rpnc/, 'A abertura de RNC não retém o lote na mesma transação.')
requireIn(rncMigration, /for update;[\s\S]*if not found then[\s\S]*O lote vinculado não pertence/, 'RPC RNC não bloqueia e valida o lote no tenant.')
requireIn(receiving, /value=\{validade\}[\s\S]*p_validade:\s*validade/, 'Recebimento não expõe nem envia a validade do lote.')
requireIn(receiving, /limpeza compensatória do certificado também falhou/, 'Recebimento não reporta falha ao remover certificado órfão.')
requireIn(receiving, /\.range\(from, from \+ 999\)/, 'Recebimento não pagina o catálogo de produtos.')
requireIn(receivingMigration, /p_validade is null or p_validade < current_date/, 'RPC de recebimento aceita lote sem validade ou vencido.')
requireIn(receivingMigration, /p_certificado_path not like 'empresas\/' \|\| v_empresa_id::text/, 'RPC de recebimento não valida o caminho do certificado por tenant.')
requireIn(nfe, /functions\.invoke\('emitir-nfe',[\s\S]*documento_id: documentId/, 'Emissão compacta não chama o integrador fiscal.')
requireIn(nfe, /createSignedUrl\(danfePath, 60\)/, 'DANFE não usa URL assinada de curta duração.')
requireIn(nfe, /replace\(\/\\D\/g, ''\)/, 'Campos fiscais não normalizam corretamente dígitos.')
requireIn(finance, /const year = new Date\(\)\.getFullYear\(\)/, 'Métricas financeiras ainda usam período anual fixo.')

const failed = checks.filter(check => !check.ok)
for (const check of checks) {
  if (!check.ok) process.stderr.write(`FAIL: ${check.message}\n`)
}
process.stdout.write(`INDUSTRIAL WORKFLOW CONTRACT — checks=${checks.length}; failures=${failed.length}\n`)
if (failed.length) {
  process.stderr.write('RESULT: FAIL — corrigir os contratos de Engenharia, SGQ, Estoque, Fiscal e Financeiro.\n')
  process.exitCode = 1
} else {
  process.stdout.write('RESULT: PASS — contratos de Engenharia, SGQ, Estoque, Fiscal e Financeiro coerentes.\n')
}
