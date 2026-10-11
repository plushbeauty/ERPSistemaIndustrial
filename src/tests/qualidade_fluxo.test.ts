import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Expectation = {
  toBe(expected: unknown): void
  toBeTruthy(): void
  toBeNull(): void
  toEqual(expected: unknown): void
}
declare const describe: (name: string, body: () => void) => void
declare const it: (name: string, body: () => void | Promise<void>) => void
declare const expect: (actual: unknown) => Expectation
declare const process: { env: Record<string, string | undefined> }

type RncRow = {
  id: string
  numero_rpnc: string
  criado_em: string
  data_ocorrencia: string | null
}
type OitoDRow = { id: string; codigo: string; rpnc_id: string | null }
type EquipmentColumns = {
  id: string
  proxima_calibracao: string | null
  certificado_validade: string | null
}

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  return value
}

function createTestClient(): SupabaseClient {
  return createClient(
    requiredEnv('ERP_TEST_SUPABASE_URL'),
    requiredEnv('ERP_TEST_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )
}

function build8DCode(rnc: RncRow): string {
  const sourceDate = rnc.data_ocorrencia ?? rnc.criado_em
  const year = new Date(sourceDate).getFullYear()
  if (!Number.isFinite(year)) throw new Error('Data da RNC inválida.')
  return `8D-${year}-${rnc.id}`
}

describe('Qualidade industrial — rastreabilidade RNC → 8D e contrato de metrologia', () => {
  let client: SupabaseClient
  let companyId: string
  let rnc: RncRow

  it('autentica no Supabase real e resolve o tenant da sessão', async () => {
    client = createTestClient()
    const { error: authError } = await client.auth.signInWithPassword({
      email: requiredEnv('ERP_TEST_USER_EMAIL'),
      password: requiredEnv('ERP_TEST_USER_PASSWORD'),
    })
    if (authError) throw authError

    const { data, error } = await client.rpc('erp_current_empresa_id')
    if (error) throw error
    if (typeof data !== 'string' || !data) {
      throw new Error('A sessão de teste não resolveu uma empresa válida.')
    }

    companyId = data
    expect(companyId).toBeTruthy()
  })

  it('carrega uma RNC real da empresa autenticada e gera o código 8D pelo ID persistido', async () => {
    const rncId = requiredEnv('ERP_TEST_RPNC_ID')
    const { data, error } = await client
      .from('erp_rpnc')
      .select('id,numero_rpnc,criado_em,data_ocorrencia')
      .eq('empresa_id', companyId)
      .eq('id', rncId)
      .single()

    if (error) throw error
    if (!data) throw new Error('A RNC de teste não existe no tenant autenticado.')

    rnc = data as RncRow
    const expected = build8DCode(rnc)
    expect(expected).toBe(`8D-${new Date(rnc.data_ocorrencia ?? rnc.criado_em).getFullYear()}-${rnc.id}`)
    expect(expected.endsWith(rnc.id)).toBe(true)
  })

  it('mantém o protocolo 8D persistido vinculado ao mesmo ID da RNC', async () => {
    const expectedCode = build8DCode(rnc)
    const { data, error } = await client
      .from('erp_qualidade_8d')
      .select('id,codigo,rpnc_id')
      .eq('empresa_id', companyId)
      .eq('rpnc_id', rnc.id)
      .eq('codigo', expectedCode)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error(
        `Não existe protocolo 8D persistido para a RNC ${rnc.id}. Salve o formulário 8D antes de executar esta verificação de integração.`,
      )
    }

    const record = data as OitoDRow
    expect(record.rpnc_id).toBe(rnc.id)
    expect(record.codigo).toBe(expectedCode)
    expect(record.id).toBeTruthy()
  })

  it('confirma no Supabase real o contrato tipado das duas datas de calibração', async () => {
    const { data: companyData, error: companyError } = await client.rpc('erp_current_empresa_id')
    if (companyError) throw companyError
    if (typeof companyData !== 'string' || !companyData) {
      throw new Error('Tenant da sessão indisponível para validar metrologia.')
    }

    const { data, error } = await client
      .from('erp_equipamentos_medicao')
      .select('id,proxima_calibracao,certificado_validade')
      .eq('empresa_id', companyData)
      .limit(1)

    if (error) throw error

    const rows = (data ?? []) as EquipmentColumns[]
    for (const row of rows) {
      expect(typeof row.id).toBe('string')
      expect(row.proxima_calibracao === null || typeof row.proxima_calibracao === 'string').toBe(true)
      expect(row.certificado_validade === null || typeof row.certificado_validade === 'string').toBe(true)
    }
  })
})
