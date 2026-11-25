-- Recebimento liga NF/lote do fornecedor ao item de compra e atualiza saldo recebido do MRP.
begin;
alter table public.erp_estoque_lotes_rastreabilidade
 add column if not exists pedido_compra_id uuid,
 add column if not exists pedido_compra_item_id uuid;
drop function if exists public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text);

create or replace function public.fn_receber_lote_almoxarifado(
 p_empresa_id uuid,
 p_produto_id uuid,
 p_nf_numero text,
 p_lote_fornecedor text,
 p_quantidade numeric,
 p_status_qualidade text,
 p_certificado_path text default null,
 p_data_validade date default null,
 p_pedido_compra_id uuid default null,
 p_pedido_compra_item_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_lote_id uuid;
 v_pedido_id uuid;
 v_quantidade_pedida numeric;
 v_quantidade_recebida numeric;
 v_total_pedido numeric;
 v_total_recebido numeric;
begin
 if v_empresa is null or p_empresa_id is null or p_empresa_id<>v_empresa then
  raise exception 'Empresa do recebimento inválida para a sessão atual.';
 end if;
 if p_status_qualidade not in ('APROVADO','REPROVADO') then raise exception 'Status de qualidade inválido.'; end if;
 if p_produto_id is null or p_quantidade is null or p_quantidade<=0 then raise exception 'Insumo e quantidade devem ser válidos e maiores que zero.'; end if;
 if nullif(trim(coalesce(p_lote_fornecedor,'')),'') is null then raise exception 'O lote do fornecedor é obrigatório.'; end if;

 if p_pedido_compra_item_id is not null then
  select ci.pedido_id,ci.quantidade,coalesce(ci.quantidade_recebida,0)
   into v_pedido_id,v_quantidade_pedida,v_quantidade_recebida
  from public.erp_pedidos_compra_itens ci
  join public.erp_pedidos_compra pc on pc.id=ci.pedido_id and pc.empresa_id=v_empresa
  where ci.id=p_pedido_compra_item_id and ci.empresa_id=v_empresa
   and ci.produto_id=p_produto_id and pc.recebido_em is null
  for update of ci,pc;
  if not found then raise exception 'Item de compra não pertence à empresa/produto ou já foi recebido.'; end if;
  if p_pedido_compra_id is not null and p_pedido_compra_id<>v_pedido_id then raise exception 'Item não pertence ao pedido de compra selecionado.'; end if;
  if p_quantidade>greatest(v_quantidade_pedida-v_quantidade_recebida,0) then
   raise exception 'Recebimento excede o saldo pendente do item de compra.';
  end if;
  update public.erp_pedidos_compra_itens
   set quantidade_recebida=coalesce(quantidade_recebida,0)+p_quantidade,updated_at=now()
  where id=p_pedido_compra_item_id and empresa_id=v_empresa;
  select coalesce(sum(quantidade),0),coalesce(sum(quantidade_recebida),0)
   into v_total_pedido,v_total_recebido
  from public.erp_pedidos_compra_itens where pedido_id=v_pedido_id and empresa_id=v_empresa;
  update public.erp_pedidos_compra set
   quantidade_recebida=v_total_recebido,
   recebido_em=case when v_total_pedido>0 and v_total_recebido>=v_total_pedido then now() else null end,
   status=case when v_total_pedido>0 and v_total_recebido>=v_total_pedido then 'concluido' else status end,
   updated_at=now()
  where id=v_pedido_id and empresa_id=v_empresa;
 elsif p_pedido_compra_id is not null then
  select quantidade,coalesce(quantidade_recebida,0) into v_quantidade_pedida,v_quantidade_recebida
  from public.erp_pedidos_compra
  where id=p_pedido_compra_id and empresa_id=v_empresa and produto_id=p_produto_id and recebido_em is null
  for update;
  if not found then raise exception 'Pedido de compra não pertence à empresa/produto ou já foi recebido.'; end if;
  if exists(select 1 from public.erp_pedidos_compra_itens where pedido_id=p_pedido_compra_id and empresa_id=v_empresa) then
   raise exception 'Este pedido possui itens detalhados. Selecione o item de compra para receber.';
  end if;
  if p_quantidade>greatest(v_quantidade_pedida-v_quantidade_recebida,0) then
   raise exception 'Recebimento excede o saldo pendente do pedido de compra.';
  end if;
  update public.erp_pedidos_compra set
   quantidade_recebida=coalesce(quantidade_recebida,0)+p_quantidade,
   recebido_em=case when coalesce(quantidade_recebida,0)+p_quantidade>=quantidade then now() else null end,
   status=case when coalesce(quantidade_recebida,0)+p_quantidade>=quantidade then 'concluido' else status end,
   updated_at=now()
  where id=p_pedido_compra_id and empresa_id=v_empresa;
  v_pedido_id:=p_pedido_compra_id;
 end if;

 insert into public.erp_estoque_lotes_rastreabilidade(
  empresa_id,produto_id,nf_numero,lote_fornecedor,quantidade_inicial,quantidade_disponivel,
  status_qualidade,certificado_path,data_validade,pedido_compra_id,pedido_compra_item_id
 ) values(
  v_empresa,p_produto_id,nullif(trim(p_nf_numero),''),trim(p_lote_fornecedor),p_quantidade,
  case when p_status_qualidade='APROVADO' then p_quantidade else 0 end,
  p_status_qualidade,p_certificado_path,p_data_validade,v_pedido_id,p_pedido_compra_item_id
 ) returning id into v_lote_id;
 if p_status_qualidade='APROVADO' then
  perform public.fn_incrementar_saldo_almoxarifado(v_empresa,p_produto_id,p_quantidade);
 end if;
 return v_lote_id;
end;
$$;
revoke all on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text,date,uuid,uuid) from public,anon;
grant execute on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text,date,uuid,uuid) to authenticated;
commit;