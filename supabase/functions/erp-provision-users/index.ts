import { createClient } from '@supabase/supabase-js'

const EMPRESA_ID =
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

const USUARIOS = [
  {
    nome: 'PAGINATESTE',
    username: 'PAGINATESTE',
    email: 'paginateste@transforbater.com.br',
    senha: '32951242',
    nivel: 9,
    perfil: 'master',
    is_master: true,
    setor_id:
      '6ed25a82-7086-4cec-bcc6-4da413313896',
  },
  {
    nome: 'FernandoSch_Master',
    username: 'fernandosch',
    email: 'fernandosch2012@hotmail.com',
    senha: '32951242',
    nivel: 9,
    perfil: 'master',
    is_master: true,
    setor_id:
      '6ed25a82-7086-4cec-bcc6-4da413313896',
  },
  {
    nome: 'vanda',
    username: 'vanda',
    email: 'vanda@transforbater.com.br',
    senha: '123456',
    nivel: 8,
    perfil: 'administrador',
    is_master: false,
    setor_id:
      '6ed25a82-7086-4cec-bcc6-4da413313896',
  },
  {
    nome: 'plcomercial',
    username: 'plcomercial',
    email: 'plcomercial@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'comercial',
    is_master: false,
    setor_id:
      '8ccbb0f9-3d72-421d-aa2f-0d6d92fe97d5',
  },
  {
    nome: 'plcompras',
    username: 'plcompras',
    email: 'plcompras@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'compras',
    is_master: false,
    setor_id:
      '26acd8df-0dec-4aab-80dc-e49c6037171a',
  },
  {
    nome: 'plqualidade',
    username: 'plqualidade',
    email: 'plqualidade@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'qualidade',
    is_master: false,
    setor_id:
      'bf0efd1b-f5e0-4c51-a4fb-e6005ef10900',
  },
  {
    nome: 'plestoque',
    username: 'plestoque',
    email: 'plestoque@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'estoque',
    is_master: false,
    setor_id:
      'f5315f84-dade-4e2b-8aeb-a881aac28ef2',
  },
  {
    nome: 'plexpedicao',
    username: 'plexpedicao',
    email: 'plexpedicao@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'expedicao',
    is_master: false,
    setor_id:
      '2d3d182f-2919-4675-ae4d-758a5cd33f46',
  },
  {
    nome: 'plfinanceiro',
    username: 'plfinanceiro',
    email: 'plfinanceiro@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'financeiro',
    is_master: false,
    setor_id:
      '8eb7256e-5b9c-4caf-9e56-77627a861502',
  },
  {
    nome: 'plfiscal',
    username: 'plfiscal',
    email: 'plfiscal@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'fiscal',
    is_master: false,
    setor_id:
      '210c6c49-36d0-4ba8-aeb9-c87e9b886e49',
  },
  {
    nome: 'plmanutencao',
    username: 'plmanutencao',
    email: 'plmanutencao@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'manutencao',
    is_master: false,
    setor_id:
      'ef15d473-513b-4103-9b57-5adf9c77606e',
  },
  {
    nome: 'plpcp',
    username: 'plpcp',
    email: 'plpcp@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'pcp',
    is_master: false,
    setor_id:
      '9739d43e-b786-47bb-b629-7596676c797e',
  },
  {
    nome: 'plproducao',
    username: 'plproducao',
    email: 'plproducao@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'producao',
    is_master: false,
    setor_id:
      '407f2ed9-1267-47a2-b5b7-8ec26bf74a0b',
  },
  {
    nome: 'plrh',
    username: 'plrh',
    email: 'plrh@transforbater.com.br',
    senha: '123456',
    nivel: 2,
    perfil: 'rh',
    is_master: false,
    setor_id:
      '2d926416-4895-4589-96ea-d301698bf88a',
  },
]

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
    return new Response('ok', {
      headers: cors,
    })
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

    const resultado = []

    const {
      data: lista,
      error: listaError,
    } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listaError) {
      throw listaError
    }

    for (const usuario of USUARIOS) {
      try {
        let authUser =
          lista.users.find(
            (item) =>
              String(item.email ?? '')
                .toLowerCase() ===
              usuario.email.toLowerCase(),
          ) ?? null

        /*
         * CRIA OU ATUALIZA AUTH
         */
        if (!authUser) {
          const {
            data,
            error,
          } =
            await admin.auth.admin.createUser({
              email: usuario.email,
              password: usuario.senha,
              email_confirm: true,
              user_metadata: {
                nome: usuario.nome,
              },
              app_metadata: {
                nivel_admin:
                  usuario.nivel,
                perfil:
                  usuario.perfil,
                is_master:
                  usuario.is_master,
              },
            })

          if (error) {
            throw error
          }

          authUser = data.user
        } else {
          const {
            data,
            error,
          } =
            await admin.auth.admin.updateUserById(
              authUser.id,
              {
                password: usuario.senha,
                email_confirm: true,
                user_metadata: {
                  nome: usuario.nome,
                },
                app_metadata: {
                  nivel_admin:
                    usuario.nivel,
                  perfil:
                    usuario.perfil,
                  is_master:
                    usuario.is_master,
                },
              },
            )

          if (error) {
            throw error
          }

          authUser = data.user
        }

        /*
         * LOCALIZA PERFIL ERP
         */
        const {
          data: existente,
          error: buscaError,
        } = await admin
          .from('erp_usuarios')
          .select('id')
          .eq(
            'auth_user_id',
            authUser.id,
          )
          .maybeSingle()

        if (buscaError) {
          throw buscaError
        }

        const dadosERP = {
          empresa_id:
            EMPRESA_ID,
          setor_id:
            usuario.setor_id,
          nome:
            usuario.nome,
          username:
            usuario.username,
          email:
            usuario.email,
          perfil:
            usuario.perfil,
          ativo:
            true,
          nivel_admin:
            usuario.nivel,
          auth_user_id:
            authUser.id,
          is_master:
            usuario.is_master,
        }

        if (existente) {
          const {
            error,
          } = await admin
            .from('erp_usuarios')
            .update(dadosERP)
            .eq(
              'id',
              existente.id,
            )

          if (error) {
            throw error
          }
        } else {
          const {
            error,
          } = await admin
            .from('erp_usuarios')
            .insert(dadosERP)

          if (error) {
            throw error
          }
        }

        resultado.push({
          username:
            usuario.username,
          email:
            usuario.email,
          nivel:
            usuario.nivel,
          setor_id:
            usuario.setor_id,
          status:
            'OK',
        })
      } catch (error) {
        resultado.push({
          username:
            usuario.username,
          email:
            usuario.email,
          nivel:
            usuario.nivel,
          status:
            'ERRO',
          erro:
            error instanceof Error
              ? error.message
              : String(error),
        })
      }
    }

    return json({
      sucesso: true,
      empresa_id:
        EMPRESA_ID,
      quantidade:
        resultado.length,
      usuarios:
        resultado,
    })
  } catch (error) {
    console.error(error)

    return json(
      {
        sucesso: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    )
  }
})
