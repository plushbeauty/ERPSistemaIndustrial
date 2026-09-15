import { createClient } from '@supabase/supabase-js'

const productionOrigin = 'https://erp-sistema-industrial.vercel.app'
const previewOrigin = /^https:\/\/erp-sistema-industrial(?:-git-main-plushbeauty)?-[a-z0-9-]+\.vercel\.app$/i
const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):(5173|4173)$/i

function allowedOrigin(origin: string | null) {
  if (!origin) return productionOrigin
  if (origin === productionOrigin || previewOrigin.test(origin) || localhostOrigin.test(origin)) return origin
  return productionOrigin
}

function headers(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
}

const json = (origin: string | null, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin) })

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: headers(origin) })
  }

  if (req.method !== 'POST') return json(origin, { error: 'Método não permitido.' }, 405)

  try {
    const body = await req.json()
    const empresa = String(body.empresa ?? '').trim()
    const identificador = String(body.identificador ?? '').trim()
    const senha = String(body.senha ?? '')

    if (!empresa || !identificador || !senha) {
      return json(origin, { error: 'Informe empresa, usuário e senha.' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const empresaNormalizada = empresa.toLowerCase()
    const identificadorNormalizado = identificador.toLowerCase()

    const { data: empresas, error: empresaError } = await admin
      .from('erp_empresas')
      .select('id, razao_social, nome_fantasia, ativo, plano_status, trial_ends_at')
      .or(`nome_fantasia.ilike.${empresa},razao_social.ilike.${empresa}`)
      .limit(20)

    if (empresaError) {
      console.error('[erp-login] empresa', empresaError)
      return json(origin, { error: 'Falha ao localizar a empresa.' }, 500)
    }

    const empresaEncontrada = (empresas ?? []).find((item) =>
      String(item.nome_fantasia ?? '').trim().toLowerCase() === empresaNormalizada ||
      String(item.razao_social ?? '').trim().toLowerCase() === empresaNormalizada,
    )

    if (!empresaEncontrada) return json(origin, { error: 'Empresa ou usuário inválidos.' }, 401)
    if (empresaEncontrada.ativo === false) return json(origin, { error: 'Empresa bloqueada.' }, 403)

    // O setor NÃO faz parte da autenticação. O setor é uma informação de autorização
    // vinculada ao usuário ERP e será carregado depois do login.
    const { data: usuarios, error: usuarioError } = await admin
      .from('erp_usuarios')
      .select('id,nome,username,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id,is_master')
      .eq('empresa_id', empresaEncontrada.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .limit(500)

    if (usuarioError) {
      console.error('[erp-login] usuario', usuarioError)
      return json(origin, { error: 'Falha ao localizar o usuário do ERP.' }, 500)
    }

    const matches = (usuarios ?? []).filter((item) =>
      String(item.username ?? '').trim().toLowerCase() === identificadorNormalizado ||
      String(item.email ?? '').trim().toLowerCase() === identificadorNormalizado ||
      String(item.nome ?? '').trim().toLowerCase() === identificadorNormalizado,
    )

    if (matches.length !== 1) return json(origin, { error: 'Empresa ou usuário inválidos.' }, 401)

    const usuario = matches[0]
    if (!usuario.auth_user_id) {
      return json(origin, { error: 'Usuário ainda não foi provisionado para autenticação.' }, 403)
    }

    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(usuario.auth_user_id)
    if (authUserError || !authUserData.user) {
      console.error('[erp-login] auth linkage', authUserError)
      return json(origin, { error: 'Vínculo de autenticação inválido.' }, 403)
    }

    const authEmail = String(authUserData.user.email ?? '').trim().toLowerCase()
    if (!authEmail) return json(origin, { error: 'Usuário sem identidade de autenticação válida.' }, 403)

    // Supabase Auth aceita password + email/phone, não username arbitrário.
    // O ERP resolve Empresa + Usuário para a identidade Auth aqui no servidor.
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: authEmail,
      password: senha,
    })

    if (authError || !authData.session || !authData.user) {
      console.error('[erp-login] password authentication', authError)
      return json(origin, { error: 'Usuário ou senha inválidos.' }, 401)
    }

    if (
      Number(usuario.nivel_admin) === 1 &&
      empresaEncontrada.plano_status !== 'ativo' &&
      empresaEncontrada.trial_ends_at &&
      Date.now() >= new Date(empresaEncontrada.trial_ends_at).getTime()
    ) {
      return json(origin, { error: 'A empresa está com o plano expirado.' }, 403)
    }

    let setorCodigo: string | null = null
    let setorNome: string | null = null
    if (usuario.setor_id) {
      const { data: setor } = await admin
        .from('erp_setores')
        .select('codigo,nome')
        .eq('id', usuario.setor_id)
        .eq('empresa_id', empresaEncontrada.id)
        .maybeSingle()
      setorCodigo = setor?.codigo ?? null
      setorNome = setor?.nome ?? null
    }

    return json(origin, {
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
      profile: {
        id: usuario.id,
        empresa_id: empresaEncontrada.id,
        setor_id: usuario.setor_id,
        setor_codigo: setorCodigo,
        setor_nome: setorNome,
        username: usuario.username,
        nome: usuario.nome,
        email: usuario.email,
        nivel_admin: usuario.nivel_admin ?? 99,
        is_master: usuario.is_master === true,
      },
    })
  } catch (error) {
    console.error('[erp-login] unexpected', error)
    return json(origin, { error: 'Não foi possível concluir o login.' }, 500)
  }
})
