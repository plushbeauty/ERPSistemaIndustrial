import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const required = ['ci.yml', 'industrial-production-gate.yml']
const forbidden = [/continue-on-error\s*:/, /\|\|\s*true/, /if \[ -f package-lock\.json \]/, /npm install(?!.*package-lock-only)/]
const failures = []

for (const file of required) {
  const full = path.join(workflowsDir, file)
  if (!fs.existsSync(full)) {
    failures.push(`workflow obrigatório ausente: .github/workflows/${file}`)
    continue
  }
  const text = fs.readFileSync(full, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`.github/workflows/${file}: padrão proibido ${pattern}`)
  }
  if (!/node-version:\s*24/.test(text)) failures.push(`.github/workflows/${file}: Node 24 não configurado`)
  if (!/npm ci/.test(text)) failures.push(`.github/workflows/${file}: npm ci não encontrado`)
}

if (failures.length) {
  for (const failure of failures) console.error('[BLOCKER]', failure)
  process.exit(2)
}

console.log('CI POLICY GATE PASS — workflows críticos blindados.')
