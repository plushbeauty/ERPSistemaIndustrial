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
  [qualityDashboard.includes('>Menu SGQ</button>') && !qualityDashboard.includes('Menu SGQ (tablet)') && qualityDashboard.includes("new Event('erp:open-quality-tablet')"), 'O painel deve manter o botão laranja Menu SGQ, sem texto ou ícone de tablet, abrindo o modal sem navegação.'],
  [['bg-[#176B87]','bg-[#18794E]','bg-[#B42332]','bg-[#B96A05]','shadow-[3px_3px_0_rgba(0,0,0,0.22)]'].every(token => qualityDashboard.includes(token)), 'Os quatro indicadores principais da Qualidade devem preservar cores saturadas e ícones com relevo visual.'],
  [shell.includes('<strong>Painel de Gestão da Qualidade</strong>') && shell.includes('Indicadores calculados a partir dos registros da empresa autenticada.') && qualityDashboard.includes('<VendasLayout title="" onRefresh={() => void load()}'), 'Título e instrução devem ficar somente no cabeçalho superior, sem duplicação no conteúdo do painel.'],
  [/path="\/qualidade\/tablet" element={<QualityPlanGate><QualidadeTablet \/><\/QualityPlanGate>}/.test(routes), 'A rota direta /qualidade/tablet deve continuar declarada e protegida pelo QualityPlanGate.'],
  [tablet.includes("number: 'M22'") && tablet.includes('onNavigate'), 'O tablet deve preservar os módulos previstos e a navegação existente.'],
  [tablet.includes('bg-white p-3 text-[#123B50]') && !tablet.includes('bg-[#1e222b]') && !tablet.includes('bg-[#252a34]'), 'O tablet SGQ deve preservar o fundo branco e os textos escuros aprovados.'],
  [tablet.includes('grid-cols-6') && tablet.includes('max-[820px]:grid-cols-4') && tablet.includes('max-[520px]:grid-cols-3') && tablet.includes('min-h-[104px]') && tablet.includes('overflow-y-auto overscroll-contain'), 'O layout aprovado do tablet deve manter grade responsiva, módulos legíveis e rolagem interna.'],
  [(tablet.match(/number: 'M[0-9][0-9]'/g) || []).length === 22, 'O tablet deve manter os 22 módulos SGQ.'],
  [!['/erp-industrial','/pcp/dashboard-oee','/rh','/admin/logs','/configuracoes-adm','/documentos-qualidade'].some(route => tablet.includes("route: '" + route)), 'O tablet SGQ não pode redirecionar para atalhos de outros módulos.'],
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
