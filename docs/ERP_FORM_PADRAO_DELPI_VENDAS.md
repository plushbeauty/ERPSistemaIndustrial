# Padrão Global de Formulários ERP Industrial — Delphi moderno

## Fonte de referência
A tela **Vendas > Novo Pedido** é o protótipo visual/funcional de referência para as demais telas do ERP Industrial.

## Regras consolidadas
- Campos compactos, próximos entre si e sem espaçamento excessivo.
- Altura padrão dos edits compactos: aproximadamente 26px.
- Largura do edit acompanha o dado: códigos e números curtos não ocupam colunas largas; descrições e nomes recebem mais espaço.
- Labels simples, sem negrito exagerado e sem textos auxiliares desnecessários.
- Lookup de código usa o padrão compacto: edit curto + botão de consulta ao lado.
- Datas, número do documento e valores seguem a mesma altura visual do edit de Nº Pedido.
- Botões ficam em uma única barra quando houver ações relacionadas, com ícone + texto curto e tamanho compacto.
- Não usar barras enormes para uma única ação.
- Evitar mensagens explicativas dentro do formulário quando não são necessárias para executar a operação.
- Totalizadores devem ser calculados em tempo real conforme os itens são lançados.
- O número do pedido permanece visível durante o lançamento e a gravação definitiva ocorre somente em **FINALIZAR PEDIDO**.
- Ao finalizar, o fluxo deve validar estoque real, reservar o disponível e gerar/enviar somente a necessidade líquida para produção/PCP quando houver falta.
- Política comercial do cliente deve ser aproveitada automaticamente quando existir no cadastro, incluindo tabela de preço e desconto padrão percentual.
- Campos que não pertencem ao processo não devem ocupar espaço reservado na tela.
- O padrão deve ser reutilizado nas próximas telas sem criar layouts isolados incompatíveis.

## Vendas — campos/ações consolidados
- Nº Pedido
- Data Entrada
- Código Cliente
- Nome do Cliente
- Vendedor
- Entrada | Via
- Data Entrega
- Pedido / Referência Cliente
- Condição de Pagamento
- Código Interno
- Cód. Cliente
- Quantidade
- Valor unitário
- Desconto %
- Adicionar item
- Itens lançados com análise de estoque/reserva
- Desconto do pedido
- Frete
- Outras despesas
- Observações
- Total
- Imprimir
- Novo item
- Cancelar
- Finalizar pedido

## Regra de implementação
Antes de criar ou reformar outra tela, verificar este padrão e reaproveitar o mesmo sistema de grid, alturas, espaçamentos, lookup compacto e barra de ações. O objetivo é manter o ERP visualmente consistente como um sistema empresarial tradicional/Delphi moderno.
