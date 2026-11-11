# Histórico de itens concluídos — padronização ERP

- Data inicial: 2026-10-16
- Revisão: UI-DONE-R1

Nenhuma tela foi marcada como integralmente concluída por esta nova fila. Tokens compartilhados e ajustes anteriores em páginas específicas são evidência parcial, não comprovação de varredura completa ou padronização global.

## UI-002 — Cruzamento do roteador, imports e arquivos (2026-11-11)

- HEAD inspecionado: `4349381fb144ce9a12f0cde9f99606ea8e677ee4`; roteador `src/AppEntryV2.tsx` blob `bea2a9d279cf6ff10a56e559372cdd7e3856a532`; árvore Git `989234fbeca5bb8b97b0f8d55a45c3fb56f7955d`.
- Cruzamento estático: 341 declarações Route com path/element; 197 imports lazy/lazyPage; zero arquivos lazy ausentes; zero paths duplicados detectados.
- Um import lazy sem uso JSX/Route direto: `FichasProcesso`. Classificado como legado/compatibilidade a preservar: `src/pages/FichasProcesso.tsx` consta entre os arquivos obrigatórios do contrato `scripts/verify-approved-ui-lock.mjs`; nenhum arquivo protegido foi removido.
- Ficha de Montagem: `src/pages/FichaMontagem.tsx` existe; `AppEntryV2.tsx` registra o lazy import `FichaMontagemPage` e a rota `pcp/ficha-montagem`; `ERPHorizontalShell.tsx` aponta o menu para `/pageprincipal/pcp/ficha-montagem` e aplica `border-amber-400 bg-amber-50 font-extrabold text-amber-800 shadow-sm`.
- Evidência detalhada: [UI-002-ROUTE-CROSSCHECK-20261111.md](./UI-002-ROUTE-CROSSCHECK-20261111.md).
- CI no commit final de documentação `3957c1a4de444f4816bf6bd077fa457e0017e4af`: workflow `ERP Industrial CI`, run `43068889786`, conclusão `success`. Passaram instalação determinística, lockfile, Vercel config, CI policy, release lineage, reset/tenant, UI lock, migrations SQL, auth master, public naming, Supabase env/guard, deploy integrity, TypeScript, ESLint, auditorias global/brutal/interações, lazy imports, build, build output, routes, contratos do tablet/shell/logo, approved UI e security no-bypass.
- Limite: a validação é de roteamento/arquivos e CI; não equivale a inspeção visual de todas as páginas nem a testes E2E autenticados de todos os módulos.
- Commit de evidência inicial: `be11c1736210e297776b98e0e33f37e142f357cd`; sincronização do backlog: `3957c1a4de444f4816bf6bd077fa457e0017e4af`.

## UI-004 — Inventário de componentes compartilhados (2026-11-11)

- Relatório: [UI-004-COMPONENT-INVENTORY-20261111.md](./UI-004-COMPONENT-INVENTORY-20261111.md).
- Inventariados wrappers de formulário, campos compactos, selects, números/moeda, datas/horas, checkbox, lookup, combobox, botões, cards/KPI, tabs, dialog, accordion, menubar, grid/tabela e impressão.
- Achados: geometrias declaradas 28/30/32/36/40/44/54px conforme componente e contexto; CSS global altera alturas em `.erp-global-surface`; `maxLength` não é aplicado pelos wrappers; não há um único DataGrid, alert/toast ou datepicker compartilhado.
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
