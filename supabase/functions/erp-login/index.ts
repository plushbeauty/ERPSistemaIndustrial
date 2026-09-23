import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRODUCTION_ORIGIN = 'https://erp-sistema-industrial.vercel.app'

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = origin === PRODUCTION_ORIGIN ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    /^https:\/\/erp-sistema-industrial-[a-z0-9-]+\.vercel\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
  }
}

function out(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) })
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

async function authUserExistsByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users ?? []
    if (users.some((user) => text(user.email).toLowerCase() === email)) return true
    if (users.length < 1000) return false
  }
  throw new Error('AUTH_USER_LOOKUP_LIMIT')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: cors(req) })
  if (req.method !== 'POST') return out(req, { error: 'METODO_NAO_PERMITIDO' }, 405)

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = text(body.action)

    const url = Deno.env.get('SUPABASE_URL')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceRole) return out(req, { error: 'AUTH_CONFIGURATION_ERROR' }, 503)

    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Esta função NÃO é mais o login do ERP.
    // Ela existe somente para o primeiro bootstrap administrativo.
    if (action === 'setup_status') {
      const [{ data: masters, error: masterError }, { data: globalMasters, error: globalError }] = await Promise.all([
        admin.from('erp_usuarios')
          .select('id')
          .or('is_master.eq.true,nivel_admin.gte.9,perfil.in.(MASTER,MASTER_ADMIN,SUPER_ADMIN)')
          .eq('ativo', true)
          .is('deleted_at', null)
          .limit(1),
        admin.from('usuarios')
          .select('id')
          .or('nivel_admin.gte.9,perfil.in.(MASTER,MASTER_ADMIN,SUPER_ADMIN)')
          .eq('ativo', true)
          .limit(1),
      ])

      if (masterError || globalError) return out(req, { error: 'MASTER_STATUS_ERROR' }, 500)

      return out(req, {
        available: !(masters?.length || globalMasters?.length),
      })
    }

    if (action !== 'bootstrap_master') {
      return out(req, {
        error: 'LEGACY_LOGIN_DISABLED',
        message: 'O login do ERP usa Supabase Auth signInWithPassword diretamente.',
      }, 410)
    }

    const nome = text(body.nome)
    const email = text(body.email).toLowerCase()
    const password = text(body.password ?? body.senha)

    if (nome.length < 3) return out(req, { error: 'NOME_INVALIDO' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return out(req, { error: 'EMAIL_INVALIDO' }, 400)
    if (password.length < 8) return out(req, { error: 'SENHA_FRACA' }, 400)

    const [{ data: existingErp }, { data: existingPlush }] = await Promise.all([
      admin.from('erp_usuarios')
        .select('id')
        .or('is_master.eq.true,nivel_admin.gte.9,perfil.in.(MASTER,MASTER_ADMIN,SUPER_ADMIN)')
        .eq('ativo', true)
        .is('deleted_at', null)
        .limit(1),
      admin.from('usuarios')
        .select('id')
        .or('nivel_admin.gte.9,perfil.in.(MASTER,MASTER_ADMIN,SUPER_ADMIN)')
        .eq('ativo', true)
        .limit(1),
    ])

    if (existingErp?.length || existingPlush?.length) {
      return out(req, { error: 'MASTER_JA_CADASTRADO', locked: true }, 409)
    }

    if (await authUserExistsByEmail(admin, email)) return out(req, { error: 'EMAIL_AUTH_JA_EXISTE' }, 409)

    let authUserId: string | null = null

    try {
      const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          product: 'erp-industrial',
          is_master: true,
          nivel_admin: 9,
        },
        user_metadata: {
          nome,
        },
      })

      if (authError || !authCreated.user) {
        throw authError ?? new Error('MASTER_AUTH_CREATE_FAILED')
      }

      authUserId = authCreated.user.id

      // Master é universal: NÃO recebe empresa nem setor.
      const { error: profileError } = await admin.from('erp_usuarios').insert({
        empresa_id: null,
        nome,
        email,
        perfil: 'MASTER',
        ativo: true,
        auth_user_id: authUserId,
        nivel_admin: 9,
        setor_id: null,
        username: null,
        role_id: null,
        is_master: true,
        deleted_at: null,
      })

      if (profileError) throw profileError

      return out(req, {
        ok: true,
        email,
        nome,
        auth_user_id: authUserId,
        universal_master: true,
      })
    } catch (error) {
      if (authUserId) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => undefined)
      }
      console.error('[erp-login/bootstrap_master]', error)
      return out(req, { error: 'MASTER_BOOTSTRAP_FAILED' }, 500)
    }
  } catch (error) {
    console.error('[erp-login]', error)
    return out(req, { error: 'AUTH_INTERNAL_ERROR' }, 500)
  }
})
