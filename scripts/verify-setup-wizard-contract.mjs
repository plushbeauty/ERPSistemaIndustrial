import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const app = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const screen = read('src/pages/SetupWizardScreen.tsx')
const migration = read('supabase/migrations/20261029180000_erp_setup_configuracao_v1.sql')
const checks = [
  ['Wizard lazy-loaded and routed inside the authenticated workspace', app.includes("lazy(() => import('./pages/SetupWizardScreen'))") && app.includes('path="configuracao-inicial"')],
  ['Wizard discoverable in the industrial navigation', shell.includes("label: 'Setup Wizard'") && shell.includes("route: '/pageprincipal/configuracao-inicial'")],
  ['Uses the existing Supabase client and real session', screen.includes("from '../lib/supabaseClient'") && screen.includes('supabase.auth.getUser()') && screen.includes("rpc('erp_current_empresa_id')")],
  ['Persists preferences by tenant and does not redirect on failed save', screen.includes("from('erp_setup_configuracao').upsert") && screen.includes('catch (cause)') && !screen.includes('finally { window.location')],
  ['Does not create fictional user/company identities or silently activate modules', !/Fernando Sousa|fernandosch2026@gmail.com|empresa_nome:\s*['"]FFD['"]/.test(screen) && screen.includes('não ativa permissões') && screen.includes('não cria cadastros industriais automaticamente')],
  ['Migration enables tenant RLS and restricts setup changes to active administrators', migration.includes('enable row level security') && migration.includes('erp_current_empresa_id()') && migration.includes('erp_can_manage_setup()') && migration.includes("upper(coalesce(u.perfil, '')) in ('ADMIN', 'ADMINISTRADOR')")],
  ['Only approved module/readiness keys can be persisted', migration.includes('erp_setup_configuracao_modulos_ck') && migration.includes('erp_setup_configuracao_requisitos_ck')],
]
const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failures.length) process.exit(1)
console.log('Setup Wizard contract passed.')
