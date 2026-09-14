import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders,
    },
  );
}

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function escapePostgrestValue(
  value: string,
): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll(",", "\\,");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders,
      },
    );
  }

  if (req.method !== "POST") {
    return json(
      {
        ok: false,
        error: "METHOD_NOT_ALLOWED",
      },
      405,
    );
  }

  try {
    const body = await req.json();

    const empresa = cleanString(
      body?.empresa,
    );

    const identificador = cleanString(
      body?.identificador,
    );

    const senha =
      typeof body?.senha === "string"
        ? body.senha
        : "";

    if (
      !empresa ||
      !identificador ||
      !senha
    ) {
      return json(
        {
          ok: false,
          error:
            "CREDENCIAIS_OBRIGATORIAS",
        },
        400,
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return json(
        {
          ok: false,
          error:
            "SERVER_CONFIGURATION_ERROR",
        },
        500,
      );
    }

    const adminHeaders = {
      apikey: serviceRoleKey,
      Authorization:
        `Bearer ${serviceRoleKey}`,
      "Content-Type":
        "application/json",
    };

    const companyValue =
      escapePostgrestValue(
        empresa,
      );

    const companyUrl =
      `${supabaseUrl}/rest/v1/erp_empresas` +
      `?select=` +
      [
        "id",
        "razao_social",
        "nome_fantasia",
        "ativo",
        "status",
        "plano_status",
        "subscription_status",
        "plan_type",
        "subscription_ends_at",
      ].join(",") +
      `&or=` +
      `(nome_fantasia.ilike.${encodeURIComponent(
        companyValue,
      )},` +
      `razao_social.ilike.${encodeURIComponent(
        companyValue,
      )})` +
      `&limit=1`;

    const companyResponse =
      await fetch(
        companyUrl,
        {
          headers: adminHeaders,
        },
      );

    if (!companyResponse.ok) {
      return json(
        {
          ok: false,
          error:
            "EMPRESA_LOOKUP_FAILED",
        },
        502,
      );
    }

    const companies =
      await companyResponse.json();

    const company =
      Array.isArray(companies)
        ? companies[0]
        : null;

    if (
      !company ||
      company.ativo !== true
    ) {
      return json(
        {
          ok: false,
          error: "EMPRESA_INATIVA",
        },
        403,
      );
    }

    const subscriptionStatus =
      String(
        company.subscription_status ??
          "",
      ).toLowerCase();

    const legacyPlanStatus =
      String(
        company.plano_status ?? "",
      ).toLowerCase();

    const blockedStatuses =
      new Set([
        "canceled",
        "cancelled",
        "past_due",
        "cancelado",
        "cancelada",
        "inadimplente",
        "atrasado",
      ]);

    if (
      blockedStatuses.has(
        subscriptionStatus,
      ) ||
      blockedStatuses.has(
        legacyPlanStatus,
      )
    ) {
      return json(
        {
          ok: false,
          error:
            "ASSINATURA_BLOQUEADA",
        },
        403,
      );
    }

    if (
      company.subscription_ends_at
    ) {
      const endsAt =
        new Date(
          company.subscription_ends_at,
        ).getTime();

      if (
        !Number.isNaN(endsAt) &&
        endsAt < Date.now()
      ) {
        return json(
          {
            ok: false,
            error:
              "ASSINATURA_EXPIRADA",
          },
          403,
        );
      }
    }

    const identifierValue =
      escapePostgrestValue(
        identificador,
      );

    const userUrl =
      `${supabaseUrl}/rest/v1/erp_usuarios` +
      `?select=` +
      [
        "id",
        "empresa_id",
        "nome",
        "email",
        "perfil",
        "ativo",
        "criado_em",
        "auth_user_id",
        "nivel_admin",
        "setor_id",
        "role_id",
        "is_master",
        "deleted_at",
        "username",
      ].join(",") +
      `&empresa_id=eq.${company.id}` +
      `&or=` +
      `(email.ilike.${encodeURIComponent(
        identifierValue,
      )},` +
      `username.ilike.${encodeURIComponent(
        identifierValue,
      )},` +
      `nome.ilike.${encodeURIComponent(
        identifierValue,
      )})` +
      `&limit=1`;

    const userResponse =
      await fetch(
        userUrl,
        {
          headers: adminHeaders,
        },
      );

    if (!userResponse.ok) {
      return json(
        {
          ok: false,
          error:
            "USER_LOOKUP_FAILED",
        },
        502,
      );
    }

    const users =
      await userResponse.json();

    const profile =
      Array.isArray(users)
        ? users[0]
        : null;

    if (
      !profile ||
      profile.ativo !== true ||
      profile.deleted_at ||
      !profile.auth_user_id ||
      !profile.email
    ) {
      return json(
        {
          ok: false,
          error:
            "CREDENCIAIS_INVALIDAS",
        },
        401,
      );
    }

    const authResponse =
      await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: profile.email,
            password: senha,
          }),
        },
      );

    const authPayload =
      await authResponse
        .json()
        .catch(() => ({}));

    if (
      !authResponse.ok ||
      !authPayload?.access_token ||
      !authPayload?.refresh_token
    ) {
      return json(
        {
          ok: false,
          error:
            "CREDENCIAIS_INVALIDAS",
        },
        401,
      );
    }

    return json({
      ok: true,

      session: {
        access_token:
          authPayload.access_token,

        refresh_token:
          authPayload.refresh_token,

        expires_in:
          authPayload.expires_in,

        expires_at:
          authPayload.expires_at,

        token_type:
          authPayload.token_type ??
          "bearer",

        user:
          authPayload.user,
      },

      access_token:
        authPayload.access_token,

      refresh_token:
        authPayload.refresh_token,

      profile: {
        id: profile.id,
        empresa_id:
          profile.empresa_id,
        empresa_nome:
          company.nome_fantasia ||
          company.razao_social,
        nome: profile.nome,
        email: profile.email,
        perfil: profile.perfil,
        nivel_admin:
          profile.nivel_admin,
        setor_id:
          profile.setor_id,
        role_id:
          profile.role_id,
        is_master:
          profile.is_master,
      },
    });
  } catch (error) {
    console.error(
      "erp-login error",
      error,
    );

    return json(
      {
        ok: false,
        error:
          "LOGIN_INTERNAL_ERROR",
      },
      500,
    );
  }
});
