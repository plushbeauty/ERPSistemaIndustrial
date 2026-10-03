create table if not exists public.erp_tabela_precos_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  cnpj_cliente varchar(14) not null check (cnpj_cliente ~ '^[0-9]{14}$'),
  sku_produto text not null,
  preco_especial numeric(18,6) not null check (preco_especial >= 0),
  validade_tabela date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, cliente_id, produto_id)
);

create index if not exists idx_erp_tabela_precos_cliente_busca
on public.erp_tabela_precos_cliente(empresa_id, cliente_id, produto_id, validade_tabela);

alter table public.erp_tabela_precos_cliente enable row level security;
drop policy if exists erp_tabela_precos_cliente_select on public.erp_tabela_precos_cliente;
drop policy if exists erp_tabela_precos_cliente_write on public.erp_tabela_precos_cliente;
create policy erp_tabela_precos_cliente_select on public.erp_tabela_precos_cliente
for select to authenticated using (empresa_id = public.erp_current_empresa_id());
create policy erp_tabela_precos_cliente_write on public.erp_tabela_precos_cliente
for all to authenticated using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_preco_especial_cliente(p_cliente_id uuid, p_produto_id uuid)
returns numeric
language sql security invoker set search_path=pg_catalog,public
as $$
  select t.preco_especial
  from public.erp_tabela_precos_cliente t
  where t.empresa_id = public.erp_current_empresa_id()
    and t.cliente_id = p_cliente_id
    and t.produto_id = p_produto_id
    and t.validade_tabela >= current_date
  order by t.validade_tabela asc, t.updated_at desc
  limit 1
$$;
revoke all on function public.erp_preco_especial_cliente(uuid,uuid) from public, anon;
grant execute on function public.erp_preco_especial_cliente(uuid,uuid) to authenticated;

create or replace function public.erp_calcular_preco_sugerido_venda(p_cliente_id uuid,p_produto_id uuid)
returns table(custo_processo numeric,fator_markup numeric,preco_sugerido numeric,operacoes integer)
language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare v_empresa uuid := public.erp_current_empresa_id(); v_ficha uuid; v_especial numeric;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo=true) then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa and ativo=true) then raise exception 'Produto inválido para a empresa atual.'; end if;
  select public.erp_preco_especial_cliente(p_cliente_id,p_produto_id) into v_especial;
  select f.id into v_ficha from public.erp_fichas_processo f where f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativo=true order by f.updated_at desc,f.created_at desc limit 1;
  return query
  select round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0),2),
    greatest(coalesce(c.fator_markup_comercial,1),0),
    coalesce(v_especial,round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0)*greatest(coalesce(c.fator_markup_comercial,1),0),2)),
    count(o.id)::integer
  from public.erp_clientes c
  left join public.erp_ficha_processo_operacoes o on o.empresa_id=v_empresa and o.ficha_processo_id=v_ficha
  left join public.erp_maquinas m on m.id=o.posto_trabalho_id and m.empresa_id=v_empresa
  where c.id=p_cliente_id and c.empresa_id=v_empresa;
end;
$$;
revoke all on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) from public,anon;
grant execute on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) to authenticated;
