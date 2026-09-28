import fs from 'node:fs'
import path from 'node:path'

const ROOT=process.cwd()
const failures=[]
const warnings=[]
const requiredFiles=[
 'src/AppBootstrap.tsx','src/AppEntryV2.tsx','src/IndustrialLoginDirect.tsx',
 'src/AppIndustrialV7.tsx','src/pages/Master.tsx','src/pages/SetupADMInicial.tsx',
 'src/styles/industrial-login.css','src/styles/design-system-2026.css',
 'src/styles/industrial-command-center-2026.css','src/styles/erp-reference-ux-2026.css',
 'src/lib/supabaseClient.ts','vercel.json'
]
const requiredRoutes=['/login','/cadastro-master','/cadastro-empresa','/master','/erp-industrial','/pcp','/qualidade','/qualidade/documentos','/produtos-vendas','/compras-solicitacao','/usuarios','/fiscal','/fiscal/previsao-caixa','/recebimento-materiais','/manual-usuario']
function read(p){return fs.readFileSync(path.join(ROOT,p),'utf8')}
function has(p){return fs.existsSync(path.join(ROOT,p))}
function fail(msg){failures.push(msg)}
function warn(msg){warnings.push(msg)}

console.log('=== SGQ ERP INDUSTRIAL — AUDITORIA BRUTAL 360° ===')
console.log('Objetivo: detectar regressões de bootstrap, rotas, autenticação, visual, Motion, deploy e referências quebradas.')

for(const f of requiredFiles) if(!has(f)) fail('ARQUIVO AUSENTE: '+f)

const bootstrap=has('src/AppBootstrap.tsx')?read('src/AppBootstrap.tsx'):''
const entry=has('src/AppEntryV2.tsx')?read('src/AppEntryV2.tsx'):''
const login=has('src/IndustrialLoginDirect.tsx')?read('src/IndustrialLoginDirect.tsx'):''
const setup=has('src/pages/SetupADMInicial.tsx')?read('src/pages/SetupADMInicial.tsx'):''
const main=has('src/main.tsx')?read('src/main.tsx'):''
const pkg=JSON.parse(read('package.json'))
const vercel=JSON.parse(read('vercel.json'))

if(!bootstrap.includes("'/cadastro-master'")) fail('REGRESSÃO DE ROTA: /cadastro-master não está liberada antes do AccessGate.')
if(!bootstrap.includes("'/planos'")) warn('ROTA /planos não está explicitamente pública no bootstrap.')
if(!entry.includes("path==='/cadastro-master'")) fail('ROTA /cadastro-master não está implementada no AppEntryV2.')
if(!entry.includes("SetupADMInicial")) fail('Cadastro Master não aponta para SetupADMInicial.')
if(!login.includes("signInWithPassword") && !login.includes("erp-login")) fail('LOGIN: não foi encontrada autenticação Supabase/erp-login.')
if(!login.includes("resetPasswordForEmail")) fail('LOGIN: recuperação de senha ausente.')
if(!login.includes("showPassword")) fail('LOGIN: mostrar/ocultar senha ausente.')
if(!login.includes("motion.main")) fail('LOGIN: Motion não aplicado à entrada da tela.')
if(!login.includes("whileHover") || !login.includes("whileTap")) fail('LOGIN: microinteração hover/press ausente.')
if(!main.includes("MotionConfig")) fail('MOTION: MotionConfig global ausente.')
if(!main.includes('reducedMotion="user"')) fail('ACESSIBILIDADE: reducedMotion user ausente.')
if(!pkg.dependencies?.motion) fail('DEPENDÊNCIA: motion ausente.')
if(!pkg.scripts?.['audit:global'] || !pkg.scripts?.['audit:interactions']) fail('AUDITORIAS existentes não estão configuradas.')
if(!pkg.scripts?.['audit:brutal']) fail('AUDITORIA BRUTAL não está configurada.')
if(!vercel.rewrites?.some(x=>x.source==='/cadastro-master'&&x.destination==='/index.html')) fail('VERCEL: rewrite /cadastro-master ausente.')
if(!vercel.rewrites?.some(x=>x.source==='/login'&&x.destination==='/index.html')) fail('VERCEL: rewrite /login ausente.')

const visualFiles=['src/styles/design-system-2026.css','src/styles/industrial-command-center-2026.css','src/styles/erp-reference-ux-2026.css','src/styles/industrial-login.css']
for(const f of visualFiles){
 const t=read(f)
 if(!t.includes('@media')) warn('VISUAL: '+f+' sem media queries.')
 if(!t.includes('prefers-reduced-motion')) warn('ACESSIBILIDADE: '+f+' sem reduced-motion explícito.')
}
const ds=read('src/styles/design-system-2026.css')
for(const token of ['--ds-bg','--ds-surface','--ds-line','--ds-brand','--ds-success','--ds-warning','--ds-danger','--ds-info','--ds-radius','--ds-shadow']){
 if(!ds.includes(token)) fail('DESIGN SYSTEM: token ausente '+token)
}
for(const token of ['theme-dark','@media(max-width:','@media(prefers-reduced-motion:reduce)']){
 if(!ds.includes(token)) fail('DESIGN SYSTEM: regra ausente '+token)
}

const forbidden=[/SUPABASE_SERVICE_ROLE_KEY\s*[:=]/i,/sb_secret_[A-Za-z0-9_-]{20,}/i,/localStorage\.(?:setItem|getItem)\([^\n]*(?:password|senha)/i]
for(const f of requiredFiles.filter(has)){
 const t=read(f)
 for(const re of forbidden) if(re.test(t) && !f.endsWith('supabaseClient.ts')) fail('SEGURANÇA: possível segredo/bypass em '+f)
}

const lazyImports=[...entry.matchAll(/import\(['"](.+?)['"]\)/g)].map(m=>m[1]).filter(x=>x.startsWith('./'))
for(const spec of lazyImports){
 const base=path.resolve(path.dirname(path.join(ROOT,'src/AppEntryV2.tsx')),spec)
 const candidates=[base,base+'.ts',base+'.tsx',base+'.js',base+'.jsx']
 if(!candidates.some(fs.existsSync)) fail('IMPORT QUEBRADO: '+spec)
}

for(const route of requiredRoutes){
 if(route==='/login'&&!bootstrap.includes("path === '/login'")) warn('BOOTSTRAP: /login não é tratado diretamente.')
 if(route==='/cadastro-master'&&!entry.includes("path==='/cadastro-master'")) fail('ROTA AUSENTE: '+route)
}

if(!setup.includes('bootstrap_master')) fail('MASTER: ação bootstrap_master ausente no cadastro.')
if(!setup.includes('signInWithPassword')) fail('MASTER: login após cadastro ausente.')
if(!entry.includes('masterOnly')) fail('MASTER: proteção masterOnly ausente.')
if(!entry.includes('is_master') || !entry.includes('nivel_admin')) fail('MASTER: validação de nível/perfil ausente.')

console.log('FILES REQUIRED:',requiredFiles.length)
console.log('ROUTES CHECKED:',requiredRoutes.length)
console.log('FAILURES:',failures.length)
console.log('WARNINGS:',warnings.length)
for(const x of failures) console.log('[BLOCKER]',x)
for(const x of warnings) console.log('[WARNING]',x)
if(failures.length){console.log('RESULT: FAIL — corrigir bloqueadores antes do deploy.');process.exit(2)}
console.log('RESULT: PASS — auditoria estrutural brutal sem bloqueadores.')
