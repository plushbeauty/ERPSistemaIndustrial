# Financeiro

Modulo organizado. Pagina ativa: `pages/FinanceiroWorkspace.tsx`.

Rota registrada em `src/AppEntryV2.tsx`: `/pageprincipal/financeiro` (atalho `/financeiro`).

Integracao atual: Supabase em `lib/supabaseClient`, RPCs `erp_current_empresa_id`, `erp_financeiro_salvar_titulo` e `erp_financeiro_registrar_baixa`; tabelas de titulos, parcelas, baixas, clientes e fornecedores. Bancos, transferencias, conciliacao e centros de custo ainda dependem de schema/servicos confirmados; nao marcar como concluidos sem verificacao.
