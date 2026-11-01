// ============================================================================
// erp-onboarding-activate — ativação pública de empresa no SYSNQRA ERP & SGQ
// INDUSTRIAL. Substitui o cadastro raso: valida no servidor, controla
// duplicidade por chave de idempotência + índice único de CNPJ, honra o plano
// escolhido, grava o logotipo no Storage por tenant, registra a estrutura
// lógica de pastas e deixa o teste de 15 dias ser calculado pelo trigger
// erp_initialize_trial() (relógio do Postgres, nunca pelo navegador).
//
// Regras que não podem ser quebradas:
//   - o primeiro usuário recebe ADMIN da própria empresa, jamais Master;
//   - service_role só existe aqui, nunca no frontend;
//   - contratação paga NÃO é ativada sem confirmação de pagamento real;
//   - instalação local NÃO cria pasta pelo navegador: fica pendente de agente.
// ============================================================================
import { createClient } from '@supabase/supabase-js'

const ORIGENS_PERMITIDAS = [
  'https://erp-sistema-industrial.vercel.app',
  'https://www.sysnqra.com.br',
  'https://sysnqra.com.br',
]

function cabecalhosCors(req: Request) {
  const origem = req.headers.get('origin') ?? ''
  const permitida =
    ORIGENS_PERMITIDAS.includes(origem) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origem) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origem)
  return {
    'Access-Control-Allow-Origin': permitida ? origem : ORIGENS_PERMITIDAS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const texto = (v: unknown) => String(v ?? '').trim()
const digitos = (v: unknown) => texto(v).replace(/\D/g, '')
const emailNorm = (v: unknown) => texto(v).toLowerCase()

// ---------------------------------------------------------------------------
// Validação real de documento (dígitos verificadores), sem depender de API
// ---------------------------------------------------------------------------
function cpfValido(raw: string) {
  const c = digitos(raw)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const calc = (base: string, pesoInicio: number) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicio - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return calc(c.slice(0, 9), 10) === Number(c[9]) && calc(c.slice(0, 10), 11) === Number(c[10])
}

function cnpjValido(raw: string) {
  const c = digitos(raw)
  if (c.length !== 14 || /^(\d{1,2})\1{12}$/.test(c)) return false
  const calc = (base: string, pesos: number[]) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return calc(c.slice(0, 12), p1) === Number(c[12]) && calc(c.slice(0, 13), p2) === Number(c[13])
}

const UFS = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])

const LIMITES = { logo_bytes: 2 * 1024 * 1024, payload_bytes: 4 * 1024 * 1024 }
const MIME_LOGO: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

type Erros = Record<string, string>

function validar(body: Record<string, unknown>, erros: Erros) {
  const empresa = (body.empresa ?? {}) as Record<string, unknown>
  const responsavel = (body.responsavel ?? {}) as Record<string, unknown>
  const acesso = (body.acesso ?? {}) as Record<string, unknown>
  const infra = (body.infraestrutura ?? {}) as Record<string, unknown>

  const chave = texto(body.chave_idempotencia)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) {
    erros.chave_idempotencia = 'Chave de ativação inválida. Recarregue a página e tente novamente.'
  }

  const modo = texto(body.modo).toLowerCase()
  if (modo !== 'trial' && modo !== 'pago') erros.modo = 'Escolha entre teste grátis ou contratação de plano.'

  if (!texto(body.plano_codigo)) erros.plano_codigo = 'Selecione um plano.'

  const razao = texto(empresa.razao_social)
  const fantasia = texto(empresa.nome_fantasia)
  if (razao.length < 3) erros.razao_social = 'Informe a razão social.'
  if (fantasia.length < 2) erros.nome_fantasia = 'Informe o nome fantasia.'

  const tipoDocumento = texto(empresa.tipo_documento).toUpperCase() || 'CNPJ'
  const documento = digitos(empresa.documento ?? empresa.cnpj)
  if (tipoDocumento === 'CNPJ') {
    if (documento.length !== 14) erros.documento = 'O CNPJ deve ter 14 dígitos.'
    else if (!cnpjValido(documento)) erros.documento = 'CNPJ inválido: os dígitos verificadores não conferem.'
  } else if (tipoDocumento === 'CPF') {
    if (documento.length !== 11) erros.documento = 'O CPF deve ter 11 dígitos.'
    else if (!cpfValido(documento)) erros.documento = 'CPF inválido: os dígitos verificadores não conferem.'
  } else {
    erros.documento = 'Informe um documento válido.'
  }

  const emailEmpresa = emailNorm(empresa.email)
  if (!/^\S+@\S+\.\S+$/.test(emailEmpresa)) erros.email = 'Informe o e-mail empresarial.'

  const cep = digitos(empresa.cep)
  if (cep.length !== 8) erros.cep = 'Informe o CEP com 8 dígitos.'
  if (!texto(empresa.endereco)) erros.endereco = 'Informe o logradouro.'
  if (!texto(empresa.bairro)) erros.bairro = 'Informe o bairro.'
  if (!texto(empresa.cidade)) erros.cidade = 'Informe a cidade.'
  const uf = texto(empresa.uf).toUpperCase()
  if (!UFS.has(uf)) erros.uf = 'Informe a UF.'
  if (digitos(empresa.telefone).length < 10) erros.telefone = 'Informe o telefone com DDD.'
  const whatsapp = digitos(empresa.whatsapp)
  if (whatsapp && whatsapp.length < 10) erros.whatsapp = 'WhatsApp inválido.'

  const nomeResp = texto(responsavel.nome)
  const emailResp = emailNorm(responsavel.email)
  if (nomeResp.length < 3) erros.responsavel_nome = 'Informe o nome do responsável.'
  if (!/^\S+@\S+\.\S+$/.test(emailResp)) erros.responsavel_email = 'Informe o e-mail do responsável.'
  if (digitos(responsavel.telefone).length < 10) erros.responsavel_telefone = 'Informe o telefone do responsável.'

  const senha = texto(acesso.senha)
  if (senha.length < 8) erros.senha_acesso = 'A senha de acesso deve ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) erros.senha_acesso = 'A senha de acesso deve combinar letras e números.'

  const tipo = texto(infra.tipo).toLowerCase()
  if (tipo !== 'nuvem' && tipo !== 'local') erros.infraestrutura = 'Escolha onde o sistema vai funcionar.'
  if (tipo === 'local') {
    if (!texto(infra.hostname)) erros.infra_hostname = 'Identifique o computador ou servidor responsável.'
    if (!/^[a-z]:[\\/].{2,}/i.test(texto(infra.diretorio_raiz)) && !/^\/[^\s]{2,}/.test(texto(infra.diretorio_raiz))) {
      erros.infra_diretorio = 'Informe o diretório raiz absoluto (ex.: D:\\SYSNQRA ou /srv/sysnqra).'
    }
  }

  return {
    chave, modo,
    planoCodigo: texto(body.plano_codigo).toLowerCase(),
    razao, fantasia, tipoDocumento, documento, emailEmpresa,
    cep, uf,
    endereco: texto(empresa.endereco), numero: texto(empresa.numero), complemento: texto(empresa.complemento),
    bairro: texto(empresa.bairro), cidade: texto(empresa.cidade),
    telefone: digitos(empresa.telefone), whatsapp,
    inscricaoEstadual: texto(empresa.inscricao_estadual),
    nomeResp, emailResp, telResp: digitos(responsavel.telefone),
    nomeAcesso: texto(acesso.nome_acesso) || fantasia.split(/\s+/)[0],
    senha, tipo,
    hostname: texto(infra.hostname), diretorio: texto(infra.diretorio_raiz),
    logoBase64: texto(infra.logo_base64 || body.logo_base64),
    logoTipo: texto(infra.logo_tipo || body.logo_tipo),
    origem: texto(body.origem) || 'home_publica',
    modulo: texto(body.modulo).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40),
  }
}

function decodificarLogo(base64: string, mime: string) {
  if (!base64) return null
  const puro = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
  const ext = MIME_LOGO[mime]
  if (!ext) return { erro: 'O logotipo deve ser PNG, JPG ou WebP.' }
  let bin: string
  try {
    bin = atob(puro)
  } catch {
    return { erro: 'O logotipo enviado não pôde ser lido.' }
  }
  if (bin.length > LIMITES.logo_bytes) return { erro: 'O logotipo deve ter no máximo 2 MB.' }
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, ext, mime }
}

Deno.serve(async (req) => {
  const cors = cabecalhosCors(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, cors, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'ONBOARDING_NOT_CONFIGURED' }, cors, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  let empresaId: string | null = null
  let authUserId: string | null = null
  let solicitacaoId: string | null = null
  let dados: ReturnType<typeof validar> | null = null

  try {
    const bruto = await req.text()
    if (bruto.length > LIMITES.payload_bytes) return json({ error: 'Envio muito grande. Reduza a imagem do logotipo.' }, cors, 413)
    const body = JSON.parse(bruto) as Record<string, unknown>

    const erros: Erros = {}
    dados = validar(body, erros)
    if (Object.keys(erros).length) return json({ error: 'Revise os campos destacados.', campos: erros }, cors, 400)

    // ------------------------------------------------------------------ plano
    const { data: plano, error: planoError } = await admin
      .from('erp_planos_catalogo')
      .select('codigo,nome,preco_mensal,descricao')
      .eq('codigo', dados.planoCodigo)
      .eq('ativo', true)
      .maybeSingle()
    if (planoError) throw planoError
    if (!plano) return json({ error: 'Plano não localizado no catálogo. Selecione novamente.' }, cors, 400)

    // ------------------------------------------------- idempotência / auditoria
    const { data: solicitacao, error: insError } = await admin
      .from('erp_onboarding_solicitacoes')
      .insert({
        chave_idempotencia: dados.chave,
        modo: dados.modo,
        plano_codigo: plano.codigo,
        documento: dados.documento,
        tipo_documento: dados.tipoDocumento,
        email: dados.emailResp,
        ip_origem: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300),
        status: 'processando',
        payload: { razao_social: dados.razao, nome_fantasia: dados.fantasia, infraestrutura: dados.tipo, origem: dados.origem, modulo: dados.modulo || null },
      })
      .select('id, status, empresa_id, resultado, erro')
      .maybeSingle()
    if (insError) {
      if (insError.code === '23505') {
        const { data: existente } = await admin
          .from('erp_onboarding_solicitacoes')
          .select('id,status,empresa_id,resultado,erro')
          .eq('chave_idempotencia', dados.chave)
          .maybeSingle()
        if (existente?.status === 'concluido') {
          return json({ ok: true, duplicado: true, ...(existente.resultado ?? {}) }, cors, 200)
        }
        if (existente?.status === 'falha') {
          return json({ error: existente.erro ?? 'A ativação anterior falhou. Reinicie o cadastro.' }, cors, 409)
        }
        return json({ error: 'Uma ativação com esta chave ainda está em processamento.' }, cors, 409)
      }
      throw insError
    }
    if (!solicitacao) return json({ error: 'Não foi possível registrar a solicitação de ativação.' }, cors, 500)
    solicitacaoId = solicitacao.id

    // ------------------------------------------------ duplicidade por documento
    const { data: existente, error: dupError } = await admin
      .from('erp_empresas')
      .select('id')
      .eq('cnpj', dados.documento)
      .limit(1)
    if (dupError) throw dupError
    if (existente?.length) {
      await admin.from('erp_onboarding_solicitacoes').update({ status: 'falha', erro: 'CNPJ já cadastrado', concluido_em: new Date().toISOString() }).eq('id', solicitacaoId)
      return json({ error: 'Já existe uma empresa cadastrada com este CNPJ. Use a recuperação de acesso ou fale com o atendimento.' }, cors, 409)
    }

    // ---------------------------------------------------------------- empresa
    // As datas do teste NÃO são enviadas: o trigger erp_initialize_trial()
    // calcula trial_started_at / trial_ends_at com o relógio do Postgres.
    const { data: empresa, error: empresaError } = await admin.from('erp_empresas').insert({
      razao_social: dados.razao,
      nome_fantasia: dados.fantasia,
      cnpj: dados.documento,
      documento: dados.documento,
      tipo_documento: dados.tipoDocumento,
      inscricao_estadual: dados.inscricaoEstadual || null,
      cep: dados.cep,
      endereco: dados.endereco,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro,
      cidade: dados.cidade,
      uf: dados.uf,
      telefone: dados.telefone,
      whatsapp: dados.whatsapp || null,
      email: dados.emailEmpresa,
      responsavel_nome: dados.nomeResp,
      responsavel_email: dados.emailResp,
      responsavel_telefone: dados.telResp,
      plano: plano.nome,
      plano_codigo: plano.codigo,
      modo_ativacao: dados.modo,
      origem_cadastro: dados.origem,
      infraestrutura: dados.tipo,
      ativo: true,
      status: 'ativo',
      plano_status: dados.modo === 'trial' ? 'trial' : 'aguardando_pagamento',
    }).select('id,nome_fantasia,razao_social,plano,plano_codigo,plano_status,trial_started_at,trial_ends_at,infra_status,storage_provider').single()

    if (empresaError) {
      if (empresaError.code === '23505') {
        return json({ error: 'Já existe uma empresa cadastrada com este CNPJ.' }, cors, 409)
      }
      throw empresaError
    }
    if (!empresa) throw new Error('EMPRESA_CREATE_FAILED')
    empresaId = empresa.id

    // ---------------------------------------------------------------- setores
    const setores = [
      ['ADM', 'Administração'], ['QUALIDADE', 'Qualidade'], ['PRODUCAO', 'Produção'], ['PCP', 'PCP'],
      ['ESTOQUE', 'Estoque'], ['FINANCEIRO', 'Financeiro'], ['RH', 'Recursos Humanos'], ['COMERCIAL', 'Comercial'],
    ].map(([codigo, nome]) => ({ empresa_id: empresa.id, codigo, nome, ativo: true }))

    const { data: setoresCriados, error: setorError } = await admin.from('erp_setores').insert(setores).select('id,codigo')
    if (setorError || !setoresCriados?.length) throw setorError ?? new Error('SETORES_CREATE_FAILED')
    const admSetor = setoresCriados.find(s => s.codigo === 'ADM') ?? setoresCriados[0]

    // ------------------------------------------------------------- auth admin
    const { data: auth, error: authError } = await admin.auth.admin.createUser({
      email: dados.emailResp,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nomeResp, empresa_id: empresa.id, setor_id: admSetor.id, sistema: 'SYSNQRA ERP & SGQ INDUSTRIAL' },
    })
    if (authError || !auth.user) {
      if (/already registered|already exists/i.test(authError?.message ?? '')) {
        return json({ error: 'Este e-mail já possui um acesso. Use a recuperação de senha.' }, cors, 409)
      }
      throw authError ?? new Error('AUTH_CREATE_FAILED')
    }
    authUserId = auth.user.id

    // ADMIN da própria empresa: perfil/nível compatíveis com erp_roles (ADMIN=9),
    // nunca Master (chk_erp_master_identity exige nivel <> 100 para não-Master).
    // O índice único de codigo só vale para papel global (empresa_id is null).
    const { data: papeisAdmin } = await admin
      .from('erp_roles')
      .select('id,nivel')
      .eq('codigo', 'ADMIN')
      .is('empresa_id', null)
      .limit(1)
    const roleAdmin = papeisAdmin?.[0] ?? null
    const baseUsuario = {
      empresa_id: empresa.id,
      setor_id: admSetor.id,
      nome: dados.nomeResp,
      email: dados.emailResp,
      perfil: 'ADMIN',
      ativo: true,
      nivel_admin: roleAdmin?.nivel ?? 9,
      auth_user_id: auth.user.id,
      is_master: false,
      username: dados.nomeAcesso,
      login_nome: dados.nomeAcesso.toLowerCase(),
    }
    // role/role_id só existem depois da migration de RBAC; se o banco ainda não
    // a recebeu, a gravação cai para o conjunto de colunas básico.
    let { error: usuarioError } = await admin.from('erp_usuarios').insert({
      ...baseUsuario, role: 'ADMIN', ...(roleAdmin?.id ? { role_id: roleAdmin.id } : {}),
    })
    if (usuarioError) ({ error: usuarioError } = await admin.from('erp_usuarios').insert(baseUsuario))
    if (usuarioError) throw usuarioError

    // ------------------------------------------------------------ logo upload
    let logoUrl: string | null = null
    if (dados.logoBase64) {
      const logo = decodificarLogo(dados.logoBase64, dados.logoTipo)
      if (logo && 'erro' in logo) {
        return json({ error: logo.erro }, cors, 400)
      }
      if (logo && 'bytes' in logo) {
        const caminho = `${empresa.id}/logo/${crypto.randomUUID()}.${logo.ext}`
        const { error: uploadError } = await admin.storage.from('empresas-logos').upload(caminho, logo.bytes, {
          contentType: logo.mime, upsert: false,
        })
        if (uploadError) throw uploadError
        logoUrl = admin.storage.from('empresas-logos').getPublicUrl(caminho).data.publicUrl
        const { error: logoUpdate } = await admin.from('erp_empresas').update({ logo_url: logoUrl, atualizado_em: new Date().toISOString() }).eq('id', empresa.id)
        if (logoUpdate) throw logoUpdate
      }
    }

    // ------------------------------------------- estrutura lógica de pastas
    const { data: pastas, error: pastaError } = await admin.rpc('erp_provisionar_estrutura_armazenamento', {
      p_empresa_id: empresa.id,
      p_infraestrutura: dados.tipo,
      p_diretorio_raiz: dados.diretorio || null,
    })
    if (pastaError) throw pastaError

    // ----------------------------------------------------- leitura do servidor
    const { data: situacao, error: situacaoError } = await admin
      .from('erp_empresas')
      .select('id,nome_fantasia,plano,plano_codigo,plano_status,trial_started_at,trial_ends_at,logo_url,infra_status,storage_provider')
      .eq('id', empresa.id)
      .single()
    if (situacaoError) throw situacaoError

    const resultado = {
      ok: true,
      empresa: { id: situacao.id, nome_fantasia: situacao.nome_fantasia, logo_url: situacao.logo_url ?? null },
      acesso: { nome_acesso: dados.nomeAcesso, email: dados.emailResp },
      plano: { codigo: situacao.plano_codigo, nome: situacao.plano, status: situacao.plano_status },
      modo: dados.modo,
      trial: dados.modo === 'trial'
        ? { iniciado_em: situacao.trial_started_at, termina_em: situacao.trial_ends_at, dias: 15, calculado_por: 'Postgres (erp_initialize_trial)' }
        : null,
      infraestrutura: {
        tipo: dados.tipo,
        status: situacao.infra_status,
        storage_provider: situacao.storage_provider,
        pastas: Array.isArray(pastas) ? pastas.length : 0,
        hostname: dados.tipo === 'local' ? dados.hostname : null,
        diretorio: dados.tipo === 'local' ? dados.diretorio : null,
      },
      proximos_passos: dados.modo === 'trial'
        ? ['Entrar em /login com o e-mail do responsável', 'Cadastrar produtos, clientes e fornecedores', 'Conferir o aviso de dias restantes do teste dentro do ERP']
        : ['Aguardar a confirmação real do pagamento', 'O ambiente entra em modo teste até a ativação paga', 'Após o pagamento, o plano é ativado pelo webhook de cobrança'],
      aviso_pagamento: dados.modo === 'pago'
        ? 'A contratação ainda não foi ativada: nenhum pagamento foi processado ou simulado nesta etapa.'
        : null,
    }

    await admin.from('erp_onboarding_solicitacoes').update({
      status: 'concluido',
      empresa_id: empresa.id,
      auth_user_id: auth.user.id,
      resultado,
      concluido_em: new Date().toISOString(),
    }).eq('id', solicitacaoId)

    return json(resultado, cors, 201)
  } catch (error) {
    console.error('[erp-onboarding-activate]', error)

    if (authUserId) await admin.auth.admin.deleteUser(authUserId).catch(() => undefined)
    if (empresaId) {
      await admin.from('erp_empresa_pastas').delete().eq('empresa_id', empresaId).catch(() => undefined)
      await admin.from('erp_setores').delete().eq('empresa_id', empresaId).catch(() => undefined)
      await admin.from('erp_empresas').delete().eq('id', empresaId).catch(() => undefined)
    }
    if (solicitacaoId) {
      await admin.from('erp_onboarding_solicitacoes').update({
        status: 'falha',
        erro: error instanceof Error ? error.message : 'FALHA_DESCONHECIDA',
        concluido_em: new Date().toISOString(),
      }).eq('id', solicitacaoId).catch(() => undefined)
    }

    return json({
      error: error instanceof Error ? error.message : 'Não foi possível ativar o SYSNQRA agora.',
    }, cors, 500)
  }
})
