-- A genealogia deve apontar para o lote acabado exato, especialmente quando o modo é DIA.
drop function if exists public.erp_registrar_consumo_lote_producao(uuid,uuid,numeric);
create or replace function public.erp_registrar_consumo_lote_producao(
 p_ordem_producao_id uuid,
 p_lote_acabado_id uuid,
 p_lote_insumo_id uuid,
 p_quantidade numeric
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_produto_op uuid;
 v_produto_insumo uuid;
 v_saldo_lote numeric;
 v_status_lote text;
 v_genealogia uuid;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('estoque.movimentar') or public.erp_has_permission('production.update')) then
  raise exception 'SEM_PERMISSAO_PARA_CONSUMO_DE_MATERIAL';
 end if;
 if p_ordem_producao_id is null or p_lote_acabado_id is null or p_lote_insumo_id is null or p_quantidade is null or p_quantidade<=0 then
  raise exception 'CONSUMO_LOTE_PARAMETROS_INVALIDOS';
 end if;
 select produto_id into v_produto_op from public.erp_ordens_producao
  where id=p_ordem_producao_id and empresa_id=v_empresa for update;
 if not found then raise exception 'OP_FORA_DO_TENANT'; end if;
 if not exists(
  select 1 from public.erp_estoque_lotes_alocacoes a
  join public.erp_estoque_lotes l on l.id=a.lote_id and l.empresa_id=v_empresa
  where a.empresa_id=v_empresa and a.ordem_producao_id=p_ordem_producao_id and a.lote_id=p_lote_acabado_id
 ) then raise exception 'LOTE_ACABADO_NAO_ALOCADO_A_OP'; end if;
 select produto_id,quantidade_disponivel,status_qualidade
  into v_produto_insumo,v_saldo_lote,v_status_lote
 from public.erp_estoque_lotes_rastreabilidade
 where id=p_lote_insumo_id and empresa_id=v_empresa for update;
 if not found then raise exception 'LOTE_INSUMO_FORA_DO_TENANT'; end if;
 if v_status_lote<>'APROVADO' then raise exception 'LOTE_INSUMO_NAO_LIBERADO_PELA_QUALIDADE'; end if;
 if coalesce(v_saldo_lote,0)<p_quantidade then raise exception 'SALDO_DO_LOTE_INSUFICIENTE'; end if;
 if not exists(
  select 1 from public.erp_fichas_tecnicas f
  join public.erp_ficha_itens fi on fi.ficha_id=f.id and fi.empresa_id=v_empresa
  where f.empresa_id=v_empresa and f.produto_id=v_produto_op and f.ativa=true
   and fi.componente_id=v_produto_insumo
 ) then raise exception 'INSUMO_NAO_EXISTE_NA_BOM_ATIVA_DA_OP'; end if;
 update public.erp_estoque_lotes_rastreabilidade
  set quantidade_disponivel=quantidade_disponivel-p_quantidade
 where id=p_lote_insumo_id and empresa_id=v_empresa;
 perform public.erp_decrementar_saldo_almoxarifado(v_empresa,v_produto_insumo,p_quantidade);
 insert into public.erp_genealogia_lote_componentes(
  empresa_id,lote_acabado_id,lote_insumo_id,quantidade_consumida,criado_por
 ) values(v_empresa,p_lote_acabado_id,p_lote_insumo_id,p_quantidade,auth.uid())
 returning id into v_genealogia;
 return v_genealogia;
end;
$$;
revoke all on function public.erp_registrar_consumo_lote_producao(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.erp_registrar_consumo_lote_producao(uuid,uuid,uuid,numeric) to authenticated;