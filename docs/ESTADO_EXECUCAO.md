# ESTADO DE EXECUÇÃO — ERP Industrial

## Atualização da auditoria global — 12/10/2026

### Estado confirmado no GitHub
- Repositório: `plushbeauty/ERPSistemaIndustrial`.
- Branch de trabalho: `fix/qualidade-padrao-formularios-dashboard`.
- Commit consultado: `a8a3c8c8cd8eedde3492fd37771ca83083fe3e38`.
- PR #79: aberto, não mesclado, base `main`, 48 arquivos alterados e 120 commits informados pela API.
- CI: a execução consultada do workflow `ERP Industrial CI` para o commit terminou com `success`; status combinado retornou CodeRabbit `success`. Isso não substitui teste funcional autenticado nem verificação do deploy de produção.
- Scripts de validação declarados em `package.json`: `type-check`, `lint:check`, `audit:global`, `audit:brutal`, `audit:interactions`, `verify:lazy-imports`, `build`, `verify:build`, `verify-routes` e `verify:release`. Nesta auditoria via GitHub, não executei esses scripts localmente.
- Workflow principal: `.github/workflows/ci.yml`; executa instalação Node 24, verificações de ambiente/lockfile/política, TypeScript, ESLint, auditorias, build e rotas.

### Escopo de arquivos já identificados no PR #79
A lista de arquivos alterados inclui componentes de shell e cabeçalho, rotas, Compras/RFQ, Fiscal, Manutenção, PCP, Qualidade/SGQ, gerador de documentos, estilos globais e migrations. Ver lista completa em https://github.com/plushbeauty/ERPSistemaIndustrial/pull/79/files.

### Primeiras verificações técnicas (não equivalem à auditoria completa)
1. `src/lib/supabaseClient.ts`: sessão Supabase está configurada com `persistSession: true` e armazenamento `window.localStorage`; isso deve ser comparado com o requisito operacional de encerrar sessão ao fechar o navegador. Não alterar sem decidir explicitamente o comportamento de sessão desejado e testar renovação/abas.
2. `getValidSession()`: quando tenta renovar token, não lança erro se `refreshSession()` falhar; conserva a sessão anterior e verifica apenas a presença do access token e do usuário. Investigar o tratamento de token expirado e definir teste reproduzível antes de corrigir.
3. `src/auth/AuthProvider.tsx`: carrega perfil por `erp_usuarios.auth_user_id = auth user id`, filtra `ativo = true` e `deleted_at IS NULL`, e consulta a empresa. Conferir compatibilidade com as migrations e com os helpers SQL.
4. Migration `20261012233000_erp_compras_rfq_atomic_rpc.sql`: a validação de perfil contém `erp_usuarios.id = auth.uid()`, enquanto o provider usa `auth_user_id`. É uma possível inconsistência de vínculo; confirmar o contrato do schema e os helpers antes de alterar. Não marcar como bug confirmado até essa conferência.
5. Migration `20261012230000_erp_rfq_rbac_policies.sql`: define policies de leitura/criação/edição/exclusão de RFQ e tabelas filhas com tenant e permissões; revisar a semântica de `erp_is_master()`, `erp_current_empresa_id()` e `erp_has_permission()` com as implementações reais e testes entre empresas.
6. `docs/REFERENCIAS_TECNICAS_ERP.md` já contém uma análise inicial de Carbon, incluindo alerta de AGPL-3.0 e exclusões comerciais. Não duplicar esse registro; ampliar a matriz no próprio documento.
7. Referências externas efetivamente consultadas nesta rodada: README e `license.txt` do ERPNext na branch `version-15`; arquivo `LICENSE` do Odoo na branch `18.0`; `COPYING` do Dolibarr na branch `develop`. O ERPNext README identifica áreas de contabilidade, estoque, CRM, vendas, compras, RH, ativos, qualidade e manufatura; a licença consultada do ERPNext é GPL-3.0 e a do Odoo é LGPLv3. O texto completo das licenças e dependências deve ser revisto antes de qualquer reutilização de código. Isso foi uma inspeção inicial de metadados/documentação, não auditoria linha a linha desses ERPs.
8. A busca de `docs/PLANO_CONTINUIDADE_ERP.md` retornou 404 nesta branch; este arquivo existente `docs/ESTADO_EXECUCAO.md` será mantido como registro de continuidade para evitar documento duplicado.

### Matriz inicial de status
| Área | Status | Próxima verificação |
|---|---|---|
| Estado do PR/branch/CI | APROVADO para leitura do estado remoto | Reconsultar após novos commits |
| Inventário de rotas e páginas | INCOMPLETO | Extrair rotas e mapear cada rota a arquivo/componente |
| TypeScript/build local | BLOQUEADO nesta execução remota | Rodar scripts em workspace local/CI após alterações |
| Autenticação/sessão | INCOMPLETO | Conferir login, refresh, vínculo Auth/ERP e logout |
| RLS/RBAC multiempresa | INCOMPLETO | Revisar helpers/migrations e executar testes com duas empresas |
| Compras/RFQ atômica | INCOMPLETO | Validar contrato SQL, FK de perfil e cenário de rollback |
| Qualidade e modelos PDF | INCOMPLETO | Localizar documentos de referência e criar matriz campo a campo |
| Comparação ERPNext/Odoo/Dolibarr | INCOMPLETO | Mapear funcionalidades e caminhos de arquivos específicos |
| Manutenção/PCP/Fiscal | INCOMPLETO | Auditar fluxo e schema, sem presumir que deploy está correto |
| Produção/Vercel | NÃO VERIFICADO nesta rodada | Consultar deployment atual e testar rotas essenciais |

## Histórico anterior — bloco de autenticação (preservado)

PROJETO: ERP Industrial
BLOCO: 02 — Login, sessão, permissões e segurança funcional

ÚLTIMO ITEM VALIDADO: 02.01 — Inventário/reconstrução do estado anterior e ambiente
PRÓXIMO ITEM: 02.02 — Validar cadastro público → empresa → setores → usuário administrador → Supabase Auth → vínculo `erp_usuarios.auth_user_id`
STATUS DO BLOCO: EM ANDAMENTO

### Evidências históricas (revalidar antes de tomar decisões)
- Repositório: `plushbeauty/ERPSistemaIndustrial`, branch `main` na ocasião daquela verificação.
- Supabase: projeto `zsklkydlawgvwgnvxwwx`, status ACTIVE_HEALTHY na ocasião.
- Banco: PostgreSQL 17 na ocasião.
- `public.erp_empresas`: 1 empresa e `public.erp_usuarios`: 12 usuários, dos quais 0 possuíam `auth_user_id` na auditoria anterior. Esses números não foram revalidados nesta rodada.
- Edge Function `erp-login`: ACTIVE, versão 2 na auditoria anterior.
- Edge Function `erp-company-signup`: ACTIVE, versão 1 na auditoria anterior.
- A tela de cadastro tinha falha estrutural: `erp_empresas.cnpj` NOT NULL, mas o formulário não enviava CNPJ. A correção foi atribuída ao commit `bbbadf70617e73f0233da7dc26aa86a67f42f3eb`.
- O cadastro foi descrito como enviando CNPJ e usando endpoint do projeto correto; precisa de novo teste ponta a ponta.
- O deploy Vercel `dpl_DNf4SRFoDW1fi6nEEseq3kBvsBz5` estava BUILDING na verificação anterior; estado atual não foi consultado nesta rodada.

### Erros e testes pendentes herdados
1. Cadastro/login ainda precisava de homologação real ponta a ponta.
2. Usuários antigos sem `auth_user_id` precisavam ser conciliados com segurança; revalidar contagem.
3. Provisionamento automático de perfil no primeiro login precisava de avaliação de segurança.
4. Cadastro público precisava de teste de duplicidade, entradas inválidas e rollback.
5. Testar login válido/inválido, usuário/empresa inativos, logout/restauração de sessão, rotas protegidas, recuperação de senha, duplicidade de CNPJ/e-mail e falhas de comunicação.

## Próxima sequência obrigatória
1. Auditar a tabela de rotas de `src/AppEntryV2.tsx` e mapear rotas duplicadas, aliases, páginas e menus.
2. Inspecionar as migrations relacionadas a `erp_usuarios`, `erp_current_empresa_id()`, `erp_is_master()` e `erp_has_permission()` para confirmar ou descartar a divergência de vínculo observada na RPC RFQ.
3. Revisar todos os arquivos alterados no PR #79 por grupos (segurança/banco, lógica funcional, UI), começando por migrations e contratos de dados.
4. Comparar os fluxos equivalentes com fontes oficiais do ERPNext, Odoo e Dolibarr, registrando caminhos efetivamente inspecionados e licenças.
5. Executar a suíte de validação definida no `package.json` em ambiente com checkout do commit e registrar resultados reais.
6. Auditar os modelos de Qualidade disponíveis; nenhum PDF foi aberto nesta rodada.
7. Confirmar deploy Vercel atual e validar rotas essenciais em preview antes de produção.
8. Atualizar este arquivo a cada etapa com evidências e estados reais.

**Regra de honestidade:** este documento registra o estado observado em 12/10/2026. Nenhum item funcional, de banco ou produção é declarado concluído sem evidência específica.
