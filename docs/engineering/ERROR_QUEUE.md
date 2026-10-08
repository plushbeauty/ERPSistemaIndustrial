# ERROR QUEUE

Fila persistente de erros. Nunca apagar histórico.

## ERR-0001
STATUS: OPEN
PRIORIDADE: P0
CATEGORIA: BUILD
ARQUIVO: src/AppEntryV2.tsx / src/pages/CentraisIndustriais.tsx
LINHA: conforme log de build anterior
ROTA: /vendas/materiais
SINTOMA: erro reportado de contrato envolvendo materiais.
CAUSA: ainda precisa ser reproduzido no HEAD atual; CentraisIndustriais já aceita materiais.
IMPACTO: potencial bloqueio de produção.
DEPENDÊNCIAS: nenhuma
CORREÇÃO: não aplicar nova alteração até reproduzir.
TESTE NECESSÁRIO: npm run type-check
EVIDÊNCIA: build 75c340c reportou falha TS2322 em outro arquivo; erro específico de materiais precisa confirmação.
COMMIT: pendente
DATA: 2026-10-07

## ERR-0002
STATUS: OPEN
PRIORIDADE: P1
CATEGORIA: TABLET
ARQUIVO: src/components/TabletMenuModal.tsx
ROTA: launcher Tablet
SINTOMA: catálogo anterior não correspondia ao SGQ M01-M22.
CAUSA: catálogo antigo usava módulos ERP gerais.
IMPACTO: central Tablet não representava o conjunto SGQ solicitado.
DEPENDÊNCIAS: integração com launcher.
CORREÇÃO: catálogo M01-M22 aplicado.
TESTE NECESSÁRIO: type-check, lint, integração e E2E.
EVIDÊNCIA: commit d6ba28496eebef355ad8717d28fdb65fe3128455
COMMIT: d6ba28496eebef355ad8717d28fdb65fe3128455
DATA: 2026-10-07

## ERR-0003
STATUS: FIXED
PRIORIDADE: P1
CATEGORIA: SUPABASE/RBAC
ARQUIVO: src/pages/TabletDashboard.tsx
ROTA: /tablet/dashboard
SINTOMA: consulta de erp_permissions usava .eq('ativo', true), coluna não pertence ao contrato real.
CAUSA: contrato incorreto da consulta.
IMPACTO: carregamento das permissões do Tablet podia retornar erro 400.
DEPENDÊNCIAS: schema real de erp_permissions.
CORREÇÃO: removido filtro inexistente; consulta usa id e code conforme schema real.
TESTE NECESSÁRIO: type-check; lint; login real; carregamento de permissões.
EVIDÊNCIA: schema real informado/confirmado anteriormente: id, code, name, description, created_at.
COMMIT: 950c05620bad84ab59abf3902dc811ba24d4aed0
DATA: 2026-10-07


## ERR-0004
STATUS: VALIDATING
PRIORIDADE: P0
CATEGORIA: BUILD/VERCEL
ARQUIVO: src/pages/configuracoes/ConfiguracaoPermissoes.tsx
LINHA: 75
ROTA: /configuracoes-adm/permissoes
SINTOMA: Vercel production commit 950c056 falhou no type-check com consulta erp_permissions usando codigo,nome,modulo,ativo enquanto o contrato real exige code,name,description.
CAUSA: contrato de dados divergente.
IMPACTO: bloqueia production gate.
DEPENDÊNCIAS: schema real erp_permissions.
CORREÇÃO: consulta alterada para id,code,name,description e order por code.
TESTE NECESSÁRIO: npm run type-check; npm run lint:check; npm run build; verify:production; deploy Vercel.
EVIDÊNCIA: logs Vercel dpl_GQ8r2nVa2PxBBm6LsuAYFHEdcusT.
COMMIT: b8a9cde58bb76f00417d3b25a4606ac39545c7c0
DATA: 2026-10-07
