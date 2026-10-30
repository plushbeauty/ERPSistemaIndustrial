import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const migration = read('supabase/migrations/20261029230000_sistema_parametro_global_v1.sql')
const screen = read('src/pages/SystemParametersScreen.tsx')
const app = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const checks = [
  ['Tabela global e chave única', /create table if not exists public\.sistema_parametro_global[\s\S]*chave varchar\(255\) not null unique/i.test(migration)],
  ['RLS habilitada e forçada', /enable row level security/i.test(migration) && /force row level security/i.test(migration)],
  ['Acesso à tabela restrito à identidade Master', /using \(coalesce\(public\.erp_is_master\(\), false\)\)/i.test(migration) && /with check \(coalesce\(public\.erp_is_master\(\), false\)\)/i.test(migration)],
  ['Sem valores de configuração fictícios embutidos na migration', !/insert into public\.sistema_parametro_global/i.test(migration)],
  ['Tela verifica sessão e identidade Master', screen.includes("supabase.auth.getUser()") && screen.includes("rpc('erp_is_master')")],
  ['Tela consulta, insere e atualiza dados reais', screen.includes("from('sistema_parametro_global')") && screen.includes('.insert(') && screen.includes('.update({ valor })')],
  ['Tela avisa para não persistir segredos de infraestrutura', /service_role|secret manager/i.test(screen)],
  ['Rota autenticada e alias estão registrados', app.includes("lazy(() => import('./pages/SystemParametersScreen'))") && app.includes('path="parametros-sistema"') && app.includes('to="/pageprincipal/parametros-sistema"')],
  ['Menu de Configurações expõe a tela atualizada', shell.includes('Parâmetros do Sistema') && shell.includes("route: '/parametros-sistema'")],
]
const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
if (failures.length) process.exit(1)
console.log('System parameters contract passed.')
