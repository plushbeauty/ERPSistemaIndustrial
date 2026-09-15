import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type ERPProfile = {
  id: string
  empresa_id: string
  nome: string
  email: string | null
  nivel_admin: number
  ativo: boolean
  role_id: string | null
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

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || key.includes('supabase') || key === 'erp-industrial-auth') localStorage.removeItem(key)
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('sb-') || key.includes('supabase') || key === 'erp-industrial-auth') sessionStorage.removeItem(key)
    }
  } catch {
    // Storage may be unavailable in hardened/private browser contexts.
  }
}

async function loadProfile(userId: string): Promise<ERPProfile | null> {
  const { data: userRow, error: userError } = await supabase
    .from('erp_usuarios')
    .select('id,empresa_id,nome,email,nivel_admin,ativo,role_id,is_master')
    .eq('auth_user_id', userId)
    .eq('ativo', true)
    .maybeSingle()

  if (userError) throw userError
  if (!userRow || !userRow.empresa_id) return null

  // Multi-tenant validation is deliberately performed against the real ERP tables.
  // A valid Supabase Auth user is not enough to enter a tenant without an active company.
  const { data: company, error: companyError } = await supabase
    .from('erp_empresas')
    .select('id,ativo,plano_status,trial_ends_at')
    .eq('id', userRow.empresa_id)
    .maybeSingle()

  if (companyError) throw companyError
  if (!company || company.ativo === false) return null

  const status = String(company.plano_status ?? '').trim().toLowerCase()
  const trialEnds = company.trial_ends_at ? new Date(company.trial_ends_at).getTime() : null
  const trialExpired = trialEnds !== null && Number.isFinite(trialEnds) && Date.now() >= trialEnds && !['ativo', 'active'].includes(status)
  if (trialExpired) return null
  if (status && !['trial', 'ativo', 'active'].includes(status)) return null

  return userRow as ERPProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ERPProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let profileRequest = 0

    const applySession = async (next: Session | null) => {
      const requestId = ++profileRequest
      if (!mounted) return
      setSession(next)
      setProfile(null)
      setLoading(true)

      if (!next?.user) {
        setLoading(false)
        return
      }

      try {
        const nextProfile = await loadProfile(next.user.id)
        if (!mounted || requestId !== profileRequest) return
        setProfile(nextProfile)
      } catch (error) {
        console.error('[AuthProvider] Falha ao carregar perfil/empresa ERP:', error)
        if (mounted && requestId === profileRequest) setProfile(null)
      } finally {
        if (mounted && requestId === profileRequest) setLoading(false)
      }
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[AuthProvider] Falha ao restaurar sessão:', error)
      void applySession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      void applySession(next)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      clearAuthStorage()
      setProfile(null)
      setSession(null)
      if (typeof window !== 'undefined') window.location.replace('/login')
    }
  }

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}
