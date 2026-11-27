-- Recalcula falta a fabricar sem contar OPs encerradas e registra o responsável pela análise PCP.
create or replace function public.erp_pcp_enviar_demanda(p_pedido_item_ids uuid[])
returns integer language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_item record;
 v_reservada numeric;
 v_op_aberta numeric;
 v_qtd_pcp numeric;
 v_inserted integer:=0;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if coalesce(array_length(p_pedido_item_ids,1),0)=0 then raise exception 'PCP_EMPTY_SELECTION'; end if;
 for v_item in
  select i.id pedido_item_id,i.pedido_id,i.produto_id,i.quantidade,pv.numero,pv.cliente_id,pv.data_entrega_prometida,
   c.nome cliente_nome,p.codigo produto_codigo,p.nome produto_nome,coalesce(p.unidade,'UN') unidade
  from public.erp_pedidos_venda_itens i
  join public.erp_pedidos_venda pv on pv.id=i.pedido_id and pv.empresa_id=v_empresa
  join public.erp_produtos p on p.id=i.produto_id and p.empresa_id=v_empresa and p.ativo=true
  left join public.erp_clientes c on c.id=pv.cliente_id and c.empresa_id=v_empresa
  where i.empresa_id=v_empresa and i.id=any(p_pedido_item_ids)
   and lower(coalesce(pv.status,'')) not in ('cancelado','cancelada','rejeitado','rejeitada')
  order by pv.data_entrega_prometida nulls last,pv.numero,i.id
 loop
  select coalesce(sum(r.quantidade),0) into v_reservada
  from public.erp_estoque_reservas r
  where r.empresa_id=v_empresa and r.pedido_item_id=v_item.pedido_item_id and upper(coalesce(r.status,''))='ATIVA';
  select coalesce(sum(greatest(coalesce(o.quantidade_planejada,o.quantidade,0)-coalesce(o.quantidade_produzida,0),0)),0)
   into v_op_aberta
  from public.erp_ordens_producao o
  where o.empresa_id=v_empresa and o.pedido_item_id=v_item.pedido_item_id
   and lower(coalesce(o.status,'')) not in ('cancelada','cancelado','concluida','concluido','encerrada','encerrado','finalizada','finalizado');
  v_qtd_pcp:=greatest(coalesce(v_item.quantidade,0)-v_reservada-v_op_aberta,0);
  if v_qtd_pcp<=0 then continue; end if;
  insert into public.erp_pcp_fila_demanda(
   empresa_id,pedido_venda_id,pedido_item_id,produto_id,cliente_id,pedido_numero,cliente_nome,produto_codigo,produto_nome,unidade,
   quantidade_pedida,quantidade_pcp,quantidade_reservada,quantidade_op_aberta,data_necessaria,prioridade,status,enviado_por
  ) values(
   v_empresa,v_item.pedido_id,v_item.pedido_item_id,v_item.produto_id,v_item.cliente_id,v_item.numero::text,
   coalesce(v_item.cliente_nome,'Cliente não identificado'),v_item.produto_codigo,v_item.produto_nome,v_item.unidade,
   v_item.quantidade,v_qtd_pcp,v_reservada,v_op_aberta,v_item.data_entrega_prometida,'REGULAR','AGUARDANDO_PCP',auth.uid()
  )
  on conflict(empresa_id,pedido_item_id) where status in ('AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA') do nothing;
  if found then v_inserted:=v_inserted+1; end if;
 end loop;
 return v_inserted;
end; $$;

create or replace function public.erp_pcp_marcar_responsavel_analise()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.status in ('EM_ANALISE','PROGRAMADA','CONVERTIDA_OP') and new.status is distinct from old.status then
  new.analisado_por:=auth.uid();
  new.analisado_em:=coalesce(new.analisado_em,now());
 end if;
 return new;
end; $$;
drop trigger if exists trg_erp_pcp_fila_responsavel on public.erp_pcp_fila_demanda;
create trigger trg_erp_pcp_fila_responsavel
before update of status on public.erp_pcp_fila_demanda
for each row execute function public.erp_pcp_marcar_responsavel_analise();
revoke all on function public.erp_pcp_marcar_responsavel_analise() from public,anon,authenticated;