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
  [shell.includes("label: 'Menu SGQ'") && shell.includes("action: 'qualityTablet'") && shell.includes('openMenuItem(menu)'), 'Menu SGQ deve ficar na barra horizontal global e abrir o tablet em modal sem navegar.'],
  [ ["color: '#176B87'", "color: '#18794E'", "color: '#B42332'", "color: '#B96A05'"].every(token => qualityDashboard.includes(token)) && qualityDashboard.includes('shadow-[0_2px_0_rgba(18,59,80,.18)]'), 'Os quatro indicadores principais da Qualidade devem preservar cores saturadas e relevo visual.'],
    [shell.includes("title: 'Painel de Gestão da Qualidade', subtitle: 'Indicadores calculados a partir dos registros da empresa autenticada.'") && shell.includes("title: 'Dashboard Comercial', subtitle: 'Indicadores reais do módulo de vendas'") && qualityDashboard.includes('<VendasLayout title="" onRefresh={() => void load()}'), 'Título e descrição devem ser contextuais ao módulo e ficar no cabeçalho superior, sem duplicação no painel da Qualidade.'],
  [(qualityDashboard.match(/<BarChart/g) || []).length === 3 && !qualityDashboard.includes('Cadastro de Documentos') && !qualityDashboard.includes('Inspeções recentes') && !qualityDashboard.includes('<table'), 'O painel deve priorizar três gráficos e remover os blocos inferiores de cadastro/listagem que ocupavam espaço.'],
  [shell.includes("label: 'Menu SGQ'") && shell.includes('erp-module-menu-button') && shell.includes('erp-horizontal-refresh-module') && shell.includes('margin-left:auto') && shell.includes('width:200px') && shell.includes('height:58px') && shell.includes('RefreshCw'), 'Menu SGQ laranja, atualização no extremo direito e logo ampliado devem permanecer no shell horizontal global.'],
  [/path="\/qualidade\/tablet" element={<QualityPlanGate><QualidadeTablet \/><\/QualityPlanGate>}/.test(routes), 'A rota direta /qualidade/tablet deve continuar declarada e protegida pelo QualityPlanGate.'],
  [tablet.includes("number: 'M22'") && tablet.includes('onNavigate'), 'O tablet deve preservar os módulos previstos e a navegação existente.'],
  [tablet.includes('bg-white p-3 text-[#123B50]') && !tablet.includes('bg-[#1e222b]') && !tablet.includes('bg-[#252a34]'), 'O tablet SGQ deve preservar o fundo branco e os textos escuros aprovados.'],
  [tablet.includes('grid-cols-5') && tablet.includes('max-[900px]:grid-cols-4') && tablet.includes('max-[620px]:grid-cols-3') && tablet.includes('min-h-[118px]') && tablet.includes('text-[10px] font-bold leading-[1.2]') && tablet.includes('overflow-y-auto overscroll-contain'), 'O layout aprovado do tablet deve manter grade responsiva, módulos legíveis e rolagem interna.'],
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
