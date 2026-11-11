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


### 1.1 Verificação do contrato real e correções iniciadas — 10/11/2026

**Consulta direta ao Supabase de SYSNQRA (zsklkydlawgvwgnvxwwx), sem alterar o banco:**

- erp_rfq contém: id, empresa_id, numero, status, data_emissao, data_necessidade, condicao_pagamento, prazo_resposta, observacoes, created_by, created_at, updated_at, fornecedor_escolhido_id e justificativa_escolha.
- erp_rfq_fornecedores contém apenas vínculo RFQ/fornecedor, status e data de resposta; não contém valor, frete, desconto, prazo ou condição comercial.
- erp_rfq_respostas contém valor_total, prazo_dias, condicao_pagamento, validade, observacoes e status; é o contrato correto para persistir a proposta global por fornecedor.
- Existe a RPC erp_compras_criar_rfq_atomica(uuid[],jsonb,date,text,text,date), que valida sessão, empresa, permissões, fornecedores e produtos, e grava cabeçalho, fornecedores e itens na mesma transação.
- As policies RLS das tabelas restringem operações à empresa atual e às permissões do módulo Compras.

**Falha concreta encontrada:** as telas antigas tentavam gravar/ler colunas inexistentes em erp_rfq e erp_rfq_fornecedores (por exemplo status_aprovacao, menor_preco_ofertado, valor_frete, valor_desconto e prazo_entrega_dias). Isso faria a criação ou a análise falhar contra o schema real.

**Correções de código feitas nesta branch:**
1. ComprasRFQ.tsx passou a chamar a RPC atômica existente para criar cabeçalho, fornecedores e itens.
2. As propostas totais e seus prazos/condições passaram a ser gravados em erp_rfq_respostas, em vez de tentar gravar colunas inexistentes na tabela de participantes.
3. A escolha e justificativa são gravadas nos campos existentes fornecedor_escolhido_id e justificativa_escolha de erp_rfq. O status usa a coluna existente status.
4. ComprasAnalisePrecos.tsx passou a ler erp_rfq_respostas e deixou de consultar campos inexistentes. Frete/desconto aparecem sem valor (—), pois o schema atual não os discrimina na resposta; não são inventados.
5. A ação foi renomeada para não prometer encaminhamento a uma etapa de aprovação que ainda não existe como contrato persistido.

**Limite funcional ainda aberto:** a resposta continua sendo um valor total por fornecedor. Não existe tabela de preço por item/fornecedor; cotação item a item, moeda/câmbio, frete, desconto, tributos, validade e anexos ainda exigem desenho e implementação de contrato próprio. A persistência do vencedor usa UPDATE protegido por permissão compras.editar; deve ser validada com usuário de teste autorizado. Nenhuma migration foi aplicada.

**Validação:** alterações commitadas nesta branch; typecheck, lint, testes e fluxo com usuário autenticado ainda pendentes. O check Vercel retornou falha por limite de taxa de builds (build-rate-limit); não foi gerado preview deste commit. Não repetir deploy enquanto o limite estiver ativo. Não considerar Compras concluído nem produção corrigida antes dessas verificações.

### 1.2 Auditoria aprofundada de telas, ações, impressão e persistência — 10/11/2026

#### Inventário funcional das páginas (não confundir ocorrências estáticas com controles visíveis simultaneamente)

| Página/rota | Campos e controles identificados | Ações / abas / impressão |
|---|---|---|
| Central de Compras — /pageprincipal/compras | filtros de pesquisa; formulários de RFQ e pedido; dados de requisições, pedidos e recebimentos | 5 abas: Visão geral, Requisições, Cotações, Pedidos, Recebimentos; atualizar, abrir formulário RFQ/pedido, navegar do número do pedido. Sem impressão dedicada identificada no arquivo |
| RFQ — /pageprincipal/compras/rfq | comprador, data limite, previsão de entrega, prazo de resposta, condição de pagamento, necessidade; busca e seleção de produto, quantidade, unidade, observação por item; fornecedor, valor total, prazo em dias, condição, validade da proposta, vencedor e justificativa | adicionar/remover item, selecionar fornecedores, escolher vencedor, salvar, voltar a solicitações, abrir pedido, **imprimir/PDF** |
| Análise de preços — /pageprincipal/compras/analise-precos | busca por RFQ/produto, seleção de RFQ, prazo de resposta, fornecedor, valor total, frete/desconto exibidos como não informados, prazo, condição, validade, menor valor, justificativa | atualizar, escolher fornecedor, registrar escolha, voltar à RFQ, **imprimir/PDF** |
| Requisições — /pageprincipal/compras/requisicoes | OP, urgência, status, itens, produto, quantidade, fornecedor sugerido; filtros por OP/urgência e seleção em lote | encaminhar selecionadas para cotação, atualizar, paginação, consulta rápida, **imprimir** |
| Compras Industrial — /pageprincipal/compras/industrial | dashboard e formulários simplificados de pedido; fornecedor, produto, quantidade, valor unitário, previsão, centro de custo, local de entrega, condição, referência de cotação, especificação técnica e observações | 5 abas: dashboard, solicitações, pedidos, fornecedores, recebimentos; criar/salvar/fechar, paginação e navegação para RFQ, pedido, recebimentos, relatórios, ajuda e fiscal. Sem impressão dedicada identificada no arquivo |
| Pedido de compra — componente ComprasPedidoForm | fornecedor, requisição, comprador, condição, prazo, centro de custo; linhas com produto, quantidade, unidade, preço, NCM, entrega, OP, centro de custo, IPI e ICMS; dados comerciais como frete, desconto, modalidade e transportadora | adicionar/remover linhas, cancelar, salvar por RPC transacional. Impressão dedicada não identificada no componente |
| Fornecedores — /pageprincipal/cadastros/fornecedores | cadastro, documento, contatos, endereço, ISO/certificado, observações e filtros | novo, editar, excluir, filtrar, atualizar, upload de certificado e **imprimir** |
| Relatórios — /pageprincipal/compras/relatorios | pesquisa, filtro de status/data da RFQ, indicadores, gráficos, fornecedores e tabelas | atualizar e **imprimir/PDF** |
| Recebimento de materiais — /pageprincipal/recebimento-materiais | NF-e manual/XML, série, chave, data, CNPJ, total, itens, unidade, quantidade, valor unitário, lotes do fabricante/internos, validade e quantidades por lote | importar XML, adicionar/remover item, adicionar lote, novo, confirmar recebimento por RPC e **imprimir** |

#### Falhas adicionais confirmadas e corrigidas nesta branch

1. **Relatórios:** SELECTs pediam colunas que não existem em erp_pedidos_compra/erp_rfq (data_pedido, fiscal_status, comprador_responsavel, status_aprovacao, data_limite, data_conclusao, menor_custo_liquido_atendido). Consultas e tabelas foram alinhadas a created_at, data_prevista, status, prazo_resposta, fornecedor_escolhido_id e justificativa_escolha. Indicador fiscal fictício foi substituído por indicador baseado em vínculo real de fornecedor.
2. **Compras Industrial:** consulta usava prazo_entrega, codigo_produto e descricao_produto; alterada para data_prevista, codigo_mp e descricao, conforme colunas encontradas no banco.
3. **RFQ:** a tabela erp_rfq_respostas restringe status a RASCUNHO, ENVIADA, ACEITA ou RECUSADA. A tela enviava RECEBIDA, que violava o CHECK e faria o INSERT falhar. Corrigido para RASCUNHO e preenchido respondido_por com o usuário autenticado.
4. **Validade:** a coluna validade já existe em erp_rfq_respostas, mas não estava disponível na entrada de propostas; campo de validade por fornecedor adicionado à RFQ e persistido. A análise passou a exibir a validade.
5. **Impressão:** botões Imprimir/PDF adicionados à RFQ e ao mapa comparativo de preços. Requisições, relatórios e fornecedores já tinham impressão. A auditoria ainda precisa validar visualmente o resultado impresso e decidir os layouts dedicados de pedido e central. O recebimento de materiais já tem impressão e importação XML.

#### Divergência estrutural que impede fechar a modelagem de Compras

- A migration versionada 20260927183000_pedidos_compra.sql define erp_pedidos_compra_itens.pedido_id com FK para erp_pedidos_compra(id), e as colunas codigo_produto/descricao_produto.
- A consulta ao banco conectado mostrou FK atual de erp_pedidos_compra_itens.pedido_id para erp_pedidos(id), e colunas codigo_mp/descricao. Isso é divergência entre migration versionada e banco remoto, não autorização para criar uma segunda tabela.
- Antes de corrigir o vínculo, é obrigatório identificar qual RPC/tabela grava os pedidos atuais, verificar dados existentes e contagens de IDs, histórico de migrations e referências em todo o código. Não remover nem trocar FK enquanto isso não estiver comprovado.
- A tabela erp_rfq_respostas tem UNIQUE(rfq_id, fornecedor_id), valor_total, prazo_dias, condição, validade e observações; não há tabela de linhas de proposta nem colunas próprias de frete, desconto, impostos, moeda/câmbio, número/data da proposta ou anexo no contrato RFQ inspecionado.
- A tela atual tem valor total por fornecedor e itens solicitados na RFQ, mas não uma grade de preço ofertado para cada item. Frete e desconto são mostrados como “—”, não como zero. A comparação por item e o custo posto precisam de contrato e fluxo próprios, depois de conferir migrations e dados; não criar duplicatas.
- O Supabase consultado não lista as RPCs erp_compras_salvar_pedido nem erp_compras_salvar_pedido_completo; lista erp_compras_criar_rfq_atomica e erp_compras_criar_solicitacao. A tela ComprasIndustrial chama erp_compras_salvar_pedido, portanto seu botão de salvar está apontando para uma RPC ausente no banco conectado.
- Existe no repositório a migration 20261103190000_erp_compras_pedido_completo_atomic.sql com erp_compras_salvar_pedido_completo, mas a definição depende de colunas codigo_produto/descricao_produto, enquanto o banco conectado expõe codigo_mp/descricao; além disso, a FK remota de pedido_id aponta para erp_pedidos, divergindo da migration original que aponta para erp_pedidos_compra. **Não aplicar essa migration cegamente**: primeiro reconciliar o schema remoto e os dados, sem perder pedidos existentes.


#### Referência comparativa e critério de aceite

- ERPNext: RFQ, Supplier Quotation, Purchase Order, Purchase Receipt e Purchase Invoice são documentos relacionados, com linhas de itens e ciclo de compras. A contagem de metadados de campos/tabs/sections da seção 1 deve ser lida como metadados condicionais, não como inputs visíveis simultâneos.
- Dolibarr: pedido de compra tem ciclo de rascunho, validação/aprovação, envio ao fornecedor e recebimento parcial/total; a fatura de fornecedor fecha o ciclo financeiro.
- Aceite SYSNQRA: RFQ por fornecedor e item; proposta com validade, moeda/câmbio, tributos, frete/desconto e anexos; mapa comparativo por linha e custo total comparável; escolha justificada; conversão para pedido sem redigitação; aprovação conforme alçada; recebimento parcial por linha com lote/qualidade; vínculo fiscal/fatura e conciliação pedido × recebimento × fatura; histórico e permissões por empresa. Impressões de RFQ, mapa comparativo, pedido, recebimento e relatórios devem ter cabeçalho, identificação, linhas, totais, assinaturas/observações quando aplicável, paginação e CSS de impressão sem botões/menus.

#### Estado de Compras

**Corrigido em código nesta branch:** consultas incompatíveis em Relatórios e Compras Industrial; status inválido de resposta RFQ; autoria da resposta; campo de validade; exibição de validade; impressão/PDF em RFQ e análise de preços.

**Ainda não concluído:** contrato de proposta por item e custos acessórios; divergência de FK/migration dos itens de pedido; RPC de salvar pedido ausente no banco; fluxo de aprovação real; impressão dedicada de pedido; teste de todas as ações com usuário/tenant; validação de build. Vercel segue bloqueado por build-rate-limit, portanto não há preview validado. Não promover para produção.

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


### 1.3 Reauditoria remota do contrato de pedidos — 10/11/2026

**Consulta direta read-only ao projeto Supabase conectado. Nenhuma DDL/DML foi executada.**

- `erp_pedidos_compra`: colunas remotas observadas: `id uuid NOT NULL DEFAULT gen_random_uuid()`, `empresa_id uuid NOT NULL`, `fornecedor_id uuid`, `produto_id uuid`, `pedido_venda_id uuid`, `quantidade numeric DEFAULT 0`, `valor_unitario numeric DEFAULT 0`, `total numeric DEFAULT 0`, `status text DEFAULT 'pendente'`, `data_prevista date`, `observacoes text`, `created_at/updated_at timestamptz DEFAULT now()`, `numero bigint`, `recebido_em timestamptz`, `lote_recebimento text`, `origem_solicitacao text NOT NULL DEFAULT 'INTERNO'`, `data_necessidade date`, `nivel_urgencia text NOT NULL DEFAULT 'NORMAL'`, `solicitado_por uuid`, `comentarios text`, `condicao_pagamento text`, `armazem_destino text`, `requisicao_id uuid`, `comprador_id uuid`. Não existem no remoto várias colunas esperadas pela migration mais recente, como `comprador_nome`, `prazo_entrega`, `centro_custo`, `local_entrega`, `referencia_cotacao`, `valor_frete`, `valor_desconto`, `transportadora`, `modalidade_frete` e `numero_contrato`.
- `erp_pedidos_compra_itens`: `id uuid`, `empresa_id uuid NOT NULL`, `pedido_id uuid NOT NULL`, `produto_id uuid`, `descricao text NOT NULL`, `quantidade numeric NOT NULL DEFAULT 1`, `valor_unitario numeric NOT NULL DEFAULT 0`, `total numeric NOT NULL DEFAULT 0`, `codigo_mp text NOT NULL DEFAULT ''`, `unidade text NOT NULL DEFAULT 'UN'`, `cliente_interno text`, `data_necessidade date`, `nivel_urgencia text NOT NULL DEFAULT 'NORMAL'`, `observacoes text`, `created_at/updated_at timestamptz NOT NULL DEFAULT now()`.
- FK confirmadas: cabeçalho `erp_pedidos_compra.empresa_id → erp_empresas.id`, `requisicao_id → erp_requisicoes_compra.id`, `comprador_id/solicitado_por → erp_usuarios.id`; itens `empresa_id → erp_empresas.id`, `produto_id → erp_produtos.id`, **`pedido_id → erp_pedidos.id`**. O cabeçalho `erp_pedidos` exige `numero_pedido varchar NOT NULL`, `valor_total numeric NOT NULL`, tem `empresa_id`, `parceiro_id`, `status` e `criado_em`; `parceiro_id → erp_parceiros.id`.
- RLS e FORCE RLS estão ativos em `erp_pedidos`, `erp_pedidos_compra` e `erp_pedidos_compra_itens`. Policies isolam por empresa; para itens a expressão usa `empresa_id = erp_current_empresa_id()`. A política de `erp_rfq_respostas` também exige permissão do módulo Compras por operação.
- As contagens consultadas para `erp_pedidos_compra`, `erp_pedidos` e `erp_pedidos_compra_itens` retornaram zero no contexto de consulta. Isso não substitui validação com usuário final e não autoriza trocar FK.
- Não existe no banco remoto a RPC `erp_compras_salvar_pedido` nem `erp_compras_salvar_pedido_completo`; a única RPC de Compras listada nessa consulta foi `erp_compras_criar_rfq_atomica`.
- Não há CHECK de status nas tabelas de pedido consultadas. Já `erp_rfq_respostas.status` tem CHECK estrito `RASCUNHO | ENVIADA | ACEITA | RECUSADA`. Não misturar estados do pedido com estados da resposta RFQ.

**Conclusão técnica / bloqueio de implementação segura:** a tela `ComprasIndustrial.tsx` chama uma RPC inexistente e tenta gravar dados comerciais em `erp_pedidos_compra` que não têm colunas no schema remoto. A tabela de linhas, por sua vez, referencia `erp_pedidos`, não o cabeçalho `erp_pedidos_compra`. Não é seguro “corrigir” isso apenas trocando o payload do navegador: uma gravação coerente exige uma RPC transacional e uma decisão explícita de linhagem entre os dois cabeçalhos, incluindo como preencher `numero_pedido` e relacionar fornecedor/parceiro. A migration `20261103190000_erp_compras_pedido_completo_atomic.sql` não é compatível com o schema remoto e não foi aplicada.

**Cotação por item:** remoto confirma que `erp_rfq_itens` contém os itens solicitados, mas `erp_rfq_respostas` contém somente total por fornecedor, prazo, condição, validade, observações e status. Não há persistência por item, preço unitário, desconto, frete, tributos, moeda/câmbio ou comprovante nesse contrato. Não exibir campos sem persistência. A implementação depende de contrato aditivo revisado e migration não destrutiva.

**Estado desta rodada:** passo 1 auditado e bloqueado por decisão de modelo/RPC; passo 2 auditado e bloqueado por ausência de contrato de resposta por item; passo 3 não implementado porque o formulário de pedido não salva com segurança e o cabeçalho não contém todos os dados solicitados para impressão; passo 4 não executado integralmente. Nenhum migration foi aplicada, nenhuma tela foi declarada concluída e não houve deploy. Type-check/lint local não foram executados nesta sessão.


#### Complemento — identidade e numeração dos pedidos (10/11/2026)

- `erp_fornecedores` não possui coluna `parceiro_id` nem FK para `erp_parceiros`; `erp_pedidos.parceiro_id` é nullable e aponta para `erp_parceiros.id`. Não há vínculo estrutural comprovado entre fornecedor e parceiro.
- `erp_pedidos.numero_pedido` é `varchar NOT NULL`, sem default. `erp_pedidos_compra.numero` é `bigint nullable`, também sem default. Nenhum trigger foi encontrado nas três tabelas que gere número ou sincronize cabeçalhos.
- Policies observadas: as três tabelas têm policy ALL de tenant; pedidos e cabeçalho usam `empresa_id = erp_current_company_id() OR erp_is_master()`, itens usam `empresa_id = erp_current_empresa_id()`. RLS e FORCE RLS ativos.
- A hipótese de usar o mesmo UUID em `erp_pedidos` e `erp_pedidos_compra` pode satisfazer a FK atual dos itens sem alterar dados antigos, mas não está implementada: antes exige validar as funções de tenant/permissão e adotar numeração concorrente segura para os dois números obrigatórios/visíveis. Não gerar número via `max()+1` sem lock transacional/sequence.
- Resultado: não executar INSERT parcial no navegador nem RPC adivinhada. O fluxo continua bloqueado até especificar e testar atomicamente o contrato de numeração, permissão e identidade compartilhada.


### 1.4 Destravamento aditivo do Pedido de Compra — 10/11/2026

**Implementação realizada nesta branch e migration aplicada ao Supabase conectado.**

#### Schema/RPC
- Migration 20261110170000_compras_pedido_rpc_schema_aditivo.sql adiciona somente centro_custo text, local_entrega text, referencia_cotacao text e especificacao_tecnica text em erp_pedidos_compra, todos com ADD COLUMN IF NOT EXISTS.
- Criada public.erp_compras_salvar_pedido(p_payload jsonb), SECURITY INVOKER, com search_path fixo e execução concedida a authenticated.
- Numeração usa pg_advisory_xact_lock(hashtext('pc_' || v_empresa_id::text)) e MAX(numero)+1 por empresa, sem tocar na sequência do PDV.
- A RPC grava erp_pedidos primeiro e usa o mesmo UUID no cabeçalho erp_pedidos_compra; os itens apontam para esse UUID em erp_pedidos_compra_itens.pedido_id, respeitando a FK remota existente para erp_pedidos(id).
- O fornecedor não é convertido em parceiro: parceiro_id permanece NULL porque não existe mapeamento remoto comprovado.
- A RPC valida usuário autenticado, tenant coerente, fornecedor/produtos/requisição da mesma empresa, permissão erp_has_permission('compras', criar|editar), status inicial RASCUNHO | PENDENTE_APROVACAO e urgência suportada. Não modifica FK nem constraint antiga.
- Edição é permitida somente para pedidos criados no novo contrato com UUID compartilhado; pedidos legados sem vínculo mestre correspondente são preservados e a edição retorna erro explícito em vez de adivinhar relacionamento.
- RLS e FORCE RLS continuam ativos nas três tabelas. Consulta pós-migration confirmou SECURITY INVOKER, EXECUTE para authenticated, e policies originais intactas.

#### Front-end
- ComprasIndustrial.tsx agora envia p_payload com nomes reais e lê pedido_compra_id/numero_pedido; removido UPDATE posterior com campos que antes não existiam.
- ComprasPedidoForm.tsx foi alinhado ao schema real: itens usam codigo_mp, descricao, quantidade, valor_unitario, total, unidade, data_necessidade e observacoes; cabeçalho usa os campos reais mais os quatro campos aditivos.
- Campos sem persistência remota (NCM, OP, IPI/ICMS por linha, câmbio, frete/desconto, transportadora, número de contrato e anexos) foram retirados do formulário para não simular gravação.
- Implementado layout de impressão A4 com identidade Plastibor, dados cadastrais lidos de erp_empresas, dados disponíveis do fornecedor, condição/prazo/local, grade de itens, total e assinaturas. Dados cadastrais ausentes são identificados como não informados; não são inventados.
- RFQ/Análise continuam limitadas aos campos realmente persistidos em erp_rfq_respostas: valor total, prazo, condição, validade e observações. Não há resposta por item no schema atual.

#### Acompanhamento solicitado — página Compras Industrial / Pedidos
| Item | Estado | Evidência |
|---|---|---|
| 1. RPC atômica e contrato aditivo | **Aplicado; validação funcional pendente** | Migration aplicada; metadados confirmam quatro colunas, RPC JSONB SECURITY INVOKER e RLS/FORCE RLS intactos |
| 2. Cotação por item | **Bloqueado pelo modelo RFQ atual** | erp_rfq_respostas ainda só tem total por fornecedor; formulário não exibe campos sem persistência |
| 3. Impressão do pedido | **Implementada no componente; teste visual pendente** | A4 com cabeçalho Plastibor, fornecedor, condições, linhas, total e assinaturas |
| 4. Type-check e fluxo ponta a ponta | **Pendente** | Não há workspace/terminal local nesta sessão para executar tsc --noEmit; não foi feito teste autenticado de criação/edição/listagem/impressão |

**Não concluído:** não marcar esta página como concluída até executar tsc --noEmit e validar com usuário autenticado de empresa de teste criação, leitura, edição do pedido recém-criado e impressão. A edição de pedidos legados permanece intencionalmente bloqueada por ausência de vínculo mestre comprovado. Não foi acionado deploy Vercel.


### 1.5 Correção da sequência, edição e impressão — 10/11/2026

#### Reconciliação remota confirmada
- Reconsulta direta ao catálogo remoto confirmou os tipos/colunas: `erp_pedidos.numero_pedido varchar NOT NULL`, `erp_pedidos.empresa_id uuid`; `erp_pedidos_compra.numero bigint`, `empresa_id uuid NOT NULL`, `fornecedor_id uuid`, `data_prevista date`, `condicao_pagamento text`; itens com `pedido_id uuid NOT NULL`, `empresa_id uuid NOT NULL`, `codigo_mp text NOT NULL`, `descricao text NOT NULL`, `quantidade numeric`, `valor_unitario numeric`, `total numeric`, `unidade text NOT NULL`.
- FK crítica preservada: `erp_pedidos_compra_itens.pedido_id → erp_pedidos.id`. Nenhuma FK foi alterada.
- As quatro colunas aditivas estão presentes e anuláveis. Fornecedor, produto, empresa e usuário ERP têm as colunas efetivamente usadas pelo formulário/RPC.
- `erp_rfq_respostas` tem apenas `valor_total numeric`, `prazo_dias integer`, `condicao_pagamento text`, `validade date`, `observacoes text`, `status text` e metadados. `erp_rfq_itens` representa apenas os itens solicitados, sem preço/resposta do fornecedor por item. CHECK de status da resposta permanece `RASCUNHO | ENVIADA | ACEITA | RECUSADA`.

#### Correção da numeração
- A revisão da função detectou que a primeira versão usava também `MAX(erp_pedidos.numero_pedido)`, misturando a sequência mestre geral/PDV com Compras.
- Corrigido no banco com migration `20261110183000_compras_pedido_numero_sequencia_isolada.sql`: agora o próximo número é exclusivamente `COALESCE(MAX(erp_pedidos_compra.numero), 0) + 1` por `empresa_id`, protegido por `pg_advisory_xact_lock(hashtext('pc_' || v_empresa_id::text))`.
- A função segue `SECURITY INVOKER`, com `search_path` fixo e EXECUTE para `authenticated`. Metadados pós-correção confirmam `prosecdef=false`, grant ativo, trava por empresa e ausência de leitura da numeração mestre do PDV.

#### Edição e impressão
- `ComprasPedidoForm.tsx` agora aceita `pedidoId`, carrega cabeçalho e linhas por `id + empresa_id`, permite edição apenas em `RASCUNHO` ou `PENDENTE_APROVACAO`, e envia `pedido_id` à mesma RPC atômica.
- `ComprasWorkspace.tsx` agora expõe ação Editar na listagem de Pedidos e mantém o formulário aberto após salvar para permitir impressão com número definitivo. O prazo da listagem foi alinhado à coluna real `data_prevista`.
- O layout A4 apresenta `PC-0000` com o número retornado pela RPC depois de gravar; o botão de impressão só é habilitado após salvar. Cabeçalho institucional PLASTIBOR e dados cadastrais são renderizados com valores existentes em `erp_empresas`; dados de fornecedor usam campos reais de `erp_fornecedores`.

#### Cotação / análise de preços
- A comparação foi simplificada para mostrar apenas valor total informado, prazo em dias, condição de pagamento e validade, além da seleção do fornecedor. Foram removidas as colunas visuais de frete, desconto e custo líquido, pois não têm persistência no schema remoto.
- Não foi criada tabela fictícia nem gravado preço por item. Cotação detalhada por item permanece bloqueada até decisão/aprovação de um contrato de dados aditivo.

#### Segurança e validação
- Consulta a `pg_class/pg_policy` confirmou RLS e FORCE RLS ativos nas três tabelas. Policies permanecem: `erp_pedidos` e `erp_pedidos_compra` por `erp_current_company_id()` (ou master); itens por `erp_current_empresa_id()`.
- Advisor de segurança não apontou a nova RPC como SECURITY DEFINER. Os avisos retornados pelo advisor são preexistentes/fora do escopo desta página (incluem outras funções SECURITY DEFINER e tabela RH).
- **Ainda pendente:** `tsc --noEmit`, lint e teste autenticado real de criar, consultar, editar e imprimir. O conector GitHub/Supabase não disponibiliza workspace de execução local nem sessão autenticada de usuário de teste nesta rodada; não foi simulada identidade nem gravado dado de teste em produção.
- **Ainda pendente:** checklist de botões, filtros, permissões, modais e impressão das outras páginas de Compras (Requisições, RFQ, Análise, Recebimento, Fornecedores e Relatórios). Não declarar o módulo Compras concluído até esse checklist ser executado.
- Vercel não foi acionada por causa do build-rate-limit.

**Status atualizado da página Pedidos:** contrato remoto e correção de numeração aplicados/verificados no catálogo; edição e impressão com número salvo implementadas no código; cotação por item explicitamente limitada pelo schema. A página continua **em validação**, não concluída, até type-check/lint e teste autenticado ponta a ponta.


### 1.6 Fechamento do carimbo de revisão e data de emissão — 10/11/2026
- O formulário agora carrega `created_at` do pedido existente e consulta a data persistida após a gravação; o PDF/impresso mostra a data de emissão do registro, não a data atual do navegador.
- Estado do formulário para `savedPedidoId`, `savedOrderNumber` e `emissionDate` foi explicitamente incluído; a edição envia `pedido_id` e o botão de impressão depende do número definitivo.
- O manifesto oficial `scripts/telas-oficiais-manifest.json` foi sincronizado com os hashes das seis telas de Compras revisadas (ComprasIndustrial, ComprasPedidoForm, ComprasWorkspace, RFQ, Análise de Preços e Relatórios), registrando a autorização técnica de 10/11/2026 sem declarar aprovação final de produção.
- Foi sincronizado também o hash de `src/features/banking/BankStatementImporter.tsx` com o conteúdo que já existe em `main`; o arquivo bancário não foi alterado nesta revisão. A divergência anterior era somente hash obsoleto no manifesto.
- Conferência GitHub pós-atualização: os sete hashes consultados correspondem às entradas do manifesto. Isso é uma verificação estática do lock; o job CI não foi reexecutado depois da sincronização, portanto não declarar o gate como PASS.
- O primeiro job CI observado falhou no passo de telas oficiais antes de executar TypeScript/ESLint. Após a sincronização do manifesto, ainda falta uma execução de CI ou ambiente local para comprovar `tsc --noEmit` e lint.


### 1.7 Unificação do formulário nas duas rotas de Pedidos — 10/11/2026
- A rota `/pageprincipal/compras/industrial` (`ComprasIndustrial.tsx`) deixou de manter um segundo modal simplificado com salvamento de item único. Ela reutiliza `ComprasPedidoForm`, o mesmo formulário multi-itens com contrato remoto, edição e impressão.
- A listagem de Pedidos dessa rota agora apresenta ação Editar por registro; ao salvar, atualiza a listagem sem fechar o formulário, permitindo imprimir o pedido com número definitivo.
- A rota central `/pageprincipal/compras` (`ComprasWorkspace.tsx`) mantém a mesma ação de edição e o mesmo formulário compartilhado.
- O campo de emissão impresso usa `created_at` persistido quando disponível; falha isolada na consulta desse metadado não desfaz nem mascara a gravação concluída.
- Ambas as rotas continuam aguardando type-check/lint e teste autenticado real de criação, edição, listagem e impressão. Não avançar para a próxima tela enquanto esse aceite não estiver comprovado.


### 1.8 Correção identificada pelo type-check — 10/11/2026
- O primeiro `tsc --noEmit` da execução CI após sincronizar o manifesto apontou `TS17001` em `ComprasAnalisePrecos.tsx` (atributo JSX `className` duplicado no botão de registrar escolha).
- O botão foi corrigido para um único `className`; a comparação foi renomeada para `valorComparavel` e os textos agora dizem “valor total informado”, sem sugerir custo líquido calculado.
- A hash lock da tela foi atualizada após a correção. A nova execução do type-check ainda precisa concluir; não declarar TypeScript aprovado até o resultado dessa execução.


### 1.9 Reconciliação adicional do cabeçalho RFQ na Central de Compras — 10/11/2026
- A introspecção remota de `erp_rfq` confirmou `id`, `empresa_id`, `numero`, `status`, `data_emissao`, `data_necessidade`, `condicao_pagamento`, `prazo_resposta`, `observacoes`, `created_by`, `created_at`, `updated_at`, `fornecedor_escolhido_id` e `justificativa_escolha`. Não existem `comprador_responsavel` nem `status_aprovacao`.
- O formulário rápido de RFQ em `ComprasWorkspace.tsx` não tenta mais inserir essas duas colunas ausentes e não exibe um campo de comprador que não tinha persistência. A tabela de cotações agora mostra data de emissão, necessidade, prazo de resposta, condição e status reais.
- A resposta de fornecedor foi conferida: `erp_rfq_respostas` possui `respondido_por`, `valor_total`, `prazo_dias`, `condicao_pagamento`, `validade`, `observacoes`, `status` e timestamps. Os campos atuais de proposta estão alinhados; preço/desconto/frete/imposto/câmbio/anexo por item continuam indisponíveis.


### 1.10 Validação integral do CI e revisão estrutural das telas de Compras — 10/11/2026
- Execução GitHub Actions `42881835830` concluída com sucesso: TypeScript, ESLint, auditoria global, auditoria estrutural brutal, auditoria de interação, lazy imports, build de produção, integridade do build, rotas e contratos de regressão (incluindo shell horizontal e telas aprovadas) todos PASS.
- A auditoria de interação verificou 15 rotas e 13 arquivos obrigatórios: 0 falhas; foram identificados 10 avisos globais, dos quais dois eram os botões Editar das telas `ComprasWorkspace.tsx` e `ComprasIndustrial.tsx`. Ambos foram padronizados com `erp-edit-button erp-row-action`; manifesto de telas atualizado. A nova execução do CI após essa correção está em andamento.
- Revisão estrutural das páginas do módulo: `SolicitacaoCompra`, `ComprasRequisicoes`, `ComprasRFQ`, `ComprasAnalisePrecos`, `ComprasIndustrial`, `ComprasWorkspace`, `ComprasPedidoForm`, `RecebimentoMateriais`, `FornecedoresIndustrial` e `ComprasRelatorios`. As ações de impressão foram localizadas em Solicitação, Requisições, RFQ, Análise de Preços, Pedido/Formulário, Recebimento, Fornecedores e Relatórios; a impressão do Pedido é disponibilizada no formulário compartilhado aberto pela ação Novo/Editar.
- Introspecção remota confirmou RLS ativo em todas as tabelas de negócio consultadas (Fornecedores, Solicitações, Requisições, Itens de Requisição, RFQ, RFQ Itens, RFQ Fornecedores, Respostas RFQ, Pedidos, Itens de Pedido, Produtos, Usuários e OPs). FORCE RLS está ativo em Pedidos, Itens de Pedido, Produtos, Usuários, Empresas e OPs; policies das tabelas consultadas incluem filtro de empresa/RBAC.
- Constraints remotas confirmadas para `erp_rfq_respostas`: status `RASCUNHO/ENVIADA/ACEITA/RECUSADA`, `prazo_dias >= 0`, `valor_total >= 0` e unicidade `(rfq_id, fornecedor_id)`. O formulário não tenta usar campos não persistidos nem status fora desse conjunto.
- O teste de interação executado no CI é auditoria estrutural automatizada, não clique em navegador autenticado. Permanecem pendentes somente os testes ponta a ponta de gravação/edição com uma sessão de usuário da empresa e inspeção visual do PDF em navegador; não houve uso de credenciais, impersonação de usuário nem escrita de dados de teste na produção.
- Não houve deploy Vercel: o status do provedor indicou `build-rate-limit`. O PR #310 foi mesclado em 10/11/2026 no branch `fix/global-vercel-repair-20261110` (merge `43379427a457f734118666cc7699625a8a0d8876`).


### 1.12 Resultado final do CI e integração do PR #310 — 10/11/2026
- Execução final `42894761146` (commit `604d3c6a39d107e39cd5282306ef69cf2c95d758`) concluiu **SUCCESS**. TypeScript, ESLint, auditoria global, auditoria estrutural brutal, auditoria de interação, lazy imports, build de produção, build output, rotas, regressões de tablet/shell/logo/telas aprovadas e segurança no-bypass: todos os passos PASS.
- Auditoria estrutural final: 13 arquivos obrigatórios, 15 rotas verificadas, 0 falhas e 8 avisos globais remanescentes; nenhum aviso de padrão de edição nas telas de Compras após a correção dos botões.
- PR #310 foi mesclado no branch base `fix/global-vercel-repair-20261110` pelo merge `43379427a457f734118666cc7699625a8a0d8876`. Isso não equivale a deploy no domínio oficial.
- O check Vercel continua em falha por `build-rate-limit`; nenhum deploy foi iniciado manualmente.
- Aceite funcional final permanece condicionado a teste com sessão autenticada real da empresa (criação, edição, leitura e impressão em navegador). A infraestrutura de ferramentas desta sessão não disponibilizou sessão de usuário de teste nem navegador autenticado; não foram criados dados de produção nem simulada identidade. O CI comprova type-check/lint/build e auditorias automatizadas, não substitui esse teste E2E.
