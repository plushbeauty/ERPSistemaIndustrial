import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const AUTH_STORAGE_KEY = 'erp-industrial-auth'
const SUPABASE_URL_ENV = 'VITE_SUPABASE_URL'
const SUPABASE_PUBLISHABLE_KEY_ENV = 'VITE_SUPABASE_PUBLISHABLE_KEY'
const SUPABASE_ANON_KEY_ENV = 'VITE_SUPABASE_ANON_KEY'

/*
 * Vite replaces import.meta.env.* during bundling. The explicit string
 * normalization below keeps the module statically evaluable when an
 * environment variable is absent from a local/CI build, while the runtime
 * guard below still refuses to start an unconfigured Supabase client.
 */
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
const legacyAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const supabaseKey = publishableKey || legacyAnonKey

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey)

if (!supabaseConfigurado) {
  throw new Error(
    `Erro Crítico: ${SUPABASE_URL_ENV} ou uma chave pública Supabase (${SUPABASE_PUBLISHABLE_KEY_ENV}/${SUPABASE_ANON_KEY_ENV}) não foi injetada corretamente no runtime.`,
  )
}

export const supabaseModoConexao = 'nuvem'
export const supabaseEnvironmentMismatch = false
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
    console.error(`[Edge Function ${functionName}]`, normalized.message)
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
