# Histórico de itens concluídos — padronização ERP

- Data inicial: 2026-10-16
- Revisão: UI-DONE-R1

Nenhuma tela foi marcada como integralmente concluída por esta nova fila. Tokens compartilhados e ajustes anteriores em páginas específicas são evidência parcial, não comprovação de varredura completa ou padronização global.


UI-002 permanece no BACKLOG como evidência parcial; o relatório estático não foi contabilizado como concluído.

## UI-004 — Inventário de componentes compartilhados (2026-11-11)

- Relatório: [UI-004-COMPONENT-INVENTORY-20261111.md](./UI-004-COMPONENT-INVENTORY-20261111.md).
- Inventariados wrappers de formulário, campos compactos, selects, números/moeda, datas/horas, checkbox, lookup, combobox, botões, cards/KPI, tabs, dialog, accordion, menubar, grid/tabela e impressão.
- Achados: geometrias declaradas 28/30/32/36/40/44/54px conforme componente e contexto; `erp-compact-global.css` contém seletores de override, mas sua importação efetiva não foi confirmada; `form-system-2026.css` é importada em `main.tsx`; `maxLength` não é aplicado pelos wrappers; não há um único DataGrid, alert/toast ou datepicker compartilhado.
- Commits: relatório `ebe0addaf52e6cfd8249a4e3c0c3e6c8ed55c7d3`; backlog `83ccaae8afd1f05a573e700bb73c9885e27543d3`.
- Status: inventário estático concluído; sem alteração de telas ou regras de negócio.

## UI-005 — Registro de exceções geométricas e larguras funcionais (2026-11-11)

- Relatório: [UI-005-EXCEPTIONS-REGISTER-20261111.md](./UI-005-EXCEPTIONS-REGISTER-20261111.md).
- Registradas exceções legítimas (checkbox/radio 16px, textarea multilinha, alvos de toque 40/44px, navegação e tabelas), exceção congelada de Novo Pedido e divergências pendentes/legadas (28/36/40/54px).
- Larguras funcionais documentadas para código, descrição, quantidade, data, valor, identificador, lookup e grades responsivas.
- Bloqueio visual: Vercel rate limit de 24h; não há medição renderizada nesta rodada.
- Commits: relatório `b2b03955c4721d3cef5bb14edda0787f30cbc1c3`; backlog `74425551a70f21a4194eaac9eed87523262453bf`.
- Status: registro de exceções concluído; UI-003 continua pendente de conferência visual.

## Formato por item concluído

- ID e módulo/rota;
- arquivo(s) realmente renderizado(s);
- resumo da correção e exceções justificadas;
- checks executados e resultados exatos;
- evidência visual/funcional;
- commit GitHub;
- bloqueios remanescentes.

## UI-001 — Auditoria estática de padronização (2026-11-11)

- Workflow: `ERP Industrial CI`, run `43044102410`, commit `a895eb88bc89c6b16408865388d5cfcbfb17967d` — concluído com sucesso.
- Etapas confirmadas: instalação determinística; auditoria estática; hash lock das telas aprovadas; type-check; lint; auditorias global, brutal e de interações; build; verificação do build; rotas; publicação do artefato.
- Artefato: `erp-ui-standardization-audit` (ID `13865828141`), gerado em 2026-11-11 15:01 UTC e inspecionado.
- Métricas: 244 arquivos analisados; 334 declarações de rota; 3 arquivos importam tokens compartilhados; 94 apresentam estilos locais; 208 possuem controles sem altura estática detectada.
- Limites: a análise é estática por regex; não comprova altura renderizada, responsividade, alinhamento, comportamento de negócio ou correspondência rota-componente. Essas verificações permanecem no backlog.
