import { lazy, Suspense } from 'react'
import PublicIndustrialHome from './PublicIndustrialHome'
import IndustrialVisualShowcase from './components/IndustrialVisualShowcase'

const AppEntryV2 = lazy(() => import('./AppEntryV2'))

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

  return (
    <Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Carregando SGQ ERP…</div>}>
      <AppEntryV2 />
    </Suspense>
  )
}
