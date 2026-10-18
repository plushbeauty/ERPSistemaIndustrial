import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const edge = readFileSync(new URL('../supabase/functions/erp-company-signup/index.ts', import.meta.url), 'utf8')
const masterContract = readFileSync(new URL('../scripts/verify-auth-master-contract.mjs', import.meta.url), 'utf8')

assert.match(edge, /perfil:\s*'ADMIN'/, 'Signup must create a tenant administrator')
assert.match(edge, /nivel_admin:\s*1/, 'Tenant administrator must not receive Master level')
assert.match(edge, /is_master:\s*false/, 'Tenant administrator must never be Master')
assert.match(edge, /documento,\s*tipo_documento:\s*tipoDocumento/, 'Signup must persist canonical fiscal document and type')
assert.match(edge, /\.from\('erp_planos_catalogo'\)/, 'Signup must validate plan against the database catalog')
assert.match(edge, /plano:\s*plan\.codigo/, 'Signup must persist the canonical plan code')
assert.match(edge, /plano_nome:\s*plan\.nome/, 'Signup response must report the persisted plan')
assert.match(edge, /modulo_persistido:\s*false/, 'Signup must not claim module selection is persisted')
assert.match(edge, /validCpf\(documento\)/, 'CPF must pass checksum validation')
assert.match(edge, /validCnpj\(documento\)/, 'CNPJ must pass checksum validation')
assert.match(edge, /deleteUser\(authUserId\)/, 'Rollback must attempt to remove the created Auth identity')
assert.match(masterContract, /nivel >= 100/, 'Existing strict Master contract must remain present')

console.log('PASS: signup contract static checks (tenant admin, document, plan, Master separation, rollback).')
console.log('LIMIT: static checks do not replace Deno tests, live DB/Auth tests, RLS isolation, or abuse/rate-limit validation.')
