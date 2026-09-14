import { useEffect, useState } from 'react'
import AppEntryV2 from './AppEntryV2'
import IndustrialDashboardPremium from './pages/IndustrialDashboardPremium'
import { supabase } from './lib/supabaseClient'
import './styles/industrial-public-restoration.css'

export default function AppEntryPremium() {
  const [path, setPath] = useState(location.pathname)
  const [auth, setAuth] = useState(false)

  useEffect(() => {
    const update = () => setPath(location.pathname)
    addEventListener('popstate', update)
    void supabase.auth.getSession().then(({ data }) => setAuth(Boolean(data.session)))
    const sub = supabase.auth.onAuthStateChange((_event, session) => setAuth(Boolean(session)))
    return () => { removeEventListener('popstate', update); sub.data.subscription.unsubscribe() }
  }, [])

  if (path === '/erp-industrial' && auth) return <IndustrialDashboardPremium />
  return <AppEntryV2 />
}
