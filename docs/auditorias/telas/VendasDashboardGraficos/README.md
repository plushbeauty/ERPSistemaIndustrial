# Auditoria — VendasDashboardGraficos.tsx

- **Revisão:** 2026-10-18 — DASHBOARD-BI-UI-ALINHADA
- **Rota/escopo:** Dashboard Analítica de Faturamento, filtros mês/ano, KPI de faturamento e ranking Recharts.
- **Fonte declarada:** `erp_documentos_fiscais`; RPC `erp_current_empresa_id`; paginação `fetchAllPages`.
- **Isolamento:** consulta filtra `empresa_id` retornado pela RPC e usa documentos de saída com status Autorizada.
- **UI aplicada:** filtros agrupados em grid responsivo; controles h-8 e larguras proporcionais; KPI em card; tratamento de loading/erro/vazio; botão de impressão `no-print`.
- **Critérios pendentes:** validar no banco remoto o esquema e RLS da tabela fiscal; executar type-check/lint/build; conferir visual em desktop/tablet e impressão A4.
- **Limite da evidência:** a consulta de esquema do Supabase não está acessível nesta sessão. Migrações e código do repositório foram usados para auditoria estática; não afirmar teste remoto.
- **Status:** EM AUDITORIA — não declarar concluída até evidência de build e teste real.

Seguir obrigatoriamente `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`.
