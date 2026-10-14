import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const home = readFileSync(join(root, 'src/PublicIndustrialHome.tsx'), 'utf8')
const failures = []
const hero = home.match(/<section id="inicio" className="sgq-hero">([\s\S]*?)<\/section>/)?.[1] ?? ''
const style = home.match(/<style>\{\`([\s\S]*?)\`\}<\/style>/)?.[1] ?? ''
const checks = [
  [home.includes('@STATUS: APPROVED_DESIGN_LOCKED_BY_REGRESSION_TEST'), 'A tela inicial precisa declarar explicitamente o estado de design aprovado.'],
  [hero.includes('SYSNQRA ERP & SGQ INDUSTRIAL · MULTISSEGMENTO'), 'O texto oficial da marca não pode ser alterado sem atualizar a aprovação.'],
  [hero.includes('PCP → PRODUÇÃO → QUALIDADE → ESTOQUE'), 'A sequência oficial PCP → PRODUÇÃO → QUALIDADE → ESTOQUE precisa permanecer.'],
  [hero.includes('Uma visão completa da sua operação industrial.'), 'O título aprovado da página inicial precisa permanecer.'],
  [style.includes('.sgq-hero{') && /\.sgq-hero\{[^}]*background:#fff/.test(style), 'O fundo principal da área inicial deve continuar branco.'],
  [/\.sgq-hero\{[^}]*justify-content:flex-start/.test(style), 'O conteúdo principal deve ficar alinhado à esquerda.'],
  [/\.sgq-hero-inner\{[^}]*text-align:left/.test(style), 'O texto da área inicial deve continuar alinhado à esquerda.'],
  [/\.sgq-hero-background\{[^}]*inset:0/.test(style) && /\.sgq-hero-background img\{[^}]*width:100%;height:100%/.test(style) && /\.sgq-hero-background img\.active\{opacity:\.24\}/.test(style), 'A imagem de fundo deve ocupar toda a área como marca-d’água discreta.'],
  [!hero.includes('className="sgq-actions"'), 'Os botões centrais removidos não podem voltar à área inicial.'],
]
for (const [passed, message] of checks) if (!passed) failures.push(message)
if (failures.length) {
  console.error('APPROVED HOMEPAGE REGRESSION LOCK FAILED:')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('APPROVED HOMEPAGE REGRESSION LOCK PASS')
