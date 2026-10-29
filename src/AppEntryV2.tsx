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
import './styles/compras-workspace.css'

const PagePrincipal = lazy(() => import('./pages/PagePrincipal'))
const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const PCPWorkspace = lazy(() => import('./pages/PCPWorkspace'))
const Paquimetro = lazy(() => import('./pages/QualidadePaquimetroDigital'))
const ComprasWorkspace = lazy(() => import('./pages/ComprasWorkspace'))
const AdministracaoConfiguracoesGlobais = lazy(() => import('./pages/AdministracaoConfiguracoesGlobais'))
const SetupWizardScreen = lazy(() => import('./pages/SetupWizardScreen'))
const RecebimentoMateriaisXML = lazy(() => import('./pages/RecebimentoMateriaisXML'))
const AccountJournalsScreen = lazy(() => import('./pages/AccountJournalsScreen'))
const SystemParametersScreen = lazy(() => import('./pages/SystemParametersScreen'))

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
              <Route path="compras" element={<ComprasWorkspace />} />
              <Route path="compras/pedidos" element={<ComprasWorkspace initialTab="pedidos" />} />
              <Route path="administracao-configuracoes" element={<AdministracaoConfiguracoesGlobais />} />
              <Route path="configuracoes/usuarios" element={<AdministracaoConfiguracoesGlobais initialSection="usuarios" />} />
              <Route path="configuracao-inicial" element={<SetupWizardScreen />} />
              <Route path="recebimento-nfe" element={<RecebimentoMateriaisXML />} />
              <Route path="estoque/recebimento" element={<RecebimentoMateriaisXML />} />
              <Route path="producao/op" element={<PCPWorkspace initialTab="emissao" />} />
              <Route path="producao/operador" element={<PCPWorkspace initialTab="turno" />} />
              <Route path="producao/ficha-processo" element={<PCPWorkspace initialTab="processo" />} />
              <Route path="diarios-contabeis" element={<AccountJournalsScreen />} />
              <Route path="parametros-sistema" element={<SystemParametersScreen />} />
              <Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
              <Route path="pcp" element={<PCPWorkspace />} />
              <Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />
            </Route>
            <Route path="/compras" element={<Navigate to="/pageprincipal/compras" replace />} />
            <Route path="/compras/pedidos" element={<Navigate to="/pageprincipal/compras/pedidos" replace />} />
            <Route path="/configuracoes/usuarios" element={<Navigate to="/pageprincipal/configuracoes/usuarios" replace />} />
            <Route path="/estoque/recebimento" element={<Navigate to="/pageprincipal/estoque/recebimento" replace />} />
            <Route path="/producao/op" element={<Navigate to="/pageprincipal/producao/op" replace />} />
            <Route path="/producao/operador" element={<Navigate to="/pageprincipal/producao/operador" replace />} />
            <Route path="/producao/ficha-processo" element={<Navigate to="/pageprincipal/producao/ficha-processo" replace />} />
            <Route path="/configuracoes-adm" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/setup-inicial" element={<Navigate to="/pageprincipal/configuracao-inicial" replace />} />
            <Route path="/recebimento-nfe" element={<Navigate to="/pageprincipal/recebimento-nfe" replace />} />
            <Route path="/recebimento-materiais" element={<Navigate to="/pageprincipal/recebimento-nfe" replace />} />
            <Route path="/diarios-contabeis" element={<Navigate to="/pageprincipal/diarios-contabeis" replace />} />
            <Route path="/parametros-sistema" element={<Navigate to="/pageprincipal/parametros-sistema" replace />} />
            <Route path="/administracao-configuracoes" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/erp-industrial" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/cadastros" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/fiscal" element={<Navigate to="/pageprincipal/fiscal" replace />} />
            <Route path="/pcp" element={<Navigate to="/pageprincipal/pcp" replace />} />
            <Route path="/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/qualidade/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="*" element={<Navigate to="/pageprincipal" replace />} />
          </Routes>
        </ERPHorizontalShell>
      </div>
    </Suspense>
  )
}
