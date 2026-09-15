import { supabase } from "./lib/supabaseClient";

type LoginResponse = {
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
  profile?: {
    id: string;
    empresa_id: string;
    setor_id?: string | null;
    username?: string | null;
    nome?: string | null;
    nivel_admin?: number;
    is_master?: boolean;
  };
  error?: string;
};

export async function testarLoginERP(
  empresa: string,
  usuario: string,
  senha: string
) {
  console.group("===== TESTE LOGIN SGQ ERP =====");

  try {
    console.log("Empresa:", empresa);
    console.log("Usuário:", usuario);

    /*
     * ETAPA 1
     * Chamada EXCLUSIVA para Edge Function.
     */
    console.log(
      "[1/5] Chamando erp-login-v2..."
    );

    const { data, error } =
      await supabase.functions.invoke<LoginResponse>(
        "erp-login-v2",
        {
          body: {
            empresa: empresa.trim(),
            identificador: usuario.trim(),
            senha,
          },
        }
      );

    if (error) {
      console.error(
        "[FALHA] Edge Function:",
        error
      );

      throw error;
    }

    if (data?.error) {
      console.error(
        "[FALHA] Backend:",
        data.error
      );

      throw new Error(data.error);
    }

    /*
     * ETAPA 2
     * Validar sessão retornada.
     */
    console.log(
      "[2/5] Validando sessão retornada..."
    );

    const accessToken =
      data?.session?.access_token;

    const refreshToken =
      data?.session?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error(
        "A Edge Function não retornou access_token/refresh_token."
      );
    }

    console.log(
      "access_token recebido:",
      `${accessToken.substring(0, 20)}...`
    );

    /*
     * ETAPA 3
     * OBRIGATORIAMENTE estabelecer a sessão
     * no cliente Supabase.
     */
    console.log(
      "[3/5] Executando supabase.auth.setSession()..."
    );

    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

    if (sessionError) {
      console.error(
        "[FALHA] setSession:",
        sessionError
      );

      throw sessionError;
    }

    if (!sessionData.session) {
      throw new Error(
        "setSession não estabeleceu uma sessão."
      );
    }

    console.log(
      "[OK] Sessão Supabase estabelecida."
    );

    /*
     * ETAPA 4
     * Confirmar usuário autenticado pelo JWT.
     */
    console.log(
      "[4/5] Confirmando auth.getUser()..."
    );

    const {
      data: authenticated,
      error: authenticatedError,
    } = await supabase.auth.getUser();

    if (authenticatedError) {
      console.error(
        "[FALHA] auth.getUser():",
        authenticatedError
      );

      throw authenticatedError;
    }

    if (!authenticated.user) {
      throw new Error(
        "Supabase não reconheceu o usuário autenticado."
      );
    }

    console.log(
      "[OK] Usuário autenticado:",
      authenticated.user.id
    );

    /*
     * ETAPA 5
     * PROVA REAL DO RLS.
     *
     * Esta consulta usa o JWT estabelecido
     * pelo setSession().
     */
    console.log(
      "[5/5] Consultando erp_usuarios com RLS..."
    );

    const {
      data: usuarios,
      error: rlsError,
    } = await supabase
      .from("erp_usuarios")
      .select("*")
      .eq(
        "auth_user_id",
        authenticated.user.id
      );

    if (rlsError) {
      console.error(
        "[FALHA] RLS / erp_usuarios:",
        rlsError
      );

      throw rlsError;
    }

    console.log(
      "[OK] RLS aceitou o JWT."
    );

    console.table(usuarios ?? []);

    console.log(
      "Perfil retornado pela Edge Function:",
      data.profile
    );

    console.log(
      "===== LOGIN ERP APROVADO ====="
    );

    return {
      ok: true,
      user: authenticated.user,
      session: sessionData.session,
      profile: data.profile,
      usuarios,
    };
  } catch (error) {
    console.error(
      "===== LOGIN ERP REPROVADO ====="
    );

    console.error(error);

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  } finally {
    console.groupEnd();
  }
}
