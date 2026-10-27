import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const bootstrap = read('src/AppBootstrap.tsx')
const dashboard = read('src/AppIndustrialV7.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')

const checks = [
  ['Home/logo pública preservada', fs.existsSync('src/PublicIndustrialHome.tsx') && bootstrap.includes("import('./PublicIndustrialHome')")],
  ['Dashboard aprovado preservado', dashboard.includes("IndustrialCommandDashboard")],
  ['Shell Windows 11 preservado', shell.includes('BarraWindows11') && shell.includes('erp-windows-topbar')],
  ['Fiscal aprovada preservada como referência', fs.existsSync('src/pages/Fiscal.tsx') && app.includes('path="/fiscal"')],
  ['Page Principal contém dashboard e cadastro mestre', fs.existsSync('src/pages/PagePrincipal.tsx') && app.includes('path="/pageprincipal"') && app.includes('path="cadastros"') && app.includes('path="/fiscal"') && app.includes('path="*"')],
  ['Gate de sessão Supabase preservado', bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()')],
  ['Perfil ERP ativo e soft-delete verificados', bootstrap.includes(".from('erp_usuarios')") && bootstrap.includes(".eq('ativo', true)") && bootstrap.includes(".is('deleted_at', null)")],
  ['Isolamento por empresa e validação Master preservados', bootstrap.includes("empresa_id") && bootstrap.includes("nivel_admin") && bootstrap.includes("is_master") && bootstrap.includes("MASTER")],
  ['Rotas antigas não estão na navegação ativa', shell.includes('const menus: MenuItem[] = []')],
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failures.length) process.exit(1)
console.log('RESET CONTRACT PASS — shell, logo, dashboard, Page Principal, cadastro mestre, Fiscal e autenticação mantidos.')
