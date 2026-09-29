import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appPath = path.join(root, 'src', 'AppEntryV2.tsx')
const app = fs.readFileSync(appPath, 'utf8')

const routeMatches = [...app.matchAll(/<Route\s+path=["']([^"']+)["'][^>]*element=\{<([A-Za-z0-9_]+)/g)]
const lazyImports = new Map(
  [...app.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\(["']([^"']+)["']\)\)/g)]
    .map(([, name, importPath]) => [name, importPath]),
)
const allowedLocal = new Set(['Navigate', 'MasterOnly', 'AppIndustrial', 'IndustrialLoginDirect', 'PublicIndustrialHome'])
const failures = []

for (const [, route, component] of routeMatches) {
  if (!lazyImports.has(component) && !allowedLocal.has(component)) {
    failures.push(`Rota \${route} referencia componente \${component} sem import/local declarado.`)
  }
}

for (const [name, importPath] of lazyImports) {
  const candidates = [
    path.join(root, importPath + '.tsx'),
    path.join(root, importPath + '.ts'),
    path.join(root, importPath, 'index.tsx'),
    path.join(root, importPath, 'index.ts'),
  ]
  if (!candidates.some(fs.existsSync)) failures.push(`Import lazy \${name} sem arquivo: \${importPath}`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Route gate OK: \${routeMatches.length} rotas e \${lazyImports.size} imports lazy verificados.`)
