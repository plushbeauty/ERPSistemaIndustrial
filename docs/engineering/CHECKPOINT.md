# CHECKPOINT

CURRENT_PHASE: P0_BUILD_AND_RBAC_RECOVERY
CURRENT_TASK: TASK-0004
CURRENT_FILE: supabase/migrations/20261005231000_erp_has_permission_master_and_auth_contract.sql
CURRENT_ROUTE: /configuracoes-adm/permissoes
CURRENT_ERROR: ERR-0004; ERR-0005
LAST_SUCCESSFUL_TEST: nenhum teste local executado neste ambiente
LAST_COMMIT: 38d23af0b49658c905b68a3595cfc91a39b1a574
LAST_VERIFIED_DEPLOY: dpl_GQ8r2nVa2PxBBm6LsuAYFHEdcusT ERROR em 950c056; falha Vercel reportada como build-rate-limit
NEXT_ACTION: validar o HEAD 38d23af no pipeline local/CI; depois verificar o banco remoto para confirmar que a migration p_code foi aplicada e que os overloads RBAC usados pelo frontend estão disponíveis.
BLOCKERS: ERR-0004; ERR-0005; ERR-0001
PENDING_ERRORS: ERR-0001; ERR-0002; ERR-0004; ERR-0005
PENDING_TASKS: TASK-0001; TASK-0002; TASK-0003; TASK-0004
DO_NOT_REPEAT: não usar codigo/nome/modulo/ativo em erp_permissions; não recriar TabletDashboard; não inventar rotas; não substituir auth/RLS; não tratar existência de overload como erro sem verificar a migration/remoto.
