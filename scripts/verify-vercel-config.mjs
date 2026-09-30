import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'vercel.json')
if (!fs.existsSync(file)) {
  console.error('[BLOCKER] vercel.json ausente.')
  process.exit(2)
}

const config = JSON.parse(fs.readFileSync(file, 'utf8'))
const failures = []

if (config.framework !== 'vite') failures.push('framework deve ser vite')
if (config.outputDirectory !== 'dist') failures.push('outputDirectory deve ser dist')
if (config.buildCommand !== 'npm run build:vercel') failures.push('buildCommand deve ser npm run build:vercel')
if (!String(config.installCommand ?? '').startsWith('npm ci')) failures.push('installCommand deve usar npm ci')
if (!Array.isArray(config.rewrites) || !config.rewrites.some(item => item.source === '/(.*)' && item.destination === '/index.html')) {
  failures.push('rewrite SPA catch-all / (.*) -> /index.html ausente')
}

if (failures.length) {
  for (const failure of failures) console.error('[BLOCKER]', failure)
  process.exit(2)
}

console.log('VERCEL CONFIG GATE PASS.')
