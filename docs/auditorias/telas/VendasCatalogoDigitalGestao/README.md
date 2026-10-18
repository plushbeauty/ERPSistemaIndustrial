# Auditoria — VendasCatalogoDigitalGestao.tsx

- **Revisão:** 2026-10-18 — GESTÃO DO CATÁLOGO DIGITAL
- **Escopo:** publicar/retirar produtos do catálogo, filtro por grupo e ações em lote.
- **Persistência:** confirmar a coluna `catalogo_disponivel` na tabela real de produtos; a página deve persistir as alterações no Supabase e exibir erros reais.
- **UI/ações:** filtros por grupo, seleção de todos os itens filtrados e ações de publicar/retirar em lote adicionadas ao código.
- **Bloqueio de homologação:** o conector Supabase retornou falta de permissão; não foi possível testar leitura/gravação na instância remota nem confirmar coluna/grants/RLS.
- **Status:** EM AUDITORIA; executar teste real de lote e confirmar persistência após recarregar.

Seguir `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`.
