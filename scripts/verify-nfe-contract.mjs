import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

const read = relative => {
  const file = path.join(root, relative)
  if (!fs.existsSync(file)) {
    failures.push(`Arquivo ausente: ${relative}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const draftMigration = read('supabase/migrations/20261005130000_erp_nfe_draft_tenant_permission_hardening.sql')
const masterMigration = read('supabase/migrations/20261004220000_fix_erp_master_null_tenant_authorization.sql')
const compatibilityMigration = read('supabase/migrations/20260921140500_erp_nfe_legacy_tenant_helper_compatibility.sql')
const itemMigration = read('supabase/migrations/20260921141000_erp_nfe_itens_form.sql')
const emissionMigration = read('supabase/migrations/20261005120000_erp_fiscal_nfe_numbering_and_claim_v1.sql')
const emissionPage = read('src/pages/NFeEmissao.tsx')
const emissionFunction = read('supabase/functions/emitir-nfe/index.ts')

const requireIn = (text, pattern, description) => {
  if (!pattern.test(text)) failures.push(description)
}

requireIn(draftMigration, /begin\s*;[\s\S]*commit\s*;/i, 'Migration fiscal deve ser transacional.')
requireIn(compatibilityMigration, /security\s+invoker[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public[\s\S]*select\s+public\.erp_current_empresa_id\(\)/i, 'Compatibilidade fiscal deve delegar ao helper canônico sem privilégios definer.')
requireIn(compatibilityMigration, /revoke\s+all[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role[\s\S]*grant\s+execute[\s\S]*to\s+authenticated/i, 'Helper compatível deve ficar executável somente por authenticated.')
if (!('20260921140500_erp_nfe_legacy_tenant_helper_compatibility.sql' < '20260921141000_erp_nfe_itens_form.sql')) {
  failures.push('Migration compatível do helper não precede a policy histórica que ainda o referencia.')
}
requireIn(draftMigration, /security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i, 'RPC de rascunho precisa de search_path fixo.')
requireIn(draftMigration, /auth\.uid\(\)\s+is\s+null/i, 'RPC de rascunho não exige sessão autenticada.')
requireIn(draftMigration, /public\.erp_current_empresa_id\(\)/, 'RPC de rascunho não usa o helper canônico de empresa.')
requireIn(draftMigration, /public\.erp_is_master\(\)/, 'RPC de rascunho não aplica a exceção Master autenticada.')
requireIn(draftMigration, /from public\.erp_usuarios u[\s\S]*u\.auth_user_id\s*=\s*auth\.uid\(\)[\s\S]*u\.ativo\s*=\s*true[\s\S]*u\.deleted_at\s+is\s+null/i, 'RPC não valida vínculo de usuário ERP ativo.')
requireIn(draftMigration, /erp_has_permission\(\s*'fiscal'\s*,\s*'emitir'\s*\)/, 'RPC de rascunho não valida a permissão fiscal.')
requireIn(draftMigration, /v_documento\.status\s+is\s+distinct\s+from\s+'Rascunho'/, 'RPC de rascunho permite alterar documento fora de Rascunho.')
requireIn(draftMigration, /p\.empresa_id\s*=\s*v_empresa_id[\s\S]*p\.ativo\s*=\s*true/, 'RPC não valida produto ativo no tenant do documento.')
requireIn(draftMigration, /erp_logs_sistema/, 'RPC de rascunho não registra auditoria.')
requireIn(draftMigration, /revoke\s+all\s+on\s+function\s+public\.erp_salvar_rascunho_nfe[\s\S]*from\s+public\s*,\s*anon[\s\S]*grant\s+execute\s+on\s+function\s+public\.erp_salvar_rascunho_nfe[\s\S]*to\s+authenticated/i, 'RPC não está restrita a authenticated.')
requireIn(draftMigration, /erp_nfe_documentos_tenant_guard[\s\S]*as\s+restrictive/i, 'Cabeçalho NF-e não recebe guarda RLS tenant restritiva.')
requireIn(draftMigration, /erp_nfe_documentos_select_guard[\s\S]*as\s+restrictive/i, 'Cabeçalho NF-e não limita policies permissivas para leitura.')
requireIn(draftMigration, /erp_nfe_documentos_insert_guard[\s\S]*as\s+restrictive/i, 'Cabeçalho NF-e não limita policies permissivas para inserção.')
requireIn(draftMigration, /erp_nfe_documentos_select[\s\S]*fiscal',\s*'ver'/i, 'Leitura do cabeçalho NF-e não exige permissão de visualização fiscal.')
requireIn(draftMigration, /erp_nfe_documentos_insert[\s\S]*fiscal',\s*'emitir'/i, 'Inserção direta do cabeçalho não exige permissão de emissão.')
requireIn(draftMigration, /erp_nfe_documentos_update[\s\S]*status\s*=\s*'Rascunho'/i, 'Atualização direta do cabeçalho não está restrita a rascunhos.')
requireIn(draftMigration, /erp_nfe_documentos_delete[\s\S]*status\s*=\s*'Rascunho'/i, 'Exclusão direta do cabeçalho não está restrita a rascunhos.')
requireIn(draftMigration, /erp_nfe_notas_tenant_guard[\s\S]*as\s+restrictive/i, 'Notas emitidas não recebem guarda RLS tenant restritiva.')
requireIn(draftMigration, /erp_nfe_notas_select[\s\S]*fiscal',\s*'ver'/i, 'Leitura de notas emitidas não exige permissão fiscal.')
requireIn(draftMigration, /erp_nfe_notas_insert_guard[\s\S]*with\s+check\s*\(\s*false\s*\)/i, 'Usuários autenticados podem inserir diretamente notas emitidas.')
requireIn(draftMigration, /erp_nfe_itens_tenant_guard[\s\S]*as\s+restrictive/i, 'Itens NF-e não recebem guarda RLS tenant restritiva.')
requireIn(draftMigration, /erp_nfe_itens_tenant_select[\s\S]*fiscal',\s*'ver'[\s\S]*d\.empresa_id\s*=\s*erp_documentos_fiscais_itens\.empresa_id/i, 'Leitura dos itens não valida permissão, tenant e vínculo ao cabeçalho.')
requireIn(draftMigration, /erp_nfe_itens_select_guard[\s\S]*as\s+restrictive/i, 'Itens NF-e não limitam policies permissivas para leitura.')
requireIn(draftMigration, /erp_nfe_itens_tenant_insert[\s\S]*fiscal',\s*'emitir'[\s\S]*d\.status\s*=\s*'Rascunho'/i, 'Inserção de item não exige permissão e cabeçalho rascunho do mesmo tenant.')
requireIn(draftMigration, /alter table public\.erp_documentos_fiscais enable row level security/i, 'RLS do cabeçalho NF-e não é habilitado.')
requireIn(draftMigration, /alter table public\.erp_notas_fiscais enable row level security/i, 'RLS das notas autorizadas não é habilitado.')
requireIn(draftMigration, /alter table public\.erp_documentos_fiscais_itens enable row level security/i, 'RLS dos itens NF-e não é habilitado.')
for (const table of ['erp_documentos_fiscais', 'erp_notas_fiscais', 'erp_documentos_fiscais_itens']) {
  requireIn(draftMigration, new RegExp(`revoke all on table public\\.${table} from anon`, 'i'), `Permissões SQL de anon não foram revogadas em ${table}.`)
  requireIn(draftMigration, new RegExp(`create policy erp_nfe_${table === 'erp_documentos_fiscais' ? 'documentos' : table === 'erp_notas_fiscais' ? 'notas' : 'itens'}_anon_deny[\\s\\S]*as restrictive[\\s\\S]*for all to anon[\\s\\S]*using\\s*\\(false\\)`, 'i'), `RLS não contém uma negação restritiva a anon em ${table}.`)
}
requireIn(draftMigration, /insert into public\.erp_permissions[\s\S]*\('fiscal\.ver'[\s\S]*\('fiscal\.emitir'/i, 'Permissões fiscais não estão registradas no catálogo RBAC.')
requireIn(draftMigration, /where r\.codigo in \('ADMIN', 'MANAGER'\)/i, 'Permissão de emissão não está vinculada aos papéis fiscais designados.')
requireIn(draftMigration, /where r\.codigo = 'SUPERVISOR'/i, 'Permissão de consulta fiscal não está vinculada ao perfil de consulta.')
if (/erp_current_company_id/i.test(draftMigration)) failures.push('Migration NF-e efetiva ainda usa helper de tenant legado.')
if (/erp_current_company_id/i.test(itemMigration) && !/drop policy if exists "erp_nfe_itens_tenant_isolation"/i.test(draftMigration)) {
  failures.push('Policy histórica de itens não é substituída pela migration aditiva.')
}
requireIn(masterMigration, /u\.auth_user_id\s*=\s*auth\.uid\(\)[\s\S]*u\.is_master\s*=\s*true[\s\S]*nivel_admin[\s\S]*perfil[\s\S]*empresa_id\s+is\s+null/i, 'Helper canônico não preserva o contrato Master com empresa nula.')
const migrationsDirectory = path.join(root, 'supabase', 'migrations')
const legacyReferences = fs.readdirSync(migrationsDirectory)
  .filter(file => file.endsWith('.sql'))
  .filter(file => /erp_current_company_id/i.test(fs.readFileSync(path.join(migrationsDirectory, file), 'utf8')))
  .sort()
const expectedLegacyReferences = [
  '20260921140500_erp_nfe_legacy_tenant_helper_compatibility.sql',
  '20260921141000_erp_nfe_itens_form.sql',
  '20260924210000_erp_nfe_rascunho_transacional_v1.sql',
].sort()
if (JSON.stringify(legacyReferences) !== JSON.stringify(expectedLegacyReferences)) {
  failures.push(`Referências ao helper legado fora da compatibilidade/migrations históricas: ${legacyReferences.join(', ')}`)
}
if (/^\s*grant\b[^;]*\bto\s+anon\b/im.test(draftMigration)) {
  failures.push('A migration concede privilégios fiscais a anon.')
}
if (/using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i.test(draftMigration)) {
  failures.push('A migration inclui política RLS global permissiva.')
}

requireIn(emissionMigration, /erp_has_permission\(\s*'fiscal'\s*,\s*'emitir'\s*\)/, 'Reserva/claim de NF-e não verifica permissão fiscal.')
requireIn(emissionPage, /supabase\.rpc\('erp_salvar_rascunho_nfe'/, 'Tela NF-e não grava usando a RPC transacional.')
requireIn(emissionPage, /functions\.invoke\('emitir-nfe'/, 'Tela NF-e não chama a Edge Function de emissão.')
requireIn(emissionPage, /data\.status\s*!==\s*'Autorizada'/, 'Tela NF-e pode indicar autorização sem estado confirmado.')
requireIn(emissionFunction, /authData\.user/, 'Edge Function não valida a sessão do usuário.')
requireIn(emissionFunction, /erp_has_permission/, 'Edge Function não verifica permissão antes de transmitir.')
requireIn(emissionFunction, /erp_iniciar_emissao_nfe/, 'Edge Function não reivindica a NF-e antes de transmitir.')
requireIn(emissionFunction, /xmlStatus[\s\S]*100[\s\S]*150/, 'Edge Function não valida o XML SEFAZ de autorização.')
requireIn(emissionFunction, /NOTAAS_API_KEY/, 'Edge Function não exige a credencial fiscal server-side configurada.')
if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(emissionPage)) failures.push('Chave privada encontrada na tela de emissão.')

console.log('=== ERP INDUSTRIAL — NF-e CONTRACT GATE ===')
console.log(`Falhas: ${failures.length}`)
for (const failure of failures) console.log(`[BLOCKER] ${failure}`)

if (failures.length) {
  console.log('RESULT: FAIL — contrato fiscal local inconsistente.')
  process.exit(2)
}

console.log('RESULT: PASS — contrato estático de rascunho, tenant, permissão e emissão coerente.')
