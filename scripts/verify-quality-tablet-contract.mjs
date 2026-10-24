import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')
const caliperPage = read('../src/pages/QualidadePaquimetroDigital.tsx')

const checks = [
  [!shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O menu horizontal não deve importar o modal legado de Qualidade Tablet.'],
  [!shell.includes("action?: 'qualityTablet'"), 'O contrato de menu não deve manter ação qualityTablet.'],
  [/label: 'Qualidade', route: '\/qualidade', icon: ShieldCheck, children: \[/.test(shell), 'Qualidade deve estar como módulo normal com submenu direto.'],
  [!shell.includes("label: 'Qualidade Tablet'") && !shell.includes("label: 'Menu SGQ'"), 'O menu não deve exibir Qualidade Tablet ou Menu SGQ.'],
  [shell.includes("label: 'Paquímetro digital / controle dimensional', route: '/qualidade/paquimetro-digital', icon: Ruler"), 'O paquímetro deve ter atalho e ícone Ruler no menu principal da Qualidade.'],
  [shell.includes("label: 'Cadastro de instrumentos', route: '/qualidade/instrumentos'") && shell.includes("label: 'Metrologia e calibração', route: '/qualidade/calibracao'"), 'Controle de equipamento e calibração devem estar diretamente acessíveis.'],
  [!shell.includes('setTabletOpen') && !shell.includes('<TabletMenuModal'), 'O shell não deve montar nem abrir o tablet legado.'],
  [/path="\/qualidade\/tablet" element={<Navigate to="\/qualidade" replace \/>}/.test(routes), 'A rota legada do tablet deve redirecionar para Qualidade.'],
  [caliperPage.includes('<DigitalCaliper instrumentOptions={instruments} />') && !caliperPage.includes('QualitySidebar'), 'A tela do paquímetro deve exibir o controle dimensional sem duplicar o menu SGQ na página.'],
  [shell.includes(".channel(`erp-global-data-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`)"), 'A atualização automática por Realtime deve permanecer ativa.'],
]

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message)
if (failures.length) {
  console.error('QUALITY NAVIGATION CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('QUALITY NAVIGATION CONTRACT PASS — módulos diretos, paquímetro acessível e tablet legado removido do menu.')
}
