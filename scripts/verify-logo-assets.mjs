import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * TRAVA DA MARCA SYSNQRA (ordem do proprietario em 2026-11-03: "esse e o novo logo do sistema
 * para voce trocar ele de todas as pages ... criar travas para nao deixar voltar telas antigas").
 * 1. Os dois ativos oficiais sao travados por SHA-256: trocar o logo por outro arquivo reprova o CI.
 * 2. Nenhuma pagina pode apontar para um terceiro arquivo de logo: somente /logo/logo.png (lockup
 *    horizontal) e /logo/logo-marca.png (marca quadrada de favicon, boot, PWA e slots pequenos).
 * 3. Os logotipos antigos do sistema continuam banidos.
 * Revisao deste contrato exige ordem explicita do proprietario.
 */
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const supported = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest'])
const roots = [join(root, 'src'), join(root, 'index.html'), join(root, 'public', 'manifest.webmanifest')]
const problems = []
const forbiddenReferences = ['/logo/sgq-erp.png', '/logo-industrial.svg']

const approvedAssets = [
  { path: 'public/logo/logo.png', sha256: '64a71b7529b381730446701ce9e6be804423147ec8586429ab8ab345409adda3', label: 'lockup horizontal SYSNQRA ERP & SGQ INDUSTRIAL' },
  { path: 'public/logo/logo-marca.png', sha256: 'f28b76643e9d494864ad534de66881b6d91f35cbe8fb9c07aeb275f467ff6715', label: 'marca quadrada (favicon, boot, PWA e slots pequenos)' },
]
const approvedLogoRefs = new Set(['/logo/logo.png', '/logo/logo-marca.png'])

// Slots quadrados (menos de 80px de largura) esmagam o lockup horizontal. Cada um deles e travado
// aqui: reescrever o src para /logo/logo.png reprova o CI. O cartao de cadastro fica fora desta
// lista porque o CSS efetivo dele e width:180px/height:auto (company-signup.css), ou seja, slot largo.
const squareSlots = [
  { file: 'src/IndustrialLoginDirect.tsx', anchor: 'auth-brand-logo' },
  { file: 'src/PublicIndustrialHome.tsx', anchor: 'ph-brand-mark' },
  { file: 'src/PublicIndustrialHome.tsx', anchor: 'ph-footer-brand' },
  { file: 'src/pages/PlanosIndustrial.tsx', anchor: 'ph-footer-brand' },
  { file: 'src/pages/ComprasIndustrial.tsx', anchor: '"buy-brand"><img' },
]
const SQUARE_SLOT_WINDOW = 260

function checkSquareSlots(file, relative) {
  const slots = squareSlots.filter(slot => slot.file === relative)
  if (!slots.length) return
  const text = readFileSync(file, 'utf8')
  for (const slot of slots) {
    let index = text.indexOf(slot.anchor)
    if (index === -1) {
      problems.push(`Slot quadrado da marca sumiu de ${relative}: ${slot.anchor}`)
      continue
    }
    while (index !== -1) {
      const window = text.slice(index, index + SQUARE_SLOT_WINDOW)
      if (!window.includes('/logo/logo-marca.png'))
        problems.push(`Slot quadrado ${slot.anchor} em ${relative} deve usar a marca /logo/logo-marca.png (o lockup horizontal fica esmagado)`)
      index = text.indexOf(slot.anchor, index + slot.anchor.length)
    }
  }
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function checkFile(file) {
  const source = readFileSync(file, 'utf8')
  const relative = file.slice(root.length + 1).split('\\').join('/')
  checkSquareSlots(file, relative)
  for (const reference of forbiddenReferences) {
    if (source.includes(reference)) problems.push(`Unused or broken logo reference ${reference} in ${relative}`)
  }
  for (const [ref] of source.matchAll(/\/logo\/[A-Za-z0-9._-]+/g)) {
    if (!approvedLogoRefs.has(ref)) problems.push(`Referencia a logo fora da marca oficial: ${ref} em ${relative}`)
  }
}

function scan(path) {
  if (!existsSync(path)) {
    problems.push(`Required path missing: ${path}`)
    return
  }
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) scan(child)
      else if (supported.has(extname(entry.name).toLowerCase())) checkFile(child)
    }
    return
  }
  if (supported.has(extname(path).toLowerCase())) checkFile(path)
  else problems.push(`Could not scan required path: ${path}`)
}

for (const path of roots) scan(path)

for (const asset of approvedAssets) {
  const file = join(root, asset.path)
  if (!existsSync(file)) {
    problems.push(`Required brand asset missing: ${asset.path} (${asset.label})`)
    continue
  }
  const found = sha256(file)
  if (found !== asset.sha256) problems.push(`Brand asset substituido sem ordem do proprietario: ${asset.path} esperado=${asset.sha256} encontrado=${found}`)
}

for (const squareSlot of ['index.html', 'public/manifest.webmanifest']) {
  const source = readFileSync(join(root, squareSlot), 'utf8')
  if (!source.includes('/logo/logo-marca.png')) problems.push(`${squareSlot} deve usar a marca quadrada /logo/logo-marca.png nos slots quadrados`)
  if (source.includes('/logo/logo.png"') || source.includes('/logo/logo.png\'')) problems.push(`${squareSlot} nao deve usar o lockup horizontal em slot quadrado`)
}

if (problems.length) {
  console.error('Logo asset contract failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log(`Logo asset contract passed — ${approvedAssets.length} ativos travados por SHA-256 e nenhuma referencia fora da marca oficial.`)
