import { readFileSync } from 'node:fs'

const shell = readFileSync('src/components/layout/ERPHorizontalShell.tsx', 'utf8')
const catalog = readFileSync('src/help/contextualHelpCatalog.ts', 'utf8')
const center = readFileSync('src/pages/CentralAjuda.tsx', 'utf8')
const app = readFileSync('src/AppEntryV2.tsx', 'utf8')

const checks = [
  [shell.includes('resolveContextualHelp(pathname)'), 'A ajuda global deve resolver o conteúdo pela rota ativa.'],
  [shell.includes('aria-label="Ajuda contextual da tela"') && shell.includes('Campos e preenchimento') && shell.includes('Botões e ações'), 'O painel global deve explicar finalidade, passos, campos e ações.'],
  [shell.includes("navigate('/pageprincipal/ajuda')"), 'O atalho deve abrir a rota real da Central de Ajuda.'],
  [catalog.includes('export function resolveContextualHelp') && (catalog.match(/verified: true/g) ?? []).length >= 15, 'O catálogo deve conter pelo menos 15 orientações de rotas identificadas.'],
  [catalog.includes('verified: false') && catalog.includes('validação técnica'), 'Rotas sem conteúdo validado devem ser identificadas como pendentes, sem inventar instruções.'],
  [center.includes('contextualHelpRoutes') && center.includes('Pesquisar ajuda por tela ou assunto'), 'A Central de Ajuda deve pesquisar o catálogo de rotas.'],
  [app.includes('path="ajuda" element={<CentralAjuda />}'), 'A Central de Ajuda deve permanecer registrada no roteador principal.'],
]

const failures = checks.filter(([ok]) => !ok)
for (const [ok, message] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${message}`)
if (failures.length) process.exit(1)
console.log('Contextual help contract passed.')
