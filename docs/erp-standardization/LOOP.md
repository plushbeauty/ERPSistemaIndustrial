[MODO DE EXECUÇÃO AUTÔNOMA — ZERO EXPLICAÇÕES]
Aja exclusivamente como engenheiro de software sênior executando correções diretas no repositório `plushbeauty/ERPSistemaIndustrial`.
PROIBIDO escrever introduções, planos teóricos, pedidos de confirmação ou relatórios sem alterações reais aplicadas no código e commitadas. Execute em loop contínuo até zerar 100% do `BACKLOG.md`.

## 1. BASELINE LOCAL (SEM ACESSO EXTERNO)
Trabalhe 100% com os arquivos locais do repositório e seu conhecimento técnico consolidado. Execute imediatamente na raiz:
1. `npm run audit:ui-standardization` e leia `docs/erp-standardization/generated/ui-audit.json`.
2. `npm run audit:all`
3. Leia `docs/erp-standardization/LOOP.md`, `docs/erp-standardization/REFERENCE.md`, `docs/erp-standardization/BACKLOG.md` e `docs/erp-standardization/COMPLETED.md`.
4. Abra o arquivo da tela aprovada de **Compras** (indicada em `REFERENCE.md`) para usá-la como **código-espelho obrigatório** de estrutura, classes Tailwind, tokens de altura, espaçamento e layout.

## 2. MATRIZ DE CONFRONTO OBRIGATÓRIO POR TELA (ESPELHO COMPRAS + PADRÃO ERPNEXT / ODOO / DOLIBARR)
Para cada item pendente em `BACKLOG.md` (em ordem estrita de prioridade), localize a rota exata em `src/AppEntryV2.tsx`, abra o componente renderizado e audite/corrija TODOS os 6 pontos abaixo comparando linha a linha com a tela de **Compras** e a ergonomia industrial de **ERPNext (DocType List/Form), Odoo (List/Form/Chatter) e Dolibarr (Card/List/ActionBar)**:

1. **Completude de Botões CRUD e Ações de Linha:**
   - Todo módulo de cadastro ou movimentação DEVE ter barra de ações superior e ações por linha na tabela: **Novo (+), Editar (lápis/abrir registro), Excluir/Inativar (lixeira com modal de confirmação), Salvar, Cancelar, Visualizar Detalhes e Imprimir**.
   - Se uma tela de listagem não tiver botão **Editar** na linha ou ao clicar no registro, **implemente o fluxo completo de edição** reutilizando o formulário/modal existente vinculado ao Supabase.
   - Nenhum botão pode ficar morto, sem `onClick`, sem feedback de `loading`/`disabled` ou fora da verificação de permissão (RBAC).

2. **Barra de Pesquisa, Filtros e Paginação (Padrão ERPNext / Dolibarr):**
   - Toda listagem DEVE conter campo de busca textual instantânea/de-bounced (por código, nome, descrição ou número), filtros rápidos por **Status** e **Período (Data Inicial / Data Final)** quando aplicável, botão **Limpar Filtros** e contador/paginação de registros.

3. **Geometria, Alinhamento e Tamanhos (Padrão `REFERENCE.md` / Compras):**
   - Padronize 100% dos inputs, selects, datepickers e botões de barra de ferramentas para a mesma altura exata da tela de Compras (`h-8` / tokens definidos em `REFERENCE.md`).
   - Corrija desalinhamentos verticais entre labels, inputs e botões (`items-center`, `gap` uniforme, grids responsivos sem quebra em 1440px e tablet).
   - Defina `maxLength` coerente com as colunas do banco em todos os campos de texto.

4. **Tabelas, Abas e Modais (Padrão Odoo / ERPNext):**
   - Cabeçalhos de tabela padronizados; colunas de texto alinhadas à esquerda; colunas de **valores monetários, quantidades, pesos e medidas alinhadas à direita (`text-right tabular-nums`)**; badges de status com cores semânticas uniformes.
   - Estado vazio padronizado ("Nenhum registro encontrado") e skeleton/loading consistente.
   - Audite e alinhe **todas as abas internas** e modais secundários da rota, não apenas a aba principal.

5. **Telas de Impressão e Documentos:**
   - Verifique botões de impressão e layouts `@media print` / componentes de impressão (pedidos, ordens de produção, requisições, etiquetas, laudos, romaneios), garantindo cabeçalho da empresa, margens limpas, quebra de página correta e ocultação de menus/botões na impressão (`print:hidden`).

6. **Integridade de Dados e Supabase:**
   - Preserve 100% das queries, RPCs, políticas RLS, filtro por `empresa_id` (multi-tenant) e regras fiscais/estoque/PCP.
   - PROIBIDO criar dados fictícios, mocks ou inventar colunas/tabelas inexistentes no schema atual.

## 3. PIPELINE DE VALIDAÇÃO POR TELA (OBRIGATÓRIO ANTES DE CADA COMMIT)
Após corrigir cada tela individualmente, rode:
`npm run type-check && npm run lint:check && npm run audit:all && npm run verify:lazy-imports && npm run verify-routes && npm run build`

- Se algum comando acusar erro, corrija o código imediatamente e rode novamente até passar 100%.
- Somente após aprovação total nos 6 comandos:
  1. Execute `git add` apenas nos arquivos da tela atual e faça `git commit` atômico descrevendo as correções realizadas.
  2. Remova o item concluído de `BACKLOG.md`.
  3. Registre em `COMPLETED.md` as divergências corrigidas, os resultados dos comandos e o hash do commit.

## 4. TRAVAS INVIOLÁVEIS
- **NÃO** modifique telas já aprovadas/imutáveis (**Novo Pedido** e **Compras**).
- **NÃO** use `@ts-ignore`, `@ts-expect-error` ou `any` para mascarar erros de tipagem.
- **NÃO** reescreva componentes inteiros do zero; faça ajustes cirúrgicos preservando toda a regra de negócio existente.
- Se encontrar impedimento real de ambiente, registre como `[BLOQUEIO AMBIENTAL]` com o log exato e siga para a próxima tela possível.

- # Papel e Objetivo
Você é um Arquiteto Sênior de Sistemas ERP e Desenvolvedor Full-Stack. Sua tarefa é analisar a base de código atual, identificar os módulos de ERP e modelos de dados existentes, compará-los com os recursos corporativos padrão encontrados no **Odoo** e no **ERPNext**, e gerar um relatório abrangente de análise de lacunas (gap analysis).

# Etapas de Execução
1. **Descoberta da Base de Código:** Examine a estrutura do repositório, esquemas/migrações de banco de dados, rotas de API e componentes de UI para mapear cada funcionalidade, fluxo de trabalho e entidade atualmente implementados no sistema.
2. **Comparação de Benchmark:** Compare as funcionalidades descobertas com os módulos padrão nativos do Odoo (Enterprise/Community) e do ERPNext nos principais domínios de ERP:
   - Contabilidade e Finanças (Razão Geral/GL, Contas a Pagar/Receber, faturamento, regras fiscais, multimoeda, conciliação bancária)
   - Gestão de Estoque e Armazéns (movimentações de estoque, rastreamento por série/lote, multiarmazém, regras de reabastecimento, valoração)
   - Vendas e CRM (leads, oportunidades, cotações, pedidos de venda, listas de preços, comissões)
   - Compras e Suprimentos (solicitações de cotação/RFQs, pedidos de compra, faturas de fornecedores, conferência de 3 vias/3-way matching, avaliação de fornecedores)
   - Manufatura / MRP (Listas de Materiais/BOMs, ordens de produção, roteiros, centros de trabalho, planejamento de capacidade)
   - Recursos Humanos e Folha de Pagamento (diretório de funcionários, controle de ponto/frequência, gestão de férias/licenças, apontamento de horas, processamento de folha)
   - Sistema e Governança (RBAC/permissões, logs de auditoria, fluxos de aprovação, suporte multiempresa, webhooks/API)
3. **Gerar Relatório de Gap Analysis:** Crie o diretório `docs/erp-standardization/` caso ele não exista e escreva o relatório completo em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.

# Estrutura do Arquivo de Saída (`docs/erp-standardization/GAP_ANALYSIS_ODOO.md`)
Certifique-se de que o arquivo Markdown gerado siga estritamente esta estrutura:
- **1. Resumo Executivo:** Visão geral de alto nível da maturidade atual do ERP no sistema e das principais capacidades ausentes.
- **2. Inventário de Módulos Implementados:** Uma tabela concisa do que já está construído neste repositório (Módulo, Capacidades Atuais, Principais Arquivos/Modelos).
- **3. Análise de Lacunas por Domínio:** Para cada domínio de ERP listado acima, forneça uma tabela de comparação estruturada com as colunas:
  - `Funcionalidade / Capacidade`
  - `Padrão Odoo / ERPNext` (Como ambos os sistemas lidam com isso)
  - `Status Atual do Sistema` (`Ausente`, `Parcial` ou `Básico`)
  - `Impacto no Negócio e Complexidade` (`Alto/Médio/Baixo`)
- **4. Lacunas Críticas de Arquitetura e Transversais:** Detalhe as mecânicas fundamentais de ERP ausentes (ex.: automação de lançamentos contábeis de partidas dobradas, trilhas de auditoria, fluxos de documentos baseados em máquina de estados, multilocação/multiempresa).
- **5. Roadmap de Implementação Priorizado:** Agrupe as funcionalidades ausentes em fases lógicas (Fase 1: Integridade Financeira e de Estoque Principal, Fase 2: Automação Operacional, Fase 3: Recursos Corporativos Avançados) com breves recomendações técnicas alinhadas à nossa stack tecnológica atual.

# Restrições
- Baseie suas descobertas estritamente nos arquivos reais do workspace — não presuma que uma funcionalidade existe se não houver código ou esquema que a sustente.
- Mantenha as descrições práticas, técnicas e concisas.
- Não modifique nenhum código-fonte da aplicação; apenas crie/atualize o arquivo `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.
- # Papel e Objetivo
Você é um Arquiteto Sênior de Sistemas ERP, Especialista em Localização Fiscal Brasileira e Desenvolvedor Full-Stack. Sua tarefa é analisar a base de código atual, identificar os módulos de ERP e modelos de dados existentes, compará-los com os recursos corporativos padrão encontrados no **Odoo (incluindo Localização Brasil / OCA)** e no **ERPNext**, e gerar um relatório abrangente de análise de lacunas (gap analysis).

# Etapas de Execução
1. **Descoberta da Base de Código:** Examine a estrutura do repositório, esquemas/migrações de banco de dados, rotas de API e componentes de UI para mapear cada funcionalidade, fluxo de trabalho e entidade atualmente implementados no sistema.
2. **Comparação de Benchmark:** Compare as funcionalidades descobertas com os módulos padrão nativos do Odoo (Enterprise/Community + Localização Brasil) e do ERPNext nos principais domínios de ERP:
   - **Contabilidade e Finanças:** Plano de Contas Padrão Brasileiro (CPC/IFRS), Razão Geral (GL), Contas a Pagar/Receber (CNAB remessa/retorno, boletos, PIX), multimoeda, conciliação bancária (OFX/API).
   - **Fiscal e Tributário (Localização Brasil):** Motor de cálculo de impostos (ICMS, ICMS-ST, IPI, PIS, COFINS, ISS, retenções na fonte e preparação para IBS/CBS), cadastros fiscais (NCM, CFOP, CST/CSOSN, CEST, CNPJ/IE/IM), emissão e manifestação de documentos fiscais eletrônicos (NF-e, NFS-e, NFC-e, CT-e, MDF-e), importação de XML de entrada e obrigações acessórias (SPED Fiscal, SPED Contribuições, ECD/ECF, REINF).
   - **Gestão de Estoque e Armazéns:** Movimentações de estoque, rastreamento por série/lote e validade, multiarmazém, regras de reabastecimento, valoração de estoque (Custo Médio Ponderado / PEPS) e Bloco K.
   - **Vendas e CRM:** Leads, oportunidades, cotações, pedidos de venda, listas de preços, regras de comissionamento e cálculo automático de impostos na venda.
   - **Compras e Suprimentos:** Solicitações de cotação (RFQs), pedidos de compra, entrada de notas fiscais de fornecedores via XML, conferência de 3 vias (3-way matching: Pedido x Recebimento x NF-e) e avaliação de fornecedores.
   - **Manufatura / MRP:** Listas de Materiais (BOMs), ordens de produção, roteiros, centros de trabalho, planejamento de capacidade e controle de perdas/sucata.
   - **Recursos Humanos e Folha de Pagamento:** Diretório de funcionários, controle de ponto/frequência, gestão de férias/licenças, apontamento de horas, encargos trabalhistas e integração com eSocial.
   - **Sistema e Governança:** RBAC/permissões, logs de auditoria imutáveis, fluxos de aprovação, suporte multiempresa/multifilial (matriz e filiais por CNPJ) e webhooks/API.
3. **Gerar Relatório de Gap Analysis:** Crie o diretório `docs/erp-standardization/` caso ele não exista e escreva o relatório completo em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.

# Estrutura do Arquivo de Saída (`docs/erp-standardization/GAP_ANALYSIS_ODOO.md`)
Certifique-se de que o arquivo Markdown gerado siga estritamente esta estrutura:
- **1. Resumo Executivo:** Visão geral de alto nível da maturidade atual do ERP no sistema, prontidão fiscal para o Brasil e das principais capacidades ausentes.
- **2. Inventário de Módulos Implementados:** Uma tabela concisa do que já está construído neste repositório (Módulo, Capacidades Atuais, Principais Arquivos/Modelos).
- **3. Análise de Lacunas por Domínio:** Para cada domínio de ERP listado acima (dando atenção especial ao domínio Fiscal e Tributário), forneça uma tabela de comparação estruturada com as colunas:
  - `Funcionalidade / Capacidade`
  - `Padrão Odoo (BR) / ERPNext` (Como ambos os sistemas lidam com isso)
  - `Status Atual do Sistema` (`Ausente`, `Parcial` ou `Básico`)
  - `Impacto no Negócio e Complexidade` (`Alto/Médio/Baixo`)
- **4. Lacunas Críticas de Arquitetura e Transversais:** Detalhe as mecânicas fundamentais de ERP ausentes (ex.: automação de lançamentos contábeis de partidas dobradas, trilhas de auditoria, fluxos de documentos baseados em máquina de estados, estrutura Matriz/Filial por CNPJ, armazenamento seguro de Certificados Digitais A1/A3).
- **5. Roadmap de Implementação Priorizado:** Agrupe as funcionalidades ausentes em fases lógicas (Fase 1: Integridade Financeira, Estoque e Conformidade Fiscal Básica; Fase 2: Automação Operacional e Obrigações Acessórias; Fase 3: Recursos Corporativos Avançados) com breves recomendações técnicas alinhadas à nossa stack tecnológica atual (incluindo sugestões de bibliotecas ou APIs fiscais, se aplicável).

# Restrições
- Baseie suas descobertas estritamente nos arquivos reais do workspace — não presuma que uma funcionalidade existe se não houver código ou esquema que a sustente.
- Mantenha as descrições práticas, técnicas e concisas.
- Não modifique nenhum código-fonte da aplicação; apenas crie/atualize o arquivo `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.
# Papel e Objetivo
Você é um Arquiteto Sênior de Sistemas ERP, Especialista em Localização Fiscal Brasileira (com foco profundo em Documentos Fiscais Eletrônicos / NF-e) e Desenvolvedor Full-Stack. Sua tarefa é analisar a base de código atual, identificar os módulos de ERP e modelos de dados existentes, compará-los com os recursos corporativos padrão encontrados no **Odoo (incluindo Localização Brasil / OCA)** e no **ERPNext**, e gerar um relatório abrangente de análise de lacunas (gap analysis).

# Etapas de Execução
1. **Descoberta da Base de Código:** Examine a estrutura do repositório, esquemas/migrações de banco de dados, rotas de API, integrações externas e componentes de UI para mapear cada funcionalidade, fluxo de trabalho e entidade atualmente implementados no sistema.
2. **Comparação de Benchmark:** Compare as funcionalidades descobertas com os módulos padrão nativos do Odoo (Enterprise/Community + Localização Brasil / OCA `l10n_br`) e do ERPNext nos principais domínios de ERP:
   - **Gestão Completa de NF-e (Foco Principal):**
     - *Configuração e Segurança:* Gestão de Certificados Digitais (A1/A3, alerta de vencimento), controle de numeração e séries por CNPJ/Filial, ambientes (Homologação vs. Produção) e código CSC/Token quando aplicável.
     - *Motor Tributário e Regras Fiscais:* Matriz fiscal (Origem x Destino), cálculo automático de ICMS, ICMS-ST, DIFAL, FCP, IPI, PIS, COFINS e preparação para IBS/CBS; cadastros e validações de NCM, CFOP, CST/CSOSN, CEST, EAN/GTIN e Regimes Tributários (Simples Nacional, Lucro Presumido, Lucro Real).
     - *Ciclo de Vida e Emissão (Saída):* Geração e validação de esquema XSD do XML, assinatura digital, transmissão síncrona/assíncrona à SEFAZ, consulta de recibo/protocolo, geração de DANFE (PDF) e envio automático de XML/PDF por e-mail.
     - *Eventos e Contingência:* Cancelamento dentro do prazo legal, Carta de Correção Eletrônica (CC-e), Inutilização de numeração, Nota Fiscal de Devolução/Ajuste/Complementar e modos de contingência (SVC-AN / SVC-RS / EPEC).
     - *Entrada e Manifestação do Destinatário (MD-e):* Consulta automática de DF-e (Distribuição DF-e via SEFAZ), eventos de Manifestação (Ciência da Emissão, Confirmação da Operação, Desconhecimento, Operação não Realizada), importação de XML de fornecedores e conversão automática em Pedido de Compra/Entrada de Estoque/Contas a Pagar.
   - **Contabilidade e Finanças:** Plano de Contas Padrão Brasileiro (CPC/IFRS), Razão Geral (GL), Contas a Pagar/Receber (CNAB remessa/retorno, boletos, PIX), multimoeda, conciliação bancária (OFX/API).
   - **Demais Obrigações Fiscais (Brasil):** NFS-e (padrão nacional/prefeituras), NFC-e, CT-e/MDF-e e geração de arquivos magnéticos (SPED Fiscal, SPED Contribuições, ECD/ECF, REINF).
   - **Gestão de Estoque e Armazéns:** Movimentações de estoque vinculadas à NF-e, rastreamento por série/lote e validade, multiarmazém, regras de reabastecimento, valoração de estoque (Custo Médio Ponderado / PEPS) e Bloco K.
   - **Vendas e CRM:** Leads, oportunidades, cotações, pedidos de venda, listas de preços, regras de comissionamento e faturamento direto para NF-e.
   - **Compras e Suprimentos:** Solicitações de cotação (RFQs), pedidos de compra, conferência de 3 vias (3-way matching: Pedido x Recebimento Físico x XML da NF-e) e avaliação de fornecedores.
   - **Manufatura / MRP:** Listas de Materiais (BOMs), ordens de produção, roteiros, centros de trabalho, planejamento de capacidade e controle de perdas/sucata.
   - **Recursos Humanos e Folha de Pagamento:** Diretório de funcionários, controle de ponto/frequência, gestão de férias/licenças, apontamento de horas, encargos trabalhistas e integração com eSocial.
   - **Sistema e Governança:** RBAC/permissões, logs de auditoria imutáveis, guarda legal de XMLs (5 anos), fluxos de aprovação, suporte multiempresa/multifilial (matriz e filiais por CNPJ) e webhooks/API.
3. **Gerar Relatório de Gap Analysis:** Crie o diretório `docs/erp-standardization/` caso ele não exista e escreva o relatório completo em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.

# Estrutura do Arquivo de Saída (`docs/erp-standardization/GAP_ANALYSIS_ODOO.md`)
Certifique-se de que o arquivo Markdown gerado siga estritamente esta estrutura:
- **1. Resumo Executivo:** Visão geral de alto nível da maturidade atual do ERP no sistema, prontidão operacional para emissão/recebimento de NF-e e principais capacidades ausentes.
- **2. Inventário de Módulos Implementados:** Uma tabela concisa do que já está construído neste repositório (Módulo, Capacidades Atuais, Principais Arquivos/Modelos).
- **3. Análise de Lacunas por Domínio:** Para cada domínio de ERP listado acima (com uma seção dedicada e detalhada exclusivamente para **Gestão Completa de NF-e**), forneça uma tabela de comparação estruturada com as colunas:
  - `Funcionalidade / Capacidade`
  - `Padrão Odoo (BR / OCA) / ERPNext` (Como ambos os sistemas lidam com isso)
  - `Status Atual do Sistema` (`Ausente`, `Parcial` ou `Básico`)
  - `Impacto no Negócio e Complexidade` (`Alto/Médio/Baixo`)
- **4. Lacunas Críticas de Arquitetura e Transversais:** Detalhe as mecânicas fundamentais ausentes (ex.: fila assíncrona para comunicação com SEFAZ, armazenamento seguro de Certificado A1 e XMLs por 5+ anos, máquina de estados para documentos fiscais, automação de partidas dobradas, estrutura Matriz/Filial por CNPJ).
- **5. Roadmap de Implementação Priorizado:** Agrupe as funcionalidades ausentes em fases lógicas (Fase 1: Motor Tributário, Certificado A1 e Emissão/Recebimento Básico de NF-e; Fase 2: Eventos de NF-e, Manifestação do Destinatário e Automação Financeira/Estoque; Fase 3: SPED, Demais DF-es e Recursos Corporativos Avançados) com breves recomendações técnicas alinhadas à nossa stack tecnológica atual (incluindo sugestões de bibliotecas open-source ou gateways fiscais como Focus NFe, Nuvem Fiscal, PlugNotas, etc., se aplicável).

# Restrições
- Baseie suas descobertas estritamente nos arquivos reais do workspace — não presuma que uma funcionalidade existe se não houver código ou esquema que a sustente.
- Mantenha as descrições práticas, técnicas e concisas.
- Não modifique nenhum código-fonte da aplicação; apenas crie/atualize o arquivo `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.

# Papel e Objetivo
Você é um Arquiteto Sênior de Sistemas ERP, Especialista em Localização Fiscal Brasileira (com foco profundo em NF-e) e Engenheiro Full-Stack / UI-UX. Sua tarefa possui duas frentes principais:
1. Analisar o código-fonte atual, comparar com os padrões do **Odoo (Localização Brasil / OCA)** e **ERPNext**, e gerar o relatório de análise de lacunas em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.
2. **Montar e padronizar todas as telas (Frontend/UI)** do sistema baseadas nos modelos, schemas e códigos já abertos no repositório, aplicando **tamanhos corretos e proporcionais em todos os campos de edição (`input`, `select`, `textarea`)** de acordo com o tamanho máximo dos dados (banco de dados / layout oficial da SEFAZ).

# Parte 1: Análise de Lacunas (Gap Analysis)
1. **Descoberta da Base de Código:** Examine a estrutura do repositório, esquemas/migrações de banco de dados, rotas de API, integrações e componentes de UI existentes.
2. **Comparação de Benchmark:** Compare o sistema atual com o Odoo (Enterprise/Community + Localização Brasil `l10n_br`) e ERPNext nos seguintes domínios:
   - **Gestão Completa de NF-e (Foco Principal):**
     - *Configuração e Segurança:* Certificados Digitais (A1/A3), séries/numeração por CNPJ, ambientes (Homologação/Produção), CSC/Token.
     - *Motor Tributário:* Matriz fiscal (Origem x Destino), cálculo de ICMS, ICMS-ST, DIFAL, FCP, IPI, PIS, COFINS, preparação para IBS/CBS; cadastros de NCM, CFOP, CST/CSOSN, CEST, EAN/GTIN e Regimes Tributários.
     - *Ciclo de Vida e Emissão (Saída):* Geração e validação XSD do XML, assinatura digital, transmissão SEFAZ, consulta de recibo, DANFE (PDF) e envio por e-mail.
     - *Eventos e Contingência:* Cancelamento, Carta de Correção (CC-e), Inutilização, NF-e de Devolução/Ajuste/Complementar e contingência (SVC-AN/SVC-RS/EPEC).
     - *Entrada e Manifestação do Destinatário (MD-e):* Distribuição DF-e, eventos de manifestação, importação de XML de entrada e conversão em Compra/Estoque/Financeiro.
   - **Demais Domínios ERP:** Contabilidade e Finanças (CPC/IFRS, GL, CNAB, PIX, conciliação OFX), Demais Obrigações (NFS-e, NFC-e, CT-e, SPED Fiscal/Contribuições, REINF), Estoque/Armazéns (lote/validade, multiarmazém, Bloco K), Vendas/CRM, Compras (3-way matching), Manufatura/MRP, RH/eSocial e Governança (RBAC, auditoria, multiempresa/filiais).
3. **Gerar Arquivo:** Crie o diretório `docs/erp-standardization/` (se não existir) e salve o relatório completo em `docs/erp-standardization/GAP_ANALYSIS_ODOO.md` contendo:
   - `1. Resumo Executivo`
   - `2. Inventário de Módulos Implementados`
   - `3. Análise de Lacunas por Domínio` (Tabela com: *Funcionalidade*, *Padrão Odoo/ERPNext*, *Status Atual*, *Impacto/Complexidade*)
   - `4. Lacunas Críticas de Arquitetura e Transversais`
   - `5. Roadmap de Implementação Priorizado`

# Parte 2: Construção de Telas e Dimensionamento Correto dos Edits (UI)
1. **Reaproveitamento de Padrões:** Inspecione as telas, componentes de layout, design system (ex.: Tailwind, Shadcn, MUI, Bootstrap, etc.), hooks e serviços de API já abertos no projeto. Copie e siga rigorosamente a mesma arquitetura visual, estrutura de pastas, validação e estilo para montar todas as telas faltantes ou incompletas do sistema.
2. **Dimensionamento Proporcional e Exato dos Campos (`edits` / `inputs`):**
   - Inspecione o tamanho exato (`length`, `VARCHAR(N)`, `DECIMAL(p,s)`, regras XSD/SEFAZ) de cada campo no schema/banco de dados antes de renderizar o componente na tela.
   - **Proibido usar largura 100% genérica para todos os campos:** Ajuste a largura visual (`width` / `max-w-*` / colunas de grid) e o atributo `maxLength` de cada `input` para refletir o tamanho real do dado, criando conforto visual e leitura imediata:
     - *Códigos curtos e siglas (2 a 4 chars):* UF (`2`), Série NF-e (`3`), CFOP (`4`), CST/CSOSN (`3-4`), Moeda (`3`) -> campos compactos (`w-16` a `w-24`).
     - *Códigos fiscais e numéricos médios (6 a 14 chars):* CEP (`8-9`), NCM (`8`), CEST (`7`), GTIN/EAN (`8-14`), CPF (`11-14`), CNPJ (`14-18`), Data/Hora -> campos médios (`w-32` a `w-48`).
     - *Chaves e identificadores longos (20 a 44 chars):* Chave de Acesso NF-e (`44`), Protocolo SEFAZ (`15`), Código de Barras -> largura dedicada compatível (`w-96` ou coluna larga dedicada com fonte monoespaçada).
     - *Valores monetários, quantidades e alíquotas:* Alinhamento à direita (`text-right`), máscara numérica adequada e largura proporcional ao `DECIMAL` do banco (`w-28` para alíquotas `%`, `w-36` a `w-44` para valores `R$`).
     - *Descrições, Razão Social e Endereços (60 a 255 chars):* Ocupam o restante da linha no grid (`flex-1` ou colunas maiores do grid).
   - **Validação e Máscaras:** Adicione `maxLength` estrito idêntico ao limite do banco/SEFAZ, máscaras de formatação (CNPJ, CPF, CEP, NCM, CFOP, Moeda) e mensagens de validação claras.
3. **Cobertura de Telas:** Garanta que todos os módulos mapeados no código (Cadastros Base, Produtos/Fiscal, Clientes/Fornecedores, Pedidos, Emissão/Gestão de NF-e, Estoque e Financeiro) possuam suas telas de **Listagem (Grid/Tabela com filtros)** e **Formulário (Criação/Edição com abas organizadas no estilo Odoo/ERPNext)** funcionais e conectadas às rotas/APIs existentes.

# Restrições e Boas Práticas
- Não invente nomes de campos ou endpoints que conflitem com o backend existente; leia os arquivos de rotas, controllers, DTOs e schemas primeiro.
- Mantenha a consistência visual absoluta com o código aberto no projeto.
- Ao finalizar, liste no resumo de resposta todas as telas criadas/atualizadas e confirme a geração de `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`.



Comece imediatamente pelo primeiro item pendente do `BACKLOG.md` e continue até finalizar todas as telas.
