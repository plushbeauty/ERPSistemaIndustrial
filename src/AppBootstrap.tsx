import { lazy, Suspense } from 'react'
import PublicIndustrialHome from './PublicIndustrialHome'
import IndustrialVisualShowcase from './components/IndustrialVisualShowcase'

const AppEntryV2 = lazy(() => import('./AppEntryV2'))

export default function AppBootstrap() {
  const path = window.location.pathname

  if (path === '/' || path === '/home') {
    return (
      <>
        <PublicIndustrialHome />
        <IndustrialVisualShowcase />
      </>
    )
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Carregando SGQ ERP…</div>}>
      <AppEntryV2 />
    </Suspense>
  )
}
