begin;

alter table public.erp_ordens_producao
  add column if not exists ordem_sequencia integer,
  add column if not exists pedido_item_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_ordens_producao_pedido_item_id_fkey'
      and conrelid = 'public.erp_ordens_producao'::regclass
  ) then
    alter table public.erp_ordens_producao
      add constraint erp_ordens_producao_pedido_item_id_fkey
      foreign key (pedido_item_id)
      references public.erp_pedidos_venda_itens(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_erp_ordens_producao_maquina_sequencia
  on public.erp_ordens_producao (maquina_id, ordem_sequencia);

create index if not exists idx_erp_ordens_producao_pedido_item
  on public.erp_ordens_producao (empresa_id, pedido_venda_id, pedido_item_id);

create or replace function public.erp_validar_vinculo_op_pedido_item()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_empresa_id uuid;
begin
  if new.pedido_item_id is null then
    return new;
  end if;

  select i.pedido_id, i.empresa_id
    into v_pedido_id, v_empresa_id
    from public.erp_pedidos_venda_itens i
   where i.id = new.pedido_item_id;

  if not found then
    raise exception 'PCP_PEDIDO_ITEM_NAO_ENCONTRADO';
  end if;

  if v_empresa_id is distinct from new.empresa_id
     or v_pedido_id is distinct from new.pedido_venda_id then
    raise exception 'PCP_PEDIDO_ITEM_NAO_PERTENCE_AO_PEDIDO_DA_OP';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_erp_validar_vinculo_op_pedido_item
  on public.erp_ordens_producao;

create trigger trg_erp_validar_vinculo_op_pedido_item
before insert or update of pedido_item_id, pedido_venda_id, empresa_id
on public.erp_ordens_producao
for each row execute function public.erp_validar_vinculo_op_pedido_item();

notify pgrst, 'reload schema';
commit;