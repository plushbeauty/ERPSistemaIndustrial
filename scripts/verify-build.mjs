import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const dist=path.join(root,'dist')
const index=path.join(dist,'index.html')

console.log('=== BUILD OUTPUT GATE ===')

if(!fs.existsSync(dist)){
  console.error('[BLOCKER] dist/ não existe. Execute npm run build antes do verify:build.')
  process.exit(2)
}
if(!fs.existsSync(index)){
  console.error('[BLOCKER] dist/index.html não foi gerado.')
  process.exit(2)
}

const assetsDir=path.join(dist,'assets')
const assets=fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter(name=>/\.(js|css|map|svg|png|jpg|jpeg|webp|woff2?)$/i.test(name))
  : []

if(assets.length===0){
  console.error('[BLOCKER] Nenhum asset de produção encontrado em dist/assets.')
  process.exit(2)
}

const html=fs.readFileSync(index,'utf8')
const assetRefs=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]).filter(x=>x.startsWith('/assets/'))
const missing=assetRefs.filter(ref=>!fs.existsSync(path.join(root,'dist',ref.replace(/^\//,''))))
if(missing.length){
  for(const ref of missing) console.error('[BLOCKER] Asset referenciado no index não existe:',ref)
  process.exit(2)
}

console.log(`BUILD OUTPUT GATE PASS — dist/index.html + ${assets.length} assets; ${assetRefs.length} HTML asset refs resolvidos.`)
