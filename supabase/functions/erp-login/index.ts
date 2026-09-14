import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const norm = (v: unknown) => text(v).toLowerCase();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceRole || !anon) return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, 500);
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json();
    const empresa = norm(body?.empresa);
    const login = norm(body?.login ?? body?.identificador);
    const password = text(body?.password ?? body?.senha);
    if (!empresa || !login || !password) return json({ ok: false, error: "CAMPOS_OBRIGATORIOS" }, 400);

    const { data: companies, error: companyError } = await admin.from("erp_empresas")
      .select("id,razao_social,nome_fantasia,codigo,slug,cnpj,ativo,plano,plano_status")
      .or(`codigo.eq.${empresa},slug.eq.${empresa},cnpj.eq.${empresa},nome_fantasia.ilike.${empresa},razao_social.ilike.${empresa}`)
      .limit(2);
    if (companyError) { console.error("ERP_LOGIN_COMPANY_ERROR", companyError); return json({ ok: false, error: "EMPRESA_LOOKUP_ERROR" }, 500); }
    const company = companies?.length === 1 ? companies[0] : null;
    if (!company || !company.ativo) return json({ ok: false, error: "EMPRESA_INVALIDA" }, 401);
    const status = norm(company.plano_status);
    if (!["", "trial", "ativo", "active"].includes(status)) return json({ ok: false, error: "ASSINATURA_BLOQUEADA", status: company.plano_status }, 403);

    const { data: users, error: userError } = await admin.from("erp_usuarios")
      .select("id,empresa_id,auth_user_id,nome,email,nivel_admin,ativo,setor_id,cargo_id,matricula,login_nome")
      .eq("empresa_id", company.id).eq("ativo", true)
      .or(`email.eq.${login},login_nome.eq.${login}`).limit(2);
    if (userError) { console.error("ERP_LOGIN_USER_ERROR", userError); return json({ ok: false, error: "USUARIO_LOOKUP_ERROR" }, 500); }
    if (!users || users.length !== 1) return json({ ok: false, error: "CREDENCIAIS_INVALIDAS" }, 401);
    const profile = users[0];
    if (!profile.auth_user_id) return json({ ok: false, error: "USUARIO_NAO_VINCULADO" }, 401);
    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(profile.auth_user_id);
    if (authUserError || !authUserData.user) return json({ ok: false, error: "AUTH_USUARIO_NAO_ENCONTRADO" }, 401);
    if (authUserData.user.banned_until && new Date(authUserData.user.banned_until).getTime() > Date.now()) return json({ ok: false, error: "USUARIO_BLOQUEADO" }, 403);
    const authEmail = authUserData.user.email || profile.email;
    if (!authEmail) return json({ ok: false, error: "EMAIL_AUTH_NAO_CONFIGURADO" }, 401);
    const { data: authData, error: authError } = await auth.auth.signInWithPassword({ email: authEmail, password });
    if (authError || !authData.session || !authData.user) return json({ ok: false, error: "CREDENCIAIS_INVALIDAS" }, 401);
    return json({ ok: true, session: authData.session, user: profile, empresa: company });
  } catch (error) {
    console.error("ERP_LOGIN_ERROR", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "LOGIN_ERROR" }, 500);
  }
});
