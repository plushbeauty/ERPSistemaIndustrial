import { readFileSync } from 'node:fs'

const app = readFileSync('src/AppEntryV2.tsx', 'utf8').replace(/\r\n/g, '\n')
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const bootstrap = readFileSync('src/AppBootstrap.tsx', 'utf8')
const checks = [
  [app.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'A shell horizontal compartilhada deve permanecer importada.'],
  [/<ERPHorizontalShell>[\s\S]*?<Routes>[\s\S]*?<\/Routes>[\s\S]*?<\/ERPHorizontalShell>/.test(app), 'As rotas operacionais mantidas devem estar dentro da shell compartilhada.'],
  [(app.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Deve existir exatamente uma shell global.'],
  [app.includes('path="/erp-industrial"') && app.includes('path="/fiscal"') && app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="compras"') && app.includes('path="administracao-configuracoes"'), 'Dashboard, Fiscal, PCP, Paquímetro, Compras e Configurações devem permanecer acessíveis na área de trabalho.'],
  [shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Qualidade / Paquímetro'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Configurações'") && !shell.includes("label: 'Vendas'") && shell.includes('BarraWindows11'), 'O menu Windows 11 deve preservar os módulos existentes Compras e Configurações junto aos módulos da Fase 1.'],
  [bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()'), 'O gate de autenticação real deve permanecer no bootstrap.'],
]
const failures = checks.filter(([ok]) => !ok)
for (const [ok, message] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${message}`)
if (failures.length) process.exit(1)
console.log('Global horizontal shell reset contract passed.')
