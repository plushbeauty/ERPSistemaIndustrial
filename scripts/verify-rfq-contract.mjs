#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20261013020000_erp_rfq_canonical_product_fields.sql');
const pagePath = path.join(root, 'src/pages/ComprasRFQ.tsx');
const failures = [];

function readRequired(file) {
  if (!fs.existsSync(file)) {
    failures.push(`Arquivo obrigatório ausente: ${path.relative(root, file)}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

const sql = readRequired(migrationPath).toLowerCase();
const page = readRequired(pagePath).toLowerCase();

const sqlRequirements = [
  ['transação explícita', /^begin;[\s\S]*commit;\s*$/],
  ['perfil ligado ao usuário autenticado', /u\.auth_user_id\s*=\s*auth\.uid\(\)/],
  ['isolamento do usuário por empresa', /u\.empresa_id\s*=\s*v_empresa_id/],
  ['usuário ativo e não excluído', /u\.ativo\s*=\s*true[\s\S]*u\.deleted_at\s+is\s+null/],
  ['fornecedor ativo na empresa', /f\.empresa_id\s*=\s*v_empresa_id[\s\S]*f\.ativo\s*=\s*true/],
  ['produto ativo na empresa', /p\.empresa_id\s*=\s*v_empresa_id[\s\S]*p\.ativo\s*=\s*true/],
  ['permissão de consulta e criação', /erp_has_permission\('compras',\s*'ver'\)[\s\S]*erp_has_permission\('compras',\s*'criar'\)/],
  ['descrição canônica do cadastro', /coalesce\(nullif\(btrim\(p\.nome\)/],
  ['código canônico do cadastro', /\n\s*p\.codigo\s*,/],
  ['unidade canônica do cadastro', /p\.unidade_compra[\s\S]*p\.unidade/],
  ['nega execução pública/anônima', /revoke all on function[\s\S]*from public, anon/],
  ['execução concedida apenas a authenticated', /grant execute on function[\s\S]*to authenticated/],
];

for (const [label, pattern] of sqlRequirements) {
  if (!pattern.test(sql)) failures.push(`Contrato RFQ ausente: ${label}.`);
}

if (!/create or replace function public\.erp_compras_criar_rfq_atomica\(/.test(sql)) {
  failures.push('A migração não redefine a RPC esperada.');
}
if (!/\.rpc\('erp_compras_criar_rfq_atomica'/.test(page)) {
  failures.push('A tela ComprasRFQ não chama a RPC atômica.');
}
if (!/produto_id:\s*item\.produto_id/.test(page) || !/quantidade:\s*number\(item\.quantidade\)/.test(page)) {
  failures.push('A tela deve enviar a identidade do produto e a quantidade para a RPC.');
}
for (const untrustedField of [/\bi\.codigo\b/, /\bi\.descricao\b/, /\bi\.unidade\b/]) {
  if (untrustedField.test(sql)) failures.push(`A RPC não deve confiar no campo de produto enviado pelo cliente: ${untrustedField}.`);
}

if (failures.length) {
  console.error('VERIFICAÇÃO DO CONTRATO RFQ: FALHA');
  for (const failure of failures) console.error(`[BLOCKER] ${failure}`);
  process.exit(1);
}

console.log('VERIFICAÇÃO DO CONTRATO RFQ: OK — RPC, tenant, permissões, produto canônico e grants conferidos.');
