import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appPath = path.join(root, 'src', 'AppEntryV2.tsx')
const sourceDir = path.dirname(appPath)
const app = fs.readFileSync(appPath, 'utf8')
const bootstrapPath = path.join(root, 'src', 'AppBootstrap.tsx')
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8')
const entryPath = path.join(root, 'src', 'main.tsx')
const entry = fs.readFileSync(entryPath, 'utf8')

const routeMatches = [...app.matchAll(/<Route\s+path=["']([^"']+)["'][^>]*element=\{<([A-Za-z0-9_]+)/g)]
const lazyImports = new Map(
  [...app.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*lazyPage\(\(\)\s*=>\s*import\(["']([^"']+)["']\)/g)]
    .map(([, name, importPath]) => [name, importPath]),
)
const allowedLocal = new Set(['Navigate', 'MasterOnly', 'AppIndustrial', 'IndustrialLoginDirect', 'PublicIndustrialHome', 'ComprasRoute'])
const failures = []

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
