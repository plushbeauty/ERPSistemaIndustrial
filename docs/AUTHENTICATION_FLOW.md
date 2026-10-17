# Autenticação do ERP Industrial — fluxo e contrato atual

**Revisado em:** 2026-10-16  
**Escopo:** frontend React/TypeScript, Supabase Auth, perfil ERP, sessão, credenciais e tokens.

## Componentes responsáveis

- `src/lib/supabaseClient.ts`: cria o cliente Supabase a partir de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (com compatibilidade legada para `VITE_SUPABASE_ANON_KEY`). Falha explicitamente se as variáveis necessárias estiverem ausentes; não deve conter chave `service_role` ou `sb_secret_*`.
- `src/IndustrialLoginDirect.tsx`: executa `supabase.auth.signInWithPassword`, valida o perfil ERP ativo, valida a empresa dos usuários comuns, aplica o contrato estrito do Master e encaminha para o destino autorizado. Também inicia a recuperação com `resetPasswordForEmail`.
- `src/auth/AuthProvider.tsx`: observa a sessão e hidrata o perfil autenticado a partir de `erp_usuarios`. Uma falha de perfil bloqueia o acesso; não cria perfil fictício.
- `src/auth/AuthProfile.ts`: converte o registro do banco em um tipo de perfil autorizado e rejeita identidades incompletas/inconsistentes.
- `src/AppBootstrap.tsx`: protege rotas privadas verificando sessão, vínculo com `erp_usuarios`, identidade Master ou empresa ativa. O registro canônico de autorização é `erp_usuarios`; não deve haver fallback para uma tabela alternativa para conceder acesso.
- `supabase/functions/erp-master-bootstrap/index.ts`: fluxo de provisionamento inicial Master no servidor. A chave administrativa é lida somente de variáveis de ambiente da Edge Function.
- `scripts/verify-auth-master-contract.mjs`: verifica o alinhamento do contrato Master entre perfil, login e migration.

## Fluxo de requisição

1. O navegador cria o cliente Supabase com URL e chave pública de ambiente.
2. A tela de login envia e-mail e senha ao Supabase Auth por `signInWithPassword`. A senha não deve ser gravada em tabelas ERP, logs ou armazenamento local da aplicação.
3. Após autenticação, o frontend usa o identificador retornado pelo Auth para procurar `erp_usuarios.auth_user_id`, exigindo `ativo = true` e `deleted_at IS NULL`.
4. Para usuário comum, exige `empresa_id` e uma linha ativa correspondente em `erp_empresas`. O acesso aos dados continua sujeito a RLS e às permissões no banco; uma rota protegida não substitui essas políticas.
5. Master só é válido quando `is_master = true`, `perfil = 'MASTER'`, `nivel_admin >= 100`, `empresa_id IS NULL` e `setor_id IS NULL`. Uma identidade elevada que não satisfaça todos os requisitos é negada.
6. A sessão é usada nas requisições subsequentes. O SDK envia o token de acesso e trata a renovação; as operações sensíveis também precisam validar identidade e autorização no servidor/banco.
7. Ao sair, `supabase.auth.signOut()` encerra a sessão local do SDK.

## Credenciais, sessão e tokens

- `VITE_SUPABASE_URL` e a chave pública `VITE_SUPABASE_PUBLISHABLE_KEY` são configurações do cliente. Uma chave pública não substitui RLS.
- Chaves administrativas (`service_role`, `sb_secret_*`) nunca podem ser incorporadas ao bundle frontend. Devem existir apenas em segredos de ambiente do servidor/Edge Function.
- O cliente usa `storageKey: 'erp-industrial-auth'` e `sessionStorage`, com `persistSession: true` e `autoRefreshToken: true`. Isso limita a persistência ao contexto de sessão do navegador; não é autorização por si só.
- O cliente remove a chave legada de `localStorage` para evitar reutilizar uma sessão antiga. Não se deve usar `localStorage` como fonte de autorização.
- `access_token` é um bearer token de curta duração; `refresh_token` permite renovar a sessão conforme as regras do Supabase. Não registrar nem expor os valores desses tokens em mensagens de erro, analytics ou logs.
- Chamadas de Edge Function devem exigir uma sessão válida e validar autorização no servidor. A chave pública e o cabeçalho Authorization não tornam uma operação automaticamente autorizada.
- Nunca confiar em e-mail, perfil, `empresa_id` ou `is_master` enviados pelo navegador sem consultar/validar o vínculo autenticado e aplicar RLS/RBAC no banco.

## Tratamento de erros e verificação

- Erro de login do Auth é diferente de erro de leitura de `erp_usuarios`. Um HTTP 400 durante a hidratação pode indicar coluna/tabela incompatível, filtros inválidos ou erro PostgREST; confirmar a mensagem e o esquema real antes de alterar o contrato.
- Se a leitura do perfil falhar, o sistema deve falhar fechado e não permitir acesso por fallback.
- A validação estática não prova que migrations foram aplicadas no Supabase remoto nem que RLS, GRANTs, credenciais de ambiente ou login real funcionam.
- Validar alterações com `npm run type-check`, `npm run lint:check`, `npm run verify:auth-master-contract`, `npm run audit:all`, `npm run build` e `npm run verify-routes`, além de testes reais de login, logout, refresh e isolamento RLS entre empresas.
- Não declarar produção aprovada até confirmar os checks do commit, deploy e teste de fumaça real.

## Alterações de auditoria em 2026-10-16

- O guard de rotas deixou de consultar a tabela alternativa `usuarios` como caminho para conceder acesso Master. A identidade autorizada vem de `erp_usuarios`.
- A validação Master do guard exige o conjunto completo de atributos e carrega `setor_id` explicitamente.
- A hidratação do `AuthProvider` foi protegida contra respostas assíncronas fora de ordem; a hidratação disparada por `onAuthStateChange` é adiada para não executar chamadas Supabase enquanto o callback de Auth pode manter o lock interno.
- Essas alterações ainda precisam passar pela CI e por testes com o projeto Supabase remoto antes de serem consideradas validadas em produção.
