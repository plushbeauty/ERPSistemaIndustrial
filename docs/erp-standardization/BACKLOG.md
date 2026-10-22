# Backlog vivo — padronização de telas do ERP Industrial

- Data: 2026-10-22
- Revisão: UI-BACKLOG-R2
- Este arquivo contém somente trabalho pendente. Retirar item apenas quando houver evidência e registrar em COMPLETED.md.

## P0 — Fundação e medição

- [ ] UI-001 — Executar npm run audit:ui-standardization e revisar o relatório gerado.
- [ ] UI-002 — Cruzar src/AppEntryV2.tsx com arquivos reais, wrappers/re-exports e rotas duplicadas/orfãs.
- [ ] UI-003 — Medir Vendas > Novo Pedido por seção: largura/altura dos campos, labels, botões, grids, lupas, abas, cores e impressão, sem alterar a tela aprovada.
- [ ] UI-004 — Inventariar componentes de texto, código, descrição, numérico, data, select, lupa, botão, checkbox, grid, card, modal, mensagens e impressão.
- [ ] UI-005 — Registrar exceções legítimas à altura padrão de 32 px e às larguras por função.

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
- [ ] CMP-003 — Validar as 11 rotas que usam `IndustrialDataWorkspace` com requisitos e contratos de dados próprios.
- [ ] CMP-004 — Fechar autenticação, RBAC, tenant e RLS reais antes de declarar módulos prontos.
- [ ] CMP-005 — Confirmar migrations e tabelas no Supabase ativo para rotas com 404.
- [ ] CMP-006 — Validar ponta a ponta PCP + Engenharia/BOM + Estoque + Qualidade + Compras + Fiscal/Vendas.
- [ ] CMP-007 — Decidir escopo de CRM/Service, Projetos, EHS, Comércio Exterior/EDI, subcontratação e orçamento antes de chamar qualquer item de “módulo faltante”.
- [ ] CMP-008 — Rodar `npm run verify:production`, corrigir bloqueios e registrar status CI/Vercel com evidência real.

- Relatório: [COMPARATIVE-MODULE-INVENTORY-2026-10-16.md](./COMPARATIVE-MODULE-INVENTORY-2026-10-16.md).
- Contagens estáticas: 248 declarações Route, 247 padrões únicos, 156 imports dinâmicos, 11 rotas para workspace genérico. Não são contagens de módulos funcionais.
- Referências externas consultadas: SAP S/4HANA Cloud (10 áreas principais na página de áreas), ERPNext (21 nomes em modules.txt) e TOTVS Protheus Backoffice (18 tópicos/subitens explicitados na página pública). As taxonomias não são diretamente equivalentes.
- Status: inventário/matriz documentados; execução funcional, build, type-check e publicação ainda pendentes. Nenhuma rota/módulo marcado concluído.


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
