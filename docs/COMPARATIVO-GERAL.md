# COMPARATIVO GERAL — SYSNQRA ERP INDUSTRIAL

**Documento único de auditoria funcional, técnica e de cobertura de telas.**  
**Regra:** cada módulo será acrescentado neste arquivo por tópicos. Não criar arquivos de auditoria separados por módulo.  
**Método:** comparar código-fonte e fluxos de ERPs de referência com as páginas, rotas, contratos Supabase/RLS/RPC e migrations reais do SYSNQRA; registrar inventário, lacunas, prioridades, critérios de aceite e situação da correção.  
**Preservação:** não alterar dimensões ou visual de telas aprovadas, não reativar páginas antigas, não apagar rotas sem mapear dependências e não inventar dados ou contratos.  
**Limpeza:** ao concluir o programa de auditoria, remover arquivos temporários/duplicados de comparação, mantendo este documento geral e os artefatos funcionais necessários ao sistema.

## Índice
- [1. Compras](#1-compras)
- [2. Próximos módulos](#2-próximos-módulos)
- [3. Regras gerais de implementação e validação](#3-regras-gerais-de-implementação-e-validação)

## 1. Compras

# Comparativo de telas — Módulo Compras SYSNQRA

**Revisão:** REV-COMPRAS-COMPARATIVO-20261110-01  
**Data:** 10/11/2026  
**Base SYSNQRA:** `main` — `e509cf634f155cb41c0c8a6d05364fe8f71f7d33`  
**Referências open source:** ERPNext (Frappe) e Dolibarr  
**Objetivo:** estabelecer o inventário de referência, comparar as telas reais do SYSNQRA e registrar lacunas verificáveis antes de alterar UI ou banco.

> Contagens de controles no código SYSNQRA são contagens estáticas de elementos JSX. Não equivalem necessariamente a campos renderizados em todas as condições. Contagens ERPNext vêm dos metadados DocType no branch `develop`, incluindo campos condicionais e campos de leitura/cálculo; servem como inventário funcional, não como número obrigatório de inputs visíveis simultaneamente.

## 1. Fluxo de referência de compras industriais

O fluxo completo que deve ser coberto, com variantes conforme o tipo de compra:

1. Necessidade interna / MRP / PCP → Requisição de Material ou Compra.
2. Requisição aprovada → Solicitação de cotação (RFQ).
3. RFQ enviada a vários fornecedores → respostas independentes por fornecedor e por item.
4. Comparação comercial e técnica → escolha justificada e aprovada.
5. Pedido de compra → aprovação por alçada → envio ao fornecedor.
6. Recebimento físico parcial/total → conferência quantitativa, qualitativa e fiscal.
7. Nota fiscal de entrada / fatura do fornecedor → conferência com pedido e recebimento (three-way match).
8. Contas a pagar → vencimentos, adiantamentos, pagamento e conciliação.
9. Histórico do fornecedor → desempenho, qualidade, prazo, preço, certificados e ocorrências.

ERPNext explicita a cadeia Material Request → RFQ → Supplier Quotation → Purchase Order → Purchase Receipt → Purchase Invoice → Payment Entry. RFQ, cotação e requisição podem ser opcionais; pedido, recebimento, fatura e pagamento têm efeitos de negócio distintos. O pedido não movimenta estoque nem lança razão; o recebimento movimenta estoque; a fatura reconhece obrigação/contabilização; pagamento liquida o saldo.

Dolibarr documenta pedido em estados Draft → Validated → Approved → Sent to vendor → Partially received / Received completely, com cancelamento/recusa e possibilidade de aprovação em duas ou três etapas conforme valor. Pedido validado não deve ser simplesmente apagado; só rascunho pode ser excluído.

## 2. Referência de estrutura — ERPNext open source

Metadados oficiais do código aberto `frappe/erpnext`, branch `develop`, lidos dos arquivos JSON dos DocTypes:

| Tela/Documento | Campos não ocultos (metadados) | Abas | Seções nomeadas | Observação |
|---|---:|---:|---:|---|
| Request for Quotation | 28 | 1 | 7 | Fornecedores convidados, itens, data necessária, email, termos e impressão |
| Request for Quotation Item | 17 | 0 | 6 | Item, descrição, quantidade, UOM, data, armazém, requisição, projeto e centro de custo |
| Supplier Quotation | 71 | 4 | 18 | Fornecedor, moeda/câmbio, itens, preço, desconto, impostos, totais, validade/termos, endereços e conexões |
| Supplier Quotation Item | 44 | 0 | 11 | Preço/quantidade por item, unidade/conversão, desconto, prazo, estoque, referências e dimensões |
| Purchase Order | 98 | 5 | 23 | Cabeçalho, fornecedor, contatos, empresa, moeda, entrega, itens, preço, impostos, pagamento, status e conexões |
| Purchase Order Item | 66 | 0 | 15 | Item, quantidade/UOM/conversão, rate, descontos, peso, armazém, estoque, recebido/faturado, BOM, OP, projeto e contas |
| Purchase Receipt | 95 | 4 | 23 | Data/hora, fornecedor, nota de entrega, armazéns aceito/rejeitado, itens, quantidades, impostos, transporte, retorno e status |
| Purchase Invoice | 131 | 5 | 30 | Documento fiscal, vencimento, hold, itens, impostos, retenções, pagamentos, adiantamentos, contas, saldo e conexões |

Os números são inventário de metadados, não uma recomendação para exibir 98 campos simultaneamente. O SYSNQRA deve organizar os campos em abas/seções contextuais e exibir campos condicionais apenas quando a operação exigir.

### Campos/recursos de referência que não podem ser esquecidos

**RFQ**
- Identificação, série/número, empresa, data de emissão, data requerida e prazo de resposta.
- Vários fornecedores convidados, contato, email, status de resposta e envio.
- Itens com código, descrição, imagem, quantidade, UOM, conversão, estoque, data necessária, armazém, projeto, centro de custo e referência à requisição.
- Mensagem/email para fornecedor, anexos, termos, Incoterm e endereços.
- Controle de versão/retificação e trilha de envio/resposta.

**Cotação do fornecedor**
- Fornecedor, contato, número e data da proposta, validade, prazo de entrega, moeda e taxa de câmbio.
- Linhas cotadas por item: quantidade, UOM/conversão, preço, desconto, prazo, marca/fabricante, referência do item, estoque e centro de custo.
- Frete, seguro, outras despesas, tributos, retenções quando aplicáveis, preço líquido e total.
- Condição e agenda de pagamento, validade, anexos, observações e termos.
- Comparação entre fornecedores por custo total posto, prazo, qualidade, conformidade e risco.

**Pedido de compra**
- Fornecedor, empresa/unidade, comprador, datas, contatos, endereços de cobrança/entrega, moeda/câmbio, lista de preço e armazém.
- Linhas com item, especificação, quantidade, UOM e fator de conversão, data requerida, preço, desconto, imposto, peso, armazém, centro de custo, projeto, OP/BOM e referência à requisição/cotação.
- Frete, Incoterm, transportadora, tributos, despesas adicionais, arredondamento, total e moeda-base.
- Condição/parcelas de pagamento, adiantamento, termos, anexos, impressão e observações.
- Alçada de aprovação, retenção/hold, envio, confirmação do fornecedor, alterações e aditivos.
- Progresso de recebimento/faturamento por linha; recebimento e faturamento parciais; cancelamento/fechamento com justificativa.

**Recebimento**
- Pedido de origem, fornecedor, nota de remessa/entrega, data/hora e responsável.
- Linha por item com quantidade pedida, recebida, rejeitada, aceita e saldo; unidade e conversão.
- Armazém de aceitação e rejeição, lote/série/validade, etiqueta/código de barras, localização e putaway.
- Inspeção de qualidade, certificado, fotos/evidências, divergência e bloqueio.
- Transportadora, veículo, documento de transporte, retorno/devolução e vínculo à NF de entrada.

**Fatura de fornecedor**
- Número e série da NF, chave/documento fiscal, datas de emissão/entrada/lançamento/vencimento.
- Pedido e recebimento de origem; linhas e quantidades faturadas; conciliação pedido × recebido × faturado.
- CFOP, NCM, CST/CSOSN, origem, base/alíquota/valor de ICMS, IPI, PIS/COFINS, ISS quando aplicável, retenções e despesas.
- Centro de custo, conta, projeto, parcelas, adiantamentos, valor pago e saldo em aberto.
- Hold, liberação, devolução/nota de crédito, anexos XML/PDF e auditoria.

## 3. Inventário estático do SYSNQRA — páginas atuais

Arquivos e hashes lidos diretamente do `main`:

| Página | Arquivo | Campos JSX | Botões JSX | Abas/controles de navegação | Tabelas JSX |
|---|---|---:|---:|---:|---:|
| Central de Compras (rota principal) | `src/pages/ComprasWorkspace.tsx` | 7 | 9 | 5 | 2 |
| RFQ | `src/pages/ComprasRFQ.tsx` | 17 | 6 | 0 | 2 |
| Compras Industrial (tela paralela/legada) | `src/pages/ComprasIndustrial.tsx` | 12 | 29 | 5 | 6 |
| Requisições | `src/pages/ComprasRequisicoes.tsx` | 2 | 6 | 0 | 1 |
| Análise de preços | `src/pages/ComprasAnalisePrecos.tsx` | 4 | 2 | 0 | 1 |
| Relatórios | `src/pages/ComprasRelatorios.tsx` | 4 | 2 | 0 | 2 |
| Fornecedores | `src/pages/FornecedoresIndustrial.tsx` | 19 | 9 | 0 | 1 |
| Pedido — formulário completo | `src/pages/ComprasPedidoForm.tsx` | 18 | 4 | 0 | tabela de itens dinâmica |
| Pedido — formulário reutilizável | `src/components/compras/PedidoCompraForm.tsx` | 12 | 1 | 0 | tabela/itens via componente |

**Atenção:** o número de botões de JSX inclui botões de aba e ações por linha; algumas ações são renderizadas dinamicamente. O formulário de pedido possui campos dinâmicos definidos por configuração, portanto a contagem estática não representa necessariamente o número de campos exibidos.

### Rotas ativas encontradas em `src/AppEntryV2.tsx`

- `/pageprincipal/compras` → `ComprasWorkspace` (entrada principal).
- `/pageprincipal/compras/solicitacao` → `SolicitacaoCompra`.
- `/pageprincipal/compras/requisicoes` → `ComprasRequisicoes`.
- `/pageprincipal/compras/ajuda` → `ComprasAjuda`.
- `/pageprincipal/compras/analise-precos` → `ComprasAnalisePrecos`.
- `/pageprincipal/compras/industrial` → `ComprasIndustrial` (tela paralela).
- `/pageprincipal/compras/relatorios` → `ComprasRelatorios`.
- `/pageprincipal/compras/rfq` → `ComprasRFQ`.
- `/pageprincipal/cadastros/fornecedores` e `/pageprincipal/fornecedores` → `FornecedoresIndustrial`.

O inventário indica duas experiências de compras: a Central de Compras e a página paralela Compras Industrial. Não apagar nenhuma rota sem mapear menu, links salvos e dependências; decidir qual é fluxo oficial e se a outra será integrada ou mantida como compatibilidade.

## 4. Comparação por página — o que existe e o que falta

### 4.1 Central de Compras — `ComprasWorkspace.tsx`

**Existe**
- 5 abas: visão geral, requisições, cotações, pedidos e recebimentos.
- Pesquisa, data de emissão, data de necessidade, prazo de resposta, condição de pagamento, comprador e observações no fluxo de RFQ.
- Leitura das tabelas `erp_pedidos_compra` e `erp_rfq`.
- Ações de navegação, abertura de RFQ, atualização e gravação.

**Lacunas/validações**
- A aba Recebimentos deve provar recebimento parcial por linha, quantidade aceita/rejeitada, lote, armazém, inspeção e vínculo fiscal; o inventário de tabelas consultado não mostrou uma tabela dedicada `erp_recebimentos_compra`.
- Exibir no painel progresso por pedido e por linha: pedido, recebido, rejeitado, faturado e saldo.
- Conferir se cada botão de ação abre a tela correta e se não há ações duplicadas com a rota paralela `compras/industrial`.
- Garantir que a Central tenha filtros por fornecedor, status, comprador, centro de custo, período, urgência e necessidade PCP.

### 4.2 RFQ — `ComprasRFQ.tsx`

**Existe**
- Seleção de vários fornecedores.
- Data de necessidade e prazo de resposta.
- Comprador, situação de aprovação, previsão de entrega, condição de pagamento e observações.
- Itens com produto, quantidade, unidade, necessidade e observação.
- Por fornecedor, o tipo de estado da UI contém somente `custo`, `prazo` e `condicao`; seleção de vencedor e justificativa.

**Lacunas prioritárias**
- Cotação por linha de item e por fornecedor, não somente um custo total global.
- Número/data/validade da proposta do fornecedor e anexo original.
- Moeda, câmbio, frete, seguro, outras despesas, desconto, impostos e custo total posto.
- Contato/email do fornecedor e status de convite/envio/recebimento da resposta.
- Marca/fabricante, código do fornecedor, UOM/conversão, prazo por item e disponibilidade.
- Matriz de comparação comercial e técnica, menor custo líquido, prazo, qualidade, certificação e justificativa auditável.
- Versionamento da RFQ e retificação comunicada a todos os fornecedores convidados.

### 4.3 Análise de preços — `ComprasAnalisePrecos.tsx`

**Existe**
- Filtro e seleção da RFQ, comparação/seleção de fornecedor, justificativa e ação de atualização.
- Integração com `erp_rfq`, `erp_rfq_fornecedores`, `erp_fornecedores` e `erp_rfq_itens`.

**Lacunas prioritárias**
- Comparação por item, preço unitário e total líquido, não apenas total por fornecedor.
- Colunas comparáveis: preço, desconto, tributos, frete, seguro, prazo, validade, condição de pagamento, marca, qualidade/certificação e disponibilidade.
- Alertas de cotação vencida, proposta incompleta, fornecedor sem resposta e divergência técnica.
- Trilha de aprovação e justificativa obrigatória quando o vencedor não for o menor custo total.
- Converter cotação vencedora em pedido sem redigitação, preservando referências e itens.

### 4.4 Pedido de compra — `ComprasPedidoForm.tsx` e `PedidoCompraForm.tsx`

**Existe**
- Fornecedor, requisição de origem, status, modalidade de frete, produto, NCM, quantidade, unidade, preço, data de entrega, OP, centro de custo, IPI, ICMS e observações.
- RPCs existentes no código: `erp_compras_salvar_pedido_completo` e `erp_compras_salvar_pedido`.
- Total calculado no formulário reutilizável.

**Lacunas prioritárias**
- Moeda/câmbio e lista de preços.
- Contato, endereço de cobrança e entrega, transportadora, frete, seguro e Incoterm.
- Descontos por linha e globais, despesas acessórias, bases e valores fiscais por item, PIS/COFINS e retenções quando aplicáveis.
- Armazém destino e origem, UOM/conversão, peso e disponibilidade.
- Condição e cronograma de pagamento, adiantamentos e vencimentos.
- Alçada de aprovação, envio/aceite do fornecedor, confirmação, aditivo e histórico de alterações.
- Recebido/faturado/saldo por item, devolução e encerramento.
- Converter RFQ/cotação/requisição em pedido preservando vínculo e quantidades.

### 4.5 Requisições — `ComprasRequisicoes.tsx`

**Existe**
- Requisições vinculadas a OP, centro de custo, urgência, itens, produto e fornecedor sugerido.
- Encaminhamento em lote via RPC `erp_compras_encaminhar_requisicoes`.

**Lacunas prioritárias**
- Solicitante, departamento, data necessária, justificativa, orçamento e anexos.
- Aprovação por alçada, rejeição/devolução para ajuste e trilha de quem aprovou.
- Reserva/disponibilidade em estoque antes de comprar, sugestão MRP e consolidação de demandas.
- Conversão parcial da requisição em um ou vários pedidos e controle de saldo ainda não atendido.
- Regras para urgência crítica e compras emergenciais.

### 4.6 Recebimentos — aba da Central

**Lacuna estrutural P0 a validar**
- A aba existe na UI, mas não foi localizada tabela dedicada `erp_recebimentos_compra` entre os contratos de compras inspecionados. `erp_pedidos_compra` possui `recebido_em` e `lote_recebimento`, mas isso sozinho não representa histórico de vários recebimentos parciais por item.
- Não tratar um único campo de data/lote no cabeçalho como recebimento transacional completo.
- Modelo-alvo precisa suportar cabeçalho de recebimento, linhas, pedido/linha de origem, quantidades recebida/aceita/rejeitada, lote/série, armazém, usuário, evidências, inspeção e vínculo NF-e; preservar histórico de múltiplas entregas e reversões.

### 4.7 Fornecedores — `FornecedoresIndustrial.tsx`

**Existe**
- Código, razão social, nome fantasia, CNPJ, email, telefone, endereço, contato, cidade/UF, ISO 9001, validade/número/certificado e observações.
- Filtro, pesquisa, edição e upload de certificado em storage privado.
- RLS ativado em `erp_fornecedores`.

**Lacunas prioritárias**
- Condição e prazo de pagamento padrão, moeda, dados bancários com acesso restrito, contatos por área e endereços múltiplos.
- Categoria/grupo, itens fornecidos, códigos do fornecedor, preços e lead time por item.
- Avaliação de desempenho (OTD, PPM, devoluções, RNC), score de qualidade e homologação.
- Bloqueio/desbloqueio de fornecedor com motivo, vigência e alçada.
- Certidões e documentos fiscais com validade/alerta, LGPD e histórico de alterações.
- Separar campos mestres de dados sensíveis e aplicar permissão por função.

### 4.8 Relatórios — `ComprasRelatorios.tsx`

**Existe**
- Pesquisa, status de aprovação, período de RFQ, tabelas e impressão.

**Lacunas prioritárias**
- Spend analysis por categoria, fornecedor, centro de custo, planta e período.
- Saving negociado vs. realizado, preço histórico e variação, prazo médio e OTD.
- Requisições em atraso, pedidos em aberto, entrega parcial/atrasada, pedidos sem recebimento e notas sem pedido.
- Fornecedor sem cotação, concentração de compras, contratos a vencer e performance/qualidade.
- Exportação controlada CSV/XLSX/PDF com filtros e trilha de geração.

## 5. Contratos de dados do Supabase consultados

Tabelas de compras existentes e com RLS habilitado no schema público:

- `erp_fornecedores`
- `erp_pedidos_compra`
- `erp_pedidos_compra_itens`
- `erp_solicitacoes_compra`
- `erp_solicitacoes_compra_itens`
- `erp_requisicoes_compra`
- `erp_requisicoes_compra_itens`
- `erp_rfq`
- `erp_rfq_fornecedores`
- `erp_rfq_itens`
- `erp_rfq_respostas`

Observações verificadas:
- `erp_rfq_respostas` tem valor total, prazo em dias, condição, validade, observações e status, mas não há uma tabela de linhas da resposta por item no inventário consultado. Isso impede demonstrar uma comparação robusta item a item sem outro contrato/estrutura.
- `erp_pedidos_compra` tem cabeçalho simplificado e um único `produto_id` opcional; a tabela `erp_pedidos_compra_itens` é mais nova e contém linhas, mas seu FK aponta para `erp_pedidos(id)`, não para `erp_pedidos_compra(id)`. Essa diferença de linhagem deve ser resolvida antes de consolidar leitura/gravação entre os dois modelos.
- `erp_pedidos_compra_itens` contém apenas produto, descrição, quantidade, valor unitário, total, código/unidade, cliente interno, data de necessidade, urgência e observações; não possui os atributos por linha necessários para imposto, desconto, armazém, lote, recebido/faturado e referências de RFQ/OP.
- `erp_rfq_itens` contém produto, descrição, código, quantidade, unidade, data de necessidade e observações.
- `erp_rfq_respostas` contém um valor total por fornecedor, não valores detalhados por item.
- `erp_fornecedores` contém dados básicos e ISO; não contém os atributos de avaliação/performance e homologação detalhados acima.

**Não criar uma nova tabela antes de reconciliar o modelo existente e os migrations SQL.** Primeiro determinar se `erp_pedidos` é a tabela canônica, se `erp_pedidos_compra` é legado e qual RPC já realiza gravação atômica. Não duplicar dados.

## 6. Backlog de implementação derivado desta comparação

| Prioridade | Entrega | Critério de aceite |
|---|---|---|
| P0 | Unificar o modelo canônico de pedido e suas linhas | Uma única origem transacional; FK coerente; RLS por empresa; RPC idempotente e teste de rollback |
| P0 | Cotação por item/fornecedor | Cada resposta guarda preço, quantidade, moeda, prazo, validade, impostos/despesas e anexos por item |
| P0 | Recebimento parcial e rastreável | Várias entregas por pedido/linha; aceito/rejeitado; lote; armazém; auditoria; reversão |
| P0 | Conferência pedido × recebimento × NF | Divergências de quantidade/preço/tributo bloqueiam ou exigem aprovação |
| P1 | Aprovação por alçada | Criador, aprovador(es), limite por valor/centro de custo e histórico imutável |
| P1 | Conversão entre documentos | Requisição → RFQ → cotação → pedido sem redigitação e sem duplicar quantidade |
| P1 | Cadastro e score de fornecedor | Homologação, certificações, bloqueios, desempenho e histórico |
| P1 | Relatórios gerenciais | Spend, saving, preço histórico, OTD, atrasos, pedidos e recebimentos pendentes |
| P2 | Portal e comunicação de fornecedor | Convite seguro, resposta, anexos, revisão e segregação por fornecedor |

## 7. Arquivos open source e documentação usados

**ERPNext — repositório de código**
- Purchase Order DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/purchase_order/purchase_order.json
- Request for Quotation DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/request_for_quotation/request_for_quotation.json
- Supplier Quotation DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/supplier_quotation/supplier_quotation.json
- Purchase Receipt DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/purchase_receipt/purchase_receipt.json
- Purchase Invoice DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/purchase_invoice/purchase_invoice.json
- Purchase Order Item DocType: https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/purchase_order_item/purchase_order_item.json

**ERPNext — documentação funcional**
- Buying: https://docs.frappe.io/erpnext/buying
- RFQ: https://docs.frappe.io/erpnext/request-for-quotation
- Supplier Quotation: https://docs.frappe.io/erpnext/supplier-quotation
- Purchase Order: https://docs.frappe.io/erpnext/purchase-order
- Purchase Invoice: https://docs.frappe.io/erpnext/purchase-invoice

**Dolibarr — documentação funcional**
- Purchase Orders: https://wiki.dolibarr.org/index.php/Module_Purchase_Orders
- Supplier Invoices: https://wiki.dolibarr.org/index.php/Module_Suppliers_Invoices
- Supplier module developer model and permissions: https://wiki.dolibarr.org/index.php/Module_Suppliers_%28developer%29

## 8. Decisão desta primeira rodada

- **Auditoria de Compras concluída como diagnóstico estático e estrutural inicial.**
- **Não foi alterada nenhuma tela aprovada nem migration remota.**
- Lacunas prioritárias foram registradas com evidência de arquivo e schema.
- Próxima execução deve começar pela reconciliação do pedido canônico e pelo desenho da resposta de cotação por item; depois recebimento parcial e three-way match.
- Não marcar o módulo como concluído até testes reais com usuário autenticado, empresa/tenant, RLS, permissões e dados de teste controlados.


## 2. Próximos módulos

Os módulos abaixo serão inventariados e comparados em sequência. Cada tópico só será marcado como auditado após inspeção do código e dos contratos reais; “a iniciar” não significa que a tela esteja completa.

- Engenharia — BOM, revisões, estrutura e roteiros: **a iniciar**
- PCP — programação, capacidade finita, ordens e apontamentos: **a iniciar**
- Estoque — separações, reservas, lotes, rastreabilidade e inventários: **a iniciar**
- Fiscal — regras fiscais, liberação de itens, NF-e e expedição: **a iniciar**
- Financeiro — contas a pagar/receber, fluxo de caixa, comissões e conciliações: **a iniciar**
- Qualidade/SGQ — documentos controlados, inspeções, genealogia, refugo, RPNC, CAPA, auditorias, FMEA e plano de controle: **a iniciar**
- Comercial/Vendas — clientes, propostas, pedidos, preços, comissões e faturamento: **a iniciar**
- Cadastros e administração — usuários, permissões, empresas, parâmetros e integrações: **a iniciar**
- Manutenção — máquinas, planos, ordens, paradas e histórico: **a iniciar**
- Expedição/Logística — separação, conferência, embalagem, transporte e entrega: **a iniciar**
- Dashboards, relatórios e ajuda — métricas, filtros, exportação e orientação contextual: **a iniciar**

## 3. Regras gerais de implementação e validação

1. Inventariar todos os campos, botões, ações, abas, filtros, tabelas, estados, validações, permissões, relatórios, anexos e integrações de cada tela.
2. Confrontar com pelo menos um ERP de referência open source e documentação oficial relevante, citando fontes e distinguindo campos visíveis de metadados condicionais.
3. Confrontar com o código atual do SYSNQRA, rotas, schema, índices, constraints, FKs, RLS, policies, RPCs e migrations.
4. Classificar cada item como existente, parcial, ausente, inconsistente ou bloqueado por contrato.
5. Implementar as lacunas confirmadas sem duplicar tabelas, RPCs, fluxos ou páginas.
6. Antes de migrations: confirmar linhagem, dependências, tenant, políticas, grants, idempotência, rollback e compatibilidade com dados existentes.
7. Validar typecheck, lint, testes, build, rotas, permissões e fluxo com sessão autenticada e empresa real de teste.
8. Registrar neste documento o commit, PR, testes e estado de deploy. Não declarar produção corrigida sem deploy READY e verificação do domínio oficial.
9. Não apagar este comparativo geral; ao final, remover apenas os documentos auxiliares redundantes criados durante a auditoria.
