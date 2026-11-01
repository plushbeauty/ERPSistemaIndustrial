# Auditoria estática complementar — Qualidade
**Data:** 2026-11-01  
**Branch:** `feature/quality-module-rebuild-20261101`  
**Escopo:** rotas e operações identificáveis no código-fonte; não substitui a auditoria funcional/browser nem a validação do banco ao vivo.

## 1. Rotas e componentes confirmados em `src/AppEntryV2.tsx`

| Rota interna | Componente | Observação |
|---|---|---|
| `/pageprincipal/qualidade/rpnc` | `QualidadeRPNC` | Abertura e consulta de RPNCs |
| `/pageprincipal/qualidade/rpnc-formulario` | `QualityRpncForm` | Formulário de investigação, Ishikawa, 5 Porquês, CAPA e evidências |
| `/pageprincipal/qualidade/auditorias` | `QualityAuditsList` | Agenda/lista de auditorias e vínculo de constatações |
| `/pageprincipal/qualidade/ged` | `FileTreeGED` | Árvore de evidências associadas a cliente/RPNC; não é o Controle de Documentos em sete abas |
| `/pageprincipal/paquimetro` | `QualidadePaquimetroDigital` | Instrumentos de medição/calibração |

Aliases confirmados:
- `/qualidade/rpnc` → `/pageprincipal/qualidade/rpnc`
- `/qualidade/rpnc-formulario` → `/pageprincipal/qualidade/rpnc-formulario`
- `/qualidade/auditorias` → `/pageprincipal/qualidade/auditorias`
- `/paquimetro` e `/qualidade/paquimetro` → `/pageprincipal/paquimetro`
- `/qualidade/ged-documentos`, `/qualidade/documentos` e `/documentos-qualidade` → `/pageprincipal/qualidade/ged`

## 2. Evidências por arquivo

### `src/pages/QualidadeRPNC.tsx` — 255 linhas
- Obtém usuário autenticado com `supabase.auth.getUser()` e empresa via RPC `erp_current_empresa_id`.
- Consulta setores ativos em `erp_setores` e registros em `erp_rpnc`, filtrando por `empresa_id`.
- Abre ocorrência pela RPC `erp_sgq_abrir_rpnc`.
- Faz upload privado no bucket `qualidade-evidencias` com `upsert: false`; grava metadados em `erp_qualidade_rpnc_evidencias`.
- Interface inspecionada inclui origem, severidade, setor, descrição e upload de evidências.
- Limite desta inspeção: não foi executado teste autenticado de isolamento entre empresas nem verificação das policies efetivas do bucket.

### `src/pages/QualidadeRPNCTratamento.tsx` — 115 linhas
- Consulta `erp_rpnc` e recupera Ishikawa, 5 Porquês e dados de eficácia.
- Persiste análise pela RPC `erp_sgq_salvar_analise_rpnc`.
- Transiciona status pela RPC `erp_sgq_transicionar_rpnc`.
- Registra eficácia pela RPC `erp_sgq_registrar_eficacia_rpnc`.
- Renderiza cinco respostas de 5 Porquês, parecer de eficácia e opção de eficácia.
- Não há, no componente inspecionado, editor SVG/diagrama com edição inline nos ramos; a gravação usa o contrato atual da RPC.

### `src/pages/QualityAuditsList.tsx` — 448 linhas
- Consulta `erp_sgq_auditorias`, `erp_rpnc` e `erp_usuarios`, com usuário autenticado e empresa obtida por `erp_current_empresa_id`.
- Cria e atualiza auditorias em `erp_sgq_auditorias`.
- Vincula/desvincula RPNCs por RPC `erp_sgq_vincular_rpnc_auditoria`.
- Interface contém atualização, criação/agendamento, edição de status, busca de constatações e vínculo/desvínculo.
- A inspeção estática não comprova comportamento de todas as políticas, transações ou concorrência.

### `src/pages/QualidadePaquimetroDigital.tsx` — 181 linhas
- Obtém sessão e empresa; consulta `erp_equipamentos_medicao`.
- Tem abas de metrologia e documentos.
- O botão de documentos navega para `/qualidade/ged-documentos`, que atualmente redireciona para o GED de evidências, reforçando a necessidade de corrigir o destino para o futuro Controle de Documentos sem quebrar o Paquímetro aprovado.
- Nenhuma alteração visual no Paquímetro foi feita.

### `src/pages/QualityRpncForm.tsx`
- O contrato atual de Ishikawa usa seis grupos de listas de texto (6M).
- O formulário agrega investigação, 5 Porquês, ações CAPA/evidências e relatório de impressão.
- A edição atual das causas é separada do desenho; não satisfaz o requisito de preenchimento diretamente nos ramos.
- O CSS de impressão existente ainda precisa de validação no navegador e impressão A4 física/PDF.

### `src/pages/FileTreeGED.tsx`
- A função atual é apresentar uma árvore de evidências por cliente/RPNC, com metadados e links assinados do Storage.
- Não foi identificada como página de cadastro completo, revisão, aprovação, distribuição, obsolescência e lista mestra de documentos controlados.

## 3. Lacunas confirmadas nesta etapa
1. Não há rota/componente confirmado para a página única **Controle de Documentos da Qualidade** com sete abas.
2. As rotas de documentos apontam para `FileTreeGED`, cujo propósito é evidências de RPNC.
3. Ishikawa não permite editar diretamente nos ramos do desenho nem representa, no contrato atual, subcausas, prioridade, raiz individual, evidência por causa e categorias personalizadas.
4. O Paquímetro contém navegação para o alias GED-documentos; o destino precisa ser atualizado quando o novo controle documental estiver implementado, preservando o restante da tela.
5. Há operações Supabase reais nos componentes inspecionados, mas a existência de chamadas no código não comprova RLS/Storage correto nem o sucesso de CRUD em ambiente real.

## 4. Não executado / não alegar como concluído
- Inspeção ao vivo de schema, migrations aplicadas, policies RLS, grants, funções e bucket: conexão Supabase anteriormente recusou permissão.
- Execução de CRUD com usuários de empresas distintas.
- Teste de reabertura de registros e anexos no ambiente real.
- Medição de largura/altura/posição via DOM e CSS computado.
- Testes responsivos em resoluções reais.
- Testes de impressão A4 retrato/paisagem e paginação.
- TypeScript, lint, testes, build, validação de rotas e CI.
- Deploy, merge ou alteração da `main`.

## 5. Próxima sequência segura
1. Obter acesso de leitura autorizado ao projeto Supabase e confirmar o modelo documental já aplicado e populado.
2. Definir a tabela/RPC canônica de documentos antes de qualquer migration.
3. Especificar contrato aditivo do Ishikawa compatível com dados 6M existentes, incluindo histórico e anexos vinculados a causa.
4. Implementar Controle de Documentos em uma rota única com sete abas e permissões reais.
5. Corrigir somente o destino do link documental do Paquímetro após a nova rota existir; não redesenhar a tela.
6. Executar testes reais de CRUD/RLS/Storage, browser/DOM, impressão e pipeline antes de solicitar aceite.
