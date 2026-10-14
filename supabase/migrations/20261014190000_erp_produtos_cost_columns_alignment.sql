-- Alinha o schema real ao tipo Product usado por ProdutosVendasIndustrial.tsx.
-- Campos são de leitura no formulário; não devem ser gravados pelo payload do cadastro.
alter table public.erp_produtos
  add column if not exists custo_medio numeric(18,6) not null default 0,
  add column if not exists custo_ultimo numeric(18,6) not null default 0,
  add column if not exists custo_fabricacao numeric(18,6) not null default 0;

comment on column public.erp_produtos.custo_medio is 'Custo médio calculado pelo fluxo de estoque; não editável no cadastro mestre.';
comment on column public.erp_produtos.custo_ultimo is 'Último custo de entrada confirmado; não editável no cadastro mestre.';
comment on column public.erp_produtos.custo_fabricacao is 'Custo de fabricação proveniente da engenharia/custeio; não editável no cadastro mestre.';
