import { createClient } from '@supabase/supabase-js'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type LoginBody = {
  email?: unknown
  password?: unknown
  empresa_id?: unknown
  identificador?: unknown
  usuario?: unknown
  username?: unknown
  senha?: unknown
}

type ErpUser = {
  id: string
  nome: string | null
  login_nome: string | null
  email: string | null
  empresa_id: string
  setor_id: string | null
  ativo: boolean
  nivel_admin: number | null
  auth_user_id: string | null
  is_master: boolean | null
  deleted_at: string | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405)
  }

  try {
    const body = (await req.json()) as LoginBody
    const identifier = String(body.email ?? body.identificador ?? body.usuario ?? body.username ?? '').trim()
    const password = String(body.password ?? body.senha ?? '')
    const requestedEmpresaId = String(body.empresa_id ?? '').trim() || null

    if (!identifier || !password) {
      return json({ error: 'Informe usuário/e-mail e senha.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Ambiente de autenticação do ERP não configurado.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const needle = identifier.toLowerCase()
    const { data: candidates, error: candidateError } = await admin
      .from('erp_usuarios')
      .select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,deleted_at')
      .eq('ativo', true)
      .is('deleted_at', null)
      .limit(1000)

    if (candidateError) {
      console.error('[erp-login] profile lookup:', candidateError)
      return json({ error: 'Falha ao localizar o perfil de autenticação.' }, 500)
    }

    const matches = ((candidates ?? []) as ErpUser[]).filter((user) =>
      String(user.email ?? '').trim().toLowerCase() === needle ||
      String(user.login_nome ?? '').trim().toLowerCase() === needle ||
      String(user.nome ?? '').trim().toLowerCase() === needle,
    )

    if (matches.length !== 1 || !matches[0].auth_user_id || !matches[0].email) {
      return json({ error: 'Usuário ou senha inválidos.' }, 401)
    }

    const profileCandidate = matches[0]

    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(profileCandidate.auth_user_id)
    if (authUserError || !authUserData.user?.email) {
      console.error('[erp-login] auth identity lookup:', authUserError)
      return json({ error: 'Usuário ou senha inválidos.' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: authUserData.user.email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      return json({ error: signInError.message }, 401)
    }

    if (!signIn.session || !signIn.user) {
      return json({ error: 'A autenticação não retornou uma sessão válida.' }, 401)
    }

    const { data: profile, error: profileError } = await admin
      .from('erp_usuarios')
      .select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,deleted_at')
      .eq('auth_user_id', signIn.user.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError || !profile || profile.auth_user_id !== signIn.user.id) {
      return json({ error: 'Perfil ERP não autorizado para esta sessão.' }, 401)
    }

    if (requestedEmpresaId && profile.empresa_id !== requestedEmpresaId) {
      return json({ error: 'Usuário não pertence à empresa informada.' }, 401)
    }

    let setorCodigo: string | null = null
    let setorNome: string | null = null

    if (profile.setor_id) {
      const { data: setor } = await admin
        .from('erp_setores')
        .select('codigo,nome')
        .eq('id', profile.setor_id)
        .eq('empresa_id', profile.empresa_id)
        .maybeSingle()

      setorCodigo = setor?.codigo ?? null
      setorNome = setor?.nome ?? null
    }

    return json({
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      },
      empresa_id: profile.empresa_id,
      profile: {
        id: profile.id,
        empresa_id: profile.empresa_id,
        setor_id: profile.setor_id,
        setor_codigo: setorCodigo,
        setor_nome: setorNome,
        username: profile.login_nome,
        nome: profile.nome,
        email: authUserData.user.email,
        nivel_admin: profile.nivel_admin ?? 1,
        is_master: profile.is_master === true || Number(profile.nivel_admin) >= 9,
      },
    })
  } catch (error) {
    console.error('[erp-login]', error)
    return json({ error: error instanceof Error ? error.message : 'Não foi possível concluir o login.' }, 500)
  }
})
