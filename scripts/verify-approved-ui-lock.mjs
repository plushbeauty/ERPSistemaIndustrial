import { existsSync, readFileSync } from 'node:fs'

/**
 * Phase-one reset contract, authorized by the user on 2026-10-28.
 * Retires legacy page-hash locks for modules being rebuilt from zero.
 * Locks the shared workspace, authentication, start-menu navigation, PCP,
 * Paquímetro and Fiscal contracts without weakening security/build checks.
 * Ordem do proprietario (2026-11-02): a barra Windows 11 da base da tela foi
 * deletada e nao pode voltar; o destaque laranja do menu tambem saiu.
 */
const read = (path) => readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const bootstrap = read('src/AppBootstrap.tsx')
const page = read('src/pages/PagePrincipal.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const sgqTablet = read('src/components/quality/qualityTabletModules.ts')
const planGate = read('src/components/quality/QualityPlanGate.tsx')

const requiredFiles = [
  'src/IndustrialLoginDirect.tsx',
  'src/PublicIndustrialHome.tsx',
  'src/AppIndustrialV7.tsx',
  'src/pages/PagePrincipal.tsx',
  'src/pages/SetupADMInicial.tsx',
  'src/pages/Master.tsx',
  'src/pages/PCPWorkspace.tsx',
  'src/pages/QualidadePaquimetroDigital.tsx',
  'src/pages/Fiscal.tsx',
  'src/pages/ComprasWorkspace.tsx',
  'src/pages/RHIndustrial.tsx',
  'src/pages/SolicitacaoCompra.tsx',
  'src/pages/ComprasRequisicoes.tsx',
  'src/pages/QualidadeRPNC.tsx',
  'src/features/pcp/FichaProcesso.tsx',
  'src/styles/erp-global-consistency-20261030.css',
  'src/pages/AdministracaoConfiguracoesGlobais.tsx',
  'src/styles/compras-workspace.css',
  'src/components/layout/ERPHorizontalShell.tsx',
  'src/styles/synqra-workspace-standard.css',
]
const checks = [
  ['PagePrincipal is a shared Outlet workspace, without a second shell', page.includes('Outlet') && !page.includes('ERPHorizontalShell')],
  ['Exactly one global shell wraps the routes', (app.match(/<ERPHorizontalShell>/g) ?? []).length === 1 && app.includes('<Routes>')],
  ['Login and Supabase session gate remain intact', existsSync('src/IndustrialLoginDirect.tsx') && bootstrap.includes('IndustrialLoginDirect') && bootstrap.includes('supabase.auth.getSession()') && bootstrap.includes('function AccessGate')],
  ['Tenant isolation and Master identity contract remain present', bootstrap.includes("from('erp_usuarios')") && bootstrap.includes("from('erp_empresas')") && bootstrap.includes('empresa_id') && bootstrap.includes('nivel_admin') && bootstrap.includes('is_master')],
  ['PCP, Paquímetro, Fiscal, Compras and Configurações are nested under PagePrincipal', app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="fiscal"') && app.includes('path="compras"') && app.includes('path="administracao-configuracoes"')],
  ['RH, Compras, RPNC and Fichas de Processo remain registered after login', app.includes('path="rh"') && app.includes('path="qualidade/rpnc"') && app.includes('path="compras/solicitacao"') && app.includes('path="compras/requisicoes"') && app.includes('path="pcp/fichas-processo"')],
  // Ordem do proprietario (#108): a Qualidade saiu do dropdown do Iniciar e passou a abrir o painel
  // flutuante do SGQ, entao o RPNC e conferido no catalogo do tablet, nao mais no shell.
  ['Start menu exposes RH, PCP Fichas, RPNC and Compras entries', shell.includes("label: 'RH / Departamento Pessoal'") && shell.includes("label: 'Fichas de Processo'") && sgqTablet.includes("route: '/pageprincipal/qualidade/rpnc'") && shell.includes("label: 'Solicitação de Compra'")],
  ['Barra Windows 11 da base esta morta', !shell.includes('BarraWindows11') && !existsSync('src/components/layout/BarraWindows11.tsx')],
  ['Sem destaque laranja no menu', !shell.includes('isUpdated') && !shell.includes('is-updated-orange') && !shell.includes('is-new-icon')],
  ['Legacy URLs redirect into the shared workspace', app.includes('Navigate to="/pageprincipal"') && app.includes('Navigate to="/pageprincipal/pcp"') && app.includes('Navigate to="/pageprincipal/paquimetro"') && app.includes('Navigate to="/pageprincipal/fiscal"') && app.includes('Navigate to="/pageprincipal/compras"') && app.includes('Navigate to="/pageprincipal/administracao-configuracoes"')],
  ['Start menu preserves Principal, PCP, Qualidade, Fiscal, Compras and Configurações', shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Sistema SGQ'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Configurações'")],
  ['Plan access checks normalize nested PagePrincipal routes', planGate.includes("path.startsWith('/pageprincipal/')") && planGate.includes("path === '/paquimetro'")],
  ['Shared compact form, grid, table and action styles are loaded', app.includes("synqra-workspace-standard.css") && existsSync('src/styles/synqra-workspace-standard.css')],
]
const missing = requiredFiles.filter(path => !existsSync(path))
for (const path of missing) console.error(`FAIL — required phase-one file missing: ${path}`)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (missing.length || checks.some(([, ok]) => !ok)) process.exit(1)
console.log('APPROVED UI LOCK PASS — Compras and Configurações remain registered; shared workspace and security contracts are frozen.')
