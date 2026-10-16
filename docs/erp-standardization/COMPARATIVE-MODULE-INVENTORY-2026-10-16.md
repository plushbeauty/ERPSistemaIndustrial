# Inventário comparativo de módulos — ERP Sistema Industrial
Data da revisão: 2026-10-16
Branch de referência: `main`
Escopo: inventário estático do roteador + comparação de cobertura funcional com documentação pública de SAP S/4HANA Cloud, TOTVS Protheus e ERPNext.

## 1. Contagem objetiva do código do ERP Industrial

Extraído de `src/AppEntryV2.tsx` no branch `main`:
- **248 declarações de `<Route>`** encontradas por expressão regular.
- **247 padrões de rota únicos**; há um padrão duplicado (inclui curingas).
- **156 imports dinâmicos**.
- **11 rotas** apontam explicitamente para `IndustrialDataWorkspace`, um renderer genérico.
- **63 segmentos de primeiro nível** aparecem nas rotas; esse número inclui páginas públicas, aliases, configurações, curingas e subáreas e **não é contagem de módulos de negócio**.
- A listagem inclui domínios funcionais como Vendas, Compras, Estoque/Almoxarifado, PCP/Produção, Engenharia/BOM, Qualidade/SGQ, Fiscal/NF-e, Financeiro/Controladoria/Custos, RH, Manutenção, Expedição, Inventário, Cadastros, Usuários/RBAC, Master, Configurações, Outlook/integrações e Tablet.

**Limite da evidência:** rota e import são evidência de presença no código, não de funcionamento. Não foi executado type-check/build/E2E nesta sessão e não foi comprovado CRUD real para cada rota. Não se deve divulgar “248 módulos”; são declarações de rota.

## 2. Referências externas e como contar

Os fornecedores organizam o produto em níveis diferentes (área, módulo, submódulo, app e processo); portanto, uma contagem única não é uma comparação justa.

| Referência pública | Contagem reproduzível nesta revisão | O que a contagem significa |
|---|---:|---|
| SAP S/4HANA Cloud Public Edition | 10 áreas principais citadas na página de áreas | Asset Management, Finance, Human Resources, Manufacturing, Sourcing and Procurement, R&D/Engineering, Sales, Service, Supply Chain e Professional Services. Não é o catálogo total de apps. |
| ERPNext `modules.txt` | 21 nomes de módulos listados | Accounts, CRM, Buying, Projects, Selling, Setup, Manufacturing, Stock, Support, Utilities, Assets, Portal, Maintenance, Regional, ERPNext Integrations, Quality Management, Communication, Telephony, Bulk Transaction, Subcontracting e EDI. É contagem do arquivo, não promessa de funcionalidade em cada instalação. |
| TOTVS Protheus — Backoffice (página pública) | 18 tópicos/itens de escopo citados, contando os subitens explicitados | Inclui Faturamento, Portal de Vendas, Call Center, Contratos, Licitações, Compras, Estoque/Custos, Projetos, Financeiro, Ativo Fixo, Contabilidade Gerencial, Planejamento Orçamentário, Livros Fiscais, configuração/inteligência/automação fiscal, Administração de Vendas e Comércio Exterior. A página não apresenta um total universal de módulos. |

Fontes:
- SAP Help Portal — Areas in SAP S/4HANA Cloud Public Edition: https://help.sap.com/docs/SAP_S4HANA_CLOUD/9d794cbd48c648bc8a176e422772de7e/e237c247cc454f1b8307e52d0624d0f4.html
- ERPNext — modules.txt: https://github.com/frappe/erpnext/blob/develop/erpnext/modules.txt
- TOTVS — Tudo sobre TOTVS Backoffice / Linha Protheus: https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-backoffice-linha-protheus/
- TOTVS — principais módulos Protheus: https://www.totvs.com/blog/erp/protheus-da-totvs/

## 3. Matriz de cobertura funcional do ERP Industrial

Legenda:
- **ROTA PRESENTE**: há rota/entrada no roteador.
- **PARCIAL / A VALIDAR**: há rota ou componente, mas a evidência atual não demonstra fluxo completo, integração, permissões e persistência.
- **LACUNA DE COBERTURA A CONFIRMAR**: não foi identificada uma rota dedicada equivalente no inventário examinado; verificar se é requisito do negócio antes de construir.
- Nenhuma linha abaixo equivale a “módulo aprovado”.

| Área de referência | Evidência encontrada no ERP Industrial | Situação da auditoria | Trabalho necessário |
|---|---|---|---|
| Vendas / Selling | `/vendas`, `/vendas/novo-pedido`, `/vendas/status`, orçamentos, carteira, metas, relatórios | ROTA PRESENTE; Novo Pedido é referência visual protegida | Preservar Novo Pedido. Auditar status/listagem, cotação, aprovação, faturamento, devolução e integração estoque/financeiro. |
| Compras / Buying | `/compras`, requisições, RFQ, cotações, pedidos, recebimentos, análise de preços | PARCIAL / A VALIDAR | Confirmar ciclo requisição → cotação → aprovação → pedido → recebimento → fiscal/contas a pagar; lookup real e trilha de aprovação. |
| Estoque / Stock / WMS | `/estoque`, saldos, movimentos, endereços, ajustes, separação, etiquetas, lotes, almoxarifado | PARCIAL / A VALIDAR | Confirmar saldo transacional, lote/localização, inventário, rastreabilidade, reserva e bloqueio por qualidade; verificar migrations remotas. |
| PCP / Manufacturing | `/pcp`, ordens, execução, capacidade, agenda, sequenciamento, paradas, MRP-II, OEE, fichas | PARCIAL / A VALIDAR | Validar BOM/roteiro, capacidade finita, consumo/produção, apontamento, refugo, paradas, rastreio e integração com estoque/custos. |
| Engenharia / R&D | `/engenharia/produtos`, BOM, roteiros, revisões, ficha e fichas de processo | PARCIAL / A VALIDAR | Confirmar revisão/versionamento e efeito controlado de BOM/roteiro sobre OPs; investigar 404 de `engenharia_produtos` se persistir no Supabase. |
| Qualidade / Quality Management | inspeções, especificações, FMEA/PFMEA, RNC/CAPA, CEP, Ishikawa, GED, quarentena, metrologia, auditoria, tablet | PARCIAL / A VALIDAR | Provar fluxo inspeção → reprovação/bloqueio/quarentena → RNC/CAPA → liberação; documentos revisados, assinatura, RBAC e evidências. |
| Fiscal / Tax / NF-e | emissão, entradas, impostos, parâmetros, carteira NF-e, classificação, pendências, estornos, auditoria documental | PARCIAL / A VALIDAR — alto risco | Testar contrato fiscal, cálculos, XML, emissão/retorno e impressão. Não aplicar refatoração visual ampla no fluxo fiscal. |
| Financeiro / Finance | contas a pagar/receber, caixa, fluxo, reconciliação, extratos, ano fiscal | PARCIAL / A VALIDAR | Validar títulos e baixas reais, conciliação bancária, vencimentos, juros/descontos, centro de custo e integração contábil. |
| Contabilidade / General Ledger | razão geral e grupos contábeis aparecem em Controladoria/Fiscal | PARCIAL / A VALIDAR | Confirmar plano de contas, partidas dobradas, lançamentos, períodos/fechamento e origem automática dos lançamentos. Não presumir contabilidade completa pela existência da tela. |
| Controladoria / Custos / Budget | lucratividade, razão, auditoria de comissões, custos, central de custos, custo padrão | PARCIAL / A VALIDAR | Provar rateio, margem, custo industrial, orçamento, realizado x previsto e trilha de auditoria. |
| RH / Human Resources | funcionários, turnos, EPIs/entregas e rotas RH | PARCIAL / A VALIDAR | Confirmar admissão/cadastro, jornada/ponto, férias/folha quando dentro do escopo, treinamentos, competências, EPIs e permissões. |
| Manutenção / Asset Management | ordens, cronograma, plano mestre, indicadores | PARCIAL / A VALIDAR | Vincular ativos/equipamentos, planos preventivos, ordens corretivas, peças, paradas e custo; provar ciclo programar → executar → encerrar. |
| Expedição / Supply Chain | roteirização, portaria e páginas de expedição | PARCIAL / A VALIDAR | Validar picking, conferência, transportadora, rastreio, expedição a partir do pedido e atualização de estoque. |
| Cadastros mestres | produtos, clientes, fornecedores, tabela de preços, empresas | PARCIAL / A VALIDAR | Completar auditoria por aba/campo/lookup/validação/CRUD; preservar o cadastro de Produtos aprovado fora do escopo explicitamente autorizado. |
| Usuários / Segurança / Master | login, usuários, configurações, master, logs e permissões | PARCIAL / A VALIDAR — P0 | Provar sessão real, tenant, RBAC, RLS, grants e autorização por rota/ação; não usar sessão simulada nem supor que o ADMIN está autorizado porque a tela mostra permissões. |
| Integrações / Comunicação | Outlook configuração/caixa de entrada e telas de configuração | PARCIAL / A VALIDAR | Confirmar credenciais OAuth, callbacks, tratamento de erro, segredos server-side, sincronização e status real da integração. |
| Projetos / Professional Services | não identificada rota de gestão de projetos dedicada no inventário | LACUNA DE COBERTURA A CONFIRMAR | Decidir se ordens industriais/engenharia cobrem o uso interno ou se falta carteira de projetos, tarefas, cronograma, horas, orçamento e rentabilidade. |
| CRM / Support / Service | vendas/clientes existem; não identificada rota dedicada de CRM/helpdesk/gestão de serviços | LACUNA DE COBERTURA A CONFIRMAR | Decidir escopo: leads, oportunidades, atividades, pós-venda, chamados, SLA e contratos de serviço. Não criar sem decisão de escopo. |
| Ativo fixo / Depreciação | rota `/inventario/depreciacao` existe | PARCIAL / A VALIDAR | Verificar cadastro de ativo, aquisição, depreciação, transferência, baixa e integração contábil; inventário não prova gestão de ativos completa. |
| Planejamento orçamentário | há custos/financeiro/controladoria, sem evidência suficiente de ciclo orçamentário integral | LACUNA DE COBERTURA A CONFIRMAR | Validar orçamento por centro de custo/conta/período, alçadas, bloqueio e comparação realizado x orçado. |
| Comércio exterior / EDI / Subcontratação | não identificada rota dedicada na lista estática examinada | LACUNA DE COBERTURA A CONFIRMAR | Confirmar se a operação da empresa exige importação/exportação, EDI ou subcontratação; só então detalhar requisitos. |
| EHS / Segurança do trabalho | há RH/EPIs, mas não foi comprovada área EHS integral | LACUNA DE COBERTURA A CONFIRMAR | Avaliar incidentes, riscos, inspeções de segurança, ações preventivas e conformidade ambiental conforme escopo industrial. |
| Analytics / BI transversal | dashboards em Vendas, PCP e Qualidade, relatórios financeiros/fiscais | PARCIAL / A VALIDAR | Confirmar indicadores com fonte real, filtros, período, tenant, definição de KPI e conciliação com transações; evitar números demonstrativos. |
| Documentação / Ajuda / Auditoria | manual, ajuda, logs e GED aparecem no roteador | PARCIAL / A VALIDAR | Conferir documentação por tela, trilha de auditoria, logs imutáveis, retenção, exportação e impressão do documento/processo. |

## 4. Ordem executiva do trabalho faltante

### P0 — primeiro, impedir falsa conclusão
1. Rodar `npm run verify:production` no checkout real e guardar logs completos. No momento desta revisão não há resultado local verificável; Vercel já reportou bloqueio `build-rate-limit` em commits anteriores.
2. Conferir os 247 padrões de rota únicos: existência de arquivo/export, aliases duplicados, lazy imports quebrados, fallback/catch-all e navegação autenticada.
3. Fechar Auth/RBAC/tenant/RLS remotamente: usuário real, empresa, permissões, grants, RPC e isolamento entre empresas. Não declarar módulo funcional antes disso.
4. Revisar migrations de tabelas consultadas e confirmar aplicação no projeto Supabase correto. Não renomear tabelas nem inventar colunas/RPC para suprimir 404.
5. Revisar 11 rotas que usam `IndustrialDataWorkspace` uma a uma; validar se o formulário genérico é suficiente para cada processo.

### P1 — processos industriais críticos
6. PCP/Manufatura + Engenharia/BOM + Estoque: ordem ponta a ponta, reserva/baixa de material, apontamento, lote, custo, rastreabilidade e capacidade.
7. Qualidade/SGQ: especificação vigente, inspeção, bloqueio de lote, quarentena, RNC/CAPA, evidência e liberação.
8. Compras: requisição, cotação, aprovação, pedido, recebimento, inspeção e contas a pagar.
9. Fiscal/NF-e: contratos, XML, cálculo e emissão; testes de regressão antes/depois de qualquer mudança.
10. Vendas: status de pedidos, transições, saldo/reserva, faturamento e ligação com fiscal/financeiro, preservando Novo Pedido.

### P2 — completar e padronizar
11. Financeiro/Contabilidade/Custos: conciliação, razão, fechamento, orçamento e custo industrial.
12. Manutenção/Ativos, Expedição e RH: ciclos completos com dados reais e evidência.
13. Cadastros mestres, logs, integrações e configuração administrativa.
14. Tomar decisão de escopo para CRM/Service, Projetos, EHS, Comércio Exterior/EDI e subcontratação.
15. Só então padronizar o restante das telas com a referência interna; não mudar a tela aprovada Novo Pedido.

### Critério de saída por rota
- Rota e componente real identificados.
- Contrato de dados e migration verificados no Supabase ativo.
- Consulta, criação, edição, validação, permissões e isolamento de tenant testados quando aplicáveis.
- Impressão/exportação verificada quando existir.
- `type-check`, lint, auditorias, lazy imports, rotas e build com resultados registrados.
- Evidência visual desktop/mobile e commit associado.
- Apenas então marcar como concluído no `COMPLETED.md`.

## 5. Status desta revisão

**Inventário estático e matriz de comparação documentados; auditoria funcional geral NÃO concluída.** O próximo trabalho é provar rotas e fluxos reais, não aumentar a contagem de telas. Nenhum módulo foi declarado completo por esta comparação.
