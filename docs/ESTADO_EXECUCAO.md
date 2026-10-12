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

## Continuação de execução — 2026-10-12 (checagem do último HEAD)

- HEAD verificado: `8c8781ea175defc5e8a023cca21a06bf56d8dbd8`; PR #79 permanece aberto, não mesclado.
- O workflow `ERP Industrial CI` para esse HEAD foi observado como `pending` na última consulta. Não registrar aprovação até obter conclusão final.
- Correção aplicada em `src/lib/supabaseClient.ts`: a sessão Supabase passa a usar `sessionStorage`, evitando persistência normal da autenticação em `localStorage`. Isso limita a sessão à aba/sessão do navegador, mas ainda exige teste real de login, refresh, múltiplas abas e restauração de sessão pelo navegador.
- Correção aplicada em `src/pages/ComprasRFQ.tsx`: removido um segundo bloco CSS inline idêntico; o arquivo agora tem uma ocorrência do bloco compacto.
- Auditoria estática do RFQ identificou um ponto para próxima correção após confirmar contrato e permissões de esquema: a RPC valida que os produtos estão ativos na empresa, mas os campos `codigo` e `descricao` inseridos em `erp_rfq_itens` vêm do payload do cliente. Avaliar gravar os valores canônicos a partir de `erp_produtos` dentro da mesma transação, sem confiar no código/descrição enviados pelo navegador.
- O inventário da árvore contém 780 entradas e muitos arquivos de páginas; isso não significa que cada tela foi funcionalmente validada. A auditoria precisa prosseguir módulo a módulo, distinguindo telas reais, aliases/duplicatas e rotas sem contrato validado.
- Limitações da etapa: não há checkout do repositório disponível neste ambiente para executar `npm ci`, `npm run type-check`, lint ou build localmente. Nenhuma migração foi aplicada ao Supabase nesta etapa e nenhuma aprovação de produção foi declarada.


## Estado atualizado após execução real — 12/10/2026

Este bloco prevalece sobre notas anteriores desta página que diziam que nenhuma migration tinha sido aplicada nesta rodada.

- **Supabase real** (zsklkydlawgvwgnvxwwx, ACTIVE_HEALTHY): aplicadas e verificadas migrations de hardening de Storage para SGQ, RFQ RBAC e criação atômica de RFQ; também aplicada a revisão da RPC RFQ para resolver código, descrição e unidade canônicos diretamente de erp_produtos, sem confiar nesses campos enviados pelo cliente.
- **Storage**: erp-qualidade-anexos e erp-documentos-qualidade existem e estão privados. As políticas de ambos restringem os objetos à pasta da empresa da sessão; operações de escrita/exclusão exigem usuário ativo da empresa e perfil administrativo/Qualidade conforme as regras SQL.
- **RFQ**: as políticas RLS antigas permissivas erp_rfq_tenant, erp_rfq_fornecedores_tenant e erp_rfq_itens_tenant foram substituídas pelas policies de leitura/criação/edição/exclusão com RBAC. A função erp_compras_criar_rfq_atomica(uuid[], jsonb, date, text, text, date) está presente como SECURITY INVOKER, com EXECUTE revogado de public, anon e concedido a authenticated. A consulta SQL confirmou os contratos instalados; não foi executado teste de transação com usuário real autenticado nesta etapa.
- **CI**: run 38274971362 concluiu success para o commit 1ed72cc946d29318ef3d218a3e6432f577c77cf3, incluindo TypeScript, ESLint, auditorias, build, output, rotas e security no-bypass. Depois desse commit, novas alterações/documentação chegaram à branch; o HEAD mudou e o workflow mais recente precisa ser consultado antes de declarar o HEAD atual validado.
- **Vercel/produção**: nenhuma deployment foi encontrada para os SHAs atuais consultados. Não afirmar que o código novo está publicado; PR #79 continua aberto e não mesclado.
- **Pendências de continuidade**: remover a dependência de runtime em CDN unpkg no gerador DOCX com dependências locais e lockfile reproduzível; testar upload/download real de DOCX com sessão autenticada; testar RFQ com rollback e permissões reais; revisar avisos de segurança Supabase e continuar a auditoria funcional módulo a módulo.

## Validação de contratos RFQ e Tablet da Qualidade — 2026-10-12

- A revisão `dcd7389f8e61bacd11b8727c8a8d71f11f855587` passou no GitHub Actions: TypeScript, ESLint, auditorias global/brutal/interações, imports lazy, build, rotas, contrato RFQ, contrato do Tablet e política de segurança sem bypass.
- O preview Vercel `dpl_5TAW8xq8pf86uU1ymiuirYuPFLaM` terminou em `READY` para essa revisão. URL: `https://erp-sistema-industrial-p246l73h8-plushbeauty.vercel.app`. Isso valida build/deploy, não equivale a teste funcional autenticado de todas as rotas.
- A tela de Compras ganhou `scripts/verify-rfq-contract.mjs`, executado pelo CI e pelos comandos de release. A verificação confirmou o contrato estático da RPC: sessão/perfil, tenant, fornecedor e produto ativos, permissões, campos canônicos e grants.
- O Tablet da Qualidade passou de 20 para 22 atalhos operacionais. Foram incluídos Instrumentos de medição (`/qualidade/instrumentos`) e Refugos da qualidade (`/qualidade/refugos`); a checagem estática confirmou que os 22 destinos existem em `src/AppEntryV2.tsx`. A instrução do modal foi corrigida para não afirmar que a tela abre “atrás” da janela.
- Novo gate `scripts/verify-quality-tablet-contract.mjs` verifica a contagem de 22 módulos, rotas sem duplicidade, modal acessível e abertura pelo menu horizontal; foi integrado ao workflow e aos comandos de release.
- Durante a validação, o primeiro CI do tablet falhou por import duplicado de `Gauge`. A duplicação foi removida e a revisão posterior passou em todas as etapas. Não ocultar essa falha histórica; a correção e a validação posterior estão registradas aqui.
- O histórico Vercel consultado mostrou falhas antigas em deploys da `main` (por imports relativos quebrados em `ControleProcessoInjetora.tsx`); a versão atual da branch usa caminhos corrigidos. O deploy de preview READY é da branch e não altera o alias de produção.
- Bloqueio externo: a integração Supabase conectada a esta sessão não retornou projetos disponíveis. Por isso, ainda não foi possível consultar o histórico real de migrations/tabelas de produção nem confirmar se o schema `engenharia_produtos`, `estoque_lotes`, `qualidade_inspecoes` e `pcp_apontamentos` está aplicado. Nenhuma migration foi aplicada remotamente nesta etapa.
- Próximas prioridades: obter acesso verificável ao projeto Supabase correto; comparar o catálogo real de tabelas/migrations com os contratos usados pelas telas; testar login/RBAC/RLS com perfis reais; depois executar smoke tests autenticados em preview e continuar a auditoria módulo a módulo.


## Continuação da validação — 2026-10-12 (RFQ, Storage e CI)

- A revisão `f1ffa29d71d23548cbc06aadaad07109b0e8269c` passou no workflow `38278724579`: TypeScript, ESLint, auditorias, build, rotas, contrato RFQ, contrato Tablet e política sem bypass. PR #79 segue aberto e não mesclado.
- Em `src/pages/ComprasRFQ.tsx`, o payload da RPC atômica foi reduzido aos campos necessários (`produto_id`, `quantidade`, `data_necessidade`, `observacoes`). Código, descrição e unidade não são mais enviados pelo cliente; a RPC consulta os campos canônicos do produto no banco.
- Consulta direta ao projeto Supabase ERP `zsklkydlawgvwgnvxwwx` confirmou a RPC `erp_compras_criar_rfq_atomica` como `SECURITY INVOKER`, assinatura esperada, grants EXECUTE para `authenticated` e nenhuma concessão a `anon`/PUBLIC no catálogo de privilégios consultado. As políticas RLS específicas de RFQ por ação/empresa estão presentes.
- Consulta direta confirmou os buckets `erp-documentos-qualidade` e `erp-qualidade-anexos` como privados e as oito policies Storage esperadas presentes, com escopo de empresa. Isso não substitui teste de upload/download por sessão real.
- Auditoria Supabase Security Advisors em 2026-10-12 ainda reporta: 29 funções SECURITY DEFINER executáveis por usuários autenticados (cada uma precisa revisão individual; não revogar em massa sem analisar contratos), extensões `vector` e `pg_trgm` no schema `public`, e proteção contra senha comprometida desativada.
- Performance Advisors reporta 139 FKs sem índice cobridor, 18 casos de policies permissivas múltiplas, 1 policy com initplan, 1 índice duplicado e 294 índices não utilizados. Estes avisos exigem triagem e não devem ser corrigidos em lote sem avaliar carga, uso e risco.
- Pendências bloqueantes para declarar conclusão: geração DOCX ainda carrega `PizZip`/`Docxtemplater` via `unpkg`; o `package.json` e `package-lock.json` não incluem essas bibliotecas. O ambiente de execução desta sessão não conseguiu acessar o registry npm para gerar um lockfile verdadeiro; não editar lockfile manualmente nem alegar que o CDN foi removido. Testes com sessão real para upload/download DOCX, RFQ positiva/rollback/permissões e isolamento entre tenants continuam pendentes.
- Vercel: preview READY conhecido para revisão anterior `dcd7389f8e61bacd11b8727c8a8d71f11f855587`; ainda não há preview confirmado para `f1ffa29d71d23548cbc06aadaad07109b0e8269c). Produção continua no commit `8390cedce69e635a83521dcde43e9fb0ee67b0fe` da `main`. Não mesclar nem promover até concluir as pendências e validar o preview mais recente.

## Hardening fiscal de entrada — 2026-10-12

- Encontrado risco na escrituração de NF de entrada: a RPC original não verificava RBAC e o helper de custo médio ficava exposto aos papéis de navegador por grants padrão. Isso permitiria a tentativa de alterar saldos/custos por chamada direta, sujeita apenas às políticas de tenant.
- Adicionada a migration `supabase/migrations/20261013030000_harden_incoming_nfe_costing_rbac.sql` à branch (não aplicada remotamente). Ela exige sessão, empresa e perfil ERP ativo; exige `estoque.criar` ou `fiscal.editar`; valida NF-e rascunho, lote e endereço ativos do tenant; bloqueia a NF-e durante a escrituração; serializa custo médio por empresa/produto; remove execução do helper para `PUBLIC`, `anon` e `authenticated`; e concede execução explícita da RPC de escrituração apenas a `authenticated`.
- O helper usa `SECURITY DEFINER` com `search_path = pg_catalog, public` e filtros explícitos por empresa; a RPC pública também usa `SECURITY DEFINER` com verificação de sessão/perfil/permissão e filtro de tenant em todas as operações. O custo médio não usa `FOR UPDATE` na consulta agregada.
- O contrato fiscal foi ampliado em `scripts/verify-nfe-contract.mjs` e o passo `NF-e contract` foi adicionado ao GitHub Actions, além dos comandos de release. O CI da revisão `3ca95e524f87d108c39abfd98ae5ee3c73b5687f` concluiu com sucesso, incluindo TypeScript, ESLint, build, rotas e os gates NF-e, RFQ, Tablet SGQ e segurança.
- O preview Vercel READY existente foi construído para a revisão anterior `dcd7389f8e61bacd11b8727c8a8d71f11f855587`, não para a migration fiscal recém-adicionada. Uma nova tentativa de criar preview para a revisão fiscal foi recusada pelo limite diário da API Vercel (100 deploys/dia; retry informado em 24h). Nenhum deploy de produção foi criado ou promovido.
- **Pendente antes de produção:** revisar a migration com o esquema remoto, confirmar o owner das duas funções no banco, testar com perfis sem/com permissões, verificar rollback atômico e executar escrituração de teste em ambiente não produtivo. O conector Supabase desta sessão não listou projetos disponíveis, portanto nenhuma dessas verificações foi simulada como se fosse real.

## Hardening de inspeção, medição e RBAC — 2026-10-12

- Encontrada lacuna no RPC `erp_salvar_inspecao_lote`: a versão anterior aceitava a decisão do navegador sem verificar permissão `qualidade.criar` e permitia aprovação sem comprovar a especificação vigente. A migration `20261013040000_harden_quality_inspection_rbac_and_spec.sql` redefine o RPC para exigir perfil ativo, permissões de leitura/criação, especificação vigente vinculada e validação no servidor dos limites dimensionais, certificados e evidências não numéricas.
- Quando a especificação não está ativa/vigente ou a medição/evidência falha na validação, o RPC marca a inspeção como reprovada; o fluxo existente bloqueia o lote, move saldo para quarentena e gera RNC. As políticas RLS restritivas adicionam RBAC a inspeções, atualização de lotes e registros de quarentena.
- A RPC `erp_reter_lote`, que já era `SECURITY DEFINER`, foi redefinida com `search_path` fixo e validação de permissão para não depender apenas do isolamento por empresa.
- O contrato foi acrescentado a `scripts/verify-quality-inspection-contract.mjs` e integrado ao workflow de CI e comandos de release. Após corrigir a ausência inicial do script npm (que fez uma execução falhar), a revisão `13c70875e7654659e0ff7aaf879aacba1d4bc379` passou no CI completo, incluindo o gate de segurança sem bypass.
- O hardening de custo médio fiscal também foi ampliado para recusar produtos inativos ou fora da empresa e está coberto pelo contrato NF-e.
- **Não aplicado no Supabase:** o conector desta sessão continua sem projetos listados; ainda faltam teste SQL real, confirmação de owner das funções, validação de RLS no banco implantado e cenários de teste de permissão/rollback.
- **Preview:** o preview Vercel READY disponível é anterior à migration de inspeção. A API Vercel atingiu o limite diário de criação de deployments; não foi possível gerar outro preview para o commit mais recente. Nenhum deploy de produção foi promovido.

## Integridade de versões das migrations — 2026-10-12

- A branch continha uma nova colisão de versão: `20261012130000_sgq_inspecao_documentos_contract.sql` compartilhava o prefixo com `20261012130000_erp_medicao_schema_alignment_v1.sql`. A migration SGQ foi renomeada para `20261012130100_sgq_inspecao_documentos_contract.sql`; nenhuma migration foi aplicada ao banco.
- A auditoria global agora compara os prefixos de versão e bloqueia novas colisões. Treze pares históricos já presentes na `main` foram allowlisted por nome exato, pois renomeá-los sem consultar `supabase_migrations.schema_migrations` pode quebrar o alinhamento entre repositório e banco. Essa dívida histórica continua aberta para reconciliação controlada.

## RBAC do ledger WMS e escrituração de NF-e de entrada — 2026-10-12

- A revisão das políticas genéricas `tenant_isolation` identificou que o isolamento por empresa, sozinho, não limitava permissões fiscais nem tornava imutáveis as movimentações de estoque e o histórico de custos.
- A migration aditiva `20261013060000_harden_inventory_movement_and_fiscal_entry_rbac.sql` acrescenta políticas RLS restritivas: movimentações exigem permissão de movimentar e não aceitam update/delete direto; NF-e de entrada só pode ser editada/excluída em rascunho; parâmetros tributários exigem `fiscal.editar`; histórico de custo é somente leitura para usuários de navegador.
- A tela genérica não oferece mais edição de movimentos WMS e não apresenta ação de edição para NF-e já escriturada.
- **Não aplicada ao Supabase:** as políticas e o contrato foram adicionados ao repositório, mas dependem de validar o histórico real de migrations, owner das funções e cenários de RLS no ambiente não produtivo antes de qualquer aplicação.
