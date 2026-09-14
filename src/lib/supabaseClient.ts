import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js'

const env = import.meta.env

/*
 * URL REAL DO PROJETO SUPABASE DO ERP INDUSTRIAL.
 *
 * Não usar:
 * https://supabase.co
 *
 * O domínio de projeto precisa conter o ref.
 */
const DEFAULT_SUPABASE_URL =
  'https://zsklkydlawgvwgnvxwwx.supabase.co'

const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_BcwsSbBx8dWof7d_hAKtQA_XzQGAYwR'

export const supabaseUrl = String(
  env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL,
).trim()

export const supabaseKey = String(
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY,
).trim()

export const supabaseConfigurado =
  Boolean(
    supabaseUrl &&
      supabaseKey,
  )

export const supabase: SupabaseClient =
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey:
          'erp-industrial-auth',
      },
    },
  )

export async function getValidSession(
  minValiditySeconds = 60,
): Promise<Session> {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession()

  if (error) {
    throw error
  }

  let session =
    data.session

  const expiresAt =
    Number(
      session?.expires_at ?? 0,
    )

  const needsRefresh =
    !session?.access_token ||
    !session?.refresh_token ||
    !expiresAt ||
    expiresAt * 1000 -
      Date.now() <
      minValiditySeconds *
        1000

  if (needsRefresh) {
    const refreshed =
      await supabase.auth.refreshSession()

    if (
      refreshed.error ||
      !refreshed.data.session
    ) {
      throw (
        refreshed.error ??
        new Error(
          'AUTH_SESSION_REQUIRED',
        )
      )
    }

    session =
      refreshed.data.session
  }

  if (
    !session?.access_token ||
    !session.user
  ) {
    throw new Error(
      'AUTH_SESSION_REQUIRED',
    )
  }

  return session
}

export async function getAccessTokenOrThrow(): Promise<string> {
  const session =
    await getValidSession()

  return session.access_token
}

export async function rpcAutenticado<
  T = unknown,
>(
  functionName: string,
  args: Record<
    string,
    unknown
  > = {},
): Promise<T> {
  const session =
    await getValidSession()

  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(
        functionName,
      )}`,
      {
        method: 'POST',

        headers: {
          apikey:
            supabaseKey,

          Authorization:
            `Bearer ${session.access_token}`,

          'Content-Type':
            'application/json',

          Accept:
            'application/json',
        },

        body: JSON.stringify(
          args,
        ),
      },
    )

  const raw =
    await response.text()

  let data: unknown =
    null

  try {
    data = raw
      ? JSON.parse(raw)
      : null
  } catch {
    data = raw
  }

  if (!response.ok) {
    const message =
      typeof data ===
        'object' &&
      data !== null &&
      'message' in data
        ? String(
            (
              data as {
                message: unknown
              }
            ).message,
          )
        : raw ||
          response.statusText

    if (
      response.status ===
      401
    ) {
      throw new Error(
        `AUTH_SESSION_REQUIRED: ${message}`,
      )
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        `AUTH_FORBIDDEN: ${message}`,
      )
    }

    throw new Error(
      `RPC_HTTP_${response.status}: ${message}`,
    )
  }

  return data as T
}
