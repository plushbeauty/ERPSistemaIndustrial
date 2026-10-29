import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appPath = path.join(root, 'src', 'AppEntryV2.tsx')
const sourceDir = path.dirname(appPath)
const app = fs.readFileSync(appPath, 'utf8')
const moduleMenu = fs.readFileSync(path.join(root, 'src', 'components', 'layout', 'ERPHorizontalShell.tsx'), 'utf8')
const bootstrapPath = path.join(root, 'src', 'AppBootstrap.tsx')
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8')
const entryPath = path.join(root, 'src', 'main.tsx')
const entry = fs.readFileSync(entryPath, 'utf8')

const routeMatches = [...app.matchAll(/<Route\s+path=["']([^"']+)["'][^>]*element=\{<([A-Za-z0-9_]+)/g)]
const lazyImports = new Map(
  [...app.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*lazyPage\(\(\)\s*=>\s*import\(["']([^"']+)["']\)/g)]
    .map(([, name, importPath]) => [name, importPath]),
)
const allowedLocal = new Set(['Navigate', 'MasterOnly', 'AppIndustrial', 'IndustrialLoginDirect', 'PublicIndustrialHome', 'PublicHomeWithLogin', 'ComprasRoute', 'QualityPlanGate', 'ERPHorizontalShell', 'CentralComercialFiscalFinanceira', 'PagePrincipal', 'PCPWorkspace', 'Paquimetro', 'Fiscal', 'SetupADMInicial', 'ComprasWorkspace', 'AdministracaoConfiguracoesGlobais'])
const failures = []

for (const [groupIndex, [, routeGroup]] of [...app.matchAll(/<Routes>([\s\S]*?)<\/Routes>/g)].entries()) {
  const paths = [...routeGroup.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map(([, route]) => route)
  const duplicates = [...new Set(paths.filter((route, index) => paths.indexOf(route) !== index))]
  for (const route of duplicates) failures.push(`Route ${route} is declared more than once inside Routes group ${groupIndex + 1}.`)
}

const publicPathDeclaration = bootstrap.match(/const publicPaths\s*=\s*new Set\(\[([\s\S]*?)\]\)/)
if (!publicPathDeclaration) {
  failures.push('Bootstrap sem allowlist de rotas públicas verificável.')
} else if (publicPathDeclaration[1].includes('/configuracoes-adm')) {
  failures.push('Configurações ADM não pode ser liberada na allowlist pública.')
}

if (/if\s*\([^)]*pathname[^)]*['"]\/configuracoes-adm/.test(entry)) {
  failures.push('Entrada principal contém um desvio direto para Configurações ADM fora do bootstrap autenticado.')
}

if (/if\s*\([^)]*pathname[^)]*['"]\/configuracoes-adm/.test(app)) {
  failures.push('Roteador contém um desvio direto para Configurações ADM fora do gate de acesso.')
}

for (const [, route, component] of routeMatches) {
  if (/^[A-Z]/.test(component) && !lazyImports.has(component) && !allowedLocal.has(component)) {
    failures.push(`Rota ${route} referencia componente ${component} sem import/local declarado.`)
  }
}

const declaredRoutes = new Set(routeMatches.map(([, route]) => route))
const newMenuEntries = [...moduleMenu.matchAll(/\{\s*label:\s*'[^']+'\s*,\s*route:\s*'([^']+)'[^}]*isNew:\s*true[^}]*\}/g)]
for (const [entry, route] of newMenuEntries) {
  const handledByPathResolver = new RegExp(`path\\s*===\\s*['"]${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(app)
  if (!declaredRoutes.has(route) && !handledByPathResolver) failures.push(`New menu entry ${route} has no matching application route.`)
  if (!/\bicon:\s*[A-Z][A-Za-z0-9]*/.test(entry)) failures.push(`New menu entry ${route} needs an icon.`)
}
if (newMenuEntries.length && !/\.is-new-icon[^{}]*\{[^}]*color:\s*#C65D00/i.test(moduleMenu)) failures.push('New menu icons must use the approved orange marker color #C65D00.')

for (const [name, importPath] of lazyImports) {
  const candidates = [
    path.join(sourceDir, importPath + '.tsx'),
    path.join(sourceDir, importPath + '.ts'),
    path.join(sourceDir, importPath, 'index.tsx'),
    path.join(sourceDir, importPath, 'index.ts'),
  ]
  if (!candidates.some(fs.existsSync)) failures.push(`Import lazy ${name} sem arquivo: ${importPath}`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Route gate OK: ${routeMatches.length} rotas e ${lazyImports.size} imports lazy verificados.`)
