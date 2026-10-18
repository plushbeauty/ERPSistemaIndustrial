# Auditoria — VendasCatalogoDigital.tsx

- **Revisão:** 2026-10-18 — CATÁLOGO DIGITAL
- **Escopo:** catálogo de produtos, filtros, cards, imagens e ficha detalhada.
- **Dados esperados no código:** código, nome, descrição e `foto_url` do cadastro de produto.
- **Ponto de atenção:** uma coluna `foto_url` representa apenas uma imagem por produto; não afirmar galeria de múltiplas fotos até confirmar uma relação/tabela de imagens no esquema remoto e consultar suas políticas Storage/RLS.
- **Interação:** foi acrescentado fechamento por botão, rodapé e tecla Escape na ficha detalhada.
- **Bloqueio de homologação:** confirmar que os registros reais possuem nome, código, descrição e imagem; a conexão ao esquema Supabase não está autorizada nesta sessão.
- **Status:** PARCIAL; validar imagens reais e galeria multi-imagem antes de concluir.

Seguir `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md`.
