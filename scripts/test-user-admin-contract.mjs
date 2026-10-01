import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const edge = await readFile(new URL('../supabase/functions/erp-user-admin/index.ts', import.meta.url), 'utf8')

test('company admin reset creates a provisional password without using email', () => {
  const reset = edge.slice(edge.indexOf("if (action === 'reset_password')"), edge.indexOf("if (action === 'update_user')"))
  assert.match(reset, /updateUserById\(target\.auth_user_id/)
  assert.match(reset, /temporary_password: temporaryPassword/)
  assert.doesNotMatch(reset, /resetPasswordForEmail/)
})

test('account removal archives identity and supports a guarded restore', () => {
  assert.match(edge, /action === 'archive_user'/)
  assert.match(edge, /p_operation: 'archive'/)
  assert.match(edge, /action === 'restore_user'/)
  assert.match(edge, /p_operation: 'restore'/)
  assert.doesNotMatch(edge, /if \(action === 'delete_user'\)/)
})

test('role and individual permission changes use a server-side tenant-bound action', () => {
  assert.match(edge, /action === 'create_role'/)
  assert.match(edge, /action === 'set_role_permissions'/)
  assert.match(edge, /action === 'set_user_permission_overrides'/)
  assert.match(edge, /userClient\.rpc\('erp_has_permission'/)
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

test('admin API exposes the permission catalog, role grants, scoped users and audit history', () => {
  assert.match(edge, /action === 'list_admin_data'/)
  assert.match(edge, /action === 'list_audit'/)
  assert.match(edge, /company_id/)
  assert.match(edge, /erp_role_permissions/)
  assert.match(edge, /erp_user_permission_overrides/)
  assert.match(edge, /actorCan\('usuarios', 'ver'\)/)
  assert.match(edge, /actorCan\('auditoria', 'ver'\)/)
  assert.match(edge, /\.eq\('auth_user_id', authUserId\)/)
  assert.match(edge, /userClient\.rpc\('erp_has_permission'/)
  assert.match(edge, /erp_admin_update_user_state/)
  assert.match(edge, /erp_admin_update_user'/)
})

test('admin UI has four access tabs and never offers email invitations or email resets', async () => {
  const ui = await readFile(new URL('../src/pages/UsuariosAdmin.tsx', import.meta.url), 'utf8')
  for (const tab of ['Usuários', 'Perfis', 'Permissões', 'Auditoria']) assert.match(ui, new RegExp(tab))
  assert.doesNotMatch(ui, /Enviar código|Convidar usuário|Convidar por e-mail/)
  assert.match(ui, /Identificador interno de autenticação/)
  assert.match(ui, /Herdar|Permitir|Bloquear/)
})

test('deactivating or archiving the last company administrator is guarded server-side', () => {
  const migrationPath = new URL('../supabase/migrations/20261001010000_erp_access_admin_permission_overrides.sql', import.meta.url)
  return readFile(migrationPath, 'utf8').then(migration => {
    assert.match(migration, /erp_admin_update_user_state/)
    assert.match(migration, /for update/)
    assert.match(migration, /A empresa precisa manter ao menos um administrador ativo/i)
    assert.match(migration, /other_admin\.nivel_admin >= 8/)
    assert.match(migration, /insert into public\.erp_audit_logs/)
  })
})
