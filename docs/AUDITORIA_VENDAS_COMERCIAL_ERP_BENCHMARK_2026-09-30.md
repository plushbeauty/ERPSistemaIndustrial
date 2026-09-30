# Auditoria Master — ERP Industrial — Vendas & Comercial
Data: 2026-09-30
Branch: feat/vendas-comercial-dimensoes-erp

## Regra aplicada
As referências enviadas pelo produto são a especificação visual/funcional. As referências de mercado servem para levantar campos, estados, regras e relacionamentos; não são copiadas.

## Evidência pesquisada
- ERPNext Price Lists / Item Price: múltiplas listas, moeda, UOM, quantidade mínima, validade, cliente/fornecedor específico e regras de preço.
- ERPNext Pricing Rule: quantidade mínima/máxima, valor mínimo/máximo, validade, empresa, moeda, prioridade, escopo por item/grupo/cliente e resultado por preço/desconto/margem.
- ERPNext Customer: grupo, território, moeda, tabela de preço, condição de pagamento, crédito, endereços e contatos vinculados.
- ERPNext Sales Order: empresa, cliente, tipo, datas, referência do cliente, moeda, tabela, câmbio, endereço de faturamento/entrega, contato, impostos, frete, condição de pagamento, termos, estoque e status de entrega/faturamento.
- Odoo product.pricelist.item: empresa, moeda, datas, quantidade mínima, produto/categoria/global, UOM, base de preço, tabela base, desconto, arredondamento, taxa extra e limites de margem.
- Odoo sale.order: empresa, cliente, referência do cliente, entrega prometida, validade, endereços, posição fiscal, condição de pagamento, método de pagamento, tabela, moeda/câmbio, vendedor, equipe, Incoterm, linhas e totais.
- SAP Business One: listas de preço por item/UOM/moeda, preços especiais por parceiro com validade e quantidade, condições de pagamento ligadas à lista e limite de crédito.

## Matriz atual

| Tela | Referência do usuário | Implementação atual | Gaps encontrados |
|---|---|---|---|
| Dashboard Comercial | SIM | Existe | Fluxo principal coberto; precisa validar origem da meta e datas/requests reais em ambiente conectado |
| CRM/Pipeline | SIM | Existe | Falta edição estruturada de probabilidade/responsável/próxima ação e tela/form de motivo de perda; usa prompt() |
| Clientes | SIM | Existe | INCOMPLETA: código ainda digitável; faltam Dados Fiscais completos, endereço persistente, logística, crédito/financeiro completo, contatos CRUD, WhatsApp, histórico e consulta CNPJ configurável |
| Tabelas de Preço | SIM | Corrigida/expandida nesta execução | Banco agora prevê parâmetros comerciais e regras de volume; ainda precisa validação live da migration/RLS e regra completa de aplicação do preço na transação |
| Propostas/Orçamentos | SIM | Existe | Falta estrutura fiscal/impostos completa, contatos vinculados como entidade, condições estruturadas, aprovação/status completo e PDF empresarial real |
| Pedidos de Venda | SIM | Existe | Faltam vários campos de ordem ERP: empresa/filial, endereço faturamento/entrega, contato, moeda/câmbio, referência PO cliente, condição estruturada, vendedor/equipe, frete/incoterm, impostos e estados de entrega/faturamento; ações atuais são navegação e não execução completa |
| Faturamento/NF-e | SIM | Parcial | Falta tela completa de fila, filtros, validação fiscal, transmissão/retorno SEFAZ, geração de títulos e baixa de estoque como operação integrada |
| Expedição/Romaneio | SIM | Parcial | Falta tela completa de transportadora/veículo/motorista, volumes, leitura/conferência e documentos de transporte; integração existe em migration mas central mostra apenas resumo |
| Comissões | SIM | Parcial | Falta seleção por período/vendedor/regra/base, detalhamento por venda/NF/recebimento e fluxo AP por responsável |
| RMA/Devoluções | SIM | Parcial | Falta NF-e original, itens da devolução, quantidades/valores, inspeção SGQ, fiscal/estoque/financeiro e refund/crédito transacional completo |
| Carteira/Metas/Relatórios | SIM por rotas existentes | Existem páginas separadas | Precisam ser comparadas com o fluxo comercial canônico para eliminar divergências e duplicidade funcional |

## Duplicidades de rota encontradas
- /vendas/clientes → VendasComercialSuite
- /clientes → ClientesIndustrial
- /vendas/precos → VendasComercialSuite
- /tabela-precos e /tabelas-preco → TabelaPrecos
- /vendas/pedidos → VendasComercialSuite
- /vendas/novo-pedido → PedidoVendaCompleto

Essas rotas não devem ser consideradas equivalentes sem comparar seus fluxos. A próxima etapa deve definir a tela canônica por operação e eliminar divergência sem criar uma terceira versão.

## Banco: constatações
- erp_tabelas_preco já possuía validade/margem e recebeu campos comerciais adicionais nesta execução.
- Foi criada migration para regras de volume por tabela, com quantidade mínima/máxima, desconto, validade, prioridade, produto opcional e RLS por empresa.
- As migrations de Vendas já possuem CRM, orçamentos, RMA, crédito de pedido, reserva/PCP, expedição, comissões e tratamento SGQ.
- O ambiente conectado do Supabase não está disponível nesta sessão; portanto, aplicação real das migrations, RLS e respostas 400/404 não pode ser declarada como validada live.

## P0 corrigido nesta execução
O erro estrutural de TSX que estava na região da tela de preços foi corrigido e a chamada de Orcamentos passou a receber as props reais de preços/produtos.

## Pendências obrigatórias antes de GREEN
1. Confirmar build da branch após os commits desta execução.
2. Executar type-check e lint.
3. Aplicar/validar migrations no Supabase conectado.
4. Eliminar os 400/404 de schema/objetos reportados anteriormente.
5. Completar Clientes, Pedidos, Faturamento, Expedição, Comissões e RMA segundo a matriz.
6. Remover prompt()/alert() como operações de negócio.
7. Fazer QA desktop/tablet/mobile e validar os assets de icones tablet.
8. Comparar as telas canônicas contra o Design System único e as referências enviadas.
9. Só declarar GREEN quando os erros e requests estiverem explicados e testados.