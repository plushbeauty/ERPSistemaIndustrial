create or replace function public.erp_retificar_pedido_faturado(
  p_pedido_id uuid,
  p_pedido_cliente text,
  p_vendedor_nome text,
  p_condicao_pagamento text,
  p_itens jsonb default '[]'::jsonb,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_perfil text;
  v_master boolean;
  v_pedido public.erp_pedidos_venda%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_item jsonb;
  v_item_id uuid;
  v_new_descricao text;
  v_condition_changed boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select u.empresa_id, upper(trim(coalesce(u.perfil,''))), coalesce(u.is_master,false)
    into v_empresa, v_perfil, v_master
  from public.erp_usuarios u
  where u.auth_user_id = v_uid and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_empresa is null and not v_master then raise exception 'EMPRESA_REQUIRED'; end if;
  if not v_master and v_perfil not in ('ADMINISTRADOR','CONTROLADORIA') then
    raise exception 'RETIFICACAO_NAO_AUTORIZADA';
  end if;

  select * into v_pedido
  from public.erp_pedidos_venda p
  where p.id = p_pedido_id and (v_master or p.empresa_id = v_empresa)
  for update;

  if not found then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;

  if lower(trim(coalesce(v_pedido.status,''))) in ('rascunho','aberto','cotação','cotacao') then
    raise exception 'PEDIDO_AINDA_ABERTO';
  end if;

  v_condition_changed := coalesce(v_pedido.condicao_pagamento,'') <> coalesce(p_condicao_pagamento,'');

  if v_condition_changed and exists (
    select 1 from public.erp_contas_receber cr
    where cr.empresa_id = v_pedido.empresa_id
      and (cr.documento = v_pedido.numero::text
        or (v_pedido.pedido_cliente is not null and cr.documento = v_pedido.pedido_cliente))
  ) then
    raise exception 'Não é permitido alterar as condições de pagamento de um faturamento que já possui lançamentos financeiros ou baixas pagas.';
  end if;

  v_old := jsonb_build_object(
    'pedido_cliente', v_pedido.pedido_cliente,
    'vendedor_nome', v_pedido.vendedor_nome,
    'condicao_pagamento', v_pedido.condicao_pagamento,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'descricao',i.descricao) order by i.id)
                       from public.erp_pedidos_venda_itens i
                       where i.empresa_id=v_pedido.empresa_id and i.pedido_id=v_pedido.id),'[]'::jsonb)
  );

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then raise exception 'ITENS_INVALIDOS'; end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) <> 'object'
       or (v_item - 'id' - 'descricao') <> '{}'::jsonb
       or not (v_item ? 'id') or not (v_item ? 'descricao') then
      raise exception 'CAMPO_ITEM_NAO_PERMITIDO';
    end if;

    v_item_id := (v_item->>'id')::uuid;
    v_new_descricao := v_item->>'descricao';

    update public.erp_pedidos_venda_itens
       set descricao = v_new_descricao
     where id=v_item_id and empresa_id=v_pedido.empresa_id and pedido_id=v_pedido.id;

    if not found then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
  end loop;

  update public.erp_pedidos_venda
     set pedido_cliente=p_pedido_cliente,
         vendedor_nome=p_vendedor_nome,
         condicao_pagamento=p_condicao_pagamento,
         updated_at=now()
   where id=v_pedido.id and empresa_id=v_pedido.empresa_id;

  v_new := jsonb_build_object(
    'pedido_cliente',p_pedido_cliente,
    'vendedor_nome',p_vendedor_nome,
    'condicao_pagamento',p_condicao_pagamento,
    'itens',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'descricao',i.descricao) order by i.id)
                      from public.erp_pedidos_venda_itens i
                      where i.empresa_id=v_pedido.empresa_id and i.pedido_id=v_pedido.id),'[]'::jsonb)
  );

  insert into public.erp_audit_logs(company_id,user_id,action,module,entity,entity_id,old_data,new_data,created_at)
  values (v_pedido.empresa_id,v_uid,'RETIFICAR_PEDIDO','CONTROLADORIA','erp_pedidos_venda',v_pedido.id,
          v_old,jsonb_build_object('alterado',v_new,'motivo',p_motivo),now());

  return jsonb_build_object('ok',true,'pedido_id',v_pedido.id,'empresa_id',v_pedido.empresa_id,
                            'financial_fields_changed',false,'condition_changed',v_condition_changed);
end;
$$;

revoke all on function public.erp_retificar_pedido_faturado(uuid,text,text,text,jsonb,text) from public;
revoke all on function public.erp_retificar_pedido_faturado(uuid,text,text,text,jsonb,text) from anon;
grant execute on function public.erp_retificar_pedido_faturado(uuid,text,text,text,jsonb,text) to authenticated;
