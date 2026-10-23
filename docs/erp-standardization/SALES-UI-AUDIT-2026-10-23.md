# Auditoria incremental — Padronização visual de Vendas

- Data: 2026-10-23
- Revisão: REV-VENDAS-UI-001
- Branch: `feat/vendas-ui-standardization-20261023`
- Fonte: branch `main` do repositório oficial `plushbeauty/ERPSistemaIndustrial`
- Estado desta auditoria: **ALTERAÇÕES ESTÁTICAS REALIZADAS; CI E VALIDAÇÃO VISUAL PENDENTES**

## Escopo desta rodada

Alterações limitadas às páginas não congeladas:
- `src/pages/VendasPDV.tsx`
- `src/pages/VendasCatalogoDigital.tsx`
- `src/pages/VendasAnaliseCustos.tsx` (rota `/vendas/orcamentos` e alias `/vendas/analise-custos`)

Não foram alterados `VendasCentral.tsx`, `NovoPedido.tsx`, `ProdutosVendasIndustrial.tsx`, `VendasLayout.tsx`, shell global, contratos de autenticação ou arquivos de banco.

## Achados e correções

### PDV
- Controles de categoria, seleção de pagamento, quantidade e finalização foram alinhados à altura compacta de 30 px.
- Selects de caixa/cliente receberam altura, borda e tipografia explícitas; labels receberam estilo compacto.
- Mantida a altura mínima de 90 px dos cartões de produto.
- Preservados a leitura do contexto da empresa, as consultas filtradas por `empresa_id`, paginação, estoque, validações de carrinho e RPC `erp_pdv_finalizar_venda`.

### Catálogo Digital
- Controles de pesquisa, visualização, seleção e ações foram compactados para 30 px.
- Reduzido o espaçamento entre cartões da grade.
- Preservados os produtos reais, filtros, detalhes, consulta da BOM, seleção e compartilhamento.

### Orçamentos e Custos
- Campos, seletor de posto, entrada de tempo, anexo e botão de operação padronizados para 30 px.
- Cabeçalho da tabela alinhado a `slate-100`, labels compactas e linhas de dados de 32 px.
- Acrescentado nome acessível ao botão de remoção de operação.
- Preservados RPCs `erp_current_empresa_id`, `erp_listar_operacoes_orcamento`, `erp_calcular_custo_tecnico`, `erp_adicionar_operacao_orcamento`, `erp_remover_operacao_orcamento`, o cálculo de preço e o upload no Storage.

## Componentes compartilhados

- Reaproveitado o estilo local das páginas para evitar efeitos colaterais em outras rotas.
- `src/components/industrial/forms/industrialFormStyles.ts` foi inspecionado.
- `src/components/ui/industrial-base.tsx` não existe na `main`; há uma proposta separada no PR #210. Não foi criada uma cópia concorrente nem adicionada dependência à proposta ainda não integrada.

## Proteções

O verificador `scripts/verify-approved-ui-lock.mjs` foi inspecionado. As páginas protegidas de Vendas e os componentes globais permaneceram fora do escopo. Os arquivos editados não estão listados como telas congeladas no contrato consultado.

## Validação — estado honesto

- Revisão estática dos trechos de consulta, RPC, handlers e cálculo: **REALIZADA**; alterações pretendidas são de apresentação, com adição de `aria-label` no botão de remoção de operação.
- `npm run audit:ui-standardization`: **PENDENTE** de execução em ambiente de CI/checkout.
- `verify:auth-master-contract`, `verify-global-horizontal-shell`, `verify:approved-ui-lock`, `type-check`, `lint:check`, `audit:global`, `audit:brutal`, `audit:interactions`, `verify:lazy-imports`, `verify-routes` e `build`: **PENDENTES** até os resultados do workflow do PR.
- Inspeção visual autenticada e teste real de Supabase/RLS: **NÃO VERIFICADOS** nesta etapa.
- Preview/produção Vercel para o novo commit: **PENDENTE**.

O item geral UI-010 permanece aberto: esta entrega cobre somente três páginas não congeladas e não equivale à padronização completa do módulo de Vendas.
