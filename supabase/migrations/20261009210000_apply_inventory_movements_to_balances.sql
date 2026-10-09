begin;

create or replace function public.erp_apply_stock_movement()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_status text;
  v_unit_cost numeric(18,6);
  v_available numeric(18,6);
begin
  if new.empresa_id <> v_empresa then raise exception 'TENANT_MOVEMENT_MISMATCH'; end if;

  select status, custo_unitario into v_status, v_unit_cost
    from public.estoque_lotes
   where id = new.lote_id and produto_id = new.produto_id and empresa_id = v_empresa
   for update;
  if not found then raise exception 'LOTE_OU_PRODUTO_NAO_ENCONTRADO_NO_TENANT'; end if;

  if new.tipo in ('requisicao_producao','transferencia','ajuste_inventario') then
    if new.endereco_origem_id is null then raise exception 'ENDERECO_ORIGEM_OBRIGATORIO'; end if;
    select quantidade into v_available
      from public.estoque_saldos
     where empresa_id=v_empresa and produto_id=new.produto_id and lote_id=new.lote_id and endereco_id=new.endereco_origem_id
     for update;
    if not found or v_available < new.quantidade then raise exception 'SALDO_INSUFICIENTE_NO_ENDERECO_ORIGEM'; end if;
    if v_status <> 'liberado' and new.tipo = 'requisicao_producao' then
      raise exception 'LOTE_BLOQUEADO_OU_EM_QUARENTENA_NAO_PODE_SER_CONSUMIDO';
    end if;
    update public.estoque_saldos
       set quantidade=quantidade-new.quantidade, updated_at=now()
     where empresa_id=v_empresa and produto_id=new.produto_id and lote_id=new.lote_id and endereco_id=new.endereco_origem_id;
  end if;

  if new.tipo in ('entrada_nf','retorno_producao','transferencia','ajuste_inventario') then
    if new.endereco_destino_id is null then raise exception 'ENDERECO_DESTINO_OBRIGATORIO'; end if;
    if not exists (select 1 from public.estoque_enderecos where id=new.endereco_destino_id and empresa_id=v_empresa and ativo) then
      raise exception 'ENDERECO_DESTINO_INVALIDO';
    end if;
    insert into public.estoque_saldos(empresa_id,produto_id,lote_id,endereco_id,quantidade,custo_medio,updated_at)
    values(v_empresa,new.produto_id,new.lote_id,new.endereco_destino_id,new.quantidade,coalesce(v_unit_cost,0),now())
    on conflict (empresa_id,produto_id,lote_id,endereco_id)
    do update set quantidade=public.estoque_saldos.quantidade+excluded.quantidade, updated_at=now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_estoque_apply_movement on public.estoque_movimentacoes;
create trigger trg_estoque_apply_movement
before insert on public.estoque_movimentacoes
for each row execute function public.erp_apply_stock_movement();

commit;
