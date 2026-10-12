#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = relative => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    failures.push(`Arquivo obrigatório ausente: ${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const migration = read('supabase/migrations/20261013040000_harden_quality_inspection_rbac_and_spec.sql');
const baseSchema = read('supabase/migrations/20261009180000_erp_industrial_engineering_wms_quality_pcp_fiscal_hr.sql');
const quarantineBalanceMigration = read('supabase/migrations/20261013080000_fix_quarantine_stock_balance_consolidation.sql');

const requireIn = (text, pattern, description) => {
  if (!pattern.test(text)) failures.push(description);
};
const requireNotIn = (text, pattern, description) => {
  if (pattern.test(text)) failures.push(description);
};

requireIn(migration, /begin\s*;[\s\S]*commit\s*;/i, 'Hardening da inspeção deve ser transacional.');
requireIn(migration, /create or replace function public\.erp_salvar_inspecao_lote[\s\S]*security invoker[\s\S]*set search_path = pg_catalog, public/i, 'RPC de inspeção deve manter execução invoker e search_path fixo.');
requireIn(migration, /auth\.uid\(\)[\s\S]*erp_current_empresa_id\(\)[\s\S]*u\.auth_user_id = v_user_id[\s\S]*u\.empresa_id = v_empresa_id[\s\S]*u\.ativo = true[\s\S]*u\.deleted_at is null/i, 'RPC de inspeção deve exigir perfil ERP ativo no tenant.');
requireIn(migration, /erp_has_permission\('qualidade', 'criar'\)/i, 'RPC de inspeção não verifica permissão qualidade.criar.');
requireIn(migration, /erp_has_permission\('qualidade', 'ver'\)[\s\S]*erp_has_permission\('qualidade', 'criar'\)/i, 'RPC de inspeção não exige leitura e criação para o fluxo completo.')
requireIn(migration, /qualidade_especificacoes[\s\S]*s\.status = 'ativa'[\s\S]*s\.vigente_desde <= current_date[\s\S]*especificacao_id/i, 'A decisão não verifica especificação ativa/vigente ligada às medições.');
requireIn(migration, /if not v_spec_ok then[\s\S]*v_resultado := 'reprovado'/i, 'Ausência de especificação ativa não bloqueia o lote.');
requireIn(migration, /for v_medicao in[\s\S]*jsonb_array_elements\(v_medicoes\)[\s\S]*v_medicao_invalida/i, 'O servidor não valida individualmente as medições.')
requireIn(migration, /v_parametro->>'nominal'[\s\S]*v_parametro->>'tolerancia_superior'[\s\S]*v_parametro->>'tolerancia_inferior'[\s\S]*v_valor < v_nominal - v_tol_inf[\s\S]*v_valor > v_nominal \+ v_tol_sup/i, 'Medições dimensionais não são recalculadas contra limites canônicos.')
requireIn(migration, /v_tipo_criterio = 'certificado'[\s\S]*numero_certificado[\s\S]*conclusao_certificado/i, 'Conferência de certificado não exige número e conclusão conforme.')
requireIn(migration, /evidencia_observada/i, 'Critérios não numéricos não exigem evidência observada.')
requireIn(migration, /update public\.estoque_lotes[\s\S]*set status = 'bloqueado'/i, 'Inspeção reprovada não bloqueia o lote industrial.');
requireIn(migration, /set localizacao = 'Quarentena'[\s\S]*status_inspecao = 'REPROVADO'/i, 'Inspeção reprovada não espelha o bloqueio na trilha de estoque.');
requireIn(migration, /insert into public\.erp_quarentenas_lotes/i, 'Inspeção reprovada não registra quarentena.');
requireIn(migration, /create policy qualidade_inspecoes_rbac_insert[\s\S]*as restrictive[\s\S]*for insert[\s\S]*qualidade', 'criar'/i, 'RLS não bloqueia insert direto de inspeção sem RBAC.');
requireIn(migration, /create policy estoque_lotes_rbac_update_guard[\s\S]*as restrictive[\s\S]*for update/i, 'RLS não protege atualizações de lotes por ação.');
requireIn(migration, /create policy erp_estoque_lotes_rbac_update_guard[\s\S]*as restrictive[\s\S]*for update/i, 'RLS não protege o ledger ERP de lotes por ação.');
requireIn(migration, /create policy erp_quarentenas_lotes_rbac_insert[\s\S]*as restrictive[\s\S]*for insert/i, 'RLS não protege inserts diretos de quarentena por ação.');
requireIn(migration, /create or replace function public\.erp_reter_lote[\s\S]*security definer[\s\S]*set search_path = pg_catalog, public[\s\S]*erp_has_permission/i, 'RPC de retenção SECURITY DEFINER não valida RBAC com search_path fixo.');
requireIn(migration, /revoke all on function public\.erp_salvar_inspecao_lote[\s\S]*from public, anon/i, 'RPC de inspeção continua exposta a public/anon.');
requireIn(migration, /revoke all on function public\.erp_reter_lote[\s\S]*from public, anon/i, 'RPC de retenção continua exposta a public/anon.');
requireIn(migration, /grant execute on function public\.erp_salvar_inspecao_lote[\s\S]*to authenticated/i, 'RPC de inspeção não está concedida explicitamente a authenticated.');
requireIn(migration, /grant execute on function public\.erp_reter_lote[\s\S]*to authenticated/i, 'RPC de retenção não está concedida explicitamente a authenticated.');
requireIn(baseSchema, /trg_qualidade_inspecao_quarentena[\s\S]*execute function public\.erp_quality_quarantine_lot/i, 'O trigger que abre RNC e movimenta saldo para quarentena não foi localizado.');

requireIn(quarantineBalanceMigration, /create or replace function public\.erp_quality_quarantine_lot[\s\S]*security definer[\s\S]*set search_path = pg_catalog, public/i, 'A quarentena deve consolidar saldos com função privilegiada e search_path fixo.');
requireIn(quarantineBalanceMigration, /insert into public\.estoque_saldos[\s\S]*group by s\.empresa_id, s\.produto_id, s\.lote_id[\s\S]*on conflict \(empresa_id, produto_id, lote_id, endereco_id\)/i, 'A quarentena não consolida saldos fracionados no endereço de quarentena.');
requireIn(quarantineBalanceMigration, /delete from public\.estoque_saldos[\s\S]*endereco_id <> v_quarantine_id/i, 'A quarentena não limpa os saldos dos endereços anteriores após consolidar.');
requireNotIn(quarantineBalanceMigration, /update public\.estoque_saldos[\s\S]*set endereco_id = v_quarantine_id/i, 'A quarentena ainda move endereços por UPDATE direto e pode violar a chave única do saldo.');
requireIn(quarantineBalanceMigration, /revoke all on function public\.erp_quality_quarantine_lot\(\) from public, anon, authenticated/i, 'A função de trigger de quarentena não deve ser chamada diretamente por papéis de navegador.');

console.log('=== ERP INDUSTRIAL — QUALITY INSPECTION CONTRACT ===');
console.log(`Falhas: ${failures.length}`);
for (const failure of failures) console.log(`[BLOCKER] ${failure}`);
if (failures.length) {
  console.log('RESULT: FAIL — contrato de inspeção/RBAC incompleto.');
  process.exit(2);
}
console.log('RESULT: PASS — RBAC, especificação vigente, bloqueio, quarentena e RNC verificados estaticamente.');
