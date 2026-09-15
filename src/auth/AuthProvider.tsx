import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type AuthContextValue = { session: Session | null; user: User | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('sb-') || key.includes('supabase')) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('sb-') || key.includes('supabase')) sessionStorage.removeItem(key)
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])
  async function signOut() {
    try { await supabase.auth.signOut() } finally { clearAuthStorage(); setSession(null); if (typeof window !== 'undefined') window.location.replace('/login') }
  }
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider'); return value }
