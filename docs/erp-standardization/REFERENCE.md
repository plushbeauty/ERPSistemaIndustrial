# Referência Mestre de UI — ERP Industrial

- Data: 2026-10-16
- Revisão: UI-REF-R1
- Referência interna: Vendas > Novo Pedido, somente como referência visual; não alterar seu status de aprovação.
- Referência externa analisada: Carbon ERP, https://github.com/crbnos/carbon e https://docs.carbon.ms/docs/building/architecture.

## Regras de geometria

1. Controles de formulário padrão: altura 32 px (h-8), salvo exceção funcional documentada.
2. Rótulos consistentes: 9–11 px, preferencialmente uppercase, alinhados e com espaçamento uniforme.
3. Largura definida pela função: código/quantidade estreitos; descrição/nome flexíveis; datas, unidades, valores e identificadores com larguras coerentes entre campos equivalentes. Não forçar a mesma largura para campos diferentes.
4. Grid responsivo explícito, filhos flexíveis com min-w-0, sem largura fixa que provoque corte ou sobreposição; manter alinhamento das colunas.
5. Lupa/lookup acoplada ao campo correspondente, na mesma linha e com altura alinhada.
6. Botões operacionais alinhados, 32 px por padrão, radius 2 px, hierarquia visual consistente; ação principal azul #2D8DB8, texto legível e foco/disabled visíveis.
7. Cards, abas, grids, tabelas, mensagens, modais e impressão devem seguir o padrão do módulo aprovado sem blocos decorativos que desloquem campos.
8. Obrigatoriedade, erro de validação e foco devem ser consistentes; não remover validações para resolver geometria.
9. Não alterar schema, RPC, RLS, autenticação, persistência, regras fiscais ou aprovações numa correção exclusivamente visual.
10. Tela aprovada/imutável não pode ser alterada sem autorização explícita. Usar como referência, não como alvo automático.

## Tokens atuais identificados

Arquivo: src/components/industrial/forms/industrialFormStyles.ts

- fieldClass: controle com altura 32 px e cantos 2 px.
- labelClass: rótulo compartilhado.
- sectionTitle: título de seção.
- cardLayout: cartão de formulário.

A existência desses tokens não significa que todas as páginas os utilizem. A auditoria automática encontra candidatos; cada divergência exige conferência no componente real e, quando possível, na tela renderizada.

## Matriz a registrar por tela/aba

Rota real, arquivo renderizado, módulo/aba, campos em ordem de leitura, altura, largura fixa/flexível, tipo, maxLength quando existente, lookup associado, cards/seções, cores, grid, ações, validação, impressão e estado de aprovação. Comparar campos equivalentes por função, não só pelo nome da classe.

## Critério para concluir uma tela

- Geometria conferida em todas as abas.
- Campos e botões alinhados, sem sobreposição, corte ou espaçamento irregular.
- Larguras coerentes com o conteúdo e com campos equivalentes.
- Lookups, selects, datas, grids e ações alinhados.
- Fluxo real de consulta/gravação/validação preservado.
- type-check, lint, auditorias aplicáveis e build executados; resultados registrados sem declarar sucesso não verificado.
- Evidência da rota/tela conferida; somente então retirar do backlog e registrar em COMPLETED.md.


## Comparação real de componente — Cadastro de Produtos (2026-10-16)

- Correção complementar no commit `f441ef37c76d3f3f024228b20d549c7e0632b63d`: largura de `edit-20` ajustada de 22ch para 20ch; CEST alinhado a 7 caracteres entre classe e limite de texto.
- Relatório de rotas/componentes: [ROUTE-AUDIT-2026-10-16.md](./ROUTE-AUDIT-2026-10-16.md). Contagem estática: 248 declarações de rota, 156 imports dinâmicos e 11 rotas que usam `IndustrialDataWorkspace`. A contagem não substitui teste de navegação.

**Tela auditada:** `src/pages/ProdutosVendasIndustrial.tsx` (rota `/produtos` e alias `/produtos-vendas`). A tela está aprovada no cabeçalho do próprio arquivo, mas a autorização explícita do usuário nesta conversa permitiu corrigir apenas a geometria e os limites dos campos abaixo. Não alterar CRUD, Supabase, cálculos de custo, regras fiscais, abas ou impressão neste ajuste.

**Fonte aberta consultada:** Carbon ERP, arquivos reais:
- [JobProperties.tsx](https://github.com/crbnos/carbon/blob/main/apps/erp/app/modules/production/ui/Jobs/JobProperties.tsx) — compõe campos com `InputControlled` e `NumberControlled`, usa tamanhos semânticos (`size="sm"`) e agrupa os controles num painel de largura definida; a edição envia a alteração pelo fluxo de ação, não por campos visualmente superdimensionados.
- [QuantityModal.tsx](https://github.com/crbnos/carbon/blob/main/apps/mes/app/components/JobOperation/components/QuantityModal.tsx) — quantidade usa `NumberControlled`, mínimo 0 e formato com no máximo 2 casas decimais; campo e ação “Complete All” ficam alinhados numa linha flexível.
- O Carbon é referência de composição e comportamento, não um arquivo para copiar integralmente: sua licença declarada é AGPL-3.0-only. Reutilizar os princípios de design; manter a arquitetura e os contratos existentes do ERP.

**Problemas encontrados no código antes do ajuste:**
- Classe `edit-14` fixava largura de 16ch mesmo em campos numéricos curtos.
- O limite padrão de texto era 60 caracteres e campos longos chegavam a 120.
- Campos `type="number"` não tinham limite de comprimento de entrada aplicado pelo manipulador.

**Ajuste aplicado no commit `6905e28c764bf8fa9145a39c4b0a8d8f03d1dc6b`:**
- Quantidades e prazos selecionados usam largura compacta de 9ch; preços e custos, 12ch; a classe numérica genérica `edit-14` foi reduzida de 16ch para 12ch.
- O limite padrão de texto passou a 50 caracteres, mantendo os limites específicos menores para códigos fiscais/unidades; combos de classificação, grupo/subgrupo e pesquisa também têm limite de 50.
- A entrada numérica ignora valores digitados com mais de 14 caracteres.
- Commits do ajuste: `6905e28c764bf8fa9145a39c4b0a8d8f03d1dc6b` e `5e6939b74f5623fd1658c85d92ab496b47707e65`.
- O ajuste ainda precisa de type-check/build e inspeção visual real. Portanto, UI-020 continua pendente e esta tela **não** deve ser movida para COMPLETED até haver essas evidências.
