// ============================================================================
// consultar-cnpj — consulta pública de CNPJ (BrasilAPI) usada pelo assistente
// de ativação ANTES do login. Por isso aceita chamada anônima: devolve apenas
// dados públicos do cadastro, valida rigorosamente a entrada e não repassa
// nenhum cabeçalho do chamador para a API externa.
// ============================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ORIGENS_PERMITIDAS = [
  'https://erp-sistema-industrial.vercel.app',
  'https://www.sysnqra.com.br',
  'https://sysnqra.com.br',
]

function corsHeaders(req: Request) {
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

function cnpjValido(c: string) {
  if (c.length !== 14 || /^(\d{1,2})\1{12}$/.test(c)) return false
  const calc = (base: string, pesos: number[]) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(c[12]) &&
    calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(c[13])
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST obrigatório.' }, cors, 405)

  try {
    const bruto = await req.text()
    if (bruto.length > 4096) return json({ error: 'Consulta inválida.' }, cors, 413)

    const body = JSON.parse(bruto) as Record<string, unknown>
    const cnpj = String(body?.cnpj ?? '').replace(/\D/g, '')
    if (cnpj.length !== 14) return json({ error: 'CNPJ inválido: informe os 14 dígitos.' }, cors, 400)
    if (!cnpjValido(cnpj)) return json({ error: 'CNPJ inválido: os dígitos verificadores não conferem.' }, cors, 400)

    const resposta = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    })

    const dados = await resposta.json().catch(() => ({})) as Record<string, unknown>
    if (!resposta.ok) {
      return json({ error: 'CNPJ não localizado na consulta pública da Receita.', status: resposta.status }, cors, 404)
    }

    const telefone = [String(dados.ddd_telefone_1 ?? '').replace(/\D/g, ''), String(dados.ddd_telefone_2 ?? '').replace(/\D/g, '')].find(Boolean) ?? ''

    return json({
      cnpj: String(dados.cnpj ?? cnpj),
      razao_social: String(dados.razao_social ?? ''),
      nome_fantasia: String(dados.nome_fantasia ?? ''),
      inscricao_municipal: String(dados.inscricao_municipal ?? ''),
      cep: String(dados.cep ?? '').replace(/\D/g, ''),
      logradouro: String(dados.logradouro ?? ''),
      numero: String(dados.numero ?? ''),
      complemento: String(dados.complemento ?? ''),
      bairro: String(dados.bairro ?? ''),
      cidade: String(dados.municipio ?? ''),
      uf: String(dados.uf ?? ''),
      telefone,
      email: String(dados.email ?? ''),
      situacao_cadastral: String(dados.descricao_situacao_cadastral ?? ''),
      porte: String(dados.porte ?? ''),
    }, cors, 200)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Falha na consulta de CNPJ.' }, cors, 500)
  }
})
