import { existsSync, readFileSync } from 'node:fs'

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')
const tablet = readFileSync('src/components/layout/ModuleTabletMenuModal.tsx', 'utf8')
const checks = [
  [shell.includes("label: 'Sistema SGQ'") && shell.includes("tabletModule: 'sgq'") && shell.includes("from './ModuleTabletMenuModal'"), 'O menu Sistema SGQ deve abrir o painel tablet compartilhado.'],
  [['sgq', 'pcp', 'fiscal', 'estoque', 'manutencao', 'configuracoes'].every(module => tablet.includes(module + ': {')), 'Os seis painéis de módulo devem existir no catálogo compartilhado.'],
  [tablet.includes("route: '/pageprincipal/paquimetro'") && tablet.includes("route: '/pageprincipal/qualidade/rpnc'") && tablet.includes("route: '/pageprincipal/qualidade/rpnc-formulario'") && tablet.includes("route: '/pageprincipal/qualidade/auditorias'") && tablet.includes("route: '/pageprincipal/qualidade/ged'"), 'O painel SGQ deve preservar Metrologia, RPNC, formulário, auditorias e GED.'],
  [shell.includes('sessionNivel={sessionNivel}') && tablet.includes('sessionNivel >= item.minNivel'), 'O painel aplica o nível real da sessão nas rotinas restritas.'],
  [!shell.includes('BarraWindows11') && !shell.includes('is-updated-orange') && !shell.includes('isUpdated: true') && !existsSync('src/components/layout/BarraWindows11.tsx'), 'A barra inferior e os destaques laranja devem permanecer removidos.'],
  [!shell.includes('PCPTabletMenuModal') && !existsSync('src/components/PCPTabletMenuModal.tsx') && existsSync('src/styles/module-tablet-panel.css'), 'O modal antigo foi substituído pelo painel tablet compartilhado.'],
  [app.includes('path="paquimetro"') && app.includes('path="qualidade/rpnc"') && app.includes('path="qualidade/rpnc-formulario"'), 'As rotas reais do SGQ permanecem registradas.'],
  [app.includes('path="/erp-industrial"') && app.includes('path="/fiscal"'), 'Dashboard principal e Fiscal permanecem acessíveis.'],
]
let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
console.log('QUALITY TABLET CONTRACT PASS — SGQ e seis painéis compartilhados sem barra inferior nem laranja.')
