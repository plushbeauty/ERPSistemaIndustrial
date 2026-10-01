import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const edge = await readFile(new URL('../supabase/functions/erp-user-admin/index.ts', import.meta.url), 'utf8')

test('company admin reset creates a provisional password without using email', () => {
  const reset = edge.slice(edge.indexOf("if (action === 'reset_password')"), edge.indexOf("if (action === 'update_user')"))
  assert.match(reset, /updateUserById\(target\.id/)
  assert.match(reset, /temporary_password: temporaryPassword/)
  assert.doesNotMatch(reset, /resetPasswordForEmail/)
})

test('account removal archives identity and supports a guarded restore', () => {
  assert.match(edge, /action === 'archive_user'/)
  assert.match(edge, /deleted_at: now/)
  assert.match(edge, /action === 'restore_user'/)
  assert.doesNotMatch(edge, /if \(action === 'delete_user'\)/)
})

test('role and individual permission changes use a server-side tenant-bound action', () => {
  assert.match(edge, /action === 'create_role'/)
  assert.match(edge, /action === 'set_role_permissions'/)
  assert.match(edge, /action === 'set_user_permission_overrides'/)
  assert.match(edge, /erp_user_has_permission/)
})

test('temporary password is forced to change and public admin routes require permission', async () => {
  const { readFile } = await import('node:fs/promises')
  const app = await readFile(new URL('../src/AppEntryV2.tsx', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20261001010000_erp_access_admin_permission_overrides.sql', import.meta.url), 'utf8')
  assert.match(edge, /must_change_password: true/)
  assert.match(edge, /must_change_password: false/)
  assert.match(app, /ForcedPasswordChange/)
  assert.match(app, /statusAcesso\.adminAccess/)
  assert.match(migration, /and u\.must_change_password = false/)
})
