import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return json(
      {
        error: 'Método não permitido.',
      },
      405,
    )
  }

  try {
    const body = await req.json()

    const empresa = String(body.empresa ?? '').trim()
    const setor = String(body.setor ?? '').trim()
    const identificador = String(body.identificador ?? '').trim()
    const senha = String(body.senha ?? '')

    if (!empresa || !setor || !identificador || !senha) {
      return json(
        {
          error:
            'Informe empresa, setor, usuário/e-mail e senha.',
        },
        400,
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const empresaNormalizada = empresa.toLowerCase()
    const setorNormalizado = setor.toLowerCase()
    const identificadorNormalizado =
      identificador.toLowerCase()

    /*
     * 1. LOCALIZA EMPRESA
     */
    const { data: empresas, error: empresaError } =
      await admin
        .from('erp_empresas')
        .select(
          `
          id,
          razao_social,
          nome_fantasia,
          ativo,
          plano_status,
          trial_ends_at
          `,
        )
        .or(
          `nome_fantasia.ilike.${empresa},razao_social.ilike.${empresa}`,
        )
        .limit(20)

    if (empresaError) {
      console.error(empresaError)

      return json(
        {
          error:
            'Falha ao localizar a empresa.',
        },
        500,
      )
    }

    const empresaEncontrada = (empresas ?? []).find(
      (item) =>
        String(item.nome_fantasia ?? '')
          .trim()
          .toLowerCase() === empresaNormalizada ||
        String(item.razao_social ?? '')
          .trim()
          .toLowerCase() === empresaNormalizada,
    )

    if (!empresaEncontrada) {
      return json(
        {
          error: 'Empresa não encontrada.',
        },
        401,
      )
    }

    if (empresaEncontrada.ativo === false) {
      return json(
        {
          error: 'Empresa bloqueada.',
        },
        403,
      )
    }

    /*
     * 2. LOCALIZA SETOR
     */
    const { data: setores, error: setorError } =
      await admin
        .from('erp_setores')
        .select(
          `
          id,
          codigo,
          nome,
          empresa_id,
          ativo
          `,
        )
        .eq(
          'empresa_id',
          empresaEncontrada.id,
        )
        .eq('ativo', true)
        .limit(100)

    if (setorError) {
      console.error(setorError)

      return json(
        {
          error:
            'Falha ao localizar o setor.',
        },
        500,
      )
    }

    const setorEncontrado = (setores ?? []).find(
      (item) =>
        String(item.codigo ?? '')
          .trim()
          .toLowerCase() === setorNormalizado ||
        String(item.nome ?? '')
          .trim()
          .toLowerCase() === setorNormalizado,
    )

    if (!setorEncontrado) {
      return json(
        {
          error:
            'Setor não encontrado para esta empresa.',
        },
        401,
      )
    }

    /*
     * 3. LOCALIZA USUÁRIO
     *
     * Aceita:
     * username
     * email
     * nome
     */
    const { data: usuarios, error: usuarioError } =
      await admin
        .from('erp_usuarios')
        .select(
          `
          id,
          nome,
          username,
          email,
          empresa_id,
          setor_id,
          ativo,
          nivel_admin,
          auth_user_id,
          is_master
          `,
        )
        .eq(
          'empresa_id',
          empresaEncontrada.id,
        )
        .eq(
          'setor_id',
          setorEncontrado.id,
        )
        .eq('ativo', true)
        .limit(200)

    if (usuarioError) {
      console.error(usuarioError)

      return json(
        {
          error:
            'Falha ao localizar o usuário do ERP.',
        },
        500,
      )
    }

    const usuario = (usuarios ?? []).find(
      (item) =>
        String(item.username ?? '')
          .trim()
          .toLowerCase() ===
          identificadorNormalizado ||
        String(item.email ?? '')
          .trim()
          .toLowerCase() ===
          identificadorNormalizado ||
        String(item.nome ?? '')
          .trim()
          .toLowerCase() ===
          identificadorNormalizado,
    )

    if (!usuario) {
      return json(
        {
          error:
            'Usuário não encontrado neste setor.',
        },
        401,
      )
    }

    if (!usuario.auth_user_id) {
      return json(
        {
          error:
            'Este usuário não possui vínculo com o Supabase Auth.',
        },
        403,
      )
    }

    /*
     * 4. CONFERE IDENTIDADE AUTH
     */
    const {
      data: authUserData,
      error: authUserError,
    } =
      await admin.auth.admin.getUserById(
        usuario.auth_user_id,
      )

    if (
      authUserError ||
      !authUserData.user
    ) {
      console.error(authUserError)

      return json(
        {
          error:
            'O vínculo de autenticação deste usuário está inválido.',
        },
        403,
      )
    }

    const authEmail = String(
      authUserData.user.email ??
        usuario.email ??
        '',
    )
      .trim()
      .toLowerCase()

    if (!authEmail) {
      return json(
        {
          error:
            'Usuário sem e-mail de autenticação válido.',
        },
        403,
      )
    }

    /*
     * 5. AUTENTICA NO SUPABASE AUTH
     */
    const {
      data: authData,
      error: authError,
    } =
      await admin.auth.signInWithPassword({
        email: authEmail,
        password: senha,
      })

    if (
      authError ||
      !authData.session ||
      !authData.user
    ) {
      console.error(authError)

      return json(
        {
          error:
            'Usuário ou senha inválidos.',
        },
        401,
      )
    }

    /*
     * 6. VALIDA PLANO
     *
     * A regra antiga de nível 1 é preservada.
     * MASTER 9 e ADMIN 8 não são bloqueados
     * por essa regra.
     */
    if (
      Number(usuario.nivel_admin) === 1 &&
      empresaEncontrada.plano_status !==
        'ativo' &&
      empresaEncontrada.trial_ends_at &&
      Date.now() >=
        new Date(
          empresaEncontrada.trial_ends_at,
        ).getTime()
    ) {
      return json(
        {
          error:
            'A empresa está com o plano expirado.',
        },
        403,
      )
    }

    /*
     * 7. LOGIN CONCLUÍDO
     */
    return json({
      session: {
        access_token:
          authData.session.access_token,
        refresh_token:
          authData.session.refresh_token,
      },

      profile: {
        id: usuario.id,
        empresa_id:
          empresaEncontrada.id,

        setor_id:
          setorEncontrado.id,

        setor_codigo:
          setorEncontrado.codigo,

        setor_nome:
          setorEncontrado.nome,

        username:
          usuario.username,

        nome:
          usuario.nome,

        email:
          usuario.email,

        nivel_admin:
          usuario.nivel_admin ?? 99,

        is_master:
          usuario.is_master === true,
      },
    })
  } catch (error) {
    console.error(error)

    return json(
      {
        error:
          'Não foi possível concluir o login.',
      },
      500,
    )
  }
})
