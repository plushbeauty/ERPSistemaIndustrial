import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')

const checks = [
  [!shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell não deve importar o modal legado de Qualidade Tablet.'],
  [!shell.includes('qualityTablet') && !shell.includes('Qualidade Tablet'), 'O menu não deve oferecer o módulo Qualidade Tablet.'],
  [/path="\\/qualidade\\/tablet" element={<Navigate to="\\/qualidade" replace \/>}/.test(routes), 'A rota legada deve redirecionar para a Central de Qualidade.'],
]

let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
