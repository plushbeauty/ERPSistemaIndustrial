import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env
const CANONICAL_SUPABASE_URL = 'https://wdkvrqekixczuhrfygen.supabase.co'
const envUrl = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const envKey = String(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const isPrivateKey = envKey.startsWith('sb_secret_') || envKey.includes('service_role')

export const supabaseEnvironmentMismatch = Boolean(envUrl && envUrl !== CANONICAL_SUPABASE_URL)
export const supabaseConfigurado = Boolean(envUrl && envKey && !isPrivateKey)
export const supabaseUrlExportada = envUrl
export const supabaseKeyExportada = envKey

if (supabaseEnvironmentMismatch) console.error(`Supabase URL diferente do projeto esperado. Esperada: ${CANONICAL_SUPABASE_URL}`)
if (isPrivateKey) console.error('Chave privada detectada no frontend. Use somente a chave pública anon/publishable.')

const missingConfigClient = new Proxy({} as SupabaseClient, {
  get() {
    throw new Error('SUPABASE_CONFIG_MISSING: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel.')
  },
})

export const supabase: SupabaseClient = supabaseConfigurado
  ? createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'erp-industrial-auth',
      },
      global: { headers: { 'x-client-info': 'sgq-erp-industrial' } },
    })
  : missingConfigClient

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
      body: payload,
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

export async function rpcAutenticado<T = unknown>(functionName: string, args: Record<string, unknown> = {}): Promise<T> {
  const session = await getValidSession()
  const response = await fetch(`${envUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    headers: {
      apikey: envKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
  })
  const raw = await response.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) {
    throw new Error(typeof data === 'object' && data !== null && 'message' in data ? String((data as { message: unknown }).message) : raw || response.statusText)
  }
  return data as T
}
