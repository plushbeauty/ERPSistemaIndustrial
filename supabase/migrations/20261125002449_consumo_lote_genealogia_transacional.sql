-- Consumo real de lote de insumo, baixa física e genealogia do lote acabado.
create or replace function public.erp_decrementar_saldo_almoxarifado(
 p_empresa_id uuid,p_produto_id uuid,p_quantidade numeric
)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_saldo numeric;
begin
 if v_empresa is null or p_empresa_id is distinct from v_empresa then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if p_produto_id is null or p_quantidade is null or p_quantidade<=0 then raise exception 'ESTOQUE_QUANTIDADE_INVALIDA'; end if;
 select saldo_fisico into v_saldo from public.erp_produto_estoque
  where empresa_id=v_empresa and produto_id=p_produto_id for update;
 if not found or coalesce(v_saldo,0)<p_quantidade then raise exception 'ESTOQUE_FISICO_INSUFICIENTE'; end if;
 update public.erp_produto_estoque set saldo_fisico=saldo_fisico-p_quantidade,updated_at=now()
  where empresa_id=v_empresa and produto_id=p_produto_id;
 update public.erp_produtos set estoque_atual=greatest(coalesce(estoque_atual,0)-p_quantidade,0),updated_at=now()
  where empresa_id=v_empresa and id=p_produto_id and ativo=true;
 if not found then raise exception 'PRODUTO_FORA_DO_TENANT'; end if;
end;
$$;
revoke all on function public.erp_decrementar_saldo_almoxarifado(uuid,uuid,numeric) from public,anon,authenticated;

create or replace function public.erp_registrar_consumo_lote_producao(
 p_ordem_producao_id uuid,
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
 v_lote_acabado uuid;
 v_genealogia uuid;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('estoque.movimentar') or public.erp_has_permission('production.update')) then
  raise exception 'SEM_PERMISSAO_PARA_CONSUMO_DE_MATERIAL';
 end if;
 if p_ordem_producao_id is null or p_lote_insumo_id is null or p_quantidade is null or p_quantidade<=0 then
  raise exception 'CONSUMO_LOTE_PARAMETROS_INVALIDOS';
 end if;
 select produto_id into v_produto_op from public.erp_ordens_producao
  where id=p_ordem_producao_id and empresa_id=v_empresa for update;
 if not found then raise exception 'OP_FORA_DO_TENANT'; end if;
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
 select l.id into v_lote_acabado
 from public.erp_estoque_lotes_alocacoes a
 join public.erp_estoque_lotes l on l.id=a.lote_id and l.empresa_id=v_empresa
 where a.empresa_id=v_empresa and a.ordem_producao_id=p_ordem_producao_id
 order by a.created_at desc limit 1;
 if v_lote_acabado is null then raise exception 'LOTE_ACABADO_AINDA_NAO_GERADO_PARA_OP'; end if;

 update public.erp_estoque_lotes_rastreabilidade
  set quantidade_disponivel=quantidade_disponivel-p_quantidade
 where id=p_lote_insumo_id and empresa_id=v_empresa;
 perform public.erp_decrementar_saldo_almoxarifado(v_empresa,v_produto_insumo,p_quantidade);
 insert into public.erp_genealogia_lote_componentes(
  empresa_id,lote_acabado_id,lote_insumo_id,quantidade_consumida,criado_por
 ) values(v_empresa,v_lote_acabado,p_lote_insumo_id,p_quantidade,auth.uid())
 returning id into v_genealogia;
 return v_genealogia;
end;
$$;
revoke all on function public.erp_registrar_consumo_lote_producao(uuid,uuid,numeric) from public,anon;
grant execute on function public.erp_registrar_consumo_lote_producao(uuid,uuid,numeric) to authenticated;