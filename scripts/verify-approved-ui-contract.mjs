import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'

const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const bootstrap = readFileSync('src/AppBootstrap.tsx', 'utf8')
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const checks = [
  ['Tela pública do logo preservada', existsSync('src/PublicIndustrialHome.tsx') && bootstrap.includes("import('./PublicIndustrialHome')")],
  ['Dashboard industrial aprovado preservado', readFileSync('src/AppIndustrialV7.tsx', 'utf8').includes('IndustrialCommandDashboard')],
  ['Fiscal aprovada preservada', existsSync('src/pages/Fiscal.tsx') && app.includes('path="/fiscal"')],
  ['Barra Windows 11 preservada', shell.includes('BarraWindows11') && shell.includes('erp-windows-topbar')],
  ['Rotas operacionais antigas desativadas', app.includes('path="*"') && app.includes('Navigate to="/erp-industrial"')],
  ['Login nativo Supabase preservado', existsSync('src/IndustrialLoginDirect.tsx') && bootstrap.includes('IndustrialLoginDirect')],
  ['Autenticação e isolamento por empresa preservados', bootstrap.includes('supabase.auth.getSession()') && bootstrap.includes(".from('erp_usuarios')") && bootstrap.includes(".from('erp_empresas')")],
]
const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failed.length) process.exit(1)
console.log('Approved UI reset contract passed.')
