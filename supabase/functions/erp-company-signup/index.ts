import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': 'https://erp-sistema-industrial.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const clean = (value: unknown) => String(value ?? '').trim()
const digits = (value: unknown) => clean(value).replace(/\D/g, '')
const emailNorm = (value: unknown) => clean(value).toLowerCase()
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value)

function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false
  const digit = (length: number) => {
    const sum = value.slice(0, length).split('').reduce((total, n, i) => total + Number(n) * (length + 1 - i), 0)
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10])
}

function validCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false
  const check = (length: number) => {
    const weights = length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]
    const sum = value.slice(0, length).split('').reduce((total, n, i) => total + Number(n) * weights[i], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return check(12) === Number(value[12]) && check(13) === Number(value[13])
}

async function authUserExistsByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users ?? []
    if (users.some(user => emailNorm(user.email) === email)) return true
    if (users.length < 1000) return false
  }
  throw new Error('AUTH_USER_LOOKUP_LIMIT')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[erp-company-signup] Missing server environment configuration')
    return json({ error: 'Serviço de cadastro indisponível.' }, 503)
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let empresaId: string | null = null
  let authUserId: string | null = null
  try {
    const body = await req.json()
    const razao = clean(body.razao_social)
    const fantasia = clean(body.nome_fantasia)
    const documento = digits(body.documento ?? body.cnpj)
    const tipoDocumento = clean(body.tipo_documento || (clean(body.cnpj) ? 'CNPJ' : '')).toUpperCase()
    const email = emailNorm(body.email)
    const nomeAdmin = clean(body.nome_admin)
    const senha = clean(body.senha)
    const nomeAcesso = clean(body.nome_acesso) || fantasia.split(/\s+/)[0]
    const requestedPlan = clean(body.plano || 'essencial').toLowerCase()

    if (!razao || !fantasia || !documento || !email || !nomeAdmin || !senha || !nomeAcesso) {
      return json({ error: 'Preencha todos os campos obrigatórios.' }, 400)
    }
    if (!['CPF', 'CNPJ'].includes(tipoDocumento)) return json({ error: 'Informe se o documento é CPF ou CNPJ.' }, 400)
    if (tipoDocumento === 'CNPJ' && !validCnpj(documento)) return json({ error: 'Informe um CNPJ válido.' }, 400)
    if (tipoDocumento === 'CPF' && !validCpf(documento)) return json({ error: 'Informe um CPF válido.' }, 400)
    if (!validEmail(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
    if (senha.length < 8 || senha.length > 128) return json({ error: 'A senha deve possuir entre 8 e 128 caracteres.' }, 400)
    if (razao.length > 200 || fantasia.length > 120 || nomeAdmin.length > 160 || email.length > 254 || nomeAcesso.length > 80) {
      return json({ error: 'Um ou mais campos excedem o tamanho permitido.' }, 400)
    }

    // Plan codes are resolved against the database catalog; URL text is never treated as a price or entitlement.
    const { data: plan, error: planError } = await admin
      .from('erp_planos_catalogo')
      .select('codigo,nome,ativo')
      .eq('codigo', requestedPlan)
      .eq('ativo', true)
      .maybeSingle()
    if (planError) throw planError
    if (!plan) return json({ error: 'O plano selecionado não existe ou está indisponível.' }, 400)

    // Query both the canonical document pair and the legacy CNPJ field for compatibility with older rows.
    const { data: duplicate, error: duplicateError } = await admin
      .from('erp_empresas')
      .select('id')
      .or(`documento.eq.${documento},cnpj.eq.${documento}`)
      .limit(1)
    if (duplicateError) throw duplicateError
    if (duplicate?.length) return json({ error: 'Já existe uma empresa cadastrada com este documento.' }, 409)
    if (await authUserExistsByEmail(admin, email)) return json({ error: 'Este e-mail já possui um acesso de autenticação.' }, 409)

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 15 * 86400000)
    const { data: empresa, error: empresaError } = await admin.from('erp_empresas').insert({
      razao_social: razao,
      nome_fantasia: fantasia,
      cnpj: documento, // legacy NOT NULL field retained for compatibility with existing consumers
      documento,
      tipo_documento: tipoDocumento,
      plano: plan.codigo,
      ativo: true,
      status: 'ativo',
      plano_status: 'trial',
      trial_inicio: now.toISOString(),
      trial_fim: trialEnd.toISOString(),
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    }).select('id,nome_fantasia,razao_social,plano,documento,tipo_documento').single()
    if (empresaError || !empresa) throw empresaError ?? new Error('EMPRESA_CREATE_FAILED')
    empresaId = empresa.id

    const setores = [
      ['ADM','Administração'],['QUALIDADE','Qualidade'],['PRODUCAO','Produção'],['PCP','PCP'],
      ['ESTOQUE','Estoque'],['FINANCEIRO','Financeiro'],['RH','Recursos Humanos'],['COMERCIAL','Comercial'],
    ].map(([codigo,nome]) => ({ empresa_id: empresa.id, codigo, nome, ativo: true }))
    const { data: createdSetores, error: setorError } = await admin.from('erp_setores').insert(setores).select('id,codigo')
    if (setorError || !createdSetores?.length) throw setorError ?? new Error('SETORES_CREATE_FAILED')
    const admSetor = createdSetores.find(setor => setor.codigo === 'ADM') ?? createdSetores[0]

    const { data: auth, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nomeAdmin, empresa_id: empresa.id, setor_id: admSetor.id, sistema: 'SYSNQRA ERP & SGQ INDUSTRIAL' },
    })
    if (authError || !auth.user) throw authError ?? new Error('AUTH_CREATE_FAILED')
    authUserId = auth.user.id

    const { data: erpUser, error: userError } = await admin.from('erp_usuarios').insert({
      empresa_id: empresa.id,
      setor_id: admSetor.id,
      nome: nomeAdmin,
      email,
      perfil: 'ADMIN',
      ativo: true,
      nivel_admin: 1,
      auth_user_id: auth.user.id,
      is_master: false,
      username: nomeAcesso,
    }).select('id,nome,email,empresa_id,perfil,nivel_admin,is_master').single()
    if (userError || !erpUser) throw userError ?? new Error('ERP_USER_CREATE_FAILED')

    return json({
      ok: true,
      empresa: { id: empresa.id, nome_fantasia: empresa.nome_fantasia, razao_social: empresa.razao_social },
      administrador: { id: erpUser.id, perfil: erpUser.perfil, nivel_admin: erpUser.nivel_admin, is_master: erpUser.is_master },
      login_nome: nomeAcesso,
      email,
      tipo_documento: tipoDocumento,
      plano: plan.codigo,
      plano_nome: plan.nome,
      plano_status: 'trial',
      trial_ends_at: trialEnd.toISOString(),
      modulo: null,
      modulo_persistido: false,
    }, 201)
  } catch (error) {
    if (authUserId) {
      const { error: rollbackAuthError } = await admin.auth.admin.deleteUser(authUserId)
      if (rollbackAuthError) console.error('[erp-company-signup] auth rollback failed', rollbackAuthError)
    }
    if (empresaId) {
      const { error: rollbackSectorError } = await admin.from('erp_setores').delete().eq('empresa_id', empresaId)
      if (rollbackSectorError) console.error('[erp-company-signup] sector rollback failed', rollbackSectorError)
      const { error: rollbackCompanyError } = await admin.from('erp_empresas').delete().eq('id', empresaId)
      if (rollbackCompanyError) console.error('[erp-company-signup] company rollback failed', rollbackCompanyError)
    }
    console.error('[erp-company-signup]', error)
    return json({ error: 'Não foi possível concluir o cadastro. Verifique os dados ou tente novamente mais tarde.' }, 500)
  }
})
