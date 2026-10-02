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


## Decisões de fluxo comercial — 2026-10-02

### Entrada de pedido
A tela Novo Pedido deve concentrar somente a entrada comercial:
- Nº Pedido e Data;
- Cliente;
- Nome do Cliente;
- Vendedor;
- Entrada/Via;
- Data de entrega;
- Referência do cliente;
- Condição de pagamento;
- itens com Código Interno, Descrição, Cód. Cliente, Qtde, Unid., Valor unitário e Desconto %;
- análise de estoque/reserva/necessidade de produção;
- valor total do pedido;
- ações compactas: Novo, Gravar, Add Item, Deletar Item, Imprimir, Cancelar e Finalizar Pedido.

### Preço
Ao selecionar cliente + produto:
1. procurar preço específico na tabela comercial vinculada ao cliente;
2. se não existir preço específico, usar o preço padrão do produto;
3. carregar desconto percentual padrão do cliente quando existir;
4. permitir ajuste do desconto do item conforme as regras comerciais.

### Fora da entrada do pedido
Frete, transportadora e outras despesas não devem ocupar a tela de entrada quando ainda são definidos posteriormente no processo fiscal/logístico. O pedido registra a venda e o valor dos itens; documentos posteriores podem acrescentar os dados fiscais, transporte e faturamento conforme o fluxo real.

### Financeiro / comissão
A apuração de vendedor deve ser uma consulta própria do Financeiro/Comercial, com período inicial/final, vendedor, cliente, pedidos, faturamento, valor vendido e comissão calculada conforme regra cadastrada. A comissão não deve ser confundida com pagamento ao vendedor: o relatório apura o valor devido e o pagamento segue o processo financeiro/folha definido pela empresa.

### Carteira
/vendas/carteira é consulta de pedidos. Não deve possuir botão de Entrada de Pedido. A entrada ocorre somente em /vendas/novo-pedido.

### Impressão
O botão Imprimir da entrada abre filtro de relatório. O relatório deve separar Todos, Prontos, Pendentes e Produzindo quando esses estados existirem no banco. A saída deve possuir identificação da empresa/departamento e usuário responsável. Não criar logo de cliente fictício: usar somente logo efetivamente cadastrada quando existir infraestrutura para isso.

### Referências de processo
O padrão de Sales Order do ERPNext trata o pedido como registro central de cliente, itens, quantidade, preços, datas e termos, encaminhando posteriormente para entrega, faturamento, produção/compras quando necessário. Odoo também separa cotação/pedido de entrega/faturamento e possui preços, descontos e comissões em etapas próprias. Essas referências são usadas como orientação de arquitetura, não como cópia visual.
