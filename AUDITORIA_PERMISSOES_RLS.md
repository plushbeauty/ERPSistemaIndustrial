# AUDITORIA DE PERMISSÕES RLS — MASTER vs SUPER_ADMIN

**Projeto:** SYSNQRA ERP INDUSTRIAL  
**Repositório:** plushbeauty/ERPSistemaIndustrial  
**Branch analisada:** fix/consolidacao-global-padrao-ouro-20261124  
**Commit-base:** 98dadf56f7264d9b0f1905127b3371bd0885121b  
**Data da auditoria:** 25/11/2026  
**Escopo:** leitura de código e metadados do Supabase. Nenhuma tabela, coluna, migration, função ou policy foi alterada.

## 1. Contrato normativo e divergência central

A documentação normativa `docs/ORDEM-MESTRE-SYSNQRA-ERP.md`, seção 2, define a identidade privilegiada como:

- registro em `public.erp_usuarios` ligado ao `auth.uid()`;
- `is_master = true`;
- `perfil = 'SUPER_ADMIN'`;
- `nivel_admin = 100`;
- `empresa_id IS NULL`;
- bootstrap por `/configuracao-adm-master` e `plush-master-bootstrap`.

A implementação não está uniforme. Parte do frontend e do bootstrap ainda exige `perfil = 'MASTER'`, enquanto a Edge Function de administração de usuários exige `SUPER_ADMIN`. Algumas rotinas SQL antigas aceitam valores de `role` diferentes de `perfil` e não aplicam o contrato completo.

## 2. Matriz de divergências encontradas no commit-base

| Camada / arquivo | Verificação encontrada | Divergência / risco |
|---|---|---|
| `src/auth/AuthProfile.ts` | `is_master=true`, `perfil='MASTER'`, `nivel_admin>=100`, empresa nula e setor nulo | Contraria o perfil normativo `SUPER_ADMIN`; bloqueia identidade conforme a ordem mestre |
| `src/AppBootstrap.tsx` | `is_master=true`, nível >=100, perfil `MASTER`, empresa nula | Gate principal usa o literal divergente |
| `src/IndustrialLoginDirect.tsx` | Validação estrita com perfil `MASTER` | Login e bootstrap precisam compartilhar um único contrato |
| `supabase/functions/erp-master-bootstrap/index.ts` | Procura/grava `MASTER`, nível 100, is_master true, empresa e setor nulos | Provisionamento cria identidade diferente da documentação normativa |
| `supabase/functions/erp-user-admin/index.ts` | `is_master=true`, nível exatamente 100, empresa nula, perfil `SUPER_ADMIN` | É a implementação que coincide com o literal normativo, mas não com os gates frontend/bootstrap |
| `supabase/functions/erp-login/index.ts` | `setup_status` procura `is_master`, nível >=100 ou perfil em MASTER/MASTER_ADMIN/SUPER_ADMIN; também consulta tabela legada `usuarios` | Heurística permissiva e fonte legada podem divergir do contrato exclusivo em `erp_usuarios` |
| `supabase/migrations/20260916141000_align_erp_security_functions_to_auth_identity.sql` | `erp_is_master()` verifica `u.id=auth.uid()` e `u.role` em MASTER/MASTER_ADMIN/SUPER_ADMIN | Usa `role`, não `perfil`; não exige is_master, nível 100, empresa nula, setor nulo ou usuário ativo |
| `docs/ORDEM-MESTRE-SYSNQRA-ERP.md` | Define `SUPER_ADMIN`, `is_master=true`, nível 100, empresa nula | Fonte normativa atual; diverge dos gates que ainda exigem MASTER |

## 3. Pontos de atenção em RLS e autorização

1. As policies que delegam a autorização a `public.erp_is_master()` herdam a semântica da função SQL. No helper lido, a autorização pode ser concedida pelo campo `role` sem validar o conjunto completo de atributos do Master.
2. A coluna `perfil` e a coluna `role` não devem ser tratadas como sinônimos sem confirmação do contrato de dados e das rotinas que as mantêm.
3. `nivel_admin >= 100` aparece em algumas consultas de descoberta/estado do bootstrap como alternativa isolada, o que é mais amplo que uma identidade privilegiada estrita.
4. O login/estado do bootstrap consulta a tabela legada `usuarios`, apesar da diretriz de identidade exclusiva em `erp_usuarios`.
5. Os gates de tela e as Edge Functions não compartilham hoje uma única função/contrato tipado verificável.

## 4. Alinhamento futuro recomendado — não executado

- Formalizar um único predicado de Master: auth.uid() vinculado ao registro ativo em `erp_usuarios`; `is_master=true`; `perfil='SUPER_ADMIN'`; `nivel_admin=100`; `empresa_id IS NULL`; `setor_id IS NULL`; `deleted_at IS NULL`.
- Alinhar `AuthProfile`, `AppBootstrap`, `IndustrialLoginDirect`, `erp-master-bootstrap`, `erp-user-admin`, `erp-login` e os helpers SQL ao mesmo predicado.
- Remover somente após plano de compatibilidade e testes a descoberta privilegiada por nível isolado, aliases MASTER/MASTER_ADMIN e fallback de tabela legada.
- Antes de qualquer alteração futura no banco: comparar todas as policies/RPCs que chamam `erp_is_master()`, testar isolamento multiempresa e preparar migration versionada, revisão e rollback.
- Criar testes positivos/negativos para cada atributo isolado, incluindo perfil errado, nível 99/100, is_master falso, empresa não nula, setor não nulo, usuário inativo e soft-delete.

## 5. Limites desta auditoria

- Supabase consultado somente por listagem de tabelas/colunas e metadados; não foi executado SQL de escrita nem migration.
- A listagem de tabelas confirmou a existência de RLS habilitado em tabelas retornadas, mas esta auditoria não constitui prova de que todas as policies remotas estejam corretas.
- Não foi executado build local, type-check, lint, E2E ou deploy nesta sessão. Não declarar release aprovado até executar os gates do repositório.
- A leitura de código cobre os arquivos listados e as ocorrências localizadas no commit-base; uma revisão integral de todas as policies/RPCs e de todos os módulos continua necessária antes de alterar a identidade Master.
