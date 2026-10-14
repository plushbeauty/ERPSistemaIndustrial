import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = (path) => readFileSync(join(root, path), 'utf8')
const entry = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const quality = read('src/pages/QualidadeDashboardSGQ.tsx')
const tablet = read('src/components/TabletMenuModal.tsx')
const tabletDashboard = read('src/pages/TabletDashboard.tsx')
const salesTablet = read('src/pages/VendasTablet.tsx')
const failures = []
const checks = [
  [entry.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'A aplicação autenticada deve usar o shell horizontal compartilhado.'],
  [(entry.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Deve existir exatamente uma montagem do shell horizontal global.'],
  [entry.includes('{protectedRoutes}') && entry.indexOf('if (!session)') >= 0 && entry.indexOf('if (!session)') < entry.indexOf('const appContent'), 'As rotas públicas devem continuar fora do shell autenticado.'],
  [shell.includes('<header className="erp-horizontal-header">') && shell.includes('<nav className="erp-horizontal-menu"'), 'O cabeçalho e a barra horizontal oficial devem permanecer no shell compartilhado.'],
  [shell.includes("const visibleMenus: MenuItem[] = [menus[0], { label: 'Menu SGQ'") && shell.includes("action: 'qualityTablet'"), 'Início e Menu SGQ devem ficar juntos e o launcher deve abrir o modal.'],
  [!shell.includes('erp-horizontal-refresh-module') && !shell.includes('Atualizar os dados da tela atual') && shell.includes("label: 'Configuração'"), 'O botão Atualizar deve ficar fora da barra global para evitar espaçamento excessivo.'],
  [shell.includes("channel('erp-global-data-refresh')") && shell.includes(".on('postgres_changes', { event: '*', schema: 'public' }") && shell.includes('window.location.reload()') && shell.includes('routeIsEditing') && shell.includes('userIsTyping'), 'O refresh automático deve ouvir alterações Realtime e proteger telas de edição e campos em uso.'],
  [shell.includes('erp-horizontal-logout') && shell.includes('supabase.auth.signOut()'), 'A saída de sessão deve existir no shell global após remover cabeçalhos legados.'],
  [shell.includes('width:200px') && shell.includes('height:58px'), 'O logo oficial deve manter o tamanho desktop de 200 por 58 px.'],
  [!shell.includes('Pesquisar módulos') && !shell.includes('erp-horizontal-search') && !shell.includes('const [search, setSearch]'), 'A barra global não pode voltar a exibir pesquisa de módulos.'],
  [shell.includes("title: 'Painel de Gestão da Qualidade'") && shell.includes("title: 'Dashboard Comercial'"), 'O título superior deve permanecer contextual ao módulo.'],
  [(quality.match(/<BarChart/g) ?? []).length === 3 && !quality.includes('Pesquisar módulo') && !quality.includes('>Menu SGQ</button>'), 'O painel SGQ deve manter três gráficos sem barra ou pesquisa local duplicada.'],
  [["color: '#176B87'", "color: '#18794E'", "color: '#B42332'", "color: '#B96A05'"].every(token => quality.includes(token)) && quality.includes('shadow-[0_2px_0_rgba(18,59,80,.18)]'), 'Os quatro cartões KPI da Qualidade devem preservar cores contrastantes.'],
  [(tablet.match(/number: 'M[0-9][0-9]'/g) ?? []).length === 22 && tablet.includes('permissions.has(permission)'), 'O modal SGQ deve manter os 22 módulos e as verificações de permissão.'],
  [!tabletDashboard.includes('Pesquisar módulo') && !salesTablet.includes('Pesquisar módulo') && !salesTablet.includes('erp-vendas-menu-actions'), 'Os launchers de módulos não podem reintroduzir a pesquisa local removida.'],
]
for (const [passed, message] of checks) if (!passed) failures.push(message)

function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.tsx$/.test(entry.name) && full !== join(root, 'src/AppEntryV2.tsx') && full !== join(root, 'src/components/layout/ERPHorizontalShell.tsx')) {
      const source = readFileSync(full, 'utf8')
      const relative = full.replace(root + '/', '')
      if (/import\s+ERPHorizontalShell\s+from/.test(source) || /<\/?ERPHorizontalShell(?:\s|>)/.test(source)) failures.push('Shell horizontal duplicado em ' + relative)
      if (/import\s+ERPHeader\s+from/.test(source) || /<ERPHeader(?:\s|\/>)/.test(source)) failures.push('Cabeçalho legado duplicado em ' + relative)
      if (/Pesquisar módulos?/i.test(source) || /Pesquisar módulo de vendas/i.test(source) || /erp-horizontal-search/.test(source)) failures.push('Pesquisa de módulo removida foi reintroduzida em ' + relative)
    }
  }
}
walk(join(root, 'src'))

if (failures.length) {
  console.error('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT PASS — shell único, sem cabeçalhos duplicados ou pesquisa de módulo, sessão segura e SGQ preservado.')
