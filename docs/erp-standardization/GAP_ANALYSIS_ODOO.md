# Gap Analysis — SYSNQRA ERP Industrial vs. Odoo / ERPNext

- Data: 2026-11-11 | Branch: main | HEAD de referência: `506df820dafc4a4a5745d630d2d1a4e063bc0f40`
- Método: análise estática de `src/AppEntryV2.tsx`, componentes `src/pages/`, migrations `supabase/migrations/`, documentação e gates.
- Limite: rota, componente ou migration não comprovam operação funcional, aplicação remota, RLS efetiva, homologação fiscal nem teste ponta a ponta. Classificação conservadora.

## 1. Resumo Executivo

O repositório possui cobertura ampla de ERP industrial: Vendas, Compras, Estoque, PCP/MRP, Engenharia/BOM, Qualidade/SGQ, Fiscal/NF-e, Financeiro/Controladoria, RH, Manutenção, Expedição e Administração multiempresa. Existem migrations transacionais, RPCs, RLS, RBAC e gates de release. A cobertura é desigual e não equivale a um ERP corporativo completo.

A auditoria de UI de 11/11/2026 analisou 244 arquivos e 334 declarações de rota: apenas 3 arquivos utilizavam tokens compartilhados de formulário, 94 apresentavam indícios de estilos locais e 208 tinham controles sem altura estática detectável. Trata-se de medição estática, não de inspeção visual.

Principais riscos: contabilidade de partidas dobradas não comprovada; cadeia integrada de compras/recebimento/fatura incompleta; validação remota de schema/RLS pendente; processos CRM e RH com cobertura não comprovada; e necessidade de E2E industrial completo. Classificação geral: **ERP industrial em evolução, com cobertura funcional parcial**.

## 2. Inventário de Módulos Implementados

| Módulo | Capacidades identificadas | Principais arquivos / modelos | Status |
|---|---|---|---|
| Vendas / CRM | clientes, pedidos, PDV, catálogo, metas, status, análise de custos, comissões e integração PCP | `VendasCentral.tsx`, `VendasClientes.tsx`, `VendasPDV.tsx`, migrations `vendas_*` | Parcial; leads/oportunidades não comprovados |
| Compras | requisições, RFQ, análise de preços, pedidos, fornecedores, aprovação e RPC | `ComprasWorkspace.tsx`, `ComprasRFQ.tsx`, `ComprasRequisicoes.tsx`, migrations `erp_compras_*` | Parcial; 3-way matching não comprovado |
| Estoque / WMS | saldos, ajustes, separação, etiquetas, lotes, validade, rastreabilidade e inventário | `EstoqueAjustes.tsx`, `EstoqueSeparacao.tsx`, `EstoqueRastreabilidadeLotes.tsx`, migrations `estoque_*` | Parcial; valoração/reabastecimento não comprovados |
| PCP / Manufatura / MRP | ordens, programação, capacidade, Gantt, sequenciamento, OEE, apontamentos e chão de fábrica | `PCPOrdens.tsx`, `PCPAgendaMaquinas.tsx`, `PCPCapacidade.tsx`, `PCPExecucaoIndustrial.tsx`, migrations `pcp_*` | Parcial avançado; E2E pendente |
| Engenharia | BOM, revisões e fichas/processos técnicos | `EngenhariaBOM`, `EngenhariaRevisoesBOM`, `FichaEngenharia` | Parcial |
| Qualidade / SGQ | inspeções, RNC, CAPA, FMEA, metrologia, GED, quarentena e genealogia | `QualidadeInspecoesIndustrial.tsx`, `SalaRNC`, `GEDDocumentos.tsx`, migrations `quality_*` | Parcial; parecer documental não é liberação operacional |
| Fiscal / NF-e | regras fiscais, carteira, emissão, rascunho transacional e Edge Function | `NFeEmissao.tsx`, `Fiscal.tsx`, `supabase/functions/emitir-nfe/`, migrations `fiscal_*` | Parcial; homologação/SEFAZ pendente |
| Financeiro / Controladoria | títulos, parcelas, baixas, fluxo de caixa, conciliação e custos | `FinanceiroTitulos.tsx`, `FinanceiroFluxoCaixa.tsx`, `CentralCustosIndustrial.tsx`, migrations `financeiro_*` | Parcial; GL/partidas dobradas não comprovados |
| RH | funcionários, turnos, EPIs, avaliações e acidentes/documentos | `RHIndustrial.tsx`, `RHSubmodules.tsx`, migrations `rh_*` | Parcial; folha/ponto completo não comprovados |
| Manutenção / TPM | central, cronograma, ordens e indicadores | `ManutencaoCentral.tsx`, `ManutencaoCronograma.tsx`, `ManutencaoOrdens.tsx` | Básico/parcial |
| Expedição | roteirização, portaria, NF-e, romaneio e etiquetas | componentes `Expedicao*`, `RomaneioCarga` | Parcial |
| Administração / Segurança | usuários, RBAC, tenant, Master, logs e configurações | `AccessControlSettings.tsx`, `UsuariosAdmin.tsx`, migrations de permissões | Parcial; cobertura RLS integral não comprovada |

## 3. Análise de Lacunas por Domínio

### 3.1 Contabilidade e Finanças

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| Contas a pagar/receber | títulos, faturas, pagamentos e integração contábil | Parcial — títulos, parcelas e baixas identificados | Alto / Médio |
| Razão geral / partidas dobradas | lançamentos balanceados por diário, conta e período | Ausente / não comprovado | Alto / Alto |
| Conciliação bancária | extrato, matching, divergências e reconciliação | Parcial — fluxo identificado, operação não validada | Alto / Alto |
| Impostos e regras fiscais | impostos configuráveis e contabilização | Parcial — regras/parametrização versionadas | Alto / Alto |
| Multimoeda | moedas, taxas históricas e variação cambial | Ausente / não evidenciado | Médio / Alto |
| Fechamento e demonstrações | períodos, balancete, DRE e balanço reconciliados | Ausente / não comprovado | Alto / Alto |
| Custos industriais | custo padrão, custo real e custo por OP | Parcial — componentes/migrations presentes | Alto / Alto |

### 3.2 Estoque e Armazéns

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| Movimentações por depósito | ledger e documentos de entrada/saída/transferência | Parcial — saldos, ajustes, separação e recebimento | Alto / Alto |
| Lote, série e validade | rastreamento ponta a ponta em movimentos | Parcial — telas e migrations identificadas | Alto / Alto |
| Multi-armazém / endereçamento | depósitos, posições, picking e putaway | Parcial — inventário/endereço presentes | Alto / Alto |
| Reabastecimento | regras min/max, lead time e procurement | Parcial — MRP existe, automação não comprovada | Alto / Alto |
| Valoração | FIFO/média, landed cost e integração contábil | Ausente / não comprovado | Alto / Alto |
| Inventário cíclico | contagem, aprovação e ajuste auditável | Parcial — conferência/inventário versionados | Alto / Médio |

### 3.3 Vendas e CRM

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| Clientes e contatos | cadastro reutilizado em transações | Parcial — cadastros existentes | Alto / Médio |
| Leads e oportunidades | pipeline, atividades, origem e conversão | Ausente / não evidenciado | Médio / Médio |
| Cotações e pedidos | cotação → pedido → entrega → fatura → pagamento | Parcial — pedidos e integração industrial identificados | Alto / Alto |
| Lista de preços | regras por cliente, quantidade e validade | Parcial — reajuste/análise de custos presentes | Alto / Médio |
| Comissão | regra, cálculo e auditoria | Parcial — módulo/migrations identificados | Médio / Médio |
| Atividades e campanhas | e-mails, chamadas, reuniões e campanhas vinculados ao CRM | Ausente / não comprovado | Médio / Médio |

### 3.4 Compras e Suprimentos

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| Requisição e RFQ | demanda, cotação e comparação de fornecedores | Parcial — requisições/RFQ/análise presentes | Alto / Médio |
| Pedido de compra | aprovação, fornecedor, itens, preço e entrega | Parcial — RPC e telas presentes; validação tenant em andamento | Alto / Alto |
| Recebimento e inspeção | recebimento gera estoque e inspeção | Parcial — telas de recebimento e SGQ existem; E2E pendente | Alto / Alto |
| Fatura de fornecedor | fatura vinculada ao pedido/recebimento | Ausente / não comprovado | Alto / Alto |
| Conferência 3 vias | pedido x recebimento x fatura, tolerâncias e bloqueios | Ausente / não comprovado | Alto / Alto |
| Scorecard fornecedor | prazo, preço, qualidade e não conformidades | Parcial / não comprovado operacionalmente | Médio / Médio |

### 3.5 Manufatura / MRP

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| BOM multinível e revisões | estrutura versionada, componentes e validade | Parcial — Engenharia/BOM e revisões identificadas | Alto / Alto |
| Ordens de produção | reserva, consumo, produção e encerramento | Parcial — PCPOrdens e RPCs identificadas | Alto / Alto |
| Roteiros e centros de trabalho | operações, máquinas, tempos e capacidade | Parcial — agenda, capacidade e fichas presentes | Alto / Alto |
| Planejamento de materiais | MRP com estoque, lead time e compras | Parcial — MRP e migrations presentes | Alto / Alto |
| Apontamento e rastreabilidade | operador, operação, lote, tempo e quantidade | Parcial — chão de fábrica/apontamentos identificados | Alto / Alto |
| Subcontratação | envio de material, operação externa e retorno | Ausente / não evidenciado | Médio / Alto |
| Refugo e retrabalho | perdas, motivo, custo e reentrada controlada | Parcial — Qualidade/refugos/RNC identificados | Alto / Médio |

### 3.6 RH e Folha

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| Diretório de funcionários | cadastro e vínculo organizacional | Parcial — RHIndustrial e migrations | Médio / Médio |
| Frequência e ponto | marcações, escalas, aprovações e banco de horas | Parcial / não comprovado integralmente | Alto / Alto |
| Férias e licenças | saldo, solicitação, aprovação e calendário | Ausente / não evidenciado | Médio / Alto |
| Folha e encargos | rubricas, cálculo e obrigações legais | Ausente / não evidenciado | Alto / Muito alto |
| Turnos e EPIs | escalas e entrega rastreável | Parcial — telas e migrations recentes | Médio / Médio |
| Horas por OP | timesheet ligado à produção e custo | Parcial — apontamento existe; integração RH/custos pendente | Médio / Alto |

### 3.7 Sistema e Controle de Acesso

| Funcionalidade / Capacidade | Padrão Odoo / ERPNext | Status Atual do Sistema | Impacto no Negócio e Complexidade |
|---|---|---|---|
| RBAC por ação/documento | leitura, criação, edição, exclusão e etapas | Parcial — RBAC e `erp_has_permission` identificados | Alto / Alto |
| Isolamento multiempresa | regras por empresa em cada documento | Parcial — `empresa_id`, helpers e RLS; testes remotos pendentes | Crítico / Alto |
| Histórico de alterações | ator, documento, ação e antes/depois | Parcial — logs em fluxos específicos | Alto / Alto |
| Fluxos de aprovação | alçadas, responsáveis e transições | Parcial — Compras/Fiscal identificados | Alto / Alto |
| API e webhooks | contratos versionados, autenticação, retry e observabilidade | Parcial / não inventariado integralmente | Médio / Alto |
| Permissão por campo/registro | regras por documento, campo e proprietário | Parcial — policies e permissões presentes; matriz completa pendente | Crítico / Alto |

## 4. Lacunas Críticas de Arquitetura e Transversais

1. **Partidas dobradas:** comprovar lançamentos balanceados, diários, períodos, estornos e fechamento antes de classificar o Financeiro como contabilidade completa.
2. **Rastreabilidade ponta a ponta:** fechar pedido de venda → MRP → reserva → OP → consumo → inspeção → expedição → NF-e → contas a receber → baixa.
3. **Procure-to-pay:** completar pedido → recebimento → inspeção → fatura → 3-way matching → pagamento.
4. **Tenant/RLS:** testar por usuário, empresa e papel; filtro frontend não substitui RLS.
5. **RBAC:** provar que cada ação da UI é protegida também por RPC/banco/Edge Function.
6. **Auditoria:** padronizar ator, empresa, documento, ação, antes/depois, timestamp e origem.
7. **Workflow:** unificar estados, alçadas, segregação de funções, cancelamento e trilha de aprovação.
8. **Fiscal brasileiro:** homologar SEFAZ, contingência, cancelamento, inutilização e eventos em ambiente controlado.
9. **Schema remoto:** reconciliar migrations com Supabase ativo sem alterar histórico aplicado ou inventar colunas.
10. **UI:** conferir abas, modais, impressão, tablet e responsividade; reduzir estilos locais e controles sem altura padronizada.
11. **E2E:** criar jornadas autenticadas com tenants isolados e sem mocks de negócio.
12. **Resiliência:** logs, idempotência, retries, filas, alertas e reconciliação de integrações.

## 5. Roadmap Recomendado

### Curto prazo
- Fechar UI-001/UI-002 com JSON atual e inventário completo de rotas/imports/re-exports.
- Manter verdes gates de release, NF-e e tenant.
- Reconciliar migrations, tabelas e RPCs com Supabase ativo.
- Testar autenticação, RBAC e RLS por tenant.
- Fechar Compras até recebimento e conferência fiscal/financeira.
- Validar PCP + Engenharia/BOM + Estoque + Qualidade + Expedição em jornada integrada.
- Padronizar telas conforme backlog, preservando telas aprovadas.

### Médio prazo
- Implementar GL de partidas dobradas, fechamento e demonstrações.
- Integrar valoração de estoque à contabilidade.
- Completar CRM de leads/oportunidades e atividades.
- Expandir workflows e auditoria transversal.
- Completar ponto, férias, licenças e custos de mão de obra.
- Criar E2E e regressão visual para módulos críticos.

### Longo prazo
- Multimoeda, consolidação multiempresa e orçamento avançado.
- Reabastecimento preditivo e planejamento avançado de capacidade.
- Subcontratação, portal de fornecedores e scorecards automáticos.
- Ativos/depreciação e manutenção integrados ao razão.
- APIs/webhooks versionados e observabilidade completa.

## Referências de benchmark

- ERPNext: https://docs.erpnext.com/ e https://frappe.io/ERPNext/Modules
- ERPNext — permissões por papel/documento/campo: https://docs.frappe.io/erpnext/permissions
- ERPNext — CRM e ciclo de vendas: https://docs.frappe.io/erpnext/CRM e https://docs.frappe.io/erpnext/selling
- Odoo — documentação oficial por aplicações: https://www.odoo.com/documentation/
- Odoo — localização brasileira: https://docs.kmee.com.br/en/odoo/

## Evidências internas utilizadas

`docs/erp-standardization/REFERENCE.md`, `BACKLOG.md`, `ROUTE-AUDIT-2026-10-16.md`, `src/AppEntryV2.tsx`, componentes e migrations citados neste documento, workflows de CI e Production Gate.
