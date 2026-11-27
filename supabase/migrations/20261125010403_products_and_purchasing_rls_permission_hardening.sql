begin;
alter table public.erp_produtos enable row level security;
alter table public.erp_pedidos_compra enable row level security;
alter table public.erp_pedidos_compra_itens enable row level security;
alter table public.erp_solicitacoes_compra enable row level security;
alter table public.erp_solicitacoes_compra_itens enable row level security;
alter table public.erp_requisicoes_compra enable row level security;
alter table public.erp_requisicoes_compra_itens enable row level security;
do $$
declare r record;
begin
 for r in select tablename,policyname from pg_policies where schemaname='public' and tablename = any(array['erp_produtos','erp_pedidos_compra','erp_pedidos_compra_itens','erp_solicitacoes_compra','erp_solicitacoes_compra_itens','erp_requisicoes_compra','erp_requisicoes_compra_itens'])
 loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop;
end $$;
CREATE OR REPLACE FUNCTION public.erp_pcp_gerar_requisicao_compra(p_fila_id uuid, p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_demanda public.erp_pcp_fila_demanda%rowtype;
 v_run public.erp_mrp_runs%rowtype;
 v_requisicao uuid;
 v_codigo text;
 v_seq integer;
 v_count integer;
 v_existente public.erp_requisicoes_compra%rowtype;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('purchases.create') or public.erp_has_permission('compras','criar')) then raise exception 'SEM_PERMISSAO_PARA_CRIAR_REQUISICAO_DE_COMPRA' using errcode='42501'; end if;
 select * into v_demanda from public.erp_pcp_fila_demanda where id=p_fila_id and empresa_id=v_empresa for update;
 if not found or v_demanda.status not in ('PROGRAMADA','CONVERTIDA_OP') then raise exception 'DEMANDA_PCP_NAO_PROGRAMADA'; end if;
 select * into v_run from public.erp_mrp_runs where id=p_run_id and empresa_id=v_empresa and produto_raiz_id=v_demanda.produto_id;
 if not found then raise exception 'MRP_RUN_NAO_PERTENCE_A_DEMANDA'; end if;
 select * into v_existente from public.erp_requisicoes_compra where empresa_id=v_empresa and pcp_fila_id=p_fila_id and mrp_run_id=p_run_id limit 1;
 if found then
  select count(*) into v_count from public.erp_requisicoes_compra_itens where empresa_id=v_empresa and requisicao_id=v_existente.id;
  return jsonb_build_object('id',v_existente.id,'codigo',v_existente.codigo,'itens',v_count,'ja_existia',true);
 end if;
 select count(*) into v_count from public.erp_mrp_necessidades where empresa_id=v_empresa and run_id=p_run_id and sugestao='COMPRAR' and necessidade_liquida>0;
 if v_count=0 then raise exception 'MRP_SEM_FALTA_DE_COMPRA'; end if;
 select coalesce(max((substring(codigo from '([0-9]+)$'))::integer),0)+1 into v_seq
 from public.erp_requisicoes_compra where empresa_id=v_empresa and codigo ~ '[0-9]+$';
 v_codigo:='PCP-REQ-'||to_char(current_date,'YYYY')||'-'||lpad(v_seq::text,6,'0');
 insert into public.erp_requisicoes_compra(
  empresa_id,codigo,ordem_producao_id,data_limite,comprador_nome,status,centro_custo,nivel_urgencia,
  pcp_fila_id,pedido_venda_id,pedido_item_id,mrp_run_id
 ) values(
  v_empresa,v_codigo,v_demanda.ordem_producao_id,v_demanda.data_necessaria,null,'AGUARDANDO_COTACAO','PCP','ALTA',
  p_fila_id,v_demanda.pedido_venda_id,v_demanda.pedido_item_id,p_run_id
 ) returning id into v_requisicao;
 insert into public.erp_requisicoes_compra_itens(empresa_id,requisicao_id,produto_id,quantidade,fornecedor_id,status)
 select v_empresa,v_requisicao,n.componente_id,n.necessidade_liquida,null,'AGUARDANDO_COTACAO'
 from public.erp_mrp_necessidades n where n.empresa_id=v_empresa and n.run_id=p_run_id
  and n.sugestao='COMPRAR' and n.necessidade_liquida>0;
 return jsonb_build_object('id',v_requisicao,'codigo',v_codigo,'itens',v_count,'ja_existia',false);
end; $function$


CREATE OR REPLACE FUNCTION public.erp_produtos_guard_update_permission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 v_product_editor boolean := public.erp_is_master() or public.erp_has_permission('products.update');
 v_cost_editor boolean := public.erp_has_permission('financeiro.custo_padrao.editar');
 v_old_non_cost jsonb;
 v_new_non_cost jsonb;
begin
 if v_product_editor then return new; end if;
 if v_cost_editor then
  v_old_non_cost := to_jsonb(old) - array['custo_padrao','custo_medio','custo_ultimo','custo_fabricacao','margem_percentual','updated_at'];
  v_new_non_cost := to_jsonb(new) - array['custo_padrao','custo_medio','custo_ultimo','custo_fabricacao','margem_percentual','updated_at'];
  if v_old_non_cost is distinct from v_new_non_cost then
   raise exception 'PERMISSAO_FINANCEIRA_PERMITE_ALTERAR_APENAS_CUSTOS_DO_PRODUTO' using errcode='42501';
  end if;
  return new;
 end if;
 raise exception 'SEM_PERMISSAO_PARA_ALTERAR_PRODUTO' using errcode='42501';
end;
$function$


revoke all on function public.erp_produtos_guard_update_permission() from public,anon,authenticated;
drop trigger if exists trg_erp_produtos_guard_update_permission on public.erp_produtos;
create trigger trg_erp_produtos_guard_update_permission before update on public.erp_produtos for each row execute function public.erp_produtos_guard_update_permission();
revoke all on function public.erp_pcp_gerar_requisicao_compra(uuid,uuid) from public,anon;
grant execute on function public.erp_pcp_gerar_requisicao_compra(uuid,uuid) to authenticated;

create policy erp_pedidos_compra_delete_rbac on public.erp_pedidos_compra as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'excluir'::text) AS erp_has_permission)))));
create policy erp_pedidos_compra_insert_rbac on public.erp_pedidos_compra as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'criar'::text) AS erp_has_permission)))));
create policy erp_pedidos_compra_select_rbac on public.erp_pedidos_compra as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.approve'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'ver'::text) AS erp_has_permission)))));
create policy erp_pedidos_compra_update_rbac on public.erp_pedidos_compra as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.approve'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'editar'::text) AS erp_has_permission))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.approve'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'editar'::text) AS erp_has_permission)))));
create policy erp_pedidos_compra_itens_delete_rbac on public.erp_pedidos_compra_itens as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('compras'::text, 'excluir'::text))) AND (EXISTS ( SELECT 1
   FROM erp_pedidos_compra pc
  WHERE ((pc.id = erp_pedidos_compra_itens.pedido_id) AND (pc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))))));
create policy erp_pedidos_compra_itens_insert_rbac on public.erp_pedidos_compra_itens as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.create'::text) OR erp_has_permission('compras'::text, 'criar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_pedidos_compra pc
  WHERE ((pc.id = erp_pedidos_compra_itens.pedido_id) AND (pc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_pedidos_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_pedidos_compra_itens_select_rbac on public.erp_pedidos_compra_itens as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.read'::text) OR erp_has_permission('purchases.create'::text) OR erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'ver'::text))) AND (EXISTS ( SELECT 1
   FROM erp_pedidos_compra pc
  WHERE ((pc.id = erp_pedidos_compra_itens.pedido_id) AND (pc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_pedidos_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_pedidos_compra_itens_update_rbac on public.erp_pedidos_compra_itens as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_pedidos_compra pc
  WHERE ((pc.id = erp_pedidos_compra_itens.pedido_id) AND (pc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_pedidos_compra pc
  WHERE ((pc.id = erp_pedidos_compra_itens.pedido_id) AND (pc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_pedidos_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_produtos_tenant_insert on public.erp_produtos as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.create'::text) AS erp_has_permission))));
create policy erp_produtos_tenant_select on public.erp_produtos as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('products.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('products.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('sales.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('inventory.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.read'::text) AS erp_has_permission)))));
create policy erp_produtos_tenant_update on public.erp_produtos as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission))));
create policy erp_produtos_update_custo_padrao on public.erp_produtos as permissive for update to authenticated using ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('financeiro.custo_padrao.editar'::text)))) with check ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('financeiro.custo_padrao.editar'::text))));
create policy erp_requisicoes_compra_delete on public.erp_requisicoes_compra as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('compras'::text, 'excluir'::text))))));
create policy erp_requisicoes_compra_insert on public.erp_requisicoes_compra as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.create'::text) OR erp_has_permission('compras'::text, 'criar'::text))))));
create policy erp_requisicoes_compra_select on public.erp_requisicoes_compra as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.read'::text) OR erp_has_permission('purchases.create'::text) OR erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'ver'::text))))));
create policy erp_requisicoes_compra_update on public.erp_requisicoes_compra as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text)))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))))));
create policy erp_requisicoes_compra_itens_delete on public.erp_requisicoes_compra_itens as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('compras'::text, 'excluir'::text))) AND (EXISTS ( SELECT 1
   FROM erp_requisicoes_compra r
  WHERE ((r.id = erp_requisicoes_compra_itens.requisicao_id) AND (r.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))))));
create policy erp_requisicoes_compra_itens_insert on public.erp_requisicoes_compra_itens as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.create'::text) OR erp_has_permission('compras'::text, 'criar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_requisicoes_compra r
  WHERE ((r.id = erp_requisicoes_compra_itens.requisicao_id) AND (r.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_requisicoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_requisicoes_compra_itens_select on public.erp_requisicoes_compra_itens as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.read'::text) OR erp_has_permission('purchases.create'::text) OR erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'ver'::text))) AND (EXISTS ( SELECT 1
   FROM erp_requisicoes_compra r
  WHERE ((r.id = erp_requisicoes_compra_itens.requisicao_id) AND (r.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_requisicoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_requisicoes_compra_itens_update on public.erp_requisicoes_compra_itens as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_requisicoes_compra r
  WHERE ((r.id = erp_requisicoes_compra_itens.requisicao_id) AND (r.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_requisicoes_compra r
  WHERE ((r.id = erp_requisicoes_compra_itens.requisicao_id) AND (r.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_requisicoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_solicitacoes_compra_delete_rbac on public.erp_solicitacoes_compra as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('compras'::text, 'excluir'::text))))));
create policy erp_solicitacoes_compra_insert_rbac on public.erp_solicitacoes_compra as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.create'::text) OR erp_has_permission('compras'::text, 'criar'::text))))));
create policy erp_solicitacoes_compra_select_rbac on public.erp_solicitacoes_compra as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('purchases.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.approve'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('compras'::text, 'ver'::text) AS erp_has_permission)))));
create policy erp_solicitacoes_compra_update_rbac on public.erp_solicitacoes_compra as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text)))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))))));
create policy erp_solicitacoes_compra_itens_delete_rbac on public.erp_solicitacoes_compra_itens as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('compras'::text, 'excluir'::text))) AND (EXISTS ( SELECT 1
   FROM erp_solicitacoes_compra sc
  WHERE ((sc.id = erp_solicitacoes_compra_itens.solicitacao_id) AND (sc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))))));
create policy erp_solicitacoes_compra_itens_insert_rbac on public.erp_solicitacoes_compra_itens as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.create'::text) OR erp_has_permission('compras'::text, 'criar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_solicitacoes_compra sc
  WHERE ((sc.id = erp_solicitacoes_compra_itens.solicitacao_id) AND (sc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_solicitacoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_solicitacoes_compra_itens_select_rbac on public.erp_solicitacoes_compra_itens as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.read'::text) OR erp_has_permission('purchases.create'::text) OR erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'ver'::text))) AND (EXISTS ( SELECT 1
   FROM erp_solicitacoes_compra sc
  WHERE ((sc.id = erp_solicitacoes_compra_itens.solicitacao_id) AND (sc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_solicitacoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
create policy erp_solicitacoes_compra_itens_update_rbac on public.erp_solicitacoes_compra_itens as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_solicitacoes_compra sc
  WHERE ((sc.id = erp_solicitacoes_compra_itens.solicitacao_id) AND (sc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT (erp_has_permission('purchases.update'::text) OR erp_has_permission('purchases.approve'::text) OR erp_has_permission('compras'::text, 'editar'::text))) AND (EXISTS ( SELECT 1
   FROM erp_solicitacoes_compra sc
  WHERE ((sc.id = erp_solicitacoes_compra_itens.solicitacao_id) AND (sc.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))))) AND ((produto_id IS NULL) OR (EXISTS ( SELECT 1
   FROM erp_produtos p
  WHERE ((p.id = erp_solicitacoes_compra_itens.produto_id) AND (p.empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)))))))));
commit;
notify pgrst,'reload schema';
