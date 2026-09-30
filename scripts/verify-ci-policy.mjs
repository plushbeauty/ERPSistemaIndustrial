import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const workflowsDir=path.join(root,'.github','workflows')
const required=['ci.yml','industrial-production-gate.yml']
const forbidden=[/continue-on-error\s*:/, /\|\|\s*true/, /if \[ -f package-lock\.json \]/, /npm install(?!.*package-lock-only)/]
const failures=[]

for(const file of required){
  const full=path.join(workflowsDir,file)
  if(!fs.existsSync(full)){failures.push(`workflow obrigatório ausente: .github/workflows/${file}`);continue}
  const text=fs.readFileSync(full,'utf8')
  for(const pattern of forbidden) if(pattern.test(text)) failures.push(`.github/workflows/${file}: padrão proibido ${pattern}`)
  if(!/node-version:\s*24/.test(text)) failures.push(`.github/workflows/${file}: Node 24 não configurado`)
  if(!/npm ci --legacy-peer-deps --no-audit --no-fund/.test(text)) failures.push(`.github/workflows/${file}: npm ci determinístico ausente`)
}
const ci=fs.existsSync(path.join(workflowsDir,'ci.yml'))?fs.readFileSync(path.join(workflowsDir,'ci.yml'),'utf8'):''
for(const command of [
  'npm run verify:lockfile','npm run verify:vercel-config','npm run verify:ci-policy',
  'npm run verify:supabase-env','npm run verify:supabase-guard','npm run verify:deploy-integrity',
  'npm run type-check','npm run lint:check','npm run audit:global','npm run audit:brutal',
  'npm run audit:interactions','npm run verify:lazy-imports','npm run build',
  'npm run verify:build','npm run verify-routes'
]) if(!ci.includes(command)) failures.push(`.github/workflows/ci.yml: gate ausente: ${command}`)
if(failures.length){for(const failure of failures)console.error('[BLOCKER]',failure);process.exit(2)}
console.log('CI POLICY GATE PASS — P0/P1 gates completos e sem bypass.')
