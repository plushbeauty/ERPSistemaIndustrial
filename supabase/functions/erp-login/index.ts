import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const { empresa, setor, identificador, senha } = await req.json()
    if (!empresa || !setor || !identificador || !senha) return json({ error: 'Informe empresa, setor, usuário/e-mail e senha.' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: companies, error: companyError } = await admin.from('erp_empresas').select('id,razao_social,nome_fantasia,ativo,plano_status,trial_ends_at').or(`nome_fantasia.ilike.${empresa.trim()},razao_social.ilike.${empresa.trim()}`).limit(10)
    if (companyError) return json({ error: 'Falha ao localizar a empresa.' }, 500)
    const company = (companies ?? []).find((x) => String(x.nome_fantasia ?? '').trim().toLowerCase() === String(empresa).trim().toLowerCase() || String(x.razao_social ?? '').trim().toLowerCase() === String(empresa).trim().toLowerCase())
    if (!company) return json({ error: 'Empresa não encontrada.' }, 401)
    if (company.ativo === false) return json({ error: 'Empresa bloqueada.' }, 403)
    const { data: sectors, error: sectorError } = await admin.from('erp_setores').select('id,codigo,nome,empresa_id').eq('empresa_id', company.id).limit(100)
    if (sectorError) return json({ error: 'Falha ao localizar o setor.' }, 500)
    const sector = (sectors ?? []).find((x) => String(x.codigo).trim().toLowerCase() === String(setor).trim().toLowerCase() || String(x.nome).trim().toLowerCase() === String(setor).trim().toLowerCase())
    if (!sector) return json({ error: 'Setor não encontrado para esta empresa.' }, 401)
    const idNorm = String(identificador).trim().toLowerCase()
    const { data: users, error: userError } = await admin.from('erp_usuarios').select('id,nome,email,empresa_id,setor_id,ativo,nivel_admin,auth_user_id').eq('empresa_id', company.id).eq('setor_id', sector.id).limit(100)
    if (userError) return json({ error: 'Falha ao localizar o usuário do ERP.' }, 500)
    const erpUser = (users ?? []).find((x) => String(x.email).trim().toLowerCase() === idNorm || String(x.nome).trim().toLowerCase() === idNorm)
    if (!erpUser || erpUser.ativo === false) return json({ error: 'Usuário ou senha inválidos.' }, 401)
    const email = String(erpUser.email).trim().toLowerCase()
    let authUserId = erpUser.auth_user_id as string | null
    if (!authUserId) {
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) return json({ error: 'Falha ao consultar o cadastro de autenticação.' }, 500)
      const existing = listed.users.find((u) => String(u.email ?? '').trim().toLowerCase() === email)
      if (existing) authUserId = existing.id
      else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: String(senha), email_confirm: true, user_metadata: { nome: erpUser.nome, empresa_id: company.id, setor_id: sector.id, sistema: 'ERP Industrial' } })
        if (createError || !created.user) return json({ error: 'Não foi possível criar a identidade de autenticação deste usuário.' }, 500)
        authUserId = created.user.id
      }
      const { error: linkError } = await admin.from('erp_usuarios').update({ auth_user_id: authUserId }).eq('id', erpUser.id)
      if (linkError) return json({ error: 'Usuário criado, mas não foi possível concluir o vínculo com o ERP.' }, 500)
    }
    const { data: authData, error: authError } = await admin.auth.signInWithPassword({ email, password: String(senha) })
    if (authError || !authData.session || !authData.user) return json({ error: 'Usuário ou senha inválidos.' }, 401)
    if (erpUser.nivel_admin === 1 && company.plano_status !== 'ativo' && company.trial_ends_at && Date.now() >= new Date(company.trial_ends_at).getTime()) return json({ error: 'A empresa está com o plano expirado.' }, 403)
    return json({ session: { access_token: authData.session.access_token, refresh_token: authData.session.refresh_token }, profile: { id: erpUser.id, empresa_id: company.id, nivel_admin: erpUser.nivel_admin ?? 99 } })
  } catch (error) { console.error(error); return json({ error: 'Não foi possível concluir o login.' }, 500) }
})
