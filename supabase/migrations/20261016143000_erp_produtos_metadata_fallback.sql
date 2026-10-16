-- Armazenamento tipado de campos adicionais do cadastro mestre de produtos.
-- Os campos com coluna física continuam sendo gravados nas colunas oficiais; somente
-- extensões sem coluna dedicada são armazenadas neste JSONB, sempre por empresa.
alter table public.erp_produtos
  add column if not exists metadados_adicionais jsonb not null default '{}'::jsonb;

comment on column public.erp_produtos.metadados_adicionais is
  'Campos adicionais do cadastro industrial sem coluna física dedicada; não substitui colunas fiscais oficiais.';
