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
