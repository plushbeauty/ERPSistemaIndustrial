-- SYSNQRA ERP INDUSTRIAL
-- Compatibiliza o cadastro de usuários com o fluxo de administração de acessos.
-- A coluna é opcional e não altera identidade, tenant, RBAC ou políticas RLS.

begin;

alter table public.erp_usuarios
  add column if not exists matricula text;

comment on column public.erp_usuarios.matricula is
  'Matrícula funcional opcional vinculada ao cadastro de acesso do usuário ERP.';

commit;
