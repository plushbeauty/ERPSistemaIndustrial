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
import './styles/erp-global-consistency-20261030.css'

const PagePrincipal = lazy(() => import('./pages/PagePrincipal'))
const AppIndustrial = lazy(() => import('./AppIndustrialV7'))
const Fiscal = lazy(() => import('./pages/Fiscal'))
const SetupADMInicial = lazy(() => import('./pages/SetupADMInicial'))
const PCPWorkspace = lazy(() => import('./pages/PCPWorkspace'))
const Paquimetro = lazy(() => import('./pages/QualidadePaquimetroDigital'))
const ComprasWorkspace = lazy(() => import('./pages/ComprasWorkspace'))
const SolicitacaoCompra = lazy(() => import('./pages/SolicitacaoCompra'))
const ComprasRequisicoes = lazy(() => import('./pages/ComprasRequisicoes'))
const RHIndustrial = lazy(() => import('./pages/RHIndustrial'))
const FichaProcesso = lazy(() => import('./features/pcp/FichaProcesso'))
const QualidadeRPNC = lazy(() => import('./pages/QualidadeRPNC'))
const AdministracaoConfiguracoesGlobais = lazy(() => import('./pages/AdministracaoConfiguracoesGlobais'))
// Controle de acesso do chão de fábrica — visível apenas para nível 8 e 9 (comando de 2026-10-30)
const AccessControlSettings = lazy(() => import('./pages/AccessControlSettings'))
const CentralAjuda = lazy(() => import('./pages/CentralAjuda'))
const FinanceiroWorkspace = lazy(() => import('./modules/financeiro/pages/FinanceiroWorkspace'))
// Páginas existentes sem rota — integradas ao menu em 2026-10-30 (comando de integração global)
const FileTreeGED = lazy(() => import('./pages/FileTreeGED'))
const PostosTrabalho = lazy(() => import('./features/pcp/PostosTrabalho'))
const RoteiroOperacoes = lazy(() => import('./features/pcp/RoteiroOperacoes'))
const AuditoriaSaldos = lazy(() => import('./features/inventario/AuditoriaSaldos'))
const BalancoEstoque = lazy(() => import('./features/inventario/BalancoEstoque'))
const RegrasDepreciacao = lazy(() => import('./features/inventario/RegrasDepreciacao'))
const BankReconciliation = lazy(() => import('./features/banking/BankReconciliation'))
const BankStatementImporter = lazy(() => import('./features/banking/BankStatementImporter'))
const ListaPrecosCliente = lazy(() => import('./features/banking/ListaPrecosCliente'))
const CadastroRegras = lazy(() => import('./features/comissoes/CadastroRegras'))
const CalculoComissao = lazy(() => import('./features/comissoes/CalculoComissao'))
const PerfilVendedor = lazy(() => import('./features/comissoes/PerfilVendedor'))
const AuditoriaComissoes = lazy(() => import('./features/controladoria/AuditoriaComissoes'))
const CadastroDecimais = lazy(() => import('./features/controladoria/CadastroDecimais'))
const PainelLucratividade = lazy(() => import('./features/controladoria/PainelLucratividade'))
const AssistenteRetificacao = lazy(() => import('./features/controladoria/AssistenteRetificacao'))
const RetificacaoPedido = lazy(() => import('./features/controladoria/RetificacaoPedido'))
const AnoFiscal = lazy(() => import('./features/fiscal/AnoFiscal'))
const AuditoriaDocumental = lazy(() => import('./features/fiscal/AuditoriaDocumental'))
const ClassificacaoFiscal = lazy(() => import('./features/fiscal/ClassificacaoFiscal'))
const EstornoLancamentos = lazy(() => import('./features/fiscal/EstornoLancamentos'))
const PainelRazaoGeral = lazy(() => import('./features/fiscal/PainelRazaoGeral'))
const CustomerDnList = lazy(() => import('./pages/CustomerDnList'))
const CustomerDnSettings = lazy(() => import('./pages/CustomerDnSettings'))
const CustomerDnPod = lazy(() => import('./pages/CustomerDnPod'))
const Master = lazy(() => import('./pages/Master'))
const PCPAreaFuncionario = lazy(() => import('./pages/PCPAreaFuncionario'))
const PCPCapacidade = lazy(() => import('./pages/PCPCapacidade'))
// Cadastro de Produtos — migrado em 2026-10-30 da branch legada para a origem única de código
const ProdutosVendasIndustrial = lazy(() => import('./pages/ProdutosVendasIndustrial'))
const ModuloCadastroProdutos = lazy(() => import('./pages/cadastro-produtos/ModuloCadastroProdutos'))
const ParametrosCodigo = lazy(() => import('./pages/cadastro-produtos/ParametrosCodigo'))
const HelpFichaTecnica = lazy(() => import('./pages/cadastro-produtos/HelpFichaTecnica'))
const HelpListagemProdutos = lazy(() => import('./pages/cadastro-produtos/HelpListagemProdutos'))
const HelpParametrosCodigo = lazy(() => import('./pages/cadastro-produtos/HelpParametrosCodigo'))

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
              <Route path="ajuda" element={<CentralAjuda />} />
              <Route path="financeiro" element={<FinanceiroWorkspace />} />
              <Route index element={<AppIndustrial />} />
              <Route path="compras" element={<ComprasWorkspace />} />
              <Route path="compras/solicitacao" element={<SolicitacaoCompra />} />
              <Route path="compras/requisicoes" element={<ComprasRequisicoes />} />
              <Route path="rh" element={<RHIndustrial />} />
              <Route path="pcp/fichas-processo" element={<FichaProcesso />} />
              <Route path="qualidade/rpnc" element={<QualityPlanGate><QualidadeRPNC /></QualityPlanGate>} />
              <Route path="administracao-configuracoes" element={<AdministracaoConfiguracoesGlobais />} />
              <Route path="configuracoes-usuario" element={<AccessControlSettings />} />
              <Route path="fiscal" element={<QualityPlanGate><Fiscal /></QualityPlanGate>} />
              <Route path="pcp" element={<PCPWorkspace />} />
              <Route path="pcp/roteiros" element={<QualityPlanGate><RoteiroOperacoes /></QualityPlanGate>} />
              <Route path="pcp/capacidade" element={<QualityPlanGate><PCPCapacidade /></QualityPlanGate>} />
              <Route path="chao-de-fabrica/postos" element={<QualityPlanGate><PostosTrabalho /></QualityPlanGate>} />
              <Route path="chao-de-fabrica/portal-operador" element={<PCPAreaFuncionario />} />
              <Route path="paquimetro" element={<QualityPlanGate><Paquimetro /></QualityPlanGate>} />
              <Route path="qualidade/ged" element={<QualityPlanGate><FileTreeGED /></QualityPlanGate>} />
              <Route path="estoque/auditoria-saldos" element={<QualityPlanGate><AuditoriaSaldos /></QualityPlanGate>} />
              <Route path="estoque/balanco" element={<QualityPlanGate><BalancoEstoque /></QualityPlanGate>} />
              <Route path="estoque/depreciacao" element={<QualityPlanGate><RegrasDepreciacao /></QualityPlanGate>} />
              <Route path="financeiro/conciliacao" element={<QualityPlanGate><BankReconciliation /></QualityPlanGate>} />
              <Route path="financeiro/extrato" element={<QualityPlanGate><BankStatementImporter /></QualityPlanGate>} />
              <Route path="financeiro/lista-precos" element={<QualityPlanGate><ListaPrecosCliente /></QualityPlanGate>} />
              <Route path="financeiro/comissoes" element={<QualityPlanGate><CalculoComissao /></QualityPlanGate>} />
              <Route path="financeiro/comissoes/regras" element={<QualityPlanGate><CadastroRegras /></QualityPlanGate>} />
              <Route path="financeiro/comissoes/perfil" element={<QualityPlanGate><PerfilVendedor /></QualityPlanGate>} />
              <Route path="financeiro/auditoria-comissoes" element={<QualityPlanGate><AuditoriaComissoes /></QualityPlanGate>} />
              <Route path="financeiro/decimais" element={<QualityPlanGate><CadastroDecimais /></QualityPlanGate>} />
              <Route path="financeiro/lucratividade" element={<QualityPlanGate><PainelLucratividade /></QualityPlanGate>} />
              <Route path="financeiro/retificacao" element={<QualityPlanGate><RetificacaoPedido /></QualityPlanGate>} />
              <Route path="financeiro/retificacao-assistente" element={<QualityPlanGate><AssistenteRetificacao /></QualityPlanGate>} />
              <Route path="financeiro/notas-debito" element={<QualityPlanGate><CustomerDnList /></QualityPlanGate>} />
              <Route path="financeiro/notas-debito/configuracoes" element={<QualityPlanGate><CustomerDnSettings /></QualityPlanGate>} />
              <Route path="financeiro/notas-debito/:id/pod" element={<QualityPlanGate><CustomerDnPod /></QualityPlanGate>} />
              <Route path="fiscal/ano" element={<QualityPlanGate><AnoFiscal /></QualityPlanGate>} />
              <Route path="fiscal/classificacao" element={<QualityPlanGate><ClassificacaoFiscal /></QualityPlanGate>} />
              <Route path="fiscal/auditoria-documental" element={<QualityPlanGate><AuditoriaDocumental /></QualityPlanGate>} />
              <Route path="fiscal/estorno" element={<QualityPlanGate><EstornoLancamentos /></QualityPlanGate>} />
              <Route path="fiscal/razao" element={<QualityPlanGate><PainelRazaoGeral /></QualityPlanGate>} />
              <Route path="master" element={<Master />} />
              <Route path="cadastros/produtos" element={<ProdutosVendasIndustrial />} />
              <Route path="cadastros/produtos/imprimir" element={<ProdutosVendasIndustrial />} />
              <Route path="cadastros/produtos/ficha-tecnica" element={<ModuloCadastroProdutos />} />
              <Route path="cadastros/produtos/parametros-codigo" element={<ParametrosCodigo />} />
              <Route path="cadastros/ajuda/ficha-tecnica" element={<HelpFichaTecnica />} />
              <Route path="cadastros/ajuda/listagem-produtos" element={<HelpListagemProdutos />} />
              <Route path="cadastros/ajuda/parametros-codigo" element={<HelpParametrosCodigo />} />
            </Route>
            <Route path="/ajuda" element={<Navigate to="/pageprincipal/ajuda" replace />} />
            <Route path="/financeiro" element={<Navigate to="/pageprincipal/financeiro" replace />} />
            <Route path="/compras" element={<Navigate to="/pageprincipal/compras" replace />} />
            <Route path="/rh" element={<Navigate to="/pageprincipal/rh" replace />} />
            <Route path="/pcp/fichas-processo" element={<Navigate to="/pageprincipal/pcp/fichas-processo" replace />} />
            <Route path="/compras/solicitacao" element={<Navigate to="/pageprincipal/compras/solicitacao" replace />} />
            <Route path="/compras/requisicoes" element={<Navigate to="/pageprincipal/compras/requisicoes" replace />} />
            <Route path="/qualidade/rpnc" element={<Navigate to="/pageprincipal/qualidade/rpnc" replace />} />
            <Route path="/configuracoes-adm" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/administracao-configuracoes" element={<Navigate to="/pageprincipal/administracao-configuracoes" replace />} />
            <Route path="/erp-industrial" element={<Navigate to="/pageprincipal" replace />} />
            <Route path="/cadastros" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos-vendas" element={<Navigate to="/pageprincipal/cadastros/produtos" replace />} />
            <Route path="/produtos-vendas/imprimir" element={<Navigate to="/pageprincipal/cadastros/produtos/imprimir" replace />} />
            <Route path="/cadastro-produtos" element={<Navigate to="/pageprincipal/cadastros/produtos/ficha-tecnica" replace />} />
            <Route path="/cadastro-produtos/parametros-codigo" element={<Navigate to="/pageprincipal/cadastros/produtos/parametros-codigo" replace />} />
            <Route path="/ajuda/ficha-tecnica" element={<Navigate to="/pageprincipal/cadastros/ajuda/ficha-tecnica" replace />} />
            <Route path="/ajuda/listagem-produtos" element={<Navigate to="/pageprincipal/cadastros/ajuda/listagem-produtos" replace />} />
            <Route path="/ajuda/parametros-codigo" element={<Navigate to="/pageprincipal/cadastros/ajuda/parametros-codigo" replace />} />
            <Route path="/fiscal" element={<Navigate to="/pageprincipal/fiscal" replace />} />
            <Route path="/pcp" element={<Navigate to="/pageprincipal/pcp" replace />} />
            <Route path="/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/qualidade/paquimetro" element={<Navigate to="/pageprincipal/paquimetro" replace />} />
            <Route path="/qualidade/ged-documentos" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/qualidade/documentos" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/documentos-qualidade" element={<Navigate to="/pageprincipal/qualidade/ged" replace />} />
            <Route path="/pcp/roteiros" element={<Navigate to="/pageprincipal/pcp/roteiros" replace />} />
            <Route path="/pcp/capacidade" element={<Navigate to="/pageprincipal/pcp/capacidade" replace />} />
            <Route path="/pcp/portal-operador" element={<Navigate to="/pageprincipal/chao-de-fabrica/portal-operador" replace />} />
            <Route path="/area-funcionario" element={<Navigate to="/pageprincipal/chao-de-fabrica/portal-operador" replace />} />
            <Route path="/master" element={<Navigate to="/pageprincipal/master" replace />} />
            <Route path="*" element={<Navigate to="/pageprincipal" replace />} />
          </Routes>
        </ERPHorizontalShell>
      </div>
    </Suspense>
  )
}
