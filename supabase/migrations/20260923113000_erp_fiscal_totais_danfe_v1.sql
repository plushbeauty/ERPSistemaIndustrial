/*
  Fiscal NF-e / DANFE v1
  Totais fiscais persistidos no documento e origem fiscal por item.
*/
alter table public.erp_documentos_fiscais
  add column if not exists valor_produtos numeric(18,2) not null default 0,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_outras_despesas numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists base_calculo_icms numeric(18,2) not null default 0,
  add column if not exists valor_icms numeric(18,2) not null default 0,
  add column if not exists valor_ipi numeric(18,2) not null default 0,
  add column if not exists valor_pis numeric(18,2) not null default 0,
  add column if not exists valor_cofins numeric(18,2) not null default 0,
  add column if not exists valor_liquido numeric(18,2) not null default 0;

alter table public.erp_documentos_fiscais_itens
  add column if not exists origem text default '0';

create index if not exists ix_erp_documentos_fiscais_empresa_status
  on public.erp_documentos_fiscais(empresa_id,status,created_at desc);

create index if not exists ix_erp_notas_fiscais_empresa_chave
  on public.erp_notas_fiscais(empresa_id,chave_acesso)
  where chave_acesso is not null;
