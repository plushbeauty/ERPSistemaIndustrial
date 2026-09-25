import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, unknown>
const DEFAULT_SUPABASE_URL = 'https://zsklkydlawgvwgnvxwwx.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BcwsSbBx8dWof7d_hAKtQA_XzQGAYwR'
const CONNECTION_MODE_KEY = 'erp_modo_conexao'
const connectionMode = typeof window !== 'undefined' ? window.localStorage.getItem(CONNECTION_MODE_KEY) : null
const localMode = connectionMode === 'local'
const configuredCloudUrl = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const cloudUrl = configuredCloudUrl === DEFAULT_SUPABASE_URL ? configuredCloudUrl : DEFAULT_SUPABASE_URL
const localUrl = String(env.VITE_SUPABASE_LOCAL_URL || 'http://localhost:54321').trim().replace(/\/$/, '')
const supabaseUrl = localMode ? localUrl : cloudUrl
const configuredKey = String(
  localMode
    ? (env.VITE_SUPABASE_LOCAL_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '')
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY,
).trim()
const isPrivateKey = configuredKey.startsWith('sb_secret_') || configuredKey.includes('service_role')

export const supabaseModoConexao = localMode ? 'local' : 'nuvem'
export const supabaseConfigurado = Boolean(supabaseUrl && configuredKey && !isPrivateKey)
export const supabaseEnvironmentMismatch = !localMode && configuredCloudUrl !== '' && configuredCloudUrl !== DEFAULT_SUPABASE_URL
export const supabaseUrlExportada = supabaseUrl
export const supabaseKeyExportada = isPrivateKey ? '' : configuredKey

if (localMode && !configuredKey) {
  console.error('[Supabase] Modo local selecionado, mas VITE_SUPABASE_LOCAL_ANON_KEY não foi configurada. Execute o ambiente local e configure a chave pública local.')
}

const clientUrl = supabaseUrl || DEFAULT_SUPABASE_URL
const clientKey = configuredKey && !isPrivateKey ? configuredKey : DEFAULT_SUPABASE_PUBLISHABLE_KEY

if (!supabaseConfigurado) console.error('[Supabase] Configuração pública inválida ou ausente.')
if (isPrivateKey) console.error('[Supabase] Chave privada/secret detectada no frontend. Ela foi rejeitada e não será usada.')

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'erp-industrial-auth' },
  global: { headers: { 'x-client-info': 'sgq-erp-industrial' } },
})

export async function getValidSession(minValiditySeconds = 60): Promise<Session> {
  if (!supabaseConfigurado) throw new Error('SUPABASE_ENV_NOT_CONFIGURED')
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
