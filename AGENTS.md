# Regras obrigatórias para agentes e contribuidores

Estas regras valem para toda alteração neste repositório.

## Regra zero: não regredir trabalho aprovado
- Antes de editar, identifique a branch/base correta, PRs abertos relacionados, alterações aprovadas ainda não integradas e o estado atual dos arquivos compartilhados.
- Nunca assuma que main contém a versão aprovada mais recente. Compare main, a branch de trabalho e PRs relacionados antes de começar.
- Nunca sobrescreva nem reverta alterações válidas para resolver conflitos. Preserve o comportamento aprovado de ambos os lados; se houver ambiguidade, pare e documente o conflito em vez de escolher silenciosamente.
- Não recrie uma tela com uma versão antiga nem substitua um componente sem confirmar rotas, importações, funcionalidades e aprovação vigente.
- Alterações em shell, menus, roteamento, layout, CSS global, autenticação, permissões e componentes compartilhados exigem análise de impacto nos módulos consumidores.
- Faça alterações pequenas, rastreáveis e isoladas. Evite misturar refatoração ampla com correção pontual.

## Antes de editar
1. Verifique branch, SHA base e estado de CI/deploy.
2. Leia os arquivos reais afetados e compare com o commit/PR da última versão aprovada.
3. Liste telas, rotas, menus e contratos impactados.
4. Preserve mudanças ainda não integradas: use a branch aprovada como base ou incorpore suas alterações sem perda, após revisar conflitos.
5. Não use mocks, schema inventado ou dados fictícios para fazer testes passarem.

## Antes de concluir
- Execute os testes aplicáveis, incluindo type-check, ESLint, build e verificações de rotas/contratos quando a mudança os afetar.
- Revise o diff final procurando remoções acidentais, rotas redirecionadas, imports alterados, atalhos desaparecidos e regressões.
- Em mudanças globais, verifique explicitamente Vendas, Cadastros, Estoque/Engenharia, PCP, Qualidade/Tablet, Fiscal e outros módulos afetados.
- Não declare validação visual sem abrir a tela real no preview e testar o fluxo autenticado. Não declare CI/build/deploy verde sem evidência.
- PR aberto não significa publicado. Confirme merge na main e status de produção antes de afirmar que a correção está disponível.
- Registre no PR: base/commit, arquivos afetados, comportamento preservado, testes executados e pendências.

## Política de integração
- Não faça force-push, reset destrutivo ou descarte de trabalho para contornar conflito.
- Não integre uma branch dependente antes de sua base necessária estar integrada ou de seu diff completo ser reavaliado contra a base real.
- Se houver conflito ou CI falhar, mantenha a correção isolada e resolva a causa antes de seguir.
- A aprovação do usuário para uma tela é requisito de preservação: alterações posteriores não autorizam revertê-la silenciosamente.

## Definition of Done
Só marque como concluído quando o código estiver revisado e preservado, os testes aplicáveis passarem, o diff não apresentar regressões conhecidas, o PR estiver integrado à base destinada à publicação e o deploy estiver verificado. Caso contrário, declare o que permanece pendente.
