import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const bootstrap = read('../src/AppBootstrap.tsx')
const login = read('../src/IndustrialLoginDirect.tsx')
const migration = read('../supabase/migrations/20261012180000_align_master_auth_contract.sql')

assert.match(bootstrap, /nivel_admin \?\? 0\) >= 100/, 'AppBootstrap must reserve admin level >= 100 for strict Master')
assert.match(bootstrap, /profile\?\.is_master === true &&[^\n]*=== 'MASTER'[^\n]*empresa_id === null/, 'AppBootstrap must enforce the complete Master contract')
assert.match(bootstrap, /if \(!master && !empresaId\)[\s\S]{0,80}setState\('denied'\)/, 'AppBootstrap must deny identities without Master level or company scope')
assert.match(login, /nivel >= 100\s*&&\s*perfil === 'MASTER'/, 'Login must use the same >= 100 Master threshold')
assert.match(login, /profile\.is_master === true \|\| perfil === 'MASTER' \|\| nivel >= 100/, 'Login must reject inconsistent elevated identities')
assert.match(migration, /u\.is_master = true\s+and coalesce\(u\.nivel_admin, 0\) >= 100\s+and upper\(btrim\(coalesce\(u\.perfil, ''\)\)\) = 'MASTER'\s+and u\.empresa_id is null\s+and u\.setor_id is null/, 'Database Master helper must match the strict frontend contract')

console.log('PASS: AppBootstrap, login, and database Master identity contract are aligned.')
