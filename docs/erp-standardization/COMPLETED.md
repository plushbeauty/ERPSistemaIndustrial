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
