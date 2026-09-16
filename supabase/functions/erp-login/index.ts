import { createClient } from '@supabase/supabase-js'

const productionOrigin = 'https://erp-sistema-industrial.vercel.app'
const previewOrigin = /^https:\/\/erp-sistema-industrial(?:-git-main-plushbeauty)?-[a-z0-9-]+\.vercel\.app$/i
const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):(5173|4173)$/i

function allowedOrigin(origin: string | null) {
  if (!origin) return productionOrigin
  if (origin === productionOrigin || previewOrigin.test(origin) || localhostOrigin.test(origin)) return origin
  return productionOrigin
}

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
}

const json = (origin: string | null, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) })

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return json(origin, { error: 'Método não permitido.' }, 405)

  try {
    const body = await req.json()
    const identificador = String(body.identificador ?? body.usuario ?? body.username ?? '').trim()
    const senha = String(body.senha ?? body.password ?? '')
    if (!identificador || !senha) return json(origin, { error: 'Informe usuário e senha.' }, 400)

    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!serviceRole || !anonKey || !supabaseUrl) return json(origin, { error: 'Ambiente de autenticação do ERP não configurado.' }, 500)

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
    const needle = identificador.toLowerCase()
    const { data: users, error: usersError } = await admin
      .from('erp_usuarios')
      .select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,deleted_at')
      .eq('ativo', true)
      .is('deleted_at', null)
      .limit(1000)

    if (usersError) return json(origin, { error: 'Falha ao localizar o usuário do ERP.' }, 500)

    const matches = (users ?? []).filter((u) =>
      String(u.login_nome ?? '').trim().toLowerCase() === needle ||
      String(u.email ?? '').trim().toLowerCase() === needle ||
      String(u.nome ?? '').trim().toLowerCase() === needle,
    )

    if (matches.length !== 1) return json(origin, { error: 'Usuário ou senha inválidos.' }, 401)

    const u = matches[0]
    if (!u.auth_user_id) return json(origin, { error: 'Este usuário ainda não foi provisionado para autenticação.' }, 403)

    const { data: authData, error: authLookupError } = await admin.auth.admin.getUserById(u.auth_user_id)
    if (authLookupError || !authData.user?.email) return json(origin, { error: 'Vínculo de autenticação inválido.' }, 403)

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: authData.user.email.trim().toLowerCase(),
      password: senha,
    })

    if (signInError || !signIn.session || !signIn.user) return json(origin, { error: 'Usuário ou senha inválidos.' }, 401)

    let setorCodigo: string | null = null
    let setorNome: string | null = null
    if (u.setor_id) {
      const { data: setor } = await admin
        .from('erp_setores')
        .select('codigo,nome')
        .eq('id', u.setor_id)
        .eq('empresa_id', u.empresa_id)
        .maybeSingle()
      setorCodigo = setor?.codigo ?? null
      setorNome = setor?.nome ?? null
    }

    return json(origin, {
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      },
      profile: {
        id: u.id,
        empresa_id: u.empresa_id,
        setor_id: u.setor_id,
        setor_codigo: setorCodigo,
        setor_nome: setorNome,
        username: u.login_nome,
        nome: u.nome,
        email: authData.user.email,
        nivel_admin: u.nivel_admin ?? 1,
        is_master: u.is_master === true || Number(u.nivel_admin) >= 9,
      },
    })
  } catch (error) {
    console.error('[erp-login]', error)
    return json(origin, { error: 'Não foi possível concluir o login.' }, 500)
  }
})
