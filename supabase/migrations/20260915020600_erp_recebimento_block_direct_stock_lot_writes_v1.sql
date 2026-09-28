drop policy if exists erp_lotes_materiais_tenant_authenticated on public.erp_lotes_materiais;
create policy erp_lotes_materiais_tenant_select on public.erp_lotes_materiais for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_estoque_movimentos_tenant_authenticated on public.erp_estoque_movimentos;
create policy erp_estoque_movimentos_tenant_select on public.erp_estoque_movimentos for select to authenticated using (empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_rastreabilidade_tenant_authenticated on public.erp_rastreabilidade;
create policy erp_rastreabilidade_tenant_select on public.erp_rastreabilidade for select to authenticated using (empresa_id=public.erp_current_empresa_id());