import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabaseClient'

type ERPProfile = {
  id: string
  email: string
  empresa_id: string
  role: string
  nivel_admin: number
  is_master: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: ERPProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function loadProfile(authUserId: string): Promise<ERPProfile | null> {
  const { data, error } = await supabase
    .from('erp_usuarios')
    .select('id,auth_user_id,email,empresa_id,role,nivel_admin,is_master,ativo,deleted_at')
    .eq('auth_user_id', authUserId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data || data.auth_user_id !== authUserId || !data.empresa_id) return null

  const { data: empresa, error: empresaError } = await supabase
    .from('erp_empresas')
    .select('id,ativo')
    .eq('id', data.empresa_id)
    .eq('ativo', true)
    .maybeSingle()

  if (empresaError) throw empresaError
  if (!empresa?.ativo) return null

  const role = String(data.role ?? '').trim().toUpperCase()
  if (!role) return null

  return {
    id: data.id,
    email: String(data.email ?? '').trim(),
    empresa_id: data.empresa_id,
    role,
    nivel_admin: Number(data.nivel_admin ?? 0),
    is_master: Boolean(data.is_master),
  }
}

function tenantClaim(session: Session | null): string | null {
  const value = session?.user?.app_metadata?.empresa_id
  return typeof value === 'string' && value.trim() ? value : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ERPProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const hydratedUserId = useRef<string | null>(null)
  const hydratedTenant = useRef<string | null>(null)
  const requestId = useRef(0)

  const hydrate = useCallback(async (next: Session | null, force = false) => {
    const currentRequest = ++requestId.current
    setSession(next)

    if (!next?.user) {
      hydratedUserId.current = null
      hydratedTenant.current = null
      setProfile(null)
      setLoading(false)
      return
    }

    const userId = next.user.id
    const tenant = tenantClaim(next)
    if (!force && hydratedUserId.current === userId && hydratedTenant.current === tenant && profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      if (!supabaseConfigurado) throw new Error('SUPABASE_ENV_NOT_CONFIGURED')
      const nextProfile = await loadProfile(userId)
      if (currentRequest !== requestId.current) return
      if (!nextProfile) throw new Error('ERP_PROFILE_NOT_AUTHORIZED')
      if (tenant && tenant !== nextProfile.empresa_id) throw new Error('ERP_TENANT_MISMATCH')

      hydratedUserId.current = userId
      hydratedTenant.current = nextProfile.empresa_id
      setProfile(nextProfile)
    } catch (error) {
      if (currentRequest !== requestId.current) return
      console.error('[AuthProvider] Falha ao validar perfil ERP:', error)
      setProfile(null)
      hydratedUserId.current = null
      hydratedTenant.current = null
      if (next?.user) await supabase.auth.signOut().catch(() => undefined)
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    let mounted = true

    if (!supabaseConfigurado) {
      setLoading(false)
      return () => { mounted = false }
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error('[AuthProvider] Falha ao restaurar sessão:', error)
      void hydrate(data.session, true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        void hydrate(null, true)
        return
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void hydrate(next, true)
        return
      }
      if (event === 'TOKEN_REFRESHED') {
        const nextUserId = next?.user?.id ?? null
        const nextTenant = tenantClaim(next)
        const changed = nextUserId !== hydratedUserId.current || nextTenant !== hydratedTenant.current
        if (changed) void hydrate(next, true)
        else setSession(next)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [hydrate])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      requestId.current += 1
      hydratedUserId.current = null
      hydratedTenant.current = null
      setProfile(null)
      setSession(null)
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}

export type { ERPProfile }
