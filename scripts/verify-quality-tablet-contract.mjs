import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const routes = read('../src/AppEntryV2.tsx')
const header = read('../src/layout/AppHeader.tsx')
const referenceShell = read('../src/layout/IndustrialReferenceShell.tsx')
const pcp = read('../src/pages/PCPIndustrial.tsx')
const login = read('../src/IndustrialLoginDirect.tsx')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')

const checks = [
  [!routes.includes("import('./pages/TabletDashboard')") && !routes.includes("import('./pages/VendasTablet')") && !routes.includes("import('./pages/PCPTabletOperador')") && !routes.includes("import('./pages/QualidadeTablet')"), 'As telas tablet não devem mais ser carregadas pelo roteador.'],
  [routes.includes('path="/tablet/dashboard" element={<Navigate to="/erp-industrial" replace />}') && routes.includes('path="/tablet" element={<Navigate to="/erp-industrial" replace />}'), 'URLs antigas do tablet devem retornar ao ERP principal.'],
  [routes.includes('path="/vendas/tablet" element={<Navigate to="/vendas" replace />}'), 'A URL antiga de vendas tablet deve retornar à central desktop.'],
  [routes.includes('path="/pcp/tablet-operador" element={<Navigate to="/pcp" replace />}') && routes.includes('path="/pcp/tablet" element={<Navigate to="/pcp" replace />}'), 'URLs antigas do tablet PCP devem retornar ao PCP desktop.'],
  [routes.includes('path="/qualidade/tablet" element={<Navigate to="/qualidade" replace />}'), 'A URL antiga do tablet da qualidade deve retornar à Qualidade desktop.'],
  [!header.includes('MÓDULOS TABLET') && !header.includes('synqra-header-tablet'), 'O cabeçalho global não deve exibir atalho de tablet.'],
  [!referenceShell.includes('Abrir Tablet operacional') && !referenceShell.includes('TABLET'), 'O shell alternativo não deve exibir botão tablet.'],
  [!pcp.includes("title:'Tablet do operador'") && !pcp.includes("path:'/pcp/tablet-operador'"), 'O painel principal do PCP não deve exibir cartão tablet.'],
  [!login.includes('isTabletDevice') && !login.includes("return '/tablet/dashboard'"), 'O login não deve encaminhar usuários por tipo de dispositivo para tablet.'],
  [shell.includes("const channel = supabase") && shell.includes('postgres_changes'), 'A atualização global via Supabase Realtime deve permanecer ativa.'],
]

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message)
if (failures.length) {
  console.error('TABLET REMOVAL CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('TABLET REMOVAL CONTRACT PASS — atalhos removidos, URLs antigas redirecionadas e Realtime preservado.')
}
