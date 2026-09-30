# ERP Industrial — Contrato Visual Global 2026

Este documento é a fonte de verdade para dimensões, proporções e densidade visual de todas as telas do ERP Industrial.

## Regra central

Qualquer melhoria dimensional ou visual aprovada durante a construção de uma tela deve ser incorporada ao Design System central e passa a ser padrão global do ERP. Nenhuma tela futura pode recriar a mesma regra localmente com medidas diferentes.

## Escala base

- Controle padrão desktop: 42px.
- Campo de formulário: 14px.
- Label: 12px.
- Tabela: 13px.
- Linha de tabela: 40px.
- Cabeçalho de tabela: 38px.
- Título principal: 28px.
- Toolbar: 40px.
- Tablet: controles 48px, texto de campo 16px e linhas de tabela 48px.

## Larguras semânticas

- UF: 70px.
- Código: 110px.
- CEP: 120px.
- CNPJ/CPF: 170px.
- Data: 125px.
- Percentual: 100px.
- Quantidade: 100px.
- Valor monetário: 155px.
- Nome: até 360px.
- Descrição: até 520px.
- Observação: até 760px, multiline.

Essas larguras representam o conteúdo esperado, não um convite para preencher toda a tela.

## Regras de composição

1. Planejar a grade antes de implementar.
2. Agrupar campos relacionados na mesma linha.
3. O tamanho do campo deve acompanhar o tipo de dado.
4. Label, campo, ícone e botão devem possuir escala proporcional.
5. Tabelas devem dimensionar colunas pelo conteúdo.
6. KPI deve ser compacto e crescer somente quando o conteúdo justificar.
7. Ícones nunca devem ocupar uma linha inteira.
8. Botões de ação não podem virar cards.
9. Não usar `w-full`, `min-h` ou larguras arbitrárias apenas para preencher espaço.
10. Não criar CSS local quando a regra pertence ao Design System.
11. Reutilizar componentes e tokens existentes antes de criar novos.
12. Desktop, tablet e mobile devem preservar a hierarquia e a proporção do ERP.

## Vendas & Comercial

Fluxo oficial:

CRM → Proposta/Orçamento → Pedido → Crédito → Estoque/PCP → Faturamento/NF-e → Financeiro → Expedição → Comissão → Devolução/RMA.

As telas devem usar dados reais da empresa autenticada. Estados vazios devem informar ausência de registros; nunca criar números, clientes, produtos, pedidos ou NF-e fictícios.

## Gate visual

Antes de considerar uma tela concluída:

- comparar com as telas aprovadas do ERP;
- verificar escala de título, labels, campos, botões e ícones;
- verificar alinhamento e espaçamento;
- verificar densidade de tabela;
- verificar 1366/1440/1920;
- verificar tablet e mobile;
- eliminar qualquer segunda escala visual.

## Gate técnico

Uma tela somente pode ser marcada como GREEN após:

- type-check;
- lint;
- build;
- testes relevantes;
- validação visual;
- confirmação de que nenhuma integração real foi substituída por mock.


## Vendas — regras funcionais consolidadas

- O Dashboard Comercial deve aplicar o período selecionado aos indicadores derivados de documentos fiscais e pedidos, sem apresentar totais de outro período como se fossem do filtro atual.
- CRM/Pipeline utiliza as seis etapas oficiais e permite mover uma oportunidade entre colunas; a mudança de etapa deve persistir no banco da empresa atual. Para **PERDIDO**, o motivo é obrigatório.
- Orçamentos são rascunhos até possuírem itens reais. Produto, quantidade e preço devem ser gravados em `erp_vendas_orcamentos_itens`; o total do orçamento é recalculado a partir desses itens. A conversão para pedido só pode ocorrer quando houver itens e deve usar a função transacional do ERP.
- Catálogos e consultas comerciais devem filtrar explicitamente `empresa_id` sempre que a origem disponibilizar esse campo, além da proteção RLS.
- Estados vazios devem explicar a ausência de dados reais; não preencher a interface com registros demonstrativos.


## Vendas — fechamento funcional 2026-09-30

- Crédito: pedidos devem passar pela função central de análise de limite antes do faturamento; bloqueios e motivo ficam persistidos no pedido.
- PCP: necessidade líquida do pedido é calculada no banco e a OP é vinculada ao item do pedido, impedindo duplicidade.
- Expedição: liberação deve passar pela conferência de volumes; divergência mantém a saída bloqueada.
- Comissões: lançamentos podem gerar títulos reais em Contas a Pagar pela função transacional do ERP.
- RMA: tratamento SGQ é persistido e mantém os estados fiscal, estoque e financeiro explícitos; nenhum crédito financeiro é inventado pela interface.
- Tabelas de preço: reajuste em lote usa função central, tenant atual e proteção contra preço abaixo do custo/margem mínima.
- Orçamento: impressão gera documento comercial formatado a partir dos itens reais; conversão para pedido usa função transacional.
