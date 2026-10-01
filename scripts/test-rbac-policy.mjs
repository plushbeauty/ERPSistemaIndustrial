import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolveEffectivePermission } from '../src/lib/permission-resolution.ts'

test('a user-level deny overrides role and department grants', () => {
  assert.equal(resolveEffectivePermission({ roleGranted: true, departmentGranted: true, userOverride: 'deny' }), false)
})

test('a user-level allow overrides inherited role denial', () => {
  assert.equal(resolveEffectivePermission({ roleGranted: false, departmentGranted: false, userOverride: 'allow' }), true)
})

test('missing user override inherits role or department grant', () => {
  assert.equal(resolveEffectivePermission({ roleGranted: false, departmentGranted: true, userOverride: null }), true)
  assert.equal(resolveEffectivePermission({ roleGranted: false, departmentGranted: false, userOverride: null }), false)
})

test('MASTER bypasses permission grants', () => {
  assert.equal(resolveEffectivePermission({ roleGranted: false, departmentGranted: false, userOverride: 'deny', isMaster: true }), true)
})

test('database policy uses user overrides before profile and department grants', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261001010000_erp_access_admin_permission_overrides.sql', import.meta.url), 'utf8')
  const deny = migration.indexOf("when override.effect = 'deny' then false")
  const inherited = migration.indexOf('else (\n      exists (')
  assert.ok(deny >= 0 && inherited > deny, 'explicit denial must be evaluated before inherited grants')
  assert.match(migration, /o\.empresa_id = u\.empresa_id/)
  assert.match(migration, /u\.deleted_at is null/)
})
