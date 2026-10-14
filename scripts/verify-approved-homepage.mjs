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
  [/\.sgq-hero\{[^}]*background:#fff/.test(style), 'O fundo da área inicial deve continuar branco.'],
  [/\.sgq-hero-inner\{[^}]*grid-template-columns:minmax\(0,1\.25fr\) minmax\(0,\.75fr\)/.test(style), 'A área inicial deve manter imagem à esquerda e texto à direita, com a proporção visual aprovada.'],
  [hero.includes('className="sgq-stage"') && hero.includes('className="sgq-stage-media"') && hero.includes('src={v.src}'), 'As imagens originais precisam continuar visíveis no painel esquerdo, sem serem transformadas em marca-d’água.'],
  [!hero.includes('sgq-hero-background') && !style.includes('.sgq-hero-background'), 'A imagem não pode voltar a ser usada como marca-d’água de fundo.'],
  [/\.sgq-hero h1\{font-size:clamp\(24px,2\.5vw,34px\)/.test(style) && /\.sgq-hero h1\{font-size:27px\}/.test(style), 'O título deve permanecer reduzido em desktop e mobile.'],
  [!hero.includes('className="sgq-actions"'), 'Os botões centrais removidos não podem voltar à área inicial.'],
]
for (const [passed, message] of checks) if (!passed) failures.push(message)
if (failures.length) {
  console.error('APPROVED HOMEPAGE REGRESSION LOCK FAILED:')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('APPROVED HOMEPAGE REGRESSION LOCK PASS')
