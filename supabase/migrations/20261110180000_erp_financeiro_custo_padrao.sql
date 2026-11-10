begin;
create table if not exists public.erp_financeiro_custo_padrao (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 produto_id uuid not null references public.erp_produtos(id) on delete restrict,
 produto_codigo text not null, produto_nome text not null,
 mrp_run_id uuid references public.erp_mrp_runs(id) on delete set null,
 maquina_id uuid references public.erp_maquinas(id) on delete set null,
 maquina_codigo text,
 quantidade_base numeric(18,6) not null check (quantidade_base > 0),
 ciclo_segundos numeric(18,4) not null default 0 check (ciclo_segundos >= 0),
 margem_percentual numeric(8,4) not null check (margem_percentual >= 0 and margem_percentual < 100),
 custo_materiais numeric(18,6) not null default 0,
 custo_fabricacao numeric(18,6) not null default 0,
 custo_maquina numeric(18,6) not null default 0,
 custo_total numeric(18,6) not null,
 preco_venda numeric(18,6) not null,
 componentes jsonb not null default '[]'::jsonb,
 criado_por uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists ix_erp_fin_custo_padrao_empresa_data on public.erp_financeiro_custo_padrao(empresa_id,created_at desc);
create index if not exists ix_erp_fin_custo_padrao_produto on public.erp_financeiro_custo_padrao(empresa_id,produto_id,created_at desc);
alter table public.erp_financeiro_custo_padrao enable row level security;
drop policy if exists erp_financeiro_custo_padrao_tenant on public.erp_financeiro_custo_padrao;
create policy erp_financeiro_custo_padrao_tenant on public.erp_financeiro_custo_padrao
for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (
 (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
 and exists(select 1 from public.erp_produtos p where p.id=produto_id and ((p.empresa_id=public.erp_current_empresa_id()) or public.erp_is_master()))
 and (maquina_id is null or exists(select 1 from public.erp_maquinas m where m.id=maquina_id and ((m.empresa_id=public.erp_current_empresa_id()) or public.erp_is_master())))
);
grant select,insert on public.erp_financeiro_custo_padrao to authenticated;

-- O preço do produto só pode ser atualizado por administrador master ou usuário com permissão específica.
drop policy if exists erp_produtos_update_custo_padrao on public.erp_produtos;
create policy erp_produtos_update_custo_padrao on public.erp_produtos
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('financeiro.custo_padrao.editar')))
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('financeiro.custo_padrao.editar')));
grant update on public.erp_produtos to authenticated;

commit;