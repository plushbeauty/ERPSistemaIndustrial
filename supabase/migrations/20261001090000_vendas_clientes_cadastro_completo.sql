-- Cadastro comercial/fiscal completo de clientes para Vendas.
alter table public.erp_clientes
  add column if not exists nome_fantasia text,
  add column if not exists contato_nome text,
  add column if not exists email_nfe text,
  add column if not exists whatsapp text,
  add column if not exists cep text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists inscricao_municipal text,
  add column if not exists regime_tributario text,
  add column if not exists tipo_pessoa text not null default 'PJ';

alter table public.erp_clientes
  drop constraint if exists erp_clientes_tipo_pessoa_check;
alter table public.erp_clientes
  add constraint erp_clientes_tipo_pessoa_check
  check (tipo_pessoa in ('PF','PJ'));

create index if not exists idx_erp_clientes_empresa_documento
  on public.erp_clientes(empresa_id, documento);
