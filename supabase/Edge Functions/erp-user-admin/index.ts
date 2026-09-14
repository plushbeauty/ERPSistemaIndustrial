import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type SupabaseClient,
} from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type":
    "application/json",
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

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

type Actor = {
  id: string;
  empresa_id: string | null;
  nome: string;
  email: string | null;
  perfil: string | null;
  nivel_admin: number;
  is_master: boolean;
  ativo: boolean;
  deleted_at: string | null;
};

async function authenticateActor(
  req: Request,
  db: SupabaseClient,
): Promise<Actor> {
  const authorization =
    req.headers.get(
      "Authorization",
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const token =
    authorization.slice(7);

  const {
    data: authData,
    error: authError,
  } = await db.auth.getUser(token);

  if (
    authError ||
    !authData.user
  ) {
    throw new Error(
      "AUTH_INVALID",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await db
    .from("erp_usuarios")
    .select(
      [
        "id",
        "empresa_id",
        "nome",
        "email",
        "perfil",
        "nivel_admin",
        "is_master",
        "ativo",
        "deleted_at",
      ].join(","),
    )
    .eq(
      "auth_user_id",
      authData.user.id,
    )
    .is(
      "deleted_at",
      null,
    )
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.ativo
  ) {
    throw new Error(
      "ERP_PROFILE_REQUIRED",
    );
  }

  if (
    !profile.is_master &&
    Number(
      profile.nivel_admin ?? 0,
    ) < 9
  ) {
    throw new Error(
      "ADMIN_FORBIDDEN",
    );
  }

  return profile as Actor;
}

async function writeAudit(
  db: SupabaseClient,
  actor: Actor,
  action: string,
  entityId: string | null,
  oldData: unknown,
  newData: unknown,
) {
  const payload = {
    company_id:
      actor.empresa_id,
    user_id: actor.id,
    action,
    module: "usuarios",
    entity: "erp_usuarios",
    entity_id: entityId,
    old_data: oldData,
    new_data: newData,
  };

  const {
    error,
  } = await db
    .from("erp_audit_logs")
    .insert(payload);

  if (error) {
    console.error(
      "AUDIT_LOG_ERROR",
      error,
    );
  }
}

const USER_SELECT = [
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
].join(",");

async function provisionPlastibor(
  db: SupabaseClient,
  actor: Actor,
) {
  if (!actor.is_master) {
    throw new Error(
      "MASTER_REQUIRED",
    );
  }

  const companyId =
    "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22";

  const {
    data: company,
    error: companyError,
  } = await db
    .from("erp_empresas")
    .select(
      "id,razao_social,nome_fantasia",
    )
    .eq("id", companyId)
    .single();

  if (
    companyError ||
    !company
  ) {
    throw new Error(
      "PLASTIBOR_NOT_FOUND",
    );
  }

  const {
    data: sectors,
    error: sectorError,
  } = await db
    .from("erp_setores")
    .select(
      "id,codigo,nome,ativo",
    )
    .eq(
      "empresa_id",
      companyId,
    )
    .eq(
      "ativo",
      true,
    )
    .order("nome");

  if (sectorError) {
    throw sectorError;
  }

  const desiredUsers = [
    {
      sector: "ADM",
      username: "ADM_Vandinha",
      email:
        "vanda@transforbater.com.br",
      perfil: "admin",
      nivel: 9,
    },
    {
      sector: "Comercial",
      username: "PLComercial",
      email:
        "plcomercial@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
    {
      sector: "Compras",
      username: "PLCompras",
      email:
        "plcompras@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
    {
      sector: "Qualidade",
      username: "PLQualidade",
      email:
        "plqualidade@transforbater.com.br",
      perfil: "supervisor",
      nivel: 4,
    },
    {
      sector: "Estoque",
      username: "PLEstoque",
      email:
        "plestoque@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
    {
      sector: "Expedição",
      username: "PLExpedicao",
      email:
        "plexpedicao@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
    {
      sector: "Financeiro",
      username: "PLFinanceiro",
      email:
        "plfinanceiro@transforbater.com.br",
      perfil: "operador",
      nivel: 3,
    },
    {
      sector: "Fiscal",
      username: "PLFiscal",
      email:
        "plfiscal@transforbater.com.br",
      perfil: "operador",
      nivel: 3,
    },
    {
      sector: "Manutenção",
      username: "PLManutencao",
      email:
        "plmanutencao@transforbater.com.br",
      perfil: "supervisor",
      nivel: 4,
    },
    {
      sector: "PCP",
      username: "PLPCP",
      email:
        "plpcp@transforbater.com.br",
      perfil: "supervisor",
      nivel: 4,
    },
    {
      sector: "Produção",
      username: "PLProducao",
      email:
        "plproducao@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
    {
      sector: "RH",
      username: "PLRH",
      email:
        "plrh@transforbater.com.br",
      perfil: "operador",
      nivel: 2,
    },
  ];

  const provisionPassword =
    Deno.env.get(
      "ERP_PROVISION_PASSWORD",
    );

  if (
    !provisionPassword ||
    provisionPassword.length < 8
  ) {
    throw new Error(
      "ERP_PROVISION_PASSWORD_NOT_CONFIGURED",
    );
  }

  const createdUsers: unknown[] = [];

  for (
    const desired of desiredUsers
  ) {
    const sector =
      sectors?.find(
        (item) =>
          String(
            item.nome,
          ).toLowerCase() ===
          desired.sector.toLowerCase(),
      );

    if (!sector) {
      throw new Error(
        `SETOR_NAO_ENCONTRADO:${desired.sector}`,
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await db
      .from("erp_usuarios")
      .select(
        "id,auth_user_id",
      )
      .eq(
        "empresa_id",
        companyId,
      )
      .or(
        `email.eq.${desired.email},username.eq.${desired.username}`,
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let authUserId =
      existing?.auth_user_id ??
      null;

    if (!authUserId) {
      const {
        data: authCreated,
        error: authError,
      } =
        await db.auth.admin.createUser(
          {
            email:
              desired.email,
            password:
              provisionPassword,
            email_confirm: true,
            user_metadata: {
              empresa_id:
                companyId,
              username:
                desired.username,
              nome:
                desired.username,
            },
          },
        );

      if (
        authError ||
        !authCreated.user
      ) {
        throw (
          authError ??
          new Error(
            `AUTH_CREATE_FAILED:${desired.email}`,
          )
        );
      }

      authUserId =
        authCreated.user.id;
    } else {
      const {
        error: authUpdateError,
      } =
        await db.auth.admin.updateUserById(
          authUserId,
          {
            password:
              provisionPassword,
            email:
              desired.email,
            email_confirm: true,
            ban_duration: "none",
          },
        );

      if (authUpdateError) {
        throw authUpdateError;
      }
    }

    const payload = {
      empresa_id:
        companyId,
      nome:
        desired.username,
      email:
        desired.email,
      username:
        desired.username,
      perfil:
        desired.perfil,
      nivel_admin:
        desired.nivel,
      setor_id:
        sector.id,
      auth_user_id:
        authUserId,
      ativo: true,
      is_master: false,
      deleted_at: null,
      updated_at:
        new Date().toISOString(),
    };

    let row: unknown;

    if (existing?.id) {
      const {
        data,
        error,
      } = await db
        .from("erp_usuarios")
        .update(payload)
        .eq(
          "id",
          existing.id,
        )
        .select(USER_SELECT)
        .single();

      if (error) {
        throw error;
      }

      row = data;
    } else {
      const {
        data,
        error,
      } = await db
        .from("erp_usuarios")
        .insert(payload)
        .select(USER_SELECT)
        .single();

      if (error) {
        throw error;
      }

      row = data;
    }

    createdUsers.push(row);
  }

  await writeAudit(
    db,
    actor,
    "provision_plastibor",
    companyId,
    null,
    {
      users:
        createdUsers.length,
    },
  );

  return {
    company,
    users:
      createdUsers,
  };
}

Deno.serve(
  async (
    req: Request,
  ) => {
    if (
      req.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders,
        },
      );
    }

    if (
      req.method !== "POST"
    ) {
      return json(
        {
          ok: false,
          error:
            "METHOD_NOT_ALLOWED",
        },
        405,
      );
    }

    try {
      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL",
        );

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

      const db =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken:
                false,
              persistSession:
                false,
            },
          },
        );

      const actor =
        await authenticateActor(
          req,
          db,
        );

      const body =
        await req.json();

      const action =
        text(body?.action);

      if (
        action ===
        "list_users"
      ) {
        const targetCompanyId =
          actor.is_master &&
          body?.empresa_id
            ? text(
                body.empresa_id,
              )
            : actor.empresa_id;

        if (!targetCompanyId) {
          throw new Error(
            "EMPRESA_REQUIRED",
          );
        }

        const {
          data,
          error,
        } = await db
          .from("erp_usuarios")
          .select(USER_SELECT)
          .eq(
            "empresa_id",
            targetCompanyId,
          )
          .order("nome");

        if (error) {
          throw error;
        }

        return json({
          ok: true,
          users:
            data ?? [],
        });
      }

      if (
        action ===
        "create_user"
      ) {
        const companyId =
          actor.is_master &&
          body?.empresa_id
            ? text(
                body.empresa_id,
              )
            : actor.empresa_id;

        if (!companyId) {
          throw new Error(
            "EMPRESA_REQUIRED",
          );
        }

        const nome =
          text(body?.nome);

        const email =
          text(body?.email)
            .toLowerCase();

        const password =
          typeof body?.password ===
          "string"
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

        const {
          data: authCreated,
          error: authError,
        } =
          await db.auth.admin.createUser(
            {
              email,
              password,
              email_confirm: true,
              user_metadata: {
                empresa_id:
                  companyId,
                nome,
              },
            },
          );

        if (
          authError ||
          !authCreated.user
        ) {
          throw (
            authError ??
            new Error(
              "AUTH_CREATE_FAILED",
            )
          );
        }

        const payload = {
          empresa_id:
            companyId,
          nome,
          email,
          username:
            text(
              body?.username,
            ) ||
            email.split(
              "@",
            )[0],
          perfil:
            text(
              body?.perfil,
            ) ||
            "operador",
          nivel_admin:
            Number(
              body?.nivel_admin ??
                1,
            ),
          setor_id:
            body?.setor_id ||
            null,
          auth_user_id:
            authCreated.user
              .id,
          ativo: true,
          is_master: false,
          deleted_at:
            null,
          updated_at:
            new Date().toISOString(),
        };

        const {
          data,
          error,
        } = await db
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

        await writeAudit(
          db,
          actor,
          "create_user",
          data.id,
          null,
          data,
        );

        return json({
          ok: true,
          user: data,
        });
      }

      if (
        action ===
        "update_user"
      ) {
        const userId =
          text(
            body?.user_id,
          );

        if (!userId) {
          throw new Error(
            "USER_ID_REQUIRED",
          );
        }

        const {
          data: current,
          error: currentError,
        } = await db
          .from("erp_usuarios")
          .select(USER_SELECT)
          .eq(
            "id",
            userId,
          )
          .single();

        if (
          currentError ||
          !current
        ) {
          throw new Error(
            "USER_NOT_FOUND",
          );
        }

        if (
          !actor.is_master &&
          current.empresa_id !==
            actor.empresa_id
        ) {
          throw new Error(
            "TENANT_FORBIDDEN",
          );
        }

        if (
          current.is_master &&
          !actor.is_master
        ) {
          throw new Error(
            "MASTER_PROTECTED",
          );
        }

        const patch: Record<
          string,
          unknown
        > = {
          updated_at:
            new Date().toISOString(),
        };

        if (
          body?.nome !==
          undefined
        ) {
          patch.nome =
            text(body.nome);
        }

        if (
          body?.email !==
          undefined
        ) {
          patch.email =
            text(
              body.email,
            ).toLowerCase();
        }

        if (
          body?.perfil !==
          undefined
        ) {
          patch.perfil =
            text(
              body.perfil,
            );
        }

        if (
          body?.nivel_admin !==
          undefined
        ) {
          patch.nivel_admin =
            Number(
              body.nivel_admin,
            );
        }

        if (
          body?.setor_id !==
          undefined
        ) {
          patch.setor_id =
            body.setor_id ||
            null;
        }

        if (
          body?.ativo !==
          undefined
        ) {
          patch.ativo =
            Boolean(
              body.ativo,
            );
        }

        const {
          data,
          error,
        } = await db
          .from("erp_usuarios")
          .update(patch)
          .eq(
            "id",
            userId,
          )
          .select(USER_SELECT)
          .single();

        if (error) {
          throw error;
        }

        if (
          current.auth_user_id
        ) {
          const authPatch: Record<
            string,
            unknown
          > = {};

          if (
            body?.email
          ) {
            authPatch.email =
              text(
                body.email,
              ).toLowerCase();

            authPatch.email_confirm =
              true;
          }

          if (
            body?.password
          ) {
            if (
              String(
                body.password,
              ).length < 8
            ) {
              throw new Error(
                "PASSWORD_TOO_SHORT",
              );
            }

            authPatch.password =
              body.password;
          }

          if (
            body?.ativo ===
            false
          ) {
            authPatch.ban_duration =
              "876000h";
          }

          if (
            body?.ativo ===
            true
          ) {
            authPatch.ban_duration =
              "none";
          }

          if (
            Object.keys(
              authPatch,
            ).length
          ) {
            const {
              error:
                authError,
            } =
              await db.auth.admin.updateUserById(
                current.auth_user_id,
                authPatch,
              );

            if (authError) {
              throw authError;
            }
          }
        }

        await writeAudit(
          db,
          actor,
          "update_user",
          userId,
          current,
          data,
        );

        return json({
          ok: true,
          user: data,
        });
      }

      if (
        action ===
        "delete_user"
      ) {
        const userId =
          text(
            body?.user_id,
          );

        if (!userId) {
          throw new Error(
            "USER_ID_REQUIRED",
          );
        }

        const {
          data: current,
          error: currentError,
        } = await db
          .from("erp_usuarios")
          .select(USER_SELECT)
          .eq(
            "id",
            userId,
          )
          .single();

        if (
          currentError ||
          !current
        ) {
          throw new Error(
            "USER_NOT_FOUND",
          );
        }

        if (
          !actor.is_master &&
          current.empresa_id !==
            actor.empresa_id
        ) {
          throw new Error(
            "TENANT_FORBIDDEN",
          );
        }

        if (
          current.is_master
        ) {
          throw new Error(
            "MASTER_PROTECTED",
          );
        }

        const deletedAt =
          new Date().toISOString();

        const {
          data,
          error,
        } = await db
          .from("erp_usuarios")
          .update({
            ativo: false,
            deleted_at:
              deletedAt,
            updated_at:
              deletedAt,
          })
          .eq(
            "id",
            userId,
          )
          .select(USER_SELECT)
          .single();

        if (error) {
          throw error;
        }

        if (
          current.auth_user_id
        ) {
          const {
            error:
              authError,
          } =
            await db.auth.admin.updateUserById(
              current.auth_user_id,
              {
                ban_duration:
                  "876000h",
              },
            );

          if (authError) {
            throw authError;
          }
        }

        await writeAudit(
          db,
          actor,
          "delete_user_soft",
          userId,
          current,
          data,
        );

        return json({
          ok: true,
          user: data,
        });
      }

      if (
        action ===
        "provision_plastibor"
      ) {
        const result =
          await provisionPlastibor(
            db,
            actor,
          );

        return json({
          ok: true,
          ...result,
        });
      }

      return json(
        {
          ok: false,
          error:
            "UNKNOWN_ACTION",
        },
        400,
      );
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
          "MASTER_REQUIRED",
          "TENANT_FORBIDDEN",
          "MASTER_PROTECTED",
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
  },
);
