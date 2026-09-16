import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL não configurada.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
}

const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

interface LoginRequest {
  email: string;
  password: string;
}

interface ErpUsuario {
  id: string;
  email: string;
  empresa_id: string;
  role: string;
}

interface LoginResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number | null;
    token_type: string;
  };
  user: {
    id: string;
    email: string | null;
    app_metadata: Record<string, unknown>;
  };
  profile: ErpUsuario;
}

function jsonResponse(
  body: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseLoginRequest(body: unknown): LoginRequest {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error("Corpo da requisição inválido.");
  }

  const record = body as Record<string, unknown>;

  const keys = Object.keys(record);

  if (
    keys.length !== 2 ||
    !keys.includes("email") ||
    !keys.includes("password")
  ) {
    throw new Error(
      "A requisição deve conter somente email e password.",
    );
  }

  if (
    typeof record.email !== "string" ||
    typeof record.password !== "string"
  ) {
    throw new Error("Email e password devem ser textos.");
  }

  const email = record.email.trim();
  const password = record.password;

  if (!email) {
    throw new Error("Email obrigatório.");
  }

  if (!password) {
    throw new Error("Password obrigatória.");
  }

  return {
    email,
    password,
  };
}

async function autenticarUsuario(
  email: string,
  password: string,
) {
  const { data, error } =
    await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !data.user || !data.session) {
    throw new Error("Email ou senha inválidos.");
  }

  return data;
}

async function buscarPerfilReal(
  userId: string,
): Promise<ErpUsuario> {
  const { data, error } = await supabaseAdmin
    .from("erp_usuarios")
    .select("id, email, empresa_id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao consultar erp_usuarios:", error);
    throw new Error("Não foi possível consultar o perfil do usuário.");
  }

  if (!data) {
    throw new Error(
      "Usuário autenticado não possui perfil ERP.",
    );
  }

  const perfil = data as ErpUsuario;

  if (!isValidUuid(perfil.id)) {
    throw new Error("Perfil ERP possui id inválido.");
  }

  if (!isValidUuid(perfil.empresa_id)) {
    throw new Error("Perfil ERP possui empresa_id inválido.");
  }

  if (typeof perfil.email !== "string" || !perfil.email.trim()) {
    throw new Error("Perfil ERP possui email inválido.");
  }

  if (typeof perfil.role !== "string" || !perfil.role.trim()) {
    throw new Error("Perfil ERP possui role inválida.");
  }

  if (perfil.id !== userId) {
    throw new Error("Perfil ERP não corresponde ao usuário autenticado.");
  }

  return perfil;
}

async function atualizarAppMetadata(
  userId: string,
  empresaId: string,
  role: string,
  existingMetadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const appMetadata: Record<string, unknown> = {
    ...existingMetadata,
    empresa_id: empresaId,
    role,
  };

  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: appMetadata,
      },
    );

  if (error || !data.user) {
    console.error("Erro ao atualizar app_metadata:", error);
    throw new Error(
      "Não foi possível atualizar as claims de autorização.",
    );
  }

  return data.user.app_metadata ?? appMetadata;
}

async function renovarSessao(
  refreshToken: string,
) {
  const { data, error } =
    await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

  if (error || !data.session || !data.user) {
    console.error("Erro ao renovar sessão:", error);
    throw new Error(
      "Não foi possível renovar a sessão após atualizar as claims.",
    );
  }

  return data;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Método não permitido.",
      },
      405,
    );
  }

  try {
    const rawBody: unknown = await req.json();

    const { email, password } =
      parseLoginRequest(rawBody);

    const authentication =
      await autenticarUsuario(email, password);

    const authenticatedUser =
      authentication.user;

    const initialSession =
      authentication.session;

    const profile =
      await buscarPerfilReal(authenticatedUser.id);

    if (profile.id !== authenticatedUser.id) {
      return jsonResponse(
        {
          error:
            "O perfil ERP não corresponde ao usuário autenticado.",
        },
        403,
      );
    }

    const existingAppMetadata: Record<string, unknown> =
      authenticatedUser.app_metadata ?? {};

    const updatedAppMetadata =
      await atualizarAppMetadata(
        authenticatedUser.id,
        profile.empresa_id,
        profile.role,
        existingAppMetadata,
      );

    const refreshed =
      await renovarSessao(
        initialSession.refresh_token,
      );

    const refreshedUser =
      refreshed.user;

    if (refreshedUser.id !== profile.id) {
      return jsonResponse(
        {
          error:
            "A sessão renovada não corresponde ao perfil ERP.",
        },
        403,
      );
    }

    const refreshedAppMetadata: Record<string, unknown> =
      refreshedUser.app_metadata ?? updatedAppMetadata;

    if (
      refreshedAppMetadata.empresa_id !==
      profile.empresa_id
    ) {
      return jsonResponse(
        {
          error:
            "A sessão renovada não contém a empresa_id esperada.",
        },
        500,
      );
    }

    if (
      refreshedAppMetadata.role !==
      profile.role
    ) {
      return jsonResponse(
        {
          error:
            "A sessão renovada não contém a role esperada.",
        },
        500,
      );
    }

    const response: LoginResponse = {
      session: {
        access_token: refreshed.session.access_token,
        refresh_token: refreshed.session.refresh_token,
        expires_in: refreshed.session.expires_in,
        expires_at: refreshed.session.expires_at ?? null,
        token_type: refreshed.session.token_type,
      },
      user: {
        id: refreshedUser.id,
        email: refreshedUser.email ?? null,
        app_metadata: refreshedAppMetadata,
      },
      profile,
    };

    return jsonResponse(response, 200);
  } catch (error: unknown) {
    console.error("Falha no login ERP:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Falha interna de autenticação.";

    return jsonResponse(
      {
        error: message,
      },
      400,
    );
  }
});
