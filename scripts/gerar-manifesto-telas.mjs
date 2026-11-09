import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Gera o manifesto de aprovacao de TODAS as telas alcancaveis do sistema
 * (src/pages, src/features, src/modules). Ordem explicita do proprietario em 2026-11-03:
 * "todas as telas novas vao ter revisao, aprovacao e travamento para o vercel nao pegar mais
 * telas antigas".
 *
 * Cada entrada guarda o carimbo que a propria tela traz no cabecalho (@AUTOR, @REVISAO,
 * @DATA_REVISAO_APROVACAO, @STATUS_APROVACAO) e o hash do conteudo. O contrato
 * scripts/verify-official-screens-lock.mjs reprova o build quando uma tela aparece sem entrada,
 * quando o conteudo muda ou quando uma tela aprovada some.
 *
 * Re-aprovar nao e tacito: depois de uma ordem do proprietario, rode
 *   npm run telas:manifest
 * e commite o manifesto regenerado junto com a tela.
 */

const ROOT = process.cwd()
const TELAS = ['src/pages/', 'src/features/', 'src/modules/']
const SAIDA = 'scripts/telas-oficiais-manifest.json'

const resolve = (fromFile, spec) => {
  const base = path.resolve(ROOT, path.dirname(fromFile), spec.split('?')[0])
  for (const cand of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return null
}

const relOf = f => path.relative(ROOT, f).split(path.sep).join('/')
const textoDe = rel => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const shaDe = texto => createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(texto, 'utf8')}\0`, 'utf8')).update(Buffer.from(texto, 'utf8')).digest('hex')

const carimbos = texto => {
  const topo = texto.slice(0, 2000)
  const pega = rotulo => {
    const m = topo.match(new RegExp(`@${rotulo}:\\s*([^\\n*]+)`))
    return m ? m[1].trim() : null
  }
  return { autor: pega('AUTOR'), revisao: pega('REVISAO'), aprovadaEm: pega('DATA_REVISAO_APROVACAO'), statusAprovacao: pega('STATUS_APROVACAO') }
}

const arquivosSrc = []
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.tsx?$/.test(name)) arquivosSrc.push(relOf(full))
  }
}
walk(path.join(ROOT, 'src'))

const deps = new Map()
for (const rel of arquivosSrc) {
  for (const m of textoDe(rel).matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
    const alvo = resolve(path.join(ROOT, rel), m[1])
    if (!alvo) continue
    const chave = relOf(alvo)
    if (!deps.has(rel)) deps.set(rel, new Set())
    deps.get(rel).add(chave)
  }
}

const alcancaveis = new Set()
const fila = ['src/AppBootstrap.tsx', 'src/AppEntryV2.tsx']
while (fila.length) {
  const rel = fila.pop()
  if (alcancaveis.has(rel) || !arquivosSrc.includes(rel)) continue
  alcancaveis.add(rel)
  for (const t of deps.get(rel) || []) fila.push(t)
}

const oficiaisList = existsSync('scripts/verify-official-screens-lock.mjs')
  ? [...textoDe('scripts/verify-official-screens-lock.mjs').matchAll(/\{ path: '([^']+)', sha: '[0-9a-f]{40}', label: '/g)].map(m => m[1])
  : []

const alvos = [...new Set([...alcancaveis].filter(rel => TELAS.some(p => rel.startsWith(p))).concat(oficiaisList))].sort()

const telas = []
const semCarimbo = []
for (const rel of alvos) {
  if (!existsSync(path.join(ROOT, rel))) { console.error('[BLOCKER] tela do contrato nao existe no disco:', rel); process.exit(2) }
  const texto = textoDe(rel)
  const carimbo = carimbos(texto)
  if (!carimbo.autor || !carimbo.revisao || !carimbo.statusAprovacao) semCarimbo.push(rel)
  telas.push({ path: rel, sha: shaDe(texto), ...carimbo })
}

const manifesto = { contrato: 'SYNQRA-R-20261103-01', geradoPor: 'npm run telas:manifest', totalTelas: telas.length, telas }
writeFileSync(path.join(ROOT, SAIDA), JSON.stringify(manifesto, null, 2).replace(/\n/g, '\n') + '\n', 'utf8')

console.log(`MANIFESTO DE APROVACAO GERADO — ${telas.length} telas alcancaveis carimbadas em ${SAIDA}.`)
if (semCarimbo.length) {
  console.error(`ATTENCAO: ${semCarimbo.length} tela(s) sem @AUTOR/@REVISAO/@STATUS_APROVACAO no cabecalho:`)
  for (const rel of semCarimbo) console.error('- ' + rel)
  process.exit(1)
}
