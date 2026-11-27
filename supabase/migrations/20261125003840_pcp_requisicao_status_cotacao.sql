create or replace function public.erp_pcp_gerar_requisicao_compra(p_fila_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_demanda public.erp_pcp_fila_demanda%rowtype;
 v_run public.erp_mrp_runs%rowtype;
 v_requisicao uuid;
 v_codigo text;
 v_seq integer;
 v_count integer;
 v_existente public.erp_requisicoes_compra%rowtype;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('compras','criar')) then raise exception 'SEM_PERMISSAO_PARA_CRIAR_REQUISICAO_DE_COMPRA'; end if;
 select * into v_demanda from public.erp_pcp_fila_demanda where id=p_fila_id and empresa_id=v_empresa for update;
 if not found or v_demanda.status not in ('PROGRAMADA','CONVERTIDA_OP') then raise exception 'DEMANDA_PCP_NAO_PROGRAMADA'; end if;
 select * into v_run from public.erp_mrp_runs where id=p_run_id and empresa_id=v_empresa and produto_raiz_id=v_demanda.produto_id;
 if not found then raise exception 'MRP_RUN_NAO_PERTENCE_A_DEMANDA'; end if;
 select * into v_existente from public.erp_requisicoes_compra where empresa_id=v_empresa and pcp_fila_id=p_fila_id and mrp_run_id=p_run_id limit 1;
 if found then
  select count(*) into v_count from public.erp_requisicoes_compra_itens where empresa_id=v_empresa and requisicao_id=v_existente.id;
  return jsonb_build_object('id',v_existente.id,'codigo',v_existente.codigo,'itens',v_count,'ja_existia',true);
 end if;
 select count(*) into v_count from public.erp_mrp_necessidades where empresa_id=v_empresa and run_id=p_run_id and sugestao='COMPRAR' and necessidade_liquida>0;
 if v_count=0 then raise exception 'MRP_SEM_FALTA_DE_COMPRA'; end if;
 select coalesce(max((substring(codigo from '([0-9]+)$'))::integer),0)+1 into v_seq
 from public.erp_requisicoes_compra where empresa_id=v_empresa and codigo ~ '[0-9]+$';
 v_codigo:='PCP-REQ-'||to_char(current_date,'YYYY')||'-'||lpad(v_seq::text,6,'0');
 insert into public.erp_requisicoes_compra(
  empresa_id,codigo,ordem_producao_id,data_limite,comprador_nome,status,centro_custo,nivel_urgencia,
  pcp_fila_id,pedido_venda_id,pedido_item_id,mrp_run_id
 ) values(
  v_empresa,v_codigo,v_demanda.ordem_producao_id,v_demanda.data_necessaria,null,'AGUARDANDO_COTACAO','PCP','ALTA',
  p_fila_id,v_demanda.pedido_venda_id,v_demanda.pedido_item_id,p_run_id
 ) returning id into v_requisicao;
 insert into public.erp_requisicoes_compra_itens(empresa_id,requisicao_id,produto_id,quantidade,fornecedor_id,status)
 select v_empresa,v_requisicao,n.componente_id,n.necessidade_liquida,null,'AGUARDANDO_COTACAO'
 from public.erp_mrp_necessidades n where n.empresa_id=v_empresa and n.run_id=p_run_id
  and n.sugestao='COMPRAR' and n.necessidade_liquida>0;
 return jsonb_build_object('id',v_requisicao,'codigo',v_codigo,'itens',v_count,'ja_existia',false);
end; $$;