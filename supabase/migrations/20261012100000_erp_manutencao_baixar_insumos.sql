-- Consumo de peças por ordem de manutenção: chamada atômica, com rollback total em qualquer erro.
create or replace function public.erp_manutencao_baixar_insumos(p_ordem_id uuid, p_itens jsonb, p_observacao text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ordem_empresa uuid;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_nome text;
  v_saldo numeric;
  v_documento text;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.' using errcode='42501'; end if;
  if p_ordem_id is null or jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(coalesce(p_itens,'[]'::jsonb))=0 then
    raise exception 'Informe uma O.S. e ao menos um insumo.' using errcode='22023';
  end if;
  select empresa_id into v_ordem_empresa from public.erp_manutencao_ordens where id=p_ordem_id for update;
  if not found or v_ordem_empresa is distinct from v_empresa then raise exception 'O.S. inexistente ou pertencente a outra empresa.' using errcode='42501'; end if;

  -- Validar e bloquear cada SKU antes de gravar qualquer movimento.
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_qtd := nullif(v_item->>'quantidade','')::numeric;
    if v_produto is null or v_qtd is null or v_qtd<=0 then raise exception 'Produto e quantidade positiva são obrigatórios.' using errcode='22023'; end if;
    if (select count(*) from jsonb_array_elements(p_itens) x where x->>'produto_id'=v_produto::text)>1 then
      raise exception 'Produto duplicado na requisição; consolide a quantidade.' using errcode='22023';
    end if;
    select nome,estoque_atual into v_nome,v_saldo from public.erp_produtos where id=v_produto and empresa_id=v_empresa and ativo=true for update;
    if not found then raise exception 'Produto % inexistente, inativo ou de outra empresa.',v_produto using errcode='42501'; end if;
    if v_saldo<v_qtd then raise exception 'Estoque insuficiente para "%": saldo %, solicitado %.',v_nome,v_saldo,v_qtd using errcode='23514'; end if;
  end loop;

  v_documento := 'OS-MAN-' || coalesce((select numero_os from public.erp_manutencao_ordens where id=p_ordem_id),left(p_ordem_id::text,8));
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_produto := (v_item->>'produto_id')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;
    insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,observacao)
    values(v_empresa,v_produto,'saida',v_qtd,'manutencao',v_documento,
      left(concat_ws(' | ','Consumo O.S. '||v_documento,nullif(btrim(p_observacao),'')),1000));
  end loop;
  return p_ordem_id;
exception when others then
  -- O erro é propagado; PostgreSQL reverte todos os movimentos e os triggers de estoque da chamada.
  raise;
end; $$;
revoke all on function public.erp_manutencao_baixar_insumos(uuid,jsonb,text) from public,anon;
grant execute on function public.erp_manutencao_baixar_insumos(uuid,jsonb,text) to authenticated;
