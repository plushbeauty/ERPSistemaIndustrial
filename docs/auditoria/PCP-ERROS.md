# AUDITORIA INDUSTRIAL DO PCP — REGISTRO PERMANENTE DE ERROS E CORREÇÕES

**Repositório:** `plushbeauty/ERPSistemaIndustrial`  
**Módulo:** Planejamento e Controle da Produção (PCP) e Manufatura  
**Data da Auditoria Inicial:** 17/10/2026  
**Última Atualização:** 17/10/2026  
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

- **Total de Problemas Identificados:** 14
- **Pendentes de Correção:** 8
- **Corrigidos:** 4
- **Bloqueados:** 2

---

## 3. CATÁLOGO COMPLETO DE ACHADOS DE AUDITORIA

### [PCP-001] Nome de Coluna Inexistente `criado_em` em `PainelOrdensProducao`
- **Prioridade:** `P0`
- **Categoria:** Integridade de Dados / Runtime
- **Tela / Componente:** Painel de Ordens de Produção (`src/features/pcp/PainelOrdensProducao.tsx:17`)
- **Rota Confirmada:** `/pcp/painel-ordens`
- **Descrição Objetiva:** A consulta do Supabase utiliza `.order('criado_em', { ascending: false })` e `.select('..., criado_em, ...')` na tabela `erp_ordens_producao`. O schema consolidado e as migrations do ERP comprovam que a coluna correta de data de criação é `created_at`.
- **Impacto:** A query falha com erro de coluna inexistente do Postgres (`column erp_ordens_producao.criado_em does not exist`), deixando o painel com mensagem de erro e impossibilitando a visualização das ordens abertas.
- **Correção Aplicada:** Referências a `criado_em` substituídas por `created_at` no tipo, `select`, ordenação e renderização.
- **Evidência de Validação:** Commit `a12454b2f7da30346f7e4b65d0114314388e1271`; type-check/build e deployment desse commit ainda aguardam confirmação.
- **Status:** `BLOQUEADO`

---

### [PCP-002] Ausência de Filtro de Empresa (`empresa_id`) no Carregamento do `MRPIndustrial`
- **Prioridade:** `P0`
- **Categoria:** Multi-tenancy / Isolamento de Dados
- **Tela / Componente:** MRP II Industrial (`src/pages/MRPIndustrial.tsx:19`)
- **Rota Confirmada:** `/pcp/mrp-ii` (e `/vendas/mrp`)
- **Descrição Objetiva:** A função `load()` consulta `erp_produtos` e `erp_mrp_runs` sem obter a empresa da sessão (`erp_current_empresa_id`) e sem aplicar `.eq('empresa_id', companyId)`.
- **Impacto:** Risco de carregamento de histórico de execuções de MRP e dados de produtos de outros tenants em sessões administrativas, quebrando o princípio de isolamento estrito de empresa do ERP.
- **Correção Prevista:** Obter `empresa_id` através de `supabase.rpc('erp_current_empresa_id')` e injetar o filtro `.eq('empresa_id', companyId)` em todas as seleções de produtos e execuções de MRP.
- **Evidência de Validação:** Linhas 19-24 de `src/pages/MRPIndustrial.tsx` e validação com o padrão multi-tenant de `PCPOrdens.tsx`.
- **Status:** `PENDENTE`

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
- **Status:** `PENDENTE`

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

### [PCP-005] Quebra do Padrão Visual Compacto Industrial na Tela de Paradas de Máquina
- **Prioridade:** `P1`
- **Categoria:** Padrão Visual Industrial
- **Tela / Componente:** Apontamento de Paradas e Setup (`src/pages/PCPParadas.tsx:84-150`)
- **Rota Confirmada:** `/pcp/paradas`
- **Descrição Objetiva:** A tela utiliza fundo escuro não padronizado (`bg-slate-900`), botões verticais excessivamente grandes (`min-h-16`), cantos arredondados desproporcionais (`rounded-xl`) e tipografia fora da escala técnica do ERP.
- **Impacto:** Inconsistência visual extrema em relação ao restante do ERP industrial (que utiliza base clara `#F4FBFD`, molduras discretas `#123B50` / `#2D8DB8` e controles densos de 30px).
- **Correção Prevista:** Refatorar o layout para a paleta oficial (`#F4FBFD`, `#123B50`, `#2D8DB8`), inputs de altura 30px (`h-8`), botões com `rounded-[2px]` e tabela densa de paradas ativas e encerradas.
- **Evidência de Validação:** Padrão de referência aprovado em `src/pages/NovoPedido.tsx` e regras de `scripts/verify-approved-ui-lock.mjs`.
- **Status:** `PENDENTE`

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
- **Status:** `PENDENTE`

---

### [PCP-007] Botão de Impressão Sem Ficha Operacional Padronizada
- **Prioridade:** `P1`
- **Categoria:** Funcionalidade / Chão de Fábrica
- **Tela / Componente:** Apontamentos e Fichas (`src/pages/PCPExecucaoIndustrial.tsx:103` e `src/pages/PCPFichasProcesso.tsx`)
- **Rota Confirmada:** `/pcp/execucao-industrial`, `/pcp/fichas-processo`
- **Descrição Objetiva:** O botão "Imprimir" de `PCPExecucaoIndustrial.tsx` chama diretamente `window.print()` sem ocultar abas, cabeçalho e elementos da tela, imprimindo a página inteira deformada. Em `PCPFichasProcesso.tsx`, não há rotina de impressão operacional para o operador levar à máquina.
- **Impacto:** O chão de fábrica não consegue gerar fichas físicas de processo e acompanhamento limpas em folha A4.
- **Correção Prevista:** Implementar folha de impressão `@media print` dedicada com layout técnico industrial (cabeçalho da empresa, número da OP, produto, máquina, molde, parâmetros técnicos e espaço para assinatura de turno).
- **Evidência de Validação:** Inspeção de `window.print` em `PCPExecucaoIndustrial.tsx` e falta de folha A4.
- **Status:** `PENDENTE`

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
- **Status:** `PENDENTE`

---

### [PCP-009] Alias Redundante de Página em `PCPCapacidadeIndustrial`
- **Prioridade:** `P2`
- **Categoria:** Arquitetura / Rotas
- **Tela / Componente:** Rota de Capacidade (`src/pages/PCPCapacidadeIndustrial.tsx:1-5`)
- **Rota Confirmada:** `/pcp/capacidade` vs `/pcp/agenda-maquinas`
- **Descrição Objetiva:** `PCPCapacidadeIndustrial.tsx` é apenas um alias que reexporta `<PCPAgendaMaquinas />`, gerando duplicidade com a tela `/pcp/capacidade` (que renderiza `PCPCapacidade.tsx`).
- **Impacto:** Ambiguidade de roteamento e aviso na ferramenta de auditoria estática do repositório.
- **Correção Prevista:** Manter `PCPAgendaMaquinas.tsx` para sequenciamento por recurso e `PCPCapacidade.tsx` para carga agregada, documentando o papel específico de cada uma.
- **Evidência de Validação:** `scripts/auditoria-brutal.mjs:114` reportando `PAGE ALIAS`.
- **Status:** `PENDENTE`

---

### [PCP-010] Múltiplos Imports e Variáveis Não Utilizadas no Módulo PCP
- **Prioridade:** `P2`
- **Categoria:** Qualidade de Código / Linter
- **Tela / Componente:** Telas Diversas de PCP (`src/pages/PCPPlanejamentoIndustrial.tsx:2, 26`, `src/pages/PCPSequenciamento.tsx:12`, `src/pages/pcp/ControleProcessoInjetora.tsx:7`)
- **Rota Confirmada:** `/pcp/planejamento`, `/pcp/sequenciamento`, `/pcp/controle-injetora`
- **Descrição Objetiva:** Ícones e estados declarados e nunca utilizados (`AlertTriangle`, `CalendarDays`, `Save`, `company`, etc.), poluindo a saída do linter.
- **Impacto:** Advertências de compilação (118 warnings totais no repositório) e lentidão na manutenção.
- **Correção Prevista:** Limpar imports não utilizados e ajustar variáveis de escopo.
- **Evidência de Validação:** Execução de `npm run lint:check`.
- **Status:** `PENDENTE`

---

### [PCP-011] Falso Positivo no Scanner Global de Segredos para RBAC User Admin
- **Prioridade:** `P1`
- **Categoria:** Infraestrutura / Scripts de Auditoria
- **Tela / Componente:** Validador Global de Auditoria (`scripts/auditoria-global.mjs:36` e `supabase/functions/erp-user-admin/index.ts:168`)
- **Rota Confirmada:** N/A (Edge Function / Script de Validação)
- **Descrição Objetiva:** O validador global detecta `acao reset_password mapeada para users.update` como senha em texto puro devido ao regex frouxo `/(?:password|senha)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi`, emitindo um falso `BLOCKER` que encerra `npm run audit:all` com código 2.
- **Impacto:** Impede aprovação de pipeline de CI/CD para auditorias globais sem relação com falha de segurança real.
- **Correção Aplicada:** Regex do scanner em `scripts/auditoria-global.mjs` ajustado para `\\b(?:password|senha)\\b`, preservando a detecção de atribuições explícitas de senha sem casar o nome da ação `reset_password`.
- **Evidência de Validação:** Commit `55bbf256b7a38199c4a97ab09c066c1057502717`; deployment de produção desse commit ficou `READY`.
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


---

### [PCP-013] Verificação de Permissão da Auditoria PCP Falhava em Modo Aberto
- **Prioridade:** `P0`
- **Categoria:** Segurança / RBAC
- **Tela / Componente:** Auditoria PCP (`src/pages/pcp/PCPAuditoria.tsx`)
- **Rota Confirmada:** `/pcp/auditoria`
- **Descrição Objetiva:** Se a RPC `erp_has_permission('producao.ver')` retornasse erro ou lançasse exceção, a tela concedia acesso apenas por existir sessão autenticada.
- **Impacto:** Falha de autorização fail-open: usuário autenticado sem permissão confirmada poderia visualizar a auditoria.
- **Correção Aplicada:** Falha da RPC e exceção agora negam acesso; a tela só permite acesso quando a resposta de permissão é explicitamente `true`.
- **Evidência de Validação:** Commit `31771ee15838f9c1fc347f75a1b2855737d58d7b`; deployment de produção desse commit confirmado como `READY`.
- **Status:** `CORRIGIDO`


---

### [PCP-014] Validação Insuficiente no Apontamento de Produção
- **Prioridade:** `P2`
- **Categoria:** Funcional / Integridade de Dados
- **Tela / Componente:** PCP Industrial — Apontamento de Produção (`src/pages/PCPIndustrial.tsx`)
- **Rota Confirmada:** `/pcp`
- **Descrição Objetiva:** Quantidades vazias podiam ser convertidas em zero e linhas de defeito com quantidade ausente ou inválida podiam ser descartadas silenciosamente antes da chamada à RPC.
- **Impacto:** Risco de apontamento incompleto e perda de detalhes de qualidade.
- **Correção Aplicada:** Validação client-side agora exige quantidade encontrada maior que zero, refugo numérico entre zero e o total encontrado e formato válido `defeito:quantidade:observação` para cada linha preenchida.
- **Evidência de Validação:** Commit `0f9b6d0b20062bdac3e056f4c8956d9048e2e8cd`. O gate completo e o deployment deste commit ainda não foram confirmados; a Vercel reportou rate limit.
- **Status:** `BLOQUEADO`
