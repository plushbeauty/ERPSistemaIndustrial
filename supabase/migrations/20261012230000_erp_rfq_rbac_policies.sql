begin;

-- RFQ rows were tenant-scoped but allowed every authenticated tenant user to
-- perform every operation. Enforce the existing Compras RBAC contract in RLS.
drop policy if exists erp_rfq_tenant on public.erp_rfq;
drop policy if exists erp_rfq_fornecedores_tenant on public.erp_rfq_fornecedores;
drop policy if exists erp_rfq_itens_tenant on public.erp_rfq_itens;
drop policy if exists erp_rfq_select_rbac on public.erp_rfq;
drop policy if exists erp_rfq_insert_rbac on public.erp_rfq;
drop policy if exists erp_rfq_update_rbac on public.erp_rfq;
drop policy if exists erp_rfq_delete_rbac on public.erp_rfq;
drop policy if exists erp_rfq_fornecedores_select_rbac on public.erp_rfq_fornecedores;
drop policy if exists erp_rfq_fornecedores_insert_rbac on public.erp_rfq_fornecedores;
drop policy if exists erp_rfq_fornecedores_update_rbac on public.erp_rfq_fornecedores;
drop policy if exists erp_rfq_fornecedores_delete_rbac on public.erp_rfq_fornecedores;
drop policy if exists erp_rfq_itens_select_rbac on public.erp_rfq_itens;
drop policy if exists erp_rfq_itens_insert_rbac on public.erp_rfq_itens;
drop policy if exists erp_rfq_itens_update_rbac on public.erp_rfq_itens;
drop policy if exists erp_rfq_itens_delete_rbac on public.erp_rfq_itens;

create policy erp_rfq_select_rbac on public.erp_rfq
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','ver')));

create policy erp_rfq_insert_rbac on public.erp_rfq
for insert to authenticated
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','criar')));

create policy erp_rfq_update_rbac on public.erp_rfq
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','editar')))
with check (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','editar')));

create policy erp_rfq_delete_rbac on public.erp_rfq
for delete to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','excluir')));

create policy erp_rfq_fornecedores_select_rbac on public.erp_rfq_fornecedores
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','ver')));

create policy erp_rfq_fornecedores_insert_rbac on public.erp_rfq_fornecedores
for insert to authenticated
with check (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('compras','criar')
    and exists (select 1 from public.erp_rfq r where r.id = erp_rfq_fornecedores.rfq_id and r.empresa_id = erp_rfq_fornecedores.empresa_id)
  )
);

create policy erp_rfq_fornecedores_update_rbac on public.erp_rfq_fornecedores
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','editar')))
with check (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('compras','editar')
    and exists (select 1 from public.erp_rfq r where r.id = erp_rfq_fornecedores.rfq_id and r.empresa_id = erp_rfq_fornecedores.empresa_id)
  )
);

create policy erp_rfq_fornecedores_delete_rbac on public.erp_rfq_fornecedores
for delete to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','excluir')));

create policy erp_rfq_itens_select_rbac on public.erp_rfq_itens
for select to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','ver')));

create policy erp_rfq_itens_insert_rbac on public.erp_rfq_itens
for insert to authenticated
with check (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('compras','criar')
    and exists (select 1 from public.erp_rfq r where r.id = erp_rfq_fornecedores.rfq_id and r.empresa_id = erp_rfq_fornecedores.empresa_id)
  )
);

create policy erp_rfq_itens_update_rbac on public.erp_rfq_itens
for update to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','editar')))
with check (
  public.erp_is_master()
  or (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('compras','editar')
    and exists (select 1 from public.erp_rfq r where r.id = erp_rfq_fornecedores.rfq_id and r.empresa_id = erp_rfq_fornecedores.empresa_id)
  )
);

create policy erp_rfq_itens_delete_rbac on public.erp_rfq_itens
for delete to authenticated
using (public.erp_is_master() or (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('compras','excluir')));

commit;
