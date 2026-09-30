import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const file=path.join(root,'vercel.json')
const pkgPath=path.join(root,'package.json')
if(!fs.existsSync(file)){console.error('[BLOCKER] vercel.json ausente.');process.exit(2)}
const config=JSON.parse(fs.readFileSync(file,'utf8'))
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'))
const failures=[]
if(config.framework!=='vite') failures.push('framework deve ser vite')
if(config.outputDirectory!=='dist') failures.push('outputDirectory deve ser dist')
if(config.buildCommand!=='npm run build:vercel') failures.push('buildCommand deve ser exatamente npm run build:vercel')
if(config.installCommand!=='npm ci --legacy-peer-deps --no-audit --no-fund') failures.push('installCommand deve ser exatamente npm ci --legacy-peer-deps --no-audit --no-fund')
if(pkg.engines?.node!=='24.x') failures.push('package.json deve fixar Node 24.x')
if(!Array.isArray(config.rewrites)||!config.rewrites.some(item=>item.source==='/(.*)'&&item.destination==='/index.html')) failures.push('rewrite SPA catch-all /(.*) -> /index.html ausente')
if(config.builds) failures.push('configuração legada "builds" não permitida')
if(config.routes) failures.push('configuração legada "routes" não permitida')
if(failures.length){for(const failure of failures)console.error('[BLOCKER]',failure);process.exit(2)}
console.log('VERCEL CONFIG GATE PASS — Vite/dist/SPA/Node24 e comandos determinísticos.')
