# Auditoria — VendasConfiguracoes.tsx

- **Revisão:** 2026-10-18 — CONFIGURACOES-COMERCIAIS-UI-ALINHADA
- **Tabela prevista pelo código/migrações:** `erp_vendas_configuracoes`.
- **Campos de tela:** `dias_validade_orcamento`, `desconto_maximo_percentual`, `bloquear_pedido_sem_estoque`, `exigir_pedido_cliente`.
- **Evidência de repositório:** a migração `20260927082500_vendas_central_settings.sql` cria a tabela e os quatro campos; migração `20260929150000_expand_vendas_configuracoes.sql` adiciona outros parâmetros comerciais.
- **UI:** refatorada com cards e classes Tailwind; os campos ainda usam `h-[30px]`, portanto precisam ser ajustados para `h-8` conforme a diretriz suprema.
- **Bloqueio de homologação:** o conector Supabase desta sessão retornou falta de permissão; não foi possível confirmar a tabela/colunas no banco remoto nem executar leitura/gravação autenticada.
- **Status:** EM AUDITORIA; ajustar altura dos campos e testar RLS/persistência remota.

Seguir `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`.
