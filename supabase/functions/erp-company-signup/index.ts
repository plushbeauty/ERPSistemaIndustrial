import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': 'https://erp-sistema-industrial.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const clean = (v: unknown) => String(v ?? '').trim()
const normalize = (v: unknown) => clean(v).replace(/\D/g, '')
const emailNorm = (v: unknown) => clean(v).toLowerCase()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

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
    const nomeAdmin = clean(body.nome_admin)
    const senha = clean(body.senha)
    const nomeAcesso = clean(body.nome_acesso) || fantasia.split(/\s+/)[0]

    if (!razao || !fantasia || !documento || !email || !nomeAdmin || !senha || !nomeAcesso) return json({ error: 'Preencha todos os campos obrigatórios.' }, 400)
    if (!['CPF','CNPJ'].includes(tipoDocumento.toUpperCase())) return json({ error: 'Informe se o documento é CPF ou CNPJ.' }, 400)
    if (tipoDocumento.toUpperCase() === 'CNPJ' && documento.length !== 14) return json({ error: 'Informe um CNPJ válido com 14 dígitos.' }, 400)
    if (tipoDocumento.toUpperCase() === 'CPF' && documento.length !== 11) return json({ error: 'Informe um CPF válido com 11 dígitos.' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
    if (senha.length < 8) return json({ error: 'A senha deve possuir pelo menos 8 caracteres.' }, 400)

    const { data: duplicate, error:duplicateError } = await admin.from('erp_empresas').select('id').eq('cnpj', documento).limit(1)
    if (duplicateError) throw duplicateError
    if (duplicate?.length) return json({ error: 'Já existe uma empresa cadastrada com este documento.' }, 409)

    const existing = await admin.auth.admin.getUserByEmail(email)
    if (existing.data?.user) return json({ error: 'Este e-mail já possui um acesso de autenticação.' }, 409)

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
      user_metadata:{ nome:nomeAdmin, empresa_id:empresa.id, setor_id:admSetor.id, sistema:'ERP Industrial' },
    })
    if (authError || !auth.user) throw authError ?? new Error('AUTH_CREATE_FAILED')
    authUserId = auth.user.id

    const { data:erpUser, error:userError } = await admin.from('erp_usuarios').insert({
      empresa_id:empresa.id, setor_id:admSetor.id, nome:nomeAdmin, email,
      perfil:'ADMIN', ativo:true, nivel_admin:1, auth_user_id:auth.user.id, is_master:false,
      username:nomeAcesso,
    }).select('id,nome,email').single()

    if (userError || !erpUser) throw userError ?? new Error('ERP_USER_CREATE_FAILED')

    return json({ ok:true, empresa:{id:empresa.id,nome_fantasia:empresa.nome_fantasia,razao_social:empresa.razao_social}, login_nome:nomeAcesso, email, tipo_documento:tipoDocumento.toUpperCase(), trial_ends_at:trialEnd.toISOString() }, 201)
  } catch (error) {
    if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(()=>undefined)
    if (empresaId) {
      await admin.from('erp_setores').delete().eq('empresa_id',empresaId).catch(()=>undefined)
      await admin.from('erp_empresas').delete().eq('id',empresaId).catch(()=>undefined)
    }
    console.error('[erp-company-signup]',error)
    return json({ error:error instanceof Error ? error.message : 'Não foi possível concluir o cadastro da empresa.' }, 500)
  }
})
