# SYSNQRA ERP Industrial — Contrato Visual Canônico de Compras

**Status:** padrão técnico em implantação; requer validação visual pelo usuário antes de propagar para outros módulos.  
**Fonte de medidas:** `src/styles/compras-compact.css`.  
**Identidade da Central premium:** `src/pages/ComprasCentral.tsx` — manter o desenho navy, cards claros coloridos, abas horizontais e sombras suaves da referência Lovable.

## Medidas operacionais obrigatórias

| Componente | Contrato |
|---|---|
| Input / select | altura 30 px; fonte 11 px; padding horizontal 8 px; raio 6 px |
| Textarea | mínimo 58 px; fonte 11 px; padding 7 × 8 px; altura livre |
| Label | 9 px; linha 12 px; espaçamento entre label e controle 2–4 px; caixa alta |
| Botão operacional | altura mínima/nominal 30 px; fonte 11 px; raio 6 px |
| Linha de tabela | 30 px; fonte de célula 10 px; padding vertical 5 px e horizontal 8 px |
| Grid de formulário | gap 8 px; colunas com `minmax(0,1fr)`; campos com `min-width:0` e `width:100%` |
| Card operacional | raio 12 px; borda `#dbe3ec`; sombra sutil `0 3px 12px rgba(15,35,65,.045)` |
| Foco acessível | contorno azul `#1d5fd1`, sem deslocar o layout |
| Responsividade | duas colunas até 900 px; uma coluna até 620 px |
| Paleta de texto | principal `#102c4e`; secundário `#64748b`; fundo claro; status com badge semântica |

## Páginas do módulo abrangidas

- Central: `/compras`
- Requisições: `/compras/requisicoes`
- Pedido de cotação/RFQ: `/compras/rfq`
- Pedido de compra: `/compras/pedido`
- Fornecedores: `/compras/fornecedores`
- Recebimentos: `/compras/recebimentos`
- Análise de preços: `/compras/analise-precos`
- Relatórios: `/compras/relatorios`
- Solicitação manual/PCP: `/compras/solicitacao` e `/compras/solicitacao-manual`

## Regras para implementação

1. Usar os padrões compartilhados em `compras-compact.css`; não criar regras de altura/largura diferentes por página sem necessidade documentada.
2. Manter classes específicas de layout apenas para a estrutura de cada fluxo. Reutilizar o contrato de medidas para os campos, botões, tabelas, grids e cards.
3. A Central premium preserva o visual aprovado como referência; não aplicar sobre ela regras globais que quadrangulariam os cards ou diminuiriam as abas.
4. Não excluir páginas de negócio para reduzir duplicação. Consolidar os estilos/componentes compartilhados e migrar as páginas de forma controlada.
5. Não inventar registros, fornecedores, valores, indicadores ou alçadas. Usar dados reais do Supabase com isolamento por empresa e permissões existentes.
6. Preservar fluxos, rotas, RBAC/RLS, acessibilidade e comportamento dos formulários.
7. Validar TypeScript, lint, verificações de contrato, rotas e build. Não declarar pronto enquanto CI/Vercel não estiverem concluídos.
8. A migração para PCP, Qualidade, Estoque, Manutenção e demais módulos só começa depois da revisão e aprovação explícita da Central de Compras.

## Revisão

Esta é a referência única para medidas de controles e alinhamento do módulo Compras. Se uma tela ainda tiver CSS inline conflitante, migrar a regra para o padrão compartilhado e remover a duplicação somente após confirmar que nenhuma outra tela depende dela.
