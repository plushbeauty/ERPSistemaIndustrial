import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')
const tablet = read('../src/components/TabletMenuModal.tsx')

const checks = [
  [shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell horizontal precisa importar o modal de Qualidade Tablet.'],
  [shell.includes("action?: 'qualityTablet'"), 'O contrato do menu precisa suportar a ação qualityTablet.'],
  [!shell.includes("label: 'Menu SGQ'") && /label: 'Qualidade', route: '\/qualidade', icon: ShieldCheck, action: 'qualityTablet', children:/.test(shell), 'A barra horizontal deve ocultar o botão Menu SGQ e abrir o tablet pelo botão Qualidade, preservando o submenu pela seta.'],
  [!shell.includes("erp-horizontal-refresh-module") && !shell.includes("RefreshCw"), 'O botão Atualizar manual não deve voltar ao menu horizontal.'],
  [shell.includes(".channel(`erp-global-data-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)"), 'A atualização automática por Realtime deve usar tópico exclusivo e permanecer ativa.'],
  [shell.includes("if (item.action === 'qualityTablet')") && shell.includes('setTabletOpen(true)'), 'O atalho precisa abrir o modal sem navegar para outra página.'],
  [shell.includes('<TabletMenuModal isOpen={tabletOpen}') && shell.includes('onClose={() => setTabletOpen(false)}'), 'O modal precisa estar montado no shell e possuir fechamento funcional.'],
  [/path="\/qualidade\/tablet" element={<QualityPlanGate><(?:QualidadeTablet|QualidadeCentralTablet) \/><\/QualityPlanGate>}/.test(routes), 'A rota direta /qualidade/tablet deve continuar declarada e protegida pelo QualityPlanGate.'],
  [tablet.includes("number: 'M22'") && tablet.includes('onNavigate'), 'O tablet deve preservar os módulos previstos e a navegação existente.'],
  [tablet.includes('!route || !accessReady') && tablet.includes('permissions.has(permission)'), 'O modal deve preservar a validação de acesso/permissão dos módulos.'],
]

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message)
if (failures.length) {
  console.error('QUALITY TABLET CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('QUALITY TABLET CONTRACT PASS — launcher, modal, rota e controle de acesso preservados.')
}
