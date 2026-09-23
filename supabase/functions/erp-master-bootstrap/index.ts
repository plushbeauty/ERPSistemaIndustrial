import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const ORIGIN = "https://erp-sistema-industrial.vercel.app"
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS })

const clean = (value: unknown) => String(value ?? "").trim()
const normalizeEmail = (value: unknown) => clean(value).toLowerCase()

async function authUserExistsByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users ?? []
    if (users.some((user) => normalizeEmail(user.email) === email)) return true
    if (users.length < 1000) return false
  }
  throw new Error("AUTH_USER_LOOKUP_LIMIT")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HEADERS })
  if (req.method !== "POST") return json({ error: "MÉTODO_NÃO_PERMITIDO" }, 405)

  let admin: ReturnType<typeof createClient> | null = null
  let authUserId: string | null = null
  let stage = "start"

  try {
    stage = "env"
    const url = clean(Deno.env.get("SUPABASE_URL"))
    const secretKey = clean(Deno.env.get("SUPABASE_SECRET_KEY"))
    let secretFromDictionary = ""
    const secretDictionary = clean(Deno.env.get("SUPABASE_SECRET_KEYS"))
    if (secretDictionary) {
      try {
        const parsed: unknown = JSON.parse(secretDictionary)
        if (parsed && typeof parsed === "object" && "default" in parsed) {
          const value = parsed.default
          if (typeof value === "string") secretFromDictionary = value.trim()
        }
      } catch (error) {
        console.warn("[erp-master-bootstrap] SUPABASE_SECRET_KEYS inválida; seguindo para fallback.", error)
      }
    }
    const serviceRoleFallback = clean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
    const adminKey = secretKey || secretFromDictionary || serviceRoleFallback
    if (!url || !adminKey) return json({ error: "SERVER_AUTH_CONFIGURATION_ERROR", stage, has_url: Boolean(url), has_admin_key: Boolean(adminKey) }, 500)

    admin = createClient(url, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    stage = "request"
    const body = await req.json()
    const action = clean(body?.action || "status")

    stage = "master_lookup"
    const { data: masters, error: masterError } = await admin
      .from("erp_usuarios")
      .select("id")
      .eq("is_master", true)
      .eq("perfil", "MASTER")
      .eq("nivel_admin", 9)
      .eq("ativo", true)
      .is("empresa_id", null)
      .is("setor_id", null)
      .is("deleted_at", null)
      .limit(1)

    if (masterError) throw masterError

    if (action === "status") {
      stage = "status_ok"
      return json({ ok: true, available: !masters?.length })
    }

    if (action !== "bootstrap_master") return json({ error: "ACTION_INVALID" }, 400)
    if (masters?.length) return json({ error: "MASTER_ALREADY_EXISTS", locked: true }, 409)

    const nome = clean(body?.nome)
    const email = normalizeEmail(body?.email)
    const password = clean(body?.password)

    if (nome.length < 3) return json({ error: "NOME_INVALIDO" }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "EMAIL_INVALIDO" }, 400)
    if (password.length < 8) return json({ error: "SENHA_MINIMA_8" }, 400)

    if (await authUserExistsByEmail(admin, email)) return json({ error: "EMAIL_AUTH_JA_EXISTE" }, 409)

    stage = "auth_create"
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, sistema: "SGQ ERP Industrial" },
    })

    if (created.error || !created.user) {
      throw created.error ?? new Error("MASTER_AUTH_CREATE_FAILED")
    }

    authUserId = created.user.id

    const username =
      nome
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "master"

    stage = "profile_insert"
    const inserted = await admin
      .from("erp_usuarios")
      .insert({
        empresa_id: null,
        setor_id: null,
        nome,
        email,
        username,
        perfil: "MASTER",
        ativo: true,
        nivel_admin: 9,
        auth_user_id: authUserId,
        is_master: true,
        deleted_at: null,
      })
      .select("id")
      .single()

    if (inserted.error || !inserted.data) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined)
      throw inserted.error ?? new Error("MASTER_PROFILE_CREATE_FAILED")
    }

    return json({ ok: true, master: true, user_id: inserted.data.id, auth_user_id: authUserId, email, nome }, 201)
  } catch (error) {
    if (authUserId && admin) await admin.auth.admin.deleteUser(authUserId).catch(() => undefined)
    console.error("[erp-master-bootstrap]", error)
    return json({ error: error instanceof Error ? error.message : "MASTER_BOOTSTRAP_FAILED", stage }, 500)
  }
})
