/**
 * ERPSis — Auditoria estática de padronização visual
 * Data: 2026-10-16 | Revisão: UI-AUDIT-R1
 * Escopo: inventariar páginas/componentes, rotas, classes de dimensão e tokens compartilhados.
 * Limite: análise estática; não substitui screenshots, testes visuais ou testes de interação.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const roots = ['src/pages', 'src/components']
const ignored = new Set(['node_modules', '.git', 'dist', 'build', 'coverage'])
const supported = /\.(tsx|jsx|ts|js)$/
const routeFile = path.join(root, 'src/AppEntryV2.tsx')
const tokenFile = path.join(root, 'src/components/industrial/forms/industrialFormStyles.ts')
const outputDir = path.join(root, 'docs/erp-standardization/generated')
const outputFile = path.join(outputDir, 'ui-audit.json')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (entry.isFile() && supported.test(entry.name)) files.push(full)
  }
  return files
}
const rel = file => path.relative(root, file).split(path.sep).join('/')
const count = (source, regex) => [...source.matchAll(regex)].length
const files = [...new Set(roots.flatMap(dir => walk(path.join(root, dir))))].sort()

const inventory = files.map(file => {
  const source = fs.readFileSync(file, 'utf8')
  const controls = [...source.matchAll(/<(input|select|textarea|button)\b([^>]*)>/g)].map(match => {
    const attrs = match[2]
    const classes = attrs.match(/className\s*=\s*["']([^"']*)["']/)?.[1] ?? ''
    return {
      tag: match[1],
      line: source.slice(0, match.index).split(/\r?\n/).length,
      heightClasses: [...classes.matchAll(/\bh-(\d+(?:\.\d+)?)\b/g)].map(item => item[1]),
      widthClasses: [...classes.matchAll(/\bw-([^\s"'\x60]+)/g)].map(item => item[1]),
      maxLength: attrs.match(/maxLength\s*=\s*\{?["']?(\d+)/i)?.[1] ?? null,
      classNameStaticDetected: Boolean(classes),
    }
  })
  const heightSummary = {}
  for (const control of controls) {
    const key = control.heightClasses.join(',') || 'not-detected-static'
    heightSummary[key] = (heightSummary[key] ?? 0) + 1
  }
  return {
    file: rel(file),
    lines: source.split(/\r?\n/).length,
    controlsDetected: controls.length,
    tags: {
      input: count(source, /<input\b/g),
      select: count(source, /<select\b/g),
      textarea: count(source, /<textarea\b/g),
      button: count(source, /<button\b/g),
      forms: count(source, /<form\b/g),
      tables: count(source, /<table\b/g),
      grids: count(source, /grid-cols-/g),
      roundedClasses: count(source, /rounded-(?:\[[^\]]+\]|[a-z0-9-]+)/g),
      lookupHints: count(source, /lookup|Lookup|lupa|Lupa|EntityCodeLookup|Search/g),
      printHints: count(source, /window\.print|react-to-print|useReactToPrint/g),
    },
    sharedFormTokensImported: /industrial\/forms\/industrialFormStyles/.test(source),
    localStyleHints: /<style\b|style\s*=|\.module\.css|\.css['"]/.test(source),
    heightSummary,
    controls,
  }
})

let routes = { file: rel(routeFile), declarations: [], error: null }
if (fs.existsSync(routeFile)) {
  const source = fs.readFileSync(routeFile, 'utf8')
  routes.declarations = [...source.matchAll(/<Route\b[^>]*\bpath\s*=\s*["']([^"']+)["'][^>]*>/g)].map(match => ({
    path: match[1],
    line: source.slice(0, match.index).split(/\r?\n/).length,
  }))
} else routes.error = 'Router file not found'

const report = {
  generatedAt: new Date().toISOString(),
  revision: 'UI-AUDIT-R1',
  mode: 'static-analysis-only',
  summary: {
    sourceFilesScanned: inventory.length,
    routeDeclarationsDetected: routes.declarations.length,
    filesUsingSharedFormTokens: inventory.filter(file => file.sharedFormTokensImported).length,
    filesWithLocalStyleHints: inventory.filter(file => file.localStyleHints).length,
    filesWithControlsWithoutDetectedStaticHeight: inventory.filter(file => file.controls.some(control => control.heightClasses.length === 0)).length,
  },
  routes,
  sharedTokens: fs.existsSync(tokenFile) ? { file: rel(tokenFile), content: fs.readFileSync(tokenFile, 'utf8') } : { file: rel(tokenFile), error: 'Token file not found' },
  files: inventory,
  limitations: [
    'Regex scanning may miss spread props, wrapped inputs, dynamic classes and styles inherited from CSS.',
    'A detected h-8 class does not prove rendered height is 32 px; CSS cascade and browser layout must be checked.',
    'Widths, alignment, colors, overflow, responsive behavior and business logic require inspection of the component and rendered route.',
    'Route-to-component mapping requires checking imports and wrappers; route counts are not counts of completed modules.',
  ],
}
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ output: rel(outputFile), ...report.summary }, null, 2))
