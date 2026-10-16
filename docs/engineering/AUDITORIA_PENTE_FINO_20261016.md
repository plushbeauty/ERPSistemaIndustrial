# Auditoria técnica abrangente — ERP Sistema Industrial
Data: 2026-10-16
Branch auditada: fix/clientes-clone-fornecedores-producao
Repositório: plushbeauty/ERPSistemaIndustrial

## Estado desta rodada
**Status geral: VERMELHO / AUDITORIA INCOMPLETA.** Este documento registra evidências verificadas, não declara o ERP pronto. Não houve execução local do checkout completo nesta sessão. O Supabase remoto não está acessível pela conexão autorizada disponível; portanto, schema aplicado, RPCs e RLS remotos não podem ser marcados como verificados.

## Evidências P0/P1 encontradas
1. O checkpoint persistido em `docs/engineering/CHECKPOINT.md` registra `LAST_SUCCESSFUL_TEST: nenhum teste local executado neste ambiente`, bloqueadores ERR-0004/ERR-0005/ERR-0001 e tarefas P0 de build/RBAC ainda pendentes. Esse registro contradiz qualquer afirmação de validação integral sem evidência posterior.
2. O deploy Vercel `dpl_7GF4xUnVL35io87KLGeALjHFNoGS`, commit `6f3c296`, falhou em `npm run type-check` por nulabilidade em `src/pages/configuracoes/AssistenteConfiguracaoInicial.tsx` (Object.entries de dados que podem ser null). Uma correção de narrowing foi registrada em commit posterior `8b50346`; esse deploy antigo não prova o resultado da correção.
3. O deploy do commit `20f19168c786121f8909ac15199f21450cf8fdd2` foi observado em estado BUILDING. Não marcar como READY até consultar o estado terminal e os checks.
4. A fila `docs/engineering/ERROR_QUEUE.md` mantém ERR-0001 OPEN, ERR-0002 OPEN, ERR-0004 VALIDATING e ERR-0005 BLOCKED; a `WORK_QUEUE.md` mantém tarefas de build, Tablet e RBAC pendentes. A fila deve ser reconciliada com o HEAD atual por teste reproduzível, não fechada por suposição.
5. A verificação remota do contrato `erp_has_permission` está bloqueada por falta de acesso Supabase. O código contém overloads para `p_code` e `p_modulo/p_acao`, mas não se comprovou que as assinaturas e grants estejam aplicados no projeto remoto.
6. Foi adicionada a migration `supabase/migrations/20261016121000_gabarito_campos_cadastros_fiscal_pcp_rh.sql` (commits `1e30e66` e `20f1916`). Ela ainda precisa ser validada contra todas as migrations-base e aplicada ao Supabase remoto por fluxo autorizado. Não declarar campos disponíveis em produção antes disso.
7. A migration introduz relações de tenant para almoxarifado, motivos de refugo e exames ocupacionais. Antes de aplicar, validar existência e chave de `erp_almoxarifados(empresa_id,id)`, `erp_funcionarios(empresa_id,id)`, nomes reais de colunas, ordenação de migrations e política de acesso a dados ocupacionais. Restrições adicionadas como NOT VALID exigem validação explícita após inspeção de dados.
8. O catálogo visual do projeto não é uniforme por simples existência de tokens globais: por exemplo, `src/pages/ProdutosVendasIndustrial.tsx` contém regras locais específicas de largura `ch`; a auditoria deve comparar todas as rotas com o gabarito oficial (controles de 30–32 px, labels 9 px uppercase, raio 2 px, impressão A4) e eliminar overrides conflitantes por rota.

## Gabarito de auditoria obrigatório
- [ ] Reproduzir `npm run verify:production` no HEAD exato; preservar logs por gate.
- [ ] `npm run type-check`, `npm run lint:check`, `npm run audit:all`, `npm run verify:lazy-imports`, `npm run build`, `npm run verify:build`, `npm run verify-routes`, contratos de NF-e, Tablet, shell horizontal e logo.
- [ ] Auditar login, cadastro de empresa/teste, onboarding, Master e troca de empresa; Auth real, logout, RBAC e sessão.
- [ ] Auditar isolamento tenant/RLS, funções RPC/grants e Edge Functions, incluindo casos cross-tenant.
- [ ] Auditar Cadastros/Clientes/Fornecedores/Produtos, Estoque/WMS, Compras, Vendas, Fiscal/NF-e/SPED, PCP/MES, Engenharia/BOM, Qualidade/SGQ M01–M22, RH/ASO, financeiro, manutenção e expedição.
- [ ] Conferir cada botão/lupa/atalho, validação, carregamento/erro/vazio, salvamento Supabase e impressão A4; proibir mocks, links inertes e rotas falsas.
- [ ] Conferir schema real do Supabase antes de considerar migrations aplicadas.
- [ ] Conferir visual por screenshots em viewport desktop e tablet; não inferir conformidade só por busca textual.
- [ ] Atualizar ERROR_QUEUE/WORK_QUEUE com achados reproduzíveis, commit que corrige e teste que os fecha.
- [ ] Somente declarar GREEN quando todos os gates obrigatórios e validações remotas estiverem verdes no mesmo HEAD.

## Limitações da evidência nesta rodada
- A conexão Supabase retornou falta de permissão ao projeto; schema/RPC/RLS remotos não foram consultados.
- Não houve checkout local completo disponível para executar npm scripts manualmente nesta sessão.
- O estado do deploy do HEAD consultado ainda estava BUILDING; portanto, nenhum resultado terminal foi atribuído a esse commit.
- Busca textual não substitui E2E nem inspeção visual de cada rota.
