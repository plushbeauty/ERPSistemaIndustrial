import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ERPHorizontalShell from './components/layout/ERPHorizontalShell'
import QualityPlanGate from './components/quality/QualityPlanGate'
import './styles/rh-industrial-theme.css'
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/erp-design-system-2026.css'
import './styles/synqra-app-shell.css'

const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const Fiscal = lazy(() => import('./pages/Fiscal'))

function LoadingWorkspace() {
  return <main role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#123b50', fontFamily: 'Inter,system-ui,sans-serif' }}>Carregando SYSNQRA ERP INDUSTRIAL…</main>
}

export default function AppEntryV2() {
  return (
    <Suspense fallback={<LoadingWorkspace />}>
      <div className="erp-global-surface">
        <ERPHorizontalShell>
          <Routes>
            <Route path="/erp-industrial" element={<AppIndustrial />} />
            <Route path="/fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
            <Route path="*" element={<Navigate to="/erp-industrial" replace />} />
          </Routes>
        </ERPHorizontalShell>
      </div>
    </Suspense>
  )
}
