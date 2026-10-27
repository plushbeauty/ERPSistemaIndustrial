import { readFileSync } from 'node:fs'

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const checks = [
  [shell.includes('const menus: MenuItem[] = []'), 'O menu de módulos antigos deve permanecer vazio durante o reset.'],
  [shell.includes('BarraWindows11'), 'A barra estilo Windows 11 deve permanecer.'],
  [app.includes('path="/erp-industrial"'), 'O dashboard principal deve permanecer acessível.'],
  [app.includes('path="/fiscal"'), 'A Fiscal aprovada deve permanecer acessível como referência.'],
  [!app.includes('path="/qualidade/tablet"') && !app.includes('path="/qualidade/paquimetro-digital"'), 'Rotas operacionais antigas devem ficar fora da navegação durante o reset.'],
]
let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
