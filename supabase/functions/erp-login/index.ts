import { createClient } from '@supabase/supabase-js'

const PRODUCTION_ORIGIN = 'https://erp-sistema-industrial.vercel.app'

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false
  if (origin === PRODUCTION_ORIGIN) return true
  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    return hostname.startsWith('erp-sistema-industrial-') && hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers',
  }
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

type Company = {
  id: string
  ativo: boolean
  plano_status: string | null
  trial_ends_at: string | null
}

const json = (req: Request, body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'MÉTODO_NAO_PERMITIDO' }, 405)
  }

  try {
    const body = (await req.json()) as LoginBody
    const identifier = String(body.email ?? body.identificador ?? body.usuario ?? body.username ?? '').trim()
    const password = String(body.password ?? body.senha ?? '')
    const requestedEmpresaId = String(body.empresa_id ?? '').trim() || null

    if (!identifier || !password) {
      return json(req, { error: 'Informe usuário/e-mail e senha.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('[erp-login] Variáveis internas de autenticação ausentes.')
      return json(req, { error: 'AUTH_CONFIGURATION_ERROR' }, 500)
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
      return json(req, { error: 'AUTH_PROFILE_LOOKUP_ERROR' }, 500)
    }

    const matches = ((candidates ?? []) as ErpUser[]).filter((user) =>
      String(user.email ?? '').trim().toLowerCase() === needle ||
      String(user.login_nome ?? '').trim().toLowerCase() === needle ||
      String(user.nome ?? '').trim().toLowerCase() === needle,
    )

    if (matches.length !== 1 || !matches[0].auth_user_id || !matches[0].email) {
      return json(req, { error: 'USUARIO_OU_SENHA_INVALIDOS' }, 401)
    }

    const profileCandidate = matches[0]

    const { data: company, error: companyError } = await admin
      .from('erp_empresas')
      .select('id,ativo,plano_status,trial_ends_at')
      .eq('id', profileCandidate.empresa_id)
      .maybeSingle()

    if (companyError) {
      console.error('[erp-login] company lookup:', companyError)
      return json(req, { error: 'AUTH_COMPANY_LOOKUP_ERROR' }, 500)
    }

    if (!company || company.ativo === false) {
      return json(req, { error: 'EMPRESA_INATIVA_OU_INEXISTENTE' }, 401)
    }

    const companyRecord = company as Company
    const planStatus = String(companyRecord.plano_status ?? '').trim().toLowerCase()
    const trialEnds = companyRecord.trial_ends_at ? new Date(companyRecord.trial_ends_at).getTime() : null
    const trialExpired = trialEnds !== null && Number.isFinite(trialEnds) && Date.now() >= trialEnds && !['ativo', 'active'].includes(planStatus)
    if (trialExpired || (planStatus && !['trial', 'ativo', 'active'].includes(planStatus))) {
      return json(req, { error: 'EMPRESA_SEM_ACESSO_ATIVO' }, 401)
    }

    if (requestedEmpresaId && profileCandidate.empresa_id !== requestedEmpresaId) {
      return json(req, { error: 'USUARIO_NAO_PERTENCE_A_EMPRESA' }, 401)
    }

    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(profileCandidate.auth_user_id)
    if (authUserError || !authUserData.user?.email) {
      console.error('[erp-login] auth identity lookup:', authUserError)
      return json(req, { error: 'USUARIO_AUTH_NAO_VINCULADO' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: authUserData.user.email.trim().toLowerCase(),
      password,
    })

    if (signInError || !signIn.session || !signIn.user) {
      return json(req, { error: 'USUARIO_OU_SENHA_INVALIDOS' }, 401)
    }

    const { data: profile, error: profileError } = await admin
      .from('erp_usuarios')
      .select('id,nome,login_nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master,deleted_at')
      .eq('auth_user_id', signIn.user.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (profileError || !profile || profile.auth_user_id !== signIn.user.id || profile.empresa_id !== company.id) {
      return json(req, { error: 'PERFIL_ERP_NAO_AUTORIZADO' }, 401)
    }

    let setorCodigo: string | null = null
    let setorNome: string | null = null

    if (profile.setor_id) {
      const { data: setor, error: setorError } = await admin
        .from('erp_setores')
        .select('codigo,nome')
        .eq('id', profile.setor_id)
        .eq('empresa_id', profile.empresa_id)
        .maybeSingle()

      if (setorError) {
        console.error('[erp-login] sector lookup:', setorError)
        return json(req, { error: 'AUTH_SECTOR_LOOKUP_ERROR' }, 500)
      }

      setorCodigo = setor?.codigo ?? null
      setorNome = setor?.nome ?? null
    }

    return json(req, {
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
    return json(req, { error: 'AUTH_INTERNAL_ERROR' }, 500)
  }
})
