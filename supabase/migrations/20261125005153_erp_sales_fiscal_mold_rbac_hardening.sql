begin;
do $$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  -- Pedido de venda: criação exige sales.create no tenant da sessão.
  v_def := pg_get_functiondef('public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text)'::regprocedure);
  v_old := 'if auth.uid() is null then raise exception ''Sessão autenticada obrigatória.''; end if;';
  v_new := v_old || E'\n  if not (public.erp_is_master() or public.erp_has_permission(''sales.create'')) then raise exception ''SEM_PERMISSAO_PARA_CRIAR_PEDIDO_DE_VENDA'' using errcode = ''42501''; end if;';
  if position(v_old in v_def)=0 then raise exception 'RBAC patch guard: assinatura/trecho de erp_finalizar_pedido_venda mudou; nenhuma alteração aplicada.'; end if;
  v_def := replace(v_def,v_old,v_new);
  execute v_def;

  -- Liberação fiscal: exige usuário autenticado, sales.update e usuário ERP do tenant.
  v_def := pg_get_functiondef('public.erp_liberar_item_fiscal(uuid,numeric,text,text)'::regprocedure);
  v_old := 'if v_empresa is null then raise exception ''Empresa da sessão não identificada''; end if;';
  v_new := v_old || E'\n if auth.uid() is null then raise exception ''Sessão autenticada obrigatória'' using errcode = ''42501''; end if;\n if not (public.erp_is_master() or public.erp_has_permission(''sales.update'')) then raise exception ''SEM_PERMISSAO_PARA_LIBERACAO_FISCAL'' using errcode = ''42501''; end if;\n if not exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null) then raise exception ''USUARIO_ERP_FORA_DO_TENANT'' using errcode = ''42501''; end if;';
  if position(v_old in v_def)=0 then raise exception 'RBAC patch guard: trecho de erp_liberar_item_fiscal mudou; nenhuma alteração aplicada.'; end if;
  v_def := replace(v_def,v_old,v_new);
  v_old := '(select id from public.erp_usuarios where auth_user_id=auth.uid() limit 1)';
  v_new := '(select id from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null limit 1)';
  if position(v_old in v_def)=0 then raise exception 'RBAC patch guard: autor de liberação fiscal não encontrado; nenhuma alteração aplicada.'; end if;
  v_def := replace(v_def,v_old,v_new);
  v_def := replace(v_def,'SET search_path TO ''public''','SET search_path TO ''pg_catalog'', ''public''');
  execute v_def;

  -- Manutenção de molde: acesso ao tenant + permissão específica de manutenção.
  v_def := pg_get_functiondef('public.erp_registrar_manutencao_molde(uuid,text,date,text,text,text,boolean)'::regprocedure);
  v_old := 'if not exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo and (u.is_master or u.empresa_id=v_molde.empresa_id)) then raise exception ''Sem acesso ao molde''; end if;';
  v_new := v_old || E'\n if not (public.erp_is_master() or public.erp_has_permission(''manutencao.criar'')) then raise exception ''SEM_PERMISSAO_PARA_REGISTRAR_MANUTENCAO_DE_MOLDE'' using errcode = ''42501''; end if;';
  if position(v_old in v_def)=0 then raise exception 'RBAC patch guard: trecho de erp_registrar_manutencao_molde mudou; nenhuma alteração aplicada.'; end if;
  v_def := replace(v_def,v_old,v_new);
  v_def := replace(v_def,'SET search_path TO ''public''','SET search_path TO ''pg_catalog'', ''public''');
  execute v_def;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) to authenticated;
revoke all on function public.erp_liberar_item_fiscal(uuid,numeric,text,text) from public,anon;
grant execute on function public.erp_liberar_item_fiscal(uuid,numeric,text,text) to authenticated;
revoke all on function public.erp_registrar_manutencao_molde(uuid,text,date,text,text,text,boolean) from public,anon;
grant execute on function public.erp_registrar_manutencao_molde(uuid,text,date,text,text,text,boolean) to authenticated;

commit;
notify pgrst,'reload schema';
