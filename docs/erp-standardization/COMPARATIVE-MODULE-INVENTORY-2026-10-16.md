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


## 6. Catálogo funcional dos ERPs de referência e correspondência no ERP Industrial

Esta seção é o levantamento pedido: cada família abaixo explica para que serve e indica se há rota equivalente no ERP Industrial segundo `src/AppEntryV2.tsx` e os itens de navegação de `src/pages/configuracoes/ConfiguracoesADM.tsx`. “Encontrado” significa apenas que há entrada/rota identificável; não significa equivalência completa.

### 6.1 ERPNext — módulos declarados no código-fonte oficial

Fonte primária: https://github.com/frappe/erpnext/blob/develop/erpnext/modules.txt

| Módulo ERPNext | O que faz | Correspondência no ERP Industrial |
|---|---|---|
| Accounts | Contabilidade, lançamentos, contas, demonstrações e relatórios financeiros | Parcial: Financeiro, Controladoria, razão geral/grupos contábeis; validar diário, plano de contas e fechamento |
| CRM | Leads, oportunidades, atividades e relacionamento comercial | Parcial: clientes/vendas existem; não identificada área CRM dedicada a leads e pipeline |
| Buying | Fornecedores, requisições, cotações, pedidos e aquisição | Encontrado: Compras, RFQ, cotações, requisições e pedidos |
| Projects | Projetos, tarefas, prazos, equipe, horas e custo | Não identificada área dedicada de projetos; confirmar escopo |
| Selling | Clientes, preços, propostas, pedidos e faturamento | Encontrado: Vendas, orçamentos, pedidos, tabela de preços e expedição |
| Setup | Configuração geral, empresa e parâmetros do ERP | Encontrado: Configurações, Configurações ADM, empresa e codificação |
| Manufacturing | BOM, ordens, operações, planejamento e produção | Encontrado: PCP, produção, engenharia/BOM, roteiros, fichas e chão de fábrica |
| Stock | Depósitos, entradas/saídas, transferências, inventário, lotes e avaliação | Encontrado: Estoque, almoxarifado, inventário, endereços, lotes e movimentos |
| Support | Chamados, fila, atribuição, SLA e resolução | Não identificada central de helpdesk/SLA dedicada; confirmar necessidade |
| Utilities | Utilitários compartilhados, importação/exportação e ferramentas operacionais | Parcial: importadores/relatórios existem em áreas distintas; não há evidência de central unificada |
| Assets | Ativos, depreciação, movimentação e baixa patrimonial | Parcial: rota de depreciação existe; validar cadastro e ciclo contábil completo de ativo |
| Portal | Área externa para clientes/fornecedores acessarem serviços e documentos | Não identificada rota de portal externo dedicado no inventário |
| Maintenance | Equipamentos, manutenção preventiva/corretiva e ordens | Encontrado: manutenção, cronograma, plano mestre, ordens e indicadores |
| Regional | Localizações legais/fiscais por país e regras regionais | Parcial: Fiscal/NF-e brasileiro existe; validar cobertura fiscal e obrigações específicas |
| ERPNext Integrations | Configuração de conexões com serviços externos | Parcial: Outlook e integrações citadas em Configurações ADM; sem catálogo central comprovado |
| Quality Management | Inspeções, planos, não conformidade e controle da qualidade | Encontrado: Qualidade/SGQ, inspeções, FMEA, RNC/CAPA, CEP, GED e quarentena |
| Communication | Mensagens, notificações, comunicações e histórico | Parcial: Outlook/caixa de entrada e logs; comunicação interna central não identificada |
| Telephony | Telefonia integrada e registros de chamadas | Não identificada integração de telefonia dedicada |
| Bulk Transaction | Processamento/importação em lote de transações | Parcial: importador aparece; não identificada central geral de transações em lote |
| Subcontracting | Envio de materiais a terceiros e retorno de produtos/serviços subcontratados | Não identificada rota dedicada; confirmar se processo industrial exige |
| EDI | Troca eletrônica estruturada de documentos com parceiros | Não identificada rota dedicada de EDI; confirmar necessidade comercial/fiscal |

### 6.2 Odoo — famílias de aplicações e responsabilidades

Fontes: https://www.odoo.com/documentation/18.0/applications.html e https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp.html

| Família Odoo | O que faz | Correspondência no ERP Industrial |
|---|---|---|
| Finance / Accounting / Invoicing | Contabilidade de partidas dobradas, faturamento, contas, pagamentos, reconciliação bancária, orçamento e ativos | Parcial: financeiro/fiscal/razão/custos existem; validar partidas dobradas, reconciliação, orçamento e ativo integrado |
| Expenses | Despesas e reembolsos de funcionários | Não identificada rota dedicada |
| Sales | Orçamentos, pedidos, condições, contratos, devoluções e faturamento | Encontrado em Vendas; validar devoluções/contratos e transição completa |
| CRM | Funil de leads/oportunidades e atividades | Não identificada área CRM completa |
| Point of Sale | Venda rápida no balcão, caixa e pagamentos | Rota `/vendas/pdv` existe |
| Subscriptions / Rental | Recorrência, assinatura, aluguel, cobrança periódica | Não identificada rota dedicada |
| Website / eCommerce | Catálogo público, carrinho, pedidos e conta do cliente | Há catálogo digital/gestão; não comprova e-commerce completo nem portal |
| Purchase | Solicitação, fornecedores, cotação, aprovação e pedido | Encontrado em Compras |
| Inventory / WMS / Barcode | Armazéns, endereços, operações, lotes/séries, reabastecimento, avaliação e leitura de códigos | Encontrado em Estoque/Almoxarifado; validar barcode e regras avançadas |
| Manufacturing / MRP | BOM, ordens, centros de trabalho, programação, custo e apontamento | Encontrado em PCP/Engenharia; validar capacidade finita e custo real |
| Quality | Pontos de controle, verificações e alertas de qualidade | Encontrado em Qualidade/SGQ |
| Maintenance | Equipamentos, calendário, solicitações e manutenção preventiva/corretiva | Encontrado em Manutenção |
| PLM | Ciclo de vida de produto, revisões e mudanças de engenharia | Parcial: Engenharia/BOM/revisões existem; validar processo formal de alteração e aprovação |
| Human Resources | Funcionários, presença, folgas, recrutamento, avaliação e folha conforme edição/localização | Parcial: RH, funcionários, turnos e EPIs; não identificada cobertura completa de folha/recrutamento/ausências |
| Project / Timesheets / Planning | Projetos, tarefas, horas e alocação de recursos | Não identificada área dedicada completa |
| Field Service | Agendamento, execução e custos de serviços externos | Não identificada rota dedicada |
| Helpdesk | Chamados, SLA, filas e suporte | Não identificada rota dedicada |
| Documents / Sign | Arquivos, versões, assinatura e aprovação documental | Parcial: GED/qualidade existe; assinatura e gestão documental transversal devem ser confirmadas |
| Marketing / Events / Surveys | Campanhas, automação, eventos e pesquisas | Não identificada cobertura dedicada |
| Users / Companies / Access Rights | Usuários, grupos, permissões por app, multiempresa e administração | Encontrado em Usuários/Configurações ADM/Master; auditar RBAC, tenant, RLS, sessão e segurança de ponta a ponta |
| Authentication / Integrations | Login, autenticação adicional e conexões externas | Parcial: Supabase Auth e Outlook existem; MFA, revogação de sessões e catálogo central não comprovados |
| IoT | Integração com dispositivos, códigos de barras e chão de fábrica | Tablet/PCP existem; integração IoT específica não identificada |

### 6.3 TOTVS Protheus — famílias usuais e responsabilidades

Fontes: https://www.totvs.com/blog/erp/protheus-da-totvs/ e https://www.totvs.com/blog/erp/modulos-do-erp/

| Família Protheus / função | O que faz | Correspondência no ERP Industrial |
|---|---|---|
| Compras | Requisições, cotação, aprovação por alçada, pedido e entrada | Encontrado em Compras; validar alçadas e vínculo com recebimento/fiscal |
| Estoque e Custos | Saldos, inventário, movimentação, rastreabilidade e custo | Encontrado em Estoque/Inventário/Custos |
| Faturamento | Documentos de venda, notas fiscais, devoluções e política comercial | Parcial: Vendas/Fiscal/NF-e; validar integração transacional |
| Financeiro | Contas a pagar/receber, caixa, bancos, cobrança e tesouraria | Encontrado como rotas Financeiro; validar baixa, conciliação e integrações |
| Fiscal | Apuração, livros, obrigações e documentos fiscais | Encontrado em Fiscal; alto risco, validar com testes reais |
| Contabilidade Gerencial | Plano de contas, lançamentos, razão e demonstrativos | Parcial: razão/grupos contábeis; validar contabilidade integral |
| PCP | Planejamento, ordens, programação, consumo e apontamento | Encontrado em PCP; validar fluxo ponta a ponta |
| RH / Gestão de pessoal | Pessoas, jornada, folha, benefícios e obrigações conforme escopo | Parcial: funcionários/turnos/EPIs; folha e jornada completas não identificadas |
| Ativo fixo | Cadastro patrimonial, depreciação, transferência e baixa | Parcial: rota de depreciação; validar ciclo patrimonial |
| Controle de alçadas | Aprovação de compras/vendas por valor, desconto ou perfil | Não identificada como módulo independente; conferir regras existentes de aprovação em cada processo |
| CRM / Gestão comercial | Leads, atividades, oportunidades e relacionamento | Parcial: vendas/clientes, sem CRM dedicado identificado |
| Contratos | Contratos comerciais, vigência, reajuste e obrigações | Não identificada área contratual dedicada |
| Projetos | Orçamento, etapas, custo e execução por projeto | Não identificada área dedicada |
| Comércio exterior | Importação/exportação, documentos e custos aduaneiros | Não identificada rota dedicada |
| BI / Analytics | Indicadores gerenciais com dados transacionais | Dashboards em Vendas/PCP/Qualidade; cobertura transversal não identificada |
| Portal de vendas | Autosserviço de vendedores, carteira e pedidos | Há páginas de Vendas/Tablet; portal separado não identificado |
| Gestão documental / auditoria | Documentos, rastreio, registros e trilha de ações | GED e logs existem; verificar auditoria transversal e imutabilidade |

## 7. Levantamento específico: Segurança, Administração e Governança

A comparação com Odoo (usuários, direitos de acesso, grupos, multiempresa, dispositivos de sessão, redefinição de senha e MFA) mostra que “Segurança” não deve ser apenas um atalho. É uma família de controles com estes componentes:

| Componente de segurança | Para que serve | Evidência de rota/entrada no ERP Industrial | Gap a registrar |
|---|---|---|---|
| Identidade e autenticação | Login/logout, recuperação de senha, política de credenciais e sessão | `/login`, `/recuperar-senha` e uso de Supabase Auth no código | Confirmar expiração, renovação, encerramento e comportamento ao fechar navegador conforme requisito |
| Usuários e estado de conta | Criar/desativar usuários, associar perfil e empresa | `/usuarios`, `/usuarios-admin`, `/configuracoes-adm/usuarios` | Confirmar fluxo sem duplicidade, desativação e tenant |
| RBAC / perfis / matriz de permissões | Conceder permissões por módulo e ação (leitura/criação/edição/exclusão/aprovação) | `/configuracoes-adm/perfis`, `/configuracoes-adm/permissoes`; componente ConfiguracaoPermissoes | Verificar matriz real no banco, função de autorização, permissões efetivas e enforcement em servidor/RLS |
| Isolamento multiempresa / tenant | Impedir que usuário leia/edite dados de outra empresa | Campo `empresa_id` e perfil consultado no código de Configurações ADM | Confirmar RLS em cada tabela, políticas e testes cruzados entre empresas |
| Administração Master | Gestão global separada da administração de uma empresa | `/master`, `/cadastro-master` e `/configuracoes-adm` | Confirmar segregação de privilégio, trilha e prevenção de acesso cruzado |
| Logs e auditoria | Registrar ator, ação, data, entidade e resultado; permitir investigação | `/admin/logs`, `/configuracoes-adm/logs` | Verificar eventos cobertos, escopo RLS, retenção e proteção contra alteração |
| Sessões e dispositivos | Ver sessões ativas, revogar sessão/dispositivo e investigar acesso | Atalho `/configuracoes-adm/seguranca` | Não há evidência de ferramenta administrativa real de revogação; o código da página informa que depende de API autorizada |
| MFA / autenticação forte | Segundo fator, política por perfil e recuperação segura | Não identificada rota específica de MFA | Não identificado no inventário; definir requisito e integração antes de construir |
| Senhas e recuperação | Reset seguro, expiração/política, proteção contra abuso | `/recuperar-senha` | Verificar fluxo remoto e políticas; não assumir por existir a rota |
| Aprovação e segregação de funções | Impedir autoaprovação ou concentração indevida de ações críticas | Rotas de Compras/Vendas existem | Confirmar alçadas e regras de conflito de funções |
| Backups e recuperação de desastre | Cópias, retenção, restauração testada, RPO/RTO e alertas | `/configuracoes-adm/backups` | A tela existente não prova execução automática/restauração; validar infraestrutura e evidências de restore |
| Segredos e integrações | Guardar tokens no servidor, OAuth seguro, rotação e auditoria | `/outlook/configuracao`, atalho `/configuracoes-adm/integracoes` | Confirmar segredo fora do cliente, escopos OAuth, rotação e falhas |
| Configuração e mudança | Parametrização por empresa, rastreio de alterações e rollback | `/configuracoes-adm/empresa`, `/codificacao`, `/sistema` | Confirmar persistência, autorização e histórico das mudanças |
| Auditoria de acesso e alertas | Tentativas de login, bloqueios, anomalias e alertas | Logs/admin presentes | Não identificada cobertura completa de alertas; verificar se é requisito |
| Exportação, privacidade e retenção | Exportar dados autorizados, retenção e eliminação conforme política | Não identificada central de governança dedicada | Definir requisito LGPD e trilha antes de afirmar cobertura |

**Conclusão objetiva de segurança:** o ERP possui rotas e componentes para usuários, perfis, permissões, logs, backups e Master. O inventário não encontrou evidência de rotas dedicadas para MFA, painel de sessões/dispositivos, portal externo, central de alertas de segurança ou EDI/telefonia. Algumas dessas funções podem existir em serviços externos ou dentro de telas atuais; devem ser verificadas no código e configuração antes de classificá-las como ausentes. O código da própria Configurações ADM declara que revogação administrativa de sessões e catálogo central de integrações não estão confirmados.

## 8. Resumo das lacunas por família

1. **Famílias com presença explícita no roteador:** Vendas, Compras, Estoque, PCP/Produção, Engenharia/BOM, Qualidade, Fiscal, Financeiro, RH, Manutenção, Expedição, Inventário, Usuários/Configurações ADM/Master e relatórios/dashboards.
2. **Famílias com presença parcial ou não dedicada:** Contabilidade integral, CRM, Ativos, PLM/mudanças de engenharia, orçamento, portal externo, gestão documental transversal, IoT, comunicação interna, analytics transversal, alçadas independentes e gestão de contratos.
3. **Famílias sem rota dedicada identificada no inventário:** Projetos/Timesheets, Helpdesk/SLA, Field Service, MFA/painel de sessões, EDI, telefonia, marketing, e-commerce completo, comércio exterior e subcontratação.
4. Essa classificação responde à pergunta “tem módulo equivalente no código?”; não afirma funcionamento e não exige implementar tudo indiscriminadamente. O escopo industrial deve priorizar processos usados pela empresa e requisitos legais/operacionais.

## 9. Fontes adicionais consultadas
- Odoo — catálogo de aplicações: https://www.odoo.com/documentation/18.0/applications.html
- Odoo — Inventário, MRP e manutenção: https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp.html
- Odoo — usuários, sessões/dispositivos e multiempresa: https://www.odoo.com/documentation/18.0/pt_BR/applications/general/users.html
- Odoo — direitos de acesso e grupos: https://www.odoo.com/documentation/18.0/pt_BR/applications/general/users/access_rights.html
- TOTVS — módulos de ERP e responsabilidades: https://www.totvs.com/blog/erp/modulos-do-erp/
- SAP — áreas de S/4HANA Cloud: https://help.sap.com/docs/SAP_S4HANA_CLOUD/9d794cbd48c648bc8a176e422772de7e/e237c247cc454f1b8307e52d0624d0f4.html
