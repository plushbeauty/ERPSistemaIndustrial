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
const BankReconciliation = lazy(() => import('./features/banking/BankReconciliation'))
const BankStatementImporter = lazy(() => import('./features/banking/BankStatementImporter'))
const ListaPrecosCliente = lazy(() => import('./features/banking/ListaPrecosCliente'))
const CadastroRegrasComissao = lazy(() => import('./features/comissoes/CadastroRegras'))
const CalculoComissao = lazy(() => import('./features/comissoes/CalculoComissao'))
const PerfilVendedor = lazy(() => import('./features/comissoes/PerfilVendedor'))
const AssistenteRetificacao = lazy(() => import('./features/controladoria/AssistenteRetificacao'))
const AuditoriaComissoes = lazy(() => import('./features/controladoria/AuditoriaComissoes'))
const CadastroDecimais = lazy(() => import('./features/controladoria/CadastroDecimais'))
const PainelLucratividade = lazy(() => import('./features/controladoria/PainelLucratividade'))
const PainelRazaoGeral = lazy(() => import('./features/controladoria/PainelRazaoGeral'))
const RetificacaoPedido = lazy(() => import('./features/controladoria/RetificacaoPedido'))

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
              <Route path="financeiro" element={<Navigate to="/pageprincipal/financeiro/conciliacao-bancaria" replace />} />
              <Route path="comissoes" element={<Navigate to="/pageprincipal/comissoes/regras" replace />} />
              <Route path="comissoes/regras" element={<CadastroRegrasComissao />} />
              <Route path="comissoes/calculo" element={<CalculoComissao />} />
              <Route path="comissoes/perfil" element={<PerfilVendedor />} />
              <Route path="comissoes/auditoria" element={<AuditoriaComissoes />} />
              <Route path="controladoria" element={<Navigate to="/pageprincipal/controladoria/lucratividade" replace />} />
              <Route path="controladoria/retificacao-assistente" element={<AssistenteRetificacao />} />
              <Route path="controladoria/auditoria-comissoes" element={<AuditoriaComissoes />} />
              <Route path="controladoria/cadastro-decimais" element={<CadastroDecimais />} />
              <Route path="controladoria/lucratividade" element={<PainelLucratividade />} />
              <Route path="controladoria/razao-geral" element={<PainelRazaoGeral />} />
              <Route path="controladoria/retificacao-pedido/:pedidoId" element={<RetificacaoPedido />} />
              <Route path="financeiro/conciliacao-bancaria" element={<QualityPlanGate><BankReconciliation /></QualityPlanGate>} />
              <Route path="financeiro/importar-extratos" element={<QualityPlanGate><BankStatementImporter /></QualityPlanGate>} />
              <Route path="financeiro/lista-precos-cliente" element={<QualityPlanGate><ListaPrecosCliente /></QualityPlanGate>} />
              <Route path="administracao-configuracoes" element={<AdministracaoConfiguracoesGlobais />} />
              <Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
              <Route path="pcp" element={<PCPWorkspace />} />
              <Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />
            </Route>
            <Route path="/compras" element={<Navigate to="/pageprincipal/compras" replace />} />
            <Route path="/financeiro" element={<Navigate to="/pageprincipal/financeiro" replace />} />
            <Route path="/comissoes" element={<Navigate to="/pageprincipal/comissoes" replace />} />
            <Route path="/comissoes/regras" element={<Navigate to="/pageprincipal/comissoes/regras" replace />} />
            <Route path="/comissoes/calculo" element={<Navigate to="/pageprincipal/comissoes/calculo" replace />} />
            <Route path="/comissoes/perfil" element={<Navigate to="/pageprincipal/comissoes/perfil" replace />} />
            <Route path="/comissoes/auditoria" element={<Navigate to="/pageprincipal/comissoes/auditoria" replace />} />
            <Route path="/controladoria" element={<Navigate to="/pageprincipal/controladoria" replace />} />
            <Route path="/controladoria/retificacao-assistente" element={<Navigate to="/pageprincipal/controladoria/retificacao-assistente" replace />} />
            <Route path="/controladoria/auditoria-comissoes" element={<Navigate to="/pageprincipal/controladoria/auditoria-comissoes" replace />} />
            <Route path="/controladoria/cadastro-decimais" element={<Navigate to="/pageprincipal/controladoria/cadastro-decimais" replace />} />
            <Route path="/controladoria/lucratividade" element={<Navigate to="/pageprincipal/controladoria/lucratividade" replace />} />
            <Route path="/controladoria/razao-geral" element={<Navigate to="/pageprincipal/controladoria/razao-geral" replace />} />
            <Route path="/controladoria/retificacao-pedido/:pedidoId" element={<Navigate to="/pageprincipal/controladoria/retificacao-pedido/:pedidoId" replace />} />
            <Route path="/financeiro/conciliacao-bancaria" element={<Navigate to="/pageprincipal/financeiro/conciliacao-bancaria" replace />} />
            <Route path="/financeiro/importar-extratos" element={<Navigate to="/pageprincipal/financeiro/importar-extratos" replace />} />
            <Route path="/financeiro/lista-precos-cliente" element={<Navigate to="/pageprincipal/financeiro/lista-precos-cliente" replace />} />
            <Route path="/configuracoes-adm" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
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
