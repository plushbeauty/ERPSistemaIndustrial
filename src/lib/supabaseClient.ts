/**
 * SYNQRA ERP — AUDITORIA DE AUTENTICAÇÃO E RPC
 * REVISÃO: 0.3.1 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-20261016-17
 * ESCOPO: configuração Supabase por ambiente, sessão do navegador, Edge Functions e RPC.
 * ALTERAÇÃO: removidos fallbacks estáticos; RPC via supabase.rpc(); erros de sessão tratados pelo SDK.
 * PRESERVADO: storageKey erp-industrial-auth, sessionStorage, renovação de token e x-client-info.
 * VALIDAÇÃO: commit no GitHub; type-check, lint, build, testes reais de Auth/RLS e deploy pendentes.
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const AUTH_STORAGE_KEY = 'erp-industrial-auth'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    '',
).trim()

// Não conectar silenciosamente a um projeto fixo quando a configuração estiver ausente.
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'CRITICAL_ENV_ERROR: configure VITE_SUPABASE_URL e uma chave pública Supabase no ambiente.',
  )
}

export const supabaseConfigurado = true
export const supabaseModoConexao = 'nuvem'
export const supabaseUrlExportada = supabaseUrl

// Remove somente a sessão antiga persistida pela versão anterior.
// A sessão atual continua restrita ao sessionStorage da aba/janela.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // O navegador pode bloquear localStorage; não persistimos a sessão nele.
  }
}

const authStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined

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

/**
 * Recupera a sessão e renova o token quando estiver próximo de expirar.
 * Não devolve silenciosamente uma sessão vencida se a renovação falhar.
 */
export async function getValidSession(minValiditySeconds = 60): Promise<Session> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  let session = data.session
  const expiresAt = Number(session?.expires_at ?? 0)
  const needsRefresh =
    Boolean(session?.refresh_token) &&
    (!expiresAt || expiresAt * 1000 - Date.now() < minValiditySeconds * 1000)

  if (needsRefresh) {
    const refreshed = await supabase.auth.refreshSession()
    if (refreshed.error) throw refreshed.error
    if (refreshed.data.session) session = refreshed.data.session
  }

  if (!session?.access_token || !session.user) {
    throw new Error('AUTH_SESSION_REQUIRED')
  }

  const finalExpiresAt = Number(session.expires_at ?? 0)
  if (finalExpiresAt > 0 && finalExpiresAt * 1000 <= Date.now()) {
    throw new Error('AUTH_SESSION_EXPIRED')
  }

  return session
}

/** Obtém o token JWT da sessão autenticada e validada. */
export async function getAccessTokenOrThrow(): Promise<string> {
  return (await getValidSession()).access_token
}

/**
 * Invoca uma Edge Function pelo SDK oficial do Supabase.
 * O SDK administra apikey e cabeçalhos; o token é fornecido explicitamente
 * para garantir que a chamada use a sessão validada acima.
 */
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
      },
    })

    if (error) throw error
    return { data: data as T, error: null }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('EDGE_FUNCTION_REQUEST_FAILED')
    console.error(`[Edge Function ${functionName}]`, normalized.message)
    return { data: null, error: normalized }
  }
}

/**
 * Executa uma função PostgreSQL via SDK oficial.
 * O SDK aplica a sessão atual e normaliza os erros PostgREST.
 * RLS, GRANTs e as permissões da própria função continuam obrigatórios no banco.
 */
export async function rpcAutenticado<T = unknown>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  await getValidSession()

  const { data, error } = await supabase.rpc(functionName, args)
  if (error) throw error

  return data as T
}
