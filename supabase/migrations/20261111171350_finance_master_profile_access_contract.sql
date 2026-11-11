do $$
declare v_definition text; v_original text;
begin
 v_definition:=pg_get_functiondef('public.erp_financeiro_retificar_parcela(uuid,uuid,uuid,text,numeric,date,uuid,text,text,numeric,numeric,numeric,text,text)'::regprocedure);
 v_original:=v_definition;
 v_definition:=replace(v_definition,'if upper(coalesce(v_user.perfil,'')) not in (''ADMINISTRADOR'',''FINANCEIRO'',''CONTROLADORIA'') then','if not public.erp_is_master() and upper(coalesce(v_user.perfil,'')) not in (''ADMINISTRADOR'',''FINANCEIRO'',''CONTROLADORIA'') then');
 if v_definition=v_original then raise exception 'Perfil guard da RPC de Retificação não corresponde ao esperado.'; end if;
 execute v_definition;
 v_definition:=pg_get_functiondef('public.erp_financeiro_fechar_periodo(uuid,date,date,text)'::regprocedure);
 v_original:=v_definition;
 v_definition:=replace(v_definition,'if upper(coalesce(v_user.perfil,'')) not in (''ADMINISTRADOR'',''CONTROLADORIA'') then','if not public.erp_is_master() and upper(coalesce(v_user.perfil,'')) not in (''ADMINISTRADOR'',''CONTROLADORIA'') then');
 if v_definition=v_original then raise exception 'Perfil guard da RPC de Fechamento não corresponde ao esperado.'; end if;
 execute v_definition;
end;
$$;