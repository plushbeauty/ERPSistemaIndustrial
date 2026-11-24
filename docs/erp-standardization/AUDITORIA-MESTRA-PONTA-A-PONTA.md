# AUDITORIA MESTRA PONTA A PONTA — SYSNQRA ERP INDUSTRIAL

- Revisão: MASTER-AUDIT-R1
- Data de abertura: 2026-11-24
- Branch de trabalho: `integration/solicitacoes-telas-20261111`
- Escopo: todas as rotas reais, telas, abas, modais, editores, botões, ações, grids, pesquisas, permissões, integrações, documentos e impressões do ERP.
- Estado: **ABERTA — nenhum módulo é considerado aprovado apenas por inspeção estática ou por commit de CSS.**

## 1. Regras de segurança e preservação

1. Não apagar telas de negócio, rotas, migrations, tabelas, RPCs, policies, dados, contratos, nem telas aprovadas/congeladas.
2. A limpeza desta revisão remove somente relatórios de auditoria anteriores explicitamente substituídos por este documento. Evidências históricas de CI, segurança, banco e telas aprovadas permanecem preservadas.
3. Não criar botões sem ação, dados fictícios, rotas inventadas, campos sem fonte de dados, nem CRUD que não respeite RLS, RBAC e `empresa_id`.
4. Toda ação deve ter feedback de carregamento, sucesso e erro; ações destrutivas exigem confirmação e autorização.
5. Campo exibido precisa corresponder a coluna, view, RPC ou cálculo documentado. Campo sem contrato é marcado como bloqueio, nunca preenchido com valor inventado.
6. Não mexer em tela aprovada/hash-locked sem autorização explícita. Uma exceção autorizada deve registrar exatamente o escopo permitido.
7. Não marcar tela como concluída sem evidência de navegação real, teste funcional, impressão quando aplicável, checks automatizados e deployment READY do commit avaliado.

## 2. Benchmark de produto

Comparar por capacidade e fluxo — não copiar aparência isolada — com:
- **Odoo**: formulários, listagens, filtros salvos, chatter/auditoria, permissões, aprovações, documentos relacionados e impressão.
- **ERPNext**: DocTypes, workflow, estados, relatórios, filtros, rastreabilidade de documentos e permissões.
- **SAP Fiori / SAP Business One**: hierarquia de informação, listas operacionais, status semântico, navegação contextual e documentos comerciais.
- **Microsoft Dynamics 365**: command bar, pesquisa, filtros, vistas, formulários, acessibilidade e navegação.
- **ERPNext Manufacturing / Odoo MRP**: BOM, roteiro, centros de trabalho, capacidade, ordem, apontamento, refugos, lote e rastreabilidade.

Referências devem ser consultadas em documentação oficial atualizada durante cada domínio; registrar URL, data de consulta e recurso comparado. Não atribuir recurso a produto sem fonte.

## 3. Matriz obrigatória por rota/tela

Uma linha por rota real, com aliases agrupados sem perder a referência:
| Campo | O que registrar |
|---|---|
| Identidade | módulo, rota, arquivo lazy real, componente renderizado, aliases e shell |
| Estado | não iniciada / em inspeção / bloqueada / corrigida / testada / aprovada |
| Campos e editores | rótulo, ordem, tipo, origem de dados, required, máscara, maxLength, largura/altura, lookup, validação, tab order |
| Botões e ações | texto/ícone, ação real, permissão/RBAC, loading, disabled, confirmação, feedback e tratamento de erro |
| Lista e grade | busca, filtros, datas, ordenação, paginação, contagem, colunas, alinhamento, estado vazio, loading, exportação |
| Fluxo | criar, editar, visualizar, cancelar, excluir/inativar, aprovar, rejeitar e transições válidas |
| Dados | tabelas/views/RPCs/Edge Functions/Storage, tenant, RLS, migrations e schema remoto confirmado |
| Documentos | anexos, GED, vínculo, download, versão, impressão, PDF e trilha de auditoria |
| Responsividade | desktop 1440px, notebook 1366px, tablet e celular quando aplicável; sem corte ou sobreposição |
| Impressão | retrato/paisagem conforme densidade, A4/A3/etiqueta conforme documento, cabeçalho, margens e quebra de página |
| Benchmark | capacidades equivalentes em Odoo/ERPNext/SAP/Dynamics, lacunas justificadas e prioridade |
| Evidência | commit, checks, teste de navegador, captura/resultado, deployment e bloqueios |

## 4. Critérios de aprovação por tela

- Todos os campos visíveis e editores foram percorridos em cada aba, modal e subfluxo.
- Ordem e posição de cada item fazem sentido para o processo e não há desalinhamento, corte ou sobreposição.
- Todo botão executa a ação anunciada, respeita permissões e informa o resultado.
- Pesquisa, filtros, paginação, ordenação e estados vazios funcionam com dados reais.
- Consultas e gravações respeitam empresa ativa, RLS, RBAC, integridade e regras de negócio.
- Relacionamentos entre documentos e rastreabilidade foram testados de ponta a ponta.
- Impressão foi aberta e conferida em orientação adequada (paisagem quando a quantidade de colunas exigir); não basta existir CSS `@media print`.
- Testes: type-check, lint, auditorias, lazy imports, rotas, testes aplicáveis e build.
- Preview Vercel do commit exato em estado READY. Falha ou fila significa NÃO APROVADO.

## 5. Domínios e ordem de execução

1. Vendas e pedidos: cotação, pedido, itens, status, estoque reservado, PCP, acabamento, expedição, faturamento, anexos e impressão.
2. Cadastro de produtos: dados gerais, códigos, descrição, unidade, fiscal, estoque, produção, qualidade, ficha técnica e filtros.
3. Compras e suprimentos: fornecedores, requisição, cotação/RFQ, comparação, pedido, recebimento, inspeção e 3-way match.
4. PCP/manufatura: BOM, roteiros, capacidade, programação, ordens, apontamentos, perdas, acabamento, montagem e chão de fábrica.
5. Estoque/almoxarifado: saldos, depósitos, endereços, lotes, FIFO/PEPS, separação, inventário e rastreabilidade.
6. Qualidade/SGQ: documentos controlados, inspeções, RPNC, 6M, 5 porquês, CAPA, eficácia, auditoria e liberação real de lote.
7. Fiscal: NF-e entrada/saída, eventos, regras fiscais, impostos, rejeições, cancelamento, contingência e obrigações.
8. Financeiro/controladoria: contas a pagar/receber, títulos, vencimentos, baixa, conciliação, caixa, razão, custos e fechamento.
9. Engenharia/manutenção: BOM, revisões, desenhos, roteiros, ativos, manutenção preventiva/corretiva e custos.
10. RH/DP: funcionários, jornada, escalas, ponto, férias, documentos e folha conforme escopo legal contratado.
11. Administração e transversal: usuários, RBAC, multiempresa, auditoria, parâmetros, integrações, API, logs e segurança.

## 6. Barra Windows 11 — acesso rápido de consulta

A barra superior deve manter o menu completo de módulos e oferecer uma faixa horizontal independente, com rolagem, para atalhos de consulta:
- Status de pedidos — visualizar e pesquisar pedidos.
- Documentos da Qualidade — consultar GED/documentos controlados.
- PCP — visualizar ordens, programação e apontamentos.
- Fiscal — consultar documentos e pendências fiscais.
- Contas a pagar — visualizar títulos, vencimentos e situação.
- Contas a receber — visualizar títulos, vencimentos e situação.
- Produtos — catálogo completo, pesquisa e filtros.

Esses atalhos são navegação/consulta, não atalhos para alteração financeira, fiscal ou operacional. A permissão de leitura continua protegida por RLS/RBAC; o atalho não concede acesso. Usar rotas já existentes e verificadas. A barra deve ter ícones identificáveis, tooltip/label acessível, foco por teclado, rolagem horizontal visível e responsividade. Não duplicar a navegação completa do menu.

## 7. Relatório por item

Para cada tela, preencher:
- Rota + arquivo real.
- Campos/editores conferidos e divergências.
- Botões/ações conferidos e divergências.
- Comparativo Odoo/ERPNext/SAP/Dynamics com links e data.
- Persistência/RLS/RBAC verificados.
- Impressão/orientação testadas.
- Checks com logs/resultados.
- Commit e deployment READY.
- Pendências e motivo.

## 8. Baseline e bloqueios atuais (não presumir resolução)

- O backlog anterior registra auditoria estática de 244 arquivos e 334 declarações de rota; regex não prova comportamento renderizado.
- A fila anterior ainda tinha UI-002, UI-003 e UI-010 a UI-100 pendentes; o status histórico não pode ser convertido em aprovação.
- O deployment consultado para commit `04273e5469f5d971dfbf20ba88dbe7e523f389cd` terminou em **ERROR**: `npm run build:vercel` → `npm run verify:production` → exit 1. A etapa específica que falhou deve ser extraída dos eventos/logs e corrigida antes de novo READY.
- Não há prova de que todos os fluxos foram navegados em browser nem de que os campos de status de pedido têm vínculos reais para estoque, lote, acabamento, expedição e número fiscal.

## 9. Registro de execução

| Data | Área | Resultado | Evidência |
|---|---|---|---|
| 2026-11-24 | Baseline de auditoria | Aberta; backlog e referências lidos; erro de build conhecido | commit Vercel `04273e5`, deployment ERROR |
| 2026-11-24 | Barra Windows 11 de acesso rápido | Implementada faixa horizontal rolável com atalhos para pedidos, GED/Qualidade, PCP, Fiscal, pagar, receber e produtos; validar rotas e permissões de leitura em navegador | shell `81d61bf`; CSS `bef39ec` |
| 2026-11-24 | Consolidação dos relatórios | Relatórios parciais UI-002/003/004/005, CMP-003 e inventário comparativo vazio removidos e consolidados nesta auditoria; telas de negócio e histórico de CI preservados | commits `d171070`, `2eb3be2`, `1040155`, `f19d6f3`, `efeaa3d`, `59c7ea3`; backlog `1b10e86` |
| 2026-11-24 | Comparativo de rotas | Não iniciado | nenhuma rota será marcada como aprovada sem teste |
| 2026-11-24 | Ajuda global | Painel contextual do shell alterado para fundo azul-petróleo e texto branco em títulos, parágrafos, listas, campos e status; ação de ajuda permanece global em todas as rotas que usam o shell | commit `c22bf5e` |
| 2026-11-24 | Barra Windows 11 | Adicionados atalhos existentes para Expedição, Compras, Estoque, Manutenção e Indicadores industriais; faixa recebeu fundo azul-acinzentado claro e filete turquesa. Atalho Alertas não criado porque não existe rota dedicada registrada em `AppEntryV2.tsx` | commits `c22bf5e`, `6ddd8cb`; rotas conferidas em `AppEntryV2.tsx` |
| 2026-11-24 | Validação visual e de build | Pendente: alterações de código registradas; aguardando build Vercel e teste visual/funcional no navegador | deployment será conferido após o commit da auditoria |
| 2026-11-24 | Conferência de destinos da barra | Rotas dos 12 atalhos conferidas em `AppEntryV2.tsx`; todos os destinos existem. Nenhuma rota dedicada de Alertas encontrada. Os atalhos apenas navegam: modo estritamente somente leitura ainda depende de validação/controle nas telas de destino | `AppEntryV2.tsx` linhas 312, 360, 362, 398, 417–420, 471, 483, 503, 522–524, 562 |
| 2026-11-24 | Execução da rotina da auditoria | `LOOP.md`, `BACKLOG.md`, `REFERENCE.md` e `COMPLETED.md` relidos; rotina segue a ordem P0 e exige baseline local. [BLOQUEIO AMBIENTAL] Esta sessão dispõe de leitura/escrita GitHub e consulta Vercel, mas não de checkout/terminal local para executar `npm run audit:ui-standardization`, `audit:all`, type-check, lint e build; deployment do HEAD `b5f9427` permanece `QUEUED`, sem logs de build disponíveis. Não marcar telas como aprovadas | GitHub branch `integration/solicitacoes-telas-20261111`; Vercel `dpl_3Pi4UUEbF7kQmyJX9R6qXcTTTq9X` |

**Regra final:** esta auditoria é um documento vivo de execução. Não escrever "tudo corrigido" até cada rota passar pelos critérios acima.