import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const canonicalUrl = 'https://zsklkydlawgvwgnvxwwx.supabase.co'
const forbiddenRefs = ['wdkvrqekixczuhrfygen', 'uhuxfkhutaknrykrvxge']
const failures = []

const fail = message => failures.push(message)

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
const isCi = process.env.CI === 'true'
const url = String(process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const publishable = String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const legacyAnon = String(process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const publicKey = publishable || legacyAnon

console.log('=== ERP INDUSTRIAL — SUPABASE ENVIRONMENT GATE ===')
console.log('Mode:', isVercel ? 'VERCEL PRODUCTION/PREVIEW' : isCi ? 'CI STATIC CONTRACT' : 'LOCAL')

const envExamplePath = path.join(root, '.env.example')
const clientPath = path.join(root, 'src/lib/supabaseClient.ts')

if (!fs.existsSync(envExamplePath)) {
  fail('.env.example ausente.')
} else {
  const example = fs.readFileSync(envExamplePath, 'utf8')
  for (const variable of ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_PUBLISHABLE_KEY=']) {
    if (!example.includes(variable)) fail(`.env.example sem ${variable}`)
  }
  if (/sb_(publishable|secret)_[A-Za-z0-9_-]{12,}/.test(example)) {
    fail('.env.example contém uma chave Supabase real.')
  }
}

if (!fs.existsSync(clientPath)) {
  fail('src/lib/supabaseClient.ts ausente.')
} else {
  const client = fs.readFileSync(clientPath, 'utf8')
  const readsUrl = /import\.meta\.env\.VITE_SUPABASE_URL/.test(client)
  const readsPublishable = /import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/.test(client)
  const readsLegacy = /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/.test(client)

  if (!readsUrl) fail('Cliente Supabase não lê VITE_SUPABASE_URL.')
  if (!readsPublishable) fail('Cliente Supabase não lê VITE_SUPABASE_PUBLISHABLE_KEY.')
  if (/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*['"][^'"]+['"]/.test(client)) fail('Chave Supabase hardcoded no cliente.')
  if (/https:\/\/[^'"]+\.supabase\.co/.test(client) && !client.includes(canonicalUrl)) fail('URL Supabase incorreta hardcoded no cliente.')
  for (const ref of forbiddenRefs) if (client.includes(`${ref}.supabase.co`)) fail(`Projeto Supabase legado encontrado no cliente: ${ref}`)
  if (/sb_secret_[A-Za-z0-9_-]{12,}/.test(client)) fail('Chave sb_secret_ encontrada no frontend.')
  if (/['"]service_role['"]\s*[:=]/i.test(client)) fail('service_role encontrado no frontend.')
  if (readsLegacy && !readsPublishable) fail('Cliente depende somente da variável legada ANON_KEY.')
}

const scanRoots = ['src', 'scripts', '.github', 'public']
const ignored = new Set(['node_modules', 'dist', '.git'])
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.yml', '.yaml', '.html', '.env', '.md'])
const maxBytes = 1024 * 1024
const guardFiles = new Set([
  'scripts/verify-supabase-env.mjs',
  'scripts/auditoria-global.mjs',
  'scripts/verify-supabase-guard.mjs',
])

function scanDirectory(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) scanDirectory(full)
    else if (allowedExtensions.has(path.extname(entry.name).toLowerCase()) && fs.statSync(full).size <= maxBytes) {
      const relative = path.relative(root, full).replaceAll(path.sep, '/')
      if (guardFiles.has(relative)) continue
      const content = fs.readFileSync(full, 'utf8')
      for (const ref of forbiddenRefs) if (content.includes(`${ref}.supabase.co`) || content.includes(ref)) fail(`Projeto Supabase proibido encontrado em ${path.relative(root, full)}: ${ref}`)
      if (/sb_secret_[A-Za-z0-9_-]{12,}/.test(content)) fail(`Chave sb_secret_ encontrada em ${path.relative(root, full)}`)
      if (/['"]service_role['"]\s*[:=]/i.test(content)) fail(`service_role encontrado em ${path.relative(root, full)}`)
    }
  }
}

for (const directory of scanRoots) scanDirectory(path.join(root, directory))

if (isVercel) {
  if (url !== canonicalUrl) fail('Vercel deve usar exatamente a URL Supabase canônica.')
  if (!publicKey) fail('Vercel sem chave pública Supabase.')
  if (publishable && !publishable.startsWith('sb_publishable_')) fail('VITE_SUPABASE_PUBLISHABLE_KEY com formato inválido.')
  if (publicKey.startsWith('sb_secret_') || /service_role/i.test(publicKey)) fail('Vercel recebeu chave privada/service_role.')
} else if (!url || !publicKey) {
  console.log('AVISO LOCAL/CI: variáveis reais não fornecidas; somente contrato estrutural será validado.')
}

console.log('Canonical URL:', canonicalUrl)
console.log('Public key configured:', Boolean(publicKey))
console.log('Failures:', failures.length)

for (const failure of failures) console.log('[BLOCKER]', failure)

if (failures.length) {
  console.log('RESULT: FAIL — deploy bloqueado.')
  process.exit(2)
}

console.log('RESULT: PASS — contrato Supabase válido.')
