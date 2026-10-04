-- Security hardening: these functions are internal/legacy and must not be callable by signed-in clients.
-- ERP login is now performed by the protected Edge Function, and this hook is invoked by Auth triggers.
revoke all on function public.erp_resolver_usuario_login(text) from anon, authenticated;
revoke all on function public.erp_on_auth_user_created() from anon, authenticated;
