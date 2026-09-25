-- Lookup de engenharia: material pesquisável no cadastro de produtos.
alter table public.erp_produtos add column if not exists material text;
create index if not exists idx_erp_produtos_empresa_material on public.erp_produtos (empresa_id, material);
