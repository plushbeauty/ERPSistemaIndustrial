import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const dist = path.join(root, 'dist')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

console.log('=== BUILD GATE ===')
execFileSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' })

const index = path.join(dist, 'index.html')
if (!fs.existsSync(index)) {
  console.error('[BLOCKER] dist/index.html não foi gerado.')
  process.exit(2)
}

const assetsDir = path.join(dist, 'assets')
const assets = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter(name => /\.(js|css|map|svg|png|jpg|jpeg|webp|woff2?)$/i.test(name))
  : []

if (assets.length === 0) {
  console.error('[BLOCKER] Nenhum asset de produção encontrado em dist/assets.')
  process.exit(2)
}

console.log(`BUILD GATE PASS — dist/index.html + ${assets.length} assets.`)
