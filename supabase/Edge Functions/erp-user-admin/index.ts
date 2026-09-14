// Supabase Edge Function
// Nome: erp-user-admin
// Arquivo: supabase/functions/erp-user-admin/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type Actor = {
  id: string;
  empresa_id: string | null;
  nome: string;
  email: string | null;
  nivel_admin: number;
  ativo: boolean;
  auth_user_id: string | null;
};

const USER_SELECT = [
  "id",
  "empresa_id",
  "auth_user_id",
  "nome",
  "email",
  "nivel_admin",
  "ativo",
  "created_at",
  "setor_id",
  "cargo_id",
  "matricula",
  "login_nome",
].join(",");

async function authenticateActor(
  req: Request,
  db: ReturnType<typeof createClient>,
): Promise<Actor> {
  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const token = authorization.slice(7);

  const { data, error } = await db.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("AUTH_INVALID");
  }

  const { data: profile, error: profileError } = await db
    .from("erp_usuarios")
    .select(USER_SELECT)
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.ativo) {
    throw new Error("ERP_PROFILE_REQUIRED");
  }

  if (Number(profile.nivel_admin ?? 0) < 9) {
    throw new Error("ADMIN_FORBIDDEN");
  }

  return profile as Actor;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      { ok: false, error: "METHOD_NOT_ALLOWED" },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          ok: false,
          error: "SERVER_CONFIGURATION_ERROR",
        },
        500,
      );
    }

    const db = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const actor = await authenticateActor(req, db);

    const body = await req.json();
    const action = text(body?.action);

    // LISTAR USUÁRIOS
    if (action === "list_users") {
      const empresaId =
        actor.empresa_id;

      if (!empresaId) {
        throw new Error("EMPRESA_REQUIRED");
      }

      const { data, error } = await db
        .from("erp_usuarios")
        .select(USER_SELECT)
        .eq("empresa_id", empresaId)
        .order("nome");

      if (error) {
        throw error;
      }

      return json({
        ok: true,
        users: data ?? [],
      });
    }

    // CRIAR USUÁRIO
    if (action === "create_user") {
      const empresaId = actor.empresa_id;

      if (!empresaId) {
        throw new Error("EMPRESA_REQUIRED");
      }

      const nome = text(body?.nome);
      const email = text(body?.email).toLowerCase();
      const password =
        typeof body?.password === "string"
          ? body.password
          : "";

      if (
        !nome ||
        !email ||
        !email.includes("@") ||
        password.length < 8
      ) {
        throw new Error(
          "DADOS_USUARIO_INVALIDOS",
        );
      }

      const { data: authCreated, error: authError } =
        await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            empresa_id: empresaId,
            nome,
          },
        });

      if (authError || !authCreated.user) {
        throw (
          authError ??
          new Error("AUTH_CREATE_FAILED")
        );
      }

      const payload = {
        empresa_id: empresaId,
        auth_user_id: authCreated.user.id,
        nome,
        email,
        nivel_admin: Math.min(
          Math.max(
            Number(body?.nivel_admin ?? 1),
            1,
          ),
          9,
        ),
        ativo: true,
        setor_id: body?.setor_id || null,
        cargo_id: body?.cargo_id || null,
        matricula: text(body?.matricula) || null,
        login_nome:
          text(body?.login_nome) ||
          email.split("@")[0],
      };

      const { data, error } = await db
        .from("erp_usuarios")
        .insert(payload)
        .select(USER_SELECT)
        .single();

      if (error) {
        await db.auth.admin.deleteUser(
          authCreated.user.id,
        );
        throw error;
      }

      return json({
        ok: true,
        user: data,
      });
    }

    // ALTERAR USUÁRIO
    if (action === "update_user") {
      const userId = text(body?.user_id);

      if (!userId) {
        throw new Error("USER_ID_REQUIRED");
      }

      const { data: current, error: currentError } =
        await db
          .from("erp_usuarios")
          .select(USER_SELECT)
          .eq("id", userId)
          .single();

      if (currentError || !current) {
        throw new Error("USER_NOT_FOUND");
      }

      if (
        current.empresa_id !==
        actor.empresa_id
      ) {
        throw new Error("TENANT_FORBIDDEN");
      }

      const patch: Record<string, unknown> = {};

      if (body?.nome !== undefined) {
        patch.nome = text(body.nome);
      }

      if (body?.email !== undefined) {
        patch.email = text(body.email).toLowerCase();
      }

      if (body?.nivel_admin !== undefined) {
        patch.nivel_admin = Math.min(
          Math.max(
            Number(body.nivel_admin),
            1,
          ),
          9,
        );
      }

      if (body?.setor_id !== undefined) {
        patch.setor_id =
          body.setor_id || null;
      }

      if (body?.cargo_id !== undefined) {
        patch.cargo_id =
          body.cargo_id || null;
      }

      if (body?.matricula !== undefined) {
        patch.matricula =
          text(body.matricula) || null;
      }

      if (body?.login_nome !== undefined) {
        patch.login_nome =
          text(body.login_nome) || null;
      }

      if (body?.ativo !== undefined) {
        patch.ativo = Boolean(body.ativo);
      }

      const { data, error } = await db
        .from("erp_usuarios")
        .update(patch)
        .eq("id", userId)
        .select(USER_SELECT)
        .single();

      if (error) {
        throw error;
      }

      if (current.auth_user_id) {
        const authPatch: Record<
          string,
          unknown
        > = {};

        if (body?.email !== undefined) {
          authPatch.email =
            text(body.email).toLowerCase();
          authPatch.email_confirm = true;
        }

        if (body?.password !== undefined) {
          const password = String(
            body.password,
          );

          if (password.length < 8) {
            throw new Error(
              "PASSWORD_TOO_SHORT",
            );
          }

          authPatch.password = password;
        }

        if (body?.ativo === false) {
          authPatch.ban_duration =
            "876000h";
        }

        if (body?.ativo === true) {
          authPatch.ban_duration = "none";
        }

        if (
          Object.keys(authPatch).length
        ) {
          const { error: authUpdateError } =
            await db.auth.admin.updateUserById(
              current.auth_user_id,
              authPatch,
            );

          if (authUpdateError) {
            throw authUpdateError;
          }
        }
      }

      return json({
        ok: true,
        user: data,
      });
    }

    // EXCLUSÃO LÓGICA
    if (action === "delete_user") {
      const userId = text(body?.user_id);

      if (!userId) {
        throw new Error("USER_ID_REQUIRED");
      }

      const { data: current, error } =
        await db
          .from("erp_usuarios")
          .select(USER_SELECT)
          .eq("id", userId)
          .single();

      if (error || !current) {
        throw new Error("USER_NOT_FOUND");
      }

      if (
        current.empresa_id !==
        actor.empresa_id
      ) {
        throw new Error("TENANT_FORBIDDEN");
      }

      if (
        current.auth_user_id ===
        actor.auth_user_id
      ) {
        throw new Error(
          "CANNOT_DELETE_SELF",
        );
      }

      const { data, error: updateError } =
        await db
          .from("erp_usuarios")
          .update({
            ativo: false,
          })
          .eq("id", userId)
          .select(USER_SELECT)
          .single();

      if (updateError) {
        throw updateError;
      }

      if (current.auth_user_id) {
        const { error: banError } =
          await db.auth.admin.updateUserById(
            current.auth_user_id,
            {
              ban_duration: "876000h",
            },
          );

        if (banError) {
          throw banError;
        }
      }

      return json({
        ok: true,
        user: data,
      });
    }

    throw new Error("UNKNOWN_ACTION");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "INTERNAL_ERROR";

    let status = 400;

    if (
      [
        "AUTH_REQUIRED",
        "AUTH_INVALID",
        "ERP_PROFILE_REQUIRED",
      ].includes(message)
    ) {
      status = 401;
    }

    if (
      [
        "ADMIN_FORBIDDEN",
        "TENANT_FORBIDDEN",
        "CANNOT_DELETE_SELF",
      ].includes(message)
    ) {
      status = 403;
    }

    return json(
      {
        ok: false,
        error: message,
      },
      status,
    );
  }
});
