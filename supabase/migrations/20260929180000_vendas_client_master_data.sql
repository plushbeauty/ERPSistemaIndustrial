/* Desenvolvedor: FernandoSch */
/* Cadastro comercial de clientes — identificação, contato, endereço e crédito. */
alter table public.erp_clientes
  add column if not exists cep text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists pais text default 'BRASIL',
  add column if not exists contato_nome text,
  add column if not exists contato_cargo text,
  add column if not exists contato_email text,
  add column if not exists contato_telefone text,
  add column if not exists contato_whatsapp text,
  add column if not exists inscricao_estadual text,
  add column if not exists inscricao_municipal text,
  add column if not exists condicao_pagamento text,
  add column if not exists limite_credito numeric(18,2) not null default 0 check (limite_credito >= 0),
  add column if not exists observacoes text;
create index if not exists idx_erp_clientes_empresa_cnpj on public.erp_clientes(empresa_id, documento);
create index if not exists idx_erp_clientes_empresa_nome on public.erp_clientes(empresa_id, nome);
