# ORDEM-MESTRE — SYSNQRA ERP INDUSTRIAL

**Autoridade:** proprietário do SYSNQRA ERP INDUSTRIAL  
**Aplicação:** obrigatória para qualquer IA, agente de código, Qoder, desenvolvedor ou automação que leia ou altere este repositório.  
**Objetivo:** concluir o ERP com segurança, impedir regressões, eliminar falhas repetidas de build/deploy e entregar alterações realmente executadas e verificadas no ambiente conectado.

## 1. Regra soberana: não regredir nem falsificar conclusão

1. Não restaurar telas antigas, não recriar arquivos banidos e não substituir telas aprovadas por versões legadas.
2. Não alterar aparência, layout, dimensões, cores, tipografia, navegação ou comportamento de telas congeladas sem ordem explícita do proprietário para aquela revisão. Correções de dados/consultas podem ser feitas mantendo o contrato visual e registrando a revisão.
3. Nunca atualizar hashes, snapshots, manifestos ou testes apenas para fazer o pipeline passar. Primeiro corrigir e validar a alteração real; registrar o motivo, o escopo e a autorização; só então regenerar o manifesto da tela que mudou legitimamente.
4. Nunca apagar, descartar, resetar, sobrescrever ou fazer force-push de trabalho válido. Não fazer merge de branches divergentes sem comparar a base, os commits exclusivos, os arquivos compartilhados e os conflitos.
5. Nunca declarar concluído, verde, integrado ou publicado sem evidência do respectivo teste, workflow, deployment ou validação de runtime.

## 2. Arquitetura e segurança obrigatórias

- Stack oficial: React + TypeScript + Vite + Tailwind + Supabase/PostgreSQL/RLS + Vercel.
- Identidade Master canônica e exclusiva: provisionada por `/configuracao-adm-master` e `plush-master-bootstrap`; `perfil = SUPER_ADMIN`, `nivel_admin = 100`, `is_master = true`, `empresa_id IS NULL`. Não usar `MASTER`, `nivel_admin = 9`, tabela legada `usuarios` ou heurísticas como identidade privilegiada.
- Toda operação de negócio deve exigir sessão Supabase válida, autorização RBAC no servidor/banco e isolamento por `empresa_id`; RLS é defesa obrigatória, não opcional.
- Não usar mocks, arrays estáticos, localStorage ou dados inventados para simular operações reais. Não expor `service_role` no cliente.
- Mudanças de schema devem vir em migrations versionadas, idempotentes quando possível, com grants, RLS, índices, constraints, rollback/estratégia de recuperação e testes de contrato. Não executar DDL remoto improvisado para contornar erro de deploy.
- Edge Functions devem validar método, autenticação, origem CORS e payload; OPTIONS 204 deve retornar corpo vazio (`new Response(null, { status: 204, ... })`). Segredos apenas em variáveis seguras do ambiente.
- Consultas devem usar nomes de colunas/tabelas confirmados no schema real. Em erro 404/PGRST202/42703, investigar migration, schema remoto e PostgREST; não inventar coluna ou função.

## 3. Fluxo obrigatório para toda alteração

1. Identificar repositório, branch, SHA atual, base correta, PRs relacionados e estado de GitHub Actions/Vercel.
2. Ler `AGENTS.md`, esta ordem, contratos de UI, scripts de release e migrations relevantes.
3. Reproduzir a falha e guardar a evidência (log, rota, RPC, SQLSTATE, request sem tokens).
4. Identificar causa raiz; classificar P0 segurança/dados/deploy, P1 funcionalidade, P2 visual/UX.
5. Fazer alteração pequena, rastreável e com escopo mínimo. Não misturar refatoração ampla com correção P0.
6. Atualizar testes/contratos correspondentes. Testes não podem ser enfraquecidos, removidos, ignorados ou marcados como sucesso artificial.
7. Rodar localmente, no mínimo conforme o escopo: `npm ci --legacy-peer-deps --no-audit --no-fund`, `npm run type-check`, `npm run lint:check`, `npm run verify:release`, `npm run build`, `npm run verify:build`, `npm run verify-routes`. Para Edge Functions, executar também lint/format/check compatíveis com Deno e testes de contrato.
8. Revisar diff, rotas, menus, imports, permissões, tenant scoping, telas aprovadas e artefatos gerados.
9. Commitar na branch de trabalho e aguardar GitHub Actions e Vercel Preview. Corrigir todos os bloqueios e repetir até READY.
10. Testar o Preview real, inclusive sessão autenticada, permissões e fluxos de gravação/leitura relevantes. Teste estático não prova operação do banco.
11. Só promover para produção após gates verdes, preview validado e autorização do proprietário quando a ação publicar/alterar produção.
12. Informar SHA, arquivos, causa raiz, testes e URLs/status observados. Separar claramente pendências e riscos.

## 4. Proteções permanentes do Vercel e CI

- Node 24 e instalação determinística com npm ci.
- Preview e produção devem executar os mesmos gates críticos de tipo, lint, segurança, rotas, migrations/contratos, UI aprovada e build.
- Falha em qualquer gate obrigatório bloqueia deploy; não usar `continue-on-error`, `|| true`, exclusão de testes, bypass de branch ou comando que mascare exit code.
- Manter os verificadores `verify:official-screens-lock`, `verify:approved-ui-lock`, `verify:reset-contract`, `verify:auth-master-contract`, `verify:deploy-integrity`, `verify:release-lineage`, `verify:vercel-config`, `verify:ci-policy`, `verify:migrations-sql` e `verify-routes` cobertos por CI/release, conforme aplicabilidade e scripts existentes.
- O `build:vercel` deve executar o gate de produção completo e terminar em build Vite real; não trocar por verificação superficial.
- Investigar cada deployment ERROR pelo log completo. Corrigir a primeira falha fatal, criar novo commit e verificar o novo deployment. Avisos npm/ESLint devem ser triados, mas não confundidos com o erro fatal.
- Configurar proteção de branch no GitHub: exigir CI verde, revisão, histórico linear quando compatível e impedir force-push/deleção nas branches protegidas. Não afirmar que a proteção foi aplicada até confirmar o estado real da configuração.

## 5. Telas e módulos que não podem regredir

Preservar, sem retorno de legado: Home pública e carrossel aprovado, login institucional, shell horizontal/menu, Central de Compras/RFQ, PCP, fichas de processo, planejamento e chão de fábrica, Paquímetro/Qualidade/Tablet, Fiscal/NF-e e demais telas registradas nos manifestos de aprovação. Manter rotas e entradas de menu existentes; corrigir rotas quebradas sem remover módulos.

## 6. Definition of Done — conclusão real

Uma tarefa só está concluída quando:
- a causa raiz foi corrigida no repositório e commitada;
- os gates obrigatórios passaram no SHA exato;
- migrations necessárias estão aplicadas e verificadas no projeto Supabase correto, ou explicitamente listadas como pendentes;
- Vercel Preview está READY e o runtime/rota foi testado;
- telas aprovadas e isolamento multiempresa não regrediram;
- produção só foi promovida com autorização e deployment READY;
- o relatório final apresenta evidências, não promessas.

**Se não houver acesso, permissão, segredo ou ambiente para concluir uma etapa, não simular. Documentar exatamente o bloqueio, o que foi validado e a ação humana mínima necessária.**


## 7. Auditoria global obrigatória para cada novo código, tela ou revisão

O procedimento operacional detalhado e o comando reutilizável estão em [docs/COMANDO-MESTRE-AUDITORIA-GLOBAL-APLICACAO.md](COMANDO-MESTRE-AUDITORIA-GLOBAL-APLICACAO.md). Ele é obrigatório para toda solicitação do proprietário que contenha código, tela, wireframe, pacote, correção ou funcionalidade nova.

Não analisar isoladamente nem encerrar em documentação/branch/PR. Antes de editar, reconciliar todas as revisões relacionadas em todo o ERP: arquivos enviados, implementações equivalentes, rotas, menus, PRs, commits, migrations, RPCs, RLS, manifesto e telas aprovadas. Classificar cada item como aplicado na main, apenas em branch/PR, parcial, ausente, incompatível ou bloqueado. Preservar trabalho válido e resolver divergências sem descartar revisões anteriores.

Aplicar o material ao componente e à rota reais, validar banco e segurança por empresa, auditar consumidores globais, executar gates, corrigir pela causa raiz, validar Preview e integrar na main quando os gates passarem. Produção só é concluída após deployment READY e confirmação do domínio oficial. Branch, PR, wireframe ou arquivo criado não significam entrega aplicada.

O agente deve manter a rastreabilidade do material recebido e informar impedimentos externos concretos. Não pedir reenvio de conteúdo já disponível, não inventar partes ausentes e não afirmar execução que não ocorreu.
