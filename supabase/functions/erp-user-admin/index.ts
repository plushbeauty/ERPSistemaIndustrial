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

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let value = ''
  for (let i = 0; i < 14; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)]
  return value
}

async function actorFor(authUserId: string) {
  const { data, error } = await admin
    .from('erp_usuarios')
    .select('id,empresa_id,nome,email,nivel_admin,ativo')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) throw error
  return data
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

    const actor = await actorFor(authData.user.id)
    if (!actor?.ativo) return json({ error: 'Usuário interno inativo.' }, 403)

    const body = await req.json()
    const action = String(body.action || '')
    const isAdmin = Number(actor.nivel_admin) >= 8
    if (!isAdmin && action !== 'change_my_password') return json({ error: 'Sem permissão administrativa.' }, 403)

    if (action === 'list_users') {
      const { data, error } = await admin
        .from('erp_usuarios')
        .select('id,empresa_id,auth_user_id,nome,email,nivel_admin,ativo,created_at,setor_id,cargo_id,matricula,login_nome')
        .eq('empresa_id', actor.empresa_id)
        .order('nome')
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

    if (action === 'create_user') {
      const nome = String(body.nome || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const loginNome = String(body.login_nome || '').trim().toLowerCase() || null
      const nivelAdmin = Math.max(1, Math.min(9, Number(body.nivel_admin ?? 1)))
      const password = String(body.password || randomPassword())
      if (!nome || !email) return json({ error: 'Nome e e-mail são obrigatórios.' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
      if (!passwordIsStrong(password)) return json({ error: 'A senha deve ter pelo menos 8 caracteres e conter letras e números.' }, 400)
      if (nivelAdmin >= Number(actor.nivel_admin)) return json({ error: 'Você só pode criar usuários com nível inferior ao seu.' }, 403)
      if (loginNome) {
        const { data: duplicate } = await admin.from('erp_usuarios').select('id').eq('empresa_id', actor.empresa_id).ilike('login_nome', loginNome).maybeSingle()
        if (duplicate) return json({ error: 'Este login já está cadastrado nesta empresa.' }, 409)
      }
      const { data: existing } = await admin.from('erp_usuarios').select('id').eq('empresa_id', actor.empresa_id).ilike('email', email).maybeSingle()
      if (existing) return json({ error: 'Este e-mail já está cadastrado nesta empresa.' }, 409)

      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_change_password: !body.password, empresa_id: actor.empresa_id },
      })
      if (created.error || !created.data.user) return json({ error: created.error?.message || 'Não foi possível criar o usuário Auth.' }, 400)

      const inserted = await admin.from('erp_usuarios').insert({
        auth_user_id: created.data.user.id,
        empresa_id: actor.empresa_id,
        nome,
        email,
        nivel_admin: nivelAdmin,
        ativo: true,
        setor_id: body.setor_id || null,
        cargo_id: body.cargo_id || null,
        matricula: body.matricula ? String(body.matricula).trim() : null,
        login_nome: loginNome,
      }).select('id,empresa_id,auth_user_id,nome,email,nivel_admin,ativo,setor_id,cargo_id,matricula,login_nome').single()

      if (inserted.error) {
        await admin.auth.admin.deleteUser(created.data.user.id)
        return json({ error: inserted.error.message }, 400)
      }
      return json({ ok: true, user: inserted.data, temporary_password: body.password ? null : password })
    }

    const targetId = String(body.user_id || '')
    if (!targetId) return json({ error: 'Usuário alvo não informado.' }, 400)
    const { data: target, error: targetError } = await admin
      .from('erp_usuarios')
      .select('id,empresa_id,auth_user_id,nome,email,nivel_admin,ativo')
      .eq('id', targetId)
      .eq('empresa_id', actor.empresa_id)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado nesta empresa.' }, 404)
    if (target.auth_user_id === authData.user.id) return json({ error: 'Esta operação não pode ser executada sobre o próprio usuário.' }, 400)
    if (Number(target.nivel_admin) >= Number(actor.nivel_admin)) return json({ error: 'Você não pode alterar ou excluir um usuário de nível igual ou superior ao seu.' }, 403)

    if (action === 'set_active') {
      const active = Boolean(body.ativo)
      const { error } = await admin.from('erp_usuarios').update({ ativo: active }).eq('id', target.id).eq('empresa_id', actor.empresa_id)
      if (error) throw error
      if (target.auth_user_id) {
        const authUpdate = await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: active ? 'none' : '876000h' })
        if (authUpdate.error) return json({ error: `Perfil atualizado, mas o acesso Auth não foi sincronizado: ${authUpdate.error.message}` }, 409)
      }
      return json({ ok: true, message: active ? 'Usuário ativado.' : 'Usuário bloqueado.' })
    }

    if (action === 'update_user') {
      const patch: Record<string, unknown> = {}
      if (body.nome !== undefined) patch.nome = String(body.nome).trim()
      if (body.login_nome !== undefined) patch.login_nome = String(body.login_nome).trim().toLowerCase() || null
      if (body.matricula !== undefined) patch.matricula = String(body.matricula).trim() || null
      if (body.setor_id !== undefined) patch.setor_id = body.setor_id || null
      if (body.cargo_id !== undefined) patch.cargo_id = body.cargo_id || null
      if (body.nivel_admin !== undefined) {
        const level = Math.max(1, Math.min(9, Number(body.nivel_admin)))
        if (level >= Number(actor.nivel_admin)) return json({ error: 'O nível do usuário deve ser inferior ao seu.' }, 403)
        patch.nivel_admin = level
      }
      const { error } = await admin.from('erp_usuarios').update(patch).eq('id', target.id).eq('empresa_id', actor.empresa_id)
      if (error) throw error
      return json({ ok: true, message: 'Usuário atualizado.' })
    }

    if (action === 'delete_user') {
      if (!target.auth_user_id) {
        const { error } = await admin.from('erp_usuarios').delete().eq('id', target.id).eq('empresa_id', actor.empresa_id)
        if (error) throw error
        return json({ ok: true, message: 'Cadastro de usuário excluído.' })
      }
      const deleted = await admin.auth.admin.deleteUser(target.auth_user_id, false)
      if (deleted.error) return json({ error: `O usuário não foi excluído do Auth: ${deleted.error.message}` }, 409)
      const { error: profileError } = await admin.from('erp_usuarios').delete().eq('id', target.id).eq('empresa_id', actor.empresa_id)
      if (profileError) return json({ error: `Auth excluído, mas o cadastro ERP não foi removido: ${profileError.message}` }, 409)
      return json({ ok: true, message: 'Usuário excluído definitivamente.' })
    }

    return json({ error: 'Ação não suportada.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})
