# Auditoria de UI — Compras/Suprimentos

- Data: 2026-10-18
- Revisão: COMPRAS-UI-R2
- Branch: `fix/compras-ui-standardization-2026-10-18`
- Escopo: padronização visual e correções pontuais das telas do módulo Compras.
- Status: **em validação; não marcar como concluído antes do CI, build e inspeção visual**.

## Referências usadas

- Diretriz interna: [Referência Mestre de UI](../erp-standardization/REFERENCE.md), revisão UI-REF-R1.
- SAP Fiori — [Content Density (Cozy and Compact)](https://www.sap.com/design-system/fiori-design-web/v1-145/foundations/visual/cozy-compact): usa modo compacto para desktop e recomenda consistência de densidade dentro da mesma hierarquia; informa que linhas e toolbars podem usar 32 px.
- IBM Carbon — [Data Table](https://v10.carbondesignsystem.com/components/data-table/style/) e [uso de Data Table](https://github.com/carbon-design-system/carbon-website/blob/main/src/pages/components/data-table/usage.mdx): hierarquia clara de cabeçalho/linhas, estados de foco e hover, densidade coerente, barra de ações e paginação.
- IBM Carbon — [Forms](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms): rótulos claros, ordem previsível, agrupamento de tarefas e ajuda contextual.
- Nenhum código externo foi copiado; as referências foram aplicadas como princípios de densidade, consistência e acessibilidade.

## Alterações nesta branch

- `src/styles/compras-compact.css`: consolida controles operacionais em 32 px, radius 2 px, tipografia compacta, espaçamento e responsividade; inclui ajustes para RFQ, relatórios, ajuda, tabelas e mensagens.
- `src/pages/ComprasIndustrial.tsx`: erros de carregamento/gravação passam a usar região `role="alert"`; confirmações usam `role="status"`, sem apresentar falhas com a cor de sucesso.
- `src/pages/ComprasRFQ.tsx`: remove bloco de CSS duplicado e usa a atualização de dados do componente em vez de recarregar toda a página.
- `src/pages/ComprasRelatorios.tsx`: mensagens de erro/sucesso recebem role semântico e estilo compacto.
- `src/pages/ComprasAjuda.tsx`: compacta cabeçalho, cartões e espaçamento.
- `src/pages/FiscalCompras.tsx`: usa `fetchAllPages` nas consultas de pedidos e fornecedores para não depender apenas da primeira página de resultados.
- Rotas de Compras envolvidas verificadas estaticamente em `src/AppEntryV2.tsx`; o wrapper `ComprasRoute` envolve Compras, requisições, recebimentos, RFQ, pedido/ordem, fornecedores, solicitação manual, análise de preços, relatórios, ajuda e validação fiscal.

## Preservação

- Nenhuma tela identificada como congelada/aprovada foi editada.
- Não foram alterados schemas, migrations, RPCs, autenticação, RBAC, políticas RLS, cálculos de compra ou regras fiscais.
- A tela de ordem de compra permanece apontada pela rota existente; não houve troca de rotas neste ajuste.

## Verificações ainda obrigatórias

- [ ] Type-check.
- [ ] Lint.
- [ ] `audit:global`, `audit:brutal`, `audit:interactions`.
- [ ] `verify:approved-ui-lock` e `verify:approved-ui-contract`.
- [ ] `verify:lazy-imports` e `verify-routes`.
- [ ] Build oficial `npm run build:vercel`.
- [ ] Conferência visual em desktop e tablet nas rotas principais.
- [ ] Confirmar deployment Vercel para o SHA final e identificar se é preview ou produção.

## Limitações

Esta é uma alteração de código e uma auditoria estática inicial. Até que as verificações acima terminem, não há declaração de build verde, comportamento visual validado no navegador ou publicação em produção. O item UI-030 continua aberto até haver evidência suficiente.
