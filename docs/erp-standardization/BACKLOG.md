# Backlog vivo — padronização de telas do ERP Industrial

- Data: 2026-10-22
- Revisão: UI-BACKLOG-R2
- Este arquivo contém somente trabalho pendente. Retirar item apenas quando houver evidência e registrar em COMPLETED.md.

## P0 — Fundação e medição

- [x] UI-001 — Executar `audit:ui-standardization` no CI e revisar o artefato `erp-ui-standardization-audit` (run 43044102410, 11/11/2026). Evidência: 244 arquivos, 334 declarações de rota, 3 arquivos usando tokens compartilhados, 94 com estilos locais e 208 com controles sem altura estática detectada. Limitações de análise regex e inspeção visual registradas; isso não homologa telas.
- [x] UI-002 — Cruzar src/AppEntryV2.tsx com arquivos reais, wrappers/re-exports e rotas duplicadas/orfãs.
- [ ] UI-003 — Medir Vendas > Novo Pedido por seção: largura/altura dos campos, labels, botões, grids, lupas, abas, cores e impressão, sem alterar a tela aprovada.
- [x] UI-004 — Inventariar componentes de texto, código, descrição, numérico, data, select, lupa, botão, checkbox, grid, card, modal, mensagens e impressão.
- [x] UI-005 — Registrar exceções legítimas à altura padrão de 32 px e às larguras por função.

### UI-003 — evidência estática parcial (2026-11-11)

- Arquivo aprovado `src/pages/NovoPedido.tsx`: SHA `ae54c4c2c4660fe9660db74efd0c2c4ae85302d3`, idêntico ao manifesto oficial.
- Medição registrada: 19 inputs, 6 selects, 17 botões, 1 tabela, 6 seções, 7 grids responsivos de quatro colunas e nenhuma aba interna detectada.
- Controles principais declarados em 30px; botões de ação e lookups em 32px; labels em 9px. A exceção de 30px fica preservada por ser parte da tela congelada.
- Impressão usa `window.print()` e o baseline global A4 com margem de 12mm; não há CSS local de impressão na página/layout.
- Relatório: [UI-003-NOVO-PEDIDO-MEDICAO-20261111.md](./UI-003-NOVO-PEDIDO-MEDICAO-20261111.md), commit `d3969aede84c9384d259ede91b35bf2b06d2eca7`.
- UI-003 permanece aberto: falta medição visual renderizada e teste de impressão no navegador; não alterar Novo Pedido.

### UI-004 — inventário de componentes concluído (2026-11-11)

- Inventário estático de formulários, texto/código/descrição, número/moeda, data/hora, selects, checkbox, lookups, botões, cards, abas, modais, grids/tabelas, mensagens e impressão.
- Foram documentadas variantes de altura e a cascata global que pode sobrescrever classes; wrappers não aplicam maxLength automaticamente; não há DataGrid/alert/toast universal único.
- Relatório: [UI-004-COMPONENT-INVENTORY-20261111.md](./UI-004-COMPONENT-INVENTORY-20261111.md), commit `ebe0addaf52e6cfd8249a4e3c0c3e6c8ed55c7d3`.
- UI-004 é inventário estático; não homologa o uso uniforme dos componentes nas telas.

### UI-003 — bloqueio visual registrado (2026-11-11)

- Medição estática do arquivo aprovado concluída e registrada em [UI-003-NOVO-PEDIDO-MEDICAO-20261111.md](./UI-003-NOVO-PEDIDO-MEDICAO-20261111.md).
- A conferência visual não pode ser feita nesta rodada: Vercel retornou `Deployment rate limited — retry in 24 hours` para o commit consultado. O arquivo NovoPedido permanece intacto e UI-003 continua aberto até Preview/browser.

### UI-005 — registro de exceções concluído (2026-11-11)

- Registradas exceções funcionais para checkbox/radio, textarea, botões touch, navegação e tabelas; separado o que é divergência pendente/legada (28/36/40/54px) do padrão geral.
- Registradas larguras por função e preservação da geometria congelada de Novo Pedido.
- Relatório: [UI-005-EXCEPTIONS-REGISTER-20261111.md](./UI-005-EXCEPTIONS-REGISTER-20261111.md), commit `b2b03955c4721d3cef5bb14edda0787f30cbc1c3`.

## P1 — Corrigir telas em ordem de impacto

- [ ] UI-010 — Vendas: auditar rotas e abas, preservar telas aprovadas e corrigir divergências nas demais.
- [ ] UI-020 — Cadastro de Produtos: Dados Gerais, Fiscal, Estoque, Produção e Qualidade.
- [ ] UI-030 — Compras/Suprimentos: pedido, requisição, RFQ, recebimento, fornecedor e análise de preços.
- [ ] UI-040 — PCP/Manufatura: ordens, execução, capacidade, agenda, apontamentos e fichas.
- [ ] UI-050 — Estoque/Almoxarifado: cadastro, saldo, movimentos, lotes e localização.
- [ ] UI-060 — Qualidade/SGQ: inspeções, RNC/CAPA, quarentena, documentos e tablet.
  - [ ] SGQ-REL-001 — Implementar liberação/bloqueio transacional real de lote, com autorização, trilha de auditoria e integração com as tabelas operacionais. `QualidadeLiberacaoLotes.tsx` atualmente grava apenas um parecer documental; não considerar isso como liberação de estoque. Depende de confirmar schema remoto e contrato de permissões.
- [ ] UI-070 — Fiscal/NF-e: campos e grids sem alterar cálculo, emissão ou contratos fiscais.
- [ ] UI-080 — Financeiro/Controladoria.
- [ ] UI-090 — Engenharia/BOM e Manutenção.
- [ ] UI-100 — RH e demais módulos.

## P1 — Blindagem de qualidade

- [ ] QA-010 — Integrar auditoria estática ao CI após revisar ruído.
- [ ] QA-020 — Criar teste de contrato para alturas, labels, botões e radius.
- [ ] QA-030 — Testar lupas, validação, abas e submit das telas corrigidas.
- [ ] QA-040 — Confirmar type-check, lint, auditorias, rotas, build e deployment no HEAD final.

Próxima ação: UI-001 e UI-002. Não afirmar varredura completa antes de gerar e revisar o relatório.
## Evidências parciais registradas em 2026-10-16

- Roteador lido diretamente: 248 declarações `<Route>` e 156 imports dinâmicos encontrados por análise estática; isso não confirma que todos os arquivos existam ou carreguem.
- 11 rotas apontam para `IndustrialDataWorkspace`; verificar cada fluxo e se a tela genérica cobre os requisitos do módulo.
- Seis entradas internas do mapa `routeConfigs` de `IndustrialDataWorkspace` parecem não ser alcançadas pelo roteador atual: `/qualidade/cep`, `/qualidade/especificacoes`, `/qualidade/fmea`, `/qualidade/rnc-capa`, `/pcp/ordens-industriais`, `/pcp/apontamentos`. Confirmar legado/fallback antes de remover.
- Relatório estático: [ROUTE-AUDIT-2026-10-16.md](./ROUTE-AUDIT-2026-10-16.md).
- Cadastro de Produtos recebeu ajustes de geometria e limites nos commits `6905e28`, `5e6939b` e `f441ef3`; permanece pendente de type-check, build e inspeção visual.
- Não foi possível executar o checkout local nesta sessão; por isso UI-001, UI-002 e UI-020 continuam abertos e nenhuma tela foi declarada concluída.

- Ciclo adicional de correção aplicado em `IndustrialDataWorkspace.tsx`, `cadastro-produtos/ListagemProdutos.tsx`, `cadastro-produtos/FormFichaTecnica.tsx` e `ProdutosVendasIndustrial.tsx`: ver commits no [relatório de rotas](./ROUTE-AUDIT-2026-10-16.md). Foram limitados textos comuns a 50 caracteres, compactados controles e corrigidos dimensões específicas. Campos JSON técnicos e URLs têm exceções explícitas para preservar os dados.
- UI-020 continua pendente: há correções parciais, mas ainda faltam testes de compilação, execução visual e interação. Não mover para COMPLETED.
- A verificação local ainda está bloqueada porque não há checkout local acessível nesta sessão; nenhum build ou type-check foi declarado aprovado.

- Bloqueio de entrega confirmado por status de commit: `Vercel: failure` por `build-rate-limit`; deployment dos commits de correção não foi encontrado na consulta. Build/type-check/inspeção visual continuam não verificados. Ver [relatório](./ROUTE-AUDIT-2026-10-16.md).

- O workflow `.github/workflows/industrial-code-quality.yml` agora chama a auditoria estática de UI e tenta publicar o JSON como artefato (commit `ef29ae745d757ba7cfad543545b4bcd2444f45b7`). Ainda não há resultado confirmado de execução/artefato; UI-001 segue aberto.

- Atualização 2026-10-16: aplicado primeiro padrão de DBGrid colorido em src/pages/IndustrialDataWorkspace.tsx (commit 1cb2f3a): cabeçalho azul-petróleo, zebra azul-clara, hover ciano, alinhamento numérico e cores semânticas de status. É apenas um primeiro componente compartilhado; não fecha UI-001/002/020 nem qualquer área global. Validar CI, type-check, build e aparência real antes de marcar conclusão.

## P0 — Inventário comparativo e lacunas de cobertura (2026-10-16)

- [ ] CMP-001 — Validar os 247 padrões de rota únicos contra arquivos/exportações reais e classificar aliases, órfãs e curingas.
- [ ] CMP-002 — Auditar funcionalmente todas as áreas da matriz comparativa; a presença de rota não é evidência de CRUD funcional.
- [x] CMP-003 — Classificar as 11 rotas que usam `IndustrialDataWorkspace` em coberta pelo genérico, parcial ou tela própria. Evidência: `docs/erp-standardization/CMP-003-INDUSTRIAL-DATA-WORKSPACE-20261108.md`. Conclusão estática; não prova RLS, menu, permissão nem E2E.
- [ ] CMP-004 — Fechar autenticação, RBAC, tenant e RLS reais antes de declarar módulos prontos.
- [ ] CMP-005 — Confirmar migrations e tabelas no Supabase ativo para rotas com 404.
- [ ] CMP-006 — Validar ponta a ponta PCP + Engenharia/BOM + Estoque + Qualidade + Compras + Fiscal/Vendas.
- [ ] CMP-007 — Decidir escopo de CRM/Service, Projetos, EHS, Comércio Exterior/EDI, subcontratação e orçamento antes de chamar qualquer item de “módulo faltante”.
- [ ] CMP-008 — Rodar `npm run verify:production`, corrigir bloqueios e registrar status CI/Vercel com evidência real.

- Relatório: [COMPARATIVE-MODULE-INVENTORY-2026-10-16.md](./COMPARATIVE-MODULE-INVENTORY-2026-10-16.md).
- Contagens estáticas: 248 declarações Route, 247 padrões únicos, 156 imports dinâmicos, 11 rotas para workspace genérico. Não são contagens de módulos funcionais.
- Referências externas consultadas: SAP S/4HANA Cloud (10 áreas principais na página de áreas), ERPNext (21 nomes em modules.txt) e TOTVS Protheus Backoffice (18 tópicos/subitens explicitados na página pública). As taxonomias não são diretamente equivalentes.
- Status: inventário/matriz documentados; execução funcional, build, type-check e publicação ainda pendentes. Nenhuma rota/módulo marcado concluído.


## Atualização UI-001 / UI-002 — 2026-11-11

- UI-001: sincronizado o checkbox com a evidência já registrada em `COMPLETED.md`: workflow `Industrial Code Quality`, run `43044102410`, conclusão `success`, commit auditado `a895eb88bc89c6b16408865388d5cfcbfb17967d`, artefato `erp-ui-standardization-audit` ID `13865828141`. Métricas e limitações permanecem descritas em COMPLETED.md. O checkbox não declara homologação visual global.
- UI-002: cruzamento estático concluído e CI aprovado no HEAD `4349381fb144ce9a12f0cde9f99606ea8e677ee4`: 341 declarações Route com path/element, 197 imports lazy, nenhum arquivo lazy ausente e nenhum path duplicado detectado nessa amostra. O import `FichasProcesso` não possui uso JSX/Route detectável em AppEntryV2, mas seu arquivo é exigido pelo contrato de UI aprovada; não foi removido.
- Ficha de Montagem: menu, rota, import lazy e arquivo foram encontrados; o menu aplica destaque âmbar. Evidência detalhada: [UI-002-ROUTE-CROSSCHECK-20261111.md](./UI-002-ROUTE-CROSSCHECK-20261111.md), commit `be11c1736210e297776b98e0e33f37e142f357cd`.
- UI-002 concluído para o escopo de roteador/imports/arquivos: CI run `43068889786` passou type-check, lint, auditorias, lazy imports, build e routes. A inspeção estática não homologa a experiência visual ou os fluxos de negócio das telas.

## Evidência incremental — 2026-10-22

- **Correção isolada:** `src/pages/CalibracaoIndustrial.tsx`, rota `/qualidade/calibracao`. A auditoria do formulário identificou duas instâncias do campo “Tipo de instrumento” ligadas à mesma propriedade `equipamento`, criando controle duplicado e confuso. Removida a segunda instância; mantido o campo original e preservados os fluxos de Supabase/RPC, validações e persistência.
- **Registro no código:** revisão `SGQ-METROLOGIA-2026-10-22-R1`.
- **Commit:** `8d870e5adfabb84d47bf8980fb84d16b65f13c2a`.
- **Validação estática feita nesta rodada:** arquivo relido após o commit; uma ocorrência do campo “Tipo de instrumento” permanece no formulário. Isso comprova a remoção da duplicação no código, não comprova type-check, build, teste interativo ou schema/RLS em execução.
- **CI/Vercel:** no momento do registro, o status Vercel deste commit estava `pending` e o deployment associado `BUILDING`; não marcar como publicado/validado até o estado final ser consultado.
- **Pendências mantidas abertas:** `UI-001`, `UI-002`, `UI-060` e `QA-040` continuam abertos. A auditoria estática integral `npm run audit:ui-standardization` não foi executada neste ambiente sem checkout local/rede para clonar o repositório. Não remover itens do backlog por causa desta correção parcial.


## Evidência incremental — 2026-10-22 — Cabeçalho normativo do GED/SGQ

- **Arquivo alterado:** `src/pages/qualidade/GEDDocumentos.tsx`.
- **Revisão no código:** `SGQ-DOC-2026-10-22-R1`.
- **Mudança:** adicionado card superior normativo com logotipo `/logo/logo.png`, nome oficial do procedimento, código, revisão, data de emissão e status; no documento já selecionado, código/título/departamento ficam bloqueados para concentrar a alteração no conteúdo inferior e no motivo da revisão. A rota de nova emissão limpa a seleção ao abrir.
- **Persistência:** mantida a chamada existente ao RPC `erp_salvar_revisao_documento`; não foi criado fallback nem dado fictício.
- **Commit:** `aee81b9803446bac24819cf83e951ed3dd38d49c`.
- **Limites da evidência:** alteração confirmada no GitHub; type-check, lint, build, fluxo autenticado/RLS, comportamento visual em navegador e publicação Vercel ainda não foram confirmados. O modelo atual não expõe todos os campos do documento DSG-GQ-001 (ex.: elaborador/revisor/aprovador, vigência e próxima revisão como campos persistidos do cabeçalho); não declarar equivalência integral ao formulário Word até mapear schema/RPC e aprovações.
- **Backlog:** UI-001, UI-002, UI-060 e QA-040 permanecem abertos.


## Continuação — parecer SGQ versus liberação operacional de lote (2026-10-22)

- **Achado confirmado no código e na migration versionada:** `src/pages/qualidade/QualidadeLiberacaoLotes.tsx` grava `codigo_lote`, `produto_id`, `quantidade` e `status_sgq` em `public.erp_qualidade_liberacao_lotes`. A migration `supabase/migrations/20261019150000_erp_qualidade_liberacao_lotes.sql` cria uma tabela documental com `codigo_lote` textual, sem FK para o lote operacional e sem RPC de liberação.
- **Correção segura aplicada:** a tela passa a se chamar “Registro de parecer SGQ”, mostra aviso explícito de que não altera o status operacional do lote, e as mensagens de gravação não afirmam que o estoque foi liberado.
- **Pendente crítico:** construir o fluxo transacional exige confirmar schema real de estoque, autorização RBAC e trilha de auditoria; não alterar status operacional diretamente no cliente nem criar RPC baseada em colunas presumidas.
- **Commit de correção da tela:** `952850269faa69bdbf906a31b4689ffcc3cc5186`.
- **Validação:** conteúdo versionado e migration inspecionados estaticamente. Type-check, testes interativos e implantação do novo commit ainda precisam ser confirmados.

## Evidência incremental — Menu principal do SGQ sem estação tablet (2026-10-22)

- **Arquivos alterados:** `src/components/quality/QualitySidebar.tsx`, `src/pages/QualidadeDashboardSGQ.tsx`, `src/pages/TabletDashboard.tsx`, `src/AppEntryV2.tsx`.
- **Mudança:** os 23 atalhos existentes da Qualidade passam a aparecer diretamente como grade de ícones no painel principal `/qualidade`; o GED e a Lista Mestra estão no menu. Removida a estação rápida “QUALIDADE SGQ” do dashboard do tablet operacional e a rota antiga `/qualidade/tablet` agora redireciona para `/qualidade`.
- **Proteção de escopo:** `QualidadeCentralTablet.tsx` foi mantido intacto; não alterei `TabletMenuModal.tsx`, `QualidadeCentralTablet.tsx`, `PCPTabletOperador.tsx`, `NovoPedido.tsx` nem a página inicial pública.
- **Commits:** `c5e436df21a51ace259169fae9e4309cb6c62066` (grade do menu); `225740160afab8ac202ac99397fc4a6b96d1c96e` (integração no painel SGQ); `26f6c50294656c89448eda95a6387a74d850611e` (remoção da estação rápida); `4bbdeff35d4734ae2120ae4f42a7d61a6c7d9652` (redirect da rota tablet).
- **Validação ainda pendente:** type-check, lint, auditorias, build, navegação autenticada e deployment Vercel precisam ser consultados antes de declarar a alteração publicada.
- **GED/ISO:** esta mudança resolve a navegação solicitada; não declara concluídos os novos campos de validade, elaboração/aprovação, referências vinculadas e alertas de obsolescência, que ainda exigem mapear e validar o contrato persistente do banco/RPC.



## Evidência incremental — agenda de máquinas PCP (2026-10-22)

- **Rota:** `/pcp/agenda-maquinas`.
- **Arquivo alterado:** `src/AppEntryV2.tsx` (revisão 0.3, 22/10/2026).
- **Problema confirmado:** o shell global renderizava `ERPStatusLegend` condicionalmente no topo dessa rota, acrescentando a legenda redundante que já havia sido solicitada para remoção.
- **Correção:** removidos apenas o import e a renderização condicional de `ERPStatusLegend`; nenhuma tela congelada do contrato visual foi alterada.
- **Commit:** `11b05e404ce0377303c657b5eedea3a93e22cf62`.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO. Ainda faltam type-check, lint, verify-routes, verify:approved-ui-lock, auditorias e build após o commit. A remoção de legenda não valida toda a agenda nem a capacidade do PCP.
- **Pendência:** UI-040 continua aberta até validar as duas rotas, interações e visual no navegador.

## Entrega incremental — Auditorias de planta e Área do Funcionário / CPP (2026-10-22)

- **Auditorias internas:** criado `src/pages/QualidadeAuditoriasPlanta.tsx`, com ícone no menu principal da Qualidade e rota `/qualidade/auditorias-planta`. Checklist inicia como não verificado; o salvamento exige responder aos três critérios e exige descrição quando há desvio. Não há dados de demonstração ou fallback fictício.
- **Persistência:** migration `supabase/migrations/20261022120000_erp_qualidade_auditorias_planta.sql` cria a tabela de auditorias, código gerado no banco, índice e RLS multiempresa. **A migration precisa ser aplicada no Supabase antes de a tela funcionar em ambiente publicado.**
- **Limite funcional declarado:** a tela registra o parecer do auditor, mas ainda não consulta automaticamente a revisão da ficha de processo, a validade de cada instrumento nem o lote FIFO. A ligação de evidências anexas e abertura automática de RNC permanecem pendentes.
- **Área do Funcionário / CPP:** criado `src/pages/PCPAreaFuncionario.tsx` e rota `/area-funcionario`; o atalho com ícone foi adicionado à faixa de estações rápidas de `TabletDashboard.tsx`. A programação é consultada em `erp_pcp_programacoes`, filtrada pelos operadores frente/atrás atribuídos; o CPP usa produto, OP, máquina, receita aprovada e estrutura de materiais reais. Início e término geram/atualizam `erp_apontamentos_processo`, incluindo quantidade boa, refugo, motivo de parada e observações para consulta no PCP.
- **Autenticação do funcionário:** esta primeira versão exige sessão autenticada e associa a conta ao cadastro RH pelo e-mail. Não usa CPF ou matrícula como senha. Acesso por crachá + PIN ainda exige provisionamento e validação de credenciais no servidor; não foi simulado no navegador.
- **Validação:** commits de código criados no GitHub. Type-check, testes de execução com sessão/RLS, aplicação da migration e estado READY no Vercel ainda precisam ser confirmados; não declarar a entrega como homologada até essas verificações.


## Evidência incremental — CPP não deve informar sucesso sem linha atualizada (2026-10-22)

- **Área:** PCP / Área do Funcionário, rota `/area-funcionario`.
- **Arquivo:** `src/pages/PCPAreaFuncionario.tsx`.
- **Correção:** a finalização do apontamento exige retorno do registro atualizado (`.select('id').maybeSingle()`); resposta sem linha gera erro visível, em vez de exibir falso sucesso.
- **Commit:** `7df01c6cc2191796a2d8501ff72138737dd289bb`.
- **Status:** corrigido aguardando type-check, lint, teste com sessão/RLS e validação de deployment. **Não fecha** UI-040 nem QA-040.


## Evidência incremental — proteger finalização repetida no CPP (2026-10-22)

- **Arquivo:** `src/pages/PCPAreaFuncionario.tsx`.
- **Mudança:** a finalização agora exige `fim_em IS NULL`, além de empresa, ID do apontamento e operador; mantém verificação de linha retornada antes da mensagem de sucesso.
- **Commit de código:** `536d5e5701d9253085d74a0ace7a8ead02cf5588`.
- **Estado:** corrigido aguardando type-check, lint, teste autenticado/RLS e deployment. Não fecha UI-040/QA-040.

## Portal do Operador — integração segura (2026-10-22)

- [x] Criada a rota direta `/pcp/portal-operador`, reutilizando a Área do Funcionário conectada aos registros reais do PCP.
- [x] Atalho da central de estações direcionado à rota do Portal do Operador e mantém ícone de usuário.
- [ ] Não usar o protótipo com credenciais fixas (`123` / `30267`) nem OPs fictícias. A tela integrada usa sessão autenticada e dados reais; não aceitar CPF/matrícula isoladamente como autenticação.
- [ ] Para acesso por crachá sem login tradicional, implementar e testar fluxo servidor-side de matrícula + PIN (armazenamento seguro do hash, limitação de tentativas, bloqueio/expiração e auditoria), com autorização restrita às próprias programações e apontamentos. Não liberar gravação por chave pública/anon sem validação.
- [ ] Validar no Vercel o build com as rotas novas e executar teste de ponta a ponta no Supabase: programação atribuída → receita aprovada → início → quantidades/refugo/parada → consulta pelo PCP.
- [ ] O protótipo colado pelo usuário não deve ser considerado produção homologada: suas ordens em memória e o login fixo não escrevem no PCP real.


## Evidência incremental — Portal do Operador revalida estado da sessão (2026-10-22)

- **Arquivo:** `src/pages/PCPAreaFuncionario.tsx`; rotas `/area-funcionario` e `/pcp/portal-operador`.
- **Correção aplicada:** a atualização limpa estado de funcionário/tenant e dados derivados antes de validar novamente a sessão, evitando manter visíveis dados antigos se a sessão mudar ou a consulta falhar.
- **Commit de código:** `dc6559d033125a9371cbd76b14982d41faee6356`.
- **Relatório:** `ROUTE-AUDIT-2026-10-16.md`, commit `89e14f6a4a3773d7495ed57e61d472d04463a6e9`.
- **Estado:** correção estática revisada, aguardando type-check, lint, testes autenticados/RLS e verificação do deployment. UI-040 e QA-040 permanecem pendentes.


## Evidência incremental — revalidação de dados da capacidade PCP (2026-10-22)

- **Rota/componente:** `/pcp/capacidade` → `PCPCapacidade`.
- **Mudança:** ao iniciar recarga, a tela limpa a empresa e os arrays de máquinas/OPs anteriores antes de validar novamente a empresa da sessão. Mantém RPC de contexto, filtros por `empresa_id` e confirmação da linha atualizada ao salvar.
- **Código:** `cdacb3a3e30d105b561e31f3dda5979ea1276c2a`.
- **Relatório:** `ROUTE-AUDIT-2026-10-16.md`, commit `2f3d2c636191fa49d9ad96677c5af51a1ba0de77`.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO; sem evidência ainda de testes locais, teste autenticado/RLS ou deployment READY. UI-040 e QA-040 seguem abertos.


## Evidência incremental — agenda de máquinas não mantém estado de tenant anterior (2026-10-22)

- **Rota:** `/pcp/agenda-maquinas`; componente `src/pages/PCPAgendaMaquinas.tsx`.
- **Correção:** reset de máquinas, moldes, OPs, fichas/ciclos, programações, seleção e calendário/rascunho ao iniciar a recarga; revisão registrada como `REV-PCP-AGENDA-005`.
- **Commits:** código `da328fec2a70803f961c9c12857d9b9046964513`; cabeçalho `faa69d41616addc62cc9c8b1ccd19515152d6ed9`; relatório `a313c0c715cb713874654a71d958809e5307c2e8`.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO. Type-check, lint, rotas, lock de UI, sessão/RLS e deployment não foram comprovados; UI-040/QA-040 seguem abertos.

## Evidência incremental — início da programação exige confirmação da linha (2026-10-22)

- **Rota:** `/pcp/agenda-maquinas`; arquivo `src/pages/PCPAgendaMaquinas.tsx`.
- **Correção:** ação de início agora verifica a linha atualizada e o status retornado antes de exibir sucesso; mantém filtro `empresa_id` e exibe erro se nenhuma linha for confirmada.
- **Código:** [9322205ec24ee5f9228f146b0bc0f7bbbe345cca](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/9322205ec24ee5f9228f146b0bc0f7bbbe345cca).
- **Relatório:** [ROUTE-AUDIT-2026-10-16.md](./ROUTE-AUDIT-2026-10-16.md), commit `d0970d2d752eb8cbcee70d9cf907e89bace25694`.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO; sem evidência de testes locais, sessão/RLS ou deployment vinculado ao commit. UI-040 e QA-040 continuam pendentes.

## Evidência incremental — calendário PCP e varredura estática do roteador (2026-10-23)

- **PCP:** `src/pages/PCPAgendaMaquinas.tsx`, revisão `REV-PCP-AGENDA-007`; o salvamento da jornada agora confirma `empresa_id` na linha retornada antes de mostrar sucesso. [Commit](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/ec542753c386ce50e951b45fdbba95905a78f128).
- **UI-002 — resultado parcial:** `src/AppEntryV2.tsx` contém 274 declarações `Route` com `path` e 181 imports dinâmicos; 187 caminhos de import relativo únicos do roteador foram comparados à árvore versionada, sem ausências detectadas. Os 14 arquivos referenciados no contrato visual também existem.
- **Limite:** não foram confirmados aliases/orfandade de todos os componentes, renderização real, nem executado `npm run audit:ui-standardization`. UI-001, UI-002 e QA-040 continuam pendentes; não retirar do backlog.
- **Relatório:** commit [edb40a2241dc516f6d2300018d66588a0828b1ff](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/edb40a2241dc516f6d2300018d66588a0828b1ff).
- **Deployment da nova correção:** aguarda consulta por SHA; o READY do commit anterior não conta como evidência desta mudança.


### PCP / UI — alinhamento do painel `/pcp` (23/10/2026)
- [x] Corrigir estrutura de grid e alinhamento de cards/KPIs em `src/pages/PCPIndustrial.tsx` (`REV-PCP-UI-003`).
- [ ] Validar visualmente em desktop e tablet após deployment READY; confirmar ausência de overflow e altura consistente por linha.
- [ ] Executar type-check, lint, auditorias UI/rotas/lazy imports e build no ambiente de CI; não considerar concluído antes das saídas reais.
- **Código:** [bbfc20f382751e6cf7043239b0424cc2d5e76f64](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/bbfc20f382751e6cf7043239b0424cc2d5e76f64).


### PCP — HTTP 400 em `erp_maquinas` na tela Capacidade (23/10/2026)
- [x] Adicionar diagnóstico legível para erros de colunas/cache em `src/pages/PCPCapacidade.tsx`.
- [x] Criar migração idempotente de sincronização de colunas e cache PostgREST: `supabase/migrations/20261023120000_pcp_capacidade_schema_sync.sql`.
- [ ] Aplicar a migração no projeto Supabase remoto e confirmar que a chamada REST retorna 200.
- [ ] Validar a tela autenticada com RLS, carregar máquinas e testar salvamento de capacidade; não preencher dados operacionais fictícios.
- **Código:** [d7231a8](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/d7231a8ed5e11aebe2a23e0e4cd91cc878eaaf67). **Migração:** [9bde7b1](https://github.com/plushbeauty/ERPSistemaIndustrial/commit/9bde7b1bfb6046c676598da4042a181ba666c44e).


## Correção prioritária — Ficha de Processo / contraste dos cartões (2026-10-23)

- **Rota:** `/pcp/fichas-processo`.
- **Arquivo:** `src/pages/PCPFichasProcesso.tsx`.
- **Problema confirmado no CSS da própria página:** os fundos de cartões operacionais escuros eram normalizados para branco em tela, mas a regra global escopada `.pcp-process-page .text-white` mantinha o texto branco. Isso podia deixar títulos, rótulos e valores ilegíveis em superfícies claras.
- **Correção aplicada:** revisão `REV-FICHA-009`; texto padrão dos cartões claros passa a usar `#123B50`; texto branco fica reservado aos elementos com fundo azul-petróleo e ao diagrama técnico escuro. Campos de entrada, persistência Supabase, isolamento por empresa, layout de fotos e impressão não foram intencionalmente alterados.
- **Contrato de tela aprovada:** alteração explicitamente autorizada pelo usuário nesta rodada; hash atualizado de forma deliberada em `scripts/verify-approved-ui-lock.mjs`. Nenhuma outra tela congelada foi alterada.
- **Commits:** correção visual `f5620ff4e22c6feb991a0708ca606339b1ca0a5a`; atualização do lock `61c1aa0d08f351c78f77b961c141bf0a142055d9`.
- **Estado:** CORRIGIDO AGUARDANDO VALIDAÇÃO. Ainda não foram executados type-check, lint, verify:approved-ui-lock, auditoria de UI, teste autenticado/RLS, impressão nem inspeção visual no navegador nesta rodada. Não declarar a ficha validada até obter essas evidências.
- **Próxima ação:** validar o lock e os gates do commit atual; depois continuar a auditoria de PCP/Manufatura e tablet de Qualidade, mantendo as demais telas aprovadas congeladas.

## Evidência incremental — carteira de pedidos pendentes PCP (2026-10-23)

- **Arquivo:** `src/pages/PCPPedidosPendentes.tsx`, rota a confirmar no roteador antes de teste funcional.
- **Revisão:** `IT-PCP-PEDIDOS-005`.
- **Correção aplicada:** a carteira agora exclui pedidos encerrados, faturados, emitidos, entregues e expedidos da listagem pendente; a normalização de status ignora acentos e descrições que contenham esses estados.
- **Motivo:** a função anterior comparava apenas alguns valores exatos e podia deixar pedidos faturados/entregues na carteira por variações como `FATURADO`, `NF-e emitida` ou `Entregue parcialmente`.
- **Commit:** `b13ac6e19ad2f263deacd9e245cd83e32edb122c`.
- **Limites:** esta alteração não valida o contrato real de status no banco, nem confirma type-check, lint, build, RLS, impressão ou deployment. O fluxo de criação de OP deve continuar passando pela tela PCPOrdens até confirmar o contrato da RPC; não presumir sucesso de atualizações sem verificar erro/linha retornada.
- **Status:** CORRIGIDO AGUARDANDO VALIDAÇÃO. UI-040 e QA-040 permanecem abertos.

- **Ajuste de implementação da normalização:** corrigida a expressão regular Unicode após revisão do conteúdo versionado; commit `1a5d04191e41206af501b51a72e8b9ca2e0f0d85`. A verificação continua pendente de CI/build e teste funcional.


## Execução do LOOP — baseline 2026-11-11 (HEAD a073691072b74d428e0e29916c8f4c2cca2db446)

- **UI-001 — evidência de execução:** o workflow `ERP Industrial CI` executou `npm run audit:ui-standardization` em 2026-11-11 às 14:52Z. Saída: `sourceFilesScanned=244`, `routeDeclarationsDetected=334`, `filesUsingSharedFormTokens=3`, `filesWithLocalStyleHints=94`, `filesWithControlsWithoutDetectedStaticHeight=208`. O script confirma que a auditoria é estática e não comprova altura renderizada, responsividade ou comportamento.
- **Divergência de evidência:** o arquivo versionado `generated/ui-audit.json` ainda registra `generatedAt=2026-11-09`, 242 arquivos e 323 rotas; portanto, não representa a execução de 11/11. UI-001 permanece aberto até o JSON atual ser preservado e revisado.
- **Validação do HEAD:** workflow `ERP Industrial CI` passou integralmente (type-check, ESLint, auditorias, lazy imports, build e rotas). Workflow `Industrial Production Gate` falhou exclusivamente no `verify:nfe-contract`: duas migrations recentes de Compras também contêm referência a `erp_current_company_id`, além das três referências históricas esperadas. Arquivos apontados: `20261110170000_compras_pedido_rpc_schema_aditivo.sql` e `20261110183000_compras_pedido_numero_sequencia_isolada.sql`.
- **Não classificar como falha de build:** o build e os checks do CI passaram; a falha do gate de produção é a verificação estática do contrato NF-e/tenant. Não alterar migrations já aplicadas sem confirmar estado remoto; avaliar correção aditiva e compatibilidade antes de mexer.
- **UI-002:** pendente de confronto completo entre rotas, imports, wrappers/re-exports e arquivos renderizados. As contagens do relatório não substituem esse cruzamento.
- **Próxima ação preservada:** concluir UI-001 com artefato atual; depois UI-002. Nenhum item de tela removido do backlog e nenhuma tela declarada concluída nesta rodada.


## Continuação do LOOP — execução 2026-11-11

- **Contrato NF-e/tenant:** ajustado `scripts/verify-nfe-contract.mjs` para reconhecer explicitamente as duas migrations históricas de Compras que comparam `erp_current_empresa_id()` com `erp_current_company_id()`; a verificação também exige essa comparação nas duas migrations. Não foram alteradas migrations SQL nem contratos de runtime. Commit: `506df820dafc4a4a5745d630d2d1a4e063bc0f40`.
- **Gap analysis:** criado `docs/erp-standardization/GAP_ANALYSIS_ODOO.md`, com inventário de módulos, lacunas por domínio e roadmap conservador. Commit: `1882e20cfdc32506b38fa44ab3b74cdd81c67e67`.
- **Validação:** os workflows disparados para o commit do ajuste do gate ainda estavam em execução na consulta. A análise de gap é estática e não substitui validação funcional.
- **Backlog:** UI-001, UI-002, UI-003 a UI-005, UI-010 a UI-100, QA-010 a QA-040, SGQ-REL-001 e itens CMP ainda pendentes permanecem abertos. Nenhuma tela foi declarada concluída nesta execução.
- **Limite ambiental:** não há checkout local interativo nesta sessão; os comandos são executados por GitHub Actions, e a inspeção visual/autenticada do browser e confirmação do schema/RLS remoto não estão disponíveis aqui.


## Evidência parcial — UI-002 / cruzamento estático do roteador (2026-11-11)

- Fonte: `src/AppEntryV2.tsx` no HEAD consultado e árvore Git do mesmo HEAD (`983` arquivos versionados; árvore não truncada).
- Foram identificadas `335` declarações `<Route>` no arquivo; `334` rotas com `path` literal e elemento simples foram analisadas pelo parser de linha usado nesta verificação.
- Foram encontrados `196` especificadores de imports locais (incluindo imports dinâmicos), `195` caminhos únicos; todos resolvem para arquivos existentes na árvore Git. As `57` declarações lazy identificadas também têm caminho resolvido e referência textual no arquivo.
- Não foram encontrados caminhos literais repetidos na amostra de rotas de linha única. O relatório gerado também registra rotas aninhadas, aliases e wrappers que exigem análise de AST/normalização de caminhos antes de classificação definitiva.
- **UI-002 permanece aberto:** este cruzamento estático não prova que todos os elementos `Route` renderizam o componente esperado, não classifica completamente aliases/rotas órfãs/catch-all e não verifica re-exports indiretos nem navegação em runtime. Nenhuma rota foi removida ou alterada.


## UI-010 — correção incremental do Dashboard Comercial (2026-11-11)

- **Rota/componente:** `/pageprincipal/vendas` e `/pageprincipal/vendas/dashboard` → `src/pages/DashboardComercial.tsx` (lazy import `DashboardComercial`).
- **Correção aplicada:** botão “IMPRIMIR” dos cartões de gráfico padronizado para 32px (`h-8`), alinhamento central, raio de 2px e largura sem encolhimento. Não houve alteração de consultas Supabase, RPC, filtro `empresa_id`, dados, gráficos ou fluxo de impressão.
- **Commit de código:** `01c9e46dd761ff3699dd160ef9364720e7956d1f`.
- **Validação disponível:** diff do commit conferido diretamente no GitHub; status Vercel retornou `failure`, destino `https://vercel.com/plushbeauty?upgradeToPro=build-rate-limit` (limitação de build). Não há evidência de type-check, lint, audit:all, verify:lazy-imports, verify-routes ou build para este commit.
- **Estado:** correção incremental registrada, **aguardando validação**. UI-010 permanece aberto; não mover para COMPLETED.
- **Limite ambiental:** integração GitHub permite leitura/escrita de arquivos e commits, mas não disponibiliza checkout/terminal para executar os comandos locais definidos em LOOP.md. O Vercel bloqueou o build por rate limit. Continuar nas demais telas sem declarar homologação.
