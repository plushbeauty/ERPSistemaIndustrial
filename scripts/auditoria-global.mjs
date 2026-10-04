import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const findings = []
function rel(file){return path.relative(ROOT,file).replaceAll(path.sep,'/')}
function lineOf(text,index){return text.slice(0,index).split('\n').length}
function add(level,file,line,message){findings.push({level,file:rel(file),line,message})}
function walk(dir){
  const out=[]
  if(!fs.existsSync(dir)) return out
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','dist','.git','.vercel'].includes(entry.name)) continue
    const full=path.join(dir,entry.name)
    if(entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}
function read(file){try{return fs.readFileSync(file,'utf8')}catch{return ''}}
function stripSqlStringsAndComments(text){
  return text
    .replace(/--[^\n]*/g,'')
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/'(?:''|[^'])*'/g,"''")
}
const files=walk(ROOT)
const sourceFiles=files.filter(f=>['.ts','.tsx','.js','.jsx','.mjs'].includes(path.extname(f).toLowerCase()))
const frontendFiles=sourceFiles.filter(f=>f.includes(path.join('src','')))
const allText=new Map(files.map(f=>[f,read(f)]))
const legacySupabaseUrls=['https://wdkvrqekixczuhrfygen.supabase.co','https://uhuxfkhutaknrykrvxge.supabase.co']

const secretPatterns=[
  /sb_secret_[A-Za-z0-9_-]{20,}/g,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"\n]{20,}['"]/gi,
  /(?:password|senha)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi,
  /(?:api[_-]?key|secret)\s*[:=]\s*['"][^'"\n]{16,}['"]/gi,
]
for(const file of files){
  const text=allText.get(file)
  if(file.endsWith('supabaseClient.ts')){
    const privateValue=text.match(/sb_secret_[A-Za-z0-9_-]{20,}/g)
    if(privateValue) for(const m of privateValue) add('BLOCKER',file,lineOf(text,text.indexOf(m)),'Chave privada Supabase encontrada no código.')
    continue
  }
  for(const re of secretPatterns) for(const m of text.matchAll(re)) add('BLOCKER',file,lineOf(text,m.index??0),'Possível segredo/credencial hardcoded.')
}
const guardFiles=new Set([
  'scripts/auditoria-global.mjs',
  'scripts/verify-supabase-env.mjs',
  'scripts/verify-supabase-guard.mjs',
])
for(const file of files){
  const text=allText.get(file)
  if(!guardFiles.has(rel(file))) for(const legacy of legacySupabaseUrls)
    if(text.includes(legacy)) add('BLOCKER',file,lineOf(text,text.indexOf(legacy)),`Projeto Supabase legado/proibido encontrado: ${legacy}`)
}
for(const file of frontendFiles){
  const text=allText.get(file)
  for(const token of ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY']){
    const i=text.indexOf(token)
    if(i>=0 && !file.endsWith('supabaseClient.ts')) add('BLOCKER',file,lineOf(text,i),`Referência a credencial privada no frontend: ${token}.`)
  }
  if(/["']service_role["']\s*[:=]/i.test(text)) add('BLOCKER',file,1,'Possível credencial privada atribuída no frontend.')
}
for(const file of frontendFiles){
  const text=allText.get(file)
  for(const re of [
    /localStorage\.(setItem|getItem)\([^\n]*(?:password|senha|token|secret)/gi,
    /sessionStorage\.(setItem|getItem)\([^\n]*(?:password|senha|token|secret)/gi,
    /["'](?:admin|master)[^'"\n]*(?:password|senha)["']\s*[:=]/gi,
  ]) for(const m of text.matchAll(re)) add('HIGH',file,lineOf(text,m.index??0),'Possível bypass de autenticação/armazenamento inseguro de credencial.')
}
const clientCandidates=frontendFiles.filter(f=>/supabase.*client|client.*supabase/i.test(path.basename(f)))
if(clientCandidates.length>1) findings.push({level:'HIGH',file:clientCandidates.map(rel).join(', '),line:1,message:'Mais de uma implementação de cliente Supabase detectada; consolidar em um cliente canônico.'})
const vercel=files.find(f=>rel(f)==='vercel.json')
if(!vercel) add('HIGH',ROOT,1,'vercel.json ausente.')
else {try{JSON.parse(allText.get(vercel))}catch{add('BLOCKER',vercel,1,'vercel.json inválido.')}}
const pkg=files.find(f=>rel(f)==='package.json')
if(!pkg) add('BLOCKER',ROOT,1,'package.json ausente.')
else {try{const p=JSON.parse(allText.get(pkg));for(const required of ['type-check','build','build:vercel'])if(!p.scripts?.[required])add('HIGH',pkg,1,`Script obrigatório ausente: ${required}.`);if(p.engines?.node!=='24.x')add('HIGH',pkg,1,'package.json deve fixar Node 24.x para CI/Vercel.')}catch{add('BLOCKER',pkg,1,'package.json inválido.')}}
for(const file of files.filter(f=>f.includes(path.join('supabase','migrations')))){
  const text=stripSqlStringsAndComments(allText.get(file))
  if(/sb_secret_[A-Za-z0-9_-]{20,}/i.test(text)) add('BLOCKER',file,1,'Segredo privado encontrado em migration.')
  if(/security\s+definer/i.test(text)&&!/search_path\s*(?:=|to)\s*(?:''|pg_catalog\s*,\s*public|public\s*,\s*pg_catalog|public|pg_catalog)/i.test(text)) add('HIGH',file,1,'SECURITY DEFINER sem search_path fixo explícito; revisar risco de search_path injection.')
}
const migrationFiles=files.filter(f=>f.includes(path.join('supabase','migrations'))).map(rel)
const migrationNames=migrationFiles.map(f=>path.basename(f).toLowerCase())
const duplicateNames=migrationNames.filter((v,i,a)=>a.indexOf(v)!==i)
for(const name of [...new Set(duplicateNames)]) add('HIGH',ROOT,1,`Migration duplicada: ${name}`)

const counts=findings.reduce((a,f)=>{a[f.level]=(a[f.level]||0)+1;return a},{})
console.log(`GLOBAL AUDIT | files=${files.length} source=${sourceFiles.length}`)
console.log(`FINDINGS | ${Object.entries(counts).map(([k,v])=>`${k}=${v}`).join(' ')||'NONE'}`)
for(const f of findings) console.log(`[${f.level}] ${f.file}:${f.line} — ${f.message}`)
if(findings.some(f=>f.level==='BLOCKER')) process.exit(2)
process.exit(0)
