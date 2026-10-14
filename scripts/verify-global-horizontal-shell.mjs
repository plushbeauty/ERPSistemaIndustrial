import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = (path) => readFileSync(join(root, path), 'utf8')
const entry = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const qualityStyles = read('src/styles/quality-workspace-standard.css')
const loginStyles = read('src/styles/industrial-login.css')
const publicHome = read('src/PublicIndustrialHome.tsx')
const tabletDashboard = read('src/pages/TabletDashboard.tsx')
const failures = []
const checks = [
  [entry.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'AppEntryV2 must import the single shared horizontal shell'],
  [(entry.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Authenticated routes must have exactly one shared shell wrapper'],
  [entry.includes('{protectedRoutes}') && entry.indexOf('if (!session)') >= 0 && entry.indexOf('if (!session)') < entry.indexOf('const appContent'), 'Public routes must return before the authenticated shell is rendered'],
  [entry.includes("location.pathname.startsWith('/pcp') && <ERPStatusLegend />"), 'The PCP status legend must remain limited to PCP routes'],
  [!shell.includes('position:relative;z-index:900'), 'The horizontal menu must not regress to a non-sticky position'],
  [shell.includes('position:sticky;top:0;z-index:1600'), 'The global header must remain sticky'],
  [shell.includes('height:58px;width:200px;min-width:200px'), 'Desktop logo must remain large and legible'],
  [shell.includes('width:200px;min-width:200px;height:46px'), 'Mobile logo must remain large and legible'],
  [!shell.includes('Pesquisar módulos') && !shell.includes('erp-horizontal-search') && !shell.includes('const [search, setSearch]') && !tabletDashboard.includes('Pesquisar módulo') && !tabletDashboard.includes('synqra-search'), 'Module-location filters must be absent from the global shell and tablet launcher'],
  [shell.includes('background:#f4fbfd') && shell.includes('color:#000') && shell.includes('.erp-horizontal-session time{color:#000}') && shell.includes('.erp-horizontal-help{color:#000}'), 'Top-bar text must remain black on a light background'],
  [loginStyles.includes('width:min(280px,32vw)') && loginStyles.includes('inset:0;width:100%;height:100%'), 'Login logo and hero image sizing must remain protected'],
  [publicHome.includes('.sgq-brand img{width:280px;height:82px') && publicHome.includes('width:96%;height:98%'), 'Public home logo and main visual must remain enlarged'],
  [shell.includes('position:sticky;top:64px;z-index:1550'), 'Horizontal menu must remain sticky below the desktop header'],
  [qualityStyles.includes('background: #123B50') && qualityStyles.includes('color: #f4fbfd') && qualityStyles.includes('#D65B61') && qualityStyles.includes('#3A9D78'), 'Quality color/status contrast tokens must remain protected'],
  [entry.includes("import './styles/quality-workspace-standard.css'"), 'Quality visual standard must remain globally loaded'],
  [shell.includes('Painel de Gestão da Qualidade') && shell.includes('Indicadores calculados a partir dos registros da empresa autenticada.') && shell.includes('.erp-horizontal-global-title{display:flex;flex:1'), 'The approved title and subtitle must be centered in the shared header on all authenticated screens'],
  [shell.includes('height:58px;width:200px;min-width:200px') && shell.includes('width:200px;min-width:200px;height:46px'), 'The official logo must remain 200px wide on desktop and mobile'],
  [read('src/pages/QualidadeDashboardSGQ.tsx').includes('>Menu SGQ</button>') && !read('src/pages/QualidadeDashboardSGQ.tsx').includes('Menu SGQ (tablet)'), 'The SGQ launcher must be labeled Menu SGQ without tablet wording'],
  [read('src/pages/QualidadeDashboardSGQ.tsx').includes('bg-[#176B87]') && read('src/pages/QualidadeDashboardSGQ.tsx').includes('bg-[#18794E]') && read('src/pages/QualidadeDashboardSGQ.tsx').includes('bg-[#B42332]') && read('src/pages/QualidadeDashboardSGQ.tsx').includes('bg-[#B96A05]') && read('src/pages/QualidadeDashboardSGQ.tsx').includes('shadow-[3px_3px_0_rgba(0,0,0,0.22)]'), 'Quality KPI cards must retain saturated state colors and dimensional icon treatment'],
  [shell.includes("{ label: 'Cadastro de Produtos', route: '/produtos-vendas' }"), 'Cadastros menu must open the canonical product registration screen'],
  [entry.includes('<Route path="/cadastro-produtos" element={<Navigate to="/produtos-vendas" replace />} />'), 'Legacy product registration URL must reuse the canonical product screen'],
  [entry.includes('<Route path="/clientes" element={<Navigate to="/vendas/clientes" replace />} />') && entry.includes('<Route path="/fornecedores" element={<Navigate to="/compras/fornecedores" replace />} />'), 'Customer and supplier aliases must reuse the canonical compact screens'],
  [read('src/pages/ProdutosVendasIndustrial.tsx').includes("height:30") && read('src/pages/ProdutosVendasIndustrial.tsx').includes("background:'#2D8DB8'") && read('src/pages/ProdutosVendasIndustrial.tsx').includes('Cadastro de Produtos'), 'Product screen must retain compact controls, industrial accent color and canonical title'],
]
for (const [passed, message] of checks) if (!passed) failures.push(message)

function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.tsx$/.test(entry.name) && full !== join(root, 'src/AppEntryV2.tsx') && full !== join(root, 'src/components/layout/ERPHorizontalShell.tsx')) {
      const source = readFileSync(full, 'utf8')
      if (/import\s+ERPHorizontalShell\s+from/.test(source) || /<\/?ERPHorizontalShell(?:\s|>)/.test(source)) failures.push('Nested horizontal shell detected in ' + full.replace(root + '/', ''))
      if (/import\s+ERPHeader\s+from/.test(source) || /<ERPHeader(?:\s|\/>)/.test(source)) failures.push('Legacy ERPHeader duplicates the shared shell in ' + full.replace(root + '/', ''))
      if (/Pesquisar módulos?/i.test(source) || /erp-horizontal-search/.test(source)) failures.push('Module-location filter must not return in ' + full.replace(root + '/', ''))
    }
  }
}
walk(join(root, 'src'))

if (failures.length) {
  console.error('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT PASS — single shell, no global module filter, black top-bar text, enlarged logo and Quality colors protected.')
