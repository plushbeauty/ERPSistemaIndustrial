import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE_DIRS = ['src']
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const failures = []

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/')
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

function fail(file, line, message) {
  failures.push(`[BLOCKER] ${rel(file)}:${line} — ${message}`)
}

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) out.push(full)
  }
  return out
}

function exactCaseExists(target) {
  const relative = path.relative(ROOT, target)
  const parts = relative.split(path.sep).filter(Boolean)
  let current = ROOT
  for (const part of parts) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return false
    const exact = fs.readdirSync(current).find(name => name === part)
    if (!exact) return false
    current = path.join(current, exact)
  }
  return fs.existsSync(target)
}

function resolveLocalImport(file, spec) {
  const base = path.resolve(path.dirname(file), spec)
  const candidates = [
    base,
    ...EXTENSIONS.map(ext => `${base}${ext}`),
    ...EXTENSIONS.map(ext => path.join(base, `index${ext}`)),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { path: candidate, exactCase: exactCaseExists(candidate) }
    }
  }

  const directory = path.dirname(base)
  const wanted = path.basename(base)
  if (fs.existsSync(directory) && fs.statSync(directory).isDirectory()) {
    const names = fs.readdirSync(directory)
    const insensitive = names.find(name => name.toLowerCase() === wanted.toLowerCase())
    if (insensitive) {
      return { path: path.join(directory, insensitive), exactCase: false }
    }
  }
  return null
}

function hasDefaultExport(text) {
  return /\bexport\s+default\b/.test(text) ||
    /\bexport\s*\{[^}]*\bdefault\b[^}]*\}(?:\s*from\s*['"][^'"]+['"])?/.test(text)
}

function namedExports(text) {
  const names = new Set()
  for (const match of text.matchAll(/\bexport\s+(?:const|let|var|function|class|enum|interface|type)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1])
  for (const match of text.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const cleaned = part.trim().split(/\s+as\s+/i)
      if (cleaned[0]) names.add((cleaned[1] || cleaned[0]).trim())
    }
  }
  if (hasDefaultExport(text)) names.add('default')
  return names
}

const files = SOURCE_DIRS.flatMap(dir => walk(path.join(ROOT, dir)))

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')

  const lazyRe = /lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of text.matchAll(lazyRe)) {
    const resolved = resolveLocalImport(file, match[1])
    const line = lineOf(text, match.index ?? 0)
    if (!resolved) {
      fail(file, line, `React.lazy import local não resolvido: ${match[1]}`)
      continue
    }
    if (!resolved.exactCase) fail(file, line, `Casing incorreto no lazy import: ${match[1]}`)
    const target = fs.readFileSync(resolved.path, 'utf8')
    if (!hasDefaultExport(target)) fail(file, line, `React.lazy exige export default, ausente em ${rel(resolved.path)}`)
  }

  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of text.matchAll(dynamicRe)) {
    const spec = match[1]
    if (!spec.startsWith('.')) continue
    const resolved = resolveLocalImport(file, spec)
    const line = lineOf(text, match.index ?? 0)
    if (!resolved) {
      fail(file, line, `Dynamic import local não resolvido: ${spec}`)
      continue
    }
    if (!resolved.exactCase) fail(file, line, `Casing incorreto no dynamic import: ${spec}`)
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 180)
    const namedMatch = after.match(/^\s*\.then\(\s*\w+\s*=>\s*\w+\.([A-Za-z_$][\w$]*)/)
    if (namedMatch) {
      const target = fs.readFileSync(resolved.path, 'utf8')
      if (!namedExports(target).has(namedMatch[1])) {
        fail(file, line, `Dynamic import exige export "${namedMatch[1]}", ausente em ${rel(resolved.path)}`)
      }
    }
  }

  const plainImportRe = /\bimport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g
  for (const match of text.matchAll(plainImportRe)) {
    const spec = match[1]
    if (!spec.startsWith('.')) continue
    const resolved = resolveLocalImport(file, spec)
    const line = lineOf(text, match.index ?? 0)
    if (!resolved) fail(file, line, `Import local não resolvido: ${spec}`)
    else if (!resolved.exactCase) fail(file, line, `Casing incorreto no import: ${spec}`)
  }
}

console.log('=== ERP INDUSTRIAL — LAZY/DYNAMIC IMPORT GATE ===')
console.log(`Arquivos analisados: ${files.length}`)
console.log(`Falhas: ${failures.length}`)
for (const failure of failures) console.log(failure)

if (failures.length) {
  console.log('RESULT: FAIL — imports locais/exportações incompatíveis detectados.')
  process.exit(2)
}

console.log('RESULT: PASS — imports locais, casing e exports compatíveis.')
