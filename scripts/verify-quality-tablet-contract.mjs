import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')
const tablet = read('../src/components/TabletMenuModal.tsx')
const qualityDashboard = read('../src/pages/QualidadeDashboardSGQ.tsx')

const checks = [
  [shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell horizontal precisa importar o modal de Qualidade Tablet.'],
  [shell.includes("action?: 'qualityTablet'"), 'O contrato do menu precisa suportar a ação qualityTablet.'],
  [shell.includes("{ label: 'Gestão da Qualidade', route: '/qualidade', icon: ShieldCheck, children: [") && shell.includes("{ label: 'Menu SGQ', route: '/qualidade/tablet', icon: ShieldCheck, action: 'qualityTablet' }"), 'O menu SGQ deve ficar dentro do menu horizontal Gestão da Qualidade e abrir o modal sem navegar.'],
  [shell.includes("window.addEventListener('erp:open-quality-tablet', openQualityTablet)") && shell.includes('setTabletOpen(true)'), 'O botão Menu SGQ (tablet) deve abrir o modal pelo painel sem navegar.'],
  [qualityDashboard.includes('aria-label="Abrir Menu SGQ"') && qualityDashboard.includes("new Event('erp:open-quality-tablet')"), 'O painel de Qualidade deve manter um acesso direto ao Menu SGQ que abre o modal global.'],
  [shell.includes("if (item.action === 'qualityTablet')") && shell.includes('setTabletOpen(true)'), 'O handler compatível com o modal precisa continuar funcional.'],
  [shell.includes('<TabletMenuModal isOpen={tabletOpen}') && shell.includes('onClose={() => setTabletOpen(false)}'), 'O modal precisa estar montado no shell e possuir fechamento funcional.'],
  [ ["color: '#176B87'", "color: '#18794E'", "color: '#B42332'", "color: '#B96A05'"].every(token => qualityDashboard.includes(token)) && qualityDashboard.includes('shadow-[0_2px_0_rgba(18,59,80,.18)]'), 'Os quatro indicadores principais da Qualidade devem preservar cores saturadas e relevo visual.'],
    [shell.includes("title: 'Painel de Gestão da Qualidade', subtitle: 'Indicadores calculados a partir dos registros da empresa autenticada.'") && shell.includes("title: 'Dashboard Comercial', subtitle: 'Indicadores reais do módulo de vendas'") && qualityDashboard.includes('<VendasLayout title="" onRefresh={() => void load()} showStatusCards={false}'), 'Título e descrição devem ser contextuais ao módulo e ficar no cabeçalho superior, sem duplicação no painel da Qualidade.'],
  [(qualityDashboard.match(/<BarChart/g) || []).length === 3 && !qualityDashboard.includes('Cadastro de Documentos') && !qualityDashboard.includes('Inspeções recentes') && !qualityDashboard.includes('<table'), 'O painel deve priorizar três gráficos e remover os blocos inferiores de cadastro/listagem que ocupavam espaço.'],
  [shell.includes("const visibleMenus: MenuItem[] = menus") && !shell.includes("const visibleMenus: MenuItem[] = [menus[0], { label: 'Menu SGQ'") && shell.includes("{ label: 'Início', route: '/erp-industrial'") && shell.includes("{ label: 'Configuração', route: '/configuracoes-adm'") && !shell.includes('erp-horizontal-refresh-module') && !shell.includes('RefreshCw') && shell.includes('width:200px') && shell.includes('height:58px') && shell.includes("channel('erp-global-data-refresh')"), 'O shell deve preservar os menus originais, sem botão Atualizar, com refresh automático e logo ampliado; Menu SGQ fica no submenu de Qualidade.'],
  [/path="\/qualidade\/tablet" element={<QualityPlanGate><QualidadeTablet \/><\/QualityPlanGate>}/.test(routes), 'A rota direta /qualidade/tablet deve continuar declarada e protegida pelo QualityPlanGate.'],
  [tablet.includes("number: 'M22'") && tablet.includes('onNavigate') && tablet.includes('moduleColors[index % moduleColors.length]'), 'O tablet deve preservar os 22 módulos, a navegação e cores distintas nos ícones.'],
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
