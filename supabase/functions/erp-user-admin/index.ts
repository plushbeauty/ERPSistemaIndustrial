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

function passwordIsStrong(value: string) { return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) }
function randomPassword() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const values = new Uint32Array(14); crypto.getRandomValues(values); return Array.from(values, value => alphabet[value % alphabet.length]).join('') }
function isMaster(role: unknown) { const value = String(role ?? '').toUpperCase(); return value === 'MASTER' || value === 'MASTER_ADMIN' || value === 'SUPER_ADMIN' }

async function actorFor(authUserId: string) {
  const { data, error } = await admin.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,ativo,role,perfil,role_id,nivel_admin,is_master').eq('auth_user_id', authUserId).maybeSingle()
  if (error) throw error
  return data
}

async function roleFor(roleId: string | null, fallbackLevel: number, companyId: string | null) {
  if (roleId) {
    let query = admin.from('erp_roles').select('id,codigo,nome,nivel,company_id').eq('id', roleId).eq('ativo', true)
    if (companyId) query = query.or(`company_id.is.null,company_id.eq.${companyId}`)
    else query = query.is('company_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (data) return data
  }
  let query = admin.from('erp_roles').select('id,codigo,nome,nivel,company_id').eq('ativo', true).lte('nivel', fallbackLevel)
  if (companyId) query = query.or(`company_id.is.null,company_id.eq.${companyId}`)
  else query = query.is('company_id', null)
  const { data, error } = await query.order('nivel', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

type Actor = { id:string; auth_user_id:string; empresa_id:string|null; nome:string|null; email:string|null; ativo:boolean; role:string|null; perfil:string|null; role_id:string|null; nivel_admin:number|null; is_master:boolean|null };

function trustedClientIp(req: Request): string | null {
  const value = req.headers.get('cf-connecting-ip')?.trim()
  if (!value) return null
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const octets = value.split('.').map(Number)
    return octets.every(octet => octet >= 0 && octet <= 255) ? octets.join('.') : null
  }
  if (!value.includes(':')) return null
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1)
  } catch {
    return null
  }
}

async function writeAudit(actor: Actor, action: string, entityId: string | null, oldData: unknown, newData: unknown, req: Request, companyId: string | null = actor?.empresa_id ?? null, entityType = 'erp_usuario') {
  const { error } = await admin.from('erp_audit_logs').insert({ empresa_id: companyId, actor_user_id: actor?.id ?? null, action, entity_type: entityType, entity_id: entityId, old_data: oldData ?? null, new_data: newData ?? null, user_agent: req.headers.get('user-agent'), ip_address: trustedClientIp(req) })
  if (error) throw error
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
        .update({ nome, email, ativo: true, must_change_password: false, updated_at: new Date().toISOString() })
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
    if (!actor?.ativo) return json({ error: 'Usuário interno inativo.' }, 403)
    const actorIsMaster = isMaster(actor.perfil) && actor.is_master === true && Number(actor.nivel_admin ?? 0) >= 100 && actor.empresa_id === null
    const actorLevel = Number(actor.nivel_admin ?? 0)
    const actorCan = async (module: string, permission: string) => {
      const { data, error } = await userClient.rpc('erp_has_permission', { p_modulo: module, p_acao: permission })
      if (error) throw error
      return data === true
    }
    // Every access decision runs with the caller JWT, including MASTER, so a revoked session or forced password change is honored.
    const isAdmin = await actorCan('usuarios', 'ver')
    if (!isAdmin && action !== 'change_my_password') return json({ error: 'Sem permissão administrativa.' }, 403)

    if (action === 'list_users') {
      let query = admin.from('erp_usuarios').select('id,empresa_id,nome,email,role,role_id,nivel_admin,ativo,login_nome,created_at,setor_id,cargo_id,matricula,deleted_at')
      if (!actorIsMaster) query = query.eq('empresa_id', actor.empresa_id)
      const { data, error } = await query.order('nome')
      if (error) throw error
      return json({ ok: true, users: data || [] })
    }

    if (action === 'list_roles') {
      let query = admin.from('erp_roles').select('id,company_id,codigo,nome,nivel,ativo').eq('ativo', true)
      if (!actorIsMaster) query = query.or(`company_id.is.null,company_id.eq.${actor.empresa_id}`)
      const { data, error } = await query.order('nivel', { ascending: false })
      if (error) throw error
      return json({ ok: true, roles: data || [] })
    }

    if (action === 'list_admin_data') {
      if (!await actorCan('usuarios', 'ver')) return json({ error: 'Sem permissão para consultar usuários e perfis.' }, 403)
      const requestedCompany = actorIsMaster && body.empresa_id ? String(body.empresa_id) : null
      if (requestedCompany) {
        const company = await admin.from('erp_empresas').select('id').eq('id', requestedCompany).eq('ativo', true).maybeSingle()
        if (company.error) throw company.error
        if (!company.data) return json({ error: 'Empresa inexistente ou inativa.' }, 404)
      }
      const companyId = actorIsMaster ? requestedCompany : actor.empresa_id
      let usersQuery = admin.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,role,perfil,is_master,role_id,nivel_admin,ativo,login_nome,created_at,matricula,setor_id,cargo_id,deleted_at,must_change_password').order('nome').limit(1000)
      let rolesQuery = admin.from('erp_roles').select('id,company_id,codigo,nome,nivel,ativo').eq('ativo', true).order('nivel', { ascending: false })
      let companiesQuery = admin.from('erp_empresas').select('id,razao_social,nome_fantasia,codigo,ativo').eq('ativo', true).order('nome_fantasia')
      if (companyId) {
        usersQuery = usersQuery.eq('empresa_id', companyId)
        rolesQuery = rolesQuery.or(`company_id.is.null,company_id.eq.${companyId}`)
      } else if (!actorIsMaster) {
        usersQuery = usersQuery.eq('empresa_id', actor.empresa_id)
        rolesQuery = rolesQuery.is('company_id', null)
      }
      if (!actorIsMaster) companiesQuery = companiesQuery.eq('id', actor.empresa_id)
      const [usersResult, rolesResult, permissionsResult, companiesResult] = await Promise.all([
        usersQuery,
        rolesQuery,
        admin.from('erp_permissions').select('id,codigo,nome,modulo,ativo').eq('ativo', true).order('modulo').order('codigo'),
        companiesQuery,
      ])
      for (const result of [usersResult, rolesResult, permissionsResult, companiesResult]) if (result.error) throw result.error
      const roleIds = (rolesResult.data || []).map(role => role.id)
      const userIds = (usersResult.data || []).map(user => user.id)
      const [grantsResult, overridesResult] = await Promise.all([
        roleIds.length ? admin.from('erp_role_permissions').select('role_id,permission_id').in('role_id', roleIds) : Promise.resolve({ data: [], error: null }),
        userIds.length ? admin.from('erp_user_permission_overrides').select('id,empresa_id,user_id,permission_id,effect,changed_by,updated_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
      ])
      if (grantsResult.error) throw grantsResult.error
      if (overridesResult.error) throw overridesResult.error
      const cargoIds = [...new Set((usersResult.data || []).map(user => user.cargo_id).filter(Boolean))]
      const departmentResult = cargoIds.length ? await admin.from('erp_cargo_permissoes').select('cargo_id,permissao_id,permitido').in('cargo_id', cargoIds).eq('permitido', true) : { data: [], error: null }
      if (departmentResult.error) throw departmentResult.error
      const legacyPermissionIds = [...new Set((departmentResult.data || []).map(row => row.permissao_id))]
      const legacyResult = legacyPermissionIds.length ? await admin.from('erp_permissoes').select('id,modulo,acao').in('id', legacyPermissionIds) : { data: [], error: null }
      if (legacyResult.error) throw legacyResult.error
      const catalogIds = new Map((permissionsResult.data || []).map(permission => [permission.codigo, permission.id]))
      const legacyCode = new Map((legacyResult.data || []).map(permission => [permission.id, `${permission.modulo}.${permission.acao}`]))
      const departmentGrants = (departmentResult.data || []).flatMap(row => {
        const code = legacyCode.get(row.permissao_id)
        const permissionId = code ? catalogIds.get(code) : null
        return permissionId ? [{ cargo_id: row.cargo_id, permission_id: permissionId }] : []
      })
      const [canViewAudit, canCreateUsers, canEditUsers, canArchiveUsers] = await Promise.all([
        actorCan('auditoria', 'ver'), actorCan('usuarios', 'criar'), actorCan('usuarios', 'editar'), actorCan('usuarios', 'excluir'),
      ])
      return json({ ok: true, actor, users: usersResult.data || [], roles: rolesResult.data || [], permissions: permissionsResult.data || [], grants: grantsResult.data || [], overrides: overridesResult.data || [], departmentGrants, companies: companiesResult.data || [], capabilities: { canCreateUsers, canEditUsers, canArchiveUsers, canViewAudit } })
    }

    if (action === 'list_audit') {
      if (!await actorCan('auditoria', 'ver')) return json({ error: 'Sem permissão para consultar auditoria.' }, 403)
      const requestedCompany = actorIsMaster && body.empresa_id ? String(body.empresa_id) : null
      let query = admin.from('erp_audit_logs').select('id,empresa_id,actor_user_id,action,entity_type,entity_id,old_data,new_data,user_agent,ip_address,created_at').order('created_at', { ascending: false }).limit(300)
      if (!actorIsMaster) query = query.eq('empresa_id', actor.empresa_id)
      else if (requestedCompany) query = query.eq('empresa_id', requestedCompany)
      const { data, error } = await query
      if (error) throw error
      return json({ ok: true, audit: data || [] })
    }

    if (action === 'create_role') {
      if (!await actorCan('usuarios', 'criar')) return json({ error: 'Sem permissão para criar perfis.' }, 403)
      const nome = String(body.nome || '').trim()
      const codigo = String(body.codigo || '').trim().toUpperCase()
      if (!nome || !/^[A-Z][A-Z0-9_]{1,39}$/.test(codigo)) return json({ error: 'Informe nome e código válido para o perfil.' }, 400)
      const companyId = actorIsMaster && body.empresa_id ? String(body.empresa_id) : actor.empresa_id
      if (!companyId) return json({ error: 'Selecione uma empresa para criar um perfil personalizado.' }, 400)
      const company = await admin.from('erp_empresas').select('id').eq('id', companyId).eq('ativo', true).maybeSingle()
      if (company.error) throw company.error
      if (!company.data) return json({ error: 'Empresa inexistente ou inativa.' }, 404)
      const requestedLevel = Math.max(1, Number(body.nivel ?? 1))
      const level = actorIsMaster ? Math.min(requestedLevel, 9) : Math.min(actorLevel - 1, requestedLevel)
      const duplicateCode = await admin.from('erp_roles').select('id').eq('codigo', codigo).maybeSingle()
      if (duplicateCode.error) throw duplicateCode.error
      if (duplicateCode.data) return json({ error: 'Este código de perfil já existe. Informe outro código único.' }, 409)
      const result = await admin.from('erp_roles').insert({ company_id: companyId, codigo, nome, nivel: level, ativo: true }).select('id,company_id,codigo,nome,nivel,ativo').single()
      if (result.error) throw result.error
      await writeAudit(actor, 'role.created', result.data.id, null, result.data, req, companyId, 'erp_role')
      return json({ ok: true, role: result.data })
    }

    if (action === 'set_role_permissions') {
      if (!await actorCan('usuarios', 'editar')) return json({ error: 'Sem permissão para alterar perfis.' }, 403)
      const roleId = String(body.role_id || '')
      const { data: role, error: roleError } = await admin.from('erp_roles').select('id,company_id,codigo,nivel').eq('id', roleId).maybeSingle()
      if (roleError) throw roleError
      if (!role || (!actorIsMaster && role.company_id !== actor.empresa_id) || (!actorIsMaster && Number(role.nivel) >= actorLevel)) return json({ error: 'Perfil fora do escopo administrativo.' }, 403)
      const permissionIds = Array.isArray(body.permission_ids) ? body.permission_ids.map(String) : []
      const { error } = await admin.rpc('erp_admin_set_role_permissions', {
        p_actor_id: actor.id,
        p_role_id: roleId,
        p_permission_ids: permissionIds,
        p_user_agent: req.headers.get('user-agent'),
      })
      if (error) throw error
      return json({ ok: true })
    }

    if (action === 'set_user_permission_overrides') {
      if (!await actorCan('usuarios', 'editar')) return json({ error: 'Sem permissão para alterar exceções.' }, 403)
      const userId = String(body.user_id || '')
      const override = body.override as { permission_id?: string; effect?: string } | null
      const { data: target, error } = await admin.from('erp_usuarios').select('id,empresa_id,nivel_admin,role_id').eq('id', userId).is('deleted_at', null).maybeSingle()
      if (error) throw error
      if (!target || (!actorIsMaster && (target.empresa_id !== actor.empresa_id || Number(target.nivel_admin ?? 0) >= actorLevel))) return json({ error: 'Usuário fora do escopo administrativo.' }, 403)
      if (!override?.permission_id) return json({ error: 'Informe a permissão e a exceção a alterar.' }, 400)
      const effect = override.effect === 'allow' || override.effect === 'deny' ? override.effect : 'inherit'
      const { error: overrideError } = await admin.rpc('erp_admin_set_user_permission_override', {
        p_actor_id: actor.id,
        p_user_id: userId,
        p_permission_id: String(override.permission_id),
        p_effect: effect,
        p_user_agent: req.headers.get('user-agent'),
      })
      if (overrideError) throw overrideError
      return json({ ok: true })
    }

    if (action === 'change_my_password') {
      const currentPassword = String(body.currentPassword || '')
      const newPassword = String(body.newPassword || '')
      if (!passwordIsStrong(newPassword)) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
      if (!authData.user.email) return json({ error: 'O usuário autenticado não possui e-mail.' }, 400)
      const verify = createClient(supabaseUrl, anon)
      const check = await verify.auth.signInWithPassword({ email: authData.user.email, password: currentPassword })
      if (check.error) return json({ error: 'Senha atual inválida.' }, 400)
      const revoked = await admin.rpc('erp_admin_revoke_user_sessions', { p_user_id: actor.id, p_actor_id: actor.id })
      if (revoked.error) throw revoked.error
      const changed = await admin.auth.admin.updateUserById(authData.user.id, { password: newPassword, user_metadata: { ...authData.user.user_metadata, must_change_password: false } })
      if (changed.error) return json({ error: changed.error.message }, 400)
      const { error: profileError } = await admin.from('erp_usuarios').update({ must_change_password: false, password_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('auth_user_id', authData.user.id)
      if (profileError) throw profileError
      return json({ ok: true, message: 'Senha alterada com sucesso.' })
    }

    if (action === 'invite_user') return json({ error: 'Este ambiente não usa e-mail para convite. Cadastre o usuário pelo formulário Novo usuário e entregue a senha provisória.' }, 409)

    if (action === 'create_user') {
      if (!await actorCan('usuarios', 'criar')) return json({ error: 'Sem permissão para criar usuários.' }, 403)
      const nome = String(body.nome || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const loginNome = String(body.login_nome || '').trim().toLowerCase() || null
      const selectedRoleId = body.role_id ? String(body.role_id) : null
      const companyId = actorIsMaster && body.empresa_id ? String(body.empresa_id) : actor.empresa_id
      const requestedLevel = Math.max(1, Math.min(9, Number(body.nivel_admin ?? 1)))
      const role = await roleFor(selectedRoleId, requestedLevel, companyId)
      const nivelAdmin = Number(role?.nivel ?? requestedLevel)
      const roleCode = String(role?.codigo ?? 'USER').toUpperCase()
      if (!nome || !email || !companyId) return json({ error: 'Nome, identificador interno de login e empresa são obrigatórios.' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'O identificador interno de login deve seguir o formato usuario@login.local.' }, 400)
      const company = await admin.from('erp_empresas').select('id').eq('id', companyId).eq('ativo', true).maybeSingle()
      if (company.error) throw company.error
      if (!company.data) return json({ error: 'Empresa inexistente ou inativa.' }, 404)
      if (nivelAdmin >= actorLevel && !actorIsMaster) return json({ error: 'Você só pode criar usuários com nível inferior ao seu.' }, 403)
      if (isMaster(roleCode)) return json({ error: 'O perfil MASTER não pode ser atribuído a usuários de empresa.' }, 403)
      if (loginNome) {
        const { data: duplicate } = await admin.from('erp_usuarios').select('id').eq('empresa_id', companyId).ilike('login_nome', loginNome).is('deleted_at', null).maybeSingle()
        if (duplicate) return json({ error: 'Este login já está cadastrado nesta empresa.' }, 409)
      }
      const { data: existing } = await admin.from('erp_usuarios').select('id').eq('empresa_id', companyId).ilike('email', email).is('deleted_at', null).maybeSingle()
      if (existing) return json({ error: 'Este e-mail já está cadastrado nesta empresa.' }, 409)

      let authUserId = ''
      let temporaryPassword: string | null = null
      const password = String(body.password || randomPassword())
      if (!passwordIsStrong(password)) return json({ error: 'A senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: !body.password, empresa_id: companyId } })
      if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar o usuário Auth.' }, 400)
      authUserId = created.data.user.id
      temporaryPassword = body.password ? null : password

      const inserted = await admin.from('erp_usuarios').insert({ id: authUserId, auth_user_id: authUserId, empresa_id: companyId, nome, email, role: roleCode, perfil: roleCode, nivel_admin: nivelAdmin, ativo: true, must_change_password: !body.password, role_id: role?.id ?? null, setor_id: body.setor_id || null, cargo_id: body.cargo_id || null, matricula: body.matricula ? String(body.matricula).trim() : null, login_nome: loginNome }).select('id,empresa_id,nome,email,role,perfil,nivel_admin,ativo,role_id,setor_id,cargo_id,matricula,login_nome').single()
      if (inserted.error) {
        await admin.auth.admin.deleteUser(authUserId)
        return json({ error: inserted.error.message }, 400)
      }
      await writeAudit(actor, 'user.created', inserted.data.id, null, inserted.data, req, companyId)
      return json({ ok: true, user: inserted.data, temporary_password: temporaryPassword, invited: false })
    }

    const targetId = String(body.user_id || '')
    if (!targetId) return json({ error: 'Usuário alvo não informado.' }, 400)
    let targetQuery = admin.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,role,perfil,nivel_admin,ativo,role_id,deleted_at').eq('id', targetId)
    if (!actorIsMaster) targetQuery = targetQuery.eq('empresa_id', actor.empresa_id)
    if (action === 'restore_user') targetQuery = targetQuery.not('deleted_at', 'is', null)
    else targetQuery = targetQuery.is('deleted_at', null)
    const { data: target, error: targetError } = await targetQuery.maybeSingle()
    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado nesta empresa.' }, 404)
    if (target.id === actor.id && action !== 'restore_user') return json({ error: 'Esta operação não pode ser executada sobre o próprio usuário.' }, 400)
    const targetLevel = Number(target.nivel_admin ?? 0)
    if (!actorIsMaster && targetLevel >= actorLevel) return json({ error: 'Você não pode alterar ou excluir um usuário de nível igual ou superior ao seu.' }, 403)

    if (action === 'set_active') {
      if (!await actorCan('usuarios', 'excluir')) return json({ error: 'Sem permissão para bloquear ou ativar usuários.' }, 403)
      const active = Boolean(body.ativo)
      if (active === target.ativo) return json({ ok: true, message: active ? 'Usuário já está ativo.' : 'Usuário já está bloqueado.' })
      if (!active) {
        const revoked = await admin.rpc('erp_admin_revoke_user_sessions', { p_user_id: target.id, p_actor_id: actor.id })
        if (revoked.error) throw revoked.error
      }
      const authUpdate = await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: active ? 'none' : '876000h' })
      if (authUpdate.error) return json({ error: `O acesso Auth não foi sincronizado: ${authUpdate.error.message}` }, 409)
      const stateUpdate = await admin.rpc('erp_admin_update_user_state', { p_actor_id: actor.id, p_user_id: target.id, p_operation: active ? 'activate' : 'deactivate', p_user_agent: req.headers.get('user-agent') })
      if (stateUpdate.error) {
        await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: active ? '876000h' : 'none' })
        return json({ error: stateUpdate.error.message }, /administrador ativo/i.test(stateUpdate.error.message) ? 409 : 403)
      }
      return json({ ok: true, message: active ? 'Usuário ativado.' : 'Usuário bloqueado.' })
    }

    if (action === 'reset_password') {
      if (!await actorCan('usuarios', 'editar')) return json({ error: 'Sem permissão para redefinir senhas.' }, 403)
      const temporaryPassword = randomPassword()
      const targetAuth = await admin.auth.admin.getUserById(target.auth_user_id)
      if (targetAuth.error || !targetAuth.data.user) return json({ error: targetAuth.error?.message || 'Identidade de acesso não encontrada.' }, 404)
      const revoked = await admin.rpc('erp_admin_revoke_user_sessions', { p_user_id: target.id, p_actor_id: actor.id })
      if (revoked.error) throw revoked.error
      const changed = await admin.auth.admin.updateUserById(target.auth_user_id, {
        password: temporaryPassword,
        user_metadata: { ...(targetAuth.data.user.user_metadata || {}), must_change_password: true },
      })
      if (changed.error) return json({ error: changed.error.message }, 400)
      const resetAt = new Date().toISOString()
      const { error: profileError } = await admin.from('erp_usuarios').update({ must_change_password: true, password_changed_at: resetAt, updated_at: resetAt }).eq('id', target.id).eq('empresa_id', target.empresa_id)
      if (profileError) throw profileError
      await writeAudit(actor, 'user.password_reset_by_company_admin', target.id, { id: target.id }, { id: target.id, must_change_password: true }, req, target.empresa_id)
      return json({ ok: true, message: 'Senha provisória gerada. Entregue ao funcionário e solicite a troca no próximo acesso.', temporary_password: temporaryPassword })
    }

    if (action === 'update_user') {
      if (!await actorCan('usuarios', 'editar')) return json({ error: 'Sem permissão para editar usuários.' }, 403)
      const nome = String(body.nome || '').trim()
      const roleId = String(body.role_id || '')
      if (!nome || !roleId) return json({ error: 'Nome e perfil de acesso são obrigatórios.' }, 400)
      const role = await roleFor(roleId, 1, target.empresa_id)
      if (!role) return json({ error: 'Perfil de acesso inválido.' }, 400)
      const { error } = await admin.rpc('erp_admin_update_user', {
        p_actor_id: actor.id,
        p_user_id: target.id,
        p_nome: nome,
        p_login_nome: String(body.login_nome || ''),
        p_matricula: String(body.matricula || ''),
        p_role_id: role.id,
        p_user_agent: req.headers.get('user-agent'),
      })
      if (error) return json({ error: error.message }, /administrador ativo/i.test(error.message) ? 409 : 403)
      return json({ ok: true, message: 'Usuário atualizado.' })
    }

    if (action === 'archive_user') {
      if (!await actorCan('usuarios', 'excluir')) return json({ error: 'Sem permissão para arquivar usuários.' }, 403)
      if (target.ativo) {
        const revoked = await admin.rpc('erp_admin_revoke_user_sessions', { p_user_id: target.id, p_actor_id: actor.id })
        if (revoked.error) throw revoked.error
      }
      const authUpdate = await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: '876000h' })
      if (authUpdate.error) return json({ error: `O bloqueio Auth falhou: ${authUpdate.error.message}` }, 409)
      const stateUpdate = await admin.rpc('erp_admin_update_user_state', { p_actor_id: actor.id, p_user_id: target.id, p_operation: 'archive', p_user_agent: req.headers.get('user-agent') })
      if (stateUpdate.error) {
        await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: 'none' })
        return json({ error: stateUpdate.error.message }, /administrador ativo/i.test(stateUpdate.error.message) ? 409 : 403)
      }
      return json({ ok: true, message: 'Usuário arquivado e acesso bloqueado.' })
    }

    if (action === 'restore_user') {
      if (!await actorCan('usuarios', 'excluir')) return json({ error: 'Sem permissão para restaurar usuários.' }, 403)
      const archived = target
      if (!actorIsMaster && Number(archived.nivel_admin ?? 0) >= actorLevel) return json({ error: 'Usuário arquivado fora do seu escopo.' }, 404)
      const authUpdate = await admin.auth.admin.updateUserById(archived.auth_user_id, { ban_duration: 'none' })
      if (authUpdate.error) return json({ error: `A liberação Auth falhou: ${authUpdate.error.message}` }, 409)
      const stateUpdate = await admin.rpc('erp_admin_update_user_state', { p_actor_id: actor.id, p_user_id: archived.id, p_operation: 'restore', p_user_agent: req.headers.get('user-agent') })
      if (stateUpdate.error) {
        await admin.auth.admin.updateUserById(archived.auth_user_id, { ban_duration: '876000h' })
        return json({ error: stateUpdate.error.message }, 403)
      }
      return json({ ok: true, message: 'Usuário restaurado.' })
    }

    return json({ error: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
