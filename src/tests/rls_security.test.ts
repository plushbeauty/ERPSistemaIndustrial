import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Expectation = {
  toBe(expected: unknown): void
  toBeTruthy(): void
  toBeNull(): void
}
declare const describe: (name: string, body: () => void) => void
declare const it: (name: string, body: () => void | Promise<void>) => void
declare const expect: (actual: unknown) => Expectation
declare const process: { env: Record<string, string | undefined> }

type TenantRnc = {
  id: string
  empresa_id: string
  numero_rpnc: string
}

const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  return value
}

function createAuthenticatedClient(): SupabaseClient {
  const client = createClient(
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

  return client
}

describe('Segurança RLS — isolamento entre Empresa A e Empresa B', () => {
  it('impede que a sessão da Empresa B leia a RNC pertencente à Empresa A', async () => {
    const clientA = createAuthenticatedClient()
    const clientB = createAuthenticatedClient()

    const { error: authAError } = await clientA.auth.signInWithPassword({
      email: requiredEnv('ERP_TEST_COMPANY_A_EMAIL'),
      password: requiredEnv('ERP_TEST_COMPANY_A_PASSWORD'),
    })
    if (authAError) throw authAError

    const { error: authBError } = await clientB.auth.signInWithPassword({
      email: requiredEnv('ERP_TEST_COMPANY_B_EMAIL'),
      password: requiredEnv('ERP_TEST_COMPANY_B_PASSWORD'),
    })
    if (authBError) throw authBError

    const [tenantA, tenantB] = await Promise.all([
      clientA.rpc('erp_current_empresa_id'),
      clientB.rpc('erp_current_empresa_id'),
    ])
    if (tenantA.error) throw tenantA.error
    if (tenantB.error) throw tenantB.error
    if (typeof tenantA.data !== 'string' || !tenantA.data) {
      throw new Error('A sessão de Empresa A não resolveu um tenant válido.')
    }
    if (typeof tenantB.data !== 'string' || !tenantB.data) {
      throw new Error('A sessão de Empresa B não resolveu um tenant válido.')
    }
    expect(tenantA.data === tenantB.data).toBe(false)

    const recordId = requiredEnv('ERP_TEST_COMPANY_A_RPNC_ID')
    const { data: source, error: sourceError } = await clientA
      .from('erp_rpnc')
      .select('id,empresa_id,numero_rpnc')
      .eq('empresa_id', tenantA.data)
      .eq('id', recordId)
      .single()

    if (sourceError) throw sourceError
    if (!source) throw new Error('O registro de teste não foi encontrado pela sessão da Empresa A.')

    const rowA = source as TenantRnc
    expect(rowA.empresa_id).toBe(tenantA.data)
    expect(rowA.id).toBe(recordId)

    const { data: rowsVisibleToB, error: queryBError } = await clientB
      .from('erp_rpnc')
      .select('id,empresa_id,numero_rpnc')
      .eq('id', recordId)

    if (queryBError) throw queryBError

    const leakedRows = ((rowsVisibleToB ?? []) as TenantRnc[]).filter(row => row.id === recordId)
    expect(leakedRows.length).toBe(0)
    expect(leakedRows.some(row => row.empresa_id === tenantA.data)).toBe(false)
  })

  it('não permite que a sessão da Empresa B enumere registros do tenant A por ID conhecido', async () => {
    const clientB = createAuthenticatedClient('ERP_TEST_COMPANY_B_EMAIL', 'ERP_TEST_COMPANY_B_PASSWORD')
    const { error: authError } = await clientB.auth.signInWithPassword({
      email: requiredEnv('ERP_TEST_COMPANY_B_EMAIL'),
      password: requiredEnv('ERP_TEST_COMPANY_B_PASSWORD'),
    })
    if (authError) throw authError

    const { data: tenantB, error: tenantError } = await clientB.rpc('erp_current_empresa_id')
    if (tenantError) throw tenantError
    if (typeof tenantB !== 'string' || !tenantB) {
      throw new Error('A sessão de Empresa B não resolveu um tenant válido.')
    }

    const recordId = requiredEnv('ERP_TEST_COMPANY_A_RPNC_ID')
    const { data, error } = await clientB
      .from('erp_rpnc')
      .select('id')
      .eq('empresa_id', tenantB)
      .eq('id', recordId)
      .maybeSingle()

    if (error) throw error
    expect(data).toBeNull()
  })
})
