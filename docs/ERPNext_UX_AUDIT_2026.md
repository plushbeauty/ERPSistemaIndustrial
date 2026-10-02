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
