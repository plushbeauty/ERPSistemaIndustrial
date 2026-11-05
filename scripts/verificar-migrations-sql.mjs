/**
 * Trava de sintaxe das migrations: corpo de funcao em Postgres abre e fecha com o
 * MESMO delimitador dollar-quoted ($$, $fn$, $mig$...). Um arquivo com quantidade
 * impar de marcadores nunca executa — o Postgres devolve "unterminated dollar-quoted
 * string" e a migration inteira nao aplica, nem as tabelas que ela cria.
 *
 * Foi assim que erp_engenharia_bom ficou ausente do banco: a migration existia no repo
 * mas tinha 'as $$' aberto e '$;' fechado (20261021180000_engenharia_bom_mestre.sql).
 *
 * Uso: npm run verify:migrations-sql
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PASTA = path.join(ROOT, 'supabase', 'migrations')

if (!fs.existsSync(PASTA)) {
  console.error('[BLOCKER] pasta de migrations nao existe: ' + PASTA)
  process.exit(2)
}

const nomes = fs.readdirSync(PASTA).filter((f) => f.endsWith('.sql')).sort()
const ruins = []

for (const nome of nomes) {
  const texto = fs.readFileSync(path.join(PASTA, nome), 'utf8')
  const marcadores = [...texto.matchAll(/\$\w*\$/g)]
  if (marcadores.length % 2 === 1) {
    const ultimo = marcadores[marcadores.length - 1]
    const linha = 1 + texto.slice(0, (ultimo?.index ?? 0)).split('\n').length
    ruins.push(`${nome}: ${marcadores.length} marcadores (impar) — ultimo em torno da linha ${linha}. Um 'as $$' ficou sem fechamento com $$.`)
    continue
  }
  const funcoes = (texto.match(/create\s+(?:or\s+replace\s+)?function/gi) ?? []).length
  const aberturas = marcadores.length / 2
  if (funcoes > aberturas) {
    ruins.push(`${nome}: ${funcoes} create function para ${aberturas} corpo(s) dollar-quoted — falta delimitador em alguma funcao.`)
  }
}

if (ruins.length) {
  for (const r of ruins) console.error('[BLOCKER] ' + r)
  console.error(`MIGRATIONS_INVALIDAS=${ruins.length}: o banco nao vai criar o que essas telas precisam. Conserte o delimitador antes de colar.`)
  process.exit(2)
}

console.log(`MIGRATIONS SQL OK — ${nomes.length} arquivos, todos com dollar-quote balanceado.`)
