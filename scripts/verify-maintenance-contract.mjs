#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = file => {
  const target = path.join(root, file)
  if (!fs.existsSync(target)) {
    failures.push(`Arquivo obrigatório ausente: ${file}`)
    return ''
  }
  return fs.readFileSync(target, 'utf8')
}
const requireIn = (source, pattern, message) => { if (!pattern.test(source)) failures.push(message) }

const toolPreventive = read('src/pages/manutencao/ManutencaoPreventivas.tsx')
const toolingChecklist = read('src/pages/FerramentariaPreventiva.tsx')
const setupApproval = read('src/pages/PCPAprovacaoSetup.tsx')
const masterSchedule = read('src/pages/ManutencaoPlanoMestre.tsx')
const checklistMigration = read('supabase/migrations/20261012123000_erp_manutencao_checklists.sql')
const engineeringProcess = read('src/pages/FichasProcesso.tsx')
const pcpProcess = read('src/pages/PCPFichasProcesso.tsx')

requireIn(toolPreventive, /erp_current_empresa_id/, 'Planos preventivos não resolvem a empresa ativa.')
requireIn(toolPreventive, /\.eq\('empresa_id', empresaId\)/, 'A listagem de planos preventivos não está isolada por empresa.')
requireIn(toolPreventive, /\.eq\('empresa_id', companyId\)/, 'A gravação de planos preventivos não está isolada por empresa.')
requireIn(toolPreventive, /\.\.\.parameters,[\s\S]*regra_disparo: rule,[\s\S]*meta_ciclos: numericTarget[\s\S]*meta_dias: numericTarget/, 'O plano preventivo deve preservar parâmetros existentes e salvar a meta na unidade selecionada.')
requireIn(toolingChecklist, /erp_current_empresa_id/, 'Checklist da ferramentaria não resolve a empresa ativa.')
requireIn(toolingChecklist, /\.eq\('empresa_id',empresaId\)/, 'A listagem da ferramentaria não está isolada por empresa.')
requireIn(toolingChecklist, /\.eq\('empresa_id',companyId\)/, 'A gravação do checklist da ferramentaria não está isolada por empresa.')
requireIn(toolingChecklist, /status==='LIBERADO'&&done\.some\(value=>!value\)/, 'A ferramentaria permite liberar molde com checklist incompleto.')
requireIn(toolingChecklist, /\.\.\.\(selected\.parametros\?\.\?\{\}\),preventiva:/, 'A manutenção preventiva apaga outros parâmetros do ferramental.')
requireIn(toolingChecklist, /update\(\{status:operationalStatus,parametros:next\}\)/, 'A retenção da ferramentaria não atualiza o status operacional do ferramental.');
requireIn(setupApproval, /update\(\{ status: operationalStatus, parametros: updatedParameters/, 'A reprovação do setup não atualiza o status operacional do ferramental.');
requireIn(engineeringProcess, /\.neq\('status','RETIDO'\)/, 'Fichas de engenharia permitem selecionar ferramental retido.');
requireIn(pcpProcess, /\.neq\('status', 'RETIDO'\)/, 'Fichas de processo do PCP permitem selecionar ferramental retido.');

requireIn(setupApproval, /erp_current_empresa_id/, 'A aprovação de setup não resolve a empresa ativa.')
requireIn(setupApproval, /\.eq\('empresa_id', empresaId\)/, 'As consultas de setup não estão isoladas por empresa.')
requireIn(setupApproval, /\.eq\('empresa_id', companyId\)/, 'A gravação do laudo de setup não está isolada por empresa.')
requireIn(setupApproval, /\.\.\.parameters,[\s\S]*setup_aprovacao:/, 'O laudo de setup apaga parâmetros técnicos existentes.')
requireIn(setupApproval, /requestedStatus === 'RETIDO'|requestedStatus === 'APROVADO'/, 'O botão de reprovação não persiste um resultado explícito.')
requireIn(setupApproval, /requestedStatus === 'APROVADO' && checks\.some\(checked => !checked\)/, 'Aprovação de setup não exige checklist completo, ou reprovação não pode ser registrada com itens pendentes.')
requireIn(masterSchedule, /const frpRows: SourceRow\[\]/, 'O cronograma FRP-MP-001 não está representado.')
requireIn(masterSchedule, /const masterRows: SourceRow\[\]/, 'O cronograma Master 2026 não está representado.')
requireIn(masterSchedule, /erp_manutencao_checklists/, 'O plano mestre não carrega/salva checklists persistidos.')
requireIn(checklistMigration, /enable row level security[\s\S]*empresa_id = public\.erp_current_empresa_id\(\)/, 'A tabela de checklists não aplica isolamento por empresa.')

if (failures.length) {
  console.error('MAINTENANCE CONTRACT: FAIL')
  for (const failure of failures) console.error('[BLOCKER] ' + failure)
  process.exit(1)
}
console.log('MAINTENANCE CONTRACT: PASS — isolamento por empresa, preservação de parâmetros e checklists preventivos.')
