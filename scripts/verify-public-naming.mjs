import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const forbiddenTerms = ['pente-fino', 'pente_fino', 'pente fino']
const failures = []

const branchRefs = [
  process.env.GITHUB_REF_NAME,
  process.env.VERCEL_GIT_COMMIT_REF,
].filter(Boolean)

for (const ref of branchRefs) {
  const normalized = String(ref).toLowerCase()
  for (const term of forbiddenTerms) {
    if (normalized.includes(term)) failures.push(`Branch pública proibida: ${ref}`)
  }
}

const scanRoots = ['src', 'public', 'scripts', '.github', 'docs', 'vercel.json', 'package.json']
const ignored = new Set(['node_modules', 'dist', '.git', '.vercel'])
const guardFiles = new Set(['scripts/verify-public-naming.mjs'])
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.yml', '.yaml', '.html', '.md'])

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) scanDirectory(full)
    else if (extensions.has(path.extname(entry.name).toLowerCase())) scanFile(full)
  }
}

function scanFile(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  if (guardFiles.has(relative)) return
  const content = fs.readFileSync(file, 'utf8').toLowerCase()
  for (const term of forbiddenTerms) {
    if (content.includes(term)) failures.push(`Nome interno proibido encontrado em ${path.relative(root, file)}: ${term}`)
  }
}

for (const target of scanRoots) {
  const full = path.join(root, target)
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) scanDirectory(full)
  else if (fs.existsSync(full)) scanFile(full)
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error('[BLOCKER]', failure)
  process.exit(2)
}

console.log('PUBLIC NAMING GATE PASS — nenhum nome interno proibido encontrado.')
