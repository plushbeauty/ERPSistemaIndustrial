-- Remove only the 50 explicitly seeded Plastibor homologation orders.
-- No production/business records outside the seeded number/customer markers are affected.
do $$
declare v_empresa uuid;
begin
  select id into v_empresa from public.erp_empresas
  where lower(coalesce(nome_fantasia,'')) like '%plastibor%'
     or lower(razao_social) like '%plastibor%'
  order by criado_em limit 1;
  if v_empresa is not null then
    delete from public.erp_pedidos_venda_itens
    where empresa_id=v_empresa and pedido_id in (
      select id from public.erp_pedidos_venda
      where empresa_id=v_empresa and (numero between 1001 and 1050 or pedido_cliente like 'PI-PLASTIBOR-%')
    );
    delete from public.erp_pedidos_venda
    where empresa_id=v_empresa and (numero between 1001 and 1050 or pedido_cliente like 'PI-PLASTIBOR-%');
  end if;
end $$;
