-- Hardening seguro e idempotente para o ERP Industrial.
-- Não remove dados nem altera políticas existentes sem inspeção.

create index if not exists idx_erp_estoque_movimentos_produto_created
  on public.erp_estoque_movimentos (produto_id, created_at desc);

create index if not exists idx_erp_pagamentos_empresa_created
  on public.erp_pagamentos (empresa_id, created_at desc);

create index if not exists idx_erp_venda_itens_venda
  on public.erp_venda_itens (venda_id);

create index if not exists idx_erp_usuarios_auth_empresa
  on public.erp_usuarios (auth_user_id, empresa_id)
  where auth_user_id is not null;

create index if not exists idx_erp_usuarios_empresa_ativo
  on public.erp_usuarios (empresa_id, ativo);

create index if not exists idx_erp_empresas_ativo
  on public.erp_empresas (ativo);

-- Garante que as funções de timestamp não possam ser chamadas por clientes.
revoke all on function public.erp_set_updated_at() from public, anon, authenticated;
revoke all on function public.erp_touch_fiscal_updated_at() from public, anon, authenticated;

-- Funções auxiliares permanecem invocáveis apenas pelo mecanismo de trigger.
