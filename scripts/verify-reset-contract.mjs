import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const bootstrap = read('src/AppBootstrap.tsx')
const dashboard = read('src/AppIndustrialV7.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')

const checks = [
  ['Home/logo pública preservada', fs.existsSync('src/PublicIndustrialHome.tsx') && bootstrap.includes("import('./PublicIndustrialHome')")],
  ['Dashboard aprovado preservado', dashboard.includes("IndustrialCommandDashboard")],
  ['Barra lateral vertical e cabeçalho preservados', shell.includes('erp-vertical-sidebar') && shell.includes('erp-windows-topbar') && !shell.includes('BarraWindows11')],
  ['Fiscal aprovada preservada como referência', fs.existsSync('src/pages/Fiscal.tsx') && app.includes('path="fiscal"') && app.includes('path="/fiscal"')],
  ['Page Principal é a área central única', fs.existsSync('src/pages/PagePrincipal.tsx') && app.includes('path="/pageprincipal"') && app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="fiscal"') && app.includes('path="*"')],
  ['Página administrativa Master preservada', fs.existsSync('src/pages/Master.tsx')],
  ['Gate de sessão Supabase preservado', bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()')],
  ['Perfil ERP ativo e soft-delete verificados', bootstrap.includes(".from('erp_usuarios')") && bootstrap.includes(".eq('ativo', true)") && bootstrap.includes(".is('deleted_at', null)")],
  ['Isolamento por empresa e validação Master preservados', bootstrap.includes("empresa_id") && bootstrap.includes("nivel_admin") && bootstrap.includes("is_master") && bootstrap.includes("MASTER")],
  ['Menu ativo contém os módulos preservados', shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Qualidade / Paquímetro'")],
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failures.length) process.exit(1)
console.log('RESET CONTRACT PASS — sidebar vertical, logo, dashboard, Page Principal, Master, Fiscal, Paquímetro e autenticação mantidos.')
