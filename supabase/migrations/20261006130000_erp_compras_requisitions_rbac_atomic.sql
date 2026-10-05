drop policy if exists erp_requisicoes_compra_select on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_insert on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_update on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_delete on public.erp_requisicoes_compra;

create policy erp_requisicoes_compra_select
on public.erp_requisicoes_compra
for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'ver'))
);

create policy erp_requisicoes_compra_insert
on public.erp_requisicoes_compra
for insert to authenticated
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'criar'))
);

create policy erp_requisicoes_compra_update
on public.erp_requisicoes_compra
for update to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'editar'))
)
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'editar'))
);

create policy erp_requisicoes_compra_delete
on public.erp_requisicoes_compra
for delete to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'excluir'))
);

drop policy if exists erp_requisicoes_compra_itens_select on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_insert on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_update on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_delete on public.erp_requisicoes_compra_itens;

create policy erp_requisicoes_compra_itens_select
on public.erp_requisicoes_compra_itens
for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'ver'))
);

create policy erp_requisicoes_compra_itens_insert
on public.erp_requisicoes_compra_itens
for insert to authenticated
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'criar'))
);

create policy erp_requisicoes_compra_itens_update
on public.erp_requisicoes_compra_itens
for update to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'editar'))
)
with check (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'editar'))
);

create policy erp_requisicoes_compra_itens_delete
on public.erp_requisicoes_compra_itens
for delete to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  and (public.erp_is_master() or public.erp_has_permission('compras', 'excluir'))
);

create or replace function public.erp_compras_encaminhar_requisicoes(p_requisicao_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_locked integer;
  v_updated integer;
begin
  if v_empresa_id is null or auth.uid() is null then
    raise exception 'Empresa ou sessão não identificada.';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('compras', 'editar')) then
    raise exception 'Sem permissão para encaminhar requisições de compra.';
  end if;
  if p_requisicao_ids is null
    or cardinality(p_requisicao_ids) = 0
    or cardinality(p_requisicao_ids) <> (
      select count(distinct requisicao_id)::integer
      from unnest(p_requisicao_ids) as input(requisicao_id)
    )
  then
    raise exception 'Selecione uma lista não vazia de requisições sem duplicidade.';
  end if;

  perform r.id
  from public.erp_requisicoes_compra r
  where r.id = any(p_requisicao_ids)
    and r.empresa_id = v_empresa_id
  order by r.id
  for update;
  get diagnostics v_locked = row_count;
  if v_locked <> cardinality(p_requisicao_ids) then
    raise exception 'Uma ou mais requisições não pertencem à empresa atual.';
  end if;
  perform i.id
  from public.erp_requisicoes_compra_itens i
  where i.requisicao_id = any(p_requisicao_ids)
    and i.empresa_id = v_empresa_id
  order by i.id
  for update;
  if exists (
    select 1
    from public.erp_requisicoes_compra r
    where r.id = any(p_requisicao_ids)
      and r.empresa_id = v_empresa_id
      and r.status <> 'AGUARDANDO_COTACAO'
  ) then
    raise exception 'Todas as requisições selecionadas devem estar aguardando cotação.';
  end if;
  if exists (
    select 1
    from public.erp_requisicoes_compra r
    where r.id = any(p_requisicao_ids)
      and r.empresa_id = v_empresa_id
      and not exists (
        select 1 from public.erp_requisicoes_compra_itens i
        where i.requisicao_id = r.id and i.empresa_id = v_empresa_id
      )
  ) then
    raise exception 'Não é possível encaminhar uma requisição sem itens.';
  end if;

  update public.erp_requisicoes_compra
  set status = 'PEDIDO_ENVIADO', updated_at = now()
  where id = any(p_requisicao_ids)
    and empresa_id = v_empresa_id
    and status = 'AGUARDANDO_COTACAO';
  get diagnostics v_updated = row_count;
  if v_updated <> cardinality(p_requisicao_ids) then
    raise exception 'Não foi possível atualizar todas as requisições selecionadas.';
  end if;

  update public.erp_requisicoes_compra_itens
  set status = 'PEDIDO_ENVIADO'
  where requisicao_id = any(p_requisicao_ids)
    and empresa_id = v_empresa_id;

  return v_updated;
end;
$$;

revoke all on function public.erp_compras_encaminhar_requisicoes(uuid[]) from public, anon;
grant execute on function public.erp_compras_encaminhar_requisicoes(uuid[]) to authenticated;
