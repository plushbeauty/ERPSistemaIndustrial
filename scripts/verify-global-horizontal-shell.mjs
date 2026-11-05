import { existsSync, readFileSync } from 'node:fs'

const app = readFileSync('src/AppEntryV2.tsx', 'utf8').replace(/\r\n/g, '\n')
const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const bootstrap = readFileSync('src/AppBootstrap.tsx', 'utf8')
const railFile = 'src/components/layout/QuickAccessRail.tsx'
const rail = existsSync(railFile) ? readFileSync(railFile, 'utf8') : ''
const checks = [
  [app.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'A shell horizontal compartilhada deve permanecer importada.'],
  [/<ERPHorizontalShell>[\s\S]*?<Routes>[\s\S]*?<\/Routes>[\s\S]*?<\/ERPHorizontalShell>/.test(app), 'As rotas operacionais mantidas devem estar dentro da shell compartilhada.'],
  [(app.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Deve existir exatamente uma shell global.'],
  [app.includes('path="/erp-industrial"') && app.includes('path="/fiscal"') && app.includes('path="pcp"') && app.includes('path="paquimetro"') && app.includes('path="compras"') && app.includes('path="administracao-configuracoes"'), 'Dashboard, Fiscal, PCP, Paquímetro, Compras e Configurações devem permanecer acessíveis na área de trabalho.'],
  [shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Sistema SGQ'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Configurações'") && !shell.includes('BarraWindows11'), 'O menu deve preservar os módulos existentes Compras e Configurações junto aos módulos da Fase 1 (Qualidade entrou como Sistema SGQ, ordem #108), e a barra Windows 11 da base deve continuar deletada.'],
  [bootstrap.includes('function AccessGate') && bootstrap.includes('supabase.auth.getSession()'), 'O gate de autenticação real deve permanecer no bootstrap.'],
  // Ordem do proprietário em 2026-11-05: barra de acesso rápido fixa no canto inferior esquerdo.
  // A trava não é estética: sem ela a barra vira lista fixa de atalhos (permissão inventada) ou
  // volta a cobrir formulário no tablet.
  [existsSync(railFile) && (shell.match(/<QuickAccessRail/g) ?? []).length === 1 &&
    /const quickAccessItems[^=]*=[\s\S]{0,400}visibleMenus/.test(shell) &&
    shell.includes('hidden={startMenuOpen}') &&
    rail.includes('position:fixed;left:8px;bottom:8px') &&
    rail.includes('synqra-quick-toggle'), 'A barra de acesso rápido deve permanecer montada uma única vez na shell, alimentada pelos módulos que visibleMenus liberou (nunca por lista própria de permissão), escondida com o menu aberto e recolhível no tablet.'],
]
const failures = checks.filter(([ok]) => !ok)
for (const [ok, message] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${message}`)
if (failures.length) process.exit(1)
console.log('Global horizontal shell reset contract passed.')
