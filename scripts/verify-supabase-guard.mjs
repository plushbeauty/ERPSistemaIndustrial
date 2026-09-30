import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const fixture = path.join(root, 'src', '__p0_supabase_guard_fixture__.ts')
const forbiddenRef = 'wdkvrqekixczuhrfygen'
const guard = path.join(root, 'scripts', 'verify-supabase-env.mjs')

function runGuard() {
  const result = spawnSync(process.execPath, [guard], {
    cwd: root,
    env: { ...process.env, VERCEL: '', CI: '' },
    encoding: 'utf8',
  })
  return result
}

function fail(message) {
  console.error('[BLOCKER]', message)
  process.exit(2)
}

try {
  fs.writeFileSync(
    fixture,
    `// Fixture temporário P0: o guard deve detectar esta referência proibida.\\nconst forbidden = '${forbiddenRef}'\\n`,
    'utf8',
  )

  const negative = runGuard()
  if (negative.status === 0) {
    fail('REGRESSÃO SUPABASE: o guard não bloqueou uma referência proibida injetada em arquivo real.')
  }

  fs.rmSync(fixture, { force: true })

  const positive = runGuard()
  if (positive.status !== 0) {
    console.error(positive.stdout || '')
    console.error(positive.stderr || '')
    fail('REGRESSÃO SUPABASE: o guard continuou falhando após remoção do fixture.')
  }

  console.log('SUPABASE GUARD REGRESSION PASS — detecta e depois libera corretamente.')
} finally {
  fs.rmSync(fixture, { force: true })
}
