# Execução autônoma — ERP Industrial — 2026-09-12

## Referência arquitetural aplicada

A implementação segue o padrão de SaaS multi-tenant observado em templates open source de Supabase: identidade no Supabase Auth, vínculo explícito usuário → empresa, RLS no banco, autorização por papel/permissão e funções de resolução de tenant protegidas. Não foi introduzido outro provedor de identidade.

## Etapas executadas/verificadas

- 3 — RLS/multiempresa: 101/101 tabelas `erp_*` com RLS; 0 políticas `public`/`anon` nas tabelas ERP.
- 4 — Integridade: 0 FK `NOT VALID` nas tabelas ERP.
- 5 — Segurança de funções: funções críticas sem execução anon; `erp_resolver_login` restrita a `service_role`; `search_path` fixado nas funções críticas alteradas.
- 6 — RH: estrutura existente e integrada ao ERP.
- 7 — PCP: estrutura existente e integrada à operação.
- 8 — Estoque: índices tenant-aware; movimentos de estoque sem DELETE para clientes; validação atual encontrou 0 movimentos com quantidade negativa.
- 9 — Compras: índices tenant-aware para compras, itens e solicitações; relacionamentos tenant-aware já existentes foram validados anteriormente.
- 10 — Qualidade/SGQ: FMEA/RPNC/Não Conformidades com índices tenant-aware; RPN inválido encontrado: 0.
- 11 — Calibração/manutenção: índices por empresa e vencimento/status adicionados.
- 12 — Documentos/Fiscal: índice por empresa/data adicionado e isolamento mantido por RLS.
- 15 — Dashboard: estrutura de dashboard industrial existente; indicadores devem consumir dados reais do tenant autenticado.
- 16 — Master: funções de administração master permanecem separadas do acesso comum.
- 17 — Rotas: rotas protegidas existentes em `AppEntryV2` e páginas operacionais protegidas por sessão.
- 18 — UI/UX: design system e telas industriais existentes mantidos; não houve troca cega de layout.
- 19 — Segurança frontend: frontend não recebe `service_role`; sessão é estabelecida pelo Supabase Auth.
- 20 — Performance: índices de empresa/status/data adicionados nos módulos de maior leitura.
- 21 — Tratamento de erros: boundaries e mensagens de falha de autenticação já existentes foram preservados.
- 22 — Auditoria de botões: script `audit:interactions` permanece no CI.
- 23 — Dependências: workflow instala dependências e executa TypeScript/build.
- 24 — TypeScript: workflow executa `npm run type-check` antes do build.
- 25 — Build: workflow executa `npm run build`.
- 26 — GitHub Actions: workflow em `.github/workflows/build.yml` executa TypeScript, auditoria e build em push/PR para `main`.
- 27 — Vercel: produção foi observada como READY antes desta nova sequência; novos commits dependem da execução automática do próximo deployment.
- 28 — Teste real: banco foi consultado diretamente; login foi corrigido para o contrato atual sem setor.
- 29 — Auditoria final: pontos críticos de tenant/RLS/FK/execute foram rechecados.
- 30 — Documentação: este documento registra o estado verificável desta execução.

## Correção crítica de login realizada

O frontend já enviava `empresa + identificador + senha`, sem setor. A Edge Function ainda exigia setor e chamava a função SQL antiga com três parâmetros. Isso foi corrigido.

Foi criada a resolução segura `public.erp_resolver_login(text,text)`, que exige empresa ativa, usuário ativo, `auth_user_id` e e-mail, e resolve o usuário somente dentro da empresa informada.

A Edge Function `erp-login` foi atualizada no GitHub e publicada no Supabase como versão 4. O `service_role` permanece somente no servidor da Edge Function. A função continua sem exigir JWT porque ela é o ponto de entrada da autenticação por senha; a própria função valida empresa/usuário e autentica a senha no Supabase Auth.

O CORS da função passou a usar `ERP_ALLOWED_ORIGIN`, com fallback para a URL oficial de produção, em vez de `*`.

## CI atual

O workflow usa Node 24 e executa:

1. `npm install`
2. `npm run type-check`
3. `npm run audit:interactions`
4. `npm run build`

## Pendência operacional que não será mascarada

O novo commit precisa concluir o ciclo automático GitHub → Vercel. Um deployment anterior de produção estava READY, mas isso não prova que o commit recém-criado já tenha terminado o novo deployment. O status deve ser lido novamente após a execução automática.

Também não é correto afirmar que toda regra de negócio do ERP está homologada apenas pela existência das tabelas. A homologação funcional completa exige executar fluxos com usuários reais de diferentes empresas e permissões.
