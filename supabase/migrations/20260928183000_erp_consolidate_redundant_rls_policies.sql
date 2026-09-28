-- Consolidate redundant permissive RLS policies without widening access.
-- Keep the explicit tenant/role policies that define the intended authorization.
drop policy if exists erp_tenant_isolation on public.erp_config_fiscal;
drop policy if exists erp_tenant_isolation on public.erp_pedidos_compra_itens;
drop policy if exists erp_tenant_isolation on public.erp_pedidos_venda_itens;
drop policy if exists vendas_config_select on public.erp_vendas_configuracoes;
drop policy if exists vendas_depara_select_empresa on public.erp_vendas_depara_produtos;
drop policy if exists vendas_metas_select on public.erp_vendas_metas;
