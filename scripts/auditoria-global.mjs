import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'coverage'])
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.sql', '.json', '.yml', '.yaml'])
const files = []
const findings = []

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full)
    else if (SOURCE_EXT.has(path.extname(ent.name).toLowerCase())) files.push(full)
  }
}

function rel(file) { return path.relative(ROOT, file).replaceAll(path.sep, '/') }
function add(level, file, line, message) { findings.push({ level, file: rel(file), line, message }) }
function lineOf(text, index) { return text.slice(0, index).split('\n').length }
function read(file) { return fs.readFileSync(file, 'utf8') }

walk(ROOT)

const sourceFiles = files.filter(f => ['.ts','.tsx','.js','.jsx','.mjs'].includes(path.extname(f).toLowerCase()))
const frontendFiles = sourceFiles.filter(f => f.includes(`${path.sep}src${path.sep}`))
const allText = new Map(files.map(f => [f, read(f)]))

// 1) Secrets / credentials: private keys and obvious hardcoded credentials are blockers.
const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]+/g,
  /service_role[A-Za-z0-9_\-=:/.]+/gi,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"\n]+['"]/gi,
  /(?:password|senha)\s*[:=]\s*['"][^'"\n]{6,}['"]/gi,
  /(?:api[_-]?key|secret)\s*[:=]\s*['"][^'"\n]{12,}['"]/gi,
]
for (const file of files) {
  const text = allText.get(file)
  if (file.endsWith('supabaseClient.ts')) {
    // The client is allowed to mention the prefix solely to reject private keys at runtime.
    // It must never contain an actual private key value.
    const privateValue = text.match(/sb_secret_[A-Za-z0-9_-]{20,}/g)
    if (privateValue) for (const m of privateValue) add('BLOCKER', file, lineOf(text, text.indexOf(m)), 'Chave privada Supabase encontrada no código.')
    continue
  }
  for (const re of secretPatterns) {
    for (const m of text.matchAll(re)) add('BLOCKER', file, lineOf(text, m.index ?? 0), 'Possível segredo/credencial hardcoded.')
  }
}

// 2) Browser must never use private Supabase credentials.
for (const file of frontendFiles) {
  const text = allText.get(file)
  for (const token of ['service_role', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']) {
    const i = text.indexOf(token)
    if (i >= 0 && !file.endsWith('supabaseClient.ts')) add('BLOCKER', file, lineOf(text, i), `Referência a credencial privada no frontend: ${token}.`)
  }
}

// 3) Dangerous local credential/auth bypass patterns.
for (const file of frontendFiles) {
  const text = allText.get(file)
  const patterns = [
    /localStorage\.(setItem|getItem)\([^\n]*(?:password|senha|token|secret)/gi,
    /sessionStorage\.(setItem|getItem)\([^\n]*(?:password|senha|token|secret)/gi,
    /['"](?:admin|master)[^'"\n]*(?:password|senha)['"]\s*[:=]/gi,
  ]
  for (const re of patterns) for (const m of text.matchAll(re)) add('HIGH', file, lineOf(text, m.index ?? 0), 'Possível bypass de autenticação/armazenamento inseguro de credencial.')
}

// 4) Duplicate Supabase client implementations.
const clientCandidates = frontendFiles.filter(f => /supabase.*client|client.*supabase/i.test(path.basename(f)))
if (clientCandidates.length > 1) {
  findings.push({ level: 'HIGH', file: clientCandidates.map(rel).join(', '), line: 1, message: 'Mais de uma implementação de cliente Supabase detectada; consolidar em um cliente canônico.' })
}

// 5) Obvious dead placeholders in executable source (docs are intentionally ignored).
for (const file of frontendFiles) {
  const text = allText.get(file)
  const re = /(?:TODO|FIXME|coming\s+soon|em\s+breve)/gi
  for (const m of text.matchAll(re)) add('MEDIUM', file, lineOf(text, m.index ?? 0), 'Placeholder/TODO encontrado em código executável.')
}

// 6) Broken relative imports: resolve local imports against TS/JS extensions and index files.
const importRe = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+(?:[^'";]+?\s+from\s+)?|import\s*\()(['"])(\.\.?\/[^'"\n]+)\1/g
for (const file of sourceFiles) {
  const text = allText.get(file)
  for (const m of text.matchAll(importRe)) {
    const spec = m[2]
    const base = path.resolve(path.dirname(file), spec)
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, path.join(base,'index.ts'), path.join(base,'index.tsx'), path.join(base,'index.js')]
    if (!candidates.some(fs.existsSync)) add('BLOCKER', file, lineOf(text, m.index ?? 0), `Import local não resolvido: ${spec}`)
  }
}

// 7) Routes must reference existing local page modules when lazy importing them.
const entry = files.find(f => rel(f) === 'src/AppEntryV2.tsx')
if (entry) {
  const text = allText.get(entry)
  const lazyRe = /import\(['"](\.\/pages\/[^'"\n]+)['"]\)/g
  for (const m of text.matchAll(lazyRe)) {
    const base = path.resolve(path.dirname(entry), m[1])
    const ok = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`].some(fs.existsSync)
    if (!ok) add('BLOCKER', entry, lineOf(text, m.index ?? 0), `Página lazy importada não existe: ${m[1]}`)
  }
}

// 8) Vite/Vercel SPA configuration sanity.
const vercel = files.find(f => rel(f) === 'vercel.json')
if (!vercel) add('HIGH', ROOT, 1, 'vercel.json ausente.')
else {
  try { JSON.parse(allText.get(vercel)) } catch { add('BLOCKER', vercel, 1, 'vercel.json inválido.') }
}

const pkg = files.find(f => rel(f) === 'package.json')
if (!pkg) add('BLOCKER', ROOT, 1, 'package.json ausente.')
else {
  try {
    const p = JSON.parse(allText.get(pkg))
    for (const required of ['type-check','build']) if (!p.scripts?.[required]) add('HIGH', pkg, 1, `Script obrigatório ausente: ${required}.`)
  } catch { add('BLOCKER', pkg, 1, 'package.json inválido.') }
}

// 9) Migration hygiene: forbid private secrets in SQL and flag SECURITY DEFINER functions without search_path.
for (const file of files.filter(f => f.includes(`${path.sep}supabase${path.sep}migrations${path.sep}`))) {
  const text = allText.get(file)
  if (/sb_secret_|service_role/i.test(text)) add('BLOCKER', file, 1, 'Segredo privado encontrado em migration.')
  const hasDefiner = /security\s+definer/i.test(text)
  if (hasDefiner && !/search_path\s*=\s*(?:public|pg_catalog)/i.test(text)) add('HIGH', file, 1, 'SECURITY DEFINER sem search_path explícito detectado; revisar risco de search_path injection.')
}

// 10) SQL migration filename ordering/duplicates.
const migrationFiles = files.filter(f => f.includes(`${path.sep}supabase${path.sep}migrations${path.sep}`)).map(rel)
const migrationNames = migrationFiles.map(f => path.basename(f).toLowerCase())
const duplicateNames = migrationNames.filter((v,i,a) => a.indexOf(v) !== i)
for (const name of [...new Set(duplicateNames)]) add('HIGH', ROOT, 1, `Migration duplicada: ${name}`)

const counts = findings.reduce((a, f) => { a[f.level] = (a[f.level] || 0) + 1; return a }, {})
console.log(`GLOBAL AUDIT | files=${files.length} source=${sourceFiles.length}`)
console.log(`FINDINGS | ${Object.entries(counts).map(([k,v]) => `${k}=${v}`).join(' ') || 'NONE'}`)
for (const f of findings) console.log(`[${f.level}] ${f.file}:${f.line} — ${f.message}`)

const blockers = findings.filter(f => f.level === 'BLOCKER')
if (blockers.length) process.exit(2)
process.exit(0)
