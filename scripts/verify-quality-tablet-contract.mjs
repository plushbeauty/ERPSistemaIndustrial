import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')
const tablet = read('../src/components/TabletMenuModal.tsx')
const qualityDashboard = read('../src/pages/QualidadeDashboardSGQ.tsx')

const checks = [
  [shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell horizontal precisa importar o modal de Qualidade Tablet.'],
  [shell.includes("action?: 'qualityTablet'"), 'O contrato do menu precisa suportar a ação qualityTablet.'],
  [shell.includes("{ label: 'Gestão da Qualidade', route: '/qualidade', icon: ShieldCheck },") && !/label: 'Gestão da Qualidade'[^\]]*children:/.test(shell), 'Gestão da Qualidade deve abrir /qualidade diretamente, sem submenu.'],
  [shell.includes("window.addEventListener('erp:open-quality-tablet', openQualityTablet)") && shell.includes('setTabletOpen(true)'), 'O botão Menu SGQ (tablet) deve abrir o modal pelo painel sem navegar.'],
  [shell.includes("if (item.action === 'qualityTablet')") && shell.includes('setTabletOpen(true)'), 'O handler compatível com o modal precisa continuar funcional.'],
  [shell.includes('<TabletMenuModal isOpen={tabletOpen}') && shell.includes('onClose={() => setTabletOpen(false)}'), 'O modal precisa estar montado no shell e possuir fechamento funcional.'],
  [qualityDashboard.includes('Menu SGQ (tablet)') && qualityDashboard.includes("new Event('erp:open-quality-tablet')"), 'O painel aprovado precisa manter o botão Menu SGQ (tablet).'],
  [['bg-[#EAF6FA]','bg-[#E8F6EE]','bg-[#FCEDEF]','bg-[#FFF4E4]'].every(token => qualityDashboard.includes(token)), 'Os cards da Qualidade precisam preservar as cores por status.'],
  [qualityDashboard.includes('Painel de Gestão da Qualidade') && qualityDashboard.includes('Indicadores calculados a partir dos registros da empresa autenticada.'), 'O título e a descrição aprovados devem permanecer no painel.'],
  [/path="\/qualidade\/tablet" element={<QualityPlanGate><QualidadeTablet \/><\/QualityPlanGate>}/.test(routes), 'A rota direta /qualidade/tablet deve continuar declarada e protegida pelo QualityPlanGate.'],
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
