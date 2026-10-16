/**
 * SYNQRA ERP — CORREÇÃO DE SESSÃO E ROTAS MESTRE
 * REVISÃO: 0.3 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-20261016-15
 * ESCOPO: Autenticação Supabase, armazenamento em sessionStorage e blindagem de segurança.
 * ALTERAÇÃO: Remoção de chaves hardcoded, refatoração de RPC manual para o SDK nativo.
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

// Definição estrita das chaves de ambiente (Seguindo o padrão de isolamento do LaraERP)
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// Falha deliberada no bootstrap se as variáveis essenciais não existirem (Impede comportamento imprevisível)
if (!supabaseUrl || !supabaseKey) {
  throw new Error('CRITICAL_ENV_ERROR: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias.')
}

export const supabaseConfigurado = true
export const supabaseModoConexao = 'nuvem'
export const supabaseUrlExportada = supabaseUrl
export const supabaseKeyExportada = supabaseKey

// Limpeza segura do armazenamento persistente legado
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('erp-industrial-auth')
  } catch {
    // Silencia se o navegador bloquear o acesso ao localStorage
  }
}

const authStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined

// Instanciação limpa e configurada do cliente Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'erp-industrial-auth',
    storage: authStorage,
  },
  global: { headers: { 'x-client-info': 'sgq-erp-industrial' } },
})

/**
 * Recupera a sessão ativa e força a renovação do token caso esteja próximo de expirar.
 */
export async function getValidSession(minValiditySeconds = 60): Promise<Session> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  let session = data.session
  const expiresAt = Number(session?.expires_at ?? 0)

  if (session?.refresh_token && (!expiresAt || expiresAt * 1000 - Date.now() < minValiditySeconds * 1000)) {
    const refreshed = await supabase.auth.refreshSession()
    if (!refreshed.error && refreshed.data.session) {
      session = refreshed.data.session
    }
  }

  if (!session?.access_token || !session.user) {
    throw new Error('AUTH_SESSION_REQUIRED')
  }
  return session
}

/**
 * Atalho seguro para obter o token JWT de acesso.
 */
export async function getAccessTokenOrThrow(): Promise<string> {
  return (await getValidSession()).access_token
}

/**
 * Invoca uma Edge Function garantindo o cabeçalho de autorização correto.
 */
export async function invokeSecureEdgeFunction<T = unknown>(
  functionName: string,
  payload: unknown,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // O próprio SDK injeta a credencial nativa se estiver autenticado, mas garantimos o contexto aqui
    await getValidSession()
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload as Record<string, unknown>,
    })

    if (error) throw error
    return { data: data as T, error: null }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error))
    console.error(`[Edge Function ${functionName}]`, normalized.message)
    return { data: null, error: normalized }
  }
}

/**
 * Executa uma Procedure (RPC) no banco de dados de forma autenticada.
 * Refatorado: Removeu o fetch manual com exposição de headers e adotou o cliente nativo (Padrão Repository).
 */
export async function rpcAutenticado<T = unknown>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  // Garante que a sessão está de fato válida e ativa antes de bater no banco
  await getValidSession()

  // Executa via camada do SDK Supabase (Garante a criptografia e tratamento nativo de dados)
  const { data, error } = await supabase.rpc(functionName, args)

  if (error) {
    console.error(`[RPC Database Error ${functionName}]`, error.message)
    throw new Error(error.message || `Falha ao executar a função interna: ${functionName}`)
  }

  return data as T
}
