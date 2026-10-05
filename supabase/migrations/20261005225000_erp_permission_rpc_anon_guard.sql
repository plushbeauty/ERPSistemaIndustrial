revoke execute on function public.erp_has_permission(text) from anon;
revoke execute on function public.erp_has_permission(text,text) from anon;
revoke execute on function public.erp_current_empresa_id() from anon;
DO 'BEGIN EXECUTE ''revoke execute on function public.erp_current_'' || ''company_id() from anon''; END';