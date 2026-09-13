// supabase/functions/erp-login/index.ts
import { createClient } from "npm:@supabase/supabase-js@2"

// Definição explícita de cabeçalhos CORS para autorizar nativamente o preflight do navegador
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Libera o acesso para qualquer origem, removendo de vez o bloqueio de rede
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // Evita requisições repetidas fazendo cache do preflight por 24 horas
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { 
  status, 
  headers: { ...corsHeaders, "Content-Type": "application/json" } 
})

Deno.serve(async (req: Request) => {
  // 1. Interceptação mandatória do método OPTIONS (Preflight Request) do Browser
  if (req.method === "OPTIONS") { 
    return new Response("ok", { 
      status: 204, 
      headers: corsHeaders 
    }) 
  }
  
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)
  
  try {
    const body = await req.json()
    const empresa = String(body.empresa ?? "").trim()
    const identificador = String(body.identificador ?? "").trim()
    const senha = String(body.senha ?? "")
    
    if (!empresa || !identificador || !senha) return json({ error: "Informe empresa, usuário/e-mail e senha." }, 400)
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if (!supabaseUrl || !serviceKey) return json({ error: "Configuração segura do servidor ausente." }, 500)
    
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    
    // Resolve empresa e usuário via RPC ativa
    const { data: users, error: resolverError } = await admin.rpc("erp_resolver_login", { p_empresa: empresa, p_identificador: identificador })
    if (resolverError) { 
      console.error("erp_resolver_login", resolverError)
      return json({ error: "Falha ao validar empresa e usuário." }, 500) 
    }
    
    const user = Array.isArray(users) ? users[0] : users
    if (!user?.email || !user?.auth_user_id || !user?.empresa_id) return json({ error: "Empresa, usuário ou e-mail não encontrado." }, 401)
    
    // Autenticação direta contra o motor GoTrue do Supabase Auth
    const auth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { 
      method: "POST", 
      headers: { apikey: serviceKey, "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: user.email, password: senha }) 
    })
    
    const authData = await auth.json()
    if (!auth.ok || !authData.access_token || !authData.refresh_token) return json({ error: "Senha inválida ou usuário inativo." }, 401)
    
    return json({ 
      session: { access_token: authData.access_token, refresh_token: authData.refresh_token }, 
      profile: { 
        id: user.auth_user_id, 
        nome: user.nome, 
        email: user.email, 
        empresa_id: user.empresa_id, 
        empresa_nome: user.empresa_nome, 
        setor_id: user.setor_id, 
        setor: user.setor_codigo || user.setor_nome || null, 
        nivel_admin: user.nivel_admin, 
        cargo_id: user.cargo_id 
      } 
    })
  } catch (error) {
    console.error("erp-login", error)
    return json({ error: "Não foi possível concluir o login." }, 500)
  }
})
