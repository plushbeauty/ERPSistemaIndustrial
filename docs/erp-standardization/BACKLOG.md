# Backlog vivo — padronização de telas do ERP Industrial

- Data: 2026-10-16
- Revisão: UI-BACKLOG-R1
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
