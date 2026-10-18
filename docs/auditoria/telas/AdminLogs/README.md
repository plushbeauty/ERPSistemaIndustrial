# Auditoria — Logs Administrativos

- **Tela:** `src/pages/AdminLogs.tsx`
- **Revisão:** 2026-10-18
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — isolamento explícito e controles compactos implementados; validações remotas pendentes.

## Contrato de dados verificado no repositório
A migration `20260913000100_erp_rbac_multitenant_hardening.sql` define `erp_audit_logs` com `empresa_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `old_data`, `new_data` e `created_at`. A migration `20261005180000_erp_admin_tenant_rbac_master_audit.sql` limita a leitura por RLS a Master autenticado ou ao tenant com permissão `auditoria.ver`.

## Correções
- Exige sessão autenticada antes de consultar logs.
- Consulta `erp_current_empresa_id` e `erp_is_master`; usuários comuns recebem filtro explícito por `empresa_id`, enquanto Master permanece sob as policies do banco.
- A lista de usuários do filtro também é limitada ao tenant para perfis não Master.
- Filtros visuais reduzidos e alinhados ao grid responsivo de 12 colunas.

## Validação pendente
- [ ] Testar acesso como usuário comum sem `auditoria.ver`, com permissão e como Master.
- [ ] Confirmar RLS remoto e tenant em dados reais.
- [ ] Type-check, lint, auditorias globais/interações, rotas, imports lazy, approved UI lock e build.
- [ ] Conferir desktop/tablet e paginação.
- [ ] Confirmar deploy do commit final.

## Limites
O projeto Supabase não apareceu na listagem do conector nesta execução. Nenhum teste autenticado ou de produção foi executado. Status parcial.
