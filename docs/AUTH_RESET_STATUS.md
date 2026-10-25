# Auth reset status — revisado em 2026-10-16

## Contrato vigente

- Login do navegador: Supabase Auth `signInWithPassword`.
- Perfil de autorização canônico: `erp_usuarios`, vinculado por `auth_user_id`.
- Usuário comum: registro ativo, não excluído, com `empresa_id` e empresa ativa.
- Master: `is_master=true`, `perfil=MASTER`, `nivel_admin>=100`, `empresa_id=NULL` e `setor_id=NULL`.
- A Edge Function `erp-master-bootstrap` é responsável pelo provisionamento inicial Master; a função legada `erp-login` não realiza o login normal.
- Projeto Supabase esperado: `zsklkydlawgvwgnvxwwx`.
- O cliente usa `sessionStorage`, a chave `erp-industrial-auth` e renovação automática gerenciada pelo SDK. A autorização nunca deve depender de `localStorage`.
- A chave administrativa deve permanecer apenas nos segredos do ambiente server-side/Edge Function.

## Auditoria de 2026-10-16

- Removido do guard de rotas o fallback para a tabela alternativa `usuarios` como fonte de autorização.
- Alinhada a validação de Master no guard com o contrato completo, incluindo `setor_id`.
- Protegida a hidratação de perfil contra respostas assíncronas fora de ordem e adiada a hidratação acionada por `onAuthStateChange` para evitar chamadas Supabase dentro do callback de Auth.
- Documentado o fluxo detalhado em [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md).

## Estado de validação

As alterações foram registradas na branch `fix/auth-flow-contract-2026-10-16`. Até que CI, type-check, lint, build, verificações de contrato, teste de login real, RLS entre empresas e deploy sejam concluídos, não considerar a autenticação nem a produção como GREEN. Um commit remoto, por si só, não comprova validação runtime.
