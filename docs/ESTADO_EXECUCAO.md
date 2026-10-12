# ESTADO DE EXECUÇÃO — ERP Industrial

## Atualização da auditoria global — 12/10/2026

### Revisão de RFQ após conferência da ordem das migrations — 12/10/2026
- A primeira leitura da migration `20261012233000_erp_compras_rfq_atomic_rpc.sql` apontou uma condição de identidade inconsistente (`u.id = auth.uid()`). A conferência da migration seguinte, `20261012240000_erp_rfq_atomic_create.sql`, mostrou que ela redefine a mesma função com o contrato canônico: procura `u.auth_user_id = auth.uid()`, valida empresa/usuário ativo e grava `created_by` com o ID do perfil ERP.
- Uma migration corretiva adicional foi criada temporariamente antes de essa ordem completa ser conferida. Ao perceber que ela sobrescreveria a versão mais robusta de `20261012240000`, foi removida no commit `220187db134dff0d2b442b682542e4a15a8bc4c9`. **Não há migration corretiva RFQ extra no estado atual.**
- Conclusão atual: a inconsistência foi identificada na migration intermediária, mas a migration posterior já corrige o contrato da função no fluxo versionado. Ainda é necessário verificar o estado real do banco/histórico aplicado; não aplicar alterações remotas com base apenas na ordem nominal dos arquivos.

## Estado confirmado no GitHub
- Repositório: `plushbeauty/ERPSistemaIndustrial`.
- Branch de trabalho: `fix/qualidade-padrao-formularios-dashboard`.
- Commit de base inspecionado: `a8a3c8c8cd8eedde3492fd37771ca83083fe3e38`. Commits desta rodada: `4a682771a30b1568c1cee585d43ad21f96c83ff2` (registro inicial), `39336cca1b18964790dc300d49d478ccd1e41e46` (migration RFQ temporária, depois revertida), `e3121063914d20f54498f427b519edb3cb99cf8d` (registro), `3d537b241cf8e10e391c566f63f3997d70c1806c` (comparação inicial de referências), `8b248114a5d84c6eee531cdd5dc0f30482a35e68` (estado/CI) e `220187db134dff0d2b442b682542e4a15a8bc4c9` (remoção da migration redundante). Reconsultar o HEAD do PR após o próximo registro.
- PR #79: aberto, não mesclado, base `main`, 50 arquivos alterados e 124 commits informados pela API após as alterações desta rodada.
- CI: uma execução anterior do workflow `ERP Industrial CI` terminou com `success`; para o HEAD mais recente, a execução consultada está `pending`. O status combinado mostra CodeRabbit `success`. Não declarar o último commit aprovado até a execução pendente terminar; isso também não substitui teste funcional autenticado nem verificação do deploy de produção.
- Scripts de validação declarados em `package.json`: `type-check`, `lint:check`, `audit:global`, `audit:brutal`, `audit:interactions`, `verify:lazy-imports`, `build`, `verify:build`, `verify-routes` e `verify:release`. Nesta auditoria via GitHub, não executei esses scripts localmente.
- Workflow principal: `.github/workflows/ci.yml`; executa instalação Node 24, verificações de ambiente/lockfile/política, TypeScript, ESLint, auditorias, build e rotas.

### Escopo de arquivos já identificados no PR #79
A lista de arquivos alterados inclui componentes de shell e cabeçalho, rotas, Compras/RFQ, Fiscal, Manutenção, PCP, Qualidade/SGQ, gerador de documentos, estilos globais e migrations. Ver lista completa em https://github.com/plushbeauty/ERPSistemaIndustrial/pull/79/files.

### Primeiras verificações técnicas (não equivalem à auditoria completa)
1. `src/lib/supabaseClient.ts`: sessão Supabase está configurada com `persistSession: true` e armazenamento `window.localStorage`; isso deve ser comparado com o requisito operacional de encerrar sessão ao fechar o navegador. Não alterar sem decidir explicitamente o comportamento de sessão desejado e testar renovação/abas.
2. `getValidSession()`: quando tenta renovar token, não lança erro se `refreshSession()` falhar; conserva a sessão anterior e verifica apenas a presença do access token e do usuário. Investigar o tratamento de token expirado e definir teste reproduzível antes de corrigir.
3. `src/auth/AuthProvider.tsx`: carrega perfil por `erp_usuarios.auth_user_id = auth user id`, filtra `ativo = true` e `deleted_at IS NULL`, e consulta a empresa. Conferir compatibilidade com as migrations e com os helpers SQL.
4. Migration `20261012233000_erp_compras_rfq_atomic_rpc.sql` continha uma checagem intermediária por `u.id`; a migration posterior `20261012240000_erp_rfq_atomic_create.sql` redefine a função com `u.auth_user_id = auth.uid()`, usuário ativo, tenant correto e `created_by = v_usuario_id`. Uma migration redundante que teria sobrescrito essa versão foi removida. Confirmar o histórico remoto de migrations antes de declarar o banco alinhado.
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
2. Confirmar o estado aplicado no Supabase para `20261012233000` e `20261012240000`; testar a RPC RFQ em PostgreSQL de homologação e conferir os helpers de identidade/RBAC antes de qualquer mudança remota.
3. Revisar todos os arquivos alterados no PR #79 por grupos (segurança/banco, lógica funcional, UI), começando por migrations e contratos de dados.
4. Comparar os fluxos equivalentes com fontes oficiais do ERPNext, Odoo e Dolibarr, registrando caminhos efetivamente inspecionados e licenças.
5. Executar a suíte de validação definida no `package.json` em ambiente com checkout do commit e registrar resultados reais.
6. Auditar os modelos de Qualidade disponíveis; nenhum PDF foi aberto nesta rodada.
7. Confirmar deploy Vercel atual e validar rotas essenciais em preview antes de produção.
8. Atualizar este arquivo a cada etapa com evidências e estados reais.

**Regra de honestidade:** este documento registra o estado observado em 12/10/2026. Nenhum item funcional, de banco ou produção é declarado concluído sem evidência específica.
