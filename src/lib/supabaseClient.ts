import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const env = import.meta.env
const DEFAULT_SUPABASE_URL = 'https://wdkvrqekixczuhrfygen.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QX10nEg-hrWd_5UOuYSpQg_v5M-1xuM'

export const supabaseUrl = (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim()
export const supabaseKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim()
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey)

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'erp-industrial-auth' },
})

export async function getValidSession(minValiditySeconds = 60): Promise<Session> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  let session = data.session
  const expiresAt = Number(session?.expires_at ?? 0)
  if (!session?.access_token || !session?.refresh_token || !expiresAt || expiresAt * 1000 - Date.now() < minValiditySeconds * 1000) {
    const refreshed = await supabase.auth.refreshSession()
    if (refreshed.error || !refreshed.data.session) throw refreshed.error ?? new Error('AUTH_SESSION_REQUIRED')
    session = refreshed.data.session
  }
  if (!session?.access_token || !session.user) throw new Error('AUTH_SESSION_REQUIRED')
  return session
}

export async function rpcAutenticado<T = unknown>(functionName: string, args: Record<string, unknown> = {}): Promise<T> {
  const session = await getValidSession()
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(args),
  })
  const raw = await response.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data ? String((data as { message: unknown }).message) : raw || response.statusText
    throw new Error(`${response.status === 401 ? 'AUTH_SESSION_REQUIRED' : response.status === 403 ? 'AUTH_FORBIDDEN' : `RPC_HTTP_${response.status}`}: ${message}`)
  }
  return data as T
}

export async function getAccessTokenOrThrow() { return (await getValidSession()).access_token }
