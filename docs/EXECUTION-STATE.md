# Estado de Execução — ERP Industrial

**Última atualização:** 2026-09-18/19 — auditoria automática

## BLOCO ATUAL
**Auditoria total — bootstrap, login universal, banco compartilhado e deploy**

## EVIDÊNCIAS CONFIRMADAS
- Repositório oficial: `plushbeauty/ERPSistemaIndustrial`, branch `main`.
- Projeto Vercel: `erp-sistema-industrial`.
- Produção atual consultada: HTTP 200.
- Deployment mais recente observado: READY, commit `ffc173417b8b23eed1ed7fa90ab12ed5d4605824`.
- GitHub/Vercel status do commit `ffc173417b8b23eed1ed7fa90ab12ed5d4605824`: Vercel success.
- `erp-login` publicado no Supabase: versão 25, ACTIVE, `verify_jwt=false` por manter autenticação customizada da função.
- `erp-login` foi alinhado ao GitHub e agora reconhece o Master universal existente em `public.usuarios`, sem exigir seleção de segmento nem vínculo obrigatório a uma empresa para o Master.
- `src/main.tsx` foi corrigido para montar React sem aguardar limpeza de Service Worker/Cache e para exibir o erro real caso o import de `AppBootstrap` falhe.
- O bundle de produção contém o bootstrap v9 e o chunk `AppBootstrap`; o chunk contém os textos da tela de login/cadastro.
- As migrations de odontologia aplicadas no banco e ausentes do Git foram reconciliadas como artefatos no GitHub dos dois repositórios, sem replay destrutivo de DDL.

## BANCO / SUPABASE
Projeto: `wdkvrqekixczuhrfygen`.

Migrations odontológicas confirmadas como aplicadas:
- 20260918130023 — odonto_atendimento_integracao_v1
- 20260918142302 — odonto_radiologia_metadata_v1
- 20260918142311 — odonto_radiologia_data_v1
- 20260918151543 — odonto_prontuario_anamnese_tratamentos_v2
- 20260918193518 — erp_empresa_documento_cpf_cnpj

Tabelas odontológicas presentes:
- odonto_anamneses
- odonto_atendimentos
- odonto_imagens_clinicas
- odonto_odontograma
- odonto_tratamento_itens
- odonto_tratamentos

As tabelas odontológicas possuem `empresa_id` e policies de tenant/master verificadas no banco.

## AUTH / MASTER
- `public.usuarios`: 1 registro ativo e 1 Master.
- `public.erp_usuarios`: atualmente não há usuário ERP ativo; o único registro existente está inativo/deletado.
- Isso explica por que o fluxo antigo baseado exclusivamente em `erp_usuarios` não conseguia autenticar o proprietário.
- Correção aplicada: `erp-login` consulta o Master universal de `usuarios` e autentica esse usuário normalmente por Supabase Auth, retornando perfil `MASTER`/universal sem exigir empresa ou segmento.

## SEGURANÇA
- `current_empresa_id()` foi verificada: deriva empresa do usuário autenticado em `public.usuarios`.
- `is_master_user()` foi verificada: reconhece Master em `erp_usuarios` e em `usuarios`.
- Policies de `clientes` e das tabelas odontológicas foram inspecionadas.
- O Supabase Advisor ainda reporta muitos WARNs históricos (funções SECURITY DEFINER executáveis, políticas anon em tabelas que podem ser públicas por desenho e proteção contra senhas vazadas desativada). Eles não foram mascarados como PASS e exigem revisão individual antes do E2E final.

## E2E
Ainda NÃO APROVADO.
Bloqueios atuais:
1. Não há usuário ERP ativo dedicado para um teste autenticado convencional; o Master universal existe em `usuarios`.
2. Não foi possível obter uma execução de navegador autenticado com console/DOM através das ferramentas atualmente expostas; por isso não será inventado um PASS visual.
3. RLS A/B com sessão JWT real ainda precisa de execução autenticada real.
4. CRUD completo dos dois produtos ainda não foi homologado item a item.

## PLUSH BEAUTY
- Produção/Vercel está com histórico recente de deployments ERROR.
- A causa do build foi confirmada no nível do deployment: `npm run build` saiu com código 2 e `lint_or_type_error`.
- O commit que introduziu a exigência de type-check foi `dcb5ae93adc4729032671833ff39cd00a84da88b`; a falha atual é compatível com erros TypeScript que antes não bloqueavam o build.
- GitHub Actions no commit mais recente também está em FAILURE.
- Não declarar Build/Deploy PASS até identificar e corrigir os erros TypeScript reais.

## PRÓXIMAS AÇÕES OBRIGATÓRIAS
1. Corrigir os erros TypeScript reais do Plush Beauty e repetir GitHub Actions + Vercel.
2. Validar assets HTTP 200 no deployment READY final.
3. Executar sessão Master universal real no ERP.
4. Executar RLS A/B com JWT real.
5. Auditar CRUDs críticos.
6. Executar E2E autenticado e atualizar este documento somente com evidência.
