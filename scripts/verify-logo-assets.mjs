import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const supported = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest'])
const scanRoots = [join(root, 'src'), join(root, 'index.html'), join(root, 'public', 'manifest.webmanifest')]
const brokenReference = '/logo/sgq-erp.png'
const problems = []

function scan(path) {
  if (!existsSync(path)) {
    problems.push(`Required path missing: ${path}`)
    return
  }
  const entries = [path]
  for (let i = 0; i < entries.length; i += 1) {
    const current = entries[i]
    const stat = readdirSync
    try {
      const names = stat(current, { withFileTypes: true })
      for (const entry of names) {
        const child = join(current, entry.name)
        if (entry.isDirectory()) entries.push(child)
        else if (supported.has(extname(entry.name).toLowerCase())) {
          const source = readFileSync(child, 'utf8')
          if (source.includes(brokenReference)) problems.push(`Broken logo reference in ${child}`)
        }
      }
    } catch {
      if (supported.has(extname(current).toLowerCase())) {
        const source = readFileSync(current, 'utf8')
        if (source.includes(brokenReference)) problems.push(`Broken logo reference in ${current}`)
      }
    }
  }
}

for (const path of scanRoots) scan(path)
if (!existsSync(join(root, 'public', 'logo', 'logo.png'))) problems.push('Expected logo asset public/logo/logo.png is missing')

if (problems.length) {
  console.error('Logo asset contract failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('Logo asset contract passed.')
