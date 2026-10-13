import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const read = (path) => readFileSync(join(root, path), 'utf8')
const entry = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const qualityStyles = read('src/styles/quality-workspace-standard.css')
const failures = []
const checks = [
  [entry.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'AppEntryV2 must import the single shared horizontal shell'],
  [(entry.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Authenticated routes must have exactly one shared shell wrapper'],
  [entry.includes('{protectedRoutes}') && entry.indexOf('if (!session)') >= 0 && entry.indexOf('if (!session)') < entry.indexOf('const appContent'), 'Public routes must return before the authenticated shell is rendered'],
  [entry.includes("location.pathname.startsWith('/pcp') && <ERPStatusLegend />"), 'The PCP status legend must remain limited to PCP routes'],
  [!shell.includes('position:relative;z-index:900'), 'The horizontal menu must not regress to a non-sticky position'],
  [shell.includes('position:sticky;top:0;z-index:1600'), 'The global header must remain sticky'],
  [shell.includes('height:50px;width:220px;min-width:220px'), 'Desktop logo must remain large and legible'],
  [shell.includes('width:168px;min-width:168px;height:42px'), 'Mobile logo must remain legible'],
  [shell.includes('width:220px;height:30px') && shell.includes('min-width:220px'), 'Desktop module search must retain the approved compact width'],
  [shell.includes('position:sticky;top:58px;z-index:1550'), 'Horizontal menu must remain sticky below the header'],
  [qualityStyles.includes('background: #123B50') && qualityStyles.includes('color: #f4fbfd') && qualityStyles.includes('#D65B61') && qualityStyles.includes('#3A9D78'), 'Quality color/status contrast tokens must remain protected'],
  [entry.includes("import './styles/quality-workspace-standard.css'"), 'Quality visual standard must remain globally loaded'],
]
for (const [passed, message] of checks) if (!passed) failures.push(message)

function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\\.tsx$/.test(entry.name) && full !== join(root, 'src/AppEntryV2.tsx') && full !== join(root, 'src/components/layout/ERPHorizontalShell.tsx')) {
      const source = readFileSync(full, 'utf8')
      if (/import\\s+ERPHorizontalShell\\s+from/.test(source) || /<\\/?ERPHorizontalShell(?:\\s|>)/.test(source)) failures.push('Nested horizontal shell detected in ' + full.replace(root + '/', ''))
    }
  }
}
walk(join(root, 'src'))

if (failures.length) {
  console.error('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT FAIL')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}
console.log('GLOBAL HORIZONTAL SHELL REGRESSION CONTRACT PASS — single shell, sticky menu, readable logo, compact search and Quality colors protected.')
