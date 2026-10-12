drop policy if exists erp_manut_ordens_select on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_insert on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_update on public.erp_manutencao_ordens;
drop policy if exists erp_manut_ordens_delete on public.erp_manutencao_ordens;

create policy erp_manut_ordens_select on public.erp_manutencao_ordens
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'ver')));
create policy erp_manut_ordens_insert on public.erp_manutencao_ordens
for insert to authenticated
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'criar')));
create policy erp_manut_ordens_update on public.erp_manutencao_ordens
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'editar')))
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'editar')));
create policy erp_manut_ordens_delete on public.erp_manutencao_ordens
for delete to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao', 'excluir')));

drop policy if exists erp_manut_planos_select on public.erp_manutencao_planos;
drop policy if exists erp_manut_planos_insert on public.erp_manutencao_planos;
drop policy if exists erp_manut_planos_update on public.erp_manutencao_planos;
create policy erp_manut_planos_select on public.erp_manutencao_planos
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.ver')));
create policy erp_manut_planos_insert on public.erp_manutencao_planos
for insert to authenticated
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.criar')));
create policy erp_manut_planos_update on public.erp_manutencao_planos
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.editar')))
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.editar')));

drop policy if exists erp_manut_insumos_select on public.erp_manutencao_insumos;
create policy erp_manut_insumos_select on public.erp_manutencao_insumos
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('manutencao.ver')));
