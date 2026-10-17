import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const appPath = fileURLToPath(new URL('../src/AppEntryV2.tsx', import.meta.url))
const source = readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n')
const layoutPath = fileURLToPath(new URL('../src/pages/VendasLayout.tsx', import.meta.url))
const vendasLayout = readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n')
const checks = [
  [source.includes("import ERPHorizontalShell from './components/layout/ERPHorizontalShell'"), 'Shared horizontal shell import must remain'],
  [source.includes('<ERPHorizontalShell>\n            {protectedRoutes}'), 'Authenticated routes must be wrapped in the shared horizontal shell'],
  [!source.includes('<ERPHorizontalShell><SynqraLayoutProvider><PCPIndustrial />'), 'The PCP route must not mount a duplicate nested shell'],
  [source.indexOf('if (!session)') >= 0 && source.indexOf('if (!session)') < source.indexOf('const appContent'), 'Public routes must return before the authenticated shell is rendered'],
  [source.includes("location.pathname.startsWith('/pcp/agenda-maquinas') && <ERPStatusLegend />"), 'The PCP status legend must be preserved'],
  [!vendasLayout.includes("import ERPHorizontalShell") && !vendasLayout.includes('<ERPHorizontalShell>'), 'VendasLayout must not create a nested horizontal shell'],
  [(source.match(/<ERPHorizontalShell>/g) ?? []).length === 1, 'Exactly one shared shell must wrap authenticated routes'],
]
const failures = checks.filter(([passed]) => !passed).map(([, message]) => message)
if (failures.length) {
  console.error('Global horizontal shell contract failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Global horizontal shell contract passed.')
