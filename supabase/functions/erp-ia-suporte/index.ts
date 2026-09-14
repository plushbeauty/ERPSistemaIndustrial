import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type":
    "application/json; charset=utf-8",
};

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders,
    },
  );
}

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        ok: false,
        error:
          "METHOD_NOT_ALLOWED",
      },
      405,
    );
  }

  const url =
    Deno.env.get(
      "SUPABASE_URL",
    );

  const serviceRole =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  if (!url || !serviceRole) {
    return json(
      {
        ok: false,
        error:
          "SERVER_CONFIGURATION_ERROR",
      },
      500,
    );
  }

  const db =
    createClient(
      url,
      serviceRole,
      {
        auth: {
          persistSession:
            false,
          autoRefreshToken:
            false,
        },
      },
    );

  try {
    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return json(
        {
          ok: false,
          error:
            "AUTH_REQUIRED",
        },
        401,
      );
    }

    const token =
      authorization.slice(7);

    const {
      data: authData,
      error: authError,
    } =
      await db.auth.getUser(
        token,
      );

    if (
      authError ||
      !authData.user
    ) {
      return json(
        {
          ok: false,
          error:
            "AUTH_INVALID",
        },
        401,
      );
    }

    const {
      data: profile,
      error:
        profileError,
    } =
      await db
        .from(
          "erp_usuarios",
        )
        .select(
          "id,empresa_id,ativo",
        )
        .eq(
          "auth_user_id",
          authData.user.id,
        )
        .eq(
          "ativo",
          true,
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return json(
        {
          ok: false,
          error:
            "ERP_PROFILE_REQUIRED",
        },
        403,
      );
    }

    const body =
      await req.json();

    const pergunta =
      text(
        body?.pergunta ??
          body?.question,
      );

    const modulo =
      text(
        body?.modulo ??
          body?.module,
      );

    if (!pergunta) {
      return json(
        {
          ok: false,
          error:
            "PERGUNTA_REQUIRED",
        },
        400,
      );
    }

    const {
      data: manual,
      error: manualError,
    } =
      await db
        .from(
          "erp_manual_ia",
        )
        .select(
          "id,modulo,titulo,conteudo,link_acao,texto_acao",
        )
        .eq(
          "ativo",
          true,
        )
        .eq(
          "empresa_id",
          profile.empresa_id,
        )
        .ilike(
          "modulo",
          modulo
            ? `%${modulo}%`
            : "%",
        )
        .limit(8);

    if (manualError) {
      console.error(
        "RAG_MANUAL_ERROR",
        manualError,
      );

      return json(
        {
          ok: false,
          error:
            "MANUAL_LOOKUP_ERROR",
        },
        500,
      );
    }

    const fallback =
      !manual?.length
        ? await db
            .from(
              "erp_manual_ia",
            )
            .select(
              "id,modulo,titulo,conteudo,link_acao,texto_acao",
            )
            .eq(
              "ativo",
              true,
            )
            .is(
              "empresa_id",
              null,
            )
            .limit(8)
        : null;

    const results =
      manual?.length
        ? manual
        : fallback?.data ??
          [];

    return json({
      ok: true,
      pergunta,
      modulo:
        modulo || null,
      contexto: results,
      resposta:
        results.length
          ? "Encontrei conteúdo relacionado no manual do ERP."
          : "Não encontrei conteúdo suficiente no manual para responder com segurança.",
      linkAcao:
        results[0]
          ?.link_acao ??
        null,
      textoAcao:
        results[0]
          ?.texto_acao ??
        null,
    });
  } catch (error) {
    console.error(
      "ERP_IA_SUPORTE_ERROR",
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "IA_SUPPORT_ERROR",
      },
      500,
    );
  }
});
