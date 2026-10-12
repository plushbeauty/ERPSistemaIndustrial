import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const profile = read('../src/auth/AuthProfile.ts')
const login = read('../src/IndustrialLoginDirect.tsx')
const migration = read('../supabase/migrations/20261012180000_align_master_auth_contract.sql')

assert.match(profile, /nivel\s*>=\s*100/, 'AuthProfile must reserve admin level >= 100 for strict Master')
assert.match(profile, /user\.is_master === true\s*&&\s*perfil === 'MASTER'\s*&&\s*nivel >= 100\s*&&\s*user\.empresa_id === null/, 'AuthProfile must enforce the complete Master contract')
assert.match(profile, /user\.is_master === true \|\| perfil === 'MASTER' \|\| nivel >= 100/, 'AuthProfile must reject inconsistent elevated identities')
assert.match(login, /nivel >= 100\s*&&\s*perfil === 'MASTER'/, 'Login must use the same >= 100 Master threshold')
assert.match(login, /profile\.is_master === true \|\| perfil === 'MASTER' \|\| nivel >= 100/, 'Login must reject inconsistent elevated identities')
assert.match(migration, /u\.is_master = true\s+and coalesce\(u\.nivel_admin, 0\) >= 100\s+and upper\(btrim\(coalesce\(u\.perfil, ''\)\)\) = 'MASTER'\s+and u\.empresa_id is null\s+and u\.setor_id is null/, 'Database Master helper must match the strict frontend contract')

console.log('PASS: AuthProfile, login, and database Master identity contract are aligned.')
