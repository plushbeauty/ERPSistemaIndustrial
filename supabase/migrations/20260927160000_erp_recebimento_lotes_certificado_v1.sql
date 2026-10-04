create table if not exists public.erp_produto_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  saldo_fisico numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, produto_id)
);

create table if not exists public.erp_estoque_lotes_rastreabilidade (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  nf_numero text,
  lote_fornecedor text not null,
  quantidade_inicial numeric not null check (quantidade_inicial > 0),
  quantidade_disponivel numeric not null check (quantidade_disponivel >= 0),
  status_qualidade text not null check (status_qualidade in ('APROVADO','REPROVADO')),
  certificado_path text,
  created_at timestamptz not null default now(),
  unique (empresa_id, produto_id, lote_fornecedor)
);

alter table public.erp_produto_estoque enable row level security;
alter table public.erp_estoque_lotes_rastreabilidade enable row level security;

drop policy if exists "erp_produto_estoque_tenant_select" on public.erp_produto_estoque;
create policy "erp_produto_estoque_tenant_select" on public.erp_produto_estoque for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists "erp_produto_estoque_tenant_insert" on public.erp_produto_estoque;
create policy "erp_produto_estoque_tenant_insert" on public.erp_produto_estoque for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());
drop policy if exists "erp_produto_estoque_tenant_update" on public.erp_produto_estoque;
create policy "erp_produto_estoque_tenant_update" on public.erp_produto_estoque for update to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists "erp_lotes_rastreabilidade_tenant_select" on public.erp_estoque_lotes_rastreabilidade;
create policy "erp_lotes_rastreabilidade_tenant_select" on public.erp_estoque_lotes_rastreabilidade for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists "erp_lotes_rastreabilidade_tenant_insert" on public.erp_estoque_lotes_rastreabilidade;
create policy "erp_lotes_rastreabilidade_tenant_insert" on public.erp_estoque_lotes_rastreabilidade for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.fn_incrementar_saldo_almoxarifado(
  p_empresa_id uuid, p_produto_id uuid, p_qtd numeric
) returns void
language plpgsql security invoker set search_path = pg_catalog, public
as $function$
declare v_empresa_id uuid := public.erp_current_empresa_id();
begin
  if v_empresa_id is null or p_empresa_id is null or p_empresa_id <> v_empresa_id then raise exception 'Empresa do recebimento inválida para a sessão atual.'; end if;
  if p_produto_id is null or p_qtd is null or p_qtd <= 0 then raise exception 'Produto e quantidade devem ser válidos e maiores que zero.'; end if;
  insert into public.erp_produto_estoque (empresa_id, produto_id, saldo_fisico)
  values (v_empresa_id, p_produto_id, p_qtd)
  on conflict (empresa_id, produto_id)
  do update set saldo_fisico = public.erp_produto_estoque.saldo_fisico + excluded.saldo_fisico, updated_at = now();
  update public.erp_produtos set estoque_atual = estoque_atual + p_qtd, updated_at = now()
   where id = p_produto_id and empresa_id = v_empresa_id and ativo = true;
  if not found then raise exception 'Insumo não encontrado ou inativo para a empresa atual.'; end if;
end;
$function$;

revoke execute on function public.fn_incrementar_saldo_almoxarifado(uuid, uuid, numeric) from public;
grant execute on function public.fn_incrementar_saldo_almoxarifado(uuid, uuid, numeric) to authenticated;