Atue como um engenheiro de software sênior executando correções diretas no repositório `plushbeauty/ERPSistemaIndustrial`.
Vá direto ao código, sem introduções, planos teóricos, pedidos de confirmação ou relatórios antes de aplicar e commitar as alterações reais. Execute em sequência contínua até concluir 100% do `BACKLOG.md`.

## 1. Baseline Local
Trabalhe apenas com os arquivos locais do repositório. Execute imediatamente na raiz:
1. `npm run audit:ui-standardization` e leia `docs/erp-standardization/generated/ui-audit.json`.
2. `npm run audit:all`
3. Leia `docs/erp-standardization/LOOP.md`, `docs/erp-standardization/REFERENCE.md`, `docs/erp-standardization/BACKLOG.md` e `docs/erp-standardization/COMPLETED.md`.
4. Abra o arquivo da tela aprovada de **Compras** (indicada em `REFERENCE.md`) para usá-la como código-espelho de estrutura, classes Tailwind, tokens de altura, espaçamento e layout.

## 2. Matriz de Revisão por Tela (Espelho Compras + Padrão ERPNext / Odoo / Dolibarr)
Para cada item pendente em `BACKLOG.md` (em ordem estrita de prioridade), localize a rota exata em `src/AppEntryV2.tsx`, abra o componente renderizado e revise/corrija todos os 6 pontos abaixo comparando com a tela de **Compras** e a ergonomia industrial de **ERPNext**, **Odoo** e **Dolibarr**:

1. **Completude de Botões CRUD e Ações de Linha:**
   - Todo módulo de cadastro ou movimentação deve ter barra de ações superior e ações por linha na tabela: **Novo (+), Editar (lápis/abrir registro), Excluir/Inativar (lixeira com modal de confirmação), Salvar, Cancelar, Visualizar Detalhes e Imprimir**.
   - Se uma tela de listagem não tiver botão **Editar** na linha ou ao clicar no registro, implemente o fluxo completo de edição reutilizando o formulário/modal existente vinculado ao Supabase.
   - Nenhum botão pode ficar sem ação (`onClick`), sem feedback de `loading`/`disabled` ou fora da verificação de permissão (RBAC).

2. **Barra de Pesquisa, Filtros e Paginação:**
   - Toda listagem deve conter campo de busca textual (por código, nome, descrição ou número), filtros rápidos por **Status** e **Período (Data Inicial / Data Final)** quando aplicável, botão **Limpar Filtros** e contador/paginação de registros.

3. **Geometria, Alinhamento e Tamanhos:**
   - Padronize 100% dos inputs, selects, datepickers e botões de barra de ferramentas para a mesma altura exata da tela de Compras (`h-8` / tokens definidos em `REFERENCE.md`).
   - Corrija desalinhamentos verticais entre labels, inputs e botões (`items-center`, `gap` uniforme, grids responsivos sem quebra em 1440px e tablet).
   - Defina `maxLength` coerente com as colunas do banco em todos os campos de texto.

4. **Tabelas, Abas e Modais:**
   - Cabeçalhos de tabela padronizados; colunas de texto alinhadas à esquerda; colunas de **valores monetários, quantidades, pesos e medidas alinhadas à direita (`text-right tabular-nums`)**; badges de status com cores semânticas uniformes.
   - Estado vazio padronizado ("Nenhum registro encontrado") e skeleton/loading consistente.
   - Revise e alinhe todas as abas internas e modais secundários da rota, não apenas a aba principal.

5. **Telas de Impressão e Documentos:**
   - Verifique botões de impressão e layouts `@media print` / componentes de impressão (pedidos, ordens de produção, requisições, etiquetas, laudos, romaneios), garantindo cabeçalho da empresa, margens limpas, quebra de página correta e ocultação de menus/botões na impressão (`print:hidden`).

6. **Preservação de Dados e Supabase:**
   - Preserve 100% das queries, RPCs, políticas RLS, filtro por `empresa_id` (multi-tenant) e regras fiscais, de estoque e PCP.
   - Não crie dados fictícios, mocks ou colunas/tabelas inexistentes no schema atual.

## 3. Pipeline de Validação por Tela (Antes de Cada Commit)
Após corrigir cada tela individualmente, rode:
`npm run type-check && npm run lint:check && npm run audit:all && npm run verify:lazy-imports && npm run verify-routes && npm run build`

- Se algum comando acusar erro, corrija o código imediatamente e rode novamente até passar 100%.
- Somente após aprovação total nos 6 comandos:
  1. Execute `git add` apenas nos arquivos da tela atual e faça `git commit` atômico descrevendo as correções realizadas.
  2. Remova o item concluído de `BACKLOG.md`.
  3. Registre em `COMPLETED.md` as divergências corrigidas, os resultados dos comandos e o hash do commit.

## 4. Regras Rígidas
- Não modifique telas já aprovadas (**Novo Pedido** e **Compras**).
- Não use `@ts-ignore`, `@ts-expect-error` ou `any` para mascarar erros de tipagem.Atue como um engenheiro de software sênior executando correções diretas no repositório `plushbeauty/ERPSistemaIndustrial`.
Vá direto ao código, sem introduções, planos teóricos, pedidos de confirmação ou relatórios antes de aplicar e commitar as alterações reais. Execute em sequência contínua até concluir 100% do `BACKLOG.md`.

## 1. Baseline Local
Trabalhe apenas com os arquivos locais do repositório. Execute imediatamente na raiz:
1. `npm run audit:ui-standardization` e leia `docs/erp-standardization/generated/ui-audit.json`.
2. `npm run audit:all`
3. Leia `docs/erp-standardization/LOOP.md`, `docs/erp-standardization/REFERENCE.md`, `docs/erp-standardization/BACKLOG.md` e `docs/erp-standardization/COMPLETED.md`.
4. Abra o arquivo da tela aprovada de **Compras** (indicada em `REFERENCE.md`) para usá-la como código-espelho de estrutura, classes Tailwind, tokens de altura, espaçamento e layout.

## 2. Matriz de Revisão por Tela (Espelho Compras + Padrão ERPNext / Odoo / Dolibarr)
Para cada item pendente em `BACKLOG.md` (em ordem estrita de prioridade), localize a rota exata em `src/AppEntryV2.tsx`, abra o componente renderizado e revise/corrija todos os 6 pontos abaixo comparando com a tela de **Compras** e a ergonomia industrial de **ERPNext**, **Odoo** e **Dolibarr**:

1. **Completude de Botões CRUD e Ações de Linha:**
   - Todo módulo de cadastro ou movimentação deve ter barra de ações superior e ações por linha na tabela: **Novo (+), Editar (lápis/abrir registro), Excluir/Inativar (lixeira com modal de confirmação), Salvar, Cancelar, Visualizar Detalhes e Imprimir**.
   - Se uma tela de listagem não tiver botão **Editar** na linha ou ao clicar no registro, implemente o fluxo completo de edição reutilizando o formulário/modal existente vinculado ao Supabase.
   - Nenhum botão pode ficar sem ação (`onClick`), sem feedback de `loading`/`disabled` ou fora da verificação de permissão (RBAC).

2. **Barra de Pesquisa, Filtros e Paginação:**
   - Toda listagem deve conter campo de busca textual (por código, nome, descrição ou número), filtros rápidos por **Status** e **Período (Data Inicial / Data Final)** quando aplicável, botão **Limpar Filtros** e contador/paginação de registros.

3. **Geometria, Alinhamento e Tamanhos:**
   - Padronize 100% dos inputs, selects, datepickers e botões de barra de ferramentas para a mesma altura exata da tela de Compras (`h-8` / tokens definidos em `REFERENCE.md`).
   - Corrija desalinhamentos verticais entre labels, inputs e botões (`items-center`, `gap` uniforme, grids responsivos sem quebra em 1440px e tablet).
   - Defina `maxLength` coerente com as colunas do banco em todos os campos de texto.

4. **Tabelas, Abas e Modais:**
   - Cabeçalhos de tabela padronizados; colunas de texto alinhadas à esquerda; colunas de **valores monetários, quantidades, pesos e medidas alinhadas à direita (`text-right tabular-nums`)**; badges de status com cores semânticas uniformes.
   - Estado vazio padronizado ("Nenhum registro encontrado") e skeleton/loading consistente.
   - Revise e alinhe todas as abas internas e modais secundários da rota, não apenas a aba principal.

5. **Telas de Impressão e Documentos:**
   - Verifique botões de impressão e layouts `@media print` / componentes de impressão (pedidos, ordens de produção, requisições, etiquetas, laudos, romaneios), garantindo cabeçalho da empresa, margens limpas, quebra de página correta e ocultação de menus/botões na impressão (`print:hidden`).

6. **Preservação de Dados e Supabase:**
   - Preserve 100% das queries, RPCs, políticas RLS, filtro por `empresa_id` (multi-tenant) e regras fiscais, de estoque e PCP.
   - Não crie dados fictícios, mocks ou colunas/tabelas inexistentes no schema atual.

## 3. Pipeline de Validação por Tela (Antes de Cada Commit)
Após corrigir cada tela individualmente, rode:
`npm run type-check && npm run lint:check && npm run audit:all && npm run verify:lazy-imports && npm run verify-routes && npm run build`

- Se algum comando acusar erro, corrija o código imediatamente e rode novamente até passar 100%.
- Somente após aprovação total nos 6 comandos:
  1. Execute `git add` apenas nos arquivos da tela atual e faça `git commit` atômico descrevendo as correções realizadas.
  2. Remova o item concluído de `BACKLOG.md`.
  3. Registre em `COMPLETED.md` as divergências corrigidas, os resultados dos comandos e o hash do commit.

## 4. Regras Rígidas
- Não modifique telas já aprovadas (**Novo Pedido** e **Compras**).
- Não use `@ts-ignore`, `@ts-expect-error` ou `any` para mascarar erros de tipagem.
- Não reescreva componentes inteiros do zero; faça ajustes cirúrgicos preservando toda a regra de negócio existente.
- Se encontrar impedimento real de ambiente, registre como `[BLOQUEIO AMBIENTAL]` com o log exato e siga para a próxima tela possível.
Atue como um Arquiteto Sênior de Sistemas ERP e Desenvolvedor Full-Stack. Sua tarefa é analisar a base de código atual deste repositório, identificar os módulos de ERP e modelos de dados existentes, compará-los com os recursos corporativos padrão encontrados no **Odoo** e no **ERPNext**, e gerar um relatório técnico de análise de lacunas (gap analysis).

## Etapas de Execução
1. **Descoberta da Base de Código:** Examine a estrutura do repositório, esquemas e migrações de banco de dados, rotas de API e componentes de UI para mapear cada funcionalidade, fluxo de trabalho e entidade atualmente implementados no sistema.
2. **Comparação de Benchmark:** Compare as funcionalidades descobertas com os módulos padrão nativos do Odoo (Enterprise/Community) e do ERPNext nos principais domínios de ERP:
   - **Contabilidade e Finanças:** Razão Geral (GL), Contas a Pagar/Receber, faturamento, regras fiscais, multimoeda e conciliação bancária.
   - **Gestão de Estoque e Armazéns:** Movimentações de estoque, rastreamento por série/lote, multiarmazém, regras de reabastecimento e valoração.
   - **Vendas e CRM:** Leads, oportunidades, cotações, pedidos de venda, listas de preços e comissões.
   - **Compras e Suprimentos:** Solicitações de cotação (RFQs), pedidos de compra, faturas de fornecedores, conferência de 3 vias (3-way matching) e avaliação de fornecedores.
   - **Manufatura / MRP:** Listas de Materiais (BOMs), ordens de produção, roteiros, centros de trabalho e planejamento de capacidade.
   - **Recursos Humanos e Folha de Pagamento:** Diretório de funcionários, controle de ponto/frequência, gestão de férias/licenças, apontamento de horas e processamento de folha.
   - **Sistema e Controle de Acesso:** RBAC/permissões, histórico de alterações (logs), fluxos de aprovação, suporte multiempresa e webhooks/API.
3. **Gerar Relatório de Gap Analysis:** Crie o diretório `docs/erp-standardization/` caso ele não exista e salve o relatório completo em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.

## Estrutura do Arquivo de Saída (`docs/erp-standardization/GAP_ANALYSIS_ODOO.md`)
Certifique-se de que o arquivo Markdown gerado siga estritamente esta estrutura:
- **1. Resumo Executivo:** Visão geral de alto nível da maturidade atual do ERP no sistema e das principais capacidades ausentes.
- **2. Inventário de Módulos Implementados:** Uma tabela concisa do que já está construído neste repositório (Módulo, Capacidades Atuais, Principais Arquivos/Modelos).
- **3. Análise de Lacunas por Domínio:** Para cada domínio de ERP listado acima, forneça uma tabela de comparação estruturada com as colunas:
  - `Funcionalidade / Capacidade`
  - `Padrão Odoo / ERPNext` (Como ambos os sistemas lidam com isso)
  - `Status Atual do Sistema` (`Ausente`, `Parcial` ou `Básico`)
  - `Impacto no Negócio e Complexidade` (`Alto/Médio/Baixo`)
- **4. Lacunas Críticas de Arquitetura e Transversais:** Detalhe as mecânicas fundamentais de ERP ausentes (ex.: automação de lançamentos contábeis de partidas dobradas, rastreabilidade de documentos de ponta a ponta, motores de workflow e permissões granulares).
- **5. Roadmap Recomendado de Evolução:** Sugestão de fases priorizadas (Curto, Médio e Longo prazo) para fechar as lacunas mais críticas com base na arquitetura atual.

- Não reescreva componentes inteiros do zero; faça ajustes cirúrgicos preservando toda a regra de negócio existente.
- Se encontrar impedimento real de ambiente, registre como `[BLOQUEIO AMBIENTAL]` com o log exato e siga para a próxima tela possível.
