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
VERIFICAÇÕES ESTÁTICAS (16/10/2026): 10 arquivos revisados possuem cabeçalho de data/escopo; navegação principal não contém sidebar; verificação heurística de imports não encontrou imports nomeados sem uso após remover LockKeyhole; FormEvent importado como tipo; matriz RBAC e codificação compactadas; política de senha Auth/Edge Function alinhada a 12+ caracteres, maiúscula, minúscula, número e símbolo. São verificações estáticas, não substituem compilação.
TESTES OBRIGATÓRIOS: npm run type-check; npm run lint:check; npm run build; verify:production; teste visual desktop/mobile; CRUD com usuário autenticado e escopo tenant; MFA real e RLS; testes Deno da Edge Function.
RESULTADO: alterações confirmadas no GitHub. A última implantação READY observada é o commit 61d5feee, anterior às alterações mais recentes. Nova tentativa após commit `5813e6a` também retornou HTTP 402 `api-deployments-free-per-day` (retryAfter 86400). A listagem da Vercel confirma deployments READY recentes de outros commits, mas não das alterações atuais. Build/type-check das alterações mais recentes continuam não confirmados. Continuar auditoria e correções no GitHub sem esperar a publicação; não contornar limite de faturamento nem alterar plano automaticamente.
PÁGINAS NOVAS (16/10/2026): `src/pages/configuracoes/ConfiguracaoIntegracoes.tsx` — lista registros reais de `outlook_integracoes` com filtro de empresa, ativação/desativação e acesso à configuração detalhada; `src/pages/configuracoes/ConfiguracaoSistema.tsx` — centraliza navegação para as configurações administrativas já existentes e valida a sessão. Ambas conectadas à navegação por `ConfiguracoesADM.tsx`. Em `5813e6a`, removidas mensagens obsoletas de indisponibilidade que ainda apareciam como fallback nas rotas já implementadas. Não simulam preferências globais nem conexões inexistentes.
CORREÇÃO RBAC (16/10/2026): `supabase/functions/erp-user-admin/index.ts` e `src/pages/UsuariosAdmin.tsx` alinhados à assinatura `erp_has_permission(p_code)` para códigos `users.read/create/update/delete`; confirmar os códigos no catálogo real e testar RPCs autenticadas antes de aprovar.
COMMITS DE CÓDIGO RECENTES: 97102a7; 1fdb1a1; 2b71750; 7ed42b1; 3039c69; 173b3c5; 891b188; ae6f6db; 57ddf91; 2f113ae; b18bd4c; a2340a5; 52b0ea0; 02ac299; 1e22d4d; 79b4d24; 42c74fa.


## CONTINUIDADE DE EXECUÇÃO (16/10/2026)
STATUS: IN_PROGRESS
ÚLTIMA ALTERAÇÃO: `5813e6afbf17aab43d141cf65e30723c79dd8e3e` — remover avisos obsoletos das rotas de Integrações e Parâmetros do Sistema.
VERIFICAÇÃO VERCEL: listagem confirmou projeto `erp-sistema-industrial`; deployment production READY mais recente consultado é do commit `61d5feee`, não inclui as alterações atuais. Nova tentativa de deploy da revisão `5813e6a` foi recusada por limite diário da API. Não afirmar que a revisão está em produção.
PRÓXIMAS AÇÕES: continuar auditoria estática de Configurações ADM, validar RBAC e tenant nas operações de escrita, revisar contratos reais das migrações, corrigir erros identificados e atualizar este registro. Testes locais de TypeScript/lint/build permanecem pendentes até execução em ambiente de build.
