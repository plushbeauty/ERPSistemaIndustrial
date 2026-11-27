begin;
create or replace function public.erp_estoque_inventario_calcular(p_inventario_id uuid)
returns table(
 produto_id uuid,
 quantidade_sistema_congelada numeric,
 quantidade_venda_concorrente numeric,
 quantidade_contada numeric,
 divergencia numeric,
 ajustado boolean
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $function$
declare
 v_empresa uuid := public.erp_current_empresa_id();
begin
 if auth.uid() is null or v_empresa is null then
   raise exception 'ERP_TENANT_NOT_FOUND' using errcode='42501';
 end if;
 if not (public.erp_is_master() or public.erp_has_permission('inventory.read')) then
   raise exception 'SEM_PERMISSAO_PARA_CONSULTAR_INVENTARIO' using errcode='42501';
 end if;
 return query
 select i.produto_id,i.quantidade_sistema_congelada,i.quantidade_venda_concorrente,i.quantidade_contada,
   case when i.quantidade_contada is null then null
        else i.quantidade_contada-(i.quantidade_sistema_congelada-i.quantidade_venda_concorrente) end as divergencia,
   i.ajustado
 from public.erp_estoque_inventario_itens i
 join public.erp_estoque_inventarios inv on inv.id=i.inventario_id and inv.empresa_id=v_empresa
 where i.inventario_id=p_inventario_id and i.empresa_id=v_empresa;
end;
$function$;

revoke all on function public.erp_estoque_inventario_calcular(uuid) from public,anon;
grant execute on function public.erp_estoque_inventario_calcular(uuid) to authenticated;

-- Funções de trigger não devem ser invocáveis diretamente pela Data API.
revoke all on function public.erp_impedir_movimento_lote_retido() from public,anon,authenticated;
revoke all on function public.erp_impedir_movimento_rastreio_retido() from public,anon,authenticated;
commit;
notify pgrst,'reload schema';
