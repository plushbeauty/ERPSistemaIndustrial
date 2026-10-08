# ERROR QUEUE

Fila persistente de erros. Nunca apagar histórico.

## ERR-0001
STATUS: OPEN
PRIORIDADE: P0
CATEGORIA: BUILD
ARQUIVO: src/AppEntryV2.tsx / src/pages/CentraisIndustriais.tsx
ROTA: /vendas/materiais
LINHA: conforme log de build anterior
SINTOMA: erro reportado de contrato envolvendo materiais.
CAUSA: precisa ser reproduzido no HEAD atual; CentraisIndustriais atual declara e trata materiais.
IMPACTO: potencial bloqueio de produção.
DEPENDÊNCIAS: nenhuma
CORREÇÃO: não aplicar nova alteração até reproduzir.
TESTE NECESSÁRIO: npm run type-check
EVIDÊNCIA: build 75c340c reportou TS2322; commit 981a95b posteriormente alinhou o contrato de materiais.
COMMIT: 981a95b757506b8aa7ca9e563cda02c6d1e57137
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
CORREÇÃO: catálogo M01-M22 aplicado; módulos sem rota permanecem bloqueados.
TESTE NECESSÁRIO: type-check, lint, integração e E2E.
EVIDÊNCIA: commits f736e07/890dd7c e posteriores.
COMMIT: 890dd7cba751441fbd69764785587d0cef1c09ee
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
EVIDÊNCIA: schema confirmado no código/migration.
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
CORREÇÃO: consulta alterada para id,code,name,description e order por code; paginação recebeu tipagem posterior.
TESTE NECESSÁRIO: npm run type-check; npm run lint:check; npm run build; verify:production; deploy Vercel.
EVIDÊNCIA: commits b8a9cde e dafa33b; Vercel não forneceu PASS por build-rate-limit.
COMMIT: dafa33b33b363902b16e50e17bb2aa989adc5813
DATA: 2026-10-07

## ERR-0005
STATUS: BLOCKED
PRIORIDADE: P0
CATEGORIA: SUPABASE/RBAC
ARQUIVO: supabase/migrations/20261005231000_erp_has_permission_master_and_auth_contract.sql
ROTA: /configuracoes-adm/permissoes; módulos que usam erp_has_permission(p_code)
SINTOMA: não é possível comprovar neste ambiente se a função erp_has_permission(text) da migration 20261005231000 está aplicada no projeto Supabase remoto.
CAUSA: conexão MCP disponível para Supabase não retornou projetos acessíveis nesta sessão.
IMPACTO: impede declarar RPC/RBAC GREEN e pode explicar 404 remoto caso a migration não esteja aplicada.
DEPENDÊNCIAS: acesso/verificação do projeto Supabase real.
CORREÇÃO: não alterar migrations às cegas; verificar função e grants no banco remoto antes de qualquer mudança.
TESTE NECESSÁRIO: listar funções/assinaturas, grants e executar RPC autenticada com usuário real.
EVIDÊNCIA: migration 20261005231000 define erp_has_permission(p_code text), com EXECUTE apenas para authenticated; migrations anteriores também definem overload p_modulo/p_acao.
COMMIT: pendente
DATA: 2026-10-08
