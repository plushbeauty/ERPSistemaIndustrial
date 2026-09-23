create or replace function public.erp_master_purge_plastibor(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
begin
  if not public.erp_is_master() then
    raise exception 'Acesso negado: somente Master pode executar a limpeza Plastibor.';
  end if;
  if upper(trim(coalesce(p_confirmation,''))) <> 'ZERAR BANCO PLASTIBOR' then
    raise exception 'Confirmação inválida.';
  end if;
  select public.erp_current_empresa_id() into v_empresa;
  if v_empresa is null then
    raise exception 'Empresa do Master não identificada.';
  end if;

  -- A limpeza é deliberadamente escopada ao tenant. TRUNCATE ... CASCADE nessas tabelas
  -- destruiria dados de outras empresas e não é aceitável em ambiente multi-tenant.
  begin delete from public.erp_bloco_k_apontamentos where empresa_id=v_empresa; get diagnostics v_count=row_count; v_deleted:=v_deleted||jsonb_build_object('erp_bloco_k_apontamentos',v_count); exception when undefined_table then null; end;
  begin delete from public.erp_notas_fiscais where empresa_id=v_empresa; get diagnostics v_count=row_count; v_deleted:=v_deleted||jsonb_build_object('erp_notas_fiscais',v_count); exception when undefined_table then null; end;
  begin delete from public.erp_financeiro where empresa_id=v_empresa; get diagnostics v_count=row_count; v_deleted:=v_deleted||jsonb_build_object('erp_financeiro',v_count); exception when undefined_table then null; end;
  begin delete from public.erp_almoxarifado_pedidos where empresa_id=v_empresa; get diagnostics v_count=row_count; v_deleted:=v_deleted||jsonb_build_object('erp_almoxarifado_pedidos',v_count); exception when undefined_table then null; end;

  return jsonb_build_object('ok',true,'empresa_id',v_empresa,'deleted',v_deleted,'executed_at',clock_timestamp());
end $$;

revoke all on function public.erp_master_purge_plastibor(text) from public;
grant execute on function public.erp_master_purge_plastibor(text) to authenticated;
