-- ERP Industrial: least-privilege EXECUTE hardening for SECURITY DEFINER functions.
-- Trigger/internal helpers are not client RPC endpoints. Operational RPCs remain available only to authenticated users.
revoke execute on function public.handle_new_user_sync() from public, anon, authenticated;
revoke execute on function public.erp_catalogo_publico(uuid) from anon;
revoke execute on function public.erp_master_purge_plastibor_test_data() from public, anon;
revoke execute on function public.processar_baixa_bloco_k() from public, anon;
revoke execute on function public.erp_liberar_item_fiscal(uuid,numeric,text,text) from public, anon;
revoke execute on function public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) from public, anon;
revoke execute on function public.erp_confirmar_recebimento_nfe(jsonb,jsonb,jsonb) from public, anon;
revoke execute on function public.erp_calcular_custo_produto(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.erp_calcular_custo_produto(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;
revoke execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb) from public, anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb) to authenticated;
revoke execute on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) to authenticated;
revoke execute on function public.erp_estoque_inventario_iniciar(text) from public, anon;
grant execute on function public.erp_estoque_inventario_iniciar(text) to authenticated;
revoke execute on function public.erp_estoque_inventario_calcular(uuid) from public, anon;
grant execute on function public.erp_estoque_inventario_calcular(uuid) to authenticated;
revoke execute on function public.erp_estoque_inventario_contar(uuid,uuid,numeric) from public, anon;
grant execute on function public.erp_estoque_inventario_contar(uuid,uuid,numeric) to authenticated;
revoke execute on function public.erp_estoque_inventario_ajustar(uuid,uuid) from public, anon;
grant execute on function public.erp_estoque_inventario_ajustar(uuid,uuid) to authenticated;
revoke execute on function public.erp_estoque_inventario_encerrar(uuid) from public, anon;
grant execute on function public.erp_estoque_inventario_encerrar(uuid) to authenticated;
revoke execute on function public.erp_registrar_manutencao_molde(uuid,text,date,text,text,text,boolean) from public, anon;
grant execute on function public.erp_registrar_manutencao_molde(uuid,text,date,text,text,text,boolean) to authenticated;
