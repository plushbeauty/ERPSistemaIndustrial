import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = file => {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) {
    failures.push(`Arquivo ausente: ${file}`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}
const migration = read('supabase/migrations/20261029210000_erp_pcp_auditoria_senha_v1.sql')
const panels = read('src/features/pcp/IndustrialControlPanels.tsx')
const pcp = read('src/pages/PCPWorkspace.tsx')
const receipt = read('src/pages/RecebimentoMateriaisXML.tsx')
const routes = read('src/AppEntryV2.tsx')
const signup = read('supabase/functions/erp-company-signup/index.ts')

const requireMatch = (text, pattern, message) => {
  if (!pattern.test(text)) failures.push(message)
}
requireMatch(migration, /erp_synqra_discuss_message[\s\S]*enable row level security/i, 'Histórico de auditoria deve ter RLS.')
requireMatch(migration, /erp_synqra_rating[\s\S]*enable row level security/i, 'Avaliações devem ter RLS.')
requireMatch(migration, /empresa_id\s*=\s*public\.erp_current_empresa_id\(\)/i, 'Tabelas de auditoria devem restringir a empresa ativa.')
requireMatch(migration, /erp_sistema_politica_senha[\s\S]*public\.erp_is_master\(\)/i, 'Política global de senha deve ser exclusiva Master.')
requireMatch(migration, /erp_pcp_emitir_op_com_lotes[\s\S]*erp_criar_ordem_producao_v2[\s\S]*erp_pcp_bom_itens[\s\S]*quantidade_disponivel/i, 'Emissão da OP deve validar BOM, OP existente e lotes reais.')
requireMatch(panels, /erp_pcp_emitir_op_com_lotes/, 'Tela de emissão não chama RPC transacional de OP/lotes.')
requireMatch(panels, /erp_synqra_discuss_message/, 'Painel não grava o histórico de auditoria.')
requireMatch(panels, /erp_synqra_rating/, 'Painel não grava avaliação de conformidade.')
requireMatch(panels, /is_master\s*===\s*true[\s\S]*nivel_admin[\s\S]*empresa_id\s*===\s*null/, 'Painel de senha não aplica o contrato de identidade Master.')
requireMatch(pcp, /OpEmissionScreen[\s\S]*SynqraAuditoriaModulo[\s\S]*PasswordPolicyPanel/, 'Central PCP não integra emissão, auditoria e política de senha.')
requireMatch(receipt, /erp_confirmar_recebimento_nfe[\s\S]*SHA-256|SHA-256[\s\S]*erp_confirmar_recebimento_nfe/, 'Recebimento XML não usa hash e RPC transacional.')
requireMatch(receipt, /validNfeKey[\s\S]*cStat[\s\S]*lote_interno/, 'Recebimento XML deve validar chave/protocolo e definir lote interno.')
requireMatch(routes, /recebimento-nfe[\s\S]*RecebimentoMateriaisXML/, 'Rota de recebimento XML não está registrada.')
requireMatch(signup, /erp_sistema_politica_senha[\s\S]*exigir_maiuscula[\s\S]*exigir_numero/, 'Cadastro público não consulta política global de senha.')
if (/ID_FIXO_POLITICA|00000000-0000-0000-0000-000000000000/.test(panels + receipt)) failures.push('Foi encontrado identificador fixo fictício em um painel operacional.')

if (failures.length) {
  console.error('verify:industrial-controls FAILED')
  for (const failure of failures) console.error(' - ' + failure)
  process.exitCode = 1
} else {
  console.log('verify:industrial-controls PASS')
}
