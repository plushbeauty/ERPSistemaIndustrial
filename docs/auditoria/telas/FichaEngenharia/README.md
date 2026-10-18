# Auditoria — Ficha de Engenharia / Catálogo de Processos

- **Tela:** `src/pages/FichaEngenharia.tsx`
- **Revisão:** 2026-10-18
- **Branch:** `fix/pcp-process-sheet-submenu-guard`
- **Status:** PARCIAL — filtros explícitos de empresa aplicados no carregamento do catálogo; revisão visual e validação integrada pendentes.

## Constatações estáticas
- O arquivo tem aproximadamente 41 KB e contém 45 ocorrências de `style={{...}}`, incluindo layout, largura, posicionamento, espaçamento, cartões e modal.
- O arquivo contém catálogo, formulário e rotinas de persistência de engenharia; uma conversão mecânica de estilos pode alterar a composição aprovada e deve ser feita por blocos visuais, com diff revisado.
- A diretriz indicada pelo solicitante em `docs/erp-standardization/DIRETRIZ_SUPREMA_UI_UX_SGQERP.md` não foi localizada na branch consultada. A implementação deve seguir os critérios descritos pelo solicitante até que o documento versionado seja encontrado.
- A tela não deve ser declarada aprovada apenas por existir; ainda precisa de verificação das consultas, permissões, schema e RLS no banco.

## Implementação nesta revisão
- `loadBase()` agora resolve a empresa atual antes de consultar dados.
- Consultas de `erp_produtos`, `erp_maquinas`, `erp_moldes` e `erp_fichas_tecnicas` filtram por `empresa_id`.
- A leitura/edição da ficha, BOM, operações e planos de inspeção já usava filtro de empresa no fluxo analisado; a gravação principal também envia `empresa_id` e as atualizações de plano incluem o tenant.
- Não houve alteração nas categorias, nos campos de processo, na ilustração, nem no modelo de persistência.

## Plano controlado
1. Mapear estados, permissões, consultas e operações de gravação.
2. Confirmar colunas e políticas de tenant das tabelas usadas antes de alterar consultas.
3. Migrar estilos inline de layout para classes/utilitários em blocos pequenos, preservando paleta e identidade visual existentes.
4. Padronizar controles em `h-8`, rótulos de 9 px e grid responsivo sem larguras rígidas.
5. Validar desktop/tablet e fluxo autenticado.
6. Executar os scripts reais de type-check, lint, auditorias, rotas, imports lazy, approved UI lock e build.
7. Registrar commit e deploy somente após confirmação real.

## Critérios pendentes
- [x] Revisão estática dos principais hooks, consultas e payloads de persistência.
- [x] Filtro explícito de tenant nas quatro consultas do catálogo inicial.
- [ ] Revisão detalhada de RBAC/RLS e contratos no banco remoto.
- [ ] Conferência de schema/RLS no Supabase.
- [ ] Ajuste visual de estilos inline por blocos, com diff revisado.
- [ ] Type-check, lint, auditorias e build.
- [ ] Teste autenticado de inclusão/edição.
- [ ] Conferência visual desktop/tablet.
- [ ] Deploy do commit ajustado confirmado.

## GitHub e deploy
Commit de código: `11ed76170f394702e2fc6f1622dc43eb7f150b62`. Deploy desse commit ainda não confirmado. O projeto Supabase não apareceu na listagem do conector; não foi possível testar dados reais ou policies remotas.
