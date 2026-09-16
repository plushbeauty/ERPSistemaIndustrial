import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type ERPProfile = {
  id: string
  email: string
  empresa_id: string
  role: string
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: ERPProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function loadProfile(userId: string): Promise<ERPProfile | null> {
  const { data, error } = await supabase
    .from('erp_usuarios')
    .select('id,email,empresa_id,role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const profile = data as ERPProfile
  if (!profile.id || profile.id !== userId) throw new Error('Perfil ERP não corresponde ao usuário autenticado.')
  if (!profile.email?.trim()) throw new Error('Perfil ERP sem email válido.')
  if (!profile.empresa_id?.trim()) throw new Error('Perfil ERP sem empresa vinculada.')
  if (!profile.role?.trim()) throw new Error('Perfil ERP sem role válida.')

  return profile
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
      const nextProfile = await loadProfile(userId)
      if (currentRequest !== requestId.current) return
      if (!nextProfile) throw new Error('Usuário autenticado não possui perfil ERP.')
      if (tenant && tenant !== nextProfile.empresa_id) throw new Error('A empresa da sessão não corresponde ao perfil ERP.')
      hydratedUserId.current = userId
      hydratedTenant.current = nextProfile.empresa_id
      setProfile(nextProfile)
    } catch (error) {
      if (currentRequest !== requestId.current) return
      console.error('[AuthProvider] Falha ao carregar perfil ERP:', error)
      setProfile(null)
      hydratedUserId.current = null
      hydratedTenant.current = null
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    let mounted = true

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
      if (event === 'SIGNED_IN') {
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
