# CHECKPOINT

CURRENT_PHASE: P0_COMPARATIVE_MODULE_AUDIT
CURRENT_TASK: CMP-001..CMP-008
CURRENT_FILE: docs/erp-standardization/COMPARATIVE-MODULE-INVENTORY-2026-10-16.md
CURRENT_ROUTE: static inventory of 247 unique route patterns
CURRENT_ERROR: ERR-0004; ERR-0005; ERR-0006
LAST_SUCCESSFUL_TEST: nenhum teste local executado neste ambiente
LAST_COMMIT: cfb79ce78dd423b51f54b5003c1ba7aa90dadaea
LAST_VERIFIED_DEPLOY: dpl_FVRbvxpMooEasnwNxQUkr5PT3wwA READY em 1cb2f3a; deployment contém o DBGrid inicial, mas NÃO contém as correções recentes de ConfiguracoesADM; commits posteriores reportam build-rate-limit
NEXT_ACTION: validar os 247 padrões de rota, auditar as 11 rotas de IndustrialDataWorkspace, fechar Auth/RBAC/RLS e executar npm run verify:production no checkout real. Relatório comparativo em docs/erp-standardization/COMPARATIVE-MODULE-INVENTORY-2026-10-16.md.
BLOCKERS: ERR-0004; ERR-0005; ERR-0001
PENDING_ERRORS: ERR-0001; ERR-0002; ERR-0004; ERR-0005; ERR-0006
PENDING_TASKS: TASK-0001; TASK-0002; TASK-0003; TASK-0004; TASK-0005
DO_NOT_REPEAT: não usar codigo/nome/modulo/ativo em erp_permissions; não recriar TabletDashboard; não inventar rotas; não substituir auth/RLS; não tratar overload como erro sem verificar migration e banco remoto.


COMPARATIVE_AUDIT: inventário estático registrado em docs/erp-standardization/COMPARATIVE-MODULE-INVENTORY-2026-10-16.md; 248 declarações Route, 247 padrões únicos, 156 imports dinâmicos, 11 rotas para renderer genérico. Comparação de referência: SAP 10 áreas principais da página consultada; ERPNext 21 nomes em modules.txt; TOTVS Backoffice 18 tópicos/subitens citados na página pública. Estes números não são diretamente equivalentes. Matriz de gaps criada, auditoria funcional ainda pendente. Não marcar módulos concluídos.


COMPARATIVE_CATALOG_UPDATE: ampliado em ff68b47581aebc7e0677d7908dd17ec868cd0831 com catálogo função-a-função do ERPNext (21 módulos), famílias de aplicações Odoo, famílias TOTVS Protheus e matriz de segurança (identidade, usuários, RBAC, tenant/RLS, Master, logs, sessões, MFA, senha, alçadas, backup/restore, segredos, alertas e LGPD). Matriz distingue presença de rota de existência de capacidade completa. Não inferir conclusão funcional.


## 2026-10-16 — Configurações ADM: auditoria e reconstrução inicial
CURRENT_PHASE: P0_CONFIGURACOES_ADM_AUDIT
CURRENT_TASK: ADM-001 — reconstruir shell e auditar páginas individualmente
CURRENT_FILE: src/pages/configuracoes/ConfiguracoesADM.tsx
CURRENT_ROUTE: /configuracoes-adm/*
CURRENT_ERROR: contratos RPC/schema/RLS ainda precisam de validação remota
LAST_SUCCESSFUL_TEST: nenhum teste local executado neste ambiente
LAST_COMMIT: ffc095e06272d5f7924daf0d14bcb28cdf1a7ee6; shell: 00f9f12264f9e71b0f5525eaafaac48a4a8304dd
NEXT_ACTION: auditar Usuários (operações de criação/convite/edição), migrations de RBAC em ordem, RPCs e policies RLS; depois corrigir uma página por vez e executar type-check/lint/build.
BLOCKERS: confirmar contrato remoto Supabase; checkout local/testes ainda não executados.
AUDIT: docs/erp-standardization/CONFIGURACOES-ADM-PAGE-AUDIT-2026-10-16.md
