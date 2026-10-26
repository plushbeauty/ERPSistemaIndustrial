import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shell = read('../src/components/layout/ERPHorizontalShell.tsx')
const routes = read('../src/AppEntryV2.tsx')

const checks = [
  [!shell.includes("import TabletMenuModal from '../TabletMenuModal'"), 'O shell não deve importar o modal legado de Qualidade Tablet.'],
  [!shell.includes('qualityTablet') && !shell.includes('Qualidade Tablet'), 'O menu global não deve oferecer o módulo Qualidade Tablet.'],
  [routes.includes('path="/qualidade/tablet" element={<Navigate to="/qualidade/inspecoes" replace />} />'), 'A rota legada do tablet deve abrir diretamente Inspeções no menu SGQ.'],
  [routes.includes('path="/qualidade/paquimetro-digital" element={<QualityPlanGate><QualidadeInstrumentosCadastro /></QualityPlanGate>} />'), 'A rota do Paquímetro Digital deve estar registrada.'],
  [routes.includes('path="/qualidade" element={<Navigate to="/qualidade/inspecoes" replace />} />'), 'A rota /qualidade não deve voltar ao painel antigo.'],
  [shell.includes("label: 'Paquímetro Digital / Metrologia', route: '/qualidade/paquimetro-digital', icon: Ruler"), 'O menu global deve exibir o ícone de Paquímetro Digital.'],
]

let failed = false
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
