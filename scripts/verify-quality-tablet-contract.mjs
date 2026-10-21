import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')
const tabletDashboard = read('../src/pages/TabletDashboard.tsx')

const checks = [
  [!shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell global não deve montar o modal legado de Qualidade Tablet.'],
  [!shell.includes("action?: 'qualityTablet'"), 'O menu global não deve ter uma ação especial para abrir Qualidade Tablet.'],
  [/\{ label: 'Qualidade', route: '\/qualidade', icon: ShieldCheck, children:/.test(shell), 'O menu Qualidade deve abrir diretamente a central SGQ.'],
  [!shell.includes("label: 'Qualidade Tablet'") && !shell.includes("navigate('/qualidade/tablet')"), 'O menu não deve expor nem navegar para Qualidade Tablet.'],
  [!shell.includes('tabletOpen') && !shell.includes('<TabletMenuModal'), 'O estado e o modal de Qualidade Tablet devem ser removidos do shell.'],
  [/path="\/qualidade\/tablet" element={<Navigate to="\/qualidade" replace \/>}\s*\/>/.test(routes), 'A URL antiga deve redirecionar para a central SGQ, sem renderizar a tela tablet.'],
  [!routes.includes("import('./pages/QualidadeCentralTablet')"), 'A rota não deve carregar o componente legado QualidadeCentralTablet.'],
  [tabletDashboard.includes("navigate('/qualidade')"), 'O atalho de Qualidade deve abrir a central SGQ.'],
  [shell.includes("if (item.action === 'pcpTablet')"), 'O atalho PCP Tablet deve continuar preservado.'],
  [shell.includes(".channel(`erp-global-data-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)"), 'A atualização automática por Realtime deve permanecer ativa.'],
]

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message)
if (failures.length) {
  console.error('QUALITY MENU CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('QUALITY MENU CONTRACT PASS — Qualidade abre a central SGQ; rota tablet redirecionada; PCP Tablet e Realtime preservados.')
}
