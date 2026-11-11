do $$
declare v_definition text; v_original text;
begin
 v_definition:=pg_get_functiondef('public.erp_financeiro_criar_nota_debito(uuid,text,text,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,uuid,text,text,text,boolean,boolean)'::regprocedure);
 v_original:=v_definition;
 v_definition:=replace(v_definition,'if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id or p_empresa_id is distinct from public.erp_current_empresa_id() then','if v_user.id is null or (not public.erp_is_master() and v_user.empresa_id is distinct from p_empresa_id) or p_empresa_id is distinct from public.erp_current_empresa_id() then');
 if v_definition=v_original then raise exception 'Contrato de empresa da RPC de Notas de Débito não corresponde ao esperado.'; end if;
 execute v_definition;
 v_definition:=pg_get_functiondef('public.erp_financeiro_retificar_parcela(uuid,uuid,uuid,text,numeric,date,uuid,text,text,numeric,numeric,numeric,text,text)'::regprocedure);
 v_original:=v_definition;
 v_definition:=replace(v_definition,'if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id then','if v_user.id is null or (not public.erp_is_master() and v_user.empresa_id is distinct from p_empresa_id) then');
 if v_definition=v_original then raise exception 'Contrato de empresa da RPC de Retificação não corresponde ao esperado.'; end if;
 execute v_definition;
 v_definition:=pg_get_functiondef('public.erp_financeiro_fechar_periodo(uuid,date,date,text)'::regprocedure);
 v_original:=v_definition;
 v_definition:=replace(v_definition,'if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id','if v_user.id is null or (not public.erp_is_master() and v_user.empresa_id is distinct from p_empresa_id)');
 if v_definition=v_original then raise exception 'Contrato de empresa da RPC de Fechamento não corresponde ao esperado.'; end if;
 execute v_definition;
end;
$$;