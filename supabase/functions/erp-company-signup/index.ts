import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ")
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "")
const firstName = (value: string) => clean(value).split(" ")[0].replace(/[^A-Za-zÀ-ÿ0-9_-]/g, "")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)

  let companyId: string | null = null
  let authUserId: string | null = null

  try {
    const url = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !serviceKey) return json({ error: "SERVER_AUTH_CONFIGURATION_ERROR" }, 500)

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const body = await req.json()
    const razao_social = clean(body?.razao_social)
    const nome_fantasia = clean(body?.nome_fantasia)
    const documento = digits(body?.documento ?? body?.cnpj)
    const requestedTipo = String(body?.tipo_documento ?? "").toUpperCase()
    const tipo_documento = requestedTipo === "CPF" || requestedTipo === "CNPJ"
      ? requestedTipo
      : documento.length === 11 ? "CPF" : "CNPJ"
    const email = String(body?.email ?? "").trim().toLowerCase()
    const senha = String(body?.senha ?? "")
    const nome_admin = clean(body?.nome_admin)
    const nome_acesso = firstName(String(body?.nome_acesso ?? nome_fantasia ?? razao_social))

    if (!razao_social || !nome_fantasia || !documento || !email || !senha || !nome_admin || !nome_acesso) return json({ error: "Preencha todos os campos obrigatórios." }, 400)
    if ((tipo_documento === "CPF" && documento.length !== 11) || (tipo_documento === "CNPJ" && documento.length !== 14)) return json({ error: `Informe um ${tipo_documento} válido.` }, 400)
    if (senha.length < 6) return json({ error: "A senha deve possuir pelo menos 6 caracteres." }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Informe um e-mail válido." }, 400)

    const existingEmail = await admin.from("erp_usuarios").select("id").ilike("email", email).limit(1)
    if (existingEmail.error) throw existingEmail.error
    if (existingEmail.data?.length) return json({ error: "Este e-mail já está cadastrado." }, 409)

    const existingDocument = await admin.from("erp_empresas").select("id").eq("documento", documento).limit(1)
    if (existingDocument.error) throw existingDocument.error
    if (existingDocument.data?.length) return json({ error: "Este CPF/CNPJ já está cadastrado." }, 409)

    const companyExisting = await admin.from("erp_empresas").select("id").or(`razao_social.ilike.${razao_social},nome_fantasia.ilike.${nome_fantasia}`).limit(1)
    if (companyExisting.error) throw companyExisting.error
    if (companyExisting.data?.length) return json({ error: "Já existe uma empresa com esse nome." }, 409)

    const company = await admin.from("erp_empresas").insert({
      razao_social,
      nome_fantasia,
      cnpj: tipo_documento === "CNPJ" ? documento : null,
      documento,
      tipo_documento,
      codigo: nome_acesso.toUpperCase(),
      plano: String(body?.plano ?? "Essencial"),
      plano_status: "teste",
      ativo: true,
    }).select("id,razao_social,nome_fantasia,codigo,plano,documento,tipo_documento").single()

    if (company.error || !company.data) throw company.error ?? new Error("Não foi possível criar a empresa.")
    companyId = company.data.id

    const auth = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { empresa_id: companyId, nome: nome_admin, login_nome: nome_acesso },
    })

    if (auth.error || !auth.data.user) {
      await admin.from("erp_empresas").delete().eq("id", companyId)
      throw auth.error ?? new Error("Não foi possível criar o usuário de acesso.")
    }

    authUserId = auth.data.user.id

    const sector = await admin.from("erp_setores").insert({
      empresa_id: companyId,
      codigo: "ADM",
      nome: "Administrativo",
      ativo: true,
    }).select("id").single()

    if (sector.error || !sector.data) throw sector.error ?? new Error("Não foi possível criar o setor administrativo.")

    const user = await admin.from("erp_usuarios").insert({
      empresa_id: companyId,
      auth_user_id: authUserId,
      nome: nome_admin,
      email,
      nivel_admin: 2,
      ativo: true,
      setor_id: sector.data.id,
      login_nome: nome_acesso,
      is_master: false,
      role: "ADMIN",
    })

    if (user.error) throw user.error

    const setores = [
      ["COM", "Comercial / Vendas"], ["COMPRAS", "Compras"], ["PCP", "PCP / Planejamento"],
      ["PROD", "Produção"], ["CQ", "Controle de Qualidade"], ["EST", "Estoque / Almoxarifado"],
      ["EXP", "Expedição / Logística"], ["MAN", "Manutenção"], ["FISCAL", "Fiscal / Faturamento"],
      ["FIN", "Financeiro"], ["RH", "Recursos Humanos"],
    ].map(([codigo, nome]) => ({ empresa_id: companyId, codigo, nome, ativo: true }))

    const setoresResult = await admin.from("erp_setores").insert(setores)
    if (setoresResult.error) console.warn("Setores padrão não inseridos:", setoresResult.error.message)

    return json({ ok: true, empresa: company.data, login_nome: nome_acesso, email, message: "Empresa criada com sucesso. O acesso está pronto para login." })
  } catch (error) {
    console.error("[erp-company-signup]", error)
    return json({ error: error instanceof Error ? error.message : "Não foi possível concluir o cadastro." }, 500)
  }
})
