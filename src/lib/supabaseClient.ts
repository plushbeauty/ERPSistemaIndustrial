import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const AUTH_STORAGE_KEY = 'erp-industrial-auth'

const CANONICAL_SUPABASE_URL = 'https://zsklkydlawgvwgnvxwwx.supabase.co'
const CANONICAL_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BcwsSbBx8dWof7d_hAKtQA_XzQGAYwR'

const supabaseUrlFromEnv = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKeyFromEnv = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
const legacyAnonKeyFromEnv = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// A configuração por ambiente continua sendo a fonte preferencial.
// Os fallbacks públicos canônicos impedem que a ausência momentânea de VITE_*
// derrube o React inteiro durante o bootstrap.
const supabaseUrl = supabaseUrlFromEnv || CANONICAL_SUPABASE_URL
const supabaseKey = publishableKeyFromEnv || legacyAnonKeyFromEnv || CANONICAL_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey)
export const supabaseModoConexao = 'nuvem'
export const supabaseEnvironmentMismatch = supabaseUrl !== CANONICAL_SUPABASE_URL
export const supabaseUrlExportada = supabaseUrl
export const supabaseKeyExportada = supabaseKey

const authStorage = typeof window !== 'undefined' ? window.localStorage : undefined

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: authStorage,
  },
  global: { headers: { 'x-client-info': 'sgq-erp-industrial' } },
})

export async function getValidSession(minValiditySeconds = 60): Promise<Session> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  let session = data.session
  const expiresAt = Number(session?.expires_at ?? 0)

  if (session?.refresh_token && (!expiresAt || expiresAt * 1000 - Date.now() < minValiditySeconds * 1000)) {
    const refreshed = await supabase.auth.refreshSession()
    if (!refreshed.error && refreshed.data.session) session = refreshed.data.session
  }

  if (!session?.access_token || !session.user) throw new Error('AUTH_SESSION_REQUIRED')
  return session
}

export async function getAccessTokenOrThrow(): Promise<string> {
  return (await getValidSession()).access_token
}

export async function invokeSecureEdgeFunction<T = unknown>(
  functionName: string,
  payload: unknown,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const session = await getValidSession()
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload as Record<string, unknown>,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (error) throw error
    return { data: data as T, error: null }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error))
    return { data: null, error: normalized }
  }
}

export async function rpcAutenticado<T = unknown>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const session = await getValidSession()
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`,
    {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(args),
    },
  )

  const raw = await response.text()
  let data: unknown = null

  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }

  if (!response.ok) {
    throw new Error(
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : raw || response.statusText,
    )
  }

  return data as T
}
