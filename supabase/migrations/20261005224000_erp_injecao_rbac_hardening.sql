drop policy if exists erp_tenant_isolation on public.erp_maquinas;
create policy erp_maquinas_select on public.erp_maquinas for select to authenticated using ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.read'))));
create policy erp_maquinas_insert on public.erp_maquinas for insert to authenticated with check ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.create'))));
create policy erp_maquinas_update on public.erp_maquinas for update to authenticated using ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.update')))) with check ((select public.erp_is_master()) or empresa_id=(select public.erp_current_empresa_id()));
revoke delete on public.erp_maquinas from authenticated;

drop policy if exists erp_moldes_tenant on public.erp_moldes;
create policy erp_moldes_select on public.erp_moldes for select to authenticated using ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.read'))));
create policy erp_moldes_insert on public.erp_moldes for insert to authenticated with check ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.create'))));
create policy erp_moldes_update on public.erp_moldes for update to authenticated using ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('production.update')))) with check ((select public.erp_is_master()) or empresa_id=(select public.erp_current_empresa_id()));
revoke delete on public.erp_moldes from authenticated;