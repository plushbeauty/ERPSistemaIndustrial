begin;
alter table public.erp_recebimento_notas add column if not exists pedido_compra_id uuid references public.erp_pedidos_compra(id) on delete restrict;
alter table public.erp_recebimento_itens add column if not exists pedido_item_id uuid references public.erp_pedidos_compra_itens(id) on delete restrict;
alter table public.erp_recebimento_lotes add column if not exists endereco_armazenagem text;
create index if not exists ix_erp_recebimento_itens_pedido_item on public.erp_recebimento_itens(empresa_id,pedido_item_id);
create index if not exists ix_erp_recebimento_notas_pedido_tenant on public.erp_recebimento_notas(empresa_id,pedido_compra_id,created_at desc);
create or replace function public.erp_confirmar_recebimento_nfe_com_pedido(p_header jsonb,p_items jsonb,p_lotes jsonb,p_pedido_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $fn$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_recebimento uuid; v_item jsonb; v_pi public.erp_pedidos_compra_itens%rowtype; v_prod public.erp_produtos%rowtype; v_item_id uuid; v_qtd numeric; v_preco numeric; v_recebido numeric; v_qtd_xml numeric;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada.' using errcode='42501'; end if;
 if not public.erp_has_permission('estoque','criar') then raise exception 'Sem permissão para receber materiais.' using errcode='42501'; end if;
 if p_pedido_id is null or not exists(select 1 from public.erp_pedidos_compra where id=p_pedido_id and empresa_id=v_empresa) then raise exception 'Pedido não pertence à empresa ativa.' using errcode='42501'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 then raise exception 'NF-e sem itens.' using errcode='22023'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_item_id:=nullif(v_item->>'pedido_item_id','')::uuid; v_qtd:=nullif(v_item->>'quantidade_total','')::numeric; v_preco:=nullif(v_item->>'valor_unitario','')::numeric;
  if v_item_id is null or v_qtd is null or v_qtd<=0 or v_preco is null or v_preco<0 then raise exception 'Item, quantidade ou preço inválido.' using errcode='22023'; end if;
  select * into v_pi from public.erp_pedidos_compra_itens where id=v_item_id and pedido_id=p_pedido_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Item não pertence ao pedido.' using errcode='42501'; end if;
  select * into v_prod from public.erp_produtos where id=v_pi.produto_id and empresa_id=v_empresa and ativo=true for update;
  if not found or v_prod.id::text<>coalesce(v_item->>'produto_id','') or trim(v_prod.codigo)<>trim(coalesce(v_item->>'codigo_produto','')) then raise exception 'Produto mestre divergente.' using errcode='23503'; end if;
  if abs(v_preco-v_pi.preco_unitario)>0.01 then raise exception 'Preço NF-e diverge do pedido para %.',v_pi.codigo_produto using errcode='22023'; end if;
  select coalesce(sum(i.quantidade_total),0) into v_recebido from public.erp_recebimento_itens i join public.erp_recebimento_notas n on n.id=i.recebimento_id and n.empresa_id=i.empresa_id where i.empresa_id=v_empresa and i.pedido_item_id=v_item_id;
  select coalesce(sum(nullif(x.value->>'quantidade_total','')::numeric),0) into v_qtd_xml from jsonb_array_elements(p_items) x where nullif(x.value->>'pedido_item_id','')::uuid=v_item_id;
  if v_recebido+v_qtd_xml>v_pi.quantidade then raise exception 'Quantidade recebida excede saldo do pedido para %.',v_pi.codigo_produto using errcode='22023'; end if;
 end loop;
 v_recebimento:=public.erp_confirmar_recebimento_nfe(p_header,p_items,p_lotes);
 for v_item in select value from jsonb_array_elements(p_items) loop
  update public.erp_recebimento_itens i
     set pedido_item_id=nullif(v_item->>'pedido_item_id','')::uuid
   where i.recebimento_id=v_recebimento
     and i.empresa_id=v_empresa
     and i.item_nfe=nullif(v_item->>'item_nfe','')::integer;
  if not found then raise exception 'Falha ao registrar vínculo do item recebido com pedido; transação cancelada.'; end if;
 end loop;
 for v_item in select value from jsonb_array_elements(p_lotes) loop
  update public.erp_recebimento_lotes l
     set endereco_armazenagem=nullif(trim(v_item->>'endereco'),'')
    from public.erp_recebimento_itens i
   where i.id=l.recebimento_item_id
     and i.recebimento_id=v_recebimento
     and i.empresa_id=v_empresa
     and i.item_nfe=nullif(v_item->>'item_nfe','')::integer;
  if not found then raise exception 'Falha ao registrar endereço do lote; transação cancelada.'; end if;
 end loop;
 update public.erp_recebimento_notas set pedido_compra_id=p_pedido_id where id=v_recebimento and empresa_id=v_empresa;
 if not found then raise exception 'Falha ao vincular recebimento ao pedido; transação cancelada.'; end if;
 return v_recebimento;
end;
$fn$;
revoke all on function public.erp_confirmar_recebimento_nfe_com_pedido(jsonb,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.erp_confirmar_recebimento_nfe_com_pedido(jsonb,jsonb,jsonb,uuid) to authenticated;
commit;
