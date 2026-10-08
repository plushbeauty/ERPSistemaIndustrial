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
RESULTADO: contrato atual de CentraisIndustriais declara materiais; execução local ainda indisponível no ambiente do agente.
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
RESULTADO: modal M01-M22 implementado; consulta de permissões corrigida para o schema real sem coluna ativo.
COMMIT: 950c05620bad84ab59abf3902dc811ba24d4aed0

## TASK-0003
STATUS: PENDING
PRIORIDADE: P1
MÓDULO: SGQ M01-M22
ARQUIVOS: conforme matriz de rotas
OBJETIVO: fechar tela, API, tipagem, RBAC, tenant e RLS com dados reais.
DEPENDÊNCIAS: TASK-0001; TASK-0002
ERROS RELACIONADOS: a descobrir
TESTES: type-check; lint; rotas; Supabase; E2E
RESULTADO: pendente
COMMIT: pendente
