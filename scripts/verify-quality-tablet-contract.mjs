import { readFileSync } from 'node:fs'

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const checks = [
  [shell.includes("label: 'Principal'") && shell.includes("label: 'Engenharia e PCP'") && shell.includes("label: 'Qualidade / Paquímetro'") && shell.includes("label: 'Fiscal'") && shell.includes("label: 'Compras'") && shell.includes("label: 'Configurações'") && !shell.includes("label: 'Vendas'"), 'O menu padrão deve preservar os módulos existentes Compras e Configurações junto aos módulos autorizados nesta fase.'],
  [shell.includes('BarraWindows11'), 'A barra estilo Windows 11 deve permanecer.'],
  [app.includes('path="/erp-industrial"'), 'O dashboard principal deve permanecer acessível.'],
  [app.includes('path="/fiscal"'), 'A Fiscal aprovada deve permanecer acessível como referência.'],
  [!app.includes('path="/qualidade/tablet"') && !app.includes('path="/qualidade/paquimetro-digital"'), 'Rotas operacionais antigas devem ficar fora da navegação durante o reset.'],
  [app.includes('path="qualidade/ged-documentos"') && app.includes('path="/qualidade/ged-documentos"') && app.includes("import('./pages/FileTreeGED')"), 'O GED deve ter rota protegida no workspace e alias legado redirecionado.'],
  [shell.includes("route: '/pageprincipal/qualidade/ged-documentos'") && shell.includes("label: 'Documentos / GED'"), 'O GED deve estar acessível no submenu de Qualidade.'],
]
let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
