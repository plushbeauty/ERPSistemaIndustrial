import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const ORIGIN = "https://erp-sistema-industrial.vercel.app"
const H = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
}
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: H })
const clean = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ")
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "")
const username = (v: string) => clean(v).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)

function secretKey() {
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")
    if (parsed?.default) return String(parsed.default)
  } catch {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H })
  if (req.method !== "POST") return out({ error: "Método não permitido." }, 405)

  let empresaId: string | null = null
  let authId: string | null = null
  try {
    const url = clean(Deno.env.get("SUPABASE_URL"))
    const secret = secretKey()
    if (!url || !secret) return out({ error: "Serviço de cadastro não configurado." }, 500)
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = await req.json()

    const razao = clean(body?.razao_social)
    const fantasia = clean(body?.nome_fantasia)
    const documento = digits(body?.documento ?? body?.cnpj)
    const tipo = String(body?.tipo_documento ?? (documento.length === 11 ? "CPF" : "CNPJ")).toUpperCase()
    const email = clean(body?.email).toLowerCase()
    const nomeAdmin = clean(body?.nome_admin)
    const senha = clean(body?.senha)
    const loginNome = username(clean(body?.nome_acesso) || fantasia || razao)

    if (!razao || !fantasia || !documento || !email || !nomeAdmin || !senha || !loginNome) return out({ error: "Preencha todos os campos obrigatórios." }, 400)
    if ((tipo === "CNPJ" && documento.length !== 14) || (tipo === "CPF" && documento.length !== 11)) return out({ error: "Informe um " + tipo + " válido." }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return out({ error: "Informe um e-mail válido." }, 400)
    if (senha.length < 6) return out({ error: "A senha deve possuir pelo menos 6 caracteres." }, 400)

    const { data: existingEmail, error: emailError } = await admin.from("erp_usuarios").select("id").ilike("email", email).limit(1)
    if (emailError) throw emailError
    if (existingEmail?.length) return out({ error: "Este e-mail já está cadastrado." }, 409)

    if (tipo === "CNPJ") {
      const { data: existingCnpj, error: cnpjError } = await admin.from("erp_empresas").select("id").eq("cnpj", documento).limit(1)
      if (cnpjError) throw cnpjError
      if (existingCnpj?.length) return out({ error: "Este CNPJ já está cadastrado." }, 409)
    }

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 15 * 86400000)
    const { data: empresa, error: empresaError } = await admin.from("erp_empresas").insert({
      razao_social: razao,
      nome_fantasia: fantasia,
      cnpj: tipo === "CNPJ" ? documento : null,
      plano: clean(body?.plano) || "Essencial",
      ativo: true,
      status: "ativo",
      plano_status: "trial",
      trial_inicio: now.toISOString(),
      trial_fim: trialEnd.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      subscription_status: "trialing",
      plan_type: "basic",
    }).select("id,razao_social,nome_fantasia,cnpj,plano,plano_status,trial_ends_at").single()
    if (empresaError || !empresa) throw empresaError ?? new Error("EMPRESA_CREATE_FAILED")
    empresaId = empresa.id

    const { data: setor, error: setorError } = await admin.from("erp_setores").insert({
      empresa_id: empresaId, codigo: "ADM", nome: "Administração", ativo: true,
    }).select("id,codigo,nome").single()
    if (setorError || !setor) throw setorError ?? new Error("SETOR_CREATE_FAILED")

    const { data: auth, error: authError } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
      user_metadata: { nome: nomeAdmin, username: loginNome, empresa_id: empresaId, setor_id: setor.id, sistema: "SGQ ERP Industrial" },
    })
    if (authError || !auth.user) throw authError ?? new Error("AUTH_CREATE_FAILED")
    authId = auth.user.id

    const { data: user, error: userError } = await admin.from("erp_usuarios").insert({
      empresa_id: empresaId, nome: nomeAdmin, email, perfil: "administrador",
      ativo: true, nivel_admin: 1, setor_id: setor.id, username: loginNome,
      auth_user_id: authId, is_master: false, deleted_at: null,
    }).select("id,nome,username,email").single()
    if (userError || !user) throw userError ?? new Error("ERP_USER_CREATE_FAILED")

    const setores = [
      ["COM", "Comercial / Vendas"], ["COMPRAS", "Compras"], ["PCP", "PCP / Planejamento"],
      ["PROD", "Produção"], ["CQ", "Controle de Qualidade"], ["EST", "Estoque / Almoxarifado"],
      ["EXP", "Expedição / Logística"], ["MAN", "Manutenção"], ["FISCAL", "Fiscal / Faturamento"],
      ["FIN", "Financeiro"], ["RH", "Recursos Humanos"],
    ].map(([codigo, nome]) => ({ empresa_id: empresaId, codigo, nome, ativo: true }))
    const defaults = await admin.from("erp_setores").insert(setores)
    if (defaults.error) console.warn("DEFAULT_SECTORS", defaults.error.message)

    return out({ ok: true, empresa, login_nome: loginNome, email, message: "Empresa criada com sucesso. O acesso está pronto para login." }, 201)
  } catch (error) {
    console.error("ERP_COMPANY_SIGNUP", error)
    const secret = secretKey()
    if (authId && secret) await createClient(clean(Deno.env.get("SUPABASE_URL")), secret).auth.admin.deleteUser(authId).catch(() => undefined)
    if (empresaId && secret) await createClient(clean(Deno.env.get("SUPABASE_URL")), secret).from("erp_empresas").delete().eq("id", empresaId).catch(() => undefined)
    return out({ error: error instanceof Error ? error.message : "Não foi possível concluir o cadastro da empresa." }, 500)
  }
})
