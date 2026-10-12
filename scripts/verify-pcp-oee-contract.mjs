#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'src/pages/PCPDashboardOEE.tsx')
const failures = []
if (!fs.existsSync(sourcePath)) failures.push('Tela PCPDashboardOEE ausente.')
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : ''
const requireIn = (pattern, message) => { if (!pattern.test(source)) failures.push(message) }

requireIn(/supabase\.rpc\('erp_current_empresa_id'\)/, 'O OEE não resolve a empresa ativa da sessão.')
requireIn(/from\('erp_producao_apontamentos'\)[\s\S]*\.eq\('empresa_id', empresaId\)/, 'Apontamentos do OEE não estão filtrados pelo tenant.')
requireIn(/from\('erp_ordens_producao'\)[\s\S]*\.eq\('empresa_id', empresaId\)/, 'Ordens do OEE não estão filtradas pelo tenant.')
requireIn(/planned \+= duration/, 'O OEE não usa o tempo observado por apontamento para evitar repetir o tempo estimado da OP.')
requireIn(/item\.planned \+= duration/, 'A tendência diária do OEE não usa tempo observado por apontamento.')
if (/planned \+= op \? Math\.max\(0, Number\(op\.tempo_estimado_horas\)/.test(source)) failures.push('O cálculo de disponibilidade ainda repete o tempo estimado integral da OP em cada apontamento.')
if (failures.length) {
  console.error('PCP OEE CONTRACT: FAIL')
  for (const failure of failures) console.error('[BLOCKER] ' + failure)
  process.exit(1)
}
console.log('PCP OEE CONTRACT: PASS — tenant explícito e tempo observado sem duplicação.')
