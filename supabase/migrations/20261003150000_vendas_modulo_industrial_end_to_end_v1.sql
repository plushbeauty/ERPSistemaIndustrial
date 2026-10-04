create or replace function public.erp_calcular_preco_sugerido_venda(p_cliente_id uuid, p_produto_id uuid)
returns table(custo_processo numeric, fator_markup numeric, preco_sugerido numeric, operacoes integer)
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ficha uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo) then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if not exists(select 1 from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa and ativo) then raise exception 'Produto inválido para a empresa atual.'; end if;
  select f.id into v_ficha from public.erp_fichas_processo f where f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativo order by f.updated_at desc, f.created_at desc limit 1;
  return query
  select round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0),2),
         greatest(coalesce(c.fator_markup_comercial,1),0),
         round(coalesce(sum((o.tempo_minutos/60.0)*m.valor_hora_custo),0)*greatest(coalesce(c.fator_markup_comercial,1),0),2),
         count(o.id)::integer
  from public.erp_clientes c
  left join public.erp_ficha_processo_operacoes o on o.empresa_id=v_empresa and o.ficha_processo_id=v_ficha
  left join public.erp_maquinas m on m.id=o.posto_trabalho_id and m.empresa_id=v_empresa
  where c.id=p_cliente_id and c.empresa_id=v_empresa;
end $$;

revoke execute on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) from public, anon;
grant execute on function public.erp_calcular_preco_sugerido_venda(uuid,uuid) to authenticated;

create or replace function public.erp_reajuste_global_vendas(p_percentual numeric,p_grupo text default null,p_tipo_cliente text default null)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v_empresa uuid := public.erp_current_empresa_id(); v_count integer:=0;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('sales.update')) then raise exception 'Permissão insuficiente para reajuste global de vendas.'; end if;
 if p_percentual <= -100 then raise exception 'Percentual inválido.'; end if;
 update public.erp_produtos p set preco_venda=round(greatest(coalesce(p.preco_venda,0)*(1+(p_percentual/100)),0),4),updated_at=now()
 where p.empresa_id=v_empresa and p.ativo=true and (nullif(trim(p_grupo),'') is null or lower(coalesce(p.grupo,''))=lower(trim(p_grupo)));
 get diagnostics v_count=row_count;
 update public.erp_tabelas_preco_itens i set preco=round(greatest(coalesce(i.preco,0)*(1+(p_percentual/100)),0),4),updated_at=now()
 where i.empresa_id=v_empresa and exists(select 1 from public.erp_produtos p where p.id=i.produto_id and p.empresa_id=v_empresa and p.ativo=true and (nullif(trim(p_grupo),'') is null or lower(coalesce(p.grupo,''))=lower(trim(p_grupo))))
 and (nullif(trim(p_tipo_cliente),'') is null or exists(select 1 from public.erp_clientes c where c.empresa_id=v_empresa and lower(coalesce(c.tipo_cliente,''))=lower(trim(p_tipo_cliente)) and c.tabela_preco_id=i.tabela_preco_id));
 return v_count;
end $$;

revoke execute on function public.erp_reajuste_global_vendas(numeric,text,text) from public, anon;
grant execute on function public.erp_reajuste_global_vendas(numeric,text,text) to authenticated;

create or replace function public.erp_reajuste_global_postos_trabalho(p_percentual numeric)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v_empresa uuid := public.erp_current_empresa_id(); v_count integer;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('production.update')) then raise exception 'Permissão insuficiente para reajuste de custo industrial.'; end if;
 if p_percentual <= -100 then raise exception 'Percentual inválido.'; end if;
 update public.erp_maquinas set valor_hora_custo=round(greatest(coalesce(valor_hora_custo,0)*(1+(p_percentual/100)),0),4),updated_at=now() where empresa_id=v_empresa and ativo=true;
 get diagnostics v_count=row_count; return v_count;
end $$;

revoke execute on function public.erp_reajuste_global_postos_trabalho(numeric) from public, anon;
grant execute on function public.erp_reajuste_global_postos_trabalho(numeric) to authenticated;

create index if not exists idx_erp_produtos_empresa_grupo on public.erp_produtos(empresa_id,grupo);
create index if not exists idx_erp_ficha_operacoes_empresa_ficha on public.erp_ficha_processo_operacoes(empresa_id,ficha_processo_id);
create index if not exists idx_erp_pedidos_venda_empresa_numero on public.erp_pedidos_venda(empresa_id,numero desc);