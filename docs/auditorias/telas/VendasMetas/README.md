# Auditoria — VendasMetas.tsx

- **Revisão:** 2026-10-18 — METAS-COMERCIAIS-UI-ALINHADA
- **Escopo:** meta mensal da empresa, metas individuais, realizado por vendedor, quantidade de pedidos e percentual de atingimento.
- **Tabelas utilizadas:** `erp_vendas_metas`, `erp_vendas_metas_vendedores`, `erp_usuarios`, `erp_pedidos_venda`.
- **Isolamento:** todas as consultas/mutações de dados comerciais são filtradas pela empresa resolvida por `erp_current_empresa_id`; a nova tabela tem migração versionada com RLS e unique key por empresa/vendedor/competência.
- **UI aplicada:** campos h-8; larguras proporcionais; metas individuais por linha; realizado agrupado por `vendedor_id`; legenda de status; estados de erro/sucesso/loading/vazio.
- **Dependência de esquema:** migration `supabase/migrations/20261018170000_vendas_metas_por_vendedor.sql` criada no repositório. A aplicação no projeto Supabase remoto não pôde ser confirmada nesta sessão porque a conexão do Supabase retornou falta de permissão/projeto não listado.
- **Pendências obrigatórias:** aplicar a migração ao projeto correto; confirmar policies/RLS; testar leitura e gravação com sessão autenticada; executar type-check/lint/build; conferir competência e totais em pedidos reais.
- **Status:** BLOQUEADA PARA HOMOLOGAÇÃO REMOTA até aplicar/testar a migração; não ocultar a dependência de banco.

Seguir obrigatoriamente `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`.
