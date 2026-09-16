import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import PublicIndustrialHome from './PublicIndustrialHome'
import IndustrialVisualShowcase from './components/IndustrialVisualShowcase'
import { supabase } from './lib/supabaseClient'
import './styles/index.css'
import './styles/public-industrial.css'
import './styles/public-home-v2.css'
import './styles/industrial-public-restoration.css'
import './styles/visual-showcase-2026.css'

const AppEntryV2 = lazy(() => import('./AppEntryV2'))

const protectedOverviewPaths = new Set([
  '/modulos/pcp',
  '/modulos/estoque',
  '/modulos/recebimento',
  '/modulos/qualidade',
  '/modulos/manutencao',
  '/modulos/fiscal',
  '/modulos/indicadores',
])

function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session?.user) {
          if (alive) setState('denied')
          return
        }
        const metadata = data.session.user.app_metadata ?? {}
        const empresaId = typeof metadata.empresa_id === 'string' ? metadata.empresa_id.trim() : ''
        const role = typeof metadata.role === 'string' ? metadata.role.trim() : ''
        if (!empresaId || !role) {
          if (alive) setState('denied')
          return
        }
        if (alive) setState('allowed')
      } catch (error) {
        console.error('[Protected overview]', error)
        if (alive) setState('denied')
      }
    })()
    return () => { alive = false }
  }, [])

  if (state === 'checking') {
    return <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Validando acesso…</div>
  }
  if (state === 'denied') {
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    return null
  }
  return <>{children}</>
}

export default function AppBootstrap() {
  const path = window.location.pathname

  if (path === '/' || path === '/home') {
    return (
      <main aria-label="SGQ ERP Industrial">
        <PublicIndustrialHome />
        <IndustrialVisualShowcase />
      </main>
    )
  }

  const app = (
    <Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Carregando SGQ ERP…</div>}>
      <AppEntryV2 />
    </Suspense>
  )

  return protectedOverviewPaths.has(path) ? <AccessGate>{app}</AccessGate> : app
}
