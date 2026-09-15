import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, unknown>
const FALLBACK_URL = 'https://wdkvrqekixczuhrfygen.supabase.co'
const FALLBACK_PUBLIC_KEY = 'sb_publishable_QX10nEg-hrWd_5UOuYSpQg_v5M-1xuM'

const supabaseUrl = String(env.VITE_SUPABASE_URL ?? FALLBACK_URL).trim().replace(/\/$/, '') || FALLBACK_URL
const configuredKey = String(env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? FALLBACK_PUBLIC_KEY).trim() || FALLBACK_PUBLIC_KEY
const isPrivateKey = configuredKey.startsWith('sb_secret_') || configuredKey.includes('service_role')
const clientKey = isPrivateKey ? FALLBACK_PUBLIC_KEY : configuredKey

export const supabaseConfigurado = Boolean(supabaseUrl && clientKey)
export const supabaseEnvironmentMismatch = false
export const supabaseUrlExportada = supabaseUrl
export const supabaseKeyExportada = clientKey

if (isPrivateKey) console.error('[Supabase] Chave privada detectada no frontend. O ERP ignorou a chave privada e usou a chave pública publishable de contingência.')

export const supabase: SupabaseClient = createClient(supabaseUrl, clientKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'erp-industrial-auth' },
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

export async function getAccessTokenOrThrow(): Promise<string> { return (await getValidSession()).access_token }

export async function invokeSecureEdgeFunction<T = unknown>(functionName: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  try {
    const session = await getValidSession()
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload as Record<string, unknown>,
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
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
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    method: 'POST',
    headers: { apikey: clientKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(args),
  })
  const raw = await response.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) throw new Error(typeof data === 'object' && data !== null && 'message' in data ? String((data as { message: unknown }).message) : raw || response.statusText)
  return data as T
}
