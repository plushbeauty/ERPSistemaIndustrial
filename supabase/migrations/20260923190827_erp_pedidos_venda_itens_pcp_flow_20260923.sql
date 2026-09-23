begin;
create table if not exists public.erp_pedidos_venda_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_id uuid not null references public.erp_pedidos_venda(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  descricao text not null,
  quantidade numeric(18,6) not null check (quantidade > 0),
  valor_unitario numeric(18,6) not null default 0 check (valor_unitario >= 0),
  desconto numeric(18,6) not null default 0 check (desconto >= 0),
  total numeric(18,6) not null default 0
);
create index if not exists idx_erp_pedido_venda_itens_empresa_pedido on public.erp_pedidos_venda_itens(empresa_id,pedido_id);
create index if not exists idx_erp_pedido_venda_itens_empresa_produto on public.erp_pedidos_venda_itens(empresa_id,produto_id);
alter table public.erp_pedidos_venda_itens enable row level security;
drop policy if exists erp_pedidos_venda_itens_select on public.erp_pedidos_venda_itens;
drop policy if exists erp_pedidos_venda_itens_insert on public.erp_pedidos_venda_itens;
drop policy if exists erp_pedidos_venda_itens_update on public.erp_pedidos_venda_itens;
drop policy if exists erp_pedidos_venda_itens_delete on public.erp_pedidos_venda_itens;
create policy erp_pedidos_venda_itens_select on public.erp_pedidos_venda_itens for select to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_venda_itens_insert on public.erp_pedidos_venda_itens for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_venda_itens_update on public.erp_pedidos_venda_itens for update to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_pedidos_venda_itens_delete on public.erp_pedidos_venda_itens for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
commit;