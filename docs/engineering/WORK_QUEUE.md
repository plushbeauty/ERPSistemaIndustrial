# WORK QUEUE

## TASK-0001
STATUS: IN_PROGRESS
PRIORIDADE: P0
MÓDULO: BUILD
ARQUIVOS: src/AppEntryV2.tsx; src/pages/CentraisIndustriais.tsx
OBJETIVO: reproduzir e eliminar o bloqueio TypeScript envolvendo materiais.
DEPENDÊNCIAS: nenhuma
ERROS RELACIONADOS: ERR-0001
TESTES: type-check; lint; build
RESULTADO: contrato atual de CentraisIndustriais declara materiais; execução local ainda não comprovada.
COMMIT: pendente

## TASK-0002
STATUS: IN_PROGRESS
PRIORIDADE: P1
MÓDULO: TABLET
ARQUIVOS: src/components/TabletMenuModal.tsx; src/pages/TabletDashboard.tsx
OBJETIVO: recuperar central HMI e validar acesso/rotas reais.
DEPENDÊNCIAS: TASK-0001
ERROS RELACIONADOS: ERR-0002; ERR-0003
TESTES: type-check; lint; integração; E2E
RESULTADO: M01-M22 implementado; RBAC real usado no modal; módulos sem rota bloqueados.
COMMIT: 890dd7cba751441fbd69764785587d0cef1c09ee

## TASK-0003
STATUS: PENDING
PRIORIDADE: P1
MÓDULO: SGQ M01-M22
ARQUIVOS: conforme matriz de rotas
OBJETIVO: fechar tela, API, tipagem, RBAC, tenant e RLS com dados reais.
DEPENDÊNCIAS: TASK-0001; TASK-0002; TASK-0004
ERROS RELACIONADOS: a descobrir
TESTES: type-check; lint; rotas; Supabase; E2E
RESULTADO: pendente
COMMIT: pendente

## TASK-0004
STATUS: BLOCKED
PRIORIDADE: P0
MÓDULO: AUTH/RBAC/SUPABASE
ARQUIVOS: supabase/migrations/20261005231000_erp_has_permission_master_and_auth_contract.sql; src/lib/supabaseClient.ts; chamadas RPC
OBJETIVO: provar o contrato remoto de erp_has_permission, incluindo overload p_code e p_modulo/p_acao, grants e execução autenticada.
DEPENDÊNCIAS: acesso ao projeto Supabase remoto.
ERROS RELACIONADOS: ERR-0005; ERR-0004
TESTES: listar funções; grants; RPC autenticada; cross-tenant/RLS.
RESULTADO: código/migrations confirmam que os overloads existem no repositório; aplicação remota ainda não comprovada.
COMMIT: pendente


## TASK-0005
STATUS: IN_PROGRESS
PRIORIDADE: P1
MÓDULO: CONFIGURAÇÕES ADMINISTRATIVAS
ARQUIVOS: src/pages/configuracoes/ConfiguracoesADM.tsx; src/pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx; src/pages/configuracoes/ConfiguracaoPerfis.tsx; src/pages/configuracoes/ConfiguracaoPermissoes.tsx; src/pages/configuracoes/ConfiguracaoLogs.tsx; src/pages/configuracoes/ConfiguracaoBackups.tsx; src/pages/UsuariosAdmin.tsx; src/components/CompanySettings.tsx
OBJETIVO: recuperar a tela /configuracoes-adm com navegação legível, padrão compacto industrial, rotas de seção consistentes e operações administrativas verificadas.
ACHADOS: overview só expunha seis atalhos para dez seções; três seções não possuem fonte persistida/API central confirmada; menu e telas internas usavam raios, paddings e controles maiores que o padrão aprovado.
CORREÇÃO PARCIAL (revisão 16/10/2026): navegação horizontal substituiu a barra lateral em ConfiguracoesADM.tsx; ação de perfis ligada à matriz RBAC via querystring; matriz compactada; páginas de segurança, logs, backups, codificação, usuários e identidade empresarial receberam cabeçalhos de revisão com data, escopo e testes pendentes.
VERIFICAÇÕES ESTÁTICAS: arquivos e rotas conferidos pelo GitHub; cabeçalho de revisão presente em 9 arquivos; matriz RBAC usa RPC erp_admin_save_role e contrato do catálogo documentado como id,code,name,description. Verificação estática não equivale a type-check.
TESTES OBRIGATÓRIOS: npm run type-check; npm run lint:check; npm run build; verify:production; teste visual desktop/mobile; CRUD com usuário autenticado e escopo tenant; MFA real e RLS.
RESULTADO: alterações confirmadas no GitHub; testes de compilação e integração não executados neste ambiente. Status Vercel dos commits consultados: failure com target build-rate-limit; deploy não confirmado.
COMMITS RECENTES: 57ddf91; 2f113ae; 4106e9e; 8c4d7ea; ffbc712.
