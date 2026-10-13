import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const supported = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest'])
const roots = [join(root, 'src'), join(root, 'index.html'), join(root, 'public', 'manifest.webmanifest')]
const problems = []
const forbiddenReferences = ['/logo/sgq-erp.png', '/logo-industrial.svg']

function scan(path) {
  if (!existsSync(path)) {
    problems.push(`Required path missing: ${path}`)
    return
  }
  try {
    const entries = readdirSync(path, { withFileTypes: true })
    for (const entry of entries) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) scan(child)
      else if (supported.has(extname(entry.name).toLowerCase())) {
        const source = readFileSync(child, 'utf8')
        for (const reference of forbiddenReferences) {
          if (source.includes(reference)) problems.push(`Unused or broken logo reference ${reference} in ${child}`)
        }
      }
    }
  } catch {
    if (supported.has(extname(path).toLowerCase())) {
      const source = readFileSync(path, 'utf8')
      for (const reference of forbiddenReferences) {
        if (source.includes(reference)) problems.push(`Unused or broken logo reference ${reference} in ${path}`)
      }
    } else {
      problems.push(`Could not scan required path: ${path}`)
    }
  }
}

for (const path of roots) scan(path)
for (const asset of ['public/logo/logo.png']) {
  if (!existsSync(join(root, asset))) problems.push(`Required brand asset missing: ${asset}`)
}

if (problems.length) {
  console.error('Logo asset contract failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('Logo asset contract passed.')
