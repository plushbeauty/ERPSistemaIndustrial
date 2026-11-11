# UI-003 — Medição de referência: Vendas > Novo Pedido

- Data: 2026-11-11
- Branch: `integration/solicitacoes-telas-20261111`
- Arquivo: `src/pages/NovoPedido.tsx`
- Blob do arquivo: `ae54c4c2c4660fe9660db74efd0c2c4ae85302d3`
- Manifesto oficial: `scripts/telas-oficiais-manifest.json`, blob `a537b3c75cd25a8bc1976792f2281b5af5371e27`
- O SHA do arquivo confere exatamente com a entrada do manifesto oficial; a tela permanece congelada e não foi modificada.

## Medição declarada no código

| Elemento | Quantidade / geometria |
|---|---|
| Inputs | 19 |
| Selects | 6 |
| Botões | 17 |
| Tabelas | 1 |
| Seções principais | 6 |
| Grids responsivos | 7 ocorrências de `md:grid-cols-4` |
| Abas | Nenhuma ocorrência de TabsTrigger, TabsContent ou role=tab |
| Impressão | 1 chamada a `window.print()` |
| Referências a `inputStyle` | 36 |
| Referências a `buttonStyle` | 4 |

### Geometria

- `inputStyle`: `h-[30px]`, largura `w-full min-w-0`, radius 2px, texto 10px.
- `buttonStyle`: altura 30px, texto 10px.
- `labelStyle`: 9px, uppercase, tracking wider.
- Ações principais da barra superior: botões `h-8` (32px).
- Lookups de cliente/produto/transportadora: botões `h-8 w-8` (32×32px).
- Grade de itens: cabeçalho `h-9` (36px), linhas `h-10` (40px); colunas de quantidade, preço, desconto, total e margem usam alinhamento à direita e `tabular-nums`.
- Layout: cliente e dados do pedido dividem duas colunas cada; logística e itens ocupam quatro colunas; informações adicionais e resumo dividem duas colunas cada.
- Seções: Dados do Cliente; Dados do Pedido; Entrega e Logística; Itens do Pedido; Informações Adicionais; Resumo do Pedido.
- Cores observadas no código: títulos de seção `#2D8DB8`; controles com borda slate; ações principais blue-600; estados de erro vermelho e sucesso esmeralda.

## Impressão

- A tela possui botão local que chama `window.print()`; não foi encontrado componente de relatório dedicado em NovoPedido.
- `VendasLayout.tsx` não declara regras próprias de impressão.
- O CSS global `src/styles/index.css` contém baseline `@media print`: A4 com margem 12mm, esconde shell/menus/botões e campos button/submit, repete cabeçalho de tabela, evita quebra dentro de linhas/imagens/SVGs e libera overflow.
- Não foi encontrada regra local `@media print` em NovoPedido ou VendasLayout.

## Exceção e preservação

A tela aprovada declara controles principais de 30px, enquanto a referência geral usa 32px como padrão. Esta diferença fica registrada como exceção da tela congelada; não padronizar automaticamente para 32px nem alterar o layout sem autorização explícita e nova revisão do hash.

## Limite da medição

Esta é uma medição estática de classes e markup. Não comprova dimensões renderizadas, alinhamento real, responsividade em 1440px/tablet, quebra de página efetiva ou comportamento de impressão no navegador. Não houve screenshot nem teste visual autenticado nesta rodada.

**Status:** medição de código registrada; UI-003 permanece pendente até conferência visual no Preview/navegador, preservando o arquivo aprovado.
