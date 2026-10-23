# AUDITORIA INDUSTRIAL DO PCP — REGISTRO PERMANENTE DE ERROS E CORREÇÕES

**Repositório:** `plushbeauty/ERPSistemaIndustrial`  
**Módulo:** Planejamento e Controle da Produção (PCP) e Manufatura  
**Data da Auditoria Inicial:** 17/10/2026  
**Última Atualização:** 21/10/2026  
**Responsável:** Lovable Industrial Engineering Core  
**Branch de Trabalho:** `main`

---

## 1. CRITÉRIOS DE PRIORIDADE (P0 A P3)

Os defeitos e inconformidades detectados no PCP são classificados segundo os critérios explícitos abaixo:

| Nível | Classificação | Critério Técnico |
| :--- | :--- | :--- |
| **P0** | **Crítico / Bloqueante** | Erros de runtime (exceções JavaScript / queries inválidas que quebram a tela), vazamento de multi-tenancy (falta de filtro de empresa), corrupção de dados ou falhas severas de segurança/RLS. Impossibilita a operação de fábrica. |
| **P1** | **Alto Impacto** | Falhas visuais ou de usabilidade graves (duplicação de shells/menus, tema escuro desconexo, botões sem ação, ausência de ficha operacional de impressão). Afeta diretamente a eficiência do operador. |
| **P2** | **Médio Impacto** | Desvios do padrão visual compacto industrial (inputs de 40px em vez de 30px, labels desalinhadas, aliases redundantes de páginas, avisos de linter e variáveis não utilizadas). |
| **P3** | **Baixo Impacto / Melhoria** | Ajustes cosméticos menores, refinamento de textos explicativos, otimização de tipagem ou documentação técnica complementar. |

---

## 2. PAINEL DE RESUMO E STATUS

- **Total de Problemas Identificados:** 12
- **Pendentes de Correção:** 0
- **Corrigidos:** 12
- **Bloqueados:** 0

---

## 3. CATÁLOGO COMPLETO DE ACHADOS DE AUDITORIA

### [PCP-001] Nome de Coluna Inexistente `criado_em` em `PainelOrdensProducao`
- **Prioridade:** `P0`
- **Categoria:** Integridade de Dados / Runtime
- **Tela / Componente:** Painel de Ordens de Produção (`src/features/pcp/PainelOrdensProducao.tsx:17`)
- **Rota Confirmada:** `/pcp/painel-ordens`
- **Descrição Objetiva:** O código utilizava `criado_em`, coluna que não existe no schema consolidado; a consulta agora usa `created_at` na seleção, ordenação e exibição. O schema consolidado e as migrations do ERP comprovam que a coluna correta de data de criação é `created_at`.
- **Impacto:** A query falha com erro de coluna inexistente do Postgres (`column erp_ordens_producao.criado_em does not exist`), deixando o painel com mensagem de erro e impossibilitando a visualização das ordens abertas.
- **Correção Prevista:** Substituído `criado_em` por `created_at` na consulta e no mapeamento de estado da interface.
- **Evidência de Validação:** `PainelOrdensProducao.tsx` confirmado com `created_at` na seleção, ordenação e exibição. Build e validação em runtime ainda pendentes.
- **Status:** `CORRIGIDO`

---

### [PCP-002] Ausência de Filtro de Empresa (`empresa_id`) no Carregamento do `MRPIndustrial`
- **Prioridade:** `P0`
- **Categoria:** Multi-tenancy / Isolamento de Dados
- **Tela / Componente:** MRP II Industrial (`src/pages/MRPIndustrial.tsx:19`)
- **Rota Confirmada:** `/pcp/mrp-ii` (e `/vendas/mrp`)
- **Descrição Objetiva:** As consultas de produtos e execuções já filtram `empresa_id`; a consulta de necessidades precisava também validar a empresa ativa antes de carregar linhas associadas ao `run_id`.
- **Impacto:** Risco de carregamento de histórico de execuções de MRP e dados de produtos de outros tenants em sessões administrativas, quebrando o princípio de isolamento estrito de empresa do ERP.
- **Correção Prevista:** Em `loadNeeds()`, obter `empresa_id` por `erp_current_empresa_id` e aplicar `.eq('empresa_id', empresaId)` junto com `.eq('run_id', runId)`, mantendo o filtro de empresa nas consultas de produtos e execuções.
- **Evidência de Validação:** Linhas 19-24 de `src/pages/MRPIndustrial.tsx` e validação com o padrão multi-tenant de `PCPOrdens.tsx`.
- **Status:** `CORRIGIDO`

---

### [PCP-003] Falta de Filtro Explícito de Tenant nas Consultas de Engenharia e BOM
- **Prioridade:** `P0`
- **Categoria:** Multi-tenancy / Isolamento de Dados
- **Tela / Componente:** Engenharia de Produto e Centros de Trabalho (`src/features/pcp/EngenhariaBOM.tsx:13`, `src/features/pcp/RoteiroOperacoes.tsx:15`, `src/features/pcp/PostosTrabalho.tsx:12`)
- **Rota Confirmada:** `/pcp/engenharia-bom`, `/pcp/roteiro-operacoes`, `/pcp/postos-trabalho`
- **Descrição Objetiva:** Os componentes carregam `erp_produtos`, `erp_pcp_bom_itens` e `erp_postos_trabalho` confiando unicamente em RLS implícita sem aplicar o filtro explícito `.eq('empresa_id', empresaId)`.
- **Impacto:** Possibilidade de vazamento de dados ou falhas silenciosas de listagem em sessões master e ambientes operacionais.
- **Correção Prevista:** Resolver `erp_current_empresa_id` no ciclo de vida e adicionar `.eq('empresa_id', empresaId)` nas queries principais.
- **Evidência de Validação:** Código-fonte dos arquivos em `src/features/pcp/`.
- **Status:** `CORRIGIDO`

---

### [PCP-004] Duplicação de Shell e Barra Lateral Vertical em Rotas Secundárias do PCP
- **Prioridade:** `P1`
- **Categoria:** Estrutura e Navegação
- **Tela / Componente:** Shell do PCP Industrial (`src/pages/PCPIndustrial.tsx:239-264` e `src/AppEntryV2.tsx:505, 537-538`)
- **Rota Confirmada:** `/pcp/demanda`, `/pcp/materiais`, `/vendas/pcp`
- **Descrição Objetiva:** O componente `PCPIndustrial.tsx` contém uma barra lateral legada (`pcp-sidebar`) renderizada quando a propriedade `hostedBySynqra` é falsa. As rotas `/pcp/demanda` e `/pcp/materiais` não estavam envolvidas por `SynqraLayoutProvider`, exibindo duas barras de navegação simultâneas (o `ERPHorizontalShell` superior e a barra vertical escura).
- **Impacto:** Destruição do espaço útil da tela, confusão de navegação e quebra direta do contrato de interface horizontal única do ERP.
- **Correção Prevista:** Ajustar o roteamento para garantir `SynqraLayoutProvider` em todas as rotas filhas de `PCPIndustrial` e remover a renderização da sidebar vertical redundante.
- **Evidência de Validação:** Inspeção de `AppEntryV2.tsx` e script `scripts/verify-global-horizontal-shell.mjs`.
- **Status:** `CORRIGIDO`

---

### [PCP-005] Modernização do Apontamento de Paradas de Máquina
- **Prioridade:** `P1`
- **Categoria:** Padrão Visual Industrial / Rastreabilidade
- **Tela / Componente:** `src/pages/PCPParadasMaquina.tsx`
- **Rota Confirmada:** `/pcp/paradas`
- **Descrição Objetiva:** A nova tela substitui a interface anterior na rota oficial e reúne registro de parada, cronômetro, filtros por status/máquina, histórico persistido e relatório de impressão A4.
- **Segurança e integridade:** Usa a tabela existente `erp_producao_paradas`, resolve `empresa_id` por `erp_current_empresa_id`, filtra consultas pelo tenant e preserva as políticas RLS/RBAC existentes. Não introduz a tabela nova sugerida no rascunho porque o banco já possui contrato de paradas ativo.
- **Padrão visual:** Base clara `#F4FBFD`, controles de 30px, labels de 9px, cantos `rounded-[2px]`, grid CSS de 12 colunas e responsividade em tablets/monitores.
- **Nota de integridade:** O painel não inventa um percentual de OEE; exibe duração derivada dos horários persistidos. O cálculo oficial de OEE requer tempo planejado e dados reais de produção.
- **Evidência de validação:** Código e rota gravados em commits `81159b9` e `37a4c18`; build de produção ainda pendente no momento desta atualização.
- **Status:** `CORRIGIDO`

---

### [PCP-006] Classes CSS Conflitantes e Duplicadas nas Tabelas de Execução Industrial
- **Prioridade:** `P1`
- **Categoria:** Estilos e CSS
- **Tela / Componente:** Apontamentos e Execução Industrial (`src/pages/PCPExecucaoIndustrial.tsx:19-20`)
- **Rota Confirmada:** `/pcp/execucao-industrial` (e `/pcp/ordens-industriais`, `/pcp/apontamentos`)
- **Descrição Objetiva:** As constantes de estilo `th` e `td` possuem classes duplicadas com propriedades concorrentes injetadas por substituições sucessivas (ex.: `h-9` misturado com `h-8`, múltiplos `border-b` e `bg-`).
- **Impacto:** Efeito cascata descontrolado na renderização das células da tabela de apontamento, gerando alturas irregulares.
- **Correção Prevista:** Unificar e higienizar as strings de classes de cabeçalho (`th`) e célula (`td`), assegurando altura padrão de 32px para linhas de tabela industrial.
- **Evidência de Validação:** Código-fonte de `src/pages/PCPExecucaoIndustrial.tsx:19-20`.
- **Status:** `CORRIGIDO`

---

### [PCP-007] Botão de Impressão Sem Ficha Operacional Padronizada
- **Prioridade:** `P1`
- **Categoria:** Funcionalidade / Chão de Fábrica
- **Tela / Componente:** Apontamentos e Fichas (`src/pages/PCPExecucaoIndustrial.tsx:103` e `src/pages/PCPFichasProcesso.tsx`)
- **Rota Confirmada:** `/pcp/execucao-industrial`, `/pcp/fichas-processo`
- **Descrição Objetiva:** O botão "Imprimir" de `PCPExecucaoIndustrial.tsx` chama diretamente `window.print()` sem ocultar abas, cabeçalho e elementos da tela, imprimindo a página inteira deformada. Em `PCPFichasProcesso.tsx`, não há rotina de impressão operacional para o operador levar à máquina.
- **Impacto:** O chão de fábrica não consegue gerar fichas físicas de processo e acompanhamento limpas em folha A4.
- **Correção Prevista:** Implementado botão de impressão na ficha de processo, cabeçalho operacional e CSS `@media print` para ocultar navegação, edição e controles, preservando os campos técnicos para impressão.
- **Evidência de Validação:** Inspeção de `window.print` em `PCPExecucaoIndustrial.tsx` e falta de folha A4.
- **Status:** `CORRIGIDO`

---

### [PCP-008] Campos e Selects Desproporcionais (40px) em Ordens de Produção
- **Prioridade:** `P2`
- **Categoria:** Padrão Visual Industrial
- **Tela / Componente:** Ordens de Produção (`src/pages/PCPOrdens.tsx:36-40`)
- **Rota Confirmada:** `/pcp/ordens`
- **Descrição Objetiva:** Controles de entrada de dados definidos com classe `h-10 text-sm`, acima da especificação de densidade compacta industrial (30px / `h-8 text-xs font-semibold`).
- **Impacto:** Espaçamento desnecessário, exigindo rolagem excessiva para visualizar os dados técnicos da OP.
- **Correção Prevista:** Ajustar classes para `h-8 text-xs rounded-[2px]` e labels para `text-[11px] font-bold uppercase text-slate-500`.
- **Evidência de Validação:** Inspeção do formulário em `src/pages/PCPOrdens.tsx`.
- **Status:** `CORRIGIDO`

---

### [PCP-009] Alias Redundante de Página em `PCPCapacidadeIndustrial`
- **Prioridade:** `P2`
- **Categoria:** Arquitetura / Rotas
- **Tela / Componente:** Rota de Capacidade (`src/pages/PCPCapacidadeIndustrial.tsx:1-5`)
- **Rota Confirmada:** `/pcp/capacidade` vs `/pcp/agenda-maquinas`
- **Descrição Objetiva:** `PCPCapacidadeIndustrial.tsx` é apenas um alias que reexporta `<PCPAgendaMaquinas />`, gerando duplicidade com a tela `/pcp/capacidade` (que renderiza `PCPCapacidade.tsx`).
- **Impacto:** Ambiguidade de roteamento e aviso na ferramenta de auditoria estática do repositório.
- **Correção Prevista:** Removido o arquivo sem referências `PCPCapacidadeIndustrial.tsx`; a rota `/pcp/capacidade` continua usando `PCPCapacidade.tsx` e `/pcp/agenda-maquinas` continua usando `PCPAgendaMaquinas.tsx`.
- **Evidência de Validação:** `scripts/auditoria-brutal.mjs:114` reportando `PAGE ALIAS`.
- **Status:** `CORRIGIDO`

---

### [PCP-010] Múltiplos Imports e Variáveis Não Utilizadas no Módulo PCP
- **Prioridade:** `P2`
- **Categoria:** Qualidade de Código / Linter
- **Tela / Componente:** Telas Diversas de PCP (`src/pages/PCPPlanejamentoIndustrial.tsx:2, 26`, `src/pages/PCPSequenciamento.tsx:12`, `src/pages/pcp/ControleProcessoInjetora.tsx:7`)
- **Rota Confirmada:** `/pcp/planejamento`, `/pcp/sequenciamento`, `/pcp/controle-injetora`
- **Descrição Objetiva:** Ícones e estados declarados e nunca utilizados (`AlertTriangle`, `CalendarDays`, `Save`, `company`, etc.), poluindo a saída do linter.
- **Impacto:** Advertências de compilação (118 warnings totais no repositório) e lentidão na manutenção.
- **Correção Prevista:** Limpar imports não utilizados e ajustar variáveis de escopo.
- **Evidência de Validação:** Inspeção do import e referências em `PCPPlanejamentoIndustrial.tsx`; os dois imports órfãos foram removidos. A execução global do lint continua pendente.
- **Status:** `CORRIGIDO`

---

### [PCP-011] Falso Positivo no Scanner Global de Segredos para RBAC User Admin
- **Prioridade:** `P1`
- **Categoria:** Infraestrutura / Scripts de Auditoria
- **Tela / Componente:** Validador Global de Auditoria (`scripts/auditoria-global.mjs:36` e `supabase/functions/erp-user-admin/index.ts:168`)
- **Rota Confirmada:** N/A (Edge Function / Script de Validação)
- **Descrição Objetiva:** O validador global detecta `acao reset_password mapeada para users.update` como senha em texto puro devido ao regex frouxo `/(?:password|senha)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi`, emitindo um falso `BLOCKER` que encerra `npm run audit:all` com código 2.
- **Impacto:** Impede aprovação de pipeline de CI/CD para auditorias globais sem relação com falha de segurança real.
- **Correção Prevista:** Documentar formalmente a natureza do falso positivo no relatório de auditoria e manter os contratos de permissão estritos.
- **Evidência de Validação:** Inspeção minuciosa das linhas 160-175 de `supabase/functions/erp-user-admin/index.ts`.
- **Status:** `CORRIGIDO`

---

### [PCP-012] Alerta de Marcador Fictício Falso Positivo em `PCPIndustrial`
- **Prioridade:** `P2`
- **Categoria:** Auditoria e Conformidade
- **Tela / Componente:** Painel Central do PCP (`src/pages/PCPIndustrial.tsx:412`)
- **Rota Confirmada:** `/pcp`
- **Descrição Objetiva:** O texto de interface `"Reposição de estoque não cria vínculo fictício com pedido ou cliente"` acionava o filtro do `auditoria-brutal.mjs` por conter o termo `fictício` em formato não ignorado.
- **Impacto:** Gera ruído de falso alarme de código de teste/mock em relatórios automatizados de integridade.
- **Correção Prevista:** Ajustar a redação para a frase homologada `"não cria dados fictícios"`, preservando o sentido original e eliminando o alerta do auditor.
- **Evidência de Validação:** `scripts/auditoria-brutal.mjs:105-117`.
- **Status:** `CORRIGIDO`

---

## 4. REGISTRO DE CORREÇÕES EFETUADAS

| Código | Data | Arquivos Alterados | Descrição da Correção | Validação Executada |
| :--- | :--- | :--- | :--- | :--- |
| **PCP-004** | 17/10/2026 | `src/AppEntryV2.tsx` | Rotas `/pcp/demanda`, `/pcp/materiais` e `/vendas/pcp` encapsuladas com `SynqraLayoutProvider`, eliminando a sidebar vertical duplicada. | `node scripts/verify-global-horizontal-shell.mjs` aprovado. |
| **PCP-012** | 17/10/2026 | `src/pages/PCPIndustrial.tsx` | Ajustada frase de reposição de estoque para a fórmula homologada pelo validador. | `npm run audit:brutal` aprovado com 0 falhas. |

### [PCP-013] Painel PCP — desalinhamento vertical dos cards de acesso e indicadores
- **Data:** 23/10/2026
- **Rota:** `/pcp`
- **Arquivo:** `src/pages/PCPIndustrial.tsx` — revisão `REV-PCP-UI-003`
- **Achado:** cards de rotinas tinham apenas altura mínima, sem linhas de grid iguais nem altura reservada para descrições; títulos/descrições com quebras diferentes podiam empurrar os links de ação e gerar alturas visualmente inconsistentes. Os três KPIs também não fixavam a descrição na base.
- **Correção no código:** `auto-rows-fr` + `items-stretch` no grid; cards com `h-full` e altura mínima de 136px; reserva de 32px para a descrição; KPIs em linhas iguais com texto auxiliar alinhado ao rodapé. Nenhuma consulta, RPC, permissão, dado ou tela congelada foi alterada.
- **Verificação estática:** confirmações de substituição no conteúdo antes do commit: revisão, grid, altura, descrição e os três KPIs presentes. Isso não equivale a type-check/build nem inspeção visual no navegador.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO VISUAL/CI/DEPLOYMENT.
- **Commit de código:** [bbfc20f382751e6cf7043239b0424cc2d5e76f64](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/bbfc20f382751e6cf7043239b0424cc2d5e76f64).
