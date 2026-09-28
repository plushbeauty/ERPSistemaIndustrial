-- ERP Industrial: enforce stock RBAC on inventory counting and production conference RPCs.
-- The Bloco K backflush routine is a trigger/internal function and must not be callable by clients.

create or replace function public.erp_estoque_inventario_contar(p_inventario_id uuid,p_produto_id uuid,p_quantidade_contada numeric)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if not (public.erp_is_master() or public.erp_has_permission('estoque','editar')) then
    raise exception 'Sem permissão para registrar contagem de inventário.';
  end if;
  if p_quantidade_contada < 0 then raise exception 'Quantidade contada não pode ser negativa.'; end if;
  update public.erp_estoque_inventario_itens i
  set quantidade_contada=p_quantidade_contada,
      divergencia=p_quantidade_contada-(i.quantidade_sistema_congelada-i.quantidade_venda_concorrente)
  from public.erp_estoque_inventarios inv
  where i.inventario_id=inv.id and i.produto_id=p_produto_id and inv.id=p_inventario_id
    and inv.empresa_id=public.erp_current_empresa_id() and inv.status='aberto';
  if not found then raise exception 'Item não encontrado no inventário aberto.'; end if;
  return true;
end;
$function$;

create or replace function public.erp_registrar_conferencia_producao(p_ordem_producao_id uuid,p_quantidade_encontrada numeric,p_quantidade_defeituosa numeric,p_defeitos jsonb default '[]'::jsonb,p_localizacao_destino_id uuid default null::uuid,p_acabamento boolean default false,p_observacao text default null::text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_op record;
 v_conf uuid;
 v_boa numeric;
 v_defeito jsonb;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('estoque','editar')) then
   raise exception 'Sem permissão para registrar conferência de produção.';
 end if;
 select * into v_op from public.erp_ordens_producao where id=p_ordem_producao_id and empresa_id=v_empresa for update;
 if not found then raise exception 'Ordem de produção não encontrada para a empresa atual'; end if;
 if p_quantidade_encontrada < 0 or p_quantidade_defeituosa < 0 or p_quantidade_defeituosa > p_quantidade_encontrada then raise exception 'Quantidades de conferência inválidas'; end if;
 v_boa:=p_quantidade_encontrada-p_quantidade_defeituosa;
 insert into public.erp_producao_conferencias(empresa_id,ordem_producao_id,produto_id,quantidade_planejada,quantidade_encontrada,quantidade_defeituosa,quantidade_lancada_estoque,quantidade_lancada_refugo,status,acabamento,observacao,conferido_por)
 values(v_empresa,v_op.id,v_op.produto_id,v_op.quantidade,p_quantidade_encontrada,p_quantidade_defeituosa,v_boa,p_quantidade_defeituosa,'conferida',p_acabamento,p_observacao,(select id from public.erp_usuarios where auth_user_id=auth.uid() limit 1))
 returning id into v_conf;
 for v_defeito in select * from jsonb_array_elements(coalesce(p_defeitos,'[]'::jsonb))
 loop
   if coalesce(trim(v_defeito->>'defeito'),'')='' then continue; end if;
   insert into public.erp_producao_defeitos(empresa_id,conferencia_id,ordem_producao_id,produto_id,defeito,quantidade,observacao,encaminhado_qualidade)
   values(v_empresa,v_conf,v_op.id,v_op.produto_id,trim(v_defeito->>'defeito'),greatest(0,(v_defeito->>'quantidade')::numeric),v_defeito->>'observacao',true);
 end loop;
 if v_boa > 0 then
   insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,localizacao_destino_id,observacao)
   values(v_empresa,v_op.produto_id,'entrada',v_boa,'producao',v_op.numero_op,v_op.id,p_localizacao_destino_id,'Conferência de produção: quantidade boa');
   update public.erp_produtos set estoque_atual=coalesce(estoque_atual,0)+v_boa where id=v_op.produto_id and empresa_id=v_empresa;
 end if;
 if p_quantidade_defeituosa > 0 then
   insert into public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,observacao)
   values(v_empresa,v_op.produto_id,'refugo',p_quantidade_defeituosa,'producao',v_op.numero_op,v_op.id,'Conferência de produção: refugo encaminhado à qualidade');
 end if;
 update public.erp_ordens_producao set status=case when p_quantidade_encontrada >= v_op.quantidade then 'concluida' else 'parcial' end where id=v_op.id;
 return jsonb_build_object('conferencia_id',v_conf,'ordem_producao_id',v_op.id,'numero_op',v_op.numero_op,'quantidade_planejada',v_op.quantidade,'quantidade_encontrada',p_quantidade_encontrada,'quantidade_defeituosa',p_quantidade_defeituosa,'quantidade_boa',v_boa,'saldo_producao',greatest(v_op.quantidade-p_quantidade_encontrada,0));
end;
$function$;

revoke execute on function public.processar_baixa_bloco_k() from authenticated, anon, public;
