import { existsSync, readFileSync } from 'node:fs'

/**
 * Phase-one reset contract, authorized by the user on 2026-10-28.
 * Retires legacy page-hash locks for modules being rebuilt from zero.
 * Locks the shared workspace, authentication, Windows 11 navigation, PCP,
 * Paquímetro and Fiscal contracts without weakening security/build checks.
 */
const read = (path) => readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const bootstrap = read('src/AppBootstrap.tsx')
const page = read('src/pages/PagePrincipal.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const taskbar = read('src/components/layout/BarraWindows11.tsx')
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
  'src/components/layout/ERPHorizontalShell.tsx',
  'src/components/layout/BarraWindows11.tsx',
  'src/styles/synqra-workspace-standard.css',
]
const checks = [
  ['PagePrincipal is a shared Outlet workspace, without a second shell', page.includes('Outlet') && !page.includes('ERPHorizontalShell')],
  ['Exactly one global Windows 11 shell wraps the routes', (app.match(/<ERPHorizontalShell>/g) ?? []).length === 1 && app.includes('<Routes>')],
  ['Login and Supabase session gate remain intact', existsSync('src/IndustrialLoginDirect.tsx') && bootstrap.includes('IndustrialLoginDirect') && bootstrap.includes('supabase.auth.getSession()') && bootstrap.includes('function AccessGate')],
  ['Tenant isolation and Master identity contract remain present', bootstrap.includes("from('erp_usuarios')") && bootstrap.includes("from('erp_empresas')") && bootstrap.includes('empresa_id') && bootstrap.includes('nivel_admin') && bootstrap.includes('is_master')],
  ['PCP, Paquímetro and Fiscal are nested under PagePrincipal', app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="fiscal"')],
  ['Legacy URLs redirect into the shared workspace', app.includes('Navigate to="/pageprincipal"') && app.includes('Navigate to="/pageprincipal/pcp"') && app.includes('Navigate to="/pageprincipal/paquimetro"') && app.includes('Navigate to="/pageprincipal/fiscal"')],
  ['Windows 11 menu preserves phase-one modules and permits the new Compras workspace', shell.includes("label: 'Principal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Qualidade / Paquímetro'") && shell.includes("label: 'Fiscal'") && !shell.includes("label: 'Vendas'")],
  ['Windows 11 taskbar routes the phase-one modules', taskbar.includes('nome: "PCP"') && taskbar.includes('nome: "Paquímetro"') && taskbar.includes('nome: "Fiscal"')],
  ['Plan access checks normalize nested PagePrincipal routes', planGate.includes("path.startsWith('/pageprincipal/')") && planGate.includes("path === '/paquimetro'")],
  ['Shared compact form, grid, table and action styles are loaded', app.includes("synqra-workspace-standard.css") && existsSync('src/styles/synqra-workspace-standard.css')],
]
const missing = requiredFiles.filter(path => !existsSync(path))
for (const path of missing) console.error(`FAIL — required phase-one file missing: ${path}`)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (missing.length || checks.some(([, ok]) => !ok)) process.exit(1)
console.log('PHASE-ONE APPROVED UI LOCK PASS — legacy module screens are intentionally rebuilt later; core workspace and security contracts are frozen.')
