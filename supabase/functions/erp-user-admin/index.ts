import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ERP_ALLOWED_ORIGIN') || 'https://erp-sistema-industrial.vercel.app'
const cors = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, service, { auth: { autoRefreshToken: false, persistSession: false } })

function passwordIsStrong(value: string) { return value.length >= 6 }
function randomPassword() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; let value = ''; for (let i = 0; i < 14; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)]; return value }
function isMaster(role: unknown) { const value = String(role ?? '').toUpperCase(); return value === 'MASTER' || value === 'MASTER_ADMIN' || value === 'SUPER_ADMIN' }

async function actorFor(authUserId: string) {
  const { data, error } = await admin.from('erp_usuarios').select('id,empresa_id,nome,email,ativo,role,role_id,nivel_admin,is_master').eq('id', authUserId).maybeSingle()
  if (error) throw error
  return data
}

async function roleFor(roleId: string | null, fallbackLevel: number) {
  if (roleId) {
    const { data, error } = await admin.from('erp_roles').select('id,codigo,nome,nivel').eq('id', roleId).eq('ativo', true).maybeSingle()
    if (error) throw error
    if (data) return data
  }
  const { data, error } = await admin.from('erp_roles').select('id,codigo,nome,nivel').eq('ativo', true).lte('nivel', fallbackLevel).order('nivel', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

async function writeAudit(actor: any, action: string, entityId: string | null, oldData: unknown, newData: unknown, req: Request) {
  await admin.from('erp_audit_logs').insert({ empresa_id: actor?.empresa_id ?? null, actor_user_id: actor?.id ?? null, action, entity_type: 'erp_usuario', entity_id: entityId, old_data: oldData ?? null, new_data: newData ?? null, user_agent: req.headers.get('user-agent') }).then(() => undefined).catch(() => undefined)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return json({ error: 'Não autenticado.' }, 401)
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authorization } } })
    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401)

    const body = await req.json()
    const action = String(body.action || '')

    if (action === 'finalize_invite') {
      const email = String(authData.user.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const nome = String(body.nome || '').trim()
      if (!email || !password || nome.length < 3) return json({ error: 'Nome e senha são obrigatórios.' }, 400)
      if (!passwordIsStrong(password) || password.length < 6) return json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400)

      const { data: invite, error: inviteError } = await admin
        .from('erp_convites_acesso')
        .select('id,empresa_id,email,nome,auth_user_id,role,role_id,nivel_admin,expira_em,verificado_em,concluido_em,cancelado_em')
        .eq('auth_user_id', authData.user.id)
        .ilike('email', email)
        .is('concluido_em', null)
        .is('cancelado_em', null)
        .gt('expira_em', new Date().toISOString())
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (inviteError) throw inviteError
      if (!invite) return json({ error: 'Convite inexistente, expirado ou já utilizado.' }, 409)

      const changed = await admin.auth.admin.updateUserById(authData.user.id, {
        password,
        user_metadata: { ...authData.user.user_metadata, nome, must_change_password: false, invited_user: true },
        app_metadata: { ...authData.user.app_metadata, empresa_id: invite.empresa_id, role: invite.role, is_master: false },
      })
      if (changed.error) return json({ error: changed.error.message }, 400)

      const { error: profileError } = await admin
        .from('erp_usuarios')
        .update({ nome, email, ativo: true, updated_at: new Date().toISOString() })
        .eq('id', authData.user.id)
        .eq('empresa_id', invite.empresa_id)
      if (profileError) throw profileError

      const { error: closeError } = await admin
        .from('erp_convites_acesso')
        .update({ verificado_em: new Date().toISOString(), concluido_em: new Date().toISOString() })
        .eq('id', invite.id)
      if (closeError) throw closeError

      return json({ ok: true, message: 'Cadastro concluído. Seu acesso está habilitado.' })
    }

    const actor = await actorFor(authData.user.id)
    if (!actor?.ativo) return json({ error: 'Usuário interno inativo.' }, 403)
    const actorIsMaster = isMaster(actor.role)
    const actorLevel = Number(actor.nivel_admin ?? 0)
    const isAdmin = actorIsMaster || actorLevel >= 8
    if (!isAdmin && action !== 'change_my_password') return json({ error: 'Sem permissão administrativa.' }, 403)

    if (action === 'list_users') {
      const { data, error } = await admin.from('erp_usuarios').select('id,empresa_id,nome,email,role,role_id,nivel_admin,ativo,login_nome,created_at,setor_id,cargo_id,matricula').eq('empresa_id', actor.empresa_id).is('deleted_at', null).order('nome')
      if (error) throw error
      return json({ ok: true, users: data || [] })
    }

    if (action === 'change_my_password') {
      const currentPassword = String(body.currentPassword || '')
      const newPassword = String(body.newPassword || '')
      if (!passwordIsStrong(newPassword)) return json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, 400)
      if (!authData.user.email) return json({ error: 'O usuário autenticado não possui e-mail.' }, 400)
      const verify = createClient(supabaseUrl, anon)
      const check = await verify.auth.signInWithPassword({ email: authData.user.email, password: currentPassword })
      if (check.error) return json({ error: 'Senha atual inválida.' }, 400)
      const changed = await admin.auth.admin.updateUserById(authData.user.id, { password: newPassword, user_metadata: { ...authData.user.user_metadata, must_change_password: false } })
      if (changed.error) return json({ error: changed.error.message }, 400)
      return json({ ok: true, message: 'Senha alterada com sucesso.' })
    }

    if (action === 'create_user' || action === 'invite_user') {
      const nome = String(body.nome || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const loginNome = String(body.login_nome || '').trim().toLowerCase() || null
      const selectedRoleId = body.role_id ? String(body.role_id) : null
      const requestedLevel = Math.max(1, Math.min(9, Number(body.nivel_admin ?? 1)))
      const role = await roleFor(selectedRoleId, requestedLevel)
      const nivelAdmin = Number(role?.nivel ?? requestedLevel)
      const roleCode = String(role?.codigo ?? 'USER').toUpperCase()
      if (!nome || !email) return json({ error: 'Nome e e-mail são obrigatórios.' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
      if (nivelAdmin >= actorLevel && !actorIsMaster) return json({ error: 'Você só pode criar usuários com nível inferior ao seu.' }, 403)
      if (isMaster(roleCode) && !actorIsMaster) return json({ error: 'Somente MASTER pode criar outro perfil MASTER.' }, 403)
      if (loginNome) {
        const { data: duplicate } = await admin.from('erp_usuarios').select('id').eq('empresa_id', actor.empresa_id).ilike('login_nome', loginNome).is('deleted_at', null).maybeSingle()
        if (duplicate) return json({ error: 'Este login já está cadastrado nesta empresa.' }, 409)
      }
      const { data: existing } = await admin.from('erp_usuarios').select('id').eq('empresa_id', actor.empresa_id).ilike('email', email).is('deleted_at', null).maybeSingle()
      if (existing) return json({ error: 'Este e-mail já está cadastrado nesta empresa.' }, 409)

      let authUserId = ''
      let temporaryPassword: string | null = null
      if (action === 'invite_user') {
        const { data: pending } = await admin
          .from('erp_convites_acesso')
          .select('id,auth_user_id')
          .ilike('email', email)
          .is('concluido_em', null)
          .is('cancelado_em', null)
          .maybeSingle()
        if (pending) return json({ error: 'Já existe um convite pendente para este e-mail. O cliente deve usar o código recebido ou aguardar a expiração.' }, 409)

        const created = await admin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: { nome, invited_user: true, must_change_password: true, empresa_id: actor.empresa_id },
          app_metadata: { empresa_id: actor.empresa_id, role: roleCode, is_master: false },
        })
        if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar a identidade de acesso.' }, 400)
        authUserId = created.data.user.id

        const { error: profileError } = await admin.from('erp_usuarios').insert({
          id: authUserId, auth_user_id: authUserId, empresa_id: actor.empresa_id, nome, email, role: roleCode,
          nivel_admin: nivelAdmin, ativo: false, role_id: role?.id ?? null, setor_id: body.setor_id || null,
          cargo_id: body.cargo_id || null, matricula: body.matricula ? String(body.matricula).trim() : null,
          login_nome: loginNome,
        })
        if (profileError) {
          await admin.auth.admin.deleteUser(authUserId)
          return json({ error: profileError.message }, 400)
        }

        const { data: invite, error: inviteError } = await admin.from('erp_convites_acesso').insert({
          empresa_id: actor.empresa_id, email, nome, role_id: role?.id ?? null, role: roleCode,
          nivel_admin: nivelAdmin, auth_user_id: authUserId, criado_por: actor.id,
        }).select('id').single()
        if (inviteError || !invite) {
          await admin.from('erp_usuarios').delete().eq('id', authUserId)
          await admin.auth.admin.deleteUser(authUserId)
          return json({ error: inviteError?.message || 'Não foi possível registrar o convite.' }, 400)
        }

        const otpClient = createClient(supabaseUrl, anon, { auth: { persistSession: false, autoRefreshToken: false } })
        const { error: otpError } = await otpClient.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: `${Deno.env.get('ERP_ALLOWED_ORIGIN') || 'https://erp-sistema-industrial.vercel.app'}/ativar-acesso` },
        })
        if (otpError) {
          await admin.from('erp_convites_acesso').update({ cancelado_em: new Date().toISOString() }).eq('id', invite.id)
          await admin.from('erp_usuarios').delete().eq('id', authUserId)
          await admin.auth.admin.deleteUser(authUserId)
          return json({ error: `O convite foi preparado, mas o e-mail com código não pôde ser enviado: ${otpError.message}` }, 502)
        }

        await writeAudit(actor, 'user.invited_with_otp', authUserId, null, { ...invite, email, role: roleCode }, req)
        return json({ ok: true, invited: true, message: 'Código de acesso enviado ao e-mail. O usuário deve abrir /ativar-acesso e informar o código recebido.' })
      }

      const password = String(body.password || randomPassword())
      if (!passwordIsStrong(password)) return json({ error: 'A senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: !body.password, empresa_id: actor.empresa_id } })
      if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar o usuário Auth.' }, 400)
      authUserId = created.data.user.id
      temporaryPassword = body.password ? null : password

      const inserted = await admin.from('erp_usuarios').insert({ id: authUserId, auth_user_id: authUserId, empresa_id: actor.empresa_id, nome, email, role: roleCode, nivel_admin: nivelAdmin, ativo: true, role_id: role?.id ?? null, setor_id: body.setor_id || null, cargo_id: body.cargo_id || null, matricula: body.matricula ? String(body.matricula).trim() : null, login_nome: loginNome }).select('id,empresa_id,nome,email,role,nivel_admin,ativo,role_id,setor_id,cargo_id,matricula,login_nome').single()
      if (inserted.error) {
        await admin.auth.admin.deleteUser(authUserId)
        return json({ error: inserted.error.message }, 400)
      }
      await writeAudit(actor, 'user.created', inserted.data.id, null, inserted.data, req)
      return json({ ok: true, user: inserted.data, temporary_password: temporaryPassword, invited: false })
    }

    const targetId = String(body.user_id || '')
    if (!targetId) return json({ error: 'Usuário alvo não informado.' }, 400)
    const { data: target, error: targetError } = await admin.from('erp_usuarios').select('id,empresa_id,nome,email,role,nivel_admin,ativo,role_id').eq('id', targetId).eq('empresa_id', actor.empresa_id).is('deleted_at', null).maybeSingle()
    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado nesta empresa.' }, 404)
    if (target.id === authData.user.id) return json({ error: 'Esta operação não pode ser executada sobre o próprio usuário.' }, 400)
    const targetLevel = Number(target.nivel_admin ?? 0)
    if (!actorIsMaster && targetLevel >= actorLevel) return json({ error: 'Você não pode alterar ou excluir um usuário de nível igual ou superior ao seu.' }, 403)

    if (action === 'set_active') {
      const active = Boolean(body.ativo)
      const { error } = await admin.from('erp_usuarios').update({ ativo: active, updated_at: new Date().toISOString() }).eq('id', target.id).eq('empresa_id', actor.empresa_id)
      if (error) throw error
      const authUpdate = await admin.auth.admin.updateUserById(target.id, { ban_duration: active ? 'none' : '876000h' })
      if (authUpdate.error) return json({ error: `Perfil atualizado, mas o acesso Auth não foi sincronizado: ${authUpdate.error.message}` }, 409)
      await writeAudit(actor, active ? 'user.activated' : 'user.deactivated', target.id, target, { ...target, ativo: active }, req)
      return json({ ok: true, message: active ? 'Usuário ativado.' : 'Usuário bloqueado.' })
    }

    if (action === 'update_user') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.nome !== undefined) patch.nome = String(body.nome).trim()
      if (body.login_nome !== undefined) patch.login_nome = String(body.login_nome).trim().toLowerCase() || null
      if (body.matricula !== undefined) patch.matricula = String(body.matricula).trim() || null
      if (body.setor_id !== undefined) patch.setor_id = body.setor_id || null
      if (body.cargo_id !== undefined) patch.cargo_id = body.cargo_id || null
      if (body.role_id !== undefined) {
        const role = await roleFor(body.role_id ? String(body.role_id) : null, 1)
        if (!role) return json({ error: 'Perfil de acesso inválido.' }, 400)
        if (!actorIsMaster && Number(role.nivel) >= actorLevel) return json({ error: 'O perfil escolhido deve ter nível inferior ao seu.' }, 403)
        if (isMaster(role.codigo) && !actorIsMaster) return json({ error: 'Somente MASTER pode atribuir perfil MASTER.' }, 403)
        patch.role_id = role.id
        patch.role = String(role.codigo).toUpperCase()
        patch.nivel_admin = Number(role.nivel)
      }
      const { data: updated, error } = await admin.from('erp_usuarios').update(patch).eq('id', target.id).eq('empresa_id', actor.empresa_id).select('id,empresa_id,nome,email,role,nivel_admin,ativo,role_id,login_nome,setor_id,cargo_id,matricula').single()
      if (error) throw error
      await writeAudit(actor, 'user.updated', target.id, target, updated, req)
      return json({ ok: true, message: 'Usuário atualizado.', user: updated })
    }

    if (action === 'delete_user') {
      const deleted = await admin.auth.admin.deleteUser(target.id, false)
      if (deleted.error) return json({ error: `O usuário não foi excluído do Auth: ${deleted.error.message}` }, 409)
      const { error: profileError } = await admin.from('erp_usuarios').delete().eq('id', target.id).eq('empresa_id', actor.empresa_id)
      if (profileError) return json({ error: `Auth excluído, mas o cadastro ERP não foi removido: ${profileError.message}` }, 409)
      await writeAudit(actor, 'user.deleted', target.id, target, null, req)
      return json({ ok: true, message: 'Usuário excluído definitivamente.' })
    }

    return json({ error: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
