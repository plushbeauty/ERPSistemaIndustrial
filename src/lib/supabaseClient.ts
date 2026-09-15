import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env
const CANONICAL_SUPABASE_URL = 'https://wdkvrqekixczuhrfygen.supabase.co'
const CANONICAL_PUBLISHABLE_KEY = 'sb_publishable_QX10nEg-hrWd_5UOuYSpQg_v5M-1xuM'
const envUrl = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const envKey = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const isPrivateKey = envKey.startsWith('sb_secret_') || envKey.includes('service_role')
const supabaseUrl = envUrl === CANONICAL_SUPABASE_URL ? envUrl : CANONICAL_SUPABASE_URL
const supabaseKey = !isPrivateKey && envKey ? envKey : CANONICAL_PUBLISHABLE_KEY
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey && !isPrivateKey)
export const supabaseUrlExportada = supabaseUrl
export const supabaseKeyExportada = supabaseKey
export const supabaseEnvironmentMismatch = Boolean(envUrl && envUrl !== CANONICAL_SUPABASE_URL)
if (supabaseEnvironmentMismatch) console.warn(`Supabase URL corrigida para o projeto industrial oficial: ${CANONICAL_SUPABASE_URL}`)
if (isPrivateKey) console.error('Chave privada detectada em VITE_SUPABASE_PUBLISHABLE_KEY; o frontend ignorou essa chave e usou a chave pública do projeto.')
const missingConfigClient = new Proxy({} as SupabaseClient, { get() { throw new Error('SUPABASE_CONFIG_MISSING: Supabase não configurado') } })
export const supabase: SupabaseClient = supabaseConfigurado ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'erp-industrial-auth' }, global: { headers: { 'x-client-info': 'sgq-erp-industrial' } } }) : missingConfigClient
export async function getValidSession(minValiditySeconds = 60): Promise<Session> { const { data, error } = await supabase.auth.getSession(); if (error) throw error; let session = data.session; const expiresAt = Number(session?.expires_at ?? 0); if (session?.refresh_token && (!expiresAt || expiresAt * 1000 - Date.now() < minValiditySeconds * 1000)) { const refreshed = await supabase.auth.refreshSession(); if (!refreshed.error && refreshed.data.session) session = refreshed.data.session } if (!session?.access_token || !session.user) throw new Error('AUTH_SESSION_REQUIRED'); return session }
export async function getAccessTokenOrThrow(): Promise<string> { return (await getValidSession()).access_token }
export async function rpcAutenticado<T = unknown>(functionName: string, args: Record<string, unknown> = {}): Promise<T> { const session = await getValidSession(); const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`, { method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(args) }); const raw = await response.text(); let data: unknown = null; try { data = raw ? JSON.parse(raw) : null } catch { data = raw } if (!response.ok) throw new Error(typeof data === 'object' && data !== null && 'message' in data ? String((data as { message: unknown }).message) : raw || response.statusText); return data as T }
