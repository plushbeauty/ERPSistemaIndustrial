import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const menu = readFileSync('src/components/PCPTabletMenuModal.tsx', 'utf8')
const routes = readFileSync('src/AppEntryV2.tsx', 'utf8')
const processSheets = readFileSync('src/pages/PCPFichasProcesso.tsx', 'utf8')
const migration = readFileSync('supabase/migrations/20261017140000_pcp_fichas_acabamento_embalagem.sql', 'utf8')
const aiPage = readFileSync('src/pages/PCPFichasProcessoIA.tsx', 'utf8')
const aiFunction = readFileSync('supabase/functions/erp-ai-process-sheet/index.ts', 'utf8')

const approvedItems = [
  { label: 'FICHAS DE PROCESSO', route: '/pcp/fichas-processo' },
  { label: 'PRENSADOS', route: '/pcp/fichas-processo?tipo=PRENSADOS' },
  { label: 'INJETADOS', route: '/pcp/fichas-processo?tipo=INJETADOS' },
  { label: 'ACABAMENTO', route: '/pcp/fichas-processo?tipo=ACABAMENTO' },
  { label: 'MONTAGEM', route: '/pcp/fichas-processo?tipo=MONTAGEM_EMBALAGEM' },
]

assert.match(menu, /APROVADO — submenu de Fichas de Processo/)
assert.match(menu, /if \(!processSheetsOpen && module\.number === 'P09'\) setProcessSheetsOpen\(true\)/, 'P09 must open its submenu instead of navigating directly')
for (const item of approvedItems) {
  assert.ok(menu.includes(`label: '${item.label}'`), `Missing approved submenu item: ${item.label}`)
  assert.ok(menu.includes(`route: '${item.route}'`), `Incorrect or missing destination for: ${item.label}`)
}
assert.match(routes, /<Route path="\/pcp\/fichas-processo"[^\n]*PCPFichasProcesso/)
assert.match(routes, /<Route path="\/ficha-engenharia"[^\n]*FichaEngenharia/)
for (const kind of ['PRENSADOS', 'INJETADOS', 'ACABAMENTO', 'MONTAGEM_EMBALAGEM']) {
  assert.ok(processSheets.includes(`'${kind}'`), `Canonical process sheet no longer supports approved type ${kind}`)
}
assert.match(processSheets, /category === 'ACABAMENTO' \? finishing/)
assert.match(processSheets, /category === 'MONTAGEM_EMBALAGEM' \? packaging/)
assert.match(migration, /'ACABAMENTO'[\s\S]*'MONTAGEM_EMBALAGEM'/, 'Database constraint must allow both approved process categories')
assert.match(routes, /<Route path="\/pcp\/fichas-processo\/ia"[^\n]*PCPFichasProcessoIA/)
assert.match(aiPage, /supabase\.functions\.invoke\('erp-ai-process-sheet'/)
assert.match(aiFunction, /client\.auth\.getUser\(\)/, 'AI function must validate the authenticated user')
assert.match(aiFunction, /erp_current_empresa_id/, 'AI function must require the active company context')
assert.ok(!aiFunction.includes('service_role'), 'AI function must not use a service-role key in client-facing logic')
process.stdout.write('PASS — submenu aprovado de Fichas de Processo, cinco destinos e rotas/tipos de engenharia verificados.\n')
