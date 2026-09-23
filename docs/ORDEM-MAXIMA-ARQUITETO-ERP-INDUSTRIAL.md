# ORDEM MÁXIMA DE ARQUITETURA — ERP INDUSTRIAL TOTAL

## Objetivo
Transformar esta branch em um ERP industrial real, operacional e homologável. O PDF `ERP_Industrial_Completo_Projeto_Telas (1).pdf` é a referência visual e funcional obrigatória. O código já existente no repositório é patrimônio do projeto: reutilizar componentes, páginas, consultas, funções, estilos e fluxos que já funcionam antes de criar novos.

## Regra absoluta
NÃO criar tela demonstrativa, mock, card com número inventado, tabela estática, botão sem persistência, sucesso falso, select gigante, fluxo quebrado, placeholder como implementação ou módulo duplicado.
Se uma função não estiver implementada de ponta a ponta, marcar como PENDENTE e continuar a implementação.
Toda gravação só pode informar sucesso depois de resposta positiva do banco/API.
Toda leitura operacional deve vir de dados reais.
Toda alteração precisa respeitar tenant/empresa, RLS, permissões e auditoria.

## Fonte de verdade
1. PDF do projeto de telas.
2. Schema real do Supabase.
3. Código existente que já funciona.
4. Fluxos e referências funcionais já incorporados ao projeto.
Não substituir o PDF por uma interpretação própria.

## Shell obrigatório
/erp-industrial deve sempre montar um shell estável independente dos módulos:
- marca SGQ ERP INDUSTRIAL;
- empresa/filial real da sessão;
- cliente/tenant quando aplicável;
- usuário real;
- planta/status real;
- data e hora vivas;
- pesquisa;
- Tablet;
- tema;
- logout;
- Error Boundary visível.
Um erro de módulo não pode apagar o shell nem produzir tela preta.

## Padrão de todas as telas
Topo: título, código/documento, status, empresa/filial e ações.
Filtros: período, filial, planta, depósito, centro de custo, cliente/fornecedor, produto, status, responsável conforme o domínio.
Formulários: labels claros, unidade, máscara, validação, obrigatoriedade, ajuda contextual, autocomplete e histórico.
Grades: ordenação, filtro por coluna, seleção, paginação, totalizadores, exportação e colunas configuráveis.
Status: Rascunho, Em análise, Aguardando aprovação, Aprovado, Liberado, Em execução, Bloqueado, Cancelado, Encerrado.
Tablet/chão de fábrica: toque grande, QR/código de barras, confirmação visual e operação com luvas.

## Fluxos obrigatórios de negócio
### Vendas → Produção
Pedido → disponibilidade → MRP → OP → apontamento → inspeção → estoque acabado → faturamento → expedição.

### Compras
Solicitação → cotação → mapa comparativo → aprovação → pedido → recebimento NF/XML → inspeção → estoque → contas a pagar → contabilidade.

### Recebimento
NF/XML → validação fiscal → conferência física → lote/validade → endereço WMS → financeiro → contábil.

### Qualidade
Plano → coleta → resultado → aprovado/reprovado → NC → causa → ação corretiva/preventiva → eficácia → encerramento.

### Engenharia
Produto → BOM → roteiro → ficha de processo → aprovação → revisão → publicação → PCP/OP.

## PCP — implementação completa
Não tratar PCP como calendário.
Deve existir:
- Pedidos pendentes;
- carteira de pedidos;
- previsão/demanda;
- PMP;
- MRP;
- MRP II/necessidades;
- capacidade;
- sequenciamento;
- calendário;
- cenários/exceções;
- reserva de materiais;
- geração e acompanhamento de OP;
- programação por máquina;
- status Andon;
- apontamento/entrada da produção;
- refugo/perdas/retrabalho;
- encerramento da OP;
- integração com qualidade e estoque.

### Pedidos pendentes
Pesquisar por cliente, período, pedido, produto e status.
Abrir pedido.
Reservar.
Enviar para PCP.
Gerar OP.
Importar pedido XML.

### XML
Upload de XML como primeiro mecanismo real.
Validar antes de gravar:
número, data, CNPJ, cliente, itens, código, descrição, quantidade, unidade, valores, NCM/CFOP.
Resolver cliente por documento real.
Resolver produto por código real.
Mostrar prévia.
Confirmar.
Persistir pedido e itens.
Registrar origem XML/auditoria.
Nunca criar cliente/produto silenciosamente.

### Apontamento
OP, produto, lote, pedido interno, máquina, operação, operador, data/hora, quantidade produzida, boa, rejeitada, perda, motivo, início/fim, tempo real, observação, evidências.
Após gravação: atualizar saldo da OP, lote, qualidade e estoque.

## Engenharia/Ficha de Processo
Uma experiência unificada.
Identificação: código cliente, cliente, desenho, modelo.
Máquina deve vir do cadastro mestre de máquinas/equipamentos.
Operações devem vir do cadastro mestre de operações.
Setup em tempo.
Ciclo com tempo, quantidade/hora e quantidade/dia.
Materiais em lista única:
código, descrição, consumo, perda, lote, origem, peso/medida, unidade.
Busca de material por código primeiro; lupa abre consulta filtrável por grupo Matéria Prima e descrição.
Não usar dropdown de milhares de itens.
Lista BOM cresce conforme materiais são incluídos.
Qualidade trata desenho/tolerância/medição, sem duplicar consumo/perda.
Master list inferior com todos os produtos/fichas e última revisão.
Persistência real e revisão/histórico.

## Qualidade
Implementar de verdade:
- PPAP/RIA/PSW;
- características dimensionais;
- tolerâncias do desenho;
- amostras;
- medições;
- gráficos;
- certificados de matéria-prima;
- desenhos/anexos;
- inspeção recebimento;
- inspeção processo;
- inspeção final;
- instrumentos;
- calibração;
- NC/RPNC;
- CAPA;
- auditorias;
- FMEA;
- SIPOC;
- 5W2H;
- Ishikawa/5 porquês;
- riscos;
- plano de inspeção;
- fornecedores e indicadores.
Inspeção final deve identificar produto, lote, OP/pedido, máquina, operador, data, defeito, quantidades e gráfico.
RPNC deve ter formulário próprio e lista por estado.

## Estoque/WMS
Produto acabado, matéria-prima, lotes, endereços, entradas, saídas, transferências, reservas, inventário, consumo de OP, recebimento, rastreabilidade.
Consulta e Entrada devem ser claramente separados.
Nada de contagem falsa.

## Compras
Solicitação → cotação → mapa comparativo → aprovação → pedido → recebimento → NF/XML → inspeção → estoque → financeiro.
Fornecedor deve ter histórico de prazo prometido x prazo real e indicador de atraso.

## Fiscal/NF-e
Emitir/editar com dados reais persistidos:
destinatário, itens, quantidade, preço, impostos, pagamento, transporte e demais campos suportados pelo schema.
DANFE A4 para impressão.
Chave/barcode quando disponível.
Não inventar campo que o banco não suporta: primeiro ampliar schema de forma rastreável.

## Financeiro/Contábil
Contas a pagar, receber, caixa, bancos, conciliação, cobrança, pagamentos, impostos, centros de custo, lançamentos, rateios, auditoria e integração originada dos documentos reais.

## RH/DP
Colaboradores, cargos, jornadas, escalas, ponto, férias, benefícios, folha, SST, treinamentos, documentos e indicadores.

## Logística
Separação, conferência, romaneio, frete, roteirização, rastreamento, devolução e logística reversa.

## Administração
Usuários, perfis, permissões, alçadas, parâmetros, integrações, logs, auditoria, backups, notificações e monitoramento.
Master é universal e não deve escolher salão/empresa. Usuário empresarial deve estar isolado por tenant.

## Segurança
Supabase Auth real.
RLS por empresa.
Master separado.
RBAC.
Auditoria.
Nada de senha hardcoded.
Nada de service_role no browser.
Nada de localStorage como autenticação.
Sessão persistente e refresh.
MFA quando suportado pelo fluxo.
Segregação de funções.

## Design
Industrial premium, consistente com o PDF.
Não usar aparência de Delphi/DBGrid antigo.
Cards e formulários alinhados.
Grid responsivo.
Ações claras: Novo, Gravar, Editar, Atualizar, Pesquisar, Filtrar, Anexos, Histórico, Imprimir.
Reutilizar componentes existentes.
Não copiar propriedade visual de sistemas proprietários; usar apenas padrões funcionais.

## Regra de implementação
Antes de criar arquivo novo:
1. procurar componente/página/consulta existente;
2. reutilizar;
3. corrigir se necessário;
4. extrair componente compartilhado quando houver duplicação;
5. somente criar algo novo quando não existir.

## Auditoria automática obrigatória
Antes de considerar concluído:
- TypeScript;
- lint;
- build;
- testes;
- auditoria de placeholders;
- auditoria de botões sem ação;
- auditoria de dados fake;
- auditoria de consultas Supabase;
- auditoria RLS;
- auditoria de rotas;
- auditoria de exports/imports;
- auditoria de console/runtime;
- auditoria visual;
- E2E dos fluxos críticos;
- Vercel Preview atual da mesma branch;
- nenhum teste em URL antiga.

## Critério de aceite
Uma tela só é considerada PRONTA quando:
1. abre;
2. não gera erro no console;
3. carrega dados reais;
4. permite executar sua ação principal;
5. persiste;
6. recarrega e mantém o dado;
7. respeita RLS/permissão;
8. possui feedback verdadeiro;
9. possui histórico/auditoria quando o domínio exigir;
10. está alinhada ao PDF/design system;
11. funciona em desktop e tablet;
12. está coberta pelo fluxo E2E quando for crítica.

## Regra final
Não parar depois de corrigir um erro isolado.
Mapear todas as lacunas do ERP e trabalhar em ondas até zerar:
- telas quebradas;
- telas fake;
- ações fake;
- dados fake;
- rotas mortas;
- imports quebrados;
- tabelas inexistentes;
- migrations faltantes;
- RLS faltante;
- integrações faltantes;
- módulos fragmentados;
- inconsistências visuais;
- erros de build/runtime;
- deploy não homologado.

O resultado esperado é um produto operacional, não uma coleção de telas.


## ORDEM DE PESQUISA EXTERNA — PDF + OPEN SOURCE

Esta ordem passa a ser obrigatória para toda implementação visual e funcional. Não é permitido criar uma tela apenas por imaginação quando existir referência no PDF ou em código aberto relevante.

### A. INVENTÁRIO COMPLETO DO PDF

O PDF oficial contém 53 páginas. As páginas 4–48 apresentam 45 telas-modelo que devem ser mapeadas individualmente e usadas como referência de construção. As páginas 49–53 acrescentam fluxos, subfunções, padrão de componentes, arquitetura, integrações e referências.

Catálogo obrigatório das 45 telas do PDF:

1. Home Industrial / Tablet
2. Cockpit Executivo
3. Dashboard da Fábrica / Chão de Fábrica
4. Tarefas e Aprovações / Workflow
5. Cadastro de Empresa / Filial
6. Cadastro de Produto / Item
7. Cadastro de Cliente
8. Cadastro de Fornecedor
9. Estrutura do Produto / BOM
10. Roteiro de Fabricação
11. Ficha de Processo
12. Orçamento / Proposta Comercial
13. Pedido de Venda
14. Solicitação de Compra
15. Cotação de Compras / Mapa
16. Pedido de Compra
17. Recebimento de NF-e / XML
18. Saldo de Estoque
19. Transferência de Estoque
20. Inventário
21. Plano Mestre de Produção / PMP
22. Rodada MRP
23. Carga Máquina / Capacidade / APS
24. Ordem de Produção
25. Apontamento de Produção
26. Chão de Fábrica / Andon
27. Plano de Inspeção
28. Inspeção de Recebimento
29. Não Conformidade / CAPA
30. Plano de Manutenção Preventiva
31. Ordem de Serviço de Manutenção
32. NF-e de Saída
33. Apuração Fiscal
34. Contas a Pagar
35. Contas a Receber
36. Fluxo de Caixa
37. Custo Industrial
38. Contabilidade / Lançamentos
39. Cadastro de Colaborador
40. Ponto / Jornada
41. Expedição
42. Projeto / Serviço Industrial
43. BI / Relatórios
44. Usuários e Perfis
45. Workflow e Alçadas

### B. REGRA PARA CADA UMA DAS 45 TELAS

Para cada tela:

- localizar a referência correspondente no PDF;
- extrair campos, ações, abas, filtros, status, tabela e fluxo;
- localizar a implementação existente no repositório;
- localizar tabelas/RPC/functions reais no Supabase;
- localizar componentes reutilizáveis existentes;
- comparar a tela atual com o PDF;
- pesquisar implementações open source equivalentes;
- adaptar padrões funcionais úteis;
- implementar usando dados reais;
- testar persistência;
- testar RLS;
- testar desktop/tablet;
- testar runtime;
- registrar o resultado.

### C. PESQUISA DE CÓDIGO ABERTO OBRIGATÓRIA

Pesquisar código-fonte aberto relevante, não apenas páginas comerciais.

Referências mínimas:

**ERPNext / Frappe**
- https://github.com/frappe/erpnext
- Manufacturing / BOM / Work Order / Production Plan / Job Card
- Stock / Warehouse / Stock Entry / Pick List
- Buying / Purchase Order / Material Request
- Selling / Sales Order
- Quality / Quality Inspection / Quality Action
- Asset / Maintenance
- Accounts / Finance
- HRMS

**Odoo**
- https://github.com/odoo/odoo
- MRP Production
- MRP Work Order
- BOM
- Work Center
- Stock
- Purchase
- Sale
- Quality
- Maintenance
- Accounting
- views XML/OWL/JS associadas às telas.

**Dolibarr**
- https://github.com/Dolibarr/dolibarr
- produtos;
- estoque;
- compras;
- vendas;
- projetos;
- contabilidade;
- manufacturing quando disponível.

**Tryton**
- https://github.com/tryton/tryton
- produção;
- estoque;
- compras;
- vendas;
- contabilidade.

**Apache OFBiz**
- https://github.com/apache/ofbiz-framework
- pedidos;
- estoque;
- produção;
- contabilidade;
- workflows.

**OpenBoxes**
- https://github.com/openboxes/openboxes
- WMS;
- estoque;
- lotes;
- movimentações;
- rastreabilidade.

Outros projetos open source relevantes devem ser adicionados quando encontrados durante a pesquisa, desde que tenham código verificável e relação direta com a função.

### D. NÃO COPIAR CÓDIGO SEM ANÁLISE

O objetivo da pesquisa open source é descobrir:

- modelo de dados;
- fluxo;
- estados;
- validações;
- ações;
- componentes;
- filtros;
- tabelas;
- formulários;
- relações;
- rastreabilidade;
- padrões de UX;
- tratamento de erros;
- testes.

Verificar a licença de cada projeto antes de reutilizar código.

Não copiar identidade visual proprietária.

Não copiar código incompatível com a licença do ERP.

Preferir implementação própria baseada em padrões funcionais documentados.

### E. MATRIZ PDF → CÓDIGO EXISTENTE → OPEN SOURCE → IMPLEMENTAÇÃO

Criar e manter uma matriz:

| Tela PDF | Página atual | Componente existente | Banco real | Referência open source | Lacunas | Ação | Teste |
|---|---|---|---|---|---|---|---|

Nenhuma tela pode ser considerada concluída sem preencher essa matriz.

### F. PRIORIDADE

Primeiro garantir o shell e os fluxos que alimentam os demais módulos:

1. Login/Auth/Tenant
2. Home/Tablet
3. Cadastros Mestres
4. Produtos
5. Clientes
6. Fornecedores
7. Engenharia/BOM/Roteiro/Ficha
8. Vendas/Pedido
9. Compras/Solicitação/Cotação/Pedido
10. Recebimento/XML
11. Estoque/WMS
12. PMP/MRP/APS
13. OP
14. Apontamento/Andon
15. Qualidade
16. Manutenção
17. Fiscal/NF-e
18. Financeiro
19. Custos/Contábil
20. RH/DP
21. Expedição
22. Projetos
23. BI
24. Administração/Workflow

### G. PROIBIÇÃO ESPECÍFICA

É proibido:

- inventar uma tela que contradiga o PDF;
- remover uma tela do PDF porque já existe uma tela parecida;
- substituir uma tela operacional por Dashboard;
- transformar PCP em simples calendário;
- transformar Estoque em simples grid;
- transformar Qualidade em simples formulário;
- transformar Engenharia em formulário genérico;
- transformar Produção em calendário;
- transformar Compras em lista;
- transformar Vendas em tabela;
- criar campos somente visuais sem persistência;
- criar números estáticos para preencher espaço;
- usar referências open source apenas como justificativa textual sem estudar o código correspondente.

### H. RESULTADO OBRIGATÓRIO

Ao final da auditoria, entregar:

1. inventário das 45 telas do PDF;
2. matriz PDF → código atual → banco → open source;
3. lista de telas existentes que devem ser reaproveitadas;
4. lista de telas que precisam ser corrigidas;
5. lista de telas que precisam ser completadas;
6. lista de telas ausentes;
7. lista de tabelas/RPC/migrations faltantes;
8. lista de integrações faltantes;
9. lista de erros runtime/build;
10. testes E2E por fluxo;
11. evidência da validação do Preview atual;
12. status final por tela.

A referência externa serve para melhorar a implementação. A referência principal continua sendo o PDF do projeto, o schema real e os requisitos do proprietário.
