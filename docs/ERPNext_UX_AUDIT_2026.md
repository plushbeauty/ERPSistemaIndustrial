# ERP Industrial — pente-fino UX baseado no ERPNext

## Fonte analisada

Arquivo recebido: `erpnext-develop(1).zip`.

A auditoria encontrou **645 DocTypes** no código ERPNext recebido. Isso não significa 645 páginas: DocType é uma definição de documento/formulário, que pode alimentar lista, formulário, relatórios e fluxos relacionados.

No ERP Industrial analisado no commit de referência existem **122 arquivos de página em `src/pages` e 122 declarações de Route em `src/AppEntryV2.tsx` (121 rotas únicas)**. Portanto o ERP atual não está limitado a ~20 páginas; o problema é principalmente organização, profundidade funcional e consistência visual.

## Números do ERPNext usados como referência

| Documento | Campos visíveis de dados | Seções | Larguras explícitas encontradas |
|---|---:|---:|---|
| Sales Order | 103 | 29 | 100px, 150px, 160px, 200px |
| Customer | 47 | 17 | padrão/flexível |
| Item | 77 | 21 | padrão/flexível |
| Purchase Order | 98 | 24 | padrão/flexível |
| Sales Invoice | 147 | 39 | padrão + larguras explícitas |
| Delivery Note | 106 | 26 | 100px, 150px, 200px |
| Stock Entry | 56 | 10 | padrão/flexível |

## Padrão que será implantado

O ERP Industrial não deve copiar literalmente os 103 campos de Sales Order para uma única tela. O padrão será:

1. Identificação e campos obrigatórios no topo.
2. Seções curtas, normalmente até 6 campos.
3. Campos relacionados lado a lado.
4. Campos longos ocupando 2–4 colunas.
5. Código, data, moeda e quantidade com largura controlada.
6. Tabelas de itens com edição inline.
7. Totais sempre próximos do final da tabela.
8. Informações secundárias em seções recolhíveis/abas.
9. Botões de ação em uma barra única, sem espalhamento.
10. Hierarquia tipográfica moderada: título 600, labels 500, texto 400; evitar 800/900 como padrão.

## Medidas-base

| Tipo | Largura |
|---|---:|
| Código curto | 160px |
| ID/quantidade pequena | 100px |
| Data | 150px |
| Moeda | 140px |
| Campo médio | 220px |
| Campo longo | 320px |
| Texto muito longo | 480px ou flexível |
| Controle padrão | 40px de altura |
| Controle compacto de tabela | 34px |
| Espaçamento de campos | 10px |
| Raio padrão de ERP | 4px |

## Sales Order — campos de referência

O Sales Order do ERPNext recebido possui, entre outros, identificação de série, cliente, empresa, data, entrega, pedido do cliente/data do pedido, endereço/contato, moeda, taxa de câmbio, tabela de preços, armazém, itens, regras de preço, totais, impostos, descontos, condições de pagamento, termos, projeto, equipe de vendas, comissão, centro de custo e informações adicionais.

No ERP Industrial, os campos serão distribuídos em blocos funcionais em vez de amontoados em uma única linha.

### Tela principal de pedido

**Bloco 1 — Identificação**
- Nº pedido (somente leitura)
- Data
- Tipo de pedido
- Cliente
- Empresa
- Pedido/referência do cliente
- Data do pedido do cliente
- Data de entrega prometida

**Bloco 2 — Comercial**
- Condição de pagamento
- Tabela de preço
- Moeda
- Taxa de câmbio
- Vendedor
- Território
- Centro de custo

**Bloco 3 — Endereço e contato**
- Endereço de cobrança
- Endereço de entrega
- Contato
- Telefone/e-mail

**Bloco 4 — Logística**
- Armazém de origem
- Modalidade de frete
- Transportadora
- Regra de frete
- Reserva de estoque

**Bloco 5 — Itens**
- Código
- Código do cliente
- Produto
- Descrição
- Quantidade
- Unidade
- Preço
- Desconto
- Total
- Estoque
- Disponível
- Necessidade líquida
- Destino PCP

**Bloco 6 — Totais**
- Subtotal
- Desconto
- Frete
- Outras despesas
- Impostos
- Total

**Bloco 7 — Observações/termos**
- Observações
- Termos e condições

## Lacunas funcionais a tratar

O ZIP revela que um ERP industrial completo precisa de mais profundidade em:

- CRM/pré-vendas: oportunidade, cotação, conversão para pedido.
- Vendas: pedido, entrega, faturamento, recebimento, preços, regras de preço.
- Compras: solicitação, cotação, pedido, recebimento e contas.
- Estoque: itens, depósitos, entradas/saídas, transferências, inventário, reservas.
- Financeiro: contas a receber/pagar, pagamentos, lançamentos, centros de custo.
- Fiscal: documentos, impostos e pendências.
- Manufatura: BOM, ordem de produção, planejamento, materiais e capacidade.
- Qualidade: inspeções, RNC, documentos, calibração e auditorias.
- Manutenção: ativos, ordens e preventiva.
- Projetos/serviços e conexões entre documentos.

Essas lacunas serão tratadas por fluxo e módulo, não copiando 645 DocTypes indiscriminadamente.

## Regra de implementação

O ERPNext será usado como **referência funcional e de ergonomia**. Não serão copiados para o ERP Industrial:
- backend Python/Frappe;
- banco MariaDB;
- autenticação do ERPNext;
- permissões do Frappe;
- código proprietário incompatível;
- dados fictícios.

Serão aproveitados como referência:
- sequência de campos;
- agrupamento por seção;
- tamanhos de controles;
- comportamento de tabelas;
- relação entre documentos;
- navegação operacional;
- padrões de lista/formulário/dashboard.

## Primeira implantação

A primeira tela tratada como padrão é:

`/vendas/novo-pedido`

Ela passa a ser a referência visual para os demais formulários do ERP Industrial. Depois dela, o mesmo padrão deve ser aplicado a clientes, produtos, compras, estoque, PCP, qualidade, fiscal e financeiro.

## Critério de aceite

Uma tela só será considerada padronizada quando:
- não tiver campos espremidos;
- não usar peso 800/900 como texto normal;
- tiver campos com largura coerente com o conteúdo;
- mantiver alinhamento consistente;
- tiver ações em posição previsível;
- separar dados principais de dados avançados;
- funcionar em 1366/1440/1920 e tablet;
- continuar usando dados reais do tenant;
- passar type-check/lint/build.


## Pente-fino de cobertura de documentos

Na análise das 119 rotas protegidas/publicadas do ERP Industrial, os principais fluxos já presentes incluem vendas, compras, estoque, produtos, fornecedores, PCP, engenharia, qualidade, fiscal e manutenção.

### Fluxos que precisam ganhar telas próprias ou aprofundamento

| Fluxo ERP | Situação encontrada | Próxima implementação |
|---|---|---|
| Cotação de vendas | sem rota dedicada encontrada | Criar Cotação → Pedido |
| Pedido de venda | existe | Usar como formulário mestre visual |
| Entrega/expedição | existe | Conectar pedido → expedição → confirmação |
| NF-e | existe | Integrar com carteira e pedido |
| Pedido de compra | existe | Padronizar formulário |
| Recebimento de compra | existe parcialmente | Criar fluxo documento → conferência → estoque |
| Produtos/itens | existe | Padronizar cadastro mestre |
| Fornecedores | existe | Padronizar cadastro mestre |
| BOM/ficha | existe | Padronizar engenharia |
| Ordem de produção | existe dentro do PCP | Separar documento, materiais e execução |
| Qualidade | ampla cobertura | Padronizar formulários |
| Contas a pagar | sem rota dedicada encontrada | Criar módulo financeiro |
| Contas a receber | sem rota dedicada encontrada | Criar módulo financeiro |
| Lançamento contábil | sem rota dedicada encontrada | Criar documento financeiro |
| Pagamentos | sem rota dedicada encontrada | Criar fluxo de pagamento |
| Preços | existe | Evoluir tabela/regra/preço por cliente |

### Ordem de implantação

**Fase 1 — Formulário mestre**
- Pedido de Venda
- Cliente
- Produto
- Fornecedor
- Pedido de Compra

**Fase 2 — Documentos encadeados**
- Cotação
- Pedido
- Reserva
- Expedição/Entrega
- NF-e
- Recebimento

**Fase 3 — Estoque/PCP**
- Entrada
- Saída
- Transferência
- Inventário
- Reserva
- Necessidade líquida
- OP

**Fase 4 — Financeiro**
- Contas a receber
- Contas a pagar
- Pagamentos
- Lançamentos
- Fluxo de caixa
- Centro de custo

**Fase 5 — Qualidade/Engenharia/Manutenção**
- formulários e documentos no mesmo padrão visual.

O objetivo não é aumentar artificialmente o número de páginas. Cada tela nova precisa representar um documento, uma tarefa operacional ou uma consulta que tenha função real no fluxo.

## Validação da implantação visual atual

A branch `feat-erp-global-forms-ux-v2` contém:
- camada global `erp-ux-root`;
- normalização de peso tipográfico;
- alturas de controles;
- classes de largura semântica;
- grade de formulário de 12 colunas;
- padrão de seções;
- barra de ações;
- primeiro formulário real migrado: Pedido de Venda.

A tela de Pedido de Venda foi ajustada sem alterar a RPC de gravação, o fluxo de reserva de estoque ou a geração de necessidade para PCP.


## Regra definitiva — Pedido de Venda x Expedição

A pesquisa comparativa confirmou a separação operacional:

**Cotação → Pedido de Venda → Reserva/Preparação → Expedição/Entrega → NF/Faturamento → Pagamento.**

O Odoo permite adicionar método/custo de entrega ao pedido quando isso fizer parte do processo, mas a **transportadora** pode ser definida no Delivery Order. ERPNext também separa Sales Order, Delivery Note e Shipment.

### Pedido de Venda

Campos principais:
- Nº do pedido;
- data de entrada;
- cliente;
- documento do cliente (somente leitura);
- data prometida;
- referência/pedido do cliente;
- condição de pagamento;
- vendedor;
- itens;
- desconto;
- observações.

Não colocar como campos obrigatórios nesta etapa:
- transportadora;
- motorista;
- placa;
- rastreio;
- romaneio;
- peso de expedição;
- liberação de portaria.

Esses dados pertencem ao fluxo de Expedição/Entrega.

### Expedição

Campos/ações esperados:
- pedido/NF de origem;
- separação;
- conferência;
- volumes;
- peso;
- transportadora;
- motorista;
- veículo/placa;
- romaneio;
- rastreio;
- data de expedição;
- liberação da saída.

### Regra dos botões

Não colocar todos os botões em todas as telas.

**Lista:**
- Novo;
- Filtrar;
- Imprimir;
- Atualizar;
- Abrir.

**Formulário de pedido:**
- Novo/limpar;
- Adicionar item;
- Remover item;
- Imprimir;
- Cancelar;
- Confirmar/finalizar.

**Não usar Excluir para pedido confirmado.** Documento comercial deve ter cancelamento/estorno conforme estado e permissão. Exclusão física não será criada apenas para imitar um botão Delphi.

### Padrão de ação rápida

Ações secundárias devem ser ícones compactos de aproximadamente 30–32px, com `title`/tooltip explicativo.

Exemplos:
- + = Novo/Adicionar;
- lupa = Consultar;
- lápis = Editar, somente quando a operação realmente permitir edição;
- lixeira = Remover linha ainda não gravada ou operação explicitamente permitida;
- impressora = Imprimir;
- filtro = Filtrar;
- atualizar = Recarregar.

Depois de adicionar um produto, o foco deve voltar automaticamente ao campo de código/produto para permitir digitação contínua sem uso do mouse.

Esse comportamento é inspirado no fluxo operacional de ERP desktop/Delphi e no modelo de linhas de pedido do Odoo, que coloca a ação de adicionar produto diretamente na área das linhas e permite remover uma linha individualmente.
