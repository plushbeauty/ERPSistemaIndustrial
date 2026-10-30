import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const migrationPath = 'supabase/migrations/20261029223000_fiscal_diarios_contabeis_v1.sql'
const screenPath = 'src/pages/AccountJournalsScreen.tsx'
const appPath = 'src/AppEntryV2.tsx'
const shellPath = 'src/components/layout/ERPHorizontalShell.tsx'
const failures = []
const read = file => {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) {
    failures.push(`Arquivo ausente: ${file}`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}
const migration = read(migrationPath)
const screen = read(screenPath)
const app = read(appPath)
const shell = read(shellPath)
const requireMatch = (text, pattern, message) => { if (!pattern.test(text)) failures.push(message) }

requireMatch(migration, /empresa_id uuid not null/i, 'Diários contábeis devem ser isolados por empresa.')
requireMatch(migration, /enable row level security/i, 'Tabela de diários deve ter RLS.')
requireMatch(migration, /erp_current_empresa_id\(\)/i, 'RLS deve usar a empresa autenticada.')
requireMatch(migration, /unique \(empresa_id, codigo\)/i, 'Código do diário deve ser único por empresa.')
requireMatch(screen, /from\('fiscal_diario_contabil'\)/, 'Tela deve consultar a tabela fiscal_diario_contabil.')
requireMatch(screen, /\.insert\(/, 'Tela deve gravar diários reais no Supabase.')
requireMatch(screen, /\.update\(\{ ativo: !diario\.ativo \}\)/, 'Tela deve permitir ativar/desativar diário.')
requireMatch(app, /path="diarios-contabeis" element=\{<AccountJournalsScreen \/>\}/, 'Rota autenticada de diários contábeis ausente.')
requireMatch(app, /AccountJournalsScreen = lazy\(\(\) => import\('\.\/pages\/AccountJournalsScreen'\)\)/, 'Import lazy da tela de diários ausente.')
requireMatch(shell, /Diários Contábeis[\s\S]{0,150}diarios-contabeis/, 'Entrada de menu para diários contábeis ausente.')

if (failures.length) {
  console.error('Falha no contrato de diários contábeis:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Contrato de diários contábeis aprovado.')
}
