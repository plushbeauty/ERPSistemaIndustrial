alter table public.erp_fichas_tecnicas
  add column if not exists codigo text,
  add column if not exists titulo text,
  add column if not exists descricao text,
  add column if not exists status text not null default 'rascunho',
  add column if not exists revisao text not null default '1';

alter table public.erp_ficha_operacoes
  add column if not exists parametro_nominal text,
  add column if not exists tolerancia_min text,
  add column if not exists tolerancia_max text,
  add column if not exists unidade text,
  add column if not exists instrumento text,
  add column if not exists criterio_aceitacao text,
  add column if not exists observacoes text;