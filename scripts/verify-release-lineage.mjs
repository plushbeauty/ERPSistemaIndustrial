import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * TRAVA DE LINHAGEM DA PUBLICACAO — ordem explicita do proprietario em 2026-11-03:
 * "todas as telas tinham que ter trava para o vercel nao pegar telas antigas".
 *
 * O contrato de hashes (verify-official-screens-lock) ja impede que uma tela nova seja EDITADA ou
 * SUBSTITUIDA por uma versao antiga dentro desta branch. Ele nao impede o que aconteceu de fato:
 * o Vercel construir uma ARVORE VELHA (branch cortada antes das telas novas) e publicar aquela
 * arvore em producao. Esta trava cobre esse buraco:
 *
 * 1. Toda publicacao precisa carregar o manifesto scripts/release-lineage.json e todos os arquivos
 *    que so existem na linhagem nova. Arvore sem essas telas => o build falha em vez de publicar
 *    sistema velho calado.
 * 2. Toda publicacao em producao precisa vir de uma branch listada em branchesDeProducaoPermitidas.
 * 3. A propria trava nao pode ser retirada do gate: o script exige estar dentro de verify:production.
 *
 * Hash do manifesto tambem e carimbado no bundle (vite.config.ts) para o selo da barra contar a
 * verdade sobre qual contrato gerou aquele deploy.
 */

const ROOT = process.cwd()
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8')
const Falha = []

let contrato
try {
  contrato = JSON.parse(read('scripts/release-lineage.json'))
} catch {
  console.error('[BLOCKER] scripts/release-lineage.json ausente ou ilegivel: esta arvore nao e a linhagem oficial do SYSNQRA.')
  process.exit(2)
}

if (typeof contrato.contrato !== 'string' || typeof contrato.branchOficial !== 'string' || !Array.isArray(contrato.obrigatorios)) {
  console.error('[BLOCKER] scripts/release-lineage.json esta com o contrato incompleto (campos obrigatorios ausentes).')
  process.exit(2)
}

for (const rel of contrato.obrigatorios) {
  if (!existsSync(path.join(ROOT, rel))) Falha.push(`tela/trava da linhagem nova ausente: ${rel}`)
}

const contagemTelas = existsSync(path.join(ROOT, 'src/pages'))
  ? readdirSync(path.join(ROOT, 'src/pages'), { recursive: true }).filter(name => /\.(tsx|jsx)$/.test(name)).length
  : 0
if (contagemTelas < contrato.minimoTelasEmPages) {
  Falha.push(`arvore antiga detectada: src/pages tem ${contagemTelas} telas, minimo da linhagem oficial e ${contrato.minimoTelasEmPages}`)
}

const pkg = JSON.parse(read('package.json'))
const gate = String(pkg.scripts?.['verify:production'] ?? '')
if (!gate.includes('verify:release-lineage')) Falha.push('a trava de linhagem foi retirada do gate npm run verify:production')

const branchVercel = String(process.env.VERCEL_GIT_COMMIT_REF ?? '').trim()
const ambienteVercel = String(process.env.VERCEL_ENV ?? '').trim()
if (ambienteVercel === 'production' && branchVercel && !contrato.branchesDeProducaoPermitidas.includes(branchVercel)) {
  Falha.push(`producao nao pode ser publicada da branch "${branchVercel}"; branches permitidas: ${contrato.branchesDeProducaoPermitidas.join(', ')}`)
}

const hashManifesto = createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(read('scripts/release-lineage.json'), 'utf8')}\0`, 'utf8')).update(read('scripts/release-lineage.json')).digest('hex')

if (Falha.length) {
  console.error('TRAVA DE LINHAGEM DA PUBLICACAO FALHOU — este build NAO e o sistema novo e nao pode ser publicado.')
  for (const f of Falha) console.error('- ' + f)
  console.error('Correcao: publicar a branch oficial (' + contrato.branchOficial + ') ou trazer as telas novas para a branch atual. Recriar tela antiga no lugar nao e correcao.')
  process.exit(2)
}

console.log(`TRAVA DE LINHAGEM PASS — contrato ${contrato.contrato}, ${contagemTelas} telas em src/pages, ${contrato.obrigatorios.length} arquivos obrigatorios presentes, manifesto ${hashManifesto.slice(0, 8)}.`)
