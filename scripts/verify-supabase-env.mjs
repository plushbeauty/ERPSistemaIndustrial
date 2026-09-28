import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const url = String(process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const publishable = String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
const isCi = process.env.CI === 'true'
const canonicalUrl = 'https://zsklkydlawgvwgnvxwwx.supabase.co'
const failures = []

function fail(message) { failures.push(message) }

console.log('=== ERP INDUSTRIAL — SUPABASE ENVIRONMENT GATE ===')
console.log('Mode:', isVercel ? 'VERCEL PRODUCTION/PREVIEW' : isCi ? 'CI STATIC CONTRACT' : 'LOCAL')

const envExamplePath = path.join(root, '.env.example')
if (!fs.existsSync(envExamplePath)) fail('.env.example ausente; contrato de ambiente não pode ser auditado.')
else {
  const example = fs.readFileSync(envExamplePath, 'utf8')
  if (!example.includes('VITE_SUPABASE_URL=')) fail('.env.example sem VITE_SUPABASE_URL.')
  if (!example.includes('VITE_SUPABASE_PUBLISHABLE_KEY=')) fail('.env.example sem VITE_SUPABASE_PUBLISHABLE_KEY.')
}

const clientPath = path.join(root, 'src/lib/supabaseClient.ts')
if (!fs.existsSync(clientPath)) fail('src/lib/supabaseClient.ts ausente.')
else {
  const client = fs.readFileSync(clientPath, 'utf8')
  if (/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*['"][^'"]+['"]/.test(client)) fail('Chave Supabase hardcoded encontrada no cliente.')
  if (/https:\/\/[^'"]+\.supabase\.co/.test(client) && !client.includes(canonicalUrl)) fail('URL Supabase diferente do projeto ERP encontrada no cliente.')
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(client)) fail('Chave sb_secret_ encontrada no frontend.')
  if (/[\'"]service_role[\'"]\s*[:=]/i.test(client)) fail('service_role encontrado no cliente frontend.')
  if (!client.includes('import.meta.env.VITE_SUPABASE_URL')) fail('Cliente não usa import.meta.env.VITE_SUPABASE_URL.')
  if (!client.includes('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY')) fail('Cliente não usa import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.')
  if (client.includes('VITE_SUPABASE_ANON_KEY')) fail('Cliente ainda aceita VITE_SUPABASE_ANON_KEY; somente a chave publishable é permitida.')
}

if (isVercel) {
  if (!url) fail('Vercel sem VITE_SUPABASE_URL.')
  if (url !== canonicalUrl) fail('VITE_SUPABASE_URL aponta para projeto Supabase diferente do ERP Industrial.')
  if (!publishable) fail('Vercel sem VITE_SUPABASE_PUBLISHABLE_KEY.')
  if (publishable.startsWith('sb_secret_') || publishable.includes('service_role')) fail('Vercel recebeu chave privada/service_role no frontend.')
  if (!publishable.startsWith('sb_publishable_')) fail('VITE_SUPABASE_PUBLISHABLE_KEY não possui formato publishable válido.')
} else if (!publishable || !url) {
  console.log('AVISO LOCAL/CI: variáveis reais não foram fornecidas; validação de contrato concluída sem bloquear.')
}

console.log('Canonical URL:', canonicalUrl)
console.log('Public key configured:', Boolean(publishable))
console.log('Private key rejected:', Boolean(publishable && (publishable.startsWith('sb_secret_') || publishable.includes('service_role'))))
console.log('Failures:', failures.length)
for (const failure of failures) console.log('[BLOCKER]', failure)

if (failures.length) {
  console.log('RESULT: FAIL — deploy bloqueado para impedir ERP sem Supabase funcional.')
  process.exit(2)
}

console.log('RESULT: PASS — contrato Supabase válido para este ambiente.')
