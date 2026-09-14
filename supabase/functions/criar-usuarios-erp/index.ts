```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ============================================================
// USUÁRIOS OFICIAIS DO ERP INDUSTRIAL
// ============================================================

const USUARIOS = [
  {
    email: "fernandosch2012@hotmail.com",
    nome: "Fernando Schuinsekel",
    senha: "32951242",
    nivel_admin: 9,
  },

  {
    email: "vanda@transforbater.com.br",
    nome: "Vanda",
    senha: "12345678",
    nivel_admin: 7,
  },

  {
    email: "plcomercial@transforbater.com.br",
    nome: "PL Comercial",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plcompras@transforbater.com.br",
    nome: "PL Compras",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plqualidade@transforbater.com.br",
    nome: "PL Qualidade",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plestoque@transforbater.com.br",
    nome: "PL Estoque",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plexpedicao@transforbater.com.br",
    nome: "PL Expedição",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plfinanceiro@transforbater.com.br",
    nome: "PL Financeiro",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plfiscal@transforbater.com.br",
    nome: "PL Fiscal",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plmanutencao@transforbater.com.br",
    nome: "PL Manutenção",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plpcp@transforbater.com.br",
    nome: "PL PCP",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plproducao@transforbater.com.br",
    nome: "PL Produção",
    senha: "123456",
    nivel_admin: 1,
  },

  {
    email: "plrh@transforbater.com.br",
    nome: "PL RH",
    senha: "123456",
    nivel_admin: 1,
  },
];

// ============================================================
// CORS
// ============================================================

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// RESPOSTA
// ============================================================

function resposta(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body, null, 2),
    {
      status,
      headers,
    },
  );
}

// ============================================================
// LOCALIZA USUÁRIO AUTH PELO E-MAIL
// ============================================================

async function localizarAuthPorEmail(email: string) {
  let page = 1;

  while (true) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) {
      throw error;
    }

    const usuario = data.users.find(
      (u) =>
        u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (usuario) {
      return usuario;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page++;
  }
}

// ============================================================
// LOCALIZA EMPRESA
// ============================================================

async function localizarEmpresa() {
  const { data, error } = await supabase
    .from("erp_empresas")
    .select("id,nome,razao_social,ativo")
    .eq("ativo", true)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================
// CRIA / ATUALIZA
// ============================================================

async function criarOuAtualizarUsuario(
  usuario: typeof USUARIOS[number],
  empresaId: string,
) {
  let authUser =
    await localizarAuthPorEmail(usuario.email);

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  if (!authUser) {
    const criado =
      await supabase.auth.admin.createUser({
        email: usuario.email,
        password: usuario.senha,
        email_confirm: true,
        user_metadata: {
          nome: usuario.nome,
          sistema: "ERP Industrial",
        },
      });

    if (criado.error) {
      throw new Error(
        `Erro criando Auth ${usuario.email}: ${criado.error.message}`,
      );
    }

    if (!criado.data.user) {
      throw new Error(
        `Supabase não retornou usuário para ${usuario.email}`,
      );
    }

    authUser = criado.data.user;
  } else {
    // --------------------------------------------------------
    // USUÁRIO JÁ EXISTE
    // Atualiza senha e desbloqueia
    // --------------------------------------------------------

    const atualizado =
      await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: usuario.senha,
          email_confirm: true,
          ban_duration: "none",
          user_metadata: {
            ...authUser.user_metadata,
            nome: usuario.nome,
            sistema: "ERP Industrial",
          },
        },
      );

    if (atualizado.error) {
      throw new Error(
        `Erro atualizando Auth ${usuario.email}: ${atualizado.error.message}`,
      );
    }

    authUser =
      atualizado.data.user ?? authUser;
  }

  // ----------------------------------------------------------
  // ERP_USUARIOS
  // ----------------------------------------------------------

  const { data: cadastroExistente, error: erroBusca } =
    await supabase
      .from("erp_usuarios")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

  if (erroBusca) {
    throw erroBusca;
  }

  if (cadastroExistente) {
    const { error } =
      await supabase
        .from("erp_usuarios")
        .update({
          empresa_id: empresaId,
          nome: usuario.nome,
          email: usuario.email,
          nivel_admin: usuario.nivel_admin,
          ativo: true,
          deleted_at: null,
        })
        .eq(
          "id",
          cadastroExistente.id,
        );

    if (error) {
      throw new Error(
        `Erro atualizando ERP ${usuario.email}: ${error.message}`,
      );
    }
  } else {
    const { error } =
      await supabase
        .from("erp_usuarios")
        .insert({
          auth_user_id: authUser.id,
          empresa_id: empresaId,
          nome: usuario.nome,
          email: usuario.email,
          nivel_admin: usuario.nivel_admin,
          ativo: true,
          deleted_at: null,
        });

    if (error) {
      throw new Error(
        `Erro cadastrando ERP ${usuario.email}: ${error.message}`,
      );
    }
  }

  return {
    email: usuario.email,
    nome: usuario.nome,
    auth_user_id: authUser.id,
    nivel_admin: usuario.nivel_admin,
    status: "OK",
  };
}

// ============================================================
// EXECUÇÃO
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers,
    });
  }

  if (req.method !== "POST") {
    return resposta(
      {
        error:
          "Use POST para executar o provisionamento.",
      },
      405,
    );
  }

  try {
    const empresa = await localizarEmpresa();

    if (!empresa) {
      return resposta(
        {
          error:
            "Nenhuma empresa ativa encontrada em erp_empresas.",
          detalhe:
            "Cadastre/ative a empresa industrial antes de criar os usuários.",
        },
        400,
      );
    }

    const resultados = [];

    for (const usuario of USUARIOS) {
      try {
        const resultado =
          await criarOuAtualizarUsuario(
            usuario,
            empresa.id,
          );

        resultados.push(resultado);
      } catch (error) {
        resultados.push({
          email: usuario.email,
          status: "ERRO",
          erro:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    const erros =
      resultados.filter(
        (item) => item.status === "ERRO",
      );

    return resposta({
      ok: erros.length === 0,
      empresa: {
        id: empresa.id,
        nome:
          empresa.nome ??
          empresa.razao_social ??
          null,
      },
      total: USUARIOS.length,
      criados_ou_atualizados:
        resultados.filter(
          (item) => item.status === "OK",
        ).length,
      erros: erros.length,
      usuarios: resultados,
    });
  } catch (error) {
    return resposta(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});
```
