begin;

create or replace function public.erp_escriturar_nfe_entrada(p_nfe_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_nfe public.fiscal_nfe_entradas%rowtype;
  v_item jsonb;
  v_count integer := 0;
  v_cost numeric(18,6);
  v_product uuid;
  v_lot uuid;
  v_address uuid;
  v_qty numeric(18,6);
  v_unit_cost numeric(18,6);
begin
  select * into v_nfe
    from public.fiscal_nfe_entradas
   where id = p_nfe_id and empresa_id = v_empresa_id
   for update;

  if not found then raise exception 'NFE_ENTRADA_NAO_ENCONTRADA_NO_TENANT'; end if;
  if v_nfe.status = 'escriturada' then raise exception 'NFE_JA_ESCRITURADA'; end if;
  if v_nfe.status <> 'rascunho' then raise exception 'STATUS_NFE_NAO_PERMITE_ESCRITURACAO'; end if;

  for v_item in select value from jsonb_array_elements(v_nfe.itens)
  loop
    v_product := (v_item->>'produto_id')::uuid;
    v_lot := (v_item->>'lote_id')::uuid;
    v_address := (v_item->>'endereco_id')::uuid;
    v_qty := (v_item->>'quantidade')::numeric;
    v_unit_cost := (v_item->>'valor_liquido_unitario')::numeric;

    if v_qty <= 0 or v_unit_cost < 0 then raise exception 'ITEM_NFE_COM_QUANTIDADE_OU_CUSTO_INVALIDO'; end if;
    if not exists (select 1 from public.estoque_enderecos where id=v_address and empresa_id=v_empresa_id and ativo) then
      raise exception 'ENDERECO_NAO_ENCONTRADO_NO_TENANT';
    end if;
    v_cost := public.erp_registrar_custo_medio_nfe(
      v_product, v_lot, v_address, v_qty, v_unit_cost,
      'NFE:' || v_nfe.chave_acesso
    );
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then raise exception 'NFE_SEM_ITENS'; end if;
  update public.fiscal_nfe_entradas
     set status = 'escriturada', escriturada_em = now()
   where id = p_nfe_id and empresa_id = v_empresa_id;

  return jsonb_build_object('nfe_id',p_nfe_id,'status','escriturada','itens_processados',v_count,'ultimo_custo_medio',v_cost);
end;
$$;

commit;
