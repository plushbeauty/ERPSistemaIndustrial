/*
  Security hardening: restrict ERP SECURITY DEFINER functions to authenticated callers.
  These RPCs are operational endpoints and must not be callable by anon.
  The user-sync function is a trigger function and is not a client RPC.
*/
revoke execute on function public.erp_liberar_item_fiscal(uuid,numeric,text,text) from public, anon;
revoke execute on function public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) from public, anon;
revoke execute on function public.handle_new_user_sync() from public, anon, authenticated;
