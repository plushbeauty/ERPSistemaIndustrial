import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const productionOrigin = "https://erp-sistema-industrial.vercel.app"
const configuredOrigin = Deno.env.get("ERP_ALLOWED_ORIGIN") || productionOrigin

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (origin === configuredOrigin || origin === productionOrigin) return true
  if (origin === "http://localhost:5173" || origin === "http://localhost:4173") return true

  try {
    const url = new URL(origin)
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("erp-sistema-industrial")
    )
  } catch {
    return false
  }
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : productionOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  })

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin")
  const cors = getCorsHeaders(origin)

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: cors })
  }

  if (!isAllowedOrigin(origin)) {
    return json({ error: "Origem não autorizada." }, 403, origin)
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405, origin)
  }

  try {
    const body = await req.json()
    const empresa = String(body.empresa ?? "").trim()
    const identificador = String(body.identificador ?? "").trim()
    const senha = String(body.senha ?? "")

    if (!empresa || !identificador || !senha) {
      return json({ error: "Informe empresa, usuário/e-mail e senha." }, 400, origin)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Configuração segura do servidor ausente." }, 500, origin)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: users, error: resolverError } = await admin.rpc("erp_resolver_login", {
      p_empresa: empresa,
      p_identificador: identificador,
    })

    if (resolverError) {
      console.error("erp_resolver_login", resolverError)
      return json({ error: "Falha ao validar empresa e usuário." }, 500, origin)
    }

    const user = Array.isArray(users) ? users[0] : users
    if (!user?.email || !user?.auth_user_id || !user?.empresa_id) {
      return json({ error: "Empresa, usuário ou e-mail não encontrado." }, 401, origin)
    }

    const auth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: senha }),
    })

    const authData = await auth.json()
    if (!auth.ok || !authData.access_token || !authData.refresh_token) {
      return json({ error: "Senha inválida ou usuário inativo." }, 401, origin)
    }

    return json(
      {
        session: {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
        },
        profile: {
          id: user.auth_user_id,
          nome: user.nome,
          email: user.email,
          empresa_id: user.empresa_id,
          empresa_nome: user.empresa_nome,
          setor_id: user.setor_id,
          setor: user.setor_codigo || user.setor_nome || null,
          nivel_admin: user.nivel_admin,
          cargo_id: user.cargo_id,
        },
      },
      200,
      origin,
    )
  } catch (error) {
    console.error(error)
    return json({ error: "Não foi possível concluir o login." }, 500, origin)
  }
})
