import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST obrigatório." }), { status: 405, headers: { "content-type": "application/json" } })
  const auth = req.headers.get("Authorization")
  if (!auth) return new Response(JSON.stringify({ error: "Autenticação obrigatória." }), { status: 401, headers: { "content-type": "application/json" } })
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return new Response(JSON.stringify({ error: "Sessão inválida." }), { status: 401, headers: { "content-type": "application/json" } })
  const upstream = Deno.env.get("VENDAS_EMAIL_IMPORT_URL")
  if (!upstream) return new Response(JSON.stringify({ error: "Importação de e-mail não configurada: defina VENDAS_EMAIL_IMPORT_URL no projeto Supabase." }), { status: 503, headers: { "content-type": "application/json" } })
  const body = await req.json().catch(() => ({}))
  const response = await fetch(upstream, { method: "POST", headers: { "content-type": "application/json", "x-erp-user-id": user.id }, body: JSON.stringify(body) })
  const text = await response.text()
  return new Response(text, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } })
})
