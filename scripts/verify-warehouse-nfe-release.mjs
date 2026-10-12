import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = file => {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) {
    failures.push('Arquivo ausente: ' + file)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}
const migration = read('supabase/migrations/20261012175122_erp_warehouse_nfe_release_v1.sql')
const page = read('src/pages/estoque/EstoqueLiberacaoNFe.tsx')
const emitter = read('src/pages/NFeEmissaoCompact.tsx')
const router = read('src/AppEntryV2.tsx')
const shell = read('src/components/layout/ERPHorizontalShell.tsx')
const requireIn = (source, pattern, message) => { if (!pattern.test(source)) failures.push(message) }

requireIn(migration, /create table if not exists public\.erp_liberacoes_nf\b/i, 'Tabela de cabeçalho da liberação ausente.')
requireIn(migration, /create table if not exists public\.erp_liberacoes_nf_itens\b/i, 'Tabela de itens da liberação ausente.')
requireIn(migration, /alter table public\.erp_liberacoes_nf enable row level security/i, 'RLS do cabeçalho não está habilitado.')
requireIn(migration, /alter table public\.erp_liberacoes_nf_itens enable row level security/i, 'RLS dos itens não está habilitado.')
requireIn(migration, /public\.erp_current_empresa_id\(\)/i, 'Migração não valida tenant pela função canônica.')
requireIn(migration, /public\.erp_has_permission\('estoque','criar'\)/i, 'Salvar liberação não valida permissão do Almoxarifado.')
requireIn(migration, /status_inspecao[^;]*APROVADO/i, 'Liberação não exige lote aprovado.')
requireIn(migration, /quantidade_disponivel[^;]*quantidade_reservada/i, 'Liberação não valida saldo livre do lote.')
requireIn(migration, /create or replace function public\.erp_encaminhar_liberacao_nf/i, 'RPC de encaminhamento ausente.')
requireIn(migration, /create or replace function public\.erp_vincular_liberacao_nfe/i, 'RPC de vínculo NF-e ausente.')
requireIn(migration, /create or replace function public\.erp_concluir_liberacao_nf/i, 'RPC de conclusão da liberação ausente.')
requireIn(migration, /lower\(coalesce\(d\.status,''\)\) in \('autorizada','autorizado'\)/i, 'Baixa física não exige NF-e autorizada.')
requireIn(migration, /insert into public\.erp_estoque_movimentos/i, 'Baixa física não registra movimento de estoque.')
const hardening = read('supabase/migrations/20261012175250_erp_warehouse_nfe_rpc_private_hardening.sql')
const indexes = read('supabase/migrations/20261012175321_erp_warehouse_nfe_fk_indexes.sql')
requireIn(migration, /revoke all on function public\.erp_concluir_liberacao_nf\(uuid\) from public, anon/i, 'RPC de conclusão não revoga execução pública.')
requireIn(hardening, /alter function public\.erp_salvar_liberacao_nf\(uuid,uuid,text,jsonb\) set schema private/i, 'Implementação privilegiada não foi movida ao schema privado.')
requireIn(hardening, /security invoker/i, 'Entrypoints públicos não são SECURITY INVOKER.')
requireIn(hardening, /revoke all on function private\.erp_concluir_liberacao_nf\(uuid\) from public, anon/i, 'RPC privado não revoga execução pública.')
requireIn(indexes, /idx_erp_liberacoes_nf_itens_lote_fk/i, 'Índice de chave estrangeira do lote ausente.')
requireIn(indexes, /idx_erp_liberacoes_nf_documento_fk/i, 'Índice de chave estrangeira do documento fiscal ausente.')
requireIn(page, /erp_salvar_liberacao_nf/i, 'Tela não persiste rascunho por RPC.')
requireIn(page, /erp_encaminhar_liberacao_nf/i, 'Tela não encaminha a liberação por RPC.')
requireIn(page, /status_inspecao/i, 'Tela não exibe o estado de Qualidade do lote.')
requireIn(page, /liberacao_id=/i, 'Tela não oferece abertura da emissão fiscal.')
requireIn(emitter, /useSearchParams/i, 'Emissor não lê a referência da liberação.')
requireIn(emitter, /erp_liberacoes_nf_itens/i, 'Emissor não importa os itens persistidos da liberação.')
requireIn(emitter, /erp_vincular_liberacao_nfe/i, 'Emissor não vincula o rascunho à liberação.')
requireIn(router, /path="\/estoque\/liberacao-nfe"/i, 'Rota da liberação não foi registrada.')
requireIn(shell, /Liberação para Nota Fiscal/i, 'Atalho do Almoxarifado não foi adicionado ao menu.')

if (failures.length) {
  console.error('Falha na verificação do fluxo Almoxarifado → NF-e:')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('Contrato Almoxarifado → NF-e verificado: tenant/RLS, lote aprovado, reserva, vínculo fiscal e baixa após autorização.')
}
