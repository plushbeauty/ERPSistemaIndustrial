import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * CONTRATO DO CARROSSEL DA HOME PUBLICA — ordem explicita do proprietario em 2026-11-05:
 * "mandei trocar as imagens do fundo com aquelas imagens que mandei para vc" e "vc nao criou travas
 * para nao deixar telas antigas voltar".
 * 1. As cinco artes enviadas por ele sao a unica fonte do carrossel: cada arquivo existe, esta
 *    travado por hash e esta registrado no hero. Trocar uma arte por outra imagem reprova o build.
 * 2. As fotos geradas por maquina (public/images/cena-*.webp) estao banidas: o arquivo nao pode
 *    voltar a existir e nenhum codigo pode apontar para elas.
 * 3. A moldura de navegador com a replica DOM (ph-shot-bar), o scrim por cima da arte, o bloco de
 *    texto do slide e as setas laterais estao banidos do HeroCarousel — era a tela antiga que ele
 *    mandou tirar.
 * Revisao exige ordem do proprietario; os hashes sao recalculados junto com a ordem.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const shaBlob = rel => {
  const content = Buffer.from(readFileSync(path.join(ROOT, rel)))
  return createHash('sha1').update(Buffer.from(`blob ${content.byteLength}\0`, 'utf8')).update(content).digest('hex')
}

const DIRETORIO_ARTES = 'public/images/carrossel'

const artes = [
  { arquivo: 'pcp-chao-de-fabrica.png', sha: 'cecb64ab6e1327857d51a79e61cff757dd5a5e30', titulo: 'PCP e Chão de Fábrica' },
  { arquivo: 'qualidade-sgq.png', sha: '64e281f65afd64e887c39fb3d81c04d2c214962c', titulo: 'Qualidade e SGQ' },
  { arquivo: 'estoque-compras-vendas.png', sha: 'fbf8cb7529e5e044bfd2ee3e50d61519935381bd', titulo: 'Estoque, Compras e Vendas' },
  { arquivo: 'rh-manutencao-gestao.png', sha: 'cf8825700d14b8b1bf138fd3a71d1509909a46d3', titulo: 'RH, Manutenção e Gestão' },
  { arquivo: 'planos.png', sha: 'ba22023757282c16411d390139d5dfc9f693cd5c', titulo: 'Planos de Funcionamento' },
]

const cenasBanidas = [
  'cena-celula-injecao.webp',
  'cena-pcp.webp',
  'cena-qualidade.webp',
  'cena-almoxarifado.webp',
  'cena-chao-de-fabrica.webp',
]

const HOME = 'src/PublicIndustrialHome.tsx'
const falhas = []

if (!existsSync(path.join(ROOT, DIRETORIO_ARTES))) {
  falhas.push(`diretorio de artes ausente: ${DIRETORIO_ARTES}`)
} else {
  const nomes = readdirSync(path.join(ROOT, DIRETORIO_ARTES)).sort()
  const esperados = artes.map(a => a.arquivo).sort()
  if (nomes.join() !== esperados.join()) {
    falhas.push(`artes do carrossel fora do contrato: esperado ${esperados.join(', ')} / encontrado ${nomes.join(', ')}`)
  }
}

const home = existsSync(path.join(ROOT, HOME)) ? read(HOME) : ''
if (!home) falhas.push(`tela publica ausente: ${HOME}`)

for (const arte of artes) {
  const rel = `${DIRETORIO_ARTES}/${arte.arquivo}`
  if (!existsSync(path.join(ROOT, rel))) { falhas.push(`arte enviada pelo proprietario nao existe: ${rel} (${arte.titulo})`); continue }
  const sha = shaBlob(rel)
  if (sha !== arte.sha) falhas.push(`arte do carrossel trocada sem ordem: ${rel} (${arte.titulo}) esperado=${arte.sha} encontrado=${sha}`)
  if (!home.includes(`/images/carrossel/${arte.arquivo}`)) falhas.push(`o carrossel nao registra a arte ${arte.arquivo} (${arte.titulo})`)
}

for (const cena of cenasBanidas) {
  if (existsSync(path.join(ROOT, `public/images/${cena}`))) falhas.push(`foto gerada por maquina voltou ao sistema: public/images/${cena}`)
  if (home.includes(`/${cena}`)) falhas.push(`o carrossel aponta de volta para a foto gerada ${cena}`)
}

const inicioHero = home.indexOf('function HeroCarousel()')
if (inicioHero < 0) {
  falhas.push('o carrossel da home nao existe mais em PublicIndustrialHome.tsx')
} else {
  const corpo = home.slice(inicioHero, home.indexOf('\n}', inicioHero))
  for (const marca of ['ph-shot-bar', 'ph-carousel-scrim', 'ph-slide-copy', 'ChevronLeft', 'ChevronRight', 'Teste grátis', 'ph-cta-row']) {
    if (corpo.includes(marca)) falhas.push(`tela antiga do carrossel voltou para dentro do slide: ${marca}`)
  }
  if (!corpo.includes('INTERVALO_SLIDE_MS')) falhas.push('o carrossel perdeu a rotacao automatica')
}

if (falhas.length) {
  for (const f of [...new Set(falhas)]) console.error('[BLOCKER]', f)
  process.exit(2)
}

console.log(`CONTRATO DO CARROSSEL PASS — ${artes.length} artes do proprietario travadas por hash, ${cenasBanidas.length} fotos geradas banidas, hero sem a moldura antiga.`)
