/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:07 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-016
 * Alterações: Eliminar any do auditor administrativo com tipo Actor estrito.
 * Status do Build Local: Não executado — gate remoto em homologação.
 * =========================================================================
 */

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

function passwordIsStrong(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}
function randomPassword() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const values = new Uint32Array(14); crypto.getRandomValues(values); return Array.from(values, value => alphabet[value % alphabet.length]).join('') }
function clean(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null
}

async function actorFor(authUserId: string) {
  const { data, error } = await admin.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,ativo,role,perfil,role_id,nivel_admin,is_master,deleted_at').eq('auth_user_id', authUserId).eq('ativo', true).is('deleted_at', null).maybeSingle()
  if (error) throw error
  return data
}

type Actor = { id:string; auth_user_id:string|null; empresa_id:string|null; nome:string|null; email:string|null; ativo:boolean; role:string|null; perfil:string|null; role_id:string|null; nivel_admin:number|null; is_master:boolean|null; deleted_at:string|null };

function isMaster(actor: Actor | null | undefined) {
  return actor?.is_master === true
    && Number(actor.nivel_admin) >= 100
    && actor.empresa_id === null
    && String(actor.perfil ?? '').trim().toUpperCase() === 'MASTER'
}

async function roleFor(roleId: string | null, fallbackLevel: number, companyId: string) {
  if (roleId) {
    const { data, error } = await admin.from('erp_roles').select('id,codigo,nome,nivel,empresa_id').eq('id', roleId).eq('ativo', true).or(`empresa_id.is.null,empresa_id.eq.${companyId}`).maybeSingle()
    if (error) throw error
    if (data) return data
    return null
  }
  const { data, error } = await admin.from('erp_roles').select('id,codigo,nome,nivel,empresa_id').eq('ativo', true).or(`empresa_id.is.null,empresa_id.eq.${companyId}`).lte('nivel', fallbackLevel).order('nivel', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

async function writeAudit(actor: Actor, action: string, entityId: string | null, oldData: unknown, newData: unknown, req: Request, empresaId = actor.empresa_id) {
  const { error } = await admin.from('erp_audit_logs').insert({ empresa_id: empresaId, actor_user_id: actor.id, action, entity_type: 'erp_usuario', entity_id: entityId, old_data: oldData ?? null, new_data: newData ?? null, user_agent: req.headers.get('user-agent') })
  if (error) {
    console.error('[erp-user-admin] falha ao persistir auditoria:', error)
    return 'A operação foi realizada, mas a trilha de auditoria não foi persistida. Informe o suporte antes de repetir.'
  }
  return null
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

    const parsedBody: unknown = await req.json()
    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) return json({ error: 'Corpo de requisição inválido.' }, 400)
    const body = parsedBody as Record<string, unknown>
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'finalize_invite') {
      const email = String(authData.user.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const nome = String(body.nome || '').trim()
      if (!email || !password || nome.length < 3) return json({ error: 'Nome e senha são obrigatórios.' }, 400)
      if (!passwordIsStrong(password)) return json({ error: 'A senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)

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

    const actor = await actorFor(authData.user.id) as Actor | null
    if (!actor) return json({ error: 'Usuário interno inativo ou sem perfil ERP autorizado.' }, 403)
    const actorIsMaster = isMaster(actor)
    const actorLevel = Number(actor.nivel_admin ?? 0)
    const isAdmin = actorIsMaster || actorLevel >= 8
    if (!isAdmin && action !== 'change_my_password') return json({ error: 'Sem permissão administrativa.' }, 403)
    const requiredPermission: Record<string, [string, string]> = {
      list_users: ['usuarios', 'ver'],
      create_user: ['usuarios', 'criar'],
      invite_user: ['usuarios', 'criar'],
      update_user: ['usuarios', 'editar'],
      set_active: ['usuarios', 'editar'],
      reset_password: ['usuarios', 'editar'],
      delete_user: ['usuarios', 'excluir'],
    }
    if (action !== 'change_my_password') {
      const required = requiredPermission[action]
      if (!required) return json({ error: 'Ação não suportada.' }, 400)
      const { data: permitted, error: permissionError } = await userClient.rpc('erp_has_permission', {
        p_modulo: required[0],
        p_acao: required[1],
      })
      if (permissionError) {
        console.error('[erp-user-admin] falha ao validar permissão RBAC:', permissionError)
        return json({ error: 'Não foi possível validar as permissões da sessão. Aplique as migrations RBAC pendentes e tente novamente.' }, 503)
      }
      if (permitted !== true) return json({ error: 'Seu perfil não possui a permissão necessária para esta operação.' }, 403)
    }

    if (action === 'list_users') {
      let query = admin.from('erp_usuarios').select('id,empresa_id,nome,email,role,perfil,role_id,nivel_admin,ativo,login_nome,created_at,setor_id,cargo_id,matricula').is('deleted_at', null).not('empresa_id', 'is', null).order('nome')
      const requestedCompany = clean(body.empresa_id)
      if (actorIsMaster && requestedCompany) query = query.eq('empresa_id', requestedCompany)
      else if (!actorIsMaster && actor.empresa_id) query = query.eq('empresa_id', actor.empresa_id)
      else if (!actorIsMaster) return json({ error: 'Empresa do administrador não identificada.' }, 403)
      if (!actorIsMaster && actorLevel < 8) return json({ error: 'Sem permissão para listar usuários.' }, 403)
      const { data, error } = await query
      if (error) throw error
      return json({ ok: true, users: data || [] })
    }

    if (action === 'change_my_password') {
      const currentPassword = String(body.currentPassword || '')
      const newPassword = String(body.newPassword || '')
      if (!passwordIsStrong(newPassword)) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
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
      const requestedCompany = clean(body.empresa_id)
      const empresaId = actorIsMaster ? requestedCompany : actor.empresa_id
      const selectedRoleId = clean(body.role_id)
      const requestedLevel = Math.max(1, Math.min(9, Number(body.nivel_admin ?? 1)))
      if (!empresaId) return json({ error: 'Selecione uma empresa válida para administrar seus usuários.' }, 400)
      const { data: company, error: companyError } = await admin.from('erp_empresas').select('id').eq('id', empresaId).maybeSingle()
      if (companyError) throw companyError
      if (!company) return json({ error: 'Empresa não encontrada.' }, 404)
      const role = await roleFor(selectedRoleId, requestedLevel, empresaId)
      if (!role) return json({ error: 'Perfil de acesso inválido para a empresa selecionada.' }, 400)
      const { data: assignable, error: assignmentError } = await userClient.rpc('erp_can_assign_role', {
        p_role_id: role.id,
        p_empresa_id: empresaId,
      })
      if (assignmentError) {
        console.error('[erp-user-admin] falha ao validar o perfil selecionado:', assignmentError)
        return json({ error: 'Não foi possível validar o perfil de acesso. Aplique as migrations RBAC pendentes e tente novamente.' }, 503)
      }
      if (assignable !== true) return json({ error: 'O perfil selecionado excede o nível ou as permissões delegáveis pelo administrador.' }, 403)
      const nivelAdmin = Number(role?.nivel ?? requestedLevel)
      const roleCode = String(role?.codigo ?? 'USER').toUpperCase()
      if (!nome || !email) return json({ error: 'Nome e e-mail são obrigatórios.' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
      if (nivelAdmin >= actorLevel && !actorIsMaster) return json({ error: 'Você só pode criar usuários com nível inferior ao seu.' }, 403)
      if (roleCode === 'MASTER' || nivelAdmin >= 100) return json({ error: 'Perfis Master são exclusivos da plataforma.' }, 403)
      if (loginNome) {
        const { data: duplicate, error: duplicateError } = await admin.from('erp_usuarios').select('id').eq('empresa_id', empresaId).ilike('login_nome', loginNome).is('deleted_at', null).maybeSingle()
        if (duplicateError) throw duplicateError
        if (duplicate) return json({ error: 'Este login já está cadastrado nesta empresa.' }, 409)
      }
      const { data: existing, error: existingError } = await admin.from('erp_usuarios').select('id').eq('empresa_id', empresaId).ilike('email', email).is('deleted_at', null).maybeSingle()
      if (existingError) throw existingError
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
          user_metadata: { nome, invited_user: true, must_change_password: true, empresa_id: empresaId },
          app_metadata: { empresa_id: empresaId, role: roleCode, is_master: false },
        })
        if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar a identidade de acesso.' }, 400)
        authUserId = created.data.user.id

        const { error: profileError } = await admin.from('erp_usuarios').insert({
          id: authUserId, auth_user_id: authUserId, empresa_id: empresaId, nome, email, role: roleCode,
          nivel_admin: nivelAdmin, ativo: false, role_id: role?.id ?? null, setor_id: body.setor_id || null,
          cargo_id: body.cargo_id || null, matricula: body.matricula ? String(body.matricula).trim() : null,
          login_nome: loginNome,
        })
        if (profileError) {
          await admin.auth.admin.deleteUser(authUserId)
          return json({ error: profileError.message }, 400)
        }

        const { data: invite, error: inviteError } = await admin.from('erp_convites_acesso').insert({
          empresa_id: empresaId, email, nome, role_id: role?.id ?? null, role: roleCode,
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

        const auditWarning = await writeAudit(actor, 'user.invited_with_otp', authUserId, null, { ...invite, email, role: roleCode }, req, empresaId)
        return json({ ok: true, invited: true, audit_warning: auditWarning, message: 'Código de acesso enviado ao e-mail. O usuário deve abrir /ativar-acesso e informar o código recebido.' })
      }

      const password = String(body.password || randomPassword())
      if (!passwordIsStrong(password)) return json({ error: 'A senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: !body.password, empresa_id: empresaId } })
      if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar o usuário Auth.' }, 400)
      authUserId = created.data.user.id
      temporaryPassword = body.password ? null : password

      const inserted = await admin.from('erp_usuarios').insert({ id: authUserId, auth_user_id: authUserId, empresa_id: empresaId, nome, email, role: roleCode, nivel_admin: nivelAdmin, ativo: true, role_id: role?.id ?? null, setor_id: body.setor_id || null, cargo_id: body.cargo_id || null, matricula: body.matricula ? String(body.matricula).trim() : null, login_nome: loginNome }).select('id,empresa_id,nome,email,role,nivel_admin,ativo,role_id,setor_id,cargo_id,matricula,login_nome').single()
      if (inserted.error) {
        await admin.auth.admin.deleteUser(authUserId)
        return json({ error: inserted.error.message }, 400)
      }
      const auditWarning = await writeAudit(actor, 'user.created', inserted.data.id, null, inserted.data, req, empresaId)
      return json({ ok: true, user: inserted.data, temporary_password: temporaryPassword, invited: false, audit_warning: auditWarning })
    }

    const targetId = clean(body.user_id)
    if (!targetId) return json({ error: 'Identificador de usuário inválido.' }, 400)
    const requestedTargetCompany = clean(body.empresa_id)
    if (actorIsMaster && !requestedTargetCompany) return json({ error: 'Selecione a empresa proprietária do usuário.' }, 400)
    let targetQuery = admin.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,role,perfil,nivel_admin,ativo,role_id,deleted_at').eq('id', targetId).is('deleted_at', null)
    targetQuery = actorIsMaster
      ? targetQuery.eq('empresa_id', requestedTargetCompany)
      : targetQuery.eq('empresa_id', actor.empresa_id)
    const { data: target, error: targetError } = await targetQuery.maybeSingle()
    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado nesta empresa.' }, 404)
    if (target.auth_user_id === authData.user.id) return json({ error: 'Esta operação não pode ser executada sobre o próprio usuário.' }, 400)
    const targetLevel = Number(target.nivel_admin ?? 0)
    if (!actorIsMaster && targetLevel >= actorLevel) return json({ error: 'Você não pode alterar ou excluir um usuário de nível igual ou superior ao seu.' }, 403)

    if (action === 'set_active') {
      if (typeof body.ativo !== 'boolean') return json({ error: 'Informe um status de acesso válido.' }, 400)
      const active = body.ativo
      const { error } = await admin.from('erp_usuarios').update({ ativo: active, updated_at: new Date().toISOString() }).eq('id', target.id).eq('empresa_id', target.empresa_id)
      if (error) throw error
      const authUpdate = await admin.auth.admin.updateUserById(target.auth_user_id || target.id, { ban_duration: active ? 'none' : '876000h' })
      if (authUpdate.error) return json({ error: `Perfil atualizado, mas o acesso Auth não foi sincronizado: ${authUpdate.error.message}` }, 409)
      const auditWarning = await writeAudit(actor, active ? 'user.activated' : 'user.deactivated', target.id, target, { ...target, ativo: active }, req, target.empresa_id)
      return json({ ok: true, audit_warning: auditWarning, message: active ? 'Usuário ativado.' : 'Usuário bloqueado.' })
    }

    if (action === 'reset_password') {
      const temporaryPassword = randomPassword()
      const targetAuth = await admin.auth.admin.getUserById(target.auth_user_id || target.id)
      if (targetAuth.error || !targetAuth.data.user) return json({ error: targetAuth.error?.message || 'Identidade Auth não encontrada.' }, 404)
      const changed = await admin.auth.admin.updateUserById(target.auth_user_id || target.id, {
        password: temporaryPassword,
        user_metadata: {
          ...(targetAuth.data.user.user_metadata || {}),
          must_change_password: true,
        },
      })
      if (changed.error) return json({ error: changed.error.message }, 400)
      const auditWarning = await writeAudit(actor, 'user.password_reset', target.id, { id: target.id, email: target.email }, { id: target.id, must_change_password: true }, req, target.empresa_id)
      return json({ ok: true, message: 'Nova senha temporária gerada.', temporary_password: temporaryPassword, audit_warning: auditWarning })
    }

    if (action === 'update_user') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.nome !== undefined) patch.nome = String(body.nome).trim()
      if (body.login_nome !== undefined) patch.login_nome = String(body.login_nome).trim().toLowerCase() || null
      if (body.matricula !== undefined) patch.matricula = String(body.matricula).trim() || null
      if (body.setor_id !== undefined) patch.setor_id = body.setor_id || null
      if (body.cargo_id !== undefined) patch.cargo_id = body.cargo_id || null
      if (body.role_id !== undefined) {
        const role = await roleFor(clean(body.role_id), 1, target.empresa_id)
        if (!role) return json({ error: 'Perfil de acesso inválido.' }, 400)
        const { data: assignable, error: assignmentError } = await userClient.rpc('erp_can_assign_role', {
          p_role_id: role.id,
          p_empresa_id: target.empresa_id,
        })
        if (assignmentError) {
          console.error('[erp-user-admin] falha ao validar o perfil selecionado:', assignmentError)
          return json({ error: 'Não foi possível validar o perfil de acesso. Aplique as migrations RBAC pendentes e tente novamente.' }, 503)
        }
        if (assignable !== true) return json({ error: 'O perfil selecionado excede o nível ou as permissões delegáveis pelo administrador.' }, 403)
        if (!actorIsMaster && Number(role.nivel) >= actorLevel) return json({ error: 'O perfil escolhido deve ter nível inferior ao seu.' }, 403)
        if (String(role.codigo).toUpperCase() === 'MASTER' || Number(role.nivel) >= 100) return json({ error: 'Perfis Master são exclusivos da plataforma.' }, 403)
        patch.role_id = role.id
        patch.role = String(role.codigo).toUpperCase()
        patch.nivel_admin = Number(role.nivel)
      }
      const { data: updated, error } = await admin.from('erp_usuarios').update(patch).eq('id', target.id).eq('empresa_id', target.empresa_id).select('id,empresa_id,nome,email,role,nivel_admin,ativo,role_id,login_nome,setor_id,cargo_id,matricula').single()
      if (error) throw error
      const auditWarning = await writeAudit(actor, 'user.updated', target.id, target, updated, req, target.empresa_id)
      return json({ ok: true, message: 'Usuário atualizado.', user: updated, audit_warning: auditWarning })
    }

    if (action === 'delete_user') {
      const changed = await admin.from('erp_usuarios').update({ ativo: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', target.id).eq('empresa_id', target.empresa_id)
      if (changed.error) throw changed.error
      const authUpdate = await admin.auth.admin.updateUserById(target.auth_user_id || target.id, { ban_duration: '876000h' })
      if (authUpdate.error) return json({ ok: false, partial: true, error: `O perfil foi arquivado, mas o bloqueio Auth falhou: ${authUpdate.error.message}` }, 409)
      const auditWarning = await writeAudit(actor, 'user.archived', target.id, target, { ...target, ativo: false, archived: true }, req, target.empresa_id)
      return json({ ok: true, audit_warning: auditWarning, message: 'Acesso removido. O cadastro foi arquivado para preservar o histórico de auditoria.' })
    }

    return json({ error: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
