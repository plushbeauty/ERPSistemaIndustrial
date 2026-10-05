-- Fiscal: restringe parametrizacao tributaria por permissao fiscal.
alter table public.erp_regras_fiscais enable row level security;
drop policy if exists "erp_regras_fiscais_tenant" on public.erp_regras_fiscais;
drop policy if exists fiscal_regras_select on public.erp_regras_fiscais;
drop policy if exists fiscal_regras_insert on public.erp_regras_fiscais;
drop policy if exists fiscal_regras_update on public.erp_regras_fiscais;
drop policy if exists fiscal_regras_delete on public.erp_regras_fiscais;
create policy fiscal_regras_select on public.erp_regras_fiscais for select to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','ver'));
create policy fiscal_regras_insert on public.erp_regras_fiscais for insert to authenticated
with check ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'));
create policy fiscal_regras_update on public.erp_regras_fiscais for update to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'))
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy fiscal_regras_delete on public.erp_regras_fiscais for delete to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'));

alter table public.erp_classificacao_fiscal enable row level security;
drop policy if exists fiscal_classificacao_all on public.erp_classificacao_fiscal;
drop policy if exists fiscal_classificacao_select on public.erp_classificacao_fiscal;
drop policy if exists fiscal_classificacao_insert on public.erp_classificacao_fiscal;
drop policy if exists fiscal_classificacao_update on public.erp_classificacao_fiscal;
drop policy if exists fiscal_classificacao_delete on public.erp_classificacao_fiscal;
create policy fiscal_classificacao_select on public.erp_classificacao_fiscal for select to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','ver'));
create policy fiscal_classificacao_insert on public.erp_classificacao_fiscal for insert to authenticated
with check ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'));
create policy fiscal_classificacao_update on public.erp_classificacao_fiscal for update to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'))
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy fiscal_classificacao_delete on public.erp_classificacao_fiscal for delete to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and public.erp_has_permission('fiscal','editar'));
