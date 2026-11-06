import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const bootstrap = read('src/AppBootstrap.tsx')
const dashboard = read('src/AppIndustrialV7.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')

const checks = [
  ['Home/logo pública preservada', fs.existsSync('src/PublicIndustrialHome.tsx') && bootstrap.includes("import('./PublicIndustrialHome')")],
  ['Dashboard aprovado preservado', dashboard.includes("IndustrialCommandDashboard")],
  ['Barra Windows 11 deletada e topbar do menu preservada', !shell.includes('BarraWindows11') && !fs.existsSync('src/components/layout/BarraWindows11.tsx') && shell.includes('erp-windows-topbar')],
  ['Fiscal aprovada preservada como referência', fs.existsSync('src/pages/Fiscal.tsx') && app.includes('path="fiscal"') && app.includes('path="/fiscal"')],
  ['Page Principal é a área central única', fs.existsSync('src/pages/PagePrincipal.tsx') && app.includes('path="/pageprincipal"') && app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="fiscal"') && app.includes('path="*"')],
  ['Página administrativa Master preservada', fs.existsSync('src/pages/Master.tsx')],
  ['Gate de sessão Supabase preservado', bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()')],
  ['Perfil ERP ativo e soft-delete verificados', bootstrap.includes(".from('erp_usuarios')") && bootstrap.includes(".eq('ativo', true)") && bootstrap.includes(".is('deleted_at', null)")],
  ['Isolamento por empresa e identidade SUPER_ADMIN estrita preservados', bootstrap.includes("profile.is_master === true") && bootstrap.includes("Number(profile.nivel_admin) === 100") && bootstrap.includes("toUpperCase() === 'SUPER_ADMIN'") && bootstrap.includes("profile.empresa_id === null") && bootstrap.includes("if (!master && !empresaId)") && bootstrap.includes(".eq('id', empresaId)")],
  ['Menu ativo contém os módulos preservados', shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Sistema SGQ'")],
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failures.length) process.exit(1)
console.log('RESET CONTRACT PASS — shell, logo, dashboard, Page Principal, Master, Fiscal, Paquímetro e autenticação mantidos.')
