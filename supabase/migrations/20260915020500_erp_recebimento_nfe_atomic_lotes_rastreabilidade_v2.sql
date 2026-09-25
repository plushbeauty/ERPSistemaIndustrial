create or replace function public.erp_confirmar_recebimento_nfe(p_header jsonb, p_items jsonb, p_lotes jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_recebimento uuid; v_fornecedor uuid; v_item jsonb; v_lote jsonb; v_produto uuid; v_item_id uuid;
  v_qtd numeric; v_soma numeric; v_unit numeric; v_nfe_item integer; v_lote_interno text;
  v_old_stock numeric; v_old_cost numeric; v_new_stock numeric; v_new_cost numeric;
  v_chave text := nullif(trim(p_header->>'chave_acesso'),'');
  v_numero text := nullif(trim(p_header->>'numero_nfe'),'');
  v_serie text := nullif(trim(p_header->>'serie'),'');
  v_cnpj text := nullif(regexp_replace(coalesce(p_header->>'cnpj_fornecedor',''),'[^0-9]','','g'),'');
begin
  if v_empresa is null then raise exception 'Empresa do usuário não identificada.' using errcode='42501'; end if;
  if not (public.erp_has_permission('estoque','criar') or exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo=true and coalesce(u.nivel_admin,0)>=100)) then raise exception 'Usuário sem permissão para receber materiais.' using errcode='42501'; end if;
  if v_chave is null or length(v_chave) <> 44 then raise exception 'Chave de acesso da NF-e inválida.' using errcode='22023'; end if;
  if v_numero is null then raise exception 'Número da NF-e é obrigatório.' using errcode='22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'A NF-e precisa conter itens.' using errcode='22023'; end if;
  if jsonb_typeof(p_lotes) <> 'array' or jsonb_array_length(p_lotes)=0 then raise exception 'A NF-e precisa conter lotes.' using errcode='22023'; end if;
  if exists(select 1 from public.erp_recebimento_notas where empresa_id=v_empresa and chave_acesso=v_chave) then raise exception 'Esta NF-e já foi recebida nesta empresa.' using errcode='23505'; end if;
  select f.id into v_fornecedor from public.erp_fornecedores f where f.empresa_id=v_empresa and regexp_replace(coalesce(f.documento,''),'[^0-9]','','g')=v_cnpj and coalesce(f.ativo,true)=true limit 1;
  if v_cnpj is not null and v_fornecedor is null then raise exception 'Fornecedor da NF-e não está cadastrado nesta empresa.' using errcode='23503'; end if;
  insert into public.erp_recebimento_notas(empresa_id,numero_nfe,serie,chave_acesso,data_emissao,data_recebimento,cnpj_fornecedor,fornecedor_id,xml_nome_arquivo,xml_hash,valor_total,status)
  values(v_empresa,v_numero,v_serie,v_chave,nullif(p_header->>'data_emissao','')::date,now(),v_cnpj,v_fornecedor,nullif(p_header->>'xml_nome_arquivo',''),nullif(p_header->>'xml_hash',''),nullif(p_header->>'valor_total','')::numeric,'recebido') returning id into v_recebimento;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_nfe_item := nullif(v_item->>'item_nfe','')::integer; v_qtd := nullif(v_item->>'quantidade_total','')::numeric; v_unit := coalesce(nullif(v_item->>'valor_unitario','')::numeric,0);
    if v_nfe_item is null or v_qtd is null or v_qtd <= 0 then raise exception 'Item da NF-e inválido.' using errcode='22023'; end if;
    select p.id into v_produto from public.erp_produtos p where p.empresa_id=v_empresa and p.codigo=trim(v_item->>'codigo_produto') and coalesce(p.ativo,true)=true limit 1;
    if v_produto is null then raise exception 'Produto não cadastrado para o código % (item %).', trim(v_item->>'codigo_produto'), v_nfe_item using errcode='23503'; end if;
    insert into public.erp_recebimento_itens(recebimento_id,empresa_id,item_nfe,produto_id,codigo_produto,descricao_produto,unidade,quantidade_total,valor_unitario,valor_total)
    values(v_recebimento,v_empresa,v_nfe_item,v_produto,trim(v_item->>'codigo_produto'),coalesce(v_item->>'descricao_produto',''),coalesce(nullif(v_item->>'unidade',''),'UN'),v_qtd,v_unit,coalesce(nullif(v_item->>'valor_total','')::numeric,v_qtd*v_unit)) returning id into v_item_id;
    select coalesce(sum(nullif(x.value->>'quantidade','')::numeric),0) into v_soma from jsonb_array_elements(p_lotes) x where nullif(x.value->>'item_nfe','')::integer=v_nfe_item;
    if v_soma <= 0 or abs(v_soma-v_qtd) > 0.00001 then raise exception 'Quantidade dos lotes do item não confere com a NF-e.' using errcode='22023'; end if;
    for v_lote in select value from jsonb_array_elements(p_lotes) where nullif(value->>'item_nfe','')::integer=v_nfe_item loop
      v_lote_interno := nullif(trim(v_lote->>'lote_interno'),'');
      if v_lote_interno is null then raise exception 'Lote interno é obrigatório.' using errcode='22023'; end if;
      if coalesce(nullif(v_lote->>'quantidade','')::numeric,0) <= 0 then raise exception 'Quantidade de lote inválida.' using errcode='22023'; end if;
      if exists(select 1 from public.erp_lotes_materiais lm where lm.empresa_id=v_empresa and lm.produto_id=v_produto and lm.lote=v_lote_interno and coalesce(lm.status,'ativo') <> 'cancelado') then raise exception 'Lote interno já cadastrado para este produto.' using errcode='23505'; end if;
      insert into public.erp_recebimento_lotes(recebimento_item_id,recebimento_id,empresa_id,produto_id,lote_fabricante,lote_interno,data_validade,quantidade) values(v_item_id,v_recebimento,v_empresa,v_produto,nullif(trim(v_lote->>'lote_fabricante'),''),v_lote_interno,nullif(v_lote->>'data_validade','')::date,nullif(v_lote->>'quantidade','')::numeric);
      insert into public.erp_lotes_materiais(empresa_id,produto_id,fornecedor_id,lote,validade,quantidade_recebida,quantidade_disponivel,status) values(v_empresa,v_produto,v_fornecedor,v_lote_interno,nullif(v_lote->>'data_validade','')::date,nullif(v_lote->>'quantidade','')::numeric,nullif(v_lote->>'quantidade','')::numeric,'ativo');
      insert into public.erp_rastreabilidade(empresa_id,lote_material_id,produto_id,quantidade,evento,data_evento,referencia_id,observacoes) select v_empresa,lm.id,v_produto,nullif(v_lote->>'quantidade','')::numeric,'recebimento_nfe',now(),v_recebimento,'NF-e '||v_numero||' chave '||v_chave from public.erp_lotes_materiais lm where lm.empresa_id=v_empresa and lm.produto_id=v_produto and lm.lote=v_lote_interno order by lm.created_at desc limit 1;
    end loop;
    select coalesce(p.estoque_atual,0),coalesce(p.custo_medio,0) into v_old_stock,v_old_cost from public.erp_produtos p where p.id=v_produto and p.empresa_id=v_empresa for update;
    v_new_stock := v_old_stock + v_qtd; v_new_cost := case when v_new_stock > 0 then ((v_old_stock*v_old_cost)+(v_qtd*v_unit))/v_new_stock else v_unit end;
    update public.erp_produtos set estoque_atual=v_new_stock,custo_ultimo=v_unit,custo_medio=v_new_cost,updated_at=now() where id=v_produto and empresa_id=v_empresa;
    insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,custo_unitario,origem,referencia_id,observacao) values(v_empresa,v_produto,'entrada',v_qtd,v_unit,'recebimento_nfe',v_recebimento,'Recebimento NF-e '||v_numero||' chave '||v_chave);
  end loop;
  insert into public.erp_audit_logs(empresa_id,actor_user_id,action,entity_type,entity_id,new_data) values(v_empresa,auth.uid(),'recebimento_nfe','erp_recebimento_notas',v_recebimento,p_header || jsonb_build_object('itens',jsonb_array_length(p_items),'lotes',jsonb_array_length(p_lotes)));
  return v_recebimento;
end;
$fn$;
revoke all on function public.erp_confirmar_recebimento_nfe(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.erp_confirmar_recebimento_nfe(jsonb,jsonb,jsonb) to authenticated;

drop policy if exists erp_recebimento_notas_tenant_authenticated on public.erp_recebimento_notas;
create policy erp_recebimento_notas_tenant_select on public.erp_recebimento_notas for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_recebimento_itens_tenant_authenticated on public.erp_recebimento_itens;
create policy erp_recebimento_itens_tenant_select on public.erp_recebimento_itens for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_recebimento_lotes_tenant_authenticated on public.erp_recebimento_lotes;
create policy erp_recebimento_lotes_tenant_select on public.erp_recebimento_lotes for select to authenticated using (empresa_id=public.erp_current_empresa_id());