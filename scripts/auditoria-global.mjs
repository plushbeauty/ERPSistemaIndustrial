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
const workspacePath=path.join(ROOT,'src','pages','IndustrialDataWorkspace.tsx')
const workspace=read(workspacePath)
if(!workspace) add('BLOCKER',workspacePath,1,'Workspace industrial ausente; verificar rotas genéricas antes do release.')
for(const [pattern,message] of [
  [/supabase\.rpc\('erp_current_empresa_id'\)/,'Workspace industrial não resolve a empresa pelo helper canônico.'],
  [/\.eq\('empresa_id',\s*activeEmpresaId\)/,'Workspace industrial consulta dados sem filtro explícito de tenant.'],
  [/\.update\(payload\)[\s\S]*\.eq\('id',\s*editing\)[\s\S]*\.eq\('empresa_id',\s*empresaId\)/,'Workspace industrial permite edição sem restringir o registro à empresa ativa.'],
  [/\.insert\(\{\.\.\.payload,\s*empresa_id:\s*empresaId\}\)/,'Workspace industrial não associa novas linhas à empresa ativa.'],
]) if(!pattern.test(workspace)) add('BLOCKER',workspacePath,1,message)
if(!workspace.includes("fetchAllPages<Record<string, unknown>>") || !workspace.includes(".range(from, to)") || workspace.includes(".limit(500)")) {
  add('BLOCKER',workspacePath,1,'Workspace industrial deve paginar todos os registros com range determinístico, sem truncar em 500.')
}
if(!/function requiredForField\(field: Field\): boolean[\s\S]*endereco_origem_id[\s\S]*endereco_destino_id/.test(workspace)
  || !/Number\(raw\) <= 0/.test(workspace)) {
  add('BLOCKER',workspacePath,1,'Movimentação WMS não valida endereços obrigatórios por tipo e quantidade positiva.')
}
const masterBootstrapPath=path.join(ROOT,'supabase','functions','erp-master-bootstrap','index.ts')
const masterBootstrap=read(masterBootstrapPath)
if(!masterBootstrap) add('BLOCKER',masterBootstrapPath,1,'Edge Function de bootstrap Master ausente.')
if(!/from\(["']usuarios["']\)[\s\S]*nivel_admin\.gte\.100[\s\S]*perfil\.in\.\(MASTER,MASTER_ADMIN,SUPER_ADMIN\)/.test(masterBootstrap)
  || !/const masterExists = Boolean\([\s\S]*legacyMasters/.test(masterBootstrap)
  || !/available: !masterExists/.test(masterBootstrap)
  || !/if \(masterExists\)[\s\S]*MASTER_ALREADY_EXISTS/.test(masterBootstrap)) {
  add('BLOCKER',masterBootstrapPath,1,'Bootstrap Master deve impedir duplicação também contra o cadastro legado de usuários.')
}
const migrationNames=migrationFiles.map(f=>path.basename(f).toLowerCase())
const duplicateNames=migrationNames.filter((v,i,a)=>a.indexOf(v)!==i)
for(const name of [...new Set(duplicateNames)]) add('HIGH',ROOT,1,`Migration duplicada: ${name}`)

// Legacy version collisions already present on main are allowlisted by exact filename pair.
// Do not rename these without reconciling supabase_migrations.schema_migrations first.
const legacyDuplicateMigrationVersions = new Map([
  ['20260923190000', ['20260923190000_pcp_programacao_finita_v2.sql', '20260923190000_plastibor_inventory_docs_purge_v1.sql']],
  ['20260927160000', ['20260927160000_erp_calibracao_atomic_registration_v1.sql', '20260927160000_erp_recebimento_lotes_certificado_v1.sql']],
  ['20261003190000', ['20261003190000_banking_finance_treasury_reconciliation.sql', '20261003190000_lista_precos_cliente.sql']],
  ['20261003193000', ['20261003193000_retificacao_pedido_faturado_controladoria.sql', '20261003193000_vendas_margem_industrial_item.sql']],
  ['20261005170000', ['20261005170000_fix_expedicao_logistica_schema.sql', '20261005170000_pdv_atomic_checkout.sql']],
  ['20261005190000', ['20261005190000_erp_compras_approval_fiscal_workflow.sql', '20261005190000_erp_stock_separation_atomic_rbac.sql']],
  ['20261005210000', ['20261005210000_erp_compras_comercial_rfq_complementos.sql', '20261005210000_erp_process_history_rbac.sql']],
  ['20261005223000', ['20261005223000_erp_injecao_history_rbac.sql', '20261005223000_vendas_vendedor_comissao_integracao.sql']],
  ['20261009180000', ['20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql', '20261009180000_pcp_agenda_reordenar_intervalos.sql']],
  ['20261009190000', ['20261009190000_add_industrial_movements_cep_nfe_and_op_costs.sql', '20261009190000_pcp_vinculo_op_pedido_venda.sql']],
  ['20261009200000', ['20261009200000_pcp_mrp_capacity_atomic.sql', '20261009200000_post_incoming_nfe_and_recalculate_costs.sql']],
  ['20261010120000', ['20261010120000_pcp_fichas_processo_tecnicas.sql', '20261010120000_sgq_ged_revision_lifecycle.sql']],
  ['20261011150000', ['20261011150000_erp_ged_revision_attachment_upload.sql', '20261011150000_sgq_auditoria_5s_tenant_v1.sql']],
])
const migrationGroups = new Map()
for (const name of migrationNames) {
  const version = name.split('_')[0]
  const names = migrationGroups.get(version) ?? []
  names.push(name)
  migrationGroups.set(version, names)
}
for (const [version, names] of migrationGroups) {
  if (names.length < 2) continue
  const expected = legacyDuplicateMigrationVersions.get(version)
  const actual = [...names].sort()
  if (!expected || [...expected].sort().join('|') !== actual.join('|')) {
    add('BLOCKER',ROOT,1,`Colisão nova de versão de migration ${version}: ${actual.join(', ')}. Corrigir antes do release.`)
  }
}

const counts=findings.reduce((a,f)=>{a[f.level]=(a[f.level]||0)+1;return a},{})
console.log(`GLOBAL AUDIT | files=${files.length} source=${sourceFiles.length}`)
console.log(`FINDINGS | ${Object.entries(counts).map(([k,v])=>`${k}=${v}`).join(' ')||'NONE'}`)
for(const f of findings) console.log(`[${f.level}] ${f.file}:${f.line} — ${f.message}`)
if(findings.some(f=>f.level==='BLOCKER')) process.exit(2)
process.exit(0)
