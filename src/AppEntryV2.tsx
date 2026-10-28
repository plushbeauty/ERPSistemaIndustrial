import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ERPHorizontalShell from './components/layout/ERPHorizontalShell'
import QualityPlanGate from './components/quality/QualityPlanGate'
import './styles/rh-industrial-theme.css'
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/erp-design-system-2026.css'
import './styles/synqra-app-shell.css'
import './styles/synqra-workspace-standard.css'

const PagePrincipal = lazy(() => import('./pages/PagePrincipal'))
const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const PCPWorkspace = lazy(() => import('./pages/PCPWorkspace'))
const Paquimetro = lazy(() => import('./pages/QualidadePaquimetroDigital'))
const RHIndustrial = lazy(() => import('./pages/RHIndustrial'))

function LoadingWorkspace() {
  return <main role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#123b50', fontFamily: 'Inter,system-ui,sans-serif' }}>Carregando SYSNQRA ERP INDUSTRIAL…</main>
}

export default function AppEntryV2() {
  return (
    <Suspense fallback={<LoadingWorkspace />}>
      <div className="erp-global-surface">
        <ERPHorizontalShell>
          <Routes>
            <Route path="/cadastro-master" element={<SetupADMInicial />} />
            <Route path="/pageprincipal" element={<PagePrincipal />}>
              <Route index element={<AppIndustrial />} />
              <Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
              <Route path="pcp" element={<PCPWorkspace />} />
              <Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />
              <Route path="rh" element={<RHIndustrial />} />
            </Route>
            <Route path="/erp-industrial" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/cadastros" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/fiscal" element={<Navigate to="/pageprincipal/fiscal" replace />} />
            <Route path="/pcp" element={<Navigate to="/pageprincipal/pcp" replace />} />
            <Route path="/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/rh" element={<Navigate to="/pageprincipal/rh" replace />} />
            <Route path="/qualidade/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="*" element={<Navigate to="/pageprincipal" replace />} />
          </Routes>
        </ERPHorizontalShell>
      </div>
    </Suspense>
  )
}
