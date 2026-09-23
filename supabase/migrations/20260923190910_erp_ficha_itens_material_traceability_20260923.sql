alter table public.erp_ficha_itens
  add column if not exists unidade_medida text not null default 'UN',
  add column if not exists origem text,
  add column if not exists medida_valor numeric(18,6),
  add column if not exists medida_unidade text;