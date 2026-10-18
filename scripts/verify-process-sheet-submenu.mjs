import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const menu = readFileSync('src/components/PCPTabletMenuModal.tsx', 'utf8')
const routes = readFileSync('src/AppEntryV2.tsx', 'utf8')
const engineering = readFileSync('src/pages/FichaEngenharia.tsx', 'utf8')

const approvedItems = [
  { label: 'FICHAS DE PROCESSO', route: '/pcp/fichas-processo' },
  { label: 'PRENSADOS', route: '/ficha-engenharia?tipo=PRENSADOS' },
  { label: 'INJETADOS', route: '/ficha-engenharia?tipo=INJETADOS' },
  { label: 'ACABAMENTO', route: '/ficha-engenharia?tipo=ACABAMENTO' },
  { label: 'MONTAGEM', route: '/ficha-engenharia?tipo=MONTAGEM_EMBALAGEM' },
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
  assert.ok(engineering.includes(`id:'${kind}'`), `FichaEngenharia no longer supports approved process type ${kind}`)
}
process.stdout.write('PASS — submenu aprovado de Fichas de Processo, cinco destinos e rotas/tipos de engenharia verificados.\\n')
