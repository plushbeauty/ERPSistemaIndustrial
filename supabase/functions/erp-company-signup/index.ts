import { createClient } from '@supabase/supabase-js'

const productionOrigin = 'https://erp-sistema-industrial.vercel.app'
const allowedPreviewOrigin = /^https:\/\/erp-sistema-industrial-[a-z0-9-]+-plushbeauty\.vercel\.app$/
const corsHeaders = (origin: string | null) => {
  const allowedOrigin = origin === productionOrigin || (origin !== null && allowedPreviewOrigin.test(origin))
    ? origin
    : productionOrigin
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } })
const clean = (v: unknown) => String(v ?? '').trim()
const normalize = (v: unknown) => clean(v).replace(/\D/g, '')
const emailNorm = (v: unknown) => clean(v).toLowerCase()
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function authUserExistsByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users ?? []
    if (users.some((user) => emailNorm(user.email) === email)) return true
    if (users.length < 1000) return false
  }
  throw new Error('AUTH_USER_LOOKUP_LIMIT')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, req.headers.get('origin'))
  const origin = req.headers.get('origin')
  if (origin !== productionOrigin && !(origin && allowedPreviewOrigin.test(origin))) return json({ error: 'Origem não autorizada para cadastro empresarial.' }, 403, origin)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  let empresaId: string | null = null
  let authUserId: string | null = null

  try {
    const body = await req.json()
    const razao = clean(body.razao_social)
    const fantasia = clean(body.nome_fantasia)
    const documento = normalize(body.documento ?? body.cnpj)
    const tipoDocumento = clean(body.tipo_documento || (clean(body.cnpj) ? 'CNPJ' : ''))
    const email = emailNorm(body.email)
    const ip = clean(req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown')
    const [ipHash, emailHash] = await Promise.all([
      sha256(ip || 'unknown'),
      sha256(email || 'missing-email'),
    ])
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const [ipAttempts, emailAttempts] = await Promise.all([
      admin.from('erp_company_signup_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('attempted_at', windowStart),
      admin.from('erp_company_signup_attempts').select('id', { count: 'exact', head: true }).eq('email_hash', emailHash).gte('attempted_at', windowStart),
    ])
    if (ipAttempts.error) throw ipAttempts.error
    if (emailAttempts.error) throw emailAttempts.error
    if ((ipAttempts.count ?? 0) >= 5 || (emailAttempts.count ?? 0) >= 3) {
      return json({ error: 'Limite temporário de tentativas atingido. Aguarde uma hora antes de tentar novamente.' }, 429, origin)
    }
    const { error: attemptError } = await admin.from('erp_company_signup_attempts').insert({ ip_hash: ipHash, email_hash: emailHash })
    if (attemptError) throw attemptError

    const nomeAdmin = clean(body.nome_admin)
    const senha = clean(body.senha)
    const nomeAcesso = clean(body.nome_acesso) || fantasia.split(/\s+/)[0]

    if (!razao || !fantasia || !documento || !email || !nomeAdmin || !senha || !nomeAcesso) return json({ error: 'Preencha todos os campos obrigatórios.' }, 400, origin)
    if (!['CPF','CNPJ'].includes(tipoDocumento.toUpperCase())) return json({ error: 'Informe se o documento é CPF ou CNPJ.' }, 400, origin)
    if (tipoDocumento.toUpperCase() === 'CNPJ' && documento.length !== 14) return json({ error: 'Informe um CNPJ válido com 14 dígitos.' }, 400, origin)
    if (tipoDocumento.toUpperCase() === 'CPF' && documento.length !== 11) return json({ error: 'Informe um CPF válido com 11 dígitos.' }, 400, origin)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400, origin)
    const { data: passwordPolicy, error: passwordPolicyError } = await admin
      .from('erp_sistema_politica_senha')
      .select('comprimento_minimo, exigir_maiuscula, exigir_numero')
      .eq('singleton', true)
      .maybeSingle()
    if (passwordPolicyError || !passwordPolicy) {
      console.error('[erp-company-signup] Política de senha indisponível.')
      return json({ error: 'A política de senha do sistema não está disponível. Tente novamente mais tarde.' }, 503, origin)
    }
    const minLength = Number(passwordPolicy.comprimento_minimo)
    if (senha.length < minLength) {
      return json({ error: `A senha deve possuir pelo menos ${minLength} caracteres.` }, 400, origin)
    }
    if (passwordPolicy.exigir_maiuscula && !/[A-ZÀ-ÖØ-Þ]/.test(senha)) {
      return json({ error: 'A senha deve conter pelo menos uma letra maiúscula.' }, 400, origin)
    }
    if (passwordPolicy.exigir_numero && !/\d/.test(senha)) {
      return json({ error: 'A senha deve conter pelo menos um número.' }, 400, origin)
    }

    const { data: duplicate, error:duplicateError } = await admin.from('erp_empresas').select('id').eq('cnpj', documento).limit(1)
    if (duplicateError) throw duplicateError
    if (duplicate?.length) return json({ error: 'Já existe uma empresa cadastrada com este documento.' }, 409, origin)

    if (await authUserExistsByEmail(admin, email)) return json({ error: 'Este e-mail já possui um acesso de autenticação.' }, 409, origin)

    const trialStart = new Date()
    const trialEnd = new Date(trialStart.getTime() + 15 * 86400000)

    const { data:empresa, error:empresaError } = await admin.from('erp_empresas').insert({
      razao_social: razao,
      nome_fantasia: fantasia,
      cnpj: documento,
      plano: 'Essencial',
      ativo: true,
      status: 'ativo',
      plano_status: 'trial',
      trial_inicio: trialStart.toISOString(),
      trial_fim: trialEnd.toISOString(),
      trial_started_at: trialStart.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    }).select('id,nome_fantasia,razao_social').single()

    if (empresaError || !empresa) throw empresaError ?? new Error('EMPRESA_CREATE_FAILED')
    empresaId = empresa.id

    const setores = [
      ['ADM','Administração'],['QUALIDADE','Qualidade'],['PRODUCAO','Produção'],['PCP','PCP'],
      ['ESTOQUE','Estoque'],['FINANCEIRO','Financeiro'],['RH','Recursos Humanos'],['COMERCIAL','Comercial'],
    ].map(([codigo,nome]) => ({ empresa_id: empresa.id, codigo, nome, ativo:true }))

    const { data:createdSetores, error:setorError } = await admin.from('erp_setores').insert(setores).select('id,codigo')
    if (setorError || !createdSetores?.length) throw setorError ?? new Error('SETORES_CREATE_FAILED')
    const admSetor = createdSetores.find(s => s.codigo === 'ADM') ?? createdSetores[0]

    const { data:auth, error:authError } = await admin.auth.admin.createUser({
      email, password:senha, email_confirm:true,
      user_metadata:{ nome:nomeAdmin, empresa_id:empresa.id, setor_id:admSetor.id, sistema:'SYSNQRA ERP & SGQ INDUSTRIAL' },
    })
    if (authError || !auth.user) throw authError ?? new Error('AUTH_CREATE_FAILED')
    authUserId = auth.user.id

    const { data:erpUser, error:userError } = await admin.from('erp_usuarios').insert({
      empresa_id:empresa.id, setor_id:admSetor.id, nome:nomeAdmin, email,
      perfil:'ADMIN', ativo:true, nivel_admin:1, auth_user_id:auth.user.id, is_master:false,
      username:nomeAcesso,
    }).select('id,nome,email').single()

    if (userError || !erpUser) throw userError ?? new Error('ERP_USER_CREATE_FAILED')

    return json({ ok:true, empresa:{id:empresa.id,nome_fantasia:empresa.nome_fantasia,razao_social:empresa.razao_social}, login_nome:nomeAcesso, email, tipo_documento:tipoDocumento.toUpperCase(), trial_ends_at:trialEnd.toISOString() }, 201, origin)
  } catch (error) {
    if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(()=>undefined)
    if (empresaId) {
      await admin.from('erp_setores').delete().eq('empresa_id',empresaId).catch(()=>undefined)
      await admin.from('erp_empresas').delete().eq('id',empresaId).catch(()=>undefined)
    }
    console.error('[erp-company-signup]',error)
    return json({ error:error instanceof Error ? error.message : 'Não foi possível concluir o cadastro da empresa.' }, 500, req.headers.get('origin'))
  }
})
