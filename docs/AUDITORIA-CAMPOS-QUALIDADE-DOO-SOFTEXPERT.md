# Auditoria de campos e cobertura do SGQ — DOO + SoftExpert

**Base de código inspecionada:** `feat/qualidade-padrao-formularios-dashboard` e alterações propostas nesta branch.  
**Objetivo:** confrontar os módulos e os campos existentes no ERP com capacidades publicadas pela DOO e SoftExpert, sem presumir colunas ou dados que não estejam comprovados.

## Referências funcionais

- DOO: documentos, não conformidades, planos de ação, auditorias, avaliação de fornecedores, riscos, atendimento ao cliente, pessoas, calibração, indicadores e mudanças.
- DOO — avaliação de fornecedores: critérios configuráveis, pesos, cálculo de IQF, ranking, histórico, vínculo com não conformidades e acompanhamento de inspeções.
- SoftExpert QMS: documentos e revisões, fluxo de aprovação, auditorias e evidências, riscos, indicadores, Ishikawa, FTA, 5 Porquês e CAPA.
- SoftExpert Supplier: qualificação/homologação, scorecards de desempenho, histórico, riscos e monitoramento da cadeia de fornecimento.

## Inventário dos 22 acessos da Central da Qualidade

| # | Módulo / rota | Campos e capacidades encontrados no código | Resultado da conferência |
|---:|---|---|---|
| 1 | Inspeções de lotes — `/qualidade/inspecoes` | Tipo (recebimento/processo/produto final), critério aprovado, produto, lote, resultado, quantidade total, amostra, observações, parâmetro/cota, nominal, tolerâncias +/−, valor medido; para critério não numérico, evidência e dados de certificado. | Implementado; bloqueia aprovação sem especificação vigente e trata medição fora da tolerância. |
| 2 | Inspeção em processo — `/qualidade/inspecao-processo` | Produto, OP, máquina, plano/característica, instrumento, inspetor, quantidade inspecionada/aprovada/reprovada, resultado, ação de bloqueio e medições. | Implementado; confirmar no gate a integridade do vínculo entre plano, especificação e medição. |
| 3 | Especificações técnicas — `/qualidade/especificacoes` | Produto, revisão, vigência inicial/final e parâmetros com código, característica, tipo, unidade, nominal, tolerâncias inferior/superior, critério de aceitação, método de verificação e indicador obrigatório. | Implementado com critérios estruturados; não criar campos paralelos fora do contrato existente. |
| 4 | Liberação de lotes — `/qualidade/liberacao-lote` | A rota estava apontando para acompanhamento de RNC, não para inspeção/liberação. | Corrigido nesta branch para abrir a tela real de inspeção e decisão; é um acesso compartilhado, não uma implementação independente de workflow. |
| 5 | Quarentena de lotes — `/qualidade/quarentena` | Lote e motivo da retenção; consulta lote, fornecedor/rastreabilidade e estado de quarentena. | Implementado; manter bloqueio e motivo ligados ao lote real. |
| 6 | Genealogia de lotes — `/qualidade/genealogia-lote` | Busca de lote; lote interno/fornecedor, produto, componentes consumidos e quantidades, fornecedor, OP/pedido, máquina, operador e cliente quando disponíveis. | Implementado como rastreabilidade; verificar dados incompletos e estados vazios no runtime. |
| 7 | Sala de RNC/RPNC — `/qualidade/sala-rnc` | Lista de RPNC, origem, status, lote, setor, responsáveis, evidências, prazo, ações e acompanhamento. | Implementado; conferir fluxo de aprovação e filtros por empresa no gate. |
| 8 | Cadastro RNC — `/qualidade/rnc` | Código gerado, origem, setor responsável, lote afetado, quantidade segregada, disposição do material, descrição detalhada e filtros de busca/status/origem. | Implementado; gravação e campos adicionais são dependentes do contrato existente da RPNC. |
| 9 | Ishikawa / 6M — `/qualidade/ishikawa` | Efeito/problema, máquina, método, mão de obra, material, medição e meio ambiente; a tela também oferece 5 Porquês e evidências de causa. | Implementado; validar salvamento e vínculo com RNC. |
| 10 | CAPA / 5W2H — `/qualidade/capa` | RNC de origem, tipo, o quê, por quê, onde, quem, quando, como, quanto, causa, responsável, prazo, status e eficácia. | Implementado em tela compartilhada; verificar atomicidade entre RNC e ações no banco. |
| 11 | Metodologia 8D — `/qualidade/metodologia-8d` | Código 8D, RNC de origem, status, D1 equipe, D2 problema, D3 contenção, D4 causa raiz, D5 ações, D6 validação, D7 prevenção e D8 encerramento; snapshot de RNC. | Implementado; confirmar a preservação do snapshot após alterações da RNC. |
| 12 | FMEA / PFMEA — `/qualidade/pfmea` | Código do item/processo, função/requisito, modo e efeito de falha, severidade, causa, ocorrência, controles atuais, detecção, ação recomendada e NPR calculado a partir dos fatores. | Implementado; não duplicar o formulário FMEA legado sem necessidade. |
| 13 | GED / documentos controlados — `/qualidade/ged-documentos` | Código, título, departamento, corpo do documento, revisão/motivo de alteração, anexos, histórico e fluxo de aprovação/ativação. | Implementado; cadastro de documentos deve continuar abaixo da visão geral, com árvore legível. |
| 14 | Procedimentos e PDFs — `/qualidade/procedimentos` | Consulta de documentos vigentes, seleção de registro 8D, código/título e operações de arquivo PDF. | Implementado como consulta/gestão de documentos; conferir permissões de download e empresa. |
| 15 | Lista mestre — `/qualidade/lista-mestre` | Filtros de departamento/tipo/status/pesquisa, inclusão de formulários e paginação da lista de documentos. | Implementado; garantir que a lista reflita apenas documentos reais e vigentes conforme filtro. |
| 16 | Auditoria 5S — `/qualidade/auditoria-5s` | Setor auditado, auditor responsável, acompanhante e checklist/registro da auditoria. | Parcial na revisão estática: os campos principais foram identificados; revisar todos os itens de checklist, pontuação, evidências e fechamento antes de declarar completo. |
| 17 | CEP / cartas de controle — `/qualidade/cep` | Produto, característica/parâmetro, nominal, LST, LIT e valor medido; estatísticas incluem média, desvio e Cpk quando há dados suficientes. | Implementado como registro e análise; confirmar regra de amostragem, estabilidade e disponibilidade dos dados reais antes de interpretação estatística. |
| 18 | Metrologia e calibração — `/qualidade/calibracao` | Código, descrição, fabricante, equipamento, modelo, série, faixa, resolução, setor, responsável, status, datas de calibração, certificado/RBC, validade, tolerância, erro, unidade, classe de exatidão, incerteza expandida, fator de abrangência, temperatura/umidade, rastreabilidade, desvios, critério de aceitação, laboratório, intervalo e criticidade. | Implementado com campos metrológicos detalhados; conferir se todos são persistidos e exibidos no histórico de calibrações. |
| 19 | Instrumentos de medição — `/qualidade/instrumentos` | Código, descrição, fabricante, tipo/equipamento, número de série, faixa, resolução, setor, responsável e status. | Implementado como cadastro operacional; campos metrológicos completos ficam na tela de calibração. |
| 20 | Refugos da qualidade — `/qualidade/refugos` | A rota usa a central compartilhada `CentraisIndustriais module="refugos"`; a tela de inspeção de recebimento encontrada em outro arquivo não deve ser confundida com refugos. | Auditoria específica de campos ainda pendente; não afirmar que os campos de refugo foram conferidos sem revisar o componente e seu contrato de dados. |
| 21 | Editor gráfico de procedimentos — `/qualidade/editor-it` | Código, título, departamento, objetivo, escopo, responsabilidades, método/critérios/registros e etapas com tipo, descrição e responsável; edição de fluxo. | Implementado; conferir se a exportação e a versão publicada preservam o conteúdo aprovado. |
| 22 | Relatórios do SGQ — `/qualidade/relatorios-documentos` | Departamento, tipo, situação, pesquisa por código/título/área e opção de incluir formulários. | Implementado para relatórios documentais; relatórios de fornecedor/IQF e outros indicadores não devem ser presumidos existentes. |

## Defeitos confirmados e alterações desta branch

1. A Central da Qualidade e o painel SGQ tinham excesso de superfícies brancas e estados pouco diferenciados. A branch reforça contraste, cabeçalhos, indicadores, resultados e cartões sem aumentar a altura padrão dos controles.
2. A rota de liberação de lotes abria acompanhamento de RNC. Ela foi direcionada à tela de inspeção existente, e a descrição do acesso foi ajustada para refletir a função real.
3. O formulário SGQ avançado não apresentava todos os campos relacionais presentes na migration existente. Foram adicionados vínculos de processo, fornecedor, responsável, responsável da ação e RNC, além do campo SIPOC `recursos`.
4. As consultas do SGQ avançado agora incluem filtro explícito por `empresa_id`, além das políticas RLS.
5. O painel de risco de fornecedor exibia “Cadastro”, validade vazia e “Ativo” como se fossem dados de avaliação/certificação. Isso foi removido; a tela informa explicitamente “Ainda não avaliado”.

## Lacuna funcional identificada pela comparação com DOO e SoftExpert

**Avaliação de fornecedores / IQF independente ainda não foi encontrada como módulo completo no ERP.** O código atual possui riscos de fornecedor e cadastro de fornecedores, mas não foi localizado um histórico dedicado de avaliação com critérios configuráveis, pesos, notas, cálculo ponderado do IQF, ranking e reavaliação periódica.

A DOO documenta esses recursos explicitamente, incluindo critérios/pesos, IQF, histórico e ligação a não conformidades. O SoftExpert descreve questionários/qualificação, scorecards de desempenho, riscos e monitoramento. Esses requisitos são referência para a próxima implementação, não dados existentes no ERP.

**Não criar ou aplicar uma nova tabela sem validar a conexão e o schema efetivo do Supabase.** Nesta sessão, a conexão do projeto Supabase não retornou projetos disponíveis; portanto, a migration de avaliação de fornecedores não foi aplicada nem validada no banco. A lacuna deve permanecer visível até que o schema, RLS, grants, RPC e execução de teste sejam confirmados.

## Gates ainda necessários antes de produção

- TypeScript, lint, build e testes automatizados no CI.
- Testes autenticados com duas empresas diferentes para confirmar isolamento de dados.
- Teste de gravação/edição dos formulários, incluindo vínculos e anexos.
- Verificação de rotas e de que a Central Tablet abre no comportamento esperado.
- Revisão final dos campos de Auditoria 5S, Refugos e dos relatórios além de documentos.
- Não promover para produção enquanto esses gates não estiverem verdes.
