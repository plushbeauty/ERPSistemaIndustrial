import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const lockPath = path.join(root, 'package-lock.json')

if (!fs.existsSync(pkgPath)) {
  console.error('[BLOCKER] package.json ausente.')
  process.exit(2)
}
if (!fs.existsSync(lockPath)) {
  console.error('[BLOCKER] DEPENDENCY LOCK INVALID — package-lock.json ausente.')
  process.exit(2)
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
const rootLock = lock.packages?.['']

if (lock.lockfileVersion !== 3) {
  console.error(`[BLOCKER] package-lock.json deve usar lockfileVersion 3; encontrado ${lock.lockfileVersion}.`)
  process.exit(2)
}
if (!rootLock || rootLock.name !== pkg.name || rootLock.version !== pkg.version) {
  console.error('[BLOCKER] package-lock.json não corresponde ao nome/versão do package.json.')
  process.exit(2)
}

const compareKeys = (label, expected = {}, actual = {}) => {
  const a = Object.keys(expected).sort()
  const b = Object.keys(actual).sort()
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.error(`[BLOCKER] package-lock.json diverge em ${label}.`)
    process.exit(2)
  }
}
compareKeys('dependencies', pkg.dependencies, rootLock.dependencies)
compareKeys('devDependencies', pkg.devDependencies, rootLock.devDependencies)

console.log('LOCKFILE GATE PASS — package-lock.json compatível com package.json.')
