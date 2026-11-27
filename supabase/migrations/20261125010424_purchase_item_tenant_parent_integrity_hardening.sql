begin;
do $$
declare r record;
begin
 for r in select tablename,policyname from pg_policies where schemaname='public' and tablename = any(array['erp_pedidos_compra_itens','erp_solicitacoes_compra_itens','erp_requisicoes_compra_itens'])
 loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop;
end $$;
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
