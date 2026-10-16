# ERPSis — Auditoria contínua de arquitetura e telas

- **Data:** 2026-10-16
- **Revisão:** AUDIT-2026-10-16-R1
- **Repositório:** `plushbeauty/ERPSistemaIndustrial`
- **Branch inspecionada:** `main`
- **Referência arquitetural:** [Carbon ERP — arquitetura](https://docs.carbon.ms/docs/building/architecture) e [crbnos/carbon](https://github.com/crbnos/carbon)
- **Status desta rodada:** inventário parcial concluído; integração e validação de build pendentes.

## Evidências coletadas

1. A listagem GitHub de `src/pages` contém **158 arquivos de nível superior** e **7 diretórios de módulos** (`cadastro-produtos`, `configuracoes`, `estoque`, `financeiro`, `manutencao`, `pcp`, `qualidade`).
2. Foram encontrados 13 arquivos de menos de 150 bytes. A inspeção do conteúdo confirmou que são wrappers/re-exports de telas existentes, não prova isolada de funcionalidade ausente. Precisam ser mapeados às rotas antes de qualquer remoção.
3. `src/AppEntryV2.tsx` usa carregamento sob demanda por `lazyPage`/React.lazy e contém recuperação de chunk antigo; `src/AppBootstrap.tsx` possui boundary de inicialização e gate de acesso.
4. `package.json` define verificações para TypeScript, lint, rotas, imports lazy, segurança Supabase, contrato fiscal, tablet de qualidade e integridade do build. A existência desses scripts não equivale a uma execução aprovada.
5. A tela `src/pages/PedidoCompra.tsx` já possui operações Supabase, paginação, seleção de fornecedor/produto, salvamento por RPC, aprovação, edição restrita por status e impressão. Ela usa CSS local extenso com regras compactas sobrepostas; precisa ser comparada visualmente antes de substituir qualquer fluxo.
6. Existe também `src/pages/ComprasPedidoCompra.tsx`, com outro fluxo de pedido. É necessário confirmar o mapeamento de rotas e decidir se os dois fluxos são intencionais antes de unificá-los.
7. `src/components/compras/PedidoCompraForm.tsx` foi criado e agora importa as classes de `src/components/industrial/forms/industrialFormStyles.ts`. **O componente ainda não foi conectado à tela operacional nem teve type-check/build executado nesta rodada.**
8. `scripts/quality_audit_backlog.json` contém 13 erros históricos datados de 07/10/2026, inclusive erros de TypeScript antigos. Não devem ser tratados como erros atuais sem reexecutar os comandos.
9. A branch `main` está sem proteção de branch no GitHub (`protected: false`). O contrato `verify-approved-ui-lock` protege quatro arquivos somente quando seus gates executam; não substitui regras de branch nem revisão obrigatória.
10. O check Vercel dos commits desta rodada retornou `failure` com URL de limite de builds (`upgradeToPro=build-rate-limit`). A lista de deployments mostrava um deployment de produção em `BUILDING` para commit anterior (`3ee7d628...`) e um último `READY` visível para `7a055c9...`; nenhum desses estados comprova que o commit atual foi publicado com sucesso.

## Comparação de arquitetura com Carbon

Padrões úteis confirmados na documentação do Carbon:

- Separar UI, modelos/validação e acesso a dados por módulo.
- Centralizar componentes de formulário, tabelas e padrões de layout reutilizáveis.
- Usar schema/validação para impedir divergência entre formulário, serviço e persistência.
- Tratar PostgreSQL/RLS como limite de segurança multiempresa; a ocultação de botões no cliente não substitui autorização no banco.
- Usar migrations versionadas e tipos de banco gerados, sem inventar colunas ou editar tipos gerados manualmente.
- Carregar páginas sob demanda, com fallback de carregamento e recuperação segura para chunks antigos.
- Manter documentos controlados com revisão, autoria, estado de aprovação e evidência do original conforme o modelo de dados existente.

Carbon usa uma arquitetura e versões próprias (React Router em modo framework, Vite, Tailwind 4 e monorepo). O ERPSis usa Vite, React Router, Tailwind 3 e Supabase. A referência deve ser adaptada, não copiada mecanicamente.

## Pendências prioritárias — não marcar como concluídas até haver evidência

- [ ] Integrar `PedidoCompraForm` ao fluxo de tela correto sem perder salvamento, aprovação, edição, impressão, empresa ativa e permissões.
- [ ] Executar `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run verify-routes` e `npm run build`; registrar os resultados reais.
- [ ] Verificar o status atual dos 13 erros históricos e atualizar o backlog com a saída de uma execução real, sem apagar histórico.
- [ ] Inventariar todas as rotas registradas versus arquivos existentes, wrappers/re-exports, telas órfãs, telas duplicadas e arquivos de tamanho suspeito.
- [ ] Auditar imports e uso efetivo dos componentes de `src/components`; identificar campos, datas, comboboxes/lupas, grids, botões, tabelas, gráficos, modais e impressão duplicados.
- [ ] Confrontar cada módulo (Compras, Estoque, Manutenção, PCP, Qualidade, Engenharia, Fiscal, Financeiro, RH e demais rotas) com schema/migrations/RLS e testes existentes.
- [ ] Confirmar no ambiente Supabase quais migrations foram aplicadas; presença de um arquivo SQL no GitHub não comprova execução em produção.
- [ ] Confirmar CI e deployment do commit final; não declarar “verde” sem checks concluídos.
- [ ] Resolver o limite de builds do Vercel ou aguardar cota; reexecutar e confirmar o deployment do HEAD atual.
- [ ] Ativar proteção da branch `main` com PR obrigatório e checks mínimos depois de verificar as permissões disponíveis e quais checks realmente são confiáveis.

## Regras de execução

- Não remover nem sobrescrever telas aprovadas sem diff e justificativa.
- Não inventar tabelas, colunas, RPCs, permissões, dados de exemplo ou estado de sucesso.
- Toda alteração de código novo deve registrar data, revisão e escopo no cabeçalho.
- Atualizar uma tela por vez, executar os gates disponíveis, corrigir falhas e só então avançar.
- O componente de formulário compartilhado é um primeiro passo, não um bloqueio global já aplicado a todas as telas.
