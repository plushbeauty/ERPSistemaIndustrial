import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const supported = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.webmanifest'])
const roots = [join(root, 'src'), join(root, 'index.html'), join(root, 'public', 'manifest.webmanifest')]
const problems = []
const brokenReference = '/logo/sgq-erp.png'

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
        if (readFileSync(child, 'utf8').includes(brokenReference)) problems.push(`Broken logo reference in ${child}`)
      }
    }
  } catch {
    if (supported.has(extname(path).toLowerCase())) {
      if (readFileSync(path, 'utf8').includes(brokenReference)) problems.push(`Broken logo reference in ${path}`)
    } else {
      problems.push(`Could not scan required path: ${path}`)
    }
  }
}

for (const path of roots) scan(path)
for (const asset of ['public/logo/logo.png', 'public/logo-industrial.svg']) {
  if (!existsSync(join(root, asset))) problems.push(`Required brand asset missing: ${asset}`)
}

if (problems.length) {
  console.error('Logo asset contract failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('Logo asset contract passed.')
