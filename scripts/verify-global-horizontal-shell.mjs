import { readFileSync } from 'node:fs'

const app = readFileSync('src/AppEntryV2.tsx', 'utf8').replace(/\r\n/g, '\n')
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const bootstrap = readFileSync('src/AppBootstrap.tsx', 'utf8')
const checks = [
  [app.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'A shell horizontal compartilhada deve permanecer importada.'],
  [/<ERPHorizontalShell>[\s\S]*?<Routes>[\s\S]*?<\/Routes>[\s\S]*?<\/ERPHorizontalShell>/.test(app), 'As rotas operacionais mantidas devem estar dentro da shell compartilhada.'],
  [(app.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Deve existir exatamente uma shell global.'],
  [app.includes('path="/erp-industrial"') && app.includes('path="/fiscal"'), 'Dashboard e Fiscal devem ser as únicas telas operacionais mantidas.'],
  [shell.includes('const menus: MenuItem[] = []') && shell.includes('BarraWindows11'), 'A navegação antiga deve estar vazia e a barra Windows 11 preservada.'],
  [bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()'), 'O gate de autenticação real deve permanecer no bootstrap.'],
]
const failures = checks.filter(([ok]) => !ok)
for (const [ok, message] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${message}`)
if (failures.length) process.exit(1)
console.log('Global horizontal shell reset contract passed.')
